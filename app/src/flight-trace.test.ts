import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_RADIO_NAV } from './radio-nav.ts';
import { FlightTrace } from './flight-trace.ts';
import { STALL_FIELDS, type FlightState } from './types.ts';

test('airflow snapshots preserve actual motion and CG without paused rewrites or partial groups', () => {
  const trace = new FlightTrace();
  const airflow = { aero_u_mps: 30, aero_v_mps: -2, aero_w_mps: 8, aero_p_radps: .2,
    aero_q_radps: -.1, aero_r_radps: .05, cg_structural_x_m: 1.05, cg_structural_y_m: .01,
    cg_structural_z_m: .93, aero_alpha_rad: .28, aero_alpha_max_rad: .28,
    stall_warning_norm: 1.5, stall_hysteresis_norm: 1 };
  const source = { ...state(1), ...airflow };
  assert(trace.record(source, 0));
  source.aero_w_mps = 100;
  assert.equal(trace.atTime(1)!.state.aero_w_mps, 8);
  assert.equal(trace.atTime(1)!.state.stall_warning_norm, 1.5);
  assert.equal(trace.record({ ...state(1), ...airflow, cg_structural_x_m: 2 }, 0), false);
  for (const field of STALL_FIELDS) {
    const partial: FlightState = { ...state(2), ...airflow }; delete partial[field];
    assert.equal(trace.record(partial, 0), false);
  }
  assert(trace.record({ ...state(2), ...airflow, aero_p_radps: -.3 }, 0));
  assert.equal(trace.atTime(1)!.state.aero_p_radps, .2);
  assert.equal(trace.atTime(2)!.state.aero_p_radps, -.3);
});

test('Review retains immutable applied controls, rejects partial groups and paused rewrites', () => {
  const trace = new FlightTrace();
  const controls = { throttle_norm: .7, aileron_cmd_norm: -.45, elevator_cmd_norm: .35,
    rudder_cmd_norm: -.35, aileron_rad: -.12, right_aileron_rad: .08, rudder_rad: -.14 };
  const source = { ...state(1), ...controls };
  assert(trace.record(source, 0));
  source.throttle_norm = .1;
  assert.equal(trace.atTime(1)!.state.throttle_norm, .7);
  assert.equal(trace.atTime(1)!.state.right_aileron_rad, .08);
  assert.equal(trace.record({ ...state(1), ...controls, throttle_norm: .2 }, 0), false);
  assert.equal(trace.record({ ...state(2), throttle_norm: .2 }, 0), false);
  assert.equal(trace.record({ ...state(2), ...controls, rudder_cmd_norm: 1.01 }, 0), false);
  assert(trace.record({ ...state(2), ...controls, throttle_norm: .2 }, 0));
  assert.equal(trace.atTime(2)!.state.throttle_norm, .2);
  assert.equal(trace.atTime(1)!.state.throttle_norm, .7);
});

function state(step: number, t_s = step): FlightState {
  return {
    step, t_s, lat_rad: 0.87, lon_rad: 0.15, alt_msl_m: 396.24,
    roll_rad: 0, pitch_rad: 0.04, heading_rad: 1.43, tas_mps: 46.3,
  };
}

test('empty trace and finite floor seeks clamp to the retained boundaries', () => {
  const trace = new FlightTrace();
  assert.equal(trace.bounds(), null);
  assert.equal(trace.atTime(0), null);
  for (const t_s of [10, 12, 15]) assert.equal(trace.record(state(t_s), -1.25), true);
  assert.deepEqual(trace.bounds(), { start_s: 10, end_s: 15, count: 3, clipped: false });
  for (const [seek, expected] of [[-1, 10], [10, 10], [11.99, 10], [12, 12], [14, 12], [15, 15], [99, 15]]) {
    assert.equal(trace.atTime(seek)?.state.t_s, expected);
  }
  for (const seek of [NaN, Infinity, -Infinity]) assert.equal(trace.atTime(seek), null);
});

test('capacity eviction retains chronological floor seeks through repeated ring wraps', () => {
  const trace = new FlightTrace({ maxSamples: 3 });
  for (let step = 0; step < 11; step++) assert.equal(trace.record(state(step), step / 10), true);
  assert.deepEqual(trace.bounds(), { start_s: 8, end_s: 10, count: 3, clipped: true });
  assert.equal(trace.atTime(0)?.state.step, 8);
  assert.equal(trace.atTime(8.9)?.state.step, 8);
  assert.equal(trace.atTime(9)?.state.step, 9);
  assert.equal(trace.atTime(99)?.state.step, 10);
});

test('age eviction keeps the exact duration boundary and handles a large time gap', () => {
  const trace = new FlightTrace({ maxSamples: 4, maxDuration_s: 2 });
  for (let step = 0; step < 3; step++) trace.record(state(step), 0);
  assert.deepEqual(trace.bounds(), { start_s: 0, end_s: 2, count: 3, clipped: false });
  trace.record(state(3, 2.5), 0);
  assert.deepEqual(trace.bounds(), { start_s: 1, end_s: 2.5, count: 3, clipped: true });
  trace.record(state(4, 100), 0);
  assert.deepEqual(trace.bounds(), { start_s: 100, end_s: 100, count: 1, clipped: true });
  assert.equal(trace.atTime(0)?.state.step, 4);
});

test('record copies and freezes state while preserving caller-provided SI vertical speed', () => {
  const trace = new FlightTrace();
  const original = state(1);
  const expected = { ...original };
  trace.record(original, -2.345);
  const sample = trace.atTime(1)!;
  assert.notEqual(sample.state, original);
  assert.equal(Object.isFrozen(original), false);
  original.alt_msl_m = 999;
  assert.deepEqual(sample.state, expected);
  assert.equal(sample.vertical_speed_mps, -2.345);
  assert.equal(Object.isFrozen(sample), true);
  assert.equal(Object.isFrozen(sample.state), true);
  assert.throws(() => { (sample.state as FlightState).alt_msl_m = 0; }, TypeError);
});

test('invalid numbers, ranges, duplicates and either clock regression leave history unchanged', () => {
  const trace = new FlightTrace({ maxSamples: 2 });
  trace.record(state(1), 0);
  const invalid = [
    state(1, 2), state(2, 1), state(0, 2), state(2, 0), state(1, 1),
    state(-1, 2), state(1.5, 2), state(2, -1),
    { ...state(2), lat_rad: Math.PI }, { ...state(2), lon_rad: Math.PI + 0.01 },
    { ...state(2), tas_mps: -1 },
  ];
  for (const field of Object.keys(state(2)) as (keyof FlightState)[]) {
    for (const value of [NaN, Infinity, -Infinity]) invalid.push({ ...state(2), [field]: value });
  }
  for (const sample of invalid) assert.equal(trace.record(sample, 0), false);
  for (const vsi of [NaN, Infinity, -Infinity]) assert.equal(trace.record(state(2), vsi), false);
  assert.equal(trace.record(null as unknown as FlightState, 0), false);
  assert.equal(trace.record({} as FlightState, 0), false);
  assert.deepEqual(trace.bounds(), { start_s: 1, end_s: 1, count: 1, clipped: false });
  assert.equal(trace.record(state(2), 0), true);
  assert.equal(trace.atTime(2)?.state.step, 2);
});

test('clear releases history, resets clipped and accepts a fresh simulation clock', () => {
  const trace = new FlightTrace({ maxSamples: 2 });
  for (let step = 0; step < 3; step++) trace.record(state(step), 0);
  trace.clear();
  assert.equal(trace.bounds(), null);
  assert.equal(trace.atTime(1), null);
  assert.equal(trace.record(state(0), 0), true);
  assert.deepEqual(trace.bounds(), { start_s: 0, end_s: 0, count: 1, clipped: false });
});

test('constructor rejects caps outside the supported memory and duration bounds', () => {
  for (const maxSamples of [0, 1, -1, 2.5, 36_001, NaN, Infinity]) {
    assert.throws(() => new FlightTrace({ maxSamples }), RangeError);
  }
  for (const maxDuration_s of [0, -1, 600.1, NaN, Infinity]) {
    assert.throws(() => new FlightTrace({ maxDuration_s }), RangeError);
  }
  assert.doesNotThrow(() => new FlightTrace({ maxSamples: 2, maxDuration_s: 0.001 }));
});

test('plot samples handle empty, one-frame and uncapped histories with immutable existing states', () => {
  const trace = new FlightTrace();
  assert.deepEqual(trace.sampledStates(), []);
  assert.equal(Object.isFrozen(trace.sampledStates()), true);
  trace.record(state(1), 0);
  const first = trace.sampledStates();
  assert.equal(first.length, 1);
  assert.equal(first[0], trace.atTime(1)!.state);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first[0]), true);
  assert.throws(() => { (first as FlightState[]).push(state(2)); }, TypeError);
  trace.record(state(2), 0);
  assert.deepEqual(trace.sampledStates().map((sample) => sample.step), [1, 2]);
  assert.equal(first.length, 1);
});

test('plot sampling preserves endpoints and evenly spaced existing states through ring wraps', () => {
  const trace = new FlightTrace({ maxSamples: 10 });
  for (let step = 0; step < 35; step++) trace.record(state(step), 0);
  assert.deepEqual(trace.sampledStates(4).map((sample) => sample.step), [25, 28, 31, 34]);
  assert.deepEqual(trace.sampledStates(5).map((sample) => sample.step), [25, 27, 29, 31, 34]);
  assert.deepEqual(trace.sampledStates(2).map((sample) => sample.step), [25, 34]);
  for (const sample of trace.sampledStates(4)) assert.equal(sample, trace.atTime(sample.t_s)!.state);
});

test('plot sampling caps large histories and rejects unsupported sample budgets', () => {
  const trace = new FlightTrace();
  for (let step = 0; step < 36000; step++) trace.record(state(step, step / 120), 0);
  assert.equal(trace.sampledStates().length, 600);
  const points = trace.sampledStates(1000);
  assert.equal(points.length, 1000);
  assert.equal(points[0].step, 0);
  assert.equal(points.at(-1)!.step, 35999);
  for (const maxPoints of [0, 1, -1, 2.5, 1001, NaN, Infinity]) {
    assert.throws(() => trace.sampledStates(maxPoints), RangeError);
  }
});

test('paused pressure setting changes replace only the last instrument snapshot and preserve prior objects', () => {
  const trace = new FlightTrace();
  const initial = { ...state(1), p_static_pa: 96_000, altimeter_setting_pa: 101_325,
    altimeter_indicated_m: 450, altimeter_qnh_pa: 101_325, altimeter_qfe_pa: 96_000,
    altimeter_qfe_datum_m: 396.24 };
  assert.equal(trace.record(initial, 2), true);
  const old = trace.atTime(1)!;
  const changed = { ...initial, altimeter_setting_pa: 96_000, altimeter_indicated_m: 0 };
  assert.equal(trace.record(changed, 999), true);
  assert.equal(trace.bounds()!.count, 1);
  assert.equal(trace.atTime(1)!.state.altimeter_indicated_m, 0);
  assert.equal(trace.atTime(1)!.vertical_speed_mps, 2);
  assert.equal(old.state.altimeter_setting_pa, 101_325);
  assert.equal(trace.record({ ...initial, alt_msl_m: 123 }, 2), false);
  assert.equal(trace.record({ ...initial, p_static_pa: 95_000 }, 2), false);
  assert.equal(trace.record({ ...initial, p_static_pa: NaN }, 2), false);
  assert.equal(trace.atTime(1)!.state.altimeter_setting_pa, 96_000);
});

test('six-pack and applied secondary-control values remain captured on the selected frame', () => {
  const trace = new FlightTrace();
  const first = { ...state(1), cas_mps: 43, turn_rate_radps: -.02, slip_ball_rad: .1,
    flap_rad: Math.PI/18, brake_left_norm: 1, brake_right_norm: 1, on_ground: 0 };
  assert.equal(trace.record(first, -1), true);
  assert.equal(trace.record({ ...first, step: 2, t_s: 2, flap_rad: Math.PI/9, brake_left_norm: 0, brake_right_norm: 0 }, 1), true);
  first.flap_rad = 0;
  assert.equal(trace.atTime(1)!.state.flap_rad, Math.PI/18);
  assert.equal(trace.atTime(1)!.state.brake_left_norm, 1);
  assert.equal(trace.atTime(2)!.state.flap_rad, Math.PI/9);
  assert.equal(trace.atTime(2)!.state.brake_left_norm, 0);
});

test('paused AP mode changes preserve physical/engine state and prior immutable review frames', () => {
  const trace=new FlightTrace();
  const first={...state(1),manifold_pressure_pa:80_000,prop_radps:200,mixture_norm:.95,mixture_auto:1,
    oil_pressure_pa:400_000,oil_temp_k:350,egt_k:800,fuel_flow_m3ps:.00001,fuel_left_m3:.05,fuel_right_m3:.05,
    ap_mode:2,ap_heading_target_rad:1.4,ap_aileron_norm:.2};
  assert.equal(trace.record(first,1),true);const prior=trace.atTime(1)!;
  assert.equal(trace.record({...first,ap_mode:0,ap_aileron_norm:0},99),true);
  assert.equal(trace.atTime(1)!.state.ap_mode,0);assert.equal(trace.atTime(1)!.vertical_speed_mps,1);
  assert.equal(prior.state.ap_mode,2);
  assert.equal(trace.record({...first,ap_mode:1,prop_radps:150},1),false);
  assert.equal(trace.record({...first,ap_mode:0},1),false,'servo-only changes without a setting/mode event cannot rewrite paused history');
});

test('review freezes actual trim and elevator, rejecting partial or paused trim rewrites', () => {
  const trace = new FlightTrace();
  const first = { ...state(1), pitch_trim_norm: .168, pitch_trim_initial_norm: .168, elevator_rad: .06 };
  assert.equal(trace.record(first, 0), true);
  const initial = trace.atTime(1)!;
  first.pitch_trim_norm = -.3;
  assert.equal(initial.state.pitch_trim_norm, .168);
  assert.equal(trace.record({ ...first, step: 2, t_s: 2, elevator_rad: -.1 }, 1), true);
  assert.equal(trace.atTime(2)!.state.pitch_trim_norm, -.3);
  assert.equal(trace.atTime(2)!.state.elevator_rad, -.1);
  assert.equal(trace.record({ ...first, step: 3, t_s: 3, elevator_rad: NaN }, 0), false);
  assert.equal(trace.record({ ...first, step: 2, t_s: 2, altimeter_setting_pa: 90_000 }, 0), false);
  assert(Object.isFrozen(initial.state));
});

test('radio configuration is captured atomically rather than read from live tuning', () => {
  const trace = new FlightTrace();
  const radio = { ...DEFAULT_RADIO_NAV };
  assert.equal(trace.record({ ...state(1), ...radio }, 0), true);
  radio.radio_obs_deg = 180; radio.radio_demo_enabled = 1;
  assert.equal(trace.record({ ...state(2), ...radio }, 0), true);
  assert.equal(trace.atTime(1)!.state.radio_obs_deg, 0);
  assert.equal(trace.atTime(1)!.state.radio_demo_enabled, 0);
  assert.equal(trace.atTime(2)!.state.radio_obs_deg, 180);
  assert.equal(trace.record({ ...state(3), radio_obs_deg: 0 }, 0), false);
  assert.equal(trace.record({ ...state(3), ...radio, radio_com_active_khz: 118001 }, 0), false);
});

test('paused radio edits replace only last avionics snapshot without changing physics or prior frames', () => {
  const trace = new FlightTrace();
  const first = { ...state(1), ...DEFAULT_RADIO_NAV };
  assert(trace.record(first, 2));
  const prior = trace.atTime(1)!;
  assert(trace.record({ ...first, radio_obs_deg: 90, radio_obs2_deg: 180, radio_demo_enabled: 1 }, 99));
  assert.equal(trace.bounds()!.count, 1);
  assert.equal(trace.atTime(1)!.state.radio_obs_deg, 90);
  assert.equal(trace.atTime(1)!.state.radio_obs2_deg, 180);
  assert.equal(trace.atTime(1)!.vertical_speed_mps, 2);
  assert.equal(prior.state.radio_obs_deg, 0);
  assert(Object.isFrozen(prior.state));
  assert.equal(trace.record({ ...first, radio_obs_deg: 95, tas_mps: first.tas_mps + 1 }, 2), false);
  assert.equal(trace.record({ ...first, radio_nav2_active_khz: 114001 }, 2), false);
});
