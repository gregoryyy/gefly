// Actual Cesium, MapLibre and native worker; country imagery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.GEFLY_COUNTRY_PHOTO_PORT || 5517);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/country-photo-vite',server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser, activePage, activeRequests = [], requestPhase = '3d';
server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
const checks = [], errors = [];

async function visibleRedPixels(locator) {
  const screenshot = await locator.screenshot();
  const script = `import io,sys\nfrom PIL import Image\nim=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB')\nprint(sum(r>90 and r>g*1.5 and r>b*1.5 for r,g,b in im.getdata()))`;
  const child = spawnSync('python3', ['-c', script], { input: screenshot, maxBuffer: 1024 });
  assert.equal(child.status, 0, `PNG screenshot analysis failed: ${child.stderr}`);
  return Number(child.stdout.toString().trim());
}

async function waitForRedPixels(locator, minimum = 500) {
  for (let i = 0; i < 30; i++) {
    const pixels = await visibleRedPixels(locator);
    if (pixels >= minimum) return pixels;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Rendered photo fixture never reached ${minimum} red pixels`);
}

function tile(red, green, blue, alpha = 255, size = 256) {
  const crc32 = bytes => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
  const chunk = (name, bytes) => { const type = Buffer.from(name), len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([type, bytes]))); return Buffer.concat([len, type, bytes, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = y * (1 + size * 4) + 1 + x * 4; raw[i] = red; raw[i + 1] = green; raw[i + 2] = blue; raw[i + 3] = alpha; }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

try {
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(log);
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 149) throw new Error(`Vite unavailable: ${log}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  for (const place of [{ id: 'ch', lat: 47.3769, lon: 8.5417, name: 'Zürich' }, { id: 'at', lat: 48.2082, lon: 16.3738, name: 'Vienna' },
    { id: 'ch', lat: 47.3769, lon: 8.5417, name: 'Zürich photo failure', fail: true },
    { id: 'ch', lat: 47.3769, lon: 8.5417, name: 'Zürich transparent coverage gap', transparent: true }].filter(p => !process.env.GEFLY_COUNTRY_PHOTO_CASE || p.name === process.env.GEFLY_COUNTRY_PHOTO_CASE)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage(), requests = [], failures = []; activePage = page; activeRequests = requests; requestPhase = '3d';
    let recovered = !place.fail, mapOnlyFailure = false;
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(({ lat, lon }) => {
      localStorage.setItem('gefly.flight-location.v1', JSON.stringify({ version: 1, lat_rad: lat * Math.PI / 180,
        lon_rad: lon * Math.PI / 180, alt_msl_m: 2200, heading_rad: Math.PI / 2, mode: 'airborne' }));
      const Native = Worker; window.__countryStats = [];
      window.Worker = class extends Native {
        constructor(...args) { super(...args); if (String(args[0]).includes('/sim/worker.js')) { window.__countryWorker = this; this.addEventListener('message', ({ data }) => { if (data.type === 'stats') window.__countryStats.push(data); }); } }
      };
    }, place);
    await installSceneryFixture(page);
    // The generic 512px fixture is opaque everywhere, unlike the real WMS.
    // Transparent German tiles cannot hide country photography in this test.
    const transparentGerman = tile(0, 0, 0, 0, 512);
    await page.route('**/scenery/imagery/**', route => route.fulfill({ contentType: 'image/png', body: transparentGerman }));
    // A valid empty vector tile still renders the OSM style background.
    await page.route('**/scenery/osm/**', route => route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) }));
    const opaque = tile(191, 48, 41), transparent = tile(0, 0, 0, 0);
    await page.route('**/scenery/photo-country/**', route => {
      const match = new URL(route.request().url()).pathname.match(/^\/scenery\/photo-country\/(ch|at)\/(\d+)\/(\d+)\/(\d+)\.png$/);
      if (!match) return route.abort();
      requests.push({ path: match[0], id: match[1], z: Number(match[2]), phase: requestPhase, at: Date.now(), priority: route.request().headers()['x-gefly-scenery-priority'] });
      if (match[1] === place.id && (!recovered || mapOnlyFailure) && Number(match[2]) >= 7) { failures.push(match[0]); return route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: '' }); }
      return route.fulfill({ contentType: 'image/png', body: Number(match[2]) < 7 || place.transparent || match[1] !== place.id ? transparent : opaque });
    });
    await page.route('**/src/scene.ts*', async route => {
      const response = await route.fetch(), source = await response.text(), marker = 'const scene = widget.scene;';
      assert.equal(source.split(marker).length, 2, 'Cesium observation marker');
      await route.fulfill({ response, body: source.replace(marker, 'const scene = window.__countryScene = widget.scene;') });
    });
    await page.route('**/src/practice-map.ts*', async route => {
      const response = await route.fetch(), source = await response.text(), marker = 'map = new LibreMap({';
      assert.equal(source.split(marker).length, 2, 'MapLibre observation marker');
      await route.fulfill({ response, body: source.replace(marker, 'map = window.__countryMap = new LibreMap({') });
    });
    await page.goto(origin);
    await page.waitForFunction(() => window.__countryScene && window.__countryWorker && !document.querySelector('#start')?.disabled, null, { timeout: 90000 });
    await prepareFlightUI(page, { controls: false });
    await page.waitForFunction(id => performance.getEntriesByType('resource').some(e => e.name.includes(`/scenery/photo-country/${id}/`)), place.id, { timeout: 45000 });
    assert(requests.some(r => r.id === place.id && r.priority === 'visible'), `${place.name}: Cesium requests same-origin source at visible priority`);
    const sceneCanvas = page.locator('#scene canvas').first();
    let threeDimensionalPixels;
    if (place.fail || place.transparent) {
      if (place.fail) await page.waitForFunction(() => document.querySelector('#imagery-status')?.textContent?.includes('temporarily unavailable'), null, { timeout: 45000 });
      await page.waitForTimeout(1500); threeDimensionalPixels = await visibleRedPixels(sceneCanvas);
      assert(threeDimensionalPixels < 500, 'failed or transparent photography does not cover the 3D terrain');
      if (place.fail) {
        assert(failures.some(path => path.includes('/ch/')), 'actual failure reached the 3D source');
        assert(await page.evaluate(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.isBlocked('ch')));
        assert(!await page.evaluate(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.isBlocked('at')), 'unaffected source remains available');
      if (place.fail) {
        const beforeSettle = requests.length; requestPhase = '3d-settle';
        const breakerState = () => page.evaluate(async () => { const backoff = (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff;
          return { blocked: backoff.isBlocked('ch'), generation: backoff.generation('ch') }; });
        const startBreaker = await breakerState();
        assert(startBreaker.blocked, 'Swiss source must be blocked before measuring settled demand');
        const windows = [];
        for (let window = 0; window < 2; window++) {
          const beforeWindow = requests.length;
          await page.waitForTimeout(5000);
          const state = await breakerState();
          assert(state.blocked && state.generation === startBreaker.generation, 'Swiss breaker must remain blocked throughout each measurement window');
          const perCountry = Object.fromEntries(['ch', 'at'].map(id => {
            const paths = requests.slice(beforeWindow).filter(request => request.id === id).map(request => request.path);
            return [id, { requests: paths.length, unique: new Set(paths).size, repeated: paths.length - new Set(paths).size }];
          }));
          windows.push({ perCountry, breaker: state });
          assert(perCountry.ch.requests <= 20, `stationary 3D camera still generated ${perCountry.ch.requests} failed Swiss requests in 5 seconds`);
          assert.equal(perCountry.at.repeated, 0, 'unaffected Austria source must not retry the same tile during the settled window');
        }
        console.log('Country fixed-camera failure load:', JSON.stringify({ startBreaker, windows, beforeSettle, windowMs: 5000 }));
      }
      }
      else assert(!failures.some(path => path.includes('/ch/')), 'transparent coverage gap is not treated as a Swiss source failure');
      await page.waitForFunction(() => {
        const scene = document.querySelector('#scene');
        return scene?.dataset.worldMap === 'ready' && Number(scene.dataset.worldMapLoaded) > 0;
      }, null, { timeout: 45000 });

    } else threeDimensionalPixels = await waitForRedPixels(sceneCanvas);
    if (!place.fail && !place.transparent) {
      assert.equal(await page.locator('#scene .cesium-widget-credits').count(), 0, 'live Cesium credits do not cover the scenery');
      await page.evaluate(() => { Object.defineProperty(Element.prototype, 'checkVisibility', { configurable: true, value: undefined }); });
      if (!await page.locator('.topbar').isVisible()) { await page.locator('#scene').focus(); await page.keyboard.press('i'); }
      await page.locator('#credits-menu > summary').click();
      const expected = place.id === 'ch' ? /Includes material © \(2016-2018\) Planet\. All rights reserved/ : /Datenquelle: basemap\.at/;
      await page.waitForFunction(pattern => new RegExp(pattern).test(document.querySelector('#scene-credits')?.textContent || ''), expected.source, { timeout: 45000 });
      assert(await page.locator('#scene-credits').isVisible(), 'live Cesium provider credit is readable in menu');
      assert(await page.locator('#scene-credits a').count() > 0, 'credit links remain accessible');
      await page.setViewportSize({ width: 390, height: 900 });
      const mobileCreditBox = await page.locator('#credits-menu .credits-content').boundingBox();
      assert(mobileCreditBox && mobileCreditBox.x >= 0 && mobileCreditBox.x + mobileCreditBox.width <= 390, 'Credits remains inside a narrow viewport');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.keyboard.press('Escape');
      await page.evaluate(() => { const lightbox = document.createElement('div'); lightbox.className = 'cesium-credit-lightbox-overlay'; lightbox.id = 'test-visible-credit-lightbox'; lightbox.style.cssText = 'display:block;position:fixed;top:0;left:0;width:50px;height:50px;'; document.body.append(lightbox); });
      await page.locator('#scene').focus(); await page.keyboard.press('m');
      assert(await page.locator('#practice-map-panel').isHidden(), 'visible credit lightbox guards flight shortcuts without checkVisibility');
      await page.evaluate(() => document.querySelector('#test-visible-credit-lightbox').remove());
      if (await page.locator('.topbar').isVisible()) { await page.locator('#scene').focus(); await page.keyboard.press('i'); }
    }
    const order = await page.evaluate(() => [...window.__countryScene.imageryLayers._layers].map(layer => ({ url: layer.imageryProvider?.url || '', show: layer.show })));
    const layerAt = id => order.findIndex(layer => layer.url.includes(`/scenery/photo-country/${id}/`));
    assert(layerAt(place.id) >= 0 && order[layerAt(place.id)].show === !place.fail, `${place.name}: country layer is enabled unless in backoff`);
    const german = order.findIndex(layer => layer.url.includes('/scenery/imagery/'));
    if (german >= 0) assert(german > layerAt(place.id), 'German photo remains above country layers');
    const beforeStats = await page.evaluate(() => window.__countryStats.length);
    await page.evaluate(() => window.__countryWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.__countryStats.length > n, beforeStats);
    const before = await page.evaluate(() => window.__countryStats.at(-1));
    requestPhase = 'map-open'; await page.locator('#scene').focus(); await page.keyboard.press('m');
    await page.waitForFunction(() => !!window.__countryMap && window.__countryMap.isStyleLoaded(), null, { timeout: 45000 });
    const map = page.locator('#practice-map-panel');
    await page.locator('#scene').focus(); await page.keyboard.press(',');
    await page.waitForFunction(() => document.querySelector('#practice-map-panel')?.dataset.extendedMenu === 'true');
    requestPhase = 'map-aerial'; await map.getByRole('button', { name: 'Show aerial imagery' }).click();
    await page.evaluate(({ lat, lon }) => window.__countryMap.jumpTo({ center: [lon, lat], zoom: 10 }), place);
    await page.waitForFunction(({id,fail}) => window.__countryMap.getLayoutProperty(`country-photo-${id}`, 'visibility') === (fail ? 'none' : 'visible'), place);
    const style = await page.evaluate(() => window.__countryMap.getStyle());
    const ids = style.layers.map(layer => layer.id);
    assert(ids.indexOf('imagery') > ids.indexOf(`country-photo-${place.id}`), 'German imagery is composited last');
    const attr = style.sources[`country-photo-${place.id}`].attribution;
    assert.match(attr, place.id === 'ch' ? /swisstopo.*Planet/ : /basemap\.at.*CC BY 4\.0/);
    if (!place.fail && !place.transparent) {
      await page.waitForFunction(id => document.querySelector('#map-credits')?.textContent?.includes(id === 'ch' ? 'swisstopo' : 'basemap.at'), place.id, { timeout: 45000 });
      if (!await page.locator('.topbar').isVisible()) { await page.locator('#scene').focus(); await page.keyboard.press('i'); }
      await page.locator('#credits-menu > summary').click();
      assert(await page.locator('#map-credits').isVisible(), 'live MapLibre attribution is readable in Credits');
      assert(await page.locator('#map-credits a').count() > 0, 'map attribution links remain accessible');
      await page.keyboard.press('Escape');
      if (await page.locator('.topbar').isVisible()) { await page.locator('#scene').focus(); await page.keyboard.press('i'); }
    }
    await page.waitForFunction(id => performance.getEntriesByType('resource').filter(e => e.name.includes(`/scenery/photo-country/${id}/`)).length > 0, place.id);
    let aerialPixels;
    if (place.fail || place.transparent) {
      await page.waitForTimeout(1500); aerialPixels = await visibleRedPixels(map.locator('.maplibregl-canvas'));
      assert(aerialPixels < 500, 'failed photography leaves the map fallback visible');
      assert(style.layers.some(layer => layer.id === 'world-background'), 'OSM map background remains below failed photo sources');
    } else aerialPixels = await waitForRedPixels(map.locator('.maplibregl-canvas'));
    if (place.fail) {
      recovered = true; const retryStart = requests.length;
      await page.evaluate(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.retry('ch'));
      await page.waitForFunction(() => window.__countryMap.getLayoutProperty('country-photo-ch', 'visibility') === 'visible');
      await waitForRedPixels(sceneCanvas); await waitForRedPixels(map.locator('.maplibregl-canvas'));
      assert(requests.slice(retryStart).some(request => request.id === 'ch'), 'recovery issues fresh Swiss tile requests');
      await page.waitForFunction(() => !document.querySelector('#imagery-status')?.textContent?.includes('temporarily unavailable'));
      checks.push('Swiss source recovers in both renderers without replacing the map or terrain');
    }
    await map.getByRole('button', { name: 'Show public map', exact: true }).click();
    assert.equal(await page.evaluate(id => window.__countryMap.getLayoutProperty(`country-photo-${id}`, 'visibility'), place.id), 'none');
    await page.waitForTimeout(500);
    if (!place.fail && !place.transparent) assert(await visibleRedPixels(map.locator('.maplibregl-canvas')) < aerialPixels * .1, 'Map mode removes the photo pixels and reveals the underlying map');
    await map.getByRole('button', { name: /Use (?:detailed OSM map|map without labels) as terrain texture/ }).click();
    await page.waitForFunction(id => [...window.__countryScene.imageryLayers._layers].some(layer => layer.imageryProvider?.url?.includes(`/scenery/photo-country/${id}/`) && !layer.show), place.id);
    if (place.id === 'ch' && !place.fail && !place.transparent) {
      mapOnlyFailure = true;
      await page.evaluate(() => { window.__sourceBeforeModeReturn = window.__countryMap.getSource('country-photo-ch'); });
      await map.getByRole('button', { name: 'Show aerial imagery' }).click();
      await page.waitForFunction(() => window.__countryMap.getSource('country-photo-ch') !== window.__sourceBeforeModeReturn);
      await page.waitForFunction(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.isBlocked('ch'), null, { timeout: 45000 });
      await page.waitForFunction(() => window.__countryMap.getLayoutProperty('country-photo-ch', 'visibility') === 'none');
      assert.match(await page.locator('.practice-map-status').textContent(), /Switzerland photography temporarily unavailable/);
      await page.waitForTimeout(1000);
      const stable = requests.length; await page.waitForTimeout(5000);
      assert(requests.length - stable <= 5, 'MapLibre stops requesting the failed country at a fixed map view');
      // Keep the outage active through a second retry: reloaded tile errors
      // must receive fresh generation tickets and open the breaker again.
      await page.evaluate(() => { window.__oldCountrySource = window.__countryMap.getSource('country-photo-ch'); });
      await page.evaluate(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.retry('ch'));
      await page.waitForFunction(() => window.__countryMap.getSource('country-photo-ch') !== window.__oldCountrySource);
      await page.waitForFunction(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.isBlocked('ch'), null, { timeout: 45000 });
      await page.waitForFunction(() => window.__countryMap.getLayoutProperty('country-photo-ch', 'visibility') === 'none');
      await page.waitForTimeout(1000); const stableAgain = requests.length; await page.waitForTimeout(5000);
      assert(requests.length - stableAgain <= 5, 'persistent failure remains bounded after a second retry');
      const idsAfterRetry = await page.evaluate(() => window.__countryMap.getStyle().layers.map(layer => layer.id));
      assert(idsAfterRetry.indexOf('country-photo-ch') < idsAfterRetry.indexOf('country-photo-at')
        && idsAfterRetry.indexOf('country-photo-at') < idsAfterRetry.indexOf('imagery'), 'country retry preserves CH / AT / German imagery ordering');
      assert(idsAfterRetry.includes('flight-plan-route-line') && idsAfterRetry.includes('gps-target-line'), 'country retry preserves plan and GPS overlays');
      mapOnlyFailure = false; const retryStart = requests.length;
      await page.evaluate(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.retry('ch'));
      await page.waitForFunction(() => window.__countryMap.getLayoutProperty('country-photo-ch', 'visibility') === 'visible');
      await waitForRedPixels(map.locator('.maplibregl-canvas'));
      assert(requests.slice(retryStart).some(request => request.id === 'ch'), 'MapLibre source-only refresh issues fresh tile requests');
      assert(!await page.evaluate(async () => (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff.isBlocked('ch')));
      assert(!(await page.locator('.practice-map-status').textContent()).includes('Switzerland photography temporarily unavailable'), 'source-specific notice clears on recovery');
      assert(!(await page.locator('.practice-map-status').textContent()).includes('Some map tiles unavailable'), 'country failures do not latch a global map failure');
      await map.getByRole('button', { name: 'Show public map', exact: true }).click();
      await page.waitForTimeout(1500);
      const off = requests.length;
      await page.evaluate(async () => { const c = (await import('/src/country-photo-backoff.ts')).countryPhotoBackoff;
        const generation = c.generation('ch'); c.failure('ch', generation); c.failure('ch', generation); c.failure('ch', generation); c.retry('ch'); });
      await page.waitForTimeout(2000);
      assert.equal(requests.length, off, 'retry while 3D vector and 2D Map are active makes no photo requests');
      checks.push('MapLibre-only outage hides the affected source, recovers it without map reset, and retries do not request photos while both views are off');
    }
    const beforeAfter = await page.evaluate(() => window.__countryStats.length);
    await page.evaluate(() => window.__countryWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.__countryStats.length > n, beforeAfter);
    const after = await page.evaluate(() => window.__countryStats.at(-1));
    assert.equal(after.step, before.step, `${place.name}: modes leave paused step unchanged`);
    assert.equal(after.digest, before.digest, `${place.name}: modes leave paused flight unchanged`);
    const counts = new Map(); for (const request of requests) counts.set(request.path, (counts.get(request.path) ?? 0) + 1);
    const repeats = [...counts.values()].filter(count => count > 2);
    const zooms = {}; for (const request of requests) zooms[`${request.id}:${request.z}`] = (zooms[`${request.id}:${request.z}`] ?? 0) + 1;
    console.log('Country request totals:', JSON.stringify({ place: place.name, requests: requests.length, unique: counts.size,
      elapsedMs: requests.length ? requests.at(-1).at - requests[0].at : 0,
      phases: Object.fromEntries(['3d','3d-settle','map-open','map-aerial'].map(phase => [phase, requests.filter(request => request.phase === phase).length])), zooms, repeatedOverTwice: repeats.length }));
    if (place.transparent || (place.id === 'at' && !place.fail)) assert.equal(repeats.length, 0, `${place.name}: no single country tile repeatedly retried`);
    checks.push(`${place.name}: Cesium ${threeDimensionalPixels} red pixels, MapLibre ${aerialPixels}, credit, layer order, OSM/vector modes and paused state`);
    console.log(`PASS ${checks.at(-1)}`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'pass', browser: browser.version(), checks, limits: ['Synthetic scenery and country photo responses; actual upstream, borders and real image composition are verified separately.', 'No claims about physical terrain, real-world flight or source completeness.'] }, null, 2));
} catch (error) {
  const counts = new Map(); for (const request of activeRequests) counts.set(request.path, (counts.get(request.path) ?? 0) + 1);
  console.error('Country request diagnostics:', { requests: activeRequests.length, unique: counts.size,
    elapsedMs: activeRequests.length ? activeRequests.at(-1).at - activeRequests[0].at : 0,
    phases: Object.fromEntries(['3d','3d-settle','map-open','map-aerial'].map(phase => [phase, activeRequests.filter(request => request.phase === phase).length])),
    repeated: [...counts].filter(([, count]) => count > 2).sort((a, b) => b[1] - a[1]).slice(0, 8) });
  if (activePage) console.error('Country imagery diagnostics:', await activePage.evaluate(() => ({ notice: document.querySelector('#notice')?.textContent,
    panel: document.querySelector('#practice-map-panel')?.textContent?.slice(0, 1000), styles: window.__countryMap?.getStyle()?.layers?.map(layer => layer.id),
    scene: document.querySelector('#scene')?.dataset.imagery })).catch(() => null));
  throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
