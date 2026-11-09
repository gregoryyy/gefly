import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validMapStart, MAP_START_HEIGHTS_FT } from './map-start.js';
const base = { lat_rad: .8, lon_rad: .1, heading_rad: 1, height_agl_ft: 1000 };

test('R-PLAY-2 map starts accept only the four explicit AGL choices and supported coordinates', () => {
  assert.deepEqual(MAP_START_HEIGHTS_FT, [0,1000,5000,10000]);
  for (const height_agl_ft of MAP_START_HEIGHTS_FT) for (const lon_rad of [-Math.PI, 0, Math.PI])
    assert.equal(validMapStart({ ...base, height_agl_ft, lon_rad }), true);
  assert(validMapStart({ ...base, lat_rad: -89.499 * Math.PI / 180, heading_rad: 0 }));
  assert(validMapStart({ ...base, lat_rad: 89.499 * Math.PI / 180, heading_rad: 2 * Math.PI - .000001 }));
});
test('R-PLAY-2 malformed/extra/missing fields cannot become a launch', () => {
  for (const value of [null, [], '1000', {}, { ...base, alt_msl_m: 500 }, { ...base, version: 1 },
    Object.assign(Object.create({ height_agl_ft: 1000 }), { lat_rad: .8, lon_rad: .1, heading_rad: 1 })])
    assert.equal(validMapStart(value), false);
  for (const key of Object.keys(base)) {
    const missing = { ...base }; delete missing[key]; assert.equal(validMapStart(missing), false);
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, '0']) assert.equal(validMapStart({ ...base, [key]: invalid }), false);
  }
  const extra = { ...base }; Object.defineProperty(extra, 'extra', { value: 1 }); assert.equal(validMapStart(extra), false);
});
test('R-PLAY-2 height, polar and heading limits are explicit rather than clamped or wrapped', () => {
  for (const height_agl_ft of [-1, 1, 999, 1000.5, 2000, 10001]) assert.equal(validMapStart({ ...base, height_agl_ft }), false);
  for (const lat_rad of [-Math.PI/2, Math.PI/2, -89.5*Math.PI/180, 89.5*Math.PI/180]) assert.equal(validMapStart({ ...base, lat_rad }), false);
  for (const lon_rad of [-Math.PI-.001, Math.PI+.001]) assert.equal(validMapStart({ ...base, lon_rad }), false);
  for (const heading_rad of [-.001, 2*Math.PI, 7]) assert.equal(validMapStart({ ...base, heading_rad }), false);
});
