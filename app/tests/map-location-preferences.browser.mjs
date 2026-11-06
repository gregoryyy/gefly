// Actual application, MapLibre and native worker; only scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5393';
const key = 'gefly.map-location-preferences.v1';
const types = ['airfield', 'heliport', 'seaplane', 'balloonport', 'closed', 'nav', 'fix'];
const sourcePaths = ['src/practice-map.ts', 'src/map-point-search.ts', 'src/map-location-types.ts',
  'src/map-location-preferences.ts', 'tests/map-location-preferences.browser.mjs'];
async function sourceHashes() {
  return Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path,
    createHash('sha256').update(await readFile(`${app}/${path}`)).digest('hex')])));
}
const sourceBefore = await sourceHashes();
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5393,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let browser, serverLog = '';
const checks = [], observations = [], errors = [];
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function setup(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(String(error)));
  await installSceneryFixture(page);
  await page.route('**/scenery/{vector,landmarks}/**', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'), 'real MapLibre observer marker exists');
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__locationMap = new LibreMap({') });
  });
  await page.addInitScript(() => {
    window.locationStates = []; window.locationStats = []; window.firstLocationTypes = null;
    // Record the checked state when filters first enter the DOM, before a user
    // can open the menu. This catches restoring only after the first display.
    const observer = new MutationObserver(() => {
      const filters = document.querySelector('.map-location-types');
      if (filters && window.firstLocationTypes === null) {
        window.firstLocationTypes = [...filters.querySelectorAll('input:checked')].map(input => input.value);
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    const Native = Worker;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/sim/worker.js')) return;
        window.locationWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.locationStates.push(data);
          if (data.type === 'stats') window.locationStats.push(data);
        });
      }
    };
  });
  return page;
}
async function ready(page) {
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.locationStates.length, null, { timeout: 60000 });
}
async function openMap(page) {
  const panel = page.locator('#practice-map-panel'), menu = page.locator('#flight-map-extended-menu');
  if (!await panel.isVisible()) { await page.locator('#scene').focus(); await page.keyboard.press('m'); }
  await page.waitForFunction(() => window.__locationMap?.getSource('navigation-fixes'));
  if (!await menu.isVisible()) { await page.locator('#scene').focus(); await page.keyboard.press(','); }
  await menu.waitFor({ state: 'visible' });
  // Older supported builds consume the first pointer click to activate a
  // floating map panel. Activate on its inert legend before any point action.
  await menu.locator('.map-location-types legend').click();
}
const navigate = page => page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
const selected = page => page.locator('.map-location-types input:checked').evaluateAll(inputs => inputs.map(input => input.value));
async function assertChoices(page, expected, label) {
  assert.deepEqual(await selected(page), expected, label);
  assert.deepEqual(await page.evaluate(() => window.firstLocationTypes), expected, `${label}: initialized before first display`);
  observations.push({ label, selected: await selected(page), firstDisplay: await page.evaluate(() => window.firstLocationTypes) });
}
async function choose(page, expected) {
  for (const type of types) await page.locator(`.map-location-types input[value="${type}"]`).setChecked(expected.includes(type));
  assert.deepEqual(await selected(page), expected);
}
async function stats(page) {
  const count = await page.evaluate(() => window.locationStats.length);
  await page.evaluate(() => window.locationWorker.postMessage({ type: 'stats' }));
  await page.waitForFunction(count => window.locationStats.length > count, count);
  return page.evaluate(() => window.locationStats.at(-1));
}
async function frozen(page, before) {
  const after = await stats(page);
  assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
  assert.deepEqual(after.final_state, before.final_state);
}
const data = (page, source) => page.evaluate(async source => window.__locationMap.getSource(source).getData(), source);
async function reopen(page) {
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({ state: 'hidden' });
  await openMap(page);
}

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; !serverLog.includes('Local:'); i++) { assert(i < 100 && server.exitCode === null, serverLog); await sleep(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  const page = await setup(context); await navigate(page); await ready(page); await openMap(page);
  await assertChoices(page, types, 'fresh defaults');
  assert.equal(await page.getByRole('checkbox', { name: 'Show historical fix markers' }).count(), 0, 'one Fixes control governs catalogue visibility');
  await page.waitForFunction(async () => (await window.__locationMap.getSource('navigation-fixes').getData()).features.length > 0);
  const catalogue = await data(page, 'navigation-fixes');
  assert.equal(catalogue.features.length, 2739, 'actual pinned historical catalogue is retained');
  assert.equal(await page.evaluate(() => window.__locationMap.getLayer('navigation-fixes').minzoom), 8);
  assert((await page.locator('.practice-map-fix-marker').count()) <= 40, 'nearby published labels remain bounded');
  const before = await stats(page);
  const search = page.getByLabel('Search map points');
  await search.fill('ASKIK'); await page.locator('.map-point-search-row').filter({ hasText: 'ASKIK' }).first().click();
  const popup = page.locator('.map-point-popup'); await popup.waitFor({ state: 'visible' });
  assert.match(await popup.textContent(), /ASKIK/);
  const center = await page.evaluate(() => { const c = window.__locationMap.getCenter(); return [c.lng, c.lat]; });
  assert(Math.abs(center[0] - 8.533611) < 1e-7 && Math.abs(center[1] - 50.052778) < 1e-7);
  await page.waitForFunction(() => window.__locationMap.queryRenderedFeatures({ layers: ['navigation-fixes'] }).some(f => f.properties.name === 'ASKIK'));
  const askik = page.getByRole('button', { name: 'Select fix ASKIK', exact: true });
  await askik.waitFor({ state: 'visible' });
  await popup.getByRole('button', { name: 'GPS target', exact: true }).click();
  const gps = await data(page, 'gps-target');
  assert.equal(gps.features.length, 2); assert.deepEqual(gps.features.find(f => f.geometry.type === 'Point').geometry.coordinates, [8.533611, 50.052778]);
  await page.locator('.maplibregl-popup-close-button').click();
  const airfields = await data(page, 'airfields'), nav = await data(page, 'navigation-aids');
  await page.locator('.map-location-types input[value="fix"]').uncheck();
  assert.equal((await data(page, 'navigation-fixes')).features.length, 0);
  assert.equal(await page.locator('.practice-map-fix-marker').count(), 0);
  assert.equal(await page.locator('.map-point-search-row').count(), 0, 'hidden fixes disappear from results too');
  assert.deepEqual(await data(page, 'airfields'), airfields); assert.deepEqual(await data(page, 'navigation-aids'), nav);
  assert.deepEqual(await data(page, 'gps-target'), gps, 'explicit target and line are independent of source filters');
  await page.locator('.map-location-types input[value="fix"]').check();
  await page.locator('.map-point-search-row').filter({ hasText: 'ASKIK' }).first().waitFor();
  await askik.waitFor({ state: 'visible' });
  await frozen(page, before);
  checks.push('Fixes defaults on; actual historical source, rendered ASKIK and selectable label agree with results; off hides both while retaining other categories/GPS/native state');

  // Direct factory contract: empty is deliberate, input ownership is isolated,
  // and initialization cannot call the map callback before its factory returns.
  const factory = await page.evaluate(async () => {
    const { createMapPointSearch } = await import('/src/map-point-search.ts');
    let callbacks = 0;
    const incoming = new Set(['fix']);
    const search = createMapPointSearch({ initialTypes: incoming, onSelect() {}, onTypesChange() { callbacks++; } });
    incoming.add('nav');
    search.setPoints([{ id: 'ASKIK', name: 'ASKIK', kind: 'fix', source_label: 'test', lat_deg: 50, lon_deg: 8 },
      { id: 'FFM', name: 'FFM', kind: 'VOR', source_label: 'test', lat_deg: 50, lon_deg: 8 }]);
    const result = { callbacks, checked: [...search.element.querySelectorAll('input:checked')].map(n => n.value), rows: search.element.querySelectorAll('.map-point-search-row').length };
    search.dispose();
    const empty = createMapPointSearch({ initialTypes: new Set(), onSelect() {}, onTypesChange() { callbacks++; } });
    result.empty = empty.element.querySelectorAll('input:checked').length; empty.dispose();
    return { ...result, callbacks };
  });
  assert.deepEqual(factory, { callbacks: 0, checked: ['fix'], rows: 1, empty: 0 });
  checks.push('search factory owns a copy of initial types, accepts explicit all-off, and emits no initialization callback');

  await search.fill('');
  for (const expected of [['airfield', 'nav'], []]) {
    const iterationBefore = await stats(page);
    await choose(page, expected); await frozen(page, iterationBefore);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), { version: 1, types: expected });
    await reopen(page); assert.deepEqual(await selected(page), expected, 'map close/reopen retains filters');
    await frozen(page, iterationBefore);
    if (expected.length) {
      await prepareFlightUI(page, { controls: false });
      await page.locator('#flight-menu > summary').click();
      await page.evaluate(() => { window.locationStates = []; });
      await page.locator('#reset').click(); await ready(page); await openMap(page);
      assert.deepEqual(await selected(page), expected, 'actual Flight restart retains mixed filter choices');
      assert.equal((await data(page, 'navigation-fixes')).features.length, 0, 'restarted map retains hidden fixes');
      assert((await data(page, 'navigation-aids')).features.length > 0, 'restarted map retains visible NAV aids');
      assert((await data(page, 'airfields')).features.every(feature => feature.properties.type.endsWith('_airport')),
        'restarted map retains airfields without other facility types');
      const restarted = await stats(page); await frozen(page, restarted);
      checks.push('actual Flight restart preserves saved mixed choices and filtered map sources; fresh native baseline remains paused');
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await ready(page); await openMap(page);
    await assertChoices(page, expected, expected.length ? 'mixed after reload' : 'all-off after reload');
    if (!expected.length) {
      assert.equal(await page.locator('.map-point-search-row').count(), 0);
      assert.equal((await data(page, 'navigation-fixes')).features.length, 0);
    }
    const another = await setup(context); await navigate(another); await ready(another); await openMap(another);
    await assertChoices(another, expected, expected.length ? 'mixed fresh tab' : 'all-off fresh tab'); await another.close();
  }
  checks.push('mixed and explicit all-off survive close/reopen, real reload and fresh same-origin tabs; saved choices appear at first filter insertion');
  await context.close();

  for (const [label, raw] of [['malformed', '{broken'], ['future version', '{"version":2,"types":[]}'], ['oversized', ' '.repeat(513)]]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
    await context.addInitScript(({ key, raw }) => { if (location.protocol === 'http:') localStorage.setItem(key, raw); }, { key, raw });
    const p = await setup(context); await navigate(p); await ready(p); await openMap(p); await assertChoices(p, types, label);
    await choose(p, ['fix']); assert.deepEqual(await selected(p), ['fix']); await context.close();
  }
  const denied = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }));
  const p = await setup(denied); await navigate(p); await ready(p); await openMap(p); await assertChoices(p, types, 'denied storage');
  const deniedBefore = await stats(p); await choose(p, ['fix']); await reopen(p); assert.deepEqual(await selected(p), ['fix']); await frozen(p, deniedBefore);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await ready(p); await openMap(p); await assertChoices(p, types, 'denied storage reload'); await denied.close();
  checks.push('corrupt, future and oversized storage falls back to all types; denied storage allows session choices/reopen and safe defaults after reload');
  assert.deepEqual(errors, []);
  const sourceAfter = await sourceHashes(); assert.deepEqual(sourceAfter, sourceBefore, 'tested source stayed fixed');
  await writeFile(`${output}/map-location-preferences-browser.json`, JSON.stringify({ result: 'pass', browser: browser.version(), sourceHashes: sourceAfter, checks, observations, errors }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} catch (error) {
  await writeFile(`${output}/map-location-preferences-browser.json`, JSON.stringify({ result: 'fail', error: String(error), sourceHashes: sourceBefore, checks, observations, errors, serverLog }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
