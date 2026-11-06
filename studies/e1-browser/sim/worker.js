// E1 browser check: JSBSim WASM in a module Web Worker, implementing the
// shared worker message contract v0 in ../README.md. Study code only.
//
// Contract interpretation (recorded in sim/README.md):
// - `step` in a state message is the number of completed fixed steps since init;
//   t_s = step * dt_s up to JSBSim's own time accumulation.
// - An input {step: s} is applied immediately before the step that advances the
//   simulation from s to s + 1 completed steps ("first step >= s"). If the worker
//   has already passed s, it applies the input before the next step and counts it
//   as late. Later inputs for the same step win.
// - wall_ms is the sender's performance.timeOrigin + performance.now() (epoch ms),
//   so main thread and worker timestamps are comparable.
// - Pacing: wall clock decides how many steps are due (step n+1 is due at
//   t0 + (n+1)*dt/rate); native integration always retains dt. Up to MAX_CATCHUP
//   steps run per tick. A step is *missed* when it starts more than one paced
//   wall-step period after its due time (8.3 ms at 1x with dt=1/120 s).
//   max_lag_steps (due minus completed steps at a
//   tick, before catch-up), max_lag_ms and max_catchup_batch are reported.
//   A deficit beyond MAX_CATCHUP is additionally dropped from the wall-clock
//   schedule (dropped_steps; simulation time slips, no integration step is
//   skipped, so the trajectory stays step-indexed and replayable).
//
// Benchmark-only extensions (not in contract v0): ready.trim, {type:"stats"}
// request and the {type:"stats"} reply (also sent after "stop"), and an optional
// run.until_step: the worker pauses on reaching that step and sends stats, so
// replays are compared at an identical step count; {type:"burst", steps, blocks}
// runs steps back to back while paused (no pacing) and replies with the mean
// cost per step for each block, separating compute cost from post-idle wake cost.
import createJSBSim from './dist/jsbsim.mjs';
import { sampleTerrain, sampleTerrainGradient, terrainContainsInterior } from './terrain.js';
import { sampleAtlas, sampleAtlasGradient } from './terrain-stream.js';
import { createTerrainSourceStream } from './terrain-source-client.js';
import { createTerrainPrediction } from './terrain-prediction.js';
import { pressureAltitude_m, indicatedAltitude_m, validSetting } from './altimeter.js';
import { stallFields, controlFields, cockpitFields, pitchTrimFields, groundFields } from './cockpit.js';
import { autopilotCommand, engineFields, engineSwitchFields } from './engine.js';
import { groundCollisionContact, collisionRecord, collisionStateFields, contactOutcome, unacknowledgedContact, EMPTY_COLLISION } from './collision.js';
import { createKap140, validKapCommand, validKapState } from './kap140.js';
import { resumeProblem, resumeValues } from './continue-flight.js';
import { FLIGHT_DEFAULT_LOADING, validLoading, loadingValues, loadingFromState, loadingFields, LOADING_FIELDS } from './loading.js';
import { createAltitudeAlert } from './altitude-alert.js';
import { DEFAULT_NAVIGATION, NAVIGATION_FIELDS, validNavigation, navigationSignal, loadNavigationPackage } from './navigation.js';
import { validSimulationRate, pacedStepMilliseconds } from './simulation-rate.js';

const MAX_CATCHUP = 12;          // steps per tick (100 ms at 1/120 s)
const TIMER_SLACK_MS = 0.1;     // wake margin after a step's due time
const COST_CAPACITY = 1 << 20;   // per-step cost samples kept for stats

const wallNow = () => performance.timeOrigin + performance.now();

let M = null;
let build = null;
const modulePromise = (async () => {
  const infoUrl = new URL('./dist/build-info.json', import.meta.url);
  const [mod, info] = await Promise.all([
    createJSBSim({ print: () => {}, printErr: () => {} }),
    fetch(infoUrl).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  M = mod;
  build = info;
})();

let initialized = false;
let dtS = 1 / 120;
let simulationRate = 1;
let statePeriodMs = 1000 / 60;
let running = false;
let stepIndex = 0;
let t0Ms = 0;         // wall (performance.now) origin of the pacing schedule
let stepBase = 0;     // stepIndex at t0Ms
let timer = null;
let nextPostMs = 0;      // performance.now() at which the next state is due
let pending = [];     // inputs sorted by step (stable)
let lastInputWallMs = null;
let lastStepCostUs = 0;
let missedSteps = 0;
let droppedSteps = 0;
let maxLagSteps = 0;
let maxLagMs = 0;
let lateInputs = 0;
let appliedInputs = 0;
let maxBatch = 0;
let ticks = 0;
let costs = new Float32Array(0);
let costCount = 0;
let runWallStartMs = 0;
let runWallMs = 0;
let untilStep = Infinity;
let terrainGrid = null;
let terrainFault = false;
let terrainStream = null;
let terrainSource = null;
const terrainPrediction = createTerrainPrediction();
let terrainLoad = null;
let terrainGeneration = 0;
let resumeAfterTerrain = false;
function terrainSample(lat, lon) {
  return terrainStream ? sampleAtlas(terrainGrid, terrainStream.tiles, lat, lon) : sampleTerrain(terrainGrid, lat, lon);
}
function terrainGradient(lat, lon) {
  return terrainStream ? sampleAtlasGradient(terrainGrid, terrainStream.tiles, lat, lon) : sampleTerrainGradient(terrainGrid, lat, lon);
}
function installTile(grid) {
  const pointer = M._malloc(grid.physical_m.byteLength);
  if (!pointer) throw new Error('Cannot allocate regional terrain tile.');
  let rc;
  try {
    M.HEAPF64.set(grid.physical_m, pointer / 8);
    rc = M._gf_set_terrain_tile(grid.slot, grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad,
      grid.width, grid.height, pointer, grid.physical_m.length);
  } finally { M._free(pointer); }
  if (rc !== 0) throw new Error(`Regional terrain tile rejected: ${rc}`);
  const physical_m = grid.physical_m.slice(), geoid_m = grid.geoid_m.slice();
  postMessage({ type: 'terrain-tile', grid: { ...grid, physical_m, geoid_m } }, [physical_m.buffer, geoid_m.buffer]);
}
function removeTile(grid) {
  if (M._gf_remove_terrain_tile(grid.slot) !== 0) throw new Error('Cannot remove regional terrain tile.');
  postMessage({ type: 'terrain-remove', id: grid.id });
}
function requestTerrain(lat, lon) {
  if (terrainLoad) return;
  const generation = terrainGeneration, stream = terrainStream;
  resumeAfterTerrain = running;
  onHalt(true, true);
  postMessage({ type: 'terrain-loading', loading: true });
  terrainLoad = stream.move(lat, lon).then(() => {
    if (generation !== terrainGeneration) return;
    terrainLoad = null;
    postMessage({ type: 'terrain-loading', loading: false });
    if (resumeAfterTerrain) { resumeAfterTerrain = false; onRun({ until_step: untilStep }); }
  }).catch(error => {
    if (generation !== terrainGeneration) return;
    terrainLoad = null; resumeAfterTerrain = false; terrainFault = true;
    fail(`Terrain loading failed: ${error.message}`);
  });
}
let groundCollisionEnabled = false;
let collision = EMPTY_COLLISION;
let acknowledgedContacts = 0;
let continuedCollision = null;
// Contact-data availability from the latest ground sample. When contact
// telemetry is unavailable the collision group is omitted from state/stats
// (never published as collision_mask 0, which would read as a definitive clear).
let collisionAvailable = false;
let kap = null;
let altitudeAlert = null;
let pilotOverrideActive = false;
let navigation = { ...DEFAULT_NAVIGATION };
let navigationPackage = null;
// Init/ready navdata identity contract (see README "Navigation database"):
// navdata_sha256 is the lowercase hex SHA-256 of the exact package bytes this
// worker loaded and verified, or null when none was loaded; navdata_error is the
// load failure message, or null. A failed load degrades NAV sources to
// unavailable instead of stopping every flight mode.
let navdataError = null;
// Ideal pressure instrument only. Its setting never changes the atmosphere,
// dynamics state, integration step or original study digest.
let altimeterSettingPa = 101325;
let altimeterReferences = null;
let altimeterFields = {};

function updateAltimeter() {
  // Clear first, so unsupported/out-of-domain pressure never leaves ghost values.
  altimeterFields = {};
  if (!altimeterReferences || typeof M._gf_static_pressure_pa !== 'function') return;
  const p_static_pa = M._gf_static_pressure_pa();
  const indicated_m = indicatedAltitude_m(p_static_pa, altimeterSettingPa);
  if (indicated_m === null) return;
  altimeterFields = {
    p_static_pa, altimeter_setting_pa: altimeterSettingPa,
    altimeter_indicated_m: indicated_m, ...altimeterReferences,
  };
}

function initializeAltimeter() {
  altimeterSettingPa = 101325;
  altimeterReferences = null;
  altimeterFields = {};
  // An older local engine remains flyable; the UI can request its rebuild.
  if (typeof M._gf_static_pressure_pa !== 'function'
    || typeof M._gf_sealevel_pressure_pa !== 'function') return;
  const qnh_pa = M._gf_sealevel_pressure_pa();
  const qfe_pa = M._gf_static_pressure_pa();
  const datum_m = readState()[3];
  // Launch QFE records a sensor reference, which can be below the selectable
  // subscale range at a supported high-altitude start. It must not hide an
  // otherwise valid QNH/standard indication.
  if (!validSetting(qnh_pa) || pressureAltitude_m(qfe_pa) === null || !Number.isFinite(datum_m)) return;
  altimeterReferences = {
    altimeter_qnh_pa: qnh_pa, altimeter_qfe_pa: qfe_pa,
    altimeter_qfe_datum_m: datum_m,
  };
  updateAltimeter();
}

function onAltimeter(msg) {
  if (altimeterReferences && msg.setting_pa === altimeterReferences.altimeter_qfe_pa && !validSetting(msg.setting_pa)) {
    postMessage({ type: 'altimeter-rejected', message: 'Launch QFE is outside the 800–1100 hPa practice setting range. Use QNH or standard pressure.' });
    return;
  }
  if (!validSetting(msg.setting_pa) || !altimeterReferences) {
    postMessage({ type: 'altimeter-rejected', message: 'Pressure setting unavailable or outside practice bounds.' });
    return;
  }
  altimeterSettingPa = msg.setting_pa;
  updateAltimeter();
  // A knob adjustment while paused publishes a new instrument frame at the same
  // physics step; it does not run JSBSim or invent an aircraft control input.
  postState();
}

function fail(message) {
  running = false;
  if (timer !== null) { clearTimeout(timer); timer = null; }
  postMessage({ type: 'error', message });
}

function finiteIn(x, lo, hi) {
  return typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
}

function readState() {
  const p = M._gf_state() >> 3;
  return M.HEAPF64.subarray(p, p + 8);
}

function readCockpitFields() {
  if (typeof M._gf_cockpit_state !== 'function') return {};
  const pointer = M._gf_cockpit_state() >> 3;
  return cockpitFields(M.HEAPF64.subarray(pointer, pointer + 8));
}

function readStallFields() {
  if (typeof M._gf_stall_state !== 'function') return {};
  const pointer = M._gf_stall_state() >> 3;
  return stallFields(M.HEAPF64.subarray(pointer, pointer + 13));
}

function readControlFields() {
  if (typeof M._gf_control_state !== 'function') return {};
  const pointer = M._gf_control_state() >> 3;
  return controlFields(M.HEAPF64.subarray(pointer, pointer + 7));
}

function readPitchTrimFields() {
  if (typeof M._gf_pitch_trim_state !== 'function') return {};
  const pointer = M._gf_pitch_trim_state() >> 3;
  return pitchTrimFields(M.HEAPF64.subarray(pointer, pointer + 3));
}

function readGroundFields() {
  if (typeof M._gf_ground_state !== 'function') return {};
  const pointer = M._gf_ground_state() >> 3;
  const fields = groundFields(M.HEAPF64.subarray(pointer, pointer + 18));
  if (terrainGrid && Number.isFinite(fields.ground_height_ellipsoid_m)) {
    const state = readState(), sample = terrainSample(state[1], state[2]);
    if (!sample) throw new Error('Terrain coverage unavailable; the bundled world terrain could not support this position.');
    fields.ground_height_ellipsoid_m += sample.geoid_m;
  }
  return fields;
}

function readEngineFields() {
  if (typeof M._gf_engine_state !== 'function') return {};
  const pointer = M._gf_engine_state() >> 3;
  return engineFields(M.HEAPF64.subarray(pointer, pointer + 13));
}

function readLoadingFields() {
  if (typeof M._gf_loading_state !== 'function') return {};
  const pointer = M._gf_loading_state() >> 3;
  return loadingFields(M.HEAPF64.subarray(pointer, pointer + LOADING_FIELDS.length));
}

function readEngineSwitchFields() {
  if (typeof M._gf_engine_switch_state !== 'function') return {};
  const pointer = M._gf_engine_switch_state() >> 3;
  return engineSwitchFields(M.HEAPF64.subarray(pointer, pointer + 2));
}

function kapSensors() {
  const state = readState(), ground = readGroundFields();
  const pointer = M._gf_autopilot_vertical_state() >> 3;
  const pressureAltitude = pressureAltitude_m(M._gf_static_pressure_pa());
  if (pressureAltitude === null) throw new Error('Autopilot pressure sensor outside the supported −2 km to 11 km atmosphere.');
  return { t_s: state[0], dt_s: dtS, heading_rad: state[6], physical_altitude_m: state[3],
    pressure_altitude_m: pressureAltitude,
    vertical_speed_mps: -ground.ground_down_mps, elevator_norm: M.HEAPF64[pointer + 2],
    nav: navigationSignal(navigation, { lat_rad: state[1], lon_rad: state[2], alt_msl_m: state[3] }, navigationPackage?.records, navigationPackage?.source_label) };
}
// Invalid sensors are surfaced, not skipped: the controller disconnects an
// engaged AP and sets kap_sensor_fault in every following state; the worker
// also reports the transition once (generic simulator safety substitution).
let kapSensorsInvalid = false;
function stepKap(sensors) {
  const valid = kap.step(sensors);
  if (!valid && !kapSensorsInvalid) postMessage({ type: 'autopilot-fault', message: 'Autopilot sensors invalid; autopilot disconnected.' });
  kapSensorsInvalid = !valid;
}
function applyKapGuidance(sensors = kapSensors()) {
  if (!kap) return true;
  const guidance = kap.guidance(sensors);
  if (M._gf_set_autopilot(guidance.lateral_mode, guidance.heading_rad) !== 0
    || M._gf_set_autopilot_vertical(guidance.vertical_mode, guidance.vertical_target) !== 0) {
    fail('Autopilot controller target unavailable; flight stopped.'); return false;
  }
  return true;
}
function alertSensors() {
  const snapshot = kap.snapshot(kapSensors());
  return {t_s:readState()[0], indicated_altitude_m:snapshot.kap_indicated_altitude_m, selected_altitude_m:snapshot.kap_selected_altitude_m, baro_setting_pa:snapshot.kap_baro_setting_pa};
}
function kapFields() {
  if (!kap) return {};
  const fields = kap.snapshot(kapSensors());
  if (!validKapState(fields)) throw new Error('Invalid autopilot instrument state');
  return { ...fields, ...(altitudeAlert ? altitudeAlert.snapshot() : {}) };
}
function onKap140(msg) {
  const command = msg.command;
  // A queued neutral input from the release gesture must take effect while CWS
  // still owns the servos; do not resume over stale raw pilot commands.
  if (kap && validKapCommand(command) && command.action === 'cws' && command.value === 0 && !applyDueInputs()) return;
  if (kap && command?.action === 'ap' && !kap.snapshot(kapSensors()).kap_engaged && pilotOverrideActive) {
    postMessage({type:'autopilot-rejected',message:'Release manual flight input before engaging autopilot.'}); postState(); return;
  }
  let outsidePressureEnvelope = false;
  if (kap && validKapCommand(command) && ['select-altitude','baro-setting'].includes(command.action)) {
    const snapshot = kap.snapshot(kapSensors());
    const target = command.action === 'select-altitude' ? command.value : snapshot.kap_selected_altitude_m;
    const setting = command.action === 'baro-setting' ? command.value : snapshot.kap_baro_setting_pa;
    const pressureTarget = target + pressureAltitude_m(setting);
    outsidePressureEnvelope = pressureTarget < -2000 || pressureTarget > 11000;
  }
  if (!kap || !validKapCommand(command) || outsidePressureEnvelope || !kap.command(command, kapSensors())) {
    postMessage({ type: 'autopilot-rejected', message: 'KAP 140 command unavailable or outside supported practice sensor bounds.' }); if (kap) postState(); return;
  }
  if (command.action === 'cws' && command.value === 0 && pilotOverrideActive) kap.command({action:'disconnect'}, kapSensors());
  if (!applyKapGuidance()) return;
  altitudeAlert?.update(alertSensors());
  postState();
}

// Simulator convenience: capture both axes from one authoritative sensor frame.
// This is deliberately separate from the physical KAP 140 AP button semantics.
function onAutopilotCapture() {
  if (!kap) {
    postMessage({ type: 'autopilot-rejected', message: 'Autopilot capture is unavailable.' }); return;
  }
  // A release queued immediately before this command must take effect even while
  // paused. Genuine held pilot input still prevents engagement.
  if (!applyDueInputs()) return;
  if (pilotOverrideActive) {
    postMessage({ type: 'autopilot-rejected', message: 'Release manual flight input before engaging autopilot.' });
    postState(); return;
  }
  const sensors = kapSensors();
  const snapshot = kap.snapshot(sensors);
  const selected = snapshot.kap_indicated_altitude_m;
  if (selected < -1000 || selected > 20000) {
    postMessage({ type: 'autopilot-rejected', message: 'Current altitude is outside the autopilot selection range.' }); return;
  }
  // Clear prior NAV/GS/vertical modes, then capture HDG and ALT once. Recapture
  // while engaged also stays engaged rather than toggling AP off.
  for (const command of [
    { action: 'disconnect' }, { action: 'heading', value: sensors.heading_rad },
    { action: 'select-altitude', value: selected }, { action: 'ap' },
    { action: 'hdg' }, { action: 'alt' },
  ]) {
    if (!kap.command(command, sensors)) { fail('Autopilot capture command failed.'); return; }
  }
  if (!applyKapGuidance(sensors)) return;
  altitudeAlert?.update(alertSensors());
  postState();
}

function onSimulationRate(msg) {
  if (!validSimulationRate(msg.rate)) {
    postMessage({ type: 'simulation-rate-rejected', message: 'Unsupported simulation speed.' }); return;
  }
  if (msg.rate !== simulationRate) {
    // Rebase at the last completed fixed step, so changing speed cannot replay
    // elapsed wall time at the new rate or produce one large integration step.
    const wasRunning = running;
    if (wasRunning) onHalt();
    simulationRate = msg.rate;
    if (wasRunning) onRun({ until_step: untilStep });
  }
  postState();
}
function onNavigation(msg) {
  if (!validNavigation(msg.config)) {
    postMessage({ type: 'navigation-rejected', message: 'NAV1 configuration invalid.' }); return;
  }
  const merged = { ...navigation, ...msg.config };
  navigation = Object.fromEntries(NAVIGATION_FIELDS.map(k => [k, merged[k]]));
  // Source-loss fallback is immediate even while paused; dynamics stay frozen.
  if (kap) { const sensors = kapSensors(); stepKap(sensors); if (!applyKapGuidance(sensors)) return; }
  postState();
}
function onAutopilot(msg) {
  if (kap) {
    if (![0,1,2].includes(msg.mode) || (msg.target_heading_rad !== undefined && !Number.isFinite(msg.target_heading_rad))) { postMessage({type:'autopilot-rejected', message:'Invalid legacy AP command'}); return; }
    const sensors = kapSensors();
    if (msg.mode !== 0 && pilotOverrideActive) { postMessage({type:'autopilot-rejected',message:'Release manual flight input before engaging autopilot.'}); postState(); return; }
    if (msg.mode === 0) kap.command({action:'disconnect'}, sensors);
    else {
      if (!kap.snapshot(sensors).kap_engaged) kap.command({action:'ap'}, sensors);
      if (msg.mode === 2) {kap.command({action:'heading',value:(((msg.target_heading_rad ?? sensors.heading_rad) % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI)}, sensors); if (kap.snapshot(sensors).kap_lateral !== 1) kap.command({action:'hdg'}, sensors);}
      else {
        const snapshot=kap.snapshot(sensors);
        if (snapshot.kap_lateral !== 0 || snapshot.kap_lateral_arm) {
          if (snapshot.kap_lateral !== 1) kap.command({action:'hdg'}, sensors);
          kap.command({action:'hdg'}, sensors);
        }
      }
    }
    if (applyKapGuidance()) postState(); return;
  }
  const command = autopilotCommand(msg, readState()[6]);
  if (!command || typeof M._gf_set_autopilot !== 'function') {
    postMessage({ type: 'autopilot-rejected', message: 'Autopilot command unavailable or invalid.' });
    return;
  }
  const rc = M._gf_set_autopilot(command.mode, command.target_heading_rad);
  if (rc !== 0) {
    postMessage({ type: 'autopilot-rejected', message: `Autopilot command rejected: ${rc}` });
    return;
  }
  // Mode and target changes are visible while paused, without running physics.
  postState();
}

function terrainFields() {
  if (!terrainGrid) return {};
  const state = readState(), sample = terrainSample(state[1], state[2]);
  if (!sample) throw new Error('Public terrain coverage is unavailable.');
  let source = terrainStream?.quality(state[1], state[2]) ?? 1;
  if (sampleTerrain(terrainGrid, state[1], state[2])) {
    const edge = Math.min(state[2] - terrainGrid.west_rad, terrainGrid.east_rad - state[2], state[1] - terrainGrid.south_rad, terrainGrid.north_rad - state[1]);
    source = source !== 1 && edge < .02 * Math.PI / 180 ? 3 : 1;
  }
  return { terrain_profile: 1, terrain_source: source, terrain_height_msl_m: sample.physical_m,
    terrain_geoid_m: sample.geoid_m, terrain_height_ellipsoid_m: sample.ellipsoid_m };
}

function collisionFields() {
  return collisionStateFields(groundCollisionEnabled, collisionAvailable, collision);
}

function sampleContact() {
  const ground = readGroundFields(), state = readState();
  return groundCollisionContact(ground.ground_agl_m, state[4], state[5], ground.structure_contact_mask, terrainGrid ? { ...terrainGradient(state[1], state[2]), heading_rad: state[6] } : undefined, ground);
}

function stateMessage() {
  const flapCommand = typeof M._gf_flap_command_norm === 'function' ? M._gf_flap_command_norm() : NaN;
  const s = readState();
  return {
    ...(Number.isFinite(flapCommand) && flapCommand >= 0 && flapCommand <= 1 ? { flap_command_norm: flapCommand } : {}),
    type: 'state', step: stepIndex, simulation_rate: simulationRate, t_s: s[0], lat_rad: s[1], lon_rad: s[2],
    alt_msl_m: s[3], roll_rad: s[4], pitch_rad: s[5], heading_rad: s[6], tas_mps: s[7],
    last_input_wall_ms: lastInputWallMs, step_cost_us: lastStepCostUs, ...altimeterFields,
    ...readLoadingFields(), ...readStallFields(), ...readControlFields(), ...readCockpitFields(), ...readPitchTrimFields(), ...readGroundFields(), ...readEngineFields(), ...readEngineSwitchFields(), ...terrainFields(), ...kapFields(), ...((kap || navigationPackage) ? navigation : {}), ...collisionFields(),
  };
}

function postState() {
  const msg = stateMessage();
  for (const k of ['t_s', 'lat_rad', 'lon_rad', 'alt_msl_m', 'roll_rad', 'pitch_rad', 'heading_rad', 'tas_mps']) {
    if (!Number.isFinite(msg[k])) { fail(`non-finite state ${k} at step ${stepIndex}`); return false; }
  }
  postMessage(msg);
  if (running && terrainStream && !terrainLoad) {
    const focus = terrainPrediction.update(msg, simulationRate);
    void terrainStream.prefetch(msg.lat_rad, msg.lon_rad, focus);
  }
  return true;
}

function applyDueInputs() {
  while (pending.length && pending[0].step <= stepIndex) {
    const inp = pending.shift();
    pilotOverrideActive = inp.pilot_override ?? (inp.elevator !== 0 || inp.aileron !== 0 || inp.rudder !== 0);
    if (kap && kap.snapshot(kapSensors()).kap_engaged) {
      const trimPointer = typeof M._gf_pitch_trim_state === 'function' ? M._gf_pitch_trim_state() >> 3 : null;
      const trimChanged = inp.pitch_trim_norm !== undefined && trimPointer !== null && Math.abs(inp.pitch_trim_norm - M.HEAPF64[trimPointer]) > 1e-12;
      if (!kap.snapshot(kapSensors()).kap_cws && (inp.pilot_override === true || (inp.pilot_override === undefined && (inp.elevator !== 0 || inp.aileron !== 0 || inp.rudder !== 0)) || trimChanged)) { kap.command({action:'disconnect'}, kapSensors()); if (!applyKapGuidance()) return false; }
    }
    const rc = M._gf_set_inputs(inp.elevator, inp.aileron, inp.rudder, inp.throttle);
    if (rc !== 0) { fail(`set_inputs rc=${rc}`); return false; }
    if (typeof M._gf_set_secondary_inputs === 'function') {
      const secondary = M._gf_set_secondary_inputs(inp.flap_norm, inp.brake_norm);
      if (secondary !== 0) { fail(`secondary inputs rc=${secondary}`); return false; }
    }
    // Omitted trim preserves the initialization result and legacy study input.
    // Apply an explicit command at the same fixed-step boundary as pilot axes.
    if (inp.pitch_trim_norm !== undefined && typeof M._gf_set_pitch_trim === 'function') {
      const trim = M._gf_set_pitch_trim(inp.pitch_trim_norm);
      if (trim !== 0) { fail(`pitch trim rc=${trim}`); return false; }
    }
    if (typeof M._gf_set_engine_controls === 'function') {
      const engine = M._gf_set_engine_controls(inp.mixture_norm, inp.mixture_auto ? 1 : 0);
      if (engine !== 0) { fail(`engine controls rc=${engine}`); return false; }
    }
    if (inp.engine_running !== undefined) {
      const engine = M._gf_set_engine_running(inp.engine_running ? 1 : 0);
      if (engine !== 0) { fail(`engine ignition/starter rc=${engine}`); return false; }
    }
    if (inp.step < stepIndex) lateInputs += 1;
    lastInputWallMs = inp.wall_ms;
    appliedInputs += 1;
  }
  return true;
}

function stepOnce() {
  if (collision.collision_mask) return false;
  const a = performance.now();
  if (running) {                      // paced steps only (not burst)
    const wallStepMs = pacedStepMilliseconds(dtS, simulationRate);
    const lagMs = a - (t0Ms + (stepIndex + 1 - stepBase) * wallStepMs);
    if (lagMs > wallStepMs) missedSteps += 1;
    if (lagMs > maxLagMs) maxLagMs = lagMs;
  }
  if (terrainGrid) {
    const state = readState();
    if (terrainStream && terrainStream.needsUpdate(state[1], state[2])) {
      requestTerrain(state[1], state[2]); return false;
    }
    if ((!terrainStream && !terrainContainsInterior(terrainGrid, state[1], state[2])) || M._gf_terrain_available() !== 1) {
      terrainFault = true; fail('Terrain/contact support unavailable at this position. Check bundled world terrain data and latitude coverage.'); return false;
    }
  }
  if (!applyDueInputs()) return false;
  if (kap) { const sensors = kapSensors(); stepKap(sensors); if (!applyKapGuidance(sensors)) return false; }
  const previousGround = groundCollisionEnabled ? readGroundFields() : null;
  const rc = M._gf_step();
  const b = performance.now();
  if (rc !== 0) { if (rc === -7) terrainFault = true; fail(rc === -7 ? 'Terrain/contact coverage unavailable; flight stopped without changing aircraft position.' : `step rc=${rc} at step ${stepIndex}`); return false; }
  stepIndex += 1;
  updateAltimeter();
  if (altitudeAlert) altitudeAlert.update(alertSensors());
  lastStepCostUs = (b - a) * 1000;
  if (costCount < costs.length) costs[costCount++] = lastStepCostUs;
  if (groundCollisionEnabled) {
    const sampled = sampleContact();
    const filtered = unacknowledgedContact(sampled, acknowledgedContacts);
    acknowledgedContacts = filtered.acknowledgedMask;
    const contact = filtered.contact;
    collisionAvailable = sampled.available;
    const record = contact.mask ? collisionRecord(contact.mask, stepIndex, readState()[0], previousGround) : null;
    const outcome = contactOutcome(contact, record, previousGround);
    // Airborne first contacts remain active; wheel support must predate this
    // native step to count as a ground roll. Without valid pre-step motion
    // there is no truthful record, so the flight stops with an explicit error.
    if (outcome === 'fail') { fail(`Ground contact detected at step ${stepIndex} but its pre-step motion is unavailable; flight stopped.`); return false; }
    if (outcome === 'latch') {

      collision = record;
      pending = [];
      onHalt();
      postState();
      postMessage(stats());
      return false;
    }
  }
  return true;
}

function tick() {
  timer = null;
  if (!running) return;
  ticks += 1;
  let now = performance.now();
  const wallStepMs = pacedStepMilliseconds(dtS, simulationRate);
  const target = stepBase + Math.floor((now - t0Ms) / wallStepMs + 1e-9);
  if (target - stepIndex > maxLagSteps) maxLagSteps = target - stepIndex;
  let batch = 0;
  while (stepIndex < target && batch < MAX_CATCHUP && stepIndex < untilStep) {
    if (!stepOnce()) return;
    batch += 1;
  }
  if (batch > maxBatch) maxBatch = batch;
  if (stepIndex >= untilStep) {
    postState();
    onHalt();
    postMessage(stats());
    return;
  }
  if (stepIndex < target) {          // deficit beyond catch-up: drop it
    const deficit = target - stepIndex;
    droppedSteps += deficit;
    t0Ms += deficit * wallStepMs;
  }
  now = performance.now();
  if (batch > 0 && now >= nextPostMs) {
    if (!postState()) return;
    while (nextPostMs <= now) nextPostMs += statePeriodMs;   // fixed cadence, no backlog
  }
  // Wake just after the next step is due (timer callbacks can fire slightly early).
  const nextStepMs = t0Ms + (stepIndex + 1 - stepBase) * wallStepMs;
  timer = setTimeout(tick, Math.max(0, nextStepMs - performance.now() + TIMER_SLACK_MS));
}

function stats() {
  const s = readState();
  return {
    type: 'stats', step: stepIndex, t_s: s[0], dt_s: dtS, simulation_rate: simulationRate,
    digest: M.UTF8ToString(M._gf_digest_hex()),
    final_state: Array.from(M.HEAPF64.subarray(M._gf_state() >> 3, (M._gf_state() >> 3) + M._gf_state_len())),
    missed_steps: missedSteps, dropped_steps: droppedSteps,
    max_lag_steps: maxLagSteps, max_lag_ms: maxLagMs, late_inputs: lateInputs, applied_inputs: appliedInputs,
    pending_inputs: pending.length, max_catchup_batch: maxBatch, ticks,
    run_wall_ms: runWallMs + (running ? performance.now() - runWallStartMs : 0),
    step_cost_us: costs.slice(0, costCount),
    cross_origin_isolated: self.crossOriginIsolated === true,
    ...collisionFields(), ...kapFields(),
  };
}

async function onInit(msg) {
  terrainSource?.cancel(); terrainSource = null;
  initialized = false; terrainGeneration++; terrainLoad = null; resumeAfterTerrain = false; terrainStream = null; terrainFault = false; kap = null; altitudeAlert = null; pilotOverrideActive = false; navigation = { ...DEFAULT_NAVIGATION }; navigationPackage = null; navdataError = null; collisionAvailable = false; kapSensorsInvalid = false;
  await modulePromise;
  const resume = msg.resume_state;
  if (resume !== undefined) {
    const problem=resumeProblem(resume,msg.dt_s);
    if(problem){fail(`Continuation unavailable: ${problem}`);return;}
    if(msg.landing_preset!==undefined||msg.runway_start||!msg.kap140||typeof M._gf_init_resume!=='function') {fail('Continuation requires the updated native engine and exclusive resume initialization.');return;}
    if((resume.terrain_profile===1)!==(msg.terrain===true)){fail('Continuation terrain profile does not match the selected frame.');return;}
  }
  const loading=resume?loadingFromState(resume):(msg.loading??FLIGHT_DEFAULT_LOADING);
  if(resume&&LOADING_FIELDS.some(key=>Object.hasOwn(resume,key))&&!loading){fail('Recorded loading group is incomplete or invalid.');return;}
  if(msg.loading!==undefined&&!validLoading(msg.loading)){fail('init: invalid loading configuration');return;}
  if(loading&&typeof M._gf_configure_loading!=='function'){fail('Loading requires the updated native engine.');return;}
  if(typeof M._gf_configure_loading==='function'){
    let rc;
    if(loading){const base=loadingValues(loading),values=resume&&Number.isFinite(resume.loading_initial_fuel_m3)?new Float64Array([...base,resume.loading_initial_fuel_m3]):base;const pointer=M._malloc(values.byteLength);if(!pointer){fail('Cannot allocate loading configuration.');return;}try{M.HEAPF64.set(values,pointer/8);rc=M._gf_configure_loading(pointer,values.length);}finally{M._free(pointer);}}
    else rc=M._gf_configure_loading(0,0);
    if(rc!==0){fail(`Loading configuration rejected: ${rc}`);return;}
  }
  const ic = resume ? {lat_rad:resume.lat_rad,lon_rad:resume.lon_rad,alt_msl_m:resume.alt_msl_m,heading_rad:resume.heading_rad,tas_mps:resume.tas_mps} : msg.ic || {};
  const dt = msg.dt_s;
  const hz = msg.state_hz === undefined ? 60 : msg.state_hz;
  if (!finiteIn(dt, 1e-4, 0.1) || !finiteIn(hz, 1, 1000)) { fail('init: bad dt_s or state_hz'); return; }
  if (msg.aircraft !== 'c172x') { fail(`init: unsupported aircraft ${msg.aircraft}`); return; }
  if (msg.ground_collision !== undefined && typeof msg.ground_collision !== 'boolean') { fail('init: ground_collision must be boolean'); return; }
  if (msg.streaming_terrain !== undefined && (typeof msg.streaming_terrain !== 'boolean' || (msg.streaming_terrain && msg.terrain !== true))) { fail('init: invalid streaming_terrain flag'); return; }
  if (msg.terrain !== undefined && typeof msg.terrain !== 'boolean') { fail('init: terrain must be boolean'); return; }
  if (msg.regional_navigation !== undefined && typeof msg.regional_navigation !== 'boolean') { fail('init: invalid regional_navigation flag'); return; }
  if (msg.navigation !== undefined) {
    if (!validNavigation(msg.navigation)) { fail('init: invalid navigation configuration'); return; }
    const merged = { ...DEFAULT_NAVIGATION, ...msg.navigation };
    navigation = Object.fromEntries(NAVIGATION_FIELDS.map(k => [k, merged[k]]));
  }
  if(resume)navigation=Object.fromEntries(NAVIGATION_FIELDS.map(k=>[k,resume[k]??DEFAULT_NAVIGATION[k]]));
  if (msg.kap140 !== undefined && typeof msg.kap140 !== 'boolean') { fail('init: invalid kap140 capability flag'); return; }
  const presets = { normal: 1, hard: 2, side: 3, banked: 4 };
  const preset = msg.landing_preset;
  if (msg.runway_start !== undefined && typeof msg.runway_start !== 'boolean') { fail('init: invalid runway_start'); return; }
  if (msg.runway_start && (preset !== undefined || typeof M._gf_init_runway !== 'function')) { fail('Runway start unavailable. Rebuild the native engine.'); return; }

  if (preset !== undefined && (typeof preset !== 'string' || !Object.hasOwn(presets, preset)
    || typeof M._gf_init_landing !== 'function')) { fail('init: landing preset unavailable or invalid'); return; }
  if (msg.regional_navigation === true) {
    try { navigationPackage = await loadNavigationPackage(); }
    catch (e) { navigationPackage = null; navdataError = `Navigation database unavailable: ${e && e.message ? e.message : String(e)}`.slice(0, 500); }
  }
  terrainGrid = null;
  if (typeof M._gf_clear_terrain_grid === 'function') M._gf_clear_terrain_grid();
  if (msg.terrain === true) {
    if (['_gf_configure_terrain_grid', '_gf_terrain_available', '_malloc', '_free'].some(name => typeof M[name] !== 'function')) {
      fail('Public terrain requires the updated local engine. Run just build-flight-engine and restart.'); return;
    }
    const generation = terrainGeneration;
    terrainSource = createTerrainSourceStream(
      grid => { if (generation === terrainGeneration) installTile(grid); },
      grid => { if (generation === terrainGeneration) removeTile(grid); },
      { fine: true, streaming: !!msg.streaming_terrain });
    if (msg.streaming_terrain) terrainStream = terrainSource;
    await terrainSource.ready;
    terrainGrid = terrainSource.fine;
    if (!msg.streaming_terrain && !terrainContainsInterior(terrainGrid, ic.lat_rad, ic.lon_rad)) { fail('Initial position is outside public terrain coverage.'); return; }
    const pointer = M._malloc(terrainGrid.physical_m.byteLength);
    if (!pointer) { fail('Cannot allocate the public terrain grid.'); return; }
    let configured;
    try {
      M.HEAPF64.set(terrainGrid.physical_m, pointer / 8);
      configured = M._gf_configure_terrain_grid(terrainGrid.west_rad, terrainGrid.south_rad, terrainGrid.east_rad,
        terrainGrid.north_rad, terrainGrid.width, terrainGrid.height, pointer, terrainGrid.physical_m.length);
    } finally { M._free(pointer); }
    if (configured !== 0) { fail(`Terrain grid rejected: ${configured}`); return; }
    if (!msg.streaming_terrain) { terrainSource.cancel(); terrainSource = null; }
  }
  if (msg.streaming_terrain) {
    if (typeof M._gf_set_terrain_tile !== 'function' || typeof M._gf_remove_terrain_tile !== 'function') {
      fail('Regional terrain requires the updated local engine. Run just build-flight-engine and restart.'); return;
    }
    const generation = terrainGeneration;
    terrainStream ??= terrainSource = createTerrainSourceStream(
      grid => { if (generation === terrainGeneration) installTile(grid); },
      grid => { if (generation === terrainGeneration) removeTile(grid); });
    await terrainStream.move(ic.lat_rad, ic.lon_rad);
  }
  let resumeRc=null;
  if(resume){const values=resumeValues(resume,dt),pointer=M._malloc(values.byteLength);if(!pointer){fail('Cannot allocate continuation state.');return;}try{M.HEAPF64.set(values,pointer/8);resumeRc=M._gf_init_resume(dt,pointer,values.length);}finally{M._free(pointer);}}
  const rc = resume ? resumeRc : msg.runway_start ? M._gf_init_runway(dt, ic.lat_rad, ic.lon_rad, ic.heading_rad) : preset === undefined
    ? M._gf_init(dt, ic.lat_rad, ic.lon_rad, ic.alt_msl_m, ic.heading_rad, ic.tas_mps)
    : M._gf_init_landing(dt, ic.lat_rad, ic.lon_rad, ic.heading_rad, presets[preset]);
  if (rc !== 0) { fail(`init rc=${rc}`); return; }
  dtS = dt; simulationRate = 1; statePeriodMs = 1000 / hz;
  stepIndex = resume ? resume.step : 0; pending = []; lastInputWallMs = null; lastStepCostUs = 0;
  missedSteps = 0; droppedSteps = 0; maxLagSteps = 0; maxLagMs = 0; lateInputs = 0; appliedInputs = 0; maxBatch = 0; ticks = 0;
  costs = new Float32Array(COST_CAPACITY); costCount = 0; runWallMs = 0;
  groundCollisionEnabled = msg.ground_collision === true; collision = EMPTY_COLLISION; acknowledgedContacts = 0; continuedCollision = null;
  collisionAvailable = groundCollisionEnabled && sampleContact().available;
  initializeAltimeter();
  if(resume){altimeterSettingPa=resume.altimeter_setting_pa;altimeterReferences={altimeter_qnh_pa:resume.altimeter_qnh_pa,altimeter_qfe_pa:resume.altimeter_qfe_pa,altimeter_qfe_datum_m:resume.altimeter_qfe_datum_m};updateAltimeter();}
  if (msg.kap140 && typeof M._gf_set_autopilot_vertical === 'function' && typeof M._gf_autopilot_vertical_state === 'function' && typeof M._gf_static_pressure_pa === 'function') {
    kap = createKap140(kapSensors());
    if(resume&&!kap.restore(resume,kapSensors())){fail('Recorded autopilot modes cannot be reconstructed.');return;}
    altitudeAlert = createAltitudeAlert(alertSensors());
    if (!applyKapGuidance()) return;
  }
  initialized = true;
  postMessage({
    type: 'ready',
    navdata_sha256: navigationPackage ? navigationPackage.sha256 : null,
    navdata_error: navdataError,
    build: { ...(navigationPackage ? { navigation: { id: navigationPackage.id, edition: navigationPackage.edition, sha256: navigationPackage.sha256, historical: navigationPackage.historical } } : {}), ...(terrainGrid ? { terrain: { id: terrainGrid.id, sha256: terrainGrid.sha256, physical_datum: terrainGrid.physical_datum, geoid_model: terrainGrid.geoid_model } } : {}),
             ...(terrainStream ? { regional_terrain: { id: 'world-with-optional-southern-germany-v1', world_id: terrainStream.world.id, world_sha256: terrainStream.world.sha256,
               regional_available: terrainStream.manifest.size > 0, regional_failed_tiles: terrainStream.failedSources.size, cache_limit: 9, transition_degrees: .02,
               loaded_tiles: Array.from(terrainStream.tiles.values(), grid => ({ id: grid.id, sha256: grid.sha256 })) } } : {}),
             jsbsim_tag: build.jsbsim_tag, emsdk: build.emsdk, wasm_bytes: build.wasm_bytes,
             jsbsim_commit: build.jsbsim_commit, wasm_sha256: build.wasm_sha256, flags: build.flags,
             aircraft_adapter: build.aircraft_adapter, propeller_adapter: build.propeller_adapter },
    trim: { status: M._gf_trim_status(), throttle: M._gf_trim_throttle(), pitch_trim: M._gf_trim_pitch() },
  });
  postState();
}

function onInput(msg) {
  const mixture_norm = msg.mixture_norm === undefined ? 1 : msg.mixture_norm;
  const mixture_auto = msg.mixture_auto === undefined ? true : msg.mixture_auto;
  const ok = Number.isInteger(msg.step) && msg.step >= 0 && finiteIn(msg.wall_ms, 0, Number.MAX_VALUE)
    && finiteIn(msg.elevator, -1, 1) && finiteIn(msg.aileron, -1, 1)
    && finiteIn(msg.rudder, -1, 1) && finiteIn(msg.throttle, 0, 1)
    && finiteIn(msg.flap_norm ?? 0, 0, 1) && finiteIn(msg.brake_norm ?? 0, 0, 1)
    && finiteIn(mixture_norm, 0, 1) && typeof mixture_auto === 'boolean'
    && (msg.pitch_trim_norm === undefined || finiteIn(msg.pitch_trim_norm, -1, 1))
    && (msg.engine_running === undefined || typeof msg.engine_running === 'boolean')
    && (msg.pilot_override === undefined || typeof msg.pilot_override === 'boolean');
  if (!ok) { postMessage({ type: 'error', message: 'input rejected: non-finite, out of range or bad step' }); return; }
  if (msg.engine_running !== undefined && typeof M._gf_set_engine_running !== 'function') {
    postMessage({ type: 'engine-switch-rejected', message: 'Engine ignition/starter command unavailable; rebuild local engine.' });
    return;
  }
  const inp = { step: msg.step, wall_ms: msg.wall_ms, elevator: msg.elevator, aileron: msg.aileron,
                rudder: msg.rudder, throttle: msg.throttle, flap_norm: msg.flap_norm ?? 0, brake_norm: msg.brake_norm ?? 0,
                mixture_norm, mixture_auto };
  if (msg.pitch_trim_norm !== undefined) inp.pitch_trim_norm = msg.pitch_trim_norm;
  if (msg.engine_running !== undefined) inp.engine_running = msg.engine_running;
  if (msg.pilot_override !== undefined) inp.pilot_override = msg.pilot_override;
  let i = pending.length;
  while (i > 0 && pending[i - 1].step > inp.step) i -= 1;   // stable insert
  pending.splice(i, 0, inp);
}

function onRun(msg) {
  if (terrainLoad) {
    untilStep = Number.isInteger(msg.until_step) && msg.until_step > 0 ? msg.until_step : Infinity;
    resumeAfterTerrain = true; return;
  }
  if (running) return;
  untilStep = Number.isInteger(msg.until_step) && msg.until_step > 0 ? msg.until_step : Infinity;
  running = true;
  t0Ms = performance.now();
  stepBase = stepIndex;
  runWallStartMs = t0Ms;
  nextPostMs = t0Ms;
  timer = setTimeout(tick, 0);
}

function onHalt(_discardWarnings = true, preserveTerrainPrefetch = false) {
  if (!preserveTerrainPrefetch) { terrainPrediction.reset(); terrainStream?.cancelPrefetch(); }
  if (running) runWallMs += performance.now() - runWallStartMs;
  running = false;
  if (timer !== null) { clearTimeout(timer); timer = null; }
}

function onCollisionContinue(msg) {
  // Retrying an acknowledgement after a delayed/lost reply is idempotent while
  // the same native frame is still paused; it cannot acknowledge a later hit.
  if (!collision.collision_mask && continuedCollision && msg.step === stepIndex
      && msg.step === continuedCollision.collision_step && !running) {
    postMessage({ type: 'collision-continued', collision_step: continuedCollision.collision_step, state: stateMessage() }); return;
  }
  if (!groundCollisionEnabled || !collision.collision_mask || msg.step !== stepIndex || running || terrainFault) {
    postMessage({ type: 'collision-continue-rejected', message: 'The stopped contact is no longer available to continue.' }); return;
  }
  const contact = sampleContact();
  if (!contact.available) {
    postMessage({ type: 'collision-continue-rejected', message: 'Ground contact is unavailable at this position.' }); return;
  }
  const previous = collision; continuedCollision = previous;
  acknowledgedContacts |= contact.mask;
  collisionAvailable = true; collision = EMPTY_COLLISION;
  postMessage({ type: 'collision-continued', collision_step: previous.collision_step, state: stateMessage() });
}

function onBurst(msg) {
  if (running) { postMessage({ type: 'error', message: 'burst while running' }); return; }
  const steps = Number.isInteger(msg.steps) && msg.steps > 0 ? msg.steps : 2400;
  const blocks = Number.isInteger(msg.blocks) && msg.blocks > 0 ? msg.blocks : 5;
  const us = [];
  for (let b = 0; b < blocks; b++) {
    const a = performance.now();
    for (let k = 0; k < steps; k++) if (!stepOnce()) return;
    us.push(((performance.now() - a) * 1000) / steps);
  }
  postMessage({ type: 'burst', steps, us_per_step: us });
}

let queue = Promise.resolve();
self.onmessage = (ev) => {
  const msg = ev.data || {};
  queue = queue.then(async () => {
    try {
      if (msg.type === 'init') { onHalt(); await onInit(msg); return; }
      if (!initialized) { postMessage({ type: 'error', message: `${msg.type} before init` }); return; }
      if (terrainFault && ['input', 'altimeter', 'autopilot', 'autopilot-capture', 'simulation-rate', 'kap140', 'navigation', 'run', 'burst'].includes(msg.type)) {
        postMessage({ type: 'terrain-rejected', command: msg.type, message: 'Terrain support unavailable. Check bundled world terrain data and latitude coverage.' }); return;
      }
      if (collision.collision_mask && ['input', 'altimeter', 'autopilot', 'autopilot-capture', 'simulation-rate', 'kap140', 'navigation', 'run', 'burst'].includes(msg.type)) {
        postMessage({ type: 'collision-rejected', command: msg.type, message: 'Ground contact latched; acknowledge it to continue or restart flight.' });
        return;
      }
      switch (msg.type) {
        case 'collision-continue': onCollisionContinue(msg); break;
        case 'input': onInput(msg); break;
        case 'altimeter': onAltimeter(msg); break;
        case 'autopilot': onAutopilot(msg); break;
        case 'autopilot-capture': onAutopilotCapture(); break;
        case 'simulation-rate': onSimulationRate(msg); break;
        case 'kap140': onKap140(msg); break;
        case 'navigation': onNavigation(msg); break;
        case 'run': onRun(msg); break;
        case 'pause': resumeAfterTerrain = false; onHalt(); break;
        case 'stop': resumeAfterTerrain = false; onHalt(); postMessage(stats()); break;
        case 'stats': postMessage(stats()); break;
        case 'burst': onBurst(msg); break;
        default: postMessage({ type: 'error', message: `unknown message type ${msg.type}` });
      }
    } catch (e) {
      fail(String(e && e.message ? e.message : e));
    }
  });
};
