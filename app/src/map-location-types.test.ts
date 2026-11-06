import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAP_LOCATION_TYPES, mapLocationType } from './map-location-types.ts';

test('R-WORLD-6: all seven published location categories have distinct filter identifiers', () => {
  assert.deepEqual(MAP_LOCATION_TYPES.map(([type]) => type),
    ['airfield', 'heliport', 'seaplane', 'balloonport', 'closed', 'nav', 'fix']);
  assert.equal(new Set(MAP_LOCATION_TYPES.map(([, label]) => label)).size, 7);
});

test('R-WORLD-6: source airport subtype controls its category instead of generic airport kind', () => {
  for (const [airport_type, expected] of [
    ['small_airport', 'airfield'], ['medium_airport', 'airfield'], ['large_airport', 'airfield'],
    ['HELiport', 'heliport'], ['helipad', 'heliport'], ['seaplane_base', 'seaplane'],
    ['balloonport', 'balloonport'], ['closed', 'closed'],
  ]) assert.equal(mapLocationType({ kind: 'airport', airport_type }), expected, airport_type);
});

test('R-NAV-5: historical fixes and custom waypoints use the same Fixes category', () => {
  assert.equal(mapLocationType({ kind: 'fix' }), 'fix');
  assert.equal(mapLocationType({ kind: 'WAYPOINT' }), 'fix');
  for (const kind of ['VOR', 'NDB', 'ILS', 'LOC', 'TACAN', 'antenna'])
    assert.equal(mapLocationType({ kind }), 'nav', kind);
  assert.equal(mapLocationType({ kind: 'airfield' }), 'airfield');
});
