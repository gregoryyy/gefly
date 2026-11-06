import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerrainDisplayInfo, sameTerrainTiles } from './terrain-display-info.ts';
import { WORLD_TERRAIN, worldCellAt, worldTileId, type WorldTerrainTile } from '../../studies/e1-browser/sim/world-terrain.js';
function fixture(): WorldTerrainTile {
  const rad = Math.PI / 180, [col, row] = worldCellAt(40.71 * rad, -74.01 * rad)!;
  const west = -180 + col * WORLD_TERRAIN.step, south = -90 + row * WORLD_TERRAIN.step;
  return { version: 1, id: worldTileId(col, row), slot: 0, width: 129, height: 129,
    source: 'global', source_detail: 'copernicus', copernicus_nodes: 16641, coarse_nodes: 0,
    sha256: 'a'.repeat(64), west_rad: west * rad, east_rad: (west + WORLD_TERRAIN.step) * rad,
    south_rad: south * rad, north_rad: (south + WORLD_TERRAIN.step) * rad,
    physical_m: new Float64Array(16641).fill(100), geoid_m: new Float64Array(16641).fill(30) };
}
test('R-WORLD-11 frame status reads validated metadata without rereading terrain buffers', () => {
  const grid = fixture(), physical = grid.physical_m;
  let reads = 0;
  Object.defineProperty(grid, 'physical_m', { get() { reads++; return physical; } });
  const info = createTerrainDisplayInfo([grid]);
  assert(info.hasWorldTerrain);
  assert(reads > 0, 'installation still performs full validation');
  const before = reads;
  for (let frame = 0; frame < 1000; frame++) assert.deepEqual(info.at(grid),
    { detail: 'copernicus', copernicusNodes: 16641, coarseNodes: 0 });
  assert.equal(reads, before, 'frame lookups must not scan height arrays');
  assert(Object.isFrozen(info.at(grid)));
  assert.equal(info.at(undefined), undefined);
  assert.equal(info.at({ ...fixture(), id: 'regional-starter' }), undefined);
});
test('R-WORLD-11 a new terrain revision revalidates reused identities and rejects malformed source data', () => {
  const grid = fixture(), installed = createTerrainDisplayInfo([grid]);
  assert(installed.hasWorldTerrain);
  grid.physical_m[0] = Infinity;
  const next = createTerrainDisplayInfo([grid]);
  assert.equal(next.hasWorldTerrain, false);
  assert.equal(next.at(grid), undefined);
  const malformed = fixture(); malformed.copernicus_nodes = -1;
  assert.equal(createTerrainDisplayInfo([malformed]).hasWorldTerrain, false);
  assert.equal(createTerrainDisplayInfo([]).hasWorldTerrain, false);
});

test('R-WORLD-11 duplicate and reordered terrain notifications retain installed geometry', () => {
  const a = fixture(), b = { ...fixture(), id: 'other-installed-grid' };
  const installed = new Map([[a.id, a], [b.id, b]]);
  assert(sameTerrainTiles(installed, new Map([[b.id, b], [a.id, a]])));
  assert(!sameTerrainTiles(installed, new Map([[a.id, { ...a }], [b.id, b]])),
    'a replacement under an existing ID must rebuild the changed terrain');
  assert(!sameTerrainTiles(installed, new Map([[a.id, a]])), 'removals change coverage');
  assert(!sameTerrainTiles(new Map([[a.id, a]]), installed), 'new source tiles change coverage');
});
