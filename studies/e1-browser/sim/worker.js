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

function stateMessage() {
  const s = readState();
  return {
    type: 'state', step: stepIndex, t_s: s[0], lat_rad: s[1], lon_rad: s[2],
    alt_msl_m: s[3], roll_rad: s[4], pitch_rad: s[5], heading_rad: s[6], tas_mps: s[7],
    last_input_wall_ms: lastInputWallMs, step_cost_us: lastStepCostUs,
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
    if (inp.step < stepIndex) lateInputs += 1;
    lastInputWallMs = inp.wall_ms;
    appliedInputs += 1;
  }
  return true;
}

function stepOnce() {
  const a = performance.now();
  if (running) {                      // paced steps only (not burst)
    const lagMs = a - (t0Ms + (stepIndex + 1 - stepBase) * dtMs);
    if (lagMs > dtMs) missedSteps += 1;
    if (lagMs > maxLagMs) maxLagMs = lagMs;
  }
  if (!applyDueInputs()) return false;
  const rc = M._gf_step();
  const b = performance.now();
  if (rc !== 0) { fail(`step rc=${rc} at step ${stepIndex}`); return false; }
  stepIndex += 1;
  lastStepCostUs = (b - a) * 1000;
  if (costCount < costs.length) costs[costCount++] = lastStepCostUs;
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
  };
}

async function onInit(msg) {
  await modulePromise;
  const ic = msg.ic || {};
  const dt = msg.dt_s;
  const hz = msg.state_hz === undefined ? 60 : msg.state_hz;
  if (!finiteIn(dt, 1e-4, 0.1) || !finiteIn(hz, 1, 1000)) { fail('init: bad dt_s or state_hz'); return; }
  if (msg.aircraft !== 'c172x') { fail(`init: unsupported aircraft ${msg.aircraft}`); return; }
  const rc = M._gf_init(dt, ic.lat_rad, ic.lon_rad, ic.alt_msl_m, ic.heading_rad, ic.tas_mps);
  if (rc !== 0) { fail(`init rc=${rc}`); return; }
  dtS = dt; dtMs = dt * 1000; statePeriodMs = 1000 / hz;
  stepIndex = 0; pending = []; lastInputWallMs = null; lastStepCostUs = 0;
  missedSteps = 0; droppedSteps = 0; maxLagSteps = 0; maxLagMs = 0; lateInputs = 0; appliedInputs = 0; maxBatch = 0; ticks = 0;
  costs = new Float32Array(COST_CAPACITY); costCount = 0; runWallMs = 0;
  initialized = true;
  postMessage({
    type: 'ready',
    build: { jsbsim_tag: build.jsbsim_tag, emsdk: build.emsdk, wasm_bytes: build.wasm_bytes,
             jsbsim_commit: build.jsbsim_commit, wasm_sha256: build.wasm_sha256, flags: build.flags },
    trim: { status: M._gf_trim_status(), throttle: M._gf_trim_throttle(), pitch_trim: M._gf_trim_pitch() },
  });
  postState();
}

function onInput(msg) {
  const ok = Number.isInteger(msg.step) && msg.step >= 0 && finiteIn(msg.wall_ms, 0, Number.MAX_VALUE)
    && finiteIn(msg.elevator, -1, 1) && finiteIn(msg.aileron, -1, 1)
    && finiteIn(msg.rudder, -1, 1) && finiteIn(msg.throttle, 0, 1);
  if (!ok) { postMessage({ type: 'error', message: 'input rejected: non-finite, out of range or bad step' }); return; }
  const inp = { step: msg.step, wall_ms: msg.wall_ms, elevator: msg.elevator, aileron: msg.aileron,
                rudder: msg.rudder, throttle: msg.throttle };
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
      switch (msg.type) {
        case 'input': onInput(msg); break;
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
