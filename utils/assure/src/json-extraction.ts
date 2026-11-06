/** One reviewed generated cartography exception; all other JSON stays structured. */
export const GENERATED_STYLE_PROFILE = Object.freeze({
  path: 'app/public/mapdata/terrain-style.json',
  sha256: 'f6ed255e627a3dbc74dcb0a27cc982c75872c20a31d5c7815b717ac5c150b048',
  mode: 'file-level' as const,
});
export interface JsonExtractionProfile {
  path: string; sha256: string; mode: 'file-level'; reason: string;
}
export function parseJsonExtractionProfiles(raw: unknown): JsonExtractionProfile[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 1) throw new Error('jsonExtractionProfiles: at most one reviewed generated style profile');
  return raw.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || Object.keys(item).sort().join() !== 'mode,path,reason,sha256'
      || item.path !== GENERATED_STYLE_PROFILE.path || item.sha256 !== GENERATED_STYLE_PROFILE.sha256
      || item.mode !== GENERATED_STYLE_PROFILE.mode || typeof item.reason !== 'string'
      || !item.reason.trim() || item.reason.length > 2000) {
      throw new Error('jsonExtractionProfiles: unapproved path, hash, mode or reason');
    }
    return { path: item.path, sha256: item.sha256, mode: item.mode, reason: item.reason };
  });
}
