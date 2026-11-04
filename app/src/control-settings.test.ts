import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyControlSettings, DEFAULT_CONTROL_SETTINGS, GENTLE_CONTROL_SETTINGS,
} from './control-settings.ts';
import type { ControlSettings } from './control-settings.ts';
import type { Controls } from './types';

const neutral: Controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.693 };

test('default gains preserve existing pilot commands and the separate study offset', () => {
  const raw = { elevator: 0.75, aileron: -0.45, rudder: 0.35, throttle: 0.693 };
  assert.deepEqual(applyControlSettings(raw, DEFAULT_CONTROL_SETTINGS, 0), raw);
  const offset = -0.109375;
  assert.deepEqual(applyControlSettings(raw, DEFAULT_CONTROL_SETTINGS, offset), {
    ...raw, aileron: raw.aileron + offset,
  });
  assert.equal(applyControlSettings({ ...raw, aileron: -0.95 }, DEFAULT_CONTROL_SETTINGS, offset).aileron, -1);
});

test('gentle preset scales each pilot axis but never the roll offset or throttle', () => {
  assert.deepEqual(applyControlSettings({ ...neutral, elevator: 1, aileron: 0.5, rudder: -1 }, GENTLE_CONTROL_SETTINGS, 0.125), {
    elevator: 0.5, aileron: 0.375, rudder: -0.7, throttle: 0.693,
  });
  assert.equal(applyControlSettings(neutral, GENTLE_CONTROL_SETTINGS, -0.109375).aileron, -0.109375);
});

test('inclusive gain, axis, offset and throttle boundaries remain bounded', () => {
  for (const sign of [-1, 1]) {
    for (const throttle of [0, 1]) {
      const raw = { elevator: sign, aileron: sign, rudder: sign, throttle };
      assert.deepEqual(applyControlSettings(raw, { pitch: 1.5, roll: 1.5, rudder: 1.5 }, sign), raw);
      assert.deepEqual(applyControlSettings(raw, { pitch: 0.25, roll: 0.25, rudder: 0.25 }, 0), {
        elevator: sign * 0.25, aileron: sign * 0.25, rudder: sign * 0.25, throttle,
      });
    }
  }
  // Scaling must precede the offset: clamping first would produce 0.5 here.
  assert.equal(applyControlSettings({ ...neutral, aileron: 1 }, { ...DEFAULT_CONTROL_SETTINGS, roll: 1.5 }, -0.5).aileron, 1);
});

test('presets and caller-owned inputs stay immutable; results are fresh objects', () => {
  assert.equal(Object.isFrozen(DEFAULT_CONTROL_SETTINGS), true);
  assert.equal(Object.isFrozen(GENTLE_CONTROL_SETTINGS), true);
  const raw = Object.freeze({ ...neutral, elevator: 0.5 });
  const settings = Object.freeze({ ...GENTLE_CONTROL_SETTINGS });
  const first = applyControlSettings(raw, settings, 0);
  first.elevator = -1;
  assert.equal(raw.elevator, 0.5);
  assert.equal(settings.pitch, 0.5);
  assert.equal(applyControlSettings(raw, settings, 0).elevator, 0.25);
});

test('rejects non-finite and out-of-range controls instead of silently clamping bad input', () => {
  for (const axis of ['elevator', 'aileron', 'rudder'] as const) {
    for (const value of [NaN, Infinity, -Infinity, -1.001, 1.001]) {
      assert.throws(() => applyControlSettings({ ...neutral, [axis]: value }, DEFAULT_CONTROL_SETTINGS, 0), RangeError);
    }
  }
  for (const throttle of [NaN, Infinity, -Infinity, -0.001, 1.001]) {
    assert.throws(() => applyControlSettings({ ...neutral, throttle }, DEFAULT_CONTROL_SETTINGS, 0), /throttle/);
  }
});

test('rejects invalid gains and offsets explicitly', () => {
  for (const gain of ['pitch', 'roll', 'rudder'] as const satisfies readonly (keyof ControlSettings)[]) {
    for (const value of [NaN, Infinity, -Infinity, 0.249, 1.501]) {
      assert.throws(() => applyControlSettings(neutral, { ...DEFAULT_CONTROL_SETTINGS, [gain]: value }, 0), new RegExp(`${gain} gain`));
    }
  }
  for (const offset of [NaN, Infinity, -Infinity, -1.001, 1.001]) {
    assert.throws(() => applyControlSettings(neutral, DEFAULT_CONTROL_SETTINGS, offset), /roll offset/);
  }
});

test('flaps bypass yoke sensitivity; brakes use their separate default command gain', () => {
  const raw = { ...neutral, flap_norm: 2/3, brake_norm: 1 };
  const mapped = applyControlSettings(raw, GENTLE_CONTROL_SETTINGS, 0);
  assert.equal(mapped.flap_norm, 2/3); assert.equal(mapped.brake_norm, .25);
  for (const value of [-1, 1.01, NaN, Infinity]) {
    assert.throws(() => applyControlSettings({ ...raw, flap_norm: value }, DEFAULT_CONTROL_SETTINGS, 0));
    assert.throws(() => applyControlSettings({ ...raw, brake_norm: value }, DEFAULT_CONTROL_SETTINGS, 0));
  }
});

test('wheel brake input gain has inclusive zero/full bounds and leaves other commands unchanged', () => {
  const raw = Object.freeze({ ...neutral, flap_norm: .6, brake_norm: .8,
    mixture_norm: .7, mixture_auto: false, pitch_trim_norm: -.2, engine_running: false });
  for (const brake of [0, .25, .5, 1]) {
    const settings = Object.freeze({ ...DEFAULT_CONTROL_SETTINGS, brake, coordinatedRudder: false });
    assert.deepEqual(applyControlSettings(raw, settings, 0), { ...raw, brake_norm: .8 * brake });
  }
  const oldSettings = { pitch: 1, roll: 1, rudder: 1 };
  assert.equal(applyControlSettings(raw, oldSettings, 0).brake_norm, .2,
    'older settings without a brake gain receive the current default');
  assert.equal(applyControlSettings({ ...raw, brake_norm: 1 }, { ...oldSettings, brake: 1 }, 0).brake_norm, 1,
    'the full native brake command remains explicitly available');
  assert.equal('brake_norm' in applyControlSettings(neutral, oldSettings, 0), false);
  assert.equal(DEFAULT_CONTROL_SETTINGS.brake, .25);
  assert.equal(GENTLE_CONTROL_SETTINGS.brake, .25);
  for (const brake of [NaN, Infinity, -Infinity, -.001, 1.001]) {
    assert.throws(() => applyControlSettings(neutral, { ...oldSettings, brake }, 0), /wheel brake gain/);
  }
});

test('engine mixture and automatic/manual selection bypass yoke sensitivity', () => {
  const mapped = applyControlSettings({ ...neutral, mixture_norm: .6, mixture_auto: false }, GENTLE_CONTROL_SETTINGS, 0);
  assert.equal(mapped.mixture_norm, .6); assert.equal(mapped.mixture_auto, false);
  assert.throws(() => applyControlSettings({ ...neutral, mixture_norm: 1.1 }, DEFAULT_CONTROL_SETTINGS, 0));
});

test('manual pitch trim bypasses pilot-axis gains and rejects invalid commands', () => {
  for (const pitch_trim_norm of [-1, 0.168, 1]) {
    assert.equal(applyControlSettings({ ...neutral, pitch_trim_norm }, GENTLE_CONTROL_SETTINGS, -.1).pitch_trim_norm, pitch_trim_norm);
  }
  for (const pitch_trim_norm of [NaN, Infinity, -1.001, 1.001]) {
    assert.throws(() => applyControlSettings({ ...neutral, pitch_trim_norm }, DEFAULT_CONTROL_SETTINGS, 0), RangeError);
  }
});

// The new command must survive gain/offset processing independently of axes.
test('engine ignition selection survives control settings without a fabricated default', () => {
  const raw = { elevator: 0, aileron: 0, rudder: 0, throttle: .5 };
  assert.equal(applyControlSettings({ ...raw, engine_running: false }, DEFAULT_CONTROL_SETTINGS, 0).engine_running, false);
  assert.equal(applyControlSettings({ ...raw, engine_running: true }, DEFAULT_CONTROL_SETTINGS, 0).engine_running, true);
  assert.equal('engine_running' in applyControlSettings(raw, DEFAULT_CONTROL_SETTINGS, 0), false);
});

test('R-INPUT-1 linked rudder follows deliberate bank direction, sensitivity and manual priority', () => {
  assert.equal(DEFAULT_CONTROL_SETTINGS.coordinatedRudder, true);
  assert.equal(GENTLE_CONTROL_SETTINGS.coordinatedRudder, true);
  const settings = Object.freeze({ ...DEFAULT_CONTROL_SETTINGS, roll: .5, rudder: .7, coordinatedRudder: true });
  const rightBank = Object.freeze({ ...neutral, aileron: .8 });
  const right = applyControlSettings(rightBank, settings, -.2);
  assert(Math.abs(right.rudder - (-.28)) < 1e-12, 'negative rudder turns right in the pinned model');
  assert.equal(right.aileron, .2, 'only aileron receives the study offset');
  assert(Math.abs(applyControlSettings({ ...neutral, aileron: -.8 }, settings, .2).rudder - .28) < 1e-12);
  assert(Math.abs(applyControlSettings({ ...rightBank, rudder: .1 }, settings, 0).rudder - .07) < 1e-12,
    'even a smaller explicit opposite rudder command overrides the link');
  assert.equal(rightBank.rudder, 0, 'mapping does not mutate the raw input');
  assert.equal(settings.coordinatedRudder, true);
});

test('R-INPUT-1 rudder link excludes study correction and clamps combined sensitivity', () => {
  const linked = { ...DEFAULT_CONTROL_SETTINGS, coordinatedRudder: true };
  for (const offset of [-1, -.109375, 0, 1]) {
    assert.equal(Math.abs(applyControlSettings(neutral, linked, offset).rudder), 0,
      'a centered yoke and study roll correction must not steer the wheels');
  }
  const strong = { ...linked, roll: 1.5, rudder: 1.5 };
  assert.equal(applyControlSettings({ ...neutral, aileron: 1 }, strong, 0).rudder, -1);
  assert.equal(applyControlSettings({ ...neutral, aileron: -1 }, strong, 0).rudder, 1);
  assert.equal(applyControlSettings({ ...neutral, aileron: 1 }, DEFAULT_CONTROL_SETTINGS, 0).rudder, -1,
    'default bank input also commands rudder and nosewheel steering');
  assert.equal(applyControlSettings({ ...neutral, aileron: 1 }, { ...DEFAULT_CONTROL_SETTINGS, coordinatedRudder: false }, 0).rudder, 0,
    'the explicit unlink option retains independent rudder');
  assert.equal(applyControlSettings({ ...neutral, aileron: 1 }, { pitch: 1, roll: 1, rudder: 1 }, 0).rudder, 0,
    'older settings retain independent rudder');
});

test('R-INPUT-1 parking brake holds full native braking independently of wheel-brake gain', () => {
  const heldWheelBrake = Object.freeze({ ...neutral, brake_norm: 1 });
  for (const brake of [0, .25, 1]) {
    const settings = { ...DEFAULT_CONTROL_SETTINGS, brake, coordinatedRudder: false };
    assert.deepEqual(applyControlSettings(neutral, settings, 0, true), { ...neutral, brake_norm: 1 });
    assert.equal(applyControlSettings(heldWheelBrake, settings, 0, true).brake_norm, 1);
    assert.equal(applyControlSettings(heldWheelBrake, settings, 0, false).brake_norm, brake,
      'releasing parking brake restores an independently held wheel command');
    assert.equal(applyControlSettings({ ...neutral, brake_norm: 0 }, settings, 0, false).brake_norm, 0);
    assert.equal('brake_norm' in applyControlSettings(neutral, settings, 0, false), false,
      'off does not fabricate a new command for older callers');
  }
  assert.equal(heldWheelBrake.brake_norm, 1);
  assert.throws(() => applyControlSettings({ ...neutral, brake_norm: 2 }, DEFAULT_CONTROL_SETTINGS, 0, true), /wheel brake/);
});

test('R-INPUT-1 brake latch and rudder-link flags reject nonboolean values', () => {
  for (const bad of [null, 0, 1, '', 'true', {}, []]) {
    assert.throws(() => applyControlSettings(neutral, DEFAULT_CONTROL_SETTINGS, 0, bad as unknown as boolean), /Parking brake/);
    assert.throws(() => applyControlSettings(neutral, { ...DEFAULT_CONTROL_SETTINGS, coordinatedRudder: bad as unknown as boolean }, 0), /Rudder link/);
  }
});


test('R-INPUT-1 centered touchpad preference defaults off and never remaps commands', () => {
  assert.equal(DEFAULT_CONTROL_SETTINGS.centeredTouchpad, false);
  assert.equal(GENTLE_CONTROL_SETTINGS.centeredTouchpad, false);
  const raw = Object.freeze({ ...neutral, aileron: .4, elevator: -.2, rudder: .1, brake_norm: .5,
    flap_norm: 1 / 3, pitch_trim_norm: .2, mixture_norm: .8, mixture_auto: false, engine_running: true });
  for (const coordinatedRudder of [false, true]) {
    for (const parkingBrake of [false, true]) {
      const settings = Object.freeze({ ...GENTLE_CONTROL_SETTINGS, coordinatedRudder });
      const centered = Object.freeze({ ...settings, centeredTouchpad: true });
      assert.deepEqual(applyControlSettings(raw, centered, -.109375, parkingBrake),
        applyControlSettings(raw, settings, -.109375, parkingBrake));
      assert.equal(centered.centeredTouchpad, true);
    }
  }
  const legacySettings = { pitch: 1, roll: 1, rudder: 1 };
  assert.deepEqual(applyControlSettings(raw, legacySettings, 0),
    applyControlSettings(raw, { ...legacySettings, centeredTouchpad: false }, 0));
});

test('R-INPUT-1 centered touchpad preference rejects nonboolean values', () => {
  for (const bad of [null, 0, 1, '', 'true', {}, []]) {
    assert.throws(() => applyControlSettings(neutral,
      { ...DEFAULT_CONTROL_SETTINGS, centeredTouchpad: bad as unknown as boolean }, 0), /Centered touchpad/);
  }
});
