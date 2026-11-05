// Actual WASM worker: optional regional failure uses bundled world terrain;
// held tile loading must preserve state and explicit pause/stop intent.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;
const originalFetch = globalThis.fetch;
let hold = false, release, failure = null;
let gate = Promise.resolve();
globalThis.fetch = async (url, options) => {
  if (typeof url === 'string' && url.startsWith('/terrain/')) {
    const path = url.split('?')[0];
    if (hold && path.startsWith('/terrain/region/') && path.endsWith('.f32')) await gate;
    if (failure && path.startsWith('/terrain/region/') && path.endsWith('.f32'))
      return failure === 'missing' ? new Response(null, { status: 404 }) : new Response(new Uint8Array(129 * 129 * 8));
    try { return new Response(await readFile(new URL(`../../../app/public${path}`, import.meta.url))); }
    catch { return new Response(null, { status: 404 }); }
  }
  return originalFetch(url, options);
};
globalThis.self = globalThis;
const messages = [];
globalThis.postMessage = message => messages.push(message);
await import('./worker.js');
const send = data => self.onmessage({ data });
async function wait(type, from = 0, predicate = () => true) {
  for (let i = 0; i < 5000; i++) {
    const error = messages.slice(from).find(m => m.type === 'error');
    if (error) throw Error(error.message);
    const found = messages.slice(from).find(m => m.type === type && predicate(m));
    if (found) return found;
    await new Promise(r => setTimeout(r, 2));
  }
  throw Error(`Timed out waiting for ${type}`);
}
async function stats() { const start = messages.length; send({ type: 'stats' }); return wait('stats', start); }
for (const command of ['pause', 'stop']) {
  const start = messages.length, rad = Math.PI / 180;
  hold = false; failure = null;
  send({ type: 'init', aircraft: 'c172x', terrain: true, streaming_terrain: true, dt_s: 1 / 120, state_hz: 60,
    ic: { lat_rad: 49.65 * rad, lon_rad: 8.749999 * rad, alt_msl_m: 1500, heading_rad: 90 * rad, tas_mps: 45 } });
  await wait('ready', start);
  hold = true; gate = new Promise(resolve => { release = resolve; });
  const offset = messages.length; send({ type: 'run' });
  await wait('terrain-loading', offset, m => m.loading === true);
  send({ type: command });
  const before = await stats();
  hold = false; release();
  await wait('terrain-loading', offset, m => m.loading === false);
  await new Promise(r => setTimeout(r, 100));
  const after = await stats();
  assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
  assert.deepEqual(after.final_state, before.final_state);
}
for (const mode of ['missing', 'corrupt']) {
  const start = messages.length, rad = Math.PI / 180;
  failure = null;
  send({ type: 'init', aircraft: 'c172x', terrain: true, streaming_terrain: true, dt_s: 1 / 120, state_hz: 60,
    ic: { lat_rad: 49.65 * rad, lon_rad: 8.749999 * rad, alt_msl_m: 1500, heading_rad: 90 * rad, tas_mps: 45 } });
  await wait('ready', start);
  hold = true; gate = new Promise(resolve => { release = resolve; });
  const offset = messages.length; send({ type: 'run' });
  await wait('terrain-loading', offset, m => m.loading === true);
  send({ type: 'pause' });
  const before = await stats();
  failure = mode; hold = false; release();
  await wait('terrain-loading', offset, m => m.loading === false);
  assert(!messages.slice(offset).some(m => m.type === 'error'));
  assert(messages.slice(offset).some(m => m.type === 'terrain-tile' && ['global','mixed'].includes(m.grid.source)), 'failed regional enhancement installs real world fallback cells');
  const after = await stats();
  assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  const burstOffset = messages.length;
  send({ type: 'burst', steps: 30, blocks: 1 }); await wait('burst', burstOffset);
  const advanced = await stats(); assert.equal(advanced.step, after.step + 30);
}
console.log(JSON.stringify({ result: 'pass', checks: ['pause and stop during held fetch preserve state, digest and step without automatic resume', 'missing and corrupt regional enhancements install bundled world fallback without advancing during loading', 'actual native integration continues after explicit paused fallback commit'] }));
