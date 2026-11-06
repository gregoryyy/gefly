import { airportSurfaceDistance_m, type AirportCoordinate, type AirportSurfaceFeature } from './airport-region.ts';
import { airportSurfaceGeometry, type AirportSurfacePolygon } from './airport-surface-geometry.ts';

const R = 6371000, RAD = Math.PI / 180;
const wrap = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;
export interface GenericPapi {
  readonly location: AirportCoordinate; readonly heading_rad: number;
  readonly threshold: AirportCoordinate;
}
/** Generic practice-unit sightline, measured to the actual light rather than threshold. */
export function genericPapiAngle_deg(head: GenericPapi, aircraft: { lat_rad: number; lon_rad: number; ground_height_ellipsoid_m?: number }, receiver_m: number | null): number | null {
  if (receiver_m === null || ![receiver_m, aircraft.lat_rad, aircraft.lon_rad, aircraft.ground_height_ellipsoid_m].every(Number.isFinite)) return null;
  const delta = (origin: AirportCoordinate) => {
    const lon = (aircraft.lon_rad - origin[0] * RAD + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    return [lon * R * Math.cos(origin[1] * RAD), (aircraft.lat_rad - origin[1] * RAD) * R];
  };
  const [east, north] = delta(head.threshold);
  const along = east * Math.sin(head.heading_rad) + north * Math.cos(head.heading_rad);
  const cross = east * Math.cos(head.heading_rad) - north * Math.sin(head.heading_rad);
  if (along >= 0 || along <= -6300 || Math.abs(Math.atan2(cross, -along)) >= 10 * RAD) return null;
  const [lightEast, lightNorth] = delta(head.location);
  return Math.atan2(aircraft.ground_height_ellipsoid_m! - receiver_m - .8, Math.hypot(lightEast, lightNorth)) / RAD;
}
/** Generic visual paint/PAPI layout, not surveyed threshold or installed equipment. */
export function airportSurfaceMarkings(feature: AirportSurfaceFeature,
  sample: (lat: number, lon: number) => number | null, budget: number) {
  const polygons: AirportSurfacePolygon[] = [], papi: GenericPapi[] = [];
  if (feature.kind === 'apron' || !/^(asphalt|concrete(?::[^;]+)?|paved|paving_stones)$/i.test(feature.surface)) return { polygons, papi };
  const ring = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0].slice(0, -1) : feature.geometry.coordinates;
  if (ring.length < 2) return { polygons, papi };
  const origin = ring[0], cosine = Math.cos(origin[1] * RAD);
  if (cosine < .008) return { polygons, papi };
  const local = (c: AirportCoordinate) => [wrap(c[0] - origin[0]) * RAD * R * cosine, (c[1] - origin[1]) * RAD * R];
  const toPoint = (east: number, north: number): AirportCoordinate => [wrap(origin[0] + east / (R * cosine) / RAD), origin[1] + north / R / RAD];
  let start = ring[0], end = ring.at(-1)!, width = feature.width_m ?? (feature.kind === 'runway' ? 25 : 12);
  if (feature.geometry.type === 'Polygon') {
    const ps = ring.map(local), center = ps.reduce((s, p) => [s[0] + p[0] / ps.length, s[1] + p[1] / ps.length], [0, 0]);
    let xx = 0, yy = 0, xy = 0;
    for (const p of ps) { const x = p[0] - center[0], y = p[1] - center[1]; xx += x * x; yy += y * y; xy += x * y; }
    const angle = .5 * Math.atan2(2 * xy, xx - yy), dx = Math.cos(angle), dy = Math.sin(angle);
    let min = Infinity, max = -Infinity, sideMin = Infinity, sideMax = -Infinity;
    for (const p of ps) { const x = p[0] - center[0], y = p[1] - center[1], along = x * dx + y * dy, side = -x * dy + y * dx;
      min = Math.min(min, along); max = Math.max(max, along); sideMin = Math.min(sideMin, side); sideMax = Math.max(sideMax, side); }
    if (max - min < 50 || sideMax - sideMin > 200) return { polygons, papi };
    start = toPoint(center[0] + min * dx, center[1] + min * dy); end = toPoint(center[0] + max * dx, center[1] + max * dy);
    width = feature.width_m ?? sideMax - sideMin;
  }
  const [a, b] = [local(start), local(end)], length = airportSurfaceDistance_m(start, end);
  if (length < 50 || length > 10000 || width < 6 || width > 200) return { polygons, papi };
  const dx = (b[0] - a[0]) / length, dy = (b[1] - a[1]) / length;
  const at = (along: number, side = 0) => toPoint(a[0] + dx * along - dy * side, a[1] + dy * along + dx * side);
  const paint = (p: AirportCoordinate, q: AirportCoordinate, stripeWidth: number) => {
    if (polygons.length >= budget) return;
    const shape: AirportSurfaceFeature = { ...feature, kind: 'runway', width_m: stripeWidth,
      geometry: { type: 'LineString', coordinates: [p, q] } };
    polygons.push(...airportSurfaceGeometry(shape, sample, budget - polygons.length, .18).polygons);
  };
  if (feature.kind === 'taxiway') {
    // Follow the complete source centre line, including curves.
    if (feature.geometry.type === 'LineString') for (let i = 1; i < ring.length; i++) paint(ring[i - 1], ring[i], .2);
    return { polygons, papi };
  }
  // CS ADR-DSN.L.530: 30m stripes / 30m gaps, 60m combined period.
  for (let d = 30; d < length - 30 && polygons.length < budget; d += 60) paint(at(d), at(Math.min(d + 30, length - 30)), .9);
  for (const side of [-1, 1]) paint(at(0, side * (width / 2 - .45)), at(length, side * (width / 2 - .45)), .9);
  for (const endOffset of [10, length - 10]) paint(at(endOffset, -width / 2 + 1), at(endOffset, width / 2 - 1), 1.8);
  if (length >= 1200 && width >= 23) for (const direction of [1, -1]) {
    const threshold = at(direction > 0 ? 0 : length), along = direction > 0 ? 300 : length - 300;
    for (let i = 0; i < 4; i++) papi.push({ location: at(along, direction * (width / 2 + 15 + i * 8)),
      threshold, heading_rad: Math.atan2(dx * direction, dy * direction) });
  }
  return { polygons: polygons.slice(0, budget), papi };
}
