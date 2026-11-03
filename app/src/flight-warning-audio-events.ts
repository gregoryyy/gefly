import type { FlightWarnings } from './flight-warnings';

export interface FlightWarningAudioFrame {
  warnings: Readonly<FlightWarnings>;
  live: boolean;
  step: number;
  time_s: number;
  kapEngaged: 0 | 1 | null;
}

/** Presentation continuity, not an aircraft or autopilot operating tolerance. */
export function createFlightWarningAudioEvents(): {
  update(frame: FlightWarningAudioFrame | undefined, enabled: boolean): {
    stall: boolean; terrain: boolean; disconnected: boolean; continuous: boolean;
  };
} {
  let previous: { step: number; time_s: number; kapEngaged: 0 | 1 | null } | null = null;
  return {
    update(frame, enabled) {
      if (!enabled || !frame?.live || !Number.isSafeInteger(frame.step) || frame.step < 0
        || !Number.isFinite(frame.time_s) || frame.time_s < 0) {
        previous = null;
        return { stall: false, terrain: false, disconnected: false, continuous: false };
      }
      const continuous = previous !== null && (
        (frame.step === previous.step && frame.time_s === previous.time_s)
        || (frame.step > previous.step && frame.time_s > previous.time_s && frame.time_s - previous.time_s <= .5));
      // Paused avionics commands can replace the selected frame without stepping
      // physics. Only an observed live edge may produce the one-shot cue.
      const disconnected = continuous && previous?.kapEngaged === 1 && frame.kapEngaged === 0;
      previous = { step: frame.step, time_s: frame.time_s,
        kapEngaged: frame.kapEngaged === 0 || frame.kapEngaged === 1 ? frame.kapEngaged : null };
      return { stall: frame.warnings.stall === 'active', terrain: frame.warnings.terrain === 'active', disconnected, continuous };
    },
  };
}
