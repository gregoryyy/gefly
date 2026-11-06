import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOfmOverlayPreferences, OFM_OVERLAY_PREFERENCES_KEY } from './ofm-overlay-preferences.ts';

test('R-CHART-1 overlay defaults off and restores both controls without storing location', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const preferences = createOfmOverlayPreferences(storage);
  assert.deepEqual(preferences.read(), { enabled: false, opacity: .8 });
  preferences.write({ enabled: true, opacity: .35 });
  assert.deepEqual(createOfmOverlayPreferences(storage).read(), { enabled: true, opacity: .35 });
  assert.deepEqual(JSON.parse(values.get(OFM_OVERLAY_PREFERENCES_KEY)!), { version: 1, enabled: true, opacity: .35 });
  preferences.write({ enabled: false, opacity: 0 });
  assert.deepEqual(preferences.read(), { enabled: false, opacity: 0 });
});

test('R-CHART-1 invalid, oversized or denied storage cannot enable external chart demand', () => {
  for (const raw of ['null', '[]', '{', '{}', '{"version":2,"enabled":true,"opacity":0.8}',
    '{"version":1,"enabled":1,"opacity":0.8}', '{"version":1,"enabled":true,"opacity":2}',
    '{"version":1,"enabled":true,"opacity":null}', '{"version":1,"enabled":true,"opacity":0.8,"lat":50}',
    ` ${JSON.stringify({ version: 1, enabled: true, opacity: .8 })}`.padEnd(129, ' ')]) {
    assert.deepEqual(createOfmOverlayPreferences({ getItem: () => raw, setItem() {} }).read(), { enabled: false, opacity: .8 });
  }
  const denied = createOfmOverlayPreferences({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.deepEqual(denied.read(), { enabled: false, opacity: .8 });
  assert.doesNotThrow(() => denied.write({ enabled: true, opacity: .5 }));
  assert.deepEqual(createOfmOverlayPreferences(null).read(), { enabled: false, opacity: .8 });
});
