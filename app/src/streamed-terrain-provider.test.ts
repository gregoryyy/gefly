import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cartographic, type HeightmapTerrainData } from 'cesium';
import type { TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { REGIONAL_TERRAIN, sampleAtlas, sampleAtlasGradient, type RegionalTile } from '../../studies/e1-browser/sim/terrain-stream.js';
import { createStreamedTerrainProvider } from './streamed-terrain-provider.ts';
import { WorldTerrainStream } from '../../studies/e1-browser/sim/terrain-stream.js';
const rad = Math.PI / 180;
function tile(x: number, y: number): RegionalTile {
  const col = x + 9, { west: WEST, south: SOUTH, cols, step } = REGIONAL_TERRAIN;
  const width = 129, west = WEST + col * step, south = SOUTH + y * step;
  const physical_m = new Float64Array(width * width), geoid_m = new Float64Array(width * width);
  for (let r = 0; r < width; r++) for (let c = 0; c < width; c++) {
    physical_m[r * width + c] = 100 + 10 * (west + c / 512) + 4 * (south + r / 512)
      + (((x * 128 + c) % 13 === 12 && (y * 128 + r) % 11 === 5) ? 9 : 0);
    geoid_m[r * width + c] = 40;
  }
  return { version: 1, coverage: 'full', valid_nodes: 129 * 129, id: `e${WEST * 100 + col * 25}-n${SOUTH * 100 + y * 25}`, slot: y * cols + col,
    west_rad: west * rad, east_rad: (west + .25) * rad, south_rad: south * rad, north_rad: (south + .25) * rad,
    west_deg: west, east_deg: west + .25, south_deg: south, north_deg: south + .25,
    asset: 'fixture.f32', sha256: 'fixture', bytes: 129 * 129 * 8, width: 129, height: 129, physical_m, geoid_m };
}
const fine: TerrainGrid = { version: 1, id: 'fine', west_rad: 8.45 * rad, east_rad: 8.9 * rad,
  south_rad: 49.85 * rad, north_rad: 50.35 * rad, width: 2, height: 2,
  physical_m: new Float64Array(4).fill(500), geoid_m: new Float64Array(4).fill(40) };
const tiles = Array.from({ length: 9 }, (_, i) => tile(i % 3, Math.floor(i / 3) + 11));
async function render(provider: NonNullable<ReturnType<typeof createStreamedTerrainProvider>>, lon: number, lat: number, level: number) {
  const point = new Cartographic(lon * rad, lat * rad);
  const xy = provider.tilingScheme.positionToTileXY(point, level)!;
  const data = await provider.requestTileGeometry(xy.x, xy.y, level) as HeightmapTerrainData;
  return data.interpolateHeight(provider.tilingScheme.tileXYToRectangle(xy.x, xy.y, level), point.longitude, point.latitude)!;
}
test('coarse focus renders atlas H plus geoid and rejects unloaded coverage', async () => {
  const provider = createStreamedTerrainProvider(fine, tiles, { lat_rad: 50.04 * rad, lon_rad: 8.98 * rad })!;
  assert(provider);
  const point = { lat: 50.04, lon: 8.98 }, atlas = new Map(tiles.map(t => [t.id, t]));
  assert(Math.abs(await render(provider, point.lon, point.lat, 4) - sampleAtlas(fine, atlas, point.lat * rad, point.lon * rad)!.ellipsoid_m) < 1e-8);
  // A non-planar source cell must keep the same triangle surface after display subdivision.
  const nonplanar = { lon: 8.75 + 3.75 / 512, lat: 50 + 6.25 / 512 };
  const expected = sampleAtlas(fine, atlas, nonplanar.lat * rad, nonplanar.lon * rad)!.ellipsoid_m;
  assert(Math.abs(await render(provider, nonplanar.lon, nonplanar.lat, 4) - expected) < 1e-8);
  assert.equal(provider.getTileDataAvailable(0, 0, 4), true);
  assert.equal(provider.getTileDataAvailable(0, 0, 5), false);
  assert.equal(provider.requestTileGeometry(-1, 0, 0), undefined);
  assert(provider.getLevelMaximumGeometricError(0) > 1e-6);
  assert.equal(provider.getLevelMaximumGeometricError(4), 1e-6);
  assert.equal(createStreamedTerrainProvider(fine, tiles, { lat_rad: 49.4 * rad, lon_rad: 9.8 * rad }), null);
});
test('fine focus resolves the shared feather and has bounded finite LOD', async () => {
  const provider = createStreamedTerrainProvider(fine, tiles, { lat_rad: 49.96 * rad, lon_rad: 8.46 * rad })!;
  const atlas = new Map(tiles.map(t => [t.id, t]));
  for (const [lon, lat] of [[8.4551,49.961], [8.47,49.96], [8.45,49.96]]) {
    const expected = sampleAtlas(fine, atlas, lat * rad, lon * rad)!.ellipsoid_m;
    assert(Math.abs(await render(provider, lon, lat, 5) - expected) < .01);
  }
  // Compare an independent finite difference of the rendered mesh against the
  // shared physical slope in the feather. The fixture has a constant geoid.
  const lat = 49.96, lon = 8.4551, step = .00002;
  const sample = sampleAtlas(fine, atlas, lat * rad, lon * rad)!;
  const slope = sampleAtlasGradient(fine, atlas, lat * rad, lon * rad)!;
  const f = 1 / 298.257223563, e2 = f * (2 - f);
  const n = 6378137 / Math.sqrt(1 - e2 * Math.sin(lat * rad) ** 2);
  const rendered = ((await render(provider, lon + step, lat, 5)) - (await render(provider, lon - step, lat, 5)))
    / (2 * step * rad * (n + sample.physical_m) * Math.cos(lat * rad));
  assert(Math.abs(rendered - slope.east_slope) < .001);
  assert(provider.getLevelMaximumGeometricError(0) > 0);
  assert.equal(provider.getLevelMaximumGeometricError(5), 1e-6);
  assert.equal(provider.getTileDataAvailable(0, 0, 6), false);
});
test('holey cache yields only a fully resident rectangle around the focus', async () => {
  const partial = tiles.filter(t => !['e825-n5000','e875-n5000','e825-n4975','e875-n4975'].includes(t.id));
  const provider = createStreamedTerrainProvider(fine, partial, { lat_rad: 49.9 * rad, lon_rad: 8.6 * rad })!;
  assert(provider);
  const nx = provider.tilingScheme.getNumberOfXTilesAtLevel(0), ny = provider.tilingScheme.getNumberOfYTilesAtLevel(0);
  assert(nx * ny < 9);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) assert(await provider.requestTileGeometry(x, y, 0));
});


test('expanded west and north terrain render only validated resident tiles', async () => {
  for (const [x, y, lon, lat] of [[-9, 0, 6.1, 47.1], [22, 18, 13.9, 51.6], [-7, 9, 6.6, 49.4]]) {
    const grid = tile(x, y), atlas = new Map([[grid.id, grid]]);
    const provider = createStreamedTerrainProvider(fine, [grid], { lat_rad: lat * rad, lon_rad: lon * rad });
    assert(provider);
    assert(Math.abs(await render(provider, lon, lat, 4) - sampleAtlas(fine, atlas, lat * rad, lon * rad)!.ellipsoid_m) < 1e-8);
    assert.equal(createStreamedTerrainProvider(fine, [{ ...grid, id: 'wrong' }], { lat_rad: lat * rad, lon_rad: lon * rad }), null);
  }
});


test('partial border tiles keep supported terrain and expose real holes through Cesium geometry', async () => {
  const base = tile(13, 4), physical_m = base.physical_m.slice(), geoid_m = base.geoid_m.slice();
  let valid_nodes = physical_m.length;
  for (let row = 64; row < 129; row++) for (let column = 64; column < 129; column++) {
    physical_m[row * 129 + column] = geoid_m[row * 129 + column] = NaN; valid_nodes--;
  }
  const grid: RegionalTile = { ...base, physical_m, geoid_m, masked: true, coverage: 'partial', valid_nodes };
  const atlas = new Map([[grid.id, grid]]), point = { lon: 11.55, lat: 48.05 };
  const provider = createStreamedTerrainProvider(fine, [grid], { lat_rad: point.lat * rad, lon_rad: point.lon * rad })!;
  assert(provider);
  const data = await provider.requestTileGeometry(0, 0, 0);
  assert(data); const rectangle = provider.tilingScheme.tileXYToRectangle(0, 0, 0);
  const expected = sampleAtlas(fine, atlas, point.lat * rad, point.lon * rad)!.ellipsoid_m;
  assert(Math.abs(data.interpolateHeight(rectangle, point.lon * rad, point.lat * rad)! - expected) < .25);
  assert.equal(sampleAtlas(fine, atlas, 48.2 * rad, 11.7 * rad), null);
  assert.equal(data.interpolateHeight(rectangle, 11.7 * rad, 48.2 * rad), undefined, 'missing source does not become a flat visual surface');
});

const world: TerrainGrid = { version: 1, id: 'world-fixture', width: 361, height: 181,
  west_rad: -Math.PI, east_rad: Math.PI, south_rad: -Math.PI / 2, north_rad: Math.PI / 2,
  physical_m: Float64Array.from({ length: 361 * 181 }, (_, i) => 100 + Math.floor(i / 361)),
  geoid_m: new Float64Array(361 * 181).fill(30) };
test('global provider uses installed physical/geoid cells outside regional coverage', async () => {
  const stream = new WorldTerrainStream(world, null, () => {}, () => {});
  await stream.move(35.6 * rad, 139.7 * rad);
  const provider = createStreamedTerrainProvider(fine, [...stream.tiles.values()], { lat_rad: 35.6 * rad, lon_rad: 139.7 * rad });
  assert(provider);
  for (const [lon, lat] of [[139.7,35.6],[139.69,35.61],[139.71,35.59]]) {
    const expected = sampleAtlas(fine, stream.tiles, lat * rad, lon * rad)!.ellipsoid_m;
    assert(Math.abs(await render(provider, lon, lat, 4) - expected) < 1e-8);
  }
  const invalid = [...stream.tiles.values()].map(g => ({ ...g, slot: 9 }));
  assert.equal(createStreamedTerrainProvider(fine, invalid, { lat_rad: 35.6 * rad, lon_rad: 139.7 * rad }), null);
  assert.equal(createStreamedTerrainProvider(fine, [...stream.tiles.values()], { lat_rad: 89.5 * rad, lon_rad: 139.7 * rad }), null);
});
test('bounded world provider renders both dateline sides using the same atlas heights', async () => {
  for (const focusLon of [179.99, -179.99]) {
    const stream = new WorldTerrainStream(world, null, () => {}, () => {});
    await stream.move(10.1 * rad, focusLon * rad);
    const provider = createStreamedTerrainProvider(fine, [...stream.tiles.values()], { lat_rad: 10.1 * rad, lon_rad: focusLon * rad });
    assert(provider);
    assert(provider.tilingScheme.rectangle.east < provider.tilingScheme.rectangle.west);
    for (const [lon, lat] of [[179.99,10.1],[-179.99,10.1],[179.98,10.11],[-179.98,10.09]]) {
      const expected = sampleAtlas(fine, stream.tiles, lat * rad, lon * rad)!.ellipsoid_m;
      assert(Math.abs(await render(provider, lon, lat, 4) - expected) < 1e-8);
    }
    assert.equal(provider.tilingScheme.positionToTileXY(new Cartographic(0, 10.1 * rad), 0), undefined);
  }
});
