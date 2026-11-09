// Real application, Cesium view setters and native JSBSim worker. Scenery pixel
// and empty vector/name tiles are fixtures; no map/source fidelity acceptance.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app=fileURLToPath(new URL('..',import.meta.url)),output=fileURLToPath(new URL('../../output/flight/',import.meta.url)),origin='http://127.0.0.1:5294';
const key='gefly.view-preferences.v1',names=['Off','Places','Landmarks','Detailed'];
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5294,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let log='',browser,page;const checks=[],observations=[],errors=[];
server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  await mkdir(output,{recursive:true});for(let i=0;!log.includes('Local:');i++){assert(i<100&&server.exitCode===null,log);await sleep(100);}
  browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{channel:'chrome'})});
  async function createPage(context){
    const p=await context.newPage();p.on('pageerror',error=>errors.push(String(error)));
    await installSceneryFixture(p);
    await p.route('**/scenery/{vector,landmarks}/**',route=>route.fulfill({contentType:'application/vnd.mapbox-vector-tile',body:Buffer.alloc(0)}));
    await p.addInitScript(()=>{const Native=Worker;window.preferenceStates=[];window.preferenceStats=[];window.Worker=class extends Native{constructor(...args){super(...args);if(!String(args[0]).includes('/sim/worker.js'))return;window.preferenceWorker=this;this.addEventListener('message',({data})=>{if(data.type==='state')window.preferenceStates.push(data);if(data.type==='stats')window.preferenceStats.push(data);});}};});
    return p;
  }
  const ready=p=>p.waitForFunction(()=>!document.querySelector('#start').disabled&&window.preferenceStates.length&&document.querySelector('#scene').dataset.sceneryMode,null,{timeout:60000});
  async function stats(p){const n=await p.evaluate(()=>window.preferenceStats.length);await p.evaluate(()=>window.preferenceWorker.postMessage({type:'stats'}));await p.waitForFunction(n=>window.preferenceStats.length>n,n);return p.evaluate(()=>window.preferenceStats.at(-1));}
  async function view(p,vector,level,label){await p.waitForFunction(({vector,level})=>document.querySelector('#scene').dataset.sceneryMode===(vector?'vector':'imagery')&&document.querySelector('#scene').dataset.landmarkLevel===String(level),{vector,level});assert.equal(await p.locator('#toggle-map-terrain').getAttribute('aria-pressed'),String(vector));assert.match(await p.locator('#cycle-landmarks').textContent(),new RegExp(`Landmarks: ${names[level]}`));const o=await p.evaluate(label=>({label,mode:document.querySelector('#scene').dataset.sceneryMode,level:document.querySelector('#scene').dataset.landmarkLevel,status:document.querySelector('#status').textContent,step:window.preferenceStates.at(-1).step,ap:window.preferenceStates.at(-1).kap_engaged}),label);observations.push(o);return o;}
  const stored=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const frozen=(a,b)=>{assert.equal(a.step,b.step);assert.equal(a.digest,b.digest);assert.deepEqual(a.final_state,b.final_state);for(const k of ['kap_engaged','kap_lateral','kap_vertical','kap_heading_bug_rad','kap_hold_pressure_altitude_m'])assert.equal(a[k],b[k]);};
  const options=async p=>{await p.locator('#scene').focus();await p.keyboard.press('o');await p.locator('#control-settings').waitFor({state:'visible'});};
  const context=await browser.newContext({viewport:{width:1440,height:900}});page=await createPage(context);await page.goto(origin);await ready(page);await view(page,false,0,'empty storage defaults');
  await page.locator('#scene').focus();await page.keyboard.press('a');await page.waitForFunction(()=>window.preferenceStates.at(-1).kap_engaged===1);const baseline=await stats(page);
  await page.keyboard.press('/');for(let i=0;i<3;i++)await page.keyboard.press('.');await view(page,true,3,'keyboard choices');
  assert.deepEqual(await stored(page),{version:1,vectorScenery:true,landmarkLevel:3,mapColorScheme:'original'});frozen(baseline,await stats(page));
  await page.reload();await ready(page);const reloaded=await view(page,true,3,'first reload restores initial scene/menu');assert.equal(reloaded.ap,1,'AP restores through the separate acknowledged flight-location snapshot');assert.equal(reloaded.step,0,'display preferences never restore native flight progress');
  await options(page);assert(await page.locator('#vector-scenery').isChecked());assert.equal(await page.locator('#sensitivity-pitch').inputValue(),'100');await page.locator('#settings-close').click();
  checks.push('keyboard terrain/label choices persist across real reload into scene/menu/Options with display state separate from acknowledged AP reload settings and native progress');

  await options(page);await page.locator('#vector-scenery').uncheck();await page.locator('#sensitivity-pitch').focus();await page.keyboard.press('Home');await view(page,false,3,'unsaved Options preview');
  assert.deepEqual(await stored(page),{version:1,vectorScenery:true,landmarkLevel:3,mapColorScheme:'original'},'unsaved preview never changes saved choices');
  await page.reload();await ready(page);await view(page,true,3,'reload discards unsaved Options preview');await options(page);assert.equal(await page.locator('#sensitivity-pitch').inputValue(),'100');
  await page.locator('#vector-scenery').uncheck();await page.keyboard.press('Escape');await view(page,true,3,'Escape rolls back preview');assert.deepEqual(await stored(page),{version:1,vectorScenery:true,landmarkLevel:3,mapColorScheme:'original'});
  await options(page);await page.locator('#vector-scenery').uncheck();await page.locator('#sensitivity-pitch').focus();await page.keyboard.press('Home');await page.locator('#settings-close').click();await view(page,false,3,'Save retains view choice');assert.deepEqual(await stored(page),{version:1,vectorScenery:false,landmarkLevel:3,mapColorScheme:'original'});
  await page.reload();await ready(page);await view(page,false,3,'Save survives reload');await options(page);/* Saved Options (2.0.173) persist control gains separately; this check covers view choices only. */await page.locator('#settings-close').click();
  checks.push('Options preview/reload/cancel/Save semantics preserve saved choices independently of separately saved Options');

  const paused=await stats(page);await prepareFlightUI(page,{controls:false});await page.locator('#view-menu > summary').click();await page.locator('#toggle-map-terrain').click();
  await page.locator('#view-menu > summary').click();await page.locator('#cycle-landmarks').click();await view(page,true,0,'menu terrain and label choices');assert.deepEqual(await stored(page),{version:1,vectorScenery:true,landmarkLevel:0,mapColorScheme:'original'});frozen(paused,await stats(page));
  await page.reload();await ready(page);await view(page,true,0,'menu choices survive reload');
  checks.push('menu changes persist the same bounded view schema while paused native state remains unchanged');

  for(const [name,raw] of [['malformed','{broken'],['oversized',' '.repeat(257)],['wrong version','{"version":2,"vectorScenery":true,"landmarkLevel":3}']]){
    const c=await browser.newContext({viewport:{width:1280,height:800}});await c.addInitScript(({key,raw})=>{if(location.protocol==='http:')localStorage.setItem(key,raw);},{key,raw});const p=await createPage(c);await p.goto(origin);await ready(p);await view(p,false,0,`${name} storage defaults`);await c.close();
  }
  const denied=await browser.newContext({viewport:{width:1280,height:800}});await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('denied','SecurityError');}}));const p=await createPage(denied);await p.goto(origin);await ready(p);await view(p,false,0,'denied storage defaults');const before=await stats(p);await p.locator('#scene').focus();await p.keyboard.press('/');await p.keyboard.press('.');await view(p,true,1,'denied storage still permits session view changes');frozen(before,await stats(p));await p.reload();await ready(p);await view(p,false,0,'denied storage reload remains usable');await denied.close();
  checks.push('malformed/oversized/wrong-version and actually denied localStorage fail softly; session view changes and native state remain usable');
  assert.deepEqual(errors,[]);await writeFile(`${output}/view-preferences-browser.json`,JSON.stringify({result:'pass',browser:browser.version(),checks,observations,errors},null,2));console.log(JSON.stringify({result:'pass',checks},null,2));
}catch(error){await writeFile(`${output}/view-preferences-browser.json`,JSON.stringify({result:'fail',error:String(error),checks,observations,errors},null,2));throw error;}finally{await browser?.close();server.kill('SIGTERM');}
