import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { makeFlightMapNavigation } from './flight-map-navigation.ts';
import type { NavigationPackage, NavRecord } from '../../studies/e1-browser/sim/navigation.js';

const navRoot = new URL('../public/navdata/', import.meta.url);
// This pure regional map converter retains its bounded86-service fixture;
// the active receiver manifest independently selects the worldwide package.
const bytes = await readFile(new URL('rhein-main-v1.json', navRoot));
const sha256 = createHash('sha256').update(bytes).digest('hex');
const pkg: NavigationPackage = { ...JSON.parse(bytes.toString('utf8')), sha256 };

test('R-NAV-3/4 map preserves the real pinned inventory, frequency, coordinates and traceability', () => {
  const data = makeFlightMapNavigation(pkg);
  const stations = data.features.filter(feature => feature.properties.component === 'station');
  assert.equal(stations.length, 86);
  const frankfurt = stations.find(feature => feature.properties.identifier === 'FRD')!;
  assert.deepEqual(frankfurt.geometry.coordinates, [8.567053, 50.030467]);
  assert.equal(frankfurt.properties.frequency_mhz, '115.90');
  assert.equal(frankfurt.properties.equipment, 'DME');
  assert.deepEqual(frankfurt.properties.source_line_ids, [26237]);
  for (const feature of data.features) {
    assert.equal(feature.properties.edition, '2013.10');
    assert.equal(feature.properties.historical, true);
    assert.equal(feature.properties.source_sha256, sha256);
    assert.ok(feature.geometry.coordinates.every(Number.isFinite));
    assert.notEqual(feature.properties.station_uid, 'fictional-lab');
  }
  assert.deepEqual(makeFlightMapNavigation({ ...pkg, records: [...pkg.records].reverse() }), data);
});

test('ILS components retain their own positions while collocated equipment shares a station marker', () => {
  const record = pkg.records.find(record => record.kind === 'LOC' && record.gs && record.dme)!;
  const data = makeFlightMapNavigation({ ...pkg, records: [record] });
  const primary = data.features.find(feature => feature.properties.component === 'station')!;
  assert.equal(primary.properties.equipment, 'ILS/DME');
  assert.deepEqual(primary.geometry.coordinates, [record.lon_deg, record.lat_deg]);
  const gs = data.features.find(feature => feature.properties.component === 'GS')!;
  assert.deepEqual(gs.geometry.coordinates, [record.gs!.lon_deg, record.gs!.lat_deg]);
  const collocated: NavRecord = { ...record, dme: { ...record.dme!, lon_deg: record.lon_deg, lat_deg: record.lat_deg } };
  assert.equal(makeFlightMapNavigation({ ...pkg, records: [collocated] }).features.some(feature => feature.properties.component === 'DME'), false);
  const vor = pkg.records.find(record => record.kind === 'VOR' && !record.gs)!;
  assert.equal(makeFlightMapNavigation({ ...pkg, records: [{ ...vor, uid: 'fictional-lab' }] }).features.length, 0);
});

test('map rejects invalid geometry, identity and non-historical editions without partial success', () => {
  for (const change of [
    { edition: '2026.11' }, { historical: false }, { sha256: 'unverified' },
    { records: [...pkg.records, pkg.records[0]] },
    { records: [{ ...pkg.records[0], lon_deg: NaN }] },
    { records: [{ ...pkg.records[0], lat_deg: 91 }] },
    { records: [{ ...pkg.records[0], dme: { ...pkg.records[0].dme!, lon_deg: Infinity } }] },
  ]) assert.throws(() => makeFlightMapNavigation({ ...pkg, ...change } as NavigationPackage), RangeError);
});

test('map features are detached from package records and source-line arrays', () => {
  const data = makeFlightMapNavigation(pkg);
  const first = data.features[0];
  const source = pkg.records.find(record => record.uid === first.properties.station_uid)!;
  first.geometry.coordinates[0] = 0;
  first.properties.source_line_ids.push(999999);
  assert.notEqual(source.lon_deg, 0);
  assert.equal(source.source_line_ids.includes(999999), false);
});
