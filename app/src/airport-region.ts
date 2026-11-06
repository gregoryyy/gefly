/** Versioned, visual-only OSM ground surfaces. No contact or navigation authority. */
export const AIRPORT_REGION_ENDPOINT = 'https://overpass.private.coffee/api/interpreter';
export const AIRPORT_REGION_LIMITS = Object.freeze({ maxFeatures: 2000, maxPoints: 30000,
  maxFeaturePoints: 1500, maxBytes: 2 * 1024 * 1024, maxSourceBytes: 8 * 1024 * 1024,
  maxSegment_m: 10000, maxExtent_m: 20000, maxLatitude: 89.5 });
export interface AirportRegionKey { readonly x: number; readonly y: number }
export type AirportCoordinate = readonly [number, number]; // longitude, latitude, degrees
export interface AirportSurfaceFeature {
  readonly id: string;
  readonly kind: 'runway' | 'taxiway' | 'apron';
  readonly geometry: { readonly type: 'LineString'; readonly coordinates: readonly AirportCoordinate[] }
    | { readonly type: 'Polygon'; readonly coordinates: readonly (readonly AirportCoordinate[])[] };
  readonly version: number; readonly timestamp: string;
  readonly surface: string; readonly ref: string; readonly width_m?: number;
}
export interface AirportRegionPackage extends AirportRegionKey {
  readonly version: 1; readonly id: string;
  readonly bounds: readonly [number, number, number, number]; // west, south, east, north
  readonly generated_at: string;
  readonly source: { readonly endpoint: string; readonly osm_base: string; readonly sha256: string };
  readonly rejected: number;
  readonly features: readonly AirportSurfaceFeature[];
}
export function validAirportRegionKey(key: AirportRegionKey): boolean {
  return !!key && Number.isInteger(key.x) && key.x >= 0 && key.x < 720
    && Number.isInteger(key.y) && key.y >= 0 && key.y < 360;
}
export function airportRegionAt(lon_deg: number, lat_deg: number): AirportRegionKey | null {
  if (!Number.isFinite(lon_deg) || !Number.isFinite(lat_deg) || lon_deg < -180 || lon_deg > 180
    || Math.abs(lat_deg) >= AIRPORT_REGION_LIMITS.maxLatitude) return null;
  return { x: Math.floor(((lon_deg + 180) % 360) * 2), y: Math.floor((lat_deg + 90) * 2) };
}
export function airportRegionBounds(key: AirportRegionKey): readonly [number, number, number, number] {
  if (!validAirportRegionKey(key)) throw Error('Invalid airport region');
  return [key.x / 2 - 180, key.y / 2 - 90, (key.x + 1) / 2 - 180, (key.y + 1) / 2 - 90];
}
export function airportRegionId(key: AirportRegionKey): string {
  if (!validAirportRegionKey(key)) throw Error('Invalid airport region');
  return `airport-osm-v1/${key.x}/${key.y}`;
}
export function airportRegionUrl(key: AirportRegionKey): string {
  if (!validAirportRegionKey(key)) throw Error('Invalid airport region');
  return `/scenery/airports/v1/${key.x}/${key.y}.json`;
}
export function airportSurfaceDistance_m(a: readonly number[], b: readonly number[]): number {
  const rad = Math.PI / 180, lat1 = a[1] * rad, lat2 = b[1] * rad;
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: object, allowed: readonly string[]) => Object.keys(v).every(key => allowed.includes(key));
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
export function airportSourceTime(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v.replace('Z', '.000Z');
}
export function validateAirportRegion(value: unknown, expected?: AirportRegionKey): AirportRegionPackage {
  const invalid = () => new Error('Invalid airport ground region');
  if (!record(value) || !keys(value, ['version', 'id', 'x', 'y', 'bounds', 'generated_at', 'source', 'rejected', 'features'])
    || value.version !== 1 || !validAirportRegionKey(value as unknown as AirportRegionKey)
    || (expected && (value.x !== expected.x || value.y !== expected.y))
    || value.id !== airportRegionId(value as unknown as AirportRegionKey)
    || JSON.stringify(value.bounds) !== JSON.stringify(airportRegionBounds(value as unknown as AirportRegionKey))
    || !airportSourceTime(value.generated_at) || !record(value.source)
    || !keys(value.source, ['endpoint', 'osm_base', 'sha256']) || value.source.endpoint !== AIRPORT_REGION_ENDPOINT
    || !airportSourceTime(value.source.osm_base) || typeof value.source.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.source.sha256)
    || !Number.isInteger(value.rejected) || (value.rejected as number) < 0 || (value.rejected as number) > 30000
    || !Array.isArray(value.features) || value.features.length > AIRPORT_REGION_LIMITS.maxFeatures) throw invalid();
  const bounds = airportRegionBounds(value as unknown as AirportRegionKey);
  const ids = new Set<string>(); let points = 0;
  const features: AirportSurfaceFeature[] = [];
  for (const feature of value.features) {
    if (!record(feature) || !keys(feature, ['id', 'kind', 'geometry', 'version', 'timestamp', 'surface', 'ref', 'width_m'])
      || typeof feature.id !== 'string' || !/^osm\/way\/[1-9]\d{0,15}$/.test(feature.id) || ids.has(feature.id)
      || !['runway', 'taxiway', 'apron'].includes(feature.kind as string)
      || !Number.isSafeInteger(feature.version) || (feature.version as number) < 1
      || !airportSourceTime(feature.timestamp) || !text(feature.surface, 64) || !text(feature.ref, 64)
      || (feature.width_m !== undefined && (typeof feature.width_m !== 'number' || !Number.isFinite(feature.width_m) || feature.width_m < 1 || feature.width_m > 200))
      || !record(feature.geometry) || !keys(feature.geometry, ['type', 'coordinates'])) throw invalid();
    const g = feature.geometry;
    const polygon = g.type === 'Polygon';
    if (!polygon && g.type !== 'LineString' || feature.kind === 'apron' && !polygon) throw invalid();
    const cs = polygon ? Array.isArray(g.coordinates) && g.coordinates.length === 1 ? g.coordinates[0] : null : g.coordinates;
    if (!Array.isArray(cs) || cs.length < (polygon ? 4 : 2) || cs.length > AIRPORT_REGION_LIMITS.maxFeaturePoints) throw invalid();
    let inside = false;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!Array.isArray(c) || c.length !== 2 || !c.every(v => typeof v === 'number' && Number.isFinite(v))
        || Math.abs(c[0]) > 180 || Math.abs(c[1]) > AIRPORT_REGION_LIMITS.maxLatitude) throw invalid();
      inside ||= c[0] >= bounds[0] && c[0] <= bounds[2] && c[1] >= bounds[1] && c[1] <= bounds[3];
      if (i > 0 && airportSurfaceDistance_m(cs[i - 1], c) > AIRPORT_REGION_LIMITS.maxSegment_m
        || airportSurfaceDistance_m(cs[0], c) > AIRPORT_REGION_LIMITS.maxExtent_m) throw invalid();
    }
    if (!inside || polygon && (cs[0][0] !== cs.at(-1)[0] || cs[0][1] !== cs.at(-1)[1])) throw invalid();
    points += cs.length; if (points > AIRPORT_REGION_LIMITS.maxPoints) throw invalid();
    ids.add(feature.id);
    const copied = cs.map(c => Object.freeze([c[0], c[1]]) as AirportCoordinate);
    features.push(Object.freeze({ ...feature, geometry: Object.freeze({ type: g.type,
      coordinates: polygon ? Object.freeze([Object.freeze(copied)]) : Object.freeze(copied) }) }) as AirportSurfaceFeature);
  }
  return Object.freeze({ ...value, bounds: Object.freeze([...bounds]), source: Object.freeze({ ...value.source }),
    features: Object.freeze(features) }) as unknown as AirportRegionPackage;
}
