// Shared deterministic fictional LAB VOR signal. No real navaid/ILS database.
const DEG = Math.PI / 180, R = 6371000;
export const DEFAULT_NAVIGATION = Object.freeze({ radio_nav_active_khz: 113800, radio_obs_deg: 0, radio_demo_enabled: 0 });
export const NAVIGATION_FIELDS = Object.freeze(Object.keys(DEFAULT_NAVIGATION));
export function validNavigation(c) {
  return !!c && Number.isInteger(c.radio_nav_active_khz) && c.radio_nav_active_khz >= 108000 && c.radio_nav_active_khz <= 117950
    && c.radio_nav_active_khz % 50 === 0 && Number.isInteger(c.radio_obs_deg) && c.radio_obs_deg >= 0 && c.radio_obs_deg < 360
    && [0,1].includes(c.radio_demo_enabled);
}
export function navigationSignal(c, p) {
  const configured = validNavigation(c);
  const localizer = configured && c.radio_nav_active_khz < 112000 && Math.floor(c.radio_nav_active_khz / 100) % 2 === 1;
  const unavailable = { valid: false, kind: configured ? localizer ? 2 : 1 : 0, cdi_norm: 0, course_rad: configured ? c.radio_obs_deg * DEG : 0, gs_valid: false, gs_norm: 0 };
  if (!validNavigation(c) || !c.radio_demo_enabled || c.radio_nav_active_khz !== 113800
    || !p || ![p.lat_rad,p.lon_rad].every(Number.isFinite) || Math.abs(p.lat_rad) > Math.PI/2 || Math.abs(p.lon_rad) > Math.PI) return unavailable;
  const lat = 49.96 * DEG, lon = 8.643 * DEG, dlon = p.lon_rad-lon, dlat=p.lat_rad-lat;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat)*Math.cos(p.lat_rad)*Math.sin(dlon/2)**2;
  const distance = 2*R*Math.asin(Math.sqrt(Math.max(0,Math.min(1,a))));
  if (distance < 100 || distance > 60*1852) return unavailable;
  const radial = Math.atan2(Math.sin(dlon)*Math.cos(p.lat_rad), Math.cos(lat)*Math.sin(p.lat_rad)-Math.sin(lat)*Math.cos(p.lat_rad)*Math.cos(dlon));
  const difference=radial-c.radio_obs_deg*DEG;
  if (Math.abs(Math.cos(difference)) < 1e-10) return unavailable;
  return { ...unavailable, valid: true, kind: 1, cdi_norm: Math.max(-1,Math.min(1,-Math.asin(Math.sin(difference))/DEG/10)) };
}
