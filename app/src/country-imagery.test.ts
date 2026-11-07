import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COUNTRY_IMAGERY, COUNTRY_PHOTO_DETAIL_MIN_LEVEL, COUNTRY_PHOTO_MAX_LEVEL, COUNTRY_PHOTO_MIN_LEVEL, countryPhotoCandidates, countryPhotoUrl } from './country-imagery.ts';

test('country photo candidates are bounded service envelopes, not inferred actual coverage', () => {
  assert.deepEqual(countryPhotoCandidates(47.3769, 8.5417), ['ch']); // Zürich
  assert.deepEqual(countryPhotoCandidates(48.2082, 16.3738), ['at']); // Vienna
  assert.deepEqual(countryPhotoCandidates(47.2692, 11.4041), ['ch', 'at']); // overlapping envelopes
  assert.deepEqual(countryPhotoCandidates(51.2277, 6.7735), ['nrw']); // Düsseldorf
  assert.deepEqual(countryPhotoCandidates(52.52, 13.405), ['bb']); // Berlin
  for (const [lat, lon] of [[52, 11.2291258], [52, 14.7701928], [51.3063097, 13], [53.5726199, 13]]) {
    assert(countryPhotoCandidates(lat, lon).includes('bb'), 'official imagery layer bounds fit inside client envelope');
  }
  for (const [lat, lon] of [[51, 5.593338], [51, 9.741582], [50.057798, 7], [52.799797, 7]]) {
    assert(countryPhotoCandidates(lat, lon).includes('nrw'), 'official NRW imagery layer bounds fit inside client envelope');
  }
  assert.deepEqual(countryPhotoCandidates(40.7128, -74.006), []);
  assert.deepEqual(countryPhotoCandidates(NaN, 8), []);
});

test('fixed same-origin photo URLs retain source credits and advertised zoom bounds', () => {
  assert.equal(countryPhotoUrl('ch'), '/scenery/photo-country/ch/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('at'), '/scenery/photo-country/at/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('nrw'), '/scenery/photo-country/nrw/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('bb'), '/scenery/photo-country/bb/{z}/{x}/{y}.png');
  assert.equal(COUNTRY_PHOTO_MIN_LEVEL, 0);
  assert.equal(COUNTRY_PHOTO_DETAIL_MIN_LEVEL, 7);
  assert.equal(COUNTRY_PHOTO_MAX_LEVEL, 20);
  assert.match(COUNTRY_IMAGERY[0].attribution, /swisstopo/);
  assert.match(COUNTRY_IMAGERY[0].attribution, /Planet\. All rights reserved/);
  assert.match(COUNTRY_IMAGERY[1].attribution, /basemap\.at/);
  assert.match(COUNTRY_IMAGERY[1].attribution, /CC BY 4\.0/);
  assert.match(COUNTRY_IMAGERY[1].attribution, /masked near borders/);
  assert.match(COUNTRY_IMAGERY[2].attribution, /Geobasis NRW.*Zero 2\.0/);
  assert.match(COUNTRY_IMAGERY[3].attribution, /GeoBasis-DE\/LGB.*dl-de\/by-2-0.*Geoportal Berlin.*dl-de\/by-2-0/);
  assert.match(COUNTRY_IMAGERY[3].attribution, /registry\.gdi-de\.org\/id\/de\.bb\.metadata\/253b7d3d-6b42-47dc-b127-682de078b7ae/);
});
