/** Session-only tuning; these are legacy 25 kHz COM / 50 kHz NAV channels. */
export const RADIO_NAV_FIELDS = ['radio_com_active_khz', 'radio_com_standby_khz',
  'radio_nav_active_khz', 'radio_nav_standby_khz', 'radio_obs_deg', 'radio_demo_enabled',
  'radio_com2_active_khz', 'radio_com2_standby_khz', 'radio_nav2_active_khz',
  'radio_nav2_standby_khz', 'radio_obs2_deg'] as const;
export interface RadioNavSnapshot {
  radio_com_active_khz: number; radio_com_standby_khz: number;
  radio_nav_active_khz: number; radio_nav_standby_khz: number;
  radio_obs_deg: number; radio_demo_enabled: number;
  radio_com2_active_khz: number; radio_com2_standby_khz: number;
  radio_nav2_active_khz: number; radio_nav2_standby_khz: number; radio_obs2_deg: number;
}
export const DEFAULT_RADIO_NAV: Readonly<RadioNavSnapshot> = Object.freeze({
  radio_com_active_khz: 118000, radio_com_standby_khz: 121500,
  radio_nav_active_khz: 113800, radio_nav_standby_khz: 114000,
  radio_obs_deg: 0, radio_demo_enabled: 0,
  radio_com2_active_khz: 121500, radio_com2_standby_khz: 118000,
  radio_nav2_active_khz: 114000, radio_nav2_standby_khz: 113800, radio_obs2_deg: 0,
});
export const DEMO_NAV = Object.freeze({ frequency_khz: 113800, latitude_deg: 49.96,
  longitude_deg: 8.643, altitude_m: 0, radius_nm: 60, identifier: 'LAB' });
const DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6371000; // Declared spherical teaching geometry, not WGS-84 surveying.
const NM_M = 1852;
export type RadioKind = 'com' | 'nav';
export type RadioReceiver = 1 | 2;
export function radioFrequencyKeys(kind: RadioKind, receiver: RadioReceiver = 1) {
  if (receiver !== 1 && receiver !== 2) throw new RangeError('Unknown radio receiver');
  if (kind === 'com') return receiver === 1
    ? { active: 'radio_com_active_khz', standby: 'radio_com_standby_khz' } as const
    : { active: 'radio_com2_active_khz', standby: 'radio_com2_standby_khz' } as const;
  return receiver === 1 ? { active: 'radio_nav_active_khz', standby: 'radio_nav_standby_khz' } as const
    : { active: 'radio_nav2_active_khz', standby: 'radio_nav2_standby_khz' } as const;
}
export function validFrequency(kind: RadioKind, value: number): boolean {
  const [min, max, step] = kind === 'com' ? [118000, 136975, 25] : [108000, 117950, 50];
  return Number.isInteger(value) && value >= min && value <= max && (value - min) % step === 0;
}
export function validRadioNavSnapshot(input: object): input is RadioNavSnapshot {
  const value = input as Partial<RadioNavSnapshot>;
  return RADIO_NAV_FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && validFrequency('com', value.radio_com_active_khz!) && validFrequency('com', value.radio_com_standby_khz!)
    && validFrequency('nav', value.radio_nav_active_khz!) && validFrequency('nav', value.radio_nav_standby_khz!)
    && validFrequency('com', value.radio_com2_active_khz!) && validFrequency('com', value.radio_com2_standby_khz!)
    && validFrequency('nav', value.radio_nav2_active_khz!) && validFrequency('nav', value.radio_nav2_standby_khz!)
    && Number.isInteger(value.radio_obs_deg) && value.radio_obs_deg! >= 0 && value.radio_obs_deg! < 360
    && Number.isInteger(value.radio_obs2_deg) && value.radio_obs2_deg! >= 0 && value.radio_obs2_deg! < 360
    && [0, 1].includes(value.radio_demo_enabled!);
}
function checked(config: Readonly<RadioNavSnapshot>): void {
  if (!validRadioNavSnapshot(config)) throw new RangeError('Invalid complete radio/NAV configuration');
}
export function tuneStandby(config: Readonly<RadioNavSnapshot>, kind: RadioKind, frequency_khz: number, receiver: RadioReceiver = 1): RadioNavSnapshot {
  checked(config);
  if (!validFrequency(kind, frequency_khz)) throw new RangeError(`Invalid ${kind.toUpperCase()} channel`);
  return { ...config, [radioFrequencyKeys(kind, receiver).standby]: frequency_khz };
}
export function swapRadio(config: Readonly<RadioNavSnapshot>, kind: RadioKind, receiver: RadioReceiver = 1): RadioNavSnapshot {
  checked(config);
  const { active, standby } = radioFrequencyKeys(kind, receiver);
  return { ...config, [active]: config[standby], [standby]: config[active] };
}
export function setObs(config: Readonly<RadioNavSnapshot>, degrees: number, receiver: RadioReceiver = 1): RadioNavSnapshot {
  checked(config);
  if (!Number.isInteger(degrees)) throw new RangeError('OBS requires integer degrees');
  if (receiver !== 1 && receiver !== 2) throw new RangeError('Unknown NAV receiver');
  return { ...config, [receiver === 1 ? 'radio_obs_deg' : 'radio_obs2_deg']: ((degrees % 360) + 360) % 360 };
}
export interface NavPosition { lat_rad: number; lon_rad: number; alt_msl_m: number }
export interface NavigationIndication {
  valid: boolean; reason: string; to_from: 'TO' | 'FROM' | 'OFF'; cdi_norm: number | null;
  radial_true_deg: number | null; dme_nm: number | null;
}
export interface BearingDistanceIndication {
  valid: boolean; reason: string; bearing_true_deg: number | null; dme_nm: number | null;
}
/** Same fictional service/geometry for CDI and bearing instruments. OBS does
 * not affect a station bearing; reverse initial great-circle bearings are not
 * generally the outbound radial plus 180 degrees.
 */
function labGeometry(config: Readonly<RadioNavSnapshot>, position: Readonly<NavPosition> | null, receiver: RadioReceiver) {
  const unavailable = (reason: string, dme_nm: number | null = null) => ({ reason, dme_nm,
    radial_rad: null as number | null, bearing_true_deg: null as number | null });
  if (!validRadioNavSnapshot(config)) return unavailable('Radio configuration unavailable');
  if (receiver !== 1 && receiver !== 2) return unavailable('NAV receiver unavailable');
  const frequency = receiver === 1 ? config.radio_nav_active_khz : config.radio_nav2_active_khz;
  if (frequency < 112000 && Math.floor(frequency / 100) % 2 === 1) return unavailable('ILS/LOC unsupported');
  if (!config.radio_demo_enabled) return unavailable('LAB off · no real station database');
  if (frequency !== DEMO_NAV.frequency_khz) return unavailable('No LAB signal on active channel');
  if (!position || ![position.lat_rad, position.lon_rad, position.alt_msl_m].every(Number.isFinite)
    || Math.abs(position.lat_rad) > Math.PI / 2 || Math.abs(position.lon_rad) > Math.PI
    || position.alt_msl_m <= -EARTH_RADIUS_M) return unavailable('Aircraft position unavailable');
  const stationLat = DEMO_NAV.latitude_deg * DEG, stationLon = DEMO_NAV.longitude_deg * DEG;
  const dLat = position.lat_rad - stationLat, dLon = position.lon_rad - stationLon;
  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(stationLat) * Math.cos(position.lat_rad) * Math.sin(dLon / 2) ** 2;
  const angle = 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, hav))));
  if (angle * EARTH_RADIUS_M / NM_M > DEMO_NAV.radius_nm) return unavailable('Outside 60 NM LAB radius');
  const stationRadius = EARTH_RADIUS_M + DEMO_NAV.altitude_m, aircraftRadius = EARTH_RADIUS_M + position.alt_msl_m;
  const dme_nm = Math.hypot(position.alt_msl_m - DEMO_NAV.altitude_m,
    2 * Math.sqrt(stationRadius) * Math.sqrt(aircraftRadius) * Math.sin(angle / 2)) / NM_M;
  if (!Number.isFinite(dme_nm)) return unavailable('LAB range unavailable');
  if (angle * EARTH_RADIUS_M < 100) return unavailable('LAB station passage · bearing ambiguous', dme_nm);
  const radial_rad = Math.atan2(Math.sin(dLon) * Math.cos(position.lat_rad),
    Math.cos(stationLat) * Math.sin(position.lat_rad) - Math.sin(stationLat) * Math.cos(position.lat_rad) * Math.cos(dLon));
  const inbound = Math.atan2(-Math.sin(dLon) * Math.cos(stationLat),
    Math.cos(position.lat_rad) * Math.sin(stationLat) - Math.sin(position.lat_rad) * Math.cos(stationLat) * Math.cos(dLon));
  return { reason: 'Fictional LAB · TRUE reference', dme_nm, radial_rad, bearing_true_deg: ((inbound / DEG) + 360) % 360 };
}

/** Direct TRUE bearing to the existing NAV-selected LAB; not ADF/NDB reception. */
export function bearingDistanceIndication(config: Readonly<RadioNavSnapshot>, position: Readonly<NavPosition> | null, receiver: RadioReceiver = 1): BearingDistanceIndication {
  const geometry = labGeometry(config, position, receiver);
  return { valid: geometry.bearing_true_deg !== null, reason: geometry.reason,
    bearing_true_deg: geometry.bearing_true_deg, dme_nm: geometry.dme_nm };
}
/** VOR-style ±10° CDI: FAA PHAK Ch16 and AIM 1-1; true-reference LAB only.
 * https://www.faa.gov/sites/faa.gov/files/pilot_handbook_1.pdf
 * https://www.faa.gov/air_traffic/publications/aim_html/chap1_section_1.html
 * No real station data, magnetic declination, propagation, terrain or ILS model.
 */
export function navigationIndication(config: Readonly<RadioNavSnapshot>, position: Readonly<NavPosition> | null, receiver: RadioReceiver = 1): NavigationIndication {
  const unavailable = (reason: string, dme_nm: number | null = null): NavigationIndication => ({
    valid: false, reason, to_from: 'OFF', cdi_norm: null, radial_true_deg: null, dme_nm,
  });
  const geometry = labGeometry(config, position, receiver);
  if (geometry.radial_rad === null) return unavailable(geometry.reason, geometry.dme_nm);
  const obs_deg = receiver === 1 ? config.radio_obs_deg : config.radio_obs2_deg;
  const dme_nm = geometry.dme_nm, bearing = geometry.radial_rad;
  const radial_true_deg = ((bearing / DEG) + 360) % 360;
  const difference = bearing - obs_deg * DEG;
  const side = Math.cos(difference);
  if (Math.abs(side) < 1e-10) return unavailable('LAB TO/FROM ambiguity', dme_nm);
  const deviation_deg = Math.asin(Math.sin(difference)) / DEG;
  return { valid: true, reason: 'Fictional LAB · TRUE reference', to_from: side < 0 ? 'TO' : 'FROM',
    cdi_norm: Math.max(-1, Math.min(1, -deviation_deg / 10)), radial_true_deg, dme_nm };
}
