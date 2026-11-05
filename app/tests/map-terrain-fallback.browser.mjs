// Whole-scene failure regression: a failed cartographic service must retain the
// physical relief and selected display mode; it must not stop paused flight.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5257';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5257', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser, log = '';
server.stdout.on('data', b => { log += b; }); server.stderr.on('data', b => { log += b; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try { if (log.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(log);
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const Native = Worker; window.fallbackStats = [];
    window.Worker = class extends Native {
      constructor(...args) { super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.fallbackWorker = this;
        this.addEventListener('message', ({ data }) => { if (data.type === 'stats') window.fallbackStats.push(data); });
      }
    };
  });
  await installSceneryFixture(page);
  await page.route('**/scenery/osm/**', route => route.fulfill({ status: 502, body: '' }));
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start')?.disabled);
  await prepareFlightUI(page, { controls: false });
  const stats = async () => {
    const n = await page.evaluate(() => window.fallbackStats.length);
    await page.evaluate(() => window.fallbackWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.fallbackStats.length > n, n);
    return page.evaluate(() => window.fallbackStats.at(-1));
  };
  const before = await stats();
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('.practice-map-heading').click();
  await page.getByRole('button', { name: 'Use detailed OSM map as terrain texture' }).click();
  await page.waitForFunction(() => {
    const d = document.querySelector('#scene').dataset;
    return d.mapTerrain === 'degraded' && Number(d.mapTerrainFailed) > 0 && Number(d.mapTerrainQueued) === 0;
  }, null, { timeout: 60000 });
  const after = await stats();
  assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  assert.equal(await page.getByRole('button', { name: 'Show public map', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#scene').getAttribute('data-imagery-detail'), 'ready', 'starter photography remains present');
  assert.match(await page.locator('#imagery-status').textContent(), /Map terrain unavailable/);
  await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../../output/flight/map-terrain-fallback.png', import.meta.url)) });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'pass', browser: browser.version(), checks: ['blocked OSM service leaves photography assets and the selected Map control intact',
    'degraded status is explicit', 'failure does not advance or replace the paused native flight'] }, null, 2));
} finally { await browser?.close(); server.kill(); }
