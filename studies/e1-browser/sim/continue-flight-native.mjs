// Actual worker/native reconstruction evidence; trace frames are not checkpoints.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resumeProblem,resumeValues,CONTINUATION_FIELDS} from './continue-flight.js';
globalThis.self=globalThis;const messages=[];globalThis.postMessage=m=>messages.push(m);await import('./worker.js');
async function send(data,type){const start=messages.length;self.onmessage({data});for(let i=0;i<2000;i++){await new Promise(r=>setTimeout(r,2));const result=messages.slice(start).find(m=>m.type===type||m.type==='error');if(result){assert.notEqual(result.type,'error',result.message);return result;}}throw Error('Worker timeout');}
const config={type:'init',aircraft:'c172x',kap140:true,terrain:false,ground_collision:true,dt_s:1/120,state_hz:60,ic:{lat_rad:.87,lon_rad:.15,alt_msl_m:1200,heading_rad:1,tas_mps:45}};
const command=command=>send({type:'kap140',command},'state');
const input=values=>self.onmessage({data:{type:'input',step:0,wall_ms:performance.timeOrigin+performance.now(),elevator:0,aileron:0,rudder:0,throttle:.8,...values}});
const burst=steps=>send({type:'burst',steps,blocks:1},'burst');
const state=()=>command({action:'baro'});
const observations=[];
for(const kind of ['banked-climb','engine-off','parked']){
 await send({...config,...(kind==='parked'?{runway_start:true}:{} )},'ready');
 input(kind==='engine-off'?{throttle:0,mixture_norm:.55,mixture_auto:false,engine_running:false,flap_norm:1/3,pitch_trim_norm:-.03}:kind==='parked'?{throttle:0,brake_norm:1}: {throttle:1,elevator:-.02,aileron:.02});
 await burst(kind==='parked'?12:360);
 if(kind==='banked-climb'){input({throttle:1});await burst(1);await command({action:'ap'});await command({action:'alt'});await command({action:'hdg'});await command({action:'select-altitude',value:1300});}
 const before=await state();assert.equal(resumeProblem(before),null,JSON.stringify(before));
 await send({...config,resume_state:before},'ready');const restored=await state();
 const close=(key,tolerance=1e-8)=>assert(Math.abs(restored[key]-before[key])<tolerance,`${kind} ${key}: ${before[key]} -> ${restored[key]}`);
 for(const key of ['t_s','step','lat_rad','lon_rad','alt_msl_m','roll_rad','pitch_rad','heading_rad','aero_u_mps','aero_v_mps','aero_w_mps','aero_p_radps','aero_q_radps','aero_r_radps','throttle_norm','pitch_trim_norm','pitch_trim_initial_norm','flap_command_norm','flap_rad','brake_left_norm','brake_right_norm','prop_radps','fuel_left_m3','fuel_right_m3','engine_running','engine_command_on','mixture_auto','altimeter_setting_pa'])close(key,key==='alt_msl_m'?1e-5:1e-8);
 if(kind==='engine-off')close('mixture_norm');
 for(const key of ['kap_engaged','kap_lateral','kap_vertical','kap_alt_arm','kap_heading_bug_rad','kap_selected_altitude_m','kap_hold_pressure_altitude_m','kap_vs_target_mps','kap_baro_setting_pa'])close(key);
 if(kind==='parked'){for(const key of ['gear_nose_wow','gear_left_wow','gear_right_wow'])assert.equal(restored[key],1);}
 input({throttle:kind==='engine-off'?0:kind==='parked'?0:.8,elevator:kind==='parked'?0:-.02,brake_norm:kind==='parked'?1:0,engine_running:kind!=='engine-off',mixture_norm:kind==='engine-off'?.55:1,mixture_auto:kind!=='engine-off',flap_norm:kind==='engine-off'?1/3:0});
 await burst(120);const after=await state();assert.equal(after.step,before.step+120);assert(after.t_s>before.t_s);for(const key of ['alt_msl_m','roll_rad','pitch_rad','tas_mps'])assert(Number.isFinite(after[key]));assert.equal(after.collision_mask,0);
 if(kind==='parked')assert(Math.hypot(after.ground_forward_mps,after.ground_side_mps)<.1,'reconstructed parked gear remains nearly stationary');
 observations.push({kind,before,restored,after});
}
const sample=observations[0].before;
const responses=[];for(const elevator of [-.1,.1]){await send({...config,resume_state:sample},'ready');input({elevator,throttle:1});await burst(120);responses.push((await state()).pitch_rad);}
assert(responses[0]>responses[1]+.02,'opposite applied elevators produce distinct actual native pitch responses after reconstruction');
for(const value of [{...sample,collision_mask:1},{...sample,aero_u_mps:NaN},{...sample,kap_cws:1},{...sample,kap_vertical:2,kap_gs_base_mps:undefined}])assert(resumeProblem(value));
for(const key of CONTINUATION_FIELDS){const value={...sample};delete value[key];assert(resumeProblem(value),key+' missing must reject');}
// Public-terrain native altitude is geodetic; test the actual callback path,
// not the flat ASL initializer that can hide a datum-conversion error.
const {default:createNative}=await import('./dist/jsbsim.mjs');const native=await createNative({print(){},printErr(){}});
const grid=native._malloc(32);native.HEAPF64.set([125,125,125,125],grid>>3);assert.equal(native._gf_configure_terrain_grid(.14,.86,.16,.88,2,2,grid,4),0);native._free(grid);
assert.equal(native._gf_init(1/120,.87,.15,1200,1,45),0);
const nativeState=()=>{const p=native._gf_state()>>3;return Array.from(native.HEAPF64.subarray(p,p+14));};
const terrainBefore=nativeState(),values=resumeValues(sample);
values.set([terrainBefore[0],native._gf_step_index(),...terrainBefore.slice(1,7),...terrainBefore.slice(8)]);
const pointer=native._malloc(values.byteLength);native.HEAPF64.set(values,pointer>>3);assert.equal(native._gf_init_resume(1/120,pointer,values.length),0);native._free(pointer);
const terrainRestored=nativeState();terrainBefore.forEach((value,i)=>assert(Math.abs(terrainRestored[i]-value)<1e-7,`public terrain actual state[${i}] ${value} -> ${terrainRestored[i]}`));
assert.equal(native._gf_step(),0);
const result={result:'pass',scope:'Actual WASM exposed-state reconstruction, fresh hidden integrator/contact/thermal history; no exact checkpoint or fidelity claim',observations,terrainBefore,terrainRestored,opposite_elevator_pitch_rad:responses};
await fs.writeFile(new URL('../../../output/flight/continue-flight-native.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,cases:observations.map(v=>({kind:v.kind,step:v.restored.step,t_s:v.restored.t_s,altitude_m:v.restored.alt_msl_m,body_u_mps:v.restored.aero_u_mps,prop_radps:v.restored.prop_radps,after_altitude_m:v.after.alt_msl_m}))}));
