import { boundedCameraLook, type CameraLook, type VectorENU } from './aircraft-orientation.ts';

export const OVERVIEW_DISTANCE = Object.freeze({ min_m: 50, initial_m: 1500, max_m: 20_000_000 });
export function nextOverviewDistance(current_m: number, delta: number, mode = 0, height = 900): number {
  const current = Number.isFinite(current_m) ? Math.max(50, Math.min(20_000_000, current_m)) : 1500;
  const scale = mode === 0 ? 1 : mode === 1 ? 16 : mode === 2 ? height : NaN;
  if (!Number.isFinite(delta) || !Number.isFinite(scale)) return current;
  return Math.max(50, Math.min(20_000_000, current * Math.exp(Math.max(-200, Math.min(200, delta * scale)) * .006)));
}
/** Heading-relative terrain orbit; camera stays above its local horizon. */
export function overviewCameraENU(heading: number, look: Readonly<CameraLook>, distance_m: number): {offset:VectorENU;direction:VectorENU;up:VectorENU} {
  if (!Number.isFinite(heading)) throw Error('Invalid overview heading');
  const bounded = boundedCameraLook(look), angle = heading + bounded.yaw_rad;
  const elevation = Math.max(10, Math.min(89, 50 + bounded.pitch_rad * 180 / Math.PI)) * Math.PI / 180;
  const distance = nextOverviewDistance(distance_m, 0), se = Math.sin(elevation), ce = Math.cos(elevation);
  const sh = Math.sin(angle), ch = Math.cos(angle);
  return { offset: [-sh * distance * ce, -ch * distance * ce, distance * se],
    direction: [sh * ce, ch * ce, -se], up: [sh * se, ch * se, ce] };
}
