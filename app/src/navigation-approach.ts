import type { NavigationPackage } from '../../studies/e1-browser/sim/navigation.js';
import { DEFAULT_RADIO_NAV } from './radio-nav.ts';

/** Geometric intercept practice, not a published approach or clearance. */
export function eddfApproachPractice(catalogue: NavigationPackage | null) {
  const station = catalogue?.records.find(r => r.kind === 'LOC' && r.airport === 'EDDF' && r.runway === '25C' && r.id === 'IFCW');
  if (!station?.gs || station.front_course_true_deg === null) throw new Error('Historical EDDF 25C source unavailable');
  const deg = Math.PI / 180, distance_m = 5 * 1852, arc = distance_m / 6371000;
  const lat = station.gs.lat_deg * deg, lon = station.gs.lon_deg * deg;
  const bearing = (station.gs.front_course_true_deg + 180) * deg;
  const startLat = Math.asin(Math.sin(lat) * Math.cos(arc) + Math.cos(lat) * Math.sin(arc) * Math.cos(bearing));
  const startLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(arc) * Math.cos(lat), Math.cos(arc) - Math.sin(lat) * Math.sin(startLat));
  return {
    ic: { lat_rad: startLat, lon_rad: startLon,
      alt_msl_m: station.gs.elevation_m + distance_m * Math.tan((station.gs.angle_deg - .3) * deg),
      heading_rad: station.front_course_true_deg * deg, tas_mps: 90 * 1852 / 3600 },
    navigation: { ...DEFAULT_RADIO_NAV, radio_nav_active_khz: station.frequency_khz,
      radio_obs_deg: Math.round(station.front_course_true_deg) % 360,
      radio_nav2_active_khz: 114200, radio_obs2_deg: 0 },
  };
}
