import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStallWarningDelivery, STALL_WARNING_MINIMUM_MS } from './stall-warning-delivery.ts';
import { STALL_FIELDS, type FlightState } from './types.ts';
import { createStallWarningPeak } from '../../studies/e1-browser/sim/stall-warning-peak.js';

const context = (now_ms: number, enabled = true) => ({ now_ms, enabled });
const frame = (step: number, extra: Partial<FlightState> = {}): FlightState => ({
  step, t_s: step / 120, lat_rad: .87, lon_rad: .15, alt_msl_m: 1200,
  roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 30,
  aero_u_mps: 30, aero_v_mps: 0, aero_w_mps: 0,
  aero_p_radps: 0, aero_q_radps: 0, aero_r_radps: 0,
  cg_structural_x_m: 1, cg_structural_y_m: 0, cg_structural_z_m: 1,
  aero_alpha_rad: .2, aero_alpha_max_rad: .28, stall_warning_norm: 0, stall_hysteresis_norm: 0,
  on_ground: 0, gear_nose_wow: 0, gear_left_wow: 0, gear_right_wow: 0,
  structure_contact_mask: 0, collision_mask: 0, ...extra,
});
const peak = (step: number, peakStep = step, norm = .01): FlightState => frame(step, {
  stall_warning_peak_norm: norm, stall_warning_peak_step: peakStep,
});
const clear = { active: false, recent: false };
const recent = { active: true, recent: true };

test('R-ALERT-1 actual ten-step native climb event survives producer phase and RAF coalescing at every pacing rate', () => {
  // Recorded actual JSBSim worker diagnostic: steps1348..1357 (83.333ms),
  // output/flight/stall-warning-actual-worker-task132-climb.json, original
  // worker SHA256 de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d.
  // Fixed captured signal values are delivery fixtures, not aircraft tuning.
  const norms = [.0005197205983131781, .0011857534313863827, .001685800942691218,
    .0020190989966684114, .002184903303876773, .0021824900287326088,
    .002011156404152503, .001670221352269019, .0011590261094140963, .0004769348541733276];
  for (const rate of [1, 1.5, 2, 5, 10]) {
    const producer = createStallWarningPeak(), delivery = createStallWarningDelivery();
    delivery.accept(frame(1340), context(0));
    for (let step = 1341; step <= 1360; step++) producer.observe(step, norms[step - 1348] ?? 0, 0, 0);
    const fields = producer.fields(1360, 0, 0, 0); producer.clear();
    assert.equal(fields.stall_warning_peak_step, 1352);
    assert.equal(fields.stall_warning_peak_norm, norms[4]);
    const arrival_ms = 20 / 120 / rate * 1000;
    delivery.accept(frame(1360, { ...fields, simulation_rate: rate }), context(arrival_ms));
    delivery.accept(frame(1380, { simulation_rate: rate }), context(arrival_ms + 1));
    const firstRaf_ms = arrival_ms + 2;
    assert.deepEqual(delivery.present(context(firstRaf_ms)), recent, `raw is clear at both snapshots, rate${rate}`);
    assert.deepEqual(delivery.present(context(firstRaf_ms + 199.999)), recent);
    assert.deepEqual(delivery.present(context(firstRaf_ms + 200)), clear);
  }
});

test('raw positive then clear before first RAF gets one wall-clock minimum from presentation', () => {
  const delivery = createStallWarningDelivery();
  delivery.accept(frame(1, { stall_warning_norm: .1 }), context(0));
  delivery.accept(frame(2), context(1));
  assert.deepEqual(delivery.present(context(5000)), recent);
  assert.deepEqual(delivery.present(context(5199.999)), recent);
  assert.deepEqual(delivery.present(context(5200)), clear);
  assert.equal(STALL_WARNING_MINIMUM_MS, 200);
});

test('sustained raw active is current, continues normally and does not continually renew the minimum', () => {
  const delivery = createStallWarningDelivery();
  delivery.accept(frame(1, { stall_warning_norm: .1 }), context(0));
  assert.deepEqual(delivery.present(context(0)), { active: true, recent: false });
  for (let step = 2; step <= 50; step++) {
    delivery.accept(frame(step, { stall_warning_norm: .1, stall_warning_peak_norm: .1, stall_warning_peak_step: step }), context(step * 10));
    assert.deepEqual(delivery.present(context(step * 10)), { active: true, recent: false });
  }
  delivery.accept(frame(51), context(510));
  assert.deepEqual(delivery.present(context(510)), clear);
});

test('duplicate/stale/out-of-order peaks never replay; a new genuine event renews the minimum without backlog', () => {
  const delivery = createStallWarningDelivery();
  delivery.accept(peak(10, 9), context(0));
  assert.deepEqual(delivery.present(context(0)), recent);
  delivery.accept(peak(10, 9), context(50));
  delivery.accept(peak(11, 8), context(100));
  assert.deepEqual(delivery.present(context(200)), clear);
  delivery.accept(peak(12, 10), context(201));
  assert.deepEqual(delivery.present(context(201)), clear, 'previous publication interval cannot return late');
  delivery.accept(peak(13, 13), context(250));
  delivery.accept(peak(14, 14), context(251));
  assert.deepEqual(delivery.present(context(260)), recent);
  assert.deepEqual(delivery.present(context(460)), clear, 'coalesced events are not queued for separate playback');
});

test('an event already covered by a genuine raw positive does not manufacture another recent episode', () => {
  const delivery = createStallWarningDelivery();
  delivery.accept(frame(20, { stall_warning_norm: .1 }), context(0));
  delivery.present(context(0));
  delivery.accept(peak(21, 20), context(200));
  assert.deepEqual(delivery.present(context(200)), clear);
});

test('pause/hidden/Review/loading/failure suppression cancels immediately and consumes identities without resume replay', () => {
  // The root composes each lifecycle condition into the same enabled boundary.
  for (const lifecycle of ['pause', 'hidden', 'Review', 'loading', 'failure']) {
    const delivery = createStallWarningDelivery();
    delivery.accept(peak(10, 9), context(0));
    assert.deepEqual(delivery.present(context(0)), recent);
    assert.deepEqual(delivery.present(context(1, false)), clear, lifecycle);
    assert.deepEqual(delivery.present(context(2)), clear, lifecycle);
    delivery.accept(peak(11, 9), context(3));
    assert.deepEqual(delivery.present(context(3)), clear);
    delivery.accept(peak(12, 12), context(4, false));
    delivery.accept(peak(13, 12), context(5));
    assert.deepEqual(delivery.present(context(5)), clear, 'an event accepted while disabled cannot replay');
  }
});

test('rate changes preserve a pending event and the same wall-time expiry', () => {
  const delivery = createStallWarningDelivery();
  delivery.accept(peak(1), context(0));
  assert.deepEqual(delivery.present(context(0)), recent);
  for (const [step, rate] of [[2, 10], [3, 1], [4, 5], [5, 2]]) {
    delivery.accept(frame(step, { simulation_rate: rate }), context(step * 20));
    assert.deepEqual(delivery.present(context(step * 20)), recent);
  }
  assert.deepEqual(delivery.present(context(200)), clear);
});

test('ground, each wheel/structure/collision contact, unavailable contact and every missing native field cancel', () => {
  const invalid: Partial<FlightState>[] = [{ on_ground: 1 }, { gear_nose_wow: 1 }, { gear_left_wow: 1 },
    { gear_right_wow: 1 }, { structure_contact_mask: 1 }, { collision_mask: 8 }, { on_ground: undefined },
    { gear_left_wow: NaN }, { collision_mask: 128 }, ...STALL_FIELDS.map(key => ({ [key]: undefined }))];
  for (const extra of invalid) {
    const delivery = createStallWarningDelivery();
    delivery.accept(peak(1), context(0)); delivery.present(context(0));
    delivery.accept(frame(2, extra), context(1));
    assert.deepEqual(delivery.present(context(1)), clear, JSON.stringify(extra));
    delivery.accept(peak(3, 2), context(2));
    assert.deepEqual(delivery.present(context(2)), clear, 'invalid/contact interval cannot return as a later peak');
  }
});

test('malformed optional pairs cannot invent or retain a pulse', () => {
  const invalid = [{ stall_warning_peak_norm: .1 }, { stall_warning_peak_step: 2 },
    { stall_warning_peak_norm: 0, stall_warning_peak_step: 2 }, { stall_warning_peak_norm: NaN, stall_warning_peak_step: 2 },
    { stall_warning_peak_norm: Infinity, stall_warning_peak_step: 2 }, { stall_warning_peak_norm: .1, stall_warning_peak_step: 2.5 },
    { stall_warning_peak_norm: .1, stall_warning_peak_step: -1 }, { stall_warning_peak_norm: .1, stall_warning_peak_step: 3 }];
  for (const extra of invalid) {
    const delivery = createStallWarningDelivery();
    delivery.accept(peak(1), context(0)); delivery.present(context(0));
    delivery.accept(frame(2, extra), context(1));
    assert.deepEqual(delivery.present(context(1)), clear);
  }
});

test('nonfinite values, backwards clocks/frames and same-frame changed native signal fail closed', () => {
  for (const extra of [{ step: -1 }, { step: NaN }, { t_s: Infinity }, { aero_alpha_rad: NaN },
    { aero_alpha_max_rad: 0 }, { stall_warning_norm: -1 }, { stall_hysteresis_norm: .5 },
    { step: 0, t_s: 0 }, { step: 2, t_s: 0 }, { step: 1, t_s: 1 / 120, stall_warning_norm: .1 }]) {
    const delivery = createStallWarningDelivery();
    delivery.accept(peak(1), context(10)); delivery.present(context(10));
    delivery.accept(frame(2, extra), context(11));
    assert.deepEqual(delivery.present(context(11)), clear);
  }
  for (const now_ms of [-1, NaN, Infinity, 9]) {
    const delivery = createStallWarningDelivery();
    delivery.accept(peak(1), context(10)); delivery.present(context(10));
    assert.deepEqual(delivery.present(context(now_ms)), clear);
    assert.deepEqual(delivery.present(context(20)), clear);
  }
});

test('reset alone starts a new epoch; snapshots cannot mutate retained state and empty delivery stays clear', () => {
  const delivery = createStallWarningDelivery();
  assert.deepEqual(delivery.present(context(0)), clear);
  const state = peak(10, 9); delivery.accept(state, context(0));
  state.stall_warning_peak_norm = 0;
  const output = delivery.present(context(0)); output.active = false;
  assert.deepEqual(delivery.present(context(1)), recent);
  delivery.reset(); assert.deepEqual(delivery.present(context(0)), clear);
  delivery.accept(peak(10, 9), context(1));
  assert.deepEqual(delivery.present(context(1)), recent);
  delivery.accept(null, context(2)); assert.deepEqual(delivery.present(context(2)), clear);
});
