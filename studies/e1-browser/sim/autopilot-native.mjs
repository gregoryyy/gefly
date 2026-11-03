// Native research-controller checks, not KAP 140 or aircraft fidelity validation.
import assert from 'node:assert/strict';
import createJSBSim from './dist/jsbsim.mjs';
const m = await createJSBSim({print: () => {}, printErr: () => {}});
const get = (fn,n) => {const p = fn() >> 3; return Array.from(m.HEAPF64.subarray(p,p+n));};
const state = () => get(m._gf_state,14), vertical = () => get(m._gf_autopilot_vertical_state,3);
const step = n => {for (let i=0;i<n;i++) assert.equal(m._gf_step(),0);};
const init = () => {assert.equal(m._gf_init(1/120,49.96*Math.PI/180,8.64*Math.PI/180,1200,1.4,45),0); assert.equal(m._gf_set_autopilot(1,1.4),0);};
init(); const start=state(); assert.equal(m._gf_set_autopilot_vertical(1,2),0); step(120*30);
const climb=state(); assert(climb[3] > start[3]+15); assert(vertical()[2] < 0);
assert.equal(m._gf_set_autopilot_vertical(2,climb[3]),0); step(120*30); const capture=state();
assert(Math.abs(capture[3]-climb[3]) < 20);
assert.equal(m._gf_set_autopilot_vertical(0,0),0); assert.equal(vertical()[2],0); step(1); assert.equal(vertical()[2],0);
assert.equal(m._gf_set_autopilot_vertical(1,-2),0); step(120*30); assert(state()[3] < capture[3]-10);
const before=vertical(); for (const args of [[3,0],[1,21],[1,NaN],[2,20001],[2,-2501]]) {assert.notEqual(m._gf_set_autopilot_vertical(...args),0); assert.deepEqual(vertical(),before);}
assert.equal(m._gf_set_autopilot_vertical(2,-1500),0);
init(); assert.equal(m._gf_set_autopilot_vertical(2,1230),0); step(120*90); const alt=state(); assert(Math.abs(alt[3]-1230)<10);
const ptr=m._malloc(4*8); m.HEAPF64.set([120,120,120,120],ptr>>3);
assert.equal(m._gf_configure_terrain_grid(8.4*Math.PI/180,49.8*Math.PI/180,8.9*Math.PI/180,50.2*Math.PI/180,2,2,ptr,4),0); m._free(ptr);
init(); assert.equal(m._gf_set_autopilot_vertical(2,1200),0); step(120*30); const terrainAlt=state()[3];
assert(Math.abs(terrainAlt-1200)<15, 'ALT uses MSL rather than terrain-relative altitude');
console.log(JSON.stringify({result:'pass', terrain_hold_m:terrainAlt, vs_climb_m:climb[3]-start[3], capture_change_m:capture[3]-climb[3], altitude_after_90s_m:alt[3]}));
