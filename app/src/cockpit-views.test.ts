import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { engineSwitchView, flightNote, groundReactionView, pitchTrimView, requestMixture, trimCommandFromSlider } from './cockpit-views.ts';
import type { FlightState } from './types';

test('F41 R-ENG-1 Model auto and manual mixture keep a staged engine selection', () => {
  const staged = { mixture_norm: .8, mixture_auto: false, engine_running: false };
  assert.deepEqual(requestMixture(staged, .8, true), { engine_running: false, mixture_norm: .8, mixture_auto: true });
  assert.deepEqual(requestMixture(staged, .5, false), { engine_running: false, mixture_norm: .5, mixture_auto: false });
  assert.deepEqual(requestMixture(null, 1, true), { mixture_norm: 1, mixture_auto: true });
  const view = engineSwitchView({ engine_running: 1, engine_command_on: 1 }, false, requestMixture(staged, .8, true));
  assert.equal(view.label, 'ENG OFF · E', 'staged OFF stays displayed after Model auto');
  assert.equal(view.running, 'RUN', 'actual running state stays separate from the command');
});

test('engine switch: Review shows recorded command only; missing fields are INOP', () => {
  assert.equal(engineSwitchView({ engine_running: 0, engine_command_on: 1 }, true, { mixture_norm: 1, mixture_auto: true, engine_running: false }).label, 'ENG ON · E');
  assert.deepEqual(engineSwitchView({ engine_running: 1 }, false, null), { available: false, selectedOn: false, label: 'ENG INOP', running: '—' });
  assert.equal(engineSwitchView(null, false, null).label, 'ENG INOP');
});

test('F28 dialog notes never claim flight continues while paused', () => {
  assert.equal(flightNote(false, true, 'R'), 'Flight continues while this panel is open.');
  assert.equal(flightNote(false, false, 'R'), 'Flight is paused.');
  assert.equal(flightNote(true, true, 'Recorded'), 'Recorded');
});

test('F27 pitch trim: slider sign, recorded read-only and unavailable handling', () => {
  assert.equal(trimCommandFromSlider(25), -.25, 'slider positive percent is nose up, a negative command');
  assert.equal(trimCommandFromSlider(-100), 1);
  assert.equal(trimCommandFromSlider(150), null);
  assert.equal(trimCommandFromSlider(Number.NaN), null);
  const live = pitchTrimView({ pitch_trim_norm: -.1, pitch_trim_initial_norm: -.05 }, false, true, -.2);
  assert.deepEqual([live.canControl, live.canRestore, live.slider_percent, live.valueText, live.actual],
    [true, true, 20, '20.0% nose up command', '10.0% nose up · actual']);
  assert.equal(live.initialTitle, 'Restore startup 5.0% nose up');
  const recorded = pitchTrimView({ pitch_trim_norm: .3 }, true, true, -.2);
  assert.deepEqual([recorded.canControl, recorded.canRestore, recorded.slider_percent, recorded.actual],
    [false, false, -30, '30.0% nose down · recorded'], 'Review ignores the pending live target');
  const paused = pitchTrimView({ pitch_trim_norm: 0 }, false, false, null);
  assert.equal(paused.canControl, false); assert.equal(paused.valueText, 'neutral command');
  const missing = pitchTrimView({}, true, true, null);
  assert.deepEqual([missing.actual, missing.valueText, missing.note], ['Unavailable', 'Trim command unavailable', 'Trim unavailable · rebuild flight engine']);
  assert.equal(pitchTrimView({ pitch_trim_norm: 2 }, false, true, null).actual, 'Unavailable', 'out-of-range trim is rejected');
});

test('F27 landing feedback: hidden above 50 m; missing wheel fields show —', () => {
  assert.equal(groundReactionView(null, false).visible, false);
  const base = { ground_agl_m: 2, ground_down_mps: 1.25, ground_side_mps: -.5 } as unknown as FlightState;
  assert.equal(groundReactionView({ ...base, ground_agl_m: 60 }, false).visible, false);
  const partial = groundReactionView({ ...base, gear_left_wow: 1, gear_left_load_n: 2500, gear_left_compression_m: .012, gear_left_slip_rad: Math.PI / 180, structure_contact_mask: 6 } as FlightState, true);
  assert.equal(partial.mode, 'RECORDED');
  assert.equal(partial.motion, 'CG 2.0 m AGL · ↓ 1.3 m/s · side -0.5 m/s');
  const left = partial.wheels.find(w => w.wheel === 'left')!, nose = partial.wheels.find(w => w.wheel === 'nose')!;
  assert.deepEqual([left.label, left.load, left.compression, left.slip], ['● LEFT', '2.5 kN', '12 mm', '1.0°']);
  assert.deepEqual([nose.label, nose.load, nose.compression, nose.slip], ['○ NOSE', '—', '—', '—']);
  assert.equal(partial.contact, 'STRUCTURE CONTACT: LEFT WINGTIP, RIGHT WINGTIP'); assert.equal(partial.structureContact, true);
  assert.equal(groundReactionView(base, false).contact, 'Structure contact unavailable');
});
