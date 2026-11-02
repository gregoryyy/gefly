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
  'brake_left_norm', 'brake_right_norm', 'on_ground'] as const;
export interface CockpitState {
  cas_mps?: number; turn_rate_radps?: number; slip_ball_rad?: number; flap_rad?: number;
  brake_left_norm?: number; brake_right_norm?: number; on_ground?: number;
}
export function validCockpitState(input: object): boolean {
  const value = input as CockpitState;
  if (!COCKPIT_FIELDS.some(key => value[key] !== undefined)) return true;
  const required = ['cas_mps','turn_rate_radps','flap_rad','brake_left_norm','brake_right_norm','on_ground'] as const;
  if (!required.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) return false;
  if (!COCKPIT_FIELDS.every(key => value[key] === undefined || (typeof value[key] === 'number' && Number.isFinite(value[key])))) return false;
  return (value.cas_mps === undefined || value.cas_mps >= 0)
    && (value.flap_rad === undefined || (value.flap_rad >= -1e-6 && value.flap_rad <= Math.PI / 6 + 1e-6))
    && [value.brake_left_norm, value.brake_right_norm].every(x => x === undefined || (x >= 0 && x <= 1))
    && (value.on_ground === undefined || value.on_ground === 0 || value.on_ground === 1);
}
export const ENGINE_FIELDS = ['manifold_pressure_pa','prop_radps','mixture_norm','mixture_auto',
  'oil_pressure_pa','oil_temp_k','egt_k','fuel_flow_m3ps','fuel_left_m3','fuel_right_m3',
  'ap_mode','ap_heading_target_rad','ap_aileron_norm'] as const;
export interface EngineState {
  manifold_pressure_pa?: number; prop_radps?: number; mixture_norm?: number; mixture_auto?: number;
  oil_pressure_pa?: number; oil_temp_k?: number; egt_k?: number; fuel_flow_m3ps?: number;
  fuel_left_m3?: number; fuel_right_m3?: number; ap_mode?: number;
  ap_heading_target_rad?: number; ap_aileron_norm?: number;
}
export function validEngineState(input: object): boolean {
  const value = input as EngineState;
  if (!ENGINE_FIELDS.some(key => value[key] !== undefined)) return true;
  return ENGINE_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && value.manifold_pressure_pa! > 0 && value.prop_radps! >= 0
    && value.mixture_norm! >= 0 && value.mixture_norm! <= 1 && [0,1].includes(value.mixture_auto!)
    && value.oil_pressure_pa! >= 0 && value.oil_temp_k! > 0 && value.egt_k! > 0
    && value.fuel_flow_m3ps! >= 0 && value.fuel_left_m3! >= 0 && value.fuel_right_m3! >= 0
    && [0,1,2].includes(value.ap_mode!) && value.ap_heading_target_rad! >= 0 && value.ap_heading_target_rad! < 2*Math.PI;
}
export interface FlightState extends AltimeterState, CockpitState, EngineState {
  step: number; t_s: number; lat_rad: number; lon_rad: number;
  alt_msl_m: number; roll_rad: number; pitch_rad: number; heading_rad: number; tas_mps: number;
}
export interface Controls { elevator: number; aileron: number; rudder: number; throttle: number; flap_norm?: number; brake_norm?: number; mixture_norm?: number; mixture_auto?: boolean }
export interface FlightScene {
  update(state: FlightState, view: 'cockpit' | 'chase', look?: { yaw_rad: number; pitch_rad: number; fov_rad?: number }): void;
  dispose(): void;
}
export interface FlightSession {
  start(): void; pause(): void; reset(): void; input(controls: Controls): void; setAltimeter(setting_pa: number): void; setAutopilot(mode: 0|1|2, target_heading_rad?: number): void; dispose(): void;
}
