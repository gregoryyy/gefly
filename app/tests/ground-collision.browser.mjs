// Actual Chrome/JSBSim fixed-step contact and stopped-flight UI. No injected impact telemetry.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5202';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import {createServer} from 'vite';
 const s=await createServer({server:{host:'127.0.0.1',port:5202,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});
 await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', c => { serverOutput += c; }); server.stderr.on('data', c => { serverOutput += c; });
const checks = [], observations = {};
const frozen = (before, after) => {
  assert.equal(after.step, before.step); assert.equal(after.digest, before.digest);
  assert.deepEqual(after.final_state, before.final_state);
};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Ground-collision server timed out: ${serverOutput}`);
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', e => errors.push(e.stack ?? String(e)));
  page.on('request', request => { const u = new URL(request.url()); if (['https:', 'http:'].includes(u.protocol)) hosts.add(u.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker; window.__NativeCollisionWorker = NativeWorker;
    window.__collisionStates = []; window.__collisionStats = []; window.__collisionMessages = []; window.__collisionInputs = [];
    window.__collisionWorkerId = 0; window.__collisionFixture = false;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__collisionWorker = this; const id = ++window.__collisionWorkerId;
        this.addEventListener('message', event => {
          const data = event.data;
          if (data?.type === 'state') window.__collisionStates.push({ ...data, __worker_id: id });
          if (data?.type === 'stats') window.__collisionStats.push(data);
          window.__collisionMessages.push(data);
        });
      }
      postMessage(message, ...rest) {
        if (this === window.__collisionWorker) {
          if (message?.type === 'input') window.__collisionInputs.push({ ...message });
          // Explicit supported initial-condition fixture: JSBSim still computes
          // every state/contact itself. This does not inject collision messages.
          if (message?.type === 'init' && window.__collisionFixture) message = { ...message, terrain: false, state_hz: 1000,
            ic: { ...message.ic, alt_msl_m: 30, tas_mps: 45 } };
        }
        return super.postMessage(message, ...rest);
      }
    };
    const NativeContext = window.AudioContext; window.__collisionContexts = []; window.__collisionAnalysers = [];
    window.AudioContext = class extends NativeContext { constructor(...args) { super(...args); window.__collisionContexts.push(this); } };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...rest) {
      if (destination === this.context.destination && window.__collisionContexts.includes(this.context)) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 8192; window.__collisionAnalysers.push(analyser);
        connect.call(this, analyser); connect.call(analyser, destination); return destination;
      }
      return connect.call(this, destination, ...rest);
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.__collisionStates.at(-1)?.collision_mask === 0);
  await prepareFlightUI(page);
  const state = () => page.evaluate(() => window.__collisionStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.__collisionStats.length);
    await page.evaluate(() => window.__collisionWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.__collisionStats.length > count, count);
    return page.evaluate(() => window.__collisionStats.at(-1));
  };
  const restart = async fixture => {
    const previous = await page.evaluate(fixture => { window.__collisionFixture = fixture; return window.__collisionWorkerId; }, fixture);
    if (!await page.locator('#flight-menu').evaluate(el => el.open)) await page.locator('#flight-menu > summary').click();
    await page.locator('#reset').click();
    await page.waitForFunction(previous => window.__collisionStates.at(-1)?.__worker_id > previous && !document.querySelector('#start').disabled, previous);
  };
  assert(await page.locator('#ground-collision-panel').isHidden());

  // Baseline unchanged native wheel physics, run as an independent real worker.
  const normal = await page.evaluate(async () => {
    const worker = new window.__NativeCollisionWorker('/studies/e1-browser/sim/worker.js', { type: 'module' });
    const frames = [];
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Normal-contact worker timed out')), 15000);
        worker.addEventListener('message', ({ data }) => {
          if (data.type === 'error') { clearTimeout(timeout); reject(new Error(data.message)); }
          if (data.type === 'state') frames.push(data);
          if (data.type === 'ready') {
            worker.postMessage({ type: 'input', step: 0, wall_ms: performance.timeOrigin + performance.now(),
              elevator: 0, aileron: -.109375, rudder: 0, throttle: 0 });
            worker.postMessage({ type: 'run', until_step: 600 });
          }
          if (data.type === 'stats') { clearTimeout(timeout); resolve({ frames, stats: data }); }
        });
        worker.postMessage({ type: 'init', aircraft: 'c172x', landing_preset: 'normal', ground_collision: true,
          dt_s: 1 / 120, state_hz: 120, ic: { lat_rad: 49.96 * Math.PI / 180, lon_rad: 8.643 * Math.PI / 180,
            heading_rad: 82 * Math.PI / 180 } });
      });
    } finally { worker.terminate(); }
  });
  assert.equal(normal.stats.step, 600, 'ordinary wheel contact continues through the requested fixed steps');
  assert(normal.frames.some(s => s.gear_left_wow || s.gear_right_wow || s.gear_nose_wow), 'actual wheel contact occurs');
  assert(normal.frames.every(s => s.collision_mask === 0), 'wheel contact alone never becomes a collision');
  observations.normal = { final: normal.frames.at(-1), stats: { step: normal.stats.step, digest: normal.stats.digest } };
  checks.push('actual wheel contact continues for 600 fixed steps without a collision');

  await restart(true);
  const initial = await state();
  assert.equal(initial.step, 0); assert.equal(initial.collision_mask, 0);
  const deckBefore = await page.locator('.flight-deck').boundingBox();
  await startOrResume(page);
  await page.keyboard.press('s');
  await page.waitForFunction(() => window.__collisionContexts.length === 1 && window.__collisionAnalysers.length > 0);
  await page.waitForFunction(() => {
    const context = window.__collisionContexts[0], analyser = window.__collisionAnalysers.at(-1);
    if (context.state !== 'running') return false;
    const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
    return Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length) > .001;
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__collisionStates.at(-1)?.collision_mask > 0);
  await page.keyboard.up('ArrowUp');
  await page.locator('#ground-collision-panel').waitFor({ state: 'visible', timeout: 5000 });
  const impact = await state(), stopped = await stats(); observations.impact = impact;
  assert(impact.collision_step > 0, 'contact is latched to a completed native fixed step');
  assert.equal(impact.step, impact.collision_step); assert.equal(impact.t_s, impact.collision_t_s);
  assert(impact.pitch_rad < 0 && impact.collision_down_mps > 0, 'native held push produces an actual descending nose-low impact');
  const beforeImpact = await page.evaluate(({ id, step }) => window.__collisionStates.filter(s => s.__worker_id === id && s.step < step).at(-1), { id: impact.__worker_id, step: impact.step });
  observations.beforeImpact = beforeImpact;
  if (beforeImpact.step === impact.step - 1) {
    assert.equal(impact.collision_down_mps, beforeImpact.ground_down_mps);
    assert.equal(impact.collision_groundspeed_mps, Math.hypot(beforeImpact.ground_forward_mps, beforeImpact.ground_side_mps));
  }
  const contacts = await page.evaluate(async id => {
    const { groundCollisionContact } = await import('/studies/e1-browser/sim/collision.js');
    return window.__collisionStates.filter(s => s.__worker_id === id).map(s => ({ step: s.step,
      expected: groundCollisionContact(s.ground_agl_m, s.roll_rad, s.pitch_rad, s.structure_contact_mask).mask, observed: s.collision_mask }));
  }, impact.__worker_id);
  assert(contacts.slice(0, -1).every(s => s.expected === 0 && s.observed === 0), 'all published pre-impact native frames remain clear');
  assert.equal(contacts.at(-1).expected, impact.collision_mask);
  assert(impact.collision_mask & (8 | 16 | 32 | 64), 'real geometry detects body/prop/fin/CG contact');
  assert.match(await page.locator('#collision-title').textContent(), /Ground collision.*flight stopped/);
  assert.equal(Number(await page.locator('#collision-time').getAttribute('data-value')), impact.collision_t_s);
  assert.equal(Number(await page.locator('#collision-down').getAttribute('data-value')), impact.collision_down_mps);
  assert.equal(await page.locator('#collision-groundspeed').textContent(), (impact.collision_groundspeed_mps * 3600 / 1852).toFixed(1));
  assert(await page.locator('#pause').isDisabled()); assert(await page.locator('#throttle').isDisabled());
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => window.__collisionContexts.length), 1, 'explicit S enabled the real audio context before impact');
  assert(await page.evaluate(() => window.__collisionAnalysers.length > 0), 'silence is measured from the actual engine graph');
  const waveform = await page.evaluate(() => {
    const context = window.__collisionContexts[0], analyser = window.__collisionAnalysers.at(-1);
    if (!context || !analyser || context.state !== 'running') return 0;
    const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
    return Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length);
  });
  assert(waveform < 1e-4, `collision silences actual native audio graph: ${waveform}`);
  const inputs = await page.evaluate(() => window.__collisionInputs.length);
  await page.locator('#scene').focus();
  for (const key of ['Space', 'q', '9', ']', 'ArrowDown']) await page.keyboard.press(key);
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => window.__collisionInputs.length), inputs, 'stopped flight ignores pilot controls');
  frozen(stopped, await stats());
  await page.evaluate(() => {
    const w = window.__collisionWorker, s = window.__collisionStates.at(-1);
    w.postMessage({ type: 'run' }); w.postMessage({ type: 'burst', steps: 100, blocks: 1 });
    w.postMessage({ type: 'input', step: s.step, wall_ms: performance.timeOrigin + performance.now(), elevator: 1, aileron: 1, rudder: 1, throttle: 1 });
  });
  await page.waitForFunction(() => ['run', 'burst', 'input'].every(command => window.__collisionMessages.some(m => m.type === 'collision-rejected' && m.command === command)));
  frozen(stopped, await stats());
  assert.equal((await page.locator('.flight-deck').boundingBox()).height, deckBefore.height, 'collision adds no cockpit height');
  checks.push('native nose-low contact latches fixed-step identity and motion; UI, audio and worker controls stay stopped');

  await page.locator('#collision-review').click();
  await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review === 'true');
  await page.locator('#ground-collision-panel').waitFor({ state: 'hidden' });
  assert(await page.locator('#ground-collision-panel').isHidden(), 'recorded initial state precedes latched collision');
  await page.locator('#review-time').focus(); await page.keyboard.press('End');
  await page.locator('#ground-collision-panel').waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await page.locator('#collision-title').textContent(), 'Recorded ground collision');
  assert(await page.locator('#collision-review').isDisabled()); frozen(stopped, await stats());
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('#collision-title').textContent.includes('flight stopped'));
  assert.match(await page.locator('#collision-title').textContent(), /flight stopped/);
  await page.locator('#scene').focus(); await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review === 'true');
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('.flight-app').dataset.review === 'false');
  assert(await page.locator('#pause').isDisabled()); frozen(stopped, await stats());
  await page.locator('#view-menu > summary').click(); await page.locator('#chase').click();
  assert.equal(await page.locator('#view-label').textContent(), 'CHASE VIEW');
  const scene = await page.locator('#scene').boundingBox();
  await page.mouse.move(scene.x + scene.width * .7, scene.y + scene.height * .7);
  await page.mouse.down(); await page.waitForTimeout(320);
  assert.equal(await page.locator('#scene').getAttribute('data-pointer-mode'), 'look', 'stopped-flight hold still enables camera inspection');
  await page.mouse.move(scene.x + scene.width * .75, scene.y + scene.height * .6); await page.mouse.up();
  frozen(stopped, await stats());
  checks.push('Review before/at collision and R preserve frozen live state; camera inspection remains usable');

  for (const [width, height] of [[1440, 900], [390, 844], [390, 568], [844, 390]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(180);
    const boxes = await page.evaluate(() => {
      const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
      return { collision: box('#ground-collision-panel'), review: box('#collision-review'), menu: box('#collision-flight-menu'),
        header: box('.topbar'), deck: box('.flight-deck'), scroll: document.documentElement.scrollWidth };
    });
    assert(boxes.collision.left >= 0 && boxes.collision.right <= width && boxes.scroll <= width, `${width}x${height} stays in viewport`);
    assert(boxes.collision.top >= boxes.header.bottom, `${width}x${height} preserves header`);
    assert(boxes.collision.bottom <= boxes.deck.top + 1, `${width}x${height} preserves instruments`);
    assert(boxes.review.bottom <= boxes.collision.bottom && boxes.menu.bottom <= boxes.collision.bottom,
      `${width}x${height} keeps stopped-flight actions visible without scrolling`);
    await page.screenshot({ path: `${output}/ground-collision-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#collision-flight-menu').click();
  assert(await page.locator('#flight-menu').evaluate(el => el.open));
  await page.evaluate(() => { window.__collisionFixture = false; });
  const previousWorker = await page.evaluate(() => window.__collisionWorkerId);
  await page.locator('#reset').click();
  await page.waitForFunction(previous => window.__collisionStates.at(-1)?.__worker_id > previous && !document.querySelector('#start').disabled, previousWorker);
  assert.equal((await state()).collision_mask, 0); assert.equal((await state()).step, 0);
  assert(await page.locator('#ground-collision-panel').isHidden()); assert(await page.locator('#throttle').isEnabled());
  await startOrResume(page); await page.waitForFunction(() => window.__collisionStates.at(-1)?.step > 10);
  assert.equal(await page.locator('#status').textContent(), 'Flying');
  await page.locator('#pause').click();
  checks.push('opaque banner fits desktop/mobile/landscape without hiding header/deck; Flight menu restart clears collision');

  // Presentation-only compatibility check: legacy groups remain unavailable,
  // never inferred from altitude or wheel state. No worker telemetry is altered.
  const compatibility = await page.evaluate(async () => {
    const { createGroundCollisionPanel } = await import('/src/ground-collision-panel.ts');
    const container = document.createElement('aside'); document.body.append(container);
    let reviewed = 0, menu = 0;
    const panel = createGroundCollisionPanel({ container, onReview() { reviewed++; }, onFlightMenu() { menu++; } });
    const actual = { ...window.__collisionStates.at(-1) };
    for (const key of ['collision_mask', 'collision_step', 'collision_t_s', 'collision_down_mps', 'collision_groundspeed_mps']) delete actual[key];
    panel.update(actual, false, true); const missingHidden = container.hidden;
    panel.update(null, false, false); const nullHidden = container.hidden;
    panel.dispose(); const empty = container.childElementCount === 0; container.remove();
    return { missingHidden, nullHidden, empty, reviewed, menu };
  });
  assert.deepEqual(compatibility, { missingHidden: true, nullHidden: true, empty: true, reviewed: 0, menu: 0 });
  assert.deepEqual(errors, []); assert.deepEqual([...hosts].sort(), ['127.0.0.1']);
  checks.push('missing legacy collision group stays hidden, panel disposal is clean and runtime uses local assets only');
  await writeFile(`${output}/ground-collision-browser.json`, JSON.stringify({ checks, observations }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, impact: observations.impact }, null, 2));
} catch (error) {
  const pages = browser?.contexts().flatMap(context => context.pages()) ?? [];
  if (pages[0]) console.error('Collision browser failure state:', await pages[0].evaluate(() => ({
    states: window.__collisionStates?.slice(-2), status: document.querySelector('#status')?.textContent,
    review: document.querySelector('.flight-app')?.dataset.review,
    slider: document.querySelector('#review-time') ? { value: document.querySelector('#review-time').value,
      min: document.querySelector('#review-time').min, max: document.querySelector('#review-time').max } : null,
  })).catch(() => null));
  throw error;
} finally { await browser?.close(); server.kill(); }
