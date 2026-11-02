import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cockpitFields } from './cockpit.js';
const level = [45, 0, 0, -1, 0, 0, 0, 0];
test('read-only cockpit fields retain engine units and symmetric wheel brakes', () => {
  const data = [45, Math.PI / 60, 0, -1, Math.PI / 9, 1, 1, 1];
  const fields = cockpitFields(data);
  assert.equal(fields.cas_mps, 45); assert.equal(fields.turn_rate_radps, Math.PI / 60);
  assert.equal(fields.flap_rad, Math.PI / 9); assert.equal(fields.brake_left_norm, 1);
  assert.equal(fields.brake_right_norm, 1); assert.equal(fields.on_ground, 1);
  assert.equal(fields.slip_ball_rad, 0);
  assert.deepEqual(data, [45, Math.PI / 60, 0, -1, Math.PI / 9, 1, 1, 1]);
});
test('ideal ball follows apparent gravity; zero/inverted loading is unavailable', () => {
  assert(Math.abs(cockpitFields([45,0,1,-1,0,0,0,0]).slip_ball_rad + Math.PI/4)<1e-12);
  assert(Math.abs(cockpitFields([45,0,-1,-1,0,0,0,0]).slip_ball_rad - Math.PI/4)<1e-12);
  for (const nz of [0,1]) assert.equal(cockpitFields([45,0,0,nz,0,0,0,0]).slip_ball_rad,undefined);
});
test('missing, nonfinite or out-of-range model values do not invent indications', () => {
  assert.deepEqual(cockpitFields([]),{});
  for (let i=0;i<8;i++) {const bad=[...level];bad[i]=NaN;assert.deepEqual(cockpitFields(bad),{});}
  for (const [i,v] of [[0,-1],[4,1],[5,2],[6,-1],[7,.5]]) {
    const bad=[...level];bad[i]=v;assert.deepEqual(cockpitFields(bad),{});
  }
});
