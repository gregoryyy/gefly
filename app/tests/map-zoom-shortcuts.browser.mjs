// R-WORLD-6/R-SIM-9: actual MapLibre/native worker; only scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5395';
const paths = ['src/main.ts', 'src/practice-map.ts', 'src/flight-assists.ts', 'src/map-zoom-shortcuts.ts',
  'tests/map-zoom-shortcuts.browser.mjs'];
const hash = value => createHash('sha256').update(value).digest('hex');
const hashes = async () => Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(`${app}/${path}`))])));
const sourceBefore = await hashes();
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5395,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let browser, serverLog = '', page;
const result = { result: 'running', sourceHashes: sourceBefore, checks: [], observations: [], errors: [] };
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const save = () => writeFile(`${output}/map-zoom-shortcuts-browser.json`, JSON.stringify(result, null, 2));

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; !serverLog.includes('Local:'); i++) { assert(i < 150 && server.exitCode === null, serverLog); await sleep(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(String(error)));
  await installSceneryFixture(page);
  await page.route('**/scenery/{vector,landmarks}/**', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  let releaseMap;
  const mapRelease = new Promise(resolve => { releaseMap = resolve; });
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    const marker = 'map = new LibreMap({';
    assert.equal(source.split(marker).length, 2, 'one read-only MapLibre observer insertion');
    const observed = source.replace(marker, 'map = window.__shortcutMap = new LibreMap({');
    result.servedPracticeMapSha256 = hash(source); result.observedPracticeMapSha256 = hash(observed);
    await mapRelease;
    await route.fulfill({ response, body: observed });
  });
  await page.addInitScript(() => {
    const Native = Worker;
    window.zoomStates = []; window.zoomStats = []; window.zoomCommands = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.zoomWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.zoomStates.push(data);
          if (data.type === 'stats') window.zoomStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.zoomWorker) window.zoomCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.zoomStates.at(-1)?.simulation_rate === 1, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const scene = page.locator('#scene'), mapPanel = page.locator('#practice-map-panel');
  const rateOverlay = page.locator('#simulation-rate-overlay');
  const state = () => page.evaluate(() => window.zoomStates.at(-1));
  const rateCommands = () => page.evaluate(() => window.zoomCommands.filter(command => command.type === 'simulation-rate').length);
  const stats = async () => {
    const count = await page.evaluate(() => window.zoomStats.length);
    await page.evaluate(() => window.zoomWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.zoomStats.length > count, count);
    return page.evaluate(() => window.zoomStats.at(-1));
  };
  const frozen = async before => {
    const after = await stats();
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  };
  const zoom = () => page.evaluate(() => window.__shortcutMap.getZoom());
  const cdp = await context.newCDPSession(page);
  const character = async (key, code, modifiers = 0, autoRepeat = false) => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, text: key, autoRepeat });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: 0 });
  };
  const initial = await stats(), throttle = await page.locator('#throttle').inputValue();
  await scene.focus(); await page.keyboard.press('m'); await mapPanel.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#practice-map-panel').textContent.includes('Loading practice map'));
  const loadingCount = await rateCommands();
  for (const key of ['Minus', 'Shift+Equal']) await page.keyboard.press(key);
  await character('=', 'Digit0', 8, true);
  assert.equal(await rateCommands(), loadingCount); assert.equal(await page.locator('#throttle').inputValue(), throttle);
  await character('=', 'Digit0', 8); await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1.5);
  await rateOverlay.click({ modifiers: ['Shift'] }); await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1);
  assert.equal(await rateCommands(), loadingCount + 2); assert.equal(await page.locator('#throttle').inputValue(), throttle);
  await frozen(initial); releaseMap();
  await page.waitForFunction(() => window.__shortcutMap?.getSource('recorded-path'));
  await page.getByRole('button', { name: 'Zoom map in', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#simulation-rate').getAttribute('aria-keyshortcuts') === '='
    && document.querySelector('#simulation-rate kbd').textContent === '=');
  assert.match(await page.locator('#simulation-rate').getAttribute('title'), /zoom the open map/);
  result.checks.push('open but loading map consumes + / - and repeated German = without pacing; a German = press still paces; throttle/native unchanged');

  async function keyPace(label, focus, action) {
    await focus(); const before = await zoom(), count = await rateCommands(); await action();
    await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1.5);
    await page.waitForTimeout(180); // Detect a MapLibre keyboard-handler zoom.
    assert(Math.abs(await zoom() - before) < 1e-9, `${label}: = does not zoom the open map`);
    assert.equal(await rateCommands(), count + 1); assert.equal(await page.locator('#throttle').inputValue(), throttle);
    await rateOverlay.click({ modifiers: ['Shift'] }); await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1);
    await frozen(initial); result.observations.push({ label, zoom: before, rateCommandCount: await rateCommands() });
  }
  const unchangedRateBeforePace = await rateCommands();
  for (const [label, focus] of [['scene', () => scene.focus()], ['MapLibre canvas', () => page.locator('#practice-map-panel .maplibregl-canvas').focus()],
    ['map control', () => page.getByRole('button', { name: 'Zoom map in', exact: true }).focus()]]) {
    await keyPace(`${label} =`, focus, () => page.keyboard.press('Equal'));
  }
  await keyPace('German Shift+Digit0 =', () => scene.focus(), () => character('=', 'Digit0', 8));
  assert.equal(await rateCommands(), unchangedRateBeforePace + 8);
  result.checks.push('= cycles speed with scene, canvas and map-control focus over the open map without zooming it; native worker stays paused');

  const unchangedRate = await rateCommands();
  async function keyZoom(label, focus, action, direction) {
    await focus(); const before = await zoom(); await action();
    await page.waitForFunction(expected => Math.abs(window.__shortcutMap.getZoom() - expected) < 1e-9, before + direction);
    await page.waitForTimeout(180); // Detect a second MapLibre keyboard-handler increment.
    assert(Math.abs(await zoom() - before - direction) < 1e-9, `${label}: exactly one level`);
    assert.equal(await rateCommands(), unchangedRate); assert.equal(await page.locator('#throttle').inputValue(), throttle);
    assert.equal((await state()).simulation_rate, 1); await frozen(initial);
    result.observations.push({ label, before, after: await zoom(), rateCommandCount: await rateCommands() });
  }
  const sceneFocus = () => scene.focus();
  const canvasFocus = () => page.locator('#practice-map-panel .maplibregl-canvas').focus();
  const buttonFocus = () => page.getByRole('button', { name: 'Zoom map in', exact: true }).focus();
  for (const [label, focus] of [['scene', sceneFocus], ['MapLibre canvas', canvasFocus], ['map control', buttonFocus]]) {
    await keyZoom(`${label} -`, focus, () => page.keyboard.press('Minus'), -1);
    await keyZoom(`${label} +`, focus, () => page.keyboard.press('Shift+Equal'), 1);
    await keyZoom(`${label} numpad -`, focus, () => page.keyboard.press('NumpadSubtract'), -1);
  }
  await keyZoom('numpad +', canvasFocus, () => page.keyboard.press('NumpadAdd'), 1);
  result.checks.push('Shift+= (+) zooms in and - zooms out exactly once with scene, canvas and map-control focus; native worker stays paused and rate/throttle stay unchanged');

  // All initial keyboard zoom cases run before a pointer activation. Older
  // floating-panel implementations need activation before ordinary point UI.
  await scene.focus(); await page.keyboard.press(',');
  const mapMenu = page.locator('#flight-map-extended-menu'); await mapMenu.waitFor({ state: 'visible' });
  await mapMenu.locator('.map-location-types legend').click();
  await scene.focus(); await page.keyboard.press(',');

  const guardedZoom = await zoom();
  await scene.focus();
  for (const key of ['Control+Equal', 'Meta+Equal', 'Alt+Equal']) await page.keyboard.press(key);
  await character('=', 'Digit0', 8, true);
  await character('+', 'Equal', 8); // First real press zooms once; a recognized repeat does not.
  const repeatZoom = await zoom(); await character('+', 'Equal', 8, true);
  assert.equal(await zoom(), repeatZoom); assert.equal(repeatZoom, guardedZoom + 1);
  await scene.evaluate(element => {
    const event = new KeyboardEvent('keydown', { key: '+', code: 'Equal', shiftKey: true, bubbles: true, cancelable: true });
    event.preventDefault(); element.dispatchEvent(event);
  });
  assert.equal(await zoom(), repeatZoom);
  await scene.focus(); await page.keyboard.press(',');
  const search = page.getByLabel('Search map points'); await search.fill('='); await page.keyboard.press('Equal');
  assert.equal(await search.inputValue(), '=='); assert.equal(await zoom(), repeatZoom); await search.fill('');
  await scene.focus(); await page.keyboard.press(',');
  await page.locator('#flight-menu > summary').click(); await page.keyboard.press('Equal'); await page.keyboard.press('Minus');
  assert.equal(await zoom(), repeatZoom); await page.locator('#flight-menu > summary').click();
  await scene.focus(); await page.keyboard.press('o'); await page.locator('#control-settings').waitFor({ state: 'visible' });
  await page.locator('#settings-close').focus(); await page.keyboard.press('Equal'); await page.keyboard.press('Minus');
  assert.equal(await zoom(), repeatZoom); await page.locator('#settings-close').click();
  assert.equal(await rateCommands(), unchangedRate); assert.equal(await page.locator('#throttle').inputValue(), throttle); await frozen(initial);
  result.checks.push('modifier, recognized repeat, default-prevented event, editable map search, top-menu and modal guards preserve map zoom, pacing, throttle and native state');

  await scene.focus(); await page.keyboard.press('a'); await page.waitForFunction(() => window.zoomStates.at(-1)?.kap_engaged === 1);
  await page.keyboard.press('a'); await page.waitForFunction(() => window.zoomStates.at(-1)?.kap_engaged === 0);
  await frozen(initial);
  await page.locator('#flight-menu > summary').click(); await page.locator('#simulation-rate').click();
  await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1.5);
  if (!await page.locator('#flight-menu').evaluate(menu => menu.open)) await page.locator('#flight-menu > summary').click();
  await page.locator('#simulation-rate').click({ modifiers: ['Shift'] });
  await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1);
  assert.equal(await mapPanel.isVisible(), true); assert.equal(await zoom(), repeatZoom);
  if (await page.locator('#flight-menu').evaluate(menu => menu.open)) await page.locator('#flight-menu > summary').click();
  await frozen(initial);
  result.checks.push('A still toggles AP with map open; Flight speed click/Shift-click changes worker rate while map remains open');

  await scene.focus(); await page.keyboard.press('m'); await mapPanel.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('#simulation-rate').getAttribute('aria-keyshortcuts') === '= Shift+=');
  await page.keyboard.press('Equal'); await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1.5);
  await page.keyboard.press('Shift+Equal'); await page.waitForFunction(() => window.zoomStates.at(-1)?.simulation_rate === 1);
  assert.equal(await zoom(), repeatZoom); await frozen(initial);
  result.checks.push('closed map restores = speed cycle and + decrement without changing hidden map zoom');

  await page.locator('#start').click(); await page.waitForFunction(step => window.zoomStates.at(-1)?.step >= step + 120, initial.step);
  const liveCommands = await rateCommands(), liveThrottle = await page.locator('#throttle').inputValue();
  await scene.focus(); await page.keyboard.press('m'); await mapPanel.waitFor({ state: 'visible' });
  // Leave headroom for two consecutive zoom-in keys before checking the net
  // change, independently of the preceding paused/guard scenarios.
  const maxZoom = await page.evaluate(() => window.__shortcutMap.getMaxZoom());
  while (await zoom() > maxZoom - 2) await page.keyboard.press('Minus');
  const liveZoom = await zoom(), liveBefore = await state();
  assert(Number.isFinite(liveBefore.throttle_norm));
  for (const [key, delta] of [['Shift+Equal', 1], ['Shift+Equal', 1], ['Minus', -1]]) {
    const before = await zoom(); await page.keyboard.press(key);
    assert.equal(await zoom(), before + delta, `live ${key} changes map by one level`);
  }
  assert.equal(await zoom(), liveZoom + 1);
  await page.waitForFunction(step => window.zoomStates.at(-1)?.step >= step + 60, liveBefore.step);
  const liveAfter = await state();
  assert.equal(liveAfter.simulation_rate, liveBefore.simulation_rate);
  assert.equal(liveAfter.throttle_norm, liveBefore.throttle_norm);
  assert.equal(await rateCommands(), liveCommands); assert.equal(await page.locator('#throttle').inputValue(), liveThrottle);
  result.observations.push({ label: 'live map zoom', before: liveZoom, after: await zoom(),
    stepBefore: liveBefore.step, stepAfter: liveAfter.step, throttle_norm: liveAfter.throttle_norm,
    rate: liveAfter.simulation_rate, rateCommandCount: await rateCommands() });
  await scene.focus(); await page.keyboard.press('m'); await mapPanel.waitFor({ state: 'hidden' });
  result.checks.push('during live flight +/- change map zoom by exactly net +1 while worker steps continue and rate commands/throttle stay unchanged');
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const paused = await stats(); await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await scene.focus(); await page.keyboard.press('m'); await mapPanel.waitFor({ state: 'visible' });
  const reviewRate = await rateOverlay.textContent(), reviewCommands = await rateCommands(), reviewZoom = await zoom();
  for (const key of ['Minus', 'Shift+Equal', 'Shift+Equal']) await page.keyboard.press(key);
  assert.equal(await zoom(), reviewZoom + 1); assert.equal(await rateOverlay.textContent(), reviewRate);
  assert.equal(reviewRate, 'REPLAY 1×');
  await page.keyboard.press('Equal'); await page.waitForFunction(() => document.querySelector('#simulation-rate-overlay').textContent === 'REPLAY 1.5×');
  await rateOverlay.click({ modifiers: ['Shift'] }); await page.waitForFunction(() => document.querySelector('#simulation-rate-overlay').textContent === 'REPLAY 1×');
  assert.equal(await zoom(), reviewZoom + 1);
  assert.equal(await rateCommands(), reviewCommands); await frozen(paused);
  await page.locator('#review-exit').click(); await mapPanel.waitFor({ state: 'visible' });
  await frozen(paused);
  result.checks.push('Review map +/- zoom exactly once; = and badge Shift-click change only replay speed; paused live native state preserved');

  await scene.focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press('Shift+Equal');
  assert.equal(await zoom(), await page.evaluate(() => window.__shortcutMap.getMaxZoom()));
  await page.getByRole('button', { name: 'Zoom map in', exact: true }).focus(); await page.keyboard.press('Enter');
  assert.equal(await zoom(), await page.evaluate(() => window.__shortcutMap.getMaxZoom()));
  for (let i = 0; i < 25; i++) await page.keyboard.press('Minus');
  const floor = await zoom(), configuredMin = await page.evaluate(() => window.__shortcutMap.getMinZoom());
  // MapLibre also constrains the world to cover the viewport vertically: at
  // this viewport its effective floor is slightly above configured zoom zero.
  assert(floor >= configuredMin && floor < configuredMin + 1, 'viewport-constrained minimum reached');
  await page.keyboard.press('Minus'); assert.equal(await zoom(), floor);
  await page.getByRole('button', { name: 'Zoom map out', exact: true }).focus(); await page.keyboard.press('Enter');
  assert.equal(await zoom(), floor);
  assert.equal(await rateCommands(), reviewCommands); await frozen(paused);
  result.checks.push('keyboard and map buttons share the actual MapLibre min/max zoom bounds; speed shortcut hint and accessibility metadata follow map visibility');

  assert.deepEqual(result.errors, []); assert.deepEqual(await hashes(), sourceBefore, 'tested application source stayed fixed');
  result.browser = browser.version(); result.result = 'pass'; await save();
  console.log(JSON.stringify({ result: result.result, checks: result.checks }, null, 2));
} catch (error) {
  result.result = 'fail'; result.error = String(error); result.serverLog = serverLog;
  result.debug = await page?.evaluate(() => ({ zoom: window.__shortcutMap?.getZoom(), state: window.zoomStates?.at(-1),
    status: document.querySelector('#status')?.textContent, focused: document.activeElement?.outerHTML.slice(0, 250) })).catch(() => null);
  await save(); throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
