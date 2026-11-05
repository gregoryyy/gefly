import { CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, HeightmapTerrainData, Rectangle, type TerrainProvider } from 'cesium';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { sampleAtlas, type AtlasTile } from '../../studies/e1-browser/sim/terrain-stream.js';
import { sampleWorldTerrain, validWorldTerrainTile } from '../../studies/e1-browser/sim/world-terrain.js';
import { streamedTerrainCredit } from './streamed-terrain-provider.ts';

const SIZE = 129, CELLS = SIZE - 1;
/** Four-degree square roots keep the quarter-degree world cell lattice aligned at
 * level four. A global coarse horizon remains outside the resident native cells;
 * renderer LOD interpolation does not establish additional terrain measurements. */
export function createGlobalTerrainProvider(world: TerrainGrid, fine: TerrainGrid,
  tiles: readonly TerrainGrid[]): TerrainProvider {
  if (!validateTerrainGrid(world) || !validateTerrainGrid(fine)) throw new Error('Global terrain sources unavailable');
  const selected = new Map<string, AtlasTile>();
  for (const grid of tiles) if (validWorldTerrainTile(grid)) selected.set(grid.id, grid);
  const tilingScheme = new GeographicTilingScheme({ numberOfLevelZeroTilesX: 90, numberOfLevelZeroTilesY: 45 });
  const maximum = 9;
  const fineBounds = new Rectangle(fine.west_rad, fine.south_rad, fine.east_rad, fine.north_rad);
  const insideFine = (x: number, y: number, level: number) =>
    Rectangle.intersection(tilingScheme.tileXYToRectangle(x, y, level), fineBounds) !== undefined;
  const available = (x: number, y: number, level: number) => Number.isInteger(level) && level >= 0 && level <= maximum
    && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
    && x < 90 * 2 ** level && y < 45 * 2 ** level
    && (level <= 7 || insideFine(x, y, level));
  const latitudeEdges = [...new Set([fine.south_rad, fine.north_rad, ...[...selected.values()].flatMap(grid => [grid.south_rad, grid.north_rad])])];
  const longitudeEdges = [...new Set([fine.west_rad, fine.east_rad, ...[...selected.values()].flatMap(grid => [grid.west_rad, grid.east_rad])])];
  const sample = (latitude: number, longitude: number) => {
    // Cesium global tile arithmetic may put a shared vertex a few ULP outside
    // a resident source edge. Snap roundoff only; never extend loaded coverage.
    for (const edge of latitudeEdges) if (Math.abs(latitude - edge) < 1e-12) { latitude = edge; break; }
    for (const edge of longitudeEdges) if (Math.abs(longitude - edge) < 1e-12) { longitude = edge; break; }
    return sampleAtlas(fine, selected, latitude, longitude) ?? sampleWorldTerrain(world, latitude, longitude);
  };
  const heightsFor = (x: number, y: number, level: number) => {
      if (!available(x, y, level)) return undefined;
      const bounds = tilingScheme.tileXYToRectangle(x, y, level);
      const heights = new Float64Array(SIZE * SIZE);
      for (let row = 0; row < SIZE; row++) {
        const lat = row === 0 ? bounds.north : row === CELLS ? bounds.south : bounds.north - row / CELLS * bounds.height;
        for (let col = 0; col < SIZE; col++) {
          const lon = col === 0 ? bounds.west : col === CELLS ? bounds.east : bounds.west + col / CELLS * bounds.width;
          const value = sample(lat, lon);
          if (!value || !Number.isFinite(value.ellipsoid_m)) throw new Error('Global display terrain sample unavailable');
          heights[row * SIZE + col] = value.ellipsoid_m;
        }
      }
      return heights;
  };
  const provider = new CustomHeightmapTerrainProvider({ width: SIZE, height: SIZE, tilingScheme,
    credit: streamedTerrainCredit([...selected.values()], true), callback: heightsFor });
  const rootError = Ellipsoid.WGS84.maximumRadius * (4 * Math.PI / 180) / CELLS * .25;
  provider.getLevelMaximumGeometricError = level => {
    if (!Number.isInteger(level) || level < 0) throw new RangeError('Invalid global terrain level');
    return level >= maximum ? 1e-6 : rootError / 2 ** level;
  };
  provider.getTileDataAvailable = available;
  // Both the advertised coverage and child mask stop distant coarse rendering
  // at level seven; the detailed starter area may refine to its prior mesh scale.
  provider.requestTileGeometry = (x, y, level) => {
    const heights = heightsFor(x, y, level);
    if (!heights) return undefined;
    const finest = insideFine(x, y, level) ? maximum : 7;
    return Promise.resolve(new HeightmapTerrainData({ buffer: heights, width: SIZE, height: SIZE,
      childTileMask: level < finest ? 15 : 0 }));
  };
  return provider;
}
