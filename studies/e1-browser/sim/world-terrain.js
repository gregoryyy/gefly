import { validateTerrainGrid } from './terrain.js';

const RAD = Math.PI / 180;
const PACKAGE_URL = '/terrain/world/world-v1.json';
const DATA_URL = '/terrain/world/world-v1.f32';
const WIDTH = 361, HEIGHT = 181, BYTES = WIDTH * HEIGHT * 8;
export const WORLD_TERRAIN = Object.freeze({ step: .25, cols: 1440, rows: 720, nodes: 129,
  south: -89.5, north: 89.5, firstRow: 1, lastRow: 718, maxResident: 9 });
export const LEGACY_WORLD_TERRAIN = WORLD_TERRAIN;
export function worldCellAt(lat, lon, profile = WORLD_TERRAIN) {
  if (![lat, lon].every(Number.isFinite) || lat <= profile.south * RAD || lat >= profile.north * RAD
    || lon < -Math.PI || lon > Math.PI) return null;
  return [Math.min(profile.cols - 1, Math.floor((lon / RAD + 180) / profile.step)) % profile.cols,
    Math.floor((lat / RAD + 90) / profile.step)];
}
export const worldTileId = (col, row) => `world-c${col}-r${row}`;
export function worldTerrainProfile(grid) {
  if (!grid || typeof grid !== 'object' || typeof grid.id !== 'string') return null;
  const match = /^world-c(0|[1-9]\d*)-r(0|[1-9]\d*)$/.exec(grid.id);
  if (!match) return null;
  const col = Number(match[1]), row = Number(match[2]);
  if (col >= WORLD_TERRAIN.cols || row < WORLD_TERRAIN.firstRow || row > WORLD_TERRAIN.lastRow) return null;
  const bounds = [-180 + col / 4, -90 + row / 4, -180 + (col + 1) / 4, -90 + (row + 1) / 4];
  return [grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad]
    .every((value, i) => Number.isFinite(value) && Math.abs(value - bounds[i] * RAD) < 1e-12) ? WORLD_TERRAIN : null;
}
/** Shared worker/session/render identity boundary; slots are reusable, geographic IDs are not. */
export function validWorldTerrainTile(grid) {
  return validateTerrainGrid(grid) && grid.width === 129 && grid.height === 129 && grid.masked === undefined
    && Number.isInteger(grid.slot) && grid.slot >= 0 && grid.slot <= 8
    && ['regional', 'global', 'mixed'].includes(grid.source) && /^[a-f0-9]{64}$/.test(grid.sha256)
    && worldTerrainProfile(grid) !== null;
}

export async function terrainDigest(bytes) {
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
}

/** Same-origin fixed assets only. Abort, byte and deadline bounds also cover
 * fetch implementations which do not settle when their signal is aborted. */
export async function readWorldBytes(url, limit, fetcher, signal) {
  const controller = new AbortController(); let reader, timer;
  const abort = () => controller.abort();
  if (signal?.aborted) throw new Error('World terrain request cancelled.');
  signal?.addEventListener('abort', abort, { once: true });
  const interrupted = new Promise((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('World terrain request timed out or cancelled.')), { once: true });
    timer = setTimeout(abort, 15000);
  });
  const work = (async () => {
    const response = await fetcher(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok || response.redirected) throw new Error('Bundled world terrain unavailable or redirected.');
    const length = response.headers?.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('World terrain response too large.');
    if (!response.body?.getReader) throw new Error('World terrain response has no readable stream.');
    reader = response.body.getReader(); const chunks = []; let total = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      if (!(value instanceof Uint8Array) || value.byteLength > limit - total) throw new Error('World terrain response too large.');
      total += value.byteLength; chunks.push(value);
    }
    const joined = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    return joined.buffer;
  })();
  try { return await Promise.race([work, interrupted]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); if (reader) void reader.cancel().catch(() => {}); }
}

export async function loadWorldTerrainPackage(fetcher = globalThis.fetch, signal) {
  const controller = new AbortController(), abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 15000);
  try {
    const grid = await readWorldPackage(fetcher, controller.signal);
    if (controller.signal.aborted) throw new Error('World terrain request timed out or cancelled.');
    return grid;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

async function readWorldPackage(fetcher, signal) {
  const raw = await readWorldBytes(PACKAGE_URL, 100000, fetcher, signal);
  const m = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  if (m.version !== 1 || m.id !== 'world-etopo2022-1deg-egm2008-v1' || m.width !== WIDTH || m.height !== HEIGHT
    || JSON.stringify(m.bounds) !== '[-180,-90,180,90]' || m.rows !== 'south-to-north'
    || m.encoding !== 'float32-le-interleaved-H-zeta' || m.physical_datum !== 'EGM2008' || m.geoid_model !== 'EGM2008'
    || m.asset !== 'world-v1.f32' || m.bytes !== BYTES || !/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error('Unsupported bundled world terrain metadata.');
  const bytes = await readWorldBytes(DATA_URL + '?sha256=' + m.sha256, BYTES, fetcher, signal);
  if (bytes.byteLength !== BYTES || await terrainDigest(bytes) !== m.sha256) throw new Error('Bundled world terrain integrity check failed.');
  const physical_m = new Float64Array(WIDTH * HEIGHT), geoid_m = new Float64Array(physical_m.length), view = new DataView(bytes);
  for (let i = 0; i < physical_m.length; i++) { physical_m[i] = view.getFloat32(i * 8, true); geoid_m[i] = view.getFloat32(i * 8 + 4, true); }
  const grid = { ...m, west_rad: -Math.PI, south_rad: -Math.PI / 2, east_rad: Math.PI, north_rad: Math.PI / 2, physical_m, geoid_m };
  if (!validateTerrainGrid(grid)) throw new Error('Invalid bundled world terrain nodes.');
  for (let row = 0; row < HEIGHT; row++) {
    const start = row * WIDTH, end = start + WIDTH - 1;
    if (physical_m[start] !== physical_m[end] || geoid_m[start] !== geoid_m[end]) throw new Error('Bundled world terrain antimeridian nodes disagree.');
  }
  return Object.freeze(grid);
}

/** Bilinear resampling of the explicitly coarse one-degree source. The final
 * 129² cell uses the shared native/display triangle interpolation afterwards. */
export function sampleWorldTerrain(grid, lat, lon) {
  if (!grid || ![lat, lon].every(Number.isFinite) || lat < -Math.PI / 2 || lat > Math.PI / 2 || lon < -Math.PI || lon > Math.PI) return null;
  const x = (lon === Math.PI ? 0 : lon / RAD + 180), y = Math.max(0, Math.min(180, lat / RAD + 90));
  const ix = Math.max(0, Math.min(359, Math.floor(x))), iy = Math.min(179, Math.floor(y));
  const dx = x - ix, dy = y - iy;
  const interpolate = values => {
    const sw = iy * WIDTH + ix, se = sw + 1, nw = sw + WIDTH, ne = nw + 1;
    return (1 - dy) * ((1 - dx) * values[sw] + dx * values[se]) + dy * ((1 - dx) * values[nw] + dx * values[ne]);
  };
  const physical_m = interpolate(grid.physical_m), geoid_m = interpolate(grid.geoid_m);
  return [physical_m, geoid_m].every(Number.isFinite) ? { physical_m, geoid_m, ellipsoid_m: physical_m + geoid_m } : null;
}
