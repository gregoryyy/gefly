import test from 'node:test';
import assert from 'node:assert/strict';
import { createAltitudeAlert, validAlertState } from './altitude-alert.js';
const ft=.3048;
const s=(t,offset,extra={})=>({t_s:t,indicated_altitude_m:1000+offset*ft,selected_altitude_m:1000,baro_setting_pa:101325,...extra});
test('approach tones, 200ft band, first crossing flash, deviation and clearance',()=>{
 const a=createAltitudeAlert(s(0,1500));a.update(s(1,900));assert.deepEqual(a.snapshot(),{kap_alert_state:1,kap_alert_sequence:1});
 a.update(s(2,100));assert.equal(a.snapshot().kap_alert_state,0);a.update(s(3,-20));assert.equal(a.snapshot().kap_alert_state,2);
 a.update(s(4,-250));assert.deepEqual(a.snapshot(),{kap_alert_state:2,kap_alert_sequence:2});a.update(s(5,-300));assert.deepEqual(a.snapshot(),{kap_alert_state:3,kap_alert_sequence:2});a.update(s(6,-1100));assert.equal(a.snapshot().kap_alert_state,0);
 a.update(s(7,-900));assert.deepEqual(a.snapshot(),{kap_alert_state:1,kap_alert_sequence:3});
});
test('initial inside band to outside sounds deviation and crossing can skip band samples',()=>{
 const a=createAltitudeAlert(s(0,20));a.update(s(1,250));assert.deepEqual(a.snapshot(),{kap_alert_state:3,kap_alert_sequence:1});
 const b=createAltitudeAlert(s(0,1500));b.update(s(1,-250));assert.deepEqual(b.snapshot(),{kap_alert_state:2,kap_alert_sequence:2});b.update(s(3,-250));assert.equal(b.snapshot().kap_alert_state,3);
});
test('selector and BARO establish silent baseline; repeat same time cannot sound',()=>{
 const a=createAltitudeAlert(s(0,1500));a.update(s(1,300,{selected_altitude_m:1100}));assert.deepEqual(a.snapshot(),{kap_alert_state:0,kap_alert_sequence:0});
 a.update(s(2,200,{selected_altitude_m:1100,baro_setting_pa:100000}));assert.deepEqual(a.snapshot(),{kap_alert_state:0,kap_alert_sequence:0});a.update(s(2,1500,{selected_altitude_m:1100,baro_setting_pa:100000}));assert.equal(a.snapshot().kap_alert_sequence,0);
});
test('invalid or backwards sensor data fail closed and atomic validation',()=>{
 const a=createAltitudeAlert(s(0,1500));a.update(s(1,NaN));a.update(s(-1,500));assert.deepEqual(a.snapshot(),{kap_alert_state:0,kap_alert_sequence:0});a.update(s(1,900));assert.equal(a.snapshot().kap_alert_sequence,1);
 assert(validAlertState({other:5}));assert(validAlertState({...a.snapshot(),other:5}));for(const x of [{kap_alert_state:0},{kap_alert_sequence:1},{kap_alert_state:4,kap_alert_sequence:0},{kap_alert_state:0,kap_alert_sequence:-1},{kap_alert_state:0,kap_alert_sequence:1.5}])assert.equal(validAlertState(x),false);
});
test('time subdivision preserves independent threshold crossings and flash expiry',()=>{
 const run=values=>{const a=createAltitudeAlert(s(0,1500));for(const [t,d] of values)a.update(s(t,d));return a.snapshot();};
 assert.deepEqual(run([[1,900],[2,100],[3,-100],[5,-100]]),run([[.5,1200],[1,900],[1.5,500],[2,100],[3,-100],[4,-100],[5,-100]]));
});

test('returning inside 200ft clears deviation; a later departure alerts again',()=>{
 const a=createAltitudeAlert(s(0,20));a.update(s(1,250));assert.deepEqual(a.snapshot(),{kap_alert_state:3,kap_alert_sequence:1});a.update(s(2,100));assert.deepEqual(a.snapshot(),{kap_alert_state:0,kap_alert_sequence:1});a.update(s(3,250));assert.deepEqual(a.snapshot(),{kap_alert_state:3,kap_alert_sequence:2});
});
test('exact 1000ft arrival lights, stationary retains and departure clears',()=>{
 const at=(t,feet)=>({t_s:t,indicated_altitude_m:feet*ft,selected_altitude_m:0,baro_setting_pa:101325});
 const a=createAltitudeAlert(at(0,1100));a.update(at(1,1000));assert.deepEqual(a.snapshot(),{kap_alert_state:1,kap_alert_sequence:1});a.update(at(2,1000));assert.equal(a.snapshot().kap_alert_state,1);a.update(at(3,900));assert.equal(a.snapshot().kap_alert_state,1);a.update(at(4,1000));assert.equal(a.snapshot().kap_alert_state,0);a.update(at(5,1000));assert.equal(a.snapshot().kap_alert_state,0);
});
