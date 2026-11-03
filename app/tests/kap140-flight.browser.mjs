// Actual native aircraft + worker KAP controls. Generic servo behavior evidence,
// not installed KAP140 response calibration or real VOR/ILS validation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI, startOrResume } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5213';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5213,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let serverOutput = '', browser; const checks = [], observations = {};
server.stdout.on('data', value => { serverOutput += value; }); server.stderr.on('data', value => { serverOutput += value; });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `KAP flight server timed out: ${serverOutput}`); await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const u = new URL(request.url()); if (['http:', 'https:'].includes(u.protocol)) hosts.add(u.hostname); });
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.kapAudioContexts = []; window.kapWarningPcm = [];
    // Test-only native silent sink: real PCM/clock without host audio hardware.
    window.AudioContext = class extends NativeContext { constructor(...args) { super({ ...args[0], sinkId: { type: 'none' } }); window.kapAudioContexts.push(this); } };
    const nativeConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...args) {
      if (this instanceof OscillatorNode && this.frequency.value === 880) window.kapWarningGain = destination;
      if (this === window.kapWarningGain) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 512; window.kapWarningAnalyser = analyser;
        nativeConnect.call(this, analyser); nativeConnect.call(analyser, destination); return destination;
      }
      return nativeConnect.call(this, destination, ...args);
    };
    setInterval(() => {
      const analyser = window.kapWarningAnalyser;
      if (!analyser || analyser.context.state !== 'running') return;
      const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples);
      window.kapWarningPcm.push({ wall_ms: performance.now(), rms: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length) });
    }, 15);
    const NativeWorker = window.Worker; window.kapStates = []; window.kapStats = []; window.kapCommands = []; window.kapInputs = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return; window.kapWorker = this;
        this.addEventListener('message', ({ data }) => { if (data.type === 'state') window.kapStates.push(data); if (data.type === 'stats') window.kapStats.push(data); });
      }
      postMessage(message, ...args) {
        if (this === window.kapWorker && message?.type === 'kap140') window.kapCommands.push(message.command);
        if (this === window.kapWorker && message?.type === 'input') window.kapInputs.push(message);
        return super.postMessage(message, ...args);
      }
    };
  });
  await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.kapStates.at(-1)?.kap_profile === 1, null, { timeout: 60000 });
  await prepareFlightUI(page);
  const state = () => page.evaluate(() => window.kapStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.kapStats.length);
    await page.evaluate(() => window.kapWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.kapStats.length > count, count); return page.evaluate(() => window.kapStats.at(-1));
  };
  const frozen = (before, after) => { assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  const holdAP = async () => { await page.locator('#ap-engage').hover(); await page.mouse.down(); await page.waitForTimeout(320); await page.mouse.up(); };
  const fill = async (selector, value) => { await page.locator(selector).fill(String(value)); await page.locator('#ap-engage').focus(); };
  const initial = await state(), initialStats = await stats(); observations.initial = initial;
  // Set the alert target while the selector page is visible, before engagement
  // displays captured VS for three simulation seconds.
  await fill('#ap-selector-value', (initial.kap_indicated_altitude_m + 1050 * .3048) / .3048);
  await page.locator('#ap-engage').click(); assert.equal((await state()).kap_engaged, 0);
  await holdAP(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_engaged === 1);
  assert.equal((await state()).kap_lateral, 0); assert.equal((await state()).kap_vertical, 0);
  await page.locator('#ap-heading').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 1);
  await fill('#ap-heading-target', (initial.heading_rad * 180 / Math.PI + 20) % 360);
  await page.locator('#ap-alt').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_vertical === 1);
  const held = await state();
  await page.locator('#ap-selector-increase').click(); await page.waitForFunction(value => window.kapStates.at(-1)?.kap_selected_altitude_m > value + 30, held.kap_selected_altitude_m);
  const selected = await state(); assert.equal(selected.kap_hold_pressure_altitude_m, held.kap_hold_pressure_altitude_m); assert.equal(selected.kap_alt_arm, 1);
  await page.locator('#ap-selector-decrease').click();
  await page.waitForFunction(target => Math.abs(window.kapStates.at(-1)?.kap_selected_altitude_m - target) < 1e-8, held.kap_selected_altitude_m);
  await page.locator('#ap-baro').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_display_page === 2);
  await fill('#ap-selector-value', 1000); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_baro_setting_pa === 100000);
  const pressure = await state(); assert.equal(pressure.kap_hold_pressure_altitude_m, held.kap_hold_pressure_altitude_m); assert.equal(pressure.altimeter_setting_pa, initial.altimeter_setting_pa);
  frozen(initialStats, await stats()); observations.paused = { held, selected, pressure };
  await fill('#ap-selector-value', 1013.25); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_baro_setting_pa === 101325);
  // Disarm the preselector for the initial VS response; later we arm a target.
  await page.locator('#ap-arm').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_alt_arm === 0);
  await page.locator('#ap-alt').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_vertical === 0);
  const startVS = (await state()).kap_vs_target_mps;
  // ALT->VS displays the captured VS for three simulation seconds, so each tap
  // here is a real 100FPM change rather than the hidden-page first-press action.
  for (let i = 0; i < 5; i++) await page.locator('#ap-up').click();
  await page.waitForFunction(value => Math.abs(window.kapStates.at(-1)?.kap_vs_target_mps - value - 500 * .3048 / 60) < 1e-8, startVS);
  frozen(initialStats, await stats()); checks.push('paused AP/HDG/ALT, distinct selected/captured altitude, manual BARO and five100FPM VS taps change confirmed controller state without integrating native physics');

  assert.equal(await page.evaluate(() => window.kapAudioContexts.length), 0, 'AP and paused configuration keep sound off by default');
  await startOrResume(page); await page.locator('#scene').focus(); await page.keyboard.press('s');
  await page.waitForFunction(() => window.kapStates.at(-1)?.step >= 720, null, { timeout: 20000 });
  const climb = await state(); observations.climb = climb;
  assert.equal(climb.kap_engaged, 1); assert.equal(climb.kap_lateral, 1); assert.equal(climb.kap_vertical, 0);
  assert(climb.alt_msl_m > initial.alt_msl_m + 1 && -climb.ground_down_mps > .2, 'actual native VS channel produces an upward response');
  assert(Math.abs(climb.kap_elevator_norm) > 1e-5 && Math.abs(climb.heading_rad - initial.heading_rad) > .005, 'native elevator and lateral guidance both act');
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_alert_sequence === 1 && window.kapStates.at(-1)?.kap_alert_state === 1);
  assert(await page.locator('#ap-altitude-alert').isVisible());
  await page.waitForFunction(() => {
    const first = window.kapWarningPcm.find(frame => frame.rms > .001);
    return first && performance.now() > first.wall_ms + 1050;
  });
  const warningPcm = await page.evaluate(() => window.kapWarningPcm), pulses = warningPcm.reduce((count, frame, i) => count + (frame.rms > .001 && (!i || warningPcm[i - 1].rms <= .001) ? 1 : 0), 0);
  assert.equal(pulses, 5, 'actual native altitude-band crossing drives exactly five real warning pulses');
  assert.equal(await page.evaluate(() => window.kapAudioContexts.length), 1, 'alerter shares the original trusted engine/wind audio context');
  assert.equal(await page.evaluate(() => window.kapAudioContexts[0].sinkId?.type), 'none');
  observations.altitude_alert = { event: await state(), pulses, pcm_rms: warningPcm, audio_output: 'Native real-time silent sink; physical device/human listening not evaluated' };
  checks.push('actual native climb crosses the selected1000ft alert band, lights ALERT and plays exactly five original warning tones through the one user-enabled audio context');
  await fill('#ap-selector-value', (climb.kap_indicated_altitude_m + 15) / .3048);
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_alt_arm === 1);
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_vertical === 1 && window.kapStates.at(-1)?.kap_alt_arm === 0, null, { timeout: 15000 });
  const capture = await state(), captureStep = capture.step;
  assert(Math.abs(capture.kap_hold_pressure_altitude_m - capture.kap_selected_altitude_m) < 1e-8,
    'automatic ALT capture transfers to the selected pressure reference with standard AP BARO');
  await page.waitForFunction(step => window.kapStates.at(-1)?.step >= step + 960, captureStep, { timeout: 20000 });
  const altitude = await state(); observations.altitude = { capture, after: altitude,
    height_change_after_capture_m: altitude.alt_msl_m - capture.alt_msl_m,
    pressure_reference_error_m: altitude.kap_indicated_altitude_m - altitude.kap_hold_pressure_altitude_m, final_climb_mps: -altitude.ground_down_mps };
  assert.equal(altitude.kap_vertical, 1); assert.equal(altitude.kap_lateral, 1);
  assert.equal(altitude.kap_hold_pressure_altitude_m, capture.kap_hold_pressure_altitude_m);
  assert(Math.abs(altitude.ground_down_mps) < Math.abs(climb.ground_down_mps), 'actual ALT response reduces the prior climb rate');
  await page.locator('#pause').click(); await page.waitForTimeout(150);
  checks.push('actual native VS climb and simultaneous HDG change occur through two-axis guidance; selector arms then automatically captures ALT, clears ARM and reduces the observed climb');

  // The existing fictional LAB is the only live navigation service. Native
  // coupling uses its acknowledged worker configuration, not rendered CDI pixels.
  await page.locator('#nav-demo').check(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_nav_valid === 1);
  const radial = await page.evaluate(async () => {
    const { navigationIndication, DEFAULT_RADIO_NAV } = await import('/src/radio-nav.ts');
    return navigationIndication({ ...DEFAULT_RADIO_NAV, radio_demo_enabled: 1 }, window.kapStates.at(-1)).radial_true_deg;
  });
  assert(Number.isFinite(radial)); await fill('#nav-obs', Math.round(radial) % 360); await fill('#ap-heading-target', Math.round(radial) % 360);
  await page.locator('#ap-nav').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 2);
  const vor = await state(); assert.equal(vor.kap_nav_kind, 1); assert.equal(vor.kap_gs_valid, 0); assert.equal(vor.kap_vertical, 1);
  assert(await page.locator('#ap-rev').isDisabled(), 'REV is not a VOR reciprocal mode');
  await page.locator('#ap-apr').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 3);
  assert.equal((await state()).kap_vertical, 1); assert.equal((await state()).kap_gs_arm, 0);
  await page.locator('#ap-nav').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 2);
  await page.locator('#nav-demo').uncheck(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 0 && window.kapStates.at(-1)?.kap_lateral_alert === 2);
  assert.equal(await page.locator('#ap-lateral').textContent(), 'ROL'); assert.equal(await page.locator('#ap-lateral-alert').textContent(), 'NAV');
  assert.equal((await state()).kap_vertical, 1); observations.navigation = { vor, lost: await state() };
  checks.push('acknowledged fictional VOR configuration couples NAV/APR while ALT stays independent; unavailable GS is never captured, REV stays unavailable for VOR, signal loss confirms ROL with NAV flash');

  const beforeOverride = await stats(); await page.locator('#scene').focus(); await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_engaged === 0); await page.keyboard.up('ArrowRight'); frozen(beforeOverride, await stats());
  await startOrResume(page); const offStart = (await state()).step; await page.waitForFunction(step => window.kapStates.at(-1)?.step >= step + 60, offStart);
  await page.locator('#pause').click(); await page.waitForTimeout(150); const paused = await stats();
  await page.locator('#scene').focus(); await page.keyboard.press('r'); await page.locator('#flight-review').waitFor({ state: 'visible' });
  await page.locator('#review-time').focus(); await page.keyboard.press('End'); await page.waitForFunction(() => document.querySelector('#ap-state-label').textContent === 'REC' && document.querySelector('#ap-engaged-label').textContent === 'OFF');
  assert(await page.locator('#ap-engage').isDisabled()); assert(await page.locator('#ap-selector-value').isDisabled());
  const range = await page.locator('#review-time').boundingBox();
  await page.mouse.click(range.x + range.width * .4, range.y + range.height / 2);
  await page.waitForFunction(() => document.querySelector('#ap-engaged-label').textContent === 'AP');
  assert.equal(await page.locator('#ap-state-label').textContent(), 'REC');
  await page.locator('#scene').focus(); await page.keyboard.press('p'); frozen(paused, await stats());
  await page.screenshot({ path: `${output}/kap140-flight-review.png` });
  observations.review = { frozen_digest: paused.digest, selection_s: await page.locator('#review-time').inputValue() };
  checks.push('manual raw pilot override disconnects while paused without physics advance; Review restores captured engaged modes, blocks AP/P input and preserves native state/digest');
  assert.deepEqual(errors, []); assert.deepEqual([...hosts], ['127.0.0.1']);
  await writeFile(`${output}/kap140-flight-browser.json`, JSON.stringify({ result: 'pass', checks, observations }, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'pass', checks, observations }, null, 2));
} catch (error) {
  await writeFile(`${output}/kap140-flight-browser.json`, JSON.stringify({ result: 'fail', checks, observations, error: String(error) }, null, 2) + '\n');
  throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
