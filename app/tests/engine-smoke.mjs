// Actual Chrome/JSBSim engine and basic-autopilot regression, not handling validation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const app = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:5178';
const output = fileURLToPath(new URL('../../output/flight/', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))
  .catch(() => { throw new Error('Build the local research engine first: just build-flight-engine'); });
await mkdir(output, { recursive: true });
const server = spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'],
  { cwd: app, stdio: 'pipe' });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
let browser;
const checks = [], observations = {};
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Engine test server failed: ${serverOutput}`);
    try { if (serverOutput.includes('Local:') && (await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, `Engine test server timed out: ${serverOutput}`);
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' }) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], hosts = new Set();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { const url = new URL(request.url()); if (['http:', 'https:'].includes(url.protocol)) hosts.add(url.hostname); });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__engineStates = []; window.__engineStats = []; window.__engineBursts = [];
    window.__engineInputs = []; window.__engineWorkerId = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/studies/e1-browser/sim/worker.js')) return;
        window.__engineWorker = this; const id = ++window.__engineWorkerId;
        this.addEventListener('message', event => {
          if (event.data?.type === 'state') {
            window.__engineStates.push({ ...event.data, __worker_id: id });
            if (window.__engineStates.length > 2000) window.__engineStates.shift();
          }
          if (event.data?.type === 'stats') window.__engineStats.push(event.data);
          if (event.data?.type === 'burst') window.__engineBursts.push(event.data);
        });
      }
      postMessage(message, ...args) {
        if (this === window.__engineWorker && message?.type === 'input') window.__engineInputs.push({ ...message });
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector('#start').disabled && window.__engineStates.at(-1)?.prop_radps > 0);
  const state = () => page.evaluate(() => window.__engineStates.at(-1));
  const stats = async () => {
    const count = await page.evaluate(() => window.__engineStats.length);
    await page.evaluate(() => window.__engineWorker.postMessage({ type:'stats' }));
    await page.waitForFunction(count => window.__engineStats.length > count, count);
    return page.evaluate(() => window.__engineStats.at(-1));
  };
  const pause = async () => {
    if (await page.locator('#status').textContent() === 'Flying') await page.locator('#pause').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Paused');
    return stats();
  };
  const resume = async () => {
    const before = await stats(); await page.locator('#start').click();
    await page.waitForFunction(step => window.__engineStates.at(-1).step > step, before.step);
  };
  const burst = async steps => {
    const before = await stats(); const count = await page.evaluate(() => window.__engineBursts.length);
    await page.evaluate(steps => window.__engineWorker.postMessage({ type:'burst', steps, blocks:1 }), steps);
    await page.waitForFunction(count => window.__engineBursts.length > count, count);
    // Burst measures actual fixed-step work but emits no state. Re-publishing the
    // unchanged pressure setting exposes the real resulting state without a step.
    await page.evaluate(() => window.__engineWorker.postMessage({ type:'altimeter', setting_pa:window.__engineStates.at(-1).altimeter_setting_pa }));
    await page.waitForFunction(step => window.__engineStates.at(-1).step === step, before.step + steps);
    return state();
  };
  const setRange = async (selector, value) => page.locator(selector).evaluate((input, value) => {
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles:true }));
  }, value);
  const reset = async () => {
    const previous = await page.evaluate(() => window.__engineWorkerId);
    await page.locator('#reset').click();
    await page.waitForFunction(previous => { const s=window.__engineStates.at(-1); return s.__worker_id > previous && s.mixture_auto===1 && s.ap_mode===0 && s.prop_radps>0; }, previous);
  };

  const initial = await state(); observations.initial = initial;
  assert.equal(initial.ap_mode, 0); assert.equal(initial.mixture_auto, 1);
  for (const key of ['manifold_pressure_pa','prop_radps','oil_pressure_pa','oil_temp_k','egt_k','fuel_flow_m3ps','fuel_left_m3','fuel_right_m3']) {
    assert(Number.isFinite(initial[key]) && initial[key] >= 0, `${key} is finite engine telemetry`);
  }
  await page.waitForFunction(() => document.querySelector('#engine-rpm').textContent !== '—');
  assert.equal(Number(await page.locator('#engine-rpm').textContent()), Math.round(initial.prop_radps*60/(2*Math.PI)));
  assert.equal(await page.locator('#engine-map').textContent(), (initial.manifold_pressure_pa/3386.389).toFixed(1));
  assert.equal(await page.locator('#engine-fuel-left').textContent(), (initial.fuel_left_m3/.003785411784).toFixed(1));
  assert.equal(await page.locator('#engine-fuel-right').textContent(), (initial.fuel_right_m3/.003785411784).toFixed(1));
  assert.match(await page.locator('#offset-value').textContent(), /[0-9.]+% left/);
  checks.push('engine telemetry, display units and explicit roll-offset wording');

  await resume();
  for (const [key, throttle] of [['Digit1',.1],['Digit5',.5],['Digit9',.9],['Numpad3',.3]]) {
    await page.locator('#scene').focus(); await page.keyboard.press(key);
    await page.waitForFunction(throttle => window.__engineInputs.at(-1)?.throttle === throttle, throttle);
    assert.equal(await page.locator('#throttle').inputValue(), String(throttle*100));
    assert.equal(await page.locator('#power').textContent(), `${throttle*100}%`);
  }
  await page.keyboard.press('Digit7');
  await page.waitForFunction(() => window.__engineInputs.at(-1)?.throttle === .7);
  await page.locator('.control-options summary').click();
  await page.locator('#roll-correction-off').click();
  await page.waitForFunction(() => document.querySelector('#offset-value').textContent.includes('0.0%'));
  assert.equal(Number(await page.locator('#roll-offset').inputValue()),0);
  await page.locator('#roll-correction-default').click();
  await page.waitForFunction(() => document.querySelector('#offset-value').textContent.includes('10.9% left'));
  assert(Math.abs(Number(await page.locator('#roll-offset').inputValue())+.109375)<.00051,'range displays the nearest supported UI step');
  await page.waitForFunction(()=>window.__engineInputs.at(-1)?.aileron===-.109375);
  await page.locator('.control-options summary').click();
  checks.push('digit and numpad throttle commands reach the flight worker');

  await setRange('#mixture-control', 60);
  await page.waitForFunction(() => { const s=window.__engineStates.at(-1); return s.mixture_auto===0 && Math.abs(s.mixture_norm-.6)<1e-12; });
  const manual = await state();
  await page.waitForFunction(step => window.__engineStates.at(-1).step > step+30, manual.step);
  assert.equal((await state()).mixture_auto, 0); assert.equal((await state()).mixture_norm, .6);
  await page.locator('#mixture-auto').click();
  await page.waitForFunction(() => window.__engineStates.at(-1).mixture_auto === 1);
  await setRange('#mixture-control', 0);
  await page.waitForFunction(() => { const s=window.__engineStates.at(-1); return s.mixture_auto===0 && s.mixture_norm===0 && s.fuel_flow_m3ps===0; }, null, { timeout:5000 });
  observations.cutoff = await state(); await reset();
  checks.push('manual mixture persists, automatic mode restores and cutoff stops fuel flow');

  const captureCount=await page.evaluate(()=>window.__engineStates.length);
  await page.locator('#ap-heading').click();
  await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode === 2);
  const captured=await page.evaluate(count=>window.__engineStates.slice(count).find(s=>s.ap_mode===2),captureCount);
  observations.captured=captured;
  assert(Math.abs(angleDifference(captured.ap_heading_target_rad,captured.heading_rad)) < 1e-6, `HDG captures actual true heading: target=${captured.ap_heading_target_rad}, actual=${captured.heading_rad}`);
  await page.waitForFunction(() => document.querySelector('#offset-value').textContent.includes('suspended by AP'));
  assert.equal(Number(await page.locator('#roll-control').textContent()), 0, 'study offset is absent from pilot roll input under AP');
  await page.locator('#scene').focus(); await page.keyboard.press('Digit7');
  await page.locator('#flaps-10').click();
  await page.waitForFunction(() => window.__engineStates.at(-1).flap_rad > .01);
  assert.equal((await state()).ap_mode, 2, 'throttle and flap actions preserve AP');
  await page.locator('#flaps-0').click();
  checks.push('heading capture and roll-offset suspension preserve secondary controls');

  const targetBefore = (await state()).ap_heading_target_rad;
  await page.locator('#ap-heading-increase').click();
  await page.waitForFunction(target => Math.abs(Math.atan2(Math.sin(window.__engineStates.at(-1).ap_heading_target_rad-target), Math.cos(window.__engineStates.at(-1).ap_heading_target_rad-target)) - Math.PI/18) < 1e-6, targetBefore);
  await pause(); const turnStart = await state(); const turned = await burst(2400);
  assert(Math.abs(angleDifference(turned.ap_heading_target_rad,turned.heading_rad)) < Math.abs(angleDifference(turnStart.ap_heading_target_rad,turnStart.heading_rad)), 'real heading moves toward +10 degree target');
  observations.headingIncrease = { before:turnStart.heading_rad, after:turned.heading_rad, target:turned.ap_heading_target_rad };
  await resume(); await page.locator('#ap-heading-decrease').click();
  await page.waitForFunction(target => { const heading=window.__engineStates.at(-1).ap_heading_target_rad; return Math.abs(Math.atan2(Math.sin(heading-target),Math.cos(heading-target)))<1e-6; },targetBefore);
  await pause(); const returnStart = await state(); const returned = await burst(2400);
  assert(Math.abs(angleDifference(returned.ap_heading_target_rad,returned.heading_rad)) < Math.abs(angleDifference(returnStart.ap_heading_target_rad,returnStart.heading_rad)), 'real heading moves toward decreased target');
  observations.headingDecrease = { before:returnStart.heading_rad, after:returned.heading_rad, target:returned.ap_heading_target_rad };
  checks.push('actual fixed-step heading response to increased and decreased targets');

  const beforeOff = await stats(); await page.locator('#ap-off').click();
  await page.waitForFunction(() => { const s=window.__engineStates.at(-1); return s.ap_mode===0 && s.ap_aileron_norm===0; });
  assert.equal((await state()).step, beforeOff.step, 'paused AP disconnect does not advance physics');
  await resume(); await page.locator('#scene').focus();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(550); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(100); const bankStart = await state();
  assert(Math.abs(bankStart.roll_rad) > .03, 'manual input establishes a real bank');
  await page.locator('#ap-level').click(); await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===1);
  await pause(); const leveled = await burst(1200);
  assert(Math.abs(leveled.roll_rad) < Math.abs(bankStart.roll_rad), 'wings-level AP reduces actual bank');
  observations.wingsLevel = { before:bankStart.roll_rad, after:leveled.roll_rad };
  checks.push('wings-level response and same-step paused disconnect');

  await resume(); await page.locator('#scene').focus(); await page.keyboard.press('p');
  await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===0);
  await page.keyboard.press('p'); await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===2);
  await page.keyboard.down('ArrowRight'); await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===0); await page.keyboard.up('ArrowRight');
  await page.locator('#ap-heading').click(); await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===2);
  await page.mouse.click(900,150); await page.mouse.move(955,150);
  await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===0);
  await page.keyboard.press('Escape');
  checks.push('P toggle and keyboard/pointer manual AP override');

  await page.locator('#review-flight').click();
  await page.waitForFunction(() => document.querySelector('#engine-state-label').textContent==='RECORDED');
  const reviewStats = await stats();
  for (const id of ['mixture-control','mixture-auto','ap-heading','ap-level','ap-off']) assert.equal(await page.locator(`#${id}`).isDisabled(),true);
  await page.locator('#review-time').focus(); await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('#ap-status').textContent==='OFF');
  await page.keyboard.press('End'); await page.waitForTimeout(100);
  assert.equal((await stats()).step,reviewStats.step);
  await page.locator('#review-exit').click(); await reset();
  assert.equal((await state()).mixture_auto,1); assert.equal((await state()).ap_mode,0);
  checks.push('recorded engine state is read-only and reset restores defaults');

  if (await page.locator('#status').textContent()==='Paused') await resume();
  await page.locator('#ap-heading').click(); await page.waitForFunction(() => window.__engineStates.at(-1).ap_mode===2);
  await page.setViewportSize({ width:390,height:568 });
  await page.locator('#engine-open').click();
  await page.waitForFunction(() => document.querySelector('#engine-dialog').open);
  const liveBeforeDialog = await state();
  await page.waitForFunction(step => window.__engineStates.at(-1).step>step+10,liveBeforeDialog.step);
  assert.equal(await page.locator('#mixture-control').count(),1); assert.equal(await page.locator('#ap-heading-target').count(),1);
  const throttleBefore = await page.locator('#throttle').inputValue(); const modeBefore = (await state()).ap_mode;
  await page.locator('#ap-heading-target').fill('');
  await page.keyboard.press('5'); await page.keyboard.press('Control+1'); await page.keyboard.press('Space'); await page.keyboard.press('p');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#throttle').inputValue(),throttleBefore);
  assert.equal((await state()).ap_mode,modeBefore);
  assert.equal(await page.locator('#status').textContent(),'Flying');
  const compact = await page.evaluate(() => { const r=document.querySelector('#engine-dialog').getBoundingClientRect();return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:document.documentElement.scrollWidth,viewport:innerWidth,height:innerHeight }; });
  assert.equal(compact.width,compact.viewport); assert(compact.left>=0 && compact.right<=390 && compact.top>=0 && compact.bottom<=568);
  await page.screenshot({ path:`${output}/engine-mobile.png` });
  await page.locator('#engine-close').click();
  await page.waitForFunction(() => !document.querySelector('#engine-dialog').open && document.activeElement.id==='scene');
  checks.push('compact live dialog, single controls, shortcut isolation and focus');
  observations.compact=compact;
  assert.deepEqual(errors,[]); assert.deepEqual([...hosts],['127.0.0.1']);
  console.log(JSON.stringify({ result:'pass',browser:browser.version(),checks,observations,screenshots:'output/flight/engine-mobile.png' },null,2));
} catch(error) {
  console.error(JSON.stringify({checks,observations},null,2)); throw error;
} finally {
  await browser?.close(); server.kill('SIGTERM');
}
