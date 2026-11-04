// Live official-cartography visual regression. Requires the local research engine
// and public network access; no synthetic map pixels stand in for the new layer.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { prepareFlightUI } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5256';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5256', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser, serverOutput = '';
server.stdout.on('data', data => { serverOutput += data; }); server.stderr.on('data', data => { serverOutput += data; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(serverOutput);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  const errors = [], vectorResponses = [], glyphRequests = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => { if (/glyph|\/fonts\//i.test(r.url())) glyphRequests.push(r.url()); });
  page.on('response', r => { if (/\/scenery\/vector\/\d+\//.test(r.url()) && r.ok()) vectorResponses.push(r.url()); });
  await page.addInitScript(() => {
    const Native = Worker; window.terrainStates = []; window.terrainStats = []; window.terrainWorkerCount = 0;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.terrainWorker = this; window.terrainWorkerCount++;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.terrainStates.push(data);
          if (data.type === 'stats') window.terrainStats.push(data);
        });
      }
      postMessage(message, ...rest) {
        if (this === window.terrainWorker && message?.type === 'init') {
          message = structuredClone(message);
          Object.assign(message.ic, { lat_rad: 49.9116 * Math.PI / 180, lon_rad: 8.6348 * Math.PI / 180,
            alt_msl_m: 500, heading_rad: 183 * Math.PI / 180 });
        }
        return super.postMessage(message, ...rest);
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start')?.disabled && window.terrainStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  await page.locator('#start').click();
  await page.waitForFunction(() => window.terrainStates.at(-1)?.step > 20);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const stats = async () => {
    const count = await page.evaluate(() => window.terrainStats.length);
    await page.evaluate(() => window.terrainWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.terrainStats.length > n, count);
    return page.evaluate(() => window.terrainStats.at(-1));
  };
  const before = await stats(); assert(before.step > 0);
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('.practice-map-heading').click();
  await page.waitForTimeout(4000);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/map-terrain-standard.png` });
  const texture = page.getByRole('button', { name: 'Use map without labels as terrain texture' });
  await texture.click();
  await page.waitForFunction(() => {
    const d = document.querySelector('#scene').dataset;
    return d.mapTerrain === 'ready' && Number(d.mapTerrainLoaded) >= 20 && Number(d.mapTerrainQueued) === 0;
  }, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  assert.equal(await texture.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', { name: 'Show public map', exact: true }).getAttribute('aria-pressed'), 'true', 'terrain choice does not remove the normal flight-map background');
  await page.screenshot({ path: `${output}/map-terrain-cartography.png` });
  const shown = await page.locator('#scene').evaluate(e => ({ ...e.dataset }));
  assert(vectorResponses.length > 0, 'actual official vector data was received');
  assert.deepEqual(glyphRequests, [], 'label-free terrain never requests font glyphs');
  const after = await stats();
  assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  assert.equal(await page.evaluate(() => window.terrainWorkerCount), 1);
  await page.getByRole('button', { name: 'Show aerial imagery', exact: true }).click();
  assert.equal(await texture.getAttribute('aria-pressed'), 'true', '2D aerial choice does not silently reset terrain preference');
  await page.getByRole('button', { name: 'Show public map', exact: true }).click();
  await texture.click();
  await page.waitForFunction(() => document.querySelector('#scene').dataset.mapTerrain === 'off');
  await page.screenshot({ path: `${output}/map-terrain-restored.png` });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'pass', browser: browser.version(), position: [49.9116, 8.6348],
    vector_responses: vectorResponses.length, shown, checks: ['live label-free official terrain outside EDFE',
      'normal flight-map background retained', 'no font glyph requests', '2D imagery choice independent',
      'mode toggles preserve paused native step/digest/state and worker', 'standard/terrain/restored screenshots captured'] }, null, 2));
} finally { await browser?.close(); server.kill(); }
