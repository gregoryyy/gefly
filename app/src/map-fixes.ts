/** Historical source fixes for map selection only, never a receiver/FMS database. */
export interface MapFix {
  readonly id: string;
  readonly name: string;
  readonly lon_deg: number;
  readonly lat_deg: number;
  readonly source_label: string;
}

const MANIFEST_URL = '/mapdata/fixes-manifest.json';
const MANIFEST_SHA256 = '134008c624c95ff505413b72dc08b88fa2292a4dee712f3e6923fd32561ae708';
const ASSET_URL = '/mapdata/fixes-2013.10-v1.json.bin';
const ASSET_SHA256 = '1a6fb70898ac3af13636e9d560d043f384a689734002d794f116a56e33919d11';
const SOURCE_SHA256 = '0be045e8acdcb2cf0656084063d58768976da4cd02902542e1bdb1fe44c23b95';
const SOURCE_URL = 'https://gitlab.com/flightgear/fgdata/-/raw/5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95/Navaids/fix.dat.gz';
const PACKAGE_ID = 'regional-map-fixes-2013.10-v1', COUNT = 2739, ASSET_BYTES = 50948, DECODED_BYTES = 271162;
export const MAP_FIX_SOURCE_LABEL = 'Robin A. Peel / FlightGear FIX 2013.10; historical';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Validate the entire pinned package before exposing immutable source positions.
 * The rectangle includes neighboring countries; the legacy FIX source contains no country field.
 * Repeated identifiers retain distinct source-line identities and coordinates.
 */
export function parseMapFixes(input: unknown): readonly MapFix[] {
  if (!object(input) || input.schema !== 1 || input.id !== PACKAGE_ID || input.historical !== true
      || !Array.isArray(input.bounds) || input.bounds.length !== 4 || input.bounds.some((n, i) => n !== [6, 47, 14, 51.75][i])
      || !object(input.source) || input.source.sha256 !== SOURCE_SHA256 || input.source.edition !== '2013.10'
      || input.source.license !== 'GPL-2.0-or-later' || input.source.label !== MAP_FIX_SOURCE_LABEL || input.source.url !== SOURCE_URL
      || input.source.commit !== '5371094f6cc81d39b5cc7d9052ba13ba4a8b8e95'
      || !Array.isArray(input.fixes) || input.fixes.length !== COUNT) throw new Error('Historical map fixes package unavailable or invalid');
  const seen = new Set<string>();
  const fixes = input.fixes.map((row: unknown): MapFix => {
    if (!object(row) || !Number.isInteger(row.source_line) || (row.source_line as number) < 4 || (row.source_line as number) > 200000
        || row.id !== `fix201310-${row.source_line}` || typeof row.id !== 'string' || seen.has(row.id)
        || typeof row.name !== 'string' || !/^[A-Z0-9]{1,5}$/.test(row.name)
        || typeof row.lon_deg !== 'number' || !Number.isFinite(row.lon_deg) || row.lon_deg < 6 || row.lon_deg > 14
        || typeof row.lat_deg !== 'number' || !Number.isFinite(row.lat_deg) || row.lat_deg < 47 || row.lat_deg > 51.75) {
      throw new Error('Historical map fix coordinates or identity invalid');
    }
    seen.add(row.id);
    return Object.freeze({ id: row.id, name: row.name, lon_deg: row.lon_deg, lat_deg: row.lat_deg, source_label: MAP_FIX_SOURCE_LABEL });
  });
  return Object.freeze(fixes);
}

async function readBytes(url: string, maxBytes: number, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  signal.throwIfAborted();
  const response = await fetch(url, { signal, redirect: 'error', credentials: 'omit' });
  const declared = response.headers.get('content-length');
  if (!response.ok || !response.body || declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error('Historical map fixes unavailable or too large');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error('Historical map fixes too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
async function verifiedBytes(url: string, maxBytes: number, expectedHash: string, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = await readBytes(url, maxBytes, signal);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  signal.throwIfAborted();
  if (hash !== expectedHash) throw new Error('Historical map fixes hash mismatch');
  return bytes;
}

/** Bounded gzip decoding, also used to validate malformed package fixtures.
 * Network callers must first verify compressed bytes against the pinned hash. */
export async function decodeMapFixes(bytes: Uint8Array<ArrayBuffer>, signal?: AbortSignal): Promise<readonly MapFix[]> {
  signal?.throwIfAborted();
  if (bytes.length > ASSET_BYTES) throw new Error('Historical map fixes too large');
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  const cancel = () => { void reader.cancel(signal?.reason).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.length;
      if (size > DECODED_BYTES) throw new Error('Historical map fixes decoded size invalid');
      chunks.push(value);
    }
  } finally { signal?.removeEventListener('abort', cancel); await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (size !== DECODED_BYTES) throw new Error('Historical map fixes decoded size invalid');
  const decoded = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { decoded.set(chunk, offset); offset += chunk.length; }
  return parseMapFixes(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded)));
}

/** Only these two same-origin assets can be requested. A failed load is not an
 * empty inventory; the caller must show unavailable rather than invent fixes. */
export async function loadMapFixes(signal?: AbortSignal): Promise<readonly MapFix[]> {
  const boundedSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000);
  const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await verifiedBytes(MANIFEST_URL, 4096, MANIFEST_SHA256, boundedSignal))) as unknown;
  if (!object(manifest) || manifest.schema !== 1 || manifest.id !== PACKAGE_ID || manifest.asset !== 'fixes-2013.10-v1.json.bin'
      || manifest.sha256 !== ASSET_SHA256 || manifest.bytes !== ASSET_BYTES || manifest.count !== COUNT
      || manifest.decoded_bytes !== DECODED_BYTES || manifest.compression !== 'gzip'
      || manifest.source_sha256 !== SOURCE_SHA256) throw new Error('Historical map fixes manifest invalid');
  return decodeMapFixes(await verifiedBytes(ASSET_URL, ASSET_BYTES, ASSET_SHA256, boundedSignal), boundedSignal);
}
