import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPointPosition } from './map-point-position.ts';

test('R-WORLD-12 airport popup position shows source elevation in feet with derived metres', () => {
  assert.equal(formatPointPosition({ kind: 'airport', lat_deg: 49.96194, lon_deg: 8.64361, elevation_ft: 384 }),
    'airport · 49.96194° N, 8.64361° E · elevation 384 ft (117 m)');
  assert.equal(formatPointPosition({ kind: 'airport', lat_deg: -33.94611, lon_deg: -118.40417, elevation_ft: -12 }),
    'airport · 33.94611° S, 118.40417° W · elevation -12 ft (-4 m)');
});

test('R-WORLD-12 missing airport elevation stays visibly unavailable, never zero', () => {
  for (const elevation_ft of [null, Number.NaN, Number.POSITIVE_INFINITY])
    assert.equal(formatPointPosition({ kind: 'airport', lat_deg: 50, lon_deg: 8, elevation_ft }),
      'airport · 50.00000° N, 8.00000° E · elevation unavailable');
});

test('R-WORLD-12 points without an elevation field keep the coordinate-only line', () => {
  assert.equal(formatPointPosition({ kind: 'VOR-DME', lat_deg: 50.05, lon_deg: 8.63 }), 'VOR-DME · 50.05000° N, 8.63000° E');
  assert.equal(formatPointPosition({ kind: 'airport', lat_deg: 91, lon_deg: 8, elevation_ft: 300 }),
    'airport · Coordinates unavailable · elevation 300 ft (91 m)');
});
