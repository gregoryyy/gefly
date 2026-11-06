import { Cartesian3, Cartographic, GeographicTilingScheme, OrientedBoundingBox, Rectangle } from 'cesium';
import type { TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';

const RAD = Math.PI / 180, LEVEL = 13, STEP = Math.PI / 2 ** LEVEL;
const NATIVE_STEP = RAD / 32, FLIGHT_LIMIT = 89.5 * RAD;
/** H is strictly within(-1000,10000)m and |N|<200m, so raw h is within
 * (-1200,10200)m with range11400m. The overview correction expands this to
 * (-12600,21600)m; the native correction can add another±22800m. Both are
 * therefore within(-35400,44400)m, safely enclosed by±5*(10000+200)m. This is a
 * render uncertainty envelope, never a physical elevation or accuracy claim. */
export const TERRAIN_RENDER_ENVELOPE_M = 5 * (10000 + 200);
type Bounds = Pick<TerrainGrid, 'west_rad' | 'east_rad' | 'south_rad' | 'north_rad'>;
export interface TerrainDetailView {
  cameraPosition: Cartesian3; frustumFovy_rad: number; cssHeight: number; drawingBufferHeight: number;
  geometricError13_m: number; baseSSE?: number; contactPosition?: Cartesian3;
  /** Public Scene.fog.screenSpaceErrorFactor, or explicit zero if disabled.
   * The exact frame fog density is unnecessary: Cesium's fog factor is in[0,1]. */
  fogScreenSpaceErrorFactor?: number;
}
export interface TerrainDetailBudget {
  readonly bounded: boolean; readonly maximumScreenSpaceError: number;
  readonly unsupportedDistanceLowerBound_m: number | null; readonly unsupportedSSEUpper: number | null;
  readonly parentCount: number; readonly contactSSELower?: number; readonly contactRefines?: boolean; readonly reason?: string;
}
const finite = (v: number) => Number.isFinite(v);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-12;

/** Build once for a validated current nine-cell world30 window (six at a polar
 * guard). Only bounds are read; this helper never scans or changes height data.
 * Recreate after a native-window revision, not on every camera frame. History
 * and stable inner fine coverage may improve the bound; ignoring them is safe. */
export function createTerrainDetailBudget(scheme: GeographicTilingScheme, grids: readonly Bounds[]) {
  const boxes: ReturnType<typeof OrientedBoundingBox.fromRectangle>[] = [];
  let reason: string | undefined;
  let coverage: { west: number; east: number; south: number; north: number } | null = null;
  if (scheme.getNumberOfXTilesAtLevel(LEVEL) !== 2 ** (LEVEL + 1) || scheme.getNumberOfYTilesAtLevel(LEVEL) !== 2 ** LEVEL
    || !close(scheme.rectangle.west, -Math.PI) || !close(scheme.rectangle.east, Math.PI)
    || !close(scheme.rectangle.south, -Math.PI / 2) || !close(scheme.rectangle.north, Math.PI / 2))
    reason = 'The global two-hemisphere geographic tiling scheme is required.';
  if (![6, 9].includes(grids.length)) reason = 'A complete current world30 window is required.';
  if (!reason) {
    const reference = (grids[0].west_rad + grids[0].east_rad) / 2;
    const unwrapped = grids.map(grid => {
      const shift = Math.round((reference - (grid.west_rad + grid.east_rad) / 2) / (2 * Math.PI)) * 2 * Math.PI;
      return { west: grid.west_rad + shift, east: grid.east_rad + shift, south: grid.south_rad, north: grid.north_rad };
    });
    if (unwrapped.some(g => !Object.values(g).every(finite) || !close(g.east - g.west, NATIVE_STEP)
      || !close(g.north - g.south, NATIVE_STEP) || g.south < -FLIGHT_LIMIT - 1e-12 || g.north > FLIGHT_LIMIT + 1e-12)) {
      reason = 'Unsupported native bounds.';
    } else {
      const west = Math.min(...unwrapped.map(g => g.west)), east = Math.max(...unwrapped.map(g => g.east));
      const south = Math.min(...unwrapped.map(g => g.south)), north = Math.max(...unwrapped.map(g => g.north));
      const columns = Math.round((east - west) / NATIVE_STEP), rows = Math.round((north - south) / NATIVE_STEP);
      const keys = new Set(unwrapped.map(g => `${Math.round((g.west - west) / NATIVE_STEP)}/${Math.round((g.south - south) / NATIVE_STEP)}`));
      if (columns !== 3 || ![2, 3].includes(rows) || columns * rows !== grids.length || keys.size !== grids.length
        || !close(east - west, columns * NATIVE_STEP) || !close(north - south, rows * NATIVE_STEP)
        || unwrapped.some(g => !close(g.west - west, Math.round((g.west - west) / NATIVE_STEP) * NATIVE_STEP)
          || !close(g.south - south, Math.round((g.south - south) / NATIVE_STEP) * NATIVE_STEP))) reason = 'Native window is not a complete compact rectangle.';
      else coverage = { west, east, south, north };
    }
  }
  if (coverage) {
    const { west, east, south, north } = coverage;
    const westCol = Math.floor((west + Math.PI) / STEP), eastCol = Math.floor((east + Math.PI) / STEP);
    const northRow = Math.floor((Math.PI / 2 - north) / STEP), southRow = Math.floor((Math.PI / 2 - south) / STEP);
    const candidates = new Map<string, readonly [number, number]>();
    const add = (x: number, y: number) => {
      if (y < 0 || y >= 2 ** LEVEL) return;
      candidates.set(`${x}/${y}`, [x, y]);
    };
    // Three parent columns/rows around each face cover all boundary-straddling
    // parents plus one exterior ring. The compact3x3 profile bounds this set.
    for (const face of [westCol, eastCol]) for (let x = face - 1; x <= face + 1; x++)
      for (let y = northRow - 1; y <= southRow + 1; y++) add(x, y);
    for (const face of [northRow, southRow]) for (let y = face - 1; y <= face + 1; y++)
      for (let x = westCol - 1; x <= eastCol + 1; x++) add(x, y);
    if (candidates.size > 128) reason = 'Native perimeter exceeded its bounded parent budget.';
    else for (const [unwrappedX, y] of candidates.values()) {
      const x = ((unwrappedX % (2 ** (LEVEL + 1))) + 2 ** (LEVEL + 1)) % (2 ** (LEVEL + 1));
      const rect = scheme.tileXYToRectangle(x, y, LEVEL);
      const shift = Math.round(((west + east) / 2 - (rect.west + rect.east) / 2) / (2 * Math.PI)) * 2 * Math.PI;
      const clippedSouth = Math.max(rect.south, -FLIGHT_LIMIT), clippedNorth = Math.min(rect.north, FLIGHT_LIMIT);
      // Beyond the flight band the renderer may serve static coarse L14. Such
      // polar-only parents do not create permanently deferred native children.
      if (clippedSouth >= clippedNorth) continue;
      const inside = rect.west + shift >= west - 1e-12 && rect.east + shift <= east + 1e-12
        && clippedSouth >= south - 1e-12 && clippedNorth <= north + 1e-12;
      if (inside) continue;
      boxes.push(OrientedBoundingBox.fromRectangle(rect, -TERRAIN_RENDER_ENVELOPE_M, TERRAIN_RENDER_ENVELOPE_M, scheme.ellipsoid));
    }
    if (!boxes.length) reason = 'No unsupported native perimeter could be bounded.';
  }
  const parentCount = boxes.length;
  return Object.freeze({ parentCount, evaluate(view: TerrainDetailView): TerrainDetailBudget {
    const base = finite(view.baseSSE ?? 3) && (view.baseSSE ?? 3) > 0 ? view.baseSSE ?? 3 : 3;
    const failed = (why: string): TerrainDetailBudget => ({ bounded: false, maximumScreenSpaceError: base,
      unsupportedDistanceLowerBound_m: null, unsupportedSSEUpper: null, parentCount, reason: why });
    if (reason || !coverage) return failed(reason ?? 'Native coverage unavailable.');
    if (![view.cameraPosition?.x, view.cameraPosition?.y, view.cameraPosition?.z, view.frustumFovy_rad,
      view.cssHeight, view.drawingBufferHeight, view.geometricError13_m].every(finite)
      || view.frustumFovy_rad <= 0 || view.frustumFovy_rad >= Math.PI || view.cssHeight <= 0
      || view.drawingBufferHeight <= 0 || view.geometricError13_m < 0) return failed('Unsupported camera/projection dimensions.');
    const camera = scheme.ellipsoid.cartesianToCartographic(view.cameraPosition, new Cartographic());
    if (!camera) return failed('Camera has no finite geodetic projection.');
    const lon = camera.longitude + Math.round(((coverage.west + coverage.east) / 2 - camera.longitude) / (2 * Math.PI)) * 2 * Math.PI;
    if (lon < coverage.west || lon > coverage.east || camera.latitude < coverage.south || camera.latitude > coverage.north)
      return failed('Camera projection lies outside the current native window.');
    const distance = Math.sqrt(Math.min(...boxes.map(box => OrientedBoundingBox.distanceSquaredTo(box, view.cameraPosition))));
    // A closest unsupported point must cross the covered angular boundary. The
    // radial margin ensures that any shorter segment stays inside the envelope;
    // cached boundary OBBs therefore provide a conservative global lower bound.
    const margin = TERRAIN_RENDER_ENVELOPE_M - Math.abs(camera.height);
    if (!finite(distance) || distance <= 0 || distance >= margin) return failed('Camera/perimeter uncertainty does not admit a finite conservative distance.');
    const denominator = 2 * Math.tan(view.frustumFovy_rad / 2);
    const upper = view.geometricError13_m * Math.max(view.cssHeight, view.drawingBufferHeight) / (distance * denominator);
    const roundoff = Number.EPSILON * 32 * Math.max(1, upper);
    if (!finite(upper + roundoff)) return failed('Projection budget overflow.');
    const maximumScreenSpaceError = Math.max(base, upper + roundoff);
    const result: TerrainDetailBudget = { bounded: true, maximumScreenSpaceError,
      unsupportedDistanceLowerBound_m: distance, unsupportedSSEUpper: upper, parentCount };
    if (view.contactPosition && [view.contactPosition.x, view.contactPosition.y, view.contactPosition.z].every(finite)) {
      if (!finite(view.fogScreenSpaceErrorFactor!) || view.fogScreenSpaceErrorFactor! < 0) {
        return { ...result, contactRefines: false, reason: 'An explicit nonnegative public fog SSE factor is required for a contact-refinement bound.' };
      }
      const contactDistance = Cartesian3.distance(view.cameraPosition, view.contactPosition);
      // CesiumWidget scales its integer drawing buffer from CSS size. This
      // lower bound includes truncation of that positive pixel-ratio product.
      const effectiveHeightLower = view.cssHeight * view.drawingBufferHeight / (view.drawingBufferHeight + 1);
      // Quadtree subtracts fog(distance,density)*factor BEFORE dividing by the
      // widget pixel ratio. The fog term is at most factor. Canvas integer
      // truncation gives pixelRatio>=draw/css, hence loss<=factor*css/draw.
      // This deliberately uses the worst fog loss; no private frame density,
      // camera-angle approximation or optimistic zero-fog assumption is needed.
      const fogLossUpper = view.fogScreenSpaceErrorFactor! * (view.cssHeight / view.drawingBufferHeight);
      const lower = contactDistance > 0 ? view.geometricError13_m * effectiveHeightLower / (contactDistance * denominator) - fogLossUpper : Number.MAX_VALUE;
      if (!finite(fogLossUpper) || !finite(lower)) return { ...result, contactRefines: false, reason: 'Contact/fog refinement bound overflow.' };
      return { ...result, contactSSELower: lower, contactRefines: lower > maximumScreenSpaceError,
        ...(lower > maximumScreenSpaceError ? {} : { reason: 'This camera/contact geometry does not guarantee L14 contact refinement at the draining budget.' }) };
    }
    return result;
  } });
}
