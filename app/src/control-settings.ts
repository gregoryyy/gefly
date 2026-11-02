import type { Controls } from './types';

/** Dimensionless command gains; these do not change the aircraft model. */
export interface ControlSettings { pitch: number; roll: number; rudder: number }

export const DEFAULT_CONTROL_SETTINGS = Object.freeze({ pitch: 1, roll: 1, rudder: 1 });
export const GENTLE_CONTROL_SETTINGS = Object.freeze({ pitch: 0.5, roll: 0.5, rudder: 0.7 });

function requireRange(name: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and within [${min}, ${max}]`);
  }
}

const clampAxis = (value: number): number => Math.max(-1, Math.min(1, value));

/** Scale normalized pilot commands, then add the separate study roll offset. */
export function applyControlSettings(
  raw: Controls, settings: ControlSettings, rollOffset: number,
): Controls {
  requireRange('elevator', raw.elevator, -1, 1);
  requireRange('aileron', raw.aileron, -1, 1);
  requireRange('rudder', raw.rudder, -1, 1);
  requireRange('throttle', raw.throttle, 0, 1);
  requireRange('pitch gain', settings.pitch, 0.25, 1.5);
  requireRange('roll gain', settings.roll, 0.25, 1.5);
  requireRange('rudder gain', settings.rudder, 0.25, 1.5);
  requireRange('roll offset', rollOffset, -1, 1);

  return {
    elevator: clampAxis(raw.elevator * settings.pitch),
    aileron: clampAxis(raw.aileron * settings.roll + rollOffset),
    rudder: clampAxis(raw.rudder * settings.rudder),
    throttle: raw.throttle,
  };
}
