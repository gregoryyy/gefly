// TODO2.0.137 / R-PLAY-2: real map gestures and native JSBSim terrain-relative
// initialization. Only optional scenery pixels are deterministic fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5354';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5354,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, page, serverLog = '';
server.stdout.on('data', value => { serverLog += value; }); server.stderr.on('data', value => { serverLog += value; });
const checks = [], observations = {}, errors = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverLog.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = window.Worker; window.flyWorkers = []; window.flyMessages = []; window.flyInits = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        const worker = window.flyWorkers.length; window.flyWorkers.push(this);
        this.addEventListener('message', ({ data }) => { if (['state', 'ready', 'stats', 'error'].includes(data.type)) window.flyMessages.push({ ...data, worker }); });
      }
      postMessage(message, ...args) { if (message?.type === 'init') window.flyInits.push(structuredClone(message)); return super.postMessage(message, ...args); }
    };
  });
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text(); assert(source.includes('map = new LibreMap({'));
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__flyMap = new LibreMap({') });
  });
  await installSceneryFixture(page); await page.goto(origin);
  const ready = async () => page.waitForFunction(() => !document.querySelector('#start').disabled && window.flyMessages.some(message => message.type === 'state' && message.worker === window.flyWorkers.length - 1), null, { timeout: 60000 });
  await ready(); await prepareFlightUI(page, { controls: false });
  await page.locator('#start').click(); await page.waitForFunction(() => window.flyMessages.filter(message => message.type === 'state').at(-1)?.step > 30);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const stats = async () => {
    const before = await page.evaluate(() => window.flyMessages.length);
    await page.evaluate(() => window.flyWorkers.at(-1).postMessage({ type: 'stats' }));
    await page.waitForFunction(before => window.flyMessages.slice(before).some(message => message.type === 'stats'), before);
    return page.evaluate(() => window.flyMessages.filter(message => message.type === 'stats').at(-1));
  };
  const frozen = async before => { const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  const current = () => page.evaluate(() => window.flyMessages.filter(message => message.type === 'state').at(-1));
  const baseline = await stats(), initialWorkers = await page.evaluate(() => window.flyWorkers.length);
  const editor = page.locator('#toggle-flight-plan');
  assert(await editor.evaluate(element => !element.closest('details')), 'current editor has a direct top-menu control');
  await editor.click(); await page.locator('#flight-plan-overlay').waitFor({ state: 'visible' });
  await page.locator('#flight-plan-overlay button[aria-label="Close flight plan"]').click();
  await frozen(baseline); assert.equal(await page.evaluate(() => window.flyWorkers.length), initialWorkers);
  checks.push('direct top-menu control opens the existing current plan editor without creating another plan or changing native flight');

  await page.locator('#scene').focus(); await page.keyboard.press('m');
  const panel = page.locator('#practice-map-panel'), canvas = panel.locator('.maplibregl-canvas');
  await page.waitForFunction(() => window.__flyMap?.loaded() && !document.querySelector('.practice-map-toolbar button').disabled);
  const target = await canvas.evaluate(canvas => {
    const rect = canvas.getBoundingClientRect();
    for (const [x, y] of [[.7, .6], [.8, .7], [.5, .7]]) {
      const pixel = { x: rect.width * x, y: rect.height * y };
      if (document.elementFromPoint(rect.left + pixel.x, rect.top + pixel.y) === canvas) {
        const point = window.__flyMap.unproject([pixel.x, pixel.y]); return { lon_deg: point.lng, lat_deg: point.lat };
      }
    }
    throw Error('No reachable map coordinate');
  });
  async function openLocation() {
    const pixel = await canvas.evaluate((canvas, position) => { const rect = canvas.getBoundingClientRect(), pixel = window.__flyMap.project([position.lon_deg, position.lat_deg]); return { x: rect.left + pixel.x, y: rect.top + pixel.y }; }, target);
    await page.mouse.click(pixel.x, pixel.y, { button: 'right' });
    const popup = panel.getByRole('region', { name: 'Map location', exact: true }); await popup.waitFor({ state: 'visible' }); return popup;
  }
  observations.airborne = [];
  for (const height_ft of [1000, 5000, 10000]) {
    let popup = await openLocation();
    if (height_ft === 1000) {
      await popup.getByRole('button', { name: 'Fly from here', exact: true }).evaluate(button => { window.staleLocationFly = button; });
      popup = await openLocation(); const before = await stats();
      await page.evaluate(() => window.staleLocationFly.click()); await frozen(before);
      assert.equal(await page.evaluate(() => window.flyWorkers.length), initialWorkers);
    }
    const before = await stats(), workerCount = await page.evaluate(() => window.flyWorkers.length);
    assert.equal(await popup.getByLabel('Launch height above ground').inputValue(), '0');
    await popup.getByLabel('Launch height above ground').selectOption(String(height_ft));
    await frozen(before); assert.equal(await page.evaluate(() => window.flyWorkers.length), workerCount, 'height selection alone never launches');
    await popup.getByRole('button', { name: 'Fly from here', exact: true }).click();
    await page.waitForFunction(count => window.flyWorkers.length === count + 1, workerCount); await ready();
    const state = await current(), init = await page.evaluate(() => window.flyInits.at(-1));
    assert.equal(await page.locator('#status').textContent(), 'Paused'); assert.equal(state.step, 0); assert.equal(state.t_s, 0);
    assert.equal(init.height_agl_ft, height_ft); assert.equal(init.terrain, true); assert.equal(init.streaming_terrain, true);
    assert(Math.abs(state.lat_rad - target.lat_deg * Math.PI / 180) < 1e-8 && Math.abs(state.lon_rad - target.lon_deg * Math.PI / 180) < 1e-8);
    assert(Math.abs(state.alt_msl_m - state.terrain_height_msl_m - height_ft * .3048) < .25, 'native height uses the loaded terrain plus selected AGL');
    assert(Math.abs(state.tas_mps - 90 * 1852 / 3600) < .01, 'airborne launch explicitly uses90ktTAS');
    assert.equal(state.collision_mask, 0); observations.airborne.push({ height_ft, state, init });
  }
  const afterAirborne = await stats(), workersAfterAirborne = await page.evaluate(() => window.flyWorkers.length);
  await page.evaluate(() => window.staleLocationFly.click()); await frozen(afterAirborne);
  assert.equal(await page.evaluate(() => window.flyWorkers.length), workersAfterAirborne, 'removed coordinate popup actions cannot launch again');
  checks.push('coordinate selection and height choice leave native state frozen; explicit1000/5000/10000ftAGL launches create paused native90ktTAS flights above actual loaded terrain; stale coordinate actions stay inert');

  await canvas.focus(); await page.keyboard.press(',');
  await panel.getByLabel('Search map points').fill('EDFE'); await panel.locator('.map-point-search-row').filter({ hasText: 'EDFE' }).first().click();
  let selected = panel.getByRole('region', { name: 'Selected map point', exact: true }); await selected.waitFor({ state: 'visible' });
  await selected.getByRole('button', { name: 'Fly from here', exact: true }).evaluate(button => { window.stalePointFly = button; });
  await panel.locator('.maplibregl-popup-close-button').click(); await page.evaluate(() => window.stalePointFly.click());
  await frozen(afterAirborne); assert.equal(await page.evaluate(() => window.flyWorkers.length), workersAfterAirborne);
  await panel.locator('.map-point-search-row').filter({ hasText: 'EDFE' }).first().click();
  selected = panel.getByRole('region', { name: 'Selected map point', exact: true });
  await selected.getByLabel('Launch height above ground').selectOption('5000'); await selected.getByLabel('Launch height above ground').selectOption('0');
  await frozen(afterAirborne); assert.equal(await page.evaluate(() => window.flyWorkers.length), workersAfterAirborne);
  await selected.getByRole('button', { name: 'Fly from here', exact: true }).click();
  await page.waitForFunction(count => window.flyWorkers.length === count + 1, workersAfterAirborne); await ready();
  observations.ground = await current();
  assert.equal(await page.locator('#status').textContent(), 'Paused'); assert.equal(observations.ground.step, 0);
  assert.equal(await page.locator('#parking-brake').getAttribute('aria-pressed'), 'true');
  assert.equal(observations.ground.brake_left_norm, 1); assert.equal(observations.ground.brake_right_norm, 1);
  assert.equal(observations.ground.throttle_norm, 0);
  for (const key of ['gear_nose_wow', 'gear_left_wow', 'gear_right_wow']) assert.equal(observations.ground[key], 1);
  assert(Math.hypot(observations.ground.ground_forward_mps, observations.ground.ground_side_mps) < .05);
  checks.push('selected-airport popup Ground action starts a new paused native flight settled at rest with idle throttle, wheel contact and parking brake; closed point-popup actions stay inert');

  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => window.flyMessages.filter(message => message.type === 'state').at(-1)?.step > 60);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const parked = await stats(), reviewWorkers = await page.evaluate(() => window.flyWorkers.length);
  await page.locator('#scene').focus(); await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  let popup = await openLocation(); assert(await popup.getByRole('button', { name: 'Fly from here', exact: true }).isDisabled());
  assert(await popup.getByLabel('Launch height above ground').isDisabled());
  await popup.getByRole('button', { name: 'Cancel', exact: true }).click();
  await panel.locator('.map-point-search-row').filter({ hasText: 'EDFE' }).first().click();
  selected = panel.getByRole('region', { name: 'Selected map point', exact: true });
  assert(await selected.getByRole('button', { name: 'Fly from here', exact: true }).isDisabled());
  await page.evaluate(() => { window.staleLocationFly.click(); window.stalePointFly.click(); });
  await frozen(parked); assert.equal(await page.evaluate(() => window.flyWorkers.length), reviewWorkers);
  await page.locator('#review-exit').click(); await frozen(parked);
  checks.push('Review disables coordinate and selected-point launch controls and rejects stale launch actions without worker reset or changing the current native flight');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${output}/map-fly-from-task137.png` });
  await writeFile(`${output}/map-fly-from-task137-browser.json`, JSON.stringify({ result: 'pass', browser: browser.version(), checks, target, observations }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} catch (error) {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/map-fly-from-task137-browser.json`, JSON.stringify({ result: 'fail', checks, observations, error: String(error), errors,
    debug: await page?.evaluate(() => ({ status: document.querySelector('#status')?.textContent, notice: document.querySelector('#notice')?.textContent,
      state: window.flyMessages?.filter(message => message.type === 'state').at(-1), popup: document.querySelector('.map-point-popup')?.textContent })).catch(() => null) }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill(); }
