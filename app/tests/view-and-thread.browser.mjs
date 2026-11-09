import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {installSceneryFixture,prepareFlightUI,startOrResume} from './flight-actions.mjs';
const app=fileURLToPath(new URL('..',import.meta.url)),out=fileURLToPath(new URL('../../output/flight/',import.meta.url));
const server=spawn(process.execPath,['--input-type=module','-e',`import{createServer}from'vite';const s=await createServer({server:{host:'127.0.0.1',port:5386,strictPort:true,hmr:false,watch:{ignored:['**/*']}}});await s.listen();s.printUrls();`],{cwd:app,stdio:'pipe'});
let log='',browser;server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
const result={checks:[],errors:[]};
try{
 await mkdir(out,{recursive:true});for(let i=0;i<150&&!log.includes('Local:');i++)await new Promise(r=>setTimeout(r,100));assert(log.includes('Local:'),log);
 browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>result.errors.push(String(error)));await installSceneryFixture(page);
 await page.route('**/scenery/airports/**',route=>route.abort());
 await page.addInitScript(()=>{window.threadWorkers=[];window.viewStates=[];window.viewStats=[];const Native=Worker;
 window.Worker=class extends Native{constructor(url,options){super(url,options);window.threadWorkers.push({url:String(url),name:options?.name});
 if(String(url).includes('/sim/worker.js')){window.viewWorker=this;this.addEventListener('message',({data})=>{if(data.type==='state')window.viewStates.push(data);if(data.type==='stats')window.viewStats.push(data);});}}};});
 await page.goto('http://127.0.0.1:5386');await page.waitForFunction(()=>window.viewStates.length&&!document.querySelector('#start').disabled,null,{timeout:60000});
 await startOrResume(page);await page.waitForFunction(()=>window.viewStates.at(-1).step>60);await page.locator('#scene').focus();await page.keyboard.press('Space');await prepareFlightUI(page);
 const stats=async()=>{const n=await page.evaluate(()=>window.viewStats.length);await page.evaluate(()=>window.viewWorker.postMessage({type:'stats'}));await page.waitForFunction(n=>window.viewStats.length>n,n);return page.evaluate(()=>window.viewStats.at(-1));};
 const before=await stats();await page.locator('#view-menu>summary').click();await page.locator('#overview').click();
 await page.waitForFunction(()=>document.querySelector('#scene').dataset.cameraView==='overview');
 const scene=await page.locator('#scene').boundingBox();await page.mouse.move(scene.x+scene.width/2,scene.y+scene.height/2);
 for(let i=0;i<8;i++){await page.mouse.wheel(0,200);await page.waitForTimeout(20);}
 await page.waitForTimeout(100);const distance=Number(await page.locator('#scene').getAttribute('data-overview-distance-m'));assert(distance>1_000_000&&distance<=20_000_000);
 const after=await stats();assert.equal(after.step,before.step);assert.equal(after.digest,before.digest);assert.deepEqual(after.final_state,before.final_state);
 result.checks.push('Actual terrain overview camera zooms to continental/Earth scale while paused native pose, step and digest stay unchanged');
 result.camera={distance_m:distance};
 const data=await page.evaluate(async()=>{
  const {createTerrainOverviewSource}=await import('/src/terrain-overview-source.ts');
  const {composeTerrainOverview,decodeCopernicusOverview}=await import('/src/terrain-overview.ts');
  const world={version:1,id:'thread-fixture',width:361,height:181,west_rad:-Math.PI,east_rad:Math.PI,south_rad:-Math.PI/2,north_rad:Math.PI/2,physical_m:new Float64Array(361*181).fill(100),geoid_m:new Float64Array(361*181).fill(30)};
  const bytes=new ArrayBuffer(64+129*129*4),v=new DataView(bytes);new Uint8Array(bytes).set([71,70,67,79,80,51,48,0]);for(const[o,n]of[[8,2],[12,793],[16,224],[20,129]])v.setUint32(o,n,true);for(let i=0;i<129*129;i++)v.setFloat32(64+i*4,1000+i%10,true);
  const raw=await decodeCopernicusOverview(bytes,793,224),expected=await composeTerrainOverview(world,793,224,raw,[]),source=createTerrainOverviewSource(world);
  try{const actual=await source.compose(793,224,raw,[],new AbortController().signal);
   if(actual.sha256!==expected.sha256||!actual.physical_m.every((n,i)=>n===expected.physical_m[i])||!actual.geoid_m.every((n,i)=>n===expected.geoid_m[i]))throw Error('Threaded composition differs');
   const cancelled=new AbortController();cancelled.abort();await source.compose(793,224,raw,[],cancelled.signal);
   return{sha256:actual.sha256,nodes:actual.physical_m.length,worldRetained:world.physical_m.length,rawRetained:raw.physical_m.length};
  }finally{source.dispose();}
 });
 result.overview=data;assert.equal(data.nodes,16641);assert.equal(data.rawRetained,16641);assert.equal(data.worldRetained,65341);
 const workers=await page.evaluate(()=>window.threadWorkers);assert(workers.some(w=>w.name==='gefly-terrain-overview'));result.workers=workers;
 result.checks.push('Real dedicated terrain overview Worker produces exact physical/geoid arrays and source hash without detaching retained inputs; cancelled composition is discarded');
 const physical=await page.evaluate(async()=>{
  const {createTerrainSourceStream}=await import('/studies/e1-browser/sim/terrain-source-client.js');
  const {WorldTerrainStream}=await import('/studies/e1-browser/sim/terrain-stream.js');
  const {default:createNative}=await import('/studies/e1-browser/sim/dist/jsbsim.mjs');
  const [a,b]=await Promise.all([createNative({print(){},printErr(){}}),createNative({print(){},printErr(){}})]);
  const install=M=>g=>{const p=M._malloc(g.physical_m.byteLength);try{M.HEAPF64.set(g.physical_m,p/8);const rc=M._gf_set_terrain_tile(g.slot,g.west_rad,g.south_rad,g.east_rad,g.north_rad,g.width,g.height,p,g.physical_m.length);if(rc)throw Error('tile'+rc);}finally{M._free(p);}};
  const threaded=createTerrainSourceStream(install(a),g=>a._gf_remove_terrain_tile(g.slot),{fine:true});
  try{
   await threaded.ready;
   for(const M of[a,b]){const g=threaded.fine,p=M._malloc(g.physical_m.byteLength);try{M.HEAPF64.set(g.physical_m,p/8);const rc=M._gf_configure_terrain_grid(g.west_rad,g.south_rad,g.east_rad,g.north_rad,g.width,g.height,p,g.physical_m.length);if(rc)throw Error('configure'+rc);}finally{M._free(p);}}
   await threaded.move(49.96*Math.PI/180,8.64*Math.PI/180);
   const inline=new WorldTerrainStream(threaded.world,threaded.manifest,install(b),g=>b._gf_remove_terrain_tile(g.slot));
   try{
    await inline.move(49.96*Math.PI/180,8.64*Math.PI/180);
    for(const[id,g]of threaded.tiles){const other=inline.tiles.get(id);if(g.sha256!==other.sha256||!g.physical_m.every((v,i)=>v===other.physical_m[i])||!g.geoid_m.every((v,i)=>v===other.geoid_m[i]))throw Error('source arrays differ');}
    for(const M of[a,b]){const rc=M._gf_init(1/120,49.96*Math.PI/180,8.64*Math.PI/180,1200,1,45);if(rc)throw Error('nativeinit'+rc);for(let i=0;i<120;i++){M._gf_set_inputs(0,0,0,M._gf_trim_throttle());if(M._gf_step())throw Error('native step');}}
    const state=M=>Array.from(M.HEAPF64.subarray(M._gf_state()/8,M._gf_state()/8+14));
    if(JSON.stringify(state(a))!==JSON.stringify(state(b))||a.UTF8ToString(a._gf_digest_hex())!==b.UTF8ToString(b._gf_digest_hex()))throw Error('native trajectory differs');
    return{cells:threaded.tiles.size,steps:a._gf_step_index(),digest:a.UTF8ToString(a._gf_digest_hex()),mode:threaded.constructor.name};
   }finally{inline.cancel();}
  }finally{threaded.cancel();}
 });
 result.physical=physical;assert.equal(physical.cells,9);assert.equal(physical.steps,120);assert.equal(physical.mode,'TerrainSourceClient');
 result.checks.push('Actual terrain source Worker and inline reference install exactly equal nine-cell arrays; two real WASM engines match all14state fields and trajectory digest after120steps');
 await page.locator('#view-menu>summary').click();await page.locator('#chase').click();await page.waitForFunction(()=>document.querySelector('#scene').dataset.cameraView==='chase');
 assert.equal((await stats()).digest,before.digest);assert.deepEqual(result.errors,[]);result.result='pass';
 await page.screenshot({path:out+'terrain-overview-view.png'});console.log(JSON.stringify(result,null,2));
}catch(error){result.result='fail';result.failure=String(error);result.serverLog=log;throw error;}
finally{await writeFile(out+'view-and-thread-browser.json',JSON.stringify(result,null,2)+'\n');await browser?.close();server.kill('SIGTERM');}
