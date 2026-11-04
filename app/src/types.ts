import { validSystemsMask } from './aircraft-systems.ts';
import type { TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { ALERT_FIELDS, validAlertState } from '../../studies/e1-browser/sim/altitude-alert.js';
import type { AltitudeAlertSnapshot } from '../../studies/e1-browser/sim/altitude-alert.js';
export { ALERT_FIELDS, validAlertState };
import { KAP_FIELDS, validKapState } from '../../studies/e1-browser/sim/kap140.js';
import type { KapCommand, KapSnapshot } from '../../studies/e1-browser/sim/kap140.js';
export { KAP_FIELDS, validKapState };
export type { KapCommand };
import type { RadioNavSnapshot } from './radio-nav';
/** SI/radians at the existing E1 worker boundary; altitude datum remains experimental. */
export const ALTIMETER_FIELDS = [
  'p_static_pa', 'altimeter_setting_pa', 'altimeter_indicated_m',
  'altimeter_qnh_pa', 'altimeter_qfe_pa', 'altimeter_qfe_datum_m',
] as const;
/** Optional only for older local research engines; present as one complete group. */
export interface AltimeterState {
  p_static_pa?: number; altimeter_setting_pa?: number; altimeter_indicated_m?: number;
  altimeter_qnh_pa?: number; altimeter_qfe_pa?: number; altimeter_qfe_datum_m?: number;
}
export function validAltimeterState(input: object): boolean {
  const value = input as AltimeterState;
  if (!ALTIMETER_FIELDS.some((key) => value[key] !== undefined)) return true;
  return ALTIMETER_FIELDS.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && value.p_static_pa! > 0 && value.altimeter_qnh_pa! > 0 && value.altimeter_qfe_pa! > 0
    && value.altimeter_setting_pa! >= 80_000 && value.altimeter_setting_pa! <= 110_000;
}
export const COCKPIT_FIELDS = ['cas_mps', 'turn_rate_radps', 'slip_ball_rad', 'flap_rad',
  'brake_left_norm', 'brake_right_norm', 'on_ground', 'flap_command_norm'] as const;
export interface CockpitState {
  cas_mps?: number; turn_rate_radps?: number; slip_ball_rad?: number; flap_rad?: number;
  brake_left_norm?: number; brake_right_norm?: number; on_ground?: number; flap_command_norm?: number;
}
export function validCockpitState(input: object): boolean {
  const value = input as CockpitState;
  if (!COCKPIT_FIELDS.some(key => value[key] !== undefined)) return true;
  const required = ['cas_mps','turn_rate_radps','flap_rad','brake_left_norm','brake_right_norm','on_ground'] as const;
  if (!required.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) return false;
  if (!COCKPIT_FIELDS.every(key => value[key] === undefined || (typeof value[key] === 'number' && Number.isFinite(value[key])))) return false;
  return (value.flap_command_norm === undefined || (value.flap_command_norm >= 0 && value.flap_command_norm <= 1))
    && (value.cas_mps === undefined || value.cas_mps >= 0)
    && (value.flap_rad === undefined || (value.flap_rad >= -1e-6 && value.flap_rad <= Math.PI / 6 + 1e-6))
    && [value.brake_left_norm, value.brake_right_norm].every(x => x === undefined || (x >= 0 && x <= 1))
    && (value.on_ground === undefined || value.on_ground === 0 || value.on_ground === 1);
}
export const ENGINE_FIELDS = ['manifold_pressure_pa','prop_radps','mixture_norm','mixture_auto',
  'oil_pressure_pa','oil_temp_k','egt_k','fuel_flow_m3ps','fuel_left_m3','fuel_right_m3',
  'ap_mode','ap_heading_target_rad','ap_aileron_norm'] as const;
export const ENGINE_SWITCH_FIELDS = ['engine_running', 'engine_command_on'] as const;
export interface EngineState {
  /** Actual native combustion-running flag; absent on older local engines. */
  engine_running?: number; engine_command_on?: number;
  manifold_pressure_pa?: number; prop_radps?: number; mixture_norm?: number; mixture_auto?: number;
  oil_pressure_pa?: number; oil_temp_k?: number; egt_k?: number; fuel_flow_m3ps?: number;
  fuel_left_m3?: number; fuel_right_m3?: number; ap_mode?: number;
  ap_heading_target_rad?: number; ap_aileron_norm?: number;
}
export function validEngineState(input: object): boolean {
  const value = input as EngineState;
  if (ENGINE_SWITCH_FIELDS.some(key => value[key] !== undefined)
    && !ENGINE_SWITCH_FIELDS.every(key => typeof value[key] === 'number' && [0, 1].includes(value[key]!))) return false;
  if (!ENGINE_FIELDS.some(key => value[key] !== undefined)) return true;
  return ENGINE_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && value.manifold_pressure_pa! > 0 && value.prop_radps! >= 0
    && value.mixture_norm! >= 0 && value.mixture_norm! <= 1 && [0,1].includes(value.mixture_auto!)
    && value.oil_pressure_pa! >= 0 && value.oil_temp_k! > 0 && value.egt_k! > 0
    && value.fuel_flow_m3ps! >= 0 && value.fuel_left_m3! >= 0 && value.fuel_right_m3! >= 0
    && [0,1,2].includes(value.ap_mode!) && value.ap_heading_target_rad! >= 0 && value.ap_heading_target_rad! < 2*Math.PI;
}
export const PITCH_TRIM_FIELDS = ['pitch_trim_norm', 'pitch_trim_initial_norm', 'elevator_rad'] as const;
export interface PitchTrimState {
  pitch_trim_norm?: number; pitch_trim_initial_norm?: number; elevator_rad?: number;
}
export function validPitchTrimState(input: object): boolean {
  const value = input as PitchTrimState;
  if (!PITCH_TRIM_FIELDS.some(key => value[key] !== undefined)) return true;
  return PITCH_TRIM_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && Math.abs(value.pitch_trim_norm!) <= 1 && Math.abs(value.pitch_trim_initial_norm!) <= 1;
}
/** Present together only for the pinned public DGM/GCG terrain profile. */
export const TERRAIN_FIELDS = ['terrain_profile', 'terrain_height_msl_m', 'terrain_geoid_m', 'terrain_height_ellipsoid_m'] as const;
export type TerrainState = Partial<Record<typeof TERRAIN_FIELDS[number], number>>;
export function validTerrainState(input: object): boolean {
  const value = input as TerrainState;
  if (!TERRAIN_FIELDS.some(key => value[key] !== undefined)) return true;
  return TERRAIN_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && value.terrain_profile === 1 && value.terrain_height_msl_m! > -1000 && value.terrain_height_msl_m! < 10000
    && Math.abs(value.terrain_geoid_m!) < 200
    && Math.abs(value.terrain_height_ellipsoid_m! - value.terrain_height_msl_m! - value.terrain_geoid_m!) < 1e-6;
}
export const GROUND_FIELDS = ['ground_agl_m', 'ground_height_ellipsoid_m', 'ground_forward_mps', 'ground_side_mps', 'ground_down_mps', 'structure_contact_mask',
  'gear_nose_wow', 'gear_nose_compression_m', 'gear_nose_load_n', 'gear_nose_slip_rad',
  'gear_left_wow', 'gear_left_compression_m', 'gear_left_load_n', 'gear_left_slip_rad',
  'gear_right_wow', 'gear_right_compression_m', 'gear_right_load_n', 'gear_right_slip_rad'] as const;
export type GroundState = Partial<Record<typeof GROUND_FIELDS[number], number>>;
export function validGroundState(input: object): boolean {
  const value = input as GroundState;
  if (!GROUND_FIELDS.some(key => value[key] !== undefined)) return true;
  return GROUND_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && Number.isInteger(value.structure_contact_mask) && value.structure_contact_mask! >= 0 && value.structure_contact_mask! <= 7
    && [value.gear_nose_wow, value.gear_left_wow, value.gear_right_wow].every(x => x === 0 || x === 1)
    && [value.gear_nose_compression_m, value.gear_left_compression_m, value.gear_right_compression_m,
      value.gear_nose_load_n, value.gear_left_load_n, value.gear_right_load_n].every(x => x! >= 0);
}
export type LandingPreset = 'normal' | 'hard' | 'side' | 'banked';
/** Applied model commands and actual surfaces, sampled at the worker state boundary. */
export const CONTROL_FIELDS = ['throttle_norm', 'aileron_cmd_norm', 'elevator_cmd_norm', 'rudder_cmd_norm',
  'aileron_rad', 'right_aileron_rad', 'rudder_rad'] as const;
export type ControlState = Partial<Record<typeof CONTROL_FIELDS[number], number>>;
export function validControlState(input: object): boolean {
  const value = input as ControlState;
  if (!CONTROL_FIELDS.some(key => value[key] !== undefined)) return true;
  return CONTROL_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && value.throttle_norm! >= 0 && value.throttle_norm! <= 1
    && [value.aileron_cmd_norm, value.elevator_cmd_norm, value.rudder_cmd_norm].every(x => Math.abs(x!) <= 1);
}
/** Read-only body-axis air-relative motion and structural-frame CG, all SI/radians. */
export const STALL_FIELDS = ['aero_u_mps', 'aero_v_mps', 'aero_w_mps',
  'aero_p_radps', 'aero_q_radps', 'aero_r_radps',
  'cg_structural_x_m', 'cg_structural_y_m', 'cg_structural_z_m',
  'aero_alpha_rad', 'aero_alpha_max_rad', 'stall_warning_norm', 'stall_hysteresis_norm'] as const;
export type StallState = Partial<Record<typeof STALL_FIELDS[number], number>>;
export function validStallState(input: object): boolean {
  const value = input as StallState;
  if (!STALL_FIELDS.some(key => value[key] !== undefined)) return true;
  return STALL_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && Math.abs(value.aero_alpha_rad!) <= Math.PI
    && value.aero_alpha_max_rad! > 0 && value.aero_alpha_max_rad! < Math.PI / 2
    && value.stall_warning_norm! >= 0 && [0, 1].includes(value.stall_hysteresis_norm!);
}
/** Worker-latched first non-wheel contact; pre-step velocities are observations, not damage limits. */
export const COLLISION_FIELDS = ['collision_mask', 'collision_step', 'collision_t_s',
  'collision_down_mps', 'collision_groundspeed_mps'] as const;
export type CollisionState = Partial<Record<typeof COLLISION_FIELDS[number], number>>;
export function validCollisionState(input: object): boolean {
  const value = input as CollisionState & { step?: number; t_s?: number };
  if (!COLLISION_FIELDS.some(key => value[key] !== undefined)) return true;
  if (!COLLISION_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    || !Number.isInteger(value.collision_mask) || value.collision_mask! < 0 || value.collision_mask! > 127
    || !Number.isInteger(value.collision_step) || value.collision_step! < 0
    || value.collision_t_s! < 0 || value.collision_groundspeed_mps! < 0) return false;
  if (value.collision_mask === 0) return COLLISION_FIELDS.every(key => value[key] === 0);
  return value.collision_step! >= 1 && value.collision_t_s! > 0
    && (value.step === undefined || value.collision_step! <= value.step)
    && (value.t_s === undefined || value.collision_t_s! <= value.t_s);
}
export function validSystemsState(state: { systems_switch_mask?: number }): boolean {
  return state.systems_switch_mask === undefined || validSystemsMask(state.systems_switch_mask);
}
export interface FlightState extends Partial<Record<keyof AltitudeAlertSnapshot, number>>, Partial<KapSnapshot>, TerrainState, AltimeterState, CockpitState, EngineState, PitchTrimState, GroundState, ControlState, StallState, CollisionState, Partial<RadioNavSnapshot> {
  step: number; t_s: number; lat_rad: number; lon_rad: number;
  alt_msl_m: number; roll_rad: number; pitch_rad: number; heading_rad: number; tas_mps: number;
  /** Requested wall-clock pacing; fixed simulation dt is unchanged. */
  simulation_rate?: number;
  systems_switch_mask?: number;
}
export interface Controls { elevator: number; aileron: number; rudder: number; throttle: number; flap_norm?: number; brake_norm?: number; mixture_norm?: number; mixture_auto?: boolean; pitch_trim_norm?: number; engine_running?: boolean; pilot_override?: boolean }
export interface FlightScene {
  setLandmarkLevel?(level: 0 | 1 | 2 | 3): void;
  setSceneryMode?(vector: boolean): void;
  setPracticePapi?(enabled: boolean): void;
  setTerrainTiles?(tiles: readonly TerrainGrid[]): void;
  prepareRecording?(states: Iterable<Readonly<FlightState>>): Promise<void>;
  update(state: FlightState, view: 'cockpit' | 'chase', look?: { yaw_rad: number; pitch_rad: number; fov_rad?: number }): void;
  dispose(): void;
}
export interface RunwayStart { airport: string; runway: string; lat_rad: number; lon_rad: number; heading_rad: number }
export type AirborneSite = 'edfe' | 'taunus' | 'eddf-ils' | 'darmstadt' | 'odenwald' | 'spessart';
export interface FlightSession {
  captureAutopilot(): void;
  setSimulationRate(rate: number): void;
  setKap140(command: KapCommand): void;
  setNavigation(config: Pick<RadioNavSnapshot, "radio_nav_active_khz" | "radio_obs_deg" | "radio_demo_enabled"> & Partial<Pick<RadioNavSnapshot, "radio_nav2_active_khz" | "radio_obs2_deg">>): void;
  start(): void; pause(): void; reset(landingPreset?: LandingPreset, site?: AirborneSite, runway?: RunwayStart): void; input(controls: Controls): void; setAltimeter(setting_pa: number): void; setAutopilot(mode: 0|1|2, target_heading_rad?: number): void; dispose(): void;
}
