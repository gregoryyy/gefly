import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlightWarningMonitor, TERRAIN_WARNING_POLICY } from './flight-warnings.ts';
import type { FlightState } from './types';

const frame = (extra: Partial<FlightState> = {}): FlightState => ({
  step: 120, t_s: 1, lat_rad: .87, lon_rad: .15, alt_msl_m: 300,
  roll_rad: 0, pitch_rad: 0, heading_rad: 0, tas_mps: 35,
  on_ground: 0, stall_warning_norm: 0, ground_agl_m: 50, ground_down_mps: 0,
  ...extra,
});

test('R-ALERT-1 native software stall warning is independent of fixed airspeed or terrain cue thresholds', () => {
  const monitor = createFlightWarningMonitor();
  assert.equal(monitor.update(frame({ tas_mps: 10 })).stall, 'clear', 'low speed alone does not invent native stall warning');
  assert.equal(monitor.update(frame({ step: 121, t_s: 1.01, stall_warning_norm: .001, tas_mps: 80 })).stall, 'active');
  assert.equal(monitor.update(frame({ step: 122, t_s: 1.02, stall_warning_norm: 5 })).stall, 'active', 'native warning is uncapped');
  assert.equal(monitor.update(frame({ step: 123, t_s: 1.03, stall_warning_norm: 0 })).stall, 'clear');
  assert.equal(monitor.update(frame({ step: 124, t_s: 1.04, stall_warning_norm: undefined })).stall, 'unavailable');
});

test('R-ALERT-1 generic terrain cue warns for steep local closure while normal shallow landing descent stays clear', () => {
  const monitor = createFlightWarningMonitor();
  const normal = monitor.update(frame({ ground_agl_m: 15, ground_down_mps: 1.5 }));
  assert.equal(normal.terrain, 'clear'); assert.equal(normal.terrainTime_s, 10);
  const steep = monitor.update(frame({ step: 121, t_s: 1.01, ground_agl_m: 15, ground_down_mps: 3 }));
  assert.equal(steep.terrain, 'active'); assert.equal(steep.terrainClosure_mps, 3); assert.equal(steep.terrainTime_s, 5);
  assert.equal(monitor.update(frame({ step: 122, t_s: 1.02, ground_agl_m: 15, ground_down_mps: -5 })).terrain, 'clear');
  assert.equal(createFlightWarningMonitor().update(frame({ ground_agl_m: 100, ground_down_mps: 20 })).terrain, 'clear', 'time-to-local-ground alone does not ignore clearance gate');
});

test('R-ALERT-1 consecutive actual AGL loss detects rising terrain during level flight and repeated frames preserve the cue', () => {
  const monitor = createFlightWarningMonitor();
  const first = frame({ ground_agl_m: 40 });
  assert.equal(monitor.update(first).terrain, 'clear');
  const next = frame({ step: 144, t_s: 1.2, ground_agl_m: 39.2 });
  const warning = monitor.update(next);
  assert.equal(warning.terrain, 'active'); assert(Math.abs(warning.terrainClosure_mps! - 4) < 1e-10);
  const repeat = monitor.update(next); assert.deepEqual(repeat, warning);
  repeat.terrain = 'clear'; assert.equal(monitor.update(next).terrain, 'active', 'caller cannot mutate the retained snapshot');
});

test('R-ALERT-1 terrain warning hysteresis avoids chatter and all entry/exit policy boundaries are explicit', () => {
  const monitor = createFlightWarningMonitor();
  assert.equal(monitor.update(frame({ ground_agl_m: 30, ground_down_mps: 3 })).terrain, 'active');
  assert.equal(monitor.update(frame({ step: 121, t_s: 1.01, ground_agl_m: 30, ground_down_mps: 2.5 })).terrain, 'active', 'latched cue retains at12 seconds and2.5m/s');
  assert.equal(monitor.update(frame({ step: 122, t_s: 1.02, ground_agl_m: 30, ground_down_mps: 2.49 })).terrain, 'clear');
  assert.equal(createFlightWarningMonitor().update(frame({ ground_agl_m: 60, ground_down_mps: 6 })).terrain, 'active');
  assert.equal(createFlightWarningMonitor().update(frame({ ground_agl_m: 60.01, ground_down_mps: 7 })).terrain, 'clear');
  assert.equal(createFlightWarningMonitor().update(frame({ ground_agl_m: 30.01, ground_down_mps: 3 })).terrain, 'clear');
  const leave = createFlightWarningMonitor();
  leave.update(frame({ ground_agl_m: 60, ground_down_mps: 6 }));
  assert.equal(leave.update(frame({ step: 121, t_s: 1.01, ground_agl_m: 75, ground_down_mps: 7 })).terrain, 'active');
  assert.equal(leave.update(frame({ step: 122, t_s: 1.02, ground_agl_m: 75.01, ground_down_mps: 8 })).terrain, 'clear');
  assert.equal(TERRAIN_WARNING_POLICY.enterClearance_m, 60);
  assert.equal(TERRAIN_WARNING_POLICY.leaveClearance_m, 75);
});

test('R-ALERT-1 frame gaps, backward seeks, explicit reset and changed duplicate data cannot manufacture derivative closure', () => {
  const monitor = createFlightWarningMonitor();
  monitor.update(frame({ ground_agl_m: 100 }));
  assert.equal(monitor.update(frame({ step: 240, t_s: 2, ground_agl_m: 20 })).terrain, 'clear');
  assert.equal(monitor.update(frame({ step: 100, t_s: .8, ground_agl_m: 10 })).terrain, 'clear');
  assert.equal(monitor.update(frame({ step: 100, t_s: .8, ground_agl_m: 1 })).terrain, 'clear', 'changed data at identical step/time does not divide by zero');
  monitor.reset();
  assert.equal(monitor.update(frame({ ground_agl_m: 2 })).terrain, 'clear');
  assert.equal(monitor.update(frame({ step: 121, t_s: 1.01, ground_agl_m: 2, ground_down_mps: 3 })).terrain, 'active', 'current native descent can still warn after baseline reset');
});

test('R-ALERT-1 wheel, structure and collision contact suppress both cues; incomplete contact is unavailable', () => {
  for (const contact of [{ on_ground: 1 }, { gear_nose_wow: 1 }, { gear_left_wow: 1 }, { gear_right_wow: 1 },
    { structure_contact_mask: 1 }, { collision_mask: 8 }]) {
    const result = createFlightWarningMonitor().update(frame({ stall_warning_norm: 1, ground_agl_m: 2, ground_down_mps: 10, ...contact }));
    assert.equal(result.stall, 'clear'); assert.equal(result.terrain, 'clear');
  }
  for (const invalid of [{ on_ground: undefined }, { on_ground: 2 }, { gear_nose_wow: .5 }, { collision_mask: NaN }]) {
    const result = createFlightWarningMonitor().update(frame(invalid));
    assert.equal(result.stall, 'unavailable'); assert.equal(result.terrain, 'unavailable');
  }
});

test('R-ALERT-1 invalid or missing consumed telemetry stays unavailable independently, and no stale warning survives it', () => {
  const monitor = createFlightWarningMonitor();
  assert.equal(monitor.update(frame({ ground_agl_m: 2, ground_down_mps: 5, stall_warning_norm: 1 })).terrain, 'active');
  const noTerrain = monitor.update(frame({ step: 121, t_s: 1.01, ground_agl_m: undefined, stall_warning_norm: 1 }));
  assert.equal(noTerrain.terrain, 'unavailable'); assert.equal(noTerrain.terrainClearance_m, null); assert.equal(noTerrain.stall, 'active');
  const noStall = monitor.update(frame({ step: 122, t_s: 1.02, stall_warning_norm: NaN }));
  assert.equal(noStall.stall, 'unavailable'); assert.equal(noStall.terrain, 'clear');
  for (const invalid of [frame({ step: -1 }), frame({ step: 1.5 }), frame({ t_s: Infinity }), null]) {
    const result = monitor.update(invalid); assert.equal(result.stall, 'unavailable'); assert.equal(result.terrain, 'unavailable');
  }
  assert.equal(monitor.update(frame({ ground_agl_m: -1 })).terrain, 'unavailable');
  assert.equal(monitor.update(frame({ ground_down_mps: NaN })).terrain, 'unavailable');
  assert.equal(monitor.update(frame({ stall_warning_norm: -1 })).stall, 'unavailable');
});

test('R-ALERT-1 numerical overflow and zero closure do not invent an impact time or an all-clear derivative', () => {
  const monitor = createFlightWarningMonitor();
  const level = monitor.update(frame()); assert.equal(level.terrainTime_s, null); assert.equal(level.terrainClosure_mps, 0);
  monitor.update(frame({ step: 121, t_s: 1.01, ground_agl_m: Number.MAX_VALUE }));
  const overflow = monitor.update(frame({ step: 122, t_s: 1.02, ground_agl_m: 1 }));
  assert.equal(overflow.terrain, 'unavailable'); assert.equal(overflow.terrainTime_s, null);
});

test('R-ALERT-1 unavailable stall telemetry cannot reset terrain hysteresis on duplicate frames', () => {
  for (const stall_warning_norm of [undefined, NaN, Infinity, -1]) {
    const monitor = createFlightWarningMonitor();
    assert.equal(monitor.update(frame({ ground_agl_m: 60, ground_down_mps: 6, stall_warning_norm })).terrain, 'active');
    const exitBand = frame({ step: 121, t_s: 1.01, ground_agl_m: 65, ground_down_mps: 6, stall_warning_norm });
    const retained = monitor.update(exitBand);
    assert.equal(retained.stall, 'unavailable'); assert.equal(retained.terrain, 'active');
    assert.deepEqual(monitor.update(exitBand), retained, 'a repeated actual frame preserves the valid component latch');
    const repairedStall = monitor.update({ ...exitBand, stall_warning_norm: 1 });
    assert.equal(repairedStall.stall, 'active'); assert.equal(repairedStall.terrain, 'active',
      'same-frame stall availability changes do not recompute the independent terrain derivative');
    const lostStall = monitor.update({ ...exitBand, stall_warning_norm: undefined });
    assert.equal(lostStall.stall, 'unavailable'); assert.equal(lostStall.terrain, 'active');
  }
});

test('R-ALERT-1 valid stall state stays independent when terrain telemetry is unavailable or repaired', () => {
  const monitor = createFlightWarningMonitor();
  const partial = frame({ stall_warning_norm: 1, ground_agl_m: undefined });
  const warning = monitor.update(partial);
  assert.equal(warning.stall, 'active'); assert.equal(warning.terrain, 'unavailable');
  assert.deepEqual(monitor.update(partial), warning);
  const cleared = monitor.update({ ...partial, stall_warning_norm: 0 });
  assert.equal(cleared.stall, 'clear'); assert.equal(cleared.terrain, 'unavailable');
  assert.equal(cleared.terrainClosure_mps, null);
  const restored = monitor.update({ ...partial, stall_warning_norm: 0, ground_agl_m: 20 });
  assert.equal(restored.stall, 'clear'); assert.equal(restored.terrain, 'clear');
  assert.equal(restored.terrainClosure_mps, 0, 'restored terrain starts without a fabricated derivative');
});
