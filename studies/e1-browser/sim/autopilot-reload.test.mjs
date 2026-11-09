import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createKap140, KAP_FIELDS } from './kap140.js';
import { DEFAULT_NAVIGATION, NAVIGATION_FIELDS } from './navigation.js';
import { captureAutopilotReload, validAutopilotReload, copyAutopilotReload } from './autopilot-reload.js';
const sensors = { t_s: 10, dt_s: 1/120, heading_rad: 1.2, physical_altitude_m: 1000, pressure_altitude_m: 1010, vertical_speed_mps: 2,
  elevator_norm: .1, nav: { valid: false, kind: 0, cdi_norm: 0, course_rad: 0, gs_valid: false, gs_norm: 0 } };
function fixture() {
  const kap = createKap140(sensors);
  kap.command({action:'heading',value:2.3},sensors);kap.command({action:'select-altitude',value:1524},sensors);
  kap.command({action:'baro-setting',value:100000},sensors);kap.command({action:'baro-units'},sensors);
  return {...kap.snapshot(sensors),...DEFAULT_NAVIGATION,radio_nav_active_khz:110500,radio_obs_deg:123,radio_nav2_active_khz:114200,radio_obs2_deg:222};
}
test('R-AP-3 reload captures exact acknowledged KAP/NAV settings and deeply detached canonical data', () => {
  const state=fixture(),value=captureAutopilotReload(state);assert(value);assert(validAutopilotReload(value));
  assert.deepEqual(Object.keys(value.kap),[...KAP_FIELDS]);assert.deepEqual(Object.keys(value.navigation),[...NAVIGATION_FIELDS]);
  assert.equal(value.kap.kap_heading_bug_rad,state.kap_heading_bug_rad);assert.equal(value.kap.kap_selected_altitude_m,1524);
  assert.equal(value.kap.kap_baro_setting_pa,100000);assert.equal(value.kap.kap_baro_units,1);
  assert.equal(value.navigation.radio_obs_deg,123);assert.equal(value.navigation.radio_nav2_active_khz,114200);
  state.kap_selected_altitude_m=2000;state.radio_obs_deg=5;assert.equal(value.kap.kap_selected_altitude_m,1524);assert.equal(value.navigation.radio_obs_deg,123);
  const copy=copyAutopilotReload(value);assert.deepEqual(copy,value);assert.notEqual(copy,value);assert.notEqual(copy.kap,value.kap);assert.notEqual(copy.navigation,value.navigation);
});
test('R-AP-3 HDG/ALT, VS/ARM and OFF modes retain targets without a new capture', () => {
  for(const patch of [{kap_engaged:1,kap_lateral:1,kap_vertical:1,kap_hold_pressure_altitude_m:1333},
    {kap_engaged:1,kap_lateral:1,kap_vertical:0,kap_alt_arm:1,kap_vs_target_mps:3},
    {kap_engaged:0,kap_lateral:0,kap_vertical:0,kap_selected_altitude_m:3000}]) {
    const state={...fixture(),...patch},value=captureAutopilotReload(state);assert(value);
    for(const[key,expected]of Object.entries(patch))assert.equal(value.kap[key],expected);
  }
});
test('R-AP-3 CWS releases; supported legacy omissions fill zero only outside missing GS reference', () => {
  const held={...fixture(),kap_engaged:1,kap_cws:1};const value=captureAutopilotReload(held);assert.equal(value.kap.kap_cws,0);assert.equal(held.kap_cws,1);
  const legacy=fixture();delete legacy.kap_cws;delete legacy.kap_gs_base_mps;
  assert.equal(captureAutopilotReload(legacy).kap.kap_cws,0);assert.equal(captureAutopilotReload(legacy).kap.kap_gs_base_mps,0);
  assert.equal(captureAutopilotReload({...legacy,kap_vertical:2}),null);
  assert.equal(captureAutopilotReload({...legacy,kap_vertical:2,kap_gs_base_mps:-2}).kap.kap_gs_base_mps,-2);
});
test('R-AP-3 invalid/faulted/partial telemetry and unknown envelope fields never become reload state', () => {
  for(const patch of [{kap_profile:0},{kap_sensor_fault:1},{kap_heading_bug_rad:NaN},{kap_vs_target_mps:Infinity},
    {kap_cws:2},{kap_gs_base_mps:100},{radio_nav_active_khz:110510},{radio_obs_deg:360}])assert.equal(captureAutopilotReload({...fixture(),...patch}),null);
  for(const key of [...KAP_FIELDS.filter(k=>!['kap_cws','kap_gs_base_mps'].includes(k)),...NAVIGATION_FIELDS]) {
    const value=fixture();delete value[key];assert.equal(captureAutopilotReload(value),null,key);
  }
  const value=captureAutopilotReload(fixture());
  for(const bad of [null,{},[],{...value,version:2},{...value,position:{}},{...value,kap:{...value.kap,extra:1}},
    {...value,navigation:{...value.navigation,extra:1}},{...value,kap:{...value.kap,kap_cws:1}}]) {
    assert.equal(validAutopilotReload(bad),false);assert.throws(()=>copyAutopilotReload(bad),/Invalid/);
  }
});
