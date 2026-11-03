// Real worker/native controls; only scenery pixels are deterministic fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5236';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5236,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
const checks = [];
try {
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.groundStates = []; window.groundInputs = []; window.groundStats = []; window.groundWorkerId = 0;
    window.Worker = class extends Original {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.groundWorker = this; const id = ++window.groundWorkerId;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.groundStates.push({ ...data, worker_id: id });
          if (data.type === 'stats') window.groundStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.groundWorker && message?.type === 'input') window.groundInputs.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.groundStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const scene = page.locator('#scene'), parking = page.locator('#parking-brake');
  const stats = async () => {
    const count = await page.evaluate(() => window.groundStats.length);
    await page.evaluate(() => window.groundWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.groundStats.length > count, count);
    return page.evaluate(() => window.groundStats.at(-1));
  };
  const frozen = async before => {
    const after = await stats();
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  };
  const parked = async value => assert.equal(await parking.getAttribute('aria-pressed'), String(value));
  const initial = await stats();
  await parked(false);
  const positions = await page.locator('.brake-controls').evaluate(element => {
    const wheel = element.querySelector('#wheel-brakes').getBoundingClientRect(), park = element.querySelector('#parking-brake').getBoundingClientRect();
    return { wheel: { x:wheel.x,y:wheel.y,right:wheel.right,height:wheel.height }, park: { x:park.x,y:park.y,height:park.height } };
  });
  assert(positions.park.x >= positions.wheel.right - 1 && Math.abs(positions.park.y - positions.wheel.y) < 2, 'parking brake sits beside wheel brakes');
  await scene.focus(); await page.keyboard.down('n'); await parked(true);
  await page.keyboard.down('n'); await parked(true); await page.keyboard.up('n'); await parked(true);
  await page.keyboard.down('b'); await page.keyboard.up('b'); await parked(true);
  await frozen(initial);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await parked(true); await frozen(initial);
  await page.locator('#controls-settings').click();
  const link = page.getByLabel('Link rudder to aileron', { exact: true });
  assert.equal(await link.isChecked(), false);
  await link.focus(); await page.keyboard.press('n'); await parked(true);
  await page.locator('#settings-close').click();
  for (const key of ['Shift+n', 'Control+n', 'Alt+n', 'Meta+n']) { await scene.focus(); await page.keyboard.press(key); await parked(true); }
  await page.locator('#view-menu > summary').click(); await page.keyboard.press('n'); await parked(true);
  await page.locator('#view-menu > summary').click();
  await parking.click(); await parked(false);
  await parking.focus(); await page.keyboard.press('Enter'); await parked(true);
  await frozen(initial);
  checks.push('N and button toggle once, beside wheel brakes; pause, key release, blur and Options preserve the latch; repeat/modifier/menu/editing guards leave paused native state unchanged');

  await startOrResume(page);
  await page.waitForFunction(() => window.groundStates.at(-1)?.brake_left_norm === 1 && window.groundStates.at(-1)?.brake_right_norm === 1);
  await scene.focus(); await page.keyboard.down('b'); await page.keyboard.up('b');
  await page.waitForFunction(() => window.groundInputs.at(-1)?.brake_norm === 1);
  await page.keyboard.press('n'); await parked(false);
  await page.waitForFunction(() => window.groundStates.at(-1)?.brake_left_norm === 0);
  await page.keyboard.down('b');
  await page.waitForFunction(() => window.groundStates.at(-1)?.brake_left_norm === .25 && window.groundInputs.at(-1)?.brake_norm === .25);
  await page.keyboard.up('b'); await page.waitForFunction(() => window.groundStates.at(-1)?.brake_left_norm === 0);
  await page.locator('#pause').click(); await page.waitForTimeout(100);
  checks.push('parking reaches both native brakes at100% independently of the25% wheel command; releasing B preserves parking, and released parking restores ordinary hold/release braking');

  await page.locator('#controls-settings').click(); const beforeOptions = await stats();
  await link.check(); await page.locator('#settings-gentle').click(); assert.equal(await link.isChecked(), true);
  await page.locator('#settings-default').click(); assert.equal(await link.isChecked(), true);
  await frozen(beforeOptions); await page.locator('#settings-close').click();
  await startOrResume(page); await scene.focus(); await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.groundInputs.at(-1)?.rudder === -.45 && window.groundStates.at(-1)?.rudder_cmd_norm === -.45);
  await page.keyboard.down('q');
  await page.waitForFunction(() => window.groundInputs.at(-1)?.rudder === .35 && window.groundStates.at(-1)?.rudder_cmd_norm === .35);
  await page.keyboard.up('q'); await page.waitForFunction(() => window.groundInputs.at(-1)?.rudder === -.45);
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => window.groundInputs.at(-1)?.rudder === 0 && window.groundInputs.at(-1)?.aileron !== 0);
  await page.keyboard.down('ArrowLeft'); await page.waitForFunction(() => window.groundStates.at(-1)?.rudder_cmd_norm === .45);
  await page.keyboard.up('ArrowLeft');
  await page.locator('#controls-settings').click(); await link.uncheck(); await page.locator('#settings-close').click();
  await startOrResume(page); await scene.focus(); await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.groundInputs.at(-1)?.aileron > 0 && window.groundStates.at(-1)?.aileron_cmd_norm > 0 && window.groundStates.at(-1)?.rudder_cmd_norm === 0);
  await page.keyboard.up('ArrowRight'); await page.locator('#pause').click(); await page.waitForTimeout(100);
  checks.push('link defaults off, survives sensitivity presets, sends correctly signed native rudder with deliberate bank, gives explicit Q priority and excludes the centered study offset; switching off restores independent rudder');

  await scene.focus(); await page.keyboard.press('n'); await parked(true);
  await page.keyboard.press('r'); await page.locator('#flight-review').waitFor({ state: 'visible' });
  const review = await stats(), reviewInputs = await page.evaluate(() => window.groundInputs.length);
  assert(await parking.isDisabled()); assert(await page.locator('#controls-settings').isDisabled());
  assert.equal(await parking.getAttribute('aria-pressed'), 'mixed', 'Review does not invent the unrecorded parking latch');
  await scene.focus(); await page.keyboard.press('n');
  assert.equal(await page.evaluate(() => window.groundInputs.length), reviewInputs); await frozen(review);
  await page.keyboard.press('r'); await parked(true);
  const workerId = await page.evaluate(() => window.groundWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  await page.waitForFunction(id => window.groundWorkerId > id && !document.querySelector('#start').disabled, workerId);
  await parked(false);
  checks.push('Review disables parking/options without changing live latch or native state; restart releases parking');

  // Pinned c172x bridge couples steer-cmd-norm=-rudder, with a10° steerable nose
  // bogey and fixed mains. Exercise real ground turns; this is not a taxi-radius
  // or installed C172S steering-calibration acceptance.
  const steering = await page.evaluate(async () => {
    const { default: create } = await import('/studies/e1-browser/sim/dist/jsbsim.mjs');
    const M = await create({ print: () => {}, printErr: () => {} });
    const state = () => Array.from(M.HEAPF64.subarray(M._gf_state() / 8, M._gf_state() / 8 + 14));
    const ground = () => Array.from(M.HEAPF64.subarray(M._gf_ground_state() / 8, M._gf_ground_state() / 8 + 18));
    const rc = value => { if (value !== 0) throw Error(`Native steering failed:${value}`); };
    const results = [];
    for (const rudder of [0, .35, -.35]) {
      rc(M._gf_init_landing(1 / 120, 49.96 * Math.PI / 180, 8.643 * Math.PI / 180, 0, 1));
      rc(M._gf_set_inputs(0, 0, 0, 0)); rc(M._gf_set_secondary_inputs(0, 0));
      for (let i = 0; i < 240; i++) rc(M._gf_step());
      const before = state(); rc(M._gf_set_inputs(0, 0, rudder, 0)); let noseContacts = 0;
      for (let i = 0; i < 240; i++) { rc(M._gf_step()); if (ground()[6]) noseContacts++; }
      const after = state(); results.push({ rudder, noseContacts, yaw_change_rad: Math.atan2(Math.sin(after[6] - before[6]), Math.cos(after[6] - before[6])) });
    }
    return results;
  });
  assert(steering.every(row => row.noseContacts === 240));
  assert(steering[1].yaw_change_rad < steering[0].yaw_change_rad && steering[1].yaw_change_rad < 0, 'Q/positive rudder turns left on ground');
  assert(steering[2].yaw_change_rad > steering[0].yaw_change_rad && steering[2].yaw_change_rad > 0, 'W/negative rudder turns right on ground');
  checks.push('unchanged actual native nosewheel/rudder coupling turns in the correct direction with continuous nosewheel ground contact');
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  const output = new URL('../../output/flight/', import.meta.url); await mkdir(output, { recursive: true });
  await writeFile(new URL('parking-rudder-browser.json', output), JSON.stringify({ result:'pass', checks, steering }, null, 2) + '\n');
  console.log(JSON.stringify({ result:'pass', checks, steering, browser:browser.version() }, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
