// Public scenery only. Flight state, recordings, app code and external URLs never enter this cache.
const CACHE = 'gefly-scenery-v1', MAX_BYTES = 128 * 1024 * 1024, MAX_ENTRIES = 512;
const LABEL_BYTES = 24 * 1024 * 1024, LABEL_ENTRIES = 96, MAX_TILE_BYTES = 4 * 1024 * 1024;
const pending = new Map(), plans = new Map(), saves = new Set();
const retain = task => { saves.add(task); void task.finally(() => saves.delete(task)).catch(() => {}); return task; };
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
    // Cache API key order is insertion order; delete/put on a hit refreshes LRU.
    await cache.delete(request);
    await cache.put(request, new Response(new Blob(parts), { headers }));
    const keys = await cache.keys(), records = [];
    let total = 0, labels = 0, labelCount = 0;
    for (const key of keys) {
      const entry = await cache.match(key);
      const bytes = Number(entry?.headers.get('x-gefly-cache-bytes')) || 0;
      if (!bytes || Number(entry?.headers.get('x-gefly-cache-expires')) <= Date.now()) { await cache.delete(key); continue; }
      const label = isLabel(key.url); total += bytes;
      if (label) { labels += bytes; labelCount++; }
      records.push({ key, bytes, label });
    }
    let count = records.length;
    for (const record of records) {
      if (total <= MAX_BYTES && count <= MAX_ENTRIES && (!record.label || labels <= LABEL_BYTES && labelCount <= LABEL_ENTRIES)) continue;
      await cache.delete(record.key); total -= record.bytes; count--;
      if (record.label) { labels -= record.bytes; labelCount--; }
    }
  });
}
async function resource(request, background = false) {
  let cache;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit && Number(hit.headers.get('x-gefly-cache-expires')) > Date.now()) {
      // Queue touch before later inserts; cache bookkeeping never delays a hit.
      retain(serial(async () => {
        const current = await cache.match(request);
        if (!current || Number(current.headers.get('x-gefly-cache-expires')) <= Date.now()) return;
        await cache.delete(request); await cache.put(request, current);
      }).catch(() => {}));
      return hit;
    }
  } catch { /* Disabled storage / quota must not prevent ordinary fetching. */ }
  let work = pending.get(request.url);
  if (!work) {
    work = (async () => {
      const response = await fetch(request, { signal: AbortSignal.timeout(15000) });
      if (cache) retain(store(cache, request, response.clone()).catch(() => {}));
      return response;
    })();
    pending.set(request.url, work);
    void work.then(() => Promise.all([...saves])).finally(() => pending.delete(request.url)).catch(() => {});
  }
  const response = await work;
  if (background) await Promise.all([...saves]);
  return response.clone();
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
        const response = await resource(new Request(url, { credentials: 'same-origin', redirect: 'error' }), true);
        if (!response.ok) throw new Error('Scenery unavailable');
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
  const result = resource(event.request);
  event.respondWith(result);
  event.waitUntil(result.then(() => Promise.all([...saves])).catch(() => {}));
});
self.addEventListener('message', event => {
  const client = event.source, data = event.data;
  if (!client?.id || data?.type !== 'scenery-cache-focus' || !Array.isArray(data.urls) || data.urls.length > 200) return;
  let plan = plans.get(client.id);
  if (!plan) { plan = { queue: [], active: 0, generation: 0, completed: 0, failed: 0 }; plans.set(client.id, plan); }
  plan.generation++; plan.completed = 0; plan.failed = 0;
  plan.queue = [...new Set(data.urls.filter(url => typeof url === 'string' && url.length < 200 && eligible(url)))]
    .map(url => new URL(url, self.location.origin).href);
  event.waitUntil(pump(client, plan));
  // Discard state for closed tabs. Already active requests may finish, but no old queue restarts.
  event.waitUntil(self.clients.matchAll().then(clients => {
    const live = new Set(clients.map(value => value.id));
    for (const [id, old] of plans) if (!live.has(id)) { old.queue = []; plans.delete(id); }
  }));
});
