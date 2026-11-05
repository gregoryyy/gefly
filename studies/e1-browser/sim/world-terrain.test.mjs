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
    g => { events.push('remove'); installed.delete(g.id); }, async () => { requests++; throw Error('no optional source'); }, { copernicus: false });
  await stream.move(35.6 * RAD, 139.7 * RAD);
  assert.equal(requests, 0); assert.equal(stream.tiles.size, 9); assert.equal(installed.size, 9);
  assert([...stream.tiles.values()].every(validWorldTerrainTile));
  assert.deepEqual([...new Set([...stream.tiles.values()].map(g => g.slot))].sort(), [0,1,2,3,4,5,6,7,8]);
  assert.equal(stream.quality(35.6 * RAD, 139.7 * RAD), 2);
  assert(Math.abs(stream.sample(35.6 * RAD, 139.7 * RAD).physical_m - 225.6) < 1e-10);
  events.length = 0;
  await stream.move(10.1 * RAD, 179.99 * RAD);
  assert(events.slice(0, 9).every(e => e === 'remove')); assert(events.slice(9).every(e => e === 'install'));
  const west = [...stream.tiles.values()].find(g => g.id === 'world30-c0-r3203');
  const east = [...stream.tiles.values()].find(g => g.id === 'world30-c11519-r3203');
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
  }, { copernicus: false });
  await stream.move(49.6 * RAD, 8.24 * RAD);
  assert.equal(stream.failedSources.size, 1);
  assert(stream.sources.size <= 16);
  assert.equal(stream.gridAt(49.6 * RAD, 8.24 * RAD).source, 'mixed');
  assert.equal(stream.quality(49.6 * RAD, 8.24 * RAD), 3);
  const west = stream.tiles.get('world30-c6023-r4467'), east = stream.tiles.get('world30-c6024-r4467');
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
    g => installed.set(g.id, g), g => installed.delete(g.id), async () => { enter(); await gate; return new Response(source.bytes); }, { copernicus: false });
  await stream.move(35 * RAD, 139 * RAD); const before = [...installed.keys()];
  const pending = stream.move(49.6 * RAD, 8.1 * RAD); await entered;
  assert.deepEqual([...installed.keys()], before);
  stream.cancel(); await assert.rejects(pending, /cancelled/); release();
  assert.deepEqual([...installed.keys()], before); assert.deepEqual([...stream.tiles.keys()], before);
});
test('world tile validator rejects pool collisions, forged identity, bounds and holes', async () => {
  const stream = new WorldTerrainStream(world, null, () => {}, () => {}, undefined, { copernicus: false }); await stream.move(0, 0);
  const grid = [...stream.tiles.values()][0]; assert(validWorldTerrainTile(grid));
  for (const patch of [{slot:9}, {slot:-1}, {id:'world30-c11520-r2880'}, {id:'world30-c01-r2880'},
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
    const stream = new WorldTerrainStream(world, new Map([[source.meta.id, source.meta]]), () => {}, () => {}, () => { requests++; return new Promise(() => {}); }, { copernicus: false });
    await stream.move(49.6 * RAD, 8.1 * RAD);
    assert.equal(stream.tiles.size, 9); assert.equal(stream.quality(49.6 * RAD, 8.1 * RAD), 2);
    assert.equal(stream.failedSources.size, 1);
    await stream.move(49.6 * RAD, 8.2 * RAD); assert.equal(requests, 1);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(loadRegionalManifestOptional(fetchWorld, controller.signal), /cancelled/);
  } finally { globalThis.setTimeout = original; }
});

function copernicusBytes(col, row, height = (lon, lat) => 1000 + lon + lat) {
  const bytes = new ArrayBuffer(64 + N * 4), view = new DataView(bytes);
  [71,70,67,79,80,51,48,0].forEach((v,i) => view.setUint8(i,v));
  for (const [offset, value] of [[8,1],[12,col],[16,row],[20,129]]) view.setUint32(offset,value,true);
  for (let y=0;y<129;y++) for(let x=0;x<129;x++)
    view.setFloat32(64+(y*129+x)*4,height(-180+(col*128+x)/4096,-90+(row*128+y)/4096),true);
  return bytes;
}

test('R-WORLD-11 fine Copernicus owner halo keeps native count, measured-height detail and exact failed-owner/shared-edge identity', async () => {
  const requested = [], fetcher = async url => {
    const match = /copernicus\/(\d+)\/(\d+)\.bin$/.exec(url); assert(match); const [, col, row] = match.map(Number);
    requested.push([col,row]); if(col===0) return new Response('',{status:404});
    return new Response(copernicusBytes(col,row));
  };
  const stream = new WorldTerrainStream(world,null,()=>{},()=>{},fetcher);
  await stream.move(10.1*RAD,179.99*RAD);
  assert.equal(stream.tiles.size,9); assert(requested.length<=16); assert(stream.copernicusSources.size<=16);
  assert([...stream.tiles.values()].every(g => validWorldTerrainTile(g) && g.id.startsWith('world30-')));
  const east=stream.tiles.get('world30-c11519-r3203'),west=stream.tiles.get('world30-c0-r3203'); assert(east&&west);
  for(let y=0;y<129;y++) { assert.equal(east.physical_m[y*129+128],west.physical_m[y*129]); assert.equal(east.geoid_m[y*129+128],west.geoid_m[y*129]); }
  const sample=stream.sample(10.1*RAD,179.98*RAD); assert(Math.abs(sample.physical_m-(1000+10.1+179.98))<.0001);
  assert.equal(sample.geoid_m,20); assert(east.copernicus_nodes>0); assert(east.coarse_nodes>0); assert.equal(east.source_detail,'mixed');
  const before=requested.length; await stream.move(10.1*RAD,179.99*RAD); assert.equal(requested.length,before,'owner outcomes, including failure, are stable within epoch');
  await stream.move(10.1*RAD,-179.99*RAD); assert.equal(stream.tiles.size,9); assert(requested.filter(([col])=>col===0).length<=4,'failed canonical owner is never retried');
});

test('R-WORLD-11 Copernicus cell validation rejects forged identities, malformed masks and numeric corruption', async () => {
  const {readCopernicusCell}=await import('./copernicus-terrain.js'); const col=3360,row=4176;
  const value=await readCopernicusCell(col,row,async()=>new Response(copernicusBytes(col,row)));
  assert.equal(value.physical_m.length,N); assert.match(value.sha256,/^[a-f0-9]{64}$/);
  for(const edit of [view=>view.setUint32(12,col+1,true),view=>view.setUint8(24,1),view=>view.setFloat32(64,Infinity,true),view=>view.setFloat32(64,-32768,true)]){
    const bytes=copernicusBytes(col,row);edit(new DataView(bytes));await assert.rejects(readCopernicusCell(col,row,async()=>new Response(bytes)),/Invalid/);
  }
  await assert.rejects(readCopernicusCell(-1,row,()=>{throw Error('must not fetch');}),/identity/);
  const bytes=copernicusBytes(col,row,()=>NaN);await assert.rejects(readCopernicusCell(col,row,async()=>new Response(bytes)),/Empty/);
});

test('R-WORLD-11 epoch source budget is bounded and excess owners degrade to explicit coarse without invalidating existing cells', async () => {
  let requests=0;const stream=new WorldTerrainStream(world,null,()=>{},()=>{},async url=>{
    requests++;const [,col,row]=/copernicus\/(\d+)\/(\d+)\.bin$/.exec(url).map(Number);return new Response(copernicusBytes(col,row));
  });
  // Start at the final available outcome slot to exercise simultaneous workers.
  for(let i=0;i<511;i++) stream.copernicusSources.set('reserved-'+i,null);
  await stream.move(20*RAD,30*RAD); assert.equal(stream.copernicusSources.size,512); assert.equal(requests,1); assert.equal(stream.copernicusBudgetExhausted,true);
  const before=[...stream.tiles.values()].map(g=>[g.id,g.sha256]);await stream.move(20*RAD,30*RAD);assert.deepEqual([...stream.tiles.values()].map(g=>[g.id,g.sha256]),before);
  await stream.move(-20*RAD,-30*RAD);assert.equal(requests,1);assert([...stream.tiles.values()].every(g=>g.source_detail==='coarse'&&g.coarse_nodes===N));
});

test('R-WORLD-11 regional nodal priority does not request global detail and legacy recorded geometry retains its separate profile', async () => {
  const source=regionalMeta(8,10,()=>432);source.meta.sha256=await terrainDigest(source.bytes);let copRequests=0;
  const stream=new WorldTerrainStream(world,new Map([[source.meta.id,source.meta]]),()=>{},()=>{},async url=>{
    if(url.includes('/copernicus/')){copRequests++;throw Error('not needed');}return new Response(source.bytes);
  });
  await stream.move(49.6*RAD,8.1*RAD);assert.equal(copRequests,0);assert([...stream.tiles.values()].every(g=>g.source_detail==='regional'));
  const grid=[...stream.tiles.values()][0], legacy={...grid,id:'world-c752-r558',west_rad:8*RAD,south_rad:49.5*RAD,east_rad:8.25*RAD,north_rad:49.75*RAD};
  delete legacy.source_detail;delete legacy.copernicus_nodes;delete legacy.coarse_nodes;
  assert(validWorldTerrainTile(legacy));assert.equal(worldTerrainProfile(legacy),LEGACY_WORLD_TERRAIN);assert.equal(worldTerrainProfile(grid),WORLD_TERRAIN);
  assert.deepEqual(worldCellAt(49.6*RAD,8.1*RAD,LEGACY_WORLD_TERRAIN),[752,558]);assert.deepEqual(worldCellAt(49.6*RAD,8.1*RAD),[6019,4467]);
  assert.equal(validWorldTerrainTile({...grid,coarse_nodes:-1}),false);assert.equal(validWorldTerrainTile({...grid,copernicus_nodes:N+1}),false);
});
