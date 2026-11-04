import { Credit, Event, Rectangle, RequestState, WebMercatorTilingScheme, type ImageryProvider, type Request } from 'cesium';

const ROOT = '/imagery/rhein-main';
const BOUNDS = [8.48, 49.93, 8.80, 50.12] as const;
const SIZE = 512;
const MAX_TILE_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 512 * 1024;
const CACHE_LIMIT = 64;
const CONCURRENCY = 6;
/** Queued (not yet fetching) tile loads beyond this are dropped oldest-first. */
export const MAX_QUEUED_TILES = 48;
const CANCELLED = Symbol('cancelled');

type Tile = Readonly<{ z: number; x: number; y: number; bytes: number; sha256: string }>;
type Manifest = Readonly<{ tiles: readonly Tile[] }>;
export type RegionalImageryStats = { loadedTiles: number; cacheSize: number; inflight: number; failedTiles: number; queuedTiles: number; cancelledTiles: number; resolutionAt: (latitudeDegrees: number, longitudeDegrees: number) => number | null; loadedLevelAt: (latitudeDegrees: number, longitudeDegrees: number) => number | null };

/** XYZ coordinates, with y increasing southwards in Web Mercator. */
export function regionalTileAt(latitudeDegrees: number, longitudeDegrees: number, level: number): { x: number; y: number } {
  const n = 2 ** level;
  const lat = latitudeDegrees * Math.PI / 180;
  return { x: Math.floor((longitudeDegrees + 180) / 360 * n), y: Math.floor((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * n) };
}

export function ancestorCrop(x: number, y: number, level: number, ancestorLevel: number): { sx: number; sy: number; size: number } {
  const factor = 2 ** (level - ancestorLevel);
  const size = SIZE / factor;
  return { sx: (x % factor) * size, sy: (y % factor) * size, size };
}

/** Reject unexpected metadata and derive every resource path locally, never from input. */
export function validateRegionalManifest(value: unknown): Manifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid imagery manifest');
  const m = value as Record<string, unknown>;
  const source = m.source as Record<string, unknown> | null;
  if (m.version !== 1 || m.id !== 'hessen-rhein-main-dop-v1' || m.scheme !== 'xyz' || m.projection !== 'EPSG:3857'
      || m.tile_size_px !== SIZE || m.min_level !== 10 || m.max_level !== 15 || !Array.isArray(m.bounds)
      || m.bounds.length !== 4 || !m.bounds.every((v, i) => v === BOUNDS[i]) || !source || typeof source !== 'object'
      || typeof source.name !== 'string' || !source.name || source.license !== 'DL-DE-Zero-2.0' || source.capture_date !== null
      || !Array.isArray(m.tiles) || m.tiles.length < 1 || m.tiles.length > 1500) throw new Error('Unsupported imagery manifest');
  const seen = new Set<string>();
  const tiles: Tile[] = [];
  for (const candidate of m.tiles) {
    if (!candidate || typeof candidate !== 'object') throw new Error('Invalid imagery tile');
    const t = candidate as Record<string, unknown>;
    // Only coordinate-derived paths are permitted; reject misleading path metadata.
    if (Object.keys(t).some(key => !['z', 'x', 'y', 'bytes', 'sha256'].includes(key))
        || !Number.isInteger(t.z) || (t.z as number) < 10 || (t.z as number) > 15
        || !Number.isInteger(t.x) || !Number.isInteger(t.y) || !Number.isInteger(t.bytes)
        || (t.bytes as number) < 1 || (t.bytes as number) > MAX_TILE_BYTES
        || typeof t.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(t.sha256)) throw new Error('Invalid imagery tile');
    const z = t.z as number, x = t.x as number, y = t.y as number;
    const nw = regionalTileAt(BOUNDS[3], BOUNDS[0], z), se = regionalTileAt(BOUNDS[1], BOUNDS[2], z);
    if (x < nw.x || x > se.x || y < nw.y || y > se.y) throw new Error('Imagery tile outside coverage');
    const key = `${z}/${x}/${y}`;
    if (seen.has(key)) throw new Error('Duplicate imagery tile');
    seen.add(key);
    tiles.push(Object.freeze({ z, x, y, bytes: t.bytes as number, sha256: t.sha256 }));
  }
  if (tiles.reduce((sum, tile) => sum + tile.bytes, 0) > 80 * 1024 * 1024) throw new Error('Imagery package exceeds byte budget');
  return Object.freeze({ tiles: Object.freeze(tiles) });
}

async function boundedBytes(response: Response, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok || !response.body) throw new Error(`Imagery fetch failed (${response.status})`);
  const length = response.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new Error('Imagery response too large');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maximum) throw new Error('Imagery response too large');
      parts.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

export async function createRegionalImageryProvider(options: { onStatus?: (message: string) => void; signal?: AbortSignal } = {}): Promise<{
  provider: ImageryProvider; dispose: () => void; getStats: () => RegionalImageryStats;
  /** Drop queued tile loads for the previous view; Cesium re-requests tiles it still needs. */
  cancelQueued: () => number;
}> {
  const controller = new AbortController();
  const requestSignal = () => AbortSignal.any([controller.signal, AbortSignal.timeout(12000), ...(options.signal ? [options.signal] : [])]);
  const manifestBytes = await boundedBytes(await fetch(`${ROOT}/manifest.json`, { signal: requestSignal(), redirect: 'error' }), MAX_MANIFEST_BYTES);
  const manifest = validateRegionalManifest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)));
  const records = new Map(manifest.tiles.map(t => [`${t.z}/${t.x}/${t.y}`, t]));
  const cache = new Map<string, ImageBitmap>();
  const pending = new Map<string, Promise<ImageBitmap | null | typeof CANCELLED>>();
  const failed = new Set<string>();
  // Newest-first: the most recent requests belong to the current view.
  const waiters: ((granted: boolean) => void)[] = [];
  let active = 0, loadedTiles = 0, cancelledTiles = 0, disposed = false;
  const drop = (count: number) => { for (const wake of waiters.splice(0, count)) { cancelledTiles++; wake(false); } };
  const notify = (message: string) => { try { options.onStatus?.(message); } catch { /* UI callback cannot break loading. */ } };
  const load = (tile: Tile): Promise<ImageBitmap | null | typeof CANCELLED> => {
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    const cached = cache.get(key);
    if (cached) { cache.delete(key); cache.set(key, cached); return Promise.resolve(cached); }
    const existing = pending.get(key); if (existing) return existing;
    if (failed.has(key) || disposed) return Promise.resolve(null);
    const promise = (async () => {
      if (active >= CONCURRENCY) {
        const granted = await new Promise<boolean>(resolve => {
          waiters.push(resolve);
          if (waiters.length > MAX_QUEUED_TILES) drop(waiters.length - MAX_QUEUED_TILES);
        });
        // A dropped load is not a tile failure; it may be requested again.
        if (!granted) return disposed ? null : CANCELLED;
      } else active++;
      if (disposed) { active--; return null; }
      try {
        const bytes = await boundedBytes(await fetch(`${ROOT}/tiles/${key}.jpg?sha256=${tile.sha256}`, { signal: requestSignal(), redirect: 'error' }), Math.min(MAX_TILE_BYTES, tile.bytes));
        if (bytes.length !== tile.bytes || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) throw new Error('Invalid JPEG bytes');
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
        if (digest !== tile.sha256) throw new Error('Imagery hash mismatch');
        const image = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
        if (image.width !== SIZE || image.height !== SIZE || disposed) { image.close(); throw new Error('Invalid imagery dimensions or disposed'); }
        cache.set(key, image); loadedTiles++; notify(`Regional imagery tile loaded: ${key}`);
        while (cache.size > CACHE_LIMIT) { const first = cache.keys().next().value as string; cache.get(first)?.close(); cache.delete(first); }
        return image;
      } catch (error) {
        if (!disposed) { failed.add(key); notify(`Regional imagery tile unavailable: ${key}`); console.warn('Regional imagery tile unavailable', key, error); }
        return null;
      } finally { const next = waiters.pop(); if (next) next(true); else active--; }
    })();
    pending.set(key, promise); void promise.finally(() => pending.delete(key));
    return promise;
  };
  const levelAt = (latitudeDegrees: number, longitudeDegrees: number, loadedOnly: boolean): number | null => {
    if (!Number.isFinite(latitudeDegrees) || !Number.isFinite(longitudeDegrees) || latitudeDegrees < BOUNDS[1] || latitudeDegrees > BOUNDS[3] || longitudeDegrees < BOUNDS[0] || longitudeDegrees > BOUNDS[2]) return null;
    for (let z = 15; z >= 10; z--) {
      const { x, y } = regionalTileAt(latitudeDegrees, longitudeDegrees, z), key = `${z}/${x}/${y}`;
      if (loadedOnly ? cache.has(key) : records.has(key) && !failed.has(key)) return z;
    }
    return null;
  };
  const getStats = (): RegionalImageryStats => ({ loadedTiles, cacheSize: cache.size, inflight: active, failedTiles: failed.size, queuedTiles: waiters.length, cancelledTiles,
    resolutionAt: (latitudeDegrees, longitudeDegrees) => levelAt(latitudeDegrees, longitudeDegrees, false),
    loadedLevelAt: (latitudeDegrees, longitudeDegrees) => levelAt(latitudeDegrees, longitudeDegrees, true),
  });
  const provider = {
    rectangle: Rectangle.fromDegrees(...BOUNDS), tilingScheme: new WebMercatorTilingScheme(), tileWidth: SIZE, tileHeight: SIZE,
    minimumLevel: 10, maximumLevel: 15, hasAlphaChannel: true, errorEvent: new Event(), tileDiscardPolicy: undefined, proxy: undefined,
    credit: new Credit('Hessen HVBG · DL-DE-Zero-2.0 · imagery resampled and tiled', true),
    getTileCredits: () => undefined,
    requestImage(x: number, y: number, level: number, request?: Request) {
      if (disposed || !Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(level) || level < 10 || level > 15 || x < 0 || y < 0 || x >= 2 ** level || y >= 2 ** level) return undefined;
      // Cesium treats a rejected CANCELLED request as "try again later", not as a failed tile.
      // Cesium's public typings mark state read-only; ImageryLayer reads it on rejection.
      const mutable = request as unknown as { state: RequestState; cancelled?: boolean } | undefined;
      const cancelled = () => { if (mutable) mutable.state = RequestState.CANCELLED; return new Error('Regional imagery request cancelled'); };
      return (async () => {
        if (mutable?.cancelled) throw cancelled();
        const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE;
        const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
        for (let z = level; z >= 10 && !disposed; z--) {
          const factor = 2 ** (level - z), tile = records.get(`${z}/${Math.floor(x / factor)}/${Math.floor(y / factor)}`);
          if (!tile) continue;
          const image = await load(tile);
          if (image === CANCELLED) throw cancelled();
          if (image && !disposed) { const crop = ancestorCrop(x, y, level, z); context.drawImage(image, crop.sx, crop.sy, crop.size, crop.size, 0, 0, SIZE, SIZE); break; }
        }
        return canvas;
      })();
    },
    pickFeatures: () => undefined,
  } as unknown as ImageryProvider;
  const dispose = () => { if (disposed) return; disposed = true; controller.abort(); for (const image of cache.values()) image.close(); cache.clear(); for (const wake of waiters.splice(0)) wake(false); };
  const cancelQueued = () => { if (disposed) return 0; const count = waiters.length; drop(count); return count; };
  return { provider, dispose, getStats, cancelQueued };
}
