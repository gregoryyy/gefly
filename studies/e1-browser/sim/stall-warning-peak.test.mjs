import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStallWarningPeak } from './stall-warning-peak.js';

// Exact genuine values from the existing JSBSim WASM weak-power climb, recorded
// by the read-only per-step observer. Before-worker artifact SHA-256 is pinned
// in the diagnostic packet; no positive warning state is manufactured here.
const nativePulse = new Map([
  [1348, .0005197205983131781], [1349, .0011857534313863827], [1350, .001685800942691218],
  [1351, .0020190989966684114], [1352, .002184903303876773], [1353, .0021824900287326088],
  [1354, .002011156404152503], [1355, .001670221352269019], [1356, .0011590261094140963],
  [1357, .0004769348541733276],
]);

test('R-ALERT-1: real 83 ms native climb pulse survives a 10× publication interval that latest-only loses', () => {
  const peak = createStallWarningPeak();
  for (let step = 1341; step <= 1360; step++) peak.observe(step, nativePulse.get(step) ?? 0, 0, 0);
  assert.equal(nativePulse.get(1360) ?? 0, 0, 'old latest-only snapshot is clear');
  assert.deepEqual(peak.fields(1360, 0, 0, 0), { stall_warning_peak_norm: nativePulse.get(1352), stall_warning_peak_step: 1352 });
  peak.clear();
  assert.deepEqual(peak.fields(1360, 0, 0, 0), {}, 'successful publication drains the event');
});

test('highest genuine value is uncapped, tagged at its exact step, with earliest ties', () => {
  const peak = createStallWarningPeak();
  peak.observe(1, .2, 0, 0); peak.observe(2, 1.5, 0, 0); peak.observe(3, 1.5, 0, 0); peak.observe(4, 0, 0, 0);
  assert.deepEqual(peak.fields(4, 0, 0, 0), { stall_warning_peak_norm: 1.5, stall_warning_peak_step: 2 });
});

test('ground, structure/proxy contact and missing or invalid native groups discard pending events', () => {
  for (const sample of [[1, 1, 0], [1, 0, 1], [1, 0, 64], [undefined, 0, 0], [NaN, 0, 0], [-1, 0, 0], [1, undefined, 0], [1, 0, undefined], [1, 0, 128]]) {
    const peak = createStallWarningPeak(); peak.observe(1, .2, 0, 0); peak.observe(2, ...sample);
    assert.deepEqual(peak.fields(2, 0, 0, 0), {});
  }
});

test('publication validates current telemetry/contact and cannot later resurrect a rejected peak', () => {
  for (const sample of [[undefined, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, undefined]]) {
    const peak = createStallWarningPeak(); peak.observe(2, .2, 0, 0);
    assert.deepEqual(peak.fields(3, ...sample), {});
    assert.deepEqual(peak.fields(3, 0, 0, 0), {});
  }
});

test('pause/reset/generation lifecycle clear and backward or repeated observations do not replay events', () => {
  const peak = createStallWarningPeak(); peak.observe(5, .2, 0, 0); peak.clear();
  assert.deepEqual(peak.fields(5, 0, 0, 0), {});
  peak.observe(1, .3, 0, 0); peak.observe(1, .3, 0, 0);
  assert.deepEqual(peak.fields(1, 0, 0, 0), {});
  peak.observe(5, .2, 0, 0); peak.observe(4, .2, 0, 0);
  assert.deepEqual(peak.fields(5, 0, 0, 0), {});
});

test('a rate rebase can publish an existing step-tagged peak without retiming it', () => {
  const peak = createStallWarningPeak(); peak.observe(10, .1, 0, 0);
  assert.deepEqual(peak.fields(10, 0, 0, 0), { stall_warning_peak_norm: .1, stall_warning_peak_step: 10 });
  peak.clear(); peak.observe(11, 0, 0, 0); assert.deepEqual(peak.fields(11, 0, 0, 0), {});
});
