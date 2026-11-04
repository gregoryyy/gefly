/** KAP 140 two-axis/altitude-preselect operational model; generic research servos. */
export type KapAction = 'ap' | 'disconnect' | 'hdg' | 'nav' | 'apr' | 'rev' | 'alt' | 'arm' | 'baro' | 'baro-units' | 'heading' | 'select-altitude' | 'baro-setting' | 'vertical' | 'cws';
export interface KapCommand { action: KapAction; value?: number }
export interface KapSnapshot {
  kap_profile: number; kap_engaged: number; kap_lateral: number; kap_lateral_arm: number;
  /** Lateral:0ROL/1HDG/2NAV/3APR/4REV; vertical:0VS/1ALT/2GS; GS alert:2. */
  kap_hdg_prompt: number; kap_vertical: number; kap_alt_arm: number; kap_gs_arm: number; kap_lateral_alert: number; kap_vertical_alert: number;
  kap_heading_bug_rad: number; kap_selected_altitude_m: number; kap_vs_target_mps: number;
  kap_hold_pressure_altitude_m: number; kap_baro_setting_pa: number; kap_baro_units: number; kap_display_page: number;
  kap_indicated_altitude_m: number; kap_nav_valid: number; kap_nav_kind: number; kap_gs_valid: number;
  kap_elevator_norm: number;
  /** 1 while sensors are invalid, latched after a fault disconnect until the next AP/disconnect press. Generic simulator flag. */
  kap_sensor_fault: number;
  /** Optional in older recordings. 1 temporarily releases both servo channels. */
  kap_cws?: number;
  /** Optional in older traces; retained generic GS capture reference for reconstruction. */
  kap_gs_base_mps?: number;
}
export const KAP_FIELDS: readonly (keyof KapSnapshot)[];
export function validKapState(value: object): boolean;
export function validKapCommand(value: unknown): value is KapCommand;
export interface KapSensors {
  t_s: number; dt_s: number; heading_rad: number; physical_altitude_m: number;
  pressure_altitude_m: number; vertical_speed_mps: number; elevator_norm?: number;
  nav: { valid: boolean; kind: 0 | 1 | 2 | 3; cdi_norm: number; course_rad: number; gs_valid: boolean; gs_norm: number };
}
export function validSensors(value: unknown): value is KapSensors;
export interface KapController {
  /** Reconstruct exposed modes; transient timers/servo integration restart. */
  restore(snapshot:Readonly<KapSnapshot>, sensors:KapSensors):boolean;
  command(command: KapCommand, sensors: KapSensors): boolean;
  /** False when sensors are invalid; an engaged AP disconnects and kap_sensor_fault is set. */
  step(sensors: KapSensors): boolean;
  snapshot(sensors: KapSensors): KapSnapshot;
  guidance(sensors: KapSensors): { lateral_mode: 0 | 1 | 2; heading_rad: number; vertical_mode: 0 | 1 | 2; vertical_target: number };
}
export function createKap140(sensors: KapSensors): KapController;
