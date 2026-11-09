import { WORLD_TERRAIN } from './world-terrain.js';

export const MAP_START_HEIGHTS_FT = Object.freeze([0, 1000, 5000, 10000]);
const FIELDS = ['lat_rad', 'lon_rad', 'heading_rad', 'height_agl_ft'];
const RAD = Math.PI / 180;

/** A map launch request, not a native checkpoint or an MSL/ellipsoid height. */
export function validMapStart(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Reflect.ownKeys(value).length === FIELDS.length && FIELDS.every(key => Object.hasOwn(value, key))
    && FIELDS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && value.lat_rad > WORLD_TERRAIN.south * RAD && value.lat_rad < WORLD_TERRAIN.north * RAD
    && value.lon_rad >= -Math.PI && value.lon_rad <= Math.PI
    && value.heading_rad >= 0 && value.heading_rad < 2 * Math.PI
    && MAP_START_HEIGHTS_FT.includes(value.height_agl_ft);
}
