import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHASE_DISTANCE, nextChaseDistance } from './chase-distance.ts';

test('R-VIEW-1 chase zoom spans close aircraft and Earth scale with reversible wheel travel', () => {
  assert.equal(CHASE_DISTANCE.initial_m, Math.hypot(30, 11));
  const away = nextChaseDistance(1000, 100);
  assert(away > 1000);
  assert(Math.abs(nextChaseDistance(away, -100) - 1000) < 1e-10);
  let distance = CHASE_DISTANCE.initial_m;
  for (let i = 0; i < 20; i++) distance = nextChaseDistance(distance, 200);
  assert.equal(distance, CHASE_DISTANCE.max_m);
  for (let i = 0; i < 20; i++) distance = nextChaseDistance(distance, -200);
  assert.equal(distance, CHASE_DISTANCE.min_m);
});

test('R-VIEW-1 close chase zoom keeps the aircraft readable with a gentle first scroll', () => {
  const distance = nextChaseDistance(CHASE_DISTANCE.initial_m, 100);
  assert(distance > CHASE_DISTANCE.initial_m * 1.1, 'ordinary scrolling still moves the camera');
  assert(distance <= CHASE_DISTANCE.initial_m * 1.25, 'first 100 pixels do not cause a large distance jump');
  // With a fixed lens, apparent linear size is proportional to inverse distance.
  assert(CHASE_DISTANCE.initial_m / distance >= .8);
  const far = nextChaseDistance(100_000, 100);
  assert(Math.abs(far / 100_000 - Math.exp(.6)) < 1e-12, 'long-range overview remains quick');
});

test('R-VIEW-1 chase zoom can move closer than the default without jumping to its limit', () => {
  assert.equal(CHASE_DISTANCE.min_m, 16);
  const closer = nextChaseDistance(CHASE_DISTANCE.initial_m, -100);
  assert(closer < CHASE_DISTANCE.initial_m && closer > CHASE_DISTANCE.min_m);
  assert(Math.abs(nextChaseDistance(closer, 100) / CHASE_DISTANCE.initial_m - 1) < 1e-12);
  let distance = CHASE_DISTANCE.initial_m;
  for (let i = 0; i < 30; i++) distance = nextChaseDistance(distance, -200);
  assert.equal(distance, CHASE_DISTANCE.min_m);
  assert(CHASE_DISTANCE.initial_m / distance >= 1.9, 'aircraft can appear nearly twice as large');
  assert(nextChaseDistance(distance, 100) > distance, 'zoom can move away again');
});

test('R-INPUT-1 wheel event subdivision and reversal preserve distance across the response transition', () => {
  for (const start of [18, 24, CHASE_DISTANCE.initial_m, 100, 990, 1000, 1100, 100_000]) {
    const whole = nextChaseDistance(start, 100);
    let subdivided = start;
    for (let i = 0; i < 10; i++) subdivided = nextChaseDistance(subdivided, 10);
    assert(Math.abs(subdivided / whole - 1) < 1e-12, `same travel from ${start} m`);
    const returned = nextChaseDistance(whole, -100);
    assert(Math.abs(returned / start - 1) < 1e-12, `reversible travel from ${start} m`);
  }
  for (const start of [999.999, 1000, 1000.001]) {
    const next = nextChaseDistance(start, 1);
    assert(next > start && next < start * 1.007, 'continuous response at one kilometre');
  }
});

test('R-INPUT-1 equivalent pixel, line and page wheel units produce the same distance', () => {
  assert.equal(nextChaseDistance(1000, 16, 0), nextChaseDistance(1000, 1, 1));
  assert.equal(nextChaseDistance(1000, 16, 0), nextChaseDistance(1000, 1, 2, 16));
  assert.equal(nextChaseDistance(1000, 200), nextChaseDistance(1000, 1e100));
  assert.equal(nextChaseDistance(1000, -200), nextChaseDistance(1000, -1e100));
});

test('R-VIEW-1 chase radius normalizes invalid state and respects both bounds', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(nextChaseDistance(invalid, 0), CHASE_DISTANCE.initial_m);
    assert.equal(nextChaseDistance(1000, invalid), 1000);
  }
  assert.equal(nextChaseDistance(-100, 0), CHASE_DISTANCE.min_m);
  assert.equal(nextChaseDistance(1e100, 0), CHASE_DISTANCE.max_m);
  assert.equal(nextChaseDistance(CHASE_DISTANCE.min_m, -1e100), CHASE_DISTANCE.min_m);
  assert.equal(nextChaseDistance(CHASE_DISTANCE.max_m, 1e100), CHASE_DISTANCE.max_m);
});

test('R-INPUT-1 unsupported wheel modes and invalid page dimensions cannot change zoom', () => {
  for (const mode of [-1, 3, NaN, Infinity]) assert.equal(nextChaseDistance(1000, 100, mode), 1000);
  for (const height of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(nextChaseDistance(1000, 1, 2, height), 1000);
  }
  // Unused dimensions cannot disable pixel or line input.
  assert(nextChaseDistance(1000, 1, 0, NaN) > 1000);
  assert(nextChaseDistance(1000, 1, 1, NaN) > 1000);
});
