export const OFM_OVERLAY_PREFERENCES_KEY = 'gefly.ofm-overlay-preferences.v1';
export interface OfmOverlayPreferences { enabled: boolean; opacity: number }
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
const defaults = (): OfmOverlayPreferences => ({ enabled: false, opacity: .8 });

/** Save only the optional layer controls, never a map location or flight state. */
export function createOfmOverlayPreferences(storage?: PreferenceStorage | null) {
  let target: PreferenceStorage | null;
  try { target = storage === undefined ? globalThis.localStorage : storage; }
  catch { target = null; }
  return {
    read(): OfmOverlayPreferences {
      try {
        const raw = target?.getItem(OFM_OVERLAY_PREFERENCES_KEY);
        if (!raw || new TextEncoder().encode(raw).length > 128) return defaults();
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults();
        const v = value as Record<string, unknown>;
        if (Object.keys(v).length !== 3 || v.version !== 1 || typeof v.enabled !== 'boolean'
          || typeof v.opacity !== 'number' || !Number.isFinite(v.opacity) || v.opacity < 0 || v.opacity > 1) return defaults();
        return { enabled: v.enabled, opacity: v.opacity };
      } catch { return defaults(); }
    },
    write(value: Readonly<OfmOverlayPreferences>): void {
      if (typeof value.enabled !== 'boolean' || !Number.isFinite(value.opacity) || value.opacity < 0 || value.opacity > 1) return;
      try { target?.setItem(OFM_OVERLAY_PREFERENCES_KEY, JSON.stringify({ version: 1, enabled: value.enabled, opacity: value.opacity })); }
      catch { /* Optional chart controls remain usable without storage. */ }
    },
  };
}
