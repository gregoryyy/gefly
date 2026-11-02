import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FlightState } from './types';
import { engineAudioParameters } from './engine-audio-parameters.ts';

const fixture = (overrides: Partial<FlightState> = {}): FlightState => ({ step: 0, t_s: 0,
  lat_rad: 0, lon_rad: 0, alt_msl_m: 100, roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 40,
  prop_radps: 2400 * 2 * Math.PI / 60, manifold_pressure_pa: 80000, fuel_flow_m3ps: 1e-5, ...overrides });

test('engine sound pitch follows actual rotation, four-stroke firing and two-blade passage, not requested throttle', () => {
  const original = Object.freeze(fixture({ throttle_norm: .1 }));
  const result = engineAudioParameters(original);
  assert.equal(result.rotation_hz, 40); assert.equal(result.firing_hz, 80); assert.equal(result.blade_pass_hz, 80);
  assert.equal(result.rpm, 2400);
  assert.deepEqual(result, engineAudioParameters({ ...original, throttle_norm: 1 }));
  assert.equal(engineAudioParameters(fixture({ prop_radps: original.prop_radps! / 2 })).firing_hz, 40);
  assert.equal(original.throttle_norm, .1);
});

test('actual MAP and fuel flow shape combustion load without changing rotation pitch', () => {
  const low = engineAudioParameters(fixture({ manifold_pressure_pa: 30000, fuel_flow_m3ps: 2e-6 }));
  const high = engineAudioParameters(fixture());
  assert(high.exhaust_gain > low.exhaust_gain); assert.equal(high.firing_hz, low.firing_hz);
  const cutoff = engineAudioParameters(fixture({ fuel_flow_m3ps: 0 }));
  assert.equal(cutoff.exhaust_gain, 0); assert(cutoff.propeller_gain > 0); assert(cutoff.mechanical_gain > 0);
});

test('zero rotation, missing and malformed actual telemetry cannot invent engine noise', () => {
  const stopped = engineAudioParameters(fixture({ prop_radps: 0 }));
  for (const field of ['exhaust_gain', 'mechanical_gain', 'propeller_gain', 'firing_hz'] as const) assert.equal(stopped[field], 0);
  assert.equal(engineAudioParameters(null).valid, false);
  for (const field of ['prop_radps', 'manifold_pressure_pa', 'fuel_flow_m3ps']) {
    for (const invalid of [undefined, NaN, Infinity, -Infinity, -1]) {
      const result = engineAudioParameters(fixture({ [field]: invalid }));
      assert.equal(result.valid, false); assert.equal(result.exhaust_gain + result.mechanical_gain + result.propeller_gain, 0);
    }
  }
  assert.equal(engineAudioParameters(fixture({ manifold_pressure_pa: 0 })).valid, false);
});

test('sound-design gains and frequencies stay bounded for extreme finite inputs', () => {
  for (const magnitude of [1e-20, 1, 100, 1e6, 1e200, Number.MAX_VALUE]) {
    const result = engineAudioParameters(fixture({ prop_radps: magnitude, manifold_pressure_pa: magnitude, fuel_flow_m3ps: magnitude }));
    assert(Object.values(result).every(value => typeof value !== 'number' || Number.isFinite(value)));
    assert(result.rotation_hz <= 200); assert(result.firing_hz <= 400); assert(result.noise_cutoff_hz <= 5000);
    assert(result.exhaust_gain >= 0 && result.exhaust_gain <= .36);
    assert(result.mechanical_gain >= 0 && result.mechanical_gain <= .045);
    assert(result.propeller_gain >= 0 && result.propeller_gain <= .1);
  }
});
