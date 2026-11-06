const INITIAL_DISTANCE_M = Math.hypot(30, 11);

/** Camera radius only; the initial position is 30 m behind and 11 m above. */
export const CHASE_DISTANCE = Object.freeze({
  min_m: INITIAL_DISTANCE_M,
  initial_m: INITIAL_DISTANCE_M,
  max_m: 20_000_000,
});

// Camera interaction policy, not aircraft coefficients: begin gently near the
// aircraft, then retain the existing long-range response beyond one kilometre.
const CLOSE_LOG_RATE_PER_PX = .0015;
const FAR_LOG_RATE_PER_PX = .006;
const FAR_DISTANCE_M = 1000;
const FAR_LOG_RADIUS = Math.log(FAR_DISTANCE_M / INITIAL_DISTANCE_M);
const LOG_RATE_SLOPE = (FAR_LOG_RATE_PER_PX - CLOSE_LOG_RATE_PER_PX) / FAR_LOG_RADIUS;
const FAR_TRAVEL_PX = Math.log(FAR_LOG_RATE_PER_PX / CLOSE_LOG_RATE_PER_PX) / LOG_RATE_SLOPE;

/** Integrate the distance-dependent response exactly, making wheel travel additive. */
function wheelTravel_px(distance_m: number): number {
  const logRadius = Math.log(distance_m / INITIAL_DISTANCE_M);
  return logRadius <= FAR_LOG_RADIUS
    ? Math.log1p(LOG_RATE_SLOPE * logRadius / CLOSE_LOG_RATE_PER_PX) / LOG_RATE_SLOPE
    : FAR_TRAVEL_PX + (logRadius - FAR_LOG_RADIUS) / FAR_LOG_RATE_PER_PX;
}

function radiusFromTravel_m(travel_px: number): number {
  const logRadius = travel_px <= FAR_TRAVEL_PX
    ? CLOSE_LOG_RATE_PER_PX * Math.expm1(LOG_RATE_SLOPE * travel_px) / LOG_RATE_SLOPE
    : FAR_LOG_RADIUS + (travel_px - FAR_TRAVEL_PX) * FAR_LOG_RATE_PER_PX;
  return INITIAL_DISTANCE_M * Math.exp(logRadius);
}

/** Positive wheel travel moves the chase camera away without changing its lens. */
export function nextChaseDistance(current_m: number, delta: number, deltaMode = 0, viewportHeight = 900): number {
  const current = Number.isFinite(current_m)
    ? Math.max(CHASE_DISTANCE.min_m, Math.min(CHASE_DISTANCE.max_m, current_m))
    : CHASE_DISTANCE.initial_m;
  const scale = deltaMode === 0 ? 1 : deltaMode === 1 ? 16
    : deltaMode === 2 && Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : NaN;
  if (!Number.isFinite(delta) || !Number.isFinite(scale)) return current;
  const pixels = Math.max(-200, Math.min(200, delta * scale));
  if (pixels === 0) return current;
  const travel = wheelTravel_px(current) + pixels;
  if (travel <= 0) return CHASE_DISTANCE.min_m;
  return Math.max(CHASE_DISTANCE.min_m, Math.min(CHASE_DISTANCE.max_m, radiusFromTravel_m(travel)));
}
