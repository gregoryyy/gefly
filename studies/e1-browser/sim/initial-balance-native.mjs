// Task153 / R-SIM-5/R-SIM-11/R-SIM-3/R-REVIEW-1: executable native boundary/regression evidence, not fidelity acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {FLIGHT_DEFAULT_LOADING,loadingValues} from './loading.js';
const moduleUrl=process.env.GF_NATIVE_MODULE?pathToFileURL(process.env.GF_NATIVE_MODULE):new URL('./dist/jsbsim.mjs',import.meta.url);
const {default:createNative}=await import(moduleUrl.href);
const M=await createNative({print(){},printErr(){}}),DT=1/120,KT=1852/3600,RAD=Math.PI/180;
const read=(fn,n)=>{const p=fn()>>3;return Array.from(M.HEAPF64.subarray(p,p+n));};
const raw=()=>read(M._gf_state,14),control=()=>read(M._gf_control_state,7);
const balance=()=>{const p=M._malloc(24);try{assert.equal(M._gf_initial_balance_state(p),0);return Array.from(M.HEAPF64.subarray(p>>3,(p>>3)+3));}finally{M._free(p);}};
const loading=loadingValues(FLIGHT_DEFAULT_LOADING);let ptr=M._malloc(loading.length*8);M.HEAPF64.set(loading,ptr>>3);assert.equal(M._gf_configure_loading(ptr,loading.length),0);M._free(ptr);
assert.equal(M._gf_initial_balance_state(0),-1);assert.equal(M._gf_step(),-1);
function init(profile,cas){const fn=profile?M._gf_init_balanced:M._gf_init;let tas=cas*KT;for(let i=0;i<5;i++){assert.equal(fn(DT,49.96*RAD,8.643*RAD,396.24,82*RAD,tas),0);tas*=cas/(read(M._gf_cockpit_state,8)[0]/KT);}assert.equal(fn(DT,49.96*RAD,8.643*RAD,396.24,82*RAD,tas),0);assert.equal(M._gf_trim_status(),1);assert.equal(M._gf_set_autopilot(0,0),0);assert.equal(M._gf_set_autopilot_vertical(0,0),0);assert.equal(M._gf_set_secondary_inputs(0,0),0);return{state:raw(),balance:balance(),throttle:M._gf_trim_throttle()};}
const reference=process.env.GF_BALANCE_REFERENCE?JSON.parse(await fs.readFile(process.env.GF_BALANCE_REFERENCE,'utf8')):null;
const observations=[];
for(const profile of[0,1])for(const cas_kt of[60,80,100])for(const pulse_norm of[0,.1,-.1]){
 const initial=init(profile,cas_kt),rows=[];assert.equal(initial.balance[0],profile);if(!profile)assert.deepEqual(initial.balance,[0,0,0]);
 assert.deepEqual([control()[1],control()[2],control()[3]],[0,0,0]);
 for(let step=0;step<=7200;step++){
  const state=raw();if(step%3600===0)rows.push(state);if(state[3]<100||step===7200)break;
  assert.equal(M._gf_set_inputs(0,state[0]>=5&&state[0]<7?pulse_norm:0,0,initial.throttle),0);assert.equal(M._gf_step(),0);
 }
 assert.deepEqual(balance(),initial.balance,'fixed initialization compensation must not drift with input');
 const final=raw(),digest=M.UTF8ToString(M._gf_digest_hex());assert(final.every(Number.isFinite));
 if(reference){const prior=reference.results.find(r=>r.variant===(profile?'full_holding_solution':'actual_longitudinal')&&r.cas_kt===cas_kt&&r.pulse_norm===pulse_norm);assert(prior,'independent retained native fixture');assert.deepEqual(initial.state,prior.initial.state_raw_14);assert.deepEqual(final,prior.final.state_raw_14);assert.equal(digest,prior.digest);}
 observations.push({profile,cas_kt,pulse_norm,initial,rows,final,digest,retained_reference_exact:!!reference});
}
// Separate getter cannot overwrite an undersized, misaligned or absent buffer.
for(const pointer of[0,1,M.HEAPF64.byteLength-8,M.HEAPF64.byteLength+8])assert.equal(M._gf_initial_balance_state(pointer),-6);
assert.equal(M._gf_state_len(),14);
// Reconstruction is explicitly exposed-state reconstruction, not an integrator checkpoint.
function packed(){const s=raw(),c=control(),a=read(M._gf_stall_state,13),p=read(M._gf_pitch_trim_state,3),e=read(M._gf_engine_state,13),sw=read(M._gf_engine_switch_state,2),cockpit=read(M._gf_cockpit_state,8);return new Float64Array([s[0],M._gf_step_index(),...s.slice(1,7),...a.slice(0,6),c[2],c[1],c[3],c[0],p[0],p[1],M._gf_flap_command_norm(),cockpit[4],cockpit[5],cockpit[6],e[2],e[3],sw[0],sw[1],e[1],e[8],e[9],101325,...balance()]);}
function resume(values,count=values.length){const p=M._malloc(values.byteLength);try{M.HEAPF64.set(values,p>>3);return M._gf_init_resume(DT,p,count);}finally{M._free(p);}}
init(1,80);for(let i=0;i<120;i++){assert.equal(M._gf_set_inputs(0,.02,0,M._gf_trim_throttle()),0);assert.equal(M._gf_step(),0);}
const before=packed(),identity=balance();assert.equal(resume(before),0);assert.deepEqual(balance(),identity);const restored=raw();for(const [i,v]of before.slice(2,8).entries())assert(Math.abs(restored[i+1]-v)<1e-7);assert.equal(M._gf_step_index(),before[1]);assert.equal(raw()[0],before[0]);
// AP on, AP off/CWS-style authority release and re-engagement retain the initializer.
for(const mode of[1,0,2,0]){assert.equal(M._gf_set_autopilot(mode,82*RAD),0);assert.equal(M._gf_set_autopilot_vertical(mode?2:0,396.24),0);for(let i=0;i<120;i++){assert.equal(M._gf_set_inputs(0,0,0,before[17]),0);assert.equal(M._gf_step(),0);}assert.deepEqual(balance(),identity);}
// A profile belongs to the flight, even when a reconstructed later frame is on ground.
const ground=before.slice();ground[4]=0;ground.fill(0,8,17);ground[17]=0;ground[22]=ground[23]=1;assert.equal(resume(ground),0);assert.deepEqual(balance(),identity);assert.equal(read(M._gf_cockpit_state,8)[7],1);
// Legacy32 and explicit profile0/zero35 retain exactly the same reconstruction.
const legacy=before.slice(0,32);assert.equal(resume(legacy),0);const oldState=raw();assert.deepEqual(balance(),[0,0,0]);const explicitZero=new Float64Array([...legacy,0,0,0]);assert.equal(resume(explicitZero),0);assert.deepEqual(balance(),[0,0,0]);assert.deepEqual(raw(),oldState);
for(const count of[0,31,33,34,36,32.5])assert.equal(resume(before,count),-6);
for(const tail of[[2,0,0],[0,.1,0],[0,0,.1],[1,1.01,0],[1,0,-1.01],[1,NaN,0],[1,0,Infinity]]){const values=new Float64Array([...legacy,...tail]);assert(resume(values)<0);}
// Invalid or failed balanced initialization never leaves a runnable partial model.
for(const args of[[DT,NaN,0,396.24,0,40],[DT,2,0,396.24,0,40],[DT,.87,.15,396.24,0,0]]){assert(M._gf_init_balanced(...args)<0);assert.equal(M._gf_step(),-1);assert.equal(M._gf_initial_balance_state(0),-1);}
// All ordinary ground/preset entry points clear a former airborne identity.
for(const fn of[()=>M._gf_init_landing(DT,.87,.15,0,1),()=>M._gf_init_runway(DT,.87,.15,0)]){init(1,80);assert.equal(fn(),0);assert.deepEqual(balance(),[0,0,0]);}
const report={scope:'Generic c172x initial equilibrium;18 fixtures, bounded ABI/restore tests, no aircraft-fidelity or self-leveling acceptance',native_module:moduleUrl.href,reference:process.env.GF_BALANCE_REFERENCE??null,observations};
if(process.env.GF_BALANCE_OUTPUT)await fs.writeFile(process.env.GF_BALANCE_OUTPUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:'pass',cases:observations.length,retained_reference_exact:!!reference}));
