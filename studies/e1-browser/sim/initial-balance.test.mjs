// Task153 / R-SIM-5/R-SIM-11/R-SIM-3/R-REVIEW-1: atomic initialization identity and continuation compatibility.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {INITIAL_BALANCE_FIELDS,validInitialBalanceState,initialBalanceFields,initialBalanceProfile,equalInitialBalance} from './initial-balance.js';
import {CONTINUATION_FIELDS,resumeProblem,resumeValues} from './continue-flight.js';
import {createKap140} from './kap140.js';
import {DEFAULT_NAVIGATION} from './navigation.js';
const legacy={};const zero={initial_balance_profile:0,roll_trim_norm:0,yaw_trim_norm:0};
const balanced={initial_balance_profile:1,roll_trim_norm:-.011,yaw_trim_norm:.001};
test('Task153 optional balance identity is atomic and legacy normalizes to explicit zero',()=>{
 assert(validInitialBalanceState(legacy));assert(validInitialBalanceState(zero));assert(validInitialBalanceState(balanced));
 assert.equal(initialBalanceProfile(legacy),0);assert.equal(initialBalanceProfile(balanced),1);
 assert(equalInitialBalance(legacy,zero));assert(!equalInitialBalance(legacy,balanced));assert(!equalInitialBalance(balanced,{...balanced,roll_trim_norm:-.012}));
 assert.deepEqual(initialBalanceFields(new Float64Array([1,-.011,.001])),balanced);
 for(const value of [null,undefined,[],0,'1']){assert(!validInitialBalanceState(value));assert.equal(initialBalanceProfile(value),null);assert(!equalInitialBalance(value,legacy));}
 for(const key of INITIAL_BALANCE_FIELDS){const partial={...balanced};delete partial[key];assert(!validInitialBalanceState(partial));}
 for(const value of [{initial_balance_profile:undefined},{...zero,roll_trim_norm:.1},{...zero,yaw_trim_norm:-.1},{...balanced,initial_balance_profile:2},{...balanced,roll_trim_norm:NaN},{...balanced,yaw_trim_norm:Infinity},{...balanced,roll_trim_norm:1.000001},{...balanced,yaw_trim_norm:'0'}])assert(!validInitialBalanceState(value),JSON.stringify(value));
 for(const value of [undefined,null,[],[1,0],[1,0,0,0],[2,0,0],[0,.01,0],[1,NaN,0]])assert.deepEqual(initialBalanceFields(value),{});
 assert(validInitialBalanceState({initial_balance_profile:1,roll_trim_norm:-1,yaw_trim_norm:1}));
});
function frame(){const sensors={t_s:1,dt_s:1/120,heading_rad:1,physical_altitude_m:1000,pressure_altitude_m:1000,vertical_speed_mps:0,nav:{valid:false,kind:0,cdi_norm:0,course_rad:0,gs_valid:false,gs_norm:0}};return {...Object.fromEntries(CONTINUATION_FIELDS.map(key=>[key,0])),t_s:1,step:120,alt_msl_m:1000,tas_mps:45,aero_u_mps:45,altimeter_setting_pa:101325,altimeter_qnh_pa:101325,altimeter_qfe_pa:90000,altimeter_qfe_datum_m:1000,...DEFAULT_NAVIGATION,...createKap140(sensors).snapshot(sensors)};}
test('Task153 continuation packs exact legacy32 or atomic35 including later ground frames',()=>{
 const old=frame();assert.equal(resumeProblem(old),null);const raw=resumeValues(old);assert.equal(raw.length,32);
 for(const identity of [zero,balanced]){const state={...old,...identity,gear_nose_wow:1,gear_left_wow:1,gear_right_wow:1};assert.equal(resumeProblem(state),null);const values=resumeValues(state);assert.equal(values.length,35);assert.deepEqual(values.slice(0,32),raw);assert.deepEqual([...values.slice(32)],INITIAL_BALANCE_FIELDS.map(key=>identity[key]));}
 for(const identity of [{initial_balance_profile:1},{...balanced,yaw_trim_norm:undefined},{...zero,roll_trim_norm:.1}]){assert.match(resumeProblem({...old,...identity}),/initial balance/);assert.throws(()=>resumeValues({...old,...identity}));}
});
