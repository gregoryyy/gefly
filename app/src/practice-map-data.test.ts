import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageryCorners, makePracticeMapFrame, practiceMapUpdateDue, unwrapMapPath } from './practice-map-data.ts';
import type { FlightState } from './types';

function state(overrides: Partial<FlightState> = {}): FlightState {
  return {
    step: 1, t_s: 1, lon_rad: 8.64 * Math.PI / 180, lat_rad: 49.96 * Math.PI / 180,
    alt_msl_m: 400, roll_rad: 0, pitch_rad: 0, heading_rad: Math.PI / 2, tas_mps: 40,
    ...overrides,
  };
}

test('dateline track projects through adjacent world copies and fits the nearby path', () => {
  const path: [number, number][] = [[179, 10], [-179, 11], [-178, 12]];
  assert.deepEqual(unwrapMapPath(path, -178), [[-181, 10], [-179, 11], [-178, 12]]);
  assert.deepEqual(unwrapMapPath(path, 182), [[179, 10], [181, 11], [182, 12]]);
  assert.deepEqual(path, [[179, 10], [-179, 11], [-178, 12]]);
  assert.deepEqual(unwrapMapPath([], 0), []);
});

test('plotting converts radians to longitude/latitude degrees and copies each coordinate', () => {
  const current = state();
  const history = [state({ lon_rad: 0, lat_rad: -Math.PI / 6 }), current];
  const frame = makePracticeMapFrame(current, history);
  assert.ok(Math.abs(frame.position[0] - 8.64) < 1e-12);
  assert.ok(Math.abs(frame.position[1] - 49.96) < 1e-12);
  assert.ok(Math.abs(frame.path[0][1] + 30) < 1e-12);
  assert.equal(frame.path[0][0], 0);
  assert.equal(frame.heading_deg, 90);
  assert.notEqual(frame.path[1], frame.position);
  frame.position[0] = 0;
  frame.path[1][1] = 0;
  assert.equal(current.lon_rad, 8.64 * Math.PI / 180);
  assert.equal(current.lat_rad, 49.96 * Math.PI / 180);
  assert.equal(makePracticeMapFrame(current, []).path.length, 0);
});

test('true heading wraps in both directions and always remains finite in [0, 360)', () => {
  for (const [radians, expected] of [[0, 0], [2 * Math.PI, 0], [-Math.PI / 2, 270], [5 * Math.PI, 180]]) {
    assert.equal(makePracticeMapFrame(state({ heading_rad: radians }), []).heading_deg, expected);
  }
  for (const heading_rad of [-Number.EPSILON, Number.MAX_VALUE, -Number.MAX_VALUE]) {
    const heading = makePracticeMapFrame(state({ heading_rad }), []).heading_deg;
    assert.ok(Number.isFinite(heading) && heading >= 0 && heading < 360);
  }
});

test('world map plotting retains southern/western and date-line positions without regional clipping', () => {
  const positions = [[-74, 40.7], [151.21, -33.86], [179.999, 0], [-179.999, 0]];
  const states = positions.map(([lon, lat]) => state({ lon_rad: lon * Math.PI / 180, lat_rad: lat * Math.PI / 180 }));
  const frame = makePracticeMapFrame(states[0], states);
  frame.path.forEach((point, index) => point.forEach((value, axis) => assert(Math.abs(value - positions[index][axis]) < 1e-12)));
});

test('map frames reject invalid positions or current headings instead of dropping bad points', () => {
  for (const field of ['lon_rad', 'lat_rad', 'heading_rad'] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(() => makePracticeMapFrame(state({ [field]: value }), []), RangeError);
    }
  }
  for (const invalid of [state({ lon_rad: Math.PI + 0.001 }), state({ lat_rad: -Math.PI / 2 - 0.001 })]) {
    assert.throws(() => makePracticeMapFrame(invalid, []), RangeError);
    assert.throws(() => makePracticeMapFrame(state(), [invalid]), RangeError);
  }
  assert.throws(() => makePracticeMapFrame(state(), [state({ lon_rad: NaN })]), RangeError);
  assert.throws(() => makePracticeMapFrame(state(), new Array<FlightState>(1)), RangeError);
  assert.deepEqual(makePracticeMapFrame(state({ lon_rad: Math.PI, lat_rad: -Math.PI / 2 }), []).position, [180, -90]);
});

test('image bounds use NW, NE, SE, SW longitude/latitude pairs and detached outputs', () => {
  const bounds = Object.freeze([8.62, 49.95, 8.66, 49.975]);
  const corners = imageryCorners(bounds);
  assert.deepEqual(corners, [[8.62, 49.975], [8.66, 49.975], [8.66, 49.95], [8.62, 49.95]]);
  corners[0][0] = 0;
  assert.equal(bounds[0], 8.62);
  assert.equal(corners[3][0], 8.62);
  assert.deepEqual(imageryCorners([-180, -90, 180, 90]), [[-180, 90], [180, 90], [180, -90], [-180, -90]]);
});

test('image bounds reject wrong lengths, nonfinite values, geographic ranges and inverted axes', () => {
  const invalid = [
    [], [1, 2, 3], [1, 2, 3, 4, 5], new Array<number>(4),
    [-181, 0, 1, 1], [0, 0, 181, 1], [0, -91, 1, 1], [0, 0, 1, 91],
    [1, 0, 1, 1], [2, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1],
  ];
  for (const value of [NaN, Infinity, -Infinity]) {
    for (let index = 0; index < 4; index++) {
      const bounds = [0, 0, 1, 1];
      bounds[index] = value;
      invalid.push(bounds);
    }
  }
  for (const bounds of invalid) assert.throws(() => imageryCorners(bounds), RangeError);
});

test('F7 Review map updates on every selected-sample change; live stays at 4 Hz', () => {
  const a = {}, b = {};
  assert.equal(practiceMapUpdateDue({ reviewing: true, now_ms: 10, lastUpdate_ms: 5, sample: b, lastSample: a }), true);
  assert.equal(practiceMapUpdateDue({ reviewing: true, now_ms: 10, lastUpdate_ms: 5, sample: a, lastSample: a }), false);
  assert.equal(practiceMapUpdateDue({ reviewing: true, now_ms: 10, lastUpdate_ms: -Infinity, sample: a, lastSample: a }), true, 'seek/enter/exit forces one update');
  assert.equal(practiceMapUpdateDue({ reviewing: false, now_ms: 1249, lastUpdate_ms: 1000, sample: null, lastSample: null }), false);
  assert.equal(practiceMapUpdateDue({ reviewing: false, now_ms: 1250, lastUpdate_ms: 1000, sample: null, lastSample: null }), true);
});
