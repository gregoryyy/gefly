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
