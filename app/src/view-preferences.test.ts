import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadViewPreferences, saveViewPreferences, VIEW_PREFERENCES_KEY, type ViewPreferences } from './view-preferences.ts';
const fallback = { vectorScenery: false, landmarkLevel: 0, mapColorScheme: 'original' };
const read = (raw: string | null) => ({ getItem(key: string) { assert.equal(key, VIEW_PREFERENCES_KEY); return raw; } });

test('R-WORLD-6/R-WORLD-7 view choices round-trip every terrain/label combination under one bounded versioned key', () => {
  for (const vectorScenery of [false, true]) for (const landmarkLevel of [0, 1, 2, 3] as const) for (const mapColorScheme of ['original', 'terrain'] as const) {
    let stored = '';
    saveViewPreferences({ vectorScenery, landmarkLevel, mapColorScheme }, { setItem(key, value) { assert.equal(key, VIEW_PREFERENCES_KEY); stored = value; } });
    assert(stored.length <= 256);
    assert.deepEqual(JSON.parse(stored), { version: 1, vectorScenery, landmarkLevel, mapColorScheme });
    assert.deepEqual(loadViewPreferences(read(stored)), { vectorScenery, landmarkLevel, mapColorScheme });
  }
});

test('R-WORLD-6/R-WORLD-7 missing, denied and malformed storage fails softly to independent defaults', () => {
  assert.deepEqual(loadViewPreferences(null), fallback);
  assert.deepEqual(loadViewPreferences({ getItem() { throw new DOMException('denied', 'SecurityError'); } }), fallback);
  for (const raw of [null, '', '{', 'null', '[]', 'false', '1', '"text"', ' '.repeat(257),
    '{"version":1,"vectorScenery":true,"landmarkLevel":3}' + ' '.repeat(256)])
    assert.deepEqual(loadViewPreferences(read(raw)), fallback);
  const mutable = loadViewPreferences(null); mutable.vectorScenery = true; mutable.landmarkLevel = 3;
  assert.deepEqual(loadViewPreferences(null), fallback, 'one caller cannot mutate later defaults');
});

test('R-WORLD-6/R-WORLD-7 stored schema rejects wrong versions, partial/extra fields and coercible choices', () => {
  const valid = { version: 1, vectorScenery: true, landmarkLevel: 3 };
  for (const patch of [{ version: 0 }, { version: 2 }, { version: '1' }, { version: null },
    { vectorScenery: 1 }, { vectorScenery: 'true' }, { vectorScenery: null },
    ...[-1, 4, .5, '3', null, true].map(landmarkLevel => ({ landmarkLevel })), { heading: 90 }, { extra: 1 }])
    assert.deepEqual(loadViewPreferences(read(JSON.stringify({ ...valid, ...patch }))), fallback);
  for (const key of Object.keys(valid)) {
    const partial: Record<string, unknown> = { ...valid }; delete partial[key];
    assert.deepEqual(loadViewPreferences(read(JSON.stringify(partial))), fallback);
  }
  assert.deepEqual(loadViewPreferences(read('{"version":1,"vectorScenery":true,"landmarkLevel":3,"__proto__":{}}')), fallback);
});

test('R-WORLD-6/R-WORLD-7 save copies only view choices without mutating input or leaking extra data', () => {
  const value = Object.freeze({ vectorScenery: true, landmarkLevel: 2 as const, throttle: .8, aircraft: 'private', lat_rad: .8 });
  const writes: [string, string][] = [];
  saveViewPreferences(value, { setItem: (key, stored) => writes.push([key, stored]) });
  assert.deepEqual(writes, [[VIEW_PREFERENCES_KEY, '{"version":1,"vectorScenery":true,"landmarkLevel":2,"mapColorScheme":"original"}']]);
  const restored = loadViewPreferences(read(writes[0][1])); restored.landmarkLevel = 0;
  assert.equal(value.landmarkLevel, 2);
  assert.doesNotThrow(() => saveViewPreferences(value, null));
  assert.doesNotThrow(() => saveViewPreferences(value, { setItem() { throw new DOMException('quota', 'QuotaExceededError'); } }));
});

test('R-WORLD-6/R-WORLD-7 invalid runtime save values and hostile getters cannot write or throw', () => {
  let writes = 0;
  const storage = { setItem() { writes++; } };
  for (const value of [null, [], {}, { vectorScenery: true }, { vectorScenery: 'true', landmarkLevel: 1 },
    ...[NaN, Infinity, -Infinity, -1, 4, .5, '1'].map(landmarkLevel => ({ vectorScenery: true, landmarkLevel })),
    Object.create({ vectorScenery: true, landmarkLevel: 1 }),
    { get vectorScenery() { throw Error('getter'); }, landmarkLevel: 1 }])
    assert.doesNotThrow(() => saveViewPreferences(value as ViewPreferences, storage));
  assert.equal(writes, 0);
});


test('R-WORLD-6/R-WORLD-7 save snapshots getter values once before schema validation and serialization', () => {
  let reads = 0, raw = '';
  const value = { get vectorScenery() { reads++; return reads === 1 ? true : 'changed'; }, landmarkLevel: 1 };
  saveViewPreferences(value as ViewPreferences, { setItem(_key, stored) { raw = stored; } });
  assert.equal(reads, 1);
  assert.deepEqual(JSON.parse(raw), { version: 1, vectorScenery: true, landmarkLevel: 1, mapColorScheme: 'original' });
});

test('R-WORLD-11 legacy view records and malformed optional color schemes use Original without discarding other valid choices', () => {
  const legacy = { version: 1, vectorScenery: true, landmarkLevel: 3 };
  assert.deepEqual(loadViewPreferences(read(JSON.stringify(legacy))), { vectorScenery: true, landmarkLevel: 3, mapColorScheme: 'original' });
  for (const mapColorScheme of ['', 'dark', 'TERRAIN', 0, false, null, {}, []]) {
    assert.deepEqual(loadViewPreferences(read(JSON.stringify({ ...legacy, mapColorScheme }))), { vectorScenery: true, landmarkLevel: 3, mapColorScheme: 'original' });
  }
  assert.deepEqual(loadViewPreferences(read(JSON.stringify({ ...legacy, mapColorScheme: 'terrain', throttle: .8 }))), fallback);
  assert.deepEqual(loadViewPreferences(read(JSON.stringify({ ...legacy, version: 2, mapColorScheme: 'terrain' }))), fallback);
});

test('R-WORLD-11 color preference writes canonical state once and rejects invalid runtime values or oversized UTF-8 input', () => {
  let reads = 0, stored = '', writes = 0;
  const storage = { setItem(_key: string, raw: string) { stored = raw; writes++; } };
  saveViewPreferences({ vectorScenery: true, landmarkLevel: 2, get mapColorScheme() { reads++; return reads === 1 ? 'terrain' : 'invalid'; } } as ViewPreferences, storage);
  assert.equal(reads, 1); assert.equal(writes, 1);
  assert.deepEqual(loadViewPreferences(read(stored)), { vectorScenery: true, landmarkLevel: 2, mapColorScheme: 'terrain' });
  for (const mapColorScheme of [null, false, 'dark', undefined]) {
    saveViewPreferences({ vectorScenery: false, landmarkLevel: 0, mapColorScheme } as ViewPreferences, storage);
  }
  assert.equal(writes, 1, 'invalid explicit runtime schemes do not replace the valid saved choice');
  const oversized = JSON.stringify({ version: 1, vectorScenery: true, landmarkLevel: 3, mapColorScheme: '界'.repeat(70) });
  assert(oversized.length < 256 && new TextEncoder().encode(oversized).length > 256);
  assert.deepEqual(loadViewPreferences(read(oversized)), fallback);
});
