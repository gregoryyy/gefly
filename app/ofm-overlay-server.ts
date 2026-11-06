import type { IncomingMessage, ServerResponse } from 'node:http';
import { OFM_OVERLAY_METADATA } from './src/ofm-overlay-source.ts';

const UPSTREAM = 'https://nwy-tiles-api.prod.newaydata.com/tiles/';
const MAX_TILE_BYTES = 1024 * 1024, MAX_CACHE_BYTES = 8 * 1024 * 1024;
const MAX_PENDING = 32, MAX_CACHE_ENTRIES = 64, TTL_MS = 60 * 60 * 1000, FAILURE_MS = 30000;
interface Result { bytes: Buffer; expires: number }
class OfmDeadlineError extends Error { constructor() { super('OFM tile request deadline'); } }
interface Task { promise: Promise<Result>; controller: AbortController; timer: ReturnType<typeof setTimeout>; subscribers: number; settled: boolean }
export interface OfmOverlayServerOptions { fetcher?: typeof fetch; now?: () => number; cacheBytes?: number }

function tileFor(path: string): string | null {
  const match = /^\/charts\/ofm\/2611\/(7|8|9|1[0-3])\/(0|[1-9]\d{0,3})\/(0|[1-9]\d{0,3})\.png$/.exec(path);
  if (!match) return null;
  const [z, x, y] = match.slice(1).map(Number);
  return x < 2 ** z && y < 2 ** z ? `${z}/${x}/${y}.png` : null;
}
async function tileBytes(response: Response, signal: AbortSignal): Promise<Buffer> {
  const length = response.headers.get('content-length');
  if (response.redirected || !response.ok || !response.body
    || response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'image/png'
    || length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_TILE_BYTES)) {
    void response.body?.cancel().catch(() => {}); throw new Error('OFM tile unavailable');
  }
  const reader = response.body.getReader(), chunks: Buffer[] = []; let size = 0;
  const aborted = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', aborted, { once: true });
  try {
    if (signal.aborted) throw signal.reason;
    for (;;) {
      const next = await reader.read(); if (signal.aborted) throw signal.reason; if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_TILE_BYTES) throw new Error('OFM tile byte limit');
      chunks.push(Buffer.from(next.value));
    }
  } finally { signal.removeEventListener('abort', aborted); await reader.cancel().catch(() => {}); }
  const bytes = Buffer.concat(chunks, size);
  if (bytes.length < 45 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR'
    || bytes.readUInt32BE(16) !== 512 || bytes.readUInt32BE(20) !== 512
    // The selected provider uses RGBA for chart content and grayscale+alpha
    // for legitimate transparent empty tiles; both preserve an alpha channel.
    || bytes[24] !== 8 || ![4, 6].includes(bytes[25]) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0
    || bytes.toString('ascii', bytes.length - 8, bytes.length - 4) !== 'IEND') throw new Error('Invalid OFM PNG tile');
  return bytes;
}

/** Fixed opt-in aeronautical tiles. No incoming host, cycle, query, cookie or URL is forwarded. */
export function createOfmOverlayMiddleware(options: OfmOverlayServerOptions = {}) {
  const fetcher = options.fetcher ?? fetch, now = options.now ?? Date.now;
  const requested = options.cacheBytes ?? MAX_CACHE_BYTES;
  if (!Number.isSafeInteger(requested) || requested < 0) throw new RangeError('Invalid OFM cache budget');
  const capacity = Math.min(MAX_CACHE_BYTES, requested);
  const cache = new Map<string, Result>(), pending = new Map<string, Task>(), failures = new Map<string, number>();
  const queue: Array<{ resolve: () => void; cancel: () => void }> = [];
  let active = 0, cacheSize = 0, disposed = false;
  function enter(signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(signal.reason);
    if (active < 4) { active++; return Promise.resolve(); }
    return new Promise<void>((resolve, reject) => {
      const cancelled = () => {
        const index = queue.indexOf(item); if (index >= 0) queue.splice(index, 1);
        signal.removeEventListener('abort', cancelled); reject(signal.reason);
      };
      const item = { resolve() { signal.removeEventListener('abort', cancelled); resolve(); }, cancel: cancelled };
      queue.push(item); signal.addEventListener('abort', cancelled, { once: true });
    });
  }
  async function acquire(key: string, controller: AbortController, deadlineAt: number): Promise<Result> {
    await enter(controller.signal);
    try {
      if (controller.signal.aborted) throw controller.signal.reason;
      // A delayed timer callback cannot allow an already expired queued job to start.
      if (performance.now() >= deadlineAt) { controller.abort(new OfmDeadlineError()); throw controller.signal.reason; }
      const signal = controller.signal;
      const response = await fetcher(`${UPSTREAM}${key}?path=2611/aero/latest`, {
        redirect: 'error', credentials: 'omit', signal,
        headers: { 'User-Agent': 'Gefly/0.2 (+https://github.com/gregoryyy/gefly)' },
      });
      const bytes = await tileBytes(response, signal), result = { bytes, expires: now() + TTL_MS };
      if (!signal.aborted && performance.now() >= deadlineAt) controller.abort(new OfmDeadlineError());
      if (disposed || controller.signal.aborted) throw controller.signal.reason ?? new Error('OFM service disposed');
      if (bytes.length <= capacity) {
        while (cache.size >= MAX_CACHE_ENTRIES || cacheSize + bytes.length > capacity) {
          const oldest = cache.keys().next().value!; cacheSize -= cache.get(oldest)!.bytes.length; cache.delete(oldest);
        }
        cache.set(key, result); cacheSize += bytes.length;
      }
      return result;
    } catch (error) {
      if (!disposed && (!controller.signal.aborted || controller.signal.reason instanceof OfmDeadlineError)) {
        while (failures.size >= MAX_PENDING) failures.delete(failures.keys().next().value!);
        failures.set(key, now() + FAILURE_MS);
      }
      throw error;
    } finally {
      if (queue.length) queue.shift()!.resolve(); else active--;
    }
  }
  const metadata = Buffer.from(JSON.stringify(OFM_OVERLAY_METADATA));
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const path = req.url ?? '';
    if (!path.startsWith('/charts/ofm/')) { next(); return; }
    if (disposed) { res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); return; }
    if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.writeHead(404).end(); return; }
    if (path === '/charts/ofm/metadata.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': metadata.length,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : metadata); return;
    }
    const key = tileFor(path);
    if (!key) { res.writeHead(404).end(); return; }
    const failedUntil = failures.get(key);
    if (failedUntil !== undefined) {
      if (failedUntil > now()) { res.writeHead(502, { 'Cache-Control': 'no-store' }).end(); return; }
      failures.delete(key);
    }
    let cached = cache.get(key);
    if (cached && cached.expires <= now()) { cacheSize -= cached.bytes.length; cache.delete(key); cached = undefined; }
    if (cached) { cache.delete(key); cache.set(key, cached); }
    let task = pending.get(key);
    if (task?.controller.signal.aborted) { if (pending.get(key) === task) pending.delete(key); task = undefined; }
    if (!cached && !task) {
      if (pending.size >= MAX_PENDING) { res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); return; }
      const controller = new AbortController();
      const deadlineAt = performance.now() + 15000;
      const timer = setTimeout(() => controller.abort(new OfmDeadlineError()), 15000);
      timer.unref?.();
      task = { promise: acquire(key, controller, deadlineAt), controller, timer, subscribers: 0, settled: false };
      const created = task; pending.set(key, created);
      created.promise.finally(() => {
        clearTimeout(created.timer); created.settled = true;
        if (pending.get(key) === created) pending.delete(key);
      }).catch(() => {});
    }
    const shared = cached ? undefined : task;
    let detached = false;
    function detach(): void {
      if (detached) return; detached = true;
      req.off?.('aborted', detach); res.off?.('close', detach);
      if (shared && --shared.subscribers === 0 && !shared.settled) {
        clearTimeout(shared.timer); shared.controller.abort(new Error('OFM tile no longer requested'));
      }
    }
    if (shared) { shared.subscribers++; req.once?.('aborted', detach); res.once?.('close', detach); }
    const result = cached ? Promise.resolve(cached) : shared!.promise;
    result.then(result => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': result.bytes.length,
        'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff', 'X-Chart-Source': 'OFM-AIRAC-2611' });
      res.end(req.method === 'HEAD' ? undefined : result.bytes);
    }).catch(() => {
      if (!res.destroyed && !res.writableEnded && !res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store' }).end();
    }).finally(detach);
  };
  return Object.assign(handler, {
    dispose(): void {
      if (disposed) return; disposed = true;
      for (const task of pending.values()) { clearTimeout(task.timer); task.controller.abort(new Error('OFM service disposed')); }
      cache.clear(); cacheSize = 0; failures.clear();
    },
  });
}
