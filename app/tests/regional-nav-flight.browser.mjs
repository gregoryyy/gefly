import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
// Full app, real worker/native engine/terrain and source-derived EDDF preset.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {startOrResume} from './flight-actions.mjs';
const app=fileURLToPath(new URL('..',import.meta.url)), origin='http://127.0.0.1:5215';
const output=fileURLToPath(new URL('../../output/flight/',import.meta.url));
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5215,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let browser,log='';server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
try {
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(log);try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(log);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],hosts=new Set();
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol))hosts.add(u.hostname);});
  await page.addInitScript(()=>{const Native=window.Worker;window.navStates=[];window.navBuilds=[];window.navStats=[];
    window.Worker=class extends Native{constructor(...args){super(...args);if(!String(args[0]).includes('/sim/worker.js'))return;window.navWorker=this;this.addEventListener('message',({data})=>{if(data.type==='state')window.navStates.push(data);if(data.type==='ready')window.navBuilds.push(data.build);if(data.type==='stats')window.navStats.push(data);});}};
  });
  await installSceneryFixture(page); await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('#start').disabled&&!document.querySelector('#eddf-ils-practice').disabled,null,{timeout:60000});
  await prepareFlightUI(page);
  await page.locator('#flight-menu > summary').click();await page.locator('#flight-research').evaluate(element => { element.open = true; }); await page.locator('#eddf-ils-practice').click();
  await page.waitForFunction(()=>window.navBuilds.length===2&&window.navStates.at(-1)?.radio_nav_active_khz===111550&&document.querySelector('#nav1-gauge').dataset.stationId==='IFCW',null,{timeout:60000});
  assert.equal(await page.locator('#nav1-active').textContent(),'111.55');assert.equal(await page.locator('#nav2-active').textContent(),'114.20');
  assert.equal(await page.locator('#nav1-gauge').getAttribute('data-gs-valid'),'true');assert.equal(await page.locator('#nav2-gauge').getAttribute('data-station-id'),'FFM');
  assert.equal(await page.locator('#nav-obs').inputValue(),'250');
  await page.locator('#nav-obs-up').click();
  await page.waitForFunction(()=>window.navStates.at(-1)?.radio_obs_deg===251);
  let state=await page.evaluate(()=>window.navStates.at(-1));assert.equal(state.step,0);assert.equal(state.radio_nav_active_khz,111550);assert.equal(state.radio_nav2_active_khz,114200);
  const holdAP=async()=>{await page.locator('#ap-engage').hover();await page.mouse.down();await page.waitForTimeout(320);await page.mouse.up();};
  await holdAP();await page.waitForFunction(()=>window.navStates.at(-1)?.kap_engaged===1);
  await page.locator('#ap-apr').click();
  await startOrResume(page);
  await page.waitForFunction(()=>window.navStates.at(-1)?.kap_lateral===3&&window.navStates.at(-1)?.kap_vertical===2,null,{timeout:20000});
  await page.waitForFunction(()=>window.navStates.at(-1)?.t_s>5,null,{timeout:15000});
  await page.locator('#pause').click();
  state=await page.evaluate(()=>window.navStates.at(-1));assert.equal(state.kap_nav_kind,2);assert.equal(state.kap_gs_valid,1);assert.equal(state.collision_mask,0);assert(state.terrain_height_msl_m>0);
  await mkdir(output,{recursive:true});await page.screenshot({path:output+'rhein-main-ils.png',fullPage:true});
  const liveObs=await page.locator('#nav-obs').inputValue();
  await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#radio-state-label').textContent==='RECORDED');
  assert(await page.locator('#nav1-swap').isDisabled());assert.equal(await page.locator('#nav1-active').textContent(),'111.55');assert.equal(await page.locator('#nav-obs').inputValue(),liveObs);
  assert(await page.locator('#eddf-ils-practice').isDisabled());
  assert.deepEqual(errors,[]);assert.deepEqual([...hosts],['127.0.0.1']);
  const evidence={result:'pass',checks:['full-app historical preset loads real terrain/verified catalog','paused first OBS preserves explicit NAV1/NAV2 preset','actual native AP APR/GS capture while flying','recorded Review retains source/tuning and disables changes','same-origin only, no page errors'],state,build:await page.evaluate(()=>window.navBuilds.at(-1))};
  await writeFile(output+'rhein-main-flight.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
} finally {await browser?.close();server.kill();}
