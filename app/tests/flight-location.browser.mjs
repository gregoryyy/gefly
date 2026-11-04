// Actual native reloads preserve only the last live launch position, not a checkpoint.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSceneryFixture, prepareFlightUI } from './flight-actions.mjs';
const app = fileURLToPath(new URL('..', import.meta.url)), origin = 'http://127.0.0.1:5355';
const KEY = 'gefly.flight-location.v1';
const server = spawn(process.execPath, ['--input-type=module', '-e', `import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5355,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`], { cwd: app, stdio: 'pipe' });
let browser, log = '';
server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
try {
  for (let i=0;i<100;i++) { if(server.exitCode!==null)throw Error(log);try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(log);await new Promise(resolve=>setTimeout(resolve,100)); }
  browser = await chromium.launch({ headless:true, channel:'chrome' });
  const page = await browser.newPage({ viewport:{width:1680,height:1050} }), errors=[];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(() => {
    const Native = Worker; window.locationStates=[];window.locationMessages=[];
    window.Worker=class extends Native {
      constructor(...args) { super(...args); if(!String(args[0]).includes('/sim/worker.js'))return;
        window.locationStates=[];this.addEventListener('message',({data})=>{if(data.type==='state')window.locationStates.push(data);});
      }
      postMessage(message,...args) { if(String(message.type)==='init'||message.type==='run')window.locationMessages.push(structuredClone(message)); return super.postMessage(message,...args); }
    };
  });
  await installSceneryFixture(page);
  const ready = () => page.waitForFunction(() => !document.querySelector('#start').disabled && window.locationStates.length>0);
  const latest = () => page.evaluate(() => window.locationStates.at(-1));
  const init = () => page.evaluate(() => window.locationMessages.filter(m=>m.type==='init').at(-1));
  const reloadPaused = async expected => {
    await page.reload();await ready();assert.equal(await page.locator('#status').textContent(),'Paused');
    const message=await init();
    for(const key of ['lat_rad','lon_rad','alt_msl_m','heading_rad'])assert(Math.abs(message.ic[key]-expected[key])<1e-10,`native initializer restores ${key}`);
    assert.equal(await page.evaluate(()=>window.locationMessages.some(m=>m.type==='run')),false,'reload never starts native flight');
    return message;
  };
  await page.goto(origin);await ready();
  await page.locator('#scene').focus();await page.keyboard.press('Alt+Shift+6');
  await page.waitForFunction(()=>!document.querySelector('#start').disabled&&Math.abs(window.locationStates.at(-1)?.lat_rad-49.87*Math.PI/180)<.0001);
  await page.locator('#start').click();await page.waitForFunction(()=>window.locationStates.at(-1)?.step>120);
  await page.locator('#scene').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const live=await latest();assert.equal(live.terrain_profile,1);assert.equal(live.collision_mask,0);
  await reloadPaused(live);
  const restored=await latest();assert(Math.abs(restored.lat_rad-live.lat_rad)<1e-7);assert(Math.abs(restored.alt_msl_m-live.alt_msl_m)<.1);
  // Make a real short recording, then load explicitly synthetic historical pose.
  await page.locator('#start').click();await page.waitForFunction(()=>window.locationStates.at(-1)?.step>60);
  await page.locator('#scene').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const beforeReview=await latest();await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Review');
  const downloading=page.waitForEvent('download');await page.locator('#review-save').click();const download=await downloading;
  const recording=JSON.parse(await readFile(await download.path(),'utf8'));
  const synthetic={...recording,samples:recording.samples.map(sample=>({...sample,state:{...sample.state,lat_rad:sample.state.lat_rad+.0001,heading_rad:(sample.state.heading_rad+1)%(Math.PI*2)}}))};
  await page.locator('#recording-file').setInputFiles({name:'synthetic-review-location.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(synthetic))});
  await page.waitForFunction(()=>document.querySelector('#recording-file').value===''&&document.querySelector('#notice').textContent.startsWith('Loaded recording'));
  await reloadPaused(beforeReview);
  // Explicit Restart discards the saved launch; this reloaded session's default
  // preset is EDFE, rather than the unrelated saved Darmstadt location.
  await prepareFlightUI(page,{controls:false});await page.locator('#flight-menu > summary').click();await page.locator('#reset').click();await ready();
  const resetInit=await init();assert(Math.abs(resetInit.ic.lat_rad-49.96*Math.PI/180)<1e-10);assert(Math.abs(resetInit.ic.lat_rad-beforeReview.lat_rad)>.001);
  await reloadPaused(await latest());
  // A real native runway session restores through gear settling at rest, without
  // inventing an airport/exercise declaration in the location-only snapshot.
  await prepareFlightUI(page,{controls:false});await page.locator('#scene').focus();await page.keyboard.press('m');await page.locator('.practice-map-heading').click();
  await page.locator('#airport-play-start').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Flying'&&window.locationStates.at(-1)?.step>120,null,{timeout:60000});
  await page.locator('#scene').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Paused');
  const ground=await latest();assert.equal(ground.gear_left_wow,1);assert.equal(ground.gear_right_wow,1);
  await page.reload();await ready();
  const groundInit=await init();assert.equal(groundInit.runway_start,true);assert.equal(groundInit.ic.tas_mps,0);
  assert(Math.abs(groundInit.ic.lat_rad-ground.lat_rad)<1e-10);assert(Math.abs(groundInit.ic.lon_rad-ground.lon_rad)<1e-10);
  const parked=await latest();assert.equal(parked.collision_mask,0);assert.equal(parked.gear_nose_wow,1);assert.equal(parked.gear_left_wow,1);assert.equal(parked.gear_right_wow,1);
  assert.equal(await page.locator('#parking-brake').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#status').textContent(),'Paused');
  assert.equal(await page.evaluate(()=>window.locationMessages.some(m=>m.type==='run')),false);
  // A malformed local payload cannot select arbitrary initialization fields.
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,mode:'ground',lat_rad:0,lon_rad:0,alt_msl_m:0,heading_rad:0,execute:'window.executed=true'})),KEY);
  await page.reload();await ready();assert(Math.abs((await init()).ic.lat_rad-49.96*Math.PI/180)<1e-10);assert.equal(await page.evaluate(()=>window.executed),undefined);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'pass',checks:['real live airborne location survives reload through native initialization while Paused','synthetic imported Review cannot replace the last live location','explicit Restart clears the old location','actual runway ground location reloads settled, braked and Paused','malformed local payload falls back safely'],browser:browser.version()},null,2));
} finally { await browser?.close();server.kill(); }
