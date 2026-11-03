import type { FlightState } from './types';

export type FlightWarningStatus = 'active' | 'clear' | 'unavailable';
export interface FlightWarnings {
  stall: FlightWarningStatus;
  terrain: FlightWarningStatus;
  terrainClearance_m: number | null;
  terrainClosure_mps: number | null;
  terrainTime_s: number | null;
}

/** Generic simulator-cue policy, not aircraft limits or an installed TAWS model. */
export const TERRAIN_WARNING_POLICY = Object.freeze({
  enterClearance_m: 60, leaveClearance_m: 75,
  enterClosure_mps: 3, leaveClosure_mps: 2.5,
  enterTime_s: 10, leaveTime_s: 12,
  maximumFrameGap_s: .5,
});
const unavailable = (): FlightWarnings => ({ stall: 'unavailable', terrain: 'unavailable',
  terrainClearance_m: null, terrainClosure_mps: null, terrainTime_s: null });
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function contact(state: Readonly<FlightState>): boolean | null {
  if (state.on_ground !== 0 && state.on_ground !== 1) return null;
  const wheels = [state.gear_nose_wow, state.gear_left_wow, state.gear_right_wow];
  if (wheels.some(value => value !== undefined && value !== 0 && value !== 1)) return null;
  for (const [value, maximum] of [[state.structure_contact_mask, 7], [state.collision_mask, 127]] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > maximum)) return null;
  }
  return state.on_ground === 1 || wheels.some(value => value === 1)
    || (state.structure_contact_mask ?? 0) > 0 || (state.collision_mask ?? 0) > 0;
}

interface Sample { step: number; time_s: number; clearance_m: number }

/**
 * Consume actual worker frames, not interpolated presentation samples.
 * Stall uses the existing native systems/stall-warn-norm exposed by gf_stall_state;
 * no fixed indicated-airspeed threshold or aircraft calibration is invented.
 * Terrain is local AGL closure: max(vertical descent, observed clearance loss).
 * It can notice rising terrain below the aircraft but does not scan ahead, know
 * obstacles/runways or distinguish a planned landing. Normal shallow descent
 * below the closure threshold does not activate it. These are simulator cues.
 */
export function createFlightWarningMonitor(): {
  update(state: Readonly<FlightState> | null): FlightWarnings;
  reset(): void;
} {
  let previous: Sample | null = null;
  let terrainActive = false;
  let lastFrame: { step: number; time_s: number; grounded: boolean | null; clearance_m: number | undefined; down_mps: number | undefined; result: FlightWarnings } | null = null;

  function reset(): void { previous = null; terrainActive = false; lastFrame = null; }

  return {
    reset,
    update(state) {
      if (!state || !Number.isSafeInteger(state.step) || state.step < 0 || !finite(state.t_s) || state.t_s < 0) {
        reset(); return unavailable();
      }
      const grounded = contact(state);
      const stallAvailable = grounded !== null && finite(state.stall_warning_norm) && state.stall_warning_norm >= 0;
      const terrainAvailable = grounded !== null && finite(state.ground_agl_m) && state.ground_agl_m >= 0
        && finite(state.ground_down_mps);
      const result = unavailable();
      if (stallAvailable) result.stall = !grounded && state.stall_warning_norm! > 0 ? 'active' : 'clear';
      // Cache the temporal terrain component independently of the stateless
      // native stall signal. Missing/invalid stall data must not restart a valid
      // terrain latch, and stall availability may change without terrain changes.
      if (lastFrame && state.step === lastFrame.step && state.t_s === lastFrame.time_s
        && lastFrame.grounded === grounded && Object.is(lastFrame.clearance_m, state.ground_agl_m)
        && Object.is(lastFrame.down_mps, state.ground_down_mps)) {
        result.terrain = lastFrame.result.terrain;
        result.terrainClearance_m = lastFrame.result.terrainClearance_m;
        result.terrainClosure_mps = lastFrame.result.terrainClosure_mps;
        result.terrainTime_s = lastFrame.result.terrainTime_s;
        lastFrame.result = { ...result };
        return result;
      }

      if (!terrainAvailable) {
        previous = null; terrainActive = false;
      } else {
        const clearance_m = state.ground_agl_m!;
        const continuous = previous !== null && state.step > previous.step && state.t_s > previous.time_s
          && state.t_s - previous.time_s <= TERRAIN_WARNING_POLICY.maximumFrameGap_s;
        if (!continuous) terrainActive = false;
        const observedClosure_mps = continuous ? (previous!.clearance_m - clearance_m) / (state.t_s - previous!.time_s) : 0;
        const closure_mps = Math.max(0, state.ground_down_mps!, observedClosure_mps);
        const time_s = closure_mps > 0 ? clearance_m / closure_mps : null;
        // Overflow/underflow cannot become an active or reassuring clear cue.
        if (!finite(closure_mps) || time_s !== null && !finite(time_s)) {
          previous = null; terrainActive = false;
        } else {
          result.terrainClearance_m = clearance_m;
          result.terrainClosure_mps = closure_mps;
          result.terrainTime_s = time_s;
          if (grounded) terrainActive = false;
          else if (terrainActive) {
            terrainActive = clearance_m <= TERRAIN_WARNING_POLICY.leaveClearance_m
              && closure_mps >= TERRAIN_WARNING_POLICY.leaveClosure_mps
              && time_s !== null && time_s <= TERRAIN_WARNING_POLICY.leaveTime_s;
          } else {
            terrainActive = clearance_m <= TERRAIN_WARNING_POLICY.enterClearance_m
              && closure_mps >= TERRAIN_WARNING_POLICY.enterClosure_mps
              && time_s !== null && time_s <= TERRAIN_WARNING_POLICY.enterTime_s;
          }
          result.terrain = terrainActive ? 'active' : 'clear';
          // Ground contact is not a baseline for a later airborne closure spike.
          previous = grounded ? null : { step: state.step, time_s: state.t_s, clearance_m };
        }
      }
      lastFrame = { step: state.step, time_s: state.t_s, grounded,
        clearance_m: state.ground_agl_m, down_mps: state.ground_down_mps, result: { ...result } };
      return result;
    },
  };
}
