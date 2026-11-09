import { STALL_FIELDS, validStallState } from './types.ts';
import type { FlightState } from './types.ts';
import { flightWarningContact } from './flight-warnings.ts';

/** Wall-time presentation policy, never an aircraft threshold or native latch. */
export const STALL_WARNING_MINIMUM_MS = 200;

export interface StallWarningDeliveryContext { now_ms: number; enabled: boolean }
export interface StallWarningPresentation { active: boolean; recent: boolean }
type DeliveryState = Readonly<FlightState> & {
  stall_warning_peak_norm?: number;
  stall_warning_peak_step?: number;
};

/**
 * Transfer genuine native positives across state publication and RAF boundaries.
 * Call accept for each accepted live frame; present consumes pending events on
 * RAF. Disabled delivery cancels immediately without forgetting consumed event
 * identities. Only reset begins a new worker epoch. Review uses the raw monitor.
 */
export function createStallWarningDelivery(): {
  accept(state: DeliveryState | null, context: StallWarningDeliveryContext): void;
  present(context: StallWarningDeliveryContext): StallWarningPresentation;
  reset(): void;
} {
  let previous: { step: number; time_s: number; norm: number | null } | null = null;
  let lastClock_ms: number | null = null;
  let highestPeakStep = -1, coveredPositiveStep = -1;
  let rawActive = false, pending = false;
  let until_ms: number | null = null;

  function cancel(): void { pending = false; until_ms = null; }
  function eligible(context: StallWarningDeliveryContext): boolean {
    if (!Number.isFinite(context.now_ms) || context.now_ms < 0
      || lastClock_ms !== null && context.now_ms < lastClock_ms) {
      cancel(); rawActive = false; return false;
    }
    lastClock_ms = context.now_ms;
    if (!context.enabled) { cancel(); return false; }
    return true;
  }

  return {
    accept(state, context) {
      const enabled = eligible(context);
      if (!state || !Number.isSafeInteger(state.step) || state.step < 0
        || !Number.isFinite(state.t_s) || state.t_s < 0) {
        cancel(); rawActive = false; return;
      }
      if (previous && (state.step < previous.step || state.t_s < previous.time_s
        || state.step === previous.step && (state.t_s !== previous.time_s
          || previous.norm !== null && state.stall_warning_norm !== previous.norm)
        || state.step > previous.step && state.t_s <= previous.time_s)) {
        cancel(); rawActive = false; return;
      }
      const previousStep = previous?.step ?? -1;
      // validStallState deliberately accepts an entirely absent legacy group;
      // delivery requires all thirteen actual native values instead.
      const group = Object.fromEntries(STALL_FIELDS.map(key => [key, state[key]]));
      if (!STALL_FIELDS.every(key => typeof group[key] === 'number' && Number.isFinite(group[key]))
        || !validStallState(group) || flightWarningContact(state) !== false) {
        cancel(); rawActive = false;
        previous = { step: state.step, time_s: state.t_s, norm: null }; return;
      }
      const norm = state.stall_warning_norm!;
      const current = norm > 0;
      const peak = state.stall_warning_peak_norm, peakStep = state.stall_warning_peak_step;
      const hasPeak = peak !== undefined || peakStep !== undefined;
      const validPeak = typeof peak === 'number' && Number.isFinite(peak) && peak > 0
        && Number.isSafeInteger(peakStep) && peakStep! >= 0 && peakStep! <= state.step;
      if (hasPeak && !validPeak) cancel();
      else if (validPeak && peakStep! > highestPeakStep) {
        // A delayed/repeated pair cannot reintroduce an event from an already
        // accepted publication interval or one covered by a raw positive.
        if (enabled && !current && peakStep! > previousStep && peakStep! > coveredPositiveStep) pending = true;
        highestPeakStep = peakStep!;
      }
      if (enabled && current && !rawActive && state.step > coveredPositiveStep) pending = true;
      if (current) coveredPositiveStep = Math.max(coveredPositiveStep, state.step);
      rawActive = current;
      previous = { step: state.step, time_s: state.t_s, norm };
    },
    present(context) {
      if (!eligible(context)) return { active: false, recent: false };
      if (pending) { until_ms = context.now_ms + STALL_WARNING_MINIMUM_MS; pending = false; }
      const held = until_ms !== null && context.now_ms < until_ms;
      if (!held) until_ms = null;
      return { active: rawActive || held, recent: !rawActive && held };
    },
    reset() {
      cancel(); rawActive = false; previous = null; lastClock_ms = null;
      highestPeakStep = coveredPositiveStep = -1;
    },
  };
}
