// Actual JSBSim telemetry/Review wiring plus isolated presentation fixtures; no separation-fidelity claim.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startOrResume } from './flight-actions.mjs';
import { STALL_FIELDS } from '../src/types.ts';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5198';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import { createServer } from 'vite';
 const server = await createServer({ server: { host: '127.0.0.1', port: 5198, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
 await server.listen(); server.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const checks = [], observations = {};
const stationIds = ['left-inner', 'left-mid', 'left-outer', 'right-inner', 'right-mid', 'right-outer'];
// Independent expectation from the published reference line, actual body motion and CG.
function expectedAlpha(state, id) {
  const [side, region] = id.split('-'), fraction = { inner: 1 / 6, mid: 3 / 6, outer: 5 / 6 }[region];
  const structuralY = (side === 'left' ? -1 : 1) * fraction * 18 * .3048;
  const x = state.cg_structural_x_m - 43.2 * .0254, y = structuralY - state.cg_structural_y_m, z = state.cg_structural_z_m - 59.4 * .0254;
  return Math.atan2(state.aero_w_mps + state.aero_p_radps * y - state.aero_q_radps * x,
    state.aero_u_mps + state.aero_q_radps * z - state.aero_r_radps * y);
}
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) break; } catch {}
    if (attempt === 99) throw new Error(`Stall-awareness server timed out: ${serverOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack ?? String(error)));
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__stallStates = []; window.__stallStats = []; window.__stallInputs = []; window.__stallWorkerCount = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__stallWorker = this; window.__stallWorkerCount++;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') { window.__stallStates.push({ ...event.data }); if (window.__stallStates.length > 3000) window.__stallStates.shift(); }
          if (event.data?.type === 'stats') window.__stallStats.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__stallWorker && message?.type === 'input') window.__stallInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && Number.isFinite(window.__stallStates.at(-1)?.aero_alpha_max_rad));
  const initial = await page.evaluate(() => window.__stallStates.at(-1));
  assert(STALL_FIELDS.every(key => Number.isFinite(initial[key])), 'actual engine exports all atomic airflow fields');
  const stats = async () => {
    const count = await page.evaluate(() => window.__stallStats.length);
    await page.evaluate(() => window.__stallWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__stallStats.length > count, count);
    return page.evaluate(() => window.__stallStats.at(-1));
  };
  const frozen = (a, b) => { assert.equal(b.step, a.step); assert.equal(b.digest, a.digest); assert.deepEqual(b.final_state, a.final_state); };
  const open = async () => {
    await page.locator('#view-menu > summary').click(); await page.locator('#toggle-stall-awareness').click();
    await page.locator('#stall-awareness-panel').waitFor({ state: 'visible' });
  };
  const readings = () => page.locator('[data-stall-row]').evaluateAll(rows => Object.fromEntries(rows.map(row => [row.dataset.stallRow,
    { alpha_rad: Number(row.dataset.localAlphaRad), margin_rad: Number(row.dataset.referenceMarginRad), status: row.dataset.status }])));
  function actualReadings(actual, state) {
    for (const id of stationIds) {
      const expected = expectedAlpha(state, id);
      assert(Math.abs(actual[id].alpha_rad - expected) < 1e-12, `${id} reads actual local airflow at selected state`);
      assert(Math.abs(actual[id].margin_rad - (state.aero_alpha_max_rad - expected)) < 1e-12);
    }
  }
  await open(); await page.waitForFunction(() => document.querySelector('#stall-awareness-panel').dataset.status === 'available');
  assert.equal(await page.locator('[data-stall-region]').count(), 6);
  assert.equal(await page.locator('[data-stall-row]').count(), 6);
  assert.match(await page.locator('#stall-awareness-description').textContent(), /Positive AoA reference only.*Not measured separation/);
  assert.match(await page.locator('.stall-awareness-diagram').textContent(), /FUSELAGE UNKNOWN.*TAIL UNKNOWN/s);
  assert.equal(await page.locator('#stall-awareness-panel').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(20, 35, 43)', 'panel is opaque');
  actualReadings(await readings(), initial);
  const paused = await stats(), fov = await page.locator('#scene').getAttribute('data-fov-deg');
  await page.locator('#stall-awareness-panel').focus();
  await page.keyboard.press('r'); await page.keyboard.press('0'); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#status').textContent(), 'Paused');
  assert.equal(await page.evaluate(() => window.__stallWorkerCount), 1);
  await page.locator('#stall-awareness-panel').hover(); await page.mouse.wheel(0, 150);
  assert.equal(await page.locator('#scene').getAttribute('data-fov-deg'), fov);
  frozen(paused, await stats());
  await page.keyboard.press('Escape'); assert(await page.locator('#stall-awareness-panel').isHidden());
  assert.equal(await page.locator('#scene').evaluate(e => e === document.activeElement), true);
  checks.push('actual atomic airflow telemetry drives six accessible estimates; focused UI, scrolling and close preserve paused physics');

  await startOrResume(page); await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__stallStates.some(s => s.aero_p_radps > .08));
  await page.waitForTimeout(250);
  const captured = await page.evaluate(() => window.__stallStates.find(s => s.aero_p_radps > .08));
  await page.keyboard.press('Space'); await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  await open(); await page.waitForTimeout(80);
  const rollingState = await page.evaluate(() => window.__stallStates.at(-1)), liveReadings = await readings();
  actualReadings(liveReadings, rollingState);
  assert(Math.abs(liveReadings['right-outer'].alpha_rad - liveReadings['left-outer'].alpha_rad) > .005, 'actual roll rate produces visible regional difference');
  observations.roll = { p_radps: rollingState.aero_p_radps, left_outer_deg: liveReadings['left-outer'].alpha_rad * 180 / Math.PI, right_outer_deg: liveReadings['right-outer'].alpha_rad * 180 / Math.PI };
  await page.screenshot({ path: `${output}/stall-awareness-actual-roll.png` });
  const rollingPaused = await stats();
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  const seekTime = await page.evaluate(step => {
    const states = window.__stallStates, index = states.findIndex(s => s.step === step), current = states[index];
    const next = states.slice(index + 1).find(s => s.t_s > current.t_s);
    if (!next) throw new Error('Actual following frame required for an interior seek');
    const time = current.t_s + .4 * (next.t_s - current.t_s), input = document.querySelector('#review-time');
    input.value = String(time); input.dispatchEvent(new Event('input', { bubbles: true })); return time;
  }, captured.step);
  await page.waitForFunction(step => document.querySelector('#stall-awareness-panel').dataset.step === String(step), captured.step);
  assert.equal(await page.locator('#stall-awareness-mode').textContent(), 'RECORDED');
  actualReadings(await readings(), captured); frozen(rollingPaused, await stats());
  observations.review = { selected_step: captured.step, seek_time_s: seekTime };
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  const mobile = await page.locator('#stall-awareness-panel').evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }; });
  assert(mobile.x >= 0 && mobile.right <= 390 && mobile.y >= 0 && mobile.bottom <= 844);
  assert(mobile.scrollWidth <= mobile.clientWidth, 'mobile estimates and numeric table have no horizontal overflow');
  await page.locator('#stall-awareness-panel').evaluate(e => { e.scrollTop = 0; });
  await page.screenshot({ path: `${output}/stall-awareness-mobile-review.png` });
  frozen(rollingPaused, await stats());
  checks.push('actual roll separates left/right kinematic estimates; selected Review frame and mobile panel preserve all paused state');

  const fixture = await browser.newPage({ viewport: { width: 700, height: 850 } });
  fixture.on('pageerror', error => errors.push(error.stack ?? String(error)));
  await fixture.route(`${origin}/stall-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><section id="stall-awareness-panel"></section><script type="module">import {createStallAwarenessPanel} from '/src/stall-awareness-panel.ts'; window.fixture=createStallAwarenessPanel({container:document.querySelector('section'),onClose:()=>{}});</script></body></html>` }));
  await fixture.goto(`${origin}/stall-fixture.html`); await fixture.waitForFunction(() => !!window.fixture);
  const updateFixture = (state, recorded = false) => fixture.evaluate(([state, recorded]) => window.fixture.update(state, recorded), [state, recorded]);
  const base = { ...initial, aero_u_mps: 40, aero_v_mps: 0, aero_w_mps: 0, aero_p_radps: 0, aero_q_radps: 0, aero_r_radps: 0, stall_warning_norm: 1.5, stall_hysteresis_norm: 1 };
  for (const [ratio, status, text] of [[.5, 'below-reference', 'BELOW REF'], [.9, 'near-reference', 'NEAR REF'], [1.1, 'at-or-above-reference', 'AT REF']]) {
    const alpha = ratio * base.aero_alpha_max_rad;
    await updateFixture({ ...base, aero_alpha_rad: alpha, aero_w_mps: 40 * Math.tan(alpha) });
    assert.equal(await fixture.locator(`[data-stall-region][data-status="${status}"]`).count(), 6);
    assert.equal(await fixture.locator(`[data-stall-row][data-status="${status}"]`).count(), 6);
    assert((await fixture.locator('[data-stall-status]').allTextContents()).every(value => value === text));
    assert.equal(await fixture.locator('#stall-model-warning').textContent(), '1.50', 'raw worker warning is not clamped to 1');
    if (status === 'at-or-above-reference') await fixture.screenshot({ path: `${output}/stall-awareness-reference-fixture.png` });
  }
  for (const [patch, reason] of [[{ aero_u_mps: 0, aero_w_mps: 0 }, /reverse flow/], [{ aero_u_mps: .5 }, /below 1 m\/s/], [{ aero_u_mps: -10, aero_w_mps: 5 }, /reverse flow/]]) {
    await updateFixture({ ...base, ...patch });
    assert.equal(await fixture.locator('[data-stall-region][data-status=unavailable]').count(), 6);
    assert.match(await fixture.locator('#stall-awareness-status').textContent(), reason);
  }
  const legacy = { ...base }; for (const key of STALL_FIELDS) delete legacy[key];
  await updateFixture(legacy, true);
  assert.equal(await fixture.locator('[data-stall-row][data-status=unavailable]').count(), 6);
  assert.equal(await fixture.locator('#stall-awareness-mode').textContent(), 'RECORDED');
  for (const id of ['stall-global-alpha', 'stall-alpha-reference', 'stall-model-warning']) assert.equal(await fixture.locator(`#${id}`).textContent(), '—');
  assert((await fixture.locator('[data-stall-alpha]').allTextContents()).every(value => value === '—'));
  await fixture.close();
  checks.push('isolated UI fixtures expose below/near/at-reference numerically and by color, preserve raw warning, and mark missing/zero/low/reverse estimates unknown');
  assert.deepEqual(errors, []);
  await writeFile(`${output}/stall-awareness-browser.json`, `${JSON.stringify({ result: 'pass', checks, observations }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'pass', checks, observations }, null, 2));
} finally {
  await browser?.close(); server.kill();
}
