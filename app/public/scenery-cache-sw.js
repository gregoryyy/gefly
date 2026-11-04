// Public scenery only. Flight state, recordings, app code and external URLs never enter this cache.
const CACHE = 'gefly-scenery-v1', MAX_BYTES = 128 * 1024 * 1024, MAX_ENTRIES = 512;
const LABEL_BYTES = 24 * 1024 * 1024, LABEL_ENTRIES = 96, MAX_TILE_BYTES = 4 * 1024 * 1024;
const pending = new Map(), plans = new Map(), touches = new Set();
let indexPromise, touchTask;
let writes = Promise.resolve();
const serial = work => { const next = writes.then(work); writes = next.catch(() => {}); return next; };
function eligible(input) {
  let url; try { url = new URL(input, self.location.origin); } catch { return false; }
  if (url.origin !== self.location.origin) return false;
  const hash = /^\?sha256=[a-f0-9]{64}$/.test(url.search);
  if (/^\/terrain\/region\/e\d{3,4}-n\d{4}\.f32$/.test(url.pathname)) return hash;
  if (/^\/imagery\/rhein-main\/tiles\/\d{1,2}\/\d{1,5}\/\d{1,5}\.jpg$/.test(url.pathname)) return hash;
  return !url.search && /^\/scenery\/(?:map|imagery)\/\d{1,2}\/\d{1,5}\/\d{1,5}\.png$/.test(url.pathname)
    || !url.search && /^\/scenery\/(?:vector|landmarks)\/\d{1,2}\/\d{1,5}\/\d{1,5}\.pbf$/.test(url.pathname);
}
function lifetime(response) {
  const control = response.headers.get('cache-control') ?? '';
  if (/\b(?:no-store|no-cache)\b/i.test(control)) return 0;
  const maxAge = /(?:^|,)\s*max-age\s*=\s*"?(\d+)/i.exec(control);
  const age = Number(response.headers.get('age') || 0), date = Date.parse(response.headers.get('date') || '');
  const apparent = Number.isFinite(date) ? Math.max(0, (Date.now() - date) / 1000) : 0;
  const expires = Date.parse(response.headers.get('expires') || '');
  const seconds = maxAge ? Number(maxAge[1]) : Number.isFinite(expires) ? Math.max(0, (expires - (Number.isFinite(date) ? date : Date.now())) / 1000) : 300;
  return Math.max(0, Math.min(86400, seconds) - Math.max(apparent, Number.isFinite(age) ? age : 0)) * 1000;
}
const isLabel = url => new URL(url).pathname.startsWith('/scenery/landmarks/');
function forget(index, url) {
  const record = index.records.get(url); if (!record) return;
  index.records.delete(url); index.bytes -= record.bytes;
  if (record.label) { index.labels.delete(url); index.labelBytes -= record.bytes; }
}
function remember(index, url, record) {
  forget(index, url); index.records.set(url, record); index.bytes += record.bytes;
  if (record.label) { index.labels.set(url, record); index.labelBytes += record.bytes; }
  index.nextExpiry = Math.min(index.nextExpiry, record.expiresAt);
}
function flushTouches(index) {
  for (const url of touches) {
    const record = index.records.get(url); if (!record) continue;
    index.records.delete(url); index.records.set(url, record);
    if (record.label) { index.labels.delete(url); index.labels.set(url, record); }
  }
  touches.clear();
}
async function trim(cache, index) {
  const now = Date.now();
  if (index.nextExpiry <= now) {
    index.nextExpiry = Infinity;
    for (const [url, record] of index.records) {
      if (record.expiresAt <= now) { await cache.delete(url); forget(index, url); }
      else index.nextExpiry = Math.min(index.nextExpiry, record.expiresAt);
    }
  }
  while (index.bytes > MAX_BYTES || index.records.size > MAX_ENTRIES
    || index.labelBytes > LABEL_BYTES || index.labels.size > LABEL_ENTRIES) {
    const pool = index.labelBytes > LABEL_BYTES || index.labels.size > LABEL_ENTRIES ? index.labels : index.records;
    const url = pool.keys().next().value;
    await cache.delete(url); forget(index, url);
  }
}
function cacheIndex(cache) {
  if (!indexPromise) indexPromise = (async () => {
    const index = { records: new Map(), labels: new Map(), bytes: 0, labelBytes: 0, nextExpiry: Infinity };
    // Existing v1 entries survive worker restarts. Read their headers once;
    // subsequent writes and touches use this bounded in-memory index.
    for (const key of await cache.keys()) {
      const entry = await cache.match(key), bytes = Number(entry?.headers.get('x-gefly-cache-bytes'));
      const expiresAt = Number(entry?.headers.get('x-gefly-cache-expires'));
      if (!Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_TILE_BYTES || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        await cache.delete(key); continue;
      }
      remember(index, key.url, { bytes, expiresAt, label: isLabel(key.url) });
      await trim(cache, index);
    }
    return index;
  })().catch(error => { indexPromise = undefined; throw error; });
  return indexPromise;
}
function touch(cache, url) {
  if (touches.size < MAX_ENTRIES) touches.add(url);
  if (!touchTask) {
    const task = Promise.resolve().then(() => cacheIndex(cache)).then(flushTouches).catch(() => {});
    touchTask = task;
    void task.finally(() => { if (touchTask === task) touchTask = undefined; });
  }
  return touchTask;
}
async function store(cache, request, response) {
  const ttl = lifetime(response), expiresAt = Date.now() + ttl, mime = response.headers.get('content-type') || '';
  if (!ttl || response.status !== 200 || response.redirected || response.type === 'opaque'
      || response.headers.get('x-scenery-partial') === 'true'
      || !/^(?:image\/(?:png|jpeg)|application\/(?:octet-stream|x-protobuf|vnd\.mapbox-vector-tile|protobuf))(?:;|$)/i.test(mime)) return;
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_TILE_BYTES) return;
  const reader = response.body?.getReader(); if (!reader) return;
  const parts = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > MAX_TILE_BYTES) return; parts.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!size) return;
  const headers = new Headers(response.headers);
  // Fetch exposes decoded bytes; the stored body is no longer transfer-encoded.
  headers.delete('content-encoding'); headers.set('content-length', String(size));
  headers.set('x-gefly-cache-expires', String(expiresAt));
  headers.set('x-gefly-cache-bytes', String(size));
  await serial(async () => {
    const index = await cacheIndex(cache);
    flushTouches(index);
    await cache.put(request, new Response(new Blob(parts), { headers }));
    remember(index, request.url, { bytes: size, expiresAt, label: isLabel(request.url) });
    await trim(cache, index);
  });
}
async function resource(request, background = false, planSignal) {
  let cache;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit && Number(hit.headers.get('x-gefly-cache-expires')) > Date.now()) {
      // Recency is batched in memory; neither index initialization nor a tile
      // rewrite delays a cache hit. Restart recency falls back to insertion order.
      return { response: hit, saved: touch(cache, request.url) };
    }
  } catch { /* Disabled storage / quota must not prevent ordinary fetching. */ }
  planSignal?.throwIfAborted();
  // Foreground demand must reach the proxy so it can promote an already queued
  // warm tile. The proxy still coalesces both HTTP requests into one upstream load.
  const visible = request.headers.get('x-gefly-scenery-priority') === 'visible';
  // Demand cancellation belongs to its caller, not to another consumer of the
  // same URL. The server still coalesces their upstream work.
  const pendingKey = visible || background ? Symbol(request.url) : request.url;
  let work = pending.get(pendingKey);
  if (!work) {
    work = (async () => {
      const signal = AbortSignal.any([AbortSignal.timeout(15000), ...(visible ? [request.signal] : []), ...(planSignal ? [planSignal] : [])]);
      const response = await fetch(request, { signal,
        ...(visible ? { cache: 'no-store' } : {}) });
      const saved = cache ? store(cache, request, response.clone()).catch(() => {}) : Promise.resolve();
      return { response, saved };
    })().catch(error => { if (pending.get(pendingKey) === work) pending.delete(pendingKey); throw error; });
    pending.set(pendingKey, work);
    void work.then(result => result.saved).finally(() => { if (pending.get(pendingKey) === work) pending.delete(pendingKey); }).catch(() => {});
  }
  const result = await work;
  return { response: result.response.clone(), saved: result.saved };
}
function notify(client, plan) {
  client.postMessage({ type: 'scenery-cache-status', queued: plan.queue.length, active: plan.active,
    completed: plan.completed, failed: plan.failed, state: plan.queue.length || plan.active ? 'warming' : 'ready' });
}
function pump(client, plan) {
  if (plan.running) return plan.running;
  const run = async () => {
    while (plan.queue.length) {
      if (!await self.clients.get(client.id)) { plan.queue = []; break; }
      if (!plan.queue.length) break;
      const url = plan.queue.shift(), generation = plan.generation; plan.active++; notify(client, plan);
      try {
        const result = await resource(new Request(url, { credentials: 'same-origin', redirect: 'error' }), true, plan.controller.signal);
        if (!result.response.ok) throw new Error('Scenery unavailable');
        await result.saved;
        if (plan.generation === generation) plan.completed++;
      } catch { if (plan.generation === generation) plan.failed++; }
      finally { plan.active--; notify(client, plan); }
    }
  };
  plan.running = Promise.all([run(), run()]).finally(() => { plan.running = null; notify(client, plan); });
  return plan.running;
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('gefly-scenery-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.headers.has('range') || !eligible(event.request.url)) return;
  // Chrome does not relay an aborted page fetch to a service worker's network
  // fetch. Keep visible photographs on the browser's cancellable HTTP/cache
  // path; stale views must not occupy every connection until the SW timeout.
  const path = new URL(event.request.url).pathname;
  if (event.request.headers.get('x-gefly-scenery-priority') === 'visible'
      && (path.startsWith('/scenery/imagery/') || path.startsWith('/imagery/rhein-main/tiles/'))) return;
  const result = resource(event.request);
  event.respondWith(result.then(value => value.response));
  event.waitUntil(result.then(value => value.saved).catch(() => {}));
});
self.addEventListener('message', event => {
  const client = event.source, data = event.data;
  if (!client?.id || data?.type !== 'scenery-cache-focus' || !Array.isArray(data.urls) || data.urls.length > 200) return;
  let plan = plans.get(client.id);
  if (!plan) { plan = { queue: [], active: 0, generation: 0, completed: 0, failed: 0 }; plans.set(client.id, plan); }
  plan.controller?.abort(); plan.controller = new AbortController();
  plan.generation++; plan.completed = 0; plan.failed = 0;
  plan.queue = [...new Set(data.urls.filter(url => typeof url === 'string' && url.length < 200 && eligible(url)))]
    .map(url => new URL(url, self.location.origin).href);
  event.waitUntil(pump(client, plan));
  // Discard closed tabs and stop their obsolete background network work.
  event.waitUntil(self.clients.matchAll().then(clients => {
    const live = new Set(clients.map(value => value.id));
    for (const [id, old] of plans) if (!live.has(id)) { old.controller.abort(); old.queue = []; plans.delete(id); }
  }));
});
