// Task159 / R-AIR-3: pressure-reference boundaries, not installed-instrument fidelity.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { pressureAltitude_m, indicatedAltitude_m, validSetting } from './altimeter.js';
import { CONTINUATION_FIELDS, resumeProblem, resumeValues } from './continue-flight.js';
import { createKap140 } from './kap140.js';
import { DEFAULT_NAVIGATION } from './navigation.js';

// Exercise the production worker functions with explicit sensor faults, without
// exposing mutable native/test hooks in the worker or manufacturing native data.
const source = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const functions = source.slice(source.indexOf('function updateAltimeter()'), source.indexOf('function fail(message)'));
assert(functions.includes('function initializeAltimeter()') && functions.includes('function onAltimeter(msg)'));
function instrument(pressure = 70121.45, qnh = 101325) {
  const messages = [];
  const scope = vm.createContext({ pressureAltitude_m, indicatedAltitude_m, validSetting,
    M: { _gf_static_pressure_pa: () => pressure, _gf_sealevel_pressure_pa: () => qnh },
    readState: () => [0, 0, 0, 3000], postMessage: message => messages.push(message),
    postState: () => messages.push({ type: 'state' }),
    altimeterSettingPa: 101325, altimeterReferences: null, altimeterFields: {} });
  vm.runInContext(functions, scope);
  return { scope, messages, run: command => vm.runInContext(command, scope) };
}

test('Task159 supported high-altitude launch reference does not invalidate QNH/standard indication', () => {
  const f = instrument(); f.run('initializeAltimeter()');
  assert.equal(f.scope.altimeterFields.altimeter_qfe_pa, 70121.45);
  assert.equal(f.scope.altimeterFields.altimeter_setting_pa, 101325);
  assert(Math.abs(f.scope.altimeterFields.altimeter_indicated_m - 3000) < 2);
  f.run('onAltimeter({setting_pa:100000})');
  assert.equal(f.scope.altimeterFields.altimeter_setting_pa, 100000);
  const before = f.scope.altimeterFields.altimeter_indicated_m;
  f.run('onAltimeter({setting_pa:70121.45})');
  assert.equal(f.messages.at(-1).type, 'altimeter-rejected');
  assert.match(f.messages.at(-1).message, /Launch QFE.*800–1100 hPa.*QNH or standard/);
  assert.equal(f.scope.altimeterFields.altimeter_setting_pa, 100000);
  assert.equal(f.scope.altimeterFields.altimeter_indicated_m, before);
});

test('Task159 unavailable capability/reference and unsupported current pressure leave no stale pressure group', () => {
  for (const missing of ['_gf_static_pressure_pa', '_gf_sealevel_pressure_pa']) {
    const f = instrument(); delete f.scope.M[missing]; f.run('initializeAltimeter()');
    assert.equal(Object.keys(f.scope.altimeterFields).length, 0);
  }
  for (const pressure of [20000, 130000, 0, -1, NaN, Infinity]) {
    const f = instrument(pressure); f.run('initializeAltimeter()');
    assert.equal(Object.keys(f.scope.altimeterFields).length, 0);
  }
  const badQnh = instrument(70121.45, 75000); badQnh.run('initializeAltimeter()');
  assert.equal(Object.keys(badQnh.scope.altimeterFields).length, 0);
  const f = instrument(); f.run('initializeAltimeter()');
  f.scope.M._gf_static_pressure_pa = () => 20000; f.run('updateAltimeter()');
  assert.equal(Object.keys(f.scope.altimeterFields).length, 0);
  f.scope.M._gf_static_pressure_pa = () => 70121.45; f.run('updateAltimeter()');
  assert.equal(Object.keys(f.scope.altimeterFields).length, 6);
  delete f.scope.M._gf_static_pressure_pa; f.run('updateAltimeter()');
  assert.equal(Object.keys(f.scope.altimeterFields).length, 0);
});

function continuation() {
  const sensors = { t_s: 1, dt_s: 1 / 120, heading_rad: 1, physical_altitude_m: 3000,
    pressure_altitude_m: 3000, vertical_speed_mps: 0,
    nav: { valid: false, kind: 0, cdi_norm: 0, course_rad: 0, gs_valid: false, gs_norm: 0 } };
  return { ...Object.fromEntries(CONTINUATION_FIELDS.map(key => [key, 0])),
    t_s: 1, step: 120, alt_msl_m: 3000, tas_mps: 45, aero_u_mps: 45,
    altimeter_setting_pa: 101325, altimeter_qnh_pa: 101325,
    altimeter_qfe_pa: 70121.45, altimeter_qfe_datum_m: 3000,
    ...DEFAULT_NAVIGATION, ...createKap140(sensors).snapshot(sensors) };
}

test('Task159 continuation accepts supported raw QFE without widening selected-setting or QNH bounds', () => {
  const frame = continuation();
  assert.equal(resumeProblem(frame), null); assert.equal(resumeValues(frame).length, 32);
  for (const value of [22633, 70121.45, 97716.6, 110001, 120000]) {
    assert.notEqual(pressureAltitude_m(value), null);
    assert.equal(resumeProblem({ ...frame, altimeter_qfe_pa: value }), null);
  }
  for (const value of [20000, 130000, 0, -1, NaN, Infinity, '70121', undefined]) {
    assert.match(resumeProblem({ ...frame, altimeter_qfe_pa: value }), /altimeter_qfe_pa/);
  }
  for (const key of ['altimeter_setting_pa', 'altimeter_qnh_pa']) for (const value of [70121.45, 79999.99, 110000.01]) {
    assert.match(resumeProblem({ ...frame, [key]: value }), new RegExp(key));
  }
});
