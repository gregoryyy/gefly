import type { FlightMapNavigation, FlightMapNavigationFeature } from './flight-map-navigation';

const PACKAGE = 'southern-germany-map-navigation-v1';
const BOUNDS = [6, 47, 14, 51.75];
const MAX_BYTES = 1000000;
const OA_SHA = 'd7292380662c33a95214945023ec0a5b13189599305fd18be739e167a97a9bd1';
const FG_SHA = '24cfae74114d43586a5816029bb2ddeeeb1a0b6b4472b4ce775d7d748898b839';
const SOURCES = [
  { id: 'ourairports', sha256: OA_SHA, edition: '2026-11-02 snapshot', historical: false,
    label: 'OurAirports snapshot 2026-11-02; service status unverified' },
  { id: 'nav810', sha256: FG_SHA, edition: '2013.10', historical: true,
    label: 'Robin A. Peel / FlightGear NAV 2013.10; historical' },
] as const;
const OA_KINDS = ['NDB', 'NDB-DME', 'VOR', 'VOR-DME', 'VORTAC', 'DME', 'TACAN'];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 200): value is string => typeof value === 'string' && value.length <= max;
const whole = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const fail = (): never => { throw new Error('Invalid map navigation catalogue'); };

async function bytes(response: Response, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > limit) throw new Error('Map navigation response unavailable or oversized');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Map navigation response oversized');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

/**
 * R-WORLD-6 / R-NAV-3: fixed map-only package, separate from receiver/worker data.
 * No manifest URL is followed. Bounded same-origin reads verify bytes and source
 * identities before rendering text; all points use WGS84 longitude/latitude.
 * Snapshot/historical data does not establish current services or procedures.
 */
export async function loadFlightMapCatalogue(signal?: AbortSignal): Promise<FlightMapNavigation> {
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const options = { signal: requestSignal, redirect: 'error' as const };
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const manifest: unknown = JSON.parse(decoder.decode(await bytes(await fetch('/mapdata/manifest.json', options), 8192)));
  if (!object(manifest) || manifest.schema !== 1 || manifest.id !== PACKAGE || manifest.asset !== 'southern-germany-v1.json'
    || !Array.isArray(manifest.bounds) || manifest.bounds.length !== 4 || !manifest.bounds.every((item, index) => item === BOUNDS[index])
    || !whole(manifest.count, 1, 1000) || !whole(manifest.station_count, 1, 1000) || manifest.station_count > manifest.count
    || !whole(manifest.bytes, 2, MAX_BYTES) || typeof manifest.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.sha256)
    || !Array.isArray(manifest.sources) || manifest.sources.length !== SOURCES.length
    || !manifest.sources.every((source: unknown, index: number) => object(source) && Object.entries(SOURCES[index]).every(([key, value]) => source[key] === value))
    || !object(manifest.counts_by_source) || !object(manifest.counts_by_component)) return fail();
  const raw = await bytes(await fetch('/mapdata/southern-germany-v1.json', options), MAX_BYTES);
  if (raw.byteLength !== manifest.bytes) throw new Error('Map navigation size mismatch');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (hash !== manifest.sha256) throw new Error('Map navigation hash mismatch');
  const data: unknown = JSON.parse(decoder.decode(raw));
  if (!object(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length !== manifest.count) return fail();
  const ids = new Set<string>();
  const stations = new Map<string, Record<string, unknown>>();
  const components: Record<string, number> = { station: 0, GS: 0, DME: 0 };
  const sourceCounts: Record<string, number> = { ourairports: 0, nav810: 0 };
  const features = data.features.map((item: unknown): FlightMapNavigationFeature => {
    if (!object(item) || item.type !== 'Feature' || !text(item.id, 300) || !item.id || ids.has(item.id)
      || !object(item.geometry) || item.geometry.type !== 'Point' || !Array.isArray(item.geometry.coordinates)
      || item.geometry.coordinates.length !== 2 || !item.geometry.coordinates.every(value => typeof value === 'number' && Number.isFinite(value))
      || item.geometry.coordinates[0] < BOUNDS[0] || item.geometry.coordinates[0] > BOUNDS[2]
      || item.geometry.coordinates[1] < BOUNDS[1] || item.geometry.coordinates[1] > BOUNDS[3]
      || !object(item.properties)) return fail();
    const p = item.properties;
    const source = SOURCES.find(source => source.sha256 === p.source_sha256);
    if (!source || p.package_id !== PACKAGE || p.edition !== source.edition || p.historical !== source.historical || p.source_label !== source.label
      || !text(p.station_uid, 250) || !p.station_uid || !text(p.identifier, 40) || !p.identifier || !text(p.name) || !p.name
      || !text(p.kind, 20) || !(source.id === 'ourairports' ? OA_KINDS.includes(p.kind) : p.kind === 'LOC')
      || !['station', 'GS', 'DME'].includes(p.component as string) || !text(p.equipment, 20)
      || !text(p.frequency_label, 30) || !text(p.frequency_mhz, 20) || !text(p.airport_runway)
      || !(p.elevation_m === null || typeof p.elevation_m === 'number' && Number.isFinite(p.elevation_m) && p.elevation_m >= -1000 && p.elevation_m <= 10000)
      || !Array.isArray(p.source_line_ids) || p.source_line_ids.length > 10 || !p.source_line_ids.every(value => whole(value, 1, 1000000))
      || new Set(p.source_line_ids).size !== p.source_line_ids.length
      || (source.id === 'ourairports' ? p.source_line_ids.length !== 0 || !/^oa-\d+$/.test(p.station_uid) || p.component === 'GS'
        : p.source_line_ids.length === 0 || !/^nav810-\d+$/.test(p.station_uid))
      || item.id !== `${p.station_uid}/${p.component}`) return fail();
    const ndb = p.component === 'station' && p.kind.startsWith('NDB');
    const frequency = Number(p.frequency_label.split(' ')[0]);
    if (ndb ? !/^\d+(?:\.\d+)? kHz$/.test(p.frequency_label) || frequency < 100 || frequency > 2000 || p.frequency_mhz !== ''
      : !/^\d{3}\.\d{2} MHz$/.test(p.frequency_label) || frequency < 100 || frequency > 130 || p.frequency_mhz !== frequency.toFixed(2)) return fail();
    if (source.id === 'ourairports'
      ? ![p.kind, 'DME'].includes(p.equipment) || p.component === 'station' && p.equipment !== p.kind
      : !['LOC', 'ILS', 'LOC/DME', 'ILS/DME'].includes(p.equipment)) return fail();
    ids.add(item.id); components[p.component as string]++;
    if (p.component === 'station') {
      if (stations.has(p.station_uid)) return fail();
      stations.set(p.station_uid, p); sourceCounts[source.id]++;
    }
    return item as unknown as FlightMapNavigationFeature;
  });
  for (const feature of features) {
    const p = feature.properties, parent = stations.get(p.station_uid);
    if (!parent || parent.source_sha256 !== p.source_sha256 || parent.identifier !== p.identifier || parent.kind !== p.kind
      || parent.edition !== p.edition || parent.airport_runway !== p.airport_runway) return fail();
  }
  if (stations.size !== manifest.station_count
    || !Object.entries(sourceCounts).every(([key, value]) => (manifest.counts_by_source as Record<string, unknown>)[key] === value)
    || !Object.entries(components).every(([key, value]) => (manifest.counts_by_component as Record<string, unknown>)[key] === value)) return fail();
  return { type: 'FeatureCollection', features };
}
