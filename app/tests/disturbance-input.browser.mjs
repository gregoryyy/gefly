// Task153 / R-INPUT-1/R-SIM-5: actual app released-command and aileron-return regression.
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
const scenarioConfigs=[{id:'neutral',kind:'neutral',duration:20},{id:'pointer-right-15px',kind:'pointer',sign:1,duration:20},{id:'pointer-left-15px',kind:'pointer',sign:-1,duration:20},{id:'keyboard-right',kind:'keyboard',sign:1,duration:20},{id:'keyboard-left',kind:'keyboard',sign:-1,duration:20}];
const selectedCase=process.env.GF_CASE;
assert(selectedCase===undefined||scenarioConfigs.some(c=>c.id===selectedCase),'Unknown GF_CASE; choose '+scenarioConfigs.map(c=>c.id).join(', '));
const scenarios=selectedCase===undefined?scenarioConfigs:scenarioConfigs.filter(c=>c.id===selectedCase);
const observeOnly=process.env.GF_DISTURBANCE_OBSERVE_ONLY==='1';
// Source numerical repeatability budget, not an aircraft handling tolerance.
const returnBudget_rad=1e-10*Math.PI/180;
const returnTimes_s=[.5,1,2,5,10,20];
const label=process.env.GF_DISTURBANCE_LABEL??(nativeDir?'candidate':'baseline');
assert(/^[a-z0-9-]{1,40}$/.test(label),'bounded artifact label');
const nativeFiles=['jsbsim.mjs','jsbsim.wasm','build-info.json'];
const candidate=nativeDir?Object.fromEntries(await Promise.all(nativeFiles.map(async name=>[name,await readFile(resolve(nativeDir,name))]))):null;
const out=fileURLToPath(new URL('../../output/flight/',import.meta.url));
const paths=['app/src/main.ts','app/src/pointer-yoke.ts','app/src/pilot-controls.ts','app/src/control-settings.ts','app/src/scene.ts','studies/e1-browser/sim/worker.js','studies/e1-browser/sim/dist/jsbsim.wasm'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(resolve(sourceRoot,path))).digest('hex')])));
const fields=['step','t_s','simulation_rate','roll_rad','pitch_rad','heading_rad','tas_mps','cas_mps','aero_p_radps','aero_q_radps','aero_r_radps','aero_alpha_rad','aero_v_mps','elevator_cmd_norm','aileron_cmd_norm','rudder_cmd_norm','aileron_rad','right_aileron_rad','rudder_rad','elevator_rad','roll_trim_norm','yaw_trim_norm','initial_balance_profile','kap_engaged','throttle_norm'];
const result={source_provenance:{repository_root:repositoryRoot,source_root:sourceRoot,source_root_override:process.env.GF_DISTURBANCE_SOURCE_ROOT!==undefined,server_origin:origin,ownership:'This harness only writes its own ignored diagnostic artifacts; source roots and native files are read-only. The caller identifies the source checkout serving GF_ORIGIN.'},scope:'Current localhost app, isolated Chrome contexts, actual Worker/native. Scenery pixel fixtures and read-only observers only. Released-command and aileron-return regression; observe-only is diagnostic, never a return-criterion pass. No aircraft-fidelity acceptance.',origin,suite:{expected_cases:scenarioConfigs.map(c=>c.id),selected_cases:scenarios.map(c=>c.id),executed_cases:[],complete:false},observe_only:observeOnly,return_check:{status:'not_evaluated',budget_rad:returnBudget_rad,at_s:returnTimes_s,reference:'Each actual surface must return to its own initial trimmed angle; not absolute zero.'},variant:candidate?{label,files:Object.fromEntries(Object.entries(candidate).map(([k,v])=>[k,{bytes:v.length,sha256:createHash('sha256').update(v).digest('hex')}]))}:{label,native:'unchanged ROOT'},harness_sha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),cases:[],errors:[],before:await hashes()};
let browser;
function summarize(rows,release){
 const pick=t=>rows.reduce((best,row)=>Math.abs(row.t_s-(release+t))<Math.abs(best.t_s-(release+t))?row:best,rows[0]);
 const after=rows.filter(s=>s.t_s>=release+.1);
 return{release_t_s:release,afterReleaseAxesZero:after.every(s=>s.aileron_cmd_norm===0&&s.elevator_cmd_norm===0&&s.rudder_cmd_norm===0),samples:rows.length,at:Object.fromEntries([0,.5,1,2,5,10,20].map(t=>[t,pick(t)]))};
}
function surfaceReturn(initial,summary,kind){
 const observations=returnTimes_s.map(after_s=>{
  const row=summary.at[after_s],left_rad=row?.aileron_rad,right_rad=row?.right_aileron_rad;
  const finite=[initial.aileron_rad,initial.right_aileron_rad,left_rad,right_rad].every(Number.isFinite);
  const left_delta_rad=left_rad-initial.aileron_rad,right_delta_rad=right_rad-initial.right_aileron_rad;
  return{after_s,left_rad,right_rad,left_delta_rad,right_delta_rad,finite,
   within_budget:finite&&Math.abs(left_delta_rad)<=returnBudget_rad&&Math.abs(right_delta_rad)<=returnBudget_rad};
 });
 return{status:observeOnly||kind==='neutral'?'not_evaluated':observations.every(o=>o.within_budget)?'pass':'fail',
  reason:observeOnly?'Explicit observe-only diagnostic; return criterion not asserted.':kind==='neutral'?'Neutral control case has no deliberate roll input; numeric surface-repeatability guard only.':undefined,
  budget_rad:returnBudget_rad,initial_left_rad:initial.aileron_rad,initial_right_rad:initial.right_aileron_rad,observations};
}
try{
 await mkdir(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});result.browser=browser.version();
 for(const config of scenarios){
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
  const record={config,initial,press,noMotion,release,summary,rows,commands,nativeServed,return_check:surfaceReturn(initial,summary,config.kind)};
  result.cases.push(record);
  if(!observeOnly)for(const point of record.return_check.observations){
   assert(point.finite,`${config.id}: actual initial and released aileron angles must be finite at+${point.after_s}s`);
   assert(point.within_budget,`${config.id}: actual ailerons must return to their own initial trimmed angles at+${point.after_s}s; residual L/R ${point.left_delta_rad}/${point.right_delta_rad}rad, budget${returnBudget_rad}rad`);
  }
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
   assert.equal(before.step,after.step);assert.equal(before.digest,after.digest);assert.deepEqual(before.final_state,after.final_state);
   assert(Math.abs(cockpit.cameraUpDotBodyUp-Math.cos(8*Math.PI/180))<1e-6);
   assert(Math.abs(chase.cameraUpDotLocalUp-30/Math.hypot(30,11))<1e-6);
   record.camera={before:{step:before.step,digest:before.digest},cockpit,chase,after:{step:after.step,digest:after.digest}};
  }
  if(!result.cases.includes(record))result.cases.push(record);console.log(JSON.stringify({case:config.id,release:release.t_s,zero:summary.afterReleaseAxesZero,rollRelease_deg:release.roll_rad*180/Math.PI,roll20_deg:summary.at[20].roll_rad*180/Math.PI,rate20_degps:summary.at[20].aero_p_radps*180/Math.PI,aileronInitial:initial.aileron_rad,aileronReleased:summary.at[20].aileron_rad}));
  await context.close();
 }
 assert(result.cases.length>0,'At least one actual-app scenario must execute');
 result.after=await hashes();assert.deepEqual(result.before,result.after);assert.deepEqual(result.errors,[]);
 result.suite.executed_cases=result.cases.map(c=>c.config.id);
 result.suite.complete=result.cases.length===scenarioConfigs.length&&scenarioConfigs.every(c=>result.suite.executed_cases.includes(c.id));
 const hasRollInput=result.cases.some(c=>c.config.kind!=='neutral');
 result.return_check.status=observeOnly||!hasRollInput?'not_evaluated':result.suite.complete?'pass':'partial';
 result.return_check.reason=observeOnly?'Explicit observe-only diagnostic.':!hasRollInput?'No deliberate roll input executed; roll-return criterion not evaluated.':!result.suite.complete?'Selected-case checks passed; complete five-case suite not evaluated.':undefined;
 result.result=result.return_check.status==='pass'?'pass':'observed';
}catch(e){result.result='fail';result.failure=String(e);result.return_check.status=observeOnly?'not_evaluated':result.cases.some(c=>c.return_check?.observations.some(o=>!o.within_budget))?'fail':'not_evaluated';result.after=await hashes();throw e;}
finally{await writeFile(out+'disturbance-input-browser'+(label==='baseline'?'':'-'+label)+'.json',JSON.stringify(result,null,2)+'\n');await browser?.close();}
