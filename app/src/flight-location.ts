import { initialBalanceProfile, validInitialBalanceState } from '../../studies/e1-browser/sim/initial-balance.js';
import { WORLD_TERRAIN } from '../../studies/e1-browser/sim/world-terrain.js';
import { captureAutopilotReload, copyAutopilotReload, validAutopilotReload } from '../../studies/e1-browser/sim/autopilot-reload.js';
import type { FlightLocation, FlightState } from './types.ts';

export const FLIGHT_LOCATION_KEY = 'gefly.flight-location.v1';
const FIELDS = ['version', 'lat_rad', 'lon_rad', 'alt_msl_m', 'heading_rad', 'mode'];
const DEG = Math.PI / 180;
const WRITE_PERIOD_MS = 2000;
const MAX_BYTES = 4096;
type LocationStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const OPTIONAL = ['initial_balance_profile', 'autopilot'];
function locationFields(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return FIELDS.every(key => Object.hasOwn(value, key))
    && Object.keys(value).every(key => FIELDS.includes(key) || OPTIONAL.includes(key));
}

/** A local launch position plus optional initial-balance identity and AP
 * selections, not a native checkpoint. The bounds follow the supported global
 * terrain latitude band; other controls, airspeed and flight history are not saved. */
export function validFlightLocation(value: unknown): value is FlightLocation {
  if (!locationFields(value)) return false;
  const v = value;
  return (!Object.hasOwn(v, 'autopilot') || validAutopilotReload(v.autopilot))
    && (!Object.hasOwn(v, 'initial_balance_profile') || v.initial_balance_profile === 0 || v.initial_balance_profile === 1)
    && (v.mode !== 'ground' || v.initial_balance_profile !== 1)
    && v.version === 1 && (v.mode === 'airborne' || v.mode === 'ground')
    && [v.lat_rad, v.lon_rad, v.alt_msl_m, v.heading_rad].every(n => typeof n === 'number' && Number.isFinite(n))
    && (v.lat_rad as number) > WORLD_TERRAIN.south * DEG && (v.lat_rad as number) < WORLD_TERRAIN.north * DEG
    && (v.lon_rad as number) >= -Math.PI && (v.lon_rad as number) <= Math.PI
    && (v.alt_msl_m as number) >= -500 && (v.alt_msl_m as number) <= 6000
    && (v.heading_rad as number) >= 0 && (v.heading_rad as number) < 2 * Math.PI;
}

function positionOnly(value: Record<string, unknown>): FlightLocation {
  const keys = Object.hasOwn(value, 'initial_balance_profile') ? [...FIELDS, 'initial_balance_profile'] : FIELDS;
  return Object.fromEntries(keys.map(key => [key, value[key]])) as unknown as FlightLocation;
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
    try {
      const raw = JSON.stringify(pending);
      if (new TextEncoder().encode(raw).length > MAX_BYTES) return false;
      storage.setItem(FLIGHT_LOCATION_KEY, raw); pending = null; return true;
    }
    catch { return false; }
  }
  return {
    read(): FlightLocation | null {
      try {
        const raw = storage?.getItem(FLIGHT_LOCATION_KEY);
        if (!raw || raw.length > MAX_BYTES || new TextEncoder().encode(raw).length > MAX_BYTES) return null;
        const value: unknown = JSON.parse(raw);
        if (!locationFields(value)) return null;
        const location = positionOnly(value);
        if (!validFlightLocation(location)) return null;
        // A damaged optional AP selection must not discard a valid launch pose.
        if (validAutopilotReload(value.autopilot)) location.autopilot = copyAutopilotReload(value.autopilot);
        return location;
      } catch { return null; }
    },
    observe(state: Readonly<FlightState>, context: { reviewing?: boolean } = {}): void {
      if (context.reviewing) return;
      if (state.collision_mask) { pending = null; return; }
      if (state.collision_mask !== 0) return;
      // Missing telemetry and flat study/legacy flights cannot establish a safe
      // world-terrain launch mode. In particular, unknown WOW is not airborne zero.
      const wow = [state.gear_nose_wow, state.gear_left_wow, state.gear_right_wow];
      if (!validInitialBalanceState(state) || state.terrain_profile !== 1 || !wow.every(v => v === 0 || v === 1)) return;
      const location: FlightLocation = { version: 1, lat_rad: state.lat_rad, lon_rad: state.lon_rad,
        alt_msl_m: state.alt_msl_m, heading_rad: ((state.heading_rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
        mode: wow.some(v => v === 1) ? 'ground' : 'airborne',
        initial_balance_profile: wow.some(v => v === 1) ? 0 : initialBalanceProfile(state)! };
      const autopilot = captureAutopilotReload(state);
      if (autopilot) location.autopilot = autopilot;
      if (!validFlightLocation(location)) return;
      pending = location;
      if (now() - lastWrite_ms >= WRITE_PERIOD_MS) flush();
    },
    flush,
    clear(): void { pending = null; lastWrite_ms = -Infinity; try { storage?.removeItem(FLIGHT_LOCATION_KEY); } catch { /* Storage is optional. */ } },
  };
}
