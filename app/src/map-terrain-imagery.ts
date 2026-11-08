/// <reference types="vite/client" />
import { Credit, Event, Rectangle, RequestState, WebMercatorTilingScheme, type ImageryProvider, type Request } from 'cesium';
import { Map as LibreMap, setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { MAP_TERRAIN_STYLE_URL, MAP_TERRAIN_STYLE_SHA256, MAP_TERRAIN_CREDIT } from './map-terrain-style';
import { createWorldMapStyle, WORLD_MAP_BOUNDS, WORLD_MAP_CREDIT } from './world-map-style';

const SIZE = 512, MIN_LEVEL = 6, MAX_LEVEL = 16;
const BOUNDS = [5.8, 47.2, 15.1, 55.1] as const;
const MAX_STYLE_BYTES = 1024 * 1024, MAX_SUBSCRIBERS = 8, TIMEOUT_MS = 12000;
// Each owned RGBA canvas is fixed-size. This bounds cache pixel storage, not
// MapLibre/Cesium GPU storage or references retained by imagery consumers.
// Regional and global renderers together retain at most the original 64 MiB.
const TILE_BYTES = SIZE * SIZE * 4, MAX_CACHE_BYTES = 32 * 1024 * 1024;
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
interface FailedSourceTile { sourceId: string; x: number; y: number; z: number }

// A 512px MapLibre viewport can also require neighboring source tiles for
// clipping and label placement. Be conservative when matching a source error
// to an output XYZ; non-intersecting errors from an old view do not poison the
// new job. This uses normalized Web Mercator tile coordinates.
function mayAffectJob(tile: FailedSourceTile, job: Job): boolean {
  const scale = 2 ** (tile.z - job.level);
  const west = job.x * scale - 1, east = (job.x + 1) * scale + 1;
  const north = job.y * scale - 1, south = (job.y + 1) * scale + 1;
  return tile.x + 1 >= west && tile.x <= east && tile.y + 1 >= north && tile.y <= south;
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

function allowedResource(url: string, world = false): string {
  const parsed = new URL(url, location.origin);
  if (parsed.origin !== location.origin || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('External map terrain resource rejected');
  if (!world && /^\/scenery\/vector\/sprite(?:@2x)?\.(?:json|png)$/.test(parsed.pathname)) return parsed.href;
  const match = (world ? /^\/scenery\/osm\/(\d{1,2})\/(\d{1,5})\/(\d{1,5})\.pbf$/
    : /^\/scenery\/vector\/(\d{1,2})\/(\d{1,5})\/(\d{1,5})\.pbf$/).exec(parsed.pathname);
  if (!match) throw new Error('Unsupported map terrain resource');
  const [z, x, y] = match.slice(1).map(Number);
  if (z > (world ? 14 : 15) || x >= 2 ** z || y >= 2 ** z) throw new Error('Map terrain resource outside tile domain');
  return parsed.href;
}

/** A single MapLibre renderer supplies sharp XYZ cartography to the existing
 * Cesium globe: detailed OSM with local-font labels for the world profile, or
 * the retained label-free regional style. Neither changes physical ground.
 * Failed tiles are transparent; the scene chooses the underlying visual fallback.
 */
export async function createMapTerrainImagery(options: {
  onStatus?: (status: Status) => void; signal?: AbortSignal; profile?: 'regional' | 'world';
} = {}): Promise<{
  provider: ImageryProvider;
  dispose(): void;
  cancelQueued(): number;
  getStats(): { loadedTiles: number; failedTiles: number; queuedTiles: number; cacheSize: number;
    cacheBytes: number; cacheHits: number; coalescedRequests: number };
}> {
  let lastNotifiedStatus: Status | undefined;
  const notify = (status: Status) => {
    if (lastNotifiedStatus === status) return;
    lastNotifiedStatus = status;
    try { options.onStatus?.(status); } catch { /* UI callbacks cannot break tile jobs. */ }
  };
  const controller = new AbortController();
  const world = options.profile === 'world', minimumLevel = world ? 0 : MIN_LEVEL;
  notify('loading');
  let style: StyleSpecification;
  try {
    style = world ? createWorldMapStyle() : await readStyle(AbortSignal.any([controller.signal, AbortSignal.timeout(TIMEOUT_MS), ...(options.signal ? [options.signal] : [])]));
    if (world) {
      const source = style.sources['world-map'];
      if (source.type === 'vector') source.tiles = [`${location.origin}/scenery/osm/{z}/{x}/{y}.pbf`];
    }
  }
  catch (error) { notify('degraded'); throw error; }
  options.signal?.throwIfAborted();
  const container = document.createElement('div');
  container.dataset.mapTerrainRenderer = world ? 'world' : 'regional';
  container.setAttribute('aria-hidden', 'true');
  Object.assign(container.style, { position: 'fixed', width: `${SIZE}px`, height: `${SIZE}px`,
    left: '-10000px', top: '0', opacity: '0', pointerEvents: 'none' });
  document.body.append(container);
  let map: LibreMap;
  try {
    setWorkerUrl(mapWorkerUrl);
    map = new LibreMap({ container, style, interactive: false, attributionControl: false,
      center: [10, 51], zoom: minimumLevel, minZoom: minimumLevel, maxZoom: MAX_LEVEL,
      bearing: 0, pitch: 0, pixelRatio: 1, fadeDuration: 0, renderWorldCopies: false,
      maxTileCacheSize: 32,
      canvasContextAttributes: { preserveDrawingBuffer: true, antialias: false },
      transformRequest: url => ({ url: allowedResource(url, world), credentials: 'same-origin',
        headers: { 'X-Gefly-Scenery-Priority': 'visible' } }) });
  } catch (error) { container.remove(); notify('degraded'); throw error; }
  const tilingScheme = new WebMercatorTilingScheme(), coverage = Rectangle.fromDegrees(...(world ? WORLD_MAP_BOUNDS : BOUNDS));
  const cache = new Map<string, HTMLCanvasElement>(), failed = new Map<string, number>();
  const failedSourceTiles = new Map<string, FailedSourceTile>();
  const pending = new Map<string, Job>();
  const queue: Job[] = [];
  const blank = document.createElement('canvas'); blank.width = SIZE; blank.height = SIZE;
  let active: Job | null = null, disposed = false, loadedTiles = 0, failedTiles = 0, restoreStyle = false;
  let cacheHits = 0, coalescedRequests = 0;
  let reportActiveError: ((tile: FailedSourceTile | null) => void) | null = null;
  // Source responses can arrive after an output job has timed out. Observe
  // tile errors for the entire provider lifetime, so an idle late error is
  // still selectively refreshed if that view is requested again.
  const onSourceError = (event: unknown) => {
    if (disposed) return;
    const value = event as { sourceId?: unknown; tile?: { tileID?: { canonical?: { x?: unknown; y?: unknown; z?: unknown } } } };
    const tile = value.tile?.tileID?.canonical, sourceId = value.sourceId;
    if (typeof sourceId !== 'string' || !Object.hasOwn(style.sources, sourceId) || !tile
        || !Number.isInteger(tile.x) || !Number.isInteger(tile.y) || !Number.isInteger(tile.z)
        || (tile.z as number) < 0 || (tile.z as number) > MAX_LEVEL) {
      reportActiveError?.(null); return;
    }
    const item: FailedSourceTile = { sourceId, x: tile.x as number, y: tile.y as number, z: tile.z as number };
    const key = `${sourceId}/${item.z}/${item.x}/${item.y}`;
    failedSourceTiles.delete(key); failedSourceTiles.set(key, item);
    while (failedSourceTiles.size > 128) failedSourceTiles.delete(failedSourceTiles.keys().next().value!);
    reportActiveError?.(item);
  };
  map.on('error', onSourceError);
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
    // Admission permits at most one unique job for this single renderer.
    const job = queue.shift(); if (!job) return;
    cancelSubscribers(job); if (job.done) return;
    const cached = cache.get(job.key);
    if (cached) { cacheHits++; cache.delete(job.key); cache.set(job.key, cached); notify(completedStatus()); finish(job, cached); return; }
    active = job; notify('loading');
    if (restoreStyle) { restoreStyle = false; map.setStyle(style, { diff: false }); }
    let renderingFailed = false, unknownError = false;
    const onError = (tile: FailedSourceTile | null) => {
      if (!tile) { renderingFailed = true; unknownError = true; }
      else if (mayAffectJob(tile, job)) renderingFailed = true;
    };
    reportActiveError = onError;
    const fail = (reset = false) => {
      if (job.done) return;
      failedTiles++; failed.set(job.key, Date.now() + 30000);
      while (failed.size > MAX_CACHE) failed.delete(failed.keys().next().value!);
      notify('degraded');
      // Cesium's imagery state machine retries a cancelled Request, whereas a
      // resolved transparent canvas would be treated as a permanently ready
      // tile. Direct non-Cesium callers retain the existing blank fallback.
      for (const subscriber of [...job.subscribers]) {
        if (subscriber.request) settle(job, subscriber, null, true);
      }
      finish(job, null);
      if (reset && !disposed) resetRenderer();
    };
    let refreshPending = false;
    const onIdle = () => {
      if (job.done || disposed) return;
      if (refreshPending) return;
      cancelSubscribers(job); if (job.done) return;
      if (renderingFailed || !map.loaded() || !map.areTilesLoaded()) { fail(unknownError); return; }
      try {
        const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE;
        const context = canvas.getContext('2d'); if (!context) throw new Error('Map tile copy unavailable');
        const source = map.getCanvas();
        if (source.width !== SIZE || source.height !== SIZE) throw new Error('Unexpected map tile dimensions');
        context.drawImage(source, 0, 0);
        cache.set(job.key, canvas); loadedTiles++;
        while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
        failed.delete(job.key); notify(completedStatus()); finish(job, canvas);
      } catch { fail(true); }
    };
    const refreshErrored = () => {
      if (job.done || disposed) return;
      refreshPending = false;
      for (const [key, tile] of [...failedSourceTiles]) {
        if (!mayAffectJob(tile, job)) continue;
        try {
          map.refreshTiles(tile.sourceId, [{ x: tile.x, y: tile.y, z: tile.z }]);
          failedSourceTiles.delete(key);
        } catch { renderingFailed = true; unknownError = true; }
      }
      map.triggerRepaint();
    };
    const previousCleanup = job.cleanup;
    // Slow source work is not proof the renderer is corrupt. Leave its style
    // and source cache intact; the next jump cancels obsolete viewport work.
    const timer = setTimeout(() => fail(false), TIMEOUT_MS);
    job.cleanup = () => { previousCleanup(); clearTimeout(timer); map.off('idle', onIdle); map.off('render', refreshErrored);
      if (reportActiveError === onError) reportActiveError = null; };
    map.on('idle', onIdle);
    if ([...failedSourceTiles.values()].some(tile => mayAffectJob(tile, job))) {
      refreshPending = true; map.once('render', refreshErrored);
    }
    const rectangle = tilingScheme.tileXYToRectangle(job.x, job.y, job.level);
    map.jumpTo({ center: [(rectangle.west + rectangle.east) / 2 * 180 / Math.PI,
      Math.atan(Math.sinh(Math.PI * (1 - 2 * (job.y + .5) / 2 ** job.level))) * 180 / Math.PI],
      zoom: job.level, bearing: 0, pitch: 0 });
    map.triggerRepaint();
  }
  const provider = {
    rectangle: coverage, tilingScheme, tileWidth: SIZE, tileHeight: SIZE,
    minimumLevel, maximumLevel: MAX_LEVEL, hasAlphaChannel: true,
    errorEvent: new Event(), credit: new Credit(world ? WORLD_MAP_CREDIT : MAP_TERRAIN_CREDIT, true), proxy: undefined, tileDiscardPolicy: undefined,
    getTileCredits: () => undefined, pickFeatures: () => undefined,
    requestImage(x: number, y: number, level: number, request?: Request) {
      if (disposed || !Number.isInteger(level) || level < minimumLevel || level > MAX_LEVEL
          || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= 2 ** level || y >= 2 ** level) return undefined;
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      if (!Rectangle.intersection(coverage, rectangle)) return undefined;
      const key = `${level}/${x}/${y}`;
      const mutable = request as MutableRequest | undefined;
      if (mutable?.cancelled) { mutable.state = RequestState.CANCELLED; return Promise.reject(new Error('Map terrain request cancelled')); }
      const cached = cache.get(key);
      if (cached) { cacheHits++; cache.delete(key); cache.set(key, cached); notify(completedStatus()); return Promise.resolve(cached); }
      if ((failed.get(key) ?? 0) > Date.now()) {
        notify('degraded');
        // Leave a Cesium retry unissued until the cooldown expires. Returning a
        // transparent success here would permanently suppress that tile.
        return mutable ? undefined : Promise.resolve(blank);
      }
      let job = pending.get(key);
      if (job) {
        if (mutable) for (const subscriber of job.subscribers) if (subscriber.request === mutable) return subscriber.promise;
        if (job.subscribers.size >= MAX_SUBSCRIBERS) return undefined;
        coalescedRequests++;
      }
      // The single renderer has no useful parallel queue. Cesium treats
      // undefined as backpressure and retries according to its current view,
      // so old view requests cannot occupy a long stale FIFO after a pan.
      if (!job && (active || queue.length)) return undefined;
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
    cache.clear(); failed.clear(); failedSourceTiles.clear(); pending.clear(); map.off('error', onSourceError); map.remove(); container.remove();
  };
  options.signal?.addEventListener('abort', dispose, { once: true });
  if (options.signal?.aborted) dispose();
  return { provider, dispose, cancelQueued,
    getStats: () => ({ loadedTiles, failedTiles, queuedTiles: queue.length, cacheSize: cache.size,
      cacheBytes: cache.size * TILE_BYTES, cacheHits, coalescedRequests }) };
}
