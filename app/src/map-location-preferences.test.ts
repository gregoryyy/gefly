import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAP_LOCATION_TYPES, type MapLocationType } from './map-location-types.ts';
import { loadMapLocationPreferences, MAP_LOCATION_PREFERENCES_KEY, saveMapLocationPreferences } from './map-location-preferences.ts';

const defaults = (): MapLocationType[] => MAP_LOCATION_TYPES.map(([type]) => type);
function storage(initial: string | null = null) {
  let raw = initial, writes = 0;
  return { getItem(key: string) { assert.equal(key, MAP_LOCATION_PREFERENCES_KEY); return raw; },
    setItem(key: string, value: string) { assert.equal(key, MAP_LOCATION_PREFERENCES_KEY); raw = value; writes++; },
    get raw() { return raw; }, get writes() { return writes; } };
}

test('R-WORLD-6 location filters preserve all-off and canonical mixed selections across reload', () => {
  for (const selected of [[], ['fix', 'heliport', 'airfield'], defaults().reverse()] as MapLocationType[][]) {
    const store = storage(), before = [...selected];
    assert.equal(saveMapLocationPreferences(selected, store), true);
    const expected = defaults().filter(type => selected.includes(type));
    assert.deepEqual(JSON.parse(store.raw!), { version: 1, types: expected });
    assert.deepEqual(loadMapLocationPreferences(store), expected);
    assert.deepEqual(selected, before, 'saving does not reorder the caller array');
    assert(new TextEncoder().encode(store.raw!).byteLength <= 512);
    selected.push('nav');
    assert.deepEqual(loadMapLocationPreferences(store), expected, 'storage is a detached snapshot');
  }
});

test('R-WORLD-6 missing or unusable location preferences return detached defaults without rewriting', () => {
  for (const raw of [null, '', '{', 'null', '[]', 'true', '1', '"text"', ' '.repeat(513)]) {
    const store = storage(raw);
    assert.deepEqual(loadMapLocationPreferences(store), defaults());
    assert.equal(store.raw, raw); assert.equal(store.writes, 0);
  }
  assert.deepEqual(loadMapLocationPreferences(null), defaults());
  assert.deepEqual(loadMapLocationPreferences({ getItem() { throw new Error('denied'); } }), defaults());
  const selected = loadMapLocationPreferences(null); selected.length = 0;
  assert.deepEqual(loadMapLocationPreferences(null), defaults());
  const stored = storage('{"version":1,"types":["fix"]}');
  loadMapLocationPreferences(stored).push('nav');
  assert.deepEqual(loadMapLocationPreferences(stored), ['fix']);
});

test('R-WORLD-6 strict records reject unknown, duplicate, coercible and future location filters', () => {
  const records: unknown[] = [
    {}, { version: 1 }, { types: [] }, { version: 2, types: [] }, { version: '1', types: [] },
    { version: 1, types: 'fix' }, { version: 1, types: null }, { version: 1, types: {} },
    { version: 1, types: ['unknown'] }, { version: 1, types: ['fix', 'fix'] },
    { version: 1, types: ['FIX'] }, { version: 1, types: [' fix'] }, { version: 1, types: [0] },
    { version: 1, types: [false] }, { version: 1, types: [null] }, { version: 1, types: [['fix']] },
    { version: 1, types: [...defaults(), 'fix'] },
  ];
  for (const record of records) {
    const store = storage(JSON.stringify(record));
    assert.deepEqual(loadMapLocationPreferences(store), defaults(), JSON.stringify(record));
    assert.equal(store.writes, 0);
  }
});

test('R-WORLD-6 location storage excludes query, coordinate, plan, GPS and native fields', () => {
  for (const field of ['query', 'coordinates', 'latitude', 'longitude', 'gpsFixes', 'flightPlan', 'selectedPoint',
    'throttle', 'ap', 'nav1', 'recordings', '__proto__']) {
    const record = { version: 1, types: [] as MapLocationType[], [field]: {} };
    const store = storage(JSON.stringify(record));
    assert.deepEqual(loadMapLocationPreferences(store), defaults(), field);
    assert.equal(store.writes, 0);
  }
});

test('R-WORLD-6 raw preference limit counts UTF-8 bytes before parsing', () => {
  const base = '{"version":1,"types":[]}';
  const exact = base + ' '.repeat(512 - base.length);
  assert.deepEqual(loadMapLocationPreferences(storage(exact)), []);
  assert.deepEqual(loadMapLocationPreferences(storage(exact + ' ')), defaults());
  const multibyte = JSON.stringify({ version: 1, types: [], extra: '界'.repeat(180) });
  assert(multibyte.length < 512); assert(new TextEncoder().encode(multibyte).byteLength > 512);
  assert.deepEqual(loadMapLocationPreferences(storage(multibyte)), defaults());
});

test('R-WORLD-6 invalid live filters and denied writes preserve the saved record', () => {
  const store = storage(); assert(saveMapLocationPreferences(['fix'], store));
  const before = store.raw;
  for (const invalid of [null, undefined, 'fix', {}, new Set(['fix']), ['unknown'], ['fix', 'fix'], [true],
    [new String('fix')], Array(1), [...defaults(), 'fix']]) {
    assert.equal(saveMapLocationPreferences(invalid as any, store), false);
    assert.equal(store.raw, before);
  }
  assert.equal(saveMapLocationPreferences([], null), false);
  assert.equal(saveMapLocationPreferences([], { setItem() { throw new DOMException('quota', 'QuotaExceededError'); } }), false);
  assert.equal(saveMapLocationPreferences([], { setItem() { throw new DOMException('denied', 'SecurityError'); } }), false);
});

test('R-WORLD-6 save validates the exact single-read getter snapshot', () => {
  let reads = 0;
  const types: MapLocationType[] = ['fix'];
  Object.defineProperty(types, 0, { get() { reads++; return reads === 1 ? 'fix' : 'unknown'; } });
  const store = storage();
  assert.equal(saveMapLocationPreferences(types, store), true);
  assert.equal(reads, 1); assert.deepEqual(loadMapLocationPreferences(store), ['fix']);
  const before = store.raw;
  Object.defineProperty(types, 0, { get() { throw new Error('broken getter'); } });
  assert.equal(saveMapLocationPreferences(types, store), false); assert.equal(store.raw, before);
  const duplicates: MapLocationType[] = ['fix', 'nav'];
  Object.defineProperty(duplicates, 1, { get() { return 'fix'; } });
  assert.equal(saveMapLocationPreferences(duplicates, store), false); assert.equal(store.raw, before);
});
