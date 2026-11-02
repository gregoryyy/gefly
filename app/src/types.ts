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
export interface FlightState extends AltimeterState {
  step: number; t_s: number; lat_rad: number; lon_rad: number;
  alt_msl_m: number; roll_rad: number; pitch_rad: number; heading_rad: number; tas_mps: number;
}
export interface Controls { elevator: number; aileron: number; rudder: number; throttle: number }
export interface FlightScene {
  update(state: FlightState, view: 'cockpit' | 'chase'): void;
  dispose(): void;
}
export interface FlightSession {
  start(): void; pause(): void; reset(): void; input(controls: Controls): void; setAltimeter(setting_pa: number): void; dispose(): void;
}
