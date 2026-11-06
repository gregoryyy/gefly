// Real application and native worker; scenery pixels are fixtures. No flight
// state or audio-activation permission is restored by this preference feature.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const key = 'gefly.settings-preferences.v1';
const sourcePaths = ['src/main.ts', 'src/settings-preferences.ts', 'src/control-settings-panel.ts', 'src/audio-controls.ts', 'tests/settings-preferences.browser.mjs'];
async function sourceHashes() {
  return Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path,
    createHash('sha256').update(await readFile(`${app}/${path}`)).digest('hex')])));
}
const sourceBefore = await sourceHashes();
const port = Number(process.env.GEFLY_SETTINGS_TEST_PORT ?? 5379);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let serverLog = '', browser;
const checks = [], observations = [], errors = [];
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function setup(context) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await installSceneryFixture(page);
  await page.route('**/scenery/{vector,landmarks}/**', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  await page.addInitScript(() => {
    const Native = Worker;
    window.settingsStates = []; window.settingsMessages = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); this.settingsNative = String(args[0]).includes('/sim/worker.js');
        if (this.settingsNative) this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.settingsStates.push(data); });
      }
      postMessage(message, ...args) {
        if (this.settingsNative) window.settingsMessages.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  return page;
}
async function ready(page) {
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.settingsStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
}
const navigate = page => page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
const reload = page => page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
async function options(page) {
  await page.locator('#scene').focus(); await page.keyboard.press('o');
  await page.locator('#control-settings').waitFor({ state: 'visible' });
}
async function range(page, selector, endpoint) { await page.locator(selector).focus(); await page.keyboard.press(endpoint); }
async function advanced(page) {
  if (!await page.locator('#settings-advanced').evaluate(node => node.open)) await page.locator('#settings-advanced > summary').click();
}
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
async function values(page, label) {
  const value = await page.evaluate(label => ({ label,
    pitch: Number(document.querySelector('#sensitivity-pitch').value), roll: Number(document.querySelector('#sensitivity-roll').value),
    rudder: Number(document.querySelector('#sensitivity-rudder').value), brake: Number(document.querySelector('#sensitivity-brake').value),
    coordinated: document.querySelector('#coordinated-rudder').checked,
    centered: document.querySelector('#centered-touchpad').checked, papi: document.querySelector('#practice-papi').checked,
    vector: document.querySelector('#vector-scenery').checked, rollOffset: Number(document.querySelector('#roll-offset').value),
    volume: Number(document.querySelector('#audio-volume').value), muted: document.querySelector('#audio-toggle').dataset.muted,
    unlocked: document.querySelector('#audio-toggle').dataset.unlocked,
    step: window.settingsStates.at(-1).step, status: document.querySelector('#status').textContent,
  }), label);
  observations.push(value); return value;
}
function savedChoices(value, label) {
  assert.equal(value.pitch, 25, label); assert.equal(value.roll, 150, label); assert.equal(value.rudder, 25, label);
  assert.equal(value.brake, 0, label); assert.equal(value.coordinated, true, label); assert.equal(value.centered, false, label);
  assert.equal(value.papi, true, label); assert.equal(value.vector, true, label); assert.equal(value.rollOffset, 0.25, label);
  assert.equal(value.volume, 0, label); assert.equal(value.muted, 'false', label);
}
async function changeChoices(page) {
  await range(page, '#sensitivity-pitch', 'Home'); await range(page, '#sensitivity-roll', 'End');
  await range(page, '#sensitivity-rudder', 'Home'); await range(page, '#sensitivity-brake', 'Home');
  await page.locator('#coordinated-rudder').check(); await page.locator('#centered-touchpad').uncheck();
  await page.locator('#practice-papi').check(); await page.locator('#vector-scenery').check();
  await advanced(page); await range(page, '#roll-offset', 'End');
  await page.locator('#audio-settings-toggle').click(); await range(page, '#audio-volume', 'Home');
}

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; !serverLog.includes('Local:'); i++) { assert(i < 100 && server.exitCode === null, serverLog); await sleep(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, serviceWorkers: 'block' });
  const page = await setup(context); await navigate(page); await ready(page); await options(page);
  const initial = await values(page, 'initial defaults');
  assert.equal(initial.pitch, 100); assert.equal(initial.brake, 25); assert.equal(initial.centered, true); assert.equal(initial.muted, 'true');
  await changeChoices(page); assert.equal(await stored(page), null, 'Options preview is not written');
  await reload(page); await ready(page); await options(page);
  const discarded = await values(page, 'reload before Save');
  assert.equal(discarded.pitch, 100); assert.equal(discarded.brake, 25); assert.equal(discarded.rollOffset, 0);
  assert.equal(discarded.volume, 30); assert.equal(discarded.muted, 'true');
  checks.push('unsaved Options previews do not persist through a real reload');

  await changeChoices(page); await page.locator('#settings-close').click();
  const selected = await stored(page);
  assert.deepEqual(selected, { version: 1, controls: { pitch: 0.25, roll: 1.5, rudder: 0.25, brake: 0,
    coordinatedRudder: true, centeredTouchpad: false, practicePapi: true }, rollOffset: 0.25, volume: 0, muted: false });
  await reload(page); await ready(page);
  assert.equal(await page.locator('#audio-toggle').getAttribute('data-unlocked'), 'false', 'preference restore cannot unlock audio');
  assert.equal(await page.evaluate(() => window.settingsMessages.some(m => m.type === 'run')), false, 'reload remains paused');
  await options(page); savedChoices(await values(page, 'saved reload'), 'saved reload'); await page.keyboard.press('Escape');
  checks.push('Save restores every Options preference including false/zero after reload, without audio unlock or automatic flight');

  await options(page); await range(page, '#sensitivity-pitch', 'End'); await page.locator('#practice-papi').uncheck();
  await page.locator('#vector-scenery').uncheck(); await range(page, '#audio-volume', 'End'); await advanced(page); await range(page, '#roll-offset', 'Home');
  await page.locator('#audio-settings-toggle').click(); await page.keyboard.press('Escape');
  assert.deepEqual(await stored(page), selected, 'Escape preserves committed storage');
  await options(page); savedChoices(await values(page, 'cancel rolls back'), 'cancel rolls back'); await page.keyboard.press('Escape');
  checks.push('Escape cancels control, scenery, sound and Advanced previews without replacing saved choices');

  await options(page); await range(page, '#sensitivity-roll', 'Home'); await page.locator('#centered-touchpad').check();
  await range(page, '#audio-volume', 'End'); await page.mouse.click(1, 1);
  await page.locator('#control-settings').waitFor({ state: 'hidden' });
  assert.deepEqual(await stored(page), selected, 'backdrop dismissal preserves committed storage');
  await options(page); savedChoices(await values(page, 'backdrop rolls back'), 'backdrop rolls back'); await page.keyboard.press('Escape');
  checks.push('actual backdrop click cancels previews and preserves the committed choices');

  await page.locator('#scene').focus(); await page.keyboard.press('s');
  assert.deepEqual(await stored(page), { ...selected, muted: true }, 'S commits the quick sound choice outside Options');
  await reload(page); await ready(page);
  assert.equal(await page.locator('#audio-toggle').getAttribute('data-muted'), 'true');
  await page.locator('#audio-toggle').click();
  assert.deepEqual(await stored(page), selected, 'top sound button commits its choice outside Options');
  await reload(page); await ready(page);
  assert.equal(await page.locator('#audio-toggle').getAttribute('data-muted'), 'false');
  assert.equal(await page.locator('#audio-toggle').getAttribute('data-unlocked'), 'false');
  assert.equal(await page.evaluate(() => window.settingsMessages.some(m => m.type === 'run')), false);
  checks.push('S and the top sound button persist immediately outside Options and survive reload without resuming flight or unlocking audio');

  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click(); await ready(page);
  await options(page); savedChoices(await values(page, 'new flight'), 'new flight'); await page.keyboard.press('Escape');
  assert.deepEqual(await stored(page), selected);
  checks.push('Flight restart preserves committed user preferences');

  // A fresh tab on the same origin reads the same durable choices.
  const another = await setup(context); await navigate(another); await ready(another); await options(another);
  savedChoices(await values(another, 'new tab'), 'new tab'); await another.keyboard.press('Escape'); await another.close();
  checks.push('a new page on the same device/origin restores the saved choices');

  for (const [label, raw] of [['malformed', '{broken'], ['wrong-version', '{"version":2}'], ['oversized', ' '.repeat(1025)]]) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await c.addInitScript(({ key, raw }) => { if (location.protocol === 'http:') localStorage.setItem(key, raw); }, { key, raw });
    const p = await setup(c); await navigate(p); await ready(p); await options(p); const defaults = await values(p, label);
    assert.equal(defaults.pitch, 100); assert.equal(defaults.brake, 25); assert.equal(defaults.centered, true);
    assert.equal(defaults.rollOffset, 0); assert.equal(defaults.volume, 30); assert.equal(defaults.muted, 'true'); await c.close();
  }
  checks.push('malformed, oversized and future-version storage safely selects defaults');

  const denied = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }));
  const p = await setup(denied); await navigate(p); await ready(p); await options(p);
  await range(p, '#sensitivity-pitch', 'Home'); await range(p, '#sensitivity-brake', 'Home'); await p.locator('#settings-close').click();
  await options(p); const session = await values(p, 'denied storage remains usable'); assert.equal(session.pitch, 25); assert.equal(session.brake, 0);
  await p.keyboard.press('Escape'); await reload(p); await ready(p); await options(p); const fallback = await values(p, 'denied reload');
  assert.equal(fallback.pitch, 100); assert.equal(fallback.brake, 25); await denied.close();
  checks.push('actually denied storage permits session changes and reloads with usable defaults');

  assert.deepEqual(errors, []);
  const sourceAfter = await sourceHashes(); assert.deepEqual(sourceAfter, sourceBefore, 'tested source must stay fixed throughout the reload sequence');
  await writeFile(`${output}/settings-preferences-browser.json`, JSON.stringify({ result: 'pass', browser: browser.version(), sourceHashes: sourceAfter, checks, observations, errors }, null, 2));
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} catch (error) {
  await writeFile(`${output}/settings-preferences-browser.json`, JSON.stringify({ result: 'fail', error: String(error), sourceHashes: sourceBefore, checks, observations, errors, serverLog }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
