import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
// Real paused JSBSim state and Cesium caster/receiver pixels. The comparison
// disables only native shadow rendering; it never changes aircraft/camera state.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5206';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import {createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5206,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser; server.stdout.on('data', c => { log += c; }); server.stderr.on('data', c => { log += c; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try { if (log.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], requests = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) requests.add(url.hostname); });
  await page.route('**/src/scene.ts', async route => {
    const response = await route.fetch(); const source = await response.text();
    assert(source.includes('widget.render();'));
    await route.fulfill({ response, body: source.replace('widget.render();', 'if (window.__shadowDisabledForComparison) scene.shadowMap.enabled = false; widget.render();') });
  });
  await page.addInitScript(() => {
    const Native = window.Worker; window.__shadowStats = []; window.__shadowStates = [];
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
      window.__shadowWorker = this; this.addEventListener('message', event => {
        if (event.data?.type === 'stats') window.__shadowStats.push(event.data);
        if (event.data?.type === 'state') window.__shadowStates.push(event.data);
      });
    } };
  });
  await installSceneryFixture(page); await page.goto(origin); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page);
  const stats = async () => { const count = await page.evaluate(() => window.__shadowStats.length);
    await page.evaluate(() => window.__shadowWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__shadowStats.length > count, count);
    return page.evaluate(() => window.__shadowStats.at(-1)); };
  const frozen = (a, b) => { assert.equal(a.step, b.step); assert.equal(a.digest, b.digest); assert.deepEqual(a.final_state, b.final_state); };
  await page.locator('#view-menu > summary').click(); await page.locator('#chase').click();
  await page.waitForFunction(() => document.querySelector('#scene').dataset.aircraftShadow === 'too-high');
  assert.equal(await page.locator('#scene').getAttribute('data-shadow-enabled'), 'false', 'high airborne state fades out ground shadow');
  await page.locator('#flight-menu > summary').click();
  if (!await page.locator('#flight-research').evaluate(element => element.open)) await page.locator('#flight-research > summary').click();
  await page.locator('[data-landing=normal]').click();
  await page.waitForFunction(() => !document.querySelector('#start').disabled && document.querySelector('#scene').dataset.shadowEnabled === 'true');
  await page.waitForFunction(() => document.querySelector('#scene').dataset.imagery === 'ready' && document.querySelector('#scene').dataset.aircraftVisual === 'ready');
  await page.waitForTimeout(1500);
  const paused = await stats();
  const enabled = await page.locator('#scene canvas').first().screenshot({ path: `${output}/aircraft-shadow-native.png` });
  await page.evaluate(() => { window.__shadowDisabledForComparison = true; }); await page.waitForTimeout(200);
  const disabled = await page.locator('#scene canvas').first().screenshot({ path: `${output}/aircraft-shadow-disabled.png` });
  assert(!enabled.equals(disabled), 'native shadow produces a visible pixel change at actual near-ground state');
  await page.evaluate(() => { window.__shadowDisabledForComparison = false; }); await page.waitForTimeout(200);
  const restored = await page.locator('#scene canvas').first().screenshot();
  assert(enabled.equals(restored), 'fixed paused caster/ground pixels return identically');
  for (let frame = 0; frame < 4; frame++) {
    await page.waitForTimeout(120);
    assert(enabled.equals(await page.locator('#scene canvas').first().screenshot()), 'paused native shadow does not flicker');
  }
  frozen(paused, await stats());
  await page.locator('#view-menu > summary').click(); await page.locator('#cockpit').click();
  await page.waitForFunction(() => document.querySelector('#scene').dataset.aircraftShadow === 'cockpit');
  assert.equal(await page.locator('#scene').getAttribute('data-shadow-enabled'), 'false');
  frozen(paused, await stats()); assert.deepEqual(errors, []); assert.deepEqual([...requests], ['127.0.0.1']);
  const state = await page.evaluate(() => window.__shadowStates.at(-1));
  const result = { result: 'pass', checks: ['actual near-ground native shadow changes pixels and returns identically after shadow-only comparison',
    'paused shadow frames remain identical without flicker or physics advance', 'high-altitude/cockpit shadows hide; native assets stay local'],
    state: { agl_m: state.ground_agl_m, geodetic_height_m: state.ground_height_ellipsoid_m }, images: ['aircraft-shadow-native.png', 'aircraft-shadow-disabled.png'] };
  await writeFile(`${output}/aircraft-shadow-browser.json`, `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result));
} finally { await browser?.close(); server.kill(); }
