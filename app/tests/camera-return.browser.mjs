// Actual Cesium camera frames and native worker; only scenery pixels are fixtures.
// The served-module insertion observes public camera values without replacing them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const port = Number(process.env.GEFLY_CAMERA_RETURN_PORT ?? 5397);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const origin = `http://127.0.0.1:${port}`, preferenceKey = 'gefly.camera-preferences.v1';
const initialDistance_m = Math.hypot(30, 11);
const paths = ['src/main.ts', 'src/scene.ts', 'src/pointer-yoke.ts', 'src/chase-distance.ts',
  'src/camera-return.ts', 'src/camera-preferences.ts', 'tests/camera-return.browser.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = async () => Object.fromEntries(await Promise.all(paths.map(async path => [path, hash(await readFile(`${app}/${path}`))])));
const sourceBefore = await hashes();
const result = { result: 'running', sourceHashes: sourceBefore, checks: [], observations: [], errors: [],
  limits: ['Fixture scenery with actual native worker and public Cesium camera; no terrain or aircraft fidelity acceptance.',
    'Blur cancellation uses an explicit synthetic lifecycle event; genuine hidden-tab lifecycle is not claimed by this suite.'] };
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/camera-return-vite-'+process.pid,server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let browser, page, serverLog = '';
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const save = () => writeFile(`${output}/camera-return-browser.json`, JSON.stringify(result, null, 2));
const radius = pose => Math.hypot(...pose.offsetENU);
const vectorError = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
function close(actual, expected, label, tolerance = 1e-5) {
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} versus ${expected}`);
}
function axes(pose) {
  for (const name of ['offsetENU', 'directionENU', 'upENU']) assert(pose[name]?.length === 3 && pose[name].every(Number.isFinite));
  close(Math.hypot(...pose.directionENU), 1, 'unit direction', 1e-12);
  close(Math.hypot(...pose.upENU), 1, 'unit up', 1e-12);
  close(pose.directionENU.reduce((sum, value, i) => sum + value * pose.upENU[i], 0), 0, 'orthogonal axes', 1e-12);
  if (pose.view !== 'cockpit') assert(vectorError(pose.directionENU, pose.offsetENU.map(value => -value / radius(pose))) < 1e-10,
    'actual external camera continues looking at the aircraft');
}
function follow(pose) {
  axes(pose); close(radius(pose), initialDistance_m, 'ordinary chase radius');
  close(pose.offsetENU[0], -Math.sin(pose.heading_rad) * 30, 'behind true heading east');
  close(pose.offsetENU[1], -Math.cos(pose.heading_rad) * 30, 'behind true heading north');
  close(pose.offsetENU[2], 11, 'ordinary chase height');
}

async function createPage(context) {
  const current = await context.newPage(); current.setDefaultTimeout(30000);
  current.on('pageerror', error => result.errors.push(String(error)));
  await installSceneryFixture(current);
  await current.route('**/scenery/{vector,landmarks}/**', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  await current.route('**/src/scene.ts', async route => {
    const response = await route.fetch(), source = await response.text(), marker = 'frustum.fov = lastFov_rad;';
    assert.equal(source.split(marker).length, 2, 'one observer insertion point');
    const observed = source.replace(marker, `${marker}
      const testInverse = Matrix4.inverseTransformation(frame, new Matrix4());
      const testOffset = Matrix4.multiplyByPoint(testInverse, scene.camera.positionWC, new Cartesian3());
      const testDirection = Matrix4.multiplyByPointAsVector(testInverse, scene.camera.directionWC, new Cartesian3());
      const testUp = Matrix4.multiplyByPointAsVector(testInverse, scene.camera.upWC, new Cartesian3());
      window.__returnCamera = {view, heading_rad, at_ms:performance.now(), fov_rad:frustum.fov,
        active:container.dataset.cameraReturnActive === 'true',
        offsetENU:[testOffset.x,testOffset.y,testOffset.z], directionENU:[testDirection.x,testDirection.y,testDirection.z],
        upENU:[testUp.x,testUp.y,testUp.z]};
      if (window.__collectReturnFrames) {window.__returnFrames.push(structuredClone(window.__returnCamera));if(window.__returnFrames.length>600)window.__returnFrames.shift();}`);
    result.servedSceneSha256 = hash(source); result.observedSceneSha256 = hash(observed);
    await route.fulfill({ response, body: observed });
  });
  await current.addInitScript(() => {
    const Native = Worker; window.returnStates = []; window.returnStats = []; window.returnCommands = [];
    window.__returnFrames = []; window.__collectReturnFrames = false;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.returnWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.returnStates.push(data);
          if (data.type === 'stats') window.returnStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.returnWorker) window.returnCommands.push(structuredClone(message));
        return super.postMessage(message, ...args);
      }
    };
  });
  return current;
}
async function ready(current) {
  await current.waitForFunction(() => !document.querySelector('#start').disabled && window.returnStates.length && window.__returnCamera,
    null, { timeout: 60000 });
  await prepareFlightUI(current, { controls: false });
}
async function stats(current = page) {
  const count = await current.evaluate(() => window.returnStats.length);
  await current.evaluate(() => window.returnWorker.postMessage({ type: 'stats' }));
  await current.waitForFunction(count => window.returnStats.length > count, count);
  return current.evaluate(() => window.returnStats.at(-1));
}
async function frozen(before, current = page) {
  const after = await stats(current); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
  assert.deepEqual(after.final_state, before.final_state);
}
async function pose(current = page) { const value = await current.evaluate(() => structuredClone(window.__returnCamera)); axes(value); return value; }
async function menu(current = page) {
  const target = current.locator('#view-menu');
  if (!await target.evaluate(element => element.open)) await target.locator(':scope > summary').click();
  return target;
}
async function view(name, current = page) {
  await menu(current); await current.locator(`#${name}`).click();
  await current.waitForFunction(name => window.__returnCamera.view === name, name);
}
async function option(enabled, current = page) {
  const target = await menu(current), button = current.locator('#toggle-camera-return');
  if ((await button.getAttribute('aria-pressed') === 'true') !== enabled) await button.click();
  assert.equal(await button.getAttribute('aria-pressed'), String(enabled));
  if (await target.evaluate(element => element.open)) await target.locator(':scope > summary').click();
}
async function point(current = page) {
  return current.locator('#scene').evaluate(scene => {
    const r = scene.getBoundingClientRect();
    for (const y of [.55, .4, .7]) for (const x of [.72, .45, .28]) {
      const p = { x: r.left + r.width * x, y: r.top + r.height * y };
      if (document.elementFromPoint(p.x, p.y)?.closest('#scene') === scene) return p;
    }
    throw Error('No unobstructed scene point');
  });
}
async function wheel(delta, current = page) {
  const p = await point(current); await current.mouse.move(p.x, p.y); await current.mouse.wheel(0, delta);
  await current.waitForTimeout(75);
}
async function drag(current = page) {
  const p = await point(current), bounds = await current.locator('#scene').boundingBox();
  await current.mouse.move(p.x, p.y); await current.mouse.down(); await current.waitForTimeout(300);
  await current.mouse.move(Math.min(bounds.x + bounds.width - 20, p.x + bounds.width * .13),
    Math.max(bounds.y + 20, p.y - bounds.height * .16), { steps: 7 });
  await current.mouse.up(); await current.waitForTimeout(60);
}
async function doubleClick(current = page) { const p = await point(current); await current.mouse.dblclick(p.x, p.y); }
async function collect(current = page) { await current.evaluate(() => { window.__returnFrames = []; window.__collectReturnFrames = true; }); }
async function frames(current = page) { return current.evaluate(() => { window.__collectReturnFrames = false; return structuredClone(window.__returnFrames); }); }
async function active(current = page) {
  await current.waitForFunction(() => document.querySelector('#scene').dataset.cameraReturnActive === 'true');
}
async function completed(current = page) {
  const after_ms = await current.evaluate(() => performance.now());
  await current.waitForFunction(after_ms => document.querySelector('#scene').dataset.cameraReturnActive === 'false'
    && window.__returnCamera.at_ms > after_ms && !window.__returnCamera.active, after_ms);
}
function lensFrames(values, fov) { assert(values.length > 2, 'actual rendered intermediate frames'); for (const value of values) { axes(value); close(value.fov_rad, fov, 'return keeps focal length', 1e-12); } }

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; !serverLog.includes('Local:'); i++) { assert(i < 150 && server.exitCode === null, serverLog); await sleep(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  page = await createPage(context); await page.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(page);
  assert.equal(await page.locator('#toggle-camera-return').getAttribute('aria-pressed'), 'true');
  const baseline = await stats(); await view('chase'); const closePose = await pose(); follow(closePose);
  await wheel(100); const gentle = await pose();
  assert(radius(gentle) > initialDistance_m * 1.1 && radius(gentle) <= initialDistance_m * 1.25);
  close(gentle.fov_rad, closePose.fov_rad, 'near zoom keeps actual Cesium lens', 1e-12);
  result.observations.push({ label: 'gentle first 100 px', before_m: radius(closePose), after_m: radius(gentle), fov_rad: gentle.fov_rad });
  await doubleClick(); await completed(); follow(await pose());
  for (let i = 0; i < 10; i++) await wheel(200);
  await drag(); const wide = await pose(); assert(radius(wide) > 100_000);
  await collect(); await doubleClick(); await active();
  const commandCount = await page.evaluate(() => window.returnCommands.length);
  await completed(); const returned = await pose(), chaseFrames = await frames(); follow(returned);
  lensFrames(chaseFrames, wide.fov_rad);
  const movingRadius = chaseFrames.filter(value => value.active && radius(value) > initialDistance_m * 1.01 && radius(value) < radius(wide) * .99);
  assert(movingRadius.length >= 2, 'chase return renders multiple intermediate radii');
  for (let i = 1; i < chaseFrames.length; i++) assert(radius(chaseFrames[i]) <= radius(chaseFrames[i - 1]) * 1.000001, 'chase radius returns monotonically');
  assert.equal(await page.evaluate(() => window.returnCommands.length), commandCount, 'camera animation sends no worker commands');
  await frozen(baseline); result.observations.push({ label: 'animated chase return', frames: chaseFrames });
  result.checks.push('gentle near-aircraft zoom uses fixed focal length; chase double-click renders a smooth bounded return to actual heading-following pose without native changes');

  await view('cockpit'); await wheel(-100); const centered = await pose();
  await drag(); const looking = await pose(); assert(vectorError(looking.directionENU, centered.directionENU) > .1);
  await collect(); await doubleClick(); await active(); await completed();
  const cockpitReturned = await pose(), cockpitFrames = await frames(); lensFrames(cockpitFrames, centered.fov_rad);
  assert(vectorError(cockpitReturned.directionENU, centered.directionENU) < 1e-10);
  assert(vectorError(cockpitReturned.upENU, centered.upENU) < 1e-10);
  assert(cockpitFrames.filter(value => value.active && vectorError(value.directionENU, centered.directionENU) > .02
    && vectorError(value.directionENU, looking.directionENU) > .02).length >= 2, 'cockpit renders intermediate look directions');
  await frozen(baseline); result.observations.push({ label: 'animated cockpit return', frames: cockpitFrames });
  result.checks.push('cockpit double-click animates actual look direction to centre while preserving selected field of view and paused native state');

  await view('chase'); for (let i = 0; i < 8; i++) await wheel(200);
  await collect(); await doubleClick(); await active(); await page.waitForTimeout(150); const beforeRestart = await pose();
  await collect();
  await doubleClick(); await active(); await completed(); const restartFrames = await frames(); follow(await pose());
  lensFrames(restartFrames, beforeRestart.fov_rad);
  assert(restartFrames.filter(value => value.active && radius(value) < radius(beforeRestart) * .99
    && radius(value) > initialDistance_m * 1.01).length >= 2, 'repeated request retains an actual animated transition');
  assert(restartFrames.every(value => radius(value) <= radius(beforeRestart) * 1.01), 'restart cannot jump back to the old starting radius');
  await frozen(baseline); result.observations.push({ label: 'repeated double-click', beforeRestart, frames: restartFrames });
  result.checks.push('repeated double-click restarts a rendered chase return from its visible pose and reaches the exact endpoint');

  for (let i = 0; i < 8; i++) await wheel(200);
  await doubleClick(); await active(); await page.waitForTimeout(150); await wheel(100); await completed();
  const wheelStop = await pose(); await page.waitForTimeout(850); const wheelLater = await pose();
  close(radius(wheelLater), radius(wheelStop), 'wheel cancellation has no delayed radius jump');
  assert(radius(wheelStop) > initialDistance_m * 1.1);
  await doubleClick(); await active(); await view('cockpit'); const switched = await pose();
  await page.waitForTimeout(850); assert(vectorError((await pose()).directionENU, switched.directionENU) < 1e-10);
  await drag(); await doubleClick(); await active(); await page.waitForTimeout(150); await drag(); await completed();
  const dragStop = await pose(); await page.waitForTimeout(850); assert(vectorError((await pose()).directionENU, dragStop.directionENU) < 1e-10);
  await doubleClick(); await active(); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await completed();
  const blurStop = await pose(); await page.waitForTimeout(850); assert(vectorError((await pose()).directionENU, blurStop.directionENU) < 1e-10);
  await frozen(baseline); result.checks.push('wheel, view switch, fresh drag and explicit synthetic blur cancel return without a delayed camera jump or native integration');

  await option(false); assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), preferenceKey), { version: 1, animate_return: false });
  await view('chase'); await wheel(200); await collect(); await doubleClick(); await completed(); follow(await pose());
  assert((await frames()).every(value => !value.active), 'disabled preference never starts an animated frame');
  await frozen(baseline); await page.reload(); await ready(page);
  assert.equal(await page.locator('#toggle-camera-return').getAttribute('aria-pressed'), 'false');
  await view('chase'); await wheel(200); await doubleClick(); await completed(); follow(await pose());
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const reducedPage = await createPage(reduced); await reducedPage.goto(origin, { waitUntil: 'domcontentloaded' }); await ready(reducedPage);
  assert.equal(await reducedPage.locator('#toggle-camera-return').getAttribute('aria-pressed'), 'true');
  const reducedPaused = await stats(reducedPage); await view('chase', reducedPage); await wheel(200, reducedPage);
  await collect(reducedPage); await doubleClick(reducedPage); await completed(reducedPage); follow(await pose(reducedPage));
  assert((await frames(reducedPage)).every(value => !value.active), 'reduced motion suppresses animation even with the preference on');
  await frozen(reducedPaused, reducedPage); await reduced.close();
  result.checks.push('View-menu animation preference saves immediately and survives reload; disabled and reduced-motion returns snap to the correct actual chase pose');

  assert.deepEqual(result.errors, []); assert.deepEqual(await hashes(), sourceBefore, 'tested runtime and harness stayed frozen');
  result.browser = browser.version(); result.result = 'pass'; await save();
  console.log(JSON.stringify({ result: result.result, checks: result.checks }, null, 2));
} catch (error) {
  result.result = 'fail'; result.error = String(error); result.serverLog = serverLog;
  result.debug = await page?.evaluate(() => ({ pose: window.__returnCamera, active: document.querySelector('#scene')?.dataset.cameraReturnActive,
    status: document.querySelector('#status')?.textContent })).catch(() => null);
  await save(); throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
