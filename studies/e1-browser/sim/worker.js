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
//   t0 + (n+1)*dt); up to MAX_CATCHUP steps run per tick. A step is *missed*
//   when it starts more than one step period (dt, 8.3 ms) after its due time
//   (contract budget definition). max_lag_steps (due minus completed steps at a
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
import { loadTerrainPackage, sampleTerrain, sampleTerrainGradient, terrainContainsInterior } from './terrain.js';
import { indicatedAltitude_m, validSetting } from './altimeter.js';
import { stallFields, controlFields, cockpitFields, pitchTrimFields, groundFields } from './cockpit.js';
import { autopilotCommand, engineFields, engineSwitchFields } from './engine.js';
import { groundCollisionContact, collisionRecord, EMPTY_COLLISION } from './collision.js';

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
let dtMs = 1000 / 120;
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
let groundCollisionEnabled = false;
let collision = EMPTY_COLLISION;
// Ideal pressure instrument only. Its setting never changes the atmosphere,
// dynamics state, integration step or original study digest.
let altimeterSettingPa = 101325;
let altimeterReferences = null;
let altimeterFields = {};

function updateAltimeter() {
  // Clear first, so unsupported/out-of-domain pressure never leaves ghost values.
  altimeterFields = {};
  if (!altimeterReferences) return;
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
  if (!validSetting(qnh_pa) || !validSetting(qfe_pa) || !Number.isFinite(datum_m)) return;
  altimeterReferences = {
    altimeter_qnh_pa: qnh_pa, altimeter_qfe_pa: qfe_pa,
    altimeter_qfe_datum_m: datum_m,
  };
  updateAltimeter();
}

function onAltimeter(msg) {
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
    const state = readState(), sample = sampleTerrain(terrainGrid, state[1], state[2]);
    if (!sample) throw new Error('Terrain coverage unavailable; restart inside the published terrain region.');
    fields.ground_height_ellipsoid_m += sample.geoid_m;
  }
  return fields;
}

function readEngineFields() {
  if (typeof M._gf_engine_state !== 'function') return {};
  const pointer = M._gf_engine_state() >> 3;
  return engineFields(M.HEAPF64.subarray(pointer, pointer + 13));
}

function readEngineSwitchFields() {
  if (typeof M._gf_engine_switch_state !== 'function') return {};
  const pointer = M._gf_engine_switch_state() >> 3;
  return engineSwitchFields(M.HEAPF64.subarray(pointer, pointer + 2));
}

function onAutopilot(msg) {
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
  const state = readState(), sample = sampleTerrain(terrainGrid, state[1], state[2]);
  if (!sample) throw new Error('Public terrain coverage is unavailable.');
  return { terrain_profile: 1, terrain_height_msl_m: sample.physical_m,
    terrain_geoid_m: sample.geoid_m, terrain_height_ellipsoid_m: sample.ellipsoid_m };
}

function stateMessage() {
  const flapCommand = typeof M._gf_flap_command_norm === 'function' ? M._gf_flap_command_norm() : NaN;
  const s = readState();
  return {
    ...(Number.isFinite(flapCommand) && flapCommand >= 0 && flapCommand <= 1 ? { flap_command_norm: flapCommand } : {}),
    type: 'state', step: stepIndex, t_s: s[0], lat_rad: s[1], lon_rad: s[2],
    alt_msl_m: s[3], roll_rad: s[4], pitch_rad: s[5], heading_rad: s[6], tas_mps: s[7],
    last_input_wall_ms: lastInputWallMs, step_cost_us: lastStepCostUs, ...altimeterFields,
    ...readStallFields(), ...readControlFields(), ...readCockpitFields(), ...readPitchTrimFields(), ...readGroundFields(), ...readEngineFields(), ...readEngineSwitchFields(), ...terrainFields(), ...collision,
  };
}

function postState() {
  const msg = stateMessage();
  for (const k of ['t_s', 'lat_rad', 'lon_rad', 'alt_msl_m', 'roll_rad', 'pitch_rad', 'heading_rad', 'tas_mps']) {
    if (!Number.isFinite(msg[k])) { fail(`non-finite state ${k} at step ${stepIndex}`); return false; }
  }
  postMessage(msg);
  return true;
}

function applyDueInputs() {
  while (pending.length && pending[0].step <= stepIndex) {
    const inp = pending.shift();
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
    const lagMs = a - (t0Ms + (stepIndex + 1 - stepBase) * dtMs);
    if (lagMs > dtMs) missedSteps += 1;
    if (lagMs > maxLagMs) maxLagMs = lagMs;
  }
  if (terrainGrid) {
    const state = readState();
    if (!terrainContainsInterior(terrainGrid, state[1], state[2]) || M._gf_terrain_available() !== 1) {
      terrainFault = true; fail('Terrain coverage boundary reached. Restart inside the Egelsbach–Frankfurt–Taunus region.'); return false;
    }
  }
  if (!applyDueInputs()) return false;
  const previousGround = groundCollisionEnabled ? readGroundFields() : null;
  const rc = M._gf_step();
  const b = performance.now();
  if (rc !== 0) { if (rc === -7) terrainFault = true; fail(rc === -7 ? 'Terrain/contact coverage unavailable; flight stopped. Restart inside the terrain region.' : `step rc=${rc} at step ${stepIndex}`); return false; }
  stepIndex += 1;
  updateAltimeter();
  lastStepCostUs = (b - a) * 1000;
  if (costCount < costs.length) costs[costCount++] = lastStepCostUs;
  if (groundCollisionEnabled) {
    const ground = readGroundFields(), state = readState();
    const contact = groundCollisionContact(ground.ground_agl_m, state[4], state[5], ground.structure_contact_mask, terrainGrid ? { ...sampleTerrainGradient(terrainGrid, state[1], state[2]), heading_rad: state[6] } : undefined);
    const record = contact.mask ? collisionRecord(contact.mask, stepIndex, state[0], previousGround) : null;
    if (record) {
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
  const target = stepBase + Math.floor((now - t0Ms) / dtMs + 1e-9);
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
    t0Ms += deficit * dtMs;
  }
  now = performance.now();
  if (batch > 0 && now >= nextPostMs) {
    if (!postState()) return;
    while (nextPostMs <= now) nextPostMs += statePeriodMs;   // fixed cadence, no backlog
  }
  // Wake just after the next step is due (timer callbacks can fire slightly early).
  const nextStepMs = t0Ms + (stepIndex + 1 - stepBase) * dtMs;
  timer = setTimeout(tick, Math.max(0, nextStepMs - performance.now() + TIMER_SLACK_MS));
}

function stats() {
  const s = readState();
  return {
    type: 'stats', step: stepIndex, t_s: s[0], dt_s: dtS,
    digest: M.UTF8ToString(M._gf_digest_hex()),
    final_state: Array.from(M.HEAPF64.subarray(M._gf_state() >> 3, (M._gf_state() >> 3) + M._gf_state_len())),
    missed_steps: missedSteps, dropped_steps: droppedSteps,
    max_lag_steps: maxLagSteps, max_lag_ms: maxLagMs, late_inputs: lateInputs, applied_inputs: appliedInputs,
    pending_inputs: pending.length, max_catchup_batch: maxBatch, ticks,
    run_wall_ms: runWallMs + (running ? performance.now() - runWallStartMs : 0),
    step_cost_us: costs.slice(0, costCount),
    cross_origin_isolated: self.crossOriginIsolated === true,
    ...collision,
  };
}

async function onInit(msg) {
  initialized = false; terrainFault = false;
  await modulePromise;
  const ic = msg.ic || {};
  const dt = msg.dt_s;
  const hz = msg.state_hz === undefined ? 60 : msg.state_hz;
  if (!finiteIn(dt, 1e-4, 0.1) || !finiteIn(hz, 1, 1000)) { fail('init: bad dt_s or state_hz'); return; }
  if (msg.aircraft !== 'c172x') { fail(`init: unsupported aircraft ${msg.aircraft}`); return; }
  if (msg.ground_collision !== undefined && typeof msg.ground_collision !== 'boolean') { fail('init: ground_collision must be boolean'); return; }
  if (msg.terrain !== undefined && typeof msg.terrain !== 'boolean') { fail('init: terrain must be boolean'); return; }
  const presets = { normal: 1, hard: 2, side: 3, banked: 4 };
  const preset = msg.landing_preset;
  if (preset !== undefined && (typeof preset !== 'string' || !Object.hasOwn(presets, preset)
    || typeof M._gf_init_landing !== 'function')) { fail('init: landing preset unavailable or invalid'); return; }
  terrainGrid = null;
  if (typeof M._gf_clear_terrain_grid === 'function') M._gf_clear_terrain_grid();
  if (msg.terrain === true) {
    if (['_gf_configure_terrain_grid', '_gf_terrain_available', '_malloc', '_free'].some(name => typeof M[name] !== 'function')) {
      fail('Public terrain requires the updated local engine. Run just build-flight-engine and restart.'); return;
    }
    terrainGrid = await loadTerrainPackage();
    if (!terrainContainsInterior(terrainGrid, ic.lat_rad, ic.lon_rad)) { fail('Initial position is outside public terrain coverage.'); return; }
    const pointer = M._malloc(terrainGrid.physical_m.byteLength);
    if (!pointer) { fail('Cannot allocate the public terrain grid.'); return; }
    let configured;
    try {
      M.HEAPF64.set(terrainGrid.physical_m, pointer / 8);
      configured = M._gf_configure_terrain_grid(terrainGrid.west_rad, terrainGrid.south_rad, terrainGrid.east_rad,
        terrainGrid.north_rad, terrainGrid.width, terrainGrid.height, pointer, terrainGrid.physical_m.length);
    } finally { M._free(pointer); }
    if (configured !== 0) { fail(`Terrain grid rejected: ${configured}`); return; }
  }
  const rc = preset === undefined
    ? M._gf_init(dt, ic.lat_rad, ic.lon_rad, ic.alt_msl_m, ic.heading_rad, ic.tas_mps)
    : M._gf_init_landing(dt, ic.lat_rad, ic.lon_rad, ic.heading_rad, presets[preset]);
  if (rc !== 0) { fail(`init rc=${rc}`); return; }
  dtS = dt; dtMs = dt * 1000; statePeriodMs = 1000 / hz;
  stepIndex = 0; pending = []; lastInputWallMs = null; lastStepCostUs = 0;
  missedSteps = 0; droppedSteps = 0; maxLagSteps = 0; maxLagMs = 0; lateInputs = 0; appliedInputs = 0; maxBatch = 0; ticks = 0;
  costs = new Float32Array(COST_CAPACITY); costCount = 0; runWallMs = 0;
  groundCollisionEnabled = msg.ground_collision === true; collision = EMPTY_COLLISION;
  initializeAltimeter();
  initialized = true;
  postMessage({
    type: 'ready',
    build: { ...(terrainGrid ? { terrain: { id: terrainGrid.id, sha256: terrainGrid.sha256, physical_datum: terrainGrid.physical_datum, geoid_model: terrainGrid.geoid_model } } : {}), jsbsim_tag: build.jsbsim_tag, emsdk: build.emsdk, wasm_bytes: build.wasm_bytes,
             jsbsim_commit: build.jsbsim_commit, wasm_sha256: build.wasm_sha256, flags: build.flags,
             aircraft_adapter: build.aircraft_adapter },
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
    && (msg.engine_running === undefined || typeof msg.engine_running === 'boolean');
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
  let i = pending.length;
  while (i > 0 && pending[i - 1].step > inp.step) i -= 1;   // stable insert
  pending.splice(i, 0, inp);
}

function onRun(msg) {
  if (running) return;
  untilStep = Number.isInteger(msg.until_step) && msg.until_step > 0 ? msg.until_step : Infinity;
  running = true;
  t0Ms = performance.now();
  stepBase = stepIndex;
  runWallStartMs = t0Ms;
  nextPostMs = t0Ms;
  timer = setTimeout(tick, 0);
}

function onHalt() {
  if (running) runWallMs += performance.now() - runWallStartMs;
  running = false;
  if (timer !== null) { clearTimeout(timer); timer = null; }
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
      if (terrainFault && ['input', 'altimeter', 'autopilot', 'run', 'burst'].includes(msg.type)) {
        postMessage({ type: 'terrain-rejected', command: msg.type, message: 'Terrain coverage unavailable; restart inside the region.' }); return;
      }
      if (collision.collision_mask && ['input', 'altimeter', 'autopilot', 'run', 'burst'].includes(msg.type)) {
        postMessage({ type: 'collision-rejected', command: msg.type, message: 'Ground contact latched; restart flight to continue.' });
        return;
      }
      switch (msg.type) {
        case 'input': onInput(msg); break;
        case 'altimeter': onAltimeter(msg); break;
        case 'autopilot': onAutopilot(msg); break;
        case 'run': onRun(msg); break;
        case 'pause': onHalt(); break;
        case 'stop': onHalt(); postMessage(stats()); break;
        case 'stats': postMessage(stats()); break;
        case 'burst': onBurst(msg); break;
        default: postMessage({ type: 'error', message: `unknown message type ${msg.type}` });
      }
    } catch (e) {
      fail(String(e && e.message ? e.message : e));
    }
  });
};
