// Real WASM/worker checks. Map and photo pixels are deterministic UI fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5230';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5230,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, serverOutput = '';
const checks = [];
server.stdout.on('data', value => { serverOutput += value; });
server.stderr.on('data', value => { serverOutput += value; });
try {
  for (let i = 0; ; i++) {
    if (i === 100 || server.exitCode !== null) throw new Error(`Flight assists server did not start: ${serverOutput}`);
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.assistStates = []; window.assistStats = []; window.assistCommands = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/sim/worker.js')) return;
        window.assistWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.assistStates.push(data);
          if (data.type === 'stats') window.assistStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.assistWorker) window.assistCommands.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page);
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.assistStates.at(-1)?.simulation_rate === 1, null, { timeout: 60000 });
  const state = () => page.evaluate(() => window.assistStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.assistStats.length);
    await page.evaluate(() => window.assistWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.assistStats.length > count, count);
    return page.evaluate(() => window.assistStats.at(-1));
  };
  const scene = page.locator('#scene');
  const overlay = page.locator('#simulation-rate-overlay');
  const unchanged = (before, after) => {
    assert.equal(after.step, before.step);
    assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  };
  assert.equal(await page.locator('.topbar').isVisible(), false);
  assert.equal(await overlay.textContent(), 'SIM 1×');
  assert.equal(await overlay.evaluate(element => getComputedStyle(element).pointerEvents), 'none');
  assert.equal(await page.locator('#capture-autopilot').getAttribute('aria-keyshortcuts'), 'A');
  assert.equal(await page.locator('#simulation-rate').getAttribute('aria-keyshortcuts'), '=');

  const before = await stats();
  const initial = await state();
  await scene.focus();
  await page.keyboard.press('a');
  await page.waitForFunction(() => {
    const state = window.assistStates.at(-1);
    return state?.kap_engaged === 1 && state.kap_lateral === 1 && state.kap_vertical === 1;
  });
  const captured = await state();
  assert(Math.abs(captured.kap_heading_bug_rad - initial.heading_rad) < 1e-10);
  assert(Math.abs(captured.kap_hold_pressure_altitude_m - initial.kap_indicated_altitude_m) < 1e-8);
  assert(Math.abs(captured.kap_selected_altitude_m - initial.kap_indicated_altitude_m) < 1e-8);
  unchanged(before, await stats());
  await page.keyboard.press('a');
  await page.waitForTimeout(100);
  assert.equal((await state()).kap_engaged, 1, 'A recaptures instead of toggling off');
  unchanged(before, await stats());
  checks.push('A captures authoritative current heading and altitude while paused without moving physics; repeated A stays engaged');

  for (const rate of [1.5, 2, 5, 10, 1]) {
    await page.keyboard.press('Equal');
    await page.waitForFunction(rate => window.assistStates.at(-1)?.simulation_rate === rate && document.querySelector('#simulation-rate-overlay').textContent === `SIM ${rate}×`, rate);
  }
  unchanged(before, await stats());
  assert.deepEqual(await page.evaluate(() => window.assistCommands.filter(command => command.type === 'simulation-rate').map(command => command.rate)), [1.5, 2, 5, 10, 1]);
  // Multiple intents may precede their worker acknowledgments.
  await scene.evaluate(element => {
    for (let i = 0; i < 3; i++) element.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true, cancelable: true, code: 'Equal', key: '=',
    }));
  });
  await page.waitForFunction(() => window.assistStates.at(-1)?.simulation_rate === 5 && document.querySelector('#simulation-rate-overlay').textContent === 'SIM 5×');
  unchanged(before, await stats());
  checks.push('= cycles exact 1×/1.5×/2×/5×/10× rates, including fast presses, with acknowledged overlay and frozen paused state');

  const throttleBefore = await page.locator('#throttle').inputValue();
  await scene.evaluate(element => element.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true, cancelable: true, code: 'Digit0', key: '=', shiftKey: true,
  })));
  await page.waitForFunction(() => window.assistStates.at(-1)?.simulation_rate === 10 && document.querySelector('#simulation-rate-overlay').textContent === 'SIM 10×');
  assert.equal(await page.locator('#throttle').inputValue(), throttleBefore, 'German Shift+0 = never reaches throttle idle');
  unchanged(before, await stats());
  checks.push('German-layout Shift+Digit0 = changes rate while preserving throttle');

  const commandCount = () => page.evaluate(() => window.assistCommands.filter(command => ['simulation-rate', 'autopilot-capture'].includes(command.type)).length);
  const guarded = await commandCount();
  for (const key of ['Shift+Equal', 'Alt+Equal', 'Control+Equal', 'Meta+Equal', 'Shift+KeyA', 'Alt+KeyA']) await page.keyboard.press(key);
  await scene.evaluate(element => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Equal', key: '=', repeat: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyA', key: 'a', repeat: true }));
  });
  assert.equal(await commandCount(), guarded);
  await page.keyboard.press('o');
  await page.locator('#flight-menu > summary').click();
  await page.keyboard.press('a'); await page.keyboard.press('Equal');
  assert.equal(await commandCount(), guarded, 'open menus keep plain shortcuts inactive');
  await page.locator('#capture-autopilot').click();
  await page.waitForFunction(count => window.assistCommands.filter(command => ['simulation-rate', 'autopilot-capture'].includes(command.type)).length > count, guarded);
  await page.keyboard.press('o'); // hide header and close details
  await page.keyboard.press('Alt+Shift+KeyO');
  await page.locator('dialog[open]').waitFor({ state: 'visible' });
  const modalCount = await commandCount();
  await page.keyboard.press('a'); await page.keyboard.press('Equal');
  assert.equal(await commandCount(), modalCount);
  await page.evaluate(() => {
    window.assistOptionsClosed = false;
    document.querySelector('#control-settings').addEventListener('close', () => { window.assistOptionsClosed = true; }, { once: true });
  });
  await page.locator('#settings-close').click();
  // The native dialog close event restores scene focus asynchronously.
  await page.waitForFunction(() => window.assistOptionsClosed && !document.querySelector('#control-settings').open && document.activeElement?.id === 'scene');
  await page.locator('#ap-heading-target').focus();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ap-heading-target');
  await page.keyboard.press('a'); await page.keyboard.press('Equal');
  assert.equal(await commandCount(), modalCount, 'typing in cockpit inputs cannot trigger assists');
  await scene.focus();
  checks.push('repeat, modifiers, open menus, modal dialogs and editable cockpit fields do not trigger plain shortcuts; menu command remains usable');

  await page.locator('#start').click();
  await page.waitForFunction(step => window.assistStates.at(-1)?.step > step + 60, initial.step);
  await scene.focus(); await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const paused = await stats();
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review === 'true'
    && document.querySelector('#simulation-rate-overlay').textContent.startsWith('RECORDED RATE '));
  assert((await overlay.textContent()).startsWith('RECORDED RATE '));
  assert(await page.locator('#capture-autopilot').isDisabled());
  assert(await page.locator('#simulation-rate').isDisabled());
  const reviewCount = await commandCount();
  await page.keyboard.press('a'); await page.keyboard.press('Equal');
  assert.equal(await commandCount(), reviewCount);
  unchanged(paused, await stats());
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review !== 'true');
  checks.push('Review labels recorded rate distinctly, disables both commands and leaves native physics unchanged');

  await page.keyboard.press('Alt+Shift+KeyR');
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.assistStates.at(-1)?.step === 0 && window.assistStates.at(-1)?.simulation_rate === 1 && document.querySelector('#simulation-rate-overlay').textContent === 'SIM 1×', null, { timeout: 60000 });
  assert.equal((await state()).kap_engaged, 0);
  checks.push('Restart restores 1× and disengaged autopilot');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, browser: browser.version(), imagery: 'synthetic map/photo fixture; actual WASM and bundled terrain' }, null, 2));
} finally {
  await browser?.close(); server.kill();
}
