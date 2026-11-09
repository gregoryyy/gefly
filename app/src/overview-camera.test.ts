import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextOverviewDistance, overviewCameraENU } from './overview-camera.ts';
test('terrain overview zoom spans local and Earth scales without changing camera FOV or input state', () => {
  assert(nextOverviewDistance(1500, 200) > 1500);
  assert.equal(nextOverviewDistance(50, -200), 50);
  assert.equal(nextOverviewDistance(20_000_000, 200), 20_000_000);
  assert.equal(nextOverviewDistance(NaN, NaN), 1500);
});
test('terrain orbit stays finite above the horizon with orthogonal camera axes', () => {
  for (const pitch of [-1.2, 0, 1.2]) for (const distance of [50, 1500, 20_000_000]) {
    const c = overviewCameraENU(1, {yaw_rad:.5,pitch_rad:pitch}, distance);
    assert(c.offset[2] > 0);
    assert(Math.abs(Math.hypot(...c.offset) - distance) < distance * 1e-12);
    assert(Math.abs(c.direction.reduce((n, v, i) => n + v * c.up[i], 0)) < 1e-12);
  }
});
