/// <reference types="vite/client" />
import { Credit, Event, Rectangle, RequestState, WebMercatorTilingScheme, type ImageryProvider, type Request } from 'cesium';
import { Map as LibreMap, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { MAP_TERRAIN_STYLE_URL, MAP_TERRAIN_STYLE_SHA256, MAP_TERRAIN_CREDIT } from './map-terrain-style';

const SIZE = 512, MIN_LEVEL = 6, MAX_LEVEL = 16;
const BOUNDS = [5.8, 47.2, 15.1, 55.1] as const;
const MAX_STYLE_BYTES = 1024 * 1024, MAX_QUEUED = 48, MAX_SUBSCRIBERS = 8, TIMEOUT_MS = 12000;
// Each owned RGBA canvas is fixed-size. This bounds cache pixel storage, not
// MapLibre/Cesium GPU storage or references retained by imagery consumers.
const TILE_BYTES = SIZE * SIZE * 4, MAX_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_CACHE = MAX_CACHE_BYTES / TILE_BYTES;
type Status = 'loading' | 'ready' | 'degraded';
type MutableRequest = Request & { cancelled?: boolean; state: RequestState };
interface Job {
  key: string; x: number; y: number; level: number; subscribers: Set<Subscriber>;
  done: boolean; cleanup: () => void;
}
interface Subscriber {
  request?: MutableRequest; promise: Promise<HTMLCanvasElement>;
  resolve: (canvas: HTMLCanvasElement) => void; reject: (error: Error) => void;
  cancel: () => void; done: boolean; cleanup: () => void;
}

async function readStyle(signal: AbortSignal): Promise<StyleSpecification> {
  const response = await fetch(MAP_TERRAIN_STYLE_URL, { signal, redirect: 'error' });
  const length = response.headers.get('content-length');
  if (!response.ok || !response.body || length && (!/^\d+$/.test(length) || Number(length) > MAX_STYLE_BYTES)) throw new Error('Map terrain style unavailable or too large');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let count = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      count += value.length; if (count > MAX_STYLE_BYTES) throw new Error('Map terrain style too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(count); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== MAP_TERRAIN_STYLE_SHA256) throw new Error('Map terrain style hash mismatch');
  const style = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as StyleSpecification;
  const sources = Object.values(style.sources ?? {});
  if (style.version !== 8 || style.glyphs || !Array.isArray(style.layers) || !style.layers.length
      || style.layers.some(layer => !['background', 'fill', 'line', 'circle'].includes(layer.type))
      || style.sprite !== '/scenery/vector/sprite' || sources.length !== 1
      || sources.some(source => source.type !== 'vector' || 'url' in source
        || source.maxzoom !== 15 || source.tiles?.length !== 1 || source.tiles[0] !== '/scenery/vector/{z}/{x}/{y}.pbf')) throw new Error('Unsupported map terrain style');
  style.transition = { duration: 0, delay: 0 };
  // Object styles have no source URL against which MapLibre can resolve the
  // sprite. Expand only the already validated same-origin fixed resources.
  style.sprite = `${location.origin}/scenery/vector/sprite`;
  for (const source of sources) if (source.type === 'vector') source.tiles = [`${location.origin}/scenery/vector/{z}/{x}/{y}.pbf`];
  return style;
}

function allowedResource(url: string): string {
  const parsed = new URL(url, location.origin);
  if (parsed.origin !== location.origin || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('External map terrain resource rejected');
  if (/^\/scenery\/vector\/sprite(?:@2x)?\.(?:json|png)$/.test(parsed.pathname)) return parsed.href;
  const match = /^\/scenery\/vector\/(\d{1,2})\/(\d{1,5})\/(\d{1,5})\.pbf$/.exec(parsed.pathname);
  if (!match) throw new Error('Unsupported map terrain resource');
  const [z, x, y] = match.slice(1).map(Number);
  if (z > 15 || x >= 2 ** z || y >= 2 ** z) throw new Error('Map terrain resource outside tile domain');
  return parsed.href;
}

/** A single MapLibre renderer supplies sharp, label-free XYZ cartography to the
 * existing Cesium globe. It changes no terrain heights, navigation or physics.
 * Failed tiles are transparent; the scene chooses the underlying visual fallback.
 */
export async function createMapTerrainImagery(options: {
  onStatus?: (status: Status) => void; signal?: AbortSignal;
} = {}): Promise<{
  provider: ImageryProvider;
  dispose(): void;
  cancelQueued(): number;
  getStats(): { loadedTiles: number; failedTiles: number; queuedTiles: number; cacheSize: number;
    cacheBytes: number; cacheHits: number; coalescedRequests: number };
}> {
  const notify = (status: Status) => { try { options.onStatus?.(status); } catch { /* UI callbacks cannot break tile jobs. */ } };
  const controller = new AbortController();
  notify('loading');
  let style: StyleSpecification;
  try { style = await readStyle(AbortSignal.any([controller.signal, AbortSignal.timeout(TIMEOUT_MS), ...(options.signal ? [options.signal] : [])])); }
  catch (error) { notify('degraded'); throw error; }
  options.signal?.throwIfAborted();
  const container = document.createElement('div');
  container.dataset.mapTerrainRenderer = '';
  container.setAttribute('aria-hidden', 'true');
  Object.assign(container.style, { position: 'fixed', width: `${SIZE}px`, height: `${SIZE}px`,
    left: '-10000px', top: '0', opacity: '0', pointerEvents: 'none' });
  document.body.append(container);
  let map: LibreMap;
  try {
    setWorkerUrl(mapWorkerUrl);
    map = new LibreMap({ container, style, interactive: false, attributionControl: false,
      center: [10, 51], zoom: MIN_LEVEL, minZoom: MIN_LEVEL, maxZoom: MAX_LEVEL,
      bearing: 0, pitch: 0, pixelRatio: 1, fadeDuration: 0, renderWorldCopies: false,
      maxTileCacheSize: 64,
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: false },
      transformRequest: url => ({ url: allowedResource(url), credentials: 'same-origin',
        headers: { 'X-Gefly-Scenery-Priority': 'visible' } }) });
  } catch (error) { container.remove(); notify('degraded'); throw error; }
  const tilingScheme = new WebMercatorTilingScheme(), coverage = Rectangle.fromDegrees(...BOUNDS);
  const cache = new Map<string, HTMLCanvasElement>(), failed = new Map<string, number>();
  const pending = new Map<string, Job>();
  const queue: Job[] = [];
  const blank = document.createElement('canvas'); blank.width = SIZE; blank.height = SIZE;
  let active: Job | null = null, disposed = false, loadedTiles = 0, failedTiles = 0, restoreStyle = false;
  let cacheHits = 0, coalescedRequests = 0;
  const resetRenderer = (): void => {
    restoreStyle = true;
    // Clearing sources cancels MapLibre's in-flight source work without creating
    // another WebGL context. The next job restores the already verified style.
    map.setStyle({ version: 8, sources: {}, layers: [] }, { diff: false });
  };
  const completedStatus = (): Status => {
    for (const [key, expires] of failed) if (expires <= Date.now()) failed.delete(key);
    return failed.size ? 'degraded' : 'ready';
  };
  const cancelled = (subscriber: Subscriber): Error => {
    if (subscriber.request) subscriber.request.state = RequestState.CANCELLED;
    return new Error('Map terrain request cancelled');
  };
  const settle = (job: Job, subscriber: Subscriber, image: HTMLCanvasElement | null, isCancelled: boolean): void => {
    if (subscriber.done) return;
    subscriber.done = true; subscriber.cleanup(); job.subscribers.delete(subscriber);
    if (isCancelled) subscriber.reject(cancelled(subscriber));
    else subscriber.resolve(image ?? blank);
  };
  const finish = (job: Job, image: HTMLCanvasElement | null, isCancelled = false): void => {
    if (job.done) return;
    job.done = true; job.cleanup();
    pending.delete(job.key);
    const index = queue.indexOf(job); if (index !== -1) queue.splice(index, 1);
    if (active === job) { active = null; if (isCancelled && !disposed) resetRenderer(); }
    for (const subscriber of job.subscribers) settle(job, subscriber, image, isCancelled);
    if (!disposed) queueMicrotask(next);
  };
  const cancelSubscribers = (job: Job): void => {
    for (const subscriber of [...job.subscribers]) if (subscriber.request?.cancelled) subscriber.cancel();
  };
  function next(): void {
    if (active || disposed) return;
    const job = queue.pop(); if (!job) return;
    cancelSubscribers(job); if (job.done) return;
    const cached = cache.get(job.key);
    if (cached) { cacheHits++; cache.delete(job.key); cache.set(job.key, cached); notify(completedStatus()); finish(job, cached); return; }
    active = job; notify('loading');
    if (restoreStyle) { restoreStyle = false; map.setStyle(style, { diff: false }); }
    let renderingFailed = false;
    const onError = () => { renderingFailed = true; };
    const fail = () => {
      if (job.done) return;
      failedTiles++; failed.set(job.key, Date.now() + 30000);
      while (failed.size > MAX_CACHE) failed.delete(failed.keys().next().value!);
      notify('degraded'); finish(job, null); if (!disposed) resetRenderer();
    };
    const onIdle = () => {
      if (job.done || disposed) return;
      cancelSubscribers(job); if (job.done) return;
      if (renderingFailed || !map.loaded() || !map.areTilesLoaded()) { fail(); return; }
      try {
        const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE;
        const context = canvas.getContext('2d'); if (!context) throw new Error('Map tile copy unavailable');
        const source = map.getCanvas();
        if (source.width !== SIZE || source.height !== SIZE) throw new Error('Unexpected map tile dimensions');
        context.drawImage(source, 0, 0);
        cache.set(job.key, canvas); loadedTiles++;
        while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
        failed.delete(job.key); notify(completedStatus()); finish(job, canvas);
      } catch { fail(); }
    };
    const previousCleanup = job.cleanup;
    const timer = setTimeout(fail, TIMEOUT_MS);
    job.cleanup = () => { previousCleanup(); clearTimeout(timer); map.off('idle', onIdle); map.off('error', onError); };
    map.on('idle', onIdle); map.on('error', onError);
    const rectangle = tilingScheme.tileXYToRectangle(job.x, job.y, job.level);
    map.jumpTo({ center: [(rectangle.west + rectangle.east) / 2 * 180 / Math.PI,
      Math.atan(Math.sinh(Math.PI * (1 - 2 * (job.y + .5) / 2 ** job.level))) * 180 / Math.PI],
      zoom: job.level, bearing: 0, pitch: 0 });
    map.triggerRepaint();
  }
  const provider = {
    rectangle: coverage, tilingScheme, tileWidth: SIZE, tileHeight: SIZE,
    minimumLevel: MIN_LEVEL, maximumLevel: MAX_LEVEL, hasAlphaChannel: true,
    errorEvent: new Event(), credit: new Credit(MAP_TERRAIN_CREDIT, true), proxy: undefined, tileDiscardPolicy: undefined,
    getTileCredits: () => undefined, pickFeatures: () => undefined,
    requestImage(x: number, y: number, level: number, request?: Request) {
      if (disposed || !Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL
          || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= 2 ** level || y >= 2 ** level) return undefined;
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      if (!Rectangle.intersection(coverage, rectangle)) return undefined;
      const key = `${level}/${x}/${y}`;
      const mutable = request as MutableRequest | undefined;
      if (mutable?.cancelled) { mutable.state = RequestState.CANCELLED; return Promise.reject(new Error('Map terrain request cancelled')); }
      const cached = cache.get(key);
      if (cached) { cacheHits++; cache.delete(key); cache.set(key, cached); notify(completedStatus()); return Promise.resolve(cached); }
      if ((failed.get(key) ?? 0) > Date.now()) { notify('degraded'); return Promise.resolve(blank); }
      let job = pending.get(key);
      if (job) {
        if (mutable) for (const subscriber of job.subscribers) if (subscriber.request === mutable) return subscriber.promise;
        if (job.subscribers.size >= MAX_SUBSCRIBERS) return undefined;
        coalescedRequests++;
      }
      const newJob = !job;
      if (!job) { job = { key, x, y, level, subscribers: new Set(), done: false, cleanup: () => {} }; pending.set(key, job); }
      const shared = job;
      let resolve!: Subscriber['resolve'], reject!: Subscriber['reject'];
      const promise = new Promise<HTMLCanvasElement>((accept, decline) => { resolve = accept; reject = decline; });
      const subscriber: Subscriber = { request: mutable, promise, resolve, reject, done: false, cleanup: () => {}, cancel: () => {} };
      const priorCancel = mutable?.cancelFunction;
      subscriber.cancel = () => {
        if (subscriber.done) return;
        try { priorCancel?.(); } catch { /* A prior callback cannot cancel another subscriber. */ }
        settle(shared, subscriber, null, true);
        if (!shared.subscribers.size) finish(shared, null, true);
      };
      if (mutable) mutable.cancelFunction = subscriber.cancel;
      const poll = mutable ? setInterval(() => { if (mutable.cancelled) subscriber.cancel(); }, 50) : null;
      subscriber.cleanup = () => { if (poll !== null) clearInterval(poll); if (mutable?.cancelFunction === subscriber.cancel) mutable.cancelFunction = priorCancel!; };
      shared.subscribers.add(subscriber);
      if (newJob) {
        queue.push(job);
        while (queue.length > MAX_QUEUED) finish(queue[0], null, true);
        next();
      }
      return promise;
    },
  } as unknown as ImageryProvider;
  const cancelQueued = (): number => {
    const queued = queue.splice(0);
    for (const job of queued) finish(job, null, true);
    return queued.length;
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true; controller.abort();
    cancelQueued(); if (active) finish(active, null, true);
    options.signal?.removeEventListener('abort', dispose);
    cache.clear(); failed.clear(); pending.clear(); map.remove(); container.remove();
  };
  options.signal?.addEventListener('abort', dispose, { once: true });
  if (options.signal?.aborted) dispose();
  return { provider, dispose, cancelQueued,
    getStats: () => ({ loadedTiles, failedTiles, queuedTiles: queue.length, cacheSize: cache.size,
      cacheBytes: cache.size * TILE_BYTES, cacheHits, coalescedRequests }) };
}
