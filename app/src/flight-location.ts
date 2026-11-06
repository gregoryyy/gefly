import { initialBalanceProfile, validInitialBalanceState } from '../../studies/e1-browser/sim/initial-balance.js';
import { WORLD_TERRAIN } from '../../studies/e1-browser/sim/world-terrain.js';
import type { FlightLocation, FlightState } from './types.ts';

export const FLIGHT_LOCATION_KEY = 'gefly.flight-location.v1';
const FIELDS = ['version', 'lat_rad', 'lon_rad', 'alt_msl_m', 'heading_rad', 'mode'];
const DEG = Math.PI / 180;
const WRITE_PERIOD_MS = 2000;
type LocationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** A local launch position, not a dynamics checkpoint or recorded flight. The
 * bounds follow the supported global terrain latitude band; controls/speed are not saved. */
export function validFlightLocation(value: unknown): value is FlightLocation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return FIELDS.every(key => Object.hasOwn(v, key))
    && Object.keys(v).every(key => FIELDS.includes(key) || key === 'initial_balance_profile')
    && (!Object.hasOwn(v, 'initial_balance_profile') || v.initial_balance_profile === 0 || v.initial_balance_profile === 1)
    && (v.mode !== 'ground' || v.initial_balance_profile !== 1)
    && v.version === 1 && (v.mode === 'airborne' || v.mode === 'ground')
    && [v.lat_rad, v.lon_rad, v.alt_msl_m, v.heading_rad].every(n => typeof n === 'number' && Number.isFinite(n))
    && (v.lat_rad as number) > WORLD_TERRAIN.south * DEG && (v.lat_rad as number) < WORLD_TERRAIN.north * DEG
    && (v.lon_rad as number) >= -Math.PI && (v.lon_rad as number) <= Math.PI
    && (v.alt_msl_m as number) >= -500 && (v.alt_msl_m as number) <= 6000
    && (v.heading_rad as number) >= 0 && (v.heading_rad as number) < 2 * Math.PI;
}

export function createFlightLocationStore(options: { storage?: LocationStorage | null; now?: () => number } = {}) {
  let storage: LocationStorage | null;
  try { storage = options.storage === undefined ? globalThis.localStorage : options.storage; }
  catch { storage = null; }
  const now = options.now ?? Date.now;
  let pending: FlightLocation | null = null, lastWrite_ms = -Infinity;
  function flush(): boolean {
    if (!pending || !storage) return false;
    lastWrite_ms = now();
    try { storage.setItem(FLIGHT_LOCATION_KEY, JSON.stringify(pending)); pending = null; return true; }
    catch { return false; }
  }
  return {
    read(): FlightLocation | null {
      try {
        const raw = storage?.getItem(FLIGHT_LOCATION_KEY);
        if (!raw || raw.length > 512) return null;
        const value: unknown = JSON.parse(raw);
        return validFlightLocation(value) ? { ...value } : null;
      } catch { return null; }
    },
    observe(state: Readonly<FlightState>, context: { reviewing?: boolean } = {}): void {
      if (context.reviewing) return;
      if (state.collision_mask) { pending = null; return; }
      if (state.collision_mask !== 0) return;
      // Missing telemetry and flat study/legacy flights cannot establish a safe
      // regional launch mode. In particular, unknown WOW is not airborne zero.
      const wow = [state.gear_nose_wow, state.gear_left_wow, state.gear_right_wow];
      if (!validInitialBalanceState(state) || state.terrain_profile !== 1 || !wow.every(v => v === 0 || v === 1)) return;
      const location: FlightLocation = { version: 1, lat_rad: state.lat_rad, lon_rad: state.lon_rad,
        alt_msl_m: state.alt_msl_m, heading_rad: ((state.heading_rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
        mode: wow.some(v => v === 1) ? 'ground' : 'airborne',
        initial_balance_profile: wow.some(v => v === 1) ? 0 : initialBalanceProfile(state)! };
      if (!validFlightLocation(location)) return;
      pending = location;
      if (now() - lastWrite_ms >= WRITE_PERIOD_MS) flush();
    },
    flush,
    clear(): void { pending = null; lastWrite_ms = -Infinity; try { storage?.removeItem(FLIGHT_LOCATION_KEY); } catch { /* Storage is optional. */ } },
  };
}
