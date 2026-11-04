// Actual native loading/fuel behavior, not C172S weight/performance validation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import createNative from './dist/jsbsim.mjs';
import {DEFAULT_LOADING,LOADING_FIELDS,loadingValues,loadingFields,loadingFromState,validLoading,validLoadingState} from './loading.js';
const m=await createNative({print(){},printErr(){}}),dt=1/120;
const read=(fn,n)=>{const p=fn()>>3;return Array.from(m.HEAPF64.subarray(p,p+n));};
const load=()=>loadingFields(read(m._gf_loading_state,LOADING_FIELDS.length));
const engine=()=>read(m._gf_engine_state,13);
function configure(config){const values=loadingValues(config),p=m._malloc(values.byteLength);m.HEAPF64.set(values,p>>3);assert.equal(m._gf_configure_loading(p,values.length),0);m._free(p);}
const step=n=>{for(let i=0;i<n;i++)assert.equal(m._gf_step(),0);};
const init=()=>assert.equal(m._gf_init(dt,.87,.15,1200,1,45),0);
const light={...DEFAULT_LOADING,pilot_kg:80,copilot_kg:0,rear_left_kg:0,rear_right_kg:0,baggage_kg:0,external_kg:0,fuel_left_m3:.03,fuel_right_m3:.03};
const heavy={...light,copilot_kg:90,rear_left_kg:90,rear_right_kg:90,baggage_kg:30};
configure(light);init();const lightState=load(),lightCg=read(m._gf_stall_state,13).slice(6,9);
configure(heavy);init();const heavyState=load(),heavyCg=read(m._gf_stall_state,13).slice(6,9);
assert(Math.abs(heavyState.mass_total_kg-lightState.mass_total_kg-300)<1e-6);assert(heavyCg[0]>lightCg[0],'rear/baggage loading moves native structural CG aft');
const restoredConfig=loadingFromState({...heavyState,fuel_left_m3:engine()[8],fuel_right_m3:engine()[9]});assert(restoredConfig);for(const key of Object.keys(heavy))assert(Math.abs(restoredConfig[key]-heavy[key])<1e-10);
const acceleration=[];for(const config of [light,heavy]){configure(config);assert.equal(m._gf_init_runway(dt,.87,.15,1),0);m._gf_set_secondary_inputs(0,0);m._gf_set_inputs(0,0,0,1);step(120*5);const g=read(m._gf_ground_state,18);acceleration.push(Math.hypot(g[2],g[3]));}
assert(acceleration[0]>acceleration[1],'same full-power ground run accelerates lower native mass faster');
configure(heavy);init();m._gf_set_inputs(0,0,0,1);const poweredBefore={loading:load(),engine:engine()};step(120*30);const poweredAfter={loading:load(),engine:engine()};
const fuelDrop=poweredBefore.engine[8]+poweredBefore.engine[9]-poweredAfter.engine[8]-poweredAfter.engine[9];const massDrop=poweredBefore.loading.mass_total_kg-poweredAfter.loading.mass_total_kg;
assert(fuelDrop>0);assert(poweredAfter.engine[7]>0);assert(massDrop>0);assert(Math.abs(massDrop-fuelDrop*poweredAfter.loading.fuel_density_kgpm3)<.005,'native total mass follows tank fuel consumption');
assert.equal(poweredAfter.loading.loading_initial_fuel_m3,poweredBefore.loading.loading_initial_fuel_m3,'launch baseline stays fixed as fuel burns');
m._gf_set_engine_running(0);step(120*10);const offBefore={loading:load(),engine:engine()};step(120*30);const offAfter={loading:load(),engine:engine()};
assert.equal(read(m._gf_engine_switch_state,2)[0],0);
// Ignition alone does not shut the pinned model's mixture-fed fuel delivery.
const ignitionOffFuelDrop=offBefore.engine[8]+offBefore.engine[9]-offAfter.engine[8]-offAfter.engine[9];assert(ignitionOffFuelDrop>=0);
m._gf_set_engine_controls(0,0);step(120);const cutoffBefore=engine();step(120*30);const cutoffAfter=engine();assert(Math.abs(cutoffAfter[8]+cutoffAfter[9]-cutoffBefore[8]-cutoffBefore[9])<1e-10,'native mixture cutoff stops fuel delivery with engine off');
configure({...light,fuel_left_m3:1e-7,fuel_right_m3:1e-7});init();m._gf_set_inputs(0,0,0,1);step(120*20);assert.equal(read(m._gf_engine_switch_state,2)[0],0,'native tank depletion stops combustion');
assert(validLoadingState({t_s:1}));assert.equal(validLoadingState({mass_total_kg:1000}),false);for(const bad of [{...light,pilot_kg:NaN},{...light,fuel_left_m3:1},{...light,extra:1}])assert.equal(validLoading(bad),false);
assert.equal(m._gf_configure_loading(0,0),0);init();const defaults=load();assert(Math.abs(defaults.payload_external_kg-80*.45359237)<1e-9,'legacy source external station remains in default mass');
// Exercise the worker boundary and modern replay restoration with custom payload.
globalThis.self=globalThis;const messages=[];globalThis.postMessage=value=>messages.push(value);await import('./worker.js');
async function send(data,type){const start=messages.length;self.onmessage({data});for(let i=0;i<1000;i++){await new Promise(r=>setTimeout(r,2));const found=messages.slice(start).find(v=>v.type===type||v.type==='error');if(found){assert.notEqual(found.type,'error',found.message);return found;}}throw Error('loading worker timeout');}
const initMessage={type:'init',aircraft:'c172x',kap140:true,terrain:false,ground_collision:true,dt_s:dt,state_hz:60,ic:{lat_rad:.87,lon_rad:.15,alt_msl_m:1200,heading_rad:1,tas_mps:45},loading:heavy};
await send(initMessage,'ready');const workerInitial=await send({type:'kap140',command:{action:'baro'}},'state');assert(validLoadingState(workerInitial));
assert(Math.abs(workerInitial.mass_total_kg-heavyState.mass_total_kg)<1e-8);
await send({...initMessage,loading:light,resume_state:workerInitial},'ready');const resumed=await send({type:'kap140',command:{action:'baro'}},'state');
for(const key of LOADING_FIELDS)assert(Math.abs(resumed[key]-workerInitial[key])<1e-8,`selected recorded loading overrides current draft for ${key}`);
const legacy={...workerInitial};for(const key of LOADING_FIELDS)delete legacy[key];
await send({...initMessage,loading:light,resume_state:legacy},'ready');const legacyResume=await send({type:'kap140',command:{action:'baro'}},'state');assert(Math.abs(legacyResume.payload_external_kg-DEFAULT_LOADING.external_kg)<1e-9,'legacy payload policy uses source defaults, not current custom draft');
const result={result:'pass',scope:'Pinned generic c172x model loading and native burn only; no installed C172S limits/performance validation',lightState,heavyState,lightCg,heavyCg,groundspeed_after_5s_mps:acceleration,powered_fuel_drop_m3:fuelDrop,powered_mass_drop_kg:massDrop,poweredAfter,offBefore,offAfter,ignitionOffFuelDrop,cutoffBefore,cutoffAfter,defaults,workerInitial,resumed,legacyResume};await fs.writeFile(new URL('../../../output/flight/loading-native.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,light_mass_kg:lightState.mass_total_kg,heavy_mass_kg:heavyState.mass_total_kg,groundspeed_after_5s_mps:acceleration,fuel_drop_liters:fuelDrop*1000,mass_drop_kg:massDrop}));
