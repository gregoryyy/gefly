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
