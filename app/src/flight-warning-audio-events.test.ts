import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlightWarningAudioEvents, type FlightWarningAudioFrame } from './flight-warning-audio-events.ts';

const frame = (step = 0, kapEngaged: 0 | 1 | null = 1): FlightWarningAudioFrame => ({
  step, time_s: step / 120, kapEngaged, live: true,
  warnings: { stall: 'clear', terrain: 'clear', terrainClearance_m: null, terrainClosure_mps: null, terrainTime_s: null },
});

test('R-ALERT-1 disconnect sounds exactly once for actual edges, including same-frame commands', () => {
  const events = createFlightWarningAudioEvents();
  assert.equal(events.update(frame(0, 0), true).disconnected, false);
  assert.equal(events.update(frame(1, 1), true).disconnected, false);
  assert.equal(events.update(frame(2, 0), true).disconnected, true);
  assert.equal(events.update(frame(2, 0), true).disconnected, false);
  assert.equal(events.update(frame(2, 1), true).disconnected, false);
  assert.equal(events.update(frame(2, 0), true).disconnected, true);
});

test('suppression, unavailable telemetry, seek, reset and long gaps never replay an AP disconnect', () => {
  for (const interruption of [undefined, { ...frame(1), live: false }, { ...frame(1), step: NaN },
    { ...frame(1), time_s: Infinity }, { ...frame(1), step: -1 }]) {
    const events = createFlightWarningAudioEvents();
    events.update(frame(0), true); events.update(interruption, true);
    assert.equal(events.update(frame(2, 0), true).disconnected, false);
  }
  for (const interrupted of [frame(0, 0), frame(200, 0), { ...frame(2, 0), time_s: 0 }]) {
    const events = createFlightWarningAudioEvents();
    events.update(frame(1), true);
    assert.equal(events.update(interrupted, true).disconnected, false);
  }
  const events = createFlightWarningAudioEvents();
  events.update(frame(), true); events.update(frame(1), false);
  assert.equal(events.update(frame(2, 0), true).disconnected, false, 'unmute/resume establishes baseline');
  events.update(frame(3, null), true);
  assert.equal(events.update(frame(4, 0), true).disconnected, false);
});

test('active warnings follow the selected live state and clear immediately on suppression or unavailable signals', () => {
  const events = createFlightWarningAudioEvents(), active = frame();
  active.warnings = { ...active.warnings, stall: 'active', terrain: 'active' };
  assert.deepEqual(events.update(active, true), { stall: true, terrain: true, disconnected: false, continuous: false });
  assert.deepEqual(events.update(active, false), { stall: false, terrain: false, disconnected: false, continuous: false });
  assert.equal(events.update({ ...active, live: false }, true).stall, false);
  assert.equal(events.update(frame(1), true).terrain, false);
});

test('R-ALERT-1 retained recent-only episode cannot start on unlock/unmute/resume or repeat a suppressed remainder', () => {
  const active = frame(10); active.warnings = { ...active.warnings, stall: 'active', stallRecent: true };
  for (const suppressed of [undefined, false, true]) {
    const events = createFlightWarningAudioEvents();
    if (suppressed !== undefined) events.update(frame(9), suppressed);
    if (suppressed === true) events.update(active, false);
    assert.equal(events.update(active, true).stall, false);
    assert.equal(events.update(active, true).stall, false, 'same-frame remainder stays suppressed');
    assert.equal(events.update({ ...active, step: 11, time_s: 11 / 120 }, true).stall, false, 'new raw-clear frame does not replay the retained episode');
    events.update(frame(12), true);
    assert.equal(events.update({ ...active, step: 13, time_s: 13 / 120 }, true).stall, true, 'an observed clear followed by a new event is audible');
  }
});

test('a genuine current raw positive sounds on enable, and a fresh recent event during already audible flight sounds', () => {
  const raw = frame(1); raw.warnings = { ...raw.warnings, stall: 'active' };
  const recent = frame(2); recent.warnings = { ...recent.warnings, stall: 'active', stallRecent: true };
  const events = createFlightWarningAudioEvents();
  assert.equal(events.update(raw, true).stall, true);
  assert.equal(events.update(recent, true).stall, true, 'current episode minimum continues');
  events.update(recent, false);
  assert.equal(events.update(raw, true).stall, true, 'rawactive is not mistaken for a stale event');
  events.update(frame(3), true);
  assert.equal(events.update({ ...recent, step: 4, time_s: 4 / 120 }, true).stall, true);
});
