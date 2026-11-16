import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COUNTRY_IMAGERY, COUNTRY_PHOTO_DETAIL_MIN_LEVEL, COUNTRY_PHOTO_MAX_LEVEL, COUNTRY_PHOTO_MIN_LEVEL, countryPhotoCandidates, countryPhotoRectangleMayContain, countryPhotoTileMayContain, countryPhotoUrl, type PhotoCountry } from './country-imagery.ts';
import { COUNTRY_PHOTO_OUTLINES } from './country-imagery-outlines.ts';

test('R-WORLD-14 R-WORLD-16 country photo candidates require the service envelope and the coarse source outline', () => {
  assert.deepEqual(countryPhotoCandidates(47.3769, 8.5417), ['ch']); // Zürich
  assert.deepEqual(countryPhotoCandidates(48.2082, 16.3738), ['at']); // Vienna
  assert.deepEqual(countryPhotoCandidates(47.2692, 11.4041), ['at']); // Innsbruck: inside the Swiss envelope, not Switzerland
  assert.deepEqual(countryPhotoCandidates(51.2277, 6.7735), ['nrw']); // Düsseldorf
  assert.deepEqual(countryPhotoCandidates(50.94, 6.96), ['nrw']); // Cologne
  assert.deepEqual(countryPhotoCandidates(51.39, 8.57), ['nrw']); // Brilon, near the Hessen border
  assert.deepEqual(countryPhotoCandidates(52.52, 13.405), ['bb']); // Berlin
  assert.deepEqual(countryPhotoCandidates(52.39, 13.06), ['bb']); // Potsdam
  assert.deepEqual(countryPhotoCandidates(39.5696, 2.6502), ['es']); // Palma de Mallorca
  assert.deepEqual(countryPhotoCandidates(28.4636, -16.2518), ['es']); // Tenerife
  assert.deepEqual(countryPhotoCandidates(40.7128, -74.006), []);
  assert.deepEqual(countryPhotoCandidates(NaN, 8), []);
});

test('R-WORLD-14 Hessen and other neighbouring positions inside a service envelope do not name that source', () => {
  for (const [name, lat, lon] of [['EDFE', 49.9608, 8.6436], ['Frankfurt', 50.11, 8.68], ['Gießen', 50.58, 8.67],
    ['Marburg', 50.81, 8.77], ['Kassel', 51.31, 9.48], ['Koblenz (Rhineland-Palatinate)', 50.36, 7.59]] as const) {
    assert.deepEqual(countryPhotoCandidates(lat, lon), [], `${name} is not North Rhine-Westphalia`);
  }
  assert.deepEqual(countryPhotoCandidates(48.14, 11.58), [], 'Munich is inside the Austrian envelope only');
  assert.deepEqual(countryPhotoCandidates(38.72, -9.14), [], 'Lisbon is inside the Spanish envelope only');
  assert.deepEqual(countryPhotoCandidates(42.69, 2.89), [], 'Perpignan is inside the Spanish envelope only');
});

test('R-WORLD-14 published service envelopes still bound requests around the official layer extents', () => {
  const inside = (id: PhotoCountry, lat: number, lon: number) => {
    const [west, south, east, north] = COUNTRY_IMAGERY.find(source => source.id === id)!.bounds;
    return lon >= west && lon <= east && lat >= south && lat <= north;
  };
  for (const [lat, lon] of [[52, 11.2291258], [52, 14.7701928], [51.3063097, 13], [53.5726199, 13]]) {
    assert(inside('bb', lat, lon), 'official imagery layer bounds fit inside client envelope');
  }
  for (const [lat, lon] of [[51, 5.593338], [51, 9.741582], [50.057798, 7], [52.799797, 7]]) {
    assert(inside('nrw', lat, lon), 'official NRW imagery layer bounds fit inside client envelope');
  }
});

test('R-WORLD-14 R-WORLD-16 R-DATA-1 only tiles near a source outline carry its credit', () => {
  const tile = (lat: number, lon: number, z: number) => {
    const n = 2 ** z;
    return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n)] as const;
  };
  for (const z of [7, 10, 14, 18]) {
    const [x, y] = tile(49.9608, 8.6436, z); // EDFE, Hessen
    for (const source of COUNTRY_IMAGERY) assert.equal(countryPhotoTileMayContain(source.id, z, x, y), false, `${source.id} z${z} at EDFE`);
  }
  for (const [id, lat, lon] of [['nrw', 51.2277, 6.7735], ['es', 39.5696, 2.6502], ['ch', 47.3769, 8.5417], ['at', 48.2082, 16.3738], ['bb', 52.52, 13.405]] as const) {
    for (const z of [7, 12, 18]) { const [x, y] = tile(lat, lon, z); assert(countryPhotoTileMayContain(id, z, x, y), `${id} z${z} interior`); }
    const [x, y] = tile(lat, lon, 6);
    assert.equal(countryPhotoTileMayContain(id, 6, x, y), false, 'the proxy returns only transparent tiles below the detail level');
  }
  // Sampled NRW photography extends about 2.7 km into Hessen; tiles there stay credited.
  const [x, y] = tile(51.0, 8.55, 15); // Hessen side of the Rothaar border, about 3 km from the outline
  assert(countryPhotoTileMayContain('nrw', 15, x, y));
  assert(countryPhotoRectangleMayContain('nrw', 8.0, 50.0, 9.0, 50.8), 'a view reaching the NRW border keeps its credit');
  assert.equal(countryPhotoRectangleMayContain('nrw', 8.4, 49.8, 8.9, 50.3), false, 'a Frankfurt view excludes NRW');
  assert.equal(countryPhotoRectangleMayContain('es', 5, 45, 15, 55), false, 'a Germany-wide view excludes Spain');
  assert.equal(countryPhotoTileMayContain('nrw', 21, 0, 0), false);
  assert.equal(countryPhotoTileMayContain('nrw', 10, -1, 0), false);
  assert.equal(countryPhotoRectangleMayContain('nrw', NaN, 50, 8, 51), false);
});

test('R-DATA-1 generated outlines cover every source with open lon/lat rings', () => {
  for (const source of COUNTRY_IMAGERY) {
    const rings = COUNTRY_PHOTO_OUTLINES[source.id];
    assert(rings.length >= 1, source.id);
    for (const ring of rings) {
      assert(ring.length >= 6 && ring.length % 2 === 0, `${source.id} ring has lon/lat pairs`);
      for (let i = 0; i < ring.length; i += 2) assert(Math.abs(ring[i]) <= 180 && Math.abs(ring[i + 1]) <= 90);
    }
  }
});

test('fixed same-origin photo URLs retain source credits and advertised zoom bounds', () => {
  assert.equal(countryPhotoUrl('ch'), '/scenery/photo-country/ch/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('at'), '/scenery/photo-country/at/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('nrw'), '/scenery/photo-country/nrw/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('bb'), '/scenery/photo-country/bb/{z}/{x}/{y}.png');
  assert.equal(countryPhotoUrl('es'), '/scenery/photo-country/es/{z}/{x}/{y}.png');
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
  assert.match(COUNTRY_IMAGERY[4].attribution, /Obra derivada de.*PNOA 2024.*CC-BY 4\.0.*scne\.es/);
  assert.match(COUNTRY_IMAGERY[4].name, /partial coverage/);
});
