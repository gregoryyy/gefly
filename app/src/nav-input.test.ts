import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { obsDragDelta_deg, obsHoldStep_deg, stationCountText, stationRebuildDeferred, stepStandby_khz } from './nav-input.ts';

test('R-NAV-4 OBS hold-repeat tiers accelerate 1°, 3°, 5°', () => {
  assert.deepEqual([0, 999, 1000, 1999, 2000, 60000].map(obsHoldStep_deg), [1, 1, 3, 3, 5, 5]);
  assert.equal(obsHoldStep_deg(Number.NaN), 1);
});

test('R-NAV-4 OBS drag keeps the whole displacement modulo 360°', () => {
  assert.deepEqual(obsDragDelta_deg(100, 100 + 4 * 390, 0), { total_deg: 390, delta_deg: 30 });
  // The same 390° move delivered in steps sends the same net course change.
  let applied = 0, net = 0;
  for (const x of [140, 600, 1300, 1660]) { const drag = obsDragDelta_deg(100, x, applied)!; net += drag.delta_deg; applied = drag.total_deg; }
  assert.equal(applied, 390); assert.equal(((net % 360) + 360) % 360, 30);
  assert.deepEqual(obsDragDelta_deg(100, 97, 0), { total_deg: 0, delta_deg: 0 }, 'sub-step movement truncates toward zero');
  assert.deepEqual(obsDragDelta_deg(100, 60, 0), { total_deg: -10, delta_deg: -10 }, 'left decreases');
  assert.equal(obsDragDelta_deg(100, Number.NaN, 0), null);
  assert.equal(obsDragDelta_deg(0, 1e300, 0), null, 'non-safe totals are ignored');
});

test('standby − / + steps COM channel names and 50 kHz NAV channels within band', () => {
  assert.equal(stepStandby_khz('com', 118000, -1), 118000);
  assert.equal(stepStandby_khz('com', 118015, 1), 118025);
  assert.equal(stepStandby_khz('com', 118025, -1), 118015);
  assert.equal(stepStandby_khz('com', 121500, 1), 121505);
  assert.equal(stepStandby_khz('com', 136990, 1), 136990);
  assert.equal(stepStandby_khz('nav', 108000, -1), 108000);
  assert.equal(stepStandby_khz('nav', 110300, 1), 110350);
  assert.equal(stepStandby_khz('nav', 117950, 1), 117950);
});

test('F59 station rows are stable under focus, hover or a press; structural changes rebuild', () => {
  const base = { force: false, structuralChange: false, reviewing: false, sinceLastRender_ms: 5000, focusInside: false, pointerInside: false, pressActive: false };
  assert.equal(stationRebuildDeferred(base), false);
  assert.equal(stationRebuildDeferred({ ...base, sinceLastRender_ms: 400 }), true, 'live position updates are throttled to 1 s');
  for (const key of ['focusInside', 'pointerInside', 'pressActive'] as const) {
    assert.equal(stationRebuildDeferred({ ...base, [key]: true }), true, key);
    assert.equal(stationRebuildDeferred({ ...base, reviewing: true, [key]: true }), true, `${key} in Review`);
  }
  assert.equal(stationRebuildDeferred({ ...base, pointerInside: true, structuralChange: true }), false);
  assert.equal(stationRebuildDeferred({ ...base, pointerInside: true, force: true }), false);
  assert.equal(stationRebuildDeferred({ ...base, reviewing: true, sinceLastRender_ms: 0 }), false);
});

test('F60 live region announces only a concise count', () => {
  assert.equal(stationCountText(null), 'Station directory loading or unavailable.');
  assert.equal(stationCountText(0), 'No stations match these filters.');
  assert.equal(stationCountText(1), '1 station listed.');
  assert.equal(stationCountText(12), '12 stations listed.');
});
