// Real app/map with synthetic worker state messages to exercise >10 minutes instantly.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5248';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5248,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();`], { cwd: app, stdio: 'pipe' });
let browser, output = '';
const errors = [];
server.stdout.on('data', value => { output += value; });
server.stderr.on('data', value => { output += value; });
try {
  for (let i = 0; ; i++) {
    if (i === 100 || server.exitCode !== null) throw new Error(`Map server failed: ${output}`);
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.trackStates = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/sim/worker.js')) return;
        window.trackWorker = this;
        this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.trackStates.push(data); });
      }
    };
  });
  await page.route('**/src/practice-map.ts*', async route => {
    const response = await route.fetch(), source = await response.text();
    assert(source.includes('map = new LibreMap({'));
    await route.fulfill({ response, body: source.replace('map = new LibreMap({', 'map = window.__trackMap = new LibreMap({') });
  });
  await installSceneryFixture(page);
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.trackStates.length, null, { timeout: 60000 });
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.waitForFunction(() => window.__trackMap?.getSource('recorded-path'), null, { timeout: 60000 });
  // Each message retains a real validated worker snapshot; only simulation time,
  // step and geography are synthetic. No native dynamics are advanced here.
  const expected = await page.evaluate(() => {
    const initial = { ...window.trackStates.at(-1) };
    const origin = [initial.lon_rad * 180 / Math.PI, initial.lat_rad * 180 / Math.PI];
    for (let i = 1; i <= 130; i++) {
      const data = { ...initial, type: 'state', step: initial.step + i * 600,
        t_s: initial.t_s + i * 5, lon_rad: initial.lon_rad + i * 0.00001 };
      window.trackWorker.onmessage(new MessageEvent('message', { data }));
    }
    return { origin, firstRetainedLon: (initial.lon_rad + 10 * 0.00001) * 180 / Math.PI };
  });
  const path = () => page.evaluate(async () => (await window.__trackMap.getSource('recorded-path').getData()).features[0]?.geometry.coordinates ?? []);
  await page.waitForFunction(() => Number(document.querySelector('#practice-map-panel').dataset.pathPoints) >= 100, null, { timeout: 30000 });
  const live = await path();
  assert(live.length >= 100, 'live path keeps samples beyond the review window');
  assert(Math.abs(live[0][0] - expected.origin[0]) < 1e-8, 'true departure remains first');
  assert.equal(await page.locator('.practice-map-start').textContent(), 'Trace start');
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.practice-map-mode').textContent.includes('Recorded'), null, { timeout: 30000 });
  const review = await path();
  assert(review.length && review[0][0] >= expected.firstRetainedLon - 1e-8, 'review uses only retained recording');
  assert.equal(await page.locator('.practice-map-start').textContent(), 'Recording start');
  const downloading = page.waitForEvent('download');
  await page.locator('#review-save').click();
  const saved = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
  assert.equal(saved.clipped, true);
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.practice-map-mode').textContent.includes('Live'), null, { timeout: 30000 });
  const restored = await path();
  assert(Math.abs(restored[0][0] - expected.origin[0]) < 1e-8, 'returning to live restores actual departure');
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({state:'hidden'});
  await page.locator('#scene').focus(); await page.keyboard.press('m');
  await page.locator('#practice-map-panel').waitFor({state:'visible'});
  assert(Math.abs((await path())[0][0] - expected.origin[0]) < 1e-8, 'closing and reopening the map preserves track');
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review', null, {timeout:30000});
  const branchTime = saved.samples[Math.floor(saved.samples.length / 2)].state.t_s;
  await page.locator('#review-time').evaluate((input, time) => {
    input.value = String(time); input.dispatchEvent(new Event('input', {bubbles:true}));
  }, branchTime);
  await page.waitForFunction(() => !document.querySelector('#review-continue').disabled, null, {timeout:30000});
  await page.locator('#review-continue').click();
  await page.waitForFunction(() => document.querySelector('.practice-map-mode').textContent.includes('Live'), null, {timeout:60000});
  const branched = await path();
  assert(branched.length >= 2 && Math.abs(branched[0][0] - expected.origin[0]) < 1e-8, 'continuing live Review keeps original departure');
  assert(branched.at(-1)[0] < live.at(-1)[0], 'continuing trims the abandoned future path');
  // Imported recording belongs to a distinct route. Move it slightly, while
  // preserving the source state, to prove continuation cannot splice the old route.
  for (const sample of saved.samples) sample.state.lon_rad += 0.001;
  const importedStart = saved.samples[0].state.lon_rad * 180 / Math.PI;
  await page.setInputFiles('#recording-file', {name:'clipped.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review', null, {timeout:60000});
  await page.waitForFunction(() => !document.querySelector('#review-continue').disabled, null, {timeout:60000});
  await page.locator('#review-continue').click();
  await page.waitForFunction(() => document.querySelector('.practice-map-mode').textContent.includes('Live'), null, {timeout:60000});
  await page.waitForFunction(() => document.querySelector('.practice-map-start')?.textContent === 'Recording start', null, {timeout:30000});
  assert.equal(await page.locator('.practice-map-start').textContent(), 'Recording start', 'clipped imported continuation identifies its earliest known point');
  await page.waitForFunction(() => Number(document.querySelector('#practice-map-panel').dataset.pathPoints) >= 2, null, {timeout:30000});
  assert(Math.abs((await path())[0][0] - importedStart) < 1e-8, 'imported continuation does not splice unrelated live path');
  // The top bar may auto-hide during the resumed flight. Invoke the actual
  // reset control without making its visibility part of this history test.
  await page.locator('#reset').evaluate(button => button.click());
  await page.waitForFunction(() => !document.querySelector('#start').disabled
    && Number(document.querySelector('#practice-map-panel').dataset.pathPoints) <= 1, null, { timeout: 60000 });
  assert((await path()).length < 2, 'new flight clears the old track');
  assert.deepEqual(errors, []);
  console.log('PASS: live map retains departure beyond the replay window, Review uses its recording, map reopen retains the path and a new flight clears it.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
