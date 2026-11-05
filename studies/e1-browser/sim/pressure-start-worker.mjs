// Task159 / R-AIR-3 / R-SIM-2. Actual production worker and unchanged local WASM.
// Local asset transport only is adapted; optional remote enhancement unavailable.
// This checks supported pressure startup/paused controls, not aircraft fidelity.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { indicatedAltitude_m, validSetting } from './altimeter.js';
import { resumeProblem } from './continue-flight.js';
import { DEFAULT_NAVIGATION } from './navigation.js';
import { FlightTrace } from '../../../app/src/flight-trace.ts';
import { DEFAULT_RADIO_NAV } from '../../../app/src/radio-nav.ts';
const RAD = Math.PI / 180;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const wasmURL = new URL('./dist/jsbsim.wasm', import.meta.url);
const wasmHash = hash(await readFile(wasmURL));
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const text = String(url);
  if (text.startsWith('file:')) return new Response(await readFile(new URL(text)));
  if (text.startsWith('/terrain/')) {
    try { return new Response(await readFile(new URL('../../../app/public' + text.split('?')[0], import.meta.url))); }
    catch { return new Response(null, { status: 404 }); }
  }
  if (text.startsWith('/scenery/')) return new Response(null, { status: 404 });
  throw Error('Unexpected pressure-regression fetch: ' + text);
};
globalThis.self = globalThis;
const messages = [];
globalThis.postMessage = message => { if (message.type !== 'terrain-tile') messages.push(message); };
await import('./worker.js');
async function send(data, type) {
  const start = messages.length; self.onmessage({ data });
  const until = Date.now() + 25000;
  while (Date.now() < until) {
    const found = messages.slice(start).find(message => message.type === type || message.type === 'error');
    if (found) { assert.notEqual(found.type, 'error', found.message); return found; }
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  throw Error('Pressure worker timeout: ' + type);
}
const init = (altitude, terrain) => ({ type: 'init', aircraft: 'c172x', kap140: true,
  terrain, streaming_terrain: terrain, ground_collision: true, dt_s: 1 / 120, state_hz: 60,
  ic: { lat_rad: 47.15 * RAD, lon_rad: 8.45 * RAD, alt_msl_m: altitude, heading_rad: 1, tas_mps: 45 } });
const fields = ['p_static_pa', 'altimeter_setting_pa', 'altimeter_indicated_m',
  'altimeter_qnh_pa', 'altimeter_qfe_pa', 'altimeter_qfe_datum_m'];
const pressureFields = state => Object.fromEntries(fields.map(key => [key, state[key]]));
const samePhysics = (before, after) => {
  assert.equal(after.step, before.step); assert.equal(after.t_s, before.t_s);
  assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
};
const results = [];
try {
  for (const altitude of [3000, 5000]) for (const terrain of [false, true]) {
    const initial = await send(init(altitude, terrain), 'state');
    assert(fields.every(key => Number.isFinite(initial[key])), 'complete six-field pressure group');
    assert.equal(initial.step, 0); assert.equal(initial.t_s, 0);
    assert(!validSetting(initial.altimeter_qfe_pa), 'high launch QFE lies below selectable range');
    assert.equal(initial.altimeter_setting_pa, 101325);
    assert.equal(initial.altimeter_indicated_m, indicatedAltitude_m(initial.p_static_pa, 101325));
    assert.equal(resumeProblem(initial), null, 'high launch reference remains continuable');
    const trace = new FlightTrace();
    // The page adds its session-only COM/standby fields before recording.
    assert(trace.record({ ...DEFAULT_RADIO_NAV, ...initial }, 0), 'actual high launch pressure group is recordable');
    const before = await send({ type: 'stats' }, 'stats');
    const adjusted = await send({ type: 'altimeter', setting_pa: 100000 }, 'state');
    assert.equal(adjusted.altimeter_setting_pa, 100000);
    const rejected = await send({ type: 'altimeter', setting_pa: initial.altimeter_qfe_pa }, 'altimeter-rejected');
    assert.match(rejected.message, /Launch QFE.*800–1100 hPa.*QNH or standard/);
    const afterRejected = await send({ type: 'stats' }, 'stats'); samePhysics(before, afterRejected);
    // A non-mutating NAV command publishes the actual retained setting after rejection.
    const retained = await send({ type: 'navigation', config: DEFAULT_NAVIGATION }, 'state');
    assert.equal(retained.altimeter_setting_pa, 100000);
    const qnh = await send({ type: 'altimeter', setting_pa: initial.altimeter_qnh_pa }, 'state');
    assert.equal(qnh.altimeter_setting_pa, initial.altimeter_qnh_pa);
    const standard = await send({ type: 'altimeter', setting_pa: 101325 }, 'state');
    assert.equal(standard.altimeter_setting_pa, 101325);
    samePhysics(before, await send({ type: 'stats' }, 'stats'));
    // JSON recordings need two frames. Only this explicit diagnostic burst
    // advances physics, after all paused setting/digest assertions above.
    await send({ type: 'burst', steps: 1, blocks: 1 }, 'burst');
    const next = await send({ type: 'altimeter', setting_pa: 101325 }, 'state');
    assert(trace.record({ ...DEFAULT_RADIO_NAV, ...next }, 0));
    const recorded = FlightTrace.fromJSON(trace.exportJSON()).atTime(initial.t_s).state;
    assert.deepEqual(pressureFields(recorded), pressureFields(initial), 'JSON recording preserves the raw launch reference');
    assert.equal(resumeProblem(recorded), null);
    const resumed = await send({ ...init(altitude, terrain), resume_state: recorded }, 'state');
    for (const key of ['altimeter_setting_pa', 'altimeter_qnh_pa', 'altimeter_qfe_pa', 'altimeter_qfe_datum_m']) {
      assert.equal(resumed[key], initial[key], 'continuation preserves ' + key);
    }
    assert.equal(resumed.step, initial.step); assert(Math.abs(resumed.alt_msl_m - initial.alt_msl_m) < 1e-5);
    results.push({ altitude_m: altitude, terrain, pressure: pressureFields(initial), rejected: rejected.message,
      retained_setting_pa: retained.altimeter_setting_pa, paused_digest: afterRejected.digest,
      resumed: pressureFields(resumed) });
  }
  const low = await send(init(500, false), 'state');
  assert(validSetting(low.altimeter_qfe_pa));
  const lowBefore = await send({ type: 'stats' }, 'stats');
  const qfe = await send({ type: 'altimeter', setting_pa: low.altimeter_qfe_pa }, 'state');
  assert.equal(qfe.altimeter_indicated_m, 0, 'supported low-altitude QFE still reads launch zero');
  samePhysics(lowBefore, await send({ type: 'stats' }, 'stats'));
  const unsupported = await send({ ...init(11200, false), kap140: false }, 'state');
  assert(fields.every(key => unsupported[key] === undefined), 'unsupported atmosphere remains unavailable');
  const unsupportedRejection = await send({ type: 'altimeter', setting_pa: 101325 }, 'altimeter-rejected');
  assert.match(unsupportedRejection.message, /unavailable/);
  assert.equal(hash(await readFile(wasmURL)), wasmHash, 'native bytes unchanged');
  const build = JSON.parse(await readFile(new URL('./dist/build-info.json', import.meta.url), 'utf8'));
  const inputs = {};
  for (const file of ['worker.js', 'continue-flight.js', 'altimeter.js', 'pressure-start.test.mjs', 'pressure-start-worker.mjs']) {
    inputs[file] = hash(await readFile(new URL('./' + file, import.meta.url)));
  }
  await mkdir(new URL('../../../output/flight/', import.meta.url), { recursive: true });
  await writeFile(new URL('../../../output/flight/pressure-start-worker-task159.json', import.meta.url), JSON.stringify({
    observed_utc: new Date().toISOString(), scope: 'Actual worker/current unchanged WASM; supported pressure startup and paused controls/continuation. Not instrument/aircraft fidelity or established build provenance.',
    wasm_sha256: wasmHash, build_record_sha256: build.wasm_sha256, build_record_matches: wasmHash === build.wasm_sha256,
    inputs, results, low_altitude_qfe: pressureFields(qfe), unsupported_altitude_m: unsupported.alt_msl_m,
    unsupported_rejection: unsupportedRejection.message,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'pass', high_altitude_cases: results.length, low_altitude_qfe_zero: true,
    unsupported_pressure_unavailable: true, wasm_sha256: wasmHash, build_record_matches: wasmHash === build.wasm_sha256 }));
} finally {
  self.onmessage({ data: { type: 'stop' } });
  globalThis.fetch = fetchOriginal;
}
