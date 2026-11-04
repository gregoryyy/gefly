// Actual service worker/Cache Storage; no third-party network or flight model.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { gzipSync } from 'node:zlib';
import { stripTypeScriptTypes } from 'node:module';
const clientModules = new Map(await Promise.all(['scenery-cache','scenery-coverage','map-terrain-style'].map(async name =>
  [`/app/src/${name}.ts`,stripTypeScriptTypes(await readFile(new URL(`../src/${name}.ts`,import.meta.url),'utf8'))])));
const source = await readFile(new URL('../public/scenery-cache-sw.js', import.meta.url));
// Observe the real Cache API in this fixture worker; no cache behavior is replaced.
const worker = Buffer.concat([Buffer.from(`
const cacheBench = {keys:0,match:0,put:0,delete:0};
for(const name of Object.keys(cacheBench)){const original=Cache.prototype[name];Cache.prototype[name]=function(...args){cacheBench[name]++;return original.apply(this,args);};}
self.addEventListener('message',event=>{if(event.data?.type==='cache-bench-stats')event.ports[0]?.postMessage({...cacheBench});});
`),source]);
const counts = new Map(), aborted = new Set(); let active = 0, peak = 0;
const server = createServer((req, res) => {
  if (clientModules.has(req.url)) { res.setHeader('Content-Type','text/javascript'); res.end(clientModules.get(req.url)); return; }
  if (req.url === '/studies/e1-browser/sim/terrain-stream.js') {
    res.setHeader('Content-Type','text/javascript');res.end('export const loadRegionalManifest=()=>new Promise(resolve=>{window.resolveClientTerrain=resolve;});');return;
  }
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
  const metrics = () => page.evaluate(()=>new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);navigator.serviceWorker.controller.postMessage({type:'cache-bench-stats'},[channel.port2]);}));
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
  const beforeBatch=await metrics(), coldStart=performance.now();
  await page.evaluate(urls => new Promise(resolve => {
    navigator.serviceWorker.addEventListener('message', function handler(e) {
      if (e.data.type === 'scenery-cache-status' && e.data.state === 'ready') { navigator.serviceWorker.removeEventListener('message', handler); resolve(); }
    });
    navigator.serviceWorker.controller.postMessage({ type: 'scenery-cache-focus', urls });
  }), Array.from({ length: 100 }, (_, i) => `/scenery/landmarks/14/${i}/1.pbf`));
  const coldMs=performance.now()-coldStart, afterBatch=await metrics();
  assert(peak <= 2, 'two background network slots');
  const keys = await page.evaluate(async () => (await (await caches.open('gefly-scenery-v1')).keys()).map(r => r.url));
  assert.equal(keys.filter(url => url.includes('/landmarks/')).length, 96, 'landmark LRU entry budget');
  assert(!keys.some(url => url.includes('/private.json')));
  const hot=keys.filter(url=>url.includes('/landmarks/')).slice(-32), networkBefore=[...counts.values()].reduce((a,b)=>a+b,0), warmStart=performance.now();
  for(let round=0;round<2;round++)for(const path of hot)await get(path);
  // Let the baseline worker's old asynchronous touch writes settle before counting.
  await page.waitForTimeout(300);
  const warmMs=performance.now()-warmStart, afterHits=await metrics();
  assert.equal([...counts.values()].reduce((a,b)=>a+b,0),networkBefore,'warm hits make no network requests');
  await page.reload();for(const path of hot.slice(0,8))await get(path);
  assert.equal([...counts.values()].reduce((a,b)=>a+b,0),networkBefore,'warm reuse survives actual page reload');
  const growth={cold:{keys:afterBatch.keys-beforeBatch.keys,match:afterBatch.match-beforeBatch.match,put:afterBatch.put-beforeBatch.put},warm:{keys:afterHits.keys-afterBatch.keys,match:afterHits.match-afterBatch.match,put:afterHits.put-afterBatch.put,delete:afterHits.delete-afterBatch.delete}};
  if(process.env.SCENERY_CACHE_BASELINE!=='1'){
    assert(growth.cold.keys<=1,'a write batch must not rescan the cache per insert');
    assert(growth.cold.match<=110,'100 cold entries must not reread all previous cache responses');
    assert.equal(growth.warm.keys,0);assert.equal(growth.warm.match,64,'one Cache API read per warm request');
    assert.equal(growth.warm.put,0,'warm hits must not rewrite tile bodies');assert.equal(growth.warm.delete,0);
  }
  const benchmark={source_sha256:createHash('sha256').update(source).digest('hex'),baseline:process.env.SCENERY_CACHE_BASELINE==='1',cold_requests:100,warm_requests:64,reload_requests:8,cold_ms:coldMs,warm_ms:warmMs,growth};
  await mkdir(new URL('../../output/flight/',import.meta.url),{recursive:true});
  await writeFile(new URL(`../../output/flight/scenery-cache-${benchmark.baseline?'before':'after'}.json`,import.meta.url),JSON.stringify(benchmark,null,2)+'\n');
  console.log(JSON.stringify(benchmark));
  // The actual client, with registration/manifest delivery controlled separately
  // from the real service-worker/cache tests above. No scenery or flight is faked
  // into the application; these assertions inspect its existing focus messages.
  const client=await browser.newPage();await client.goto(`http://127.0.0.1:${server.address().port}`);
  await client.evaluate(async()=>{
    window.clientMessages=[];
    const active={postMessage(message){window.clientMessages.push(structuredClone(message));}};
    const registration={active},worker=new EventTarget();window.clientWorker=worker;
    let resolveRegistration;const pending=new Promise(resolve=>{resolveRegistration=resolve;});
    worker.register=()=>pending;worker.ready=Promise.resolve(registration);
    Object.defineProperty(navigator,'serviceWorker',{value:worker});
    const {createSceneryCache}=await import('/app/src/scenery-cache.ts');
    const {planStartupSceneryPrefetch,planSceneryPrefetch}=await import('/app/src/scenery-coverage.ts');
    const lat=49.96*Math.PI/180,lon=8.643*Math.PI/180;
    window.clientFocus={lat,lon};window.clientSeeds=planStartupSceneryPrefetch(lat,lon);
    window.clientTerrainPath=planSceneryPrefetch(lat,lon,false).find(path=>path.startsWith('/terrain/region/'));
    window.clientCache=createSceneryCache(document.body);
    clientCache.update(lat,lon,false,true,false);clientCache.preload(lat,lon,false,true);
    window.resolveClientRegistration=()=>resolveRegistration(registration);
  });
  assert.equal(await client.evaluate(()=>clientMessages.length),0,'startup is retained while registration is pending');
  await client.evaluate(()=>resolveClientRegistration());
  await client.waitForFunction(()=>clientMessages.length>0&&typeof resolveClientTerrain==='function');
  const firstPlan=await client.evaluate(()=>clientMessages.at(-1).urls),seeds=await client.evaluate(()=>clientSeeds);
  assert.deepEqual(firstPlan.slice(0,seeds.length),seeds,'startup seeds lead the existing plan before the view settles');
  assert(firstPlan.length<=200&&new Set(firstPlan).size===firstPlan.length);
  const firstCount=await client.evaluate(()=>clientMessages.length);
  await client.evaluate(()=>clientCache.update(clientFocus.lat+.00001,clientFocus.lon,false,true,false));
  assert.equal(await client.evaluate(()=>clientMessages.length),firstCount,'nearby unsettled updates preserve the startup batch');
  await client.evaluate(()=>resolveClientTerrain(new Map([['fixture',{asset:clientTerrainPath.split('/').at(-1),sha256:'a'.repeat(64)}]])));
  await client.waitForFunction(count=>clientMessages.length>count,firstCount);
  assert.deepEqual((await client.evaluate(()=>clientMessages.at(-1).urls)).slice(0,seeds.length),seeds,'manifest completion retains startup ordering');
  assert((await client.evaluate(()=>clientMessages.at(-1).urls)).some(url=>url.endsWith(`sha256=${'a'.repeat(64)}`)));
  await client.evaluate(()=>clientWorker.dispatchEvent(new Event('controllerchange')));
  assert.deepEqual((await client.evaluate(()=>clientMessages.at(-1).urls)).slice(0,seeds.length),seeds,'controller activation retains startup ordering');
  await client.evaluate(()=>clientCache.update(clientFocus.lat,clientFocus.lon,true,true,false));
  assert.deepEqual(await client.evaluate(()=>clientMessages.at(-1).urls),[],'mode change cancels obsolete startup work');
  await client.evaluate(()=>{clientCache.preload(clientFocus.lat,clientFocus.lon,true,true);clientCache.update(clientFocus.lat+.0001,clientFocus.lon,true,true,false);});
  assert.deepEqual(await client.evaluate(()=>clientMessages.at(-1).urls),[],'moving beyond 500m clears the startup seed');
  await client.evaluate(()=>{clientCache.preload(clientFocus.lat,clientFocus.lon,true,true);clientCache.update(clientFocus.lat,clientFocus.lon,true,false,false);});
  assert.deepEqual(await client.evaluate(()=>clientMessages.at(-1).urls),[],'disable clears startup work');
  await client.evaluate(()=>clientCache.dispose());const disposedCount=await client.evaluate(()=>clientMessages.length);
  await client.evaluate(()=>{clientCache.preload(clientFocus.lat,clientFocus.lon,false,true);clientWorker.dispatchEvent(new Event('controllerchange'));});
  assert.equal(await client.evaluate(()=>clientMessages.length),disposedCount,'disposed client cannot restart warming');
  await client.close();
  console.log('PASS: startup seeds survive async registration/manifest and nearby updates, stay bounded, and clear on mode/move/disable/dispose.');
  console.log('PASS: real browser cache deduplication, reload reuse, expiry, exclusions, terrain identity, concurrency and eviction.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
