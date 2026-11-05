import type { IncomingMessage, ServerResponse } from 'node:http';
import { MAP_TERRAIN_BOUNDS, MAP_TERRAIN_MAX_ZOOM } from './src/map-terrain-style.ts';

const UPSTREAM = 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/';
const LANDMARK_UPSTREAM = 'https://tiles.openfreemap.org/planet/20261101_080013_pt/';
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_PENDING = 64;
const MAX_SOURCE_PENDING = 48;
const TTL_MS = 60 * 60 * 1000;
type Fetcher = typeof fetch;
type Kind = 'tile' | 'sprite-json' | 'sprite-png';
interface Resource { key: string; upstream: string; kind: Kind; limit: number; source: string }
interface Result { bytes: Buffer; mime: string; expires: number }
export interface VectorMapOptions { fetcher?: Fetcher; cacheBytes?: number }

function resourceFor(path: string): Resource | null {
  const landmark = /^\/scenery\/(landmarks|osm)\/(0|[1-9]|1[0-4])\/(0|[1-9]\d{0,4})\/(0|[1-9]\d{0,4})\.pbf$/.exec(path);
  if (landmark) {
    const [z, x, y] = landmark.slice(2).map(Number);
    if (landmark[1] === 'landmarks' && z < 7 || x >= 2 ** z || y >= 2 ** z) return null;
    const key = `${z}/${x}/${y}.pbf`;
    return { key: `osm/${key}`, upstream: LANDMARK_UPSTREAM + key, kind: 'tile',
      limit: 2 * 1024 * 1024, source: 'OpenFreeMap-OSM-20261101_080013_pt' };
  }
  const sprite = /^\/scenery\/vector\/sprite(@2x)?\.(json|png)$/.exec(path);
  if (sprite) {
    const extension = sprite[2], scale = sprite[1] || '';
    return { key: `sprite${scale}.${extension}`, upstream: `${UPSTREAM}sprites/v2/bm_web_col_sprite${scale}.${extension}`,
      kind: extension === 'json' ? 'sprite-json' : 'sprite-png', limit: extension === 'json' ? 1024 * 1024 : 4 * 1024 * 1024, source: 'BKG-basemap.de' };
  }
  const tile = /^\/scenery\/vector\/(0|[1-9]\d?)\/(0|[1-9]\d{0,4})\/(0|[1-9]\d{0,4})\.pbf$/.exec(path);
  if (!tile) return null;
  const z = Number(tile[1]), x = Number(tile[2]), y = Number(tile[3]), count = 2 ** z;
  if (z > MAP_TERRAIN_MAX_ZOOM || x >= count || y >= count) return null;
  const west = x / count * 360 - 180, east = (x + 1) / count * 360 - 180;
  const latitude = (value: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * value / count))) * 180 / Math.PI;
  const north = latitude(y), south = latitude(y + 1);
  const [coverageWest, coverageSouth, coverageEast, coverageNorth] = MAP_TERRAIN_BOUNDS;
  if (east <= coverageWest || west >= coverageEast || north <= coverageSouth || south >= coverageNorth) return null;
  const key = `${z}/${x}/${y}.pbf`;
  return { key, upstream: `${UPSTREAM}tiles/v2/bm_web_de_3857/${key}`, kind: 'tile', limit: 2 * 1024 * 1024, source: 'BKG-basemap.de' };
}

function contentType(response: Response, kind: Kind): string {
  const type = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (kind === 'tile' && ['application/x-protobuf', 'application/vnd.mapbox-vector-tile', 'application/protobuf', 'application/octet-stream'].includes(type || '')) return 'application/vnd.mapbox-vector-tile';
  if (kind === 'sprite-json' && type === 'application/json') return 'application/json';
  if (kind === 'sprite-png' && type === 'image/png') return 'image/png';
  throw new Error('Unsupported vector map response type');
}
async function boundedBytes(response: Response, limit: number): Promise<Buffer> {
  const declared = response.headers.get('content-length');
  if (!response.ok || !response.body || declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('Vector map response unavailable or too large');
  const reader = response.body.getReader(), chunks: Buffer[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Vector map response too large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (size === 0) throw new Error('Empty vector map response');
  return Buffer.concat(chunks, size);
}
function validateBytes(bytes: Buffer, kind: Kind): void {
  if (kind === 'sprite-png') {
    if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(16) < 1 || bytes.readUInt32BE(20) < 1
      || bytes.readUInt32BE(16) > 4096 || bytes.readUInt32BE(20) > 4096) throw new Error('Invalid vector sprite image');
  } else if (kind === 'sprite-json') {
    const json: unknown = JSON.parse(bytes.toString('utf8'));
    if (!json || Array.isArray(json) || typeof json !== 'object' || Object.keys(json).length > 10000) throw new Error('Invalid vector sprite index');
    for (const entry of Object.values(json)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid vector sprite entry');
      const sprite = entry as Record<string, unknown>;
      for (const field of ['x', 'y', 'width', 'height', 'pixelRatio']) {
        const value = sprite[field];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 4096
          || field !== 'pixelRatio' && !Number.isInteger(value)) throw new Error('Invalid vector sprite geometry');
      }
      if (!(sprite.pixelRatio as number > 0) || !(sprite.width as number > 0) || !(sprite.height as number > 0)) throw new Error('Invalid vector sprite extent');
    }
  }
}

/** Fixed public BKG cartography and pinned OpenFreeMap landmark tiles. Neither incoming URL text nor
 * provider response metadata can select a host, filesystem path or credential.
 * Disconnected responses detach from shared jobs; their finite upstream fetch is
 * retained for concurrent users/cache. Each fixed host has four fetch slots and
 * at most 48 pending jobs; 64 jobs and 32 MB cache are shared across both hosts.
 */
export function createVectorMapMiddleware(options: VectorMapOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const requested = options.cacheBytes ?? MAX_CACHE_BYTES;
  if (!Number.isSafeInteger(requested) || requested < 0) throw new RangeError('cacheBytes must be a nonnegative safe integer');
  const capacity = Math.min(MAX_CACHE_BYTES, requested);
  const cache = new Map<string, Result>(), pending = new Map<string, Promise<Result>>();
  let cacheSize = 0;
  const priorities = new Map<string, { value: number }>();
  const pools = {
    bkg: { active: 0, pending: 0, queue: [] as Array<{ resolve: () => void; priority: () => number }> },
    landmarks: { active: 0, pending: 0, queue: [] as Array<{ resolve: () => void; priority: () => number }> },
  };
  const poolFor = (resource: Resource) => pools[resource.key.startsWith('osm/') ? 'landmarks' : 'bkg'];
  async function acquire(resource: Resource, priority: () => number): Promise<Result> {
    const pool = poolFor(resource);
    if (pool.active < 4) pool.active++;
    else await new Promise<void>(resolve => pool.queue.push({ resolve, priority }));
    try {
      const response = await fetcher(resource.upstream, { redirect: 'error', signal: AbortSignal.timeout(15000), credentials: 'omit',
        headers: { 'User-Agent': 'Gefly/0.2 (+https://github.com/gregoryyy/gefly)' } });
      let mime: string, bytes: Buffer;
      try {
        mime = contentType(response, resource.kind); bytes = await boundedBytes(response, resource.limit);
        validateBytes(bytes, resource.kind);
      } finally { await response.body?.cancel().catch(() => {}); }
      const result = { bytes, mime, expires: Date.now() + TTL_MS };
      if (bytes.length <= capacity) {
        while (cacheSize + bytes.length > capacity) {
          const oldest = cache.keys().next().value!; cacheSize -= cache.get(oldest)!.bytes.length; cache.delete(oldest);
        }
        cache.set(resource.key, result); cacheSize += bytes.length;
      }
      return result;
    } finally {
      if (pool.queue.length) {
        let first = 0;
        for (let i = 1; i < pool.queue.length; i++) if (pool.queue[i].priority() > pool.queue[first].priority()) first = i;
        pool.queue.splice(first, 1)[0].resolve();
      } else pool.active--;
    }
  }
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const path = req.url || '';
    if (!path.startsWith('/scenery/vector/') && !path.startsWith('/scenery/landmarks/') && !path.startsWith('/scenery/osm/')) { next(); return; }
    const resource = resourceFor(path);
    if (!resource || !['GET', 'HEAD'].includes(req.method || '')) { res.writeHead(404).end(); return; }
    let cached = cache.get(resource.key);
    if (cached && cached.expires <= Date.now()) { cacheSize -= cached.bytes.length; cache.delete(resource.key); cached = undefined; }
    if (cached) { cache.delete(resource.key); cache.set(resource.key, cached); }
    let task = cached ? Promise.resolve(cached) : pending.get(resource.key);
    const visible = req.headers?.['x-gefly-scenery-priority'] === 'visible';
    if (visible && priorities.has(resource.key)) priorities.get(resource.key)!.value = 1;
    if (!task) {
      const pool = poolFor(resource);
      if (pending.size >= MAX_PENDING || pool.pending >= MAX_SOURCE_PENDING) { res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); return; }
      pool.pending++;
      const rank = { value: visible ? 1 : 0 }; priorities.set(resource.key, rank);
      task = acquire(resource, () => rank.value); pending.set(resource.key, task);
      task.finally(() => { pending.delete(resource.key); priorities.delete(resource.key); pool.pending--; }).catch(() => {});
    }
    task.then(value => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(200, { 'Content-Type': value.mime, 'Content-Length': value.bytes.length, 'Cache-Control': 'private, max-age=300',
        'X-Scenery-Sources': resource.source, 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : value.bytes);
    }).catch(() => { if (!res.destroyed && !res.writableEnded && !res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store' }).end(); });
  };
}
