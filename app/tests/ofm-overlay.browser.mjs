// Actual MapLibre/native worker. Ordinary scenery and default OFM pixels are
// fixtures; GEFLY_OFM_LIVE=1 instead observes the selected publisher tiles only.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const port = Number(process.env.GEFLY_OFM_TEST_PORT ?? 5397), live = process.env.GEFLY_OFM_LIVE === '1';
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const origin = `http://127.0.0.1:${port}`, key = 'gefly.ofm-overlay-preferences.v1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = ['src/practice-map.ts', 'src/ofm-map-overlay.ts', 'src/ofm-overlay-preferences.ts',
  'src/ofm-overlay-source.ts', 'ofm-overlay-server.ts', 'vite.config.ts', 'tests/ofm-overlay.browser.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(`${app}/${path}`))])));
const sourceBefore = await hashes();
const result = { result: 'running', mode: live ? 'live publisher tiles, bounded Germany observation' : 'synthetic transparent OFM pixels',
  sourceHashes: sourceBefore, checks: [], observations: [], responses: [], errors: [],
  limits: ['Actual native worker and MapLibre; scenery pixels are fixtures.',
    'Fixture mode establishes layer lifecycle, not current chart geography; live mode is a bounded observed view, not operational acceptance.',
    'Chromium only; no embedded WebKit or genuine background tab execution.'] };
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/ofm-vite-'+process.pid,server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let serverLog = '', browser, page;
server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
const save = () => writeFile(`${output}/ofm-overlay-${live ? 'live' : 'browser'}.json`, JSON.stringify(result, null, 2));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// A valid512px RGBA fixture with transparent background and a synthetic chart grid.
function fixturePNG() {
  function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
  function chunk(name, data) { const type = Buffer.from(name), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, crc]); }
  const header = Buffer.alloc(13); header.writeUInt32BE(512); header.writeUInt32BE(512, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc((512 * 4 + 1) * 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const offset = y * (512 * 4 + 1) + 1 + x * 4;
    if (x % 96 < 5 || y % 96 < 5 || Math.abs(x - y) < 3) { pixels[offset] = 183; pixels[offset + 1] = 25; pixels[offset + 2] = 225; pixels[offset + 3] = 210; }
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const pixels = fixturePNG();
let demand = [], responses = [], mode = 'good', releaseMetadata;
let metadataHold = Promise.resolve();
const responseReads = [];

async function configure(current) {
  current.setDefaultTimeout(30000); current.on('pageerror', error => result.errors.push(String(error)));
  await installSceneryFixture(current);
  await current.route('**/scenery/{vector,landmarks}/**', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  await current.route('**/scenery/osm/**/*.pbf', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  await current.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text(), marker = 'map = new LibreMap({';
    assert.equal(source.split(marker).length, 2);
    const observed = source.replace(marker, 'map = window.__ofmMap = new LibreMap({').replace('map.addControl(new ScaleControl',
      `map.on('error', event => window.ofmMapErrors.push({sourceId:event.sourceId ?? null,message:event.error?.message ?? String(event.error)}));\n    map.addControl(new ScaleControl`);
    result.servedPracticeMapSha256 = hash(source); result.observedPracticeMapSha256 = hash(observed);
    await route.fulfill({ response, body: observed });
  });
  current.on('request', request => { if (new URL(request.url()).pathname.startsWith('/charts/ofm/')) demand.push(new URL(request.url()).pathname); });
  current.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (!path.startsWith('/charts/ofm/')) return;
    responses.push({ path, status: response.status() });
    if (live && path.endsWith('.png') && response.status() === 200) responseReads.push((async () => {
      const bytes = await response.body();
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(bytes.readUInt32BE(16), 512); assert.equal(bytes.readUInt32BE(20), 512); assert.equal(bytes[25], 6);
      result.responses.push({ path, bytes: bytes.length, sha256: hash(bytes), width: 512, height: 512, colorType: 'RGBA' });
    })());
  });
  await current.route('**/charts/ofm/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/metadata.json')) {
      const response = await route.fetch();
      if (mode === 'hold') await metadataHold;
      try { await route.fulfill({ response }); } catch { /* A deliberately aborted optional metadata request cannot resurrect its layer. */ }
    } else if (mode === 'failure') await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Synthetic optional source failure' });
    else if (live) await route.continue();
    else await route.fulfill({ contentType: 'image/png', body: pixels });
  });
  await current.addInitScript(() => {
    const Native = Worker; window.ofmStates = []; window.ofmStats = []; window.ofmCommands = []; window.ofmMapErrors = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.ofmWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.ofmStates.push(data);
          if (data.type === 'stats') window.ofmStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.ofmWorker) window.ofmCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
}
async function ready(current = page) {
  await current.waitForFunction(() => !document.querySelector('#start').disabled && window.ofmStates.length, null, { timeout: 60000 });
  await prepareFlightUI(current, { controls: false });
}
async function openMap(current = page) {
  await current.locator('#scene').focus(); await current.keyboard.press('m');
  await current.locator('#practice-map-panel').waitFor({ state: 'visible' });
  await current.waitForFunction(() => window.__ofmMap?.getSource('recorded-path') && !document.querySelector('.practice-map-toolbar button').disabled);
  if (!await current.locator('#flight-map-extended-menu').isVisible()) { await current.locator('#scene').focus(); await current.keyboard.press(','); }
  await current.locator('#flight-map-extended-menu').waitFor({ state: 'visible' });
  // The older publication baseline still uses first-pointer activation. This
  // inert legend interaction occurs before exercising the new controls.
  const legend = current.locator('.map-location-types legend');
  if (await legend.count()) await legend.click();
  else await current.locator('.practice-map-heading').click();
}
async function stats(current = page) {
  const count = await current.evaluate(() => window.ofmStats.length);
  await current.evaluate(() => window.ofmWorker.postMessage({ type: 'stats' }));
  await current.waitForFunction(count => window.ofmStats.length > count, count);
  return current.evaluate(() => window.ofmStats.at(-1));
}
async function frozen(before, current = page) {
  const after = await stats(current); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
}
const layer = () => page.evaluate(() => window.__ofmMap.getStyle().layers.find(layer => layer.id === 'ofm-overlay'));
async function loaded(current = page) {
  await current.waitForFunction(() => document.querySelector('.practice-map-ofm-overlay')?.dataset.status === 'ready', null, { timeout: live ? 60000 : 30000 });
}
async function closeMap(current = page) { await current.locator('#scene').focus(); await current.keyboard.press('m'); await current.locator('#practice-map-panel').waitFor({ state: 'hidden' }); }

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; !serverLog.includes('Local:'); i++) { assert(i < 150 && server.exitCode === null, serverLog); await sleep(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  page = await context.newPage(); await configure(page); await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready();
  assert.equal(demand.length, 0, 'closed unselected map requests no OFM content');
  await openMap(); assert.equal(await page.locator('#ofm-overlay-toggle').isChecked(), false); assert.equal(demand.length, 0);
  const baseline = await stats(), beforePixels = await page.locator('#practice-map-panel .maplibregl-canvas').screenshot();
  const baselineForeground = await page.evaluate(() => {
    const style = window.__ofmMap.getStyle();
    return style.layers.filter(layer => typeof layer.source === 'string' && style.sources[layer.source]?.type === 'geojson').map(layer => layer.id);
  });
  for (const core of ['navigation-fixes', 'gps-target-line', 'path', 'navigation-stations']) assert(baselineForeground.includes(core), `baseline supplies ${core}`);
  result.planScope = baselineForeground.includes('flight-plan-route-line');
  result.baselineForeground = baselineForeground;
  result.foregroundScope = result.planScope ? 'Ordered plan, GPS, NAV and trace are present and must remain above OFM.'
    : 'This publication baseline has no ordered-plan feature; its existing GPS, NAV and trace foreground remains covered.';
  await page.locator('#ofm-overlay-toggle').check(); await loaded();
  assert(demand.some(path => path.endsWith('/metadata.json')) && demand.some(path => path.endsWith('.png')));
  const actualLayer = await layer(); assert.equal(actualLayer.type, 'raster'); assert.equal(actualLayer.minzoom, 7); assert.equal(actualLayer.maxzoom, undefined);
  assert.equal(actualLayer.paint['raster-opacity'], .8);
  const order = await page.evaluate(() => window.__ofmMap.getStyle().layers.map(layer => layer.id));
  assert(order.indexOf('ofm-overlay') > order.indexOf('imagery'));
  for (const foreground of baselineForeground) assert(order.indexOf('ofm-overlay') < order.indexOf(foreground), foreground);
  assert.match(await page.locator('#ofm-overlay-provenance').textContent(), /AIRAC 2611.*2026-10-29.*2026-11-26/);
  assert.equal(await page.locator('#ofm-overlay-provenance + p a').first().getAttribute('href'), 'https://openflightmaps.org/downloads/ed/');
  assert.equal(await page.getByRole('link', { name: 'Report a chart error', exact: true }).getAttribute('href'), 'mailto:info@openflightmaps.org');
  const afterPixels = await page.locator('#practice-map-panel .maplibregl-canvas').screenshot();
  assert.notEqual(hash(beforePixels), hash(afterPixels), 'rendered map pixels change under a transparent aviation raster');
  await page.locator('#practice-map-panel').screenshot({ path: `${output}/ofm-overlay-${live ? 'live' : 'fixture'}.png` });
  await frozen(baseline);
  result.checks.push(live ? 'Selected AIRAC2611 transparent publisher tiles render in the Germany view above base cartography and below local flight overlays' : 'Default-off and closed map make no chart demand; enabling actual MapLibre raster changes pixels with correct source/date/credit links and foreground order');
  result.observations.push({ layerOrder: order.filter(id => ['imagery', 'ofm-overlay', 'navigation-fixes', 'flight-plan-route-line', 'gps-target-line', 'navigation-stations', 'path'].includes(id)), beforePixelSha256: hash(beforePixels), afterPixelSha256: hash(afterPixels) });

  if (!live) {
    await page.locator('#ofm-overlay-opacity').focus(); await page.keyboard.press('Home');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#ofm-overlay-opacity').inputValue(), '35');
    assert.equal((await layer()).paint['raster-opacity'], .35);
    const initialTileCount = demand.filter(path => path.endsWith('.png')).length;
    const panRequest = page.waitForRequest(request => /^\/charts\/ofm\/\d+\/\d+\/\d+\/\d+\.png$/.test(new URL(request.url()).pathname));
    await page.evaluate(() => window.__ofmMap.jumpTo({ center: [9.2, 50.3], zoom: 12 })); await panRequest; await loaded();
    assert(demand.filter(path => path.endsWith('.png')).length > initialTileCount, 'viewport movement loads new XYZ tiles on demand');
    await page.evaluate(() => window.__ofmMap.jumpTo({ zoom: 5 }));
    await page.waitForFunction(() => document.querySelector('.practice-map-ofm-overlay').dataset.status === 'zoom-in');
    assert.match(await page.locator('#ofm-overlay-status').textContent(), /Zoom in.*7/);
    await page.evaluate(() => window.__ofmMap.jumpTo({ zoom: 17 })); await loaded();
    assert(demand.filter(path => path.endsWith('.png')).every(path => Number(path.split('/')[4]) <= 13));
    await page.evaluate(() => new Promise(resolve => {
      const style = window.__ofmMap.getStyle(); delete style.sources['ofm-overlay']; style.layers = style.layers.filter(layer => layer.id !== 'ofm-overlay');
      window.__ofmMap.once('style.load', resolve);
      window.__ofmMap.setStyle(style, { diff: false });
    })); await loaded(); assert.equal((await layer()).paint['raster-opacity'], .35);
    await frozen(baseline); result.checks.push('Opacity saves and changes paint; viewport pan fetches new tiles, low zoom is explicit, native source overzooms to17 and style replacement restores the chart below local overlays');

    await page.locator('#ofm-overlay-toggle').uncheck();
    assert(!await layer()); const offCount = demand.length;
    await page.evaluate(() => window.__ofmMap.jumpTo({ center: [7, 48], zoom: 11 })); await page.waitForTimeout(350); assert.equal(demand.length, offCount);
    await page.locator('#ofm-overlay-toggle').check(); await loaded();
    mode = 'hold'; metadataHold = new Promise(resolve => { releaseMetadata = resolve; });
    // Retry is normally visible only on failure; a synthetic source error uses
    // the public event path before exercising the accessible Retry control.
    await page.evaluate(() => window.__ofmMap.fire('error', { sourceId: 'ofm-overlay', error: new Error('Synthetic optional failure') }));
    const heldRequest = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/charts/ofm/metadata.json'));
    await page.locator('#ofm-overlay-retry').click(); await heldRequest;
    await page.waitForFunction(() => document.querySelector('.practice-map-ofm-overlay').dataset.status === 'loading');
    await closeMap(); const hiddenCount = demand.length; releaseMetadata(); await page.waitForTimeout(150);
    await page.evaluate(() => window.__ofmMap.jumpTo({ center: [2, 48], zoom: 10 })); await page.waitForTimeout(350);
    assert.equal(demand.length, hiddenCount); assert(!await layer());
    mode = 'good'; await openMap(); await loaded(); await frozen(baseline);
    result.checks.push('Off and hidden maps remove the chart source and stop new tile demand; aborted late metadata cannot restore a closed layer');

    mode = 'failure';
    await page.evaluate(() => window.__ofmMap.jumpTo({ center: [10.6, 51.2], zoom: 12 }));
    await page.waitForFunction(() => document.querySelector('.practice-map-ofm-overlay').dataset.status === 'unavailable');
    assert.equal(await page.locator('.practice-map-status').isVisible(), false, 'optional chart failure does not flag base-map failure');
    assert(await page.evaluate(foreground => !!window.__ofmMap.getSource('recorded-path') && foreground.every(id => !!window.__ofmMap.getLayer(id)), baselineForeground));
    const failureZoom = await page.evaluate(() => window.__ofmMap.getZoom());
    await page.getByRole('button', { name: 'Zoom map in', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.__ofmMap.getZoom()), failureZoom + 1);
    mode = 'good'; await page.locator('#ofm-overlay-retry').click(); await loaded(); await frozen(baseline);
    result.checks.push('Optional tile failure is distinct from base-map status; local flight overlays and real zoom controls remain usable, and Retry recovers the chart');

    await closeMap(); demand = []; await page.reload({ waitUntil: 'domcontentloaded' }); await ready(); assert.equal(demand.length, 0);
    await openMap(); await loaded(); assert.equal(await page.locator('#ofm-overlay-toggle').isChecked(), true); assert.equal(await page.locator('#ofm-overlay-opacity').inputValue(), '35');
    assert.deepEqual(JSON.parse(await page.evaluate(key => localStorage.getItem(key), key)), { version: 1, enabled: true, opacity: .35 });
    for (const denied of [false, true]) {
      const extra = await context.newPage(); await configure(extra);
      await extra.addInitScript(({ key, denied }) => {
        if (denied) { const get = Storage.prototype.getItem, set = Storage.prototype.setItem; Storage.prototype.getItem = function (name) { if (name === key) throw new Error('denied fixture'); return get.call(this, name); }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new Error('denied fixture'); return set.call(this, name, value); }; }
        else localStorage.setItem(key, '{"version":9,"enabled":true,"opacity":0.5}');
      }, { key, denied });
      const count = demand.length; await extra.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(extra); await openMap(extra);
      assert.equal(await extra.locator('#ofm-overlay-toggle').isChecked(), false); assert.equal(demand.length, count);
      const paused = await stats(extra); await extra.locator('#ofm-overlay-toggle').check(); await loaded(extra); await frozen(paused, extra); await extra.close();
    }
    result.checks.push('Saved enabled/opacity choices restore on reopening after page reload; corrupt or denied preferences default off and remain operable without stepping native physics');
  }
  await Promise.all(responseReads); result.responses.push(...responses);
  result.mapErrors = await page.evaluate(() => window.ofmMapErrors);
  assert(result.mapErrors.every(error => error.sourceId === 'ofm-overlay'), 'only deliberately failed optional chart requests emit map errors');
  assert.deepEqual(result.errors, []); assert.deepEqual(await hashes(), sourceBefore, 'runtime source stayed frozen');
  result.browser = browser.version(); result.result = 'pass'; await save(); console.log(JSON.stringify({ result: result.result, mode: result.mode, checks: result.checks }, null, 2));
} catch (error) {
  result.result = 'fail'; result.error = String(error); result.serverLog = serverLog;
  result.debug = await page?.evaluate(() => ({ map: !!window.__ofmMap, zoom: window.__ofmMap?.getZoom(), overlay: document.querySelector('.practice-map-ofm-overlay')?.outerHTML, status: document.querySelector('#status')?.textContent, mapErrors:window.ofmMapErrors })).catch(() => null);
  await save(); throw error;
} finally { releaseMetadata?.(); await browser?.close(); server.kill('SIGTERM'); }
