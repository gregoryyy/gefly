// Real JSBSim WASM and production worker, hosted in Node without a browser/server.
// No physics mock, source rewrite, file output, or simulation-time substitution.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;
const originalFetch = globalThis.fetch;
let heldTile = false, releaseTile;
let tileGate = Promise.resolve();
globalThis.fetch = async (url, options) => {
  if (typeof url === 'string' && url.startsWith('/terrain/')) {
    if (heldTile && url.startsWith('/terrain/region/') && url.endsWith('.f32')) await tileGate;
    try { return new Response(await readFile(new URL(`../public${url}`, import.meta.url))); }
    catch { return new Response(null, { status: 404 }); }
  }
  return originalFetch(url, options);
};
globalThis.self = globalThis;
const messages = [];
globalThis.postMessage = message => messages.push(message);
await import('../../studies/e1-browser/sim/worker.js');
const send = data => self.onmessage({ data });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(type, start, predicate = () => true) {
  for (let i = 0; i < 5000; i++) {
    const error = messages.slice(start).find(message => message.type === 'error');
    if (error) throw new Error(error.message);
    const result = messages.slice(start).find(message => message.type === type && predicate(message));
    if (result) return result;
    await sleep(2);
  }
  throw new Error(`Timed out waiting for ${type}`);
}
const rad = Math.PI / 180;
const initial = { type: 'init', aircraft: 'c172x', kap140: true, dt_s: 1 / 120, state_hz: 60,
  ic: { lat_rad: 49.96 * rad, lon_rad: 8.643 * rad, alt_msl_m: 396.24, heading_rad: 82 * rad, tas_mps: 90 * 1852 / 3600 } };
async function init(message = initial) {
  const start = messages.length; send(message);
  const ready = await wait('ready', start);
  const state = await wait('state', start);
  assert.equal(state.simulation_rate, 1);
  return { ready, state };
}
async function stats() { const start = messages.length; send({ type: 'stats' }); return wait('stats', start); }
async function rate(value) {
  const start = messages.length; send({ type: 'simulation-rate', rate: value });
  return wait('state', start, message => message.simulation_rate === value);
}
const checks = [], measurements = [];

// Rates produce the identical state/digest at identical fixed step counts.
let baseline;
for (const value of [1, 1.5, 2, 5, 10]) {
  await init();
  const before = await stats();
  await rate(value);
  const configured = await stats();
  assert.equal(configured.step, before.step);
  assert.equal(configured.digest, before.digest);
  assert.deepEqual(configured.final_state, before.final_state);
  const start = messages.length, wall = performance.now(); send({ type: 'run', until_step: 120 });
  const after = await wait('stats', start);
  const elapsed = performance.now() - wall;
  assert.equal(after.step, 120); assert.equal(after.dt_s, 1 / 120);
  assert(Math.abs(after.t_s - 1) < 1e-10);
  if (!baseline) baseline = after;
  else { assert.equal(after.digest, baseline.digest); assert.deepEqual(after.final_state, baseline.final_state); }
  // Loose budget for loaded CI hosts; fixed-step equality above is the fidelity gate.
  assert(elapsed >= 1000 / value - 40, `rate ${value} advanced faster than declared`);
  measurements.push({ rate: value, elapsed_ms: Math.round(elapsed), dropped_steps: after.dropped_steps });
}
checks.push('all five rates retain exact one-second fixed-step native state and digest');

await init();
await rate(5);
const stopped = await stats();
for (const value of [0, 3, 20, NaN, Infinity, '2']) {
  const start = messages.length; send({ type: 'simulation-rate', rate: value });
  await wait('simulation-rate-rejected', start);
}
const rejected = await stats();
assert.equal(rejected.simulation_rate, 5); assert.equal(rejected.step, stopped.step);
assert.equal(rejected.digest, stopped.digest);
send({ type: 'pause' });
await sleep(35); assert.equal((await stats()).step, stopped.step);
const offset = messages.length; send({ type: 'run', until_step: 60 });
const resumed = await wait('stats', offset); assert.equal(resumed.simulation_rate, 5);
assert.equal(resumed.step, 60);
checks.push('invalid rates preserve current state, and pause/resume preserves selected speed');

// Live changes rebase at the completed step and never step inside the command.
await init();
send({ type: 'run', until_step: 240 });
await sleep(45);
let start = messages.length;
send({ type: 'stats' }); send({ type: 'simulation-rate', rate: 10 });
const beforeChange = await wait('stats', start), changed = await wait('state', start, message => message.simulation_rate === 10);
assert.equal(changed.step, beforeChange.step);
assert.equal(changed.t_s, beforeChange.t_s);
const accelerated = await wait('stats', start, message => message.step === 240);
assert(Math.abs(accelerated.t_s - 2) < 1e-10);
checks.push('changing speed while running rebases without advancing or jumping simulation time');

// Capture shares one sensor frame, preserving native physics while paused.
const { state: initialState } = await init();
send({ type: 'kap140', command: { action: 'baro-setting', value: 99500 } });
const captureBefore = await stats();
start = messages.length; send({ type: 'autopilot-capture' });
const captured = await wait('state', start);
const captureAfter = await stats();
assert.equal(captured.kap_engaged, 1); assert.equal(captured.kap_lateral, 1); assert.equal(captured.kap_vertical, 1);
assert(Math.abs(captured.kap_heading_bug_rad - initialState.heading_rad) < 1e-12);
assert.equal(captured.altimeter_setting_pa, 101325);
assert(Math.abs(captured.kap_hold_pressure_altitude_m - captured.altimeter_indicated_m) < 1e-8);
assert(Math.abs(captured.kap_selected_altitude_m - captured.kap_indicated_altitude_m) < 1e-8);
assert.equal(captureAfter.step, captureBefore.step); assert.equal(captureAfter.digest, captureBefore.digest);
assert.deepEqual(captureAfter.final_state, captureBefore.final_state);
start = messages.length; send({ type: 'autopilot-capture' });
const recaptured = await wait('state', start); assert.equal(recaptured.kap_engaged, 1);
assert.equal(recaptured.kap_lateral, 1); assert.equal(recaptured.kap_vertical, 1);
checks.push('paused AP capture and recapture hold authoritative current heading/pressure altitude without moving physics');

// Held pilot input is rejected; an explicit queued release is honored without a step.
const manual = { type: 'input', step: 0, wall_ms: performance.timeOrigin + performance.now(),
  elevator: .2, aileron: 0, rudder: 0, throttle: .7, pilot_override: true };
send({ type: 'kap140', command: { action: 'disconnect' } });
start = messages.length; send(manual); send({ type: 'autopilot-capture' });
await wait('autopilot-rejected', start);
assert.equal((await stats()).kap_engaged, 0);
start = messages.length; send({ ...manual, elevator: 0, pilot_override: false }); send({ type: 'autopilot-capture' });
const released = await wait('state', start, message => message.kap_engaged === 1);
assert.equal(released.step, 0);
checks.push('capture rejects held manual axes and accepts an explicit queued release while paused');

// Capture an actually flown frame, not the launch heading/altitude.
await init(); await rate(10);
send({ ...manual, elevator: -.15, aileron: .2 });
start = messages.length; send({ type: 'run', until_step: 120 });
await wait('stats', start);
const flown = messages.filter(message => message.type === 'state').at(-1);
assert(Math.abs(flown.heading_rad - initialState.heading_rad) > 1e-5);
start = messages.length;
send({ ...manual, step: 120, elevator: 0, aileron: 0, pilot_override: false }); send({ type: 'autopilot-capture' });
const flownCapture = await wait('state', start);
assert.equal(flownCapture.step, 120);
assert(Math.abs(flownCapture.kap_heading_bug_rad - flown.heading_rad) < 1e-12);
assert(Math.abs(flownCapture.kap_hold_pressure_altitude_m - flown.altimeter_indicated_m) < 1e-8);
assert.equal(flownCapture.kap_lateral, 1); assert.equal(flownCapture.kap_vertical, 1);
checks.push('AP captures the current flown heading and altitude after explicit manual release');

// A held terrain transition must not lose the selected rate or auto-resume after pause.
const regional = await init({ ...initial, terrain: true, streaming_terrain: true,
  ic: { lat_rad: 49.65 * rad, lon_rad: 8.749999 * rad, alt_msl_m: 1500, heading_rad: 90 * rad, tas_mps: 45 } });
assert.equal(regional.ready.build.regional_terrain.id, 'rhein-main-dgm200-gcg-v1');
assert.equal(regional.ready.build.regional_terrain.cache_limit, 9);
assert.equal(regional.ready.build.regional_terrain.transition_degrees, .02);
assert.equal(regional.ready.build.regional_terrain.loaded_tiles.length, 9);
assert(regional.ready.build.regional_terrain.loaded_tiles.every(tile => /^[a-f0-9]{64}$/.test(tile.sha256)));
await rate(10);
heldTile = true; tileGate = new Promise(resolve => { releaseTile = resolve; });
start = messages.length; send({ type: 'run' });
await wait('terrain-loading', start, message => message.loading === true);
send({ type: 'pause' }); const heldState = await stats();
heldTile = false; releaseTile();
await wait('terrain-loading', start, message => message.loading === false);
await sleep(40); const afterTerrain = await stats();
assert.equal(afterTerrain.simulation_rate, 10);
assert.equal(afterTerrain.step, heldState.step); assert.equal(afterTerrain.digest, heldState.digest);
checks.push('terrain loading preserves speed, frozen state and explicit pause intent');

const collisionFixture = await init({ ...initial, ground_collision: true,
  ic: { ...initial.ic, alt_msl_m: 30, tas_mps: 45 } });
await rate(10);
send({ ...manual, elevator: .35, aileron: -.109375, throttle: collisionFixture.ready.trim.throttle });
start = messages.length; send({ type: 'run', until_step: 2400 });
const collision = await wait('stats', start);
assert(collision.collision_mask > 0);
for (const command of [{ type: 'simulation-rate', rate: 2 }, { type: 'autopilot-capture' }]) {
  start = messages.length; send(command);
  await wait('collision-rejected', start);
}
const blocked = await stats();
assert.equal(blocked.step, collision.step); assert.equal(blocked.digest, collision.digest);
assert.equal(blocked.simulation_rate, 10);
checks.push('latched collision rejects AP capture and speed changes without advancing physics');

console.log(JSON.stringify({ result: 'pass', checks, measurements }));
