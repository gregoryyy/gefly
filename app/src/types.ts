/** SI/radians at the existing E1 worker boundary; altitude datum remains experimental. */
export interface FlightState {
  step: number; t_s: number; lat_rad: number; lon_rad: number;
  alt_msl_m: number; roll_rad: number; pitch_rad: number; heading_rad: number; tas_mps: number;
}
export interface Controls { elevator: number; aileron: number; rudder: number; throttle: number }
export interface FlightScene {
  update(state: FlightState, view: 'cockpit' | 'chase'): void;
  dispose(): void;
}
export interface FlightSession {
  start(): void; pause(): void; reset(): void; input(controls: Controls): void; dispose(): void;
}
