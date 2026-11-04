// Bounded generic-servo regression on actual WASM, not KAP hardware validation.
// Engineering gates detect sustained surging/failed capture in this powered,
// calm-air initial fixture; they are not C172 performance limits or tolerances.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import createJSBSim from './dist/jsbsim.mjs';
import {createKap140} from './kap140.js';
import {pressureAltitude_m} from './altimeter.js';
const dt=1/120, FPM=.3048/60, m=await createJSBSim({print(){},printErr(){}});
const read=(fn,n)=>{const p=fn()>>3;return Array.from(m.HEAPF64.subarray(p,p+n));};
const sensors=()=>{const s=read(m._gf_state,14),g=read(m._gf_ground_state,18);return {t_s:s[0],dt_s:dt,heading_rad:s[6],physical_altitude_m:s[3],pressure_altitude_m:pressureAltitude_m(m._gf_static_pressure_pa()),vertical_speed_mps:-g[4],elevator_norm:read(m._gf_autopilot_vertical_state,3)[2],nav:{valid:false,kind:0,cdi_norm:0,course_rad:0,gs_valid:false,gs_norm:0}};};
const range=(rows,key)=>[Math.min(...rows.map(r=>r[key])),Math.max(...rows.map(r=>r[key]))];
function run(){
 assert.equal(m._gf_init(dt,49.96*Math.PI/180,8.643*Math.PI/180,1200,82*Math.PI/180,45),0);
 assert.equal(m._gf_set_inputs(0,0,0,1),0,'pilot supplies full climb power; AP has no autothrottle');
 const initial=sensors(),kap=createKap140(initial),command=(action,value)=>assert(kap.command(value===undefined?{action}:{action,value},sensors()));
 command('ap');command('heading',initial.heading_rad);command('hdg');command('select-altitude',initial.pressure_altitude_m+300);
 // Selector displays altitude: first UP reveals VS, five further taps select500FPM.
 for(let i=0;i<6;i++){command('vertical',1);command('vertical',0);}
 assert(Math.abs(kap.snapshot(sensors()).kap_vs_target_mps/FPM-500)<.01);
 const rows=[];
 for(let i=0;i<240/dt;i++){
  const s=sensors();assert(kap.step(s));const g=kap.guidance(s);
  assert.equal(m._gf_set_autopilot(g.lateral_mode,g.heading_rad),0);assert.equal(m._gf_set_autopilot_vertical(g.vertical_mode,g.vertical_target),0);assert.equal(m._gf_step(),0);
  if(i%120===0){const actual=sensors(),state=read(m._gf_state,14);rows.push({t_s:actual.t_s,pressure_altitude_m:actual.pressure_altitude_m,vs_fpm:actual.vertical_speed_mps/FPM,pitch_deg:state[5]*180/Math.PI,tas_mps:state[7],vertical_mode:kap.snapshot(actual).kap_vertical});}
 }
 const climb=rows.filter(r=>r.t_s>30&&r.t_s<90), settled=rows.filter(r=>r.t_s>180),last=rows.at(-1),target=initial.pressure_altitude_m+300;
 const vsRange=range(climb,'vs_fpm'),mean=climb.reduce((sum,r)=>sum+r.vs_fpm,0)/climb.length;
 assert(mean>400&&mean<600,`500FPM commanded climb mean: ${mean}`);
 assert(vsRange[1]-vsRange[0]<150,`sustained surging regression: ${JSON.stringify(vsRange)}`);
 const capture=rows.find(r=>r.vertical_mode===1);assert(capture&&capture.t_s<180,'preselection actually captures ALT within fixture duration');
 assert(Math.abs(last.pressure_altitude_m-target)<10,`settled pressure altitude error ${last.pressure_altitude_m-target}m`);
 assert(Math.abs(last.vs_fpm)<30,`capture ends near level flight: ${last.vs_fpm}FPM`);
 assert(settled.every(r=>r.vertical_mode===1),'ALT remains captured');
 return {climb:{mean_vs_fpm:mean,range_vs_fpm:vsRange,range_pitch_deg:range(climb,'pitch_deg')},capture:{first_alt_s:capture.t_s,target_pressure_altitude_m:target,final_pressure_altitude_m:last.pressure_altitude_m,final_error_m:last.pressure_altitude_m-target,final_vs_fpm:last.vs_fpm,settled_vs_range:range(settled,'vs_fpm')},rows};
}
const first=run(),repeated=run();assert.deepEqual(repeated,first,'reset repeats the actual fixed-step trajectory');
const hashes={};for(const path of ['kap140.js','prepare-aircraft.py','bridge.cpp','dist/jsbsim.wasm'])hashes[path]=createHash('sha256').update(await fs.readFile(new URL(path,import.meta.url))).digest('hex');
const result={result:'pass',scope:'Powered calm-air default500FPM fixture and preselect capture on generic simulator servos; no installed C172/KAP performance validation',dt_s:dt,throttle_norm:1,hashes,...first};
await fs.mkdir(new URL('../../../output/flight/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../../output/flight/kap140-climb-native.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,rows:undefined}));
