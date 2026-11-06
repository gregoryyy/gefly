import { CustomHeightmapTerrainProvider, Ellipsoid, GeographicTilingScheme, HeightmapTerrainData, Rectangle, type TerrainProvider } from 'cesium';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { sampleAtlas, atlasGridAt } from '../../studies/e1-browser/sim/terrain-stream.js';
import { sampleWorldTerrain, validWorldTerrainTile, worldTerrainProfile, type WorldTerrainTile, type WorldTerrainProfile } from '../../studies/e1-browser/sim/world-terrain.js';
import { validTerrainOverview, sampleTerrainOverview, type TerrainOverviewGrid, type OverviewCellIdentity, type OverviewResolution } from './terrain-overview.ts';
import { streamedTerrainCredit } from './streamed-terrain-provider.ts';

// Only this module owns update closures. Unknown/legacy providers fail closed.
const overviewClosures = new WeakMap<TerrainProvider,(reason:string)=>void>();
/** Close optional admission, never the authoritative/native atlas. Existing
 * overview geometry becomes the fixed baseline for the rest of this epoch. */
export function closeGlobalTerrainOverview(provider:TerrainProvider,reason:string):void { overviewClosures.get(provider)?.(reason); }
const overviewResolutions = new WeakMap<TerrainProvider, (result: OverviewResolution) => boolean>();
export function acceptGlobalTerrainOverviewSource(provider: TerrainProvider, result: OverviewResolution): boolean {
  return overviewResolutions.get(provider)?.(result) ?? false;
}
export interface GlobalTerrainOverviewOptions {
  stream?: boolean; request?: (cells: readonly OverviewCellIdentity[]) => void;
  outcomes?: readonly Readonly<{ col: number; row: number; missing: boolean; sha256?: string }>[];
}
const overviewUpdates = new WeakMap<TerrainProvider, (grids: readonly TerrainOverviewGrid[]) => boolean>();
const overviewInfo = new WeakMap<TerrainProvider, () => Readonly<{ history: number; pinned: number; pending: string | null; closed: string | null }>>();
export function tryUpdateGlobalTerrainOverview(provider: TerrainProvider, grids: readonly TerrainOverviewGrid[]): boolean {
  return overviewUpdates.get(provider)?.(grids) ?? false;
}
export function globalTerrainOverviewInfo(provider: TerrainProvider) { return overviewInfo.get(provider)?.() ?? null; }
const tileUpdates = new WeakMap<TerrainProvider, (tiles: readonly TerrainGrid[]) => boolean>();
export function tryUpdateGlobalTerrainProvider(provider: TerrainProvider, tiles: readonly TerrainGrid[]): boolean {
  return tileUpdates.get(provider)?.(tiles) ?? false;
}
const HISTORY_LIMIT = 64, STATIC_LIMIT = 73, PREVIEW_LIMIT = 512, ROUNDING = 1e-12;
// Exterior display transition only: one eighth of the coarse one-degree pitch.
// This does not add measured terrain or alter any resident/native source height.
const COLLAR = Math.PI / 180 / 8;
const expanded = (bounds: Rectangle) => new Rectangle(bounds.west - COLLAR,
  Math.max(-Math.PI / 2, bounds.south - COLLAR), bounds.east + COLLAR,
  Math.min(Math.PI / 2, bounds.north + COLLAR));

type GridGeometry = Pick<TerrainGrid, 'width' | 'height' | 'west_rad' | 'east_rad' | 'south_rad' | 'north_rad' | 'physical_m' | 'geoid_m'>;
const geometryEqual = (a: GridGeometry, b: GridGeometry) =>
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
const rectangleOf = (grid: GridGeometry) => new Rectangle(grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad);
function intersects(a: Rectangle, b: Rectangle) {
  if (a.south > b.north + ROUNDING || b.south > a.north + ROUNDING) return false;
  // Inclusive bounds preserve shared vertices, including both dateline names.
  return [-2 * Math.PI, 0, 2 * Math.PI].some(shift =>
    a.west <= b.east + shift + ROUNDING && a.east >= b.west + shift - ROUNDING);
}
function sharedNodesEqual(a: GridGeometry, b: GridGeometry, profile: Readonly<Pick<WorldTerrainProfile, 'step' | 'cols'>>) {
  const position = (grid: GridGeometry) => [Math.round((grid.west_rad * 180 / Math.PI + 180) / profile.step),
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

/** Exact rectangle-union coverage. Bounds-only, including both dateline names. */
function coveredBy(bounds: Rectangle, grids: readonly GridGeometry[]): boolean {
  const rectangles = grids.flatMap(grid => [-2*Math.PI,0,2*Math.PI].map(shift => ({
    west: grid.west_rad+shift, east:grid.east_rad+shift, south:grid.south_rad,north:grid.north_rad,
  }))).filter(r => r.west < bounds.east+ROUNDING && r.east > bounds.west-ROUNDING && r.south <= bounds.north && r.north >= bounds.south);
  const xs=[bounds.west,bounds.east,...rectangles.flatMap(r=>[r.west,r.east]).filter(x=>x>bounds.west&&x<bounds.east)].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++){
    if(xs[i]-xs[i-1]<ROUNDING)continue;
    const x=(xs[i]+xs[i-1])/2,ys=rectangles.filter(r=>r.west<=x&&r.east>=x).sort((a,b)=>a.south-b.south);
    let north=bounds.south;
    for(const r of ys){if(r.south>north+ROUNDING)break;north=Math.max(north,r.north);}
    if(north<bounds.north-ROUNDING)return false;
  }
  return true;
}
function sourceCell(latitude:number,longitude:number):OverviewCellIdentity|null {
  const col=((Math.floor((longitude*180/Math.PI+180)*4)%1440)+1440)%1440;
  const row=Math.floor((latitude*180/Math.PI+90)*4);
  return row>=1&&row<=718?{col,row}:null;
}
const sourceId=(cell:OverviewCellIdentity)=>`display-overview-c${cell.col}-r${cell.row}`;
type TerrainSample = { physical_m: number; geoid_m: number; ellipsoid_m: number };
function exteriorTransition(latitude: number, longitude: number, coarse: TerrainSample,
  sources: readonly TerrainGrid[], boundaryAt: (lat: number, lon: number) => TerrainSample | null,
  baselineAt: (lat: number, lon: number) => TerrainSample | null,
  contributing?: (grid: TerrainGrid) => void): TerrainSample {
    // Project onto each nearby source rectangle. Inverse-distance normalized
    // weights avoid discontinuities where disconnected history cells are equally
    // near; compact smoothstep support recovers the exact coarse horizon.
    const corrections: { distance: number; taper: number; physical: number; geoid: number }[] = [];
    let nearest = Infinity;
    for (const grid of sources) {
      const center = (grid.west_rad + grid.east_rad) / 2;
      const unwrapped = longitude + Math.round((center - longitude) / (2 * Math.PI)) * 2 * Math.PI;
      const lat = Math.max(grid.south_rad, Math.min(grid.north_rad, latitude));
      const lon = Math.max(grid.west_rad, Math.min(grid.east_rad, unwrapped));
      const distance = Math.hypot(latitude - lat, unwrapped - lon);
      if (distance >= COLLAR) continue;
      // A masked source contributes only where the normal atlas actually has a
      // valid sample. Preserve its existing fine/streamed precedence and feather.
      const boundary = boundaryAt(lat, lon);
      const baseline = baselineAt(lat, lon);
      if (!boundary || !baseline) continue;
      contributing?.(grid);
      if (distance === 0) return boundary;
      const fraction = distance / COLLAR;
      corrections.push({ distance, taper: (1 - fraction) ** 2 * (1 + 2 * fraction),
        physical: boundary.physical_m - baseline.physical_m,
        geoid: boundary.geoid_m - baseline.geoid_m });
      nearest = Math.min(nearest, distance);
    }
    if (!corrections.length) return coarse;
    let weights = 0, physical = 0, geoid = 0, amplitude = 0;
    for (const correction of corrections) {
      const weight = (nearest / correction.distance) ** 2 * correction.taper;
      weights += weight;
      physical += weight * correction.physical;
      geoid += weight * correction.geoid;
      amplitude = Math.max(amplitude, correction.taper);
    }
    const physical_m = coarse.physical_m + amplitude * physical / weights;
    const geoid_m = coarse.geoid_m + amplitude * geoid / weights;
    return { physical_m, geoid_m, ellipsoid_m: physical_m + geoid_m };
}

const SIZE = 181;
// Cesium queues every root before visibility culling. Two small root meshes
// avoid rebuilding thousands of off-screen meshes when resident cells change.
// From level six, 181 samples give a vertex pitch of 2^-level degrees.
const meshWidth = (level: number) => Math.min(SIZE, 2 ** (level + 2) + 1);
/** Two hemisphere roots with 180 mesh intervals align the 1/32-degree,
 * 129-node native source at level twelve; level fourteen retains the prior finest
 * starter mesh pitch. A global coarse horizon remains outside resident cells;
 * renderer LOD interpolation does not establish additional terrain measurements. */
export function createGlobalTerrainProvider(world: TerrainGrid, fine: TerrainGrid,
  tiles: readonly TerrainGrid[], overview: readonly TerrainOverviewGrid[] = [], options: GlobalTerrainOverviewOptions = {}): TerrainProvider {
  if (!validateTerrainGrid(world) || !validateTerrainGrid(fine)) throw new Error('Global terrain sources unavailable');
  if (!Array.isArray(overview) || overview.length > 9 || overview.some(grid => !validTerrainOverview(grid))
    || new Set(overview.map(grid => grid.id)).size !== overview.length) throw new Error('Invalid display overview window');
  for (const a of overview) for (const b of overview)
    if (!sharedNodesEqual(a, b, {step:.25,cols:1440})) throw new Error('Mismatched overview shared edge');
  const overviewHistory = new Map(overview.map(grid => [grid.id, Object.freeze({ ...grid,
    physical_m: grid.physical_m.slice(), geoid_m: grid.geoid_m.slice() })]));
  let overviewTiles = [...overviewHistory.values()];
  let overviewViews: TerrainGrid[] = overviewTiles.map(grid => ({ ...grid, version: 1 }));
  if((options.outcomes?.length??0)>512||(options.outcomes??[]).some(o=>!Number.isInteger(o.col)||o.col<0||o.col>=1440||!Number.isInteger(o.row)||o.row<1||o.row>718||typeof o.missing!=='boolean'))throw new Error('Invalid overview outcomes');
  const missingOverview = new Set((options.outcomes ?? []).filter(o=>o.missing).map(sourceId));
  let requiredSources = new Map<string,OverviewCellIdentity>(), discovering = false;
  let usedSources = new Set<string>();
  const pinnedOverview = new Set<string>(), overviewFallbackPreviews = new Map<string, Rectangle>();
  let overviewPending: string | null = null, overviewClosed: string | null = null, overviewPreviewOverflow = false;
  let trackOverview = false, usedOverviewFallback = false;
  const usedOverview = (grid: TerrainOverviewGrid) => { if (trackOverview) usedSources.add(grid.id); };
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
  let collarSources: readonly TerrainGrid[] = [fine, ...[...selected.values()].filter(grid => !innerFine(fine, rectangleOf(grid)))];
  const coarsePreviews = new Map<string, Rectangle>();
  const finestSources = new Set<string>();
  let previewOverflow = false;
  let copernicusExample = [...selected.values()].find(grid => (grid.copernicus_nodes ?? 0) > 0);
  const tilingScheme = new GeographicTilingScheme({ numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1 });
  const maximum = 14;
  const available = (x: number, y: number, level: number) => Number.isInteger(level) && level >= 0 && level <= maximum
    && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
    && x < 2 * 2 ** level && y < 1 * 2 ** level;
  let latitudeEdges = [...new Set([fine.south_rad, fine.north_rad, ...[...selected.values()].flatMap(grid => [grid.south_rad, grid.north_rad])])];
  let longitudeEdges = [...new Set([fine.west_rad, fine.east_rad, ...[...selected.values()].flatMap(grid => [grid.west_rad, grid.east_rad])])];
  const overviewSurface = (latitude: number, longitude: number): TerrainSample | null => {
    // Snap only the display lookup; never move a valid authoritative atlas query.
    for (const grid of overviewTiles) {
      for (const edge of [grid.south_rad, grid.north_rad]) if (Math.abs(latitude - edge) < ROUNDING) latitude = edge;
      for (const edge of [grid.west_rad, grid.east_rad]) if (Math.abs(longitude - edge) < ROUNDING) longitude = edge;
    }
    const overviewSample = sampleTerrainOverview(overviewTiles, latitude, longitude, usedOverview);
    if (overviewSample) return overviewSample;
    if (trackOverview) usedOverviewFallback = true;
    if (discovering) {
      const owner=sourceCell(latitude,longitude);
      if(owner&&!missingOverview.has(sourceId(owner))){requiredSources.set(sourceId(owner),owner);return null;}
      // A missing core can use only a settled, immutable compact neighbourhood.
      for(let row=Math.floor((latitude-COLLAR)*180/Math.PI*4+360);row<=Math.floor((latitude+COLLAR)*180/Math.PI*4+360);row++)
        for(let x=Math.floor((longitude-COLLAR)*180/Math.PI*4+720);x<=Math.floor((longitude+COLLAR)*180/Math.PI*4+720);x++){
          if(row<1||row>718)continue;const cell={col:(x%1440+1440)%1440,row},id=sourceId(cell);
          if(!overviewHistory.has(id)&&!missingOverview.has(id))requiredSources.set(id,cell);
        }
      if(requiredSources.size)return null;
    }
    const worldSample = sampleWorldTerrain(world, latitude, longitude);
    if (!worldSample || !overviewTiles.length) return worldSample;
    return exteriorTransition(latitude, longitude, worldSample, overviewViews,
      (lat, lon) => sampleTerrainOverview(overviewTiles, lat, lon, usedOverview),
      (lat, lon) => sampleWorldTerrain(world, lat, lon),
      grid => { if (trackOverview) usedSources.add(grid.id); });
  };
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
    const actual = sampleAtlas(fine, selected, latitude, longitude);
    if (actual) return actual;
    const coarse = overviewSurface(latitude, longitude);
    if (!coarse) return null;
    return exteriorTransition(latitude, longitude, coarse, collarSources,
      (lat, lon) => sampleAtlas(fine, selected, lat, lon), overviewSurface);
  };
  const heightsFor = (x: number, y: number, level: number, width = meshWidth(level)) => {
      if (!available(x, y, level)) return undefined;
      const bounds = tilingScheme.tileXYToRectangle(x, y, level);
      const nativeCovered=innerFine(fine,bounds)||coveredBy(bounds,[...selected.values()]);
      const polar= bounds.south>=89.5*Math.PI/180 || bounds.north<=-89.5*Math.PI/180;
      if(options.stream&&level===maximum&&!nativeCovered&&!polar)return undefined;
      const ancestor=intersects(bounds,rectangleOf(fine))||[...selected.values()].some(grid=>intersects(bounds,rectangleOf(grid)));
      discovering=options.stream===true&&level>=10&&!ancestor&&!polar&&overviewClosed===null;
      requiredSources=new Map();usedSources=new Set();
      // Unknown owner requests need no 181² allocation or source sampling. A
      // level-ten tile spans less than one quarter degree on either axis.
      if (discovering) {
        for (const lat of [bounds.south,bounds.north]) for (const lon of [bounds.west,bounds.east]) {
          const owner=sourceCell(lat,lon);if(owner&&!overviewHistory.has(sourceId(owner))&&!missingOverview.has(sourceId(owner)))requiredSources.set(sourceId(owner),owner);
        }
        if(requiredSources.size){discovering=false;options.request?.([...requiredSources.values()]);return undefined;}
      }
      samplingFinest = level === maximum;
      trackOverview = level >= 10 && overviewTiles.length > 0 && (!options.stream || !ancestor); usedOverviewFallback = false;
      usedCoarsePreview = false;
      const heights = new Float64Array(width * width), cells = width - 1;
      for (let row = 0; row < width; row++) {
        const lat = row === 0 ? bounds.north : row === cells ? bounds.south : bounds.north - row / cells * bounds.height;
        for (let col = 0; col < width; col++) {
          const lon = col === 0 ? bounds.west : col === cells ? bounds.east : bounds.west + col / cells * bounds.width;
          const value = options.stream && level>=10 && polar
            ? sampleWorldTerrain(world,lat,lon) : sample(lat, lon);
          if (!value || !Number.isFinite(value.ellipsoid_m)) {
            if(discovering&&requiredSources.size)continue;
            throw new Error('Global display terrain sample unavailable');
          }
          heights[row * width + col] = value.ellipsoid_m;
        }
      }
      samplingFinest = false; trackOverview = false; discovering=false;
      if(requiredSources.size){options.request?.([...requiredSources.values()]);return undefined;}
      for(const id of usedSources)pinnedOverview.add(id);
      if (usedOverviewFallback) {
        const key = `${level}/${x}/${y}`;
        if (overviewFallbackPreviews.has(key) || overviewFallbackPreviews.size + coarsePreviews.size < PREVIEW_LIMIT) overviewFallbackPreviews.set(key, bounds);
        else overviewPreviewOverflow = true;
      }
      if (usedCoarsePreview) {
        const key = `${level}/${x}/${y}`;
        if (coarsePreviews.has(key) || coarsePreviews.size + overviewFallbackPreviews.size < PREVIEW_LIMIT) coarsePreviews.set(key, bounds);
        else previewOverflow = true;
      }
      return heights;
  };
  const provider = new CustomHeightmapTerrainProvider({ width: SIZE, height: SIZE, tilingScheme,
    credit: streamedTerrainCredit([...selected.values(), ...overviewViews], true),
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
  // Use one consistent global child hierarchy. Higher LOD subdivides the same
  // source planes; it does not invent additional measurements in coarse areas.
  provider.requestTileGeometry = (x, y, level) => {
    const width = meshWidth(level), heights = heightsFor(x, y, level, width);
    if (!heights) return undefined;
    return Promise.resolve(new HeightmapTerrainData({ buffer: heights, width, height: width,
      childTileMask: level < maximum ? 15 : 0 }));
  };

  let liveCredit = streamedTerrainCredit([...selected.values(), ...overviewViews], true);
  Object.defineProperty(provider, 'credit', { get: () => liveCredit });
  overviewClosures.set(provider,reason=>{overviewClosed??=reason;overviewPending=overviewClosed;});
  overviewInfo.set(provider, () => Object.freeze({ history: overviewHistory.size, pinned: pinnedOverview.size, pending: overviewPending, closed:overviewClosed }));
  overviewUpdates.set(provider, incoming => {
    const reject = (reason: string) => { overviewPending = reason;
      if(reason!=='invalid')overviewClosures.get(provider)!(reason);return false; };
    if (!Array.isArray(incoming) || incoming.length > 9 || incoming.some(grid => !validTerrainOverview(grid))
      || new Set(incoming.map(grid => grid.id)).size !== incoming.length) return reject('invalid');
    for (const grid of incoming) {
      const old = overviewHistory.get(grid.id);
      if(missingOverview.has(grid.id))return reject('served missing source');
      if (old && !geometryEqual(old, grid)) return reject('changed geometry');
      for (const other of [...overviewHistory.values(),...incoming])
        if (!sharedNodesEqual(grid,other,{step:.25,cols:1440})) return reject('shared edge');
      if (!old && overviewClosed) return reject(overviewClosed);
      if (!old && (previewOverflow || overviewPreviewOverflow
        || [...coarsePreviews.values(), ...overviewFallbackPreviews.values()].some(bounds => intersects(bounds, expanded(rectangleOf(grid)))))) return reject('returned geometry');
    }
    const next = new Map(overviewHistory), active = new Set(incoming.map(grid => grid.id));
    for (const grid of incoming) {
      const old = next.get(grid.id); next.delete(grid.id);
      next.set(grid.id, Object.freeze({ ...grid, physical_m: old?.physical_m ?? grid.physical_m.slice(),
        geoid_m: old?.geoid_m ?? grid.geoid_m.slice() }));
    }
    for (const [id, grid] of next) {
      if (next.size <= 32) break;
      if (active.has(id) || pinnedOverview.has(id)) continue;
      if (overviewPreviewOverflow || [...overviewFallbackPreviews.values()].some(bounds => intersects(bounds, expanded(rectangleOf(grid))))) continue;
      next.delete(id);
    }
    if (next.size > 32) return reject('history capacity');
    if(next.size+missingOverview.size>512)return reject('outcome capacity');
    overviewHistory.clear(); for (const [id, grid] of next) overviewHistory.set(id, grid);
    overviewTiles = [...overviewHistory.values()]; overviewViews = overviewTiles.map(grid => ({ ...grid, version: 1 }));
    overviewPending = overviewClosed;
    liveCredit = streamedTerrainCredit([...selected.values(), ...overviewViews, ...(copernicusExample ? [copernicusExample] : [])], true);
    return true;
  });
  overviewResolutions.set(provider,result=>{
    if(result.grid)return overviewUpdates.get(provider)!( [result.grid] );
    if(!Number.isInteger(result.col)||result.col<0||result.col>=1440||!Number.isInteger(result.row)||result.row<1||result.row>718)return false;
    const id=sourceId(result);
    if(overviewHistory.has(id)){overviewClosures.get(provider)!('positive source unavailable');return false;}
    if(overviewClosed)return false;
    if(missingOverview.has(id))return true;
    if(missingOverview.size+overviewHistory.size>=512){overviewClosures.get(provider)!('outcome capacity');return false;}
    missingOverview.add(id);return true;
  });
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
        || [...coarsePreviews.values()].some(bounds => intersects(bounds, expanded(rectangleOf(grid)))))) return false;
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
      if (finestSources.has(id) || !innerFine(fine, rectangleOf(next.get(id)!)) && (previewOverflow
        || [...coarsePreviews.values()].some(bounds => intersects(bounds, expanded(rectangleOf(next.get(id)!)))))) return false;
      next.delete(id);
    }
    if (next.size > HISTORY_LIMIT) return false;
    selected.clear();
    for (const [id, grid] of next) selected.set(id, previous.has(id) ? grid : snapshot(grid));
    collarSources = [fine, ...[...selected.values()].filter(grid => !innerFine(fine, rectangleOf(grid)))];
    profile = incomingProfile;
    copernicusExample ??= [...selected.values()].find(grid => (grid.copernicus_nodes ?? 0) > 0);
    liveCredit = streamedTerrainCredit([...selected.values(), ...overviewViews, ...(copernicusExample ? [copernicusExample] : [])], true);
    latitudeEdges = [...new Set([fine.south_rad, fine.north_rad, ...[...selected.values()].flatMap(grid => [grid.south_rad, grid.north_rad])])];
    longitudeEdges = [...new Set([fine.west_rad, fine.east_rad, ...[...selected.values()].flatMap(grid => [grid.west_rad, grid.east_rad])])];
    return true;
  });
  return provider;
}
