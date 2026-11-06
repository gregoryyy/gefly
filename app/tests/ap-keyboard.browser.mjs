// Trusted keyboard events through the real browser, worker and native engine.
// Scenery uses deterministic fixtures; this does not validate aircraft fidelity.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const port = Number(process.env.GEFLY_AP_KEYBOARD_PORT || 5462), origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/ap-keyboard-vite',server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser, page; const result = { checks: [], errors: [] };
server.stdout.on('data', d => { log += d; }); server.stderr.on('data', d => { log += d; });
try {
  await mkdir(output, { recursive: true });
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) { if (server.exitCode !== null) break; await new Promise(r => setTimeout(r, 100)); }
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) }); result.browser = browser.version();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  page.on('pageerror', e => result.errors.push(String(e)));
  await page.addInitScript(() => {
    const Native = Worker; window.apKeyboardMessages = [];
    window.Worker = class extends Native {
      constructor(...args) { super(...args); if (String(args[0]).includes('/sim/worker.js')) { window.apKeyboardWorker = this; this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.apKeyboardState = data; }); } }
      postMessage(m, ...args) { if (this === window.apKeyboardWorker && ['input', 'kap140', 'autopilot-capture'].includes(m?.type)) window.apKeyboardMessages.push(structuredClone(m)); return super.postMessage(m, ...args); }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.apKeyboardState?.kap_profile === 1, null, { timeout: 60000 });
  const focus = () => page.locator('#scene').focus();
  const state = () => page.evaluate(() => window.apKeyboardState);
  const count = () => page.evaluate(() => window.apKeyboardMessages.length);
  const messagesSince = n => page.evaluate(n => window.apKeyboardMessages.slice(n), n);
  const engaged = v => page.waitForFunction(v => window.apKeyboardState?.kap_engaged === v, v);
  await focus(); await page.keyboard.press('a'); await engaged(1);
  const initialTrim = (await state()).pitch_trim_norm;
  const pausedStart = await count();
  for (const key of ['ArrowUp','ArrowLeft','q',"'",'\\']) await page.keyboard.press(key);
  assert.equal((await state()).kap_engaged, 1);
  assert(!(await messagesSince(pausedStart)).some(m => m.type === 'kap140' && m.command?.action === 'disconnect'));
  result.checks.push('paused AP remains engaged after keyboard steering and trim');
  await startOrResume(page); await page.waitForFunction(() => window.apKeyboardState.t_s > .3); await focus();
  const before = await count();
  for (const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','q','w',"'",'\\']) {
    await page.keyboard.down(key); await page.waitForTimeout(100); await page.keyboard.up(key);
  }
  await page.waitForTimeout(250);
  const protectedMessages = await messagesSince(before), protectedInputs = protectedMessages.filter(m => m.type === 'input');
  assert.equal((await state()).kap_engaged, 1, 'AP stays engaged after every inhibited key');
  assert(!protectedMessages.some(m => m.type === 'kap140' && m.command?.action === 'disconnect'), 'inhibited keys send no disconnect');
  assert(protectedInputs.every(m => !m.pilot_override && m.elevator === 0 && m.aileron === 0 && m.rudder === 0), 'inhibited axes never reach worker');
  assert(protectedInputs.every(m => m.pitch_trim_norm === undefined || Math.abs(m.pitch_trim_norm - initialTrim) < 1e-10), 'trim does not change');
  result.checks.push('live AP ignores arrows, rudder and trim keys without sending manual axes or disconnect');
  const touchStart = await count(), box = await page.locator('#scene').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 - 40);
  await page.waitForTimeout(160);
  const pointerMessages = await messagesSince(touchStart);
  assert.equal((await state()).kap_engaged, 1);
  assert(pointerMessages.filter(m => m.type === 'input').every(m => !m.pilot_override && m.elevator === 0 && m.aileron === 0));
  result.checks.push('touchpad-style pointer movement still does not override engaged AP');
  const slider = page.locator('#pitch-trim-control'), trimValue = await slider.inputValue();
  const trimStart = await count(); await slider.focus();
  for (const key of ['ArrowUp', 'PageUp', 'Home', 'End']) await page.keyboard.press(key);
  await page.waitForTimeout(160);
  assert.equal(await slider.inputValue(), trimValue, 'keyboard does not move focused trim slider while AP engaged');
  assert.equal((await state()).kap_engaged, 1);
  assert(!(await messagesSince(trimStart)).some(m => m.type === 'kap140' && m.command?.action === 'disconnect'));
  await focus(); result.checks.push('focused trim slider keyboard does not change trim or disconnect AP');
  await prepareFlightUI(page);
  const buttonStart = await count(); await page.locator('#roll-right').focus();
  await page.keyboard.press('Space'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  assert.equal((await state()).kap_engaged, 1, 'keyboard activation of on-screen controls preserves AP');
  assert((await messagesSince(buttonStart)).filter(m => m.type === 'input').every(m => !m.pilot_override && m.aileron === 0));
  await focus(); result.checks.push('Space/Enter on focused flight-control button leave AP engaged');
  const unrelatedStart = await count(); await page.keyboard.press('9'); await page.keyboard.press(']');
  await page.waitForFunction(n => window.apKeyboardMessages.slice(n).some(m => m.type === 'input' && m.throttle === .9 && m.flap_norm > 0), unrelatedStart);
  assert.equal((await state()).kap_engaged, 1); result.checks.push('throttle and flaps still reach the worker while AP remains engaged');
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(100); await page.keyboard.press('a'); await engaged(0);
  const heldStart = await count(); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(200);
  assert((await messagesSince(heldStart)).filter(m => m.type === 'input').every(m => m.aileron === 0), 'repeat of blocked held key cannot spring into action on disconnect');
  await page.keyboard.up('ArrowLeft'); await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(n => window.apKeyboardMessages.slice(n).some(m => m.type === 'input' && m.aileron < 0), heldStart);
  await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(150);
  result.checks.push('held blocked key remains blocked across explicit AP disconnect; release and fresh press restore manual control');
  await page.keyboard.press('a'); await engaged(1); await page.keyboard.down('c');
  await page.waitForFunction(() => window.apKeyboardState?.kap_cws === 1);
  const cwsStart = await count(); await page.keyboard.down('ArrowDown');
  await page.waitForFunction(n => window.apKeyboardMessages.slice(n).some(m => m.type === 'input' && m.elevator < 0 && m.pilot_override === true), cwsStart);
  await page.keyboard.up('ArrowDown'); await page.waitForTimeout(160); await page.keyboard.up('c');
  await page.waitForFunction(() => window.apKeyboardState?.kap_cws === 0 && window.apKeyboardState?.kap_engaged === 1);
  result.checks.push('CWS hold permits keyboard steering and releasing the input then CWS retains AP');
  await page.keyboard.down('c'); await page.waitForFunction(() => window.apKeyboardState?.kap_cws === 1);
  const heldCwsStart = await count(); await page.keyboard.down('ArrowDown');
  await page.waitForFunction(n => window.apKeyboardMessages.slice(n).some(m => m.type === 'input' && m.elevator < 0), heldCwsStart);
  await page.keyboard.up('c');
  await page.waitForFunction(() => window.apKeyboardState?.kap_cws === 0 && window.apKeyboardState?.kap_engaged === 1);
  const releasedCws = await count(); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(180);
  assert.equal((await state()).kap_engaged, 1, 'CWS release with steering key held does not disconnect');
  assert((await messagesSince(releasedCws)).filter(m => m.type === 'input').every(m => m.elevator === 0), 'held key cannot reactivate after CWS release');
  await page.keyboard.up('ArrowDown');
  result.checks.push('releasing CWS with steering held neutralizes the axis and prevents repeat reactivation');
  assert.deepEqual(result.errors, []); result.result = 'pass'; console.log(JSON.stringify(result, null, 2));
} catch (e) { result.result = 'fail'; result.error = String(e); throw e; }
finally {
  if (page) { result.messages = await page.evaluate(() => window.apKeyboardMessages).catch(() => []); result.finalState = await page.evaluate(() => window.apKeyboardState).catch(() => null); }
  await writeFile(`${output}/ap-keyboard-browser.json`, JSON.stringify(result, null, 2) + '\n');
  await browser?.close(); server.kill('SIGTERM');
}
