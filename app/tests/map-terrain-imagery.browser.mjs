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
    window.createMapTerrainImagery=createMapTerrainImagery;window.CesiumRequest=Request;window.CancelledState=RequestState.CANCELLED;window.UnissuedState=RequestState.UNISSUED;
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
    const tile=tileAt(49.9116,8.6348,14),tiles=Array.from({length:30},(_,i)=>({...tile,x:tile.x+i%7,y:tile.y+Math.floor(i/7)}));
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
  assert.equal(observations.realTiming.afterRevisit.loadedTiles,observations.realTiming.afterCold.loadedTiles,'real30-tile working set revisits without redraw');
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
  assert.equal(observations.cache.stats.cacheSize, 32);
  assert.equal(observations.cache.stats.cacheBytes,32*1024*1024); assert.equal(observations.cache.rendererCount, 1);
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
  checks.push('66 controlled tile jobs evict old canvases at the 32-image/32MiB per-profile cap (64MiB combined regional/world) while retaining one renderer');

  // Saturation must defer unaccepted requests, rather than evicting existing
  // imagery. Use the previously captured PBF so the retry does not depend on
  // the public server's availability.
  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: sourceTile }));
  observations.queue = await page.evaluate(async () => {
    const tile = tileAt(50.3, 8.9, 14), accepted = [], deferred = [];
    for (let i = 0; i < 70; i++) {
      const request = new CesiumRequest(), x = tile.x + i % 10, y = tile.y + Math.floor(i / 10);
      const promise = handle.provider.requestImage(x, y, tile.z, request);
      (promise === undefined ? deferred : accepted).push({ request, x, y, promise });
    }
    const joinedRequest = new CesiumRequest();
    const joined = handle.provider.requestImage(tile.x, tile.y, tile.z, joinedRequest);
    const queued = handle.getStats().queuedTiles;
    const intact = accepted.every(({request}) => !request.cancelled && request.state !== CancelledState);
    const deferredUntouched = deferred.every(({request}) => request.state === UnissuedState && !request.cancelled && !request.cancelFunction);
    const settled = Promise.allSettled([...accepted.map(({promise}) => promise), joined]);
    const cancelled = handle.cancelQueued(); accepted[0].request.cancel(); joinedRequest.cancel();
    const results = await settled;
    const retry = deferred[0], retried = handle.provider.requestImage(retry.x, retry.y, tile.z, retry.request);
    return { queued, cancelled, accepted: accepted.length, deferred: deferred.length, joined: joined !== undefined,
      intact, deferredUntouched, cancelledStates: [...accepted.map(({request}) => request), joinedRequest].filter(request => request.state === CancelledState).length,
      rejected: results.filter(result => result.status === 'rejected').length,
      retryAccepted: retried !== undefined, retryImage: retried ? await imageFacts(await retried) : null,
      stats: handle.getStats(), rendererCount: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  assert.equal(observations.queue.queued, 0); assert.equal(observations.queue.cancelled, 0);
  assert.equal(observations.queue.accepted, 1); assert.equal(observations.queue.deferred, 69);
  assert(observations.queue.joined, 'duplicate requests coalesce even at capacity');
  assert(observations.queue.intact, 'saturation must not cancel accepted work');
  assert(observations.queue.deferredUntouched, 'deferred Cesium requests remain unissued');
  assert.equal(observations.queue.rejected, 2); assert.equal(observations.queue.cancelledStates, 2);
  assert(observations.queue.retryAccepted && observations.queue.retryImage.visible > 512 * 512 * .9, 'deferred work succeeds once capacity returns');
  assert.equal(observations.queue.stats.queuedTiles, 0); assert(observations.queue.stats.cacheSize <= 32);
  assert.equal(observations.queue.rendererCount, 1);
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('one active renderer coalesces duplicate requests and defers other work to Cesium; cancellation and retry make progress');

  // Exercise real Cesium tile selection: a pan while the single renderer is
  // busy must allow the new view to progress instead of serving a stale FIFO.
  await page.route('**/scenery/vector/*/*/*.pbf', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    try { await route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: sourceTile }); } catch { /* page closed */ }
  });
  await page.evaluate(async () => {
    const C = await import('/node_modules/.vite/deps/cesium.js');
    window.__mainMapTerrainRenderer = window.__mapTerrainRenderer;
    const div = document.createElement('div'); div.id = 'pan-globe';
    Object.assign(div.style, {position:'fixed',left:'0',top:'0',width:'800px',height:'600px'}); document.body.append(div);
    const panHandle = await createMapTerrainImagery();
    const original = panHandle.provider.requestImage.bind(panHandle.provider), completed = [];
    let accepted = 0, deferred = 0;
    panHandle.provider.requestImage = (x, y, z, request) => {
      const image = original(x, y, z, request);
      if (image === undefined) deferred++; else { accepted++; image.then(() => completed.push({x,y,z}), () => {}); }
      return image;
    };
    const viewer = new C.Viewer(div, { baseLayer: false, terrainProvider: new C.EllipsoidTerrainProvider(),
      animation:false, timeline:false, geocoder:false, homeButton:false, sceneModePicker:false,
      baseLayerPicker:false, navigationHelpButton:false, fullscreenButton:false, infoBox:false,
      selectionIndicator:false, skyBox:false, skyAtmosphere:false, useDefaultRenderLoop:true });
    viewer.imageryLayers.addImageryProvider(panHandle.provider);
    const set = (lon, lat) => viewer.camera.setView({ destination:C.Cartesian3.fromDegrees(lon,lat,22000),
      orientation:{heading:0,pitch:-Math.PI/2,roll:0} });
    window.panFixture = { viewer, panHandle, completed, set, counts: () => ({accepted,deferred}) };
    set(8.63,49.91);
  });
  await page.waitForFunction(() => panFixture.counts().accepted > panFixture.completed.length, null, { timeout: 15000 });
  await page.evaluate(() => { panFixture.panStarted = performance.now(); panFixture.set(11.58,48.14); });
  await page.waitForFunction(() => panFixture.completed.some(tile => {
    const target = tileAt(48.14,11.58,tile.z); return tile.x === target.x && tile.y === target.y;
  }), null, { timeout: 30000 });
  observations.pan = await page.evaluate(() => {
    const result = { elapsed:performance.now()-panFixture.panStarted, counts:panFixture.counts(), stats:panFixture.panHandle.getStats(), completed:panFixture.completed };
    panFixture.viewer.destroy(); panFixture.panHandle.dispose(); document.querySelector('#pan-globe').remove(); return result;
  });
  assert(observations.pan.counts.deferred > 0, 'actual Cesium defers work while the renderer is busy');
  assert.equal(observations.pan.stats.queuedTiles, 0, 'no obsolete pending FIFO remains after the pan');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('a real Cesium camera pan makes progress on the new view while imagery requests are deferred');

  // A slow source must not clear all MapLibre sources/cache every 12 seconds.
  let slowRequests = 0;
  await page.route('**/scenery/vector/*/*/*.pbf', async route => {
    slowRequests++;
    await new Promise(resolve => setTimeout(resolve, 12500));
    try { await route.fulfill({status:502,contentType:'application/octet-stream',body:''}); } catch { /* viewport already changed */ }
  });
  const slowResult = page.evaluate(async () => {
    const renderer = window.__mainMapTerrainRenderer, previous = renderer.setStyle.bind(renderer);
    window.timeoutStyleResets = 0;
    renderer.setStyle = (next, options) => {
      if (next && typeof next === 'object' && Object.keys(next.sources ?? {}).length === 0) timeoutStyleResets++;
      return previous(next, options);
    };
    window.timeoutLateErrors=[];
    renderer.on('error',event=>{if(event.sourceId && event.tile?.tileID?.canonical)timeoutLateErrors.push(event.sourceId);});
    const tile = tileAt(50.9, 13.5, 14), before = handle.getStats(), started = performance.now(), request = new CesiumRequest();
    let rejected = false;
    try { await handle.provider.requestImage(tile.x, tile.y, tile.z, request); } catch { rejected = true; }
    const retry = new CesiumRequest(), statusCount = statuses.length, duringCooldown = handle.provider.requestImage(tile.x, tile.y, tile.z, retry);
    for (let i = 0; i < 200; i++) handle.provider.requestImage(tile.x, tile.y, tile.z, new CesiumRequest());
    return { tile, elapsed:performance.now() - started, rejected, cancelled:request.state===CancelledState,
      cooldownDeferred:duringCooldown===undefined, retryUnissued:retry.state===UnissuedState, cooldownNotifications:statuses.length-statusCount, before,
      after:handle.getStats(), resets:timeoutStyleResets, status:statuses.at(-1) };
  });
  observations.timeout = await slowResult;
  assert(slowRequests > 0, 'timeout fixture actually holds source requests');
  assert(observations.timeout.elapsed >= 11000, 'the affected job reaches its actual timeout');
  assert(observations.timeout.rejected && observations.timeout.cancelled, 'Cesium receives a retriable cancellation rather than a ready blank');
  assert(observations.timeout.cooldownDeferred && observations.timeout.retryUnissued, 'cooldown defers rather than caching an empty tile');
  assert.equal(observations.timeout.cooldownNotifications, 0, 'repeated cooldown requests do not repeatedly notify or render');
  assert.equal(observations.timeout.after.failedTiles, observations.timeout.before.failedTiles + 1);
  assert.equal(observations.timeout.status, 'degraded');
  assert.equal(observations.timeout.resets, 0, 'a timeout must not discard all MapLibre source data');
  await page.waitForFunction(() => timeoutLateErrors.length > 0, null, {timeout:5000});
  assert.equal(await page.evaluate(() => handle.getStats().queuedTiles), 0, 'late source errors arrive while no job is active');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  await page.route('**/scenery/vector/*/*/*.pbf', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    try { await route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: sourceTile }); } catch { /* cancelled */ }
  });
  observations.afterTimeout = await page.evaluate(async () => {
    const tile = tileAt(49.9, 7, 14), image = await handle.provider.requestImage(tile.x, tile.y, tile.z);
    return { image:await imageFacts(image), resets:timeoutStyleResets, stats:handle.getStats() };
  });
  assert(observations.afterTimeout.image.visible > 512 * 512 * .9, 'a new view can render after a timeout');
  assert.equal(observations.afterTimeout.resets, 0);
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: sourceTile }));
  observations.sameTileRetry = await page.evaluate(async tile => {
    const realNow = Date.now, renderer=window.__mainMapTerrainRenderer, oldRefresh=renderer.refreshTiles.bind(renderer);
    const refreshes=[]; renderer.refreshTiles=(id,tiles)=>{refreshes.push({id,tiles});return oldRefresh(id,tiles);};
    // Advance only admission time; the actual tile is rendered by MapLibre.
    Date.now = () => realNow() + 31000;
    let image;
    try { image = handle.provider.requestImage(tile.x, tile.y, tile.z, new CesiumRequest()); }
    finally { Date.now = realNow; }
    const result={ accepted:image !== undefined, image:image ? await imageFacts(await image) : null, refreshes };
    renderer.refreshTiles=oldRefresh; return result;
  }, observations.timeout.tile);
  assert(observations.sameTileRetry.accepted && observations.sameTileRetry.image.visible > 512 * 512 * .9,
    'the same failed XYZ renders after its retry cooldown');
  assert(observations.sameTileRetry.refreshes.length>0,'late errors received while idle are refreshed selectively');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  // Exercise Cesium's actual imagery state machine: hold a visible tile until
  // it times out, restore the source, advance the cooldown clock, and verify
  // that the same XYZ becomes ready on a rendered globe tile.
  let holdCesiumSource = true;
  await page.route('**/scenery/vector/*/*/*.pbf', async route => {
    if (holdCesiumSource) {
      await new Promise(resolve => setTimeout(resolve, 14000));
      try { await route.abort(); } catch { /* no longer needed */ }
    } else {
      try { await route.fulfill({ contentType:'application/vnd.mapbox-vector-tile', body:sourceTile }); } catch { /* cancelled */ }
    }
  });
  await page.evaluate(async () => {
    const C = await import('/node_modules/.vite/deps/cesium.js');
    const div = document.createElement('div'); div.id = 'retry-globe';
    Object.assign(div.style, {position:'fixed',left:'0',top:'0',width:'800px',height:'600px'}); document.body.append(div);
    const retryHandle = await createMapTerrainImagery(), source = retryHandle.provider;
    const original = source.requestImage.bind(source), cancelled = [], completed = [];
    source.requestImage = (x,y,z,request) => {
      const result = original(x,y,z,request);
      if (result) result.then(() => completed.push({x,y,z}), () => {
        if (request?.state === CancelledState) cancelled.push({x,y,z});
      });
      return result;
    };
    const viewer = new C.Viewer(div, {baseLayer:false,terrainProvider:new C.EllipsoidTerrainProvider(),
      animation:false,timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,
      baseLayerPicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,
      selectionIndicator:false,skyBox:false,skyAtmosphere:false});
    viewer.imageryLayers.addImageryProvider(source);
    viewer.camera.setView({destination:C.Cartesian3.fromDegrees(8.63,49.91,22000),
      orientation:{heading:0,pitch:-Math.PI/2,roll:0}});
    window.retryFixture = {viewer,retryHandle,cancelled,completed,realNow:Date.now};
  });
  await page.waitForFunction(() => retryFixture.cancelled.length > 0, null, {timeout: 30000});
  holdCesiumSource = false;
  await page.evaluate(() => { const realNow = retryFixture.realNow; Date.now = () => realNow() + 31000; });
  await page.waitForFunction(() => {
    return retryFixture.cancelled.some(wanted => retryFixture.completed.some(tile => tile.x===wanted.x && tile.y===wanted.y && tile.z===wanted.z)
      && retryFixture.viewer.scene.globe._surface._tilesToRender.some(tile => tile.data?.imagery?.some(entry => {
        const ready = entry.readyImagery;
        return ready && ready.x===wanted.x && ready.y===wanted.y && ready.level===wanted.z;
      })));
  }, null, {timeout: 45000}).catch(async error => {
    const snapshot = await page.evaluate(() => ({ cancelled:retryFixture.cancelled, completed:retryFixture.completed,
      stats:retryFixture.retryHandle.getStats(), tiles:retryFixture.viewer.scene.globe._surface._tilesToRender.map(tile => ({
        x:tile.x,y:tile.y,level:tile.level, imagery:tile.data?.imagery?.map(entry => ({
          ready:entry.readyImagery && {x:entry.readyImagery.x,y:entry.readyImagery.y,level:entry.readyImagery.level},
          loading:entry.loadingImagery && {x:entry.loadingImagery.x,y:entry.loadingImagery.y,level:entry.loadingImagery.level,state:entry.loadingImagery.state},
        }))
      })) }));
    console.error('Cesium same-tile retry timeout', JSON.stringify(snapshot));
    throw error;
  });
  observations.realCesiumRetry = await page.evaluate(() => {
    const f = retryFixture, wanted = f.cancelled.find(candidate => f.completed.some(tile => tile.x===candidate.x && tile.y===candidate.y && tile.z===candidate.z)
      && f.viewer.scene.globe._surface._tilesToRender.some(tile => tile.data?.imagery?.some(entry => {
        const ready = entry.readyImagery;
        return ready && ready.x===candidate.x && ready.y===candidate.y && ready.level===candidate.z;
      })));
    const result = {wanted, cancelled:f.cancelled, completed:f.completed};
    Date.now = f.realNow; f.viewer.destroy(); f.retryHandle.dispose(); document.querySelector('#retry-globe').remove(); return result;
  });
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('real Cesium returns a timed-out visible XYZ to UNLOADED and renders the same tile after source recovery');
  checks.push('a slow-source timeout keeps the MapLibre style/cache and a later tile renders normally');

  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ status: 502, contentType: 'application/octet-stream', body: '' }));
  observations.failure = await page.evaluate(async () => {
    window.failureEvents = [];
    window.__mainMapTerrainRenderer.on('error', event => {
      const canonical = event.tile?.tileID?.canonical;
      failureEvents.push({ sourceId:event.sourceId, tile:canonical && {x:canonical.x,y:canonical.y,z:canonical.z}, message:event.error?.message });
    });
    const tile = tileAt(50.6, 9.6, 14), image = await handle.provider.requestImage(tile.x, tile.y, tile.z);
    return { image: await imageFacts(image), stats: handle.getStats(), status: statuses.at(-1), events:failureEvents };
  });
  assert.equal(observations.failure.image.visible, 0, 'failed top layer stays transparent to the photograph underneath');
  assert(observations.failure.stats.failedTiles > 0); assert.equal(observations.failure.status, 'degraded');
  assert(observations.failure.events.some(event => event.sourceId && event.tile), 'actual source failures expose source and canonical tile identity');
  checks.push('direct network-error request returns transparent fallback and records source-tile failures');
  await page.unroute('**/scenery/vector/*/*/*.pbf');

  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ status: 502, contentType:'application/octet-stream', body:'' }));
  observations.tileError = await page.evaluate(async () => {
    const tile = tileAt(50.4, 9.2, 14), request = new CesiumRequest(), beforeResets = timeoutStyleResets;
    let rejected = false; try { await handle.provider.requestImage(tile.x,tile.y,tile.z,request); } catch { rejected = true; }
    return { tile, rejected, cancelled:request.state === CancelledState, resets:timeoutStyleResets-beforeResets };
  });
  assert(observations.tileError.rejected && observations.tileError.cancelled, 'source error leaves Cesium tile retriable');
  assert.equal(observations.tileError.resets, 0, 'source tile failure does not clear the style/cache');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  await page.route('**/scenery/vector/*/*/*.pbf', route => route.fulfill({ contentType:'application/vnd.mapbox-vector-tile', body:sourceTile }));
  observations.tileErrorRetry = await page.evaluate(async tile => {
    const renderer = window.__mainMapTerrainRenderer, originalRefresh = renderer.refreshTiles.bind(renderer);
    let refreshes = [];
    renderer.refreshTiles = (sourceId, ids) => { refreshes.push({sourceId,ids}); return originalRefresh(sourceId,ids); };
    const realNow=Date.now; Date.now=()=>realNow()+31000; let image;
    try { image=handle.provider.requestImage(tile.x,tile.y,tile.z,new CesiumRequest()); } finally { Date.now=realNow; }
    const result = {accepted:image!==undefined, image:image ? await imageFacts(await image) : null, refreshes};
    renderer.refreshTiles=originalRefresh; return result;
  }, observations.tileError.tile);
  assert(observations.tileErrorRetry.accepted && observations.tileErrorRetry.image.visible > 512*512*.9, 'same failed XYZ renders after source recovery');
  assert(observations.tileErrorRetry.refreshes.length > 0 && observations.tileErrorRetry.refreshes.every(item => item.ids?.length === 1),
    'only individually identified failed MapLibre source tiles are refreshed');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('a source error retries the same output XYZ and refreshes only identified failed vector tiles');

  await page.route('**/scenery/vector/*/*/*.pbf', async route => {
    await new Promise(resolve => setTimeout(resolve, 600));
    try { await route.fulfill({contentType:'application/vnd.mapbox-vector-tile',body:sourceTile}); } catch { /* cancelled */ }
  });
  observations.staleError = await page.evaluate(async () => {
    const renderer=window.__mainMapTerrainRenderer, tile=tileAt(49.85,8,14), before=handle.getStats(), resets=timeoutStyleResets;
    const image=handle.provider.requestImage(tile.x,tile.y,tile.z,new CesiumRequest());
    await new Promise(resolve => setTimeout(resolve, 100));
    renderer.fire({type:'error',error:new Error('late old tile'),sourceId:'smarttiles_de',tile:{tileID:{canonical:{x:0,y:0,z:14}}}});
    return {image:await imageFacts(await image), before, after:handle.getStats(), resets:timeoutStyleResets-resets};
  });
  assert(observations.staleError.image.visible > 512*512*.9, 'old-view tile error cannot poison a different active viewport');
  assert.equal(observations.staleError.after.failedTiles, observations.staleError.before.failedTiles);
  assert.equal(observations.staleError.resets, 0);
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('a late, nonintersecting source-tile error does not fail the current output tile');

  let failCesiumSource = true;
  await page.route('**/scenery/vector/*/*/*.pbf', route => failCesiumSource
    ? route.fulfill({status:502,contentType:'application/octet-stream',body:''})
    : route.fulfill({contentType:'application/vnd.mapbox-vector-tile',body:sourceTile}));
  await page.evaluate(async () => {
    const C = await import('/node_modules/.vite/deps/cesium.js');
    const div=document.createElement('div'); div.id='error-retry-globe';
    Object.assign(div.style,{position:'fixed',left:'0',top:'0',width:'800px',height:'600px'}); document.body.append(div);
    const h=await createMapTerrainImagery(), source=h.provider, renderer=window.__mapTerrainRenderer;
    const oldSet=renderer.setStyle.bind(renderer), oldRefresh=renderer.refreshTiles.bind(renderer);
    let resets=0, refreshes=0;
    renderer.setStyle=(style,options)=>{if(style && typeof style==='object' && Object.keys(style.sources??{}).length===0) resets++; return oldSet(style,options);};
    renderer.refreshTiles=(id,tiles)=>{refreshes++; return oldRefresh(id,tiles);};
    const old=source.requestImage.bind(source), cancelled=[], completed=[], started=performance.now();
    source.requestImage=(x,y,z,request)=>{
      const result=old(x,y,z,request);
      if(result) result.then(()=>completed.push({x,y,z}),()=>{if(request?.state===CancelledState)cancelled.push({x,y,z,elapsed:performance.now()-started});});
      return result;
    };
    const viewer=new C.Viewer(div,{baseLayer:false,terrainProvider:new C.EllipsoidTerrainProvider(),animation:false,
      timeline:false,geocoder:false,homeButton:false,sceneModePicker:false,baseLayerPicker:false,
      navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,skyBox:false,skyAtmosphere:false});
    viewer.imageryLayers.addImageryProvider(source);
    viewer.camera.setView({destination:C.Cartesian3.fromDegrees(8.63,49.91,22000),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});
    window.errorRetryFixture={viewer,h,cancelled,completed,realNow:Date.now,counts:()=>({resets,refreshes})};
  });
  await page.waitForFunction(()=>errorRetryFixture.cancelled.length>0,null,{timeout:30000});
  failCesiumSource=false;
  await page.evaluate(()=>{const realNow=errorRetryFixture.realNow; Date.now=()=>realNow()+31000;});
  await page.waitForFunction(()=>errorRetryFixture.cancelled.some(wanted =>
    errorRetryFixture.completed.some(tile=>tile.x===wanted.x && tile.y===wanted.y && tile.z===wanted.z)
    && errorRetryFixture.viewer.scene.globe._surface._tilesToRender.some(tile=>tile.data?.imagery?.some(entry=>{
      const ready=entry.readyImagery; return ready && ready.x===wanted.x && ready.y===wanted.y && ready.level===wanted.z;
    }))),null,{timeout:45000});
  observations.realCesiumErrorRetry=await page.evaluate(()=>{
    const f=errorRetryFixture, result={cancelled:f.cancelled,completed:f.completed,counts:f.counts()};
    Date.now=f.realNow; f.viewer.destroy(); f.h.dispose(); document.querySelector('#error-retry-globe').remove(); return result;
  });
  assert(observations.realCesiumErrorRetry.cancelled[0].elapsed < 11000, 'the cancellation followed actual errors rather than the 12s timeout');
  assert.equal(observations.realCesiumErrorRetry.counts.resets,0,'source errors must not reset the whole MapLibre style');
  assert(observations.realCesiumErrorRetry.counts.refreshes>0,'actual viewer recovery refreshes failed source tiles');
  await page.unroute('**/scenery/vector/*/*/*.pbf');
  checks.push('real Cesium restores the same visible XYZ after a transient vector-source error without a style reset');

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
    return { rejected: (await settled).filter(result => result.status === 'rejected').length, deferred: pending.filter(item => item === undefined).length,
      stats: handle.getStats(), renderers: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  assert.equal(observations.signal.rejected, 1); assert.equal(observations.signal.deferred, 1); assert.equal(observations.signal.stats.queuedTiles, 0);
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
