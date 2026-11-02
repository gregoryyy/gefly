import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flightPathGradient, MIN_HORIZONTAL_GROUNDSPEED_MPS } from './flight-path-gradient.ts';

test('signed flight-path percent uses horizontal ground motion and NED vertical signs', () => {
  const descent = flightPathGradient({ ground_forward_mps: 40, ground_side_mps: 30, ground_down_mps: 2.5 });
  assert.deepEqual(descent, { status: 'available', gradient_percent: -5,
    horizontal_groundspeed_mps: 50, vertical_speed_up_mps: -2.5 });
  assert.equal(flightPathGradient({ ground_forward_mps: 50, ground_side_mps: 0, ground_down_mps: -2.5 }).gradient_percent, 5);
  assert.equal(flightPathGradient({ ground_forward_mps: -40, ground_side_mps: -30, ground_down_mps: 0 }).gradient_percent, 0);
  assert.equal(Object.is(flightPathGradient({ ground_forward_mps: 5, ground_side_mps: 0, ground_down_mps: 0 }).gradient_percent, -0), false);
});

test('heading rotation and sideways/backward movement preserve the horizontal speed reference', () => {
  for (const angle of [0, .2, Math.PI / 2, Math.PI, -2]) {
    const result = flightPathGradient({ ground_forward_mps: 30 * Math.cos(angle), ground_side_mps: 30 * Math.sin(angle), ground_down_mps: 3 });
    assert(Math.abs(result.gradient_percent! + 10) < 1e-12);
  }
});

test('low groundspeed is explicitly unavailable, with a precise inclusive presentation threshold', () => {
  for (const horizontal of [0, .1, MIN_HORIZONTAL_GROUNDSPEED_MPS - 1e-9]) {
    const result = flightPathGradient({ ground_forward_mps: horizontal, ground_side_mps: 0, ground_down_mps: 2 });
    assert.equal(result.status, 'low-groundspeed'); assert.equal(result.gradient_percent, null);
    assert.equal(result.vertical_speed_up_mps, -2);
  }
  const boundary = flightPathGradient({ ground_forward_mps: MIN_HORIZONTAL_GROUNDSPEED_MPS, ground_side_mps: 0, ground_down_mps: 2 });
  assert.equal(boundary.status, 'available'); assert.equal(boundary.gradient_percent, -200);
});

test('missing/non-finite data and numerical overflow do not produce invented zeroes or infinities', () => {
  assert.equal(flightPathGradient(null).status, 'missing-data');
  assert.equal(flightPathGradient({}).status, 'missing-data');
  for (const key of ['ground_forward_mps', 'ground_side_mps', 'ground_down_mps']) {
    for (const bad of [NaN, Infinity, -Infinity]) assert.equal(flightPathGradient({ ground_forward_mps: 20,
      ground_side_mps: 0, ground_down_mps: 1, [key]: bad }).status, 'missing-data');
  }
  assert.equal(flightPathGradient({ ground_forward_mps: Number.MAX_VALUE, ground_side_mps: Number.MAX_VALUE,
    ground_down_mps: 1 }).status, 'numerical-range');
  assert.equal(flightPathGradient({ ground_forward_mps: 1, ground_side_mps: 0,
    ground_down_mps: Number.MAX_VALUE }).status, 'numerical-range');
  const large = flightPathGradient({ ground_forward_mps: 1e308, ground_side_mps: 0, ground_down_mps: -1e308 });
  assert.equal(large.gradient_percent, 100, 'divide before multiplying to avoid spurious overflow');
});

test('steep finite paths remain actual values and inputs stay immutable', () => {
  const input = Object.freeze({ ground_forward_mps: 1, ground_side_mps: 0, ground_down_mps: -20 });
  assert.equal(flightPathGradient(input).gradient_percent, 2000);
  assert.deepEqual(input, { ground_forward_mps: 1, ground_side_mps: 0, ground_down_mps: -20 });
});
