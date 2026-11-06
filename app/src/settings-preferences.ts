/** Origin-local user choices only; no held commands, aircraft or recording state. */
export interface SettingsControlPreferences {
  pitch: number;
  roll: number;
  rudder: number;
  brake: number;
  coordinatedRudder: boolean;
  centeredTouchpad: boolean;
  practicePapi: boolean;
}
export interface SettingsPreferences {
  controls: SettingsControlPreferences;
  rollOffset: number;
  volume: number;
  muted: boolean;
}

export const SETTINGS_PREFERENCES_KEY = 'gefly.settings-preferences.v1';
export const SETTINGS_PREFERENCES_MAX_BYTES = 1024;
export const DEFAULT_SETTINGS_PREFERENCES: Readonly<SettingsPreferences> = Object.freeze({
  controls: Object.freeze({ pitch: 1, roll: 1, rudder: 1, brake: 0.25,
    coordinatedRudder: false, centeredTouchpad: true, practicePapi: false }),
  rollOffset: 0,
  volume: 0.3,
  muted: true,
});
const FIELDS = ['controls', 'rollOffset', 'volume', 'muted'] as const;
const CONTROL_FIELDS = ['pitch', 'roll', 'rudder', 'brake', 'coordinatedRudder', 'centeredTouchpad', 'practicePapi'] as const;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const range = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
function exactFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function valid(value: unknown): value is SettingsPreferences {
  if (!object(value) || !exactFields(value, FIELDS) || !object(value.controls)
    || !exactFields(value.controls, CONTROL_FIELDS)) return false;
  const controls = value.controls;
  return ['pitch', 'roll', 'rudder'].every(field => range(controls[field], 0.25, 1.5))
    && range(controls.brake, 0, 1)
    && typeof controls.coordinatedRudder === 'boolean' && typeof controls.centeredTouchpad === 'boolean'
    && typeof controls.practicePapi === 'boolean' && range(value.rollOffset, -0.25, 0.25)
    && range(value.volume, 0, 1) && typeof value.muted === 'boolean';
}
function snapshot(value: Readonly<SettingsPreferences>): SettingsPreferences {
  return { controls: { ...value.controls }, rollOffset: value.rollOffset, volume: value.volume, muted: value.muted };
}
/** Read each selected field once before validating; never re-read live getters. */
function capture(value: unknown): unknown {
  if (!object(value) || !exactFields(value, FIELDS)) return null;
  const controls = value.controls;
  if (!object(controls) || !exactFields(controls, CONTROL_FIELDS)) return null;
  return { controls: {
    pitch: controls.pitch, roll: controls.roll, rudder: controls.rudder, brake: controls.brake,
    coordinatedRudder: controls.coordinatedRudder, centeredTouchpad: controls.centeredTouchpad,
    practicePapi: controls.practicePapi,
  }, rollOffset: value.rollOffset, volume: value.volume, muted: value.muted };
}

/** Untrusted, unavailable and future-version storage falls back without rewriting it. */
export function loadSettingsPreferences(storage: Pick<Storage, 'getItem'> | null): SettingsPreferences {
  try {
    const raw = storage?.getItem(SETTINGS_PREFERENCES_KEY);
    if (typeof raw !== 'string' || raw.length > SETTINGS_PREFERENCES_MAX_BYTES
      || new TextEncoder().encode(raw).byteLength > SETTINGS_PREFERENCES_MAX_BYTES) return snapshot(DEFAULT_SETTINGS_PREFERENCES);
    const value: unknown = JSON.parse(raw);
    if (!object(value) || !exactFields(value, ['version', ...FIELDS]) || value.version !== 1) return snapshot(DEFAULT_SETTINGS_PREFERENCES);
    const { version: _version, ...preferences } = value;
    return valid(preferences) ? snapshot(preferences) : snapshot(DEFAULT_SETTINGS_PREFERENCES);
  } catch { return snapshot(DEFAULT_SETTINGS_PREFERENCES); }
}

/** Call only for committed choices. Restoring sound choices never unlocks audio. */
export function saveSettingsPreferences(value: SettingsPreferences, storage: Pick<Storage, 'setItem'> | null): boolean {
  try {
    if (!storage) return false;
    const selected = capture(value);
    if (!valid(selected)) return false;
    const raw = JSON.stringify({ version: 1, ...selected });
    if (new TextEncoder().encode(raw).byteLength > SETTINGS_PREFERENCES_MAX_BYTES) return false;
    storage.setItem(SETTINGS_PREFERENCES_KEY, raw);
    return true;
  } catch { return false; }
}
