// R-INPUT-1 / TODO2.0.134: actual UI and native worker. Keyboard-layout character
// variants use trusted Chrome Input events, not a physical Swiss-layout claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5297';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5297,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser, page; const checks = [], observations = [];
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !serverOutput.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(serverOutput.includes('Local:'), serverOutput);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    window.throttleStates = []; window.throttleStats = []; window.throttleInputs = []; window.throttleKeys = [];
    addEventListener('keydown', event => queueMicrotask(() => window.throttleKeys.push({ key: event.key, code: event.code,
      trusted: event.isTrusted, repeat: event.repeat, shift: event.shiftKey, ctrl: event.ctrlKey,
      alt: event.altKey, meta: event.metaKey, target: event.target?.id, prevented: event.defaultPrevented })), true);
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.throttleWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.throttleStates.push({ ...data });
          if (data.type === 'stats') window.throttleStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (message?.type === 'input') window.throttleInputs.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.throttleStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const scene = page.locator('#scene'), throttle = page.locator('#throttle');
  const cdp = await page.context().newCDPSession(page);
  const character = async (key, code, modifiers = 0) => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, text: key });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: 0 });
  };
  const stats = async () => {
    const count = await page.evaluate(() => window.throttleStats.length);
    await page.evaluate(() => window.throttleWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.throttleStats.length > count, count);
    return page.evaluate(() => window.throttleStats.at(-1));
  };
  const frozen = async before => {
    const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
    assert.deepEqual(after.final_state, before.final_state);
  };
  const pause = async () => {
    await page.locator('#pause').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
    return stats();
  };
  for (const mapping of [{ key: 'Digit0', value: 1 }, { key: '§', code: 'IntlBackslash', value: 0 },
    { key: 'Numpad0', value: 1 }, { key: 'Backquote', value: 0 },
    ...Array.from({ length: 9 }, (_, index) => ({ key: `Digit${index + 1}`, value: (index + 1) / 10 }))]) {
    await scene.focus(); const before = await stats();
    if (mapping.code) await character(mapping.key, mapping.code); else await page.keyboard.press(mapping.key);
    assert.equal(await throttle.inputValue(), String(mapping.value * 100));
    await frozen(before);
    await startOrResume(page);
    await page.waitForFunction(({ value, step }) => window.throttleStates.at(-1).step > step
      && window.throttleStates.at(-1).throttle_norm === value, { value: mapping.value, step: before.step });
    const native = await page.evaluate(() => window.throttleStates.at(-1));
    observations.push({ mapping, native, gesture: await page.evaluate(() => window.throttleKeys.at(-1)) });
    await pause();
  }
  const section = await page.evaluate(() => window.throttleKeys.find(event => event.key === '§'));
  assert(section.trusted && section.code === 'IntlBackslash', 'layout-character path uses a trusted browser event independently of Backquote');
  checks.push('paused staging keeps native physics frozen; 0/numpad0 apply100%, §/physicalBackquote applyidle, all1–9 presets apply unchanged on resume');

  await scene.focus(); await page.keyboard.press('Digit7');
  const beforeGuards = await stats();
  const unchanged = async label => {
    assert.equal(await throttle.inputValue(), '70', label); await frozen(beforeGuards);
  };
  const guardedKeys = async () => { await page.keyboard.press('Digit0'); await character('§', 'IntlBackslash'); };
  await page.locator('#ap-heading-target').focus(); await guardedKeys(); await unchanged('editing guards');
  await page.locator('#ap-heading-target').fill('82'); await page.keyboard.press('Enter');
  await page.locator('#flight-menu > summary').click(); await guardedKeys(); await unchanged('open menu guards');
  await page.locator('#flight-menu > summary').click();
  await page.locator('#controls-settings').click(); await page.locator('#settings-close').focus();
  await guardedKeys(); await unchanged('modal guards'); await page.locator('#settings-close').click();
  await scene.focus();
  for (const modifier of ['Control', 'Meta', 'Alt', 'Shift']) {
    await page.keyboard.press(`${modifier}+Digit0`); await unchanged(`${modifier} guard`);
  }
  for (const key of ['Digit0', 'Backquote']) {
    await page.keyboard.down(key); await page.keyboard.press('Digit7');
    await page.keyboard.down(key); await unchanged(`${key} repeat guard`); await page.keyboard.up(key);
  }
  assert(await page.evaluate(() => window.throttleKeys.some(event => event.trusted && event.repeat && event.code === 'Digit0')));
  checks.push('editing/open-menu/modal/modifier and trusted repeated-key events preserve throttle and paused native state');

  await scene.focus(); await page.keyboard.press('p');
  await page.locator('#flight-plan-overlay').waitFor({ state: 'visible' });
  await page.locator('#flight-plan-overlay button[aria-label="Close flight plan"]').focus();
  assert(await page.evaluate(() => !!document.activeElement?.closest('#flight-plan-overlay')), 'guard fixture must focus a visible plan control');
  await guardedKeys(); await unchanged('plan context guard');
  await page.locator('#flight-plan-overlay .flight-plan-overlay-heading button').last().click();
  await scene.focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({ state: 'visible' });
  await page.locator('#practice-map-panel button:visible').first().focus();
  assert(await page.evaluate(() => !!document.activeElement?.closest('#practice-map-panel')), 'guard fixture must focus a visible map control');
  await guardedKeys(); await unchanged('map context guard');
  await scene.focus(); await page.keyboard.press('m');
  await scene.focus(); await page.keyboard.press('r');
  await page.locator('#flight-review').waitFor({ state: 'visible' });
  const reviewValue = await throttle.inputValue(); await guardedKeys();
  assert.equal(await throttle.inputValue(), reviewValue); await frozen(beforeGuards);
  await page.locator('#review-exit').click(); assert.equal(await throttle.inputValue(), '70');
  checks.push('map/plan contexts and recorded Review reject throttle shortcuts; live selection is restored unchanged');

  await scene.focus(); const rate = await page.evaluate(() => window.throttleStates.at(-1).simulation_rate);
  await character('=', 'Digit0', 8);
  await page.waitForFunction(rate => window.throttleStates.at(-1).simulation_rate !== rate, rate);
  await unchanged('German Shift+Digit0 = belongs to rate control');
  const german = await page.evaluate(() => window.throttleKeys.filter(event => event.key === '=' && event.code === 'Digit0').at(-1));
  assert(german.trusted && german.shift);
  checks.push('trusted browser German-layout Shift+Digit0 = changes simulation rate without changing throttle or stepping paused physics');
  await writeFile(`${output}/throttle-task134-browser.json`, JSON.stringify({ result: 'pass', browser: browser.version(), checks, observations,
    keys: await page.evaluate(() => window.throttleKeys), inputs: await page.evaluate(() => window.throttleInputs),
    layoutScope: 'Chrome Input-dispatched § and German= key/code pairs are layout fixtures, not physical keyboard hardware acceptance.' }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }));
} catch (error) {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/throttle-task134-browser.json`, JSON.stringify({ result: 'fail', checks, observations, error: String(error),
    debug: await page?.evaluate(() => ({ keys: window.throttleKeys, state: window.throttleStates?.at(-1),
      throttle: document.querySelector('#throttle')?.value, status: document.querySelector('#status')?.textContent })).catch(() => null) }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill(); }
