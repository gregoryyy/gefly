// Real browser reference-handbook access and frozen-simulation checks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5195';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import { createServer } from 'vite';
 const server = await createServer({ server: { host: '127.0.0.1', port: 5195, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
 await server.listen(); server.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [];
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (attempt === 99) throw new Error(`Handbook server timed out: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], sourceRequests = [];
  page.on('pageerror', error => errors.push(error.stack ?? String(error)));
  page.on('request', request => { if (/glasscockpitaviation|github\.com|\.pdf(?:$|\?)/.test(request.url())) sourceRequests.push(request.url()); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__handbookStats = []; window.__handbookWorkerCount = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__handbookWorker = this; window.__handbookWorkerCount++;
        this.addEventListener('message', event => { if (event.data?.type === 'stats') window.__handbookStats.push(event.data); });
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  const stats = async () => {
    const count = await page.evaluate(() => window.__handbookStats.length);
    await page.evaluate(() => window.__handbookWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__handbookStats.length > count, count);
    return page.evaluate(() => window.__handbookStats.at(-1));
  };
  const frozen = (a, b) => { assert.equal(b.step, a.step); assert.equal(b.digest, a.digest); assert.deepEqual(b.final_state, a.final_state); };
  const open = async () => {
    await page.locator('#view-menu > summary').click();
    await page.locator('#handbook-open').click();
    await page.locator('#aircraft-handbook').waitFor({ state: 'visible' });
  };
  await startOrResume(page);
  await page.waitForTimeout(350);
  await open();
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  assert.equal(await page.locator('#view-menu').getAttribute('open'), null);
  assert.equal(await page.locator('#aircraft-handbook').getAttribute('aria-labelledby'), 'handbook-title');
  assert.equal(await page.locator('#handbook-close').evaluate(e => e === document.activeElement), true);
  assert.equal(await page.locator('#aircraft-handbook svg[role=img]').count(), 4);
  assert.equal(await page.locator('#aircraft-handbook img').count(), 0);
  assert.equal(await page.locator('#handbook-cg-figure tbody tr').count(), 5);
  assert.equal(await page.locator('#handbook-speed-figure tbody tr').count(), 6);
  assert.equal(await page.locator('#handbook-gear-figure tbody tr').count(), 6);
  assert.equal(await page.locator('#handbook-envelope-figure polygon').count(), 0, 'reference guides never fabricate a filled approved envelope');
  const envelopeText = await page.locator('#handbook-envelope-figure').textContent();
  for (const fact of ['+3.80', '-1.52', '+3.00', '2400', '97', '99', '2000', '91', '92', '1600', '81', '82']) assert(envelopeText.includes(fact));
  assert.match(envelopeText, /complete stall\/gust envelope not established/);
  assert.match(envelopeText, /do not enclose or certify an operating region/);
  assert.match(await page.locator('#handbook-scope').textContent(), /generic JSBSim C172P.*planned C172S/s);
  assert.match(await page.locator('#handbook-cg-figure figcaption').textContent(), /1500 lb.*display crop.*not a certified minimum/s);
  const speedText = await page.locator('#handbook-speed-figure').textContent();
  for (const value of ['VS0', '46', 'VS1', '52', 'VFE10', '108', 'VNO', '123', 'VNE', '152']) assert(speedText.includes(value));
  assert.match(speedText, /KCAS/); assert.match(speedText, /not.*KIAS/s);
  for (const link of await page.locator('#aircraft-handbook a').all()) {
    assert((await link.getAttribute('href')).startsWith('https://'));
    assert.equal(await link.getAttribute('target'), '_blank'); assert.equal(await link.getAttribute('rel'), 'noreferrer');
  }
  const paused = await stats();
  await page.keyboard.press('r'); await page.keyboard.press('ArrowUp');
  assert(await page.locator('#aircraft-handbook').isVisible());
  await page.waitForTimeout(180); frozen(paused, await stats());
  await page.screenshot({ path: `${output}/handbook-desktop.png` });
  await page.keyboard.press('Escape'); await page.locator('#aircraft-handbook').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#scene').evaluate(e => e === document.activeElement), true);
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  frozen(paused, await stats());
  checks.push('View opens four local source-backed vector references, pauses flight, guards R, restores focus and never auto-resumes');

  await page.setViewportSize({ width: 390, height: 844 }); await open();
  const bounds = await page.locator('#aircraft-handbook').evaluate(e => {
    const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, client: e.clientWidth, scroll: e.scrollWidth, vertical: e.scrollHeight > e.clientHeight };
  });
  assert(bounds.left >= 0 && bounds.right <= 390 && bounds.top >= 0 && bounds.bottom <= 844);
  assert(bounds.scroll <= bounds.client, 'mobile handbook has no horizontal overflow'); assert(bounds.vertical, 'long mobile handbook scrolls vertically');
  for (const id of ['handbook-cg-figure', 'handbook-envelope-figure', 'handbook-speed-figure', 'handbook-gear-figure']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded(); assert(await page.locator(`#${id}`).isVisible());
    if (id === 'handbook-envelope-figure') await page.screenshot({ path: `${output}/handbook-mobile-envelope.png` });
  }
  await page.screenshot({ path: `${output}/handbook-mobile-gear.png` });
  await page.locator('#handbook-close').scrollIntoViewIfNeeded(); await page.locator('#handbook-close').click();
  frozen(paused, await stats());
  checks.push('390px dialog stays within viewport, scrolls all diagrams and closes with unchanged physics');

  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.locator('#flight-review').waitFor({ state: 'visible' });
  await page.locator('#review-play').click(); await page.waitForTimeout(120);
  await open(); assert.equal(await page.locator('#status').textContent(), 'Review');
  assert.equal(await page.locator('#review-play').textContent(), 'Play', 'handbook pauses Review playback');
  const reviewTime = await page.locator('#review-time').inputValue();
  await page.waitForTimeout(150); assert.equal(await page.locator('#review-time').inputValue(), reviewTime);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#review-play').textContent(), 'Play');
  assert.equal(await page.evaluate(() => window.__handbookWorkerCount), 1);
  frozen(paused, await stats());
  checks.push('Handbook pauses selected-state Review without seeking, restarting or resuming it');
  assert.deepEqual(sourceRequests, [], 'opening local diagrams never fetches source documents');
  assert.deepEqual(errors, []);
  await writeFile(`${output}/handbook-browser.json`, `${JSON.stringify({ result: 'pass', checks, bounds }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} finally {
  await browser?.close(); server.kill();
}
