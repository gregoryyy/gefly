export interface MapStart { lat_rad: number; lon_rad: number; heading_rad: number; height_agl_ft: 0 | 1000 | 5000 | 10000 }
export const MAP_START_HEIGHTS_FT: readonly [0, 1000, 5000, 10000];
export function validMapStart(value: unknown): value is MapStart;
