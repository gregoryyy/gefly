import { AIRPORT_REGION_LIMITS, airportRegionUrl, validateAirportRegion, type AirportRegionKey, type AirportRegionPackage } from './airport-region.ts';
export interface AirportRegionEntry { package: AirportRegionPackage; bytes: number }
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)),
  value => value.toString(16).padStart(2, '0')).join('');

/** One logical foreground request. The deadline also bounds uncooperative test fetchers. */
export async function loadAirportRegion(key: AirportRegionKey, signal: AbortSignal,
  fetcher: typeof fetch = fetch, timeoutMs: number = 35000): Promise<AirportRegionEntry> {
  if (signal.aborted) throw new Error('Airport region cancelled');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopped = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('Airport region cancelled or timed out')), { once: true });
    timer = setTimeout(cancel, timeoutMs);
  });
  const work = (async () => {
    const response = await fetcher(airportRegionUrl(key), { signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
    if (controller.signal.aborted) throw new Error('Airport region cancelled');
    const length = response.headers.get('content-length'), etag = response.headers.get('etag');
    if (!response.ok || response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')
      || (length !== null && (!/^\d+$/.test(length) || Number(length) > AIRPORT_REGION_LIMITS.maxBytes))
      || !etag || !/^"[a-f0-9]{64}"$/.test(etag)) throw new Error('Airport region response unavailable or invalid');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Airport region stream unavailable');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (controller.signal.aborted) throw new Error('Airport region cancelled');
        if (done) break;
        if (value.byteLength > AIRPORT_REGION_LIMITS.maxBytes - size) throw new Error('Airport region byte limit');
        chunks.push(value); size += value.byteLength;
      }
    } finally { void reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (await hash(bytes) !== etag.slice(1, -1)) throw new Error('Airport region integrity mismatch');
    if (controller.signal.aborted) throw new Error('Airport region cancelled');
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return { package: validateAirportRegion(value, key), bytes: size };
  })();
  try { return await Promise.race([work, stopped]); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); controller.abort(); }
}
