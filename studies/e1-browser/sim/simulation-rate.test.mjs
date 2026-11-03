import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIMULATION_RATES, validSimulationRate, pacedStepMilliseconds } from './simulation-rate.js';

test('only declared finite simulation rates are accepted', () => {
  assert.deepEqual(SIMULATION_RATES, [1, 1.5, 2, 5, 10]);
  for (const rate of SIMULATION_RATES) assert(validSimulationRate(rate));
  for (const value of [undefined, null, '2', true, NaN, Infinity, -1, 0, .5, 1.1, 3, 20, {}, []]) {
    assert.equal(validSimulationRate(value), false);
    assert.throws(() => pacedStepMilliseconds(1 / 120, value), RangeError);
  }
});

test('acceleration fits more identical fixed steps into wall time', () => {
  const dt = 1 / 120;
  for (const rate of SIMULATION_RATES) {
    const interval = pacedStepMilliseconds(dt, rate);
    assert(Math.abs(interval * 120 * rate - 1000) < 1e-9);
    assert.equal(Math.floor(1000 / interval + 1e-9), 120 * rate);
    assert.equal(dt, 1 / 120);
  }
  for (const dt of [0, -1, NaN, Infinity]) assert.throws(() => pacedStepMilliseconds(dt, 1), RangeError);
});
