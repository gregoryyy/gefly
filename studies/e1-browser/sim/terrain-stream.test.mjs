import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { loadRegionalManifest, REGIONAL_TERRAIN, TerrainStream } from './terrain-stream.js';
globalThis.crypto ??= webcrypto;
const bytes = new ArrayBuffer(129 * 129 * 8);
const view = new DataView(bytes);
for (let i = 0; i < 129 * 129; i++) { view.setFloat32(i * 8, 123, true); view.setFloat32(i * 8 + 4, 42, true); }
const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
const tiles = [];
for (let row = 0; row < 19; row++) for (let col = 0; col < 32; col++) {
  const id = `e${600 + col * 25}-n${4700 + row * 25}`, west_deg = 6 + col / 4, south_deg = 47 + row / 4;
  const available = row * 32 + col >= 133;
  tiles.push({ id, west_deg, south_deg, east_deg: west_deg + .25, north_deg: south_deg + .25,
    width: 129, height: 129, coverage: available ? 'full' : 'unavailable', valid_nodes: available ? 129*129 : 0,
    ...(available ? {bytes:bytes.byteLength,asset:id+'.f32',sha256:digest} : {}) });
}
const response = data => new Response(data);
const hash = async data => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),n=>n.toString(16).padStart(2,'0')).join('');
async function fixture(records=tiles) {
  const raw=new TextEncoder().encode(JSON.stringify({version:2,tiles:records})),packed=gzipSync(raw);
  const manifest={version:2,id:'southern-germany-dgm200-gcg-v2',bounds:[6,47,14,51.75],tile_degrees:.25,tile_nodes:129,
    rows:'south-to-north',physical_datum:'DHHN2016',geoid_model:'GCG2016v2023',nodata:'paired-NaN',encoding:'float32-le-interleaved-H-zeta',
    index:{asset:'tiles-v2.json.bin',bytes:packed.length,decoded_bytes:raw.length,sha256:await hash(packed),count:608,available:475}};
  return {manifest,packed,fetcher:async url=>url.endsWith('manifest.json')?response(JSON.stringify(manifest))
    : url.includes('tiles-v2.json.bin')?response(packed):(fetched++,response(bytes.slice(0)))};
}
let fetched=0;
const {manifest,fetcher}=await fixture();
test('regional tiles load on demand and remain bounded across movement', async () => {
  const metas = await loadRegionalManifest(fetcher), installed = new Map();
  const stream = new TerrainStream(metas, grid => installed.set(grid.id, grid), grid => installed.delete(grid.id), fetcher);
  const rad = Math.PI / 180;
  await stream.move(49.6 * rad, 8.6 * rad);
  assert.equal(fetched, 9); assert.equal(installed.size, 9);
  assert.deepEqual(stream.sample(49.6 * rad, 8.6 * rad), { physical_m: 123, geoid_m: 42, ellipsoid_m: 165 });
  await stream.move(49.6 * rad, 8.85 * rad);
  assert.equal(fetched, 12); assert.equal(installed.size, 9);
  assert.equal(metas.size, 475); assert.equal(REGIONAL_TERRAIN.tileCount,608);
  await stream.move(50.9 * rad, 7.1 * rad);
  assert(stream.sample(50.9 * rad, 7.1 * rad)); assert(installed.size <= 9);
  await stream.move(51.7 * rad, 13.9 * rad);
  assert.equal(stream.gridAt(51.7 * rad, 13.9 * rad).slot, 607); assert(installed.size <= 9);
  assert.equal(stream.center(51.75 * rad, 9 * rad), null);
  assert.equal(stream.center(50 * rad, 6 * rad), null);
  await assert.rejects(stream.move(46 * rad, 8 * rad), /boundary/);
});
test('explicit unavailable neighbors are skipped and unavailable current tiles fail closed',async()=>{
 const requested=[],metas=await loadRegionalManifest(fetcher),stream=new TerrainStream(metas,()=>{},()=>{},async url=>{requested.push(url);return response(bytes.slice(0));});
 const rad=Math.PI/180;await stream.move(48.1*rad,7.4*rad);
 assert(stream.tiles.size>0&&stream.tiles.size<=9);assert(requested.every(url=>metas.has(url.split('/').at(-1).split('.')[0])));
 await assert.rejects(stream.move(47.1*rad,6.1*rad),/source coverage unavailable/);
});
test('manifest rejects asset substitution and tile digest is checked', async () => {
  const old = structuredClone(manifest); old.bounds = [8.25,49.25,10,50.75];
  await assert.rejects(loadRegionalManifest(async () => response(JSON.stringify(old))), /Unsupported/);
  const corrupt=structuredClone(tiles);corrupt[133].asset='../bad.f32';
  await assert.rejects(loadRegionalManifest((await fixture(corrupt)).fetcher),/metadata/);
  const substituted=await fixture();substituted.packed[10]^=1;
  await assert.rejects(loadRegionalManifest(substituted.fetcher),/integrity/);
  const metas = await loadRegionalManifest(fetcher);
  const stream = new TerrainStream(metas, () => assert.fail('must not install'), () => {}, async () => response(new ArrayBuffer(bytes.byteLength)));
  await assert.rejects(stream.move(49.6 * Math.PI / 180, 8.6 * Math.PI / 180), /integrity/);
});
test('rejects redirects, oversized streamed data and malformed matrix metadata', async () => {
  await assert.rejects(loadRegionalManifest(async () => ({ ok: true, redirected: true })), /redirected/);
  const oversized = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(100001)); c.close(); } });
  await assert.rejects(loadRegionalManifest(async () => new Response(oversized)), /too large/);
  const duplicate=structuredClone(tiles);duplicate[41]=duplicate[0];
  await assert.rejects(loadRegionalManifest((await fixture(duplicate)).fetcher),/metadata/);
  const inflated=await fixture();inflated.manifest.index.decoded_bytes--;
  await assert.rejects(loadRegionalManifest(inflated.fetcher),/decoded index/);
});
test('aborting a stalled fetch stops a move without installing a tile', async () => {
  const metas = await loadRegionalManifest(fetcher);
  const stream = new TerrainStream(metas, () => assert.fail('cancelled tile must not install'), () => {}, () => new Promise(() => {}));
  const move = stream.move(49.6 * Math.PI / 180, 8.6 * Math.PI / 180);
  stream.cancel();
  await assert.rejects(move, /cancelled/);
  assert.equal(stream.tiles.size, 0);
});
test('fine surface wins; shared coarse boundary resolves to lowest slot', async () => {
  const { atlasGridAt, sampleAtlas } = await import('./terrain-stream.js');
  const rad = Math.PI / 180, stream = new TerrainStream(await loadRegionalManifest(fetcher), () => {}, () => {}, fetcher);
  await stream.move(49.6 * rad, 8.6 * rad);
  const fine = { version: 1, id: 'fine', west_rad: 8.5 * rad, east_rad: 8.75 * rad,
    south_rad: 49.5 * rad, north_rad: 49.75 * rad, width: 2, height: 2,
    physical_m: new Float64Array([200,200,200,200]), geoid_m: new Float64Array([42,42,42,42]) };
  assert.equal(sampleAtlas(fine, stream.tiles, 49.6 * rad, 8.6 * rad).physical_m, 200);
  assert.equal(atlasGridAt(null, stream.tiles, 49.6 * rad, 8.5 * rad).slot, 329);
});
test('stalled manifest times out', async () => {
  const original = globalThis.setTimeout;
  globalThis.setTimeout = callback => original(callback, 0);
  try { await assert.rejects(loadRegionalManifest(() => new Promise(() => {})), /timed out/); }
  finally { globalThis.setTimeout = original; }
});
test('feather joins coarse and fine heights smoothly and includes its slope', async () => {
  const { sampleAtlas, sampleAtlasGradient } = await import('./terrain-stream.js'), rad = Math.PI / 180;
  const make = (id, height, geoid, west, east) => ({ version: 1, id, slot: 0, west_rad: west * rad, east_rad: east * rad,
    south_rad: 49 * rad, north_rad: 50 * rad, width: 2, height: 2,
    physical_m: new Float64Array(4).fill(height), geoid_m: new Float64Array(4).fill(geoid) });
  const fine = make('fine', 200, 50, 8.5, 9), coarse = make('coarse', 100, 40, 8, 9.5), tiles = new Map([['c', coarse]]);
  const lat = 49.5 * rad, lon = 8.51 * rad, eps = 1e-8;
  assert.equal(sampleAtlas(fine, tiles, lat, 8.5 * rad).physical_m, 100);
  assert(Math.abs(sampleAtlas(fine, tiles, lat, lon).physical_m - 150) < 1e-8);
  assert(Math.abs(sampleAtlas(fine, tiles, lat, lon).geoid_m - 45) < 1e-8);
  assert.equal(sampleAtlas(fine, tiles, lat, 8.53 * rad).physical_m, 200);
  const grad = sampleAtlasGradient(fine, tiles, lat, lon);
  const derivative = (sampleAtlas(fine, tiles, lat, lon + eps).physical_m - sampleAtlas(fine, tiles, lat, lon - eps).physical_m) / (2 * eps);
  const f = 1 / 298.257223563, e2 = f * (2 - f), n = 6378137 / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  assert(Math.abs(grad.east_slope - derivative / ((n + 150) * Math.cos(lat))) < 1e-7);
  assert.equal(grad.north_slope, 0);
  assert(Math.abs(sampleAtlas(fine, tiles, lat, 8.5 * rad - eps).physical_m - sampleAtlas(fine, tiles, lat, 8.5 * rad + eps).physical_m) < 1e-5);
  assert.equal(sampleAtlas(fine, new Map(), lat, 8.5 * rad).physical_m, 200);
});
