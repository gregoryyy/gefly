// Actual Cesium LabelCollection/terrain/camera and native worker integration.
// Encoded MVT names below are deterministic synthetic source fixtures, not AIS.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PbfWriter } from 'pbf';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5353';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5353,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, log = '';
server.stdout.on('data', chunk => { log += chunk; }); server.stderr.on('data', chunk => { log += chunk; });
const rad = Math.PI / 180, radius = 6378137, originLat = 49.96 * rad, originLon = 8.643 * rad;
const point = (east, north) => ({ lat_rad: originLat + north / radius, lon_rad: originLon + east / (radius * Math.cos(originLat)) });
const fixtures = [
  { id: 1, name: 'Fixture Egelsbach', class: 'city', layer: 'place', z: 9, ...point(2000, 300) },
  { id: 2, name: 'Fixture Behind', class: 'city', layer: 'place', z: 9, ...point(-2000, -300) },
  { id: 3, name: 'Fixture Overlap', class: 'village', layer: 'place', z: 9, ...point(2005, 305) },
  { id: 4, name: 'Fixture Hill', class: 'peak', layer: 'mountain_peak', z: 12, ...point(3500, -600) },
  { id: 5, name: 'Fixture Avenue', class: 'primary', layer: 'transportation_name', z: 14, ...point(2300, 900) },
  { id: 6, name: 'Fixture Cafe', class: 'cafe', layer: 'poi', z: 14, ...point(2800, -100) },
];
const zigzag = value => value < 0 ? -value * 2 - 1 : value * 2;
function fixtureTile(z, x, y) {
  const tile = new PbfWriter(), layers = new Map();
  for (const item of fixtures.filter(feature => feature.z === z)) {
    const gx = ((item.lon_rad + Math.PI) / (2 * Math.PI) * 2 ** z - x) * 4096;
    const gy = ((1 - Math.asinh(Math.tan(item.lat_rad)) / Math.PI) / 2 * 2 ** z - y) * 4096;
    if (gx < 0 || gy < 0 || gx >= 4096 || gy >= 4096) continue;
    const layer = layers.get(item.layer) ?? []; layer.push({ ...item, x: Math.round(gx), y: Math.round(gy) }); layers.set(item.layer, layer);
  }
  if (!layers.size) layers.set('place', []);
  for (const [name, features] of layers) tile.writeMessage(3, (value, layer) => {
    layer.writeStringField(1, value.name); layer.writeVarintField(15, 2); layer.writeVarintField(5, 4096);
    layer.writeStringField(3, 'name'); layer.writeStringField(3, 'class');
    value.features.forEach((feature, index) => {
      layer.writeMessage(4, (text, val) => val.writeStringField(1, text), feature.name);
      layer.writeMessage(4, (text, val) => val.writeStringField(1, text), feature.class);
      layer.writeMessage(2, (f, message) => {
        message.writeVarintField(1, f.id); message.writePackedVarint(2, [0, index * 2, 1, index * 2 + 1]);
        message.writeVarintField(3, f.layer === 'transportation_name' ? 2 : 1);
        message.writePackedVarint(4, f.layer === 'transportation_name'
          ? [9, zigzag(f.x - 8), zigzag(f.y), 10, zigzag(16), 0] : [9, zigzag(f.x), zigzag(f.y)]);
      }, feature);
    });
  }, { name, features });
  return Buffer.from(tile.finish());
}
async function observeScene(page) {
  await page.route('**/src/scene.ts*', async route => {
    const response = await route.fetch(), text = await response.text();
    assert(text.includes('const scene = widget.scene;'));
    await route.fulfill({ response, body: text.replace('const scene = widget.scene;', 'const scene = window.labelScene = widget.scene;') });
  });
  await page.route('**/src/landmark-labels.ts*', async route => {
    const response = await route.fetch(), text = await response.text();
    assert(text.includes('const labels = new LabelCollection({ scene });'));
    await route.fulfill({ response, body: text.replace('const labels = new LabelCollection({ scene });',
      'const labels = window.actualLandmarkLabels = new LabelCollection({ scene }); window.projectLandmark = p => SceneTransforms.worldToWindowCoordinates(scene, p); window.hasLandmarkGround = (x, y) => !!scene.globe.pick(scene.camera.getPickRay(new Cartesian2(x, y)), scene);')
      .replace('const dots = new PointPrimitiveCollection();', 'const dots = window.actualLandmarkDots = new PointPrimitiveCollection();')
      .replace('const source = createLandmarkSource({', 'window.projectLandmarkItem = item => { const h = sampleHeight(item.lat_rad, item.lon_rad); return h === null ? null : SceneTransforms.worldToWindowCoordinates(scene, Cartesian3.fromRadians(item.lon_rad, item.lat_rad, h + 8)); }; const source = window.actualLandmarkSource = createLandmarkSource({')
      .replace('items = next.slice(', 'items = (window.actualLandmarkCandidates = next).slice(') });
  });
}
try {
  for (let i = 0; i < 100; i++) { if (server.exitCode !== null) throw Error(log); try { if ((await fetch(origin)).ok) break; } catch {} if (i === 99) throw Error(log); await new Promise(resolve => setTimeout(resolve, 100)); }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } }), errors = [], requests = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = Worker; window.labelStates = []; window.labelStats = []; window.landmarkContextEvents = [];
    document.addEventListener('contextmenu', event => window.landmarkContextEvents.push(event), true);
    window.Worker = class extends Native { constructor(...args) { super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
      window.labelWorker = this; this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.labelStates.push(data); if (data.type === 'stats') window.labelStats.push(data); });
    } };
  });
  await observeScene(page);
  await installSceneryFixture(page);
  await page.route('**/scenery/landmarks/**', route => {
    const path = new URL(route.request().url()).pathname, match = /^\/scenery\/landmarks\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(path);
    assert(match); requests.push(path); const [z, x, y] = match.slice(1).map(Number);
    return route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: fixtureTile(z, x, y) });
  });
  await page.goto(origin); await page.waitForFunction(() => !document.querySelector('#start').disabled && window.actualLandmarkLabels && window.labelStates.length);
  const scene = page.locator('#scene');
  const names = () => page.evaluate(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text));
  const cycle = async level => { await scene.focus(); await page.keyboard.press('.'); await page.waitForFunction(value => document.querySelector('#scene').dataset.landmarkLevel === String(value), level); };
  const stats = async () => { const count = await page.evaluate(() => window.labelStats.length); await page.evaluate(() => window.labelWorker.postMessage({ type: 'stats' })); await page.waitForFunction(n => window.labelStats.length > n, count); return page.evaluate(() => window.labelStats.at(-1)); };
  const frozen = async before => { const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  // Start/pause through the real UI so the launch card does not cover the terrain pick.
  await prepareFlightUI(page, { controls: false }); await page.locator('#start').click();
  await page.waitForFunction(() => window.labelStates.at(-1)?.step > 0);
  await scene.focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const baseline = await stats();
  await scene.focus();
  for (const key of ['Shift+Period', 'Alt+Period', 'Control+Period']) await page.keyboard.press(key);
  await scene.evaluate(element => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Period', key: '.', repeat: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Period', key: '.', metaKey: true }));
  });
  await page.locator('#mixture-control').focus(); await page.keyboard.press('.');
  await scene.focus(); await page.keyboard.press('o'); await page.locator('#control-settings').waitFor({ state: 'visible' });
  await page.keyboard.press('.'); await page.locator('#settings-close').click();
  await prepareFlightUI(page, { controls: false }); await page.locator('#view-menu > summary').click();
  await page.keyboard.press('.'); await page.locator('#view-menu > summary').click();
  await scene.focus(); await page.keyboard.press('i');
  assert.equal(await scene.getAttribute('data-landmark-level'), '0', 'Period ignores repeat, modifiers, editable controls, modal dialogs and open menus');
  assert.equal(requests.length, 0, 'guarded keys make no name requests');
  assert.equal(requests.length, 0, 'Off never requests name tiles'); assert.deepEqual(await names(), []);
  await page.mouse.click(1100, 350, { button: 'right' });
  // Cesium already suppresses its canvas context menu; Off adds no lookup or traffic.
  assert.equal(requests.length, 0); assert.equal(await page.locator('.landmark-lookup:visible').count(), 0);
  await page.keyboard.press('Escape');
  await cycle(1); await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Egelsbach'));
  assert(!((await names()).includes('Fixture Behind'))); assert(!((await names()).includes('Fixture Overlap')), 'screen declutter rejects overlapping lower-priority text');
  assert((await names()).length <= 24); assert(requests.every(path => path.includes('/9/'))); await frozen(baseline);
  const anchor = await page.evaluate(() => {
    const labels = window.actualLandmarkLabels, label = Array.from({ length: labels.length }, (_, i) => labels.get(i)).find(item => item.text === 'Fixture Egelsbach');
    const dot = Array.from({ length: window.actualLandmarkDots.length }, (_, i) => window.actualLandmarkDots.get(i)).find(item => item.id === label.id);
    const pixel = window.projectLandmark(label.position), groundPixel = window.projectLandmark(dot.position);
    const a = 6378137, e2 = 6.6943799901413165e-3, lon = Math.atan2(label.position.y, label.position.x), p = Math.hypot(label.position.x, label.position.y);
    let lat = Math.atan2(label.position.z, p * (1 - e2));
    for (let n = 0; n < 6; n++) { const N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2); lat = Math.atan2(label.position.z + e2 * N * Math.sin(lat), p); }
    return { lon, lat, heightDifference: Math.hypot(label.position.x - dot.position.x, label.position.y - dot.position.y, label.position.z - dot.position.z), pixel: { x: pixel.x, y: pixel.y }, groundPixel: { x: groundPixel.x, y: groundPixel.y }, pixelOffset: { x: label.pixelOffset.x, y: label.pixelOffset.y }, depth: label.disableDepthTestDistance, terrainDepth: window.labelScene.globe.depthTestAgainstTerrain };
  });
  assert(Math.abs(anchor.lon - fixtures[0].lon_rad) < .00001 && Math.abs(anchor.lat - fixtures[0].lat_rad) < .00001, 'Cesium world position follows quantized source coordinates');
  assert(Math.abs(anchor.heightDifference - 7) < .01, 'label floats 7 visual metres above its ground dot');
  assert(anchor.pixel.x > 0 && anchor.pixel.x < 1680 && anchor.pixel.y > 0 && anchor.pixel.y < 630);
  assert.deepEqual(anchor.pixelOffset, { x: 0, y: -14 }); assert.equal(anchor.depth, 0); assert.equal(anchor.terrainDepth, true);
  await page.waitForFunction(() => window.actualLandmarkSource.getStats().activeRequests === 0 && window.actualLandmarkSource.getStats().queuedTiles === 0);
  await page.waitForFunction(p => window.hasLandmarkGround(p.x, p.y), anchor.groundPixel);
  const sceneBox = await scene.boundingBox();
  assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y) === window.labelScene.canvas, { x: sceneBox.x + anchor.groundPixel.x, y: sceneBox.y + anchor.groundPixel.y }), true, 'the projected ground point is reachable canvas');
  await page.mouse.click(sceneBox.x + anchor.groundPixel.x, sceneBox.y + anchor.groundPixel.y, { button: 'right' });
  const lookup = page.locator('.landmark-lookup');
  await page.waitForFunction(() => ['ready', 'not-found', 'unavailable'].includes(document.querySelector('.landmark-lookup')?.dataset.status));
  assert.equal(await lookup.getAttribute('data-status'), 'ready', await lookup.textContent());
  assert.match(await lookup.textContent(), /Nearest mapped label: Fixture Egelsbach/);
  assert.equal(await page.evaluate(() => window.landmarkContextEvents.at(-1)?.defaultPrevented), true);
  await frozen(baseline);
  const beforeSky = requests.length;
  assert.equal(await page.evaluate(() => window.hasLandmarkGround(840, 10)), false, 'the next click is actual sky, not an ellipsoid fallback');
  await page.mouse.click(sceneBox.x + 840, sceneBox.y + 10, { button: 'right' });
  await page.waitForFunction(() => document.querySelector('.landmark-lookup')?.dataset.status === 'unavailable');
  assert.equal(requests.length, beforeSky, 'sky does not query map-name tiles'); await frozen(baseline);
  await lookup.getByRole('button', { name: /close/i }).click();
  await cycle(2); await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Hill'));
  assert(!((await names()).includes('Fixture Avenue'))); assert((await names()).length <= 60);
  await cycle(3); await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Avenue'));
  assert((await names()).length <= 120); await frozen(baseline);
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/landmark-labels-fixture.png', import.meta.url)) });
  // Actual look gesture turns the camera around while keeping native flight paused.
  await page.mouse.move(1450, 220); await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.move(600, 220, { steps: 8 }); await page.mouse.up();
  await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Behind'));
  assert(!((await names()).includes('Fixture Egelsbach'))); await frozen(baseline);
  await scene.focus(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Egelsbach'));
  await cycle(0); await page.waitForTimeout(120); const offCount = requests.length;
  assert.deepEqual(await names(), []); await page.waitForTimeout(120); assert.equal(requests.length, offCount); await frozen(baseline);
  // Record a brief native flight, then inspect source-selected historical positions.
  await prepareFlightUI(page, { controls: false }); await scene.focus(); await page.keyboard.press('Space'); await page.waitForFunction(() => window.labelStates.at(-1)?.step > 60);
  await scene.focus(); await page.keyboard.press('Space'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const live = await stats(); await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await cycle(1); await page.waitForFunction(() => window.actualLandmarkLabels.length > 0); await frozen(live);
  const downloading = page.waitForEvent('download'); await page.locator('#review-save').click(); const download = await downloading;
  const saved = JSON.parse(await readFile(await download.path(), 'utf8'));
  // Explicitly synthetic replay pose: yaw reversal, same valid original native
  // frame groups. It demonstrates selected recorded-camera anchoring, not flight.
  const turned = { ...saved, samples: saved.samples.map(sample => ({ ...sample, state: { ...sample.state, heading_rad: (sample.state.heading_rad + Math.PI) % (2 * Math.PI) } })) };
  await page.locator('#recording-file').setInputFiles({ name: 'synthetic-heading-review.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(turned)) });
  await page.waitForFunction(() => document.querySelector('#recording-file').value === '');
  await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Behind'));
  assert(!((await names()).includes('Fixture Egelsbach'))); await frozen(live);
  await page.locator('#review-exit').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await page.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i).text).includes('Fixture Egelsbach')); await frozen(live);
  assert.deepEqual(errors, []);
  // A separate real worker continues flying when every optional name tile fails.
  const failing = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failureErrors = [];
  failing.on('pageerror', error => failureErrors.push(String(error)));
  try {
    await failing.addInitScript(() => { const Native = Worker; window.failureStates = []; window.Worker = class extends Native {
      constructor(...args) { super(...args); if (String(args[0]).includes('/sim/worker.js')) this.addEventListener('message', ({data}) => { if (data.type === 'state') window.failureStates.push(data); }); }
    }; });
    await installSceneryFixture(failing); await failing.route('**/scenery/landmarks/**', route => route.fulfill({ status: 503, body: 'Source unavailable' }));
    await failing.goto(origin); await failing.waitForFunction(() => !document.querySelector('#start').disabled);
    await failing.locator('#start').click(); await failing.waitForFunction(() => window.failureStates.at(-1)?.step > 30);
    const beforeFailure = await failing.evaluate(() => window.failureStates.at(-1).step);
    await failing.locator('#scene').focus(); await failing.keyboard.press('.');
    await failing.waitForFunction(() => document.querySelector('#scene').dataset.landmarkStatus === 'degraded');
    await failing.waitForFunction(step => window.failureStates.at(-1)?.step > step + 30, beforeFailure);
    assert.equal(await failing.locator('#status').textContent(), 'Flying');
    assert.match(await failing.locator('.landmark-label-status').textContent(), /some map names unavailable/);
    assert.deepEqual(failureErrors, [], 'optional source failure has no uncaught error while the page remains active');
  } finally { await failing.close(); }
  assert.deepEqual(errors, []);
  if (process.env.CAPTURE_PUBLIC_LANDMARKS === '1') {
    const publicPage = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
    let captureStage = 'initializing';
    const publicResponses = [];
    publicPage.on('response', response => { if (response.url().includes('/scenery/landmarks/') && publicResponses.length < 32) publicResponses.push({ path: new URL(response.url()).pathname, status: response.status(), type: response.headers()['content-type'] }); });
    await unlink(new URL('../../output/flight/landmark-labels-public.png', import.meta.url)).catch(() => {});
    const captureState = () => publicPage.evaluate(() => ({ status: document.querySelector('#scene')?.dataset.landmarkStatus, source: window.actualLandmarkSource?.getStats(),
      mapStatus: document.querySelector('#scene')?.dataset.mapTerrain, mapLoaded: document.querySelector('#scene')?.dataset.mapTerrainLoaded, mapQueued: document.querySelector('#scene')?.dataset.mapTerrainQueued, mapFailed: document.querySelector('#scene')?.dataset.mapTerrainFailed,
      detailedCandidates: window.actualLandmarkCandidates?.filter(item => ['road','poi'].includes(item.category)).slice(0, 20).map(item => ({ name:item.name, lat:item.lat_rad*180/Math.PI, lon:item.lon_rad*180/Math.PI, pixel:window.projectLandmarkItem(item) })),
      labels: Array.from({ length: window.actualLandmarkLabels?.length ?? 0 }, (_, i) => { const label = window.actualLandmarkLabels.get(i); return { id: label.id, text: label.text }; }) }));
    try {
      await observeScene(publicPage); await publicPage.goto(origin); await publicPage.waitForFunction(() => !document.querySelector('#start').disabled && window.actualLandmarkLabels);
      await publicPage.locator('#scene').focus(); await publicPage.keyboard.press('Alt+Shift+6');
      await publicPage.waitForFunction(() => !document.querySelector('#start').disabled && document.querySelector('#gate-label').textContent.includes('DARMSTADT'));
      await publicPage.locator('#start').click();
      await publicPage.waitForTimeout(500); await publicPage.locator('#scene').focus(); await publicPage.keyboard.press('Space');
      await publicPage.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
      // Real view gesture looks down at the nearby Darmstadt streets selected by the bounded name source.
      await publicPage.mouse.move(1350, 200); await publicPage.mouse.down(); await publicPage.waitForTimeout(300); await publicPage.mouse.move(1350, 400, { steps: 8 }); await publicPage.mouse.up();
      await publicPage.keyboard.press('o'); await publicPage.locator('#vector-scenery').check(); await publicPage.locator('#settings-close').click();
      await publicPage.locator('#scene').focus(); for (let i = 0; i < 3; i++) await publicPage.keyboard.press('.');
      captureStage = 'landmark source settlement';
      await publicPage.waitForFunction(() => {
        const stats = window.actualLandmarkSource?.getStats();
        return stats && stats.activeRequests === 0 && stats.queuedTiles === 0 && ['ready','degraded'].includes(document.querySelector('#scene').dataset.landmarkStatus);
      }, null, { timeout: 45000 });
      captureStage = 'visible map foreground';
      await publicPage.waitForFunction(() => Number(document.querySelector('#scene').dataset.mapTerrainLoaded) >= 32, null, { timeout: 120000 });
      captureStage = 'visible detailed names';
      await publicPage.waitForFunction(() => Array.from({ length: window.actualLandmarkLabels.length }, (_, i) => window.actualLandmarkLabels.get(i)).some(label => /^(transportation_name|poi):/.test(label.id)), null, { timeout: 15000 });
      await publicPage.screenshot({ path: fileURLToPath(new URL('../../output/flight/landmark-labels-public.png', import.meta.url)) });
      const result = { result: 'captured', observed_utc: new Date().toISOString(), responses: publicResponses, ...await captureState() };
      await writeFile(new URL('../../output/flight/landmark-public-capture.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
      console.log('Public OSM label capture:', result);
    } catch (error) {
      const result = { result: 'unavailable', stage: captureStage, error: error.message, observed_utc: new Date().toISOString(), responses: publicResponses, ...await captureState() };
      await publicPage.screenshot({ path: fileURLToPath(new URL('../../output/flight/landmark-labels-public-partial.png', import.meta.url)) });
      await writeFile(new URL('../../output/flight/landmark-public-capture.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
      console.log('Public landmark capture unavailable:', result);
    }
    finally { await publicPage.close(); }
  }
  console.log(JSON.stringify({ result: 'pass', checks: ['Off makes no name requests; period cycles cumulative tiers with bounded actual Cesium labels', 'source coordinates anchor terrain dots and offset labels with depth testing and screen declutter', 'right-click ground lookup names the nearest mapped feature; Off and sky do not query or advance native physics', 'actual look gestures cull behind-camera names without changing paused native state', 'selected recorded heading controls labels and Back to live restores current view', 'optional name-source failure remains explicit while the real native worker continues flying'], requests: requests.length, browser: browser.version() }, null, 2));
} finally { await browser?.close(); server.kill(); }
