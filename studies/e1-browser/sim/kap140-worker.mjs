// Actual native worker boundary regression; no browser or aircraft-fidelity acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../../',import.meta.url);
const files=['studies/e1-browser/sim/altitude-alert.js','studies/e1-browser/sim/worker.js','studies/e1-browser/sim/kap140.js','studies/e1-browser/sim/navigation.js','app/src/session.ts','app/src/types.ts','app/src/flight-trace.ts','app/src/main.ts'];
const hashes=Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await fs.readFile(new URL(p,root))).digest('hex')])));
globalThis.self=globalThis;const messages=[];globalThis.postMessage=m=>messages.push(m);await import(new URL('studies/e1-browser/sim/worker.js',root));
async function send(m,endtype){const start=messages.length;self.onmessage({data:m});for(let i=0;i<1000;i++){await new Promise(r=>setTimeout(r,2));const hit=messages.slice(start).find(v=>v.type===endtype||v.type==='error');if(hit){assert.notEqual(hit.type,'error',hit.message);return hit;}}throw new Error('timeout '+JSON.stringify(m));}
const input=(e)=>self.onmessage({data:{type:'input',step:0,wall_ms:performance.timeOrigin+performance.now(),elevator:e,aileron:0,rudder:0,throttle:.7,pilot_override:e!==0}});
const burst=n=>send({type:'burst',steps:n,blocks:1},'burst');
await send({type:'init',aircraft:'c172x',kap140:true,terrain:false,dt_s:1/120,state_hz:60,ic:{lat_rad:.87,lon_rad:.15,alt_msl_m:1200,heading_rad:1,tas_mps:45}},'ready');
input(.3);await burst(1);const blocked=await send({type:'kap140',command:{action:'ap'}},'state');assert.equal(blocked.kap_engaged,0);assert.equal(blocked.elevator_cmd_norm,.3);
await burst(120);const still=await send({type:'kap140',command:{action:'baro'}},'state');assert.equal(still.kap_engaged,0);assert.equal(still.kap_elevator_norm,0);
await send({type:'autopilot',mode:2},'state');assert.equal(messages.at(-1).kap_engaged,0);
input(0);await burst(1);const engaged=await send({type:'kap140',command:{action:'ap'}},'state');assert.equal(engaged.kap_engaged,1);assert.equal(engaged.kap_display_page,1);
await send({type:'navigation',config:{radio_nav_active_khz:113800,radio_obs_deg:0,radio_demo_enabled:1}},'state');
const armedLegacy=await send({type:'kap140',command:{action:'nav'}},'state');assert.equal(armedLegacy.kap_lateral_arm,2);
const rolledLegacy=await send({type:'autopilot',mode:1},'state');assert.equal(rolledLegacy.kap_lateral,0);assert.equal(rolledLegacy.kap_lateral_arm,0);
const wrappedLegacy=await send({type:'autopilot',mode:2,target_heading_rad:200*Math.PI+1},'state');assert(Math.abs(wrappedLegacy.kap_heading_bug_rad-1)<1e-12);
input(.2);await burst(1);const override=await send({type:'kap140',command:{action:'baro'}},'state');assert.equal(override.kap_engaged,0);assert.equal(override.kap_elevator_norm,0);
const selectedBefore=override.kap_selected_altitude_m;const invalid=await send({type:'kap140',command:{action:'select-altitude',value:20000}},'state');assert.equal(invalid.kap_selected_altitude_m,selectedBefore);assert.equal(invalid.kap_alt_arm,override.kap_alt_arm);
const oldnav={radio_nav_active_khz:invalid.radio_nav_active_khz,radio_obs_deg:invalid.radio_obs_deg,radio_demo_enabled:invalid.radio_demo_enabled};await send({type:'navigation',config:{...oldnav,radio_obs_deg:NaN}},'navigation-rejected');const unchanged=await send({type:'kap140',command:{action:'baro'}},'state');for(const k of Object.keys(oldnav))assert.equal(unchanged[k],oldnav[k]);
// Optional CWS borrows actual native servos; release consumes a queued neutral
// packet even while paused, then captures the measured reference without a step.
input(0);await burst(1);await send({type:'kap140',command:{action:'ap'}},'state');
await send({type:'kap140',command:{action:'alt'}},'state');
const cwsBefore=await send({type:'stats'},'stats');
const cwsPress=await send({type:'kap140',command:{action:'cws',value:1}},'state');assert.equal(cwsPress.kap_engaged,1);assert.equal(cwsPress.kap_cws,1);assert.equal(cwsPress.kap_elevator_norm,0);
input(-.2);await burst(180);const cwsHeld=await send({type:'kap140',command:{action:'baro'}},'state');assert.equal(cwsHeld.kap_engaged,1);assert.equal(cwsHeld.kap_cws,1);assert.equal(cwsHeld.kap_elevator_norm,0);assert.equal(cwsHeld.elevator_cmd_norm,-.2);
const cwsFrozen=await send({type:'stats'},'stats');input(0);
const cwsRelease=await send({type:'kap140',command:{action:'cws',value:0}},'state');assert.equal(cwsRelease.kap_engaged,1);assert.equal(cwsRelease.kap_cws,0);assert.equal(cwsRelease.elevator_cmd_norm,0);assert.equal(cwsRelease.kap_vertical,1);assert(Math.abs(cwsRelease.kap_hold_pressure_altitude_m-cwsRelease.kap_indicated_altitude_m)<1e-8);
const cwsAfter=await send({type:'stats'},'stats');assert.equal(cwsAfter.digest,cwsFrozen.digest);assert.equal(cwsAfter.step,cwsFrozen.step);assert(cwsAfter.step>cwsBefore.step);
await send({type:'kap140',command:{action:'cws',value:1}},'state');input(.1);await burst(1);
const unsafeRelease=await send({type:'kap140',command:{action:'cws',value:0}},'state');assert.equal(unsafeRelease.kap_engaged,0,'CWS release over genuinely held raw input disconnects');assert.equal(unsafeRelease.kap_cws,0);
input(0);await burst(1);await send({type:'kap140',command:{action:'ap'}},'state');
const trimState=await send({type:'kap140',command:{action:'baro'}},'state');self.onmessage({data:{type:'input',step:0,wall_ms:performance.timeOrigin+performance.now(),elevator:0,aileron:0,rudder:0,throttle:.7,pilot_override:false,pitch_trim_norm:Math.max(-1,trimState.pitch_trim_norm-.02)}});await burst(1);
const trimDisconnect=await send({type:'kap140',command:{action:'baro'}},'state');assert.equal(trimDisconnect.kap_engaged,0,'ordinary manual trim outside CWS still disconnects');
// A real fixed-step climb crosses the 1000 ft approach band: alerter is not UI-driven.
await send({type:'init',aircraft:'c172x',kap140:true,terrain:false,dt_s:1/120,state_hz:60,ic:{lat_rad:.87,lon_rad:.15,alt_msl_m:1200,heading_rad:1,tas_mps:45}},'ready');
// The pilot supplies climb power; this AP has no autothrottle.
self.onmessage({data:{type:'input',step:0,wall_ms:performance.timeOrigin+performance.now(),elevator:0,aileron:0,rudder:0,throttle:1,pilot_override:false}});await burst(1);
const initialAlert=await send({type:'kap140',command:{action:'baro'}},'state');
await send({type:'kap140',command:{action:'select-altitude',value:initialAlert.kap_indicated_altitude_m+350}},'state');
await send({type:'kap140',command:{action:'ap'}},'state');
for(let i=0;i<5;i++){await send({type:'kap140',command:{action:'vertical',value:1}},'state');await send({type:'kap140',command:{action:'vertical',value:0}},'state');}
await burst(6000);
const alerted=await send({type:'kap140',command:{action:'baro'}},'state');
assert(alerted.kap_alert_sequence>=1,`actual climb emits an altitude-approach event: ${JSON.stringify(alerted)}`);
assert.equal(alerted.kap_alert_state,1,'actual current error is inside1000/outside200ft approach band');
const alertFrozen=await send({type:'stats'},'stats');
await send({type:'kap140',command:{action:'baro-setting',value:100000}},'state');
const afterSetting=await send({type:'stats'},'stats');assert.equal(afterSetting.digest,alertFrozen.digest);assert.equal(afterSetting.kap_alert_sequence,alerted.kap_alert_sequence);
// Deterministic real-aircraft VOR intercept, not just a lit NAV annunciation.
await send({type:'init',aircraft:'c172x',kap140:true,terrain:false,dt_s:1/120,state_hz:60,ic:{lat_rad:.87,lon_rad:.15,alt_msl_m:1200,heading_rad:1,tas_mps:45}},'ready');
await send({type:'kap140',command:{action:'ap'}},'state');await send({type:'kap140',command:{action:'alt'}},'state');
await send({type:'kap140',command:{action:'heading',value:0}},'state');await send({type:'kap140',command:{action:'hdg'}},'state');
await send({type:'navigation',config:{radio_nav_active_khz:113800,radio_obs_deg:0,radio_demo_enabled:1}},'state');
const navStart=await send({type:'kap140',command:{action:'nav'}},'state');assert.equal(navStart.kap_lateral_arm,2);
await burst(21600);const navFinish=await send({type:'kap140',command:{action:'baro'}},'state');
assert.equal(navFinish.kap_lateral,2,'actual native flight captures the VOR course');assert.equal(navFinish.kap_lateral_arm,0);
const {navigationSignal}=await import('./navigation.js');
const finalCdi=navigationSignal({radio_nav_active_khz:113800,radio_obs_deg:0,radio_demo_enabled:1},navFinish).cdi_norm;
assert(Math.abs(finalCdi)<.5,`generic VOR intercept reaches the declared capture band: ${finalCdi}`);
const endhashes=Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await fs.readFile(new URL(p,root))).digest('hex')])));assert.deepEqual(endhashes,hashes,'reviewed sources changed during check');
const checks=['held applied rawoverride rejects KAP and legacyengagement without manual/servofight','releasing rawoverride permits APengagement and VSdisplay','legacy roll command clears armed navigation and finite heading targets wrap correctly','fresh rawoverride disconnects before nativeinput nextstep','combined preselect/pressure envelope rejection leaves selector/arming unchanged','invalid NAVconfiguration leaves acknowledgedconfiguration unchanged','actual CWS releases native servos while manual input flies; paused neutral release recaptures ALT without advancing physics; held-input release and ordinary manual trim disconnect safely','actual fixed-step climb generates altitude-alert state/event; paused BARO creates no historical tone or physics movement','actual native VOR intercept arms, captures and converges inside the CDI band within180simulatedseconds'];
const result={result:'pass',scope:'Actual WASM/worker under Node global-self wrapper, flat generic1200m initial fixture; nobrowser or aircraftfidelity approval',checks,hashes,observations:{blocked_engaged:blocked.kap_engaged,blocked_native_ap_elevator:still.kap_elevator_norm,released_engaged:engaged.kap_engaged,override_native_ap_elevator:override.kap_elevator_norm,cws_held_engaged:cwsHeld.kap_engaged,cws_held_servo:cwsHeld.kap_elevator_norm,cws_release_hold_m:cwsRelease.kap_hold_pressure_altitude_m,cws_release_digest:cwsAfter.digest,actual_alert_state:alerted.kap_alert_state,actual_alert_sequence:alerted.kap_alert_sequence,vor_final_cdi:finalCdi,vor_final_heading_rad:navFinish.heading_rad}};
await fs.mkdir(new URL('output/flight/',root),{recursive:true});await fs.writeFile(new URL('output/flight/kap140-worker.json',root),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
