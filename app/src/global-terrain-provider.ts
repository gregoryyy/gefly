import { CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, HeightmapTerrainData, Rectangle, type TerrainProvider } from 'cesium';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { sampleAtlas, atlasGridAt } from '../../studies/e1-browser/sim/terrain-stream.js';
import { sampleWorldTerrain, validWorldTerrainTile, worldTerrainProfile, type WorldTerrainTile, type WorldTerrainProfile } from '../../studies/e1-browser/sim/world-terrain.js';
import { streamedTerrainCredit } from './streamed-terrain-provider.ts';

// Only this module owns update closures. Unknown/legacy providers fail closed.
const tileUpdates = new WeakMap<TerrainProvider, (tiles: readonly TerrainGrid[]) => boolean>();
export function tryUpdateGlobalTerrainProvider(provider: TerrainProvider, tiles: readonly TerrainGrid[]): boolean {
  return tileUpdates.get(provider)?.(tiles) ?? false;
}
const HISTORY_LIMIT = 64, STATIC_LIMIT = 73, PREVIEW_LIMIT = 512, ROUNDING = 1e-12;
const geometryEqual = (a: TerrainGrid, b: TerrainGrid) =>
  a.width === b.width && a.height === b.height
  && a.west_rad === b.west_rad && a.east_rad === b.east_rad
  && a.south_rad === b.south_rad && a.north_rad === b.north_rad
  && a.physical_m.every((height, i) => height === b.physical_m[i] && a.geoid_m[i] === b.geoid_m[i]);
const snapshot = (grid: WorldTerrainTile): WorldTerrainTile => Object.freeze({ ...grid,
  physical_m: grid.physical_m.slice(), geoid_m: grid.geoid_m.slice() });
const innerFine = (fine: TerrainGrid, bounds: Rectangle) => fine.masked !== true
  && bounds.west >= fine.west_rad + .02 * Math.PI / 180
  && bounds.east <= fine.east_rad - .02 * Math.PI / 180
  && bounds.south >= fine.south_rad + .02 * Math.PI / 180
  && bounds.north <= fine.north_rad - .02 * Math.PI / 180;
const rectangleOf = (grid: TerrainGrid) => new Rectangle(grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad);
function intersects(a: Rectangle, b: Rectangle) {
  if (a.south > b.north + ROUNDING || b.south > a.north + ROUNDING) return false;
  // Inclusive bounds preserve shared vertices, including both dateline names.
  return [-2 * Math.PI, 0, 2 * Math.PI].some(shift =>
    a.west <= b.east + shift + ROUNDING && a.east >= b.west + shift - ROUNDING);
}
function sharedNodesEqual(a: WorldTerrainTile, b: WorldTerrainTile, profile: Readonly<WorldTerrainProfile>) {
  const position = (grid: TerrainGrid) => [Math.round((grid.west_rad * 180 / Math.PI + 180) / profile.step),
    Math.round((grid.south_rad * 180 / Math.PI + 90) / profile.step)];
  const [ax, ay] = position(a), [bx, by] = position(b);
  let dx = bx - ax;
  if (dx > profile.cols / 2) dx -= profile.cols;
  if (dx < -profile.cols / 2) dx += profile.cols;
  const dy = by - ay;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || dx === 0 && dy === 0) return true;
  const xs = dx === 0 ? Array.from({length:129}, (_,i)=>i) : [dx > 0 ? 128 : 0];
  const ys = dy === 0 ? Array.from({length:129}, (_,i)=>i) : [dy > 0 ? 128 : 0];
  for (const y of ys) for (const x of xs) {
    const ai = y * 129 + x, bi = (y - dy * 128) * 129 + x - dx * 128;
    if (a.physical_m[ai] !== b.physical_m[bi] || a.geoid_m[ai] !== b.geoid_m[bi]) return false;
  }
  return true;
}

const SIZE = 181;
// Cesium queues every root before visibility culling. Two small root meshes
// avoid rebuilding thousands of off-screen meshes when resident cells change.
// From level six, 181 samples give a vertex pitch of 2^-level degrees.
const meshWidth = (level: number) => Math.min(SIZE, 2 ** (level + 2) + 1);
/** Two hemisphere roots with 180 mesh intervals align the quarter-degree,
 * 129-node native source at level nine. Distant terrain stops at level twelve;
 * starter terrain reaches level fourteen, preserving their prior finest pitches.
 * A global coarse horizon remains outside the resident native cells;
 * renderer LOD interpolation does not establish additional terrain measurements. */
export function createGlobalTerrainProvider(world: TerrainGrid, fine: TerrainGrid,
  tiles: readonly TerrainGrid[]): TerrainProvider {
  if (!validateTerrainGrid(world) || !validateTerrainGrid(fine)) throw new Error('Global terrain sources unavailable');
  const selected = new Map<string, WorldTerrainTile>();
  if (tiles.length > STATIC_LIMIT || tiles.some(grid => !validateTerrainGrid(grid))) throw new Error('Invalid global terrain window');
  // Older Review records can include regional grids. As in the static global
  // provider, ignore these here; do not introduce a new regional precedence.
  const worldTiles = tiles.filter(validWorldTerrainTile);
  let profile = worldTiles.length ? worldTerrainProfile(worldTiles[0])! : null;
  // Review may combine64 archived grids with9 live grids and both source
  // profiles. Preserve that static surface, but never mutate it as a live window.
  const canUpdate = tiles.length > 0 && tiles.length <= 9 && worldTiles.length === tiles.length
    && new Set(worldTiles.map(grid => grid.id)).size === worldTiles.length
    && worldTiles.every(grid => worldTerrainProfile(grid) === profile);
  for (const grid of worldTiles) selected.set(grid.id, snapshot(grid));
  const coarsePreviews = new Map<string, Rectangle>();
  const finestSources = new Set<string>();
  let previewOverflow = false;
  let copernicusExample = [...selected.values()].find(grid => (grid.copernicus_nodes ?? 0) > 0);
  const tilingScheme = new GeographicTilingScheme({ numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1 });
  const maximum = 14;
  const fineBounds = new Rectangle(fine.west_rad, fine.south_rad, fine.east_rad, fine.north_rad);
  const insideFine = (x: number, y: number, level: number) =>
    Rectangle.intersection(tilingScheme.tileXYToRectangle(x, y, level), fineBounds) !== undefined;
  const available = (x: number, y: number, level: number) => Number.isInteger(level) && level >= 0 && level <= maximum
    && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
    && x < 2 * 2 ** level && y < 1 * 2 ** level
    && (level <= 12 || insideFine(x, y, level));
  let latitudeEdges = [...new Set([fine.south_rad, fine.north_rad, ...[...selected.values()].flatMap(grid => [grid.south_rad, grid.north_rad])])];
  let longitudeEdges = [...new Set([fine.west_rad, fine.east_rad, ...[...selected.values()].flatMap(grid => [grid.west_rad, grid.east_rad])])];
  let samplingFinest = false, usedCoarsePreview = false;
  const sample = (latitude: number, longitude: number) => {
    // Cesium global tile arithmetic may put a shared vertex a few ULP outside
    // a resident source edge. Snap roundoff only; never extend loaded coverage.
    for (const edge of latitudeEdges) if (Math.abs(latitude - edge) < 1e-12) { latitude = edge; break; }
    for (const edge of longitudeEdges) if (Math.abs(longitude - edge) < 1e-12) { longitude = edge; break; }
    if (samplingFinest && !innerFine(fine, new Rectangle(longitude, latitude, longitude, latitude))) {
      const coarse = atlasGridAt(null, selected, latitude, longitude);
      if (coarse) finestSources.add(coarse.id);
      else usedCoarsePreview = true;
    }
    return sampleAtlas(fine, selected, latitude, longitude) ?? sampleWorldTerrain(world, latitude, longitude);
  };
  const heightsFor = (x: number, y: number, level: number, width = meshWidth(level)) => {
      if (!available(x, y, level)) return undefined;
      const bounds = tilingScheme.tileXYToRectangle(x, y, level);
      samplingFinest = level === (insideFine(x, y, level) ? maximum : 12);
      usedCoarsePreview = false;
      const heights = new Float64Array(width * width), cells = width - 1;
      for (let row = 0; row < width; row++) {
        const lat = row === 0 ? bounds.north : row === cells ? bounds.south : bounds.north - row / cells * bounds.height;
        for (let col = 0; col < width; col++) {
          const lon = col === 0 ? bounds.west : col === cells ? bounds.east : bounds.west + col / cells * bounds.width;
          const value = sample(lat, lon);
          if (!value || !Number.isFinite(value.ellipsoid_m)) throw new Error('Global display terrain sample unavailable');
          heights[row * width + col] = value.ellipsoid_m;
        }
      }
      samplingFinest = false;
      if (usedCoarsePreview) {
        const key = `${level}/${x}/${y}`;
        if (coarsePreviews.has(key) || coarsePreviews.size < PREVIEW_LIMIT) coarsePreviews.set(key, bounds);
        else previewOverflow = true;
      }
      return heights;
  };
  const provider = new CustomHeightmapTerrainProvider({ width: SIZE, height: SIZE, tilingScheme,
    credit: streamedTerrainCredit([...selected.values()], true),
    // The public request below supplies each level's dimensions explicitly.
    callback: (x, y, level) => heightsFor(x, y, level, SIZE) });
  provider.getLevelMaximumGeometricError = level => {
    if (!Number.isInteger(level) || level < 0) throw new RangeError('Invalid global terrain level');
    const spacing = Ellipsoid.WGS84.maximumRadius * (180 * Math.PI / 180)
      / 2 ** level / (meshWidth(level) - 1);
    // Bound a diagonal chord, whose squared length is twice an edge length.
    // This geometric floor does not bound unmeasured source-height variation.
    const curvatureError = spacing * spacing / (4 * Ellipsoid.WGS84.minimumRadius);
    return Math.max(curvatureError, level >= maximum ? 1e-6 : spacing * .25);
  };
  provider.getTileDataAvailable = available;
  // Both the advertised coverage and child mask stop distant coarse rendering
  // at level twelve; the detailed starter area can refine to level fourteen.
  provider.requestTileGeometry = (x, y, level) => {
    const width = meshWidth(level), heights = heightsFor(x, y, level, width);
    if (!heights) return undefined;
    const finest = insideFine(x, y, level) ? maximum : 12;
    return Promise.resolve(new HeightmapTerrainData({ buffer: heights, width, height: width,
      childTileMask: level < finest ? 15 : 0 }));
  };

  let liveCredit = streamedTerrainCredit([...selected.values()], true);
  Object.defineProperty(provider, 'credit', { get: () => liveCredit });
  tileUpdates.set(provider, incoming => {
    if (!canUpdate || !Array.isArray(incoming) || !incoming.length || incoming.length > 9
      || incoming.some(grid => !validWorldTerrainTile(grid))
      || new Set(incoming.map(grid => grid.id)).size !== incoming.length) return false;
    const incomingProfile = worldTerrainProfile(incoming[0])!;
    if (incoming.some(grid => worldTerrainProfile(grid) !== incomingProfile)
      || profile && profile !== incomingProfile) return false;
    const grids = incoming as readonly WorldTerrainTile[];
    for (const grid of grids) {
      const existing = selected.get(grid.id);
      if (existing && !geometryEqual(existing, grid)) return false;
      if (!existing && !innerFine(fine, rectangleOf(grid)) && (previewOverflow
        || [...coarsePreviews.values()].some(bounds => intersects(bounds, rectangleOf(grid))))) return false;
      for (const old of selected.values()) if (!sharedNodesEqual(old, grid, incomingProfile)) return false;
      for (const other of grids) if (!sharedNodesEqual(grid, other, incomingProfile)) return false;
    }
    // Plan the LRU transaction before mutating the live sampler or its credit.
    const next = new Map(selected), previous = new Set(selected.keys()), current = new Set(grids.map(grid => grid.id));
    for (const grid of grids) {
      const existing = next.get(grid.id);
      next.delete(grid.id);
      // Geometry is exactequal; refresh detached source/slot metadata without
      // copying retained height arrays or leaving new source credits stale.
      next.set(grid.id, existing ? Object.freeze({ ...grid,
        physical_m: existing.physical_m, geoid_m: existing.geoid_m }) : grid);
    }
    for (const [id] of next) {
      if (next.size <= HISTORY_LIMIT) break;
      if (current.has(id)) continue;
      // A finest mesh may remain cached in Cesium. Do not drop its source and
      // silently regenerate that geometry from coarse data on a later request.
      if (finestSources.has(id)) return false;
      next.delete(id);
    }
    if (next.size > HISTORY_LIMIT) return false;
    selected.clear();
    for (const [id, grid] of next) selected.set(id, previous.has(id) ? grid : snapshot(grid));
    profile = incomingProfile;
    copernicusExample ??= [...selected.values()].find(grid => (grid.copernicus_nodes ?? 0) > 0);
    liveCredit = streamedTerrainCredit([...selected.values(), ...(copernicusExample ? [copernicusExample] : [])], true);
    latitudeEdges = [...new Set([fine.south_rad, fine.north_rad, ...[...selected.values()].flatMap(grid => [grid.south_rad, grid.north_rad])])];
    longitudeEdges = [...new Set([fine.west_rad, fine.east_rad, ...[...selected.values()].flatMap(grid => [grid.west_rad, grid.east_rad])])];
    return true;
  });
  return provider;
}
