// Actual native telemetry and real UI; only background scenery pixels are fixtures.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5250';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5250,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let log = '', browser;
server.stdout.on('data', x => { log += x; }); server.stderr.on('data', x => { log += x; });
const checks = [];
try {
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(r => setTimeout(r, 100));
  assert(log.includes('Local:'), log);
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.warningStates = []; window.warningStats = []; window.warningWorkerId = 0;
    window.warningPanelEvents = [];
    addEventListener('DOMContentLoaded', () => {
      let signature = '';
      new MutationObserver(() => {
        const stall = document.querySelector('#flight-warnings [data-warning=stall]');
        const terrain = document.querySelector('#flight-warnings [data-warning=terrain]');
        if (!stall || !terrain) return;
        const next = `${window.warningWorkerId}/${stall.dataset.status}/${terrain.dataset.status}`;
        if (next === signature) return; signature = next;
        window.warningPanelEvents.push({ worker_id: window.warningWorkerId, stall: stall.dataset.status,
          terrain: terrain.dataset.status, text: stall.textContent, color: getComputedStyle(stall).color,
          state: window.warningStates.at(-1) });
        if (window.warningPanelEvents.length > 100) window.warningPanelEvents.shift();
      }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-status'] });
    }, { once: true });
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.warningWorker = this; const id = ++window.warningWorkerId;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') { window.warningStates.push({ ...data, worker_id: id }); if (window.warningStates.length > 5000) window.warningStates.shift(); }
          if (data.type === 'stats') window.warningStats.push(data);
        });
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.warningStates.length, null, { timeout: 60000 });
  await prepareFlightUI(page, { controls: false });
  const panel = page.locator('#flight-warnings'), scene = page.locator('#scene');
  const status = name => panel.locator(`[data-warning=${name}]`).getAttribute('data-status');
  const stats = async () => {
    const n = await page.evaluate(() => window.warningStats.length);
    await page.evaluate(() => window.warningWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(n => window.warningStats.length > n, n);
    return page.evaluate(() => window.warningStats.at(-1));
  };
  const frozen = async before => { const after = await stats(); assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  assert.equal(await status('stall'), 'clear'); assert.equal(await status('terrain'), 'clear');
  assert.equal(await panel.evaluate(e => getComputedStyle(e).pointerEvents), 'none');
  assert(await panel.isHidden());
  assert(await panel.locator('[data-warning=stall]').isHidden());
  assert(await panel.locator('[data-warning=terrain]').isHidden());
  const initial = await stats(); await page.locator('#controls-settings').click(); await page.locator('#settings-close').click(); await frozen(initial);
  checks.push('clear warnings leave no fixed labels or empty panel; paused Options preserve physics');

  await startOrResume(page); await page.waitForFunction(() => window.warningStates.at(-1).step >= 60);
  await page.locator('#pause').click(); await page.waitForTimeout(80);
  const paused = await stats();
  await scene.focus(); await page.keyboard.press('r'); await page.locator('#flight-review').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#flight-warnings').dataset.review === 'true');
  assert.equal(await panel.getAttribute('data-review'), 'true'); assert.match(await panel.textContent(), /REVIEW/);
  assert(await panel.isHidden(), 'clear replay cues leave no fixed REVIEW label');
  assert.match(await panel.getAttribute('aria-label'), /recomputed/);
  await page.locator('#review-time').focus(); await page.keyboard.press('End'); await frozen(paused);
  await scene.focus(); await page.keyboard.press('r'); await frozen(paused);
  checks.push('Review labels recomputed recorded-state cues and never advances actual paused flight');

  const preset = async name => {
    const id = await page.evaluate(() => window.warningWorkerId);
    await page.locator('#flight-menu > summary').click();
    if (!await page.locator('#flight-research').evaluate(element => element.open)) await page.locator('#flight-research > summary').click();
    await page.locator(`[data-landing=${name}]`).click();
    await page.waitForFunction(id => window.warningWorkerId > id && !document.querySelector('#start').disabled, id, { timeout: 60000 });
  };
  await preset('hard');
  const hard = await page.evaluate(() => window.warningStates.at(-1));
  assert(hard.ground_agl_m > 0 && hard.ground_agl_m < 4 && hard.ground_down_mps >= 3);
  await page.waitForFunction(() => document.querySelector('[data-warning=terrain]').dataset.status === 'active');
  assert(await panel.locator('[data-warning=terrain]').isVisible());
  assert(await panel.locator('[data-warning=stall]').isHidden());
  assert((await panel.boundingBox()).y >= (await page.locator('.topbar').boundingBox()).height);
  assert.match(await panel.textContent(), /TERRAIN !/); await frozen(await stats());
  await preset('normal');
  await page.waitForFunction(() => document.querySelector('[data-warning=terrain]').dataset.status === 'clear');
  assert.equal(await status('terrain'), 'clear', 'normal shallow native descent is not labeled as a terrain warning');
  assert(await panel.isHidden(), 'terrain cue disappears again when clear');
  await startOrResume(page);
  await page.waitForFunction(() => window.warningStates.at(-1).on_ground === 1 || window.warningStates.at(-1).collision_mask > 0, null, { timeout: 10000 });
  await page.waitForFunction(() => [...document.querySelectorAll('#flight-warnings [data-warning]')].every(e => e.dataset.status === 'clear'));
  checks.push('native steep-descent preset activates terrain, shallow descent stays clear, and real contact suppresses warnings');

  // Reset preserves a running flight's intent; pause the landing first.
  if ((await page.locator('#pause').textContent()).trim().startsWith('Pause')) await page.locator('#pause').click();
  const id = await page.evaluate(() => window.warningWorkerId);
  await page.locator('#flight-menu > summary').click(); await page.locator('#flight-research').evaluate(element => { element.open = true; }); await page.locator('#airborne-practice').click();
  await page.waitForFunction(id => window.warningWorkerId > id && !document.querySelector('#start').disabled, id, { timeout: 60000 });
  await startOrResume(page); await scene.focus(); await page.keyboard.press('0');
  await page.locator('#pitch-trim-control').focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => window.warningStates.at(-1).pitch_trim_norm === -1);
  await scene.focus();
  // Combine the existing scene-yoke and keyboard travel for a repeatable test
  // maneuver; no aircraft/model values or native state are replaced.
  const sceneBox = await scene.boundingBox();
  await page.mouse.click(sceneBox.x + sceneBox.width * .75, sceneBox.y + 130);
  await page.waitForFunction(() => document.querySelector('#scene').dataset.pointerMode === 'yoke');
  await page.mouse.move(sceneBox.x + sceneBox.width * .75, sceneBox.y + 285);
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => window.warningStates.at(-1).elevator_cmd_norm < -.7);
  try {
    await page.waitForFunction(() => window.warningPanelEvents.some(e => e.worker_id === window.warningWorkerId && e.stall === 'active'), null, { timeout: 20000 });
  } catch (error) {
    await mkdir(output, { recursive: true });
    const trace = await page.evaluate(() => ({ states: window.warningStates.slice(-800), mode: document.querySelector('#scene').dataset.pointerMode, status: document.querySelector('#pause').textContent, panel: window.warningPanelEvents, notice: document.querySelector('#notice').textContent }));
    await writeFile(`${output}/flight-warning-stall-diagnostic.json`, JSON.stringify(trace));
    throw error;
  }
  await page.keyboard.up('ArrowDown'); await page.keyboard.press('Space');
  const stall = await page.evaluate(() => window.warningStates.filter(s => s.stall_warning_norm > 0 && s.on_ground === 0).at(-1));
  assert(stall.stall_warning_norm > 0);
  const stallEvent = await page.evaluate(() => window.warningPanelEvents.filter(e => e.worker_id === window.warningWorkerId && e.stall === 'active').at(-1));
  assert.match(stallEvent.text, /STALL !/);
  checks.push('actual reduced-power nose-up trim/pull stress fixture produces native stall warning and the live STALL annunciator');
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await panel.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/flight-warning-panel-mobile.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/flight-warnings-browser.json`, JSON.stringify({ checks, hard, stall, stallEvent, browser: browser.version() }, null, 2));
  console.log(JSON.stringify({ checks, browser: browser.version() }, null, 2));
} finally { await browser?.close(); server.kill(); }
