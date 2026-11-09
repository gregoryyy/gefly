import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
// Actual Chrome/JSBSim trim and menu regression; not a C172S handling validation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5181';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))
  .catch(() => { throw new Error('Build the local research engine first: just build-flight-engine'); });
await mkdir(output, { recursive: true });
const server = spawn(process.execPath,
  ['--input-type=module', '-e', `import { createServer } from 'vite';
    const server = await createServer({ server: { host: '127.0.0.1', port: 5181,
      strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
    await server.listen(); server.printUrls();`],
  { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [], observations = {};
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Trim test server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Trim test server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__trimStates = []; window.__trimStats = []; window.__trimInputs = []; window.__trimWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__trimWorker = this;
        const id = ++window.__trimWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') {
            window.__trimStates.push({ ...event.data, __worker_id: id });
            if (window.__trimStates.length > 1000) window.__trimStates.shift();
          }
          if (event.data?.type === 'stats') window.__trimStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__trimWorker && message?.type === 'input') window.__trimInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  const waitReady = () => page.waitForFunction(() => !document.querySelector('#start').disabled
    && Number.isFinite(window.__trimStates.at(-1)?.pitch_trim_norm));
  await waitReady();
  await prepareFlightUI(page);
  const state = () => page.evaluate(() => window.__trimStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.__trimStats.length);
    await page.evaluate(() => window.__trimWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__trimStats.length > count, count);
    return page.evaluate(() => window.__trimStats.at(-1));
  };
  const waitTrim = norm => page.waitForFunction(norm => Math.abs(window.__trimStates.at(-1).pitch_trim_norm - norm) < 1e-9, norm);
  const slider = page.locator('#pitch-trim-control');
  const setSlider = async percent => slider.evaluate((input, percent) => {
    input.value = String(percent); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, percent);
  const pause = async () => {
    if (await page.locator('#status').textContent() === 'Flying') await page.locator('#pause').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
    return stats();
  };
  const resume = async () => {
    const before = await stats(); await startOrResume(page);
    await page.waitForFunction(step => window.__trimStates.at(-1).step > step, before.step);
  };
  const assertFrozen = (before, after) => {
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  };
  const initial = await state(); observations.initial = { trim: initial.pitch_trim_norm, elevator_rad: initial.elevator_rad };
  assert.equal(initial.pitch_trim_norm, initial.pitch_trim_initial_norm);
  assert(Number.isFinite(initial.elevator_rad));
  for (const id of ['pitch-trim-control', 'pitch-trim-up', 'pitch-trim-down', 'pitch-trim-initial']) {
    assert(!(await page.locator(`#${id}`).isDisabled()), `${id} is available while paused`);
  }
  assert.match(await page.locator('#pitch-trim-actual').textContent(), /actual/);
  await resume();
  await page.locator('#scene').focus(); await page.keyboard.down('Quote');
  // The pinned actuator has 0.05 rad hysteresis: a tiny command change may
  // legitimately leave its surface still. This hold exceeds that deadband.
  await page.waitForFunction(start => window.__trimStates.at(-1).pitch_trim_norm < start - .15, initial.pitch_trim_norm);
  await page.keyboard.up('Quote'); await page.waitForTimeout(100);
  const noseUp = await state();
  observations.nose_up = { trim: noseUp.pitch_trim_norm, elevator_rad: noseUp.elevator_rad };
  assert(noseUp.elevator_rad < initial.elevator_rad, 'nose-up trim moves the actual generic-model elevator in the source-declared direction');
  await page.keyboard.down('Backslash');
  await page.waitForFunction(start => window.__trimStates.at(-1).pitch_trim_norm > start + .15, noseUp.pitch_trim_norm);
  await page.keyboard.up('Backslash'); await page.waitForTimeout(100);
  const noseDown = await state();
  assert(noseDown.elevator_rad > noseUp.elevator_rad);
  observations.keyboard = { nose_up: noseUp.pitch_trim_norm, nose_down: noseDown.pitch_trim_norm };
  checks.push('actual normalized trim, startup capture, keyboard directions and elevator movement');

  await setSlider(25); await waitTrim(-.25);
  await page.waitForFunction(() => document.querySelector('#pitch-trim-actual').textContent.includes('25.0% nose up'));
  await slider.focus(); await page.keyboard.press('ArrowUp'); await waitTrim(-.251);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'pitch-trim-control');
  assert.equal(await page.locator('#pitch-control').textContent(), '0.00', 'native slider arrows do not become elevator commands');
  await setSlider(100); await waitTrim(-1);
  await page.locator('#scene').focus(); await page.keyboard.down('Quote'); await page.waitForTimeout(120); await page.keyboard.up('Quote');
  assert.equal((await state()).pitch_trim_norm, -1);
  await setSlider(-100); await waitTrim(1);
  await page.locator('#scene').focus(); await page.keyboard.down('Backslash'); await page.waitForTimeout(120); await page.keyboard.up('Backslash');
  assert.equal((await state()).pitch_trim_norm, 1);
  await page.locator('#pitch-trim-initial').click(); await waitTrim(initial.pitch_trim_initial_norm);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'scene');
  checks.push('slider sign, native keyboard focus, bounded holds and restore startup command');

  await page.locator('#ap-engage').click({ delay:350 });
  await page.waitForFunction(() => window.__trimStates.at(-1).ap_mode === 1);
  const apBefore = await state();
  const upButton = await page.locator('#pitch-trim-up').boundingBox();
  await page.mouse.move(upButton.x + upButton.width / 2, upButton.y + upButton.height / 2); await page.mouse.down();
  await page.waitForFunction(before => window.__trimStates.at(-1).pitch_trim_norm < before - .01, apBefore.pitch_trim_norm);
  await page.mouse.move(1100, 180); await page.mouse.up(); await page.waitForTimeout(120);
  const released = await state();
  assert.equal(released.ap_mode, 0, 'pitch trim disconnects the two-axis autopilot');
  assert.equal(released.kap_engaged, 0);
  await page.waitForTimeout(160); assert.equal((await state()).pitch_trim_norm, released.pitch_trim_norm, 'outside release stops a held trim button');
  await page.locator('#scene').focus(); await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => window.__trimStates.at(-1).ap_mode === 0);
  await page.keyboard.up('ArrowDown');
  checks.push('trim hold outside-release disconnects the two-axis AP');

  await page.locator('#scene').focus(); await page.keyboard.down('Quote'); await page.waitForTimeout(100);
  const paused = await pause(); await page.keyboard.up('Quote');
  const pausedTrim = (await state()).pitch_trim_norm;
  await page.waitForTimeout(80);
  let pausedDisplayedTarget = -Number(await slider.inputValue()) / 100;
  const lastSentCommand = await page.evaluate(() => window.__trimInputs.at(-1).pitch_trim_norm);
  await page.locator('#scene').focus(); await page.keyboard.press('Backslash'); await setSlider(80); pausedDisplayedTarget = -Number(await slider.inputValue()) / 100;
  await page.waitForTimeout(150); assert.equal((await state()).pitch_trim_norm, pausedTrim);
  assertFrozen(paused, await stats());
  // Session input is coalesced: its cached last target can be newer than the
  // last message sent before pause. Compare its visible 0.1% slider value.
  await resume();
  const retainedCommand = await page.evaluate(() => window.__trimInputs.at(-1).pitch_trim_norm);
  observations.pause_boundary = { paused_actual: pausedTrim, last_sent_command: lastSentCommand,
    paused_displayed_target: pausedDisplayedTarget, resumed_command: retainedCommand };
  assert(Math.abs(retainedCommand - pausedDisplayedTarget) <= .0005 + 1e-12,
    'resume retains the displayed command within one half of the slider step');
  await waitTrim(retainedCommand); await page.waitForTimeout(150);
  assert.equal((await state()).pitch_trim_norm, retainedCommand, 'pause cancels held trim without losing its last queued command');
  await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const reviewPaused = await stats();
  await page.locator('#review-time').focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('#pitch-trim-actual').textContent.includes('recorded'));
  const recordedStart = await page.locator('#pitch-trim-actual').textContent();
  const trimText = norm => norm === 0 ? 'neutral' : `${Math.abs(norm * 100).toFixed(1)}% nose ${norm < 0 ? 'up' : 'down'}`;
  assert.equal(recordedStart, `${trimText(initial.pitch_trim_norm)} · recorded`, 'review starts with the captured startup trim');
  for (const id of ['pitch-trim-control', 'pitch-trim-up', 'pitch-trim-down', 'pitch-trim-initial']) assert(await page.locator(`#${id}`).isDisabled());
  await setSlider(60); await page.locator('#review-time').focus(); await page.keyboard.press('End');
  await page.waitForFunction(text => document.querySelector('#pitch-trim-actual').textContent === text,
    `${trimText(retainedCommand)} · recorded`);
  assertFrozen(reviewPaused, await stats());
  await page.locator('#review-exit').click();
  assert.equal((await state()).pitch_trim_norm, retainedCommand);
  observations.recorded_start = recordedStart;
  checks.push('pause cancels held trim; recorded trim is visible and read-only');

  await resume();
  const throttleBeforeRudder = await page.evaluate(() => window.__trimInputs.at(-1).throttle);
  for (const [key, rudder] of [['KeyQ', .35], ['KeyW', -.35]]) {
    await page.locator('#scene').focus(); await page.keyboard.down(key);
    await page.waitForFunction(rudder => window.__trimInputs.at(-1).rudder === rudder, rudder);
    assert.equal(await page.evaluate(() => window.__trimInputs.at(-1).throttle), throttleBeforeRudder,
      'Q/W rudder input does not become a throttle command');
    await page.keyboard.up(key);
  }
  for (const [key, throttle] of [['Digit1', .1], ['Digit9', .9], ['Digit0', 1], ['Numpad0', 1], ['Backquote', 0]]) {
    await page.keyboard.press(key);
    await page.waitForFunction(throttle => window.__trimInputs.at(-1).throttle === throttle, throttle);
  }
  await page.keyboard.press('Digit7');
  await page.keyboard.press('BracketRight');
  await page.waitForFunction(() => document.querySelector('#flap-control').value === '10');
  await page.waitForFunction(() => window.__trimStates.at(-1).flap_rad > 0);
  await page.keyboard.press('BracketLeft');
  await page.waitForFunction(() => document.querySelector('#flap-control').value === '0');
  checks.push('Q/W rudder, 0/numpad0 full throttle, physical left-of-1 idle and bracket flap shortcuts');

  for (const visible of [false, true]) {
    await page.locator('#view-menu > summary').click(); await page.locator('#toggle-controls').click();
    assert.equal(await page.locator('#flight-controls-panel').isVisible(), visible);
    assert.equal(await page.locator('#view-menu').getAttribute('open'), null);
    assert.equal(await page.locator('#status').textContent(), 'Flying');
  }
  await page.locator('#controls-settings').click();
  await page.locator('#control-settings').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  assert.equal(await page.locator('#control-settings .control-options').count(), 1);
  await page.locator('#settings-advanced > summary').click();
  assert(await page.locator('#roll-offset').isVisible());
  await page.locator('#limits').click(); assert(await page.locator('#limitations').isVisible());
  await page.locator('#settings-close').click();
  await page.locator('#flight-menu > summary').click();
  assert.equal(await page.locator('#reset').evaluate(button => button.closest('#flight-menu') !== null), true);
  const previousWorker = await page.evaluate(() => window.__trimWorkerId);
  await page.locator('#reset').click();
  await page.waitForFunction(previous => window.__trimStates.at(-1)?.__worker_id > previous, previousWorker);
  await waitReady();
  const reset = await state();
  assert.equal(reset.pitch_trim_norm, reset.pitch_trim_initial_norm);
  assert.equal(reset.pitch_trim_initial_norm, initial.pitch_trim_initial_norm);
  assert.equal(reset.ap_mode, 0);
  await page.screenshot({ path: `${output}/pitch-trim-desktop.png` });
  checks.push('View menu, hide/show controls, Options pause and Flight-menu restart resets trim');

  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  const compact = await page.locator('#pitch-trim').evaluate(panel => {
    const r = panel.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, viewport: innerWidth, height: innerHeight,
      document_width: document.documentElement.scrollWidth };
  });
  assert.equal(compact.document_width, compact.viewport);
  assert(compact.left >= 0 && compact.right <= compact.viewport && compact.top >= 0 && compact.bottom <= compact.height);
  await page.screenshot({ path: `${output}/pitch-trim-mobile.png` });
  observations.compact = compact;
  checks.push('compact trim panel stays inside the viewport');
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  console.log(JSON.stringify({ result: 'pass', browser: browser.version(), checks, observations,
    screenshots: 'output/flight/pitch-trim-{desktop,mobile}.png' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ checks, observations }, null, 2)); throw error;
} finally {
  await browser?.close(); server.kill('SIGTERM');
}
