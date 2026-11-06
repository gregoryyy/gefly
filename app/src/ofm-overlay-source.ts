/** The selected published product is deliberate; no date-derived current-cycle guessing. */
export const OFM_OVERLAY_METADATA_URL = '/charts/ofm/metadata.json';
export const OFM_OVERLAY_TILE_TEMPLATE = '/charts/ofm/2611/{z}/{x}/{y}.png';
export const OFM_OVERLAY_PUBLICATION = Object.freeze({
  url: 'https://snapshots.openflightmaps.org/publicationServices/ED_2611.xml',
  sha256: '1631a347b654bf8fe2dd5481c3b5a6076bfefa7673f99dca3ddcdadef3ea6572',
});

export interface OfmOverlaySource {
  tiles: [string];
  minzoom: number;
  maxzoom: number;
  tileSize: 256 | 512;
  edition: string;
  validFrom: string;
  validTo: string;
  attribution: string;
  sourceUrl: string;
  licenseUrl: string;
  reportUrl: string;
  coverage: string;
}

export const OFM_OVERLAY_METADATA = Object.freeze({
  schema: 1,
  tiles: Object.freeze([OFM_OVERLAY_TILE_TEMPLATE]),
  minzoom: 7,
  // The publisher plugin advertises13, but reviewed2611 EDFE tiles at13 are
  // valid blank images. Select12 and let MapLibre overzoom its actual content.
  maxzoom: 12,
  // The publisher uses logical256 tiles with512-pixel retina PNG responses.
  tileSize: 256,
  edition: 'AIRAC 2611',
  validFrom: '2026-10-29T00:00:00Z',
  validTo: '2026-11-26T00:00:00Z',
  attribution: 'Contains information from the open flightmaps database · © open flightmaps contributors',
  sourceUrl: 'https://openflightmaps.org/downloads/ed/',
  licenseUrl: 'https://openflightmaps.org/about/',
  reportUrl: 'mailto:info@openflightmaps.org',
  coverage: 'OFM published regions; Germany edition verified',
});

/** Metadata cannot introduce new origins, a mutable cycle alias or user-selected URLs. */
export function validateOfmOverlaySource(value: unknown): OfmOverlaySource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid OFM metadata');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== Object.keys(OFM_OVERLAY_METADATA).length
    || !Object.entries(OFM_OVERLAY_METADATA).every(([key, expected]) => key === 'tiles'
      ? Array.isArray(record.tiles) && record.tiles.length === 1 && record.tiles[0] === OFM_OVERLAY_TILE_TEMPLATE
      : record[key] === expected)) throw new Error('Unrecognized OFM product metadata');
  const { schema: _, ...source } = OFM_OVERLAY_METADATA;
  return { ...source, tiles: [OFM_OVERLAY_TILE_TEMPLATE] };
}

/** Optional visual content loads only when requested; a failed read has no cached success. */
export async function loadOfmOverlaySource(signal?: AbortSignal): Promise<OfmOverlaySource> {
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(OFM_OVERLAY_METADATA_URL, { signal: requestSignal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
  const declared = response.headers.get('content-length');
  if (response.redirected || !response.ok || !response.body || declared !== null
    && (!/^\d+$/.test(declared) || Number(declared) > 16384)) {
    void response.body?.cancel().catch(() => {});
    throw new Error('OFM metadata unavailable');
  }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (requestSignal.aborted) throw requestSignal.reason;
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 16384) throw new Error('OFM metadata byte limit');
      chunks.push(next.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return validateOfmOverlaySource(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}
