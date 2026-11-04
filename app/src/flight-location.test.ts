import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlightLocationStore, FLIGHT_LOCATION_KEY, validFlightLocation } from './flight-location.ts';
import type { FlightLocation, FlightState } from './types.ts';
const pose: FlightLocation = { version: 1, lat_rad: 49.87 * Math.PI / 180, lon_rad: 8.65 * Math.PI / 180, alt_msl_m: 900, heading_rad: 2.5, mode: 'airborne' };
const state = { ...pose, step: 1, t_s: 1, tas_mps: 40, roll_rad: 0, pitch_rad: 0, terrain_profile: 1,
  collision_mask: 0, gear_nose_wow: 0, gear_left_wow: 0, gear_right_wow: 0 } as FlightState;
function fixture() {
  const values = new Map<string, string>(); let time = 0, writes = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); writes++; }, removeItem: (key: string) => { values.delete(key); } };
  const store = createFlightLocationStore({ storage, now: () => time });
  return { store, values, storage, advance: (ms: number) => { time += ms; }, writes: () => writes };
}
test('versioned local position rejects corrupt/extra/nonfinite/outside-region input', () => {
  assert(validFlightLocation(pose));
  for (const value of [null, [], {}, { ...pose, version: 2 }, { ...pose, extra: 'execute' }, { ...pose, mode: ['ground'] },
    { ...pose, lat_rad: NaN }, { ...pose, lon_rad: 0 }, { ...pose, alt_msl_m: 6001 }, { ...pose, heading_rad: 2 * Math.PI }]) assert(!validFlightLocation(value));
  const { store, values } = fixture();
  for (const raw of ['{bad', 'x'.repeat(513), JSON.stringify({ ...pose, mode: 'script' })]) { values.set(FLIGHT_LOCATION_KEY, raw); assert.equal(store.read(), null); }
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
