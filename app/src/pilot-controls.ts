/**
 * Keyboard/button pilot-axis mapping and the recorded control-position view.
 *
 * Sign conventions of the normalized commands sent to the worker (JSBSim
 * `fcs/*-cmd-norm`, pinned generic c172x model):
 * - elevator: positive pushes the nose down (ArrowUp / stick forward).
 * - aileron: positive banks right (ArrowRight / stick right).
 * - rudder: positive yaws LEFT. Q is left rudder and W is right rudder. The
 *   bridge couples nosewheel steering as `steer = -rudder` for this reason
 *   (studies/e1-browser/sim/bridge.cpp gf_set_inputs), and the native rollout
 *   fixture tests/landing-physics.mjs asserts that +0.35 turns the heading
 *   left and -0.35 turns it right. These are generic-model conventions, not a
 *   calibrated C172S control rig.
 * UI command magnitudes below are input presets, not aircraft coefficients.
 */
export const KEY_ELEVATOR_NORM = 0.35;
export const KEY_AILERON_NORM = 0.45;
export const KEY_RUDDER_NORM = 0.35;
export const STICK_ELEVATOR_GAIN = 0.4;
export const STICK_AILERON_GAIN = 0.5;
/** Positive rudder_cmd_norm yaws left in the pinned model. */
export const RUDDER_LEFT_SIGN = 1 as const;
export const LEFT_RUDDER_CODE = 'KeyQ';
export const RIGHT_RUDDER_CODE = 'KeyW';

const clampAxis = (value: number) => Math.max(-1, Math.min(1, value));

/** Raw pilot axes before Options gains and the study roll offset. */
export function pilotAxes(held: (code: string) => boolean, stickX = 0, stickY = 0): { elevator: number; aileron: number; rudder: number } {
  const x = Number.isFinite(stickX) ? stickX : 0, y = Number.isFinite(stickY) ? stickY : 0;
  return {
    elevator: clampAxis((held('ArrowUp') ? KEY_ELEVATOR_NORM : 0) - (held('ArrowDown') ? KEY_ELEVATOR_NORM : 0) + y * STICK_ELEVATOR_GAIN),
    aileron: clampAxis((held('ArrowRight') ? KEY_AILERON_NORM : 0) - (held('ArrowLeft') ? KEY_AILERON_NORM : 0) + x * STICK_AILERON_GAIN),
    rudder: RUDDER_LEFT_SIGN * ((held(LEFT_RUDDER_CODE) ? KEY_RUDDER_NORM : 0) - (held(RIGHT_RUDDER_CODE) ? KEY_RUDDER_NORM : 0)),
  };
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * Which on-screen control keys a recorded sample shows as held. A missing or
 * non-finite field shows no key held; it never implies a centred command.
 */
export function recordedHeldKeys(state: Readonly<Partial<Record<'aileron_cmd_norm' | 'elevator_cmd_norm' | 'rudder_cmd_norm' | 'brake_left_norm' | 'brake_right_norm', number>>>): Record<string, boolean> {
  const sign = (value: unknown) => finite(value) ? Math.sign(value) : 0;
  const rudder = sign(state.rudder_cmd_norm) * RUDDER_LEFT_SIGN;
  const brakes = [state.brake_left_norm, state.brake_right_norm].filter(finite);
  return {
    ArrowLeft: sign(state.aileron_cmd_norm) < 0, ArrowRight: sign(state.aileron_cmd_norm) > 0,
    ArrowUp: sign(state.elevator_cmd_norm) > 0, ArrowDown: sign(state.elevator_cmd_norm) < 0,
    [LEFT_RUDDER_CODE]: rudder > 0, [RIGHT_RUDDER_CODE]: rudder < 0,
    KeyB: brakes.length > 0 && Math.max(...brakes) > 0,
  };
}

export interface RecordedControlView {
  /** Throttle lever percent, or null when the sample has no recorded throttle. */
  throttle_percent: number | null;
  /** Flap lever degrees, or null when the sample has no recorded flap command. */
  flap_deg: number | null;
  /** Stick knob offset in normalized units, or null unless both axes were recorded. */
  stick: { x: number; y: number } | null;
}

/** Positions shown in Review. Unavailable fields stay null, never idle/UP/centred. */
export function recordedControlView(state: Readonly<Partial<Record<'throttle_norm' | 'flap_command_norm' | 'aileron_cmd_norm' | 'elevator_cmd_norm', number>>>): RecordedControlView {
  const throttle = finite(state.throttle_norm) && state.throttle_norm >= 0 && state.throttle_norm <= 1 ? state.throttle_norm * 100 : null;
  const flap = finite(state.flap_command_norm) && state.flap_command_norm >= 0 && state.flap_command_norm <= 1 ? state.flap_command_norm * 30 : null;
  const stick = finite(state.aileron_cmd_norm) && finite(state.elevator_cmd_norm)
    ? { x: clampAxis(state.aileron_cmd_norm), y: clampAxis(state.elevator_cmd_norm) } : null;
  return { throttle_percent: throttle, flap_deg: flap, stick };
}
