import { installLegacyLabFixture, setLegacyLab, legacyLabEnabled } from './legacy-lab-fixture.mjs';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
// Actual Chrome/JSBSim UI integration; LAB navigation is fictional teaching geometry.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5183';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))
  .catch(() => { throw new Error('Build the local research engine first: just build-flight-engine'); });
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['--input-type=module', '-e', `import { createServer } from 'vite';
  const server = await createServer({ server: { host: '127.0.0.1', port: 5183,
    strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
  await server.listen(); server.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [], observations = { layouts: [] };
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Avionics test server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Avionics test server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__avionicsStates = []; window.__avionicsStats = []; window.__avionicsInputs = []; window.__avionicsWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__avionicsWorker = this; const id = ++window.__avionicsWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') {
            window.__avionicsStates.push({ ...event.data, __worker_id: id });
            if (window.__avionicsStates.length > 1000) window.__avionicsStates.shift();
          }
          if (event.data?.type === 'stats') window.__avionicsStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__avionicsWorker && message?.type === 'input') window.__avionicsInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await installLegacyLabFixture(page); await installSceneryFixture(page); await page.goto(origin);
  const waitReady = () => page.waitForFunction(() => !document.querySelector('#start').disabled && window.__avionicsStates.at(-1)?.cas_mps > 0);
  await waitReady();
  await prepareFlightUI(page);
  const state = () => page.evaluate(() => window.__avionicsStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.__avionicsStats.length);
    await page.evaluate(() => window.__avionicsWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__avionicsStats.length > count, count);
    return page.evaluate(() => window.__avionicsStats.at(-1));
  };
  const measure = () => page.evaluate(() => ({ viewport: { width: innerWidth, height: innerHeight },
    document_width: document.documentElement.scrollWidth,
    boxes: ['.primary-instruments', '.engine-controls', '.vertical-config-controls', '.brake-controls', '#nav1-gauge', '#nav2-gauge', '.avionics-units', '.avionics-stack', '#autopilot-systems', '#radio-nav-systems', '#engine-systems', '#pitch-trim'].map(selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { selector, left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
    }),
    cells: ['[data-instrument="airspeed"]', '[data-instrument="attitude"]', '[data-instrument="altimeter"]', '#nav1-gauge', '#nav2-gauge',
      '[data-instrument="turn"]', '[data-instrument="heading"]', '[data-instrument="vertical-speed"]', '#bearing-gauge', '#rpm-gauge'].map(selector => {
      const element = document.querySelector(selector), r = element.querySelector('canvas,svg').getBoundingClientRect();
      return { selector, center_x: r.left + r.width / 2, center_y: r.top + r.height / 2, width: r.width, height: r.height };
    }),
    vertical_controls: Object.fromEntries(['pitch-trim-control', 'flap-control', 'throttle', 'mixture-control'].map(id => {
      const input = document.getElementById(id), r = input.getBoundingClientRect();
      return [id, { orientation: input.getAttribute('aria-orientation'), width: r.width, height: r.height,
        center_x: r.left + r.width / 2, center_y: r.top + r.height / 2 }];
    })),
    control_space: (() => {
      const parent = document.querySelector('.engine-controls'), style = getComputedStyle(parent);
      const children = [...parent.children].map(element => ({ selector: element.id || element.className,
        height: element.getBoundingClientRect().height })).filter(child => child.height > 0);
      const padding_px = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const gaps_px = (parseFloat(style.rowGap) || 0) * Math.max(0, children.length - 1);
      return { outer_height: parent.getBoundingClientRect().height, padding_px, gaps_px, children,
        slack_px: parent.clientHeight - padding_px - gaps_px - children.reduce((sum, child) => sum + child.height, 0) };
    })() }));
  observations.layouts.push(await measure());
  await page.setViewportSize({ width: 1200, height: 800 }); await page.waitForTimeout(120);
  observations.layouts.push(await measure());
  await page.setViewportSize({ width: 880, height: 800 }); await page.waitForTimeout(120);
  observations.layouts.push(await measure());
  console.log(`CONTROL_SPACE ${JSON.stringify(observations.layouts.map(layout => ({ viewport: layout.viewport, ...layout.control_space })))}`);
  console.log(`AVIONICS_LAYOUT ${JSON.stringify(observations.layouts)}`);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
  const fill = async (id, value) => { await page.locator(`#${id}`).fill(String(value)); await page.keyboard.press('Tab'); };
  const text = id => page.locator(`#${id}`).textContent();
  const waitText = (id, expected) => page.waitForFunction(({ id, expected }) => document.getElementById(id).textContent === expected, { id, expected });
  assert.equal(await text('com1-active'), '118.000'); assert.equal(await text('nav1-active'), '113.80');
  assert.equal(await text('com2-active'), '121.500'); assert.equal(await text('nav2-active'), '114.00');
  assert.equal(await page.locator('.radio-receiver').count(), 2);
  assert.equal(await page.locator('.navigation-gauge').count(), 4);
  for (const receiver of [1, 2]) {
    assert.equal(await page.locator(`#nav${receiver}-gauge`).getAttribute('data-valid'), 'false');
    assert.equal(await page.locator(`#nav${receiver}-gauge .nav-cdi-needle`).getAttribute('hidden') !== null, true);
  }
  // PR #49 replaced the static "GS INOP" placard with a live GS flag/needle pair.
  assert.equal(await page.locator('#nav1-gauge').getAttribute('data-gs-valid'), 'false');
  assert(await page.locator('#nav1-gauge .nav-gs-flag').isVisible(), 'NAV1 GS flag shows without a valid glideslope');
  assert.equal(await page.locator('#nav1-gauge .nav-gs-needle').getAttribute('hidden') !== null, true, 'GS needle hidden without a valid glideslope');
  assert.equal(await page.locator('#nav2-gauge .nav-gs-flag').count(), 0, 'NAV2 has no glideslope receiver');
  assert.equal(await text('nav-flag'), 'NAV'); assert.equal(await legacyLabEnabled(page), false);
  for (const id of ['com1-standby', 'nav1-swap', 'nav-obs', 'com2-standby', 'nav2-swap', 'nav2-obs', 'flap-control', 'pitch-trim-control', 'throttle', 'mixture-control']) {
    assert.equal(await page.locator(`#${id}`).isDisabled(), false, `${id} is available while paused`);
  }
  assert.equal(await page.locator('#engine-systems #ap-status').count(), 0);
  assert.equal(await page.locator('#autopilot-systems #ap-status').count(), 1);
  assert.equal(await page.locator('.engine-controls #ap-status').count(), 1);
  assert.equal(await page.locator('.engine-content #throttle').count(), 1);
  assert.equal(await page.locator('.engine-content #mixture-control').count(), 1);
  assert.equal(await page.locator('#flap-control').getAttribute('min'), '0');
  assert.equal(await page.locator('#flap-control').getAttribute('max'), '30');
  assert.equal(await page.locator('#flap-control').getAttribute('step'), '10');
  assert.equal(await page.locator('#pitch-trim-up kbd').textContent(), "'"); assert.equal(await page.locator('#pitch-trim-initial kbd').textContent(), '/');
  assert.equal(await page.locator('#pitch-trim-down kbd').textContent(), String.fromCharCode(92));
  // PR #49 reworded the inline scope note; Options #limitations keeps the 8.33 kHz statement.
  assert.match(await page.locator('.radio-limitations').textContent(), /NOT CURRENT.*COM 25 kHz subset; no ATC/);
  assert.match(await page.locator('#limitations').textContent(), /no 8\.33 kHz or communication service/);
  for (const selector of ['.radio-limitations', '.nav-signal-note', '.navigation-gauge-note', '.autopilot-content > p', '#pitch-trim-note']) {
    for (const note of await page.locator(selector).all()) assert(await note.isHidden(), 'panel explanations stay in Options');
  }
  checks.push('separate boxes, truthful NAV flags and explicit legacy-radio scope');

  await startOrResume(page);
  await page.waitForFunction(() => window.__avionicsStates.at(-1).step > 400); // Leave the LAB passage ambiguity radius.
  await page.locator('#flap-control').focus(); await page.keyboard.press('Home');
  for (const detent of [10, 20, 30]) {
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(norm => window.__avionicsInputs.at(-1).flap_norm === norm, detent / 30);
  }
  await page.keyboard.press('ArrowDown'); assert.equal(await page.locator('#flap-control').inputValue(), '30');
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.__avionicsInputs.at(-1).flap_norm === 0);
  await fill('com1-standby', '122.800'); await page.locator('#com1-swap').click(); await waitText('com1-active', '122.800');
  assert.equal(await page.locator('#com1-standby').inputValue(), '118.000');
  await fill('com1-standby', '118.001');
  assert.equal(await page.locator('#com1-standby').evaluate(input => input.validity.valid), false);
  assert.equal(await text('com1-active'), '122.800');
  await fill('com1-standby', '122.825');
  await setLegacyLab(page, true);
  await fill('nav1-standby', '114.00'); await page.locator('#nav1-swap').click();
  await waitText('nav-flag', 'NAV'); assert.match(await text('nav-signal-note'), /No (fictional )?LAB signal/);
  await fill('nav1-standby', '113.80'); await page.locator('#nav1-swap').click();
  await waitText('nav-flag', 'LAB'); assert.match(await text('nav-ident'), /FICTIONAL/);
  assert(Number(await text('nav-dme')) > 0);
  checks.push('COM/NAV tuning and swaps, invalid-channel rejection and opt-in LAB reception');

  // Independently project actual Cartesian displacement onto station north/east.
  // This checks the rendered radial is driven by aircraft position, not heading.
  const actual = await state(), lat = 49.96 * Math.PI / 180, lon = 8.643 * Math.PI / 180;
  const x = Math.cos(actual.lat_rad) * Math.cos(actual.lon_rad) - Math.cos(lat) * Math.cos(lon);
  const y = Math.cos(actual.lat_rad) * Math.sin(actual.lon_rad) - Math.cos(lat) * Math.sin(lon);
  const z = Math.sin(actual.lat_rad) - Math.sin(lat);
  const east = -Math.sin(lon) * x + Math.cos(lon) * y;
  const north = -Math.sin(lat) * Math.cos(lon) * x - Math.sin(lat) * Math.sin(lon) * y + Math.cos(lat) * z;
  const bearing = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
  const course = Math.round(bearing) % 360;
  assert(Math.abs(Number((await text('nav-radial')).replace('°', '')) - bearing) < 2, 'display radial follows actual geometry within degree rounding/time sampling');
  await fill('nav-obs', course); await waitText('nav-to-from', 'FROM');
  await fill('nav-obs', (course + 5) % 360);
  const dots = Number((await page.locator('#nav-cdi').getAttribute('aria-label')).match(/CDI ([\-0-9.]+) dots/)[1]);
  assert(dots > 1.5 && dots < 3.5, 'OBS five degrees right moves the LAB needle right');
  const finalObs = (course + 180) % 360;
  await fill('nav-obs', finalObs); await waitText('nav-to-from', 'TO');
  await fill('com2-standby', '136.975'); await page.locator('#com2-up').click();
  assert.equal(await page.locator('#com2-standby').inputValue(), '136.975');
  await page.locator('#com2-swap').click(); await waitText('com2-active', '136.975');
  assert.equal(await text('com1-active'), '122.800', 'receiver-2 tuning leaves receiver 1 unchanged');
  await fill('com2-standby', '118.000'); await page.locator('#com2-down').click();
  assert.equal(await page.locator('#com2-standby').inputValue(), '118.000');
  await page.locator('#nav2-swap').click(); await waitText('nav2-active', '113.80'); await waitText('nav2-flag', 'LAB');
  await fill('nav2-standby', '117.95'); await page.locator('#nav2-up').click();
  assert.equal(await page.locator('#nav2-standby').inputValue(), '117.95');
  await fill('nav2-standby', '117.975');
  assert.equal(await page.locator('#nav2-standby').evaluate(input => input.validity.valid), false);
  await fill('nav2-standby', '114.00');
  await fill('nav2-obs', course); await waitText('nav2-to-from', 'FROM');
  assert.equal(await text('nav-to-from'), 'TO');
  const finalObs2 = (course + 1) % 360;
  await page.locator('#nav2-gauge-obs-up').click();
  await page.waitForFunction(expected => Number(document.querySelector('#nav2-obs').value) === expected, finalObs2);
  await waitText('nav2-gauge-obs', `${String(finalObs2).padStart(3, '0')}°`);
  assert.equal(await page.locator('#nav2-gauge .nav-compass-card').getAttribute('transform'), `rotate(${-finalObs2} 120 120)`);
  assert.equal(Number(await page.locator('#nav-obs').inputValue()), finalObs, 'gauge OBS knobs select only their own receiver');
  for (const receiver of [1, 2]) {
    assert.equal(await page.locator(`#nav${receiver}-gauge`).getAttribute('data-valid'), 'true');
    assert.equal(await page.locator(`#nav${receiver}-gauge .nav-cdi-needle`).getAttribute('hidden'), null);
  }
  checks.push('dual receivers tune and swap independently; round NAV gauges and OBS knobs use the selected receiver');
  await page.locator('#ap-engage').click({ delay:350 });
  await page.waitForFunction(() => window.__avionicsStates.at(-1).kap_engaged === 1 && window.__avionicsStates.at(-1).kap_lateral === 0);
  await page.locator('#ap-heading').click();
  await page.waitForFunction(() => window.__avionicsStates.at(-1).ap_mode === 2);
  const capturedHeading = (await state()).ap_heading_target_rad;
  await page.locator('#ap-heading-increase').click();
  await page.waitForFunction(expected => Math.abs(window.__avionicsStates.at(-1).ap_heading_target_rad - expected) < 1e-10,
    (capturedHeading + 10 * Math.PI / 180) % (2 * Math.PI));
  const lastStep = (await state()).step;
  await page.waitForFunction(step => window.__avionicsStates.at(-1).step > step + 20, lastStep);
  await page.screenshot({ path: `${output}/avionics-live.png` });
  checks.push('actual-position radial, OBS/CDI/TO-FROM and separate working heading AP');

  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  let paused = await stats();
  const physicalBefore = await state();
  for (const id of ['com1-standby', 'nav1-swap', 'nav-obs', 'com2-standby', 'nav2-swap', 'nav2-obs', 'flap-control', 'pitch-trim-control', 'throttle', 'mixture-control']) {
    assert.equal(await page.locator(`#${id}`).isDisabled(), false, `${id} remains available while paused`);
  }
  for (const [id, value] of [['pitch-trim-control', 20], ['mixture-control', 60], ['flap-control', 10], ['throttle', 42]]) {
    await page.locator(`#${id}`).evaluate((input, value) => {
      input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  await fill('com2-standby', '118.025'); await page.locator('#scene').focus(); await page.waitForTimeout(150);
  assert.equal(await page.locator('#mixture-control').inputValue(), '60', 'pending mixture stays visible after focus moves');
  assert.equal(await page.locator('#mixture-auto').getAttribute('aria-pressed'), 'false');
  assert.equal(Number(await page.locator('#pitch-trim-control').inputValue()), 20);
  assert.equal(await page.locator('#flap-control').inputValue(), '10');
  const stillPaused = await stats(); assert.equal(stillPaused.step, paused.step); assert.equal(stillPaused.digest, paused.digest);
  assert.deepEqual(stillPaused.final_state, paused.final_state);
  assert.equal((await state()).mixture_norm, physicalBefore.mixture_norm);
  assert.equal((await state()).pitch_trim_norm, physicalBefore.pitch_trim_norm);
  await startOrResume(page);
  await page.waitForFunction(() => window.__avionicsInputs.at(-1).throttle === .42
    && window.__avionicsInputs.at(-1).flap_norm === 1 / 3 && window.__avionicsStates.at(-1).pitch_trim_norm === -.2
    && window.__avionicsStates.at(-1).mixture_norm === .6 && window.__avionicsStates.at(-1).mixture_auto === 0);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  paused = await stats();
  checks.push('paused controls retain pending positions while physics freezes; resume applies queued mixture, trim, flaps and throttle');
  await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.locator('#review-time').focus(); await page.keyboard.press('Home');
  await waitText('radio-state-label', 'RECORDED'); await waitText('com1-active', '118.000');
  for (const id of ['com1-standby', 'nav2-swap', 'nav2-obs', 'flap-control', 'pitch-trim-control', 'mixture-control']) {
    assert(await page.locator(`#${id}`).isDisabled(), `${id} is locked during recorded review`);
  }
  assert.equal(await legacyLabEnabled(page), false); assert.equal(await text('nav-flag'), 'NAV');
  assert.equal(await page.locator('#nav-obs').inputValue(), '0');
  assert.equal(await text('com2-active'), '121.500'); assert.equal(await text('nav2-active'), '114.00');
  assert.equal(await page.locator('#nav2-obs').inputValue(), '0');
  assert.equal(await page.locator('#nav2-gauge').getAttribute('data-valid'), 'false');
  await page.keyboard.press('End'); await waitText('com1-active', '122.800');
  assert.equal(await legacyLabEnabled(page), true);
  assert.equal(Number(await page.locator('#nav-obs').inputValue()), finalObs);
  assert.equal(await text('com2-active'), '136.975'); assert.equal(await text('nav2-active'), '113.80');
  assert.equal(Number(await page.locator('#nav2-obs').inputValue()), finalObs2);
  await waitText('nav2-to-from', 'FROM');
  await waitText('nav2-gauge-obs', `${String(finalObs2).padStart(3, '0')}°`);
  await waitText('nav-to-from', 'TO');
  const afterReview = await stats(); assert.equal(afterReview.step, paused.step); assert.equal(afterReview.digest, paused.digest); assert.deepEqual(afterReview.final_state, paused.final_state);
  await page.locator('#review-exit').click(); await waitText('radio-state-label', 'LIVE');
  assert.equal(await text('com1-active'), '122.800');
  const previousWorker = await page.evaluate(() => window.__avionicsWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  await page.waitForFunction(previous => window.__avionicsStates.at(-1)?.__worker_id > previous, previousWorker); await waitReady();
  await waitText('com1-active', '118.000'); assert.equal(await legacyLabEnabled(page), false); assert.equal(await text('nav-flag'), 'NAV');
  checks.push('captured radio configurations restore across review; pause freezes physics and reset restores defaults');

  await page.screenshot({ path: `${output}/avionics-desktop.png` });
  await startOrResume(page); await page.waitForFunction(() => window.__avionicsStates.at(-1).step > 10);
  await page.locator('#ap-engage').click({ delay:350 }); await page.waitForFunction(() => window.__avionicsStates.at(-1).ap_mode === 1);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  observations.layouts.push(await measure()); console.log(`AVIONICS_LAYOUT ${JSON.stringify(observations.layouts.at(-1))}`);
  for (const name of ['engine', 'radio-nav', 'navigation']) {
    const before = await state();
    const command = await page.evaluate(() => ({ throttle: window.__avionicsInputs.at(-1).throttle, flap: window.__avionicsInputs.at(-1).flap_norm,
      trim: window.__avionicsInputs.at(-1).pitch_trim_norm }));
    if (name === 'navigation') await page.locator('#view-menu > summary').click();
    await page.locator(`#${name}-open`).click(); await page.locator(`#${name}-dialog`).waitFor({ state: 'visible' });
    assert.equal(await page.locator('dialog[open]').count(), 1);
    assert.equal(await text('status'), 'Flying');
    for (const key of ['Digit0', 'KeyP', 'KeyQ', 'KeyW', 'BracketRight', 'Quote']) await page.keyboard.press(key);
    await page.waitForFunction(step => window.__avionicsStates.at(-1).step > step + 8, before.step);
    const after = await state(); assert.equal(after.ap_mode, 1);
    const afterCommand = await page.evaluate(() => ({ throttle: window.__avionicsInputs.at(-1).throttle, flap: window.__avionicsInputs.at(-1).flap_norm,
      trim: window.__avionicsInputs.at(-1).pitch_trim_norm }));
    assert.deepEqual(afterCommand, command, `${name} dialog isolates flight shortcuts`);
    const box = await page.locator(`#${name}-dialog`).boundingBox();
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844);
    await page.screenshot({ path: `${output}/avionics-${name}-mobile.png` });
    await page.locator(`#${name}-close`).click();
    await page.waitForFunction(() => document.activeElement.id === 'scene');
  }
  assert(await page.locator('#ap-heading-target').isVisible(), 'main autopilot stays inline');
  checks.push('three compact dialogs keep flight running, isolate shortcuts and restore scene focus; autopilot stays inline');

  await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const compactReview = await stats();
  await page.locator('#view-menu > summary').click(); await page.locator('#navigation-open').click();
  await page.locator('#navigation-dialog').waitFor({ state: 'visible' });
  for (const receiver of [1, 2]) {
    assert(await page.locator(`#nav${receiver}-gauge-obs-up`).isDisabled());
    assert(await page.locator(`#nav${receiver}-gauge-obs-down`).isDisabled());
    assert.match(await page.locator(`#nav${receiver}-gauge-note`).textContent(), /recorded/i);
  }
  await page.keyboard.press('Quote'); await page.keyboard.press('BracketRight');
  const compactAfter = await stats(); assert.equal(compactAfter.step, compactReview.step);
  assert.equal(compactAfter.digest, compactReview.digest); assert.deepEqual(compactAfter.final_state, compactReview.final_state);
  await page.screenshot({ path: `${output}/avionics-navigation-review-mobile.png` });
  await page.locator('#navigation-close').click(); await page.locator('#review-exit').click();
  checks.push('mobile NAV review is recorded and read-only with live physics frozen');

  // A fresh compact load constructs the engine content inside its dialog.
  // Resizing a desktop page alone cannot catch a missing portal query here.
  await page.reload(); await waitReady();
  await startOrResume(page); await page.waitForFunction(() => window.__avionicsStates.at(-1).step > 10);
  await page.locator('#engine-open').click(); await page.locator('#engine-dialog').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#engine-dialog #throttle').count(), 1);
  assert.equal(await page.locator('#engine-dialog #mixture-control').count(), 1);
  for (const [id, value] of [['throttle', 42], ['mixture-control', 60]]) {
    await page.locator(`#${id}`).evaluate((input, value) => {
      input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  await page.waitForFunction(() => window.__avionicsInputs.at(-1).throttle === .42
    && window.__avionicsStates.at(-1).mixture_norm === .6 && window.__avionicsStates.at(-1).mixture_auto === 0);
  assert.equal(await text('status'), 'Flying');
  await page.screenshot({ path: `${output}/avionics-engine-fresh-mobile.png` });
  await page.locator('#engine-close').click();
  await page.waitForFunction(() => document.activeElement.id === 'scene');
  checks.push('fresh compact engine portal contains working throttle and mixture sliders');

  await page.setViewportSize({ width: 1440, height: 900 }); await page.reload(); await waitReady();
  await startOrResume(page); await page.waitForFunction(() => window.__avionicsStates.at(-1).step > 10);
  let releaseWasm, receivedWasm, requestTimeout;
  const released = new Promise(resolve => { releaseWasm = resolve; });
  const requested = new Promise(resolve => { receivedWasm = resolve; });
  const delayedWasm = async route => { receivedWasm(); await released; await route.continue(); };
  await page.route('**/jsbsim.wasm', delayedWasm);
  const priorWorker = await page.evaluate(() => window.__avionicsWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  try {
    await Promise.race([requested, new Promise((_, reject) => { requestTimeout = setTimeout(() => reject(new Error('Replacement WASM request did not arrive')), 10000); })]);
    assert(await page.locator('#start').isDisabled());
    for (const id of ['com1-standby', 'nav1-swap', 'nav-obs', 'mixture-control', 'ap-heading', 'pitch-trim-control']) {
      assert(await page.locator(`#${id}`).isDisabled(), `${id} is disabled while replacement engine is delayed`);
    }
    assert.equal(await text('engine-rpm'), '—'); assert.equal(await text('ap-engaged-label'), 'INOP');
    assert.equal(await text('ap-lateral'), '—'); assert.equal(await text('ap-vertical'), '—');
    await page.locator('#com1-standby').evaluate(input => {
      input.value = '123.450'; input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await text('com1-active'), '118.000');
  } finally { clearTimeout(requestTimeout); releaseWasm(); }
  await page.waitForFunction(previous => window.__avionicsStates.at(-1)?.__worker_id > previous, priorWorker);
  await waitReady(); await page.unroute('**/jsbsim.wasm', delayedWasm);
  assert.equal(await text('com1-active'), '118.000');
  assert.equal(await page.locator('#com1-standby').inputValue(), '121.500', 'disabled tuning cannot mutate replacement-session configuration');
  checks.push('delayed replacement engine clears stale readings and blocks tuning until ready');

  for (const layout of observations.layouts) {
    assert.equal(layout.document_width, layout.viewport.width, 'avionics have no horizontal document overflow');
    for (const box of layout.boxes) assert(box.left >= -1 && box.right <= layout.viewport.width + 1
      && box.top >= 0 && box.bottom <= layout.viewport.height + 1, `${box.selector} fits ${layout.viewport.width}×${layout.viewport.height}`);
    if (layout.viewport.width > 620) {
      const box = selector => layout.boxes.find(box => box.selector === selector);
      const reference = box('.primary-instruments');
      for (const selector of layout.viewport.width > 900 ? ['.engine-controls', '.avionics-units'] : ['.engine-controls']) {
        assert(Math.abs(box(selector).top - reference.top) < 1, `${selector} aligns with the instrument column top`);
        assert(Math.abs(box(selector).bottom - reference.bottom) < 1, `${selector} aligns with the instrument column bottom`);
      }
      assert(box('#autopilot-systems').bottom <= box('.vertical-config-controls').top + 1, 'autopilot is above the flap/trim pair');
      if (layout.viewport.width > 900) assert(Math.abs(box('#radio-nav-systems').height - box('.avionics-stack').height) < 1,
        'radio and engine columns have equal height');
      for (let column = 0; column < 5; column++) {
        assert(Math.abs(layout.cells[column].center_x - layout.cells[column + 5].center_x) < 1,
          'all ten main round faces align in five columns');
        assert(Math.abs(layout.cells[column].center_y - layout.cells[0].center_y) < 1
          && Math.abs(layout.cells[column + 5].center_y - layout.cells[5].center_y) < 1,
        'all ten main round faces align in two rows');
      }
    }
    const trim = layout.vertical_controls['pitch-trim-control'], flap = layout.vertical_controls['flap-control'];
    assert.equal(trim.orientation, 'vertical'); assert.equal(flap.orientation, 'vertical');
    assert(trim.height > trim.width * 2 && flap.height > flap.width * 2, 'flap and trim travel are vertical');
    assert(Math.abs(trim.height - flap.height) < 1, 'parallel flap and trim sliders have equal length');
    assert(Math.abs(trim.center_y - flap.center_y) <= 1, 'parallel sliders align vertically within one CSS pixel');
    if (layout.viewport.width > 900) {
      const throttle = layout.vertical_controls.throttle, mixture = layout.vertical_controls['mixture-control'];
      assert.equal(throttle.orientation, 'vertical'); assert.equal(mixture.orientation, 'vertical');
      assert(throttle.height > throttle.width * 2 && mixture.height > mixture.width * 2);
      assert(Math.abs(throttle.height - mixture.height) < 1 && Math.abs(throttle.center_y - mixture.center_y) < 1,
        'throttle and mixture sliders are parallel with equal lengths');
    }
  }
  checks.push('AP above parallel flap/trim sliders, 2×5 main round faces and equal-height desktop columns fit all viewports');
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  console.log(JSON.stringify({ result: 'pass', browser: browser.version(), checks, observations,
    screenshots: 'output/flight/avionics-{desktop,live,engine-mobile,engine-fresh-mobile,autopilot-mobile,radio-nav-mobile,navigation-mobile,navigation-review-mobile}.png' }, null, 2));
} catch (error) { console.error(JSON.stringify({ checks, observations }, null, 2)); throw error; }
finally { await browser?.close(); server.kill('SIGTERM'); }
