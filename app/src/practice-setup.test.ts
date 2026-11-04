import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluatePracticeSetup } from './practice-setup.ts';
import type { FlightState } from './types';

const initial = (extra: Partial<FlightState> = {}): FlightState => ({
  step: 0, t_s: 0, lat_rad: .87, lon_rad: .15, alt_msl_m: 115,
  roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 0,
  engine_running: 1, brake_left_norm: 1, brake_right_norm: 1, throttle_norm: 0,
  flap_rad: 0, pitch_trim_norm: .168, pitch_trim_initial_norm: .168,
  kap_engaged: 0, ap_mode: 0, systems_switch_mask: 15, ...extra,
});
const row = (id: string, state: Readonly<FlightState> | null) => evaluatePracticeSetup(state).find(check => check.id === id)!;

test('R-TRAIN-4 initial simulator configuration has seven sensed matches and two explicitly unsensed rows', () => {
  const checks = evaluatePracticeSetup(initial());
  assert.deepEqual(checks.map(check => [check.id, check.status]), [
    ['engine', 'match'], ['brakes', 'match'], ['throttle', 'match'], ['flaps', 'match'],
    ['trim', 'match'], ['autopilot', 'match'], ['electrical', 'match'],
    ['pilot-cabin', 'unsupported'], ['fuel-runup', 'unsupported'],
  ]);
  assert.equal(row('brakes', initial()).observed, 'L 100% / R 100%');
  assert.equal(row('trim', initial()).observed, 'Actual 0.168');
  assert.equal(row('trim', initial()).expected, 'Initial 0.168');
  assert(checks.every(check => !Object.hasOwn(check, 'checked') && !Object.hasOwn(check, 'completed')));
});

test('R-TRAIN-4 actual mismatches remain visible despite requested engine/ignition state or unchanged startup values', () => {
  const changed = initial({ engine_running: 0, engine_command_on: 1, brake_left_norm: 0, throttle_norm: .3,
    flap_rad: Math.PI / 18, pitch_trim_norm: -.2, kap_engaged: 1, systems_switch_mask: 1 });
  assert(evaluatePracticeSetup(changed).slice(0, 7).every(check => check.status === 'different'));
  assert.equal(row('engine', changed).observed, 'OFF');
  assert.equal(row('brakes', changed).observed, 'L 0% / R 100%');
  assert.equal(row('throttle', changed).observed, '30.0%');
  assert.equal(row('flaps', changed).observed, '10.0°');
  assert.equal(row('autopilot', initial({ ap_mode: 2 })).status, 'different');
  assert.equal(row('throttle', initial({ throttle_norm: .00001 })).observed, '<0.1%');
  assert.equal(row('throttle', initial({ throttle_norm: .00001 })).status, 'different');
  assert.equal(row('brakes', initial({ brake_right_norm: .99999 })).status, 'different');
  assert.equal(row('brakes', initial({ brake_right_norm: .99999 })).observed, 'L 100% / R >99.9%');
});

test('R-TRAIN-4 legacy/missing/null snapshots do not fabricate zero values or complete a sensed row', () => {
  const legacy: FlightState = { step: 1, t_s: 1, lat_rad: .87, lon_rad: .15, alt_msl_m: 300,
    roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 35 };
  for (const state of [null, legacy]) {
    const checks = evaluatePracticeSetup(state);
    assert(checks.slice(0, 7).every(check => check.status === 'unavailable' && check.observed === 'Unavailable'));
    assert(checks.slice(7).every(check => check.status === 'unsupported'));
  }
});

test('R-TRAIN-4 invalid/nonfinite values and partial required pairs are unavailable rather than match/different', () => {
  const invalid: [string, Partial<FlightState>][] = [
    ['engine', { engine_running: .5 }], ['engine', { engine_running: NaN }],
    ['brakes', { brake_left_norm: undefined }], ['brakes', { brake_right_norm: NaN }],
    ['brakes', { brake_left_norm: 1.01 }], ['brakes', { brake_right_norm: -1 }],
    ['throttle', { throttle_norm: Infinity }], ['throttle', { throttle_norm: -1 }],
    ['flaps', { flap_rad: NaN }], ['flaps', { flap_rad: -1 }], ['flaps', { flap_rad: Math.PI }],
    ['trim', { pitch_trim_initial_norm: undefined }], ['trim', { pitch_trim_norm: undefined }],
    ['trim', { pitch_trim_norm: 1.1 }], ['trim', { pitch_trim_initial_norm: -Infinity }],
    ['autopilot', { kap_engaged: undefined }], ['autopilot', { ap_mode: undefined }],
    ['autopilot', { kap_engaged: 2 }], ['autopilot', { ap_mode: 3 }],
    ['electrical', { systems_switch_mask: NaN }], ['electrical', { systems_switch_mask: 1024 }],
    ['electrical', { systems_switch_mask: 2 }],
  ];
  for (const [id, extra] of invalid) {
    const check = row(id, initial(extra));
    assert.equal(check.status, 'unavailable', `${id}: ${JSON.stringify(extra)}`);
    assert.equal(check.observed, 'Unavailable');
  }
});

test('R-TRAIN-4 flap/trim agreement follows declared display precision, not a calibrated take-off mark', () => {
  assert.equal(row('flaps', initial({ flap_rad: .049 * Math.PI / 180 })).status, 'match');
  assert.equal(row('flaps', initial({ flap_rad: .051 * Math.PI / 180 })).status, 'different');
  assert.equal(row('flaps', initial({ flap_rad: -1e-7 })).observed, '0.0°');
  const sameDisplay = initial({ pitch_trim_norm: .25049, pitch_trim_initial_norm: .2501 });
  assert.equal(row('trim', sameDisplay).status, 'match'); assert.equal(row('trim', sameDisplay).expected, 'Initial 0.250');
  assert.equal(row('trim', initial({ pitch_trim_norm: .25051, pitch_trim_initial_norm: .2501 })).status, 'different');
  assert.equal(row('trim', initial({ pitch_trim_norm: -.0004, pitch_trim_initial_norm: .0004 })).status, 'match');
});

test('R-TRAIN-4 model electrical checks require BAT/ALT/AV bits while allowing other valid switch choices', () => {
  for (const mask of [7, 15, 1023]) assert.equal(row('electrical', initial({ systems_switch_mask: mask })).status, 'match');
  for (const mask of [0, 1, 3, 5]) assert.equal(row('electrical', initial({ systems_switch_mask: mask })).status, 'different');
  assert.equal(row('electrical', initial({ systems_switch_mask: 1 })).observed, 'BAT ON / ALT OFF / AV OFF');
});

test('R-TRAIN-4 paused/Review snapshots are read-only and re-evaluation reflects both changes and undo', () => {
  const original = Object.freeze(initial()), changed = Object.freeze(initial({ throttle_norm: .5 }));
  const first = evaluatePracticeSetup(original);
  assert.equal(row('throttle', changed).status, 'different');
  assert.deepEqual(evaluatePracticeSetup(original), first);
  assert(Object.isFrozen(first)); assert(first.every(Object.isFrozen));
  assert.throws(() => { (first[0] as { observed: string }).observed = 'fake'; }, TypeError);
  assert.deepEqual(original, initial(), 'evaluation cannot write controls or snapshot fields');
});
