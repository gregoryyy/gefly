// Actual service worker/Cache Storage; no third-party network or flight model.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { gzipSync } from 'node:zlib';
const worker = await readFile(new URL('../public/scenery-cache-sw.js', import.meta.url));
const counts = new Map(), aborted = new Set(); let active = 0, peak = 0;
const server = createServer((req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Cache</title>'); return; }
  if (req.url === '/scenery-cache-sw.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(worker); return; }
  counts.set(req.url, (counts.get(req.url) ?? 0) + 1); active++; peak = Math.max(peak, active);
  res.on('close', () => { if (!res.writableEnded) aborted.add(req.url); });
  setTimeout(() => {
    res.setHeader('Content-Type', req.url.includes('.png') ? 'image/png' : 'application/octet-stream');
    const map = req.url.startsWith('/scenery/map/');
    res.setHeader('Cache-Control', map && req.url.includes('/5/') ? 'no-store' : map && req.url.includes('/6/') ? 'max-age=1' : 'max-age=300');
    if (map && req.url.includes('/7/')) res.setHeader('X-Scenery-Partial', 'true');
    if (map && req.url.includes('/8/')) res.statusCode = 502;
    if (map && req.url.includes('/9/')) res.setHeader('Date', new Date(Date.now() - 600000).toUTCString());
    const compressed = req.url.startsWith('/scenery/vector/');
    if (compressed) res.setHeader('Content-Encoding', 'gzip');
    active--; res.end(compressed ? gzipSync('fixture') : 'fixture');
  }, req.url.startsWith('/scenery/imagery/14/10') ? 1000 : req.url === '/scenery/map/10/3/1.png' ? 200 : 10);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/scenery-cache-sw.js'); await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const get = path => page.evaluate(async path => (await fetch(path, { cache: 'no-store' })).text(), path);
  const stable = '/scenery/map/10/1/1.png';
  await page.evaluate(path => Promise.all([fetch(path), fetch(path)]).then(rs => Promise.all(rs.map(r => r.text()))), stable);
  assert.equal(counts.get(stable), 1, 'concurrent demands deduplicate');
  await page.reload(); await get(stable); assert.equal(counts.get(stable), 1, 'reuse survives reload');
  for (const id of [5, 7, 8, 9]) { const path = `/scenery/map/10/${id}/1.png`; await get(path); await get(path); assert.equal(counts.get(path), 2, 'no-store/partial/failure excluded'); }
  const expiring = '/scenery/map/10/6/1.png'; await get(expiring); await page.waitForTimeout(1100); await get(expiring); assert.equal(counts.get(expiring), 2, 'max-age honored');
  for (const hash of ['a', 'b']) { const path = `/terrain/region/e825-n4925.f32?sha256=${hash.repeat(64)}`; await get(path); await get(path); assert.equal(counts.get(path), 1, 'terrain keyed by hash'); }
  const compressed = '/scenery/vector/11/2/1.pbf';
  assert.equal(await get(compressed), 'fixture'); assert.equal(await get(compressed), 'fixture');
  assert.equal(counts.get(compressed), 1, 'compressed source bytes survive persistent reuse');
  await get('/private.json'); await get('/private.json'); assert.equal(counts.get('/private.json'), 2);
  const priorityPath = '/scenery/map/10/3/1.png';
  await page.evaluate(path => navigator.serviceWorker.controller.postMessage({ type: 'scenery-cache-focus', urls: [path] }), priorityPath);
  for (let i = 0; i < 100 && !counts.has(priorityPath); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert(counts.has(priorityPath), 'background warm request started');
  await page.evaluate(async path => (await fetch(path, { headers: { 'X-Gefly-Scenery-Priority': 'visible' } })).text(), priorityPath);
  assert.equal(counts.get(priorityPath), 2, 'visible demand reaches proxy to promote a pending background tile');
  const obsolete = '/scenery/imagery/14/100/100.png';
  await page.evaluate(path => navigator.serviceWorker.controller.postMessage({ type: 'scenery-cache-focus', urls: [path] }), obsolete);
  for (let i = 0; i < 100 && !counts.has(obsolete); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert(counts.has(obsolete));
  await page.evaluate(path => { window.keepDemand = fetch(path, { cache: 'no-store' }).then(response => response.text()); }, obsolete);
  for (let i = 0; i < 100 && counts.get(obsolete) !== 2; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(counts.get(obsolete), 2, 'warm cancellation does not own a normal demand for the same asset');
  await page.evaluate(() => navigator.serviceWorker.controller.postMessage({ type: 'scenery-cache-focus', urls: [] }));
  for (let i = 0; i < 100 && !aborted.has(obsolete); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert(aborted.has(obsolete), 'a superseded warm fetch releases its network connection promptly');
  assert.equal(await page.evaluate(() => window.keepDemand), 'fixture', 'superseded warming cannot cancel a demanded terrain/map resource');
  const foreground = '/scenery/imagery/14/101/100.png';
  await page.evaluate(path => {
    window.foregroundAbort = new AbortController();
    window.foregroundResult = fetch(path, { signal: window.foregroundAbort.signal, headers: { 'X-Gefly-Scenery-Priority': 'visible' } }).catch(error => error.name);
  }, foreground);
  for (let i = 0; i < 100 && !counts.has(foreground); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert(counts.has(foreground)); await page.evaluate(() => window.foregroundAbort.abort());
  for (let i = 0; i < 100 && !aborted.has(foreground); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert(aborted.has(foreground), 'visible photograph cancellation reaches the server instead of lingering in SW fetch');
  await new Promise(resolve => setTimeout(resolve, 1000));
  peak = 0;
  await page.evaluate(urls => new Promise(resolve => {
    navigator.serviceWorker.addEventListener('message', function handler(e) {
      if (e.data.type === 'scenery-cache-status' && e.data.state === 'ready') { navigator.serviceWorker.removeEventListener('message', handler); resolve(); }
    });
    navigator.serviceWorker.controller.postMessage({ type: 'scenery-cache-focus', urls });
  }), Array.from({ length: 100 }, (_, i) => `/scenery/landmarks/14/${i}/1.pbf`));
  assert(peak <= 2, 'two background network slots');
  const keys = await page.evaluate(async () => (await (await caches.open('gefly-scenery-v1')).keys()).map(r => r.url));
  assert.equal(keys.filter(url => url.includes('/landmarks/')).length, 96, 'landmark LRU entry budget');
  assert(!keys.some(url => url.includes('/private.json')));
  console.log('PASS: real browser cache deduplication, reload reuse, expiry, exclusions, terrain identity, concurrency and eviction.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
