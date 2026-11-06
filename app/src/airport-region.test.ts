import assert from 'node:assert/strict';
import { test } from 'node:test';
import { airportRegionAt, airportRegionBounds, airportRegionId, airportRegionUrl,
  validateAirportRegion, AIRPORT_REGION_ENDPOINT, airportSurfaceDistance_m } from './airport-region.ts';

const key = airportRegionAt(18.6, -33.96)!;
function pack() {
  return { version: 1, ...key, id: airportRegionId(key), bounds: airportRegionBounds(key),
    generated_at: '2026-11-06T07:00:00Z', rejected: 0,
    source: { endpoint: AIRPORT_REGION_ENDPOINT, osm_base: '2026-11-05T06:00:00Z', sha256: 'a'.repeat(64) },
    features: [{ id: 'osm/way/123', kind: 'runway', version: 4, timestamp: '2026-01-01T00:00:00Z',
      surface: 'asphalt', ref: '01/19', width_m: 60,
      geometry: { type: 'LineString', coordinates: [[18.600, -33.970], [18.610, -33.940]] } }] };
}
test('R-AIRPORT-3 half-degree cells cover hemispheres and wrap at the dateline without regional bounds', () => {
  assert.deepEqual(key, { x: 397, y: 112 });
  assert.deepEqual(airportRegionBounds(key), [18.5, -34, 19, -33.5]);
  assert.equal(airportRegionUrl(key), '/scenery/airports/v1/397/112.json');
  assert.deepEqual(airportRegionAt(180, 0), airportRegionAt(-180, 0));
  assert(airportRegionAt(-122.4, 37.6)); assert(airportRegionAt(-.1, 51.5));
  for (const [lon, lat] of [[181, 0], [0, 89.5], [NaN, 0], [0, Infinity]]) assert.equal(airportRegionAt(lon, lat), null);
  assert.throws(() => airportRegionBounds({ x: 720, y: 0 }));
});
test('R-AIRPORT-3 validated region is detached and immutable, with exact source identity', () => {
  const raw = pack(), value = validateAirportRegion(raw, key);
  raw.features[0].geometry.coordinates[0][0] = 99;
  assert.equal((value.features[0].geometry.coordinates[0] as readonly number[])[0], 18.6);
  assert(Object.isFrozen(value.features[0].geometry.coordinates));
  assert.throws(() => validateAirportRegion(pack(), { x: 398, y: 112 }));
  assert.equal(value.source.osm_base, '2026-11-05T06:00:00Z');
});
test('R-AIRPORT-3 malformed provenance, mapper identities and unsupported geometry cannot enter a cache', () => {
  for (const alter of [
    (v: any) => { v.source.endpoint = 'http://localhost/private'; },
    (v: any) => { v.features[0].user = 'mapper'; },
    (v: any) => { v.features[0].timestamp = '2026-02-30T00:00:00Z'; },
    (v: any) => { v.features[0].version = 0; },
    (v: any) => { v.features[0].kind = 'apron'; },
    (v: any) => { v.features[0].width_m = -1; },
    (v: any) => { v.features.push(v.features[0]); },
    (v: any) => { v.features[0].geometry.coordinates[0][0] = NaN; },
  ]) { const value = pack(); alter(value); assert.throws(() => validateAirportRegion(value)); }
});
test('R-AIRPORT-3 long segments and distant geometry fail before rendering work is allocated', () => {
  const long = pack(); long.features[0].geometry.coordinates[1] = [18.6, -33.7];
  assert.throws(() => validateAirportRegion(long));
  const distant = pack(); distant.features[0].geometry.coordinates = [[8.6, 49.9], [8.61, 49.91]];
  assert.throws(() => validateAirportRegion(distant));
  const empty = pack(); empty.features = []; assert.equal(validateAirportRegion(empty).features.length, 0);
});
test('R-AIRPORT-3 dateline surface distance stays local, preserving complete source ways', () => {
  const k = airportRegionAt(179.99, 10.1)!;
  const value = pack(); Object.assign(value, k, { id: airportRegionId(k), bounds: airportRegionBounds(k) });
  value.features[0].geometry.coordinates = [[179.999, 10.1], [-179.999, 10.1]];
  assert(airportSurfaceDistance_m(value.features[0].geometry.coordinates[0], value.features[0].geometry.coordinates[1]) < 250);
  assert.equal(validateAirportRegion(value).features.length, 1);
});
