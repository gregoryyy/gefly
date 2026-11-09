// R-AP-3: acknowledged production-worker modes survive a fresh native launch.
// Only fixed local asset transport is adapted. No fake aircraft/AP telemetry.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Worker, parentPort, isMainThread } from 'node:worker_threads';
import { captureAutopilotReload } from './autopilot-reload.js';
import { KAP_FIELDS } from './kap140.js';
import { NAVIGATION_FIELDS } from './navigation.js';

if (!isMainThread) {
  globalThis.self=globalThis;globalThis.postMessage=(message,transfer)=>parentPort.postMessage(message,transfer);
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    if(typeof url!=='string'||!url.startsWith('/'))return nativeFetch(url,options);
    parentPort.postMessage({type:'diagnostic-asset',url});
    try{return new Response(await readFile(new URL('../../../app/public'+url.split('?')[0],import.meta.url)));}
    catch{return new Response(null,{status:404});}
  };
  await import('./worker.js');parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({type:'diagnostic-ready'});
}else{
  const RAD=Math.PI/180,results=[],rejections=[],runtimeUrl=new URL('./dist/jsbsim.wasm',import.meta.url);
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),wasmHash=hash(await readFile(runtimeUrl));
  async function harness(){
    const worker=new Worker(new URL(import.meta.url)),messages=[];let error;
    worker.on('error',e=>{error=e;});worker.on('message',m=>{if(!['terrain-tile','terrain-remove'].includes(m.type))messages.push(m);});
    async function wait(type,offset=0,allowError=false){const end=Date.now()+25000;while(Date.now()<end){
      if(error)throw error;const bad=messages.slice(offset).find(m=>m.type==='error');if(bad&&!allowError)throw Error(bad.message);
      const hit=messages.slice(offset).find(m=>m.type===type);if(hit)return hit;await new Promise(r=>setTimeout(r,2));}throw Error('Timeout '+type);}
    async function send(message,type='state',allowError=false){const offset=messages.length;worker.postMessage(message);return wait(type,offset,allowError);}
    async function init(message){const offset=messages.length;worker.postMessage(message);const ready=await wait('ready',offset),state=await wait('state',offset);return{ready,state};}
    await wait('diagnostic-ready');return{worker,messages,send,init};
  }
  const nav={radio_nav_active_khz:110500,radio_obs_deg:123,radio_demo_enabled:0,radio_nav2_active_khz:114200,radio_obs2_deg:222};
  const initialIC={lat_rad:40.75*RAD,lon_rad:-74*RAD,alt_msl_m:1000,heading_rad:1.2,tas_mps:90*1852/3600};
  const initMessage=ic=>({type:'init',aircraft:'c172x',dt_s:1/120,state_hz:60,kap140:true,regional_navigation:true,
    terrain:true,streaming_terrain:true,ground_collision:true,ic});
  async function acknowledge(mode){const h=await harness();try{
    await h.init(initMessage(initialIC));let state=await h.send({type:'navigation',config:nav});
    const command=async(action,value)=>{state=await h.send({type:'kap140',command:{action,...(value===undefined?{}:{value})}});};
    await command('heading',2.2);await command('select-altitude',2200);
    if(mode!=='off'){await command('ap');await command('hdg');if(mode==='vs-arm'){
      await command('select-altitude',2200);for(let i=0;i<4;i++){await command('vertical',1);await command('vertical',0);}
    }else await command('alt');}
    await command('baro-setting',100000);await command('baro-units');
    if(mode==='cws')await command('cws',1);
    const payload=captureAutopilotReload(state);assert(payload);return{state,payload};
  }finally{await h.worker.terminate();}}
  const derived=new Set(['kap_indicated_altitude_m','kap_nav_valid','kap_nav_kind','kap_gs_valid','kap_elevator_norm']);
  async function reload(id,ack,ic=initialIC,ground=false){const h=await harness();try{
    const {ready,state}=await h.init({...initMessage(ic),...(ground?{runway_start:true}:{}),autopilot_reload:ack.payload});
    for(const key of KAP_FIELDS)if(!derived.has(key))assert.equal(state[key],ack.payload.kap[key],id+': '+key);
    for(const key of NAVIGATION_FIELDS)assert.equal(state[key],ack.payload.navigation[key],id+': '+key);
    assert.equal(state.kap_cws,0);assert.equal(state.step,0);assert.equal(state.t_s,0);
    const before=await h.send({type:'stats'},'stats');await new Promise(r=>setTimeout(r,20));const after=await h.send({type:'stats'},'stats');
    assert.equal(after.step,0);assert.equal(after.digest,before.digest);assert.deepEqual(after.final_state,before.final_state);
    if(ground){assert.equal(state.throttle_norm,0);assert.equal(state.brake_left_norm,1);assert.equal(state.brake_right_norm,1);assert.equal(state.gear_nose_wow,1);}
    const entry={id,acknowledged:ack.state,saved:ack.payload,first_state:state,paused_digest:after.digest,navdata_sha256:ready.navdata_sha256};
    if(id==='source-lost'){
      assert.equal(state.kap_nav_valid,0);assert.equal(state.kap_gs_valid,0);
      await h.send({type:'burst',steps:1,blocks:1},'burst');const stepped=await h.send({type:'kap140',command:{action:'baro'}});
      assert.equal(stepped.kap_lateral,0);assert.equal(stepped.kap_vertical,0);assert.equal(stepped.kap_lateral_alert,3);assert.equal(stepped.kap_vertical_alert,2);
      entry.after_first_native_step=stepped;
    }
    results.push(entry);
  }finally{await h.worker.terminate();}}
  let hdg;
  for(const mode of ['hdg-alt','vs-arm','off','cws']){const ack=await acknowledge(mode);if(mode==='hdg-alt')hdg=ack;
    if(mode==='vs-arm'){assert.equal(ack.state.kap_alt_arm,1);assert(ack.state.kap_vs_target_mps>0);}
    await reload(mode,ack);
  }
  await reload('ground-settings',hdg,initialIC,true);
  {
    const data=JSON.parse(await readFile(new URL('../../../app/public/navdata/rhein-main-v1.json',import.meta.url),'utf8'));
    const loc=data.records.find(r=>r.id==='IFCW'&&r.kind==='LOC'),bearing=(loc.front_course_true_deg+180)*RAD,distance=5*1852/6371000;
    const lat=loc.gs.lat_deg*RAD,lon=loc.gs.lon_deg*RAD;
    const y=Math.asin(Math.sin(lat)*Math.cos(distance)+Math.cos(lat)*Math.sin(distance)*Math.cos(bearing));
    const x=lon+Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(lat),Math.cos(distance)-Math.sin(lat)*Math.sin(y));
    const ic={lat_rad:y,lon_rad:x,alt_msl_m:loc.gs.elevation_m+Math.tan(2.9*RAD)*5*1852,heading_rad:loc.front_course_true_deg*RAD,tas_mps:45};
    const h=await harness();let ack;try{
      await h.init(initMessage(ic));await h.send({type:'navigation',config:{...nav,radio_nav_active_khz:111550,radio_obs_deg:250}});
      await h.send({type:'kap140',command:{action:'ap'}});await h.send({type:'kap140',command:{action:'apr'}});
      await h.send({type:'burst',steps:1,blocks:1},'burst');const state=await h.send({type:'kap140',command:{action:'baro'}});
      assert.equal(state.kap_lateral,3);assert.equal(state.kap_vertical,2);assert.equal(state.kap_nav_valid,1);assert.equal(state.kap_gs_valid,1);
      ack={state,payload:captureAutopilotReload(state)};assert(ack.payload);
    }finally{await h.worker.terminate();}
    const savedIC={lat_rad:ack.state.lat_rad,lon_rad:ack.state.lon_rad,alt_msl_m:ack.state.alt_msl_m,heading_rad:ack.state.heading_rad,tas_mps:90*1852/3600};
    await reload('valid-nav-gs',ack,savedIC);await reload('source-lost',ack,initialIC);
  }
  {
    const h=await harness();try{
      const payload=hdg.payload;
      for(const patch of [{autopilot_reload:undefined},{autopilot_reload:{...payload,version:2}},
        {autopilot_reload:{...payload,kap:{...payload.kap,kap_cws:1}}},{autopilot_reload:{...payload,kap:{...payload.kap,kap_sensor_fault:1}}},
        {autopilot_reload:{...payload,navigation:{...payload.navigation,radio_obs_deg:360}}},
        {resume_state:{}},{landing_preset:'normal'},{height_agl_ft:1000},{navigation:nav},{kap140:false}]){
        const offset=h.messages.length;const failure=await h.send({...initMessage(initialIC),autopilot_reload:payload,...patch},'error',true);
        assert.match(failure.message,/autopilot reload/);assert(!h.messages.slice(offset).some(m=>m.type==='diagnostic-asset'));
        rejections.push({patch,error:failure.message});
      }
    }finally{await h.worker.terminate();}
  }
  assert.equal(hash(await readFile(runtimeUrl)),wasmHash);
  const build=JSON.parse(await readFile(new URL('./dist/build-info.json',import.meta.url),'utf8'));
  const files={};for(const file of ['./worker.js','./autopilot-reload.js','../../../app/src/session.ts'])files[file]=hash(await readFile(new URL(file,import.meta.url)));
  const report={scope:'Actual production Node Workers and current native bytes; source-derived historical NAV/GS geometry, no operational or aircraft-fidelity acceptance',
    wasm_sha256:wasmHash,build_record_wasm_sha256:build.wasm_sha256,build_record_matches:wasmHash===build.wasm_sha256,files,results,rejections};
  await writeFile(new URL('../../../output/flight/autopilot-reload-native-task143.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:'pass',checks:results.map(r=>r.id),preIOrejections:rejections.length,wasm_sha256:wasmHash,files},null,2));
}
