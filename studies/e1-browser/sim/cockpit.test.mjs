import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stallFields, controlFields, cockpitFields, pitchTrimFields, groundFields } from './cockpit.js';
test('airflow telemetry is atomic, preserves SI frames and uncapped model warnings', () => {
  const data = [30, -2, 8, .2, -.1, .05, 1.05, .01, .93, .28, .28, 1.5, 1];
  const fields = stallFields(data);
  assert.equal(Object.keys(fields).length, 13);
  assert.equal(fields.aero_u_mps, 30); assert.equal(fields.aero_v_mps, -2);
  assert.equal(fields.aero_p_radps, .2); assert.equal(fields.cg_structural_x_m, 1.05);
  assert.equal(fields.aero_alpha_rad, .28); assert.equal(fields.stall_warning_norm, 1.5);
  assert.equal(fields.stall_hysteresis_norm, 1);
  for (const invalid of [data.slice(1), [...data, 0]]) assert.deepEqual(stallFields(invalid), {});
  for (let i = 0; i < data.length; i++) {
    const bad = [...data]; bad[i] = NaN; assert.deepEqual(stallFields(bad), {});
  }
  for (const [i, value] of [[9, 4], [10, 0], [10, Math.PI / 2], [11, -.1], [12, .5]]) {
    const bad = [...data]; bad[i] = value; assert.deepEqual(stallFields(bad), {});
  }
});
test('review telemetry separates applied commands from actual differential surfaces', () => {
  const data = [.7, -.45, .35, -.35, -.12, .08, -.14];
  assert.deepEqual(controlFields(data), { throttle_norm: .7, aileron_cmd_norm: -.45,
    elevator_cmd_norm: .35, rudder_cmd_norm: -.35, aileron_rad: -.12,
    right_aileron_rad: .08, rudder_rad: -.14 });
  for (const invalid of [data.slice(1), [...data, 0], [1.01, ...data.slice(1)],
    [-.01, ...data.slice(1)], [.7, 1.01, ...data.slice(2)]]) assert.deepEqual(controlFields(invalid), {});
  for (let i = 0; i < data.length; i++) {
    const invalid = [...data]; invalid[i] = NaN;
    assert.deepEqual(controlFields(invalid), {});
  }
});
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

test('pitch trim telemetry retains actual command sign, initial baseline and elevator radians', () => {
  const initial = 0.168;
  const data = [-0.4, initial, -0.13];
  assert.deepEqual(pitchTrimFields(data), {
    pitch_trim_norm: -0.4, pitch_trim_initial_norm: initial, elevator_rad: -0.13,
  });
  assert.deepEqual(data, [-0.4, initial, -0.13]);
  assert.equal(pitchTrimFields([1, -1, 0.34]).pitch_trim_norm, 1);
  assert.equal(pitchTrimFields([-1, 1, -0.34]).pitch_trim_norm, -1);
});

test('pitch trim is an optional atomic group and rejects invalid model values', () => {
  for (const values of [[], [0, 0], [0, 0, 0, 0], [1.001, 0, 0], [0, -1.001, 0]]) {
    assert.deepEqual(pitchTrimFields(values), {});
  }
  for (let i = 0; i < 3; i++) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const data = [0, 0.168, 0]; data[i] = value;
      assert.deepEqual(pitchTrimFields(data), {});
    }
  }
});

const contact = [1.2, 1.2, 28, -4, 1.5, 5, 1, .1, 1500, -.2, 1, .2, 2000, -.3, 0, 0, 0, 0];
test('ground telemetry retains SI values, signed motion and individual contact identities', () => {
  const fields = groundFields(contact);
  assert.equal(fields.ground_down_mps, 1.5);
  assert.equal(fields.ground_side_mps, -4);
  assert.equal(fields.structure_contact_mask, 5);
  assert.equal(fields.gear_nose_wow, 1);
  assert.equal(fields.gear_nose_load_n, 1500);
  assert.equal(fields.gear_left_compression_m, .2);
  assert.equal(fields.gear_left_slip_rad, -.3);
  assert.equal(fields.gear_right_wow, 0);
  assert.equal(fields.gear_right_load_n, 0);
  assert.equal(contact[5], 5);
  assert.equal(Object.keys(fields).length, 18);
});

test('ground telemetry is atomic across malformed lengths, contact flags, loads and finite values', () => {
  for (const data of [[], contact.slice(1), [...contact, 0]]) assert.deepEqual(groundFields(data), {});
  for (let i = 0; i < contact.length; i++) {
    const data = [...contact]; data[i] = NaN;
    assert.deepEqual(groundFields(data), {});
  }
  for (const [i, value] of [[5,-1], [5,8], [5,.5], [6,.5], [10,2], [14,-1],
    [7,-.01], [11,-.01], [15,-.01], [8,-1], [12,-1], [16,-1], [4,Infinity]]) {
    const data = [...contact]; data[i] = value;
    assert.deepEqual(groundFields(data), {});
  }
});
