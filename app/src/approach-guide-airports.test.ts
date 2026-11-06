import assert from 'node:assert/strict';
import { test } from 'node:test';
import { airportApproachGuides } from './approach-guide-airports.ts';
import type { Airport } from './airport-catalogue.ts';
import type { WorldRunway } from './world-airport-contract.ts';

const airport: Airport = { id: 'a', name: 'Test', type: 'small_airport', icao: 'TEST', local: '', lat: 50, lon: 8, elevation_ft: 300, iso_region: 'DE-HE' };
const runway: WorldRunway = { id: 'r', source_id: '1', airport_id: 'a', length_ft: 12000, width_ft: 100, surface: 'ASP', lighted: true, closed: false,
  le: { ident: '09', lat: 50, lon: 8, elevation_ft: 300, heading_degT: 90, displaced_threshold_ft: null },
  he: { ident: '27', lat: 50, lon: 8.02, elevation_ft: 301, heading_degT: 270, displaced_threshold_ft: 100 } };
const candidates = (r = runway, a = airport) => airportApproachGuides(a, [r], 'source');

test('airport runway ends preserve coordinates, directions, source and unknown displacement', () => {
  const rows = candidates(); assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].runwayIdent, rows[0].heading_deg_true, rows[0].displaced_threshold_ft, rows[0].source], ['09', 90, null, 'source']);
  assert.deepEqual([rows[1].runwayIdent, rows[1].heading_deg_true, rows[1].displaced_threshold_ft], ['27', 270, 100]);
});

test('closed, mismatched, incomplete and invalid runway ends cannot become a guide', () => {
  assert.equal(candidates(runway, { ...airport, type: 'closed' }).length, 0);
  assert.equal(candidates({ ...runway, closed: true }).length, 0);
  assert.equal(candidates({ ...runway, airport_id: 'other' }).length, 0);
  for (const le of [{ ...runway.le, lat: null }, { ...runway.le, heading_degT: null },
    { ...runway.le, displaced_threshold_ft: 10001 }, { ...runway.le, displaced_threshold_ft: -1 },
    { ...runway.le, displaced_threshold_ft: 1000 }]) {
    const length = le.displaced_threshold_ft === 1000 ? 999 : runway.length_ft;
    assert.deepEqual(candidates({ ...runway, length_ft: length, le }).map(g => g.runwayIdent), ['27']);
  }
  assert.equal(airportApproachGuides(airport, Array(80).fill(runway), 'source').length, 64);
});
