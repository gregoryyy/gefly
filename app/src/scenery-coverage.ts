import { MAP_TERRAIN_BOUNDS } from './map-terrain-style.ts';

const R = 6371000, DEG = Math.PI / 180;
const MAX_LAT = Math.atan(Math.sinh(Math.PI));
const wrap = (lon: number) => ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const valid = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= Math.PI / 2 && Math.abs(lon) <= Math.PI;
export interface SceneryTile { readonly z: number; readonly x: number; readonly y: number; readonly key: string }
type Rectangle = readonly [west: number, south: number, east: number, north: number];

/** Spherical great-circle distance; invalid coordinates have no finite distance. */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!valid(lat1, lon1) || !valid(lat2, lon2)) return Infinity;
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(wrap(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
function rectangle(tile: SceneryTile): Rectangle {
  const n = 2 ** tile.z;
  return [tile.x / n * 2 * Math.PI - Math.PI, Math.atan(Math.sinh(Math.PI * (1 - 2 * (tile.y + 1) / n))),
    (tile.x + 1) / n * 2 * Math.PI - Math.PI, Math.atan(Math.sinh(Math.PI * (1 - 2 * tile.y / n)))];
}
/** Minimum spherical distance to a longitude/latitude rectangle, not its center. */
function rectangleDistance(lat: number, lon: number, [west, south, east, north]: Rectangle): number {
  if (lon >= west && lon <= east) return Math.max(south - lat, lat - north, 0) * R;
  const edge = Math.abs(wrap(lon - west)) <= Math.abs(wrap(lon - east)) ? west : east;
  // Closest point on the meridian great-circle, constrained to the tile edge.
  const closestLat = Math.atan2(Math.sin(lat), Math.cos(lat) * Math.cos(wrap(edge - lon)));
  return Math.min(distanceMeters(lat, lon, south, edge), distanceMeters(lat, lon, north, edge),
    closestLat >= south && closestLat <= north ? distanceMeters(lat, lon, closestLat, edge) : Infinity);
}

/** Nearest rectangle intersections, capped at512 tiles. X wraps at the date line;
 * latitude clamps to Web Mercator's edge. A limit can truncate radius coverage. */
export function tilesWithinRadius(lat_rad: number, lon_rad: number, z: number, radius_m: number, limit: number): readonly SceneryTile[] {
  if (!valid(lat_rad, lon_rad) || !Number.isInteger(z) || z < 0 || z > 22
    || !Number.isFinite(radius_m) || radius_m < 0 || !Number.isInteger(limit) || limit < 1) return [];
  const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat_rad)), lon = wrap(lon_rad), n = 2 ** z;
  const cap = Math.min(limit, 512), result: SceneryTile[] = [], seen = new Set<string>();
  const queue: {tile: SceneryTile; distance: number; center: number}[] = [];
  function add(x: number, y: number): void {
    if (y < 0 || y >= n) return;
    x = (x % n + n) % n;
    const key = `${z}/${x}/${y}`; if (seen.has(key)) return; seen.add(key);
    const tile = {z, x, y, key}, box = rectangle(tile);
    queue.push({tile, distance: rectangleDistance(lat, lon, box), center: distanceMeters(lat, lon, (box[1] + box[3]) / 2, (box[0] + box[2]) / 2)});
  }
  add(Math.min(n - 1, Math.floor((lon + Math.PI) / (2 * Math.PI) * n)),
    Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * n))));
  while (queue.length && result.length < cap) {
    queue.sort((a,b) => a.distance - b.distance || a.center - b.center || a.tile.y - b.tile.y || a.tile.x - b.tile.x);
    const next = queue.shift()!; if (next.distance > radius_m + 1e-6) break;
    result.push(next.tile);
    add(next.tile.x - 1, next.tile.y); add(next.tile.x + 1, next.tile.y);
    add(next.tile.x, next.tile.y - 1); add(next.tile.x, next.tile.y + 1);
  }
  return result;
}

/** Display-resource warming only; never installs terrain or changes physics.
 * Budgets: map48, coarse64, detail64, terrain24; at most200 same-origin URLs. */
export function planSceneryPrefetch(lat_rad: number, lon_rad: number, vector: boolean): readonly string[] {
  if (!valid(lat_rad, lon_rad)) return [];
  const items: {url: string; distance: number; tier: number}[] = [];
  function layer(prefix: string, suffix: string, z: number, radius: number, cap: number, bounds: readonly number[], tier: number): void {
    // Extra candidates allow clipping at the coverage edge before applying budget.
    const tiles = tilesWithinRadius(lat_rad, lon_rad, z, radius, 512).filter(tile => {
      const [w,s,e,n] = rectangle(tile); return e >= bounds[0] * DEG && w <= bounds[2] * DEG && n >= bounds[1] * DEG && s <= bounds[3] * DEG;
    }).slice(0, cap);
    for (const tile of tiles) items.push({url: `${prefix}/${tile.key}.${suffix}`, distance: rectangleDistance(lat_rad, lon_rad, rectangle(tile)), tier});
  }
  layer('/scenery/map', 'png', 10, 30000, 48, [6,47,14,51.75], 2);
  const bounds = vector ? MAP_TERRAIN_BOUNDS : [7,49,10,51.5];
  const prefix = vector ? '/scenery/vector' : '/scenery/imagery', suffix = vector ? 'pbf' : 'png';
  layer(prefix, suffix, 14, 2000, 64, bounds, 0);
  layer(prefix, suffix, 11, 20000, 64, bounds, 1);
  const terrain = [];
  for (let west = 7; west < 10; west += .25) for (let south = 49.25; south < 51.5; south += .25) {
    const distance = rectangleDistance(lat_rad, lon_rad, [west*DEG,south*DEG,(west+.25)*DEG,(south+.25)*DEG]);
    if (distance <= 35000) terrain.push({url:`/terrain/region/e${Math.round(west*100)}-n${Math.round(south*100)}.f32`,distance,tier:3});
  }
  terrain.sort((a,b)=>a.distance-b.distance || a.url.localeCompare(b.url));items.push(...terrain.slice(0,24));
  items.sort((a,b)=>a.distance-b.distance || a.tier-b.tier || a.url.localeCompare(b.url));
  return items.map(item=>item.url);
}
