import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS_PREFERENCES, loadSettingsPreferences, saveSettingsPreferences,
  SETTINGS_PREFERENCES_KEY, SETTINGS_PREFERENCES_MAX_BYTES, type SettingsPreferences } from './settings-preferences.ts';

function storage(initial: string | null = null) {
  let raw = initial;
  return { getItem(key: string) { assert.equal(key, SETTINGS_PREFERENCES_KEY); return raw; },
    setItem(key: string, value: string) { assert.equal(key, SETTINGS_PREFERENCES_KEY); raw = value; },
    get raw() { return raw; } };
}
const defaults = (): SettingsPreferences => structuredClone(DEFAULT_SETTINGS_PREFERENCES);

test('R-UX-2/R-INPUT-1 Options choices round-trip exact boundaries and false/zero without view or flight state', () => {
  for (const gain of [0.25, 0.5, 1, 1.5]) for (const enabled of [false, true]) {
    const store = storage();
    const selected: SettingsPreferences = { controls: { pitch: gain, roll: gain, rudder: gain, brake: enabled ? 1 : 0,
      coordinatedRudder: enabled, centeredTouchpad: enabled, practicePapi: enabled }, rollOffset: enabled ? 0.25 : -0.25,
      volume: enabled ? 1 : 0, muted: enabled };
    assert.equal(saveSettingsPreferences(selected, store), true);
    assert.deepEqual(loadSettingsPreferences(store), selected);
    assert(new TextEncoder().encode(store.raw!).byteLength <= SETTINGS_PREFERENCES_MAX_BYTES);
    const serialized = JSON.parse(store.raw!);
    assert.equal(serialized.version, 1);
    assert.deepEqual(Object.keys(serialized).sort(), ['version', 'controls', 'rollOffset', 'volume', 'muted'].sort());
    assert.equal(Object.hasOwn(serialized.controls, 'vectorScenery'), false);
  }
});

test('R-UX-2/R-INPUT-1 missing, corrupt, denied or oversized preferences return independent current defaults', () => {
  assert.deepEqual(loadSettingsPreferences(null), defaults());
  assert.deepEqual(loadSettingsPreferences({ getItem() { throw new DOMException('denied', 'SecurityError'); } }), defaults());
  for (const raw of [null, '', '{', 'null', '[]', 'true', '1', '"text"', ' '.repeat(SETTINGS_PREFERENCES_MAX_BYTES + 1)]) {
    const store = storage(raw); assert.deepEqual(loadSettingsPreferences(store), defaults()); assert.equal(store.raw, raw);
  }
  const a = loadSettingsPreferences(null); a.controls.pitch = 0.25; a.muted = false;
  assert.deepEqual(loadSettingsPreferences(null), defaults());
});

test('R-UX-2/R-INPUT-1 preference schema rejects partial, coercible, future and flight-state records', () => {
  const complete = { version: 1, ...defaults() };
  for (const patch of [{ version: 2 }, { version: '1' }, { version: null }, { controls: null }, { controls: [] },
    { muted: 0 }, { muted: 'false' }, { volume: null }, { volume: '0' }, { rollOffset: true },
    { throttle: 1 }, { ap: true }, { elevator: 1 }, { aileron: 1 }, { brake_norm: 1 },
    { pitch_trim_norm: 1 }, { flap_norm: 1 }, { engine_running: true }, { location: {} }, { recordings: [] }, { vectorScenery: true }]) {
    assert.deepEqual(loadSettingsPreferences(storage(JSON.stringify({ ...complete, ...patch }))), defaults());
  }
  for (const key of ['version', 'controls', 'rollOffset', 'volume', 'muted']) {
    const value = { ...complete } as Record<string, unknown>; delete value[key];
    assert.deepEqual(loadSettingsPreferences(storage(JSON.stringify(value))), defaults());
  }
  for (const key of Object.keys(complete.controls)) {
    const controls = { ...complete.controls } as Record<string, unknown>; delete controls[key];
    assert.deepEqual(loadSettingsPreferences(storage(JSON.stringify({ ...complete, controls }))), defaults());
  }
});

test('R-UX-2/R-INPUT-1 invalid live values cannot replace an already saved choice', () => {
  const store = storage(); const selected = defaults(); selected.volume = 0; selected.controls.brake = 0; selected.muted = false;
  assert(saveSettingsPreferences(selected, store)); const before = store.raw;
  for (const field of ['pitch', 'roll', 'rudder']) for (const value of [0.249, 1.501, NaN, Infinity, '1', null]) {
    const bad = defaults() as any; bad.controls[field] = value;
    assert.equal(saveSettingsPreferences(bad, store), false); assert.equal(store.raw, before);
  }
  for (const [field, values] of [['volume', [-0.001, 1.001, NaN]], ['rollOffset', [-0.251, 0.251, Infinity]]] as const) {
    for (const value of values) { const bad = defaults() as any; bad[field] = value; assert.equal(saveSettingsPreferences(bad, store), false); }
  }
  for (const value of [-0.001, 1.001, NaN, false]) {
    const bad = defaults() as any; bad.controls.brake = value; assert.equal(saveSettingsPreferences(bad, store), false);
  }
  const badToggle = defaults() as any; badToggle.controls.centeredTouchpad = 0; assert.equal(saveSettingsPreferences(badToggle, store), false);
  assert.equal(store.raw, before);
});

test('R-UX-2/R-INPUT-1 denied or quota-limited writes do not break usable in-memory settings', () => {
  const selected = defaults(); selected.controls.brake = 0; selected.volume = 0;
  assert.equal(saveSettingsPreferences(selected, null), false);
  assert.equal(saveSettingsPreferences(selected, { setItem() { throw new DOMException('quota', 'QuotaExceededError'); } }), false);
  assert.equal(selected.controls.brake, 0); assert.equal(selected.volume, 0);
});

test('R-UX-2/R-INPUT-1 saved and loaded snapshots remain detached from later previews', () => {
  const store = storage(), opening = defaults();
  assert(saveSettingsPreferences(opening, store)); const baseline = store.raw;
  const preview = loadSettingsPreferences(store); preview.controls.pitch = 0.25; preview.volume = 0;
  assert.equal(store.raw, baseline, 'preview does not write automatically');
  assert.deepEqual(loadSettingsPreferences(store), opening, 'reload still reads committed choices');
  assert(saveSettingsPreferences(preview, store)); const committed = structuredClone(preview);
  preview.controls.roll = 0.5; preview.muted = false;
  assert.deepEqual(loadSettingsPreferences(store), committed);
});

test('R-UX-2/R-INPUT-1 live getter values are captured once and the exact stored snapshot is validated', () => {
  const store = storage(), value = defaults(); let gainReads = 0, controlReads = 0;
  const controls = value.controls;
  Object.defineProperty(controls, 'pitch', { enumerable: true, get() { gainReads++; return gainReads === 1 ? 0.5 : 100; } });
  Object.defineProperty(value, 'controls', { enumerable: true, get() { controlReads++; return controlReads === 1 ? controls : null; } });
  assert.equal(saveSettingsPreferences(value, store), true);
  assert.equal(gainReads, 1); assert.equal(controlReads, 1);
  assert.equal(loadSettingsPreferences(store).controls.pitch, 0.5);
  const previous = store.raw;
  const invalid = defaults(); Object.defineProperty(invalid, 'volume', { enumerable: true, get() { return NaN; } });
  assert.equal(saveSettingsPreferences(invalid, store), false); assert.equal(store.raw, previous);
  const extra = defaults() as any; extra.throttle = 1;
  assert.equal(saveSettingsPreferences(extra, store), false); assert.equal(store.raw, previous, 'capture cannot strip and accept forbidden fields');
});
