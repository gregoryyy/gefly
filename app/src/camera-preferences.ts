export const CAMERA_PREFERENCES_KEY = 'gefly.camera-preferences.v1';
type CameraStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Only the return-animation preference is saved; camera pose remains transient. */
export function createCameraPreferences(storage?: CameraStorage | null) {
  let target: CameraStorage | null;
  try { target = storage === undefined ? globalThis.localStorage : storage; }
  catch { target = null; }
  return {
    read(): boolean {
      try {
        const raw = target?.getItem(CAMERA_PREFERENCES_KEY);
        if (!raw || new TextEncoder().encode(raw).length > 128) return true;
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
        const v = value as Record<string, unknown>;
        return v.version === 1 && Object.keys(v).length === 2 && typeof v.animate_return === 'boolean'
          ? v.animate_return : true;
      } catch { return true; }
    },
    write(animate_return: boolean): void {
      if (typeof animate_return !== 'boolean') return;
      try { target?.setItem(CAMERA_PREFERENCES_KEY, JSON.stringify({ version: 1, animate_return })); }
      catch { /* An unavailable preference store cannot prevent view control. */ }
    },
  };
}
