import { navigationSignal } from '../../studies/e1-browser/sim/navigation.js';
import type { NavigationSignal, NavigationPackage } from '../../studies/e1-browser/sim/navigation.js';
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
/** A single validated page-local snapshot is shared by live and recorded UI. */
let catalogue: NavigationPackage | null = null;
export function setNavigationCatalogue(value: NavigationPackage | null): void { catalogue = value; }
export function getNavigationCatalogue(): NavigationPackage | null { return catalogue; }
export interface NavigationIndication extends Omit<NavigationSignal, 'cdi_norm' | 'gs_norm'> {
  cdi_norm: number | null; gs_norm: number | null;
}
export interface BearingDistanceIndication extends NavigationIndication {}
export function navigationIndication(config: Readonly<RadioNavSnapshot>, position: Readonly<NavPosition> | null, receiver: RadioReceiver = 1): NavigationIndication {
  const signal = navigationSignal(config, position && Number.isFinite(position.alt_msl_m) ? position : {lat_rad: NaN, lon_rad: NaN},
    catalogue?.records ?? [], catalogue?.source_label, receiver);
  return { ...signal, cdi_norm: signal.valid ? signal.cdi_norm : null,
    gs_norm: signal.gs_valid ? signal.gs_norm : null };
}
/** TRUE bearing is a declared VOR teaching aid, not an ADF receiver. DME is independent. */
export function bearingDistanceIndication(config: Readonly<RadioNavSnapshot>, position: Readonly<NavPosition> | null, receiver: RadioReceiver = 1): BearingDistanceIndication {
  const signal = navigationIndication(config, position, receiver);
  return { ...signal, valid: signal.bearing_true_deg !== null };
}
