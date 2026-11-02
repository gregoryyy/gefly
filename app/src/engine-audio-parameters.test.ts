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
      assert.equal(result.valid, true, 'usable airspeed still supplies wind');
      assert.equal(result.exhaust_gain + result.mechanical_gain + result.propeller_gain, 0);
      assert(result.wind_gain > 0);
    }
  }
  assert.equal(engineAudioParameters(fixture({ manifold_pressure_pa: 0 })).exhaust_gain, 0);
});

test('wind uses actual true airspeed independently of engine rotation, fuel and requested controls', () => {
  const moving = engineAudioParameters(fixture({ prop_radps: 0, fuel_flow_m3ps: 0, tas_mps: 40 }));
  assert(moving.valid && moving.wind_gain > 0);
  assert.equal(moving.exhaust_gain + moving.mechanical_gain + moving.propeller_gain, 0);
  const zero = engineAudioParameters(fixture({ prop_radps: 0, fuel_flow_m3ps: 0, tas_mps: 0 }));
  assert.equal(zero.wind_gain + zero.exhaust_gain + zero.mechanical_gain + zero.propeller_gain, 0);
  const windmill = engineAudioParameters(fixture({ prop_radps: 1600 * Math.PI / 30, fuel_flow_m3ps: 0 }));
  assert.equal(windmill.wind_gain, moving.wind_gain);
  assert(windmill.mechanical_gain > 0 && windmill.exhaust_gain === 0);
  const low = engineAudioParameters(fixture({ tas_mps: 10 })), high = engineAudioParameters(fixture({ tas_mps: 70 }));
  assert(low.wind_gain < moving.wind_gain && moving.wind_gain < high.wind_gain);
  assert(low.wind_cutoff_hz < moving.wind_cutoff_hz && moving.wind_cutoff_hz < high.wind_cutoff_hz);
  assert.equal(engineAudioParameters(fixture({ throttle_norm: 0, ground_forward_mps: 0 })).wind_gain,
    engineAudioParameters(fixture({ throttle_norm: 1, ground_forward_mps: 500 })).wind_gain);
});

test('unavailable or malformed airspeed never invents wind and leaves valid engine sound available', () => {
  for (const tas_mps of [undefined, NaN, Infinity, -Infinity, -1]) {
    const engine = engineAudioParameters(fixture({ tas_mps }));
    assert.equal(engine.wind_gain, 0); assert(engine.exhaust_gain > 0);
    assert.equal(engine.wind_whistle_gain, 0); assert.equal(engine.wind_whistle_hz, 0);
    const missing = engineAudioParameters(fixture({ tas_mps, prop_radps: undefined }));
    assert.equal(missing.valid, false); assert.equal(missing.wind_gain, 0);
  }
});

test('wind whistle pitch and strength rise only with actual TAS and vanish at zero airflow', () => {
  const low = engineAudioParameters(fixture({ tas_mps: 40, prop_radps: 0, fuel_flow_m3ps: 0 }));
  const high = engineAudioParameters(fixture({ tas_mps: 70, prop_radps: 0, fuel_flow_m3ps: 0 }));
  assert(low.wind_whistle_hz > 0 && low.wind_whistle_hz < high.wind_whistle_hz);
  assert(low.wind_whistle_gain > 0 && low.wind_whistle_gain < high.wind_whistle_gain);
  const changedEngine = engineAudioParameters(fixture({ tas_mps: 40, prop_radps: 300, fuel_flow_m3ps: 1e-4, throttle_norm: 1 }));
  assert.equal(changedEngine.wind_whistle_hz, low.wind_whistle_hz);
  assert.equal(changedEngine.wind_whistle_gain, low.wind_whistle_gain);
  const zero = engineAudioParameters(fixture({ tas_mps: 0 }));
  assert.equal(zero.wind_whistle_gain, 0); assert.equal(zero.wind_whistle_hz, 0);
  assert.equal(engineAudioParameters(fixture({ tas_mps: 20 })).wind_whistle_gain, 0, 'low-speed airflow has no whistle');
  assert(low.wind_whistle_gain < high.wind_whistle_gain / 20, 'whistle remains negligible near sound-design onset');
});

test('actual stopped engine suppresses exhaust even when fuel flow remains positive; legacy telemetry retains its proxy', () => {
  const stopped = engineAudioParameters(fixture({ engine_running: 0 }));
  assert.equal(stopped.exhaust_gain, 0); assert(stopped.mechanical_gain > 0 && stopped.wind_gain > 0);
  assert(engineAudioParameters(fixture({ engine_running: 1 })).exhaust_gain > 0);
  assert(engineAudioParameters(fixture()).exhaust_gain > 0);
});

test('rolling uses actual wheel contact/load and horizontal ground motion independently of TAS and requested brakes', () => {
  const ground = fixture({ ground_forward_mps: 12, ground_side_mps: 5,
    gear_nose_wow: 0, gear_left_wow: 1, gear_right_wow: 1,
    gear_nose_load_n: 0, gear_left_load_n: 4000, gear_right_load_n: 4000 });
  const actual = engineAudioParameters(ground);
  assert(actual.ground_available && actual.rolling_gain > 0); assert.equal(actual.wheel_contact_mask, 6);
  assert.equal(engineAudioParameters({ ...ground, tas_mps: 0, brake_left_norm: 1 }).rolling_gain, actual.rolling_gain);
  assert.equal(engineAudioParameters({ ...ground, ground_forward_mps: 0, ground_side_mps: 0 }).rolling_gain, 0);
  assert.equal(engineAudioParameters({ ...ground, gear_left_wow: 0, gear_right_wow: 0 }).rolling_gain, 0);
  assert.equal(engineAudioParameters({ ...ground, gear_left_load_n: 0, gear_right_load_n: 0 }).rolling_gain, 0);
  assert.equal(engineAudioParameters({ ...ground, gear_left_load_n: undefined }).ground_available, false);
  assert.equal(engineAudioParameters({ ...ground, ground_forward_mps: Infinity }).rolling_gain, 0);
  assert.equal(engineAudioParameters({ ...ground, step: 2, t_s: 2 / 120 }).frame_step, 2);
});

test('engine-only matched-load gains make upper actual RPM stronger than idle', () => {
  const idle = engineAudioParameters(fixture({ prop_radps: 900 * Math.PI / 30 }));
  const cruise = engineAudioParameters(fixture({ prop_radps: 2400 * Math.PI / 30 }));
  assert(idle.exhaust_gain < cruise.exhaust_gain / 3);
  assert(idle.mechanical_gain < cruise.mechanical_gain / 3);
  assert(idle.propeller_gain < cruise.propeller_gain / 3);
});

test('sound-design gains and frequencies stay bounded for extreme finite inputs', () => {
  for (const magnitude of [1e-20, 1, 100, 1e6, 1e200, Number.MAX_VALUE]) {
    const result = engineAudioParameters(fixture({ prop_radps: magnitude, manifold_pressure_pa: magnitude, fuel_flow_m3ps: magnitude, tas_mps: magnitude }));
    assert(Object.values(result).every(value => typeof value !== 'number' || Number.isFinite(value)));
    assert(result.rotation_hz <= 200); assert(result.firing_hz <= 400); assert(result.noise_cutoff_hz <= 5000);
    assert(result.exhaust_gain >= 0 && result.exhaust_gain <= .36);
    assert(result.mechanical_gain >= 0 && result.mechanical_gain <= .045);
    assert(result.propeller_gain >= 0 && result.propeller_gain <= .1);
    assert(result.wind_gain >= 0 && result.wind_gain <= .14);
    assert(result.wind_cutoff_hz >= 400 && result.wind_cutoff_hz <= 2600);
    assert(result.wind_whistle_hz >= 0 && result.wind_whistle_hz <= 2200);
    assert(result.wind_whistle_gain >= 0 && result.wind_whistle_gain <= .10);
  }
});
