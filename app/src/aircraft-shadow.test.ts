import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FlightState } from './types';
import { aircraftShadowPresentation, SHADOW_MAX_AGL_M } from './aircraft-shadow.ts';
const fixture = (agl: number, ground = 0): FlightState => ({ step: 0, t_s: 0, lat_rad: 0, lon_rad: 0,
  alt_msl_m: 1000, roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 0,
  ground_agl_m: agl, ground_height_ellipsoid_m: ground + agl });
test('chase shadow uses geodetic CG minus actual AGL, ignoring unrelated MSL altitude', () => {
  const state = Object.freeze(fixture(3)); const result = aircraftShadowPresentation(state, 'chase');
  assert(result.enabled); assert.equal(result.ground_height_m, 0);
  assert.equal(state.alt_msl_m, 1000); assert(!aircraftShadowPresentation(state, 'cockpit').enabled);
  assert(!aircraftShadowPresentation(fixture(3, 1000), 'chase').enabled);
});
test('near-ground native shadow fades and unavailable/older states cannot leave a stale cue', () => {
  const low = aircraftShadowPresentation(fixture(1.4), 'chase'), high = aircraftShadowPresentation(fixture(90), 'chase');
  assert(low.darkness < high.darkness); assert(high.darkness < 1);
  assert(!aircraftShadowPresentation(fixture(SHADOW_MAX_AGL_M), 'chase').enabled);
  assert(!aircraftShadowPresentation(null, 'chase').enabled);
  assert(!aircraftShadowPresentation({ ...fixture(3), ground_height_ellipsoid_m: undefined }, 'chase').enabled);
  assert(!aircraftShadowPresentation({ ...fixture(3), ground_agl_m: NaN }, 'chase').enabled);
});

test('public terrain shadow matches its converted receiver rather than treating physical height as ellipsoid height', () => {
  const active = { ...fixture(3, 163.05), terrain_profile: 1, terrain_height_msl_m: 115.25,
    terrain_geoid_m: 47.8, terrain_height_ellipsoid_m: 163.05 };
  assert(aircraftShadowPresentation(active, 'chase').enabled);
  assert(!aircraftShadowPresentation({ ...active, terrain_height_ellipsoid_m: 115.25 }, 'chase').enabled);
  assert(!aircraftShadowPresentation({ ...active, terrain_height_ellipsoid_m: undefined }, 'chase').enabled);
});


test('landing shadow uses the active rendered receiver through asynchronous native height readouts', () => {
 const state={...fixture(1.5,160),alt_msl_m:115.7,terrain_profile:1,terrain_geoid_m:46,terrain_height_ellipsoid_m:160};
 for(const jitter of [-.6,-.3,0,.3,.6]) assert(aircraftShadowPresentation({...state,ground_agl_m:1.5+jitter},'chase',160).enabled);
 assert(!aircraftShadowPresentation(state,'chase',null).enabled);
 assert(!aircraftShadowPresentation({...state,ground_height_ellipsoid_m:300},'chase',160).enabled);
});
