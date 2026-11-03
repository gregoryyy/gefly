import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENGINE_FIELDS, ENGINE_SWITCH_FIELDS, autopilotCommand, engineFields, engineSwitchFields, normalizedHeading } from './engine.js';

test('optional engine switch separates actual running from requested ignition without changing legacy instruments', () => {
  for (const actual of [0, 1]) for (const command of [0, 1]) {
    const input = [actual, command], result = engineSwitchFields(input);
    assert.deepEqual(Object.keys(result), ENGINE_SWITCH_FIELDS);
    assert.deepEqual(result, { engine_running: actual, engine_command_on: command });
    input[0] = 2; assert.equal(result.engine_running, actual);
  }
  for (const invalid of [null, [], [0], [0, 1, 1], [NaN, 1], [1, Infinity], [.5, 1], [1, -1], [true, false]]) {
    assert.deepEqual(engineSwitchFields(invalid), {});
  }
  assert.equal(Object.keys(engineFields(sample())).length, 13);
});

const sample = () => [85_000, 250, .92, 1, 350_000, 350, 1000, .00001, .04, .05, 0, 1.4, 0];

test('engine group maps all SI fields atomically and owns its output values', () => {
  const input = sample(), result = engineFields(input);
  assert.deepEqual(Object.keys(result), ENGINE_FIELDS);
  assert.equal(result.manifold_pressure_pa, 85_000);
  assert.equal(result.fuel_left_m3, .04);
  input[0] = 0; assert.equal(result.manifold_pressure_pa, 85_000);
  const raw = sample(); raw[12] = 3;
  assert.equal(engineFields(raw).ap_aileron_norm, 3, 'raw AP output is not silently clipped into surface position');
});

test('incomplete, non-finite and physically invalid engine groups are unavailable', () => {
  const missingMap = sample(); missingMap[0] = 0; assert.deepEqual(engineFields(missingMap), {});
  for (const value of [null, [], sample().slice(0, -1), [...sample(), 1]]) assert.deepEqual(engineFields(value), {});
  for (let index = 0; index < 13; index++) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const input = sample(); input[index] = value; assert.deepEqual(engineFields(input), {});
    }
  }
  for (const [index, value] of [[0, -1], [1, -1], [2, -.01], [2, 1.01], [3, .5], [4, -1], [5, 0], [6, 0],
    [7, -1], [8, -1], [9, -1], [10, 3], [10, 1.5], [11, -.01], [11, 2*Math.PI]]) {
    const input = sample(); input[index] = value; assert.deepEqual(engineFields(input), {});
  }
});

test('autopilot commands preserve distinct off/wings-level/heading modes and capture current heading', () => {
  for (const mode of [0, 1, 2]) assert.deepEqual(autopilotCommand({ mode }, 1.2), { mode, target_heading_rad: 1.2 });
  const target = autopilotCommand({ mode: 2, target_heading_rad: -Math.PI / 2 }, 1.2);
  assert.equal(target.target_heading_rad, 3*Math.PI/2);
  assert.deepEqual(autopilotCommand({ mode: 0, target_heading_rad: 2*Math.PI }, 1.2), { mode: 0, target_heading_rad: 0 });
});

test('invalid autopilot commands never become a supported mode or target', () => {
  for (const mode of [-1, 3, 1.5, '1', null, NaN]) assert.equal(autopilotCommand({ mode }, 1), null);
  for (const value of [null, NaN, Infinity, -Infinity, '1']) assert.equal(autopilotCommand({ mode: 2, target_heading_rad: value }, 1), null);
  assert.equal(autopilotCommand(null, 1), null);
  assert.equal(autopilotCommand({ mode: 2 }, NaN), null);
});

test('heading wrapping remains finite and canonical across extreme inputs', () => {
  for (const value of [0, -0, -Number.EPSILON, Number.MAX_VALUE, -Number.MAX_VALUE, 100*Math.PI]) {
    const result = normalizedHeading(value); assert(result >= 0 && result < Math.PI*2); assert.equal(Object.is(result, -0), false);
  }
});
