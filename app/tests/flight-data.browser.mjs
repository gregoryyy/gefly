// Actual Chrome/JSBSim flight-data display; no injected flight state or physics fallback.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5196';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url));
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['--input-type=module', '-e', `import { createServer } from 'vite';
  const server = await createServer({ server: { host: '127.0.0.1', port: 5196,
    strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
  await server.listen(); server.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Flight-data server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Flight-data server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__dataStates = []; window.__dataStats = []; window.__dataWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__dataWorker = this; const id = ++window.__dataWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') { window.__dataStates.push({ ...event.data, __worker_id: id }); if (window.__dataStates.length > 2000) window.__dataStates.shift(); }
          if (event.data?.type === 'stats') window.__dataStats.push(event.data);
        });
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  const waitReady = () => page.waitForFunction(() => !document.querySelector('#start').disabled && Number.isFinite(window.__dataStates.at(-1)?.ground_forward_mps));
  await waitReady();
  await prepareFlightUI(page);
  const state = () => page.evaluate(() => window.__dataStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.__dataStats.length);
    await page.evaluate(() => window.__dataWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__dataStats.length > count, count);
    return page.evaluate(() => window.__dataStats.at(-1));
  };
  const frozen = (before, after) => { assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  const open = async () => {
    if (await page.locator('#flight-data-panel').isVisible()) return;
    await page.locator('#view-menu > summary').click(); await page.locator('#toggle-flight-data').click();
    await page.locator('#flight-data-panel').waitFor({ state: 'visible' });
    await page.locator('#flight-data-title').click();
  };
  const matches = async actual => {
    await page.waitForFunction(step => Number(document.querySelector('#flight-data-panel').dataset.step) === step, actual.step);
    const value = async id => Number(await page.locator(`#${id}`).getAttribute('data-value'));
    const canonical = number => number === 0 ? 0 : number;
    const horizontal = Math.hypot(actual.ground_forward_mps, actual.ground_side_mps);
    assert.equal(await value('flight-path-groundspeed'), horizontal);
    assert.equal(await value('flight-path-verticalspeed'), actual.ground_down_mps === 0 ? 0 : -actual.ground_down_mps);
    assert.equal(await page.locator('#flight-path-groundspeed').textContent(), (horizontal * 3600 / 1852).toFixed(1));
    assert.equal(await page.locator('#flight-path-verticalspeed').textContent(), (-actual.ground_down_mps * 60 / .3048).toFixed(0));
    if (horizontal >= 1) {
      const expected = (-actual.ground_down_mps / horizontal) * 100;
      assert(Math.abs(await value('flight-path-percent') - expected) < 1e-9);
    } else {
      assert.equal(await page.locator('#flight-data-panel').getAttribute('data-gradient-status'), 'low-groundspeed');
      assert.equal(await page.locator('#flight-path-percent').textContent(), '—');
    }
    for (const wheel of ['nose', 'left', 'right']) {
      assert.equal(await page.locator(`#flight-data-${wheel}-contact`).getAttribute('data-contact'), String(actual[`gear_${wheel}_wow`]));
      assert.equal(await value(`flight-data-${wheel}-load`), canonical(actual[`gear_${wheel}_load_n`]));
      assert.equal(await value(`flight-data-${wheel}-compression`), canonical(actual[`gear_${wheel}_compression_m`]));
      assert.equal(await value(`flight-data-${wheel}-slip`), canonical(actual[`gear_${wheel}_slip_rad`]));
      assert.equal(await page.locator(`#flight-data-${wheel}-load`).textContent(), (actual[`gear_${wheel}_load_n`] / 1000).toFixed(2));
      assert.equal(await page.locator(`#flight-data-${wheel}-compression`).textContent(), (actual[`gear_${wheel}_compression_m`] * 1000).toFixed(1));
      assert.equal(await page.locator(`#flight-data-${wheel}-slip`).textContent(), (actual[`gear_${wheel}_slip_rad`] * 180 / Math.PI).toFixed(1));
    }
    const mask = actual.structure_contact_mask;
    const expectedContacts = [mask & 1 ? 'TAIL' : '', mask & 2 ? 'LEFT WINGTIP' : '', mask & 4 ? 'RIGHT WINGTIP' : ''].filter(Boolean).join(' · ') || 'NONE';
    assert.equal(await page.locator('#flight-data-structure').textContent(), expectedContacts);
  };
  const initial = await state(), paused = await stats();
  const deckBefore = await page.locator('.flight-deck').boundingBox();
  await open(); await matches(initial);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'flight-data-close');
  assert.equal(await page.locator('#flight-data-panel').getAttribute('data-recorded'), 'false');
  const deckAfter = await page.locator('.flight-deck').boundingBox(); assert.deepEqual(deckAfter, deckBefore, 'overlay does not consume cockpit space');
  frozen(paused, await stats());
  checks.push('View opens a read-only flight-data overlay with actual paused velocity/contact values and unchanged cockpit geometry');

  await startOrResume(page); await page.waitForFunction(() => window.__dataStates.at(-1).step > 10);
  const beforeKeys = await state();
  await page.locator('#flight-data-close').focus();
  for (const key of ['Digit0', 'KeyR', 'KeyQ', 'Quote', 'BracketRight']) await page.keyboard.press(key);
  await page.waitForFunction(step => window.__dataStates.at(-1).step > step + 8, beforeKeys.step);
  assert.equal(await page.locator('#status').textContent(), 'Flying');
  assert.equal((await state()).throttle_norm, beforeKeys.throttle_norm);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#flight-data-panel').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'scene');
  checks.push('modeless panel keeps live flight running, contains flight shortcuts and closes with Escape/focus restore');

  const previousWorker = await page.evaluate(() => window.__dataWorkerId);
  await page.locator('#flight-menu > summary').click();
  if (!await page.locator('#flight-research').evaluate(element => element.open)) await page.locator('#flight-research > summary').click();
  await page.locator('[data-landing="hard"]').click();
  await page.waitForFunction(previous => window.__dataStates.at(-1)?.__worker_id > previous, previousWorker); await waitReady();
  await page.waitForFunction(() => { const s = window.__dataStates.at(-1); return s.gear_nose_wow + s.gear_left_wow + s.gear_right_wow > 0; });
  const contact = await page.evaluate(() => window.__dataStates.findLast(s => s.__worker_id === window.__dataWorkerId && s.gear_nose_wow + s.gear_left_wow + s.gear_right_wow > 0));
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await page.waitForTimeout(80); await open(); await matches(await state());
  assert(contact.gear_nose_load_n + contact.gear_left_load_n + contact.gear_right_load_n > 0, 'real landing fixture produced strut reactions');
  await page.locator('#flight-data-close').click();
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const reviewPaused = await stats();
  await page.locator('#review-time').evaluate((input, time) => { input.value = String(time); input.dispatchEvent(new Event('input', { bubbles: true })); }, contact.t_s);
  await open(); await matches(contact);
  assert.equal(await page.locator('#flight-data-panel').getAttribute('data-recorded'), 'true');
  assert.equal(await page.locator('#flight-data-mode').textContent(), 'RECORDED');
  frozen(reviewPaused, await stats());
  await page.screenshot({ path: `${output}/flight-data-recorded.png` });
  checks.push('actual landing reactions and selected recorded wheel/load/gradient snapshots agree while Review leaves physics frozen');

  await page.locator('#flight-data-close').click(); await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await waitReady(); await prepareFlightUI(page, { controls: false }); await open(); await matches(await state());
  const box = await page.locator('#flight-data-panel').boundingBox();
  assert(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: `${output}/flight-data-mobile.png` });
  await page.locator('#flight-data-close').click();
  assert.equal(await page.locator('#toggle-flight-data').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'scene');
  await page.close(); await browser.close(); browser = undefined;
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  checks.push('fresh compact load fits the scrollable overlay and close action preserves focus/visibility state');
  console.log(JSON.stringify({ result: 'pass', checks, contact_step: contact.step,
    screenshots: 'output/flight/flight-data-{recorded,mobile}.png' }, null, 2));
} catch (error) { console.error(JSON.stringify({ checks }, null, 2)); throw error; }
finally { await browser?.close(); server.kill('SIGTERM'); }
