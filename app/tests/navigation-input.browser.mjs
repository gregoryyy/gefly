import { startOrResume } from './flight-actions.mjs';
// Actual pointer/keyboard gestures against the application and research worker.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5184';
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url));
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['--input-type=module', '-e', `import { createServer } from 'vite';
  const server = await createServer({ server: { host: '127.0.0.1', port: 5184,
    strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
  await server.listen(); server.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', value => { serverOutput += value; });
server.stderr.on('data', value => { serverOutput += value; });
const checks = [], observations = {};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, serverOutput);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__navigationStats = [];
    window.__navigationClicks = [];
    window.__navigationFocusEvents = [];
    window.addEventListener('blur', () => window.__navigationFocusEvents.push('blur'));
    document.addEventListener('visibilitychange', () => window.__navigationFocusEvents.push(document.visibilityState));
    document.addEventListener('click', event => {
      const button = event.target instanceof Element && event.target.closest('button[data-receiver][data-delta]');
      if (!button || !button.closest('.navigation-gauges-content') || event.detail === 0) return;
      const input = document.querySelector(button.dataset.receiver === '1' ? '#nav-obs' : '#nav2-obs');
      const before = input.value;
      // Observe the real click within its task; repeat timers cannot race this
      // capture-to-microtask comparison as they can two Playwright round trips.
      queueMicrotask(() => window.__navigationClicks.push({ before, after: input.value }));
    }, true);
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__navigationWorker = this;
        this.addEventListener('message', event => { if (event.data?.type === 'stats') window.__navigationStats.push(event.data); });
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await startOrResume(page);
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying');
  const field = receiver => page.locator(receiver === 1 ? '#nav-obs' : '#nav2-obs');
  const obs = async receiver => Number(await field(receiver).inputValue());
  const setObs = async (receiver, value) => {
    await field(receiver).fill(String(value)); await page.keyboard.press('Tab');
    await page.waitForFunction(({ receiver, value }) => Number(document.querySelector(receiver === 1 ? '#nav-obs' : '#nav2-obs').value) === value, { receiver, value });
  };
  const center = async selector => { const b = await page.locator(selector).boundingBox(); assert(b); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const down = async selector => { const p = await center(selector); await page.mouse.move(p.x, p.y); await page.mouse.down(); return p; };
  const drag = async (selector, dx) => { const p = await down(selector); await page.mouse.move(p.x + dx, p.y, { steps: 4 }); await page.mouse.up(); };
  const stats = async () => {
    const count = await page.evaluate(() => window.__navigationStats.length);
    await page.evaluate(() => window.__navigationWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__navigationStats.length > count, count);
    return page.evaluate(() => window.__navigationStats.at(-1));
  };

  await setObs(1, 359); await setObs(2, 25);
  await page.locator('#nav1-gauge-obs-up').click(); assert.equal(await obs(1), 0);
  await page.locator('#nav1-gauge-obs-down').click(); assert.equal(await obs(1), 359);
  assert.equal(await obs(2), 25);
  checks.push('single pointer clicks are one degree and wrap without a second release step');

  await setObs(1, 0); await down('#nav1-gauge-obs-up');
  assert.equal(await obs(1), 1);
  await page.waitForTimeout(430); const beforeRelease = await obs(1);
  assert(beforeRelease > 1);
  const clicks = await page.evaluate(() => window.__navigationClicks.length);
  await page.mouse.up(); await page.waitForFunction(count => window.__navigationClicks.length > count, clicks);
  const releaseClick = await page.evaluate(() => window.__navigationClicks.at(-1));
  assert.equal(releaseClick.after, releaseClick.before, 'native click after hold does not add a release step');
  const released = await obs(1); await page.waitForTimeout(250); assert.equal(await obs(1), released);
  await setObs(1, 0); await down('#nav1-gauge-obs-up');
  await page.waitForTimeout(750); const early = await obs(1);
  await page.waitForTimeout(700); const middle = await obs(1);
  await page.waitForTimeout(700); const late = await obs(1);
  await page.mouse.move(1200, 150); await page.mouse.up();
  const stopped = await obs(1); await page.waitForTimeout(300); assert.equal(await obs(1), stopped);
  assert(early >= 2 && middle - early > early - 1, 'second interval accelerates beyond one-degree repetition');
  assert(late - middle > middle - early, 'later interval reaches the faster repeat tier');
  assert.equal(await obs(2), 25);
  observations.hold = { early, middle, late, stopped };
  checks.push('held buttons accelerate, preserve receiver isolation and stop after captured outside release');

  await setObs(1, 359); await drag('#nav1-gauge .navigation-gauge-face', 12); assert.equal(await obs(1), 2);
  await drag('#nav1-gauge .navigation-obs-knob', -40); assert.equal(await obs(1), 352);
  await drag('#nav2-gauge .navigation-gauge-face', 80); assert.equal(await obs(2), 45); assert.equal(await obs(1), 352);
  const knob = page.locator('#nav2-gauge .navigation-obs-knob');
  await knob.focus(); await page.keyboard.press('ArrowRight'); assert.equal(await obs(2), 46);
  await page.keyboard.press('Shift+ArrowLeft'); assert.equal(await obs(2), 36);
  assert.equal(await page.locator('#pitch-control').textContent(), '0.00');
  observations.drag = { nav1: await obs(1), nav2: await obs(2) };
  checks.push('face and knob drags use incremental integer degrees across north; keyboard arrows and Shift preserve flight axes');

  await page.setViewportSize({ width: 3000, height: 900 }); await page.waitForTimeout(100);
  await setObs(1, 10);
  const singleStart = await down('#nav1-gauge .navigation-gauge-face');
  await page.mouse.move(singleStart.x + 1560, singleStart.y); await page.mouse.up();
  const batched = await obs(1);
  await setObs(1, 10);
  const longStart = await down('#nav1-gauge .navigation-gauge-face');
  await page.mouse.move(longStart.x + 1560, longStart.y, { steps: 39 }); await page.mouse.up();
  assert.equal(batched, 40, '390-degree captured drag retains its 30-degree remainder');
  assert.equal(await obs(1), batched, 'one large displacement and many events select the same course');
  assert.equal(await obs(2), 36, 'long captured drag leaves the other receiver unchanged');
  observations.long_drag = { pixels: 1560, degrees: 390, start: 10, batched, incremental: await obs(1) };
  checks.push('captured long drags preserve whole turns and are independent of pointer event batching');
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(100);

  await down('#nav1-gauge-obs-up'); await page.waitForTimeout(430);
  await page.keyboard.press('Tab'); const focusOutObs = await obs(1);
  await page.waitForTimeout(500); assert.equal(await obs(1), focusOutObs, 'real keyboard focus loss cancels repeat');
  await page.mouse.up();
  observations.focus_cancellation = 'OBS button loses focus through a real Tab key while pointer remains held';
  observations.window_blur_and_hidden = 'Not evaluated: headless Chrome did not emit window blur or hide the document when another page was activated. Source handlers use the same tested cancellation path.';
  await page.locator('#pause').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
  const pausedObs = await obs(1), paused = await stats();
  await drag('#nav1-gauge .navigation-gauge-face', 80); assert.equal(await obs(1), (pausedObs + 20) % 360);
  await page.locator('#nav1-gauge .navigation-obs-knob').focus(); await page.keyboard.press('Shift+ArrowRight');
  assert.equal(await obs(1), (pausedObs + 30) % 360);
  assert(await page.locator('#nav1-gauge-obs-up').isEnabled());
  await page.locator('#nav1-gauge-obs-up').click(); assert.equal(await obs(1), (pausedObs + 31) % 360);
  const configuredPaused = await stats();
  assert.equal(configuredPaused.step, paused.step); assert.equal(configuredPaused.digest, paused.digest);
  assert.deepEqual(configuredPaused.final_state, paused.final_state);
  observations.paused_configuration = { initial_obs: pausedObs, configured_obs: await obs(1),
    engine_step_before: paused.step, engine_step_after: configuredPaused.step, digest_unchanged: true };
  checks.push('real element focus loss stops turning; paused drag, keyboard and button changes preserve worker state and digest');

  await page.locator('#review-flight').click(); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Review');
  await page.waitForFunction(() => document.querySelector('#navigation-gauges').dataset.mode === 'recorded');
  const recorded = await obs(1);
  await drag('#nav1-gauge .navigation-gauge-face', 100); assert.equal(await obs(1), recorded);
  await page.locator('#nav1-gauge .navigation-obs-knob').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await obs(1), recorded);
  assert(await page.locator('#nav2-gauge-obs-down').isDisabled());
  const reviewed = await stats(); assert.equal(reviewed.step, paused.step); assert.equal(reviewed.digest, paused.digest); assert.deepEqual(reviewed.final_state, paused.final_state);
  await page.locator('#review-exit').click();
  checks.push('review remains read-only and its live worker state/digest stays frozen');

  await startOrResume(page); await page.waitForFunction(() => document.querySelector('#status').textContent === 'Flying');
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
  await page.locator('#view-menu > summary').click(); await page.locator('#navigation-open').click();
  const mobileBefore = Number((await page.locator('#nav2-gauge-obs').textContent()).replace('°', ''));
  await drag('#nav2-gauge .navigation-obs-knob', 20);
  await page.waitForFunction(expected => Number(document.querySelector('#nav2-gauge-obs').textContent.replace('°', '')) === expected, (mobileBefore + 5) % 360);
  await down('#nav2-gauge-obs-up'); await page.waitForTimeout(430); await page.mouse.move(350, 100); await page.mouse.up();
  const mobileStopped = await page.locator('#nav2-gauge-obs').textContent(); await page.waitForTimeout(250); assert.equal(await page.locator('#nav2-gauge-obs').textContent(), mobileStopped);
  await page.screenshot({ path: `${output}/navigation-input-mobile.png` });
  await page.locator('#navigation-close').click();
  checks.push('mobile NAV portal supports captured drag, accelerated hold and outside release');
  assert.deepEqual(errors, []);
  const evidence = { result: 'pass', browser: browser.version(), checks, observations };
  await writeFile(`${output}/navigation-input-browser.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
