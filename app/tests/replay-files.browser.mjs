import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5237';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5237', '--strictPort'], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', c => { log += c; }); server.stderr.on('data', c => { log += c; });
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try { if (log.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw Error(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const Native = Worker; window.fileStates = []; window.fileStats = []; window.flightWorkerCount = 0;
    window.Worker = class extends Native { constructor(...args) { super(...args);
      if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
      window.fileWorker = this; window.flightWorkerCount++;
      this.addEventListener('message', ({ data }) => {
        if (data.type === 'state') window.fileStates.push(data);
        if (data.type === 'stats') window.fileStats.push(data);
      });
    } };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page, { controls: false });
  await startOrResume(page); await page.waitForFunction(() => window.fileStates.at(-1)?.step > 100);
  await page.locator('#scene').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const stats = async () => {
    const count = await page.evaluate(() => window.fileStats.length);
    await page.evaluate(() => window.fileWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.fileStats.length > n, count);
    return page.evaluate(() => window.fileStats.at(-1));
  };
  const before = await stats();
  await page.keyboard.press('m'); await page.locator('#map-overlap').waitFor({ state: 'visible' });
  const mapBottom = () => page.locator('#practice-map-panel').evaluate(p => p.getBoundingClientRect().bottom);
  const originalBottom = await mapBottom();
  await page.locator('#scene').focus(); await page.keyboard.press(',');
  assert.equal(await page.locator('#map-overlap').getAttribute('aria-pressed'), 'true');
  assert((await mapBottom()) > originalBottom + 100, 'comma extends the map over the cockpit');
  await page.keyboard.press('n'); assert.equal(await page.locator('#parking-brake').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('n'); await page.keyboard.press(',');
  assert.equal(await page.locator('#map-overlap').getAttribute('aria-pressed'), 'false');
  assert(Math.abs(await mapBottom() - originalBottom) < 1);
  await page.keyboard.press('m');

  await page.locator('#flight-menu > summary').click();
  const downloading = page.waitForEvent('download'); await page.locator('#save-recording').click();
  const download = await downloading;
  assert(download.suggestedFilename().endsWith('.json'));
  const json = await readFile(await download.path(), 'utf8'), saved = JSON.parse(json);
  assert.equal(saved.format, 'gefly-flight-recording'); assert.equal(saved.units, 'SI');
  assert(saved.samples.length > 2);
  assert(!Object.hasOwn(saved,'context'),'ordinary airborne recording does not invent runway context');
  await page.locator('#flight-menu > summary').click();
  await page.setInputFiles('#recording-file', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('Recording:'));
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  await page.setInputFiles('#recording-file', { name: 'flight.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.waitForFunction(() => document.querySelector('.runway-practice')?.hidden === true);
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  assert.equal(await page.locator('#review-time').getAttribute('max'), String(saved.samples.at(-1).state.t_s));
  await page.locator('#review-time').evaluate(input => { input.value = input.max; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const restored = await stats();
  assert.equal(restored.step, before.step); assert.equal(restored.digest, before.digest);
  assert.deepEqual(restored.final_state, before.final_state, 'import, seek and exit preserve the original live flight');

  await startOrResume(page);
  await page.waitForFunction(step => window.fileStates.at(-1).step > step + 20, before.step);
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const reviewing = await stats();
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying');
  await page.waitForFunction(step => window.fileStates.at(-1).step > step + 5, reviewing.step);
  assert.equal(await page.evaluate(() => window.flightWorkerCount), 1, 'Back to live resumes the same native worker');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'pass', checks: ['real flight JSON download/import/seek preserves frozen native state',
    'invalid JSON leaves the live flight unchanged', 'Back to live restores flying or paused intent using the same worker',
    'comma toggles map overlap while N retains parking brake'], samples: saved.samples.length }, null, 2));
} finally { await browser?.close(); server.kill(); }
