import assert from 'node:assert/strict';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { loadWorldTerrainPackage, sampleWorldTerrain, terrainDigest, validWorldTerrainTile, worldCellAt, WORLD_TERRAIN, LEGACY_WORLD_TERRAIN, worldTerrainProfile } from './world-terrain.js';
import { WorldTerrainStream, loadRegionalManifestOptional, sampleAtlas, sampleAtlasGradient } from './terrain-stream.js';
globalThis.crypto ??= webcrypto;
const RAD = Math.PI / 180, N = 129 * 129;
const worldBytes = new ArrayBuffer(361 * 181 * 8), worldView = new DataView(worldBytes);
for (let y = 0; y < 181; y++) for (let x = 0; x < 361; x++) {
  const i = y * 361 + x;
  worldView.setFloat32(i * 8, 100 + y, true); worldView.setFloat32(i * 8 + 4, 20, true);
}
const manifest = { version: 1, id: 'world-etopo2022-1deg-egm2008-v1', bounds: [-180,-90,180,90],
  rows: 'south-to-north', encoding: 'float32-le-interleaved-H-zeta', width: 361, height: 181,
  physical_datum: 'EGM2008', geoid_model: 'EGM2008', asset: 'world-v1.f32', bytes: worldBytes.byteLength, sha256: await terrainDigest(worldBytes) };
const fetchWorld = async url => new Response(url.endsWith('.json') ? JSON.stringify(manifest) : worldBytes.slice(0));
const world = await loadWorldTerrainPackage(fetchWorld);
function regionalMeta(col, row, physical = () => 500) {
  const bytes = new ArrayBuffer(N * 8), view = new DataView(bytes), west_deg = 6 + col / 4, south_deg = 47 + row / 4;
  let valid_nodes = 0;
  for (let y = 0; y < 129; y++) for (let x = 0; x < 129; x++) {
    const h = physical(x, y); if (Number.isFinite(h)) valid_nodes++;
    view.setFloat32((y * 129 + x) * 8, h, true); view.setFloat32((y * 129 + x) * 8 + 4, Number.isNaN(h) ? NaN : 40, true);
  }
  const id = `e${600 + col * 25}-n${4700 + row * 25}`;
  return { bytes, meta: { id, slot: row * 32 + col, asset: id + '.f32', width: 129, height: 129, bytes: bytes.byteLength,
    west_deg, south_deg, east_deg: west_deg + .25, north_deg: south_deg + .25,
    valid_nodes, coverage: valid_nodes === N ? 'full' : 'partial', ...(valid_nodes === N ? {} : { masked: true }) } };
}
test('world bundle pins metadata, byte count, source digest and periodic seam', async () => {
  assert.equal(world.physical_m.length, 361 * 181);
  assert.deepEqual(sampleWorldTerrain(world, 0, 0), { physical_m: 190, geoid_m: 20, ellipsoid_m: 210 });
  assert.equal(sampleWorldTerrain(world, .375 * RAD, 137.125 * RAD).physical_m, 190.375);
  assert.deepEqual(sampleWorldTerrain(world, 20 * RAD, -Math.PI), sampleWorldTerrain(world, 20 * RAD, Math.PI));
  assert(sampleWorldTerrain(world, Math.PI / 2, 0));
  assert.equal(sampleWorldTerrain(world, Math.PI / 2 + .001, 0), null);
  await assert.rejects(loadWorldTerrainPackage(async () => new Response(JSON.stringify({ ...manifest, asset: '../other.f32' }))), /metadata/);
  await assert.rejects(loadWorldTerrainPackage(async url => new Response(url.endsWith('.json') ? JSON.stringify(manifest) : new Uint8Array(worldBytes.byteLength))), /integrity/);
  const seam = worldBytes.slice(0); new DataView(seam).setFloat32(360 * 8, 42, true);
  const seamManifest = { ...manifest, sha256: await terrainDigest(seam) };
  await assert.rejects(loadWorldTerrainPackage(async url => new Response(url.endsWith('.json') ? JSON.stringify(seamManifest) : seam)), /antimeridian/);
});
test('bundle rejects redirects, oversized responses, nodata and canceled/stalled reads', async () => {
  await assert.rejects(loadWorldTerrainPackage(async () => ({ ok: true, redirected: true })), /redirected/);
  await assert.rejects(loadWorldTerrainPackage(async () => new Response(new Uint8Array(100001))), /too large/);
  const invalid = worldBytes.slice(0); new DataView(invalid).setFloat32(0, -32768, true);
  const invalidManifest = { ...manifest, sha256: await terrainDigest(invalid) };
  await assert.rejects(loadWorldTerrainPackage(async url => new Response(url.endsWith('.json') ? JSON.stringify(invalidManifest) : invalid)), /nodes/);
  const controller = new AbortController(), pending = loadWorldTerrainPackage(() => new Promise(() => {}), controller.signal);
  controller.abort(); await assert.rejects(pending, /cancelled/);
  const oldTimeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => oldTimeout(callback, 0);
  try { await assert.rejects(loadWorldTerrainPackage(() => new Promise(() => {})), /timed out/); }
  finally { globalThis.setTimeout = oldTimeout; }
});
test('global fallback installs nine canonical cells, bounds its source cache and wraps longitude', async () => {
  let requests = 0; const installed = new Map(), events = [];
  const stream = new WorldTerrainStream(world, null, g => { events.push('install'); installed.set(g.id, g); },
    g => { events.push('remove'); installed.delete(g.id); }, async () => { requests++; throw Error('no optional source'); });
  await stream.move(35.6 * RAD, 139.7 * RAD);
  assert.equal(requests, 0); assert.equal(stream.tiles.size, 9); assert.equal(installed.size, 9);
  assert([...stream.tiles.values()].every(validWorldTerrainTile));
  assert.deepEqual([...new Set([...stream.tiles.values()].map(g => g.slot))].sort(), [0,1,2,3,4,5,6,7,8]);
  assert.equal(stream.quality(35.6 * RAD, 139.7 * RAD), 2);
  assert(Math.abs(stream.sample(35.6 * RAD, 139.7 * RAD).physical_m - 225.6) < 1e-10);
  events.length = 0;
  await stream.move(10.1 * RAD, 179.99 * RAD);
  assert(events.slice(0, 9).every(e => e === 'remove')); assert(events.slice(9).every(e => e === 'install'));
  const west = [...stream.tiles.values()].find(g => g.id === 'world-c0-r400');
  const east = [...stream.tiles.values()].find(g => g.id === 'world-c1439-r400');
  assert(west && east);
  for (let y = 0; y < 129; y++) assert.equal(west.physical_m[y * 129], east.physical_m[y * 129 + 128]);
  await stream.move(10.1 * RAD, -179.99 * RAD);
  assert.equal(stream.tiles.size, 9); assert.equal(installed.size, 9);
  assert.equal(stream.needsUpdate(10.1 * RAD, -179.99 * RAD), false);
  assert.equal(worldCellAt(89.5 * RAD, 0), null);
  assert.equal(worldCellAt(-89.5 * RAD, 0), null);
  await assert.rejects(stream.move(89.75 * RAD, 0), /89.5/);
  assert.equal(stream.tiles.size, 9, 'unsupported polar request retains the last complete window');
});
test('partial, missing and corrupt regional inputs compose over global without seams or retries', async () => {
  const a = regionalMeta(8, 10, (x, y) => x > 40 && x < 80 && y > 40 && y < 80 ? NaN : 500 + x / 128);
  const b = regionalMeta(9, 10, () => 501);
  for (const source of [a,b]) source.meta.sha256 = await terrainDigest(source.bytes);
  const metas = new Map([a,b].map(s => [s.meta.id, s.meta])); let requests = 0;
  const stream = new WorldTerrainStream(world, metas, () => {}, () => {}, async url => {
    requests++; return new Response(url.includes(a.meta.asset) ? a.bytes.slice(0) : new Uint8Array(b.bytes.byteLength));
  });
  await stream.move(49.6 * RAD, 8.24 * RAD);
  assert.equal(stream.failedSources.size, 1);
  assert(stream.sources.size <= 16);
  assert.equal(stream.gridAt(49.6 * RAD, 8.24 * RAD).source, 'mixed');
  assert.equal(stream.quality(49.6 * RAD, 8.24 * RAD), 3);
  const west = stream.tiles.get('world-c752-r558'), east = stream.tiles.get('world-c753-r558');
  assert(west && east);
  for (let y = 0; y < 129; y++) {
    assert.equal(west.physical_m[y * 129 + 128], east.physical_m[y * 129]);
    assert.equal(west.geoid_m[y * 129 + 128], east.geoid_m[y * 129]);
  }
  await stream.move(49.6 * RAD, 8.1 * RAD);
  const hole = stream.sample((49.5 + 60 / 512) * RAD, (8 + 60 / 512) * RAD);
  assert(Math.abs(hole.physical_m - (190 + 49.5 + 60 / 512)) < 1e-10);
  const gradient = sampleAtlasGradient(null, stream.tiles, 49.6 * RAD, 8.1 * RAD);
  assert(gradient && Object.values(gradient).every(Number.isFinite));
  assert(sampleAtlas(null, stream.tiles, 49.6 * RAD, 8.1 * RAD));
  const before = requests; await stream.move(49.6 * RAD, 8.2 * RAD);
  assert.equal(requests, before, 'failed source is latched for the epoch');
});
test('staged optional loading and cancellation never evict or install a partial window', async () => {
  const source = regionalMeta(8, 10); source.meta.sha256 = await terrainDigest(source.bytes);
  let enter, release; const entered = new Promise(r => { enter = r; }), gate = new Promise(r => { release = r; });
  const installed = new Map(), stream = new WorldTerrainStream(world, new Map([[source.meta.id, source.meta]]),
    g => installed.set(g.id, g), g => installed.delete(g.id), async () => { enter(); await gate; return new Response(source.bytes); });
  await stream.move(35 * RAD, 139 * RAD); const before = [...installed.keys()];
  const pending = stream.move(49.6 * RAD, 8.1 * RAD); await entered;
  assert.deepEqual([...installed.keys()], before);
  stream.cancel(); await assert.rejects(pending, /cancelled/); release();
  assert.deepEqual([...installed.keys()], before); assert.deepEqual([...stream.tiles.keys()], before);
});
test('world tile validator rejects pool collisions, forged identity, bounds and holes', async () => {
  const stream = new WorldTerrainStream(world, null, () => {}, () => {}, undefined); await stream.move(0, 0);
  const grid = [...stream.tiles.values()][0]; assert(validWorldTerrainTile(grid));
  for (const patch of [{slot:9}, {slot:-1}, {id:'world-c1440-r360'}, {id:'world-c01-r360'},
    {west_rad:grid.west_rad + .01}, {source:'OSM'}, {masked:true}, {sha256:'unknown'}])
    assert.equal(validWorldTerrainTile({...grid,...patch}), false);
});
test('one five-second budget bounds optional manifest and complete source halo, with cancellation distinct', async () => {
  const source = regionalMeta(8, 10); source.meta.sha256 = await terrainDigest(source.bytes);
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (callback, milliseconds) => original(callback, milliseconds === 5000 ? 0 : milliseconds);
  try {
    assert.equal(await loadRegionalManifestOptional(() => new Promise(() => {})), null);
    let requests = 0;
    const stream = new WorldTerrainStream(world, new Map([[source.meta.id, source.meta]]), () => {}, () => {}, () => { requests++; return new Promise(() => {}); });
    await stream.move(49.6 * RAD, 8.1 * RAD);
    assert.equal(stream.tiles.size, 9); assert.equal(stream.quality(49.6 * RAD, 8.1 * RAD), 2);
    assert.equal(stream.failedSources.size, 1);
    await stream.move(49.6 * RAD, 8.2 * RAD); assert.equal(requests, 1);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(loadRegionalManifestOptional(fetchWorld, controller.signal), /cancelled/);
  } finally { globalThis.setTimeout = original; }
});
