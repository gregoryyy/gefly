import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRunwayPracticeMonitor } from './runway-practice.ts';
import type { FlightState } from './types';

const frame = (t_s: number, extra: Partial<FlightState> = {}): FlightState => ({
  step: Math.round(t_s * 120), t_s, lat_rad: .87, lon_rad: .15, alt_msl_m: 300,
  roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 35,
  gear_nose_wow: 1, gear_left_wow: 1, gear_right_wow: 1,
  ground_forward_mps: 30, ground_side_mps: 0, ground_down_mps: 0,
  structure_contact_mask: 0, collision_mask: 0, ...extra,
});
const air = (t_s: number, extra: Partial<FlightState> = {}) => frame(t_s, {
  gear_nose_wow: 0, gear_left_wow: 0, gear_right_wow: 0, ...extra,
});
const monitor = createRunwayPracticeMonitor;

test('R-PLAY-1 initial parking and initial airborne state establish a baseline without inventing events', () => {
  const ground = monitor(); assert.deepEqual(ground.snapshot(), { phase: 'waiting', events: [] });
  for (let t = 0; t <= 4; t += .25) ground.update(frame(t, { ground_forward_mps: 0 }));
  assert.deepEqual(ground.snapshot(), { phase: 'ground', events: [] });
  assert.deepEqual(monitor().update(air(0)), { phase: 'airborne', events: [] });
});

test('R-PLAY-1 normal flight logs first-candidate liftoff/touchdown data after contact dwell, then an observed stop', () => {
  const m = monitor(); m.update(frame(0));
  m.update(air(.25, { ground_forward_mps: 28, ground_side_mps: 3, ground_down_mps: -2 }));
  assert.equal(m.update(air(.5)).phase, 'ground');
  let progress = m.update(air(.75));
  assert.equal(progress.phase, 'airborne');
  assert.deepEqual(progress.events, [{ kind: 'liftoff', t_s: .25, groundspeed_mps: Math.hypot(28, 3), vertical_speed_mps: 2 }]);
  m.update(frame(1, { gear_nose_wow: 0, gear_right_wow: 0, ground_forward_mps: 23, ground_down_mps: 1.4 }));
  m.update(frame(1.25)); progress = m.update(frame(1.5));
  assert.equal(progress.phase, 'landed');
  assert.deepEqual(progress.events[1], { kind: 'touchdown', t_s: 1, groundspeed_mps: 23, vertical_speed_mps: -1.4 });
  for (let t = 1.75; t <= 3.75; t += .25) progress = m.update(frame(t, { ground_forward_mps: .3, ground_side_mps: .3 }));
  assert.equal(progress.phase, 'stopped');
  assert.equal(progress.events[2].kind, 'stopped'); assert.equal(progress.events[2].t_s, 1.75);
});

test('R-PLAY-1 wheel bounces and brief all-airborne gaps do not create transitions; go-arounds create another observed cycle', () => {
  const m = monitor(); m.update(frame(0));
  m.update(air(.25)); m.update(frame(.5));
  m.update(air(.75)); m.update(air(1)); m.update(air(1.25));
  m.update(frame(1.5)); m.update(air(1.75));
  assert.deepEqual(m.snapshot().events.map(e => e.kind), ['liftoff']);
  m.update(frame(2)); m.update(frame(2.25)); m.update(frame(2.5));
  m.update(air(2.75)); m.update(air(3)); m.update(air(3.25));
  assert.deepEqual(m.snapshot().events.map(e => [e.kind, e.t_s]), [['liftoff', .75], ['touchdown', 2], ['liftoff', 2.75]]);
});

test('R-PLAY-1 stopping requires two continuous seconds below the observational threshold and wheel contact', () => {
  const m = monitor(); m.update(air(0)); m.update(frame(.25)); m.update(frame(.5)); m.update(frame(.75));
  for (let t = 1; t <= 2.5; t += .25) m.update(frame(t, { ground_forward_mps: .1 }));
  m.update(frame(2.75, { ground_forward_mps: .5 }));
  for (let t = 3; t <= 4.5; t += .25) m.update(frame(t, { ground_forward_mps: .1 }));
  m.update(air(4.75, { ground_forward_mps: .1 }));
  for (let t = 5; t <= 6.75; t += .25) m.update(frame(t, { ground_forward_mps: .1 }));
  assert.equal(m.snapshot().phase, 'landed');
  m.update(frame(7, { ground_forward_mps: .1 }));
  assert.deepEqual(m.snapshot().events.map(e => [e.kind, e.t_s]), [['touchdown', .25], ['stopped', 5]]);
});

test('R-PLAY-1 missing, nonfinite and invalid consumed telemetry is unavailable and cannot bridge a transition', () => {
  for (const bad of [{ gear_nose_wow: undefined }, { gear_left_wow: .5 }, { ground_side_mps: NaN },
    { ground_down_mps: Infinity }, { ground_forward_mps: undefined }, { structure_contact_mask: undefined },
    { structure_contact_mask: -1 }, { collision_mask: 128 }, { step: .5 }, { t_s: NaN }]) {
    const m = monitor(); m.update(frame(0)); m.update(air(.25));
    assert.equal(m.update(air(.5, bad)).phase, 'unavailable');
    m.update(air(.75)); m.update(air(1)); m.update(air(1.25));
    assert.deepEqual(m.snapshot().events, [], JSON.stringify(bad));
  }
});

test('R-PLAY-1 sparse observations do not assert continuous contact across a missing interval', () => {
  const m = monitor(); m.update(frame(0)); m.update(air(.25));
  m.update(air(2)); m.update(frame(3)); m.update(frame(3.25)); m.update(frame(3.5));
  assert.deepEqual(m.snapshot(), { phase: 'ground', events: [] });
});

test('R-PLAY-1 actual structure/proxy collision takes priority immediately and is logged once, including after missing data', () => {
  for (const collision of [{ structure_contact_mask: 1 }, { collision_mask: 16 }]) {
    const m = monitor(); m.update(air(0));
    const hit = m.update(frame(.25, { ...collision, ground_down_mps: 4 }));
    assert.equal(hit.phase, 'collision'); assert.equal(hit.events.length, 1);
    assert.deepEqual(hit.events[0], { kind: 'collision', t_s: .25, groundspeed_mps: 30, vertical_speed_mps: -4 });
    m.update(frame(.5, { ...collision, ground_down_mps: NaN }));
    assert.equal(m.snapshot().phase, 'collision');
    assert.equal(m.update(frame(.75, collision)).phase, 'collision');
    assert.equal(m.snapshot().events.length, 1);
  }
  const noMotion = monitor().update(frame(0, { collision_mask: 16, gear_nose_wow: undefined,
    ground_forward_mps: undefined, ground_down_mps: NaN }));
  assert.deepEqual(noMotion, { phase: 'collision', events: [{ kind: 'collision', t_s: 0 }] });
});

test('R-PLAY-1 duplicates are idempotent, backward time resets and snapshots cannot mutate retained history', () => {
  const m = monitor(); m.update(frame(0)); m.update(air(.25)); m.update(air(.5));
  const first = m.update(air(.75));
  assert.deepEqual(m.update(air(.75)), first);
  first.events[0].t_s = 999;
  assert.equal(m.snapshot().events[0].t_s, .25);
  assert.deepEqual(m.update(frame(.1)), { phase: 'ground', events: [] });
  m.reset(); assert.deepEqual(m.snapshot(), { phase: 'waiting', events: [] });
});

test('R-PLAY-1 deterministic trace reconstruction and bounded histories preserve latest observations without changing input', () => {
  const trace: FlightState[] = [frame(0)];
  for (let cycle = 0; cycle < 12; cycle++) {
    const start = cycle * 1.5;
    trace.push(air(start + .25), air(start + .5), air(start + .75),
      frame(start + 1), frame(start + 1.25), frame(start + 1.5));
  }
  trace.forEach(Object.freeze);
  const m = monitor(); trace.forEach(s => m.update(s));
  const final = m.snapshot(); assert.equal(final.events.length, 20);
  assert.equal(final.events[0].kind, 'liftoff'); assert.equal(final.events[0].t_s, 3.25);
  m.reset(); trace.forEach(s => m.update(s)); assert.deepEqual(m.snapshot(), final);
  m.reset(); trace.slice(0, 4).forEach(s => m.update(s));
  assert.deepEqual(m.snapshot().events.map(e => e.kind), ['liftoff'], 'a trace prefix cannot contain future landings');
});
