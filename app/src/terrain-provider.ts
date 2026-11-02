import { Credit, CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, Rectangle, type TerrainProvider } from 'cesium';
import { sampleTerrain, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';

export const TERRAIN_TILE_WIDTH = 65;
const TILE_CELLS = TERRAIN_TILE_WIDTH - 1;

/** The renderer samples the same physical-height/quasigeoid package as dynamics.
 * Cesium receives H + ζ ellipsoidal heights, never physical H as ellipsoid h.
 * The finest tiles align with the package nodes and its SW→NE triangles.
 */
export function createPublicTerrainProvider(grid: TerrainGrid): TerrainProvider {
  const finestLevel = Math.log2((grid.width - 1) / TILE_CELLS);
  if (grid.version !== 1 || grid.width !== grid.height || !Number.isInteger(finestLevel) || finestLevel < 0 || finestLevel > 4
    || ![grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad].every(Number.isFinite)
    || grid.west_rad >= grid.east_rad || grid.south_rad >= grid.north_rad) throw new RangeError('Unsupported bounded terrain grid');
  const rectangle = new Rectangle(grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad);
  const tilingScheme = new GeographicTilingScheme({ rectangle, ellipsoid: Ellipsoid.WGS84,
    numberOfLevelZeroTilesX: 1, numberOfLevelZeroTilesY: 1 });
  const available = (x: number, y: number, level: number) => Number.isInteger(level) && level >= 0 && level <= finestLevel
    && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < 2 ** level && y < 2 ** level;
  const provider = new CustomHeightmapTerrainProvider({
    width: TERRAIN_TILE_WIDTH, height: TERRAIN_TILE_WIDTH, tilingScheme,
    credit: new Credit('Terrain: HVBG DGM · © <a href="https://www.bkg.bund.de/" target="_blank" rel="noopener noreferrer">BKG</a> 2026 · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · <a href="/terrain/BKG-SOURCES.pdf" target="_blank" rel="noopener noreferrer">Sources</a> · resampled', true),
    callback(x, y, level) {
      if (!available(x, y, level)) return undefined;
      const heights = new Float64Array(TERRAIN_TILE_WIDTH * TERRAIN_TILE_WIDTH);
      const divisions = TILE_CELLS * 2 ** level;
      for (let row = 0; row < TERRAIN_TILE_WIDTH; row++) {
        const northFraction = (y * TILE_CELLS + row) / divisions;
        const latitude = northFraction === 0 ? grid.north_rad : northFraction === 1 ? grid.south_rad
          : grid.north_rad - northFraction * (grid.north_rad - grid.south_rad);
        for (let column = 0; column < TERRAIN_TILE_WIDTH; column++) {
          const eastFraction = (x * TILE_CELLS + column) / divisions;
          const longitude = eastFraction === 0 ? grid.west_rad : eastFraction === 1 ? grid.east_rad
            : grid.west_rad + eastFraction * (grid.east_rad - grid.west_rad);
          const sample = sampleTerrain(grid, latitude, longitude);
          if (!sample || !Number.isFinite(sample.ellipsoid_m)) throw new Error('Terrain tile contains unavailable elevation');
          // Cesium heightmaps are north→south; the shared package is south→north.
          heights[row * TERRAIN_TILE_WIDTH + column] = sample.ellipsoid_m;
        }
      }
      return heights;
    },
  });
  // Cesium's default estimate assumes global coverage even for a regional
  // tiling rectangle. Scale the display-only LOD budget to this actual region.
  const levelZeroError = Ellipsoid.WGS84.maximumRadius * Math.max(rectangle.width, rectangle.height) / TILE_CELLS * .25;
  provider.getLevelMaximumGeometricError = level => {
    // The finest mesh is the declared grid surface; no extra resampled detail
    // is advertised beyond it. This is a rendering budget, not DEM accuracy.
    if (!Number.isInteger(level) || level < 0) throw new RangeError('Invalid terrain level');
    return level >= finestLevel ? 0 : levelZeroError / 2 ** level;
  };
  provider.getTileDataAvailable = available;
  return provider;
}
