import { startOrResume } from './flight-actions.mjs';
// Actual Chrome/JSBSim regression for classic instruments and scene gestures.
// This checks the product behavior, not aircraft handling or training fidelity.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const port = 5177;
const origin = `http://127.0.0.1:${port}`;
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))
  .catch(() => { throw new Error('Build the local research engine first: just build-flight-engine'); });
await mkdir(output, { recursive: true });
const server = spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: app, stdio: 'pipe' });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
let browser;
const checks = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Classic test server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Classic test server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname);
  });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__classicStates = []; window.__classicStats = []; window.__classicWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__classicWorker = this;
        const id = ++window.__classicWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') {
            window.__classicStates.push({ ...event.data, __worker_id: id });
            if (window.__classicStates.length > 1000) window.__classicStates.shift();
          }
          if (event.data?.type === 'stats') window.__classicStats.push(event.data);
        });
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled
    && window.__classicStates.at(-1)?.cas_mps > 0);
  const state = () => page.evaluate(() => window.__classicStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.__classicStats.length);
    await page.evaluate(() => window.__classicWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__classicStats.length > count, count);
    return page.evaluate(() => window.__classicStats.at(-1));
  };
  const mode = expected => page.waitForFunction(expected => document.querySelector('#scene').dataset.pointerMode === expected, expected);
  const centered = async () => {
    assert(Math.abs(Number(await page.locator('#roll-control').textContent()) + 0.109375) < .01,
      'only the separate study roll offset remains');
    assert.equal(Number(await page.locator('#pitch-control').textContent()), 0);
  };

  const instruments = await page.locator('#six-pack [data-instrument]').evaluateAll(elements => elements.map(element => element.dataset.instrument));
  assert.deepEqual(instruments, ['airspeed', 'attitude', 'altimeter', 'turn', 'heading', 'vertical-speed']);
  assert.equal(await page.locator('#six-pack canvas').count(), 6);
  await page.waitForFunction(() => document.querySelector('#airspeed-kind').textContent.includes('CAS'));
  assert.match(await page.locator('[data-instrument="heading"]').textContent(), /HEADING.*TRUE/);
  assert(Number.isFinite((await state()).turn_rate_radps));
  assert(Number.isFinite((await state()).slip_ball_rad));
  checks.push('six-pack order and engine instrument labels');

  await startOrResume(page);
  await page.waitForFunction(() => window.__classicStates.at(-1).step > 5);
  // This point lies in the unobstructed scene, away from the header, control pad and panel.
  await page.mouse.click(900, 150); await mode('yoke');
  await page.mouse.move(975, 112);
  assert(Math.abs(Number(await page.locator('#roll-control').textContent()) - (.25 - .109375)) < .02);
  assert(Number(await page.locator('#pitch-control').textContent()) > .09);
  await page.mouse.click(975, 112); await mode('off'); await centered();
  checks.push('scene short-click yoke and neutral release');

  await page.mouse.click(900, 150); await mode('yoke');
  await page.mouse.down(); await page.waitForTimeout(300); await mode('look');
  await page.mouse.move(990, 190, { steps: 4 }); await centered();
  await page.mouse.up(); await mode('yoke'); await centered();
  await page.mouse.move(1035, 160);
  assert(Number(await page.locator('#roll-control').textContent()) > 0);
  await page.keyboard.press('Escape'); await mode('off'); await centered();
  await page.mouse.click(900, 150); await mode('yoke');
  await page.mouse.move(900, 35); await mode('yoke'); await centered();
  await page.mouse.move(940, 170); await mode('yoke');
  assert(Number(await page.locator('#roll-control').textContent()) > 0, 'returning pointer resumes the original yoke anchor without another click');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await mode('off'); await centered();
  const blurred = await stats(); await page.waitForTimeout(200);
  assert.equal((await stats()).step, blurred.step, 'blur pauses the actual worker');
  await startOrResume(page);
  await page.waitForFunction(step => window.__classicStates.at(-1).step > step, blurred.step);
  checks.push('temporary look, restored yoke and cancellation paths');

  await page.keyboard.press(']');
  await page.waitForFunction(() => document.querySelector('#flap-control').value === '10');
  await page.waitForFunction(() => window.__classicStates.at(-1).flap_rad * 180 / Math.PI > 9.9, null, { timeout: 6000 });
  await page.keyboard.press('[');
  await page.waitForFunction(() => window.__classicStates.at(-1).flap_rad < .001, null, { timeout: 6000 });
  await page.locator('#flap-control').focus(); await page.keyboard.press('End'); await page.locator('#scene').focus();
  await page.waitForFunction(() => window.__classicStates.at(-1).flap_rad * 180 / Math.PI > 29.9, null, { timeout: 7000 });
  assert.match(await page.locator('#flaps-actual').textContent(), /30°.*actual/);
  checks.push('flap keyboard detents and actual timed actuation');

  await page.keyboard.down('b');
  await page.waitForFunction(() => { const s = window.__classicStates.at(-1); return s.brake_left_norm === .25 && s.brake_right_norm === .25; });
  await page.keyboard.up('b');
  await page.waitForFunction(() => { const s = window.__classicStates.at(-1); return s.brake_left_norm === 0 && s.brake_right_norm === 0; });
  const brake = await page.locator('#wheel-brakes').boundingBox();
  await page.mouse.move(brake.x + brake.width / 2, brake.y + brake.height / 2); await page.mouse.down();
  await page.waitForFunction(() => window.__classicStates.at(-1).brake_left_norm === .25);
  await page.mouse.move(1100, 200); await page.mouse.up();
  await page.waitForFunction(() => { const s = window.__classicStates.at(-1); return s.brake_left_norm === 0 && s.brake_right_norm === 0; });
  assert.match(await page.locator('#brake-state').textContent(), /Airborne.*ground braking only/);
  checks.push('actual wheel brake keyboard and outside-pointer release');

  await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const reviewPaused = await stats();
  assert.equal(await page.locator('#wheel-brakes').isDisabled(), true);
  for (const id of ['flap-control', 'flaps-retract', 'flaps-extend']) assert.equal(await page.locator(`#${id}`).isDisabled(), true);
  await page.locator('#review-time').focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('#flaps-actual').textContent.includes('0° · recorded'));
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('#flaps-actual').textContent.includes('30° · recorded'));
  await page.waitForTimeout(150);
  assert.equal((await stats()).step, reviewPaused.step, 'seeking configuration history keeps live physics frozen');
  checks.push('recorded configuration and disabled review controls');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const compact = await page.evaluate(() => {
    const selectors = ['#six-pack', '.engine-controls', '#wheel-brakes', '#flap-control', '#flight-menu'];
    return { width: document.documentElement.scrollWidth, viewport: innerWidth, height: innerHeight,
      boxes: selectors.map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { selector, left:r.left, right:r.right, top:r.top, bottom:r.bottom }; }) };
  });
  assert.equal(compact.width, compact.viewport, 'compact interface has no horizontal overflow');
  for (const box of compact.boxes) {
    assert(box.left >= -1 && box.right <= compact.viewport + 1, `${box.selector} fits compact width`);
    assert(box.top >= 0 && box.bottom <= compact.height + 1, `${box.selector} stays in the supported compact viewport`);
  }
  await page.screenshot({ path: `${output}/classic-mobile.png` });
  checks.push('compact six-pack and aircraft controls');

  await page.locator('#review-exit').click();
  const previousWorker = await page.evaluate(() => window.__classicWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  await page.waitForFunction(previous => { const s = window.__classicStates.at(-1); return s.__worker_id > previous && s.flap_rad === 0 && s.brake_left_norm === 0 && s.brake_right_norm === 0; }, previousWorker);
  assert.equal(await page.locator('#review-flight').isDisabled(), true);
  checks.push('reset clears configuration and recording');
  assert.deepEqual(errors, []);
  assert.deepEqual([...hosts], ['127.0.0.1']);
  console.log(JSON.stringify({ result:'pass', browser:browser.version(), checks, compact, screenshots:'output/flight/classic-mobile.png' },null,2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
