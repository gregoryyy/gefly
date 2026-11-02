import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FlightTrace } from './flight-trace.ts';
import type { FlightState } from './types';

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
