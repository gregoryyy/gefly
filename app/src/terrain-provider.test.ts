import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HeightmapTerrainData } from 'cesium';
import { sampleTerrain, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { createPublicTerrainProvider } from './terrain-provider.ts';

function fixture(): TerrainGrid {
  const width = 129, physical_m = new Float64Array(width * width), geoid_m = new Float64Array(width * width);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    physical_m[y * width + x] = 100 + .5 * y + .25 * x + ((x & 1) && (y & 1) ? 4 : 0);
    geoid_m[y * width + x] = 40 + .01 * x - .02 * y;
  }
  return { version: 1, id: 'synthetic-height-and-quasigeoid', width, height: width,
    west_rad: .1, south_rad: .7, east_rad: .11, north_rad: .71, physical_m, geoid_m };
}
const coordinates = (grid: TerrainGrid, x: number, y: number) => ({
  longitude: grid.west_rad + x / (grid.width - 1) * (grid.east_rad - grid.west_rad),
  latitude: grid.south_rad + y / (grid.height - 1) * (grid.north_rad - grid.south_rad),
});

test('terrain tiles flip shared south→north rows and render physical height plus quasigeoid', async () => {
  const grid = fixture(), provider = createPublicTerrainProvider(grid);
  const tile = await provider.requestTileGeometry(0, 0, 1) as HeightmapTerrainData;
  const rectangle = provider.tilingScheme.tileXYToRectangle(0, 0, 1);
  for (const [x, y] of [[0, 128], [64, 64], [22, 99]]) {
    const point = coordinates(grid, x, y), index = y * grid.width + x;
    const actual = tile.interpolateHeight(rectangle, point.longitude, point.latitude)!;
    assert(Math.abs(actual - grid.physical_m[index] - grid.geoid_m[index]) < 1e-8);
    assert(Math.abs(actual - grid.physical_m[index]) > 30, 'physical H is never substituted for ellipsoid h');
  }
});

test('finest Cesium triangles match the shared SW→NE surface at an independent non-bilinear fixture', async () => {
  const grid = fixture(), provider = createPublicTerrainProvider(grid);
  const tile = await provider.requestTileGeometry(0, 0, 1) as HeightmapTerrainData;
  const point = coordinates(grid, 2.75, 124.25), rectangle = provider.tilingScheme.tileXYToRectangle(0, 0, 1);
  // Affine H + ζ contributes 200.355 m; the one elevated NE corner contributes
  // min(.75,.25)*4 = 1 m on SW→NE triangles, versus .75 m bilinearly.
  const expected = 201.355;
  assert(Math.abs(tile.interpolateHeight(rectangle, point.longitude, point.latitude)! - expected) < 1e-8);
  assert(Math.abs(sampleTerrain(grid, point.latitude, point.longitude)!.ellipsoid_m - expected) < 1e-8);
});

test('adjacent tiles agree at shared edges and LOD/coverage are bounded to real package detail', async () => {
  const grid = fixture(), provider = createPublicTerrainProvider(grid);
  const left = await provider.requestTileGeometry(0, 0, 1) as HeightmapTerrainData;
  const right = await provider.requestTileGeometry(1, 0, 1) as HeightmapTerrainData;
  for (const y of [64, 83, 111, 128]) {
    const point = coordinates(grid, 64, y);
    assert(Math.abs(left.interpolateHeight(provider.tilingScheme.tileXYToRectangle(0, 0, 1), point.longitude, point.latitude)!
      - right.interpolateHeight(provider.tilingScheme.tileXYToRectangle(1, 0, 1), point.longitude, point.latitude)!) < 1e-8);
  }
  assert.equal(provider.getTileDataAvailable(1, 1, 1), true);
  for (const [x, y, level] of [[2, 0, 1], [-1, 0, 0], [0, 0, 2], [0, 0, .5]]) {
    assert.equal(provider.getTileDataAvailable(x, y, level), false);
    assert.equal(provider.requestTileGeometry(x, y, level), undefined);
  }
  assert(provider.getLevelMaximumGeometricError(0) > 0);
  assert(provider.getLevelMaximumGeometricError(0) < 1000, 'regional LOD does not inherit a global circumference estimate');
  assert.equal(provider.getLevelMaximumGeometricError(1), 1e-6);
});

test('unsupported grid shapes and missing heights cannot silently become zero terrain', async () => {
  const grid = fixture();
  assert.throws(() => createPublicTerrainProvider({ ...grid, width: 128 }), /Unsupported/);
  grid.physical_m[128 * grid.width] = NaN;
  const provider = createPublicTerrainProvider(grid);
  await assert.rejects(async () => provider.requestTileGeometry(0, 0, 0), /unavailable/i);
});
