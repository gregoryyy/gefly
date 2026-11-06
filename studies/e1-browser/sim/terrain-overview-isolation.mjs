// Task162 deterministic component-boundary isolation, manually runnable with:
// node studies/e1-browser/sim/terrain-overview-isolation.mjs
// Actual production Worker handler/WASM and TerrainOverview loader. All remote
// elevation replies are EXPLICIT SYNTHETIC SOURCE FIXTURES in this harness only;
// they are not measurements, real DEM evidence, a browser integration test or a
// complete native checkpoint/fidelity test. Production files are not modified.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TerrainOverview, validTerrainOverview } from '../../../app/src/terrain-overview.ts';
import { loadWorldTerrainPackage, validWorldTerrainTile } from './world-terrain.js';
import { FLIGHT_DEFAULT_LOADING } from './loading.js';

const RAD = Math.PI / 180, N = 129, COUNT = N * N, STEPS = 1200;
const SOURCE = 'Copernicus-GLO30-Public-COG-2021';
const EXCLUDED_WALL_FIELDS = Object.freeze(['last_input_wall_ms', 'step_cost_us']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const originalFetch = globalThis.fetch, originalSelf = globalThis.self, originalPost = globalThis.postMessage;
const wasmURL = new URL('./dist/jsbsim.wasm', import.meta.url), wasmHash = hash(await readFile(wasmURL));
assert.equal(wasmHash, '11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7', 'this proof requires the identified unchanged local engine');
const initial = Object.freeze({ lat_rad: -33.9715 * RAD, lon_rad: 18.6021 * RAD,
  alt_msl_m: 1200, heading_rad: Math.PI / 2, tas_mps: 45 });
const inputs = Object.freeze([
  { step: 0, elevator: 0, aileron: .002, rudder: 0, throttle: .8 },
  { step: 400, elevator: -.005, aileron: -.002, rudder: 0, throttle: .85 },
  { step: 800, elevator: 0, aileron: 0, rudder: 0, throttle: .75 },
]);
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function bounded(promise, label, milliseconds = 10000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' timed out')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
async function assets(url) {
  const text = String(url);
  if (text.startsWith('file:')) return new Response(await readFile(new URL(text)));
  // Cape fixture intentionally has no optional regional source. Required bundled
  // fine/world assets and their integrity checks remain the production inputs.
  if (text.startsWith('/terrain/region/')) return new Response(null, { status: 404 });
  if (text.startsWith('/terrain/')) return new Response(await readFile(new URL('../../../app/public' + text.split('?')[0], import.meta.url)));
  throw Error('Unexpected asset in isolated fixture: ' + text);
}
const world = await loadWorldTerrainPackage(assets);
let current = null;
let activeLoader = null;
const sourceFiles = ['worker.js', 'world-terrain.js', 'terrain-stream.js', 'copernicus-terrain.js', 'loading.js',
  '../../../app/src/terrain-overview.ts', 'terrain-overview-isolation.mjs'];
const initialSourceHashes = {};
for (const file of sourceFiles) initialSourceHashes[file] = hash(await readFile(new URL(file, import.meta.url)));
const fixtureCache = new Map();
function fixture(version, col, row) {
  const key = `${version}/${col}/${row}`;
  if (fixtureCache.has(key)) return fixtureCache.get(key);
  const bytes = Buffer.alloc(64 + COUNT * 4); bytes.write('GFCOP30\0');
  for (const [offset, value] of [[8, version], [12, col], [16, row], [20, N]]) bytes.writeUInt32LE(value, offset);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // Coherent integer-lattice fixtures. Fine native elevations are about64m;
    // overview elevations deliberately exceed1000m, making contamination obvious.
    const height = version === 1 ? 50 + (col * 128 + x) / 65536 + (row * 128 + y) / 131072
      : 1000 + (col * 128 + x) / 16384 + (row * 128 + y) / 32768;
    bytes.writeFloatLE(height, 64 + (y * N + x) * 4);
  }
  const value = { bytes, sha256: hash(bytes) }; fixtureCache.set(key, value); return value;
}
function fixtureResponse(version, col, row) {
  const f = fixture(version, col, row);
  return new Response(f.bytes, { status: 200, headers: { 'Content-Type': 'application/octet-stream',
    'Content-Length': String(f.bytes.length), ETag: `"${f.sha256}"`, 'X-Copernicus-Source': SOURCE } });
}
async function fixtureFetch(url, init) {
  const text = String(url);
  const fine = /^\/scenery\/elevation\/copernicus\/(\d+)\/(\d+)\.bin$/.exec(text);
  if (fine) {
    assert(current); const col = Number(fine[1]), row = Number(fine[2]);
    current.nativeRequests.push({ url: text, sha256: fixture(1, col, row).sha256 });
    return fixtureResponse(1, col, row);
  }
  const overview = /^\/scenery\/elevation\/copernicus-overview\/(\d+)\/(\d+)\.bin$/.exec(text);
  if (overview) {
    assert(current); const scenario = current;
    scenario.overviewRequests.push(text);
    if (scenario.mode === 'failure') return new Response(null, { status: 502 });
    if (scenario.mode === 'cancel') {
      scenario.started.resolve(); await scenario.release.promise;
    } else await new Promise(resolve => setTimeout(resolve, 2));
    // The cancelled case deliberately returns late despite the AbortSignal.
    // Production loader cancellation must suppress this obsolete completion.
    return fixtureResponse(2, Number(overview[1]), Number(overview[2]));
  }
  return assets(url, init);
}
function gridIdentity(grid) {
  assert(validWorldTerrainTile(grid));
  const bytes = Buffer.alloc(COUNT * 16);
  for (let i = 0; i < COUNT; i++) { bytes.writeDoubleLE(grid.physical_m[i], i * 16); bytes.writeDoubleLE(grid.geoid_m[i], i * 16 + 8); }
  assert.equal(hash(bytes), grid.sha256);
  return { id: grid.id, slot: grid.slot, sha256_H_N: hash(bytes), source: grid.source, source_detail: grid.source_detail,
    copernicus_nodes: grid.copernicus_nodes, coarse_nodes: grid.coarse_nodes };
}
function publishedPhysics(state) {
  return Object.fromEntries(Object.entries(state).filter(([key]) => !EXCLUDED_WALL_FIELDS.includes(key)));
}
function vectorBytes(vector) { const bytes = Buffer.alloc(vector.length * 8); vector.forEach((value, i) => bytes.writeDoubleLE(value, i * 8)); return bytes; }

globalThis.self = globalThis;
globalThis.fetch = fixtureFetch;
globalThis.postMessage = message => {
  assert(current, 'a worker publication must belong to one scenario');
  if (message.type === 'terrain-tile') {
    const identity = gridIdentity(message.grid);
    current.grids.set(identity.id, identity); current.maxResident = Math.max(current.maxResident, current.grids.size);
    assert(current.grids.size <= 9); current.messages.push({ type: message.type, identity });
  } else {
    if (message.type === 'terrain-remove') current.grids.delete(message.id);
    current.messages.push(message);
  }
};
async function send(data, type) {
  const scenario = current, offset = scenario.messages.length;
  self.onmessage({ data });
  const expires = Date.now() + 10000;
  while (Date.now() < expires) {
    const messages = scenario.messages.slice(offset), error = messages.find(m => m.type === 'error');
    if (error) throw Error(error.message);
    const result = messages.find(m => m.type === type); if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  throw Error('production worker ' + type + ' timed out');
}
const results = [];
try {
  await import('./worker.js');
  for (const mode of ['off', 'on', 'failure', 'cancel']) {
    const scenario = current = { mode, messages: [], grids: new Map(), maxResident: 0, nativeRequests: [], overviewRequests: [],
      batches: [], statuses: [], completedSteps: 0, started: deferred(), release: deferred() };
    const initialState = await send({ type: 'init', aircraft: 'c172x', terrain: true, streaming_terrain: true,
      ground_collision: true, kap140: false, loading: FLIGHT_DEFAULT_LOADING, dt_s: 1 / 120, state_hz: 60, ic: initial }, 'state');
    assert.equal(initialState.step, 0); assert.equal(scenario.grids.size, 9);
    assert([...scenario.grids.values()].every(g => g.source_detail === 'copernicus' && g.copernicus_nodes === COUNT && g.coarse_nodes === 0));
    const initialGrids = [...scenario.grids.values()].sort((a, b) => a.id.localeCompare(b.id));
    const loader = activeLoader = new TerrainOverview(world, batch => {
      assert(batch.every(validTerrainOverview));
      assert(batch.every(grid => !validWorldTerrainTile(grid) && !('version' in grid) && !('slot' in grid)), 'display grids cannot become native/session grids');
      scenario.batches.push({ step_at_publication: scenario.completedSteps, cells: batch.length,
        ids: batch.map(g => g.id), hashes: batch.map(g => g.sha256), min_H_m: batch.length ? Math.min(...batch.map(g => Math.min(...g.physical_m))) : null });
    }, { fetcher: fixtureFetch, regional: async () => [], budgetMs: 2000, onStatus: status => scenario.statuses.push(status) });
    let task = Promise.resolve();
    if (mode !== 'off') task = loader.update(initial.lat_rad, initial.lon_rad);
    if (mode === 'cancel') await bounded(scenario.started.promise, 'cancel fixture first request');
    for (const input of inputs) self.onmessage({ data: { type: 'input', wall_ms: 1, ...input } });
    for (let step = 0; step < STEPS; step += 100) {
      await send({ type: 'burst', steps: 100, blocks: 1 }, 'burst'); scenario.completedSteps += 100;
      if (scenario.completedSteps === 400) {
        if (mode === 'cancel') { loader.cancel(true); scenario.release.resolve(); }
        // Settle each background outcome before another800 native steps. The ON
        // case therefore proves isolation after actual overview publication,
        // rather than only while its requests are still pending.
        await bounded(task, 'overview ' + mode + ' at step400');
      }
    }
    await bounded(task, 'overview ' + mode);
    const finalState = await send({ type: 'altimeter', setting_pa: 101325 }, 'state');
    const stats = await send({ type: 'stats' }, 'stats');
    assert.equal(stats.step, STEPS); assert(Math.abs(stats.t_s - STEPS / 120) < 1e-10);
    assert.equal(finalState.step, STEPS); assert.equal(finalState.terrain_profile, 1);
    assert.equal(finalState.terrain_source, 2); assert.equal(finalState.collision_mask, 0);
    const finalGrids = [...scenario.grids.values()].sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(finalGrids, initialGrids, 'optional overview cannot change installed authoritative terrain');
    assert.equal(scenario.maxResident, 9); assert.equal(scenario.nativeRequests.length, 16);
    const nonempty = scenario.batches.filter(batch => batch.cells > 0);
    if (mode === 'on') {
      assert.equal(scenario.overviewRequests.length, 9); assert.equal(nonempty.length, 1); assert.equal(nonempty[0].cells, 9);
      assert(nonempty[0].step_at_publication <= 400); assert(nonempty[0].min_H_m > 1000); assert.equal(scenario.statuses.at(-1).state, 'ready');
    } else if (mode === 'failure') {
      assert.equal(scenario.overviewRequests.length, 9); assert.equal(nonempty.length, 0);
      assert.equal(scenario.statuses.at(-1).state, 'unavailable');
    } else if (mode === 'cancel') {
      assert.equal(scenario.overviewRequests.length, 1); assert.equal(nonempty.length, 0); assert.equal(loader.hasSources, false);
      assert.equal(scenario.statuses.at(-1).state, 'off');
    } else { assert.equal(scenario.overviewRequests.length, 0); assert.equal(scenario.batches.length, 0); }
    const native = vectorBytes(stats.final_state);
    const result = { mode, initial_grids: initialGrids, final_grids: finalGrids, initial_published_physics: publishedPhysics(initialState),
      final_published_physics: publishedPhysics(finalState), final_native_vector: stats.final_state, final_native_vector_sha256: hash(native),
      digest: stats.digest, step: stats.step, t_s: stats.t_s, native_requests: scenario.nativeRequests,
      overview_requests: scenario.overviewRequests, overview_batches: structuredClone(scenario.batches), overview_statuses: [...scenario.statuses],
      max_resident: scenario.maxResident, loader_has_sources_before_dispose: loader.hasSources };
    if (results.length) {
      const baseline = results[0];
      for (const key of ['initial_grids', 'final_grids', 'initial_published_physics', 'final_published_physics',
        'final_native_vector', 'final_native_vector_sha256', 'digest', 'step', 't_s', 'native_requests', 'max_resident']) {
        assert.deepEqual(result[key], baseline[key], mode + ' differs from OFF in ' + key);
      }
      assert.deepEqual(native, vectorBytes(baseline.final_native_vector), mode + ' native Float64 bit pattern differs');
    }
    results.push(result); loader.dispose(); activeLoader = null; scenario.release.resolve(); await send({ type: 'stop' }, 'stats');
  }
  assert.equal(hash(await readFile(wasmURL)), wasmHash, 'WASM bytes were not changed');
  const inputsHash = {};
  for (const file of sourceFiles) {
    inputsHash[file] = hash(await readFile(new URL(file, import.meta.url)));
    assert.equal(inputsHash[file], initialSourceHashes[file], 'source changed during isolation proof: ' + file);
  }
  const build = JSON.parse(await readFile(new URL('./dist/build-info.json', import.meta.url), 'utf8'));
  const report = { observed_utc: new Date().toISOString(), result: 'pass', fixture_kind: 'explicit deterministic synthetic source payloads; no real DEM claim',
    scope: 'Production worker handler and unchanged actual WASM plus independent production overview loader, no full-app/browser/GPU integration or complete native checkpoint claim.',
    dt_s: 1 / 120, fixed_steps_per_case: STEPS, initial, loading: FLIGHT_DEFAULT_LOADING, inputs,
    excluded_wall_timing_fields: EXCLUDED_WALL_FIELDS,
    stats_comparison: 'Full exposed native Float64 vector/bit-pattern, native digest, steps/time and all published state fields except the two declared wall-time diagnostics. Pacing/burst cost statistics are excluded.',
    wasm_sha256: wasmHash, build_record_wasm_sha256: build.wasm_sha256, build_record_matches: wasmHash === build.wasm_sha256,
    source_hashes: inputsHash, cases: results };
  await mkdir(new URL('../../../output/flight/', import.meta.url), { recursive: true });
  await writeFile(new URL('../../../output/flight/terrain-overview-isolation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'pass', cases: results.map(c => ({ mode: c.mode, steps: c.step, digest: c.digest,
    native_vector_sha256: c.final_native_vector_sha256, overview_requests: c.overview_requests.length,
    overview_nonempty_batches: c.overview_batches.filter(b => b.cells).length })), wasm_sha256: wasmHash }));
} finally {
  activeLoader?.dispose();
  current?.release.resolve();
  globalThis.fetch = originalFetch;
  if (originalSelf === undefined) delete globalThis.self; else globalThis.self = originalSelf;
  if (originalPost === undefined) delete globalThis.postMessage; else globalThis.postMessage = originalPost;
}
