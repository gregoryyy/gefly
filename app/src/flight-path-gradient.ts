/** Presentation floor only; this does not alter aircraft physics or define a flight limit. */
export const MIN_HORIZONTAL_GROUNDSPEED_MPS = 1;

interface GroundVelocity {
  ground_forward_mps?: number;
  ground_side_mps?: number;
  ground_down_mps?: number;
}
export interface FlightPathGradient {
  status: 'available' | 'missing-data' | 'low-groundspeed' | 'numerical-range';
  gradient_percent: number | null;
  horizontal_groundspeed_mps: number | null;
  vertical_speed_up_mps: number | null;
}

/** Ground-track slope: positive climb, negative descent, not pitch or ILS deviation.
 * Forward/right are horizontal heading-aligned axes; down is NED vertical.
 */
export function flightPathGradient(state: Readonly<GroundVelocity> | null): FlightPathGradient {
  const unavailable: FlightPathGradient = { status: 'missing-data', gradient_percent: null,
    horizontal_groundspeed_mps: null, vertical_speed_up_mps: null };
  if (!state || ![state.ground_forward_mps, state.ground_side_mps, state.ground_down_mps]
    .every(value => typeof value === 'number' && Number.isFinite(value))) return unavailable;
  const horizontal = Math.hypot(state.ground_forward_mps!, state.ground_side_mps!);
  const vertical = state.ground_down_mps === 0 ? 0 : -state.ground_down_mps!;
  if (!Number.isFinite(horizontal)) return { ...unavailable, status: 'numerical-range' };
  const values = { horizontal_groundspeed_mps: horizontal, vertical_speed_up_mps: vertical };
  if (horizontal < MIN_HORIZONTAL_GROUNDSPEED_MPS) return { ...values, status: 'low-groundspeed', gradient_percent: null };
  const percent = (vertical / horizontal) * 100;
  if (!Number.isFinite(percent)) return { ...values, status: 'numerical-range', gradient_percent: null };
  return { ...values, status: 'available', gradient_percent: percent === 0 ? 0 : percent };
}
