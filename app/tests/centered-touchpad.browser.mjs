// Actual app/WASM controls; only scenery pixels and read-only observers are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5244';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', chunk => { log += chunk; }); server.stderr.on('data', chunk => { log += chunk; });
const checks = [];
try {
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    const assignment = /cameraLook\s*=\s*\{\s*yaw_rad\s*,\s*pitch_rad\s*,?\s*\}\s*;?/g;
    assert.equal([...source.matchAll(assignment)].length, 1, 'read-only camera observer assignment exists once');
    const command = /session\.input\(controls\);/g;
    assert.equal([...source.matchAll(command)].length, 1, 'read-only pending command observer exists once');
    const observed = source.replace(assignment, value => `${value}; window.centeredLook = { ...cameraLook };`)
      .replace(command, value => `${value} window.centeredPendingInput = { ...controls };`);
    await route.fulfill({ response, body: observed });
  });
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.centeredLook = { yaw_rad: 0, pitch_rad: 0 };
    window.centeredInputs = []; window.centeredStats = []; window.centeredStates = []; window.centeredWorkerId = 0;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.centeredWorker = this; const id = ++window.centeredWorkerId;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.centeredStates.push({ ...data, worker_id: id });
          if (data.type === 'stats') window.centeredStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.centeredWorker && message?.type === 'input') window.centeredInputs.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.centeredStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const scene = page.locator('#scene');
  const centered = page.getByLabel('Centered touchpad controls', { exact: true });
  const rudderLink = page.getByLabel('Link rudder to aileron', { exact: true });
  const mode = value => page.waitForFunction(value => document.querySelector('#scene').dataset.pointerMode === value, value);
  const input = () => page.evaluate(() => ({ ...window.centeredPendingInput }));
  const look = () => page.evaluate(() => ({ ...window.centeredLook }));
  const rect = async () => { const r = await scene.boundingBox(); assert(r); return { ...r, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
  const stats = async () => {
    const count = await page.evaluate(() => window.centeredStats.length);
    await page.evaluate(() => window.centeredWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.centeredStats.length > count, count);
    return page.evaluate(() => window.centeredStats.at(-1));
  };
  const frozen = async before => { const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  // Permit subpixel scene geometry versus browser pointer-coordinate rounding.
  const neutral = async () => {
    const command = await input(); assert(command);
    assert(Math.abs(command.aileron) < .005, `centered aileron must be neutral, got ${command.aileron}`);
    assert(Math.abs(command.elevator) < .005, `centered elevator must be zero, got ${command.elevator}`);
  };
  const sameLook = (actual, expected) => { assert(Math.abs(actual.yaw_rad - expected.yaw_rad) < 1e-12); assert(Math.abs(actual.pitch_rad - expected.pitch_rad) < 1e-12); };
  const drag = async (x, y, dx, dy, restoredMode = 'yoke') => {
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(300); await mode('look');
    await page.mouse.move(x + dx, y + dy, { steps: 3 }); await neutral();
    const during = await look(); await page.mouse.up(); await mode(restoredMode);
    sameLook(await look(), during); await neutral(); return during;
  };

  // Establish real retained history and remove the launch card from the midpoint.
  await startOrResume(page); await page.waitForFunction(() => window.centeredStates.at(-1)?.step >= 60);
  await page.locator('#pause').click(); await page.waitForTimeout(80);
  const paused = await stats();
  await page.locator('#controls-settings').click(); assert.equal(await centered.isChecked(), true);
  await centered.check(); await rudderLink.check();
  await page.locator('#settings-gentle').click(); assert(await centered.isChecked()); assert(await rudderLink.isChecked());
  await page.locator('#settings-default').click(); assert(await centered.isChecked()); assert(await rudderLink.isChecked());
  await rudderLink.uncheck(); await frozen(paused); await page.locator('#settings-close').click();
  assert.match(await page.locator('#pointer-mode').textContent(), /CENTERED/i);
  checks.push('centered controls default on, both control preferences survive sensitivity presets, paused native state is unchanged');

  let r = await rect();
  await page.mouse.click(r.cx + 100, r.cy - 80); await mode('yoke');
  await page.mouse.move(r.cx, r.cy); await neutral();
  await page.mouse.move(r.cx + 75, r.cy - 75);
  let command = await input();
  assert(Math.abs(command.aileron - .25) < .005); assert(Math.abs(command.elevator - .2) < .005);
  await page.mouse.click(r.cx + 100, r.cy - 50); await mode('off');
  await page.mouse.click(r.cx - 100, r.cy + 50); await mode('yoke');
  await page.mouse.move(r.cx, r.cy); await neutral(); await frozen(paused);
  checks.push('off-center activation clicks cannot move neutral; current scene center yields zero yoke and known displacements produce signed real commands');

  const first = await drag(r.cx + 20, r.cy, 60, -35);
  assert(first.yaw_rad > .2 && first.pitch_rad > .1);
  await page.waitForTimeout(100); sameLook(await look(), first); await neutral();
  await page.mouse.move(r.cx, r.cy); await neutral();
  const second = await drag(r.cx + 10, r.cy, 35, 25);
  assert(Math.abs(second.yaw_rad - first.yaw_rad - .14) < .008);
  assert(Math.abs(second.pitch_rad - first.pitch_rad + .1) < .008);
  await page.mouse.move(r.cx, r.cy); await neutral(); await frozen(paused);
  checks.push('hold-drag suppresses yoke, retains view on release and accumulates subsequent drags; release stays neutral until real pointer movement');

  await page.locator('#controls-settings').click(); sameLook(await look(), second);
  await page.locator('#settings-close').click(); sameLook(await look(), second);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await mode('off'); sameLook(await look(), second); await frozen(paused);
  await page.setViewportSize({ width: 1200, height: 850 });
  r = await rect(); await page.mouse.click(r.cx + 90, r.cy - 70); await mode('yoke');
  await page.mouse.move(r.cx, r.cy); await neutral(); sameLook(await look(), second);
  const undocked = r;
  await scene.focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({ state: 'visible' });
  await page.waitForFunction(() => { const button = document.querySelector('.practice-map-toolbar button'); return button && !button.disabled; });
  r = await rect(); assert(r.cx < undocked.cx - 100, 'right dock changes the actual visible scene center');
  await page.mouse.click(r.cx + 70, r.cy - 60); await mode('yoke');
  await page.mouse.move(r.cx, r.cy); await neutral(); sameLook(await look(), second);
  await scene.focus(); await page.keyboard.press('m'); await page.locator('#practice-map-panel').waitFor({ state: 'hidden' });
  sameLook(await look(), second); await frozen(paused);
  checks.push('Options, blur, viewport resize and map docking preserve the view while current scene bounds always define neutral');

  await scene.focus(); await page.keyboard.press('r'); await page.locator('#flight-review').waitFor({ state: 'visible' });
  sameLook(await look(), second); const review = await stats();
  const reviewInputs = await page.evaluate(() => window.centeredInputs.length);
  r = await rect(); const reviewLook = await drag(r.cx + 20, r.cy - 20, 30, 10, 'off');
  assert(reviewLook.yaw_rad > second.yaw_rad);
  assert.equal(await page.evaluate(() => window.centeredInputs.length), reviewInputs);
  await frozen(review); await scene.focus(); await page.keyboard.press('r'); sameLook(await look(), reviewLook);
  await page.keyboard.press('Escape'); await mode('off'); sameLook(await look(), { yaw_rad: 0, pitch_rad: 0 }); await frozen(paused);
  checks.push('Review keeps the persistent inspection view and never sends flight inputs; Escape explicitly recenters without integrating physics');

  r = await rect(); await drag(r.cx + 20, r.cy - 20, 40, -20, 'off');
  const workerId = await page.evaluate(() => window.centeredWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  await page.waitForFunction(id => window.centeredWorkerId > id && !document.querySelector('#start').disabled, workerId, { timeout: 60000 });
  sameLook(await look(), { yaw_rad: 0, pitch_rad: 0 }); await mode('off');
  await page.locator('#controls-settings').click(); assert(await centered.isChecked()); await page.locator('#settings-close').click();
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  checks.push('new flight explicitly resets view/input while retaining the session preference; zero page errors and no external browser destinations');

  const result = { result: 'pass', checks, browser: browser.version(), imagery: 'Deterministic scenery pixels; copied actual pending commands/camera, real JSBSim state and trusted pointer gestures', firstLook: first, accumulatedLook: second };
  const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
  await mkdir(output, { recursive: true }); await writeFile(`${output}/centered-touchpad-browser.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally { await browser?.close(); server.kill(); }
