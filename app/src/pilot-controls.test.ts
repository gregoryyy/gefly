import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pilotAxes, recordedControlView, recordedHeldKeys, RUDDER_LEFT_SIGN } from './pilot-controls.ts';

const holding = (...codes: string[]) => (code: string) => codes.includes(code);

test('R-SIM-3/R-INPUT-1 rudder sign: Q is left rudder (+, left yaw), W is right rudder (-)', () => {
  assert.equal(RUDDER_LEFT_SIGN, 1);
  assert.equal(pilotAxes(holding('KeyQ')).rudder, 0.35);
  assert.equal(pilotAxes(holding('KeyW')).rudder, -0.35);
  assert.equal(pilotAxes(holding('KeyQ', 'KeyW')).rudder, 0);
  assert.equal(pilotAxes(holding()).rudder, 0);
  // A and D are not rudder keys after the Q/W remap.
  assert.equal(pilotAxes(holding('KeyA', 'KeyD')).rudder, 0);
});

test('R-SIM-3 elevator/aileron signs and clamping for keys and stick', () => {
  assert.deepEqual(pilotAxes(holding('ArrowUp', 'ArrowRight')), { elevator: 0.35, aileron: 0.45, rudder: 0 });
  assert.deepEqual(pilotAxes(holding('ArrowDown', 'ArrowLeft')), { elevator: -0.35, aileron: -0.45, rudder: 0 });
  const full = pilotAxes(holding('ArrowUp', 'ArrowRight'), 1, 1);
  assert.ok(Math.abs(full.elevator - 0.75) < 1e-12 && Math.abs(full.aileron - 0.95) < 1e-12);
  assert.deepEqual(pilotAxes(holding(), 5, -5), { elevator: -1, aileron: 1, rudder: 0 });
  assert.deepEqual(pilotAxes(holding(), Number.NaN, Infinity), { elevator: 0, aileron: 0, rudder: 0 });
});

test('recorded held keys round-trip the live rudder convention', () => {
  const left = recordedHeldKeys({ rudder_cmd_norm: pilotAxes(holding('KeyQ')).rudder });
  assert.equal(left.KeyQ, true); assert.equal(left.KeyW, false);
  const right = recordedHeldKeys({ rudder_cmd_norm: pilotAxes(holding('KeyW')).rudder });
  assert.equal(right.KeyW, true); assert.equal(right.KeyQ, false);
  const none = recordedHeldKeys({});
  assert.ok(Object.values(none).every(value => value === false), 'missing fields show no held control');
  assert.equal(recordedHeldKeys({ brake_left_norm: 0, brake_right_norm: 0.4 }).KeyB, true);
  assert.equal(recordedHeldKeys({ elevator_cmd_norm: Number.NaN }).ArrowUp, false);
});

test('R-REVIEW-1 missing recorded throttle, flap command and stick are unavailable, not idle/UP/centred', () => {
  assert.deepEqual(recordedControlView({}), { throttle_percent: null, flap_deg: null, stick: null });
  assert.equal(recordedControlView({ aileron_cmd_norm: 0.2 }).stick, null, 'one axis alone is not a stick position');
  assert.deepEqual(recordedControlView({ throttle_norm: 0, flap_command_norm: 0, aileron_cmd_norm: 0, elevator_cmd_norm: 0 }),
    { throttle_percent: 0, flap_deg: 0, stick: { x: 0, y: 0 } }, 'recorded zeros remain real values');
  assert.deepEqual(recordedControlView({ throttle_norm: 0.5, flap_command_norm: 2 / 3, aileron_cmd_norm: -0.25, elevator_cmd_norm: 0.35 }),
    { throttle_percent: 50, flap_deg: 20, stick: { x: -0.25, y: 0.35 } });
  assert.equal(recordedControlView({ throttle_norm: Number.NaN }).throttle_percent, null);
  assert.equal(recordedControlView({ throttle_norm: 1.5 }).throttle_percent, null);
});
