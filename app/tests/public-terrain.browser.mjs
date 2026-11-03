import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
// Actual public package + actual WASM + app render/Review/contact integration.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5207';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5207,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser; const checks = [], observations = {};
server.stdout.on('data', c => { serverOutput += c; }); server.stderr.on('data', c => { serverOutput += c; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const errors = [], hosts = new Set();
  async function newPage(landing = false) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    p.on('pageerror', e => errors.push(String(e)));
    p.on('request', r => { const u = new URL(r.url()); if (['http:', 'https:'].includes(u.protocol)) hosts.add(u.hostname); });
    await p.addInitScript(landing => {
      const NativeWorker = window.Worker; window.worldStates = []; window.worldStats = []; window.worldReady = []; window.worldWorkerId = 0;
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
          window.worldWorker = this; const id = ++window.worldWorkerId;
          this.addEventListener('message', event => {
            if (event.data?.type === 'state') window.worldStates.push({ ...event.data, worker_id: id });
            if (event.data?.type === 'stats') window.worldStats.push(event.data);
            if (event.data?.type === 'ready') window.worldReady.push(event.data);
          });
        }
        postMessage(message, ...args) {
          if (landing && message?.type === 'init') message = { ...message, terrain: true, landing_preset: 'normal' };
          return super.postMessage(message, ...args);
        }
      };
    }, landing);
    return p;
  }
  const state = p => p.evaluate(() => window.worldStates.at(-1));
  const ready = p => p.waitForFunction(() => !document.querySelector('#start').disabled && window.worldStates.at(-1)?.terrain_profile === 1, null, { timeout: 60000 });
  async function stats(p) {
    const n = await p.evaluate(() => window.worldStats.length);
    await p.evaluate(() => window.worldWorker.postMessage({ type: 'stats' }));
    await p.waitForFunction(n => window.worldStats.length > n, n); return p.evaluate(() => window.worldStats.at(-1));
  }
  function datum(s) {
    assert.equal(s.terrain_profile, 1);
    assert(Math.abs(s.terrain_height_ellipsoid_m - s.terrain_height_msl_m - s.terrain_geoid_m) < 1e-7);
    assert(Math.abs(s.ground_height_ellipsoid_m - s.terrain_geoid_m - s.ground_agl_m - s.terrain_height_msl_m) < 1e-6,
      'actual native vertical AGL uses the same physical DEM as the rendered surface');
  }
  const page = await newPage(); await installSceneryFixture(page); await page.goto(origin); await ready(page);
  await prepareFlightUI(page);
  const first = await state(page); datum(first); observations.initial = first;
  assert(first.terrain_height_msl_m > 100 && first.terrain_geoid_m > 40 && first.ground_agl_m > 200);
  assert.equal((await page.evaluate(() => window.worldReady.at(-1))).build.terrain.sha256, '7123539a37bda7d7770d0f5e9662e5e48a350273bc68836ee34f1bf4b50ed7a9');
  assert.equal(await page.locator('#scene').getAttribute('data-terrain'), 'public-grid');
  await page.locator('#flight-menu > summary').click(); await page.locator('#taunus-practice').click();
  await page.waitForFunction(() => Math.abs(window.worldStates.at(-1)?.lat_rad - 50.20 * Math.PI / 180) < 1e-8);
  await ready(page); datum(await state(page));
  assert((await state(page)).terrain_height_msl_m > 300, 'ridge flight actually starts above the public hills');
  await page.locator('#start').click(); await page.waitForFunction(() => window.worldStates.at(-1)?.step > 20);
  await page.locator('#pause').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const paused = await stats(page); await page.locator('#scene').focus(); await page.keyboard.press('v');
  await page.waitForTimeout(600); assert.equal((await stats(page)).digest, paused.digest);
  await page.screenshot({ path: `${output}/terrain-taunus-flight.png` });
  checks.push('default app uses actual public DEM/GCG with physical native AGL; Flight-menu Taunus demo is a real native flight and camera changes keep physics frozen');

  // A native landing fixture above the actual public surface, not a mocked state.
  const landing = await newPage(true); await installSceneryFixture(landing); await landing.goto(origin); await ready(landing);
  await prepareFlightUI(landing);
  datum(await state(landing)); assert(Math.abs((await state(landing)).ground_agl_m - 3) < .02);
  await landing.locator('#start').click();
  await landing.waitForFunction(() => { const s = window.worldStates.at(-1); return s.gear_nose_wow + s.gear_left_wow + s.gear_right_wow > 0; });
  await landing.locator('#pause').click(); await landing.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  // The UI changes status immediately; the stats reply acknowledges the worker's
  // queued pause before selecting the final contact frame for recorded Review.
  await stats(landing);
  const contact = await state(landing); datum(contact); observations.contact = contact;
  assert(contact.gear_nose_load_n + contact.gear_left_load_n + contact.gear_right_load_n > 0);
  assert.equal(contact.collision_mask, 0, 'normal terrain wheel touchdown is not a body crash');
  await landing.locator('#scene').focus(); await landing.keyboard.press('v');
  await landing.waitForFunction(() => document.querySelector('#scene').dataset.shadowEnabled === 'true');
  const frozen = await stats(landing);
  await landing.keyboard.press('r'); await landing.locator('#flight-review').waitFor({ state: 'visible' });
  await landing.locator('#review-time').focus(); await landing.keyboard.press('End');
  await landing.waitForFunction(h => Math.abs(Number(document.querySelector('#scene').dataset.aircraftHeightEllipsoidM) - h) < 1e-6, contact.ground_height_ellipsoid_m);
  const reviewed = await stats(landing); assert.equal(reviewed.digest, frozen.digest); assert.deepEqual(reviewed.final_state, frozen.final_state);
  await landing.screenshot({ path: `${output}/terrain-native-contact-review.png` });
  await landing.locator('#review-exit').click();
  checks.push('actual JSBSim wheels touch the public physical surface with positive reactions; real-terrain shadow and recorded converted heights agree without advancing paused physics');

  // Raw real worker lets us check immutable state and rejected commands after a
  // coverage fault, separately from app session cleanup on its error message.
  observations.boundary = await page.evaluate(async () => {
    const { loadTerrainPackage } = await import('/studies/e1-browser/sim/terrain.js'); const g = await loadTerrainPackage();
    return await new Promise((resolve, reject) => {
      const w = new Worker('/studies/e1-browser/sim/worker.js', { type: 'module' }); let fault = false, baseline;
      const timer = setTimeout(() => { w.terminate(); reject(new Error('Terrain edge fixture timed out')); }, 15000);
      w.onmessage = e => {
        const m = e.data;
        if (m.type === 'ready') w.postMessage({ type: 'run', until_step: 240 });
        if (m.type === 'error') { fault = true; w.postMessage({ type: 'stats' }); }
        if (m.type === 'stats' && fault) {
          if (!baseline) {
            baseline = m; w.postMessage({ type: 'run' }); w.postMessage({ type: 'burst', steps: 10, blocks: 1 });
            setTimeout(() => w.postMessage({ type: 'stats' }), 80);
          } else {
            clearTimeout(timer); w.terminate(); resolve({ before: baseline, after: m });
          }
        }
      };
      w.postMessage({ type: 'init', terrain: true, ground_collision: true, aircraft: 'c172x', dt_s: 1 / 120, state_hz: 60,
        ic: { lat_rad: 49.96 * Math.PI / 180, lon_rad: g.east_rad - 1.25 * (g.east_rad - g.west_rad) / (g.width - 1),
          alt_msl_m: 400, heading_rad: Math.PI / 2, tas_mps: 45 } });
    });
  });
  const edge = observations.boundary; assert(edge.before.step > 0 && edge.before.step < 240);
  assert.equal(edge.before.step, edge.after.step); assert.equal(edge.before.digest, edge.after.digest); assert.deepEqual(edge.before.final_state, edge.after.final_state);
  checks.push('real worker stops at the loaded-region guard and rejects resume/burst while keeping its accepted native state and digest unchanged');

  const missing = await newPage();
  await missing.route('**/terrain/*.f32', async route => {
    const response = await route.fetch(), bytes = new Uint8Array(await response.body()); bytes[0] ^= 1;
    await route.fulfill({ response, body: Buffer.from(bytes) });
  });
  await installSceneryFixture(missing); await missing.goto(origin); await missing.waitForFunction(() => document.querySelector('#notice').textContent.includes('integrity'));
  assert(await missing.locator('#start').isDisabled()); assert.equal(await missing.evaluate(() => window.worldWorkerId), 0);
  checks.push('corrupt public data fails before a flight worker starts; no flat fallback or external runtime service is used');
  await writeFile(`${output}/public-terrain-browser.json`, JSON.stringify({ checks, observations }, null, 2) + '\n');
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']); console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
