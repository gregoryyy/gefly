import { WORLD_AIRPORT_LIMITS as LIMITS, type WorldAirport, type WorldAirportCell,
  type WorldAirportCounts, type WorldAirportManifest, type WorldNavaid, type WorldRunway,
  type WorldRunwayEnd, type WorldSearchHit } from './world-airport-contract.ts';
import type { AirportComStation } from './airport-com.ts';

const TYPES = new Set(['small_airport', 'medium_airport', 'large_airport', 'heliport', 'seaplane_base', 'balloonport', 'closed']);
const FILES = ['airports.csv', 'runways.csv', 'airport-frequencies.csv', 'navaids.csv'];
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;
const nonempty = (v: unknown, max = 200): v is string => text(v, max) && v.length > 0;
const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const number = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const nullable = (v: unknown, min: number, max: number): v is number | null => v === null || number(v, min, max);
const sha = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const country = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{2}$/.test(v);
const sourceId = (v: unknown): v is string => typeof v === 'string' && /^\d{1,15}$/.test(v);
const fail = (kind: string): never => { throw new Error(`Invalid worldwide ${kind}`); };

/** Deterministic five-degree ownership; longitude +180 belongs to -180. */
export function worldAirportCellId(lon: number, lat: number): string {
  if (!number(lon, -180, 180) || !number(lat, -90, 90)) return fail('position');
  return `${Math.floor(((lon + 180) % 360) / 5)}-${Math.min(35, Math.floor((lat + 90) / 5))}`;
}
export function validWorldAirportCellId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const match = /^(\d+)-(\d+)$/.exec(id);
  if (!match) return false;
  const x = Number(match[1]), y = Number(match[2]);
  return integer(x, 0, 71) && integer(y, 0, 35) && id === `${x}-${y}`;
}
export function nearbyWorldAirportCells(id: string): string[] {
  if (!validWorldAirportCellId(id)) return fail('cell identity');
  const [x, y] = id.split('-').map(Number), cells = [id];
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    if (y + dy >= 0 && y + dy <= 35) cells.push(`${(x + dx + 72) % 72}-${y + dy}`);
  }
  return cells;
}

function counts(v: unknown, total = false): WorldAirportCounts {
  if (!object(v)) return fail('counts');
  const result = {} as WorldAirportCounts;
  for (const key of ['airports', 'runways', 'com', 'navaids'] as const) {
    if (!integer(v[key], 0, total ? 1_000_000 : LIMITS[key])) return fail('counts');
    result[key] = v[key];
  }
  return result;
}
/** Small JSON root pins the opaque, schema-validated bulk catalogue bytes. */
export function validateWorldAirportDescriptor(input: unknown): { bytes: number; sha256: string } {
  if (!object(input) || input.schema !== 1 || input.id !== 'ourairports-world-catalogue-v1'
    || input.path !== 'catalogue.bin' || !integer(input.bytes, 2, LIMITS.manifestBytes) || !sha(input.sha256)) return fail('catalogue descriptor');
  return { bytes: input.bytes, sha256: input.sha256 };
}
export function validateWorldAirportManifest(input: unknown): WorldAirportManifest {
  if (!object(input) || input.schema !== 1 || input.id !== 'ourairports-world-v1' || input.cell_degrees !== 5
    || typeof input.source_commit !== 'string' || !/^[a-f0-9]{40}$/.test(input.source_commit)
    || typeof input.retrieved !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.retrieved)
    || !nonempty(input.source) || !nonempty(input.source_url, 500) || input.source_terms !== 'https://ourairports.com/data/'
    || !object(input.source_files) || Object.keys(input.source_files).sort().join() !== FILES.slice().sort().join()
    || !object(input.rejections) || Object.keys(input.rejections).length > 100 || !object(input.search) || !object(input.cells)
    || Object.keys(input.cells).length > 72 * 36) return fail('manifest');
  for (const name of FILES) {
    const file = input.source_files[name];
    if (!object(file) || !integer(file.bytes, 1, 100_000_000) || !sha(file.sha256) || !integer(file.rows, 0, 1_000_000)) return fail('source provenance');
  }
  for (const [name, value] of Object.entries(input.rejections)) {
    if (!/^[a-z0-9_./-]{1,100}$/i.test(name) || !integer(value, 0, 10_000_000)) return fail('rejections');
  }
  const search = input.search;
  if (search.path !== 'search.bin' || !integer(search.bytes, 1, LIMITS.searchBytes) || !sha(search.sha256)
    || !integer(search.expanded_bytes, 2, LIMITS.searchExpandedBytes) || !sha(search.expanded_sha256)
    || !integer(search.count, 0, LIMITS.searchEntries)) return fail('search manifest');
  const sum: WorldAirportCounts = { airports: 0, runways: 0, com: 0, navaids: 0 };
  for (const [id, value] of Object.entries(input.cells)) {
    if (!validWorldAirportCellId(id) || !object(value) || !integer(value.bytes, 2, LIMITS.cellBytes) || !sha(value.sha256)) return fail('cell manifest');
    const c = counts(value.counts);
    if (!c.airports && !c.navaids) return fail('empty manifest cell');
    for (const key of ['airports', 'runways', 'com', 'navaids'] as const) sum[key] += c[key];
  }
  const total = counts(input.counts, true);
  if (!Object.keys(sum).every(key => sum[key as keyof WorldAirportCounts] === total[key as keyof WorldAirportCounts])
    || search.count !== total.airports + total.navaids) return fail('manifest totals');
  return input as unknown as WorldAirportManifest;
}

function airport(input: unknown, cell: string): WorldAirport {
  if (!object(input) || !nonempty(input.id) || !sourceId(input.source_id) || !nonempty(input.name) || !TYPES.has(String(input.type))
    || !text(input.icao) || !text(input.local) || !country(input.iso_country) || !nonempty(input.iso_region)
    || !number(input.lat, -90, 90) || !number(input.lon, -180, 180) || worldAirportCellId(input.lon, input.lat) !== cell
    || !nullable(input.elevation_ft, -5000, 100000)) return fail('airport');
  return { id: input.id, source_id: input.source_id, name: input.name, type: input.type as string, icao: input.icao, local: input.local,
    iso_country: input.iso_country, iso_region: input.iso_region, lat: input.lat, lon: input.lon, elevation_ft: input.elevation_ft };
}
function runwayEnd(v: unknown): WorldRunwayEnd {
  if (!object(v) || !text(v.ident, 40) || !nullable(v.lat, -90, 90) || !nullable(v.lon, -180, 180)
    || !nullable(v.elevation_ft, -5000, 100000) || !nullable(v.heading_degT, 0, 360) || !nullable(v.displaced_threshold_ft, 0, 100000)) return fail('runway end');
  return { ident: v.ident, lat: v.lat, lon: v.lon, elevation_ft: v.elevation_ft, heading_degT: v.heading_degT, displaced_threshold_ft: v.displaced_threshold_ft };
}
function runway(v: unknown, airports: ReadonlySet<string>): WorldRunway {
  if (!object(v) || !nonempty(v.id) || !sourceId(v.source_id) || !nonempty(v.airport_id) || !airports.has(v.airport_id)
    || !nullable(v.length_ft, 0, 100000) || !nullable(v.width_ft, 0, 100000) || !text(v.surface)
    || typeof v.lighted !== 'boolean' || typeof v.closed !== 'boolean') return fail('runway');
  return { id: v.id, source_id: v.source_id, airport_id: v.airport_id, length_ft: v.length_ft, width_ft: v.width_ft,
    surface: v.surface, lighted: v.lighted, closed: v.closed, le: runwayEnd(v.le), he: runwayEnd(v.he) };
}
function com(v: unknown, airports: ReadonlySet<string>): AirportComStation {
  if (!object(v) || !nonempty(v.id) || !nonempty(v.airport_id) || !airports.has(v.airport_id) || !text(v.service) || !text(v.description)
    || !integer(v.channel_khz, 0, 10_000_000) || typeof v.source_frequency_mhz !== 'string'
    || !/^\d{1,5}(?:\.\d{1,9})?$/.test(v.source_frequency_mhz)
    || Math.round(Number(v.source_frequency_mhz) * 1000) !== v.channel_khz) return fail('COM record');
  return { id: v.id, airport_id: v.airport_id, service: v.service, description: v.description,
    channel_khz: v.channel_khz, source_frequency_mhz: v.source_frequency_mhz };
}
function navaid(v: unknown, cell: string): WorldNavaid {
  if (!object(v) || !nonempty(v.id) || !sourceId(v.source_id) || !nonempty(v.ident, 40) || !nonempty(v.name) || !nonempty(v.type, 40)
    || !country(v.iso_country) || !number(v.lat, -90, 90) || !number(v.lon, -180, 180) || worldAirportCellId(v.lon, v.lat) !== cell
    || !nullable(v.elevation_ft, -5000, 100000) || !nullable(v.frequency_khz, 0, 10_000_000) || !text(v.associated_airport)) return fail('navaid');
  return { id: v.id, source_id: v.source_id, ident: v.ident, name: v.name, type: v.type, iso_country: v.iso_country,
    lat: v.lat, lon: v.lon, elevation_ft: v.elevation_ft, frequency_khz: v.frequency_khz, associated_airport: v.associated_airport };
}
function unique<T extends { id: string }>(rows: T[], name: string): T[] {
  if (new Set(rows.map(row => row.id)).size !== rows.length) return fail(`duplicate ${name}`);
  return rows;
}
export function validateWorldAirportCell(input: unknown, id: string, expected: WorldAirportCounts): WorldAirportCell {
  if (!validWorldAirportCellId(id) || !object(input) || input.schema !== 1 || input.id !== id) return fail('cell');
  for (const key of ['airports', 'runways', 'com', 'navaids'] as const) {
    if (!Array.isArray(input[key]) || input[key].length !== expected[key] || input[key].length > LIMITS[key]) return fail('cell counts');
  }
  const airports = unique((input.airports as unknown[]).map(v => airport(v, id)), 'airport');
  const ids = new Set(airports.map(a => a.id));
  const sourceIds = new Set(airports.map(a => a.source_id));
  if (sourceIds.size !== airports.length) return fail('duplicate airport source');
  return { schema: 1, id, airports,
    runways: unique((input.runways as unknown[]).map(v => runway(v, ids)), 'runway'),
    com: unique((input.com as unknown[]).map(v => com(v, ids)), 'COM'),
    navaids: unique((input.navaids as unknown[]).map(v => navaid(v, id)), 'navaid') };
}
export function validateWorldSearch(input: unknown, manifest: WorldAirportManifest): WorldSearchHit[] {
  if (!object(input) || input.schema !== 1 || !Array.isArray(input.entries)
    || input.entries.length !== manifest.search.count || input.entries.length > LIMITS.searchEntries) return fail('search index');
  const ids = new Set<string>();
  return input.entries.map(v => {
    if (!object(v) || !['airport', 'navaid'].includes(v.kind as string) || !nonempty(v.id) || !nonempty(v.name)
      || !text(v.codes, 500) || !nonempty(v.type, 40) || !country(v.iso_country)
      || !number(v.lat, -90, 90) || !number(v.lon, -180, 180) || !validWorldAirportCellId(v.cell)
      || worldAirportCellId(v.lon, v.lat) !== v.cell || !Object.hasOwn(manifest.cells, v.cell)
      || (v.kind === 'airport' && !TYPES.has(v.type))) return fail('search hit');
    const key = `${v.kind}/${v.id}`;
    if (ids.has(key)) return fail('duplicate search hit');
    ids.add(key);
    return { kind: v.kind as WorldSearchHit['kind'], id: v.id, name: v.name, codes: v.codes, type: v.type,
      lat: v.lat, lon: v.lon, iso_country: v.iso_country, cell: v.cell };
  });
}

async function readStream(stream: ReadableStream<Uint8Array>, limit: number, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader(), chunks: Uint8Array[] = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new Error('Worldwide data cancelled');
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error('Worldwide data cancelled');
      if (done) break;
      if (value.byteLength > limit - size) throw new Error('Worldwide data byte limit');
      size += value.byteLength; chunks.push(value);
    }
  } finally { signal.removeEventListener('abort', abort); void reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
const digest = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
export async function readWorldAirportAsset(path: string, limit: number, signal: AbortSignal,
  fetcher: typeof fetch = fetch, expected?: { bytes: number; sha256: string }, timeoutMs = 20000): Promise<Uint8Array<ArrayBuffer>> {
  const cellPath = /^\/airports\/world\/cells\/(\d+-\d+)\.bin$/.exec(path);
  if (path !== '/airports/world/manifest.json' && path !== '/airports/world/catalogue.bin' && path !== '/airports/world/search.bin'
    && (!cellPath || !validWorldAirportCellId(cellPath[1]))) return fail('asset path');
  const controller = new AbortController(); const stop = () => controller.abort();
  signal.addEventListener('abort', stop, { once: true }); if (signal.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('Worldwide data cancelled or timed out')), { once: true });
    if (controller.signal.aborted) reject(new Error('Worldwide data cancelled'));
    timer = setTimeout(stop, timeoutMs);
  });
  const work = (async () => {
    const response = await fetcher(path, { signal: controller.signal, redirect: 'error', credentials: 'omit' });
    const length = response.headers.get('content-length');
    if (controller.signal.aborted || !response.ok || response.redirected || !response.body
      || length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('Worldwide data unavailable');
    const bytes = await readStream(response.body, limit, controller.signal);
    if (expected && (bytes.byteLength !== expected.bytes || await digest(bytes) !== expected.sha256)) throw new Error('Worldwide data integrity mismatch');
    if (controller.signal.aborted) throw new Error('Worldwide data cancelled');
    return bytes;
  })();
  try { return await Promise.race([work, cancelled]); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', stop); controller.abort(); }
}
export async function readWorldAirportSearch(bytes: Uint8Array<ArrayBuffer>, manifest: WorldAirportManifest,
  signal: AbortSignal): Promise<WorldSearchHit[]> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const expanded = await readStream(stream, LIMITS.searchExpandedBytes, signal);
  if (expanded.byteLength !== manifest.search.expanded_bytes || await digest(expanded) !== manifest.search.expanded_sha256) throw new Error('Worldwide search integrity mismatch');
  if (signal.aborted) throw new Error('Worldwide data cancelled');
  return validateWorldSearch(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(expanded)), manifest);
}
