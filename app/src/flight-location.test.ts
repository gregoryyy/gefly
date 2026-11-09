import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlightLocationStore, FLIGHT_LOCATION_KEY, validFlightLocation } from './flight-location.ts';
import type { FlightLocation, FlightState } from './types.ts';
import { createKap140 } from '../../studies/e1-browser/sim/kap140.js';
import { DEFAULT_NAVIGATION } from '../../studies/e1-browser/sim/navigation.js';
const pose: FlightLocation = { version: 1, lat_rad: 49.87 * Math.PI / 180, lon_rad: 8.65 * Math.PI / 180, alt_msl_m: 900, heading_rad: 2.5, mode: 'airborne' };
const state = { ...pose, step: 1, t_s: 1, tas_mps: 40, roll_rad: 0, pitch_rad: 0, terrain_profile: 1,
  collision_mask: 0, gear_nose_wow: 0, gear_left_wow: 0, gear_right_wow: 0 } as FlightState;
function fixture() {
  const values = new Map<string, string>(); let time = 0, writes = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); writes++; }, removeItem: (key: string) => { values.delete(key); } };
  const store = createFlightLocationStore({ storage, now: () => time });
  return { store, values, storage, advance: (ms: number) => { time += ms; }, writes: () => writes };
}
test('versioned local position rejects corrupt/extra/nonfinite/outside-world-flight-band input', () => {
  assert(validFlightLocation(pose));
  assert(validFlightLocation({ ...pose, lat_rad: 40.75 * Math.PI / 180, lon_rad: -74 * Math.PI / 180 }));
  assert(validFlightLocation({ ...pose, lat_rad: -33.9 * Math.PI / 180, lon_rad: 18.4 * Math.PI / 180 }));
  assert(validFlightLocation({ ...pose, lat_rad: 51.4 * Math.PI / 180, lon_rad: 7.1 * Math.PI / 180 }));
  for (const value of [null, [], {}, { ...pose, version: 2 }, { ...pose, extra: 'execute' }, { ...pose, mode: ['ground'] },
    { ...pose, lat_rad: NaN }, { ...pose, lon_rad: Math.PI + .001 }, { ...pose, lat_rad: 89.5 * Math.PI / 180 }, { ...pose, alt_msl_m: 6001 }, { ...pose, heading_rad: 2 * Math.PI }]) assert(!validFlightLocation(value));
  const { store, values } = fixture();
  for (const raw of ['{bad', 'x'.repeat(4097), JSON.stringify({ ...pose, mode: 'script' })]) { values.set(FLIGHT_LOCATION_KEY, raw); assert.equal(store.read(), null); }
  values.set(FLIGHT_LOCATION_KEY, JSON.stringify(pose)); const saved = store.read()!; saved.lat_rad = 0; assert.deepEqual(store.read(), pose);
});
test('live-only writes are throttled and pagehide flush keeps the most recent position', () => {
  const f = fixture(); f.store.observe(state); assert.equal(f.writes(), 1);
  f.store.observe({ ...state, heading_rad: 3 }); assert.equal(f.writes(), 1); assert.equal(f.store.read()!.heading_rad, 2.5);
  f.advance(2000); f.store.observe({ ...state, heading_rad: 4 }); assert.equal(f.writes(), 2);
  f.store.observe({ ...state, heading_rad: 5 }); assert(f.store.flush()); assert.equal(f.store.read()!.heading_rad, 5);
  f.store.observe({ ...state, heading_rad: 1 }, { reviewing: true }); f.store.flush(); assert.equal(f.store.read()!.heading_rad, 5);
});
test('collision never saves its frame or pending near-impact position; reset clears pending data', () => {
  const f = fixture(); f.store.observe(state); f.store.observe({ ...state, heading_rad: 4 });
  f.store.observe({ ...state, collision_mask: 16, heading_rad: 5 }); assert.equal(f.store.flush(), false); assert.equal(f.store.read()!.heading_rad, 2.5);
  f.store.observe({ ...state, heading_rad: 1 }); f.store.clear(); assert.equal(f.store.flush(), false); assert.equal(f.store.read(), null);
});
test('native ground contact is retained as a safe at-rest launch mode, unknown telemetry is not invented', () => {
  const f = fixture();
  f.store.observe({ ...state, gear_left_wow: undefined }); assert.equal(f.store.read(), null);
  f.store.observe({ ...state, terrain_profile: 0 }); assert.equal(f.store.read(), null);
  f.store.observe({ ...state, collision_mask: undefined }); assert.equal(f.store.read(), null);
  f.store.observe({ ...state, gear_left_wow: 1 }); assert.equal(f.store.read()!.mode, 'ground');
});
test('denied or unavailable browser storage leaves flight behavior usable', () => {
  let attempts = 0;
  const denied = { getItem() { throw Error('denied'); }, setItem() { attempts++; throw Error('denied'); }, removeItem() { throw Error('denied'); } };
  const throttled = createFlightLocationStore({ storage: denied, now: () => 0 });
  for (let i = 0; i < 100; i++) throttled.observe(state);
  assert.equal(attempts, 1, 'denied writes remain throttled rather than throwing every frame');
  for (const storage of [denied, null]) { const store = createFlightLocationStore({ storage }); assert.equal(store.read(), null); store.observe(state); assert.equal(store.flush(), false); store.clear(); }
});

test('R-SIM-11 saved launch keeps requested profile only and a later ground launch clears compensation',()=>{
  const f=fixture(),balance={initial_balance_profile:1 as const,roll_trim_norm:-.011,yaw_trim_norm:-.0008};
  f.store.observe({...state,...balance});assert.equal(f.store.read()!.initial_balance_profile,1);
  assert(!Object.hasOwn(f.store.read()!,'roll_trim_norm'));assert(!Object.hasOwn(f.store.read()!,'yaw_trim_norm'));
  f.advance(2000);f.store.observe({...state,...balance,gear_left_wow:1});assert.equal(f.store.read()!.mode,'ground');assert.equal(f.store.read()!.initial_balance_profile,0);
  for(const patch of [{initial_balance_profile:2},{initial_balance_profile:undefined},{initial_balance_profile:1,mode:'ground'},{initial_balance_profile:1,roll_trim_norm:-.01}])assert.equal(validFlightLocation({...pose,...patch}),false);
  f.values.set(FLIGHT_LOCATION_KEY,JSON.stringify(pose));assert.deepEqual(f.store.read(),pose,'old six-field locations remain supported');
  const before=f.store.read();f.store.observe({...state,initial_balance_profile:1});f.store.flush();assert.deepEqual(f.store.read(),before,'partial telemetry cannot select a new launch profile');
});

function autopilotState(): FlightState {
  const sensors = { t_s: 0, dt_s: 1 / 120, heading_rad: 1.2, physical_altitude_m: 900,
    pressure_altitude_m: 910, vertical_speed_mps: 0,
    nav: { valid: false, kind: 0 as const, cdi_norm: 0, course_rad: 0, gs_valid: false, gs_norm: 0 } };
  const kap = createKap140(sensors);
  kap.command({ action: 'ap' }, sensors); kap.command({ action: 'hdg' }, sensors); kap.command({ action: 'alt' }, sensors);
  return { ...state, ...kap.snapshot(sensors), ...DEFAULT_NAVIGATION };
}

test('optional AP reload payload is strict while damaged AP data preserves only a valid legacy pose', () => {
  const f = fixture(); f.store.observe(autopilotState()); const saved = f.store.read()!;
  assert(saved.autopilot); assert(validFlightLocation(saved));
  assert.equal(saved.autopilot.kap.kap_engaged, 1); assert.equal(saved.autopilot.kap.kap_lateral, 1); assert.equal(saved.autopilot.kap.kap_vertical, 1);
  const damaged = [null, {}, { ...saved.autopilot, version: 2 }, { ...saved.autopilot, execute: true },
    { ...saved.autopilot, kap: { ...saved.autopilot.kap, kap_selected_altitude_m: '900' } },
    { ...saved.autopilot, navigation: { ...saved.autopilot.navigation, radio_nav_active_khz: 123456 } }];
  for (const autopilot of damaged) {
    const value = { ...pose, autopilot };
    assert(!validFlightLocation(value)); f.values.set(FLIGHT_LOCATION_KEY, JSON.stringify(value)); assert.deepEqual(f.store.read(), pose);
  }
  for (const value of [{ ...saved, execute: true }, { ...saved, lat_rad: 2 }, { ...saved, mode: 'resume-physics' }]) {
    f.values.set(FLIGHT_LOCATION_KEY, JSON.stringify(value)); assert.equal(f.store.read(), null);
  }
  f.values.set(FLIGHT_LOCATION_KEY, JSON.stringify(pose)); assert.deepEqual(f.store.read(), pose, 'six-field legacy location stays supported');
});

test('AP and acknowledged pose are saved atomically with latest paused selections and deep-copy isolation', () => {
  const f = fixture(), first = autopilotState();
  f.store.observe(first); const original = f.store.read()!; assert(original.autopilot);
  const paused = { ...first, lon_rad: 8.7 * Math.PI / 180, kap_heading_bug_rad: 2, kap_selected_altitude_m: 1500,
    radio_nav_active_khz: 114200, radio_obs_deg: 122, radio_nav2_active_khz: 115600, radio_obs2_deg: 211 };
  f.store.observe(paused); assert.equal(f.writes(), 1, 'same-step paused changes are coalesced, not discarded');
  assert.deepEqual(f.store.read(), original, 'no independently persisted AP/pose halves');
  paused.kap_heading_bug_rad = 3; paused.radio_obs_deg = 250;
  assert(f.store.flush()); const latest = f.store.read()!;
  assert.equal(latest.lon_rad, 8.7 * Math.PI / 180); assert.equal(latest.autopilot!.kap.kap_heading_bug_rad, 2);
  assert.equal(latest.autopilot!.navigation.radio_obs_deg, 122); assert.equal(latest.autopilot!.navigation.radio_obs2_deg, 211);
  // Returned nested objects can be frozen; mutating any returned copy must never
  // alter subsequent reads or the serialized value.
  try { (latest.autopilot!.kap as { kap_heading_bug_rad: number }).kap_heading_bug_rad = 5; } catch { /* Frozen copy. */ }
  try { (latest.autopilot!.navigation as { radio_obs_deg: number }).radio_obs_deg = 1; } catch { /* Frozen copy. */ }
  assert.equal(f.store.read()!.autopilot!.kap.kap_heading_bug_rad, 2); assert.equal(f.store.read()!.autopilot!.navigation.radio_obs_deg, 122);
  f.advance(2000); f.store.observe({ ...first, kap_engaged: 0, kap_baro_setting_pa: 100000, kap_baro_units: 1 });
  const off = f.store.read()!.autopilot!; assert.equal(off.kap.kap_engaged, 0); assert.equal(off.kap.kap_baro_setting_pa, 100000); assert.equal(off.kap.kap_baro_units, 1);
});

test('Review never overwrites AP or pose; incomplete/faulted live AP telemetry cannot reuse earlier selections', () => {
  const f = fixture(), live = autopilotState(); f.store.observe(live); const original = f.store.read()!;
  f.store.observe({ ...live, lat_rad: .5, kap_heading_bug_rad: 5 }, { reviewing: true });
  assert.equal(f.store.flush(), false); assert.deepEqual(f.store.read(), original);
  f.store.observe({ ...live, heading_rad: 3, kap_sensor_fault: 1 }); f.store.flush();
  assert.equal(f.store.read()!.heading_rad, 3); assert.equal(f.store.read()!.autopilot, undefined);
  f.store.observe(live); f.store.flush(); assert(f.store.read()!.autopilot);
  f.store.observe({ ...live, heading_rad: 4, radio_obs2_deg: undefined }); f.store.flush();
  assert.equal(f.store.read()!.heading_rad, 4); assert.equal(f.store.read()!.autopilot, undefined);
});

test('CWS is released for reload, while clear and collision discard pending AP together with its pose', () => {
  const f = fixture(), live = autopilotState(); f.store.observe({ ...live, kap_cws: 1 });
  assert.equal(f.store.read()!.autopilot!.kap.kap_cws, 0);
  const saved = f.store.read(); f.store.observe({ ...live, kap_heading_bug_rad: 2 });
  f.store.observe({ ...live, collision_mask: 4 }); assert.equal(f.store.flush(), false); assert.deepEqual(f.store.read(), saved);
  f.store.observe(live); f.store.clear(); assert.equal(f.store.read(), null); assert.equal(f.store.flush(), false);
});

test('location JSON is bounded to 4096 UTF-8 bytes before optional AP salvage', () => {
  const f = fixture();
  f.values.set(FLIGHT_LOCATION_KEY, JSON.stringify(pose) + ' '.repeat(4096)); assert.equal(f.store.read(), null);
  const oversized = JSON.stringify({ ...pose, autopilot: { malformed: '界'.repeat(1400) } });
  assert(oversized.length < 4096); assert(new TextEncoder().encode(oversized).length > 4096);
  f.values.set(FLIGHT_LOCATION_KEY, oversized); assert.equal(f.store.read(), null);
  f.store.observe(autopilotState()); assert(new TextEncoder().encode(f.values.get(FLIGHT_LOCATION_KEY)!).length <= 4096);
});
