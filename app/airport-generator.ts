import {
  AIRPORT_REGION_ENDPOINT, AIRPORT_REGION_LIMITS, airportRegionBounds, airportRegionId,
  airportSourceTime, validateAirportRegion,
  type AirportRegionKey, type AirportRegionPackage, type AirportSurfaceFeature,
} from './src/airport-region.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const kinds = ['runway', 'taxiway', 'apron'] as const;

/** Fixed read-only query. Callers supply a validated grid key, never query text. */
export function airportRegionQuery(key: AirportRegionKey): string {
  const [west, south, east, north] = airportRegionBounds(key);
  return `[out:json][timeout:25][maxsize:8388608];way["aeroway"~"^(runway|taxiway|apron)$"](${south},${west},${north},${east});out meta geom;`;
}

function widthMetres(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?(?:\s*m)?$/.test(text)) return undefined;
  const width = Number(text.replace(/\s*m$/, ''));
  return Number.isFinite(width) && width >= 1 && width <= 200 ? width : undefined;
}

/** Compile only supplied source geometry; missing classes remain absent.
 * Raw mapper identities, changesets and unrelated tags never enter the result.
 */
export function compileAirportRegion(raw: unknown, key: AirportRegionKey, sourceSha: string,
  generatedAt: string): AirportRegionPackage {
  const bounds = airportRegionBounds(key);
  if (!record(raw) || Object.hasOwn(raw, 'remark') || !Array.isArray(raw.elements)
    || raw.elements.length > 30000 || !record(raw.osm3s) || !airportSourceTime(raw.osm3s.timestamp_osm_base)
    || !airportSourceTime(generatedAt) || !/^[a-f0-9]{64}$/.test(sourceSha)) {
    throw new Error('Incomplete or invalid airport source response');
  }
  const base = { version: 1 as const, id: airportRegionId(key), x: key.x, y: key.y, bounds,
    generated_at: generatedAt, source: { endpoint: AIRPORT_REGION_ENDPOINT,
      osm_base: raw.osm3s.timestamp_osm_base, sha256: sourceSha } };
  const features: AirportSurfaceFeature[] = [];
  const seen = new Set<string>();
  let rejected = 0, points = 0;
  for (const element of raw.elements) {
    if (!record(element) || element.type !== 'way' || !Number.isSafeInteger(element.id) || (element.id as number) < 1) {
      rejected++; continue;
    }
    const id = `osm/way/${element.id}`;
    if (seen.has(id)) throw new Error('Duplicate airport source identity');
    seen.add(id);
    const tags = element.tags;
    if (!record(tags) || !kinds.includes(tags.aeroway as typeof kinds[number])
      || !Array.isArray(element.geometry) || element.geometry.length < 2
      || element.geometry.length > AIRPORT_REGION_LIMITS.maxFeaturePoints) {
      rejected++; continue;
    }
    const coordinates = element.geometry.map(point => record(point) ? [point.lon, point.lat] : []);
    const closed = coordinates.length >= 4 && coordinates[0][0] === coordinates.at(-1)![0]
      && coordinates[0][1] === coordinates.at(-1)![1];
    const polygon = closed && tags.area !== 'no' && (tags.aeroway !== 'taxiway' || tags.area === 'yes');
    const width = widthMetres(tags.width);
    const candidate = { id, kind: tags.aeroway, version: element.version, timestamp: element.timestamp,
      surface: typeof tags.surface === 'string' ? tags.surface.slice(0, 64) : '',
      ref: typeof tags.ref === 'string' ? tags.ref.slice(0, 64) : '',
      ...(width === undefined ? {} : { width_m: width }),
      geometry: { type: polygon ? 'Polygon' : 'LineString', coordinates: polygon ? [coordinates] : coordinates } };
    let feature: AirportSurfaceFeature;
    try { feature = validateAirportRegion({ ...base, rejected: 0, features: [candidate] }, key).features[0]; }
    catch { rejected++; continue; }
    points += coordinates.length;
    if (features.length >= AIRPORT_REGION_LIMITS.maxFeatures || points > AIRPORT_REGION_LIMITS.maxPoints) {
      throw new Error('Airport source exceeds geometry budget');
    }
    features.push(feature);
  }
  features.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const result = validateAirportRegion({ ...base, rejected, features }, key);
  if (Buffer.byteLength(JSON.stringify(result)) > AIRPORT_REGION_LIMITS.maxBytes) throw new Error('Airport package exceeds byte budget');
  return result;
}
