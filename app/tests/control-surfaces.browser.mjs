import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5236';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5236', '--strictPort'], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', c => { log += c; }); server.stderr.on('data', c => { log += c; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try { if (log.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/src/scene.ts', async route => {
    const response = await route.fetch(); let source = await response.text();
    assert(source.includes('aircraft = scene.primitives.add(model);'));
    source = source.replace('aircraft = scene.primitives.add(model);', 'aircraft = scene.primitives.add(model); window.__surfaceModel = model; window.__surfaceGlobe = scene.globe;');
    source = source.replace(/function update\(state, view, look\) \{/, '$&\nstate = { ...state, ...window.__surfaceOverride }; window.__surfaceSelected = state;');
    assert(source.includes('window.__surfaceSelected = state'));
    await route.fulfill({ response, body: source });
  });
  await page.addInitScript(() => {
    const Native = Worker; window.surfaceStates = []; window.surfaceStats = [];
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
      window.surfaceWorker = this; this.addEventListener('message', ({ data }) => {
        if (data.type === 'state') window.surfaceStates.push(data);
        if (data.type === 'stats') window.surfaceStats.push(data);
      });
    } };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page, { controls: false });
  await page.locator('#view-menu > summary').click(); await page.locator('#chase').click();
  await page.waitForFunction(() => document.querySelector('#scene').dataset.aircraftVisual === 'ready');
  const stats = async () => {
    const count = await page.evaluate(() => window.surfaceStats.length);
    await page.evaluate(() => window.surfaceWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.surfaceStats.length > n, count);
    return page.evaluate(() => window.surfaceStats.at(-1));
  };
  await startOrResume(page);
  await page.waitForFunction(() => window.surfaceStates.at(-1)?.step > 10);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused' && document.querySelector('#flight-gate').hidden);
  const frozen = await stats();
  const verifyPose = async () => page.evaluate(async () => {
    const { AIRCRAFT_CONTROL_SURFACES } = await import('/src/aircraft-control-surfaces.ts');
    return AIRCRAFT_CONTROL_SURFACES.map(s => {
      const m = window.__surfaceModel.getNode(s.name).matrix;
      const angle = s.name === 'rudder'
        ? Math.atan2(m[8] / (s.axis[1] / Math.hypot(...s.axis)), (m[0] + m[5] + m[10] - 1) / 2)
        : Math.atan2(m[1], m[0]);
      const value = window.__surfaceSelected[s.field];
      return { name: s.name, actual: angle, expected: Number.isFinite(value) ? s.sign * value : 0,
        hinge: [m[12], m[13], m[14]], expectedHinge: [...s.hinge] };
    });
  });
  const assertPose = async () => {
    for (const pose of await verifyPose()) {
      assert(Math.abs(pose.actual - pose.expected) < 1e-8, `${pose.name}: actual native/selected angle drives its hinge`);
      assert.deepEqual(pose.hinge, pose.expectedHinge, `${pose.name}: hinge remains fixed`);
    }
  };
  await page.waitForFunction(() => window.__surfaceGlobe.tilesLoaded);
  await page.waitForTimeout(600); await assertPose();
  const neutral = { aileron_rad: 0, right_aileron_rad: 0, rudder_rad: 0, elevator_rad: 0, flap_rad: 0 };
  const pose = async patch => { await page.evaluate(p => { window.__surfaceOverride = p; }, patch); await page.waitForTimeout(100); await assertPose(); };
  await pose(neutral);
  const canvas = page.locator('#scene canvas').first();
  const baseline = await canvas.screenshot({ path: `${output}/control-surfaces-neutral.png` });
  for (const field of Object.keys(neutral)) {
    await pose({ ...neutral, [field]: .4 });
    assert(!baseline.equals(await canvas.screenshot()), `${field}: deflection changes visible aircraft pixels`);
    await pose(neutral);
    assert(baseline.equals(await canvas.screenshot()), `${field}: neutral restores identical pixels at frozen aircraft/world state`);
  }
  await pose({ aileron_rad: .26, right_aileron_rad: -.35, rudder_rad: .28, elevator_rad: -.34, flap_rad: Math.PI / 6 });
  await canvas.screenshot({ path: `${output}/control-surfaces-deflected.png` });
  await pose({});
  const afterFixtures = await stats();
  assert.equal(afterFixtures.step, frozen.step); assert.equal(afterFixtures.digest, frozen.digest);
  assert.deepEqual(afterFixtures.final_state, frozen.final_state, 'presentation cannot change native physics');

  await startOrResume(page);
  await page.locator('#ap-engage').click();
  await page.waitForFunction(() => window.surfaceStates.at(-1)?.kap_engaged === 1);
  await page.locator('#ap-engage').click();
  await page.waitForFunction(() => window.surfaceStates.at(-1)?.kap_engaged === 0);
  await page.locator('#scene').focus();
  for (const key of ['ArrowRight', 'ArrowDown', 'q']) await page.keyboard.down(key);
  await page.locator('#flap-control').evaluate(input => { input.value = '30'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => { const s = window.surfaceStates.at(-1); return s.flap_rad > .03 && Math.abs(s.aileron_rad) > .02 && Math.abs(s.elevator_rad) > .02 && Math.abs(s.rudder_rad) > .02; });
  for (const key of ['ArrowRight', 'ArrowDown', 'q']) await page.keyboard.up(key);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await assertPose(); const paused = await stats();
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.locator('#review-time').evaluate(input => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(100); await assertPose();
  await page.locator('#review-time').evaluate(input => { input.value = input.max; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(100); await assertPose();
  const reviewed = await stats(); assert.equal(reviewed.step, paused.step); assert.equal(reviewed.digest, paused.digest);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'pass', checks: ['all seven hinged surfaces render visible deflections',
    'actual native actuator angles and selected replay state drive the visual without changing physics',
    'ordinary panel AP clicks engage and disconnect the live worker'], browser: browser.version() }, null, 2));
} finally { await browser?.close(); server.kill(); }
