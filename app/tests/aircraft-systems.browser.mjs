import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, startOrResume } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5243';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5243', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error('Systems server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const Native = Worker; window.systemStates = []; window.systemStats = [];
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (!String(args[0]).includes('/sim/worker.js')) return;
      window.systemWorker = this; this.addEventListener('message', ({ data }) => {
        if (data.type === 'state') window.systemStates.push(data);
        if (data.type === 'stats') window.systemStats.push(data);
      });
    } };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  const value = id => page.locator(`#systems-${id}`).textContent();
  const stats = async () => {
    const n = await page.evaluate(() => window.systemStats.length);
    await page.evaluate(() => window.systemWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.systemStats.length > n, n);
    return page.evaluate(() => window.systemStats.at(-1));
  };
  assert.equal(await page.locator('#view-menu #systems-open').count(),0,'View has no duplicate Aircraft systems entry');
  assert(await page.locator('#aircraft-systems .aircraft-systems-content').isVisible(),'desktop systems switches remain in the left panel');
  assert(await page.locator('#systems-open').isHidden(),'desktop does not show the collapsed opener');
  const initial = await stats();
  assert.equal(await value('volts'), '28.0');
  await page.locator('#systems-alternator').click(); assert.equal(await value('volts'), '24.0');
  const batteryAmps = Number(await value('amps')); assert(batteryAmps < 0);
  await page.locator('#systems-landing').click(); assert(Number(await value('amps')) < batteryAmps);
  await page.locator('#systems-battery').click(); assert.equal(await value('volts'), '0.0');
  assert.equal(await page.locator('#systems-alternator').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('#systems-landing').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#systems-landing').getAttribute('data-powered'), 'false');
  await page.locator('#systems-alternator').click();
  assert.equal(await page.locator('#systems-battery').getAttribute('aria-pressed'), 'true');
  const paused = await stats();
  assert.equal(paused.step, initial.step); assert.equal(paused.digest, initial.digest); assert.deepEqual(paused.final_state, initial.final_state);
  const systems = await page.locator('#aircraft-systems').boundingBox(), primary = await page.locator('.primary-instruments').boundingBox();
  assert(systems.x < primary.x && Math.abs(systems.height - primary.height) < 1);
  for (const width of [1440, 1200]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100);
    const fit = await page.locator('.aircraft-systems-content').evaluate(content => {
      const outer = content.getBoundingClientRect();
      return [...content.querySelectorAll('button, output')].every(e => { const b = e.getBoundingClientRect(); return b.top >= outer.top && b.bottom <= outer.bottom && b.left >= outer.left && b.right <= outer.right; });
    });
    assert(fit, 'all systems controls fit the shared panel');
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await startOrResume(page); await page.waitForFunction(() => window.systemStates.at(-1)?.step > 60);
  await page.locator('#systems-nav').click(); await page.waitForFunction(() => window.systemStates.at(-1)?.step > 100);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const beforeReview = await stats();
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.waitForFunction(() => document.querySelector('#systems-nav').getAttribute('aria-pressed') === 'false');
  assert(await page.locator('#systems-nav').isDisabled());
  await page.locator('#review-time').evaluate(input => { input.value = input.max; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('#systems-nav').getAttribute('aria-pressed') === 'true');
  const afterReview = await stats(); assert.equal(afterReview.digest, beforeReview.digest); assert.equal(afterReview.step, beforeReview.step);
  await page.locator('#review-exit').click();
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/aircraft-systems.png', import.meta.url)), clip: await page.locator('.flight-deck').boundingBox() });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#aircraft-systems #systems-open').waitFor({state:'visible'});
  assert(await page.locator('#aircraft-systems').isVisible(),'mobile retains the collapsed systems panel');
  await page.locator('#aircraft-systems #systems-open').click();
  await page.locator('#aircraft-systems-dialog').waitFor({ state: 'visible' });
  assert(await page.locator('#systems-landing').isVisible());
  await page.locator('#aircraft-systems-dialog > button').click();
  await page.locator('#scene').focus();await page.keyboard.press('Alt+Shift+y');
  await page.locator('#aircraft-systems-dialog').waitFor({state:'visible'});
  await page.locator('#aircraft-systems-dialog > button').click();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks: ['BAT/ALT interlock, circuit selection and estimated volts/current respond while paused', 'native physics unchanged by switches', 'left panel matches instrument height and fits at desktop widths', 'read-only replay follows recorded switches and restores live state', 'View has no duplicate entry; mobile panel opener and existing shortcut open the systems dialog'], browser: browser.version() }, null, 2));
} finally { await browser?.close(); server.kill(); }
