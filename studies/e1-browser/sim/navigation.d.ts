export interface NavigationConfig { radio_nav_active_khz: number; radio_obs_deg: number; radio_demo_enabled: number }
export const DEFAULT_NAVIGATION: Readonly<NavigationConfig>;
export const NAVIGATION_FIELDS: readonly (keyof NavigationConfig)[];
export function validNavigation(value: unknown): value is NavigationConfig;
export function navigationSignal(config: NavigationConfig, position: {lat_rad: number; lon_rad: number}): {
 valid: boolean; kind: 0 | 1 | 2; cdi_norm: number; course_rad: number; gs_valid: boolean; gs_norm: number;
};
