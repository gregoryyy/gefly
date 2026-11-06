import { createMaskedTerrainMesh } from './masked-terrain-mesh.ts';
import { Cartesian2, Credit, CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, HeightmapTerrainData, Rectangle, type TerrainProvider } from 'cesium';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { REGIONAL_TERRAIN, sampleAtlas, type AtlasTile } from '../../studies/e1-browser/sim/terrain-stream.js';
import { LEGACY_WORLD_TERRAIN, validWorldTerrainTile, worldCellAt, worldTerrainProfile } from '../../studies/e1-browser/sim/world-terrain.js';

const RAD = Math.PI / 180;
const { west: WEST, south: SOUTH, cols: COLS, rows: ROWS, step: STEP } = REGIONAL_TERRAIN;
const WIDTH = 129, CELLS = WIDTH - 1;
const rad = (degrees: number) => degrees * RAD;
const wrapLongitude = (longitude: number) => longitude > Math.PI ? longitude - 2 * Math.PI : longitude < -Math.PI ? longitude + 2 * Math.PI : longitude;

/** One provider snapshots a fully resident rectangle around the focus. Regional
 * data are streamed separately; rebuilding a provider does not change physics.
 * Heights are the shared derived atlas H + ζ, not survey-accurate observations.
 */
export function createStreamedTerrainProvider(fine: TerrainGrid, tiles: readonly TerrainGrid[],
  focus: { lat_rad: number; lon_rad: number }): TerrainProvider | null {
  if (!validateTerrainGrid(fine) || !Number.isFinite(focus.lat_rad) || !Number.isFinite(focus.lon_rad)) return null;
  const worldTiles = tiles.filter(validWorldTerrainTile);
  const profile = worldTiles.length ? worldTerrainProfile(worldTiles[0])! : LEGACY_WORLD_TERRAIN;
  // Never reinterpret archived quarter-degree cells as the new fine lattice.
  if (worldTiles.some(grid => worldTerrainProfile(grid) !== profile)) return null;
  const worldStep = profile.step;
  const wrapColumn = (column: number) => (column + profile.cols) % profile.cols;
  const center = worldCellAt(focus.lat_rad, focus.lon_rad, profile);
  if (!center) return null;
  const [col, row] = center;
  const indexed = new Map<string, AtlasTile>();
  for (const grid of tiles) {
    if (!validateTerrainGrid(grid) || grid.width !== WIDTH || grid.height !== WIDTH) continue;
    if (validWorldTerrainTile(grid)) {
      const x = Math.round((grid.west_rad / RAD + 180) / worldStep), y = Math.round((grid.south_rad / RAD + 90) / worldStep);
      indexed.set(`${x},${y}`, grid);
    } else {
      // Read-only compatibility for recorded/legacy regional tile messages.
      if (profile !== LEGACY_WORLD_TERRAIN) continue;
      const x = Math.round((grid.west_rad / RAD - WEST) / STEP), y = Math.round((grid.south_rad / RAD - SOUTH) / STEP);
      const id = `e${WEST * 100 + x * STEP * 100}-n${SOUTH * 100 + y * STEP * 100}`;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS || grid.id !== id
        || Math.abs(grid.west_rad - rad(WEST + x * STEP)) > 1e-12
        || Math.abs(grid.east_rad - rad(WEST + (x + 1) * STEP)) > 1e-12
        || Math.abs(grid.south_rad - rad(SOUTH + y * STEP)) > 1e-12
        || Math.abs(grid.north_rad - rad(SOUTH + (y + 1) * STEP)) > 1e-12) continue;
      indexed.set(`${Math.round((WEST + 180) / STEP) + x},${Math.round((SOUTH + 90) / STEP) + y}`, { ...grid, slot: y * COLS + x });
    }
  }
  if (!indexed.has(`${col},${row}`)) return null;
  // Select the largest hole-free rectangle within the surrounding 3×3 tiles.
  let best = { west: col, east: col, south: row, north: row, area: 1 };
  for (let west = col - 1; west <= col; west++) for (let east = col; east <= col + 1; east++)
    for (let south = Math.max(profile.firstRow, row - 1); south <= row; south++) for (let north = row; north <= Math.min(profile.lastRow, row + 1); north++) {
      const area = (east - west + 1) * (north - south + 1);
      if (area <= best.area) continue;
      let complete = true;
      for (let y = south; y <= north; y++) for (let x = west; x <= east; x++) if (!indexed.has(`${wrapColumn(x)},${y}`)) complete = false;
      if (complete) best = { west, east, south, north, area };
    }
  const selected = new Map<string, AtlasTile>();
  for (let y = best.south; y <= best.north; y++) for (let x = best.west; x <= best.east; x++) {
    const tile = indexed.get(`${wrapColumn(x)},${y}`)!; selected.set(tile.id, tile);
  }
  const nx = best.east - best.west + 1, ny = best.north - best.south + 1;
  const southwest = indexed.get(`${wrapColumn(best.west)},${best.south}`)!;
  const northeast = indexed.get(`${wrapColumn(best.east)},${best.north}`)!;
  const westRadians = southwest.west_rad;
  const rectangle = new Rectangle(westRadians, southwest.south_rad, northeast.east_rad, northeast.north_rad);
  const sampleAt = (latitude: number, longitude: number) => {
    // Geographic tile arithmetic can put an outer vertex a few ULP beyond
    // the exact loaded bounds. Snap only roundoff-close source edges; never
    // extrapolate an unloaded triangle or replace a missing height.
    for (const grid of selected.values()) {
      for (const edge of [grid.south_rad, grid.north_rad]) if (Math.abs(latitude - edge) < 1e-12) latitude = edge;
      for (const edge of [grid.west_rad, grid.east_rad]) if (Math.abs(longitude - edge) < 1e-12) longitude = edge;
    }
    return sampleAtlas(fine, selected, latitude, longitude);
  };
  const tilingScheme = new GeographicTilingScheme({ rectangle, ellipsoid: Ellipsoid.WGS84,
    numberOfLevelZeroTilesX: nx, numberOfLevelZeroTilesY: ny });
  // Cesium's geographic helper assumes a nonwrapping regional rectangle in
  // parts of its coordinate conversion. Keep this small loaded window valid
  // on both sides of the antimeridian without inventing a global root mesh.
  if (rectangle.east < rectangle.west) {
    tilingScheme.positionToTileXY = (position, level, result = new Cartesian2()) => {
      // Cesium's runtime returns undefined outside the rectangle, although its
      // declaration omits that branch. Preserve the public runtime behavior.
      if (!Rectangle.contains(rectangle, position)) return undefined as unknown as Cartesian2;
      const longitude = position.longitude < westRadians ? position.longitude + 2 * Math.PI : position.longitude;
      const columns = nx * 2 ** level, rows = ny * 2 ** level;
      result.x = Math.min(columns - 1, Math.floor((longitude - westRadians) / rectangle.width * columns));
      result.y = Math.min(rows - 1, Math.floor((rectangle.north - position.latitude) / rectangle.height * rows));
      return result;
    };
    tilingScheme.tileXYToRectangle = (x, y, level, result = new Rectangle()) => {
      const columns = nx * 2 ** level, rows = ny * 2 ** level;
      result.west = wrapLongitude(westRadians + x / columns * rectangle.width);
      result.east = wrapLongitude(westRadians + (x + 1) / columns * rectangle.width);
      result.north = rectangle.north - y / rows * rectangle.height;
      result.south = rectangle.north - (y + 1) / rows * rectangle.height;
      return result;
    };
  }
  const insideFine = focus.lon_rad >= fine.west_rad && focus.lon_rad <= fine.east_rad
    && focus.lat_rad >= fine.south_rad && focus.lat_rad <= fine.north_rad;
  // Subdivision reduces imagery requests; it interpolates the already shared
  // native surface and does not add measurements or source accuracy.
  const finest = insideFine ? 5 : 4;
  const available = (x: number, y: number, level: number) => Number.isInteger(level) && level >= 0 && level <= finest
    && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < nx * 2 ** level && y < ny * 2 ** level;
  const provider: TerrainProvider = new CustomHeightmapTerrainProvider({ width: WIDTH, height: WIDTH, tilingScheme,
    credit: streamedTerrainCredit([...selected.values()]),
    callback(x, y, level) {
      if (!available(x, y, level)) return undefined;
      const heights = new Float64Array(WIDTH * WIDTH), tileRect = tilingScheme.tileXYToRectangle(x, y, level);
      for (let r = 0; r < WIDTH; r++) {
        const lat = r === 0 ? tileRect.north : r === CELLS ? tileRect.south : tileRect.north - r / CELLS * tileRect.height;
        for (let c = 0; c < WIDTH; c++) {
          const lon = c === 0 ? tileRect.west : c === CELLS ? tileRect.east : wrapLongitude(tileRect.west + c / CELLS * tileRect.width);
          const sample = sampleAt(lat, lon);
          if (!sample || !Number.isFinite(sample.ellipsoid_m)) throw new Error('Streamed terrain elevation unavailable');
          heights[r * WIDTH + c] = sample.ellipsoid_m;
        }
      }
      return heights;
    },
  });
  if ([...selected.values()].some(grid => grid.masked)) {
    // Partial border tiles draw only supported triangles. Native contact uses
    // the same missing-node mask; photography never supplies ground heights.
    provider.requestTileGeometry = (x, y, level) => {
      if (!available(x, y, level)) return undefined;
      const heights = new Float64Array(WIDTH * WIDTH), tileRect = tilingScheme.tileXYToRectangle(x, y, level);
      let missing = false;
      for (let r = 0; r < WIDTH; r++) {
        const lat = r === 0 ? tileRect.north : r === CELLS ? tileRect.south : tileRect.north - r / CELLS * tileRect.height;
        for (let c = 0; c < WIDTH; c++) {
          const lon = c === 0 ? tileRect.west : c === CELLS ? tileRect.east : tileRect.west + c / CELLS * tileRect.width;
          const sample = sampleAt(lat, lon);
          heights[r * WIDTH + c] = sample?.ellipsoid_m ?? NaN;
          missing ||= !sample;
        }
      }
      const childTileMask = level < finest ? 15 : 0;
      return Promise.resolve(missing ? createMaskedTerrainMesh(tileRect, heights, WIDTH, childTileMask)
        : new HeightmapTerrainData({ buffer: heights, width: WIDTH, height: WIDTH, childTileMask }));
    };
  }
  const levelZeroError = Ellipsoid.WGS84.maximumRadius * rad(worldStep) / CELLS * .25;
  provider.getLevelMaximumGeometricError = level => {
    if (!Number.isInteger(level) || level < 0) throw new RangeError('Invalid terrain level');
    return level >= finest ? 1e-6 : levelZeroError / 2 ** level;
  };
  provider.getTileDataAvailable = available;
  return provider;
}

/** Live source credits reused by the window and global-horizon providers. */
export function streamedTerrainCredit(tiles: readonly TerrainGrid[], globalHorizon = false): Credit {
  const copernicus = tiles.some(grid => (grid.copernicus_nodes ?? 0) > 0);
  const global = globalHorizon || tiles.some(grid => validWorldTerrainTile(grid) && (grid.source === 'global' || grid.source === 'mixed'));
  const globalCredit = (copernicus ? 'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. <a href="/terrain/copernicus/LICENSE.pdf">Licence / disclaimer</a>. ' : '')
    + (global ? 'EGM2008 geoid / last fallback: NOAA ETOPO 2022; Natural Earth ocean mask · coarse derived baseline; approximate datum transitions. ' : '');
  return new Credit(globalCredit + 'Terrain: © GeoBasis-DE / <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026), DGM200, <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a>; GCG2016 © <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026), <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>; Hessen DGM, <a href="https://www.govdata.de/dl-de/zero-2-0" target="_blank" rel="noopener noreferrer">dl-de/zero-2-0</a> · <a href="/terrain/BKG-SOURCES.pdf" target="_blank" rel="noopener noreferrer">Sources</a> · resampled and blended', true);
}
