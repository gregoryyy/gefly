import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COUNTRY_IMAGERY, COUNTRY_PHOTO_DETAIL_MIN_LEVEL, COUNTRY_PHOTO_MAX_LEVEL, COUNTRY_PHOTO_MIN_LEVEL, countryPhotoCandidates, countryPhotoUrl } from './country-imagery.ts';

test('country photo candidates are bounded service envelopes, not inferred actual coverage', () => {
  assert.deepEqual(countryPhotoCandidates(47.3769, 8.5417), ['ch']); // Zürich
  assert.deepEqual(countryPhotoCandidates(48.2082, 16.3738), ['at']); // Vienna
  assert.deepEqual(countryPhotoCandidates(47.2692, 11.4041), ['ch', 'at']); // overlapping envelopes
  assert.deepEqual(countryPhotoCandidates(40.7128, -74.006), []);
  assert.deepEqual(countryPhotoCandidates(NaN, 8), []);
});

test('fixed same-origin photo URLs retain source credits and advertised zoom bounds', () => {
  assert.equal(countryPhotoUrl('ch'), '/scenery/photo-country/ch/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('at'), '/scenery/photo-country/at/{z}/{x}/{y}.png');
  assert.equal(COUNTRY_PHOTO_MIN_LEVEL, 0);
  assert.equal(COUNTRY_PHOTO_DETAIL_MIN_LEVEL, 7);
  assert.equal(COUNTRY_PHOTO_MAX_LEVEL, 20);
  assert.match(COUNTRY_IMAGERY[0].attribution, /swisstopo/);
  assert.match(COUNTRY_IMAGERY[0].attribution, /Planet\. All rights reserved/);
  assert.match(COUNTRY_IMAGERY[1].attribution, /basemap\.at/);
  assert.match(COUNTRY_IMAGERY[1].attribution, /CC BY 4\.0/);
  assert.match(COUNTRY_IMAGERY[1].attribution, /masked near borders/);
});
