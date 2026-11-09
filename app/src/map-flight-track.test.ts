import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MapFlightTrack } from './map-flight-track.ts';
import type { FlightState } from './types';

const rad = (degrees: number) => degrees * Math.PI / 180;
const state = (step: number, lat_deg: number, lon_deg: number, t_s = step): FlightState => ({
  step, t_s, lat_rad: rad(lat_deg), lon_rad: rad(lon_deg),
} as FlightState);

test('whole-flight map track retains departure and latest after the ten-minute review window', () => {
  const track = new MapFlightTrack({ maxPoints: 128 });
  for (let i = 0; i <= 2400; i++) assert(track.record(state(i, 48 + i / 10000, 8)));
  const path = track.sampledStates(32);
  assert.equal(path.length, 32);
  assert.equal(path[0].t_s, 0);
  assert.equal(path.at(-1)?.t_s, 2400);
  assert(path.every((point, i) => i === 0 || point.t_s > path[i - 1].t_s));
  assert(track.wasSimplified());
});

test('geometric output preserves a sharp turn rather than time-uniformly erasing it', () => {
  const track = new MapFlightTrack();
  for (let i = 0; i <= 300; i++) {
    const lat = i <= 137 ? 49 : 49 + (i - 137) * 0.001;
    const lon = i <= 137 ? 8 + i * 0.001 : 8.137;
    assert(track.record(state(i, lat, lon)));
  }
  const path = track.sampledStates(8);
  assert(path.some(point => point.t_s === 137), 'significant corner survives output simplification');
  assert.equal(path[0].t_s, 0);
  assert.equal(path.at(-1)?.t_s, 300);
  assert(track.wasSimplified());
});

test('geometric simplification handles a date-line crossing with a real turn', () => {
  const track = new MapFlightTrack({ maxPoints: 4 });
  const points = [[0, 179], [0, 179.5], [0, -179.8], [1, -179.8], [2, -179.8], [3, -179.8]];
  points.forEach(([lat, lon], i) => assert(track.record(state(i, lat, lon))));
  const path = track.sampledStates(4);
  assert.equal(path[0].lon_rad, rad(179));
  assert.equal(path.at(-1)?.lat_rad, rad(3));
  assert(path.some(point => point.t_s === 2), 'corner across the date line survives');
  assert(path.every(point => Math.abs(point.lon_rad) <= Math.PI));
});

test('branch removes future path, preserves start, and accepts the new continuation', () => {
  const track = new MapFlightTrack({ maxPoints: 20 });
  for (let i = 0; i <= 30; i++) assert(track.record(state(i, 50 + i / 1000, 8)));
  track.sampledStates(5);
  track.truncateAfter(20);
  assert(track.record(state(21, 49, 9)));
  assert(track.record(state(22, 49, 9.1)));
  const path = track.sampledStates(5);
  assert.equal(path[0].t_s, 0);
  assert.equal(path.at(-1)?.t_s, 22);
  assert(path.every(point => point.t_s <= 22));
  assert.equal(path.at(-1)?.lon_rad, rad(9.1));
});

test('input validation, duplicate samples, detached snapshots, and clear', () => {
  assert.throws(() => new MapFlightTrack({ maxPoints: 1 }), RangeError);
  const track = new MapFlightTrack({ maxPoints: 8 });
  const input = state(1, 50, 8);
  assert(track.record(input));
  input.lat_rad = rad(1);
  assert.equal(track.sampledStates(8)[0].lat_rad, rad(50));
  assert(!track.record(state(1, 51, 8)));
  assert(!track.record(state(2, 51, 8, 1)));
  assert(!track.record(state(2, 91, 8)));
  assert(!track.record(state(2, 50, 181)));
  assert(!track.record(state(2, Number.NaN, 8)));
  assert.throws(() => track.sampledStates(1), RangeError);
  assert.throws(() => track.truncateAfter(-1), RangeError);
  track.clear();
  assert.deepEqual(track.sampledStates(8), []);
  assert(!track.wasSimplified());
  assert(track.record(state(0, -33, 18)));
  assert.equal(track.sampledStates(8)[0].step, 0);
});
