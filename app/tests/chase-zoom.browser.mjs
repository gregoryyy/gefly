// Actual Cesium camera/native-worker checks. Scenery pixels are fixtures;
// the read-only served-module observer never substitutes camera or flight data.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const port = Number(process.env.GEFLY_CHASE_TEST_PORT ?? 5391);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const origin = `http://127.0.0.1:${port}`;
const initialDistance_m = Math.hypot(30, 11), maxDistance_m = 20_000_000;
const sourcePaths = ['src/main.ts', 'src/scene.ts', 'src/aircraft-orientation.ts', 'src/chase-distance.ts', 'src/camera-pose.ts',
  'src/pointer-yoke.ts', 'tests/chase-zoom.browser.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path =>
  [path, hash(await readFile(`${app}/${path}`))])));
const sourcesBefore = await sourceHashes();
const result = { scope: 'R-VIEW-1/R-INPUT-1 camera interaction and native isolation; fixture scenery, no source or aircraft fidelity acceptance',
  result: 'running', sourceHashes: sourcesBefore, checks: [], observations: [], errors: [],
  gazeEvaluations: 0, maxGazeVectorError: 0 };
const server = spawn(process.execPath, ['--input-type=module', '-e',
  `import{createServer}from'vite';const s=await createServer({cacheDir:'../output/flight/chase-vite-'+process.pid,server:{host:'127.0.0.1',port:${port},strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],
{ cwd: app, stdio: 'pipe' });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const save = () => writeFile(`${output}/chase-zoom-browser.json`, JSON.stringify(result, null, 2));

function close(a, b, message, tolerance = 1e-5) { assert(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`); }
function cameraAxes(pose) {
  for (const key of ['offsetENU', 'directionENU', 'upENU']) {
    assert.equal(pose[key].length, 3, `three ${key} components`);
    assert(pose[key].every(Number.isFinite), `finite actual ${key}`);
  }
  close(Math.hypot(...pose.directionENU), 1, 'actual camera direction is normalized', 1e-12);
  close(Math.hypot(...pose.upENU), 1, 'actual camera up is normalized', 1e-12);
  close(pose.directionENU.reduce((sum, value, i) => sum + value * pose.upENU[i], 0), 0,
    'actual camera direction/up stay orthogonal', 1e-12);
  if (pose.view === 'cockpit') return;
  const radius = Math.hypot(...pose.offsetENU);
  assert(Number.isFinite(radius) && radius > 0, 'finite external camera radius');
  // This unit-vector difference bounds the angular miss to approximately 1e-10
  // radians (about 2 mm at the 20000 km limit). A permissive z-only check would
  // miss Cesium's near-pole HPR snapping, which previously missed by ~65.8 km.
  const error = Math.hypot(...pose.directionENU.map((value, i) => value + pose.offsetENU[i] / radius));
  result.gazeEvaluations++;
  result.maxGazeVectorError = Math.max(result.maxGazeVectorError, error);
  assert(error <= 1e-10, `actual camera gaze must target the aircraft at every zoom distance: ${error}`);
}
function follow(pose) {
  close(Math.hypot(...pose.offsetENU), initialDistance_m, 'default actual camera distance');
  close(pose.offsetENU[0], -Math.sin(pose.heading_rad) * 30, 'camera behind actual true heading east');
  close(pose.offsetENU[1], -Math.cos(pose.heading_rad) * 30, 'camera behind actual true heading north');
  close(pose.offsetENU[2], 11, 'normal chase height');
  close(pose.directionENU.reduce((sum, value, i) => sum + value * pose.offsetENU[i], 0), -initialDistance_m,
    'actual camera gaze points at the aircraft');
}

try {
  await mkdir(output, { recursive: true });
  for (let i = 0; !serverLog.includes('Local:'); i++) { assert(i < 150 && server.exitCode === null, serverLog); await sleep(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage(); page.on('pageerror', error => result.errors.push(String(error)));
  await installSceneryFixture(page);
  await page.route('**/scenery/{vector,landmarks}/**', route => route.fulfill({ contentType: 'application/vnd.mapbox-vector-tile', body: Buffer.alloc(0) }));
  await page.route('**/src/scene.ts', async route => {
    const response = await route.fetch(); const source = await response.text();
    const marker = 'frustum.fov = lastFov_rad;';
    assert.equal(source.split(marker).length, 2, 'one camera observer insertion marker');
    const observed = source.replace(marker, `${marker}
      const testInverse = Matrix4.inverseTransformation(frame, new Matrix4());
      const testOffset = Matrix4.multiplyByPoint(testInverse, scene.camera.positionWC, new Cartesian3());
      const testDirection = Matrix4.multiplyByPointAsVector(testInverse, scene.camera.directionWC, new Cartesian3());
      const testUp = Matrix4.multiplyByPointAsVector(testInverse, scene.camera.upWC, new Cartesian3());
      window.__chaseCamera = {view, heading_rad, t_s:state.t_s,
        offsetENU:[testOffset.x,testOffset.y,testOffset.z], directionENU:[testDirection.x,testDirection.y,testDirection.z],
        upENU:[testUp.x,testUp.y,testUp.z], targetWC:[position.x,position.y,position.z],
        cameraWC:[scene.camera.positionWC.x,scene.camera.positionWC.y,scene.camera.positionWC.z], fov_rad:frustum.fov};`);
    result.servedSceneSha256 = hash(source); result.observedSceneSha256 = hash(observed);
    await route.fulfill({ response, body: observed });
  });
  await page.addInitScript(() => {
    const Native = Worker; window.chaseStates = []; window.chaseStats = [];
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.chaseWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') { window.chaseStates.push(data); if (window.chaseStates.length > 200) window.chaseStates.shift(); }
          if (data.type === 'stats') { window.chaseStats.push(data); if (window.chaseStats.length > 20) window.chaseStats.shift(); }
        });
      }
    };
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.chaseStates.length && window.__chaseCamera,
    null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const pose = async label => { const value = await page.evaluate(() => structuredClone(window.__chaseCamera));
    result.lastCameraPose = value;
    if (label) result.observations.push({ label, ...value }); cameraAxes(value); return value; };
  async function stats() {
    const before = await page.evaluate(() => window.chaseStats.length);
    await page.evaluate(() => window.chaseWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(before => window.chaseStats.length > before, before);
    return page.evaluate(() => window.chaseStats.at(-1));
  }
  const frozen = (before, after) => { assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  async function view(name) { await page.locator('#view-menu > summary').click(); await page.locator(`#${name}`).click();
    await page.waitForFunction(name => window.__chaseCamera.view === name, name); }
  async function point() {
    return page.locator('#scene').evaluate(scene => {
      const r = scene.getBoundingClientRect();
      for (const y of [.55, .4, .7]) for (const x of [.72, .45, .28]) {
        const p = { x: r.left + r.width * x, y: r.top + r.height * y };
        if (document.elementFromPoint(p.x, p.y)?.closest('#scene') === scene) return p;
      }
      throw Error('No unobstructed scene point');
    });
  }
  async function scroll(deltaY, deltaX = 0) { const p = await point(); await page.mouse.move(p.x, p.y); await page.mouse.wheel(deltaX, deltaY); await page.waitForTimeout(90); await pose(); }
  const paused = await stats(); await view('chase'); const initial = await pose('default chase'); follow(initial);
  await scroll(200); const farther = await pose('first zoom'); assert(Math.hypot(...farther.offsetENU) > initialDistance_m * 2);
  close(farther.fov_rad, initial.fov_rad, 'chase wheel changes distance rather than lens');
  const p = await point(); await page.mouse.dblclick(p.x, p.y); await page.waitForTimeout(90);
  follow(await pose('zero-angle double-click resets zoom')); frozen(paused, await stats());
  result.checks.push('chase wheel changes actual Cesium distance with a fixed lens; zero-angle double-click returns close behind the plane without changing paused native state');

  for (let i = 0; i < 13; i++) await scroll(200);
  const wide = await pose('Earth-scale chase'); close(Math.hypot(...wide.offsetENU), maxDistance_m, 'Earth-scale camera distance', .001);
  const start = await point(), rect = await page.locator('#scene').boundingBox();
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.waitForTimeout(300);
  await page.mouse.move(start.x, rect.y + 1, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(90);
  const overhead = await pose('top-down Earth-scale overview');
  close(overhead.directionENU[0], 0, 'actual top-down gaze east component', 1e-10);
  close(overhead.directionENU[1], 0, 'actual top-down gaze north component', 1e-10);
  close(overhead.directionENU[2], -1, 'actual top-down gaze down component', 1e-12);
  close(overhead.offsetENU[0] / maxDistance_m, 0, 'actual top-down offset east component', 1e-10);
  close(overhead.offsetENU[1] / maxDistance_m, 0, 'actual top-down offset north component', 1e-10);
  close(overhead.offsetENU[2] / maxDistance_m, 1, 'actual top-down offset up component', 1e-12);
  await page.screenshot({ path: `${output}/chase-top-down.png` });
  const recenter = await point(); await page.mouse.dblclick(recenter.x, recenter.y); await page.waitForTimeout(90);
  follow(await pose('double-click from overhead')); frozen(paused, await stats());
  result.checks.push('chase reaches 20000km, hold-drag gives a top-down overview and double-click restores ordinary heading-relative chase');

  await scroll(0, 200); const guarded = await pose();
  for (const flag of ['ctrlKey', 'metaKey', 'altKey']) await page.locator('#scene').dispatchEvent('wheel', { deltaY: 200, [flag]: true });
  await page.locator('#scene').evaluate(scene => {
    const input = document.createElement('input'); input.id = 'chase-test-editable'; scene.append(input);
  });
  await page.locator('#chase-test-editable').dispatchEvent('wheel', { deltaY: 200, bubbles: true });
  await page.locator('#chase-test-editable').evaluate(input => input.remove());
  await page.locator('#scene').focus(); await page.keyboard.press('o'); await page.locator('#control-settings').waitFor({ state: 'visible' });
  await page.locator('#scene').dispatchEvent('wheel', { deltaY: 200 });
  await page.keyboard.press('Escape'); await page.waitForTimeout(90);
  close(Math.hypot(...(await pose()).offsetENU), Math.hypot(...guarded.offsetENU), 'horizontal/modifier/editable/dialog zoom guards');
  await view('cockpit'); const cockpitBefore = await pose(); await scroll(-120); const cockpitAfter = await pose();
  assert(cockpitAfter.fov_rad < cockpitBefore.fov_rad, 'cockpit wheel retains field-of-view zoom');
  await view('overview'); const overview = await pose(); close(Math.hypot(...overview.offsetENU), 1500, 'separate overview retains initial distance');
  await scroll(200); assert(Math.hypot(...(await pose()).offsetENU) > 1500);
  await view('chase'); follow(await pose('chase distance survives view switches')); frozen(paused, await stats());
  result.checks.push('horizontal/modifier/editable/dialog guards, cockpit field-of-view zoom and separate overview distance remain independent');

  const liveBefore = await pose(); await page.locator('#start').click();
  await page.waitForFunction(step => window.chaseStates.at(-1).step >= step + 180, paused.step, { timeout: 30000 });
  const live = await pose('actual moving-aircraft follow'); follow(live);
  assert(Math.hypot(...live.targetWC.map((value, i) => value - liveBefore.targetWC[i])) > 1, 'native flight moves the followed target');
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const reviewPaused = await stats(); await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await scroll(200); assert(Math.hypot(...(await pose()).offsetENU) > initialDistance_m);
  const rp = await point(); await page.mouse.dblclick(rp.x, rp.y); await page.waitForTimeout(90);
  follow(await pose('Review recenter')); frozen(reviewPaused, await stats()); await page.locator('#review-exit').click();
  result.checks.push('actual native flight moves the heading-relative chase target; paused Review supports zoom/recenter without changing the live worker');
  assert.deepEqual(result.errors, []); assert.deepEqual(await sourceHashes(), sourcesBefore, 'all tested source stays fixed');
  result.browser = browser.version(); result.result = 'pass'; await save();
  console.log(JSON.stringify({ result: 'pass', checks: result.checks }, null, 2));
} catch (error) { result.result = 'fail'; result.error = String(error); result.serverLog = serverLog; await save(); throw error; }
finally { await browser?.close(); server.kill('SIGTERM'); }
