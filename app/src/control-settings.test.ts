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

test('secondary controls preserve flap and brake commands independently of yoke sensitivity', () => {
  const raw = { ...neutral, flap_norm: 2/3, brake_norm: 1 };
  const mapped = applyControlSettings(raw, GENTLE_CONTROL_SETTINGS, 0);
  assert.equal(mapped.flap_norm, 2/3); assert.equal(mapped.brake_norm, 1);
  for (const value of [-1, 1.01, NaN, Infinity]) {
    assert.throws(() => applyControlSettings({ ...raw, flap_norm: value }, DEFAULT_CONTROL_SETTINGS, 0));
    assert.throws(() => applyControlSettings({ ...raw, brake_norm: value }, DEFAULT_CONTROL_SETTINGS, 0));
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
