import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5245';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5245', '--strictPort'], { cwd: app, stdio: 'pipe' });
let browser;
try {
  for (let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1680,height:1050}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{const Native=Worker;window.airportStates=[];window.airportStats=[];
    window.Worker=class extends Native{constructor(...args){super(...args);if(!String(args[0]).includes('/sim/worker.js'))return;window.airportWorker=this;
      this.addEventListener('message',({data})=>{if(data.type==='state')window.airportStates.push(data);if(data.type==='stats')window.airportStats.push(data);});}};});
  await installSceneryFixture(page);await page.goto(origin);
  await page.waitForFunction(()=>!document.querySelector('#start').disabled);
  await prepareFlightUI(page,{controls:false});
  await page.locator('#scene').focus();await page.keyboard.press('m');
  await page.locator('.practice-map-heading').click();
  const practiceCard = page.locator('.runway-practice');
  await page.waitForFunction(()=>!document.querySelector('.runway-practice').hidden);
  assert.match(await practiceCard.locator('summary').textContent(),/26.*Right-hand north circuit/);
  assert.equal(await practiceCard.evaluate(e=>e.open),false,'briefing starts collapsed');
  await practiceCard.locator('summary').click();
  assert.match(await practiceCard.textContent(),/engine idle.*parking brake set/);
  await practiceCard.locator('summary').click();
  await page.locator('#airport-play-start').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying'&&window.airportStates.at(-1)?.step>120,null,{timeout:60000});
  let state=await page.evaluate(()=>window.airportStates.at(-1));
  assert(Math.hypot(state.ground_forward_mps,state.ground_side_mps)<.05,'braked aircraft stays at rest');
  assert.equal(state.collision_mask,0);assert.equal(state.gear_nose_wow,1);assert.equal(state.gear_left_wow,1);assert.equal(state.gear_right_wow,1);
  assert.equal(await page.locator('#parking-brake').getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>document.querySelector('.runway-practice-status').dataset.phase==='ground');
  assert.equal(await practiceCard.locator('li').count(),0,'parking at the start is not a landing');
  await page.locator('#airport-play-stop').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  await page.locator('.airport-com > summary').click();
  await page.waitForFunction(()=>document.querySelectorAll('.airport-com-row').length>0);
  const comRow=page.locator('.airport-com-row').filter({hasText:'118.405'}).first();
  await comRow.getByRole('button',{name:'COM1'}).click();
  assert.equal(await page.locator('#com1-standby').inputValue(),'118.405');
  assert.equal(await page.locator('#com1-active').textContent(),'118.000','selection never swaps active');
  await page.locator('#com1-swap').click();assert.equal(await page.locator('#com1-active').textContent(),'118.405');
  await page.locator('.airport-com > summary').click();
  await page.locator('#controls-settings').click();
  await page.locator('#vector-scenery').check();await page.locator('#practice-papi').check();
  await page.locator('#settings-close').click();
  await page.waitForFunction(()=>document.querySelector('#scene').dataset.sceneryMode==='vector'&&document.querySelector('#scene').dataset.airportScenery==='ready');
  assert.equal(await page.getByRole('button',{name:'Show vector map and terrain'}).getAttribute('aria-pressed'),'true');
  await page.locator('#scene').focus();await page.keyboard.press('v');await page.keyboard.press('Space');
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying');
  await mkdir(new URL('../../output/flight/',import.meta.url),{recursive:true});
  await page.screenshot({path:fileURLToPath(new URL('../../output/flight/airport-runway-vector.png',import.meta.url))});
  // A second runway start changes heading and resets safely, not an airborne preset.
  await page.locator('.practice-map-heading').click();
  await page.locator('#airport-play-runway').selectOption('08');await page.locator('#airport-play-start').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying'&&window.airportStates.at(-1)?.step>60&&window.airportStates.at(-1)?.heading_rad<Math.PI,null,{timeout:60000});
  state=await page.evaluate(()=>window.airportStates.at(-1));assert.equal(state.collision_mask,0);assert(Math.hypot(state.ground_forward_mps,state.ground_side_mps)<.05);
  assert.match(await practiceCard.locator('summary').textContent(),/08.*Left-hand north circuit/);
  await page.locator('#scene').focus();await page.keyboard.press('n');await page.keyboard.press('9');
  await page.waitForFunction(()=>window.airportStates.at(-1)?.ground_forward_mps>1,null,{timeout:20000});
  await page.locator('#airport-play-stop').click();
  await page.locator('#scene').focus();await page.keyboard.press('r');
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review');
  await page.waitForFunction(()=>document.querySelector('.runway-practice-badge').textContent.includes('REVIEW'));
  assert(await page.locator('#airport-play-start').isDisabled());
  await page.locator('.practice-map-heading').click();
  await page.locator('.airport-com').evaluate(e => { e.open = true; });
  assert(await page.locator('.airport-com-row').filter({hasText:'118.405'}).first().getByRole('button',{name:'COM1'}).isDisabled());
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#review-save').click();
  const download = await downloadEvent;
  const saved = JSON.parse(await readFile(await download.path(),'utf8'));
  assert.deepEqual(saved.context,{kind:'runway-practice',version:1,airport:'EDFE',runway:'08'},'runway context travels in the recording');
  const stats = async () => {
    const count = await page.evaluate(()=>window.airportStats.length);
    await page.evaluate(()=>window.airportWorker.postMessage({type:'stats'}));
    await page.waitForFunction(n=>window.airportStats.length>n,count);
    return page.evaluate(()=>window.airportStats.at(-1));
  };
  const frozen = await stats();
  const assertNativeUnchanged = async () => {
    const current = await stats();
    assert.equal(current.step,frozen.step,'import and seek cannot advance the live native worker');
    assert.equal(current.digest,frozen.digest);
    assert.deepEqual(current.final_state,frozen.final_state);
  };
  const load = async (name,recording) => {
    await page.locator('#recording-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recording))});
    await page.waitForFunction(()=>document.querySelector('#recording-file').value==='');
  };
  await load('practice08.json',saved);
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Loaded recording'));
  await page.waitForFunction(()=>!document.querySelector('.runway-practice').hidden);
  assert.match(await practiceCard.locator('summary').textContent(),/08.*Left-hand north circuit/);
  assert.match(await practiceCard.locator('.runway-practice-badge').textContent(),/REVIEW.*read only/);
  assert(await page.locator('#airport-play-start').isDisabled());
  await page.waitForFunction(()=>document.querySelector('.runway-practice-status').dataset.phase==='ground');
  await assertNativeUnchanged();
  // Synthetic imported contact data, not an actual native takeoff: identical
  // count/timestamps with all wheels airborne must invalidate the prior ground
  // observation cache as well as change the declared runway label.
  const otherRunway = {...saved,context:{...saved.context,runway:'26'},samples:saved.samples.map(sample=>({
    ...sample,state:{...sample.state,gear_nose_wow:0,gear_left_wow:0,gear_right_wow:0,
      gear_nose_compression_m:0,gear_left_compression_m:0,gear_right_compression_m:0,
      gear_nose_load_n:0,gear_left_load_n:0,gear_right_load_n:0,
      ...(Object.hasOwn(sample.state,'on_ground')?{on_ground:0}:{})},
  }))};
  await load('practice26.json',otherRunway);
  await page.waitForFunction(()=>document.querySelector('.runway-practice summary').textContent.includes('EDFE 26'));
  assert.match(await practiceCard.locator('summary').textContent(),/26.*Right-hand north circuit/);
  await page.waitForFunction(()=>document.querySelector('.runway-practice-status').dataset.phase==='airborne');
  const selectedTime = await page.locator('#review-time').inputValue();
  for(const context of [
    {...saved.context,airport:'XXXX'},
    {...saved.context,runway:'09'},
    {...saved.context,execute:'window.contextExecuted=true'},
  ]) {
    await load('bad-context.json',{...saved,context});
    assert.match(await page.locator('#notice').textContent(),/^Recording:/,'malformed runway context is rejected');
    assert.equal(await page.locator('#status').textContent(),'Review');
    assert.equal(await page.locator('#review-time').inputValue(),selectedTime,'rejection preserves selected review time');
    assert.match(await practiceCard.locator('summary').textContent(),/26.*Right-hand north circuit/,'rejection preserves the prior recording context');
    assert.equal(await page.evaluate(()=>window.contextExecuted),undefined);
    await assertNativeUnchanged();
  }
  await load('practice08-again.json',saved);
  await page.waitForFunction(()=>document.querySelector('.runway-practice-status').dataset.phase==='ground');
  await load('practice26-again.json',otherRunway);
  await page.waitForFunction(()=>document.querySelector('.runway-practice-status').dataset.phase==='airborne');
  await page.locator('#review-time').evaluate(input=>{input.value=input.max;input.dispatchEvent(new Event('input',{bubbles:true}));});
  await assertNativeUnchanged();
  await page.locator('#review-exit').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  await page.waitForFunction(()=>document.querySelector('.runway-practice summary').textContent.includes('EDFE 08'));
  assert.match(await practiceCard.locator('summary').textContent(),/08.*Left-hand north circuit/,'Back to live restores08 after imported26');
  await assertNativeUnchanged();
  const legacy = {...saved};delete legacy.context;
  await load('legacy-practice.json',legacy);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review'&&document.querySelector('.runway-practice').hidden);
  await assertNativeUnchanged();
  await page.locator('#review-exit').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused'&&!document.querySelector('.runway-practice').hidden);
  assert.match(await practiceCard.locator('summary').textContent(),/08.*Left-hand north circuit/,'legacy Back to live restores session runway context');
  await assertNativeUnchanged();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({checks:['EDFE26 and08 start stationary with all gear supported; full parking hold does not collide','COM8.33 selection loads standby, explicit swap changes active','Options select vector terrain/map and practice lights','release brake and power produces actual native ground acceleration','map Stop preserves Review and locks start/COM during Review','source-scoped runway briefing, actual ground state, runway change and recorded Review card','portable runway context survives save/load, rejects malformed metadata and restores live context; legacy files remain unknown'],browser:browser.version()},null,2));
}finally{await browser?.close();server.kill();}
