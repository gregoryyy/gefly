import assert from 'node:assert/strict';
import { test } from 'node:test';
import { airportRegionQuery, compileAirportRegion } from './airport-generator.ts';
import { AIRPORT_REGION_LIMITS, airportRegionAt } from './src/airport-region.ts';

const time = '2026-11-06T08:00:00Z', hash = 'a'.repeat(64), key = airportRegionAt(8.6, 50)!;
const way = (id: number, aeroway: string, geometry = [{ lon: 8.6, lat: 50.05 }, { lon: 8.61, lat: 50.06 }]) =>
  ({ type: 'way', id, version: 3, timestamp: '2026-07-28T12:00:00Z', user: 'PRIVATE_MAPPER', uid: 54321, changeset: 67890,
    tags: { aeroway, width: '22 m', surface: 'asphalt', ref: '08/26', name: 'PRIVATE_NAME', operator: 'PRIVATE_OPERATOR' }, geometry });
const source = (elements: unknown[]) => ({ elements, osm3s: { timestamp_osm_base: time }, generator: 'fixture' });

test('R-AIRPORT-3 compiles actual line/area coordinates and source widths while stripping mapper/private fields', () => {
  const polygon = [{ lon: 8.61, lat: 50.06 }, { lon: 8.611, lat: 50.06 }, { lon: 8.611, lat: 50.061 }, { lon: 8.61, lat: 50.06 }];
  const result = compileAirportRegion(source([way(20, 'runway'), way(10, 'taxiway'), way(30, 'apron', polygon)]), key, hash, time);
  assert.equal(result.features.length, 3); assert.equal(result.rejected, 0);
  assert.deepEqual(result.features.map(f => f.id), ['osm/way/10', 'osm/way/20', 'osm/way/30']);
  assert.deepEqual(result.features[1].geometry, { type: 'LineString', coordinates: [[8.6, 50.05], [8.61, 50.06]] });
  assert.equal(result.features[2].geometry.type, 'Polygon'); assert.equal(result.features[0].width_m, 22);
  assert.equal(result.features[0].version, 3); assert.equal(result.features[0].timestamp, '2026-07-28T12:00:00Z');
  assert.equal(result.source.sha256, hash); assert.equal(result.source.osm_base, time);
  assert(!/PRIVATE_|54321|67890|changeset|operator|"user"/.test(JSON.stringify(result)));
  assert(Object.isFrozen(result)); assert(Object.isFrozen(result.features[0].geometry.coordinates));
});

test('R-AIRPORT-3 valid empty source is distinct from failed/incomplete source; unsupported geometry stays missing', () => {
  assert.equal(compileAirportRegion(source([]), key, hash, time).features.length, 0);
  for (const raw of [null, {}, { ...source([]), remark: 'timed out' }, { elements: [] },
    { ...source([]), osm3s: { timestamp_osm_base: '2026-02-31T00:00:00Z' } }]) {
    assert.throws(() => compileAirportRegion(raw, key, hash, time), /invalid|Incomplete/);
  }
  const relation = { ...way(1, 'runway'), type: 'relation' };
  const openApron = way(2, 'apron'), outside = way(3, 'runway', [{ lon: -100, lat: 40 }, { lon: -99.999, lat: 40.001 }]);
  const malformed = { ...way(4, 'runway'), version: undefined };
  const result = compileAirportRegion(source([relation, openApron, outside, malformed]), key, hash, time);
  assert.equal(result.features.length, 0); assert.equal(result.rejected, 4);
});

test('R-AIRPORT-3 malformed widths are not invented and invalid geometry never reaches a renderer', () => {
  for (const width of ['30 ft', '9 m garbage', '-4', '201', 'NaN']) {
    const element = way(1, 'runway'); element.tags.width = width;
    const result = compileAirportRegion(source([element]), key, hash, time);
    assert.equal(result.features[0].width_m, undefined);
  }
  for (const geometry of [[{ lon: Infinity, lat: 50 }, { lon: 8.6, lat: 50.1 }],
    [{ lon: 8.6, lat: 50 }, { lon: 8.9, lat: 50 }],
    [{ lon: 8.6, lat: 89.6 }, { lon: 8.61, lat: 89.6 }]]) {
    assert.equal(compileAirportRegion(source([way(1, 'runway', geometry)]), key, hash, time).rejected, 1);
  }
});

test('R-AIRPORT-3 antimeridian runway keeps its actual short geometry rather than an around-world strip', () => {
  const result = compileAirportRegion(source([way(1, 'runway', [{ lon: 179.999, lat: 10.01 }, { lon: -179.999, lat: 10.01 }])]),
    airportRegionAt(179.999, 10.01)!, hash, time);
  assert.equal(result.features.length, 1); assert.equal(result.features[0].geometry.coordinates.length, 2);
});

test('R-AIRPORT-3 duplicate source identities and package-wide budgets reject instead of silently truncating', () => {
  assert.throws(() => compileAirportRegion(source([way(1, 'runway'), way(1, 'runway')]), key, hash, time), /Duplicate/);
  const excessive = Array.from({ length: AIRPORT_REGION_LIMITS.maxFeatures + 1 }, (_, i) => way(i + 1, 'runway'));
  assert.throws(() => compileAirportRegion(source(excessive), key, hash, time), /budget/);
  assert.throws(() => compileAirportRegion(source([]), key, 'invalid', time), /invalid/);
  assert.throws(() => compileAirportRegion(source([]), key, hash, 'not a date'), /invalid/);
});

test('R-AIRPORT-3 query permits only canonical geographic cells and the fixed surface selector', () => {
  assert.equal(airportRegionQuery({ x: 397, y: 112 }), '[out:json][timeout:25][maxsize:8388608];way["aeroway"~"^(runway|taxiway|apron)$"](-34,18.5,-33.5,19);out meta geom;');
  for (const k of [{ x: -1, y: 0 }, { x: 720, y: 0 }, { x: 0, y: 360 }, { x: .5, y: 0 }]) assert.throws(() => airportRegionQuery(k));
});


test('R-AIRPORT-3 explicit non-area runway remains a source line even when its path closes', () => {
 const closed=way(1,'runway',[{lon:8.6,lat:50.05},{lon:8.601,lat:50.05},{lon:8.601,lat:50.051},{lon:8.6,lat:50.05}]);
 const raw={...closed,tags:{...closed.tags,area:'no'}};
 assert.equal(compileAirportRegion(source([raw]),key,hash,time).features[0].geometry.type,'LineString');
});
