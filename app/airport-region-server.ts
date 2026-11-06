import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, opendir, lstat, rename, unlink, utimes } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { airportRegionQuery } from './airport-generator.ts';
import { createAirportCompiler, type AirportCompilerResult } from './airport-generator-worker.ts';
import { AIRPORT_REGION_ENDPOINT, AIRPORT_REGION_LIMITS, validAirportRegionKey,
  type AirportRegionKey } from './src/airport-region.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING = 8, MAX_DISK_ENTRIES = 128, MAX_DISK_BYTES = 128 * 1024 * 1024;
const MAX_MEMORY_ENTRIES = 32, MAX_MEMORY_BYTES = 32 * 1024 * 1024;
const MAX_CACHE_FILE_BYTES = AIRPORT_REGION_LIMITS.maxBytes + 512;
const abortError = () => new Error('Airport request cancelled');

export interface AirportRegionServerOptions {
  fetcher?: typeof fetch;
  /** null deliberately disables persistent storage; failure degrades to memory. */
  cacheDir?: string | null;
  now?: () => number;
  minIntervalMs?: number;
  deadlineMs?: number;
  cacheEntries?: number;
  cacheBytes?: number;
}
interface Resource extends AirportCompilerResult { readonly expires: number }
interface Task { readonly promise: Promise<Resource>; readonly controller: AbortController; subscribers: number; settled: boolean }
interface DiskEntry { readonly bytes: number; accessed: number }
export interface AirportRegionServerStats {
  memoryEntries: number; memoryBytes: number; diskEntries: number; diskBytes: number;
  pending: number; sourceActive: number; sourceQueued: number; persistence: boolean; compilerActive: number; compilerQueued: number;
}

function boundedOption(value: number | undefined, fallback: number, max: number): number {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 0 || result > max) throw new RangeError('Invalid airport service budget');
  return result;
}
function route(path: string): AirportRegionKey | null {
  const match = /^\/scenery\/airports\/v1\/(0|[1-9]\d{0,2})\/(0|[1-9]\d{0,2})\.json$/.exec(path);
  if (!match) return null;
  const key = { x: Number(match[1]), y: Number(match[2]) };
  return validAirportRegionKey(key) ? key : null;
}
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? abortError());
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason ?? abortError());
    signal.addEventListener('abort', aborted, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted)).catch(() => {});
  });
}
async function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (milliseconds <= 0) { if (signal.aborted) throw signal.reason ?? abortError(); return; }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await abortable(new Promise<void>(resolve => { timer = setTimeout(resolve, milliseconds); }), signal); }
  finally { clearTimeout(timer); }
}
async function sourceBytes(response: Response, signal: AbortSignal): Promise<Buffer> {
  const length = response.headers.get('content-length');
  if (response.redirected || !response.ok || length !== null && (!/^\d+$/.test(length) || Number(length) > AIRPORT_REGION_LIMITS.maxSourceBytes)
    || !['application/json', 'text/json'].includes(response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '')) {
    void response.body?.cancel().catch(() => {});
    throw new Error('Airport source unavailable or oversized');
  }
  const reader = response.body?.getReader(); if (!reader) throw new Error('Airport source stream unavailable');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (signal.aborted) throw signal.reason ?? abortError();
      if (result.done) break;
      if (result.value.byteLength > AIRPORT_REGION_LIMITS.maxSourceBytes - bytes) throw new Error('Airport source byte limit');
      bytes += result.value.byteLength; chunks.push(result.value);
    }
    return Buffer.concat(chunks, bytes);
  } finally { void reader.cancel().catch(() => {}); }
}

/** Dedicated local read-only service; no arbitrary upstream, query, or file route. */
export function createAirportRegionMiddleware(options: AirportRegionServerOptions = {}) {
  const fetcher = options.fetcher ?? fetch, now = options.now ?? Date.now;
  const compiler = createAirportCompiler();
  let disposed = false;
  const minInterval = boundedOption(options.minIntervalMs, 10000, 60000);
  const deadline = boundedOption(options.deadlineMs, 30000, 60000);
  const diskLimit = boundedOption(options.cacheEntries, MAX_DISK_ENTRIES, MAX_DISK_ENTRIES);
  const diskCapacity = boundedOption(options.cacheBytes, MAX_DISK_BYTES, MAX_DISK_BYTES);
  const memoryLimit = Math.min(MAX_MEMORY_ENTRIES, diskLimit), memoryCapacity = Math.min(MAX_MEMORY_BYTES, diskCapacity);
  const directory = options.cacheDir === undefined ? resolve(import.meta.dirname, '..', '.cache', 'airport-regions-v1') : options.cacheDir;
  let persistence = directory !== null && diskLimit > 0 && diskCapacity > 0;
  const memory = new Map<string, Resource>(), disk = new Map<string, DiskEntry>(), pending = new Map<string, Task>();
  const failures = new Map<string, number>();
  let memoryBytes = 0, diskBytes = 0, sourceActive = 0, sourceQueued = 0, nextSourceStart = -Infinity, cooldownUntil = -Infinity;
  let sourceTail: Promise<void> = Promise.resolve(), writeTail: Promise<void> = Promise.resolve();
  let queuedWrites = 0;
  const file = (key: string) => resolve(directory!, `${key}.json`);
  const initialized = (async () => {
    if (!persistence) return;
    try {
      await mkdir(directory!, { recursive: true });
      const entries = await opendir(directory!); let inspected = 0;
      for await (const entry of entries) {
        if (++inspected > 512) { persistence = false; disk.clear(); diskBytes = 0; break; }
        const match = /^(\d{1,3})-(\d{1,3})\.json$/.exec(entry.name);
        if (!match || !entry.isFile() || !validAirportRegionKey({ x: Number(match[1]), y: Number(match[2]) })
          || entry.name !== `${Number(match[1])}-${Number(match[2])}.json`) continue;
        const info = await lstat(resolve(directory!, entry.name));
        if (!info.isFile() || info.size > MAX_CACHE_FILE_BYTES) { await unlink(resolve(directory!, entry.name)); continue; }
        disk.set(`${match[1]}-${match[2]}`, { bytes: info.size, accessed: info.mtimeMs }); diskBytes += info.size;
      }
      await trimDisk();
    } catch { persistence = false; disk.clear(); diskBytes = 0; }
  })();

  function resource(compiled: AirportCompilerResult): Resource {
    const generated = Date.parse(compiled.generatedAt);
    if (generated > now() + 5 * 60 * 1000) throw new Error('Airport cache has a future generation time');
    return { ...compiled, expires: generated + (compiled.featureCount ? 7 * DAY_MS : DAY_MS) };
  }
  function putMemory(key: string, value: Resource): void {
    const previous = memory.get(key); if (previous) { memory.delete(key); memoryBytes -= previous.bytes.length; }
    if (value.bytes.length > memoryCapacity || memoryLimit === 0) return;
    while (memory.size >= memoryLimit || memoryBytes + value.bytes.length > memoryCapacity) {
      const first = memory.keys().next().value!; memoryBytes -= memory.get(first)!.bytes.length; memory.delete(first);
    }
    memory.set(key, value); memoryBytes += value.bytes.length;
  }
  async function trimDisk(): Promise<void> {
    if (!persistence) return;
    const oldest = [...disk].sort((a, b) => a[1].accessed - b[1].accessed || a[0].localeCompare(b[0]));
    while (disk.size > diskLimit || diskBytes > diskCapacity) {
      const entry = oldest.shift(); if (!entry) break;
      await unlink(file(entry[0])).catch(error => { if (error.code !== 'ENOENT') throw error; });
      disk.delete(entry[0]); diskBytes -= entry[1].bytes;
    }
  }
  async function readDisk(key: string, expected: AirportRegionKey, signal: AbortSignal): Promise<Resource | null> {
    await initialized;
    if (!persistence || !disk.has(key)) return null;
    let handle;
    try {
      handle = await open(file(key), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const info = await handle.stat(); if (!info.isFile() || info.size > MAX_CACHE_FILE_BYTES) throw new Error('Airport cache byte limit');
      const buffer = Buffer.alloc(MAX_CACHE_FILE_BYTES + 1); let bytes = 0;
      for (;;) {
        const read = await handle.read(buffer, bytes, buffer.length - bytes, null); bytes += read.bytesRead;
        if (bytes > MAX_CACHE_FILE_BYTES) throw new Error('Airport cache byte limit');
        if (!read.bytesRead) break;
      }
      const result = resource(await compiler.readCache(Uint8Array.from(buffer.subarray(0, bytes)).buffer, expected, signal));
      if (result.expires <= now()) throw new Error('Airport cache expired');
      const indexed = disk.get(key); if (indexed) indexed.accessed = now();
      void utimes(file(key), new Date(now()), new Date(now())).catch(() => {});
      return result;
    } catch (error) {
      // A cancelled validation says nothing about the cached bytes. Keep the
      // file and its index for the next subscriber to validate independently.
      if (signal.aborted) throw signal.reason ?? error;
      const previous = disk.get(key); if (previous) { diskBytes -= previous.bytes; disk.delete(key); }
      await unlink(file(key)).catch(() => {});
      return null;
    } finally { await handle?.close().catch(() => {}); }
  }
  function storeDisk(key: string, value: Resource): Promise<void> {
    if (!persistence || queuedWrites >= MAX_PENDING) return Promise.resolve();
    queuedWrites++;
    const work = writeTail.then(async () => {
      await initialized; if (!persistence) return;
      const bytes = value.cacheBytes;
      if (bytes.length > MAX_CACHE_FILE_BYTES || bytes.length > diskCapacity) return;
      const temporary = resolve(directory!, `${key}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`);
      try {
        const handle = await open(temporary, 'wx', 0o600);
        try { await handle.writeFile(bytes); } finally { await handle.close(); }
        await rename(temporary, file(key));
        const previous = disk.get(key); if (previous) diskBytes -= previous.bytes;
        disk.set(key, { bytes: bytes.length, accessed: now() }); diskBytes += bytes.length;
        await trimDisk();
      } catch { persistence = false; disk.clear(); diskBytes = 0; }
      finally { await unlink(temporary).catch(() => {}); }
    }).finally(() => { queuedWrites--; });
    writeTail = work.catch(() => {}); return work;
  }
  function fetchRegion(key: AirportRegionKey, signal: AbortSignal): Promise<Resource> {
    if (sourceActive + sourceQueued >= MAX_PENDING) return Promise.reject(new Error('Airport source queue full'));
    sourceQueued++;
    let resolveResult!: (value: Resource) => void, rejectResult!: (error: unknown) => void;
    const result = new Promise<Resource>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
    // The physical owner remains occupied until fetch/body actually settle, even
    // if an injected/noncooperative source ignores cancellation or the deadline.
    const physical = sourceTail.then(async () => {
      sourceQueued--;
      if (signal.aborted) throw signal.reason ?? abortError();
      await wait(Math.max(0, nextSourceStart - now(), cooldownUntil - now()), signal);
      if (signal.aborted) throw signal.reason ?? abortError();
      sourceActive++; nextSourceStart = now() + minInterval;
      try {
        const response = await fetcher(AIRPORT_REGION_ENDPOINT, { method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'Gefly/0.1 airport-scenery (https://github.com/gregoryyy/gefly)', 'Accept': 'application/json' },
          body: new URLSearchParams({ data: airportRegionQuery(key) }).toString(), redirect: 'error', credentials: 'omit', signal });
        if (signal.aborted) { void response.body?.cancel().catch(() => {}); throw signal.reason ?? abortError(); }
        if (response.status === 429 || response.status === 503) cooldownUntil = now() + 60000;
        const bytes = await sourceBytes(response, signal);
        if (signal.aborted) throw signal.reason ?? abortError();
        const generated = new Date(now()).toISOString().replace(/\.\d{3}Z$/, 'Z');
        return resource(await compiler.compile(Uint8Array.from(bytes).buffer, key, generated, signal));
      } finally { sourceActive--; }
    });
    sourceTail = physical.then(() => {}, () => {});
    physical.then(resolveResult, rejectResult);
    return abortable(result, signal);
  }
  function taskFor(key: AirportRegionKey, name: string): Task {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('Airport source deadline exceeded')), deadline);
    let task: Task;
    const work = (async () => {
      const cached = await abortable(readDisk(name, key, controller.signal), controller.signal);
      if (controller.signal.aborted) throw controller.signal.reason ?? abortError();
      if (cached) { putMemory(name, cached); return Object.assign(cached, { cache: 'disk' }); }
      const value = await fetchRegion(key, controller.signal);
      if (controller.signal.aborted) throw controller.signal.reason ?? abortError();
      putMemory(name, value); await abortable(storeDisk(name, value), controller.signal);
      if (controller.signal.aborted) throw controller.signal.reason ?? abortError();
      return Object.assign(value, { cache: 'generated' });
    })().catch(error => {
      if (!controller.signal.aborted || /deadline/.test(String(controller.signal.reason))) {
        if (failures.size >= 128) failures.delete(failures.keys().next().value!);
        failures.set(name, now() + 5 * 60 * 1000);
      }
      throw error;
    }).finally(() => { clearTimeout(timer); task.settled = true; pending.delete(name); });
    task = { controller, promise: work, subscribers: 0, settled: false }; return task;
  }
  function reply(req: IncomingMessage, res: ServerResponse, value: Resource, cache: string): void {
    if (res.destroyed || res.writableEnded) return;
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, max-age=300',
      'ETag': `"${value.hash}"`, 'X-Content-Type-Options': 'nosniff', 'X-Airport-Cache': cache,
      'X-Airport-Persistence': persistence ? 'available' : 'disabled', 'X-Airport-Source': 'OpenStreetMap; ODbL-1.0' };
    if (req.headers?.['if-none-match'] === headers.ETag) { res.writeHead(304, headers).end(); return; }
    res.writeHead(200, { ...headers, 'Content-Length': String(value.bytes.length) });
    res.end(req.method === 'HEAD' ? undefined : value.bytes);
  }
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const path = req.url ?? '';
    if (!path.startsWith('/scenery/airports/')) { next(); return; }
    if (disposed) { res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); return; }
    const key = route(path);
    if (!key || !['GET', 'HEAD'].includes(req.method ?? '')) { res.writeHead(404, { 'Cache-Control': 'no-store' }).end(); return; }
    const name = `${key.x}-${key.y}`, cached = memory.get(name);
    if (cached && cached.expires > now()) { memory.delete(name); memory.set(name, cached); reply(req, res, cached, 'memory'); return; }
    if (cached) { memoryBytes -= cached.bytes.length; memory.delete(name); }
    const failedUntil = failures.get(name);
    if (failedUntil !== undefined && failedUntil > now()) { res.writeHead(502, { 'Cache-Control': 'no-store', 'Retry-After': '300' }).end(); return; }
    failures.delete(name);
    let task = pending.get(name);
    if (!task) {
      if (pending.size >= MAX_PENDING) { res.writeHead(503, { 'Cache-Control': 'no-store', 'Retry-After': '30' }).end(); return; }
      task = taskFor(key, name); pending.set(name, task);
    }
    task.subscribers++;
    let detached = false;
    const detach = () => {
      if (detached) return; detached = true;
      req.off?.('aborted', detach); res.off?.('close', detach);
      task!.subscribers--;
      if (task!.subscribers === 0 && !task!.settled) task!.controller.abort(abortError());
    };
    req.once?.('aborted', detach); res.once?.('close', detach);
    task.promise.then(value => reply(req, res, value, (value as Resource & { cache?: string }).cache ?? 'generated'))
      .catch(() => { if (!res.destroyed && !res.writableEnded && !res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store', 'Retry-After': '300' }).end(); })
      .finally(detach).catch(() => {});
  };
  return Object.assign(middleware, { async dispose() { disposed = true; for (const task of pending.values()) task.controller.abort(abortError()); await compiler.dispose(); }, stats: (): AirportRegionServerStats => ({ memoryEntries: memory.size, memoryBytes,
    diskEntries: disk.size, diskBytes, pending: pending.size, sourceActive, sourceQueued, persistence, compilerActive: compiler.stats().active, compilerQueued: compiler.stats().queued }) });
}
