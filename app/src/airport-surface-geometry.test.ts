import assert from 'node:assert/strict';
import test from 'node:test';
import { airportSurfaceGeometry } from './airport-surface-geometry.ts';
import type { AirportSurfaceFeature } from './airport-region.ts';

const runway = (coordinates: readonly (readonly [number, number])[]): AirportSurfaceFeature => ({ id: 'osm/way/1',
  kind: 'runway', version: 1, timestamp: '2026-11-05T10:00:00Z', surface: 'asphalt', ref: '09/27', width_m: 30,
  geometry: { type: 'LineString', coordinates } });
test('R-AIRPORT-3 dateline runway stays local and samples only normalized longitudes', () => {
  let calls = 0;
  const result = airportSurfaceGeometry(runway([[179.999, 0], [-179.999, 0]]), (lat, lon) => {
    calls++; assert(lon >= -Math.PI && lon < Math.PI); assert(Math.abs(lat) < .00001); return 120;
  }, 100);
  assert.equal(result.polygons.length, 9); assert.equal(calls, 36);
  assert(result.polygons.every(ring => ring.every(v => v.ellipsoid_m === 120.12)));
});
test('R-AIRPORT-3 long or over-budget ways are stopped before terrain sampling/allocation loops', () => {
  let calls = 0; const height = () => { calls++; return 0; };
  assert.equal(airportSurfaceGeometry(runway([[0, 0], [179, 0]]), height, 2000).unsupported, true);
  assert.equal(airportSurfaceGeometry(runway([[0, 0], [.05, 0]]), height, 10).truncated, true);
  assert.equal(calls, 0);
});
test('R-AIRPORT-3 partial receiver heights discard a whole feature rather than sea-level substitution', () => {
  let calls = 0;
  const result = airportSurfaceGeometry(runway([[0, 0], [.001, 0]]), () => ++calls > 5 ? null : 40, 100);
  assert.equal(result.deferred, true); assert.equal(result.polygons.length, 0);
  assert.equal(airportSurfaceGeometry(runway([[0, 0], [.001, 0]]), () => NaN, 100).deferred, true);
});
test('R-AIRPORT-3 source widths are used; missing width is a fixed illustrative visual default', () => {
  const withSource = airportSurfaceGeometry(runway([[0, 0], [.001, 0]]), () => 10, 100);
  const unknown = { ...runway([[0, 0], [.001, 0]]), width_m: undefined };
  const generic = airportSurfaceGeometry(unknown, () => 10, 100);
  const width = (r: typeof generic) => Math.abs(r.polygons[0][0].lat_rad - r.polygons[0][3].lat_rad) * 6371000;
  assert(Math.abs(width(withSource) - 30) < 1e-8); assert(Math.abs(width(generic) - 25) < 1e-8);
});
