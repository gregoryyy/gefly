import { CHASE_DISTANCE, nextChaseDistance } from './chase-distance.ts';

/** Aircraft body directions resolved in local east/north/up coordinates. */
export type VectorENU = readonly [east: number, north: number, up: number];
export interface AircraftBasisENU {
  readonly forward: VectorENU;
  readonly right: VectorENU;
  readonly up: VectorENU;
}
export interface CameraLook { yaw_rad: number; pitch_rad: number; fov_rad?: number; distance_m?: number }
export interface CameraPoseENU {
  readonly direction: VectorENU;
  readonly up: VectorENU;
}
export const MAX_LOOK_PITCH_RAD = 70 * Math.PI / 180;
const COCKPIT_LOOK_DOWN_RAD = 8 * Math.PI / 180;
const CHASE_HORIZONTAL_M = 30;
const CHASE_HEIGHT_M = 11;

function finite(...values: number[]): void {
  if (!values.every(Number.isFinite)) throw new RangeError('Aircraft/camera angles must be finite radians');
}

/** True heading clockwise from north, pitch nose up, roll right wing down. */
export function aircraftBasisENU(heading_rad: number, pitch_rad: number, roll_rad: number): AircraftBasisENU {
  finite(heading_rad, pitch_rad, roll_rad);
  const sh = Math.sin(heading_rad), ch = Math.cos(heading_rad);
  const sp = Math.sin(pitch_rad), cp = Math.cos(pitch_rad);
  const sr = Math.sin(roll_rad), cr = Math.cos(roll_rad);
  return {
    forward: [sh * cp, ch * cp, sp],
    right: [ch * cr + sh * sp * sr, -sh * cr + ch * sp * sr, -cp * sr],
    up: [ch * sr - sh * sp * cr, -sh * sr - ch * sp * cr, cp * cr],
  };
}

/** View-only input bounds; never fed back into flight state. */
export function boundedCameraLook(look?: Readonly<CameraLook>): CameraLook {
  if (!look) return { yaw_rad: 0, pitch_rad: 0 };
  finite(look.yaw_rad, look.pitch_rad);
  return {
    yaw_rad: Math.max(-Math.PI, Math.min(Math.PI, look.yaw_rad)),
    pitch_rad: Math.max(-MAX_LOOK_PITCH_RAD, Math.min(MAX_LOOK_PITCH_RAD, look.pitch_rad)),
  };
}

function combine(a: VectorENU, aScale: number, b: VectorENU, bScale: number): VectorENU {
  return [a[0] * aScale + b[0] * bScale, a[1] * aScale + b[1] * bScale, a[2] * aScale + b[2] * bScale];
}

/** Preserve ordinary look, then smoothly map the outer raw range to the poles. */
function polePitch(raw: number, neutral: number): number {
  const core = 30 * Math.PI / 180;
  const amount = Math.max(0, (Math.abs(raw) - core) / (MAX_LOOK_PITCH_RAD - core));
  const smooth = amount * amount * (3 - 2 * amount);
  const sign = Math.sign(raw);
  return neutral + raw + (sign * Math.PI / 2 - neutral - sign * MAX_LOOK_PITCH_RAD) * smooth;
}

/** Camera gaze relative to aircraft body axes; zero retains the slight downward view. */
export function cockpitCameraENU(basis: AircraftBasisENU, look?: Readonly<CameraLook>): CameraPoseENU {
  const bounded = boundedCameraLook(look);
  const cy = Math.cos(bounded.yaw_rad), sy = Math.sin(bounded.yaw_rad);
  const pitch = polePitch(bounded.pitch_rad, -COCKPIT_LOOK_DOWN_RAD);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const horizontal = combine(basis.forward, cy, basis.right, sy);
  return {
    direction: combine(horizontal, cp, basis.up, sp),
    up: combine(basis.up, cp, horizontal, -sp),
  };
}

/** Heading-relative orbit; omitted distance retains the original close chase view. */
export function chaseCameraENU(
  heading_rad: number, look?: Readonly<CameraLook>, distance_m = CHASE_DISTANCE.initial_m,
): CameraPoseENU & { readonly offset: VectorENU } {
  finite(heading_rad);
  const bounded = boundedCameraLook(look);
  const heading = heading_rad + bounded.yaw_rad;
  const radius = nextChaseDistance(distance_m, 0);
  // Analytic direction/up remain perpendicular even at the exact vertical poles.
  const elevation = polePitch(bounded.pitch_rad, Math.atan2(CHASE_HEIGHT_M, CHASE_HORIZONTAL_M));
  const sh = Math.sin(heading), ch = Math.cos(heading);
  const se = Math.sin(elevation), ce = Math.cos(elevation);
  return {
    offset: [-sh * radius * ce, -ch * radius * ce, radius * se],
    direction: [sh * ce, ch * ce, -se],
    up: [sh * se, ch * se, ce],
  };
}
