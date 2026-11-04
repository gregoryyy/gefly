import test from 'node:test';
import assert from 'node:assert/strict';
import { createKap140, validKapCommand, validKapState, KAP_FIELDS } from './kap140.js';
import { pressureAltitude_m } from './altimeter.js';
const FT=.3048, FPM=FT/60;
const sensor = (changes={}) => ({t_s:0,dt_s:1/120,heading_rad:1,physical_altitude_m:1000,pressure_altitude_m:900,vertical_speed_mps:2,nav:{valid:true,kind:1,cdi_norm:1,course_rad:2,gs_valid:false,gs_norm:1},...changes});
const cmd = (a,action,s,value) => assert.equal(a.command(value===undefined?{action}:{action,value},s),true);
test('engagement captures VS, ALT holds pressure independently of selector and BARO',()=>{
 const s=sensor(), a=createKap140(s); cmd(a,'select-altitude',s,1200); cmd(a,'ap',s); let x=a.snapshot(s); assert.equal(x.kap_lateral,0); assert.equal(x.kap_vs_target_mps,2); assert.equal(x.kap_alt_arm,0);
 cmd(a,'alt',s); x=a.snapshot(s); assert.equal(x.kap_hold_pressure_altitude_m,900); assert.equal(x.kap_selected_altitude_m,1200);
 cmd(a,'baro-setting',s,100000); x=a.snapshot(s); assert.equal(x.kap_hold_pressure_altitude_m,900); assert.equal(a.guidance({...s,pressure_altitude_m:910}).vertical_target,990);
 assert.equal(x.kap_indicated_altitude_m,900-pressureAltitude_m(100000)); cmd(a,'alt',s); assert.equal(a.snapshot(s).kap_vertical,0);
});
test('ALT capture and A clear stale VS immediately while paused, preserving an intentional BARO page',()=>{
 const s=sensor(),manual=createKap140(s);cmd(manual,'ap',s);assert.equal(manual.snapshot(s).kap_display_page,1);
 cmd(manual,'alt',s);assert.equal(manual.snapshot(s).kap_vertical,1);assert.equal(manual.snapshot(s).kap_display_page,0);
 const a=createKap140(s);
 for(const [action,value] of [['disconnect'],['heading',s.heading_rad],['select-altitude',s.pressure_altitude_m],['ap'],['hdg'],['alt']])cmd(a,action,s,value);
 const x=a.snapshot(s);assert.equal(x.kap_engaged,1);assert.equal(x.kap_lateral,1);assert.equal(x.kap_vertical,1);
 assert.equal(x.kap_selected_altitude_m,s.pressure_altitude_m);assert.equal(x.kap_display_page,0,'paused time cannot leave the selector stuck on read-only VS');
 for(const automatic of [false,true]) {
  const baro=createKap140(s);cmd(baro,'ap',s);if(automatic)cmd(baro,'select-altitude',s,905);cmd(baro,'baro',s);
  if(automatic)baro.step(s);else cmd(baro,'alt',s);
  assert.equal(baro.snapshot(s).kap_vertical,1);assert.equal(baro.snapshot(s).kap_display_page,2,'ALT capture must not dismiss BARO');
  baro.step({...s,t_s:2.9});assert.equal(baro.snapshot(s).kap_display_page,2);
  baro.step({...s,t_s:3});assert.equal(baro.snapshot(s).kap_display_page,0,'BARO retains its original expiry');
 }
});
test('UP/DN visibility, taps, bounded holds and elapsed-time partition',()=>{
 const initial=sensor(), a=createKap140(initial);cmd(a,'ap',initial);assert.equal(a.snapshot(initial).kap_display_page,1);a.step({...initial,t_s:3});const s={...initial,t_s:3};assert.equal(a.snapshot(s).kap_display_page,0);cmd(a,'vertical',s,1); assert.equal(a.snapshot(s).kap_vs_target_mps,2);cmd(a,'vertical',s,0);cmd(a,'vertical',s,1);assert(Math.abs(a.snapshot(s).kap_vs_target_mps-(2+100*FPM))<1e-12);cmd(a,'vertical',s,0);
 const run=parts=>{const b=createKap140(initial);cmd(b,'ap',initial);b.step({...initial,t_s:3});cmd(b,'vertical',s,1);for(const t of parts)b.step({...s,t_s:3+t});cmd(b,'vertical',{...s,t_s:5},0);return b.snapshot(s).kap_vs_target_mps;};
 assert(Math.abs(run([2])-run([.2,.6,1,1.5,2]))<1e-12);
 cmd(a,'alt',s);const h=a.snapshot(s).kap_hold_pressure_altitude_m;cmd(a,'vertical',s,-1);assert(Math.abs(a.snapshot(s).kap_hold_pressure_altitude_m-(h-20*FT))<1e-9);a.step({...s,t_s:4});assert.equal(a.guidance(s).vertical_mode,1);assert.equal(a.guidance(s).vertical_target,-500*FPM);cmd(a,'vertical',{...s,t_s:4,pressure_altitude_m:850},0);assert.equal(a.snapshot(s).kap_hold_pressure_altitude_m,850);
});
test('preselection arms on change, captures only approaching and BARO shifts target',()=>{
 const s=sensor(),a=createKap140(s);cmd(a,'ap',s);cmd(a,'baro-setting',s,100000); const target=910;cmd(a,'select-altitude',s,target-pressureAltitude_m(100000));cmd(a,'vertical',s,1);cmd(a,'vertical',s,0);assert.equal(a.snapshot(s).kap_display_page,1);a.step(s);assert.equal(a.snapshot(s).kap_vertical,0);a.step({...s,pressure_altitude_m:905});assert.equal(a.snapshot(s).kap_vertical,1);assert.equal(a.snapshot(s).kap_hold_pressure_altitude_m,target);assert.equal(a.snapshot(s).kap_alt_arm,0);assert.equal(a.snapshot(s).kap_display_page,0);
});
test('NAV arm/capture, source failure, REV sign, GS from above and below, and loss',()=>{
 const s=sensor(),a=createKap140(s);cmd(a,'ap',s);cmd(a,'heading',s,2);cmd(a,'hdg',s);cmd(a,'nav',s);assert.equal(a.snapshot(s).kap_lateral_arm,2);assert.equal(a.snapshot(s).kap_lateral,1);const near={...s,nav:{...s.nav,cdi_norm:.3}};a.step(near);assert.equal(a.snapshot(near).kap_lateral,2);assert(a.guidance(near).heading_rad>2);
 const invalid={...s,nav:{...s.nav,valid:false}};a.step(invalid);assert.equal(a.snapshot(invalid).kap_lateral,0);assert.equal(a.snapshot(invalid).kap_lateral_alert,2);cmd(a,'nav',invalid);assert.equal(a.snapshot(invalid).kap_lateral_alert,0);
 for(const deviation of [-.1,.1]) { const b=createKap140(s), loc={...s,nav:{valid:true,kind:2,cdi_norm:.1,course_rad:2,gs_valid:true,gs_norm:deviation}};cmd(b,'ap',s);cmd(b,'heading',s,2);cmd(b,'apr',loc);b.step(loc);assert.equal(b.snapshot(loc).kap_vertical,2);assert(Math.sign(b.guidance(loc).vertical_target-2)===Math.sign(deviation));const lost={...loc,nav:{...loc.nav,gs_valid:false}};b.step(lost);assert.equal(b.snapshot(lost).kap_vertical,0);assert.equal(b.snapshot(lost).kap_vertical_alert,2);b.step(loc);assert.equal(b.snapshot(loc).kap_vertical,2);cmd(b,'alt',loc);b.step(loc);assert.equal(b.snapshot(loc).kap_vertical,1);}
 const b=createKap140(s), loc={...s,nav:{...s.nav,kind:2,cdi_norm:.3}};cmd(b,'ap',s);cmd(b,'heading',s,2);cmd(b,'rev',loc);assert(Math.abs(b.guidance(loc).heading_rad-(2+Math.PI-.3*Math.PI/4))<1e-12); const centered={...loc,nav:{...loc.nav,cdi_norm:0}};assert(Math.abs(b.guidance(centered).heading_rad-(2+Math.PI))<1e-12);cmd(b,'rev',loc);cmd(b,'rev',s);assert.equal(b.snapshot(s).kap_lateral_alert,0);const invalidLoc={...loc,nav:{...loc.nav,valid:false}};cmd(b,'rev',invalidLoc);assert.equal(b.snapshot(invalidLoc).kap_lateral_alert,4);
});
test('atomic validation rejects forged commands and incomplete snapshots',()=>{
 const s=sensor(),a=createKap140(s), before=a.snapshot(s);assert(validKapState(before));assert.equal(Object.keys(before).length,KAP_FIELDS.length);
 for(const c of [{action:'vertical',value:2},{action:'heading',value:NaN},{action:'ap',value:1},{action:'baro-setting',value:1},{action:'select-altitude',value:30000},{action:'ap',extra:1},{action:'unknown'}]){assert.equal(validKapCommand(c),false);assert.equal(a.command(c,s),false);assert.deepEqual(a.snapshot(s),before);}
 assert.equal(validKapState({time_s:1}),true);assert.equal(validKapState({...before,time_s:1}),true);assert.equal(validKapState({kap_engaged:1,time_s:1}),false);assert.equal(validKapState({...before,kap_vertical:99}),false);const partial={...before};delete partial.kap_vertical;assert.equal(validKapState(partial),false);
});

test('release clears a held VS gesture after GS capture and subsequent loss',()=>{
 const s=sensor(),a=createKap140(s), loc={...s,t_s:1,nav:{valid:true,kind:2,cdi_norm:.1,course_rad:2,gs_valid:true,gs_norm:.1}};
 cmd(a,'ap',s);cmd(a,'vertical',s,1);cmd(a,'apr',loc);a.step(loc);assert.equal(a.snapshot(loc).kap_vertical,2);cmd(a,'vertical',loc,0);
 const lost={...loc,t_s:2,nav:{...loc.nav,gs_valid:false}};a.step(lost);const before=a.snapshot(lost).kap_vs_target_mps;a.step({...lost,t_s:5});assert.equal(a.snapshot(lost).kap_vs_target_mps,before);
});

test('HDG intercept and prompt; ROL remains wings-level and REV ignores VOR',()=>{
 const s=sensor(), a=createKap140(s);cmd(a,'ap',s);cmd(a,'heading',s,2);cmd(a,'hdg',s);const before=a.snapshot(s);cmd(a,'rev',s);assert.deepEqual(a.snapshot(s),before);cmd(a,'nav',s);assert.equal(a.snapshot(s).kap_hdg_prompt,1);assert(Math.abs(a.guidance(s).heading_rad-(2+Math.PI/4))<1e-12);a.step({...s,t_s:5});assert.equal(a.snapshot({...s,t_s:5}).kap_hdg_prompt,0);
 const b=createKap140(s);cmd(b,'ap',s);cmd(b,'nav',s);assert.equal(b.snapshot(s).kap_lateral_arm,2);assert.equal(b.guidance(s).lateral_mode,1);
 const loc={...s,nav:{...s.nav,kind:2}};const c=createKap140(s);cmd(c,'ap',s);cmd(c,'heading',s,2);cmd(c,'hdg',s);cmd(c,'rev',loc);assert(Math.abs(c.guidance(loc).heading_rad-(2+Math.PI-Math.PI/4))<1e-12);
});
test('VS page appears on engagement and ALT to VS, then expires',()=>{const s=sensor(),a=createKap140(s);cmd(a,'ap',s);assert.equal(a.snapshot(s).kap_display_page,1);cmd(a,'vertical',s,1);assert(Math.abs(a.snapshot(s).kap_vs_target_mps-(2+100*FPM))<1e-12);cmd(a,'vertical',s,0);a.step({...s,t_s:3});assert.equal(a.snapshot({...s,t_s:3}).kap_display_page,0);cmd(a,'alt',{...s,t_s:4});cmd(a,'alt',{...s,t_s:5});assert.equal(a.snapshot({...s,t_s:5}).kap_display_page,1);a.step({...s,t_s:8});assert.equal(a.snapshot({...s,t_s:8}).kap_display_page,0);});

test('F46: cancelling an armed NAV/APR/REV keeps active HDG; cancelling an active mode reverts to ROL',()=>{
 const s=sensor(), loc={...s,nav:{...s.nav,kind:2}};
 for(const [action,mode,src] of [['nav',2,s],['apr',3,loc],['rev',4,loc]]){
  const a=createKap140(s);cmd(a,'ap',s);cmd(a,'heading',s,2);cmd(a,'hdg',s);cmd(a,action,src);
  let x=a.snapshot(src);assert.equal(x.kap_lateral,1);assert.equal(x.kap_lateral_arm,mode);
  cmd(a,action,{...src,t_s:6});x=a.snapshot({...src,t_s:6});assert.equal(x.kap_lateral,1,`${action} cancel keeps HDG`);assert.equal(x.kap_lateral_arm,0);assert.equal(x.kap_gs_arm,0);
  assert.equal(x.kap_hdg_prompt,0,'cancel does not start the HDG prompt');assert.equal(a.guidance(src).heading_rad,2);
 }
 const b=createKap140(s);cmd(b,'ap',s);cmd(b,'nav',s);assert.equal(b.snapshot(s).kap_lateral,0);cmd(b,'nav',s);assert.equal(b.snapshot(s).kap_lateral,0);assert.equal(b.snapshot(s).kap_lateral_arm,0);
 const near={...s,nav:{...s.nav,cdi_norm:.1}}, c=createKap140(s);cmd(c,'ap',s);cmd(c,'hdg',s);cmd(c,'nav',near);assert.equal(c.snapshot(near).kap_lateral,2);cmd(c,'nav',near);assert.equal(c.snapshot(near).kap_lateral,0,'active NAV cancel keeps the existing generic ROL reversion');
 const invalid={...s,nav:{...s.nav,valid:false}}, d=createKap140(s);cmd(d,'ap',s);cmd(d,'nav',invalid);assert.equal(d.snapshot(invalid).kap_lateral_alert,2);assert.equal(d.snapshot(invalid).kap_hdg_prompt,0,'rejected source press does not prompt');
});
test('F47: source-loss alerts clear on disconnect, do not carry into re-engagement and end on GS recapture',()=>{
 const s=sensor(), a=createKap140(s);cmd(a,'ap',s);cmd(a,'hdg',s);cmd(a,'nav',s);const invalid={...s,nav:{...s.nav,valid:false}};a.step(invalid);assert.equal(a.snapshot(invalid).kap_lateral_alert,2);
 cmd(a,'disconnect',invalid);assert.equal(a.snapshot(invalid).kap_lateral_alert,0);assert.equal(a.snapshot(invalid).kap_hdg_prompt,0);
 cmd(a,'ap',s);assert.equal(a.snapshot(s).kap_lateral_alert,0);assert.equal(a.snapshot(s).kap_vertical_alert,0);
 const loc={...s,nav:{valid:true,kind:2,cdi_norm:.1,course_rad:2,gs_valid:true,gs_norm:.1}}, b=createKap140(s);cmd(b,'ap',s);cmd(b,'apr',loc);b.step(loc);assert.equal(b.snapshot(loc).kap_vertical,2);
 const lost={...loc,nav:{...loc.nav,gs_valid:false}};b.step(lost);assert.equal(b.snapshot(lost).kap_vertical_alert,2);b.step(loc);assert.equal(b.snapshot(loc).kap_vertical,2);assert.equal(b.snapshot(loc).kap_vertical_alert,0,'GS recapture ends the GS alert');
 b.step(lost);assert.equal(b.snapshot(lost).kap_vertical_alert,2);cmd(b,'ap',lost);assert.equal(b.snapshot(lost).kap_engaged,0);assert.equal(b.snapshot(lost).kap_vertical_alert,0,'AP press disconnect clears the GS alert');
});
test('F48: invalid sensors are surfaced, disconnect an engaged AP and never produce an invalid snapshot',()=>{
 const s=sensor(), a=createKap140(s);cmd(a,'ap',s);cmd(a,'alt',s);assert.equal(a.step(s),true);assert.equal(a.snapshot(s).kap_sensor_fault,0);
 for(const bad of [{...s,elevator_norm:1.2},{...s,pressure_altitude_m:NaN},{...s,nav:{...s.nav,cdi_norm:NaN}},{...s,t_s:-1}]){
  const b=createKap140(s);cmd(b,'ap',s);cmd(b,'alt',s);
  assert.equal(b.step(bad),false);const x=b.snapshot(bad);assert(validKapState(x),JSON.stringify(x));
  assert.equal(x.kap_sensor_fault,1);assert.equal(x.kap_engaged,0);assert.equal(x.kap_nav_valid,0);assert.equal(x.kap_gs_valid,0);
  const g=b.guidance(bad);assert.equal(g.lateral_mode,0);assert.equal(g.vertical_mode,0);assert(Number.isFinite(g.heading_rad)&&Number.isFinite(g.vertical_target));
  assert.equal(b.command({action:'ap'},bad),false,'engagement with invalid sensors is rejected');
  assert.equal(b.step(s),true);assert.equal(b.snapshot(s).kap_sensor_fault,1,'fault stays latched after sensors recover');assert.equal(b.snapshot(s).kap_engaged,0);
  cmd(b,'ap',s);assert.equal(b.snapshot(s).kap_sensor_fault,0);assert.equal(b.snapshot(s).kap_engaged,1);
 }
 const c=createKap140(s);assert.equal(c.step({...s,elevator_norm:2}),false);assert.equal(c.snapshot(s).kap_sensor_fault,1);assert.equal(c.snapshot(s).kap_engaged,0);
});

test('optional CWS releases both servos, continuously shows measured VS, and reacquires VS without changing lateral selection',()=>{
 const s=sensor(),a=createKap140(s);cmd(a,'ap',s);cmd(a,'heading',s,2);cmd(a,'hdg',s);cmd(a,'select-altitude',s,1500);
 cmd(a,'cws',s,1);assert.equal(a.snapshot(s).kap_cws,1);assert.equal(a.snapshot(s).kap_engaged,1);assert.equal(a.guidance(s).lateral_mode,0);assert.equal(a.guidance(s).vertical_mode,0);
 const moved={...s,t_s:10,vertical_speed_mps:-1,pressure_altitude_m:950};a.step(moved);let x=a.snapshot(moved);assert.equal(x.kap_display_page,1);assert.equal(x.kap_vs_target_mps,-1);assert.equal(x.kap_lateral,1);assert.equal(x.kap_alt_arm,1);
 cmd(a,'baro',moved);assert.equal(a.snapshot(moved).kap_display_page,1,'actual VS remains visible throughout CWS, even paused');cmd(a,'cws',moved,0);x=a.snapshot(moved);assert.equal(x.kap_cws,0);assert.equal(x.kap_engaged,1);assert.equal(x.kap_vs_target_mps,-1);assert.equal(a.guidance(moved).lateral_mode,2);assert.equal(a.guidance(moved).heading_rad,2);assert.equal(a.guidance(moved).vertical_target,-1);
 cmd(a,'cws',{...moved,vertical_speed_mps:1},0);assert.equal(a.snapshot(moved).kap_vs_target_mps,-1,'duplicate release does not recapture');
});
test('CWS ALT release captures actual pressure altitude and preserves independent selector; disconnect and faults clear hold',()=>{
 const s=sensor(),a=createKap140(s);cmd(a,'ap',s);cmd(a,'alt',s);cmd(a,'select-altitude',s,1500);cmd(a,'cws',s,1);
 const moved={...s,t_s:4,pressure_altitude_m:960,physical_altitude_m:1060,vertical_speed_mps:1};a.step(moved);cmd(a,'cws',moved,0);let x=a.snapshot(moved);assert.equal(x.kap_vertical,1);assert.equal(x.kap_hold_pressure_altitude_m,960);assert.equal(x.kap_selected_altitude_m,1500);assert.equal(x.kap_alt_arm,1);assert.equal(a.guidance(moved).vertical_target,1060);
 cmd(a,'cws',moved,1);cmd(a,'disconnect',moved);assert.equal(a.snapshot(moved).kap_cws,0);cmd(a,'cws',moved,1);assert.equal(a.snapshot(moved).kap_cws,0,'CWS does not engage AP');
 cmd(a,'ap',moved);cmd(a,'cws',moved,1);a.step({...moved,vertical_speed_mps:NaN});assert.equal(a.snapshot(moved).kap_cws,0);assert.equal(a.snapshot(moved).kap_sensor_fault,1);
});
test('CWS commands validate atomically and old recordings may omit only the optional CWS field',()=>{
 const s=sensor(),a=createKap140(s),before=a.snapshot(s),legacy={...before};delete legacy.kap_cws;assert(validKapState(legacy));
 for(const value of [undefined,2,-1,NaN,'1',null]) {assert.equal(validKapCommand({action:'cws',value}),false);assert.equal(a.command({action:'cws',value},s),false);assert.deepEqual(a.snapshot(s),before);assert.equal(validKapState({...before,kap_cws:value}),false);}
 assert.equal(validKapState({kap_cws:0}),false);
});
test('altitude selector immediately shows selected altitude, then first UP reveals VS without changing its command',()=>{
 const s=sensor(),a=createKap140(s);cmd(a,'ap',s);assert.equal(a.snapshot(s).kap_display_page,1);cmd(a,'select-altitude',s,1500);assert.equal(a.snapshot(s).kap_display_page,0);const before=a.snapshot(s).kap_vs_target_mps;cmd(a,'vertical',s,1);assert.equal(a.snapshot(s).kap_display_page,1);assert.equal(a.snapshot(s).kap_vs_target_mps,before);cmd(a,'vertical',s,0);cmd(a,'vertical',s,1);assert.equal(a.snapshot(s).kap_vs_target_mps,before+100*FPM);
});

test('reconstruction restores exposed stable modes and rejects unavailable transient states atomically',()=>{
 const s=sensor(),a=createKap140(s);cmd(a,'ap',s);cmd(a,'alt',s);cmd(a,'hdg',s);cmd(a,'select-altitude',s,1500);cmd(a,'baro-setting',s,100000);
 const original=a.snapshot(s),b=createKap140({...s,t_s:20});assert(b.restore(original,{...s,t_s:20}));
 for(const key of ['kap_engaged','kap_lateral','kap_vertical','kap_alt_arm','kap_heading_bug_rad','kap_selected_altitude_m','kap_vs_target_mps','kap_hold_pressure_altitude_m','kap_baro_setting_pa'])assert.equal(b.snapshot(s)[key],original[key]);
 const before=b.snapshot(s);for(const change of [{kap_cws:1},{kap_vertical:2,kap_gs_base_mps:undefined},{kap_sensor_fault:1},{kap_hold_pressure_altitude_m:NaN}]){assert.equal(b.restore({...original,...change},s),false);assert.deepEqual(b.snapshot(s),before);}
});

test('new GS reference records and restores actual guidance; old captured GS remains unavailable',()=>{
 const s=sensor({nav:{valid:true,kind:2,cdi_norm:0,course_rad:1,gs_valid:true,gs_norm:.1}}),a=createKap140(s);cmd(a,'ap',s);cmd(a,'apr',s);a.step(s);const frame=a.snapshot(s),b=createKap140(s);assert.equal(frame.kap_vertical,2);assert(b.restore(frame,s));assert.deepEqual(b.guidance(s),a.guidance(s));const legacy={...frame};delete legacy.kap_gs_base_mps;assert(validKapState(legacy));assert.equal(b.restore(legacy,s),false);
});
