import { EDFE_REFERENCE, EDFE_RUNWAYS, airportLocal, airportOffset } from './airport-geometry.ts';

export type CircuitLegId = 'upwind' | 'crosswind' | 'downwind' | 'base' | 'final';
export interface CircuitGuide {
  runway: '08' | '26';
  direction: 'left' | 'right';
  /** MapLibre WGS84 [longitude, latitude], in degrees. */
  legs: readonly { id: CircuitLegId; label: string; start: [number, number]; end: [number, number] }[];
  bounds: [number, number, number, number];
}
const IDS: readonly CircuitLegId[] = ['upwind', 'crosswind', 'downwind', 'base', 'final'];
const LABELS = ['Upwind', 'Crosswind', 'Downwind', 'Base', 'Final'];
const EXTENSION_M = 1852, WIDTH_M = 1852, MAX_NEAREST_DISTANCE_M = 5000;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
function mapCoordinate(east_m: number, north_m: number): [number, number] {
  const point = airportOffset(EDFE_REFERENCE, east_m, north_m);
  const coordinate: [number, number] = [point.lon_rad * DEGREES_PER_RADIAN, point.lat_rad * DEGREES_PER_RADIAN];
  Object.freeze(coordinate); return coordinate;
}

/** Generated north-side guide, not a published circuit, navigation procedure or
 * assessment. Width and both extensions are instructional proposals of 1 NM.
 * No altitude, speed, obstacle clearance or noise-abatement path is implied.
 * The inherited runway approximation remains distinct from surveyed geometry.
 */
export function makePracticeCircuit(runway: '08' | '26'): CircuitGuide {
  const selected = EDFE_RUNWAYS.find(candidate => candidate.id === runway);
  if (!selected) throw new RangeError('Circuit guide supports EDFE runway 08 or 26.');
  const threshold = airportLocal(selected), h = selected.heading_true_rad;
  const east = Math.sin(h), north = Math.cos(h), side = runway === '26' ? 1 : -1;
  const sideEast = Math.cos(h) * side, sideNorth = -Math.sin(h) * side;
  const departureDistance = selected.length_m - selected.displaced_threshold_m + EXTENSION_M;
  const departure = { east_m: threshold.east_m + east * departureDistance,
    north_m: threshold.north_m + north * departureDistance };
  const finalStart = { east_m: threshold.east_m - east * EXTENSION_M,
    north_m: threshold.north_m - north * EXTENSION_M };
  const points = [threshold, departure,
    { east_m: departure.east_m + sideEast * WIDTH_M, north_m: departure.north_m + sideNorth * WIDTH_M },
    { east_m: finalStart.east_m + sideEast * WIDTH_M, north_m: finalStart.north_m + sideNorth * WIDTH_M },
    finalStart, threshold].map(point => mapCoordinate(point.east_m, point.north_m));
  const legs = IDS.map((id, index) => Object.freeze({ id, label: LABELS[index], start: points[index], end: points[index + 1] }));
  const bounds: CircuitGuide['bounds'] = [Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[1])),
    Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[1]))];
  Object.freeze(bounds);
  return Object.freeze({ runway, direction: runway === '26' ? 'right' : 'left', legs: Object.freeze(legs), bounds });
}

function validCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && finite(value[0]) && finite(value[1])
    && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

/** Nearest finite segment only. It does not infer the current flight phase,
 * advance through a lesson, judge handling or direct the autopilot. At a shared
 * endpoint ties use the earlier leg in guide order. Positions use SI radians.
 */
export function locateOnCircuit(guide: CircuitGuide, position: { lat_rad: number; lon_rad: number }): { legId: CircuitLegId; distance_m: number } | null {
  if (!position || !finite(position.lat_rad) || !finite(position.lon_rad)
      || Math.abs(position.lat_rad) > Math.PI / 2 || Math.abs(position.lon_rad) > Math.PI
      || !guide || (guide.runway !== '08' && guide.runway !== '26')
      || guide.direction !== (guide.runway === '26' ? 'right' : 'left')
      || !Array.isArray(guide.legs) || guide.legs.length !== IDS.length) return null;
  const point = airportLocal(position);
  let nearest: { legId: CircuitLegId; distance_m: number } | null = null;
  for (let index = 0; index < guide.legs.length; index++) {
    const leg = guide.legs[index];
    if (!leg || leg.id !== IDS[index] || !validCoordinate(leg.start) || !validCoordinate(leg.end)) return null;
    const start = airportLocal({ lon_rad: leg.start[0] / DEGREES_PER_RADIAN, lat_rad: leg.start[1] / DEGREES_PER_RADIAN });
    const end = airportLocal({ lon_rad: leg.end[0] / DEGREES_PER_RADIAN, lat_rad: leg.end[1] / DEGREES_PER_RADIAN });
    const east = end.east_m - start.east_m, north = end.north_m - start.north_m;
    const lengthSquared = east * east + north * north;
    if (!finite(lengthSquared) || lengthSquared <= 0) return null;
    const fraction = Math.max(0, Math.min(1, ((point.east_m - start.east_m) * east + (point.north_m - start.north_m) * north) / lengthSquared));
    const distance_m = Math.hypot(point.east_m - start.east_m - fraction * east, point.north_m - start.north_m - fraction * north);
    if (!finite(distance_m)) return null;
    // Degree/radian conversion can separate mathematically equal endpoint
    // distances by floating-point crumbs. A micrometre tie is numerical only.
    if (nearest === null || distance_m < nearest.distance_m - 1e-6) nearest = { legId: leg.id, distance_m };
  }
  return nearest !== null && nearest.distance_m <= MAX_NEAREST_DISTANCE_M ? nearest : null;
}
