import test from 'node:test';
import assert from 'node:assert/strict';
import { Cartographic, type HeightmapTerrainData } from 'cesium';
import { createGlobalTerrainProvider } from './global-terrain-provider.ts';
import { sampleAtlas } from '../../studies/e1-browser/sim/terrain-stream.js';
import { sampleWorldTerrain, worldCellAt, worldTileId, WORLD_TERRAIN, type WorldTerrainTile } from '../../studies/e1-browser/sim/world-terrain.js';
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
    source: 'global',
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
  assert.equal(provider.getTileDataAvailable(0,0,10), false);
});
test('R-WORLD-11 coarse-cell-aligned level seven preserves fine native triangle heights and geoid', async () => {
  for (const [lat, lon] of [[40.71,-74.01],[-33.9,18.4],[-16.5,179.99],[-16.5,-179.99]]) {
    const grid = tile(lat, lon), provider = createGlobalTerrainProvider(world, fine, [grid]);
    const expected = sampleAtlas(fine, new Map([[grid.id, grid]]), lat * RAD, lon * RAD)!.ellipsoid_m;
    const actual = await height(provider, lat, lon, 7);
    assert(Math.abs(actual - expected) < 1e-7, JSON.stringify({lat,lon,actual,expected,difference:actual-expected}));
  }
});
test('R-WORLD-11 detailed starter area retains independent sampling and bounded higher LOD', async () => {
  const provider = createGlobalTerrainProvider(world, fine, []);
  assert(Math.abs(await height(provider,50,8.6,9) - 540) < 1e-8);
  const far = provider.tilingScheme.positionToTileXY(new Cartographic(0,0),8)!;
  assert.equal(provider.getTileDataAvailable(far.x,far.y,8),false);
  assert.match(provider.credit!.html,/NOAA ETOPO/);
});
