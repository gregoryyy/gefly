import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { eddfApproachPractice } from './navigation-approach.ts';
import { getNavigationCatalogue } from './radio-nav.ts';
import { validKapCommand } from '../../studies/e1-browser/sim/kap140.js';
import { validSimulationRate } from '../../studies/e1-browser/sim/simulation-rate.js';
import { NAVIGATION_FIELDS, validNavigation } from '../../studies/e1-browser/sim/navigation.js';
import { ALERT_FIELDS, validAlertState, KAP_FIELDS, validKapState, TERRAIN_FIELDS, validTerrainState, COLLISION_FIELDS, validCollisionState, STALL_FIELDS, validStallState, CONTROL_FIELDS, validControlState, ALTIMETER_FIELDS, COCKPIT_FIELDS, ENGINE_FIELDS, ENGINE_SWITCH_FIELDS, PITCH_TRIM_FIELDS, GROUND_FIELDS, validGroundState, validPitchTrimState, validAltimeterState, validCockpitState, validEngineState } from './types.ts';
import type { Controls, FlightSession, FlightState, LandingPreset, AirborneSite } from './types';

/** Worker navdata identity from `ready` (see studies/e1-browser/sim/README.md).
 * `undefined` means an older worker that does not report it. */
export interface NavdataIdentity {
  /** Lowercase hex SHA-256 of the exact package bytes the worker loaded, or null. */
  navdata_sha256: string | null | undefined;
  /** Worker navdata load failure, or null. */
  navdata_error: string | null | undefined;
}

interface SessionCallbacks {
  onState(state: FlightState): void;
  onTerrainTile?(grid: TerrainGrid & {slot:number}): void;
  onTerrainLoading?(loading: boolean): void;
  onReady(trim: { throttle: number; pitch_trim: number; status: number }, navdata: NavdataIdentity): void;
  onStatus(status: string): void;
  onError(message: string): void;
}

const DEG_RAD = Math.PI / 180;
function regionalInitialCondition(site: AirborneSite) {
  const point = ({darmstadt:[49.87,8.65,900,170],odenwald:[49.65,8.85,1300,90],spessart:[50,9.5,1300,270]} as const)[site as 'darmstadt'|'odenwald'|'spessart'];
  return point ? {lat_rad:point[0]*DEG_RAD,lon_rad:point[1]*DEG_RAD,alt_msl_m:point[2],heading_rad:point[3]*DEG_RAD,tas_mps:90*1852/3600} : null;
}
const INPUT_PERIOD_MS = 50;
const LOAD_TIMEOUT_MS = 30_000;
const STATE_FIELDS = [
  'step', 't_s', 'lat_rad', 'lon_rad', 'alt_msl_m',
  'roll_rad', 'pitch_rad', 'heading_rad', 'tas_mps',
] as const;

function validState(value: Record<string, unknown>): value is Record<string, unknown> & FlightState {
  return STATE_FIELDS.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && Number.isInteger(value.step) && (value.step as number) >= 0
    && (value.t_s as number) >= 0 && (value.tas_mps as number) >= 0
    && Math.abs(value.lat_rad as number) <= Math.PI / 2
    && Math.abs(value.lon_rad as number) <= Math.PI && validAltimeterState(value) && validCockpitState(value) && validEngineState(value) && validPitchTrimState(value) && validGroundState(value) && validControlState(value) && validStallState(value) && validCollisionState(value) && validTerrainState(value) && validKapState(value) && validAlertState(value)
    && (value.simulation_rate === undefined || validSimulationRate(value.simulation_rate))
    && (!NAVIGATION_FIELDS.some(k => value[k] !== undefined) || validNavigation(value));
}

function validControls(value: Controls): boolean {
  return [value.elevator, value.aileron, value.rudder].every((axis) => Number.isFinite(axis) && Math.abs(axis) <= 1)
    && Number.isFinite(value.throttle) && value.throttle >= 0 && value.throttle <= 1
    && [value.flap_norm,value.brake_norm,value.mixture_norm].every(x => x === undefined || (Number.isFinite(x) && x >= 0 && x <= 1))
    && (value.pitch_trim_norm === undefined || (Number.isFinite(value.pitch_trim_norm) && Math.abs(value.pitch_trim_norm) <= 1))
    && (value.mixture_auto === undefined || typeof value.mixture_auto === 'boolean')
    && (value.engine_running === undefined || typeof value.engine_running === 'boolean')
    && (value.pilot_override === undefined || typeof value.pilot_override === 'boolean');
}

/**
 * Local research runtime only: the worker loads the existing generic c172x model,
 * not the planned project-owned 172S. No synthetic flight path or dynamics fallback.
 * Inputs are coalesced on a wall-clock timer, while the worker owns fixed-step time.
 */
export function createSession(callbacks: SessionCallbacks): FlightSession {
  let worker: Worker | null = null;
  let ready = false;
  let wantedRunning = false;
  let disposed = false;
  let latestStep = 0;
  let collided = false;
  let collisionState: Readonly<FlightState> | null = null;
  let controls: Controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.7 };
  let controlsChanged = false;
  let userControls = false;
  let landingPreset: LandingPreset | undefined;
  let airborneSite: AirborneSite = 'edfe';
  let inputTimer: ReturnType<typeof setInterval> | undefined;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;

  function clearTimers(): void {
    clearInterval(inputTimer);
    clearTimeout(loadTimer);
    inputTimer = undefined;
    loadTimer = undefined;
  }

  function destroyWorker(): void {
    clearTimers();
    const old = worker;
    worker = null;
    ready = false;
    old?.terminate();
  }

  function fail(message: string): void {
    wantedRunning = false;
    destroyWorker();
    callbacks.onStatus('Error');
    callbacks.onError(message);
  }

  function sendInput(): void {
    if (!worker || !ready || !wantedRunning || collided || !controlsChanged) return;
    worker.postMessage({
      type: 'input', step: latestStep,
      wall_ms: performance.timeOrigin + performance.now(), ...controls,
    });
    controlsChanged = false;
  }

  function run(): void {
    if (!worker || !ready || !wantedRunning || collided) return;
    // Always establish the current input after init/resume, before advancing.
    controlsChanged = true;
    sendInput();
    worker.postMessage({ type: 'run' });
    clearInterval(inputTimer);
    inputTimer = setInterval(sendInput, INPUT_PERIOD_MS);
    callbacks.onStatus('Flying');
  }

  function initialize(): void {
    destroyWorker();
    latestStep = 0; collided = false; collisionState = null;
    callbacks.onStatus('Loading JSBSim…');
    let current: Worker;
    try {
      current = new Worker('/studies/e1-browser/sim/worker.js', { type: 'module' });
      worker = current;
    } catch {
      fail('Cannot start the JSBSim worker. Serve the project using just fly.');
      return;
    }
    loadTimer = setTimeout(() => {
      if (worker === current) fail('JSBSim did not finish loading. Build the local runtime with just build-flight-engine, then reset.');
    }, LOAD_TIMEOUT_MS);
    current.onerror = (event) => {
      if (disposed || worker !== current) return;
      event.preventDefault();
      fail('JSBSim runtime could not load. Run just build-flight-engine, then reset. No simulated flight is running.');
    };
    current.onmessageerror = () => {
      if (!disposed && worker === current) fail('The flight worker returned an unreadable message. Reset to restart.');
    };
    current.onmessage = (event: MessageEvent<unknown>) => {
      if (disposed || worker !== current) return;
      const message = event.data;
      if (!message || typeof message !== 'object') { fail('Invalid flight worker response.'); return; }
      const m = message as Record<string, unknown>;
      if (m.type === 'terrain-tile') {
        const grid = m.grid as TerrainGrid & {slot:number};
        if (!validateTerrainGrid(grid) || grid.width !== 129 || grid.height !== 129 || !Number.isInteger(grid.slot) || grid.slot < 0 || grid.slot >= 42) { fail('Invalid regional terrain message.'); return; }
        const col = grid.slot % 7, row = Math.floor(grid.slot / 7);
        const expectedBounds = [8.25 + col * .25, 49.25 + row * .25, 8.5 + col * .25, 49.5 + row * .25];
        if (grid.id !== `e${825 + col * 25}-n${4925 + row * 25}`
          || [grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad].some((value, i) => Math.abs(value - expectedBounds[i] * DEG_RAD) > 1e-12)) {
          fail('Regional terrain identity or bounds mismatch.'); return;
        }
        callbacks.onTerrainTile?.(grid);
      } else if (m.type === 'terrain-loading') {
        if (typeof m.loading !== 'boolean') { fail('Invalid terrain loading state.'); return; }
        callbacks.onTerrainLoading?.(m.loading);
        callbacks.onStatus(m.loading ? 'Loading terrain…' : wantedRunning ? 'Flying' : 'Paused');
      } else if (m.type === 'ready') {
        const trim = m.trim as Record<string, unknown> | undefined;
        if (!trim || ![trim.throttle, trim.pitch_trim, trim.status].every((value) => typeof value === 'number' && Number.isFinite(value))
          || (trim.throttle as number) < 0 || (trim.throttle as number) > 1) {
          fail('The aircraft returned invalid trim settings.');
          return;
        }
        const sha = m.navdata_sha256, navError = m.navdata_error;
        if (!(sha === undefined || sha === null || (typeof sha === 'string' && /^[0-9a-f]{64}$/.test(sha)))
          || !(navError === undefined || navError === null || (typeof navError === 'string' && navError.length > 0 && navError.length <= 500))
          || (typeof sha === 'string' && typeof navError === 'string')) {
          fail('The flight worker returned an invalid navigation database identity.');
          return;
        }
        clearTimeout(loadTimer);
        loadTimer = undefined;
        ready = true;
        const result = { throttle: trim.throttle as number, pitch_trim: trim.pitch_trim as number, status: trim.status as number };
        if (!userControls) controls = { ...controls, throttle: result.throttle };
        callbacks.onReady(result, { navdata_sha256: sha as string | null | undefined, navdata_error: navError as string | null | undefined });
        // Callbacks may pause, reset or dispose the session.
        if (disposed || worker !== current) return;
        if (wantedRunning) run();
        else callbacks.onStatus('Paused');
      } else if (m.type === 'state') {
        if (!validState(m)) { fail('The flight model returned an invalid state. Flight stopped; reset to restart.'); return; }
        const fields = [...STATE_FIELDS, ...['simulation_rate', ...ALERT_FIELDS, ...KAP_FIELDS, ...NAVIGATION_FIELDS, ...TERRAIN_FIELDS, ...COLLISION_FIELDS, ...STALL_FIELDS, ...CONTROL_FIELDS, ...ALTIMETER_FIELDS, ...COCKPIT_FIELDS, ...ENGINE_FIELDS, ...ENGINE_SWITCH_FIELDS, ...PITCH_TRIM_FIELDS, ...GROUND_FIELDS].filter((key) => m[key] !== undefined)];
        const state = Object.fromEntries(fields.map(key => [key, m[key]])) as unknown as FlightState;
        if (collisionState && Object.keys({ ...collisionState, ...state })
          .some(key => state[key as keyof FlightState] !== collisionState![key as keyof FlightState])) {
          fail('The stopped collision state changed before restart.'); return;
        }
        latestStep = state.step;
        if (state.collision_mask) {
          collided = true; collisionState = Object.freeze({ ...state });
          wantedRunning = false; controlsChanged = false;
          clearInterval(inputTimer); inputTimer = undefined;
          callbacks.onStatus('Ground collision');
        }
        callbacks.onState(state);
      } else if (m.type === 'error') {
        fail(`JSBSim stopped: ${typeof m.message === 'string' ? m.message : 'unknown worker failure'}`);
      }
    };
    let approach: ReturnType<typeof eddfApproachPractice> | null = null;
    try { if (airborneSite === 'eddf-ils' && !landingPreset) approach = eddfApproachPractice(getNavigationCatalogue()); }
    catch { fail('Historical approach source unavailable. Reload before selecting EDDF practice.'); return; }
    // Every mode requests the regional database so tuned NAV sources match the
    // instruments; a worker load failure degrades NAV and is reported in ready
    // (navdata_error) instead of stopping the flight.
    current.postMessage({
      ...(approach ? { navigation: approach.navigation } : {}),
      type: 'init', kap140: true, regional_navigation: true, streaming_terrain: landingPreset === undefined, terrain: landingPreset === undefined, ...(landingPreset ? { landing_preset: landingPreset } : {}), ground_collision: true, dt_s: 1 / 120, aircraft: 'c172x', state_hz: 60,
      ic: approach?.ic ?? regionalInitialCondition(airborneSite) ?? {
        lat_rad: (airborneSite === 'taunus' ? 50.20 : 49.96) * DEG_RAD, lon_rad: (airborneSite === 'taunus' ? 8.52 : 8.643) * DEG_RAD,
        alt_msl_m: airborneSite === 'taunus' ? 1100 : 1300 * 0.3048, heading_rad: (airborneSite === 'taunus' ? 300 : 82) * DEG_RAD,
        tas_mps: 90 * 1852 / 3600,
      },
    });
  }

  return {
    captureAutopilot() {
      if (disposed || collided || !ready || !worker || controls.pilot_override !== false) return;
      // The explicit convenience hands control to AP. Clear the separate study
      // roll correction as well, and flush release before capture even if paused.
      controls = { ...controls, elevator: 0, aileron: 0, rudder: 0, pilot_override: false };
      worker.postMessage({ type: 'input', step: latestStep,
        wall_ms: performance.timeOrigin + performance.now(), ...controls });
      controlsChanged = false;
      worker.postMessage({ type: 'autopilot-capture' });
    },
    setSimulationRate(rate) {
      if (disposed || collided || !ready || !worker || !validSimulationRate(rate)) return;
      worker.postMessage({ type: 'simulation-rate', rate });
    },
    start() {
      if (collided) return;
      if (disposed || wantedRunning) return;
      wantedRunning = true;
      if (!worker) initialize();
      else if (ready) run();
    },
    pause() {
      if (disposed) return;
      wantedRunning = false;
      clearInterval(inputTimer);
      inputTimer = undefined;
      if (ready && worker) worker.postMessage({ type: 'pause' });
      callbacks.onStatus(collided ? 'Ground collision' : 'Paused');
    },
    reset(preset, site) {
      if (disposed) return;
      if (preset !== undefined && !['normal', 'hard', 'side', 'banked'].includes(preset)) return;
      if (site !== undefined && !['edfe', 'taunus', 'eddf-ils', 'darmstadt', 'odenwald', 'spessart'].includes(site)) return;
      airborneSite = site ?? airborneSite;
      landingPreset = preset;
      controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.7 };
      userControls = false;
      controlsChanged = true;
      initialize();
    },
    setKap140(command) {
      if (disposed || collided || !ready || !worker || !validKapCommand(command)) return;
      worker.postMessage({ type: 'kap140', command: { ...command } });
    },
    setNavigation(config) {
      if (disposed || collided || !ready || !worker || !validNavigation(config)) return;
      worker.postMessage({ type: 'navigation', config: Object.fromEntries(NAVIGATION_FIELDS.filter(k => config[k] !== undefined).map(k => [k, config[k]])) });
    },
    setAutopilot(mode, target_heading_rad) {
      if (disposed || collided || !ready || !worker || ![0,1,2].includes(mode)) return;
      if (target_heading_rad !== undefined && !Number.isFinite(target_heading_rad)) return;
      worker.postMessage({ type: 'autopilot', mode,
        ...(target_heading_rad === undefined ? {} : { target_heading_rad: ((target_heading_rad % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI) }) });
    },
    setAltimeter(setting_pa) {
      if (disposed || collided || !ready || !worker || !Number.isFinite(setting_pa)
        || setting_pa < 80_000 || setting_pa > 110_000) return;
      worker.postMessage({ type: 'altimeter', setting_pa });
    },
    input(value) {
      if (disposed || collided) return;
      if (!validControls(value)) {
        fail('Control input must be finite: axes −1 to +1; throttle 0 to 1.');
        return;
      }
      controls = { ...value };
      userControls = true;
      controlsChanged = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      wantedRunning = false;
      destroyWorker();
    },
  };
}
