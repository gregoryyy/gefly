import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { elapsedTime, reviewKeyAction, reviewTransportView, snapReviewTime } from './review-transport.ts';

const base = { available: true, active: true, playing: false, start_s: 10, end_s: 75, current_s: 40, clipped: false };

test('F3 R-REVIEW-1 transport view clamps time and labels play state', () => {
  const view = reviewTransportView(base);
  assert.deepEqual([view.current_s, view.progress, view.valueText, view.playLabel, view.seekDisabled, view.barHidden],
    [40, '00:30 / 01:05', '00:30 of 01:05 recorded', 'Play', false, false]);
  assert.equal(reviewTransportView({ ...base, current_s: 500 }).current_s, 75);
  assert.equal(reviewTransportView({ ...base, current_s: Number.NaN }).current_s, 10);
  assert.equal(reviewTransportView({ ...base, end_s: 5 }).seekDisabled, true, 'reversed bounds collapse to a disabled seek');
  assert.equal(reviewTransportView({ ...base, playing: true }).playAria, 'Pause recorded flight');
  const inactive = reviewTransportView({ ...base, active: false, available: false });
  assert.deepEqual([inactive.barHidden, inactive.triggerDisabled, inactive.pressed], [true, true, false]);
  assert.equal(elapsedTime(-3), '00:00'); assert.equal(elapsedTime(3599.9), '59:59');
});

test('F3 seek snaps only floating-point-close endpoints', () => {
  const bounds = { start_s: 1, end_s: 2 };
  assert.equal(snapReviewTime(2 - Number.EPSILON, bounds), 2);
  assert.equal(snapReviewTime(1 + Number.EPSILON, bounds), 1);
  assert.equal(snapReviewTime(1.5, bounds), 1.5);
  assert.equal(snapReviewTime(9, bounds), 2);
  assert.equal(snapReviewTime(Number.NaN, bounds), null);
  assert.equal(snapReviewTime(1.5, null), null);
});

test('F3 Review keyboard suppression: transport keys stay separate from flight controls', () => {
  const scene = { editing: false, timeline: false, nativeButton: false };
  const timeline = { editing: true, timeline: true, nativeButton: false };
  assert.equal(reviewKeyAction('Space', scene, false), 'toggle-play');
  assert.equal(reviewKeyAction('Space', scene, true), 'swallow');
  assert.equal(reviewKeyAction('Space', timeline, false), 'toggle-play', 'timeline focus keeps Space playback');
  assert.equal(reviewKeyAction('Space', { ...scene, nativeButton: true }, false), 'ignore', 'native button activation is untouched');
  assert.equal(reviewKeyAction('KeyV', timeline, false), 'toggle-view');
  assert.equal(reviewKeyAction('KeyR', scene, false), 'exit');
  assert.equal(reviewKeyAction('KeyR', scene, true), 'swallow');
  assert.equal(reviewKeyAction('KeyR', { editing: true, timeline: false, nativeButton: false }, false), 'ignore');
  for (const code of ['ArrowUp', 'KeyQ', 'KeyW', 'KeyB', 'Digit5', 'KeyP', 'BracketRight', 'KeyE'])
    assert.equal(reviewKeyAction(code, scene, false), 'ignore', `${code} does not reach live controls in Review`);
});

 test('replay arrows seek with any widget focus, including repeated keys', () => {
  for (const editing of [false, true]) for (const timeline of [false, true]) for (const nativeButton of [false, true]) {
    for (const repeat of [false, true]) {
      const target = { editing, timeline, nativeButton };
      assert.equal(reviewKeyAction('ArrowLeft', target, repeat), 'seek-back');
      assert.equal(reviewKeyAction('ArrowRight', target, repeat), 'seek-forward');
    }
  }
});
