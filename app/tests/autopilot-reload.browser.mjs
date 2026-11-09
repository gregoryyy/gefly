// Real UI/JSBSim reloads of acknowledged AP selections; scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
import { captureAutopilotReload } from '../../studies/e1-browser/sim/autopilot-reload.js';
import { KAP_FIELDS } from '../../studies/e1-browser/sim/kap140.js';
import { NAVIGATION_FIELDS } from '../../studies/e1-browser/sim/navigation.js';
const app = fileURLToPath(new URL('..', import.meta.url)), output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5360', key = 'gefly.flight-location.v1';
const restoredFields = KAP_FIELDS.filter(field => !['kap_indicated_altitude_m', 'kap_nav_valid', 'kap_nav_kind', 'kap_gs_valid', 'kap_elevator_norm'].includes(field));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5360,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, page, serverLog = '';
server.stdout.on('data', value => { serverLog += value; }); server.stderr.on('data', value => { serverLog += value; });
const checks = [], observations = {}, errors = [];
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverLog.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(serverLog.includes('Local:'), serverLog);
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  page = await browser.newPage({ viewport: { width: 1680, height: 1050 }, serviceWorkers: 'block' });
  page.on('pageerror', error => errors.push(String(error)));
  await installSceneryFixture(page);
  await page.addInitScript(() => {
    const Native = window.Worker; window.apReloadStates = []; window.apReloadMessages = []; window.apReloadStats = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.apReloadWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.apReloadStates.push(data);
          if (data.type === 'stats') window.apReloadStats.push(data);
        });
      }
      postMessage(message, ...args) { window.apReloadMessages.push(structuredClone(message)); return super.postMessage(message, ...args); }
    };
  });
  const ready = async () => {
    await page.waitForFunction(() => !document.querySelector('#start').disabled && window.apReloadStates.length > 0, null, { timeout: 60000 });
    await prepareFlightUI(page, { controls: false });
  };
  const latest = () => page.evaluate(() => window.apReloadStates.at(-1));
  const fill = async (id, value) => { await page.locator(id).fill(String(value)); await page.locator('#scene').focus(); };
  const stats = async () => {
    const n = await page.evaluate(() => window.apReloadStats.length);
    await page.evaluate(() => window.apReloadWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.apReloadStats.length > n, n);
    return page.evaluate(() => window.apReloadStats.at(-1));
  };
  const reload = async (before, label, moving = false) => {
    const expected = captureAutopilotReload(before); assert(expected);
    await page.reload(); await ready();
    const init = await page.evaluate(() => window.apReloadMessages.find(message => message.type === 'init'));
    if (moving) {
      // The worker may acknowledge more fixed steps before pagehide. Compare
      // stable selections, rather than racing its moving pose/sensor snapshots.
      for (const field of restoredFields) assert.equal(init.autopilot_reload.kap[field], expected.kap[field], `${label}: selected ${field} retained while moving`);
      for (const field of NAVIGATION_FIELDS) assert.equal(init.autopilot_reload.navigation[field], expected.navigation[field]);
    } else {
      assert.deepEqual(init.autopilot_reload, expected, `${label}: pagehide flush sends latest acknowledged AP with pose`);
      for (const field of ['lat_rad', 'lon_rad', 'alt_msl_m', 'heading_rad']) assert(Math.abs(init.ic[field] - before[field]) < 1e-10, `${label}: same acknowledged pose ${field}`);
    }
    const first = await page.evaluate(() => window.apReloadStates[0]);
    await page.waitForTimeout(400); const settled = await latest();
    for (const state of [first, settled]) {
      for (const field of restoredFields) assert.equal(state[field], expected.kap[field], `${label}: ${field} restored before first native state and retained`);
      for (const field of NAVIGATION_FIELDS) assert.equal(state[field], expected.navigation[field], `${label}: ${field}`);
      assert.equal(state.step, 0); assert.equal(state.t_s, 0);
    }
    assert.equal(await page.locator('#status').textContent(), 'Paused');
    assert.equal(await page.evaluate(() => window.apReloadMessages.some(message => message.type === 'run')), false);
    assert.equal(await page.locator('#ap-engaged-label').textContent(), expected.kap.kap_engaged ? 'AP' : 'OFF');
    assert.equal(Number(await page.locator('#ap-heading-target').inputValue()), Math.round(expected.kap.kap_heading_bug_rad * 180 / Math.PI * 10) / 10);
    assert.equal(Number(await page.locator('#nav1-active').textContent()) * 1000, expected.navigation.radio_nav_active_khz);
    assert.equal(Number(await page.locator('#nav2-active').textContent()) * 1000, expected.navigation.radio_nav2_active_khz);
    const native = await stats(); assert.equal(native.step, 0);
    observations[label] = { expected, before, moving, init, first, settled, native };
  };
  await page.goto(origin); await ready();
  const initial = await latest();
  await fill('#ap-selector-value', 10000);
  await page.locator('#ap-engage').click(); await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_engaged === 1);
  await page.locator('#ap-heading').click(); await fill('#ap-heading-target', 137);
  await page.locator('#ap-alt').click(); await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_vertical === 1 && window.apReloadStates.at(-1)?.kap_lateral === 1);
  const alt = await latest(); assert.equal(alt.step, initial.step); assert.equal(alt.kap_selected_altitude_m, 10000 * .3048);
  assert(Math.abs(alt.kap_heading_bug_rad - 137 * Math.PI / 180) < 1e-12); assert.notEqual(alt.kap_hold_pressure_altitude_m, alt.kap_selected_altitude_m);
  await reload(alt, 'hdgAlt');
  checks.push('paused HDG/ALT, distinct captured versus selected altitude and external heading bug restore before first native state without recapture or run');

  await startOrResume(page);
  await page.waitForFunction(() => window.apReloadStates.at(-1)?.step > 30 && window.apReloadStates.at(-1)?.kap_engaged === 1);
  assert.equal(await page.locator('#status').textContent(), 'Flying');
  const flying = await latest(); assert.equal(flying.kap_lateral, 1); assert.equal(flying.kap_vertical, 1);
  assert(flying.step > 30 && flying.t_s > 0, 'actual native fixed steps advanced under HDG/ALT before reload');
  await reload(flying, 'flyingHdgAlt', true);
  checks.push('reload directly while Flying under engaged HDG/ALT returns Paused at first native step zero with modes, bug and distinct selected/held targets retained without recapture');

  await page.locator('#ap-alt').click(); await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_vertical === 0);
  const vsStart = (await latest()).kap_vs_target_mps;
  for (let i = 0; i < 3; i++) await page.locator('#ap-up').click();
  const selectedBefore = (await latest()).kap_selected_altitude_m;
  for (let i = 0; i < 5; i++) await page.locator('#ap-selector-increase').click();
  await page.waitForFunction(({ rate, selected }) => { const state = window.apReloadStates.at(-1); return Math.abs(state?.kap_vs_target_mps - rate) < 1e-10
    && state.kap_alt_arm === 1 && Math.abs(state.kap_selected_altitude_m - selected) < 1e-8; }, { rate: vsStart + 300 * .3048 / 60, selected: selectedBefore + 500 * .3048 });
  const climb = await latest(); assert.equal(climb.step, 0); assert.equal(climb.kap_vertical, 0); assert.equal(climb.kap_engaged, 1);
  await reload(climb, 'vsArm');
  checks.push('same-step paused VS target and automatic ALT ARM changes survive real reload with HDG engagement intact');

  await page.locator('#ap-engage').click(); await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_engaged === 0);
  await fill('#ap-heading-target', 205);
  await page.locator('#ap-baro').click(); await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_display_page === 2);
  await page.waitForFunction(() => document.querySelector('#ap-selector-unit').textContent === 'HPA');
  await fill('#ap-selector-value', 1002);
  await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_baro_setting_pa === 100200);
  const baro = await page.locator('#ap-baro').boundingBox();
  await page.mouse.move(baro.x + baro.width / 2, baro.y + baro.height / 2); await page.mouse.down(); await page.waitForTimeout(2150); await page.mouse.up();
  await page.waitForFunction(() => window.apReloadStates.at(-1)?.kap_baro_units === 1);
  for (const [receiver, frequency, obs] of [[1, '114.20', 123], [2, '115.60', 231]]) {
    await fill(`#nav${receiver}-standby`, frequency); await page.locator(`#nav${receiver}-swap`).click();
    await fill(receiver === 1 ? '#nav-obs' : '#nav2-obs', obs);
  }
  await page.waitForFunction(() => { const s = window.apReloadStates.at(-1); return s.radio_nav_active_khz === 114200 && s.radio_obs_deg === 123 && s.radio_nav2_active_khz === 115600 && s.radio_obs2_deg === 231; });
  const off = await latest(); assert.equal(off.kap_engaged, 0); assert.equal(off.kap_baro_setting_pa, 100200); assert.equal(off.kap_baro_units, 1); assert.equal(off.radio_demo_enabled, 0);
  await reload(off, 'offBaroNavigation');
  checks.push('AP OFF preserves targets, manual BARO units/setting and both active NAV frequencies/OBS; local storage restores no flight controls or native checkpoint');

  await startOrResume(page); await page.waitForFunction(() => window.apReloadStates.at(-1)?.step > 120);
  await page.locator('#scene').focus(); await page.keyboard.press('Space'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await fill('#ap-heading-target', 250); await page.waitForFunction(() => Math.abs(window.apReloadStates.at(-1)?.kap_heading_bug_rad - 250 * Math.PI / 180) < 1e-10);
  const live = await latest();
  await page.locator('#scene').focus(); await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.locator('#review-time').focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => Math.abs(Number(document.querySelector('#ap-heading-target').value) - 205) < .1);
  await reload(live, 'reviewExcluded');
  checks.push('selected earlier recorded AP target in Review cannot overwrite the last acknowledged live AP selections or pose');

  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click(); await ready();
  const resetInit = await page.evaluate(() => window.apReloadMessages.filter(message => message.type === 'init').at(-1));
  assert.equal(resetInit.autopilot_reload, undefined); assert.equal((await latest()).kap_engaged, 0);
  observations.resetInit = resetInit;
  checks.push('explicit Restart removes old saved AP envelope together with the previous launch selection');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${output}/autopilot-reload-task143.png` });
  await writeFile(`${output}/autopilot-reload-task143-browser.json`, JSON.stringify({ result: 'pass', browser: browser.version(), checks, observations, errors,
    scope: 'Actual trusted UI changes, localStorage pagehide flush and real native worker initialization; scenery transport pixels are fixtures. No dynamics/control-response/state injection; AP source timers and servos are reconstructed, not a native checkpoint.' }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} catch (error) {
  await writeFile(`${output}/autopilot-reload-task143-browser.json`, JSON.stringify({ result: 'fail', checks, observations, errors, error: String(error),
    debug: await page?.evaluate(() => ({ status: document.querySelector('#status')?.textContent, notice: document.querySelector('#notice')?.textContent,
      state: window.apReloadStates?.at(-1), first: window.apReloadStates?.[0], saved: localStorage.getItem('gefly.flight-location.v1'), messages: window.apReloadMessages?.slice(-8) })).catch(() => null) }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill(); }
