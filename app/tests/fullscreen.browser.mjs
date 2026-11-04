// Native Chrome fullscreen with the actual worker; optional API failures use
// isolated browser fixtures, never a fake flight model.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app=fileURLToPath(new URL('..',import.meta.url)),origin='http://127.0.0.1:5356';
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5356,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let browser,log='';server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
try{
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(log);try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(log);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{const Native=Worker;window.fullStats=[];window.fullStates=[];window.fullInits=0;window.resizeEvents=0;addEventListener('resize',()=>window.resizeEvents++);
    window.Worker=class extends Native{constructor(...a){super(...a);if(!String(a[0]).includes('/sim/worker.js'))return;window.fullWorker=this;this.addEventListener('message',({data})=>{if(data.type==='stats')window.fullStats.push(data);if(data.type==='state')window.fullStates.push(data);});}
      postMessage(m,...a){if(m.type==='init')window.fullInits++;return super.postMessage(m,...a);}};});
  await installSceneryFixture(page);await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('#start').disabled&&window.fullStates.length);
  const stats=async()=>{const n=await page.evaluate(()=>window.fullStats.length);await page.evaluate(()=>window.fullWorker.postMessage({type:'stats'}));await page.waitForFunction(n=>window.fullStats.length>n,n);return page.evaluate(()=>window.fullStats.at(-1));};
  const frozen=async before=>{const after=await stats();assert.equal(after.step,before.step);assert.equal(after.digest,before.digest);assert.deepEqual(after.final_state,before.final_state);assert.equal(await page.evaluate(()=>window.fullInits),1);};
  const active=()=>page.evaluate(()=>document.fullscreenElement===document.documentElement);
  const scene=page.locator('#scene'),button=page.locator('#toggle-fullscreen');
  const full=async yes=>{await page.waitForFunction(yes=>(document.fullscreenElement===document.documentElement)===yes,yes);await page.waitForFunction(yes=>document.querySelector('#toggle-fullscreen').getAttribute('aria-pressed')===String(yes)&&!document.querySelector('#toggle-fullscreen').disabled,yes);};
  assert(await page.evaluate(()=>document.fullscreenEnabled));assert.equal(await button.getAttribute('aria-keyshortcuts'),'F');
  const before=await stats();await scene.focus();await page.keyboard.down('f');await full(true);
  await page.keyboard.down('f');await page.keyboard.up('f');assert(await active(),'trusted key repeat cannot toggle again');
  assert.equal(await button.getAttribute('aria-label'),'Exit full screen');assert.equal(await page.locator('.topbar').isVisible(),false);
  await page.keyboard.press('Escape');await page.waitForTimeout(150);const escapeExited=!(await active());
  if(!escapeExited){await scene.focus();await page.keyboard.press('f');}await full(false);await frozen(before);
  await prepareFlightUI(page,{controls:false});await page.locator('#view-menu > summary').click();await button.click();await full(true);
  assert.equal(await page.locator('#view-menu').evaluate(e=>e.open),false);
  await page.setViewportSize({width:1200,height:800});await page.waitForFunction(()=>innerWidth===1200&&window.resizeEvents>0);
  const geometry=await page.evaluate(()=>{const deck=document.querySelector('.flight-deck');const scene=document.querySelector('#scene').getBoundingClientRect();return{height:innerHeight,sceneHeight:scene.height,deck:deck.getBoundingClientRect().toJSON(),panels:['#airspeed','#vertical-speed','#ap-engage'].map(selector=>({selector,...document.querySelector(selector).getBoundingClientRect().toJSON()}))};});
  assert(geometry.sceneHeight>=480,'fullscreen viewport resize preserves flight-view priority');
  assert(geometry.deck.top>=geometry.sceneHeight-1&&geometry.deck.bottom<=geometry.height+1);
  assert(geometry.panels.every(panel=>panel.width>0&&panel.height>0&&panel.left>=0&&panel.right<=1201&&panel.top>=geometry.deck.top&&panel.bottom<=801),'both instrument rows and AP controls fit inside fullscreen');
  await scene.focus();await page.keyboard.press('o');await page.locator('#control-settings').waitFor({state:'visible'});
  assert(await active());assert(await page.locator('#control-settings').evaluate(e=>document.fullscreenElement.contains(e)),'native root includes body-level dialogs');
  await page.keyboard.press('f');assert(await active(),'modal guards F');await page.locator('#settings-close').click();
  await scene.focus();await page.keyboard.press('f');await full(false);await frozen(before);
  await page.locator('#throttle').focus();await page.keyboard.press('f');assert(!(await active()),'editable controls guard F');
  await scene.focus();for(const key of ['Shift+f','Alt+f','Meta+f'])await page.keyboard.press(key);assert(!(await active()),'modified F is not fullscreen');
  await page.keyboard.press('Alt+Shift+f');assert(!(await active()));assert(await page.locator('#flight-controls-panel').isVisible(),'existing flight-controls chord remains independent');
  await page.keyboard.press('Alt+Shift+f');
  await page.locator('#view-menu > summary').click();await page.keyboard.press('f');assert(!(await active()),'open menu guards F');await page.locator('#view-menu > summary').click();
  // Actual running flight remains running through native fullscreen transitions.
  await scene.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>window.fullStates.at(-1)?.step>60);
  const liveStep=await page.evaluate(()=>window.fullStates.at(-1).step);await page.keyboard.press('f');await full(true);
  await page.waitForFunction(step=>document.querySelector('#status').textContent==='Flying'&&window.fullStates.at(-1)?.step>step+30,liveStep);
  await page.keyboard.press('f');await full(false);await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const paused=await stats();await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review');
  await page.keyboard.press('f');await full(true);await page.keyboard.press('f');await full(false);await frozen(paused);
  assert.deepEqual(errors,[]);
  // Explicit capability/rejection fixtures exercise only the new presentation module.
  const fixture=await browser.newPage();await fixture.route(origin+'/',r=>r.fulfill({contentType:'text/html',body:'<button id="full"><span data-fullscreen-label></span><kbd>F</kbd></button>'}));await fixture.goto(origin);
  await fixture.evaluate(async()=>{Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false});window.fixtureErrors=[];const{installFullscreenControls}=await import('/src/fullscreen.ts');window.disposeFull=installFullscreenControls({button:document.querySelector('#full'),onError:m=>window.fixtureErrors.push(m)});});
  assert(await fixture.locator('#full').isDisabled());assert.match(await fixture.locator('#full').getAttribute('title'),/unavailable/);
  await fixture.evaluate(async()=>{window.disposeFull();Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:true});document.documentElement.requestFullscreen=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));const{installFullscreenControls}=await import('/src/fullscreen.ts');window.disposeFull=installFullscreenControls({button:document.querySelector('#full'),onError:m=>window.fixtureErrors.push(m)});});
  await fixture.locator('#full').click();await fixture.waitForFunction(()=>window.fixtureErrors.length===1);assert.equal(await fixture.evaluate(()=>document.fullscreenElement),null);assert(!(await fixture.locator('#full').isDisabled()));await fixture.close();
  console.log(JSON.stringify({result:'pass',checks:['trusted F and View button use actual documentElement fullscreen with authoritative labels and repeat guard','fullscreen resize retains scene priority and body dialogs remain inside fullscreen','editable/modal/menu/modifier guards preserve AltShiftF','actual running native flight continues; paused and Review native step/digest remain unchanged without reset','unsupported and rejected native APIs fail safely in explicit isolated fixtures'],escapeExited,geometry,browser:browser.version()},null,2));
}finally{await browser?.close();server.kill();}
