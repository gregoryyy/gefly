import { STALL_FIELDS, validStallState } from './types.ts';
import type { FlightState } from './types';

export const SPATIAL_STALL_SOURCE_URL = 'https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml';
export const SPATIAL_STALL_LIMITATIONS = 'Kinematic AoA proxy on a reference span line, not measured flow separation or part-specific stall. Stations use the pinned c172x 36 ft span and AERORP X/Z, with actual CG and air-relative body motion. All stations share the model positive global alpha-max reference and its 85% warning transition; these are not local stall thresholds. Negative-angle stall boundaries are not established; below the positive reference does not mean safe or attached flow. No wing twist, induced flow, downwash, local wind gradient or flap-dependent local boundary is resolved. Tail and fuselage are unknown. No physics or damage threshold is added.';
/** Presentation floor in the local longitudinal airflow plane, not an aircraft limit. */
export const MIN_LOCAL_AIRFLOW_MPS = 1;
const IN_TO_M = 0.0254;
const HALF_SPAN_M = 36 * 0.3048 / 2;

export const STALL_STATIONS = Object.freeze((['left', 'right'] as const).flatMap(side =>
  (['inner', 'mid', 'outer'] as const).map((region, index) => Object.freeze({
    id: `${side}-${region}` as `${'left' | 'right'}-${'inner' | 'mid' | 'outer'}`,
    label: `${side === 'left' ? 'Left' : 'Right'} ${region}`,
    side, span_fraction: (2 * index + 1) / 6,
    structural_x_m: 43.2 * IN_TO_M,
    structural_y_m: (side === 'left' ? -1 : 1) * (2 * index + 1) / 6 * HALF_SPAN_M,
    structural_z_m: 59.4 * IN_TO_M,
  }))));

export type SpatialStallStatus = 'below-reference' | 'near-reference' | 'at-or-above-reference' | 'unavailable';
export interface SpatialStallStationReading {
  station: typeof STALL_STATIONS[number];
  localAlpha_rad: number | null;
  referenceMargin_rad: number | null;
  status: SpatialStallStatus;
  unavailableReason: 'missing-data' | 'reverse-flow' | 'low-airspeed' | 'numerical-range' | null;
}
export interface SpatialStallAwareness {
  status: 'available' | 'unavailable';
  commonAlphaMax_rad: number | null;
  globalAlpha_rad: number | null;
  stallWarning_norm: number | null;
  stallHysteresis_norm: number | null;
  stations: readonly SpatialStallStationReading[];
}

/** Actual CG-relative body velocity at a fixed reference station: V + omega × r.
 * Structural coordinates are aft/right/up; body coordinates are forward/right/down.
 * AoA uses atan2(body down, body forward), matching JSBSim's body-alpha convention.
 */
export function spatialStallAwareness(state: Readonly<FlightState> | null): SpatialStallAwareness {
  const unavailable = (station: typeof STALL_STATIONS[number], reason: SpatialStallStationReading['unavailableReason']): SpatialStallStationReading =>
    ({ station, localAlpha_rad: null, referenceMargin_rad: null, status: 'unavailable', unavailableReason: reason });
  if (!state || !STALL_FIELDS.every(key => typeof state[key] === 'number' && Number.isFinite(state[key])) || !validStallState(state)) {
    return { status: 'unavailable', commonAlphaMax_rad: null, globalAlpha_rad: null,
      stallWarning_norm: null, stallHysteresis_norm: null,
      stations: STALL_STATIONS.map(station => unavailable(station, 'missing-data')) };
  }
  const maximum = state.aero_alpha_max_rad!;
  const stations = STALL_STATIONS.map(station => {
    const x = state.cg_structural_x_m! - station.structural_x_m;
    const y = station.structural_y_m - state.cg_structural_y_m!;
    const z = state.cg_structural_z_m! - station.structural_z_m;
    const u = state.aero_u_mps! + state.aero_q_radps! * z - state.aero_r_radps! * y;
    const v = state.aero_v_mps! + state.aero_r_radps! * x - state.aero_p_radps! * z;
    const w = state.aero_w_mps! + state.aero_p_radps! * y - state.aero_q_radps! * x;
    const longitudinalSpeed = Math.hypot(u, w);
    if (![x, y, z, u, v, w, longitudinalSpeed].every(Number.isFinite)) return unavailable(station, 'numerical-range');
    if (u <= 0) return unavailable(station, 'reverse-flow');
    if (longitudinalSpeed < MIN_LOCAL_AIRFLOW_MPS) return unavailable(station, 'low-airspeed');
    const alpha = Math.atan2(w, u);
    const margin = maximum - alpha;
    if (!Number.isFinite(margin)) return unavailable(station, 'numerical-range');
    return { station, localAlpha_rad: alpha === 0 ? 0 : alpha, referenceMargin_rad: margin,
      status: alpha >= maximum ? 'at-or-above-reference' : alpha >= 0.85 * maximum ? 'near-reference' : 'below-reference',
      unavailableReason: null } satisfies SpatialStallStationReading;
  });
  return { status: stations.some(station => station.status !== 'unavailable') ? 'available' : 'unavailable',
    commonAlphaMax_rad: maximum, globalAlpha_rad: state.aero_alpha_rad!,
    stallWarning_norm: state.stall_warning_norm!, stallHysteresis_norm: state.stall_hysteresis_norm!, stations };
}
