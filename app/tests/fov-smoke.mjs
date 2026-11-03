import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
// Actual Chrome renderer and JSBSim input regression; not aircraft fidelity validation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5180';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))
  .catch(() => { throw new Error('Build the local research engine first: just build-flight-engine'); });
await mkdir(output, { recursive: true });
const server = spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5180', '--strictPort'],
  { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [], observations = {};
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`FOV test server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `FOV test server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__fovStates = []; window.__fovStats = []; window.__fovInputs = []; window.__fovWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__fovWorker = this;
        const id = ++window.__fovWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') {
            window.__fovStates.push({ ...event.data, __worker_id: id });
            if (window.__fovStates.length > 1000) window.__fovStates.shift();
          }
          if (event.data?.type === 'stats') window.__fovStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__fovWorker && message?.type === 'input') window.__fovInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  const waitReady = () => page.waitForFunction(() => !document.querySelector('#start').disabled
    && window.__fovStates.at(-1)?.cas_mps > 0 && document.querySelector('#scene').dataset.fovDeg);
  await waitReady();
  await prepareFlightUI(page);
  const fov = async () => Number(await page.locator('#scene').getAttribute('data-fov-deg'));
  const waitFov = expected => page.waitForFunction(expected => Number(document.querySelector('#scene').dataset.fovDeg) === expected, expected);
  const stats = async () => {
    const count = await page.evaluate(() => window.__fovStats.length);
    await page.evaluate(() => window.__fovWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__fovStats.length > count, count);
    return page.evaluate(() => window.__fovStats.at(-1));
  };
  const frozen = (before, after) => {
    assert.equal(after.step, before.step, 'camera input never advances paused JSBSim');
    assert.equal(after.digest, before.digest, 'camera input preserves the actual WASM digest');
    assert.deepEqual(after.final_state, before.final_state, 'camera input preserves all paused physical state');
  };
  const scroll = async (deltaY, deltaX = 0) => {
    await page.mouse.move(1000, 180);
    await page.mouse.wheel(deltaX, deltaY);
    await page.waitForTimeout(80);
  };

  assert.equal(await fov(), 60);
  assert.match(await page.locator('#camera-fov').textContent(), /^60° FOV/);
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  const paused = await stats();
  assert.equal(await page.evaluate(() => document.elementFromPoint(1000, 180)?.closest('#scene')?.id), 'scene',
    'native scroll point must lie in the unobstructed scene');
  // Panel scrolling magnifies instruments around the pointer, independently of scene FOV.
  await page.waitForTimeout(150);
  const ap = page.locator('#ap-engage');
  const box = await ap.boundingBox();
  const anchor = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -180);
  await page.waitForTimeout(100);
  const enlarged = await ap.boundingBox();
  assert(enlarged.width > box.width * 1.3, 'AP control visibly enlarges');
  assert(Math.abs(enlarged.x + enlarged.width / 2 - anchor.x) < 1, 'horizontal pointer anchor stays fixed');
  assert(Math.abs(enlarged.y + enlarged.height / 2 - anchor.y) < 1, 'vertical pointer anchor stays fixed');
  assert.equal(await fov(), 60, 'panel zoom does not change camera FOV');
  const wasEngaged = await ap.getAttribute('aria-pressed');
  await page.mouse.click(anchor.x, anchor.y);
  await page.waitForFunction(previous => document.querySelector('#ap-engage').getAttribute('aria-pressed') !== previous, wasEngaged);
  await page.mouse.click(anchor.x, anchor.y);
  await page.waitForFunction(previous => document.querySelector('#ap-engage').getAttribute('aria-pressed') === previous, wasEngaged);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(100);
  const restored = await ap.boundingBox();
  assert(Math.abs(restored.width - box.width) < 1);
  assert(Math.abs(restored.x - box.x) < 1 && Math.abs(restored.y - box.y) < 1, 'zooming out restores fitted panel');
  frozen(paused, await stats());
  checks.push('pointer-centered panel zoom, working enlarged AP clicks, exact fit restoration and unchanged camera/native physics');
  await scroll(-120);
  const narrowed = await fov(); assert(narrowed < 60 && narrowed > 20);
  await scroll(120); await waitFov(60);
  for (let i = 0; i < 8; i++) await scroll(-200);
  await waitFov(20);
  await page.waitForFunction(() => document.querySelector('#scene').dataset.imagery === 'ready', null, { timeout: 45000 });
  await page.screenshot({ path: `${output}/fov-narrow.png` });
  // Compare an unobstructed scene region, excluding the changing HUD and gate.
  const sceneClip = { x: 960, y: 140, width: 450, height: 250 };
  const narrowImage = await page.screenshot({ clip: sceneClip });
  for (let i = 0; i < 8; i++) await scroll(200);
  await waitFov(100);
  await page.screenshot({ path: `${output}/fov-wide.png` });
  const wideImage = await page.screenshot({ clip: sceneClip });
  assert(!narrowImage.equals(wideImage), 'zoom changes the rendered world beyond its HUD label');
  frozen(paused, await stats());
  observations.initialZoom = { default_deg: 60, first_scroll_deg: narrowed, min_deg: 20, max_deg: 100 };
  checks.push('native scene wheel, visible zoom, bounds and paused WASM invariance');

  await scroll(-120);
  const chosen = await fov();
  await page.locator('#view-menu > summary').click(); await page.locator('#chase').click(); await waitFov(chosen);
  assert.equal(await page.locator('#chase').getAttribute('aria-pressed'), 'true');
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(150); assert.equal(await fov(), chosen);
  await page.locator('#view-menu > summary').click(); await page.locator('#cockpit').click(); await waitFov(chosen);
  assert.equal(await page.locator('#cockpit').getAttribute('aria-pressed'), 'true',
    'the paused gate leaves the view control usable after resize');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(150); assert.equal(await fov(), chosen);
  frozen(paused, await stats());
  checks.push('FOV persists across cockpit, chase and renderer resize');

  await scroll(0, 120); assert.equal(await fov(), chosen);
  await page.keyboard.down('Control'); await scroll(-120); await page.keyboard.up('Control');
  assert.equal(await fov(), chosen, 'browser pinch/ctrl-wheel is not scene zoom');
  await page.locator('#view-menu > summary').click(); await page.locator('#toggle-map').click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Zoom map in"]')?.disabled === false);
  await page.locator('.practice-map-heading').click();
  const mapBox = await page.locator('.practice-map-viewport').boundingBox();
  await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
  await page.mouse.wheel(0, -120); await page.waitForTimeout(100);
  assert.equal(await fov(), chosen, 'map scrolling cannot change the flight camera');
  await page.getByRole('button', { name: 'Close flight map', exact: true }).click();
  await page.locator('#altimeter-open').click();
  await page.locator('#altimeter-dialog').waitFor({ state: 'visible' });
  await page.locator('#altimeter-title').hover(); await page.mouse.wheel(0, -120);
  await scroll(-120);
  assert.equal(await fov(), chosen, 'native dialog and its backdrop cannot change FOV');
  await page.locator('#altimeter-close').click();
  frozen(paused, await stats());
  checks.push('horizontal, ctrl-wheel, map and native pressure-dialog isolation');

  await startOrResume(page);
  await page.waitForFunction(() => window.__fovStates.at(-1).step > 5);
  await page.mouse.click(1000, 180);
  await page.waitForFunction(() => document.querySelector('#scene').dataset.pointerMode === 'yoke');
  await page.mouse.move(1020, 170);
  const axes = () => page.evaluate(() => ({ mode: document.querySelector('#scene').dataset.pointerMode,
    roll: document.querySelector('#roll-control').textContent, pitch: document.querySelector('#pitch-control').textContent,
    rudder: document.querySelector('#rudder-control').textContent,
    input: Object.fromEntries(['aileron', 'elevator', 'rudder', 'throttle', 'flap', 'mixture']
      .map(key => [key, window.__fovInputs.at(-1)?.[key]])) }));
  await page.waitForTimeout(80);
  const yokeBefore = await axes(); assert.notEqual(Number(yokeBefore.pitch), 0);
  assert(Number.isFinite(yokeBefore.input.aileron) && Number.isFinite(yokeBefore.input.elevator),
    'axis invariance compares actual control commands sent to the worker');
  const yokeFov = await fov();
  await page.mouse.wheel(0, -120);
  await page.waitForFunction(before => Number(document.querySelector('#scene').dataset.fovDeg) < before, yokeFov);
  assert.deepEqual(await axes(), yokeBefore, 'scroll does not recenter or change the active yoke and worker axes');
  await page.keyboard.press('Escape');
  await page.locator('#pause').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const reviewPaused = await stats();
  await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const reviewFov = await fov(); await scroll(120);
  assert(await fov() > reviewFov, 'recorded-state review supports scene zoom');
  frozen(reviewPaused, await stats());
  await page.locator('#review-exit').click();
  checks.push('active yoke axes stay unchanged; paused recorded-state review permits zoom');

  const retained = await fov();
  const previousWorker = await page.evaluate(() => window.__fovWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#reset').click();
  await page.waitForFunction(previous => window.__fovStates.at(-1)?.__worker_id > previous, previousWorker);
  await waitReady(); assert.equal(await fov(), retained, 'flight reset retains the session camera setting');
  await page.reload(); await waitReady(); await waitFov(60);
  assert.match(await page.locator('#camera-fov').textContent(), /^60° FOV/);
  checks.push('flight reset retains FOV; page reload restores 60 degrees');

  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  console.log(JSON.stringify({ result: 'pass', browser: browser.version(), checks, observations,
    screenshots: 'output/flight/{fov-narrow,fov-wide}.png' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ checks, observations }, null, 2)); throw error;
} finally {
  await browser?.close(); server.kill('SIGTERM');
}
