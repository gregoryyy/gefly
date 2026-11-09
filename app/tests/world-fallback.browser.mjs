// TODO2.0.135: real OSM vector rendering, app/native world flight and recorded
// Review. Regional map/photo pixels are fixtures; world DEM and OSM are real.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5298';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const creditOnly = process.env.WORLD_MAP_CREDIT_ONLY === '1';
const artifact = creditOnly ? 'world-map-task135-credit-browser' : 'world-map-task135-browser';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5298,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverLog = '', browser, page;
server.stdout.on('data', value => { serverLog += value; }); server.stderr.on('data', value => { serverLog += value; });
const checks = [], observations = {}, errors = [], requests = [];
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverLog.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });

  // Actual standalone MapLibre renderer: no fabricated vector features or DEM.
  const component = await browser.newPage({ viewport: { width: 1100, height: 650 }, serviceWorkers: 'block' });
  component.on('pageerror', error => errors.push(String(error)));
  await component.route(`${origin}/world-map-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><div id="images"></div><script type="module">
    import{createMapTerrainImagery}from'/src/map-terrain-imagery.ts';
    window.make=createMapTerrainImagery;
    window.tileAt=(lat,lon,z)=>({z,x:Math.floor((lon+180)/360*2**z),y:Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z)});
    window.facts=canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,512,512).data,colors=new Set();let visible=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3])visible++;colors.add(pixels.slice(i,i+4).join(','));}return{colors:colors.size,visible,width:canvas.width,height:canvas.height};};window.fixtureReady=true;
  </script>` }));
  await component.goto(`${origin}/world-map-fixture.html`); await component.waitForFunction(() => window.fixtureReady);
  observations.sourceRendering = await component.evaluate(async () => {
    const handle = await make({ profile: 'world' }), results = [];
    for (const [lat, lon] of [[40.7, -74], [35.68, 139.69]]) {
      const tile = tileAt(lat, lon, 11), canvas = await handle.provider.requestImage(tile.x, tile.y, tile.z);
      document.querySelector('#images').append(canvas); results.push({ lat, lon, tile, ...facts(canvas) });
    }
    const stats = handle.getStats(), credit = handle.provider.credit.html;
    const coverage = handle.provider.rectangle, minLevel = handle.provider.minimumLevel;
    handle.dispose(); return { results, stats, credit, coverage, minLevel, remaining: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  for (const result of observations.sourceRendering.results) {
    assert.equal(result.width, 512); assert.equal(result.height, 512);
    assert(result.colors > 10 && result.visible > 512 * 512 * .95, 'actual OSM geometry supplies detailed global map pixels');
  }
  assert.match(observations.sourceRendering.credit, /OpenStreetMap/); assert.equal(observations.sourceRendering.minLevel, 0);
  assert.match(observations.sourceRendering.credit, /OpenMapTiles/);
  assert.equal(observations.sourceRendering.remaining, 0);
  await component.screenshot({ path: `${output}/world-map-task135-real-source.png` });
  await component.close();
  checks.push('real pinned OpenFreeMap geometry renders New York and Tokyo outside regional coverage; global Mercator source credit and cleanup are explicit');

  async function openFlight(location, vector = false) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const current = await context.newPage(); page = current;
    current.on('pageerror', error => errors.push(String(error)));
    current.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/scenery/osm/')) requests.push({ path: url.pathname, priority: request.headers()['x-gefly-scenery-priority'] });
    });
    await current.route('**/scenery/map/**', route => route.fulfill({ contentType: 'image/png', body: pixel }));
    await current.route('**/scenery/imagery/**', route => route.fulfill({ contentType: 'image/png', body: pixel }));
    await current.route('**/src/scene.ts', async route => {
      const response = await route.fetch(), source = await response.text();
      assert(source.includes('widget.resolutionScale =') && source.includes('return flightScene;'));
      await route.fulfill({ response, body: source.replace('widget.resolutionScale =', 'window.__worldWidget = widget; window.__worldRenderErrors=[]; widget.scene.renderError.addEventListener((_,error)=>window.__worldRenderErrors.push(String(error))); widget.resolutionScale =')
        .replace('return flightScene;', 'window.__worldScene = flightScene; return flightScene;') });
    });
    await current.route('**/src/practice-map.ts', async route => {
      const response = await route.fetch(), source = await response.text(); assert(source.includes('map = new LibreMap({'));
      await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__worldFlightMap = new LibreMap({') });
    });
    await current.addInitScript(({ location, vector }) => {
      if (!localStorage.getItem('gefly.flight-location.v1')) localStorage.setItem('gefly.flight-location.v1', JSON.stringify({ version: 1, mode: 'airborne',
        lat_rad: location.lat * Math.PI / 180, lon_rad: location.lon * Math.PI / 180, alt_msl_m: 2500, heading_rad: Math.PI / 2 }));
      if (!localStorage.getItem('gefly.view-preferences.v1')) localStorage.setItem('gefly.view-preferences.v1', JSON.stringify({ version: 1, vectorScenery: vector, landmarkLevel: 0 }));
      window.worldMessages = []; window.worldWorkers = [];
      const Native = window.Worker;
      window.Worker = class extends Native {
        constructor(...args) {
          super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
          const worker = window.worldWorkers.length; window.worldWorkers.push(this);
          this.addEventListener('message', ({ data }) => {
            if (['state', 'stats', 'ready', 'terrain-loading', 'terrain-remove', 'error'].includes(data.type)) window.worldMessages.push({ ...data, worker });
            if (data.type === 'terrain-tile') window.worldMessages.push({ type: data.type, worker, id: data.grid.id, source: data.grid.source, slot: data.grid.slot });
          });
        }
      };
    }, { location, vector });
    await current.goto(origin);
    await current.waitForFunction(() => !document.querySelector('#start').disabled && window.worldMessages.some(message => message.type === 'state') && window.__worldScene, null, { timeout: 60000 });
    await prepareFlightUI(current, { controls: false });
    return current;
  }
  const latest = () => page.evaluate(() => window.worldMessages.filter(message => message.type === 'state').at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.worldMessages.length);
    await page.evaluate(() => window.worldWorkers.at(-1).postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.worldMessages.slice(count).some(message => message.type === 'stats'), count);
    return page.evaluate(() => window.worldMessages.filter(message => message.type === 'stats').at(-1));
  };
  const frozen = async before => { const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  async function renderedGround() {
    await page.waitForFunction(() => {
      const state = window.worldMessages.filter(message => message.type === 'state').at(-1), globe = window.__worldWidget.scene.globe;
      const point = globe.ellipsoid.cartesianToCartographic(globe.ellipsoid.cartographicToCartesian({ longitude: state.lon_rad, latitude: state.lat_rad, height: 0 }));
      const height = globe.getHeight(point); return Number.isFinite(height) && Math.abs(height - state.terrain_height_ellipsoid_m) <= .25;
    }, null, { timeout: 60000 });
    return page.evaluate(() => {
      const state = window.worldMessages.filter(message => message.type === 'state').at(-1), globe = window.__worldWidget.scene.globe;
      const point = globe.ellipsoid.cartesianToCartographic(globe.ellipsoid.cartographicToCartesian({ longitude: state.lon_rad, latitude: state.lat_rad, height: 0 }));
      const actual_m = globe.getHeight(point);
      return { actual_m, native_m: state.terrain_height_ellipsoid_m, error_m: Math.abs(actual_m - state.terrain_height_ellipsoid_m),
        dataset: { ...document.querySelector('#scene').dataset }, renderErrors: window.__worldRenderErrors, status: document.querySelector('#imagery-status').textContent };
    });
  }
  await openFlight({ lat: 40.71, lon: -74.01 });
  observations.outsideInitial = await latest(); assert.equal(observations.outsideInitial.terrain_source, 2);
  assert(Math.abs(observations.outsideInitial.lon_rad + 74.01 * Math.PI / 180) < 1e-8, 'outside launch passes through actual native initializer');
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  const initial = await stats(); observations.outsideRender = await renderedGround();
  await page.waitForFunction(() => Number(document.querySelector('#scene').dataset.worldMapLoaded) > 0, null, { timeout: 60000 });
  observations.layerPriority = await page.evaluate(() => {
    const layers = window.__worldWidget.scene.imageryLayers, credits = [];
    for (let i = 0; i < layers.length; i++) credits.push(layers.get(i).imageryProvider.credit?.html ?? '');
    return { credits, world: credits.findIndex(credit => credit.includes('global map fallback')), regionalMap: credits.findIndex(credit => credit.includes('TopPlusOpen sources')) };
  });
  assert(observations.layerPriority.world >= 0 && observations.layerPriority.regionalMap === -1, 'actual Cesium map uses consistent global OSM without an opaque regional BKG rectangle');
  assert.match(observations.layerPriority.credits[observations.layerPriority.world], /OpenMapTiles/);
  assert.equal(await page.locator('#scene').getAttribute('data-landmark-level'), '0', 'global credits remain present with landmark labels Off');
  observations.layerPriority.credits.forEach((credit, index) => {
    if (credit.includes('Hessen HVBG aerial imagery') || credit.startsWith('Open photography:') || credit.includes('imagery resampled and tiled'))
      assert(index > observations.layerPriority.world, 'all starter and regional photographs retain priority over the opaque global map');
  });
  assert.equal(await page.locator('#scene').getAttribute('data-scenery-fallback'), 'osm');
  assert.match(await page.locator('#imagery-status').textContent(), /global OSM/i);
  await page.locator('#scene').focus(); await page.keyboard.press('/');
  await page.waitForFunction(() => document.querySelector('#scene').dataset.sceneryMode === 'vector');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gefly.view-preferences.v1')).vectorScenery), true);
  await page.keyboard.press('/'); await page.waitForFunction(() => document.querySelector('#scene').dataset.sceneryMode === 'imagery');
  assert.equal(await page.locator('#scene').getAttribute('data-scenery-fallback'), 'osm');
  await page.keyboard.press('m'); await page.waitForFunction(() => window.__worldFlightMap?.loaded(), null, { timeout: 60000 });
  observations.map = await page.evaluate(() => ({ center: window.__worldFlightMap.getCenter(), source: window.__worldFlightMap.getStyle().sources['world-map'],
    layers: window.__worldFlightMap.getStyle().layers.map(layer => layer.id), attribution: document.querySelector('.maplibregl-ctrl-attrib').textContent }));
  assert(Math.abs(observations.map.center.lng + 74.01) < .01); assert.match(observations.map.attribution, /OpenStreetMap/);
  assert.match(observations.map.attribution, /OpenMapTiles/);
  assert.equal(await page.evaluate(() => window.__worldFlightMap.getLayoutProperty('basemap', 'visibility')), 'none', 'regional BKG is retained for reuse without covering the selected OSM map');
  await frozen(initial); await page.screenshot({ path: `${output}/world-map-task135-outside.png` });
  checks.push('actual app initializes paused outside Germany with native global heights and aligned rendered mesh; map and photo/vector preference retain global OSM fallback without physics changes');

  if (!creditOnly) {
  await page.locator('#scene').focus(); await page.keyboard.press('m'); await page.locator('#start').click();
  await page.waitForFunction(() => window.worldMessages.filter(message => message.type === 'state').at(-1)?.step > 120);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const outsidePaused = await stats(); await page.locator('#scene').focus(); await page.keyboard.press('r');
  const downloading = page.waitForEvent('download'); await page.locator('#review-save').click();
  const recording = await readFile(await (await downloading).path());
  await page.locator('#review-exit').click(); await frozen(outsidePaused);
  const liveBeforeReload = await latest(); await page.reload();
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.worldMessages.some(message => message.type === 'state') && window.__worldScene, null, { timeout: 60000 });
  observations.reload = await latest();
  assert.equal(await page.locator('#status').textContent(), 'Paused'); assert.equal(observations.reload.step, 0); assert.equal(observations.reload.terrain_source, 2);
  for (const key of ['lat_rad', 'lon_rad', 'heading_rad']) assert(Math.abs(observations.reload[key] - liveBeforeReload[key]) < 1e-8, `actual reload restores outside ${key}`);
  assert(Math.abs(observations.reload.alt_msl_m - liveBeforeReload.alt_msl_m) < .1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gefly.view-preferences.v1')).vectorScenery), false);
  const reloadedPaused = await stats();
  observations.reconstruction = await page.evaluate(() => {
    const actual = window.worldMessages.filter(message => message.type === 'state').at(-1);
    const viewOnly = { ...actual, terrain_height_msl_m: actual.terrain_height_msl_m + 5,
      terrain_height_ellipsoid_m: actual.terrain_height_ellipsoid_m + 5 };
    const ready = window.__worldScene.terrainReady(viewOnly); window.__worldScene.update(viewOnly, 'cockpit');
    return { ready, state: document.querySelector('#scene').dataset.reviewTerrain,
      difference_m: Number(document.querySelector('#scene').dataset.reviewTerrainDifferenceM),
      visible: !document.querySelector('#imagery-status').hidden, label: document.querySelector('#imagery-status').textContent };
  });
  assert(observations.reconstruction.ready && observations.reconstruction.visible);
  assert.equal(observations.reconstruction.state, 'reconstructed'); assert.match(observations.reconstruction.label, /differs from the recorded terrain/);
  assert(Math.abs(observations.reconstruction.difference_m - 5) < 1e-8); await frozen(reloadedPaused);
  checks.push('actual reload restores the last outside live pose paused; an explicit view-only reconstruction fixture labels changed source heights without changing native state');
  await page.context().close();

  await openFlight({ lat: 50.9, lon: 13.975 });
  const boundaryInitial = await latest(); assert([1, 3].includes(boundaryInitial.terrain_source), 'boundary fixture must begin with real regional DEM contribution');
  await page.locator('#scene').focus();
  // The existing experimental roll correction does not promise a straight
  // manual flight. Use the actual HDG/ALT UI to hold this geographic crossing.
  await page.keyboard.press('KeyA');
  await page.waitForFunction(() => window.worldMessages.filter(message => message.type === 'state').at(-1)?.kap_engaged === 1);
  await page.locator('#scene').focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('=');
  await page.locator('#start').click();
  await page.waitForFunction(() => window.worldMessages.filter(message => message.type === 'state').at(-1)?.lon_rad > 14.005 * Math.PI / 180, null, { timeout: 60000 });
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const boundaryPaused = await stats(), crossed = await latest(); observations.boundary = { initial: boundaryInitial, crossed };
  assert(crossed.step > boundaryInitial.step && crossed.t_s > boundaryInitial.t_s);
  assert.equal(crossed.terrain_source, 3, 'whole-cell provenance remains mixed because its exact14° western edge retains regional nodes');
  observations.boundaryGlobalSurface = await page.evaluate(async () => {
    const { loadWorldTerrainPackage, sampleWorldTerrain } = await import('/studies/e1-browser/sim/world-terrain.js');
    const state = window.worldMessages.filter(message => message.type === 'state').at(-1);
    const sample = sampleWorldTerrain(await loadWorldTerrainPackage(), state.lat_rad, state.lon_rad);
    return { sample, nativeH_m: state.terrain_height_msl_m, nativeN_m: state.terrain_geoid_m,
      physicalError_m: Math.abs(sample.physical_m - state.terrain_height_msl_m), geoidError_m: Math.abs(sample.geoid_m - state.terrain_geoid_m) };
  });
  assert(observations.boundaryGlobalSurface.physicalError_m <= .25 && observations.boundaryGlobalSurface.geoidError_m <= .25,
    'beyond the first edge column the actual native surface agrees with the bundled global H/N, despite conservative mixed-cell provenance');
  assert.equal(await page.evaluate(() => window.worldWorkers.length), 1, 'boundary crossing never reinitializes flight');
  observations.boundaryMessages = await page.evaluate(() => window.worldMessages.filter(message => message.type !== 'state' && message.type !== 'stats'));
  assert(observations.boundaryMessages.some(message => message.type === 'terrain-remove'));
  assert(Number(await page.locator('#scene').getAttribute('data-terrain-cached')) <= 9);
  observations.boundaryRender = await renderedGround(); await frozen(boundaryPaused);
  checks.push('real native flight crosses14°E through bounded terrain eviction without worker reset; simulation time advances and explicit Pause remains frozen');

  await page.locator('#recording-file').setInputFiles({ name: 'actual-world-recording.json', mimeType: 'application/json', buffer: recording });
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review' && document.querySelector('#notice').textContent.startsWith('Loaded recording'), null, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#scene').dataset.reviewTerrain === 'ready', null, { timeout: 60000 });
  assert.equal(await page.locator('#scene').getAttribute('data-scenery-fallback'), 'osm'); await frozen(boundaryPaused);
  await page.locator('#review-time').focus(); await page.keyboard.press('End'); await frozen(boundaryPaused);
  await page.locator('#review-exit').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await frozen(boundaryPaused);
  checks.push('an actual outside-region recording loads its selected Review terrain window independently of current live/native terrain; seeking and return preserve paused native state');

  // Explicit component stress on the paused app's view-only Review cache. These
  // positions are synthetic cache requests, never worker/flight state inputs.
  observations.cache = await page.evaluate(async () => {
    for (const lon of [-150, -120, -90, -60, -30, 0, 30, 60]) await window.__worldScene.prepareRecording([{ terrain_profile: 1, lat_rad: 1.125 * Math.PI / 180, lon_rad: (lon + .125) * Math.PI / 180 }]);
    return { retained: Number(document.querySelector('#scene').dataset.reviewTerrainCached),
      combined: Number(document.querySelector('#scene').dataset.terrainCached),
      currentReady: window.__worldScene.terrainReady(window.worldMessages.filter(message => message.type === 'state').at(-1)),
      renderers: document.querySelectorAll('[data-map-terrain-renderer]').length };
  });
  assert.equal(observations.cache.retained, 64); assert(observations.cache.currentReady); assert(observations.cache.combined <= 73);
  assert(observations.cache.renderers <= 2); await frozen(boundaryPaused);
  checks.push('eight disjoint view-only Review windows evict at64cachedcells, preserve current live terrain and never change native flight; renderer contexts remain bounded');

  // Hold the real optional manifest fetch, without replacing its AbortSignal or
  // source decoder. Direct view-only requests isolate cancellation boundaries;
  // the real Review exit button exercises the main lifecycle integration.
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review' && document.querySelector('#scene').dataset.reviewTerrain === 'ready');
  const coveredSeekRecording = JSON.parse(recording.toString('utf8'));
  coveredSeekRecording.samples = coveredSeekRecording.samples.map((sample, index, samples) => index < Math.ceil(samples.length / 2) ? sample
    : { ...sample, state: { ...sample.state, lat_rad: -20.125 * Math.PI / 180, lon_rad: 100.125 * Math.PI / 180 } });
  // Explicit synthetic historical positions test Review seeking only. The
  // recorded/native live state and control messages are never replaced.
  await page.locator('#recording-file').setInputFiles({ name: 'synthetic-view-seek-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(coveredSeekRecording)) });
  await page.waitForFunction(() => document.querySelector('#recording-file').value === '' && document.querySelector('#notice').textContent.startsWith('Loaded recording'));
  await page.waitForFunction(() => document.querySelector('#scene').dataset.reviewTerrain === 'ready');
  const held = [], networkAborts = [];
  page.on('requestfailed', request => { if (new URL(request.url()).pathname === '/terrain/region/manifest.json') networkAborts.push(request.failure()?.errorText); });
  await page.route('**/terrain/region/manifest.json', route => { held.push(route); });
  await page.evaluate(() => {
    const original = window.fetch;
    window.__manifestProbe = { active: 0, peak: 0, calls: 0, aborted: 0, finished: 0 };
    window.__preparationPromises = [];
    window.__preparationPoints = Array.from({ length: 6 }, (_, index) => ({ terrain_profile: 1, lat_rad: (-20.125 - index) * Math.PI / 180, lon_rad: (100.125 + index) * Math.PI / 180 }));
    window.fetch = function(input, init) {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.pathname !== '/terrain/region/manifest.json') return original.call(this, input, init);
      const probe = window.__manifestProbe; probe.calls++; probe.active++; probe.peak = Math.max(probe.peak, probe.active);
      let done = false;
      const finish = aborted => { if (done) return; done = true; probe.active--; if (aborted) probe.aborted++; else probe.finished++; };
      init?.signal?.addEventListener('abort', () => finish(true), { once: true });
      return original.call(this, input, init).finally(() => finish(false));
    };
  });
  async function beginHeld(index) {
    const before = await page.evaluate(() => window.__manifestProbe.calls);
    await page.evaluate(index => { window.__preparationPromises.push(window.__worldScene.prepareRecording([window.__preparationPoints[index]])); }, index);
    await page.waitForFunction(count => window.__manifestProbe.calls === count && window.__manifestProbe.active === 1, before + 1);
  }
  await page.locator('#review-time').focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => window.__manifestProbe.calls === 1 && window.__manifestProbe.active === 1);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.__manifestProbe.active === 0);
  assert.equal(await page.evaluate(() => window.__manifestProbe.aborted), 1, 'actual timeline seek back to a covered frame cancels the obsolete manifest');
  await frozen(boundaryPaused);
  await beginHeld(0); await beginHeld(1); await beginHeld(2);
  let probe = await page.evaluate(() => ({ ...window.__manifestProbe })); assert.equal(probe.aborted, 3); assert.equal(probe.peak, 1);
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => window.__manifestProbe.active === 0);
  assert.equal((await page.evaluate(() => window.__manifestProbe)).aborted, 4, 'actual Review exit cancels the pending manifest');
  await frozen(boundaryPaused);
  await beginHeld(3);
  await page.evaluate(() => window.__worldScene.prepareRecording([window.worldMessages.filter(message => message.type === 'state').at(-1)]));
  await page.waitForFunction(() => window.__manifestProbe.active === 0);
  await beginHeld(4); await page.evaluate(() => window.__worldScene.prepareRecording([]));
  await page.waitForFunction(() => window.__manifestProbe.active === 0);
  const obsoleteReady = await page.evaluate(() => window.__preparationPoints.map(state => window.__worldScene.terrainReady(state)));
  assert(obsoleteReady.every(value => value === false), 'aborted source requests install no obsolete cells');
  await beginHeld(5); await page.evaluate(() => window.__worldScene.dispose());
  await page.waitForFunction(() => window.__manifestProbe.active === 0);
  observations.cancellation = await page.evaluate(async () => { await Promise.all(window.__preparationPromises); return { ...window.__manifestProbe }; });
  observations.cancellation.networkAborts = networkAborts;
  assert.equal(observations.cancellation.calls, 7); assert.equal(observations.cancellation.aborted, 7);
  assert.equal(observations.cancellation.active, 0); assert.equal(observations.cancellation.peak, 1);
  await frozen(boundaryPaused);
  await Promise.all(held.map(route => route.abort().catch(() => {})));
  checks.push('delayed real manifest requests stay atone active fetch; rapid supersession, cache-hit/empty seek, actual Review exit and disposal cancel immediately without installing obsolete terrain or changing native flight');
  }
  assert(requests.length > 0 && requests.every(request => request.priority === 'visible'));
  assert.deepEqual(errors, []); assert.deepEqual(await page.evaluate(() => window.__worldRenderErrors), []);
  await writeFile(`${output}/${artifact}.json`, JSON.stringify({ result: 'pass', browser: browser.version(), creditOnly, checks, observations, requests, scope: 'Actual public OSM and bundled DEM; regional raster map/photo requests use explicit image fixtures. Synthetic cache positions exercise view-only bounds, never physics.' }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} catch (error) {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/${artifact}.json`, JSON.stringify({ result: 'fail', checks, observations, errors, error: String(error), debug: await page?.evaluate(() => ({ status: document.querySelector('#status')?.textContent, notice: document.querySelector('#notice')?.textContent,
    scene: { ...document.querySelector('#scene')?.dataset }, messages: window.worldMessages?.slice(-12) })).catch(() => null) }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill(); }
