// Actual Chrome/JSBSim Review regression. No synthetic flight states or replay writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5192';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url));
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['--input-type=module', '-e', `import { createServer } from 'vite';
  const server = await createServer({ server: { host: '127.0.0.1', port: 5192,
    strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
  await server.listen(); server.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Review server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Review server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__reviewStates = []; window.__reviewStats = []; window.__reviewInputs = []; window.__reviewWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__reviewWorker = this; ++window.__reviewWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') { window.__reviewStates.push({ ...event.data }); if (window.__reviewStates.length > 2000) window.__reviewStates.shift(); }
          if (event.data?.type === 'stats') window.__reviewStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__reviewWorker && message?.type === 'input') window.__reviewInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && Number.isFinite(window.__reviewStates.at(-1)?.throttle_norm));
  const state = () => page.evaluate(() => window.__reviewStates.at(-1));
  const workerId = await page.evaluate(() => window.__reviewWorkerId);
  const stats = async () => {
    const count = await page.evaluate(() => window.__reviewStats.length);
    await page.evaluate(() => window.__reviewWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__reviewStats.length > count, count);
    return page.evaluate(() => window.__reviewStats.at(-1));
  };
  const assertFrozen = (before, after) => {
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  };
  const text = id => page.locator(`#${id}`).textContent();
  const setRange = (id, value) => page.locator(`#${id}`).evaluate((input, value) => {
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  assert.equal(await text('status'), 'Paused'); assert.equal(await page.evaluate(() => window.__reviewWorkerId), workerId);
  assert.equal(await page.locator('#reset kbd').count(), 0);
  await startOrResume(page); await page.waitForFunction(() => window.__reviewStates.at(-1).step > 10);
  await page.locator('#view-menu > summary').click(); await page.keyboard.press('r');
  assert.equal(await text('status'), 'Flying'); await page.keyboard.press('Escape');
  await page.locator('#com1-standby').focus(); await page.keyboard.press('r'); assert.equal(await text('status'), 'Flying');
  await page.locator('#controls-settings').click(); await page.keyboard.press('r');
  assert.equal(await text('status'), 'Paused'); await page.locator('#settings-close').click();
  await startOrResume(page);
  checks.push('R never restarts and respects unavailable trace, menus, editable controls and dialogs');

  await setRange('throttle', 25); await setRange('mixture-control', 60); await setRange('flap-control', 10); await setRange('pitch-trim-control', 20);
  await page.locator('#scene').focus();
  const heldKeys = ['ArrowRight', 'ArrowUp', 'KeyQ', 'KeyB'];
  for (const key of heldKeys) await page.keyboard.down(key);
  await page.waitForFunction(() => { const s = window.__reviewStates.at(-1); return s.throttle_norm === .25 && s.mixture_norm === .6
    && s.pitch_trim_norm === -.2 && s.brake_left_norm === .25 && s.brake_right_norm === .25 && s.flap_command_norm === 1 / 3
    && Math.abs(s.aileron_cmd_norm - (.45 - .109375)) < 1e-12 && s.elevator_cmd_norm === .35 && s.rudder_cmd_norm === .35; });
  const captured = await state();
  for (const key of heldKeys) await page.keyboard.up(key);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const paused = await stats();
  // Native range values serialize to fewer decimal digits than worker timestamps.
  // Seek inside this real sample's interval, rather than onto a rounded boundary
  // which can correctly select its predecessor under FlightTrace.atTime's rule.
  const followingTime = await page.evaluate(time => window.__reviewStates.find(s => s.t_s > time)?.t_s, captured.t_s);
  assert(Number.isFinite(followingTime) && followingTime > captured.t_s, 'captured sample has a later actual recorded frame');
  const seekCaptured = async () => {
    const nativeTime = await page.locator('#review-time').evaluate((input, time) => {
      input.value = String(time); input.dispatchEvent(new Event('input', { bubbles: true }));
      return Number(input.value);
    }, captured.t_s + (followingTime - captured.t_s) / 2);
    assert(nativeTime > captured.t_s && nativeTime < followingTime, 'native seek remains inside the captured frame interval');
    await page.waitForFunction(step => document.querySelector('#flight-data-panel').dataset.step === String(step), captured.step);
  };
  for (const [id, value] of [['throttle', 80], ['mixture-control', 70], ['flap-control', 20], ['pitch-trim-control', 10]]) await setRange(id, value);
  await page.locator('#scene').focus();
  await page.keyboard.down('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.keyboard.down('r'); assert.equal(await text('status'), 'Review', 'key repeat cannot immediately leave Review'); await page.keyboard.up('r');
  await seekCaptured();
  await page.waitForFunction(() => document.querySelector('#power').textContent === '25%');
  const inputsAtReview = await page.evaluate(() => window.__reviewInputs.length);
  assert(await page.locator('.throttle-control').isVisible()); assert(await page.locator('#recorded-control-details').isVisible());
  assert.equal(await page.locator('#throttle').inputValue(), '25');
  for (const [id, field] of [['roll-control', 'aileron_cmd_norm'], ['pitch-control', 'elevator_cmd_norm'], ['rudder-control', 'rudder_cmd_norm']]) {
    assert.equal(await text(id), captured[field].toFixed(2));
  }
  for (const [id, field] of [['recorded-left-aileron', 'aileron_rad'], ['recorded-right-aileron', 'right_aileron_rad'],
    ['recorded-elevator', 'elevator_rad'], ['recorded-rudder', 'rudder_rad'], ['recorded-flap-actual', 'flap_rad']]) {
    assert.equal(await text(id), `${(captured[field] * 180 / Math.PI).toFixed(1)}°`);
  }
  assert.equal(await text('recorded-left-brake'), '25.0%'); assert.equal(await text('recorded-right-brake'), '25.0%');
  assert.equal(await text('recorded-flap-command'), '10.0°'); assert.equal(await text('recorded-trim'), '-20.0%');
  assert.equal(await text('recorded-throttle'), '25.0%'); assert.equal(await text('recorded-mixture'), '60.0%');
  assert.equal(await text('recorded-mixture-mode'), 'MANUAL');
  assert.equal(await page.locator('#mixture-control').inputValue(), '60');
  assert.match(await text('review-note'), /actuator.*input-event/);
  for (const id of ['throttle', 'mixture-control', 'flap-control', 'pitch-trim-control', 'wheel-brakes', 'roll-left']) assert(await page.locator(`#${id}`).isDisabled());
  await setRange('throttle', 99); await setRange('mixture-control', 99); await setRange('flap-control', 30); await setRange('pitch-trim-control', 99);
  await page.waitForTimeout(100); assert.equal(await page.locator('#throttle').inputValue(), '25');
  await page.locator('#review-time').focus(); await page.keyboard.press('r'); assert.equal(await text('status'), 'Review');
  assertFrozen(paused, await stats()); assert.equal(await page.evaluate(() => window.__reviewInputs.length), inputsAtReview);
  await page.screenshot({ path: `${output}/review-controls-desktop.png` });
  checks.push('selected recorded throttle, all commands, differential surfaces, brakes, flap/trim and mixture are read-only with physics frozen');

  await page.locator('#scene').focus(); await page.keyboard.press('r'); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  assert.equal(await page.locator('#throttle').inputValue(), '80'); assert.equal(await page.locator('#mixture-control').inputValue(), '70');
  assert.equal(await page.locator('#flap-control').inputValue(), '20'); assert.equal(Number(await page.locator('#pitch-trim-control').inputValue()), 10);
  assert.equal(await page.evaluate(() => window.__reviewWorkerId), workerId); assertFrozen(paused, await stats());
  await startOrResume(page);
  await page.waitForFunction(() => { const s = window.__reviewStates.at(-1); return s.throttle_norm === .8 && s.mixture_norm === .7
    && s.flap_command_norm === 2 / 3 && s.pitch_trim_norm === -.1; });
  assert.equal(await page.evaluate(() => window.__reviewWorkerId), workerId);
  checks.push('R exits to unchanged pending live controls and Resume applies them without resetting the worker');

  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await seekCaptured();
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  assert(await page.locator('#recorded-control-details').isVisible());
  assert.equal(await text('recorded-throttle'), '25.0%'); assert.equal(await text('recorded-mixture'), '60.0%');
  await page.screenshot({ path: `${output}/review-controls-mobile.png` });
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await page.locator('#view-menu > summary').click(); await page.locator('#toggle-controls').click();
  assert.equal(await page.locator('.control-panel').isVisible(), false);
  await page.locator('#scene').focus(); await page.keyboard.press('r'); assert(await page.locator('.control-panel').isVisible());
  await page.keyboard.press('r'); assert.equal(await page.locator('.control-panel').isVisible(), false);
  checks.push('compact Review exposes power/control data and preserves the live overlay preference on exit');
  await page.close(); await browser.close(); browser = undefined;
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  console.log(JSON.stringify({ result: 'pass', checks, captured_step: captured.step,
    screenshots: 'output/flight/review-controls-{desktop,mobile}.png' }, null, 2));
} catch (error) { console.error(JSON.stringify({ checks }, null, 2)); throw error; }
finally { await browser?.close(); server.kill('SIGTERM'); }
