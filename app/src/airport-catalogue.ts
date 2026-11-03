export interface Airport {
  id: string; name: string; type: string; icao: string; local: string;
  lat: number; lon: number; elevation_ft: number | null; iso_region: string;
}

export const AIRFIELD_BOUNDS = [6, 47, 14, 51.75] as const;
export const AIRFIELD_REGIONS = ['DE-BW', 'DE-BY', 'DE-HE', 'DE-RP', 'DE-SL'] as const;
export const AIRFIELD_TYPES = ['small_airport', 'medium_airport', 'large_airport', 'heliport', 'seaplane_base', 'balloonport', 'closed'] as const;
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 200;

async function boundedBytes(response: Response, limit: number): Promise<ArrayBuffer> {
  if (Number(response.headers.get('content-length') || 0) > limit || !response.body) throw new Error('Airport response too large');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Airport response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}

/** The fixed local package is bounded and verified before its untrusted text is displayed. */
export async function loadAirportCatalogue(signal?: AbortSignal): Promise<Airport[]> {
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const manifestResponse = await fetch('/airports/manifest.json', { signal: requestSignal, redirect: 'error' });
  if (!manifestResponse.ok) throw new Error('Airport manifest unavailable');
  const manifestBytes = await boundedBytes(manifestResponse, 4096);
  if (manifestBytes.byteLength > 4096) throw new Error('Airport manifest too large');
  const manifest: unknown = JSON.parse(new TextDecoder().decode(manifestBytes));
  if (!manifest || typeof manifest !== 'object') throw new Error('Invalid airport manifest');
  const m = manifest as Record<string, unknown>;
  if (m.schema !== 2 || m.id !== 'southern-germany-airports-v1' ||
      !Array.isArray(m.bounds) || m.bounds.join(',') !== AIRFIELD_BOUNDS.join(',') ||
      !Array.isArray(m.regions) || m.regions.join(',') !== AIRFIELD_REGIONS.join(',') ||
      !Number.isInteger(m.bytes) || (m.bytes as number) < 2 || (m.bytes as number) > 200000 ||
      !Number.isInteger(m.count) || (m.count as number) < 0 || (m.count as number) > 1000 ||
      typeof m.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error('Invalid airport manifest');
  const response = await fetch('/airports/regional.json', { signal: requestSignal, redirect: 'error' });
  if (!response.ok || Number(response.headers.get('content-length') || 0) > 200000) throw new Error('Airport catalogue unavailable');
  const bytes = await boundedBytes(response, 200000);
  if (bytes.byteLength !== m.bytes) throw new Error('Airport catalogue size mismatch');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
  if (digest !== m.sha256) throw new Error('Airport catalogue hash mismatch');
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(data) || data.length !== m.count) throw new Error('Invalid airport catalogue');
  const ids = new Set<string>();
  return data.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid airport');
    const a = item as Record<string, unknown>;
    if (!text(a.id) || !a.id || ids.has(a.id) || !text(a.name) || !a.name || !text(a.icao) || !text(a.local) ||
        !AIRFIELD_TYPES.includes(a.type as typeof AIRFIELD_TYPES[number]) ||
        !AIRFIELD_REGIONS.includes(a.iso_region as typeof AIRFIELD_REGIONS[number]) ||
        typeof a.lat !== 'number' || !Number.isFinite(a.lat) || a.lat < AIRFIELD_BOUNDS[1] || a.lat > AIRFIELD_BOUNDS[3] ||
        typeof a.lon !== 'number' || !Number.isFinite(a.lon) || a.lon < AIRFIELD_BOUNDS[0] || a.lon > AIRFIELD_BOUNDS[2] ||
        !(a.elevation_ft === null || (typeof a.elevation_ft === 'number' && Number.isFinite(a.elevation_ft) && Math.abs(a.elevation_ft) < 30000))) throw new Error('Invalid airport');
    ids.add(a.id);
    return a as unknown as Airport;
  });
}
