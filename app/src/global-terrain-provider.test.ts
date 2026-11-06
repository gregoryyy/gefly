import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartesian3, Cartographic, Ellipsoid, type HeightmapTerrainData } from 'cesium';
import { createGlobalTerrainProvider, tryUpdateGlobalTerrainProvider, tryUpdateGlobalTerrainOverview, acceptGlobalTerrainOverviewSource, globalTerrainOverviewInfo } from './global-terrain-provider.ts';
import { sampleAtlas } from '../../studies/e1-browser/sim/terrain-stream.js';
import { sampleWorldTerrain, worldCellAt, worldTileId, WORLD_TERRAIN, LEGACY_WORLD_TERRAIN, type WorldTerrainProfile, type WorldTerrainTile } from '../../studies/e1-browser/sim/world-terrain.js';
import type { TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
const RAD = Math.PI / 180;
const world: TerrainGrid = { version: 1, id: 'world-fixture', width: 361, height: 181,
  west_rad: -Math.PI, east_rad: Math.PI, south_rad: -Math.PI / 2, north_rad: Math.PI / 2,
  physical_m: Float64Array.from({ length: 361 * 181 }, (_, i) => 100 + Math.floor(i / 361)),
  geoid_m: new Float64Array(361 * 181).fill(30) };
const fine: TerrainGrid = { version: 1, id: 'starter-fixture', width: 2, height: 2,
  west_rad: 8.45 * RAD, east_rad: 8.9 * RAD, south_rad: 49.85 * RAD, north_rad: 50.35 * RAD,
  physical_m: new Float64Array(4).fill(500), geoid_m: new Float64Array(4).fill(40) };
function tile(lat: number, lon: number): WorldTerrainTile {
  const [col, row] = worldCellAt(lat * RAD, lon * RAD)!;
  const west = -180 + col * WORLD_TERRAIN.step, south = -90 + row * WORLD_TERRAIN.step;
  return { version: 1, id: worldTileId(col, row), slot: 0, width: 129, height: 129,
    source: 'global', source_detail: 'copernicus', copernicus_nodes: 129 * 129, coarse_nodes: 0,
    sha256: 'a'.repeat(64), west_rad: west * RAD, east_rad: (west + WORLD_TERRAIN.step) * RAD,
    south_rad: south * RAD, north_rad: (south + WORLD_TERRAIN.step) * RAD,
    physical_m: Float64Array.from({ length: 129 * 129 }, (_, i) => 20 + (i % 129) * .5 + Math.floor(i / 129) * .8 + (i % 3) * .25),
    geoid_m: new Float64Array(129 * 129).fill(12) };
}
async function height(provider: ReturnType<typeof createGlobalTerrainProvider>, lat: number, lon: number, level: number) {
  const position = new Cartographic(lon * RAD, lat * RAD);
  const xy = provider.tilingScheme.positionToTileXY(position, level)!;
  const data = await provider.requestTileGeometry(xy.x, xy.y, level) as HeightmapTerrainData;
  assert(data);
  return data.interpolateHeight(provider.tilingScheme.tileXYToRectangle(xy.x, xy.y, level), position.longitude, position.latitude)!;
}
test('R-WORLD-11 global horizon remains sampleable far from nine resident source cells', async () => {
  const provider = createGlobalTerrainProvider(world, fine, [tile(40.71, -74.01)]);
  for (const [lat, lon] of [[-33.9,18.4],[35.6,139.7],[0,179.99],[0,-179.99],[89.9,0],[-89.9,0]]) {
    const expected = sampleWorldTerrain(world, lat * RAD, lon * RAD)!.ellipsoid_m;
    assert(Math.abs(await height(provider, lat, lon, 2) - expected) < 1e-8);
  }
  assert.equal(provider.getTileDataAvailable(-1,0,0), false);
  assert.equal(provider.getTileDataAvailable(0,0,15), false);
});
test('R-WORLD-11 source-aligned level twelve preserves fine native triangle heights and geoid', async () => {
  for (const [lat, lon] of [[40.71,-74.01],[-33.9,18.4],[-16.5,179.99],[-16.5,-179.99]]) {
    const grid = tile(lat, lon), provider = createGlobalTerrainProvider(world, fine, [grid]);
    const expected = sampleAtlas(fine, new Map([[grid.id, grid]]), lat * RAD, lon * RAD)!.ellipsoid_m;
    for (const level of [12,13,14]) {
      const actual = await height(provider, lat, lon, level);
      assert(Math.abs(actual - expected) < 1e-7, JSON.stringify({lat,lon,level,actual,expected,difference:actual-expected}));
    }
  }
});
test('R-WORLD-11 detailed starter area retains independent sampling and bounded higher LOD', async () => {
  const provider = createGlobalTerrainProvider(world, fine, []);
  assert(Math.abs(await height(provider,50,8.6,14) - 540) < 1e-8);
  const far = provider.tilingScheme.positionToTileXY(new Cartographic(0,0),8)!;
  assert.equal(provider.getTileDataAvailable(far.x,far.y,8),true, 'coarse far terrain retains a complete global LOD hierarchy');
  assert.match(provider.credit!.html,/NOAA ETOPO/);
});

test('R-WORLD-11 every global root preview stays within the bounded source-read budget', async () => {
  let physicalReads = 0;
  const observedWorld = { ...world, physical_m: new Proxy(world.physical_m, {
    get(target, property) {
      if (typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) physicalReads++;
      return Reflect.get(target, property, target);
    },
  }) };
  const provider = createGlobalTerrainProvider(observedWorld, fine, []);
  physicalReads = 0; // Exclude the one-time input validation boundary.
  const columns = provider.tilingScheme.getNumberOfXTilesAtLevel(0);
  const rows = provider.tilingScheme.getNumberOfYTilesAtLevel(0);
  assert.equal(columns, 2);
  assert.equal(rows, 1);
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const data = await provider.requestTileGeometry(x, y, 0) as HeightmapTerrainData;
    assert(data, 'every root remains renderable, including the far horizon');
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      assert.equal(data.isChildAvailable(x, y, x * 2 + dx, y * 2 + dy), true);
      assert.equal(provider.getTileDataAvailable(x * 2 + dx, y * 2 + dy, 1), true);
    }
  }
  // The coarse one-degree source needs four physical reads per preview node.
  // This structural budget avoids a timing assertion or Cesium private fields.
  // These two 5² root previews require only 50 nodes before refinement.
  assert(physicalReads >= 190 && physicalReads <= 210, String(physicalReads));
});

test('R-WORLD-11 progressive mesh spacing declares conservative decreasing geometric error', () => {
  const provider = createGlobalTerrainProvider(world, fine, []);
  let prior = Infinity;
  for (let level = 0; level <= 14; level++) {
    const error = provider.getLevelMaximumGeometricError(level);
    assert(Number.isFinite(error) && error > 0 && error < prior);
    prior = error;
  }
  assert(provider.getLevelMaximumGeometricError(0) > 27_000,
    'coarse roots must refine according to their actual preview spacing');
  assert(provider.getLevelMaximumGeometricError(12) > 6,
    'source-aligned detailed levels retain their native sampling scale');
  const rectangle = provider.tilingScheme.tileXYToRectangle(2 * 2 ** 13, 1 * 2 ** 13, 14);
  const a = Cartesian3.fromRadians(rectangle.west, rectangle.south);
  const b = Cartesian3.fromRadians(rectangle.west + rectangle.width / 180,
    rectangle.south + rectangle.height / 180);
  const midpoint = Cartesian3.midpoint(a, b, new Cartesian3());
  const surface = Ellipsoid.WGS84.scaleToGeodeticSurface(midpoint)!;
  assert(provider.getLevelMaximumGeometricError(14) >= Cartesian3.distance(midpoint, surface),
    'the final geometric floor also covers a diagonal cell chord on the ellipsoid');
  assert.throws(() => provider.getLevelMaximumGeometricError(-1));
  assert.throws(() => provider.getLevelMaximumGeometricError(NaN));
});

test('R-WORLD-11 hierarchy bounds and terminal child masks preserve finite negative terrain', async () => {
  const negativeWorld = { ...world, physical_m: new Float64Array(world.width * world.height).fill(-50) };
  const provider = createGlobalTerrainProvider(negativeWorld, fine, []);
  assert.equal(await height(provider, 12, 70, 2), -20, 'inland negative terrain plus geoid is not replaced by zero');
  for (const level of [0, 1, 6, 12, 14]) {
    const columns = provider.tilingScheme.getNumberOfXTilesAtLevel(level);
    const rows = provider.tilingScheme.getNumberOfYTilesAtLevel(level);
    for (const [x, y] of [[-1, 0], [0, -1], [columns, 0], [0, rows], [.5, 0], [0, NaN]]) {
      assert.equal(provider.getTileDataAvailable(x, y, level), false);
      assert.equal(provider.requestTileGeometry(x, y, level), undefined);
    }
  }
  const level = 14;
  const xy = provider.tilingScheme.positionToTileXY(new Cartographic(70 * RAD, 12 * RAD), level)!;
  const data = await provider.requestTileGeometry(xy.x, xy.y, level) as HeightmapTerrainData;
  assert(data);
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    assert.equal(data.isChildAvailable(xy.x, xy.y, xy.x * 2 + dx, xy.y * 2 + dy), false);
    assert.equal(provider.getTileDataAvailable(xy.x * 2 + dx, xy.y * 2 + dy, level + 1), false);
  }
  const badWorld = { ...world, physical_m: world.physical_m.slice() };
  badWorld.physical_m[100] = Infinity;
  assert.throws(() => createGlobalTerrainProvider(badWorld, fine, []), /sources unavailable/);
});

// Flat fixtures isolate update transactions from the existing gradient/parity cases.
const NODES = 129 * 129;
const updateWorld = { ...world, physical_m: new Float64Array(world.width * world.height).fill(40),
  geoid_m: new Float64Array(world.width * world.height).fill(10) };
const updateFine = { ...fine, west_rad: 8.4 * RAD, east_rad: 8.9 * RAD, south_rad: 49.8 * RAD, north_rad: 50.4 * RAD };
function cell(col: number, row=4000, h=100, profile: Readonly<WorldTerrainProfile> = WORLD_TERRAIN): WorldTerrainTile {
  const step=profile.step;
  return {version:1,id:profile===WORLD_TERRAIN?worldTileId(col,row):`world-c${col}-r${row}`,slot:0,width:129,height:129,
    west_rad:(-180+col*step)*RAD,east_rad:(-180+(col+1)*step)*RAD,
    south_rad:(-90+row*step)*RAD,north_rad:(-90+(row+1)*step)*RAD,
    physical_m:new Float64Array(NODES).fill(h),geoid_m:new Float64Array(NODES).fill(12),sha256:'a'.repeat(64),
    source:'global',...(profile===WORLD_TERRAIN?{source_detail:'copernicus',copernicus_nodes:NODES,coarse_nodes:0}:{})};
}
const clone=(grid:WorldTerrainTile):WorldTerrainTile=>({...grid,physical_m:grid.physical_m.slice(),geoid_m:grid.geoid_m.slice()});
function middle(grid:TerrainGrid){return new Cartographic((grid.west_rad+grid.east_rad)/2,(grid.south_rad+grid.north_rad)/2);}
async function request(provider:ReturnType<typeof createGlobalTerrainProvider>,position:Cartographic,level=14){
  const xy=provider.tilingScheme.positionToTileXY(position,level)!;
  const data=await provider.requestTileGeometry(xy.x,xy.y,level) as HeightmapTerrainData;
  assert(data);
  return data.interpolateHeight(provider.tilingScheme.tileXYToRectangle(xy.x,xy.y,level),position.longitude,position.latitude)!;
}
test('stable update accepts equal geometry clones, preserves identity, and samples new cells',async()=>{
  const old=cell(4000), next=cell(4001), provider=createGlobalTerrainProvider(updateWorld,updateFine,[old]);
  const before=provider;
  assert.equal(await request(provider,middle(old)),112);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[clone(old),next]),true);
  assert.equal(provider,before);
  assert.equal(await request(provider,middle(next)),112);
  const changed=clone(old);changed.physical_m[8000]++;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[changed]),false);
  assert.equal(await request(provider,middle(old)),112,'rejected update does not mutate installed geometry');
  old.physical_m.fill(999);
  assert.equal(await request(provider,middle(old)),112,'constructor snapshots do not alias worker arrays');
});
test('stable update rejects changed H/geoid/bounds and mismatched adjacent nodes atomically',async()=>{
  for(const part of ['physical_m','geoid_m'] as const){
    const old=cell(4000),provider=createGlobalTerrainProvider(updateWorld,updateFine,[old]);
    const beforeNew = await request(provider,middle(cell(4001)));
    const changed=clone(old);changed[part][3000]++;
    assert.equal(tryUpdateGlobalTerrainProvider(provider,[changed,cell(4001)]),false);
    assert.equal(await request(provider,middle(cell(4001))),beforeNew,'new cell was not partially installed');
  }
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(4000)]);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(4001,4000,101)]),false,'shared edge heights must agree');
  const wrong={...cell(4000),west_rad:0};
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[wrong]),false);
});
test('cached finest coarse mesh forces rebuild when new geometry intersects, including exact borders',async()=>{
  const unknown=cell(4000),provider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  assert.equal(await request(provider,middle(unknown)),50);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[unknown]),false);
  assert.equal(await request(provider,middle(unknown)),50);
  const edgeProvider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  await request(edgeProvider,new Cartographic(unknown.east_rad,(unknown.south_rad+unknown.north_rad)/2));
  assert.equal(tryUpdateGlobalTerrainProvider(edgeProvider,[unknown]),false,'shared vertices at a cached tile border also invalidate');
  const preview=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  await request(preview,middle(unknown),5);
  assert.equal(tryUpdateGlobalTerrainProvider(preview,[unknown]),true,'coarse parents remain explicitly progressive previews');
});
test('fine interior is irrelevant but fine feather missing-coarse geometry is protected',async()=>{
  // Choose a source cell inside the updateFine rectangle and outside its .02° feather.
  const interior=cell(Math.floor((8.6+180)/WORLD_TERRAIN.step),Math.floor((50.1+90)/WORLD_TERRAIN.step)),provider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  assert.equal(await request(provider,middle(interior),14),540);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[interior]),true);
  assert.equal(await request(provider,middle(interior),14),540);
  const feather=cell(Math.floor((8.6+180)/WORLD_TERRAIN.step),Math.floor((50.1+90)/WORLD_TERRAIN.step)),edgeFine={...updateFine,west_rad:feather.west_rad+.01*RAD};
  const edgeProvider=createGlobalTerrainProvider(updateWorld,edgeFine,[cell(100)]);
  const point=new Cartographic(edgeFine.west_rad+.005*RAD,(feather.south_rad+feather.north_rad)/2);
  assert.equal(await request(edgeProvider,point,14),540);
  assert.equal(tryUpdateGlobalTerrainProvider(edgeProvider,[feather]),false,'non-null fine sample alone is insufficient within its feather');
});
test('profiles and malformed updates fail closed without changing live credit or geometry',()=>{
  const grid=cell(4000),provider=createGlobalTerrainProvider(updateWorld,updateFine,[grid]),credit=provider.credit;
  const wrongProfile=cell(10,400,100,LEGACY_WORLD_TERRAIN);
  for(const input of [[],[grid,grid],[wrongProfile],[{...grid,physical_m:new Float64Array(1)}],
    [{...grid,source_detail:'coarse'}],Array.from({length:10},(_,i)=>cell(4000+i))]){
    assert.equal(tryUpdateGlobalTerrainProvider(provider,input as WorldTerrainTile[]),false);
    assert.equal(provider.credit,credit);
  }
  assert.equal(tryUpdateGlobalTerrainProvider({} as any,[grid]),false);
  const invalid=clone(grid);invalid.physical_m[100]=Infinity;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[invalid]),false);
});
test('history is bounded to64 and retains current IDs while evicting unused LRU sources',()=>{
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  for(let i=101;i<=170;i++)assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(i)]),true);
  const stillRetained=cell(170);stillRetained.physical_m[500]++;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[stillRetained]),false);
  const evicted=cell(100);evicted.physical_m[500]++;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[evicted]),true,'oldest source has been evicted rather than retained beyond budget');
});
test('history eviction cannot drop a finest mesh source and silently regenerate coarse geometry',async()=>{
  const initial=cell(100),provider=createGlobalTerrainProvider(updateWorld,updateFine,[initial]);
  await request(provider,middle(initial));
  for(let i=101;i<=163;i++)assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(i)]),true);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(164)]),false);
  assert.equal(await request(provider,middle(initial)),112);
});
test('live public credit getter adds Copernicus and retains it after history eviction',()=>{
  const coarse=cell(100);coarse.source_detail='coarse';coarse.copernicus_nodes=0;coarse.coarse_nodes=NODES;
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,[coarse]);
  assert.doesNotMatch(provider.credit!.html,/Copernicus/);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(101)]),true);
  assert.match(provider.credit!.html,/Copernicus/);
  for(let i=102;i<=170;i++){
    const next=cell(i);next.source_detail='coarse';next.copernicus_nodes=0;next.coarse_nodes=NODES;
    assert.equal(tryUpdateGlobalTerrainProvider(provider,[next]),true);
  }
  assert.match(provider.credit!.html,/Copernicus/);
});
test('dateline neighbors compare shared geometry conservatively and update without losing coverage',async()=>{
  const left=cell(0),right=cell(WORLD_TERRAIN.cols-1),provider=createGlobalTerrainProvider(updateWorld,updateFine,[left]);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[right]),true);
  assert.equal(await request(provider,middle(right)),112);
  const bad=cell(0);bad.geoid_m[129]++;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[bad]),false);
  const fallback=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  await request(fallback,new Cartographic(-Math.PI,(left.south_rad+left.north_rad)/2));
  assert.equal(tryUpdateGlobalTerrainProvider(fallback,[right]),false,'+π new tile intersects cached -π boundary');
});
test('legacy identities also protect unknown finest geometry without reinterpretation',async()=>{
  const grid=cell(400,400,100,LEGACY_WORLD_TERRAIN),provider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100,100,100,LEGACY_WORLD_TERRAIN)]);
  assert.equal(await request(provider,middle(grid),14),50);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[grid]),false);
  const stable=createGlobalTerrainProvider(updateWorld,updateFine,[grid]);
  assert.equal(tryUpdateGlobalTerrainProvider(stable,[clone(grid),cell(401,400,100,LEGACY_WORLD_TERRAIN)]),true);
  assert.equal(await request(stable,middle(grid),14),112);
});
test('real3x3 center shift accepts six freshly cloned unchanged cells and three new cells',async()=>{
  const window=(center:number)=>Array.from({length:9},(_,i)=>({...cell(center-1+i%3,3999+Math.floor(i/3)),slot:i}));
  const first=window(4000),provider=createGlobalTerrainProvider(updateWorld,updateFine,first);
  assert.equal(await request(provider,middle(first[4])),112);
  const next=window(4001);
  assert.equal(next.filter(grid=>first.some(old=>old.id===grid.id)).length,6);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,next),true);
  assert.equal(await request(provider,middle(next[5])),112);
  const same=next.map(clone);same[4].geoid_m[8000]+=.25;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,same),false);
});
test('bounded coarse-preview overflow conservatively rejects unknown geometry but accepts equal current clones',async()=>{
  const installed=cell(4000),provider=createGlobalTerrainProvider(updateWorld,updateFine,[installed]);
  for(let x=0;x<513;x++)await provider.requestTileGeometry(x,3000,14);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[clone(installed)]),true);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(4001)]),false,'overflow cannot silently forget an already returned coarse preview');
});
test('static Review factory preserves18 disjoint grids, mixed profiles, and bounded73-grid coverage',async()=>{
  const grids=Array.from({length:18},(_,i)=>cell(100+i*10,4000+i*2));
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,grids);
  assert.equal(await request(provider,middle(grids[0])),112);
  assert.equal(await request(provider,middle(grids[17])),112);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[clone(grids[0])]),false,'archive union must remain static');
  const legacy=cell(400,400,100,LEGACY_WORLD_TERRAIN),mixed=createGlobalTerrainProvider(updateWorld,updateFine,[grids[0],legacy]);
  assert.equal(await request(mixed,middle(legacy)),112);
  assert.equal(await request(mixed,middle(grids[0])),112);
  assert.equal(tryUpdateGlobalTerrainProvider(mixed,[clone(grids[0])]),false,'mixed archives never reinterpret an identity profile');
  const all=Array.from({length:73},(_,i)=>cell(100+i*10));
  const max=createGlobalTerrainProvider(updateWorld,updateFine,all);
  assert.equal(await request(max,middle(all[72])),112);
  assert.equal(tryUpdateGlobalTerrainProvider(max,[all[72]]),false);
  assert.throws(()=>createGlobalTerrainProvider(updateWorld,updateFine,[...all,cell(1000)]),/Invalid global terrain window/);
  const empty=createGlobalTerrainProvider(updateWorld,updateFine,[]);
  assert.equal(await request(empty,middle(grids[0])),50);
  assert.equal(tryUpdateGlobalTerrainProvider(empty,[grids[0]]),false,'zero initial cells is explicitly static');
});
test('equalgeometry metadata refresh accepts slot changes and adds newly declared Copernicus credit',async()=>{
  const initial=cell(4000);initial.source_detail='coarse';initial.copernicus_nodes=0;initial.coarse_nodes=NODES;
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,[initial]);
  assert.doesNotMatch(provider.credit!.html,/Copernicus/);
  const changedSlot=clone(initial);changedSlot.slot=8;
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[changedSlot]),true);
  const copernicus=clone(changedSlot);copernicus.source_detail='copernicus';copernicus.copernicus_nodes=NODES;copernicus.coarse_nodes=0;
  copernicus.sha256='b'.repeat(64);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[copernicus]),true);
  assert.match(provider.credit!.html,/Copernicus/,'new valid16641-node source declaration must update public credit');
  assert.equal(await request(provider,middle(initial)),112);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[clone(initial)]),true);
  assert.match(provider.credit!.html,/Copernicus/,'source credits remain sticky for already cached meshes');
});
test('static Review ignores valid older regional grids while retaining native world coverage',async()=>{
  const native=Array.from({length:9},(_,i)=>({...cell(3999+i%3,3999+Math.floor(i/3)),slot:i}));
  const regional:TerrainGrid[]=Array.from({length:9},(_,i)=>({...cell(4000),id:`e${600+i*25}-n4700`,
    west_rad:(6+i*.25)*RAD,east_rad:(6.25+i*.25)*RAD,south_rad:47*RAD,north_rad:47.25*RAD}));
  for(const create of [createGlobalTerrainProvider]){
    const provider=create(updateWorld,updateFine,[...native,...regional]);
    assert.equal(await request(provider,middle(native[4]),12),112);
    assert.equal(await request(provider,middle(regional[0]),12),50,'preserves old global-factory filtering without adding regional priority');
    const update=tryUpdateGlobalTerrainProvider;
    assert.equal(update(provider,native),false,'raw regional union is static even if its filtered updateWorld subset is9');
    const onlyRegional=create(updateWorld,updateFine,regional);
    assert.equal(await request(onlyRegional,middle(regional[0]),12),50);
    assert.equal(update(onlyRegional,native),false);
    const invalid={...regional[0],physical_m:new Float64Array(1)};
    assert.throws(()=>create(updateWorld,updateFine,[invalid]),/Invalid global terrain window/,'invalid general grids still fail explicitly');
  }
});


// Synthetic mechanism fixtures: these establish transition/cache behavior, not
// source accuracy. Real Swiss Copernicus/native/GPU measurements are separate.
test('R-WORLD-11 exterior collar is continuous at all source edges/corners and exact inside/outside',async()=>{
  const grid=cell(6029,4388),provider=createGlobalTerrainProvider(updateWorld,updateFine,[grid]);
  const band=.125*RAD,epsilon=1e-9*RAD,c=middle(grid);
  for(const [x,y] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
    const lon=x<0?grid.west_rad:x>0?grid.east_rad:c.longitude;
    const lat=y<0?grid.south_rad:y>0?grid.north_rad:c.latitude;
    const boundary=await request(provider,new Cartographic(lon,lat));
    const inside=await request(provider,new Cartographic(lon-x*epsilon,lat-y*epsilon));
    const outside=await request(provider,new Cartographic(lon+x*epsilon,lat+y*epsilon));
    assert(Math.abs(boundary-112)<1e-6,JSON.stringify({x,y,boundary}));
    assert(Math.abs(inside-112)<1e-6);
    assert(Math.abs(outside-boundary)<1e-5,JSON.stringify({x,y,boundary,outside}));
    const distance=Math.hypot(x,y),beyond=new Cartographic(lon+x*(band+.001*RAD)/distance,lat+y*(band+.001*RAD)/distance);
    assert(Math.abs(await request(provider,beyond)-50)<1e-8,'beyond compact support is exact coarse H+N');
  }
  assert.equal(await request(provider,c),112);
});
test('R-WORLD-11 exterior correction includes geoid and has no disjoint-source nearest-tie seam',async()=>{
  const a=cell(4000,4000,100),b=cell(4004,4000,300),provider=createGlobalTerrainProvider(updateWorld,updateFine,[a,b]);
  const lat=middle(a).latitude,lon=(a.east_rad+b.west_rad)/2,delta=1e-8*RAD;
  const left=await request(provider,new Cartographic(lon-delta,lat));
  const right=await request(provider,new Cartographic(lon+delta,lat));
  assert(Math.abs(left-right)<.001,JSON.stringify({left,right}));
  assert(left>100&&left<312,'blended exterior is finite and bounded by contributing corrections');
  assert(Math.abs(await request(provider,new Cartographic(a.east_rad+1e-9*RAD,lat))-112)<1e-5,
    'near a source boundary its own physical+geoid correction dominates other sources');
});
test('R-WORLD-11 exterior collar wraps longitude and remains finite at geographic limits',async()=>{
  for(const [col,row,longitude] of [[0,4000,180-1e-9],[WORLD_TERRAIN.cols-1,4000,-180+1e-9]]){
    const grid=cell(col,row),provider=createGlobalTerrainProvider(updateWorld,updateFine,[grid]);
    assert(Math.abs(await request(provider,new Cartographic(longitude*RAD,middle(grid).latitude))-112)<1e-5);
  }
  const polar=cell(0,WORLD_TERRAIN.rows-1),provider=createGlobalTerrainProvider(updateWorld,updateFine,[polar]);
  assert(Number.isFinite(await request(provider,new Cartographic(-179.9*RAD,Math.PI/2))));
});
test('R-WORLD-11 new source and eviction protect cached exterior collar geometry',async()=>{
  const old=cell(4000),incoming=cell(4001),provider=createGlobalTerrainProvider(updateWorld,updateFine,[old]);
  const exterior=new Cartographic(incoming.east_rad+.05*RAD,middle(old).latitude);
  const before=await request(provider,exterior);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[clone(old)]),true,'metadata/duplicate update retains provider');
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[incoming]),false,'new source can alter a cached collar beyond its own rectangle');
  assert.equal(await request(provider,exterior),before);
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[cell(5000)]),true,'distant source does not invalidate the cached collar');
  const history=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  await request(history,new Cartographic(cell(100).east_rad+.05*RAD,middle(cell(100)).latitude));
  for(let i=200;i<263;i++)assert.equal(tryUpdateGlobalTerrainProvider(history,[cell(i)]),true);
  assert.equal(tryUpdateGlobalTerrainProvider(history,[cell(263)]),false,'eviction cannot remove a cached source contribution');
});

test('R-WORLD-11 redundant fine-interior source cannot alter cached exterior collar weights',async()=>{
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,[cell(100)]);
  const point=new Cartographic(updateFine.west_rad-.03*RAD,(updateFine.south_rad+updateFine.north_rad)/2);
  const before=await request(provider,point);
  const interior=cell(Math.floor((8.46+180)/WORLD_TERRAIN.step),Math.floor((50.1+90)/WORLD_TERRAIN.step));
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[interior]),true);
  assert.equal(await request(provider,point),before);
});

test('R-WORLD-11 display overview preserves exact native atlas and both exterior joins',async()=>{
  const {composeTerrainOverview,decodeCopernicusOverview}=await import('./terrain-overview.ts');
  const overview=[];
  for(const col of[753,754]){const bytes=new ArrayBuffer(64+129*129*4),view=new DataView(bytes);new Uint8Array(bytes).set([71,70,67,79,80,51,48,0]);
    for(const[o,v]of[[8,2],[12,col],[16,548],[20,129]])view.setUint32(o,v,true);for(let i=0;i<129*129;i++)view.setFloat32(64+i*4,900,true);
    overview.push((await composeTerrainOverview(updateWorld,col,548,await decodeCopernicusOverview(bytes,col,548),[]))!);}
  const native=cell(6029,4388),plain=createGlobalTerrainProvider(updateWorld,updateFine,[native]);
  const provider=createGlobalTerrainProvider(updateWorld,updateFine,[native],overview);
  const center=middle(native);
  assert.equal(await request(provider,center),await request(plain,center),'resident/native atlas remains bit-identical');
  assert.equal(await height(provider,50.1,8.6,14),540,'starter fine source retains priority over display data');
  assert(Math.abs(await height(provider,47.15,8.65,14)-910)<1e-8,'outside native collar the overview H+N is returned');
  const edge=new Cartographic(native.east_rad,center.latitude),outside=new Cartographic(edge.longitude+1e-9*RAD,edge.latitude);
  assert(Math.abs(await request(provider,edge)-112)<1e-6);
  assert(Math.abs(await request(provider,outside)-112)<1e-4,'native-to-overview join has no step');
  assert(Math.abs(await height(provider,47.15,8.75,14)-910)<1e-6);
  assert(Math.abs(await height(provider,47.15,8.750000001,14)-910)<1e-4,'overview-to-world join has no step');
  assert.equal(await height(provider,47.15,9,14),50,'far horizon remains original world source');
  assert.equal(tryUpdateGlobalTerrainProvider(provider,[clone(native),cell(6030,4388)]),false,'new native geometry cannot replace a cached overview/collar mesh silently');
  const stable=createGlobalTerrainProvider(updateWorld,updateFine,[native],overview);
  await request(stable,center);
  assert.equal(tryUpdateGlobalTerrainProvider(stable,[clone(native),cell(6030,4388)]),true,'unchanged overview retains safe native updates');
  assert.match(provider.credit!.html,/Copernicus/);
  assert.throws(()=>createGlobalTerrainProvider(updateWorld,updateFine,[native],[overview[0],overview[0]]),/overview/);
  assert.throws(()=>createGlobalTerrainProvider(updateWorld,updateFine,[native],[{...overview[0],id:'world-c753-r548'}]),/overview/);
  const old=await height(provider,47.15,8.65,14);overview[1].physical_m.fill(700);
  assert.equal(await height(provider,47.15,8.65,14),old,'provider owns detached overview geometry');
});


async function displayCell(col:number,row:number,h=900){
  const {composeTerrainOverview,decodeCopernicusOverview}=await import('./terrain-overview.ts');
  const bytes=new ArrayBuffer(64+129*129*4),view=new DataView(bytes);new Uint8Array(bytes).set([71,70,67,79,80,51,48,0]);
  for(const[o,v]of[[8,2],[12,col],[16,row],[20,129]])view.setUint32(o,v,true);for(let i=0;i<129*129;i++)view.setFloat32(64+i*4,h,true);
  return (await composeTerrainOverview(updateWorld,col,row,await decodeCopernicusOverview(bytes,col,row),[]))!;
}
test('R-WORLD-11 stable overview history keeps completed geometry and refreshes metadata/credit',async()=>{
  const a=await displayCell(753,548),b=await displayCell(754,548),coarseNative=cell(6029,4388);coarseNative.source_detail='coarse';coarseNative.copernicus_nodes=0;coarseNative.coarse_nodes=NODES;
  const regional={...a,source:'regional' as const,regional_nodes:NODES,copernicus_nodes:0,copernicus_sha256:null};
  const p=createGlobalTerrainProvider(updateWorld,updateFine,[coarseNative],[regional]);
  assert.doesNotMatch(p.credit!.html,/Copernicus/);const before=await height(p,47.15,8.3,13);
  assert(tryUpdateGlobalTerrainOverview(p,[a]));assert.match(p.credit!.html,/Copernicus/);
  assert.equal(await height(p,47.15,8.3,13),before,'metadata-only source change preserves exact geometry');
  assert(tryUpdateGlobalTerrainOverview(p,[b]));assert.equal(globalTerrainOverviewInfo(p)?.history,2);
  assert.equal(await height(p,47.15,8.3,13),before,'old active window remains resident after a new window');
  const changed={...a,physical_m:a.physical_m.slice()};changed.physical_m[400]++;
  assert.equal(tryUpdateGlobalTerrainOverview(p,[changed]),false);assert.equal(globalTerrainOverviewInfo(p)?.pending,'changed geometry');
});
test('R-WORLD-11 streaming never bakes unknown far detail or nonauthoritative native level14',async()=>{
  const requested:any[]=[];const native=cell(6029,4388),p=createGlobalTerrainProvider(updateWorld,updateFine,[native],[],{stream:true,request:c=>requested.push(...c)});
  const far=new Cartographic(8.65*RAD,47.15*RAD),xy=p.tilingScheme.positionToTileXY(far,10)!;
  assert.equal(p.requestTileGeometry(xy.x,xy.y,10),undefined);assert(requested.some(c=>c.col===754&&c.row===548));
  const fineXY=p.tilingScheme.positionToTileXY(far,14)!;assert.equal(p.requestTileGeometry(fineXY.x,fineXY.y,14),undefined);
  for(let pass=0;pass<3;pass++){const needed=[...new Map(requested.map(c=>[`${c.col}/${c.row}`,c])).values()];requested.length=0;for(const c of needed)assert(acceptGlobalTerrainOverviewSource(p,{...c,grid:await displayCell(c.col,c.row)}));const value=p.requestTileGeometry(xy.x,xy.y,10);if(value)break;}
  assert(Math.abs(await height(p,47.15,8.65,10)-910)<1e-6);
  assert.equal(p.requestTileGeometry(fineXY.x,fineXY.y,14),undefined,'far overview stays a progressively refined parent; native14 never changes later');
  assert.equal(await request(p,middle(native)),112,'current native/contact level14 remains exact');
});

test('Task162 persistent overview rejects mismatched adjacent H/N without changing returned meshes',async()=>{
  const a=await displayCell(800,400),b=await displayCell(801,400),native=cell(6029,4388);
  const p=createGlobalTerrainProvider(updateWorld,updateFine,[native],[a],{stream:true});
  const before=await height(p,10.125,20.125,13);
  const bad={...b,geoid_m:b.geoid_m.slice()};bad.geoid_m[129*20]++;
  assert.equal(tryUpdateGlobalTerrainOverview(p,[bad]),false);
  assert.equal(globalTerrainOverviewInfo(p)?.pending,'shared edge');
  assert.equal(await height(p,10.125,20.125,13),before);
  assert.throws(()=>createGlobalTerrainProvider(updateWorld,updateFine,[native],[a,bad]),/shared edge/);
  assert.equal(globalTerrainOverviewInfo(p)?.closed,'shared edge');
  assert.equal(tryUpdateGlobalTerrainOverview(p,[b]),false,'an explicit reset is needed after a geometry conflict');
  const fresh=createGlobalTerrainProvider(updateWorld,updateFine,[native],[a],{stream:true});
  assert(tryUpdateGlobalTerrainOverview(fresh,[b]));
  assert.equal(await height(fresh,10.125,20.375,13),before,'new mesh uses admitted source without replacing provider');
  const seam=await height(fresh,10.125,20.25,13);assert.equal(seam,before);
});
test('Task162 pinned overview capacity remains pending with provider identity and old meshes retained',async()=>{
  const p=createGlobalTerrainProvider(updateWorld,updateFine,[cell(6029,4388)],[],{stream:true});
  let first=0;
  for(let i=0;i<32;i++){
    assert(tryUpdateGlobalTerrainOverview(p,[await displayCell(800+i,400)]));
    const h=await height(p,10.125,20.125+i*.25,13);if(!i)first=h;
  }
  assert.equal(globalTerrainOverviewInfo(p)?.history,32);assert.equal(globalTerrainOverviewInfo(p)?.pinned,32);
  assert.equal(tryUpdateGlobalTerrainOverview(p,[await displayCell(832,400)]),false);
  assert.equal(globalTerrainOverviewInfo(p)?.pending,'history capacity');
  assert.equal(globalTerrainOverviewInfo(p)?.closed,'history capacity');
  assert(Number.isFinite(await height(p,10.125,28.125,13)),'closed baseline drains unknown far-detail requests');
  const metadata={...await displayCell(800,400),source:'regional' as const,copernicus_nodes:0,regional_nodes:NODES,copernicus_sha256:null};
  assert(tryUpdateGlobalTerrainOverview(p,[metadata]),'same-geometry metadata remains refreshable after admission closes');
  assert.equal(await height(p,10.125,20.125,13),first);
  assert.equal(globalTerrainOverviewInfo(p)?.history,32);
});
test('Task162 settled missing sources cannot flip cached fallback geometry to new positive data',async()=>{
  const requested:any[]=[];const p=createGlobalTerrainProvider(updateWorld,updateFine,[cell(6029,4388)],[],{stream:true,request:c=>requested.push(...c)});
  const target=new Cartographic(20.125*RAD,10.125*RAD),xy=p.tilingScheme.positionToTileXY(target,10)!;
  let data;
  for(let pass=0;pass<4;pass++){
    data=p.requestTileGeometry(xy.x,xy.y,10);if(data)break;
    const needed=[...new Map(requested.map(c=>[`${c.col}/${c.row}`,c])).values()];requested.length=0;
    for(const c of needed)assert(acceptGlobalTerrainOverviewSource(p,{...c,grid:null}));
  }
  assert(data,'settled unavailable source requests drain to an honest coarse preview');
  const rect=p.tilingScheme.tileXYToRectangle(xy.x,xy.y,10),before=(await data!).interpolateHeight(rect,target.longitude,target.latitude);
  assert.equal(acceptGlobalTerrainOverviewSource(p,{col:800,row:400,grid:await displayCell(800,400)}),false);
  assert.equal(globalTerrainOverviewInfo(p)?.pending,'served missing source');
  assert.equal((await p.requestTileGeometry(xy.x,xy.y,10)!).interpolateHeight(rect,target.longitude,target.latitude),before);
});

 test('Task162 metadata512 exhaustion closes optional admission and unknown far meshes settle',async()=>{
  const p=createGlobalTerrainProvider(updateWorld,updateFine,[cell(6029,4388)],[],{stream:true,
    outcomes:Array.from({length:512},(_,col)=>({col,row:400,missing:true}))});
  assert.equal(acceptGlobalTerrainOverviewSource(p,{col:800,row:400,grid:null}),false);
  assert.equal(globalTerrainOverviewInfo(p)?.closed,'outcome capacity');
  assert(Number.isFinite(await height(p,10.125,20.125,13)));
  assert.equal(globalTerrainOverviewInfo(p)?.history,0);
});
