// Actual MapLibre/official PBF rendering outside EDFE, plus bounded scheduler,
// cache and failure checks with explicitly controlled network fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5218';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5218,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', data => { serverOutput += data; }); server.stderr.on('data', data => { serverOutput += data; });
const observations = {}, checks = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, serverOutput); await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
  const pageErrors = [], requests = [], priorityRequests = []; let sourceTile;
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('request', request => { requests.push(request.url());
    if (/\/scenery\/vector\/\d+\//.test(request.url())) priorityRequests.push({url:request.url(),priority:request.headers()['x-gefly-scenery-priority']});
  });
  page.on('response', async response => {
    if (new URL(response.url()).pathname === '/scenery/vector/14/8584/5562.pbf' && response.status() === 200)
      sourceTile = await response.body();
  });
  await page.route('**/src/map-terrain-imagery.ts', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'), 'actual MapLibre renderer observer marker exists');
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__mapTerrainRenderer = new LibreMap({') });
  });
  await page.route(`${origin}/map-terrain-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1a252e;color:white;font:14px sans-serif}canvas{display:inline-block;width:512px;height:512px}h1{font-size:18px}</style><h1>Actual label-free cartography · south of Egelsbach</h1><div id="tiles"></div><script type="module">
    import{createMapTerrainImagery}from'/src/map-terrain-imagery.ts';import{Request,RequestState}from'/node_modules/.vite/deps/cesium.js';
    window.createMapTerrainImagery=createMapTerrainImagery;window.CesiumRequest=Request;window.CancelledState=RequestState.CANCELLED;
    window.tileAt=(lat,lon,z)=>({x:Math.floor((lon+180)/360*2**z),y:Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z),z});
    window.imageFacts=async(canvas)=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let visible=0;for(let i=0;i<data.length;i+=4){if(data[i+3])visible++;colors.add([data[i],data[i+1],data[i+2],data[i+3]].join(','));}return{width:canvas.width,height:canvas.height,colors:colors.size,visible,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('')};};window.fixtureReady=true;
  </script>` }));
  await page.goto(`${origin}/map-terrain-fixture.html`);
  await page.waitForFunction(() => window.fixtureReady).catch(error => { throw new Error(`${error.message}: ${pageErrors.join('; ')}`); });
  observations.real = await page.evaluate(async () => {
    window.statuses = []; window.rendererErrors = []; window.handle = await createMapTerrainImagery({ onStatus: status => statuses.push(status) });
    window.__mapTerrainRenderer.on('error', event => rendererErrors.push(event.error?.message || String(event)));
    const first = tileAt(49.9116, 8.6348, 14), second = { ...first, x: first.x + 1 };
    window.first = await handle.provider.requestImage(first.x, first.y, first.z);
    const firstFacts = await imageFacts(window.first);
    document.querySelector('#tiles').append(window.first);
    window.second = await handle.provider.requestImage(second.x, second.y, second.z);
    document.querySelector('#tiles').append(window.second);
    const cached = await handle.provider.requestImage(first.x, first.y, first.z);
    const map = window.__mapTerrainRenderer;
    return { tile: first, first: firstFacts, second: await imageFacts(window.second),
      firstAfter: await imageFacts(window.first), cachedSame: cached === window.first,
      stats: handle.getStats(), statuses: [...statuses], rendererCount: document.querySelectorAll('[data-map-terrain-renderer]').length,
      rendererErrors, renderedFeatures: map.getStyle() ? map.queryRenderedFeatures().length : 0,
      sourceTypes: Object.values(map.getStyle()?.sources ?? {}).map(source => source.type),
      layerTypes: [...new Set((map.getStyle()?.layers ?? []).map(layer => layer.type))] };
  });
  console.log('Official tile observations', JSON.stringify(observations.real));
  assert.equal(observations.real.first.width, 512); assert.equal(observations.real.first.height, 512);
  assert(observations.real.first.colors > 20 && observations.real.first.visible > 512 * 512 * .9, 'real official source renders detailed opaque land outside the bounded EDFE overlay');
  assert(observations.real.renderedFeatures > 0, 'actual MapLibre vector features contribute to the second tile');
  assert.deepEqual(observations.real.firstAfter, observations.real.first, 'a later tile cannot mutate a previously returned canvas');
  assert.equal(observations.real.cachedSame, true); assert.equal(observations.real.rendererCount, 1);
  assert.equal(observations.real.stats.loadedTiles, 2); assert.equal(observations.real.stats.failedTiles, 0);
  assert.deepEqual(observations.real.sourceTypes, ['vector']);
  assert(observations.real.layerTypes.every(type => ['background', 'fill', 'line', 'circle'].includes(type)));
  await page.screenshot({ path: `${output}/map-terrain-official-tiles.png` });
  await writeFile(`${output}/map-terrain-official-tile.png`, Buffer.from(await page.evaluate(() => first.toDataURL().split(',')[1]), 'base64'));
  checks.push('actual official PBF cartography renders outside EDFE; label-free 512px canvases retain independent pixels and a bounded reusable cache');

  assert(priorityRequests.length>0&&priorityRequests.every(request=>request.priority==='visible'),'actual visible PBF requests carry foreground priority');
  checks.push('actual official vector requests advertise visible priority to the fixed-source proxy');
  if(process.env.MAP_TERRAIN_HEADER_ONLY==='1') {
    await page.evaluate(()=>handle.dispose());
    assert.deepEqual(pageErrors,[]);
    await writeFile(`${output}/map-terrain-priority-browser.json`,JSON.stringify({result:'pass',priorityRequests,real:observations.real},null,2)+'\n');
    console.log(JSON.stringify({result:'pass',checks,priorityRequests},null,2));
  } else {
  observations.overzoom = await page.evaluate(async () => {
    const tile = tileAt(49.9116, 8.6348, 16), image = await handle.provider.requestImage(tile.x, tile.y, tile.z);
    return { tile, image: await imageFacts(image), stats: handle.getStats() };
  });
  assert(observations.overzoom.image.colors > 20);
  assert.equal(requests.some(url => /\/scenery\/vector\/16\//.test(url)), false, 'level 16 overzooms source level 15 rather than requesting unsupported native tiles');
  checks.push('level-16 imagery overzooms the declared native source ceiling of 15');

  // Actual public-source working set: source pixels stay unmodified. This is
  // renderer timing, not a simulated-flight or guaranteed-network benchmark.
  observations.realTiming = await page.evaluate(async () => {
    const tile=tileAt(49.9116,8.6348,14),tiles=Array.from({length:34},(_,i)=>({...tile,x:tile.x+i%7,y:tile.y+Math.floor(i/7)}));
    const started=performance.now(),before=handle.getStats();
    for(const t of tiles) await handle.provider.requestImage(t.x,t.y,t.z);
    const cold_ms=performance.now()-started,afterCold=handle.getStats();
    let time=performance.now(); const hot=tiles.at(-1); await handle.provider.requestImage(hot.x,hot.y,hot.z);
    const warm_ms=performance.now()-time,afterWarm=handle.getStats();
    time=performance.now(); const revisit=await handle.provider.requestImage(tiles[0].x,tiles[0].y,tiles[0].z);
    return {tiles:tiles.length,cold_ms,warm_ms,revisit_ms:performance.now()-time,before,afterCold,afterWarm,
      afterRevisit:handle.getStats(),revisitImage:await imageFacts(revisit)};
  });
  assert(observations.realTiming.revisitImage.visible>512*512*.9);
  assert.equal(observations.realTiming.afterRevisit.loadedTiles,observations.realTiming.afterCold.loadedTiles,'real34-tile working set revisits without redraw');
  assert(observations.realTiming.afterRevisit.cacheHits>observations.realTiming.afterCold.cacheHits);
  console.log('Real cold/warm/revisit',JSON.stringify(observations.realTiming));

  assert(sourceTile?.length > 1000, 'capture the already verified official tile for a bounded cache-only fixture');
  // Reusing one source tile here tests lifetime/capacity, not geographic truth.
  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: sourceTile }));
  observations.cache = await page.evaluate(async () => {
    const tile = tileAt(50.5, 10, 14);
    for (let i = 0; i < 66; i++) await handle.provider.requestImage(tile.x + i % 10, tile.y + Math.floor(i / 10), tile.z);
    return { stats: handle.getStats(), rendererCount: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  assert.equal(observations.cache.stats.cacheSize, 64);
  assert.equal(observations.cache.stats.cacheBytes,64*1024*1024); assert.equal(observations.cache.rendererCount, 1);
  observations.coalescing=await page.evaluate(async()=>{
    const tile=tileAt(50.4,9.7,14),requests=Array.from({length:9},()=>new CesiumRequest()),before=handle.getStats();
    const first=handle.provider.requestImage(tile.x,tile.y,tile.z,requests[0]);
    const sameRequest=handle.provider.requestImage(tile.x,tile.y,tile.z,requests[0]);
    const others=requests.slice(1,8).map(request=>handle.provider.requestImage(tile.x,tile.y,tile.z,request));
    const overflow=handle.provider.requestImage(tile.x,tile.y,tile.z,requests[8]);
    const settled=Promise.allSettled([first,...others]);requests[0].cancel();
    const results=await settled,images=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
    return {sameRequest:sameRequest===first,overflowDeferred:overflow===undefined,
      rejected:results.filter(result=>result.status==='rejected').length,fulfilled:images.length,
      oneCanvas:images.every(image=>image===images[0]),image:await imageFacts(images[0]),
      firstCancelled:requests[0].state===CancelledState,before,after:handle.getStats()};
  });
  assert(observations.coalescing.sameRequest);assert(observations.coalescing.overflowDeferred);
  assert.equal(observations.coalescing.rejected,1);assert.equal(observations.coalescing.fulfilled,7);
  assert(observations.coalescing.oneCanvas);assert(observations.coalescing.firstCancelled);
  assert(observations.coalescing.image.visible>512*512*.9);
  assert.equal(observations.coalescing.after.loadedTiles-observations.coalescing.before.loadedTiles,1,'duplicate XYZ renders once despite one cancelled subscriber');
  assert.equal(observations.coalescing.after.coalescedRequests-observations.coalescing.before.coalescedRequests,7);
  assert.equal(observations.coalescing.after.queuedTiles,0);
  checks.push('same XYZ shares one render/canvas with independent request cancellation; eight subscribers/key are bounded and overflow defers');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('66 controlled tile jobs evict old canvases at the 64-image/64MiB owned-pixel cap while retaining one renderer');

  observations.queue = await page.evaluate(async () => {
    const tile = tileAt(50.3, 8.9, 14), promises = [], actualRequests = [];
    for (let i = 0; i < 70; i++) {
      const request = new CesiumRequest(); actualRequests.push(request);
      promises.push(handle.provider.requestImage(tile.x + i % 10, tile.y + Math.floor(i / 10), tile.z, request));
    }
    const settled = Promise.allSettled(promises), queued = handle.getStats().queuedTiles;
    const cancelled = handle.cancelQueued(); actualRequests[0].cancel();
    const results = await settled;
    return { queued, cancelled, rejected: results.filter(result => result.status === 'rejected').length,
      cancelledStates: actualRequests.filter(request => request.state === CancelledState).length,
      stats: handle.getStats(), rendererCount: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  assert.equal(observations.queue.queued, 48); assert.equal(observations.queue.cancelled, 48);
  assert.equal(observations.queue.rejected, 70); assert.equal(observations.queue.cancelledStates, 70);
  assert.equal(observations.queue.stats.queuedTiles, 0); assert(observations.queue.stats.cacheSize <= 64);
  assert.equal(observations.queue.rendererCount, 1);
  checks.push('serial work queue stays at 48, dropped/view-cancelled requests use Cesium cancellation, and cancellation creates no extra WebGL contexts');

  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ status: 502, contentType: 'application/octet-stream', body: '' }));
  observations.failure = await page.evaluate(async () => {
    const tile = tileAt(50.6, 9.6, 14), image = await handle.provider.requestImage(tile.x, tile.y, tile.z);
    return { image: await imageFacts(image), stats: handle.getStats(), status: statuses.at(-1) };
  });
  assert.equal(observations.failure.image.visible, 0, 'failed top layer stays transparent to the photograph underneath');
  assert(observations.failure.stats.failedTiles > 0); assert.equal(observations.failure.status, 'degraded');
  checks.push('network errors produce transparent fallback and degraded status instead of a false ready tile');
  await page.unroute('**/scenery/vector/*/*/*.pbf');

  observations.cleanup = await page.evaluate(async () => {
    const tile = tileAt(50.7, 9.8, 14), pending = handle.provider.requestImage(tile.x, tile.y, tile.z).catch(() => 'cancelled');
    handle.dispose(); handle.dispose(); await pending;
    return { stats: handle.getStats(), rendererCount: document.querySelectorAll('[data-map-terrain-renderer]').length,
      afterDispose: handle.provider.requestImage(tile.x, tile.y, tile.z) === undefined };
  });
  assert.equal(observations.cleanup.rendererCount, 0); assert.equal(observations.cleanup.stats.cacheSize, 0);
  assert.equal(observations.cleanup.stats.queuedTiles, 0); assert.equal(observations.cleanup.afterDispose, true);
  checks.push('disposal cancels active/queued work, removes the renderer and releases cache references');

  observations.signal = await page.evaluate(async () => {
    const abort = new AbortController(), statuses = [];
    const handle = await createMapTerrainImagery({ signal: abort.signal, onStatus: status => statuses.push(status) });
    const tile = tileAt(49.9116, 8.6348, 14);
    const pending = [handle.provider.requestImage(tile.x, tile.y, tile.z), handle.provider.requestImage(tile.x + 1, tile.y, tile.z)];
    const settled = Promise.allSettled(pending); abort.abort();
    return { rejected: (await settled).filter(result => result.status === 'rejected').length,
      stats: handle.getStats(), renderers: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  assert.equal(observations.signal.rejected, 2); assert.equal(observations.signal.stats.queuedTiles, 0);
  assert.equal(observations.signal.stats.cacheSize, 0); assert.equal(observations.signal.renderers, 0);
  checks.push('AbortSignal cancels active and queued jobs and removes the hidden renderer');

  await page.route('**/mapdata/terrain-style.json', route => route.fulfill({ contentType: 'application/json', body: '{"version":8,"glyphs":"https://example.invalid/font"}' }));
  const tampered = await page.evaluate(async () => { try { await createMapTerrainImagery(); return 'accepted'; } catch (error) { return error.message; } });
  assert.match(tampered, /hash mismatch/); assert.equal(await page.locator('[data-map-terrain-renderer]').count(), 0);
  await page.unroute('**/mapdata/terrain-style.json');
  assert.equal(requests.some(url => /\/fonts?\/|example\.invalid|\.pbf\?/.test(url)), false);
  assert.deepEqual(pageErrors, []);
  checks.push('style tampering is rejected before creating a renderer and imported style cannot fetch fonts or external resources');
  await writeFile(`${output}/map-terrain-imagery-browser.json`,JSON.stringify({result:'pass',checks,observations,browser:await browser.version()},null,2)+'\n');
  console.log(JSON.stringify({ result: 'pass', checks, observations, browser: await browser.version() }, null, 2));
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  // Vite may wait for cancelled upstream proxy work during graceful shutdown.
  // This isolated test server must not hold the browser gate open indefinitely.
  await new Promise(resolve => {
    if (server.exitCode !== null || server.signalCode !== null) { resolve(); return; }
    const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 2000);
    server.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
