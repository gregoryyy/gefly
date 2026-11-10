import type { Airport } from './airport-catalogue.ts';

export interface AirportComStation {
  id: string; airport_id: string; service: string; description: string; channel_khz: number; source_frequency_mhz: string;
}
export interface AirportComDirectory { stations: AirportComStation[]; retrieved: string; source: string; /** Verified package hash (bundled snapshot only). */ sha256?: string }
export const isComChannel = (channel_khz: number): boolean => Number.isInteger(channel_khz)
  && channel_khz >= 118000 && channel_khz <= 136990 && [0, 5, 10, 15].includes(channel_khz % 25);

async function readBounded(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > limit) throw new Error('COM directory unavailable');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > limit) throw new Error('COM directory too large'); chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** Non-operational community snapshot. Out-of-band and malformed source channels remain visible but untunable. */
export async function loadAirportComDirectory(signal?: AbortSignal): Promise<AirportComDirectory> {
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const options = { signal: requestSignal, redirect: 'error' as const };
  const m = JSON.parse(new TextDecoder().decode(await readBounded(await fetch('/airports/com-manifest.json', options), 4096)));
  if (m.schema !== 1 || m.id !== 'southern-germany-airport-com-v1' || !Number.isInteger(m.bytes) || m.bytes < 2 || m.bytes > 150000
    || !Number.isInteger(m.count) || m.count < 0 || m.count > 2000 || !/^[a-f0-9]{64}$/.test(m.sha256)
    || typeof m.retrieved !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.retrieved) || typeof m.source !== 'string' || m.source.length > 200) throw new Error('Invalid COM manifest');
  const bytes = await readBounded(await fetch('/airports/com-regional.json', options), 150000);
  if (bytes.byteLength !== m.bytes) throw new Error('COM size mismatch');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (digest !== m.sha256) throw new Error('COM hash mismatch');
  const rows: unknown = JSON.parse(new TextDecoder().decode(bytes)); const ids = new Set<string>();
  if (!Array.isArray(rows) || rows.length !== m.count) throw new Error('Invalid COM directory');
  const stations = rows.map(row => {
    if (!row || typeof row !== 'object') throw new Error('Invalid COM station');
    const s = row as AirportComStation;
    if (![s.id, s.airport_id, s.service, s.description].every(v => typeof v === 'string' && v.length <= 200)
      || typeof s.source_frequency_mhz !== 'string' || !/^\d{1,3}(\.\d{1,6})?$/.test(s.source_frequency_mhz)
      || Math.round(Number(s.source_frequency_mhz) * 1000) !== s.channel_khz
      || !s.id || !s.airport_id || ids.has(s.id) || !Number.isInteger(s.channel_khz) || s.channel_khz <= 0 || s.channel_khz > 500000) throw new Error('Invalid COM station');
    ids.add(s.id); return s;
  });
  return { stations, retrieved: m.retrieved, source: m.source, sha256: m.sha256 };
}

export function airportDistance_nm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = Math.PI / 180; const dlat = (b.lat - a.lat) * r; const dlon = (b.lon - a.lon) * r;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function filterAirportComStations(stations: readonly AirportComStation[], airports: readonly Airport[], filter: {
  airportId?: string; query?: string; service?: string; position?: { lat: number; lon: number }; nearby_nm?: number;
} = {}): AirportComStation[] {
  const byId = new Map(airports.map(a => [a.id, a])); const query = filter.query?.trim().toLocaleLowerCase() || '';
  return stations.filter(s => {
    const a = byId.get(s.airport_id); if (!a || (filter.airportId && s.airport_id !== filter.airportId)) return false;
    if (filter.service && s.service.toUpperCase() !== filter.service) return false;
    if (filter.nearby_nm !== undefined && (!filter.position || airportDistance_nm(filter.position, a) > filter.nearby_nm)) return false;
    return !query || `${a.id} ${a.name} ${s.service} ${s.description}`.toLocaleLowerCase().includes(query);
  }).sort((a, b) => filter.position
    ? airportDistance_nm(filter.position, byId.get(a.airport_id)!) - airportDistance_nm(filter.position, byId.get(b.airport_id)!) || a.airport_id.localeCompare(b.airport_id)
    : a.airport_id.localeCompare(b.airport_id));
}
