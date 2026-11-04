import { installLegacyLabFixture, setLegacyLab, legacyLabEnabled } from './legacy-lab-fixture.mjs';
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
  // A real shortcut-to-panel-to-native path. Unlike the isolated panel fixture,
  // neither controller state nor aircraft telemetry is supplied by this test.
  const capturePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const captureErrors = [], captureEvidence = { gestures: [], rows: [] };
  capturePage.on('pageerror', error => captureErrors.push(String(error)));
  await capturePage.addInitScript(() => {
    const Native = Worker; window.kapA = null; window.kapARows = []; window.kapACommands = [];
    let bucket = -1;
    window.Worker = class extends Native {
      constructor(...args) {
        super(...args); if (!String(args[0]).includes('/sim/worker.js')) return;
        this.addEventListener('message', ({data}) => {
          if (data.type !== 'state') return;
          window.kapA = data;
          if (Math.floor(data.t_s) > bucket) {
            bucket = Math.floor(data.t_s);
            window.kapARows.push({t_s:data.t_s,step:data.step,pressure_altitude_m:data.kap_indicated_altitude_m,
              vs_fpm:-data.ground_down_mps*60/.3048,pitch_deg:data.pitch_rad*180/Math.PI,
              selected_altitude_m:data.kap_selected_altitude_m,vertical:data.kap_vertical,
              armed:data.kap_alt_arm,engaged:data.kap_engaged,throttle_norm:data.throttle_norm});
          }
        });
      }
      postMessage(message,...args) {
        if (message?.type === 'kap140' || message?.type === 'autopilot-capture') window.kapACommands.push(structuredClone(message));
        return super.postMessage(message,...args);
      }
    };
  });
  const observeCapture = async label => {
    const observation = await capturePage.evaluate(label => ({label,state:window.kapA,
      focus:document.activeElement?.id,engaged:document.querySelector('#ap-engaged-label').textContent,
      lateral:document.querySelector('#ap-lateral').textContent,vertical:document.querySelector('#ap-vertical').textContent,
      arm:document.querySelector('#ap-vertical-armed').textContent,
      armVisible:document.querySelector('#ap-vertical-armed').getBoundingClientRect().width>0
        && getComputedStyle(document.querySelector('#ap-vertical-armed')).visibility==='visible'
        && Number(getComputedStyle(document.querySelector('#ap-vertical-armed')).opacity)>0,
      button:document.querySelector('#ap-arm').textContent,value:document.querySelector('#ap-selector-value').value,
      unit:document.querySelector('#ap-selector-unit').textContent,readOnly:document.querySelector('#ap-selector-value').readOnly}),label);
    captureEvidence.gestures.push(observation); return observation;
  };
  try {
    await installSceneryFixture(capturePage); await capturePage.goto(origin);
    await capturePage.waitForFunction(() => !document.querySelector('#start').disabled && window.kapA?.kap_profile === 1,null,{timeout:60000});
    await capturePage.locator('#scene').focus(); await capturePage.keyboard.press('a');
    await capturePage.waitForFunction(() => window.kapA?.kap_engaged === 1 && window.kapA.kap_vertical === 1);
    const captured = await observeCapture('A captures HDG/ALT while paused');
    assert.equal(captured.lateral,'HDG'); assert.equal(captured.vertical,'ALT');
    assert.equal(captured.unit,'FT','A in ALT must leave altitude selection visible immediately, including while paused');
    assert.equal(captured.readOnly,false,'A in ALT must allow immediate altitude entry');
    const targetFeet = Math.ceil((captured.state.kap_indicated_altitude_m/.3048+1000)/100)*100;
    await capturePage.locator('#ap-selector-value').fill(String(targetFeet));
    assert.equal(await capturePage.evaluate(() => document.activeElement.id),'ap-selector-value');
    // The ALT click itself blurs/commits the typed altitude: do not pre-blur.
    await capturePage.locator('#ap-alt').click();
    await capturePage.waitForFunction(target => window.kapA?.kap_vertical === 0 && window.kapA.kap_alt_arm === 1
      && Math.abs(window.kapA.kap_selected_altitude_m-target)<1e-8
      && document.querySelector('#ap-selector-unit').textContent === 'FPM',targetFeet*.3048);
    const vs = await observeCapture('direct altitude entry then ALT enters VS and retains ALT ARM');
    assert.equal(vs.vertical,'VS'); assert.equal(vs.arm,'ALT ARM'); assert(vs.armVisible); assert.equal(vs.button,'ARMED');
    const initialFpm=vs.state.kap_vs_target_mps*60/.3048;
    assert(Math.abs(initialFpm)<.01,'paused initial fixture captures zero native VS');
    const rate = async (button,expected) => {
      await capturePage.locator(button).click();
      await capturePage.waitForFunction(expected => Math.abs(window.kapA.kap_vs_target_mps*60/.3048-expected)<.01
        && document.querySelector('#ap-selector-unit').textContent==='FPM'
        && Number(document.querySelector('#ap-selector-value').value)===Math.round(expected),expected);
    };
    for(let i=1;i<=5;i++) await rate('#ap-up',i*100);
    await rate('#ap-down',400); await rate('#ap-up',500);
    const selectedRate=await observeCapture('UP/DN shows confirmed 500 FPM with visible ALT ARM');
    assert.equal(selectedRate.arm,'ALT ARM'); assert(selectedRate.armVisible); assert.equal(selectedRate.vertical,'VS');
    await capturePage.locator('#throttle').focus(); await capturePage.keyboard.press('End');
    assert.equal(await capturePage.locator('#throttle').inputValue(),'100','pilot supplies full power; no autothrottle');
    await capturePage.locator('#scene').focus();
    for(let i=0;i<4;i++) await capturePage.keyboard.press('Equal');
    await capturePage.waitForFunction(() => window.kapA?.simulation_rate===10);
    await startOrResume(capturePage);
    await capturePage.waitForFunction(() => window.kapA?.t_s>=240,null,{timeout:60000});
    await capturePage.locator('#scene').focus(); await capturePage.keyboard.press('Space');
    await capturePage.waitForFunction(() => document.querySelector('#status').textContent==='Paused');
    captureEvidence.rows=await capturePage.evaluate(() => window.kapARows);
    const final=await observeCapture('after 240 simulation seconds and preselected capture');
    const climb=captureEvidence.rows.filter(row=>row.t_s>30&&row.t_s<90);
    assert(climb.length>=50,'actual native states cover the sustained climb interval');
    const mean=climb.reduce((sum,row)=>sum+row.vs_fpm,0)/climb.length;
    const range=[Math.min(...climb.map(row=>row.vs_fpm)),Math.max(...climb.map(row=>row.vs_fpm))];
    captureEvidence.metrics={mean_vs_fpm:mean,range_vs_fpm:range,final_error_m:final.state.kap_indicated_altitude_m-targetFeet*.3048,
      final_vs_fpm:-final.state.ground_down_mps*60/.3048,target_m:targetFeet*.3048};
    // Generic-servo engineering gates shared with kap140-climb-native.mjs,
    // not aircraft or installed KAP performance tolerances.
    assert(mean>400&&mean<600,`500 FPM climb mean ${mean}`);
    assert(range[1]-range[0]<150,`sustained surging ${JSON.stringify(range)}`);
    const capture=captureEvidence.rows.find(row=>row.t_s>0&&row.vertical===1);
    assert(capture&&capture.t_s<180,'actual preselected altitude captures by 180s');
    captureEvidence.metrics.capture_s=capture.t_s;
    assert(captureEvidence.rows.filter(row=>row.t_s>180).every(row=>row.vertical===1&&row.armed===0),'ALT stays captured with ARM cleared');
    assert(Math.abs(captureEvidence.metrics.final_error_m)<10,`settled altitude error ${captureEvidence.metrics.final_error_m}m`);
    assert(Math.abs(captureEvidence.metrics.final_vs_fpm)<30,`settled VS ${captureEvidence.metrics.final_vs_fpm}FPM`);
    assert.equal(final.vertical,'ALT'); assert.equal(final.arm,''); assert.equal(final.button,'ARM');
    assert.deepEqual(captureErrors,[]);
    captureEvidence.result='pass';
    checks.push('plain A permits immediate unblurred altitude entry; ALT/UP/DN visibly show confirmed VS/FPM/ALT ARM, and actual powered native climb/capture meets bounded engineering gates');
  } catch(error) { captureEvidence.result='fail'; captureEvidence.error=String(error); throw error; }
  finally {
    captureEvidence.commands=await capturePage.evaluate(() => window.kapACommands).catch(()=>[]);
    if(!captureEvidence.rows.length) captureEvidence.rows=await capturePage.evaluate(() => window.kapARows).catch(()=>[]);
    await capturePage.screenshot({path:`${output}/kap140-A-capture.png`}).catch(()=>{});
    await writeFile(`${output}/kap140-A-capture-browser.json`,JSON.stringify(captureEvidence,null,2)+'\n');
    await capturePage.close();
  }
  if(process.env.KAP_CAPTURE_ONLY==='1') console.log(JSON.stringify({result:'pass',checks,metrics:captureEvidence.metrics},null,2));
  else {
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
  await installLegacyLabFixture(page); await installSceneryFixture(page); await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.kapStates.at(-1)?.kap_profile === 1, null, { timeout: 60000 });
  await prepareFlightUI(page);
  const state = () => page.evaluate(() => window.kapStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.kapStats.length);
    await page.evaluate(() => window.kapWorker.postMessage({ type: 'stats' }));
    await page.waitForFunction(count => window.kapStats.length > count, count); return page.evaluate(() => window.kapStats.at(-1));
  };
  const frozen = (before, after) => { assert.equal(after.step, before.step); assert.equal(after.digest, before.digest); assert.deepEqual(after.final_state, before.final_state); };
  const fill = async (selector, value) => { await page.locator(selector).fill(String(value)); await page.locator('#ap-engage').focus(); };
  const initial = await state(), initialStats = await stats(); observations.initial = initial;
  await page.locator('#throttle').focus(); await page.keyboard.press('End');
  // Set the alert target while the selector page is visible, before engagement
  // displays captured VS for three simulation seconds.
  await fill('#ap-selector-value', (initial.kap_indicated_altitude_m + 1050 * .3048) / .3048);
  await page.locator('#ap-engage').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_engaged === 1);
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
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_alt_arm === 1 || window.kapStates.at(-1)?.kap_vertical === 1);
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

  await startOrResume(page);
  await page.locator('#ap-cws').hover(); await page.mouse.down();
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_cws === 1);
  const cwsStart = await state(); await page.keyboard.down('ArrowDown');
  await page.waitForFunction(step => window.kapStates.at(-1)?.step >= step + 180, cwsStart.step);
  const cwsFlight = await state();
  assert.equal(cwsFlight.kap_engaged, 1); assert.equal(cwsFlight.kap_cws, 1);
  assert.equal(cwsFlight.ap_mode, 0, 'CWS releases native roll servo without disengaging the KAP');
  assert.equal(cwsFlight.kap_elevator_norm, 0, 'CWS releases native pitch servo');
  assert(Math.abs(cwsFlight.pitch_rad - cwsStart.pitch_rad) > .01, 'held CWS permits actual hand-flown pitch motion');
  await page.keyboard.up('ArrowDown'); await page.mouse.up();
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_cws === 0 && window.kapStates.at(-1)?.kap_engaged === 1);
  const cwsReleased = await state();
  assert.equal(cwsReleased.kap_vertical, 1); assert.equal(cwsReleased.kap_lateral, cwsStart.kap_lateral);
  assert(Math.abs(cwsReleased.kap_hold_pressure_altitude_m - cwsReleased.kap_indicated_altitude_m) < 2);
  await page.locator('#pause').click();
  observations.cws = { before: cwsStart, handFlying: cwsFlight, released: cwsReleased };
  checks.push('live CWS holds modes while native servos release, keyboard yoke changes actual aircraft pitch, and release recaptures altitude without an override disconnect');
  await page.locator('#ap-cws').hover(); await page.mouse.down();
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_cws === 1);
  await page.keyboard.down('ArrowDown');
  await page.keyboard.press('r');
  await page.waitForFunction(() => window.kapStates.at(-1)?.kap_cws === 0);
  assert.equal((await state()).kap_engaged, 1, 'entering Review releases CWS after neutralizing live input');
  await page.keyboard.up('ArrowDown'); await page.mouse.up();
  await page.locator('#review-exit').click();
  await page.waitForFunction(() => document.querySelector('#radio-state-label')?.textContent === 'LIVE');
  checks.push('entering Review while CWS and yoke are held safely releases live inputs before replay blocks them');

  // The existing fictional LAB is the only live navigation service. Native
  // coupling uses its acknowledged worker configuration, not rendered CDI pixels.
  await setLegacyLab(page, true); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_nav_valid === 1);
  const radial = await page.evaluate(async () => {
    const { navigationIndication, DEFAULT_RADIO_NAV } = await import('/src/radio-nav.ts');
    return navigationIndication({ ...DEFAULT_RADIO_NAV, radio_demo_enabled: 1 }, window.kapStates.at(-1)).radial_true_deg;
  });
  assert(Number.isFinite(radial)); await fill('#nav-obs', Math.round(radial) % 360); await fill('#ap-heading-target', Math.round(radial) % 360);
  await page.waitForFunction(obs => window.kapStates.at(-1)?.radio_obs_deg === obs && window.kapStates.at(-1)?.radio_demo_enabled === 1, Math.round(radial) % 360);
  observations.before_nav = await state();
  await page.locator('#ap-nav').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 2).catch(async error => { throw new Error(`${error}\nNAV diagnostic ${JSON.stringify(await state())}`); });
  const vor = await state(); assert.equal(vor.kap_nav_kind, 1); assert.equal(vor.kap_gs_valid, 0); assert.equal(vor.kap_vertical, 1);
  assert(await page.locator('#ap-rev').isDisabled(), 'REV is not a VOR reciprocal mode');
  await page.locator('#ap-apr').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 3);
  assert.equal((await state()).kap_vertical, 1); assert.equal((await state()).kap_gs_arm, 0);
  await page.locator('#ap-nav').click(); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 2);
  await setLegacyLab(page, false); await page.waitForFunction(() => window.kapStates.at(-1)?.kap_lateral === 0 && window.kapStates.at(-1)?.kap_lateral_alert === 2);
  await page.waitForFunction(() => document.querySelector('#ap-lateral').textContent === 'ROL' && document.querySelector('#ap-lateral-alert').textContent === 'NAV');
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
  }
} catch (error) {
  await writeFile(`${output}/kap140-flight-browser.json`, JSON.stringify({ result: 'fail', checks, observations, error: String(error) }, null, 2) + '\n');
  throw error;
} finally { await browser?.close(); server.kill('SIGTERM'); }
