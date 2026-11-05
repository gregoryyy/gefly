// Actual production worker + unchanged WASM, with only local asset transport
// and controlled asset failure/latency. No injected native states or heights.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { loadWorldTerrainPackage, validWorldTerrainTile } from './world-terrain.js';
import { loadTerrainPackage } from './terrain.js';
import { loadRegionalManifestOptional, WorldTerrainStream, sampleAtlas, sampleAtlasGradient } from './terrain-stream.js';

if (!isMainThread) {
  globalThis.self = globalThis;
  globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer);
  const originalFetch = globalThis.fetch;
  let mode = '', hold = false, release, gate = Promise.resolve();
  globalThis.fetch = async (url, options) => {
    if (typeof url !== 'string' || !url.startsWith('/terrain/')) return originalFetch(url, options);
    const path = url.split('?')[0], regional = path.startsWith('/terrain/region/');
    if (mode === 'missing-regional' && regional) return new Response(null, { status: 404 });
    if (hold && regional && path.endsWith('.f32')) await gate;
    if (mode === 'corrupt-regional' && regional && path.endsWith('.f32')) return new Response(new Uint8Array(129 * 129 * 8));
    if (mode === 'corrupt-world' && path.endsWith('/world-v1.f32')) return new Response(new Uint8Array(361 * 181 * 8));
    try { return new Response(await readFile(new URL('../../../app/public' + path, import.meta.url))); }
    catch { return new Response(null, { status: 404 }); }
  };
  await import('./worker.js');
  parentPort.on('message', message => {
    if (message.type === 'diagnostic-control') {
      mode = message.mode ?? mode;
      if (message.hold === true) { hold = true; gate = new Promise(resolve => { release = resolve; }); }
      if (message.hold === false) { hold = false; release?.(); }
      parentPort.postMessage({ type: 'diagnostic-control-ready' });
    } else self.onmessage({ data: message });
  });
  parentPort.postMessage({ type: 'diagnostic-ready' });
} else {
  const RAD = Math.PI / 180, results = [];
  const wasmHash = createHash('sha256').update(await readFile(new URL('./dist/jsbsim.wasm', import.meta.url))).digest('hex');
  const build = JSON.parse(await readFile(new URL('./dist/build-info.json', import.meta.url), 'utf8'));
  // Direct native consistency complements the real Worker transport cases.
  // It compares the shared surface, not the DEM's real-world accuracy.
  {
    const createJSBSim = (await import('./dist/jsbsim.mjs')).default;
    const model = await createJSBSim({ print: () => {}, printErr: () => {} });
    const fetcher = async url => {
      try { return new Response(await readFile(new URL('../../../app/public' + url.split('?')[0], import.meta.url))); }
      catch { return new Response(null, { status: 404 }); }
    };
    const fine = await loadTerrainPackage(fetcher), world = await loadWorldTerrainPackage(fetcher);
    const install = (fn, grid, ...args) => {
      const pointer = model._malloc(grid.physical_m.byteLength);
      try { model.HEAPF64.set(grid.physical_m, pointer / 8); assert.equal(fn(...args, grid.west_rad, grid.south_rad,
        grid.east_rad, grid.north_rad, grid.width, grid.height, pointer, grid.physical_m.length), 0); }
      finally { model._free(pointer); }
    };
    install(model._gf_configure_terrain_grid, fine);
    const stream = new WorldTerrainStream(world, await loadRegionalManifestOptional(fetcher),
      grid => install(model._gf_set_terrain_tile, grid, grid.slot), grid => assert.equal(model._gf_remove_terrain_tile(grid.slot), 0), fetcher);
    let maxHeightMismatch = 0, maxSlopeMismatch = 0;
    const checked = [];
    for (const [lat, lon] of [[35.6,139.7],[37.7,-122.4],[49.65,9.1],[50.9,13.975],[50.9,14.01],[10.1,179.99],[10.1,-179.99],[89.49,0.1]]) {
      const y = lat * RAD, x = lon * RAD;
      await stream.move(y, x);
      const sample = sampleAtlas(fine, stream.tiles, y, x), slope = sampleAtlasGradient(fine, stream.tiles, y, x);
      assert(sample && slope);
      assert.equal(model._gf_init(1 / 120, y, x, Math.max(3000, sample.physical_m + 1000), 90 * RAD, 45), 0);
      assert.equal(model._gf_terrain_available(), 1);
      const pointer = model._gf_terrain_sample(x, y) >> 3, native = model.HEAPF64.slice(pointer, pointer + 3);
      const f = 1 / 298.257223563, e2 = f * (2 - f), d = 1 - e2 * Math.sin(y) ** 2;
      const n = 6378137 / Math.sqrt(d), m = 6378137 * (1 - e2) / d ** 1.5;
      maxHeightMismatch = Math.max(maxHeightMismatch, Math.abs(native[0] - sample.physical_m));
      maxSlopeMismatch = Math.max(maxSlopeMismatch, Math.abs(native[1] / ((n + native[0]) * Math.cos(y)) - slope.east_slope),
        Math.abs(native[2] / (m + native[0]) - slope.north_slope));
      for (let i = 0; i < 10; i++) assert.equal(model._gf_step(), 0);
      const before = Array.from(model.HEAPF64.slice(model._gf_state() >> 3, (model._gf_state() >> 3) + 14));
      const digest = model.UTF8ToString(model._gf_digest_hex()), step = model._gf_step_index();
      await stream.move((lat > 89.4 ? lat - .01 : lat + .01) * RAD, x);
      assert.deepEqual(Array.from(model.HEAPF64.slice(model._gf_state() >> 3, (model._gf_state() >> 3) + 14)), before);
      assert.equal(model.UTF8ToString(model._gf_digest_hex()), digest); assert.equal(model._gf_step_index(), step);
      assert.equal(model._gf_terrain_available(), 1);
      checked.push({ lat, lon, physical_m: sample.physical_m, geoid_m: sample.geoid_m, quality: stream.quality(y, x), digest });
    }
    assert(maxHeightMismatch < 1e-8); assert(maxSlopeMismatch < 1e-10);
    results.push({ id: 'native-shared-world-regional-surface', checked, maxHeightMismatch_m: maxHeightMismatch, maxSlopeMismatch,
      transaction_preserves_pose_digest_step: true });
  }
  async function harness() {
    const worker = new Worker(new URL(import.meta.url)), messages = [], grids = new Map();
    let transportError = null, maxResident = 0;
    worker.on('error', error => { transportError = error; });
    worker.on('message', message => {
      if (message.type === 'terrain-tile') {
        assert(validWorldTerrainTile(message.grid)); grids.set(message.grid.id, message.grid); maxResident = Math.max(maxResident, grids.size);
        message = { type: 'terrain-tile', id: message.grid.id, slot: message.grid.slot, source: message.grid.source, sha256: message.grid.sha256 };
      } else if (message.type === 'terrain-remove') grids.delete(message.id);
      messages.push(message);
    });
    async function wait(type, start = 0, predicate = () => true, allowError = false) {
      const end = Date.now() + 25000;
      while (Date.now() < end) {
        if (transportError) throw transportError;
        const error = messages.slice(start).find(m => m.type === 'error'); if (error && !allowError) throw Error(error.message);
        const found = messages.slice(start).find(m => m.type === type && predicate(m)); if (found) return found;
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      throw Error(`Timed out: ${type}`);
    }
    const send = message => worker.postMessage(message);
    async function control(command) { const start = messages.length; send({ type: 'diagnostic-control', ...command }); await wait('diagnostic-control-ready', start); }
    async function stats() { const start = messages.length; send({ type: 'stats' }); return wait('stats', start); }
    async function init(lat, lon) {
      const start = messages.length;
      send({ type: 'init', aircraft: 'c172x', terrain: true, streaming_terrain: true, ground_collision: true,
        dt_s: 1 / 120, state_hz: 60, ic: { lat_rad: lat * RAD, lon_rad: lon * RAD, alt_msl_m: 3000, heading_rad: 90 * RAD, tas_mps: 45 } });
      return { start, ready: await wait('ready', start), state: await wait('state', start) };
    }
    await wait('diagnostic-ready');
    return { worker, messages, grids, wait, send, control, stats, init, get maxResident() { return maxResident; } };
  }
  for (const fixture of [
    { id: 'outside-region-japan', lat: 35.6, lon: 139.7 },
    { id: 'antimeridian-crossing', lat: 10.1, lon: 179.999999 },
    { id: 'missing-regional-manifest', lat: 48.1, lon: 11.6, mode: 'missing-regional' },
    { id: 'corrupt-regional-tile', lat: 49.65, lon: 9.1, mode: 'corrupt-regional' },
  ]) {
    const h = await harness();
    try {
      if (fixture.mode) await h.control({ mode: fixture.mode });
      const initial = await h.init(fixture.lat, fixture.lon), start = h.messages.length;
      assert.equal(initial.state.terrain_source, 2);
      h.send({ type: 'run', until_step: 40 });
      const final = await h.wait('stats', start, m => m.step === 40);
      assert.equal(final.step, 40); assert.equal(h.grids.size, 9); assert(h.maxResident <= 9);
      if (fixture.id === 'antimeridian-crossing') assert(final.final_state[2] < 0, 'actual native longitude crosses into western hemisphere');
      if (fixture.mode === 'corrupt-regional') assert(initial.ready.build.regional_terrain.regional_failed_tiles > 0);
      results.push({ id: fixture.id, initial_state: initial.state, final_state: final.final_state, step: final.step, digest: final.digest,
        max_resident: h.maxResident, quality: initial.state.terrain_source, build: initial.ready.build.regional_terrain,
        grid_ids: [...h.grids.keys()], loading_events: h.messages.filter(m => m.type === 'terrain-loading') });
    } finally { await h.worker.terminate(); }
  }
  {
    const h = await harness();
    try {
      await h.init(49.65, 8.749999); await h.control({ hold: true });
      const start = h.messages.length; h.send({ type: 'run' });
      await h.wait('terrain-loading', start, m => m.loading === true);
      h.send({ type: 'pause' });
      const before = await h.stats(), beforeIds = [...h.grids.keys()];
      await new Promise(resolve => setTimeout(resolve, 30));
      const held = await h.stats();
      assert.equal(held.step, before.step); assert.equal(held.digest, before.digest); assert.deepEqual(held.final_state, before.final_state);
      assert.deepEqual([...h.grids.keys()], beforeIds, 'old complete atlas retained during staged source loading');
      await h.control({ hold: false }); await h.wait('terrain-loading', start, m => m.loading === false);
      await new Promise(resolve => setTimeout(resolve, 40)); const after = await h.stats();
      assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
      assert(h.maxResident <= 9);
      results.push({ id: 'pause-during-window-load', before, after, max_resident: h.maxResident, no_reinitialize: true });
    } finally { await h.worker.terminate(); }
  }
  {
    const h = await harness();
    try {
      await h.control({ mode: 'corrupt-world' }); const start = h.messages.length;
      h.send({ type: 'init', aircraft: 'c172x', terrain: true, streaming_terrain: true,
        dt_s: 1 / 120, state_hz: 60,
        ic: { lat_rad: 35.6 * RAD, lon_rad: 139.7 * RAD, alt_msl_m: 3000, heading_rad: 0, tas_mps: 45 } });
      const error = await h.wait('error', start, () => true, true);
      assert.match(error.message, /world terrain integrity/i); assert.doesNotMatch(error.message, /restart inside/i);
      assert(!h.messages.slice(start).some(m => m.type === 'ready'));
      results.push({ id: 'corrupt-required-world', error: error.message });
    } finally { await h.worker.terminate(); }
  }
  const hashes = {};
  for (const path of ['./worker.js','./terrain-stream.js','./world-terrain.js','./dist/jsbsim.wasm','../../../app/public/terrain/world/world-v1.f32'])
    hashes[path] = createHash('sha256').update(await readFile(new URL(path, import.meta.url))).digest('hex');
  assert.equal(hashes['./dist/jsbsim.wasm'], wasmHash, 'runtime binary stays unchanged throughout this diagnostic');
  const report = { scope: 'Actual Node Worker production source, current WASM bytes and real bundled terrain; fixture transport only. No browser, established build provenance, fidelity or exact-pole acceptance.',
    runtime_identity: { actual_wasm_sha256: wasmHash, build_record_wasm_sha256: build.wasm_sha256,
      build_record_matches: wasmHash === build.wasm_sha256, unchanged_during_probe: true }, hashes, results };
  await writeFile(new URL('../../../output/flight/world-terrain-actual-worker-task135.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks: results.map(r => r.id), hashes }, null, 2));
}
