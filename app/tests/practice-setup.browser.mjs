import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5250';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5250', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser, serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(serverLog);
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(serverLog);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } }), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = Worker; window.setupStates = []; window.setupStats = [];
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (!String(args[0]).includes('/sim/worker.js')) return;
      window.setupWorker = this;
      this.addEventListener('message', ({ data }) => {
        if (data.type === 'state') window.setupStates.push(data);
        if (data.type === 'stats') window.setupStats.push(data);
      });
    } };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page, { controls: false });
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('.practice-map-heading').click();
  await page.locator('#airport-play-start').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying' && window.setupStates.at(-1)?.step > 120, null, { timeout: 60000 });
  const card = page.locator('.runway-practice');
  await card.locator('summary').click();
  await card.getByRole('tab', { name: 'Setup', exact: true }).click();
  const ids = ['engine', 'brakes', 'throttle', 'flaps', 'trim', 'autopilot', 'electrical'];
  const assertRowInView = async id => {
    const row = card.locator(`.runway-practice-setup [data-check="${id}"]`);
    assert(await row.isVisible());
    const visible = await row.evaluate(element => {
      const row = element.getBoundingClientRect();
      let top = 0, bottom = innerHeight;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const overflow = getComputedStyle(parent).overflowY;
        if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden') {
          const box = parent.getBoundingClientRect(); top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom);
        }
      }
      return row.top >= top - 1 && row.bottom <= bottom + 1;
    });
    assert(visible, `${id} setup row is visible within both scroll ports`);
  };
  const showSetupRows = async () => {
    // The first Setup view must expose actual rows immediately, without first
    // scrolling the map or the practice body to discover them.
    await assertRowInView('engine');
    await card.locator('.runway-practice-setup [data-check="fuel-runup"]').scrollIntoViewIfNeeded();
    await assertRowInView('fuel-runup');
    await card.locator('.runway-practice-body').evaluate(element => { element.scrollTop = 0; });
    await assertRowInView('engine');
  };
  const waitStatus = (id, status) => page.waitForFunction(({ id, status }) => document.querySelector(`.runway-practice-setup [data-check="${id}"]`)?.dataset.status === status, { id, status });
  for (const id of ids) await waitStatus(id, 'match');
  assert.equal(await card.locator('input[type=checkbox]').count(), 0, 'sensed values are not automatically ticked checklist boxes');
  assert.match(await card.locator('.runway-practice-setup').textContent(), /simulator start reference.*not a complete POH checklist or grade/i);
  await waitStatus('pilot-cabin', 'unsupported'); await waitStatus('fuel-runup', 'unsupported');
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  await showSetupRows();
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/practice-setup-live.png', import.meta.url)) });
  // Applied values must change only after an actual native state echo.
  await page.locator('#scene').focus(); await page.keyboard.press('2'); await page.keyboard.press(']'); await page.keyboard.press('n'); await page.keyboard.press('e');
  for (const id of ['throttle', 'flaps', 'brakes', 'engine']) await waitStatus(id, 'different');
  assert.equal(await page.locator('#status').textContent(), 'Flying');
  // Close the popover to reach the runway controls underneath it.
  // A fresh runway start restores its declared initial reference.
  await page.locator('.practice-map-heading').click();
  await card.locator('summary').click();
  const oldCount = await page.evaluate(() => window.setupStates.length);
  await page.locator('#airport-play-start').click();
  await page.waitForFunction(count => window.setupStates.length > count + 3 && document.querySelector('#status').textContent === 'Flying' && window.setupStates.at(-1)?.step > 60, oldCount, { timeout: 60000 });
  for (const id of ids) await waitStatus(id, 'match');
  await card.locator('summary').click();
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const stats = async () => {
    const count = await page.evaluate(() => window.setupStats.length);
    await page.evaluate(() => window.setupWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.setupStats.length > n, count);
    return page.evaluate(() => window.setupStats.at(-1));
  };
  const frozen = await stats();
  const unchanged = async () => {
    const current = await stats(); assert.equal(current.step, frozen.step); assert.equal(current.digest, frozen.digest);
    assert.deepEqual(current.final_state, frozen.final_state, 'Setup inspection/import never changes frozen live native state');
  };
  await page.locator('.practice-map-heading').click();
  await card.getByRole('tab', { name: 'Setup', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await card.getByRole('tab', { name: 'Events', exact: true }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await card.getByRole('tab', { name: 'Briefing', exact: true }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowRight');
  assert.equal(await card.getByRole('tab', { name: 'Setup', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await card.getByRole('tab', { name: 'Setup', exact: true }).getAttribute('tabindex'), '0');
  await unchanged();
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  // Review keeps unmodified Left/Right for video seeking; every tab is Tab
  // reachable so keyboard users can still select Setup with Space/Enter.
  await card.getByRole('tab', { name: 'Briefing', exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Setup');
  await page.keyboard.press('Space');
  assert.equal(await card.getByRole('tab', { name: 'Setup', exact: true }).getAttribute('aria-selected'), 'true');
  const reviewTime = Number(await page.locator('#review-time').inputValue());
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(before => Number(document.querySelector('#review-time').value) > before, reviewTime);
  assert.equal(await card.getByRole('tab', { name: 'Setup', exact: true }).getAttribute('aria-selected'), 'true', 'Review arrow seeks without changing tabs');
  await unchanged();
  const downloading = page.waitForEvent('download'); await page.locator('#review-save').click();
  const download = await downloading, saved = JSON.parse(await readFile(await download.path(), 'utf8'));
  // Synthetic replay-only control fixture; this does not claim a native flight
  // ever had these settings. Preserve complete valid telemetry groups.
  const changed = { ...saved, samples: saved.samples.map(sample => ({ ...sample, state: {
    ...sample.state, engine_running: 0, engine_command_on: 0, throttle_norm: .6,
    brake_left_norm: 0, brake_right_norm: 0, flap_rad: Math.PI / 6, flap_command_norm: 1,
    pitch_trim_norm: .3, ap_mode: 1, systems_switch_mask: 0,
  } })) };
  const load = async (name, recording) => {
    await page.locator('#recording-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recording)) });
    await page.waitForFunction(() => document.querySelector('#recording-file').value === '');
    assert.match(await page.locator('#notice').textContent(), /^Loaded recording/);
  };
  await load('synthetic-setup.json', changed);
  for (const id of ids) await waitStatus(id, 'different');
  assert.match(await card.locator('.runway-practice-setup-source').textContent(), /selected recorded values.*read only/);
  await showSetupRows();
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/practice-setup-review.png', import.meta.url)) });
  await unchanged();
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  for (const id of ids) await waitStatus(id, 'match');
  await unchanged();
  const coreFields = ['step', 't_s', 'lat_rad', 'lon_rad', 'alt_msl_m', 'roll_rad', 'pitch_rad', 'heading_rad', 'tas_mps'];
  const legacy = { ...saved, samples: saved.samples.map(sample => ({ ...sample,
    state: Object.fromEntries(coreFields.map(key => [key, sample.state[key]])),
  })) };
  await load('legacy-missing-setup.json', legacy);
  for (const id of ids) await waitStatus(id, 'unavailable');
  await waitStatus('pilot-cabin', 'unsupported'); await waitStatus('fuel-runup', 'unsupported');
  assert(!await card.locator('.runway-practice-setup [data-status=match]').count(), 'missing groups never become invented matching zeros');
  await unchanged();
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  for (const id of ids) await waitStatus(id, 'match');
  await unchanged();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'pass', checks: [
    'native EDFE runway baseline matches seven sensed simulator-reference rows',
    'actual engine, throttle, flaps and brakes changes differ after native state echoes',
    'accessible three-tab keyboard inspection while paused preserves native state',
    'synthetic imported recorded controls replace live Setup readings without native mutation',
    'legacy missing telemetry remains unavailable and Back to live restores current readings',
  ], browser: browser.version() }, null, 2));
} finally { await browser?.close(); server.kill(); }
