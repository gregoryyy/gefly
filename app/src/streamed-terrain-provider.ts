import { Credit, CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, Rectangle, type TerrainProvider } from 'cesium';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { REGIONAL_TERRAIN, sampleAtlas, type RegionalTile } from '../../studies/e1-browser/sim/terrain-stream.js';

const RAD = Math.PI / 180;
const { west: WEST, south: SOUTH, cols: COLS, rows: ROWS, step: STEP } = REGIONAL_TERRAIN;
const WIDTH = 129, CELLS = WIDTH - 1;
const rad = (degrees: number) => degrees * RAD;

/** One provider snapshots a fully resident rectangle around the focus. Regional
 * data are streamed separately; rebuilding a provider does not change physics.
 * Heights are the shared derived atlas H + ζ, not survey-accurate observations.
 */
export function createStreamedTerrainProvider(fine: TerrainGrid, tiles: readonly TerrainGrid[],
  focus: { lat_rad: number; lon_rad: number }): TerrainProvider | null {
  if (!validateTerrainGrid(fine) || !Number.isFinite(focus.lat_rad) || !Number.isFinite(focus.lon_rad)) return null;
  const col = Math.floor((focus.lon_rad / RAD - WEST) / STEP), row = Math.floor((focus.lat_rad / RAD - SOUTH) / STEP);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  const indexed = new Map<string, RegionalTile>();
  for (const grid of tiles) {
    if (!validateTerrainGrid(grid) || grid.width !== WIDTH || grid.height !== WIDTH) continue;
    const x = Math.round((grid.west_rad / RAD - WEST) / STEP), y = Math.round((grid.south_rad / RAD - SOUTH) / STEP);
    const id = `e${WEST * 100 + x * STEP * 100}-n${SOUTH * 100 + y * STEP * 100}`;
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS || grid.id !== id
      || Math.abs(grid.west_rad - rad(WEST + x * STEP)) > 1e-12
      || Math.abs(grid.east_rad - rad(WEST + (x + 1) * STEP)) > 1e-12
      || Math.abs(grid.south_rad - rad(SOUTH + y * STEP)) > 1e-12
      || Math.abs(grid.north_rad - rad(SOUTH + (y + 1) * STEP)) > 1e-12) continue;
    // The slot is derived from validated bounds, not caller-provided metadata.
    indexed.set(`${x},${y}`, { ...grid, slot: y * COLS + x } as RegionalTile);
  }
  if (!indexed.has(`${col},${row}`)) return null;
  // Select the largest hole-free rectangle within the surrounding 3×3 tiles.
  let best = { west: col, east: col, south: row, north: row, area: 1 };
  for (let west = Math.max(0, col - 1); west <= col; west++) for (let east = col; east <= Math.min(COLS - 1, col + 1); east++)
    for (let south = Math.max(0, row - 1); south <= row; south++) for (let north = row; north <= Math.min(ROWS - 1, row + 1); north++) {
      const area = (east - west + 1) * (north - south + 1);
      if (area <= best.area) continue;
      let complete = true;
      for (let y = south; y <= north; y++) for (let x = west; x <= east; x++) if (!indexed.has(`${x},${y}`)) complete = false;
      if (complete) best = { west, east, south, north, area };
    }
  const selected = new Map<string, RegionalTile>();
  for (let y = best.south; y <= best.north; y++) for (let x = best.west; x <= best.east; x++) {
    const tile = indexed.get(`${x},${y}`)!; selected.set(tile.id, tile);
  }
  const nx = best.east - best.west + 1, ny = best.north - best.south + 1;
  const rectangle = new Rectangle(rad(WEST + best.west * STEP), rad(SOUTH + best.south * STEP),
    rad(WEST + (best.east + 1) * STEP), rad(SOUTH + (best.north + 1) * STEP));
  const tilingScheme = new GeographicTilingScheme({ rectangle, ellipsoid: Ellipsoid.WGS84,
    numberOfLevelZeroTilesX: nx, numberOfLevelZeroTilesY: ny });
  const insideFine = focus.lon_rad >= fine.west_rad && focus.lon_rad <= fine.east_rad
    && focus.lat_rad >= fine.south_rad && focus.lat_rad <= fine.north_rad;
  // Subdivision reduces imagery requests; it interpolates the same 200 m
  // source surface and does not add terrain measurements or fidelity.
  const finest = insideFine ? 5 : 4;
  const available = (x: number, y: number, level: number) => Number.isInteger(level) && level >= 0 && level <= finest
    && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < nx * 2 ** level && y < ny * 2 ** level;
  const provider = new CustomHeightmapTerrainProvider({ width: WIDTH, height: WIDTH, tilingScheme,
    credit: new Credit('Terrain: © GeoBasis-DE / <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026), DGM200, <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a>; GCG2016 © <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026), <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>; Hessen DGM, <a href="https://www.govdata.de/dl-de/zero-2-0" target="_blank" rel="noopener noreferrer">dl-de/zero-2-0</a> · <a href="/terrain/BKG-SOURCES.pdf" target="_blank" rel="noopener noreferrer">Sources</a> · resampled and blended', true),
    callback(x, y, level) {
      if (!available(x, y, level)) return undefined;
      const heights = new Float64Array(WIDTH * WIDTH), tileRect = tilingScheme.tileXYToRectangle(x, y, level);
      for (let r = 0; r < WIDTH; r++) {
        const lat = r === 0 ? tileRect.north : r === CELLS ? tileRect.south : tileRect.north - r / CELLS * tileRect.height;
        for (let c = 0; c < WIDTH; c++) {
          const lon = c === 0 ? tileRect.west : c === CELLS ? tileRect.east : tileRect.west + c / CELLS * tileRect.width;
          const sample = sampleAtlas(fine, selected, lat, lon);
          if (!sample || !Number.isFinite(sample.ellipsoid_m)) throw new Error('Streamed terrain elevation unavailable');
          heights[r * WIDTH + c] = sample.ellipsoid_m;
        }
      }
      return heights;
    },
  });
  const levelZeroError = Ellipsoid.WGS84.maximumRadius * rad(STEP) / CELLS * .25;
  provider.getLevelMaximumGeometricError = level => {
    if (!Number.isInteger(level) || level < 0) throw new RangeError('Invalid terrain level');
    return level >= finest ? 1e-6 : levelZeroError / 2 ** level;
  };
  provider.getTileDataAvailable = available;
  return provider;
}
