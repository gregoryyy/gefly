// Actual browser/JSBSim integration, not a dynamics-fidelity test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const app = fileURLToPath(new URL('..', import.meta.url));
await access(new URL('../../studies/e1-browser/sim/dist/jsbsim.wasm', import.meta.url))
  .catch(() => { throw new Error('Build the local research engine first: just build-flight-engine'); });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174'], {cwd:app, stdio:'pipe'});
let serverOutput='';server.stdout.on('data',chunk=>{serverOutput+=chunk;});server.stderr.on('data',chunk=>{serverOutput+=chunk;});
let browser;
try {
  for(let attempt=0;attempt<100;attempt++) {
    if(server.exitCode!==null)throw new Error(`Flight server failed: ${serverOutput}`);
    try {if(serverOutput.includes('Local:') && (await fetch('http://127.0.0.1:5174')).ok && server.exitCode===null)break;}catch{}
    if(attempt===99)throw new Error(`Flight server timed out: ${serverOutput}`);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  browser = await chromium.launch({headless:true, ...(process.env.CHROME ? {executablePath:process.env.CHROME} : {channel:'chrome'})});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[]; const hosts=new Set();
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('request',request=>hosts.add(new URL(request.url()).hostname));
  await page.addInitScript(()=>{
    const NativeWorker=window.Worker;
    window.__flightStates=[];
    window.Worker=class extends NativeWorker {
      constructor(...args){super(...args);this.addEventListener('message',event=>{
        if(event.data?.type==='state'){window.__flightStates.push(event.data);if(window.__flightStates.length>500)window.__flightStates.shift();}
      });}
    };
  });
  await page.goto('http://127.0.0.1:5174');
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying'&&window.__flightStates.length>5);
  const state=()=>page.evaluate(()=>window.__flightStates.at(-1));
  const initial=await state();assert(initial.step>0&&initial.tas_mps>40&&initial.tas_mps<55);
  await page.locator('#pause').click();await page.waitForTimeout(150);const paused=await state();
  await page.waitForTimeout(300);assert.equal((await state()).step,paused.step,'pause must freeze JSBSim');
  await page.locator('#chase').click();assert.equal(await page.locator('#chase').getAttribute('aria-pressed'),'true');
  assert.equal((await state()).step,paused.step,'view switch must not advance paused state');
  await page.locator('#reset').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'scene','restart returns flight keyboard focus');
  await page.waitForTimeout(100);const before=await state();
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');
  const after=await state();assert(after.roll_rad>before.roll_rad+0.08,'right input banks right in actual engine');
  await page.locator('#pointer').click();await page.mouse.move(1000,250);await page.waitForTimeout(100);
  assert.notEqual(Number(await page.locator('#pitch-control').textContent()),0);
  await page.mouse.move(1100,800);assert.equal(Number(await page.locator('#pitch-control').textContent()),0,'pointer exit releases pitch');
  assert(Math.abs(Number(await page.locator('#roll-control').textContent())+0.109375)<0.01,'pointer exit retains only visible study offset');
  await page.locator('#cockpit').click();await mkdir(new URL('../../output/flight/',import.meta.url),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('../../output/flight/cockpit.png',import.meta.url))});
  await page.locator('#chase').click();await page.screenshot({path:fileURLToPath(new URL('../../output/flight/chase.png',import.meta.url))});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(100);const blurred=await state();
  await page.waitForTimeout(250);assert.equal((await state()).step,blurred.step,'blur must pause');
  assert.deepEqual(errors,[]);assert.deepEqual([...hosts],['127.0.0.1'],'runtime should be local only');
  const missing=await browser.newPage();await missing.route('**/studies/e1-browser/sim/worker.js',route=>route.abort());
  await missing.goto('http://127.0.0.1:5174');await missing.waitForFunction(()=>document.querySelector('#status').textContent==='Error');
  assert.match(await missing.locator('#notice').textContent(),/build-flight-engine/);await missing.close();
  const noGL=await browser.newPage();const noGLErrors=[];noGL.on('pageerror',e=>noGLErrors.push(String(e)));
  await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind.startsWith('webgl')?null:original.call(this,kind,...args);};});
  await noGL.goto('http://127.0.0.1:5174');await noGL.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Scene unavailable'));
  await noGL.waitForTimeout(400);assert.equal(await noGL.locator('#pause').isDisabled(),true);assert.deepEqual(noGLErrors,[]);await noGL.close();
  console.log(JSON.stringify({result:'pass',browser:browser.version(),initial:{step:initial.step,tas_mps:initial.tas_mps},right_bank_delta_rad:after.roll_rad-before.roll_rad,checks:['live JSBSim','pause','view invariance','reset keyboard focus','right bank','touchpad release','blur pause','local requests only','missing engine','WebGL failure'],screenshots:'output/flight/{cockpit,chase}.png'},null,2));
} finally {
  await browser?.close();server.kill('SIGTERM');
}
