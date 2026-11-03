export interface AltitudeAlertSensors { t_s: number; indicated_altitude_m: number; selected_altitude_m: number; baro_setting_pa: number }
export interface AltitudeAlertSnapshot { kap_alert_state: 0 | 1 | 2 | 3; kap_alert_sequence: number }
export const ALERT_FIELDS: readonly (keyof AltitudeAlertSnapshot)[];
export function validAlertState(value: unknown): boolean;
export function createAltitudeAlert(initial: AltitudeAlertSensors): {
  update(sensors: AltitudeAlertSensors): void;
  snapshot(): AltitudeAlertSnapshot;
};
