import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STANDARD_PRESSURE_PA, validSetting, pressureAltitude_m, indicatedAltitude_m,
} from './altimeter.js';

function near(actual, expected, tolerance = 0.02) {
  assert.equal(typeof actual, 'number');
  assert(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);
}

test('standard setting agrees with independent pressure-height reference fixtures', () => {
  // Independently hand-evaluated source-equation fixtures from the research
  // note, not accepted aircraft data or merely a formula/inverse round trip.
  near(pressureAltitude_m(101325), 0, 1e-9);
  near(pressureAltitude_m(89874.6), 999.997046);
  near(pressureAltitude_m(22632.1), 10999.987519);
  near(pressureAltitude_m(100000), 110.884478);
  near(indicatedAltitude_m(89874.6, STANDARD_PRESSURE_PA), 999.997046);
});

test('a pressure setting shifts the whole ISA scale rather than changing its gradient', () => {
  near(indicatedAltitude_m(89874.6, 100000), 889.112568);
  near(indicatedAltitude_m(101325, 100000), -110.884478);
  const lower = indicatedAltitude_m(89874.6, 100000);
  const higher = indicatedAltitude_m(89874.6, 101325);
  assert(higher > lower, 'increasing the selected pressure increases indicated altitude');
});

test('a launch-pressure QFE setting reads zero at its declared practice datum', () => {
  near(indicatedAltitude_m(97716.6, 97716.6), 0, 1e-9);
  assert(indicatedAltitude_m(97000, 97716.6) > 0, 'lower pressure above the datum gives positive height');
});

test('near-sea-level pressure adjustment agrees with published EASA example', () => {
  // EASA ATM/ANS guidance example: 1013 -> 1013.25 hPa changes indication about 6.8 ft.
  const change_ft = indicatedAltitude_m(101300, 101325) / 0.3048;
  near(change_ft, 6.8, 0.1);
});

test('practice setting bounds are finite and independent of atmospheric pressure', () => {
  assert(validSetting(80000)); assert(validSetting(110000));
  for (const setting of [79999.99, 110000.01, NaN, Infinity, -Infinity, 0, '101325', null]) {
    assert.equal(validSetting(setting), false);
    assert.equal(indicatedAltitude_m(90000, setting), null);
  }
});

test('invalid or unsupported static pressure returns unavailable without a geometric fallback', () => {
  for (const pressure of [NaN, Infinity, -Infinity, 0, -1, '90000', null, 20000, 130000]) {
    assert.equal(pressureAltitude_m(pressure), null);
    assert.equal(indicatedAltitude_m(pressure, STANDARD_PRESSURE_PA), null);
  }
});
