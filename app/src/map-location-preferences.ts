import { MAP_LOCATION_TYPES, type MapLocationType } from './map-location-types.ts';

/** Display filters only; no query, location, planning or aircraft state. */
export const MAP_LOCATION_PREFERENCES_KEY = 'gefly.map-location-preferences.v1';
const MAX_BYTES = 512;
const ALL_TYPES = MAP_LOCATION_TYPES.map(([type]) => type);

/** Capture each array entry once before checking or serializing it. */
function captureTypes(value: unknown): MapLocationType[] | null {
  if (!Array.isArray(value)) return null;
  const length = value.length;
  if (!Number.isSafeInteger(length) || length < 0 || length > ALL_TYPES.length) return null;
  const captured: unknown[] = [];
  for (let index = 0; index < length; index++) captured.push(value[index]);
  const selected = new Set<MapLocationType>();
  for (const type of captured) {
    if (typeof type !== 'string' || !ALL_TYPES.includes(type as MapLocationType)
      || selected.has(type as MapLocationType)) return null;
    selected.add(type as MapLocationType);
  }
  return ALL_TYPES.filter(type => selected.has(type));
}

/** Untrusted or unavailable storage falls back without rewriting the record. */
export function loadMapLocationPreferences(storage: Pick<Storage, 'getItem'> | null): MapLocationType[] {
  try {
    const raw = storage?.getItem(MAP_LOCATION_PREFERENCES_KEY);
    if (typeof raw !== 'string' || raw.length > MAX_BYTES
      || new TextEncoder().encode(raw).byteLength > MAX_BYTES) return [...ALL_TYPES];
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [...ALL_TYPES];
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length !== 2 || !Object.hasOwn(record, 'version')
      || !Object.hasOwn(record, 'types') || record.version !== 1) return [...ALL_TYPES];
    return captureTypes(record.types) ?? [...ALL_TYPES];
  } catch { return [...ALL_TYPES]; }
}

/** Persist one canonical snapshot, preserving an explicit all-off selection. */
export function saveMapLocationPreferences(types: readonly MapLocationType[], storage: Pick<Storage, 'setItem'> | null): boolean {
  try {
    if (!storage) return false;
    const selected = captureTypes(types);
    if (!selected) return false;
    const raw = JSON.stringify({ version: 1, types: selected });
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return false;
    storage.setItem(MAP_LOCATION_PREFERENCES_KEY, raw);
    return true;
  } catch { return false; }
}
