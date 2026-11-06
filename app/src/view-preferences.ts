import type { WorldMapColorScheme } from './world-map-style.ts';

/** Page-view choices only; no aircraft or control state. */
export interface ViewPreferences {
  vectorScenery: boolean;
  landmarkLevel: 0 | 1 | 2 | 3;
  mapColorScheme: WorldMapColorScheme;
}
type ViewPreferenceInput = Omit<ViewPreferences, 'mapColorScheme'> & Partial<Pick<ViewPreferences, 'mapColorScheme'>>;
export const VIEW_PREFERENCES_KEY = 'gefly.view-preferences.v1';
const MAX_BYTES = 256;
const FIELDS = ['version', 'vectorScenery', 'landmarkLevel', 'mapColorScheme'];
const defaults = (): ViewPreferences => ({ vectorScenery: false, landmarkLevel: 0, mapColorScheme: 'original' });
const validScheme = (value: unknown): value is WorldMapColorScheme => value === 'original' || value === 'terrain';
function validChoices(value: unknown): value is Pick<ViewPreferences, 'vectorScenery' | 'landmarkLevel'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.hasOwn(record, 'vectorScenery') && typeof record.vectorScenery === 'boolean'
    && Object.hasOwn(record, 'landmarkLevel') && [0, 1, 2, 3].includes(record.landmarkLevel as number);
}

/** Optional origin-local storage is untrusted and may be unavailable. */
export function loadViewPreferences(storage: Pick<Storage, 'getItem'> | null): ViewPreferences {
  try {
    const raw = storage?.getItem(VIEW_PREFERENCES_KEY);
    if (typeof raw !== 'string' || raw.length > MAX_BYTES || new TextEncoder().encode(raw).length > MAX_BYTES) return defaults();
    const value: unknown = JSON.parse(raw);
    if (!validChoices(value)) return defaults();
    const record = value as Record<string, unknown> & Pick<ViewPreferences, 'vectorScenery' | 'landmarkLevel'>;
    if (!Object.hasOwn(record, 'version') || record.version !== 1 || Object.keys(record).some(key => !FIELDS.includes(key))) return defaults();
    return { vectorScenery: record.vectorScenery, landmarkLevel: record.landmarkLevel,
      mapColorScheme: validScheme(record.mapColorScheme) ? record.mapColorScheme : 'original' };
  } catch { return defaults(); }
}

/** Snapshot validated display choices, defaulting the optional legacy scheme. */
export function saveViewPreferences(value: ViewPreferenceInput, storage: Pick<Storage, 'setItem'> | null): void {
  try {
    if (!value || !Object.hasOwn(value, 'vectorScenery') || !Object.hasOwn(value, 'landmarkLevel')) return;
    const snapshot = { vectorScenery: value.vectorScenery, landmarkLevel: value.landmarkLevel,
      mapColorScheme: Object.hasOwn(value, 'mapColorScheme') ? value.mapColorScheme : 'original' };
    if (!validChoices(snapshot) || !validScheme(snapshot.mapColorScheme)) return;
    storage?.setItem(VIEW_PREFERENCES_KEY, JSON.stringify({ version: 1, ...snapshot }));
  } catch { /* Persistence must not prevent changing the current view. */ }
}
