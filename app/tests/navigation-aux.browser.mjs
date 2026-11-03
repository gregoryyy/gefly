import { installLegacyLabFixture, setLegacyLab, legacyLabEnabled } from './legacy-lab-fixture.mjs';
// Actual JSBSim state/configuration and native UI; no injected flight snapshots.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5204';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import {createServer} from 'vite';
 const s=await createServer({server:{host:'127.0.0.1',port:5204,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', c => { serverOutput += c; }); server.stderr.on('data', c => { serverOutput += c; });
const checks = [];
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (i === 99) throw new Error(serverOutput);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = window.Worker; window.__auxStates = []; window.__auxStats = [];
    window.Worker = class extends Native {
      constructor(...args) { super(...args); if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__auxWorker = this; this.addEventListener('message', event => {
          if (event.data?.type === 'state') window.__auxStates.push({ ...event.data });
          if (event.data?.type === 'stats') window.__auxStats.push(event.data);
        });
      }
    };
  });
  await installLegacyLabFixture(page); await installSceneryFixture(page); await page.goto(origin); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page);
  const stats = async () => {
    const count = await page.evaluate(() => window.__auxStats.length);
    await page.evaluate(() => window.__auxWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__auxStats.length > count, count);
    return page.evaluate(() => window.__auxStats.at(-1));
  };
  const frozen = (a, b) => { assert.equal(a.step, b.step); assert.equal(a.digest, b.digest); assert.deepEqual(a.final_state, b.final_state); };
  assert.equal(await page.locator('#bearing-gauge').getAttribute('data-valid'), 'false');
  assert(await page.locator('#bearing-gauge .nav-bearing-pointer').getAttribute('hidden') !== null);
  const initial = await page.evaluate(() => window.__auxStates.at(-1));
  assert.equal(await page.locator('#rpm-value').textContent(), String(Math.round(initial.prop_radps * 60 / (2 * Math.PI))));
  await setLegacyLab(page, true);
  await page.waitForFunction(() => Number(document.querySelector('#bearing-gauge').dataset.dmeNm) > 0);
  assert.equal(await page.locator('#bearing-gauge').getAttribute('data-valid'), 'false', 'overhead bearing is ambiguous while slant DME remains available');
  checks.push('LAB opt-in and station passage flag bearing without inventing a pointer; actual propeller RPM and slant DME remain distinct');

  await startOrResume(page);
  await page.waitForFunction(() => window.__auxStates.at(-1).step > 360 && document.querySelector('#bearing-gauge').dataset.valid === 'true');
  const captured = await page.evaluate(() => window.__auxStates.at(-1));
  await page.waitForTimeout(100); await page.locator('#pause').click();
  const paused = await stats(); await page.waitForTimeout(80);
  const bearing = await page.locator('#bearing-gauge').getAttribute('data-bearing-true-deg');
  const obs = await page.locator('#nav1-gauge-obs').textContent();
  await page.locator('#nav1-gauge-obs-up').click();
  await page.waitForFunction(previous => document.querySelector('#nav1-gauge-obs').textContent !== previous, obs);
  assert.equal(await page.locator('#bearing-gauge').getAttribute('data-bearing-true-deg'), bearing, 'OBS does not steer a station bearing');
  await page.locator('#nav1-swap').click();
  await page.waitForFunction(() => document.querySelector('#bearing-gauge').dataset.valid === 'false');
  frozen(paused, await stats());
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.locator('#review-time').evaluate((input, time) => { input.value = String(time); input.dispatchEvent(new Event('input', { bubbles: true })); }, captured.t_s + 1 / 480);
  await page.waitForFunction(step => document.querySelector('#navigation-gauges').dataset.step === String(step), captured.step);
  assert.equal(await page.locator('#bearing-gauge').getAttribute('data-valid'), 'true', 'selected recorded LAB configuration is used instead of the later live tuning');
  assert.equal(await page.locator('#rpm-value').textContent(), String(Math.round(captured.prop_radps * 60 / (2 * Math.PI))));
  assert(await page.locator('#nav1-gauge-obs-up').isDisabled());
  await page.locator('#review-time').focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('#bearing-gauge').dataset.valid === 'false');
  frozen(paused, await stats());
  await page.screenshot({ path: `${output}/navigation-aux-desktop.png` });
  checks.push('actual flight drives bearing/RPM; OBS is independent, tuning flags immediately, and Review recomputes the recorded configuration with physics frozen');

  await page.setViewportSize({ width: 390, height: 844 }); await page.reload();
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await prepareFlightUI(page, { controls: false });
  await page.locator('#view-menu > summary').click(); await page.locator('#navigation-open').click();
  assert.equal(await page.locator('#navigation-dialog .navigation-gauge').count(), 4);
  const bounds = await page.locator('#navigation-dialog').evaluate(element => {
    const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, scroll: element.scrollWidth, client: element.clientWidth };
  });
  assert(bounds.left >= 0 && bounds.right <= 390 && bounds.scroll <= bounds.client);
  const boxes = await Promise.all(['nav1-gauge', 'nav2-gauge', 'bearing-gauge', 'rpm-gauge'].map(id => page.locator(`#${id}`).boundingBox()));
  assert(Math.abs(boxes[0].y - boxes[1].y) < 1); assert(Math.abs(boxes[2].y - boxes[3].y) < 1);
  assert(boxes[2].y > boxes[0].y); assert(boxes[1].x > boxes[0].x);
  await page.screenshot({ path: `${output}/navigation-aux-mobile.png` });
  await page.locator('#navigation-close').click();
  await page.waitForFunction(() => document.activeElement === document.querySelector('#scene'));
  assert.deepEqual(errors, []);
  checks.push('fresh mobile NAV dialog carries all four faces in two rows with bounded width and working close/focus');
  await writeFile(`${output}/navigation-aux-browser.json`, `${JSON.stringify({ result: 'pass', checks, captured_step: captured.step, bounds }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} finally { await browser?.close(); server.kill(); }
