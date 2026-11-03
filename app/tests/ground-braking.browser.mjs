// Actual Chrome/WASM braking trajectories and production worker collision policy.
// These generic c172x regression fixtures do not validate aircraft braking limits.
// The public-terrain ground roll is a SYNTHETIC worker fixture: it posts terrain
// together with a landing preset, a combination app/src/session.ts never sends
// (production uses public terrain only for airborne starts). It checks worker
// collision policy over the public grid, not a flight users can reach.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
import { COCKPIT_FIELDS } from '../src/types.ts';

const app = fileURLToPath(new URL('..', import.meta.url));
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const origin = 'http://127.0.0.1:5211';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5211,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser;
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
const checks = [], observations = {};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Braking test server timed out: ${serverOutput}`);
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage(), errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const u = new URL(request.url()); if (['http:', 'https:'].includes(u.protocol)) hosts.add(u.hostname); });
  // A minimal local harness avoids involving the renderer or changing app input.
  await page.route(`${origin}/ground-braking-fixture.html`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Actual native braking regression</title>' }));
  await page.goto(`${origin}/ground-braking-fixture.html`);
  observations.braking = await page.evaluate(async () => {
    const { default: createModule } = await import('/studies/e1-browser/sim/dist/jsbsim.mjs');
    const { loadTerrainPackage } = await import('/studies/e1-browser/sim/terrain.js');
    const { groundFields } = await import('/studies/e1-browser/sim/cockpit.js');
    const grid = await loadTerrainPackage(), d = Math.PI / 180;
    const ic = { lat_rad: 49.96 * d, lon_rad: 8.643 * d, heading_rad: 82 * d };
    const rc = value => { if (value !== 0) throw new Error(`Native braking fixture rejected: ${value}`); };
    async function native(terrain, brake = .25, parking = false) {
      const M = await createModule();
      if (terrain) {
        const pointer = M._malloc(grid.physical_m.byteLength);
        try { M.HEAPF64.set(grid.physical_m, pointer / 8); rc(M._gf_configure_terrain_grid(grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad,
          grid.width, grid.height, pointer, grid.physical_m.length)); } finally { M._free(pointer); }
      }
      rc(M._gf_init_landing(1 / 120, ic.lat_rad, ic.lon_rad, ic.heading_rad, 1));
      rc(M._gf_set_inputs(0, -.109375, 0, 0)); rc(M._gf_set_secondary_inputs(0, 0));
      const frames = [];
      let maxNoseCompression = 0, minimumPitch = Infinity, nativeStructure = 0, parkingSpeed = null;
      for (let step = 1; step <= 3600; step++) {
        if (step === 241) rc(M._gf_set_secondary_inputs(0, brake));
        if (parking && step === 2567) {
          const gp = M._gf_ground_state() / 8;
          const g = groundFields(Array.from(M.HEAPF64.subarray(gp, gp + 18)));
          parkingSpeed = Math.hypot(g.ground_forward_mps, g.ground_side_mps);
          rc(M._gf_set_secondary_inputs(0, 1));
        }
        rc(M._gf_step());
        const sp = M._gf_state() / 8, gp = M._gf_ground_state() / 8;
        const s = Array.from(M.HEAPF64.subarray(sp, sp + 14));
        const ground = groundFields(Array.from(M.HEAPF64.subarray(gp, gp + 18)));
        if (![...s, ...Object.values(ground)].every(Number.isFinite)) throw new Error('Non-finite native braking state');
        maxNoseCompression = Math.max(maxNoseCompression, ground.gear_nose_compression_m);
        minimumPitch = Math.min(minimumPitch, s[5]); nativeStructure |= ground.structure_contact_mask;
        if (step % 12 === 0 || step === 1) frames.push({ step, t_s: s[0], pitch_rad: s[5], roll_rad: s[4], ...ground });
      }
      const pointer = M._gf_state() / 8;
      return { frames, parking_apply_speed_mps: parkingSpeed, max_nose_compression_m: maxNoseCompression, min_pitch_rad: minimumPitch, native_structure_mask: nativeStructure,
        final_state: Array.from(M.HEAPF64.subarray(pointer, pointer + 14)), digest: M.UTF8ToString(M._gf_digest_hex()) };
    }
    async function worker(terrain, impact = false, brake = .25, parking = false) {
      const w = new Worker('/studies/e1-browser/sim/worker.js', { type: 'module' });
      const frames = [], messages = [];
      try {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Actual worker braking timed out')), 20000);
          const input = (step, brake_norm) => w.postMessage({ type: 'input', step, wall_ms: performance.timeOrigin + performance.now(),
            elevator: impact ? .35 : 0, aileron: -.109375, rudder: 0, throttle: 0, flap_norm: 0, brake_norm });
          w.onmessage = ({ data }) => {
            messages.push(data.type);
            if (data.type === 'error') { clearTimeout(timer); reject(new Error(data.message)); }
            if (data.type === 'state') frames.push(data);
            if (data.type === 'ready') {
              input(0, 0);
              if (parking) { input(240, .25); input(2566, 1); }
              w.postMessage({ type: 'burst', steps: parking ? 3600 : impact ? 1200 : 240, blocks: 1 });
            }
            if (data.type === 'burst' && data.steps === 3600) w.postMessage({ type: 'stats' });
            if (data.type === 'burst' && data.steps === 240) { input(240, brake); w.postMessage({ type: 'burst', steps: 3360, blocks: 1 }); }
            if (data.type === 'burst' && data.steps === 3360) w.postMessage({ type: 'stats' });
            if (data.type === 'burst' && data.steps === 1200) w.postMessage({ type: 'stats' });
            if (data.type === 'stats') { clearTimeout(timer); resolve({ frames, stats: data, messages }); }
          };
          w.postMessage({ type: 'init', aircraft: 'c172x', terrain, ...(impact ? {} : { landing_preset: 'normal' }), ground_collision: true,
            dt_s: 1 / 120, state_hz: 120, ic: impact ? { ...ic, alt_msl_m: 30, tas_mps: 45 } : ic });
        });
      } finally { w.terminate(); }
    }
    const result = [];
    for (const terrain of [false, true]) result.push({ terrain, native: await native(terrain), worker: await worker(terrain) });
    return { normal: result, parking: { native: await native(false, .25, true), worker: await worker(false, false, .25, true) }, full_brake: await worker(false, false, 1), impact: await worker(false, true),
      // Synthetic public-terrain full-command case, compared with unchanged native dynamics.
      full_brake_public: { native: await native(true, 1), worker: await worker(true, false, 1) } };
  });
  // Write diagnostics before assertions so the first failing contact is retained.
  await writeFile(`${output}/ground-braking-browser.json`, JSON.stringify({ checks, observations }, null, 2) + '\n');
  for (const result of observations.braking.normal) {
    const { native, worker, terrain } = result;
    assert.equal(worker.stats.collision_mask, 0, `${terrain ? 'public' : 'flat'} selected 25% braking must not latch a crash`);
    assert.equal(worker.stats.step, 3600);
    assert.equal(native.native_structure_mask, 0, 'native model reports no tail/wing structure contact');
    assert(native.max_nose_compression_m > .1 && native.min_pitch_rad < -Math.PI / 180, 'fixture exercises real braking nose compression/pitch');
    assert(Math.hypot(native.frames.at(-1).ground_forward_mps, native.frames.at(-1).ground_side_mps) < .2, 'normal braked aircraft reaches rest');
    assert.equal(worker.stats.digest, native.digest, 'collision checks leave actual native braking dynamics unchanged');
    assert.deepEqual(worker.stats.final_state, native.final_state);
    checks.push(`${terrain ? 'synthetic public-terrain landing-preset fixture (not a production init)' : 'flat ground'}: actual selected 25% braking compresses nose gear and pitches down, reaches rest with no collision, and matches unchanged native dynamics`);
  }
  {
    const { native, worker } = observations.braking.parking;
    assert(native.parking_apply_speed_mps > 1.8 && native.parking_apply_speed_mps < 2.1);
    assert.equal(worker.stats.collision_mask, 0, 'parking near rest must not latch proxy contact');
    assert.equal(worker.stats.step, 3600);
    assert.equal(native.native_structure_mask, 0);
    assert.equal(worker.stats.digest, native.digest, 'settling tolerance never alters dynamics');
    assert.deepEqual(worker.stats.final_state, native.final_state);
    assert(Math.hypot(native.frames.at(-1).ground_forward_mps, native.frames.at(-1).ground_side_mps) < .1);
    checks.push('full parking braking near rest settles without false contact and matches native dynamics');
  }
  assert(observations.braking.full_brake.stats.collision_mask & 16, 'explicit full braking still permits the native geometry/illustrative prop contact; physics and collision are not weakened');
  checks.push('explicit full brake command retains propeller-contact detection');
  {
    const { native, worker } = observations.braking.full_brake_public, stats = worker.stats;
    if (stats.collision_mask) {
      // A latch stops the worker at its first contact step; native keeps rolling.
      assert(stats.collision_step >= 1 && stats.collision_step <= 3600 && stats.collision_step === stats.step);
      assert.equal(worker.frames.at(-1).collision_mask, stats.collision_mask);
    } else {
      assert.equal(stats.step, 3600); assert.equal(stats.digest, native.digest); assert.deepEqual(stats.final_state, native.final_state);
    }
    observations.full_brake_public_summary = { collision_mask: stats.collision_mask ?? null, collision_step: stats.collision_step ?? null, step: stats.step };
    checks.push('synthetic public-terrain full-brake fixture either latches a first-step contact or matches unchanged native dynamics');
  }
  const impact = observations.braking.impact.frames.at(-1), impactStats = observations.braking.impact.stats;
  assert(impact.collision_mask & 16, 'intentional nose-low descent still detects modeled propeller contact');
  assert(impact.pitch_rad < 0 && impact.collision_down_mps > 0);
  assert.equal(impact.collision_step, impact.step); assert.equal(impact.collision_t_s, impact.t_s);
  assert.equal(impactStats.step, impact.step); assert(impact.step > 0 && impact.step < 1200);
  checks.push('intentional actual nose-low descent still latches propeller contact at its first fixed step');
  const ui = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  ui.on('pageerror', error => errors.push(String(error)));
  ui.on('request', request => { const u = new URL(request.url()); if (['http:', 'https:'].includes(u.protocol)) hosts.add(u.hostname); });
  await ui.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.brakeInputs = []; window.brakeStates = []; window.brakeStats = []; window.brakeWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.brakeWorker = this; const id = ++window.brakeWorkerId;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.brakeStates.push({ ...data, worker_id: id });
          if (data.type === 'stats') window.brakeStats.push(data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.brakeWorker && message?.type === 'input') window.brakeInputs.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(ui); await ui.goto(origin);
  await ui.waitForFunction(() => !document.querySelector('#start').disabled && window.brakeStates.length > 0, null, { timeout: 60000 });
  await prepareFlightUI(ui);
  const stats = async () => {
    const n = await ui.evaluate(() => window.brakeStats.length);
    await ui.evaluate(() => window.brakeWorker.postMessage({ type: 'stats' }));
    await ui.waitForFunction(n => window.brakeStats.length > n, n);
    return ui.evaluate(() => window.brakeStats.at(-1));
  };
  const frozen = (before, after) => {
    assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state);
  };
  await ui.locator('#controls-settings').click();
  assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '25');
  assert.equal(await ui.locator('#sensitivity-brake').getAttribute('min'), '0');
  assert.equal(await ui.locator('#sensitivity-brake').getAttribute('max'), '100');
  await ui.locator('#settings-close').click(); await startOrResume(ui);
  await ui.waitForFunction(() => window.brakeStates.at(-1)?.step > 20);
  await ui.locator('#scene').focus(); await ui.keyboard.down('b');
  await ui.waitForFunction(() => window.brakeInputs.at(-1)?.brake_norm === .25);
  await ui.waitForFunction(() => window.brakeStates.at(-1)?.brake_left_norm === .25);
  await ui.keyboard.up('b'); await ui.waitForFunction(() => window.brakeInputs.at(-1)?.brake_norm === 0);
  await ui.locator('#wheel-brakes').hover(); await ui.mouse.down();
  await ui.waitForFunction(() => window.brakeInputs.at(-1)?.brake_norm === .25);
  await ui.mouse.up(); await ui.waitForFunction(() => window.brakeInputs.at(-1)?.brake_norm === 0);
  checks.push('actual app B and held brake button both send the visible default 25% native command, then release to zero');

  await ui.locator('#controls-settings').click(); await ui.waitForTimeout(150);
  const paused = await stats();
  await ui.locator('#sensitivity-brake').focus(); await ui.keyboard.press('Home');
  assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '0');
  await ui.keyboard.press('End'); assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '100');
  await ui.locator('#settings-gentle').click(); assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '25');
  await ui.locator('#sensitivity-brake').focus(); await ui.keyboard.press('End');
  await ui.locator('#settings-default').click(); assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '25');
  await ui.locator('#sensitivity-brake').focus(); await ui.keyboard.press('End');
  await ui.locator('#sensitivity-pitch').focus(); await ui.keyboard.press('ArrowRight');
  assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '100', 'axis-only changes preserve the selected brake command');
  await ui.screenshot({ path: `${output}/ground-braking-options.png` });
  frozen(paused, await stats());
  await ui.locator('#settings-close').click(); await ui.locator('#scene').focus(); await ui.keyboard.down('b');
  assert(await ui.locator('#wheel-brakes').evaluate(button => button.classList.contains('held')), 'paused controls remain selectable');
  await ui.keyboard.up('b'); frozen(paused, await stats());
  await startOrResume(ui); await ui.locator('#scene').focus(); await ui.keyboard.down('b');
  await ui.waitForFunction(() => window.brakeInputs.at(-1)?.brake_norm === 1);
  await ui.waitForFunction(() => window.brakeStates.at(-1)?.brake_left_norm === 1);
  await ui.keyboard.up('b'); await ui.locator('#pause').click();
  const oldWorker = await ui.evaluate(() => window.brakeWorkerId);
  await ui.locator('#flight-menu > summary').click(); await ui.locator('#reset').click();
  await ui.waitForFunction(id => window.brakeWorkerId > id && !document.querySelector('#start').disabled, oldWorker);
  await ui.locator('#controls-settings').click(); assert.equal(await ui.locator('#sensitivity-brake').inputValue(), '100', 'Flight restart preserves the session preference');
  await ui.locator('#settings-default').click(); await ui.locator('#settings-close').click();
  checks.push('Options exposes 0–100% brake input; both presets reset25%, axis edits and Flight restart preserve custom values, paused controls leave native state/digest unchanged, and explicit100% still reaches native brakes');

  await startOrResume(ui); await ui.waitForFunction(() => window.brakeStates.at(-1)?.step > 20);
  await ui.locator('#pause').click(); await ui.waitForTimeout(150);
  await ui.locator('#scene').focus(); await ui.keyboard.press('r'); await ui.locator('#flight-review').waitFor({ state: 'visible' });
  const review = await stats(), inputCount = await ui.evaluate(() => window.brakeInputs.length);
  assert(await ui.locator('#controls-settings').isDisabled()); assert(await ui.locator('#wheel-brakes').isDisabled());
  await ui.locator('#scene').focus(); await ui.keyboard.press('b');
  assert.equal(await ui.evaluate(() => window.brakeInputs.length), inputCount); frozen(review, await stats());
  observations.ui = { paused_digest: paused.digest, review_digest: review.digest, default_brake: .25, full_brake: 1 };
  checks.push('Review disables brake input/preferences and B leaves recorded/native state untouched');
  await ui.close();

  // Compatibility fixture: the real current worker still computes all native
  // values. Only its complete optional cockpit group is omitted at the session
  // delivery boundary, as an older runtime would omit it; no physics is mocked.
  const legacy = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  legacy.on('pageerror', error => errors.push(String(error)));
  legacy.on('request', request => { const u = new URL(request.url()); if (['http:', 'https:'].includes(u.protocol)) hosts.add(u.hostname); });
  await legacy.addInitScript(fields => {
    const NativeWorker = window.Worker;
    window.legacyRawStates = []; window.legacyDeliveredStates = []; window.legacyStats = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        window.legacyWorker = this;
        this.addEventListener('message', ({ data }) => {
          if (data.type === 'state') window.legacyRawStates.push(data);
          if (data.type === 'stats') window.legacyStats.push(data);
        });
      }
      set onmessage(handler) {
        super.onmessage = typeof handler !== 'function' ? handler : event => {
          if (this !== window.legacyWorker || event.data?.type !== 'state') { handler.call(this, event); return; }
          const data = { ...event.data };
          for (const field of fields) delete data[field];
          window.legacyDeliveredStates.push(data);
          handler.call(this, new MessageEvent('message', { data }));
        };
      }
      get onmessage() { return super.onmessage; }
    };
  }, [...COCKPIT_FIELDS]);
  await installSceneryFixture(legacy); await legacy.goto(origin);
  await legacy.waitForFunction(() => !document.querySelector('#start').disabled && window.legacyDeliveredStates.length > 0, null, { timeout: 60000 });
  await prepareFlightUI(legacy);
  await startOrResume(legacy); await legacy.waitForFunction(() => window.legacyDeliveredStates.at(-1)?.step > 20);
  await legacy.locator('#pause').click(); await legacy.waitForTimeout(150);
  const legacyStats = async () => {
    const count = await legacy.evaluate(() => window.legacyStats.length);
    await legacy.evaluate(() => window.legacyWorker.postMessage({ type: 'stats' }));
    await legacy.waitForFunction(count => window.legacyStats.length > count, count);
    return legacy.evaluate(() => window.legacyStats.at(-1));
  };
  const legacyPaused = await legacyStats();
  await legacy.locator('#scene').focus(); await legacy.keyboard.press('r'); await legacy.locator('#flight-review').waitFor({ state: 'visible' });
  await legacy.waitForFunction(() => document.querySelector('#wheel-brakes').getAttribute('aria-label') === 'Recorded wheel brakes unavailable');
  assert(await legacy.locator('#wheel-brakes').isDisabled());
  assert.match(await legacy.locator('#wheel-brakes').textContent(), /WHEEL —/);
  assert.doesNotMatch(await legacy.locator('#wheel-brakes').textContent(), /0%/);
  assert.match(await legacy.locator('#brake-state').textContent(), /unavailable/i);
  assert(await legacy.evaluate(fields => window.legacyRawStates.every(state => Number.isFinite(state.brake_left_norm) && Number.isFinite(state.brake_right_norm))
    && window.legacyDeliveredStates.every(state => fields.every(field => state[field] === undefined)), [...COCKPIT_FIELDS]),
  'compatibility fixture omits the whole optional group while retaining actual native worker computation');
  await legacy.locator('#scene').focus(); await legacy.keyboard.press('b'); frozen(legacyPaused, await legacyStats());
  observations.legacy_compatibility = { omitted_fields: COCKPIT_FIELDS, button_text: await legacy.locator('#wheel-brakes').textContent(),
    button_aria: await legacy.locator('#wheel-brakes').getAttribute('aria-label'), frozen_digest: legacyPaused.digest };
  checks.push('older-runtime compatibility fixture omits the complete cockpit group; Review shows disabled/unavailable brake command with a dash instead of0%, while actual native physics stays frozen');
  await legacy.close();
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  await writeFile(`${output}/ground-braking-browser.json`, JSON.stringify({ result: 'pass', checks, observations }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'pass', checks }, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
