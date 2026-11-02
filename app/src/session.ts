import { CONTROL_FIELDS, validControlState, ALTIMETER_FIELDS, COCKPIT_FIELDS, ENGINE_FIELDS, PITCH_TRIM_FIELDS, GROUND_FIELDS, validGroundState, validPitchTrimState, validAltimeterState, validCockpitState, validEngineState } from './types.ts';
import type { Controls, FlightSession, FlightState, LandingPreset } from './types';

interface SessionCallbacks {
  onState(state: FlightState): void;
  onReady(trim: { throttle: number; pitch_trim: number; status: number }): void;
  onStatus(status: string): void;
  onError(message: string): void;
}

const DEG_RAD = Math.PI / 180;
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
    && Math.abs(value.lon_rad as number) <= Math.PI && validAltimeterState(value) && validCockpitState(value) && validEngineState(value) && validPitchTrimState(value) && validGroundState(value) && validControlState(value);
}

function validControls(value: Controls): boolean {
  return [value.elevator, value.aileron, value.rudder].every((axis) => Number.isFinite(axis) && Math.abs(axis) <= 1)
    && Number.isFinite(value.throttle) && value.throttle >= 0 && value.throttle <= 1
    && [value.flap_norm,value.brake_norm,value.mixture_norm].every(x => x === undefined || (Number.isFinite(x) && x >= 0 && x <= 1))
    && (value.pitch_trim_norm === undefined || (Number.isFinite(value.pitch_trim_norm) && Math.abs(value.pitch_trim_norm) <= 1))
    && (value.mixture_auto === undefined || typeof value.mixture_auto === 'boolean');
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
  let controls: Controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.7 };
  let controlsChanged = false;
  let userControls = false;
  let landingPreset: LandingPreset | undefined;
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
    if (!worker || !ready || !wantedRunning || !controlsChanged) return;
    worker.postMessage({
      type: 'input', step: latestStep,
      wall_ms: performance.timeOrigin + performance.now(), ...controls,
    });
    controlsChanged = false;
  }

  function run(): void {
    if (!worker || !ready || !wantedRunning) return;
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
    latestStep = 0;
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
      if (m.type === 'ready') {
        const trim = m.trim as Record<string, unknown> | undefined;
        if (!trim || ![trim.throttle, trim.pitch_trim, trim.status].every((value) => typeof value === 'number' && Number.isFinite(value))
          || (trim.throttle as number) < 0 || (trim.throttle as number) > 1) {
          fail('The aircraft returned invalid trim settings.');
          return;
        }
        clearTimeout(loadTimer);
        loadTimer = undefined;
        ready = true;
        const result = { throttle: trim.throttle as number, pitch_trim: trim.pitch_trim as number, status: trim.status as number };
        if (!userControls) controls = { ...controls, throttle: result.throttle };
        callbacks.onReady(result);
        // Callbacks may pause, reset or dispose the session.
        if (disposed || worker !== current) return;
        if (wantedRunning) run();
        else callbacks.onStatus('Paused');
      } else if (m.type === 'state') {
        if (!validState(m)) { fail('The flight model returned an invalid state. Flight stopped; reset to restart.'); return; }
        latestStep = m.step;
        const fields = [...STATE_FIELDS, ...[...CONTROL_FIELDS, ...ALTIMETER_FIELDS, ...COCKPIT_FIELDS, ...ENGINE_FIELDS, ...PITCH_TRIM_FIELDS, ...GROUND_FIELDS].filter((key) => m[key] !== undefined)];
        callbacks.onState(Object.fromEntries(fields.map((key) => [key, m[key]])) as unknown as FlightState);
      } else if (m.type === 'error') {
        fail(`JSBSim stopped: ${typeof m.message === 'string' ? m.message : 'unknown worker failure'}`);
      }
    };
    current.postMessage({
      type: 'init', ...(landingPreset ? { landing_preset: landingPreset } : {}), dt_s: 1 / 120, aircraft: 'c172x', state_hz: 60,
      ic: {
        lat_rad: 49.96 * DEG_RAD, lon_rad: 8.643 * DEG_RAD,
        alt_msl_m: 1300 * 0.3048, heading_rad: 82 * DEG_RAD,
        tas_mps: 90 * 1852 / 3600,
      },
    });
  }

  return {
    start() {
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
      callbacks.onStatus('Paused');
    },
    reset(preset) {
      if (disposed) return;
      if (preset !== undefined && !['normal', 'hard', 'side', 'banked'].includes(preset)) return;
      landingPreset = preset;
      controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.7 };
      userControls = false;
      controlsChanged = true;
      initialize();
    },
    setAutopilot(mode, target_heading_rad) {
      if (disposed || !ready || !worker || ![0,1,2].includes(mode)) return;
      if (target_heading_rad !== undefined && !Number.isFinite(target_heading_rad)) return;
      worker.postMessage({ type: 'autopilot', mode,
        ...(target_heading_rad === undefined ? {} : { target_heading_rad: ((target_heading_rad % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI) }) });
    },
    setAltimeter(setting_pa) {
      if (disposed || !ready || !worker || !Number.isFinite(setting_pa)
        || setting_pa < 80_000 || setting_pa > 110_000) return;
      worker.postMessage({ type: 'altimeter', setting_pa });
    },
    input(value) {
      if (disposed) return;
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
