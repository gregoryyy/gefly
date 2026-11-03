// Integration check of the shipped regional files and the actual WASM callback.
// This checks consistency and coverage, not survey or flight-model accuracy.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import createJSBSim from './dist/jsbsim.mjs';
import { loadTerrainPackage, sampleTerrain } from './terrain.js';
import { loadRegionalManifest, TerrainStream, sampleAtlas, sampleAtlasGradient } from './terrain-stream.js';
globalThis.crypto ??= webcrypto;
const base = resolve('app/public');
const fetcher = async url => {
  if (!/^\/terrain\/[a-z0-9./-]+$/.test(url) || url.includes('..')) throw new Error('Unexpected fixture URL');
  try { return new Response(await readFile(base + url)); } catch { return new Response(null, { status: 404 }); }
};
const model = await createJSBSim({ print: () => {}, printErr: () => {} });
const fine = await loadTerrainPackage(fetcher);
function callGrid(fn, grid, ...args) {
  const ptr = model._malloc(grid.physical_m.byteLength);
  try { model.HEAPF64.set(grid.physical_m, ptr / 8); return fn(...args, grid.west_rad, grid.south_rad, grid.east_rad,
    grid.north_rad, grid.width, grid.height, ptr, grid.physical_m.length); }
  finally { model._free(ptr); }
}
assert.equal(callGrid(model._gf_configure_terrain_grid, fine), 0);
let maxResident = 0;
const stream = new TerrainStream(await loadRegionalManifest(fetcher), grid => {
  assert.equal(callGrid(model._gf_set_terrain_tile, grid, grid.slot), 0);
  maxResident = Math.max(maxResident, stream.tiles.size + 1);
}, grid => assert.equal(model._gf_remove_terrain_tile(grid.slot), 0), fetcher);
const rad = Math.PI / 180;
const nativeHeight = (lat, lon) => model._gf_terrain_height_m(lon, lat);
const state = () => Array.from(model.HEAPF64.subarray(model._gf_state() >> 3, (model._gf_state() >> 3) + 8));
const digest = () => model.UTF8ToString(model._gf_digest_hex());
for (const [lat, lon] of [[49.65, 8.85], [50, 9.5]]) {
  await stream.move(lat * rad, lon * rad);
  assert.equal(model._gf_init(1 / 120, lat * rad, lon * rad, 1500, 0, 45), 0);
  assert.equal(model._gf_terrain_available(), 1);
  assert(Math.abs(nativeHeight(lat * rad, lon * rad) - stream.sample(lat * rad, lon * rad).physical_m) < 1e-8);
  for (let i = 0; i < 10; i++) assert.equal(model._gf_step(), 0);
  const before = state(), hash = digest(), step = model._gf_step_index();
  await stream.move((lat + .26) * rad, lon * rad);
  assert.deepEqual(state(), before); assert.equal(digest(), hash); assert.equal(model._gf_step_index(), step);
  assert.equal(model._gf_terrain_available(), 1);
  assert.equal(model._gf_step(), 0);
}
assert(maxResident <= 9);
// Check the derived feather at real-data boundaries and within the band. The
// original source discrepancy is not a claim of DEM or survey accuracy.
let maxJump = 0, maxHeightMismatch = 0, maxSlopeMismatch = 0, count = 0;
for (let i = 0; i <= 32; i++) for (const edge of [0,1,2,3]) {
  const t = i / 32;
  const lon = edge < 2 ? fine.west_rad + t * (fine.east_rad - fine.west_rad) : (edge === 2 ? fine.west_rad : fine.east_rad);
  const lat = edge >= 2 ? fine.south_rad + t * (fine.north_rad - fine.south_rad) : (edge === 0 ? fine.south_rad : fine.north_rad);
  await stream.move(lat, lon);
  const dx = edge === 2 ? 1 : edge === 3 ? -1 : 0, dy = edge === 0 ? 1 : edge === 1 ? -1 : 0;
  const before = sampleAtlas(fine, stream.tiles, lat - dy * 1e-9, lon - dx * 1e-9);
  const after = sampleAtlas(fine, stream.tiles, lat + dy * 1e-9, lon + dx * 1e-9);
  assert(before && after);
  maxJump = Math.max(maxJump, Math.abs(before.physical_m - after.physical_m));
  for (const distance of [0, .005 * rad, .01 * rad, .019 * rad]) {
    const y = lat + dy * distance, x = lon + dx * distance;
    const value = sampleAtlas(fine, stream.tiles, y, x), gradient = sampleAtlasGradient(fine, stream.tiles, y, x);
    assert(value && gradient);
    const p = model._gf_terrain_sample(x, y) >> 3, native = model.HEAPF64.slice(p, p + 3);
    maxHeightMismatch = Math.max(maxHeightMismatch, Math.abs(native[0] - value.physical_m));
    const f = 1 / 298.257223563, e2 = f * (2 - f), d = 1 - e2 * Math.sin(y) ** 2;
    const n = 6378137 / Math.sqrt(d), m = 6378137 * (1 - e2) / d ** 1.5;
    maxSlopeMismatch = Math.max(maxSlopeMismatch, Math.abs(native[1] / ((n + native[0]) * Math.cos(y)) - gradient.east_slope),
      Math.abs(native[2] / (m + native[0]) - gradient.north_slope));
  }
  count++;
}
assert(maxJump < .01, `boundary jump ${maxJump} m`);
assert(maxHeightMismatch < 1e-8); assert(maxSlopeMismatch < 1e-10);
console.log(JSON.stringify({ result: 'pass', points: [[49.65,8.85],[50,9.5]], maxResident, edgeSamples: count,
  maxAcrossBoundaryChange_m: maxJump, maxNativeHeightMismatch_m: maxHeightMismatch, maxNativeSlopeMismatch: maxSlopeMismatch }));
