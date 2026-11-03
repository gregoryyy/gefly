import type { Controls } from './types';

/** Dimensionless command gains; these do not change the aircraft model. */
export interface ControlSettings { pitch: number; roll: number; rudder: number; brake?: number; coordinatedRudder?: boolean }

export const DEFAULT_CONTROL_SETTINGS = Object.freeze({ pitch: 1, roll: 1, rudder: 1, brake: 0.25, coordinatedRudder: false });
export const GENTLE_CONTROL_SETTINGS = Object.freeze({ pitch: 0.5, roll: 0.5, rudder: 0.7, brake: 0.25, coordinatedRudder: false });

function requireRange(name: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and within [${min}, ${max}]`);
  }
}

const clampAxis = (value: number): number => Math.max(-1, Math.min(1, value));

/** Scale normalized pilot commands, then add the separate study roll offset. */
export function applyControlSettings(
  raw: Controls, settings: ControlSettings, rollOffset: number, parkingBrake = false,
): Controls {
  requireRange('elevator', raw.elevator, -1, 1);
  requireRange('aileron', raw.aileron, -1, 1);
  requireRange('rudder', raw.rudder, -1, 1);
  requireRange('throttle', raw.throttle, 0, 1);
  if (raw.flap_norm !== undefined) requireRange('flaps', raw.flap_norm, 0, 1);
  if (raw.brake_norm !== undefined) requireRange('wheel brake', raw.brake_norm, 0, 1);
  if (raw.pitch_trim_norm !== undefined) requireRange('pitch trim', raw.pitch_trim_norm, -1, 1);
  if (raw.mixture_norm !== undefined) requireRange('mixture', raw.mixture_norm, 0, 1);
  if (raw.mixture_auto !== undefined && typeof raw.mixture_auto !== 'boolean') throw new TypeError('Mixture automatic mode must be boolean');
  if (raw.pilot_override !== undefined && typeof raw.pilot_override !== 'boolean') throw new TypeError('Pilot override must be boolean');
  if (raw.engine_running !== undefined && typeof raw.engine_running !== 'boolean') throw new TypeError('Engine command must be boolean');
  if (typeof parkingBrake !== 'boolean') throw new TypeError('Parking brake must be boolean');
  if (settings.coordinatedRudder !== undefined && typeof settings.coordinatedRudder !== 'boolean') throw new TypeError('Rudder link must be boolean');
  requireRange('pitch gain', settings.pitch, 0.25, 1.5);
  requireRange('roll gain', settings.roll, 0.25, 1.5);
  requireRange('rudder gain', settings.rudder, 0.25, 1.5);
  const brakeGain = settings.brake === undefined ? DEFAULT_CONTROL_SETTINGS.brake : settings.brake;
  requireRange('wheel brake gain', brakeGain, 0, 1);
  requireRange('roll offset', rollOffset, -1, 1);

  // Positive aileron banks right in the pinned model; positive rudder yaws
  // left. Mix only deliberate pilot roll, never the study offset or AP servo.
  // A nonzero pedal/key command retains full manual rudder authority.
  const rudder = settings.coordinatedRudder && raw.rudder === 0
    ? -raw.aileron * settings.roll : raw.rudder;
  const brake = Math.max((raw.brake_norm ?? 0) * brakeGain, parkingBrake ? 1 : 0);

  return {
    elevator: clampAxis(raw.elevator * settings.pitch),
    aileron: clampAxis(raw.aileron * settings.roll + rollOffset),
    rudder: clampAxis(rudder * settings.rudder),
    throttle: raw.throttle,
    ...(raw.pilot_override !== undefined ? { pilot_override: raw.pilot_override } : {}),
    ...(raw.engine_running !== undefined ? { engine_running: raw.engine_running } : {}),
    ...(raw.pitch_trim_norm !== undefined ? { pitch_trim_norm: raw.pitch_trim_norm } : {}),
    ...(raw.flap_norm !== undefined ? { flap_norm: raw.flap_norm } : {}),
    ...(raw.brake_norm !== undefined || parkingBrake ? { brake_norm: brake } : {}),
    ...(raw.mixture_norm !== undefined ? { mixture_norm: raw.mixture_norm } : {}),
    ...(raw.mixture_auto !== undefined ? { mixture_auto: raw.mixture_auto } : {}),
  };
}
