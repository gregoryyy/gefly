// R-SIM-11/R-REVIEW-1: actual Worker/native boundaries; no renderer or fidelity claim.
import assert from 'node:assert/strict';
import { FLIGHT_DEFAULT_LOADING } from './loading.js';
import { equalInitialBalance } from './initial-balance.js';

globalThis.self = globalThis;
const messages = [];
globalThis.postMessage = message => messages.push(message);
await import('./worker.js');
async function send(data, type) {
  const start = messages.length;
  self.onmessage({ data });
  for (let i = 0; i < 3000; i++) {
    await new Promise(resolve => setTimeout(resolve, 2));
    const response = messages.slice(start).find(message => message.type === type || message.type === 'error');
    if (response) return response;
  }
  throw new Error(`Worker timeout for ${data.type}`);
}
const config = { type: 'init', initial_balance_profile: 1, aircraft: 'c172x', kap140: true,
  terrain: false, ground_collision: true, loading: FLIGHT_DEFAULT_LOADING, dt_s: 1 / 120, state_hz: 60,
  ic: { lat_rad: .87, lon_rad: .15, alt_msl_m: 1200, heading_rad: 1, tas_mps: 45 } };
const state = () => messages.findLast(message => message.type === 'state');
const checkReady = async request => {
  const reply = await send(request, 'ready');
  assert.equal(reply.type, 'ready', reply.message);
  return reply;
};
const checks = [];
const ready = await checkReady(config);
assert.equal(ready.initial_balance_profile, 1);
assert.equal(ready.trim.status, 1);
assert(equalInitialBalance(ready, state()));
assert.equal(state().aileron_cmd_norm, 0);
assert.equal(state().rudder_cmd_norm, 0);
assert.equal((await send({ type: 'burst', steps: 120, blocks: 1 }, 'burst')).type, 'burst');
checks.push('balanced initialization publishes a separate fixed identity with neutral pilot axes');

const selected = structuredClone(state());
const resume = { ...config, resume_state: selected };
delete resume.initial_balance_profile;
await checkReady(resume);
assert(equalInitialBalance(selected, state()));
assert.equal(selected.step, state().step);
checks.push('exposed-state reconstruction retains recorded compensation without re-solving');

for (const command of [{ action: 'ap' }, { action: 'cws', value: 1 }, { action: 'cws', value: 0 }, { action: 'disconnect' }]) {
  const reply = await send({ type: 'kap140', command }, 'state');
  assert.equal(reply.type, 'state', reply.message);
  assert(equalInitialBalance(selected, reply));
  assert.equal(reply.kap_cws, command.action === 'cws' ? command.value : 0);
  assert.equal(reply.kap_engaged, command.action === 'disconnect' ? 0 : 1);
}
checks.push('KAP engagement/CWS/release/disconnection retain compensation');

for (const request of [{ ...config, initial_balance_profile: 0, runway_start: true },
  { ...config, initial_balance_profile: 0, landing_preset: 'normal' }]) {
  const reply = await checkReady(request);
  assert.deepEqual([reply.initial_balance_profile, reply.roll_trim_norm, reply.yaw_trim_norm], [0, 0, 0]);
}
checks.push('fresh runway and landing studies use zero compensation');

async function rejectedAndStopped(request, pattern) {
  const start = messages.length;
  const reply = await send(request, 'ready');
  assert.equal(reply.type, 'error');
  assert.match(reply.message, pattern);
  const burst = await send({ type: 'burst', steps: 1, blocks: 1 }, 'burst');
  assert.equal(burst.type, 'error');
  assert.match(burst.message, /before init/);
  assert(!messages.slice(start).some(message => message.type === 'state' || message.type === 'ready'));
}
await rejectedAndStopped({ ...config, ic: { ...config.ic, tas_mps: 0 } }, /balance failed/);
checks.push('failed full trim publishes no ready/state and cannot advance');
await rejectedAndStopped({ ...resume, resume_state: { ...selected, yaw_trim_norm: undefined } }, /unavailable|invalid/i);
checks.push('partial continuation identity is rejected and cannot advance');
await checkReady(config);
await rejectedAndStopped({ ...config, runway_start: true }, /incompatible/);
checks.push('incompatible balance after a valid flight invalidates the prior runnable session');
await checkReady(config);
await rejectedAndStopped({ ...config, initial_balance_profile: 9 }, /invalid/);
checks.push('unknown profile after a valid flight cannot resume the old native session');
console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
