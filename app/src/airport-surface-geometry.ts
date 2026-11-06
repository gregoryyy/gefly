import { AIRPORT_REGION_LIMITS, airportSurfaceDistance_m, type AirportCoordinate,
  type AirportSurfaceFeature } from './airport-region.ts';

const EARTH_M = 6371000, RAD = Math.PI / 180;
const wrap = (lon: number) => ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
export interface AirportSurfaceVertex { readonly lon_rad: number; readonly lat_rad: number; readonly ellipsoid_m: number }
export type AirportSurfacePolygon = readonly AirportSurfaceVertex[];
export interface AirportSurfaceGeometry {
  readonly polygons: readonly AirportSurfacePolygon[];
  readonly deferred: boolean; readonly truncated: boolean; readonly unsupported: boolean;
}
const result = (polygons: AirportSurfacePolygon[] = [], deferred = false, truncated = false, unsupported = false): AirportSurfaceGeometry => ({ polygons, deferred, truncated, unsupported });

/** Wrapped, bounded local strips for small source ways; height is never guessed. */
export function airportSurfaceGeometry(feature: AirportSurfaceFeature,
  sampleHeight: (lat_rad: number, lon_rad: number) => number | null, budget: number, offset_m = feature.kind === 'runway' ? .12 : feature.kind === 'taxiway' ? .08 : .04): AirportSurfaceGeometry {
  if (!Number.isInteger(budget) || budget < 1) return result([], false, true);
  const cs: readonly AirportCoordinate[] = feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0] : feature.geometry.coordinates;
  if (!cs || cs.length < 2 || cs.length > AIRPORT_REGION_LIMITS.maxFeaturePoints
    || cs.some(c => c.length !== 2 || !c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 89.5)) return result([], false, false, true);
  const vertex = (lon_rad: number, lat_rad: number): AirportSurfaceVertex | null => {
    lon_rad = wrap(lon_rad);
    if (!Number.isFinite(lat_rad) || Math.abs(lat_rad) > AIRPORT_REGION_LIMITS.maxLatitude * RAD) return null;
    const ellipsoid_m = sampleHeight(lat_rad, lon_rad);
    return ellipsoid_m !== null && Number.isFinite(ellipsoid_m) ? { lon_rad, lat_rad, ellipsoid_m: ellipsoid_m + offset_m } : null;
  };
  if (feature.geometry.type === 'Polygon') {
    const ring = cs.slice(0, -1).map(c => vertex(c[0] * RAD, c[1] * RAD));
    return ring.length >= 3 && ring.every(v => v !== null) ? result([ring as AirportSurfaceVertex[]]) : result([], true);
  }
  const width_m = feature.width_m ?? (feature.kind === 'runway' ? 25 : 12);
  if (!Number.isFinite(width_m) || width_m <= 0 || width_m > 200) return result([], false, false, true);
  const segments: { lon: number; lat: number; east: number; north: number; count: number; dx: number; dy: number }[] = [];
  let count = 0;
  // Preflight the complete allocation/travel budget before making any geometry.
  for (let i = 1; i < cs.length; i++) {
    if (airportSurfaceDistance_m(cs[0], cs[i]) > AIRPORT_REGION_LIMITS.maxExtent_m) return result([], false, false, true);
    const [a, b] = [cs[i - 1], cs[i]], lon = a[0] * RAD, lat = a[1] * RAD;
    const east = wrap((b[0] - a[0]) * RAD) * EARTH_M * Math.cos((a[1] + b[1]) / 2 * RAD);
    const north = (b[1] - a[1]) * RAD * EARTH_M, length = Math.hypot(east, north);
    if (!Number.isFinite(length) || length > AIRPORT_REGION_LIMITS.maxSegment_m || Math.cos(lat) < .008) return result([], false, false, true);
    if (length < .01) continue;
    const n = Math.ceil(length / 25); count += n;
    if (count > budget) return result([], false, true);
    segments.push({ lon, lat, east, north, count: n, dx: north / length * width_m / 2, dy: -east / length * width_m / 2 });
  }
  const polygons: AirportSurfacePolygon[] = [];
  for (const s of segments) {
    const at = (t: number, east: number, north: number) => vertex(s.lon + (s.east * t + east) / (EARTH_M * Math.cos(s.lat)), s.lat + (s.north * t + north) / EARTH_M);
    for (let i = 0; i < s.count; i++) {
      const ring = [at(i / s.count, -s.dx, -s.dy), at((i + 1) / s.count, -s.dx, -s.dy),
        at((i + 1) / s.count, s.dx, s.dy), at(i / s.count, s.dx, s.dy)];
      if (ring.some(v => v === null)) return result([], true);
      polygons.push(ring as AirportSurfaceVertex[]);
    }
  }
  return result(polygons);
}
