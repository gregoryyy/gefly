import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STALL_FIELDS } from './types.ts';
import type { FlightState } from './types';
import { spatialStallAwareness, STALL_STATIONS } from './spatial-stall.ts';

const fixture = (overrides: Partial<FlightState> = {}): FlightState => ({
  step: 1, t_s: 1 / 120, lat_rad: 0, lon_rad: 0, alt_msl_m: 100,
  roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 20,
  aero_u_mps: 20, aero_v_mps: 0, aero_w_mps: 20 * Math.tan(.1),
  aero_p_radps: 0, aero_q_radps: 0, aero_r_radps: 0,
  cg_structural_x_m: 43.2 * .0254, cg_structural_y_m: 0, cg_structural_z_m: 59.4 * .0254,
  aero_alpha_rad: .1, aero_alpha_max_rad: .28, stall_warning_norm: 0, stall_hysteresis_norm: 0,
  ...overrides,
});
const close = (actual: number | null, expected: number) => assert(actual !== null && Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);

test('R-AIR-2 reference-span centres use pinned SI geometry; zero rates preserve body alpha without mutating input', () => {
  const state = Object.freeze(fixture()); const before = { ...state };
  const result = spatialStallAwareness(state);
  assert.equal(result.status, 'available'); assert.equal(result.commonAlphaMax_rad, .28);
  assert.equal(result.globalAlpha_rad, .1); assert.equal(result.stallWarning_norm, 0);
  assert.equal(STALL_STATIONS.length, 6);
  for (const [index, station] of STALL_STATIONS.entries()) {
    close(station.structural_x_m, 43.2 * .0254); close(station.structural_z_m, 59.4 * .0254);
    close(Math.abs(station.structural_y_m), [1, 3, 5][index % 3] / 6 * 18 * .3048);
    close(result.stations[index].localAlpha_rad, .1); close(result.stations[index].referenceMargin_rad, .18);
    assert.equal(result.stations[index].status, 'below-reference');
  }
  assert.deepEqual(state, before); assert(Object.isFrozen(STALL_STATIONS)); assert(Object.isFrozen(STALL_STATIONS[0]));
});

test('positive roll raises descending right-wing AoA with symmetric spanwise changes', () => {
  const result = spatialStallAwareness(fixture({ aero_w_mps: 0, aero_alpha_rad: 0, aero_p_radps: .4 }));
  for (let index = 0; index < 3; index++) {
    const left = result.stations[index], right = result.stations[index + 3];
    assert(left.localAlpha_rad! < 0); assert(right.localAlpha_rad! > 0);
    close(left.localAlpha_rad, -right.localAlpha_rad!);
  }
  assert(result.stations[5].localAlpha_rad! > result.stations[3].localAlpha_rad!);
});

test('pitch/yaw cross product uses moving actual CG and the structural-to-body sign change', () => {
  const state = fixture({ aero_u_mps: 30, aero_v_mps: 1, aero_w_mps: 3,
    aero_p_radps: .2, aero_q_radps: .4, aero_r_radps: -.3,
    cg_structural_x_m: 1.4, cg_structural_y_m: .2, cg_structural_z_m: 1.1 });
  for (const reading of spatialStallAwareness(state).stations) {
    const point = reading.station;
    const rx = 1.4 - point.structural_x_m, ry = point.structural_y_m - .2, rz = 1.1 - point.structural_z_m;
    close(reading.localAlpha_rad, Math.atan2(3 + .2 * ry - .4 * rx, 30 + .4 * rz + .3 * ry));
  }
  const displaced = spatialStallAwareness({ ...state, cg_structural_x_m: 2.4 });
  assert(displaced.stations[0].localAlpha_rad! < spatialStallAwareness(state).stations[0].localAlpha_rad!);
});

test('the shared 85% warning transition and alpha-max classify references, not actual separation', () => {
  for (const [alpha, status] of [[.2, 'below-reference'], [.25, 'near-reference'], [.3, 'at-or-above-reference']] as const) {
    const result = spatialStallAwareness(fixture({ aero_u_mps: Math.cos(alpha) * 20,
      aero_w_mps: Math.sin(alpha) * 20, aero_alpha_rad: alpha, stall_warning_norm: 1.5, stall_hysteresis_norm: 1 }));
    assert(result.stations.every(station => station.status === status));
    assert.equal(result.stallWarning_norm, 1.5, 'actual warning can exceed one and must not be clamped');
    assert.equal(result.stallHysteresis_norm, 1);
  }
  const boundary = .85 * .28;
  const atBoundary = spatialStallAwareness(fixture({ aero_u_mps: 1, aero_w_mps: Math.tan(boundary) }));
  assert(atBoundary.stations.every(station => station.status === 'near-reference'));
  const atMax = spatialStallAwareness(fixture({ aero_u_mps: 1, aero_w_mps: Math.tan(.28) }));
  assert(atMax.stations.every(station => station.status === 'at-or-above-reference'));
});

test('low longitudinal airflow and reverse flow have no fabricated AoA or headroom', () => {
  for (const [u, w, reason] of [[.5, 0, 'low-airspeed'], [0, 5, 'reverse-flow'], [-20, 0, 'reverse-flow']] as const) {
    const result = spatialStallAwareness(fixture({ aero_u_mps: u, aero_w_mps: w, aero_v_mps: 100 }));
    assert.equal(result.status, 'unavailable'); assert.equal(result.commonAlphaMax_rad, .28);
    for (const reading of result.stations) {
      assert.equal(reading.unavailableReason, reason); assert.equal(reading.localAlpha_rad, null); assert.equal(reading.referenceMargin_rad, null);
    }
  }
  assert.equal(spatialStallAwareness(fixture({ aero_u_mps: 1, aero_w_mps: 0 })).status, 'available');
  const mixed = spatialStallAwareness(fixture({ aero_r_radps: 10 }));
  assert(mixed.stations.some(station => station.unavailableReason === 'reverse-flow'));
  assert(mixed.stations.some(station => station.status !== 'unavailable'));
});

test('missing, invalid and overflowed telemetry stays unavailable instead of showing zero or infinity', () => {
  for (const input of [null, { ...fixture(), aero_u_mps: undefined }]) {
    const result = spatialStallAwareness(input); assert.equal(result.status, 'unavailable'); assert.equal(result.globalAlpha_rad, null);
  }
  for (const key of STALL_FIELDS) {
    for (const bad of [NaN, Infinity, -Infinity]) assert.equal(spatialStallAwareness(fixture({ [key]: bad })).status, 'unavailable');
  }
  for (const patch of [{ aero_alpha_max_rad: 0 }, { stall_hysteresis_norm: .5 }, { stall_warning_norm: -1 }]) {
    assert.equal(spatialStallAwareness(fixture(patch)).status, 'unavailable');
  }
  const extreme = spatialStallAwareness(fixture({ aero_p_radps: Number.MAX_VALUE, aero_q_radps: Number.MAX_VALUE,
    cg_structural_x_m: Number.MAX_VALUE, cg_structural_z_m: Number.MAX_VALUE }));
  assert(extreme.stations.every(station => station.unavailableReason === 'numerical-range'));
});
