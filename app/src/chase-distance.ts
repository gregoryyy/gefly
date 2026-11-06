const INITIAL_DISTANCE_M = Math.hypot(30, 11);

/** Camera radius only; the initial position is 30 m behind and 11 m above. */
export const CHASE_DISTANCE = Object.freeze({
  min_m: INITIAL_DISTANCE_M,
  initial_m: INITIAL_DISTANCE_M,
  max_m: 20_000_000,
});

/** Positive wheel travel moves the chase camera away without changing its lens. */
export function nextChaseDistance(current_m: number, delta: number, deltaMode = 0, viewportHeight = 900): number {
  const current = Number.isFinite(current_m)
    ? Math.max(CHASE_DISTANCE.min_m, Math.min(CHASE_DISTANCE.max_m, current_m))
    : CHASE_DISTANCE.initial_m;
  const scale = deltaMode === 0 ? 1 : deltaMode === 1 ? 16
    : deltaMode === 2 && Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : NaN;
  if (!Number.isFinite(delta) || !Number.isFinite(scale)) return current;
  const pixels = Math.max(-200, Math.min(200, delta * scale));
  return Math.max(CHASE_DISTANCE.min_m, Math.min(CHASE_DISTANCE.max_m, current * Math.exp(pixels * .006)));
}
