import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navigationSignal, validNavigation, DEFAULT_NAVIGATION } from './navigation.js';
import { DEFAULT_RADIO_NAV, navigationIndication } from '../../../app/src/radio-nav.ts';

test('worker fictional NAV1 signal agrees with displayed LAB CDI over positions/courses', () => {
  for (const [lat,lon] of [[49.9,8.643],[50.02,8.643],[49.94,8.63],[49.98,8.66]]) {
    for (const obs of [0,45,90,180,270,359]) {
      const config = {...DEFAULT_RADIO_NAV,radio_demo_enabled:1,radio_obs_deg:obs};
      const position={lat_rad:lat*Math.PI/180,lon_rad:lon*Math.PI/180,alt_msl_m:1200};
      const expected=navigationIndication(config,position), actual=navigationSignal(config,position);
      assert.equal(actual.valid,expected.valid);
      if (expected.valid) assert(Math.abs(actual.cdi_norm-expected.cdi_norm)<1e-12);
      assert.equal(actual.gs_valid,false);
    }
  }
});
test('invalid/untuned sources cannot become captured guidance; LOC tuning is distinct from signal validity', () => {
  const p={lat_rad:49.9*Math.PI/180,lon_rad:8.643*Math.PI/180};
  assert.equal(navigationSignal(DEFAULT_NAVIGATION,p).valid,false);
  assert.equal(navigationSignal({...DEFAULT_NAVIGATION,radio_nav_active_khz:110300},p).kind,2);
  assert.equal(navigationSignal({...DEFAULT_NAVIGATION,radio_nav_active_khz:110300},p).valid,false);
  assert.equal(navigationSignal({...DEFAULT_NAVIGATION,radio_demo_enabled:1},{lat_rad:Math.PI,lon_rad:0}).valid,false);
  assert.equal(navigationSignal(null,p).valid,false);
  for (const c of [{}, {...DEFAULT_NAVIGATION,radio_obs_deg:360}, {...DEFAULT_NAVIGATION,radio_nav_active_khz:113801}, {...DEFAULT_NAVIGATION,radio_demo_enabled:true}]) assert.equal(validNavigation(c),false);
});
