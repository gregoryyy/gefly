// Task153 / R-INPUT-1/R-SIM-5: actual running app input/actuator observations.
// Scenery pixels and read-only observers are fixtures; no physics command is replaced.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {installSceneryFixture,startOrResume,prepareFlightUI} from './flight-actions.mjs';
const origin=process.env.GF_ORIGIN??'http://localhost:5173';
const repositoryRoot=fileURLToPath(new URL('../..',import.meta.url));
// For an already running server from another checkout, identify its source explicitly.
const sourceRoot=resolve(process.env.GF_DISTURBANCE_SOURCE_ROOT??repositoryRoot);
const nativeDir=process.env.GF_DISTURBANCE_NATIVE_DIR;
const label=process.env.GF_DISTURBANCE_LABEL??(nativeDir?'candidate':'baseline');
assert(/^[a-z0-9-]{1,40}$/.test(label),'bounded artifact label');
const nativeFiles=['jsbsim.mjs','jsbsim.wasm','build-info.json'];
const candidate=nativeDir?Object.fromEntries(await Promise.all(nativeFiles.map(async name=>[name,await readFile(new URL(name,'file://'+nativeDir.replace(/\/$/,'')+'/'))]))):null;
const out=fileURLToPath(new URL('../../output/flight/',import.meta.url));
const paths=['app/src/main.ts','app/src/pointer-yoke.ts','app/src/pilot-controls.ts','app/src/control-settings.ts','app/src/scene.ts','studies/e1-browser/sim/worker.js','studies/e1-browser/sim/dist/jsbsim.wasm'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(resolve(sourceRoot,path))).digest('hex')])));
const fields=['step','t_s','simulation_rate','roll_rad','pitch_rad','heading_rad','tas_mps','cas_mps','aero_p_radps','aero_q_radps','aero_r_radps','aero_alpha_rad','aero_v_mps','elevator_cmd_norm','aileron_cmd_norm','rudder_cmd_norm','aileron_rad','right_aileron_rad','rudder_rad','elevator_rad','roll_trim_norm','yaw_trim_norm','initial_balance_profile','kap_engaged','throttle_norm'];
const result={source_provenance:{repository_root:repositoryRoot,source_root:sourceRoot,source_root_override:process.env.GF_DISTURBANCE_SOURCE_ROOT!==undefined,server_origin:origin,ownership:'This harness only writes its own ignored diagnostic artifacts; source roots and native files are read-only. The caller identifies the source checkout serving GF_ORIGIN.'},scope:'Current localhost app, isolated Chrome contexts, actual Worker/native. Scenery pixel fixtures and read-only observers only. Input/actuator observations, not aircraft-fidelity acceptance.',origin,variant:candidate?{label,files:Object.fromEntries(Object.entries(candidate).map(([k,v])=>[k,{bytes:v.length,sha256:createHash('sha256').update(v).digest('hex')}]))}:{label,native:'unchanged ROOT'},harness_sha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),cases:[],errors:[],before:await hashes()};
let browser;
function summarize(rows,release){
 const pick=t=>rows.reduce((best,row)=>Math.abs(row.t_s-(release+t))<Math.abs(best.t_s-(release+t))?row:best,rows[0]);
 const after=rows.filter(s=>s.t_s>=release+.1);
 return{release_t_s:release,afterReleaseAxesZero:after.every(s=>s.aileron_cmd_norm===0&&s.elevator_cmd_norm===0&&s.rudder_cmd_norm===0),samples:rows.length,at:Object.fromEntries([0,.5,1,2,5,10,20].map(t=>[t,pick(t)]))};
}
try{
 await mkdir(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});result.browser=browser.version();
 for(const config of[{id:'neutral',kind:'neutral',duration:20},{id:'pointer-right-15px',kind:'pointer',sign:1,duration:20},{id:'pointer-left-15px',kind:'pointer',sign:-1,duration:20},{id:'keyboard-right',kind:'keyboard',sign:1,duration:20},{id:'keyboard-left',kind:'keyboard',sign:-1,duration:20}].filter(c=>!process.env.GF_CASE||process.env.GF_CASE===c.id)){
  const nativeServed=[];
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>result.errors.push({case:config.id,error:String(e)}));
  await page.addInitScript(({fields})=>{
   localStorage.clear();window.diagStates=[];window.diagCommands=[];window.diagStats=[];
   const Native=Worker;window.Worker=class extends Native{constructor(url,opts){super(url,opts);if(String(url).includes('/sim/worker.js')){window.diagWorker=this;this.addEventListener('message',({data})=>{if(data.type==='state')window.diagStates.push(Object.fromEntries(fields.map(k=>[k,data[k]])));if(data.type==='stats')window.diagStats.push(data);});}}
    postMessage(message,...args){if(this===window.diagWorker&&['init','input','kap140','autopilot-capture'].includes(message?.type))window.diagCommands.push({wall_ms:performance.now(),state_t_s:window.diagStates.at(-1)?.t_s,message:structuredClone(message)});return super.postMessage(message,...args);}};
  },{fields});
  if(candidate) for(const name of nativeFiles)await page.route('**/studies/e1-browser/sim/dist/'+name+'*',route=>{nativeServed.push(name);return route.fulfill({contentType:name.endsWith('.wasm')?'application/wasm':name.endsWith('.json')?'application/json':'text/javascript',body:candidate[name]});});
  await installSceneryFixture(page);await page.route('**/scenery/airports/**',route=>route.abort());
  await page.route('**/src/scene.ts*',async route=>{const response=await route.fetch(),s=await response.text(),marker='const scene = widget.scene;';assert.equal(s.split(marker).length,2);await route.fulfill({response,body:s.replace(marker,marker+' window.diagScene=scene;')});});
  await page.goto(origin);await page.waitForFunction(()=>window.diagStates.length&&!document.querySelector('#start').disabled,null,{timeout:60000});
  await startOrResume(page);await page.waitForFunction(()=>window.diagStates.at(-1).t_s>=2);const initial=await page.evaluate(()=>window.diagStates.at(-1));
  assert.equal(initial.simulation_rate,1);assert.equal(initial.initial_balance_profile,1);assert.equal(initial.kap_engaged,0);
  let press,release,noMotion;
  const scene=page.locator('#scene');await scene.focus();
  if(config.kind==='pointer'){
   const rect=await scene.boundingBox(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   await page.mouse.click(x,y);await page.mouse.move(x+config.sign*15,y);
   await page.waitForFunction(sign=>Math.abs(window.diagStates.at(-1).aileron_cmd_norm-sign*.05)<.004,config.sign);
   press=await page.evaluate(()=>window.diagStates.at(-1));await page.waitForTimeout(1000);
   noMotion=await page.evaluate(()=>window.diagStates.at(-1)); // A lifted finger produces no new pointer event.
   await page.mouse.move(x,y);await page.waitForFunction(()=>Math.abs(window.diagStates.at(-1).aileron_cmd_norm)<1e-10);
   release=await page.evaluate(()=>window.diagStates.at(-1));
  }else if(config.kind==='keyboard'){
   const key=config.sign>0?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);
   await page.waitForFunction(sign=>window.diagStates.at(-1).aileron_cmd_norm===sign*.45,config.sign);
   press=await page.evaluate(()=>window.diagStates.at(-1));await page.waitForTimeout(200);await page.keyboard.up(key);
   await page.waitForFunction(()=>window.diagStates.at(-1).aileron_cmd_norm===0);release=await page.evaluate(()=>window.diagStates.at(-1));
  }else release=initial;
  await page.waitForFunction(t=>window.diagStates.at(-1).t_s>=t,release.t_s+config.duration,{timeout:45000});
  await scene.focus();await page.keyboard.press('Space');await page.waitForTimeout(150);
  const rows=await page.evaluate(()=>window.diagStates),commands=await page.evaluate(()=>window.diagCommands),summary=summarize(rows,release.t_s);
  assert(summary.afterReleaseAxesZero,'all product-released external commands remain zero');
  assert(rows.every(s=>s.kap_engaged===0&&s.simulation_rate===1));
  const record={config,initial,press,noMotion,release,summary,rows,commands,nativeServed};
  if(candidate){assert(nativeServed.includes('jsbsim.mjs'));assert(nativeServed.includes('jsbsim.wasm'));}
  if(config.id==='pointer-right-15px'){
   const stats=async()=>{const n=await page.evaluate(()=>window.diagStats.length);await page.evaluate(()=>window.diagWorker.postMessage({type:'stats'}));await page.waitForFunction(n=>window.diagStats.length>n,n);return page.evaluate(()=>window.diagStats.at(-1));};
   const before=await stats();await prepareFlightUI(page,{controls:false});
   const camera=async view=>{const menu=page.locator('#view-menu');if(!await menu.evaluate(m=>m.open))await menu.locator(':scope>summary').click();await page.locator('#'+view).click();await page.waitForTimeout(100);return page.evaluate(async()=>{
     const s=window.diagStates.at(-1),scene=window.diagScene,{aircraftBasisENU}=await import('/src/aircraft-orientation.ts');
     const lon=s?window.diagStats.at(-1).final_state[2]:0,lat=window.diagStats.at(-1).final_state[1];
     const basis=aircraftBasisENU(s.heading_rad,s.pitch_rad,s.roll_rad);
     const east=[-Math.sin(lon),Math.cos(lon),0],north=[-Math.sin(lat)*Math.cos(lon),-Math.sin(lat)*Math.sin(lon),Math.cos(lat)],up=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
     const world=v=>[0,1,2].map(i=>east[i]*v[0]+north[i]*v[1]+up[i]*v[2]);const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);const tuple=v=>[v.x,v.y,v.z];
     return{roll_rad:s.roll_rad,pitch_rad:s.pitch_rad,view:document.querySelector('#scene').dataset.cameraView,up:tuple(scene.camera.upWC),direction:tuple(scene.camera.directionWC),cameraUpDotBodyUp:dot(tuple(scene.camera.upWC),world(basis.up)),cameraUpDotLocalUp:dot(tuple(scene.camera.upWC),up),bodyUpDotLocalUp:dot(world(basis.up),up)};
    });};
   const cockpit=await camera('cockpit'),chase=await camera('chase'),after=await stats();
   record.camera={before:{step:before.step,digest:before.digest,final_state:before.final_state},cockpit,chase,after:{step:after.step,digest:after.digest}};
   console.log(JSON.stringify({camera:record.camera}));
   result.cases.push(record);
   assert.equal(before.step,after.step);assert.equal(before.digest,after.digest);assert.deepEqual(before.final_state,after.final_state);
   assert(Math.abs(cockpit.cameraUpDotBodyUp-Math.cos(8*Math.PI/180))<1e-6);
   assert(Math.abs(chase.cameraUpDotLocalUp-30/Math.hypot(30,11))<1e-6);
   record.camera={before:{step:before.step,digest:before.digest},cockpit,chase,after:{step:after.step,digest:after.digest}};
  }
  if(!result.cases.includes(record))result.cases.push(record);console.log(JSON.stringify({case:config.id,release:release.t_s,zero:summary.afterReleaseAxesZero,rollRelease_deg:release.roll_rad*180/Math.PI,roll20_deg:summary.at[20].roll_rad*180/Math.PI,rate20_degps:summary.at[20].aero_p_radps*180/Math.PI,aileronInitial:initial.aileron_rad,aileronReleased:summary.at[20].aileron_rad}));
  await context.close();
 }
 result.after=await hashes();assert.deepEqual(result.before,result.after);assert.deepEqual(result.errors,[]);result.result='pass';
}catch(e){result.result='fail';result.failure=String(e);throw e;}
finally{await writeFile(out+'disturbance-input-browser'+(label==='baseline'?'':'-'+label)+'.json',JSON.stringify(result,null,2)+'\n');await browser?.close();}
