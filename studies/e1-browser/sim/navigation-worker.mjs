// Actual WASM + worker + pinned historical ILS package under Node, not flight-fidelity validation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {navigationSignal} from './navigation.js';
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
 if(typeof url==='string' && url.startsWith('/navdata/')) return new Response(await readFile(new URL(`../../../app/public${url}`,import.meta.url)));
 return originalFetch(url,options);
};
globalThis.self=globalThis;const messages=[];globalThis.postMessage=m=>messages.push(m);await import('./worker.js');
async function send(m,type){const start=messages.length;self.onmessage({data:m});for(let i=0;i<1500;i++){await new Promise(r=>setTimeout(r,2));const hit=messages.slice(start).find(v=>v.type===type||v.type==='error');if(hit){assert.notEqual(hit.type,'error',hit.message);return hit;}}throw Error(`timeout ${JSON.stringify(m)}`);}
const packageData=JSON.parse(await readFile(new URL('../../../app/public/navdata/rhein-main-v1.json',import.meta.url)));
const station=packageData.records.find(r=>r.id==='IFCW'&&r.kind==='LOC');assert(station&&station.gs);
const deg=Math.PI/180, bearing=(station.front_course_true_deg+180)*deg, distance=5*1852/6371000,lat=station.gs.lat_deg*deg,lon=station.gs.lon_deg*deg;
const initialLat=Math.asin(Math.sin(lat)*Math.cos(distance)+Math.cos(lat)*Math.sin(distance)*Math.cos(bearing));
const initialLon=lon+Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(lat),Math.cos(distance)-Math.sin(lat)*Math.sin(initialLat));
const config={radio_nav_active_khz:111550,radio_obs_deg:250,radio_demo_enabled:0,radio_nav2_active_khz:114200,radio_obs2_deg:0};
const ic={lat_rad:initialLat,lon_rad:initialLon,alt_msl_m:station.gs.elevation_m+Math.tan(2.9*deg)*5*1852,heading_rad:station.front_course_true_deg*deg,tas_mps:45};
const ready=await send({type:'init',aircraft:'c172x',kap140:true,regional_navigation:true,navigation:config,terrain:false,dt_s:1/120,state_hz:60,ic},'ready');
assert.equal(ready.build.navigation.id,packageData.id);assert.equal(ready.build.navigation.edition,'2013.10');
let state=await send({type:'kap140',command:{action:'heading',value:ic.heading_rad}},'state');assert.equal(state.radio_nav2_active_khz,114200);
const sig=navigationSignal(config,state,packageData.records,packageData.source_label);assert.equal(sig.station_id,'IFCW');assert(sig.valid&&sig.gs_valid,JSON.stringify(sig));
await send({type:'kap140',command:{action:'ap'}},'state');await send({type:'kap140',command:{action:'hdg'}},'state');await send({type:'kap140',command:{action:'apr'}},'state');await send({type:'burst',steps:120,blocks:1},'burst');
state=await send({type:'kap140',command:{action:'baro'}},'state');assert.equal(state.kap_lateral,3);assert.equal(state.kap_vertical,2);assert.equal(state.kap_nav_kind,2);assert.equal(state.kap_gs_valid,1);
await send({type:'burst',steps:1200,blocks:1},'burst');state=await send({type:'kap140',command:{action:'baro'}},'state');const following=navigationSignal(config,state,packageData.records,packageData.source_label);assert.equal(state.kap_lateral,3);assert.equal(state.kap_vertical,2);assert(following.valid&&following.gs_valid);assert.notEqual(state.kap_elevator_norm,0);assert(Math.abs(following.cdi_norm)<Math.abs(sig.cdi_norm));assert(Math.abs(following.gs_norm)<Math.abs(sig.gs_norm));const servoBefore=state.kap_elevator_norm;
await send({type:'navigation',config:{radio_nav_active_khz:110300,radio_obs_deg:250,radio_demo_enabled:0}},'state');state=await send({type:'kap140',command:{action:'baro'}},'state');assert.equal(state.radio_nav2_active_khz,114200);assert.equal(state.kap_lateral,0);assert.equal(state.kap_vertical,0);
await send({type:'init',aircraft:'c172x',kap140:false,regional_navigation:true,navigation:config,terrain:false,dt_s:1/120,state_hz:60,ic},'ready');
state=messages.filter(m=>m.type==='state').at(-1);assert.equal(state.radio_nav_active_khz,111550);assert.equal(state.radio_nav2_active_khz,114200);assert.equal(state.kap_profile,undefined);
console.log(JSON.stringify({result:'pass',scope:'historical geometric ILS with generic native servos; not operational procedure validation',station:sig.station_id,initial_cdi:sig.cdi_norm,initial_gs:sig.gs_norm,after_10s_cdi:following.cdi_norm,after_10s_gs:following.gs_norm,servo:servoBefore,ready:ready.build.navigation}));
