import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadTerrainPackage, sampleTerrain, sampleTerrainGradient, terrainContainsInterior, validateTerrainGrid } from './terrain.js';

const grid = () => ({ version: 1, id: 'test-grid', width: 2, height: 2,
  west_rad: 0, south_rad: 0, east_rad: .001, north_rad: .001,
  physical_m: new Float64Array([0, 10, 20, 80]), geoid_m: new Float64Array([47, 48, 49, 52]) });
const close = (actual, expected, tolerance = 1e-9) => assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('shared terrain uses point-registered SW→NE triangles, not bilinear heights or flipped rows', () => {
  const g = grid(); assert(validateTerrainGrid(g));
  assert.deepEqual(sampleTerrain(g, 0, 0), { physical_m: 0, geoid_m: 47, ellipsoid_m: 47 });
  assert.deepEqual(sampleTerrain(g, .001, .001), { physical_m: 80, geoid_m: 52, ellipsoid_m: 132 });
  const lower = sampleTerrain(g, .00025, .00075), upper = sampleTerrain(g, .00075, .00025);
  close(lower.physical_m, 25); close(lower.geoid_m, 48.75); close(lower.ellipsoid_m, 73.75);
  close(upper.physical_m, 30); close(upper.geoid_m, 49.25);
  assert.equal(sampleTerrain(g, -.00001, 0), null); assert.equal(sampleTerrain(g, 0, .00101), null);
  assert.equal(sampleTerrain(g, NaN, 0), null);
});

test('physical slopes follow the selected triangle and edge coverage reserves a complete contact cell', () => {
  const g = grid(), lower = sampleTerrainGradient(g, .00025, .00075), upper = sampleTerrainGradient(g, .00075, .00025);
  assert(lower.east_slope > 0 && upper.east_slope > lower.east_slope);
  assert(lower.north_slope > upper.north_slope && upper.north_slope > 0);
  assert.equal(sampleTerrainGradient(g, .002, 0), null);
  const large = { ...g, width: 5, height: 5, physical_m: new Float64Array(25), geoid_m: new Float64Array(25).fill(48) };
  assert(terrainContainsInterior(large, .0005, .0005));
  assert(!terrainContainsInterior(large, .0001, .0005));
  const invalid = grid(); invalid.physical_m[0] = NaN; assert(!validateTerrainGrid(invalid));
});

test('explicit masked regional nodes preserve gaps without weakening ordinary terrain validation', () => {
  const masked = { ...grid(), masked: true };
  masked.physical_m[2] = masked.geoid_m[2] = NaN;
  assert(validateTerrainGrid(masked));
  assert(sampleTerrain(masked, .00025, .00075), 'the fully supported lower triangle remains usable');
  assert.equal(sampleTerrain(masked, .00075, .00025), null);
  assert.equal(sampleTerrainGradient(masked, .00075, .00025), null);
  assert(!validateTerrainGrid({ ...masked, masked: undefined }), 'fine/default grids still require finite nodes');
  assert(!validateTerrainGrid({ ...masked, geoid_m: grid().geoid_m }), 'one-sided missing data is invalid');
  const infinite = { ...masked, physical_m: masked.physical_m.slice() }; infinite.physical_m[0] = Infinity;
  assert(!validateTerrainGrid(infinite));
  assert(!validateTerrainGrid({ ...masked, physical_m: new Float64Array(4).fill(NaN), geoid_m: new Float64Array(4).fill(NaN) }));
  const outOfRange = { ...masked, physical_m: masked.physical_m.slice() }; outOfRange.physical_m[0] = -9999;
  assert(!validateTerrainGrid(outOfRange));
});

function packageFixture(change = {}) {
  const binary = new Uint8Array(32), view = new DataView(binary.buffer);
  for (let i = 0; i < 4; i++) { view.setFloat32(i * 8, 100 + i, true); view.setFloat32(i * 8 + 4, 48, true); }
  const metadata = { ...grid(), physical_m: undefined, geoid_m: undefined, physical_datum: 'DHHN2016',
    geoid_model: 'GCG2016v2023_W', rows: 'south-to-north', encoding: 'float32-le-interleaved-H-zeta',
    asset: 'test-grid.f32', sha256: createHash('sha256').update(binary).digest('hex'), ...change };
  const fetcher = async url => url.endsWith('.json') ? new Response(JSON.stringify(metadata)) : new Response(binary);
  return { metadata, binary, fetcher };
}

test('package loading verifies bytes and vertical datum, rejecting corruption and foreign asset paths', async () => {
  const fixture = packageFixture(); const loaded = await loadTerrainPackage(fixture.fetcher);
  assert.equal(loaded.physical_m[0], 100); assert.equal(loaded.physical_m[3], 103); assert.equal(loaded.geoid_m[0], 48);
  for (const change of [{ sha256: '0'.repeat(64) }, { physical_datum: 'unknown' }, { asset: '../foreign.f32' }, { width: 1026, height: 1026 }]) {
    await assert.rejects(loadTerrainPackage(packageFixture(change).fetcher));
  }
  const corrupted = packageFixture(); corrupted.binary[3] ^= 255;
  await assert.rejects(loadTerrainPackage(corrupted.fetcher), /integrity/);
});

test('bundled public terrain agrees with independently derived EDFE and Taunus fixtures', async () => {
  const fetcher = async url => new Response(await readFile(new URL('../../../app/public' + url, import.meta.url)));
  const loaded = await loadTerrainPackage(fetcher);
  assert.equal(loaded.sha256, '7123539a37bda7d7770d0f5e9662e5e48a350273bc68836ee34f1bf4b50ed7a9');
  for (const [latitude, longitude, physical, geoid] of [
    [49.96, 8.643, 115.250625678, 47.801849314], [50.232, 8.457, 875.161042155, 48.339385474],
  ]) {
    const value = sampleTerrain(loaded, latitude * Math.PI / 180, longitude * Math.PI / 180);
    close(value.physical_m, physical, 1e-6); close(value.geoid_m, geoid, 1e-6);
    close(value.ellipsoid_m, physical + geoid, 1e-6);
  }
});
