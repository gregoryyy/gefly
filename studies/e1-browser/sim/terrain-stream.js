import { validateTerrainGrid, sampleTerrain } from './terrain.js';

const ROOT = '/terrain/region/';
const RAD = Math.PI / 180;
const BYTES = 129 * 129 * 8;
export const REGIONAL_TERRAIN = Object.freeze({ west: 7, south: 49.25, east: 10, north: 51.5, cols: 12, rows: 9, step: .25, tileCount: 108 });
const { west: WEST, south: SOUTH, east: EAST, north: NORTH, cols: COLS, rows: ROWS, step: TILE } = REGIONAL_TERRAIN;
const idAt = (col, row) => `e${WEST * 100 + col * TILE * 100}-n${SOUTH * 100 + row * TILE * 100}`;

const TIMEOUT_MS = 15000;

// Bound network wait and bytes before creating any full response buffer.
async function readBounded(url, limit, fetcher, signal) {
  const controller = new AbortController();
  let reader;
  const abort = () => controller.abort();
  if (signal?.aborted) throw new Error('Regional terrain request cancelled.');
  signal?.addEventListener('abort', abort, { once: true });
  let timer;
  const interrupted = new Promise((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('Regional terrain request timed out or was cancelled.')), { once: true });
    timer = setTimeout(abort, TIMEOUT_MS);
  });
  const work = (async () => {
    const response = await fetcher(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok || response.redirected) throw new Error('Regional terrain response unavailable or redirected.');
    const length = response.headers?.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('Regional terrain response too large.');
    if (!response.body?.getReader) throw new Error('Regional terrain response has no readable stream.');
    reader = response.body.getReader();
    const chunks = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || value.byteLength > limit - total) throw new Error('Regional terrain response too large.');
      total += value.byteLength; chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes.buffer;
  })();
  try { return await Promise.race([work, interrupted]); }
  finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
    controller.abort();
    if (reader) void reader.cancel().catch(() => {});
  }
}

export async function loadRegionalManifest(fetcher = globalThis.fetch, signal) {
  const bytes = await readBounded(ROOT + 'manifest.json', 100000, fetcher, signal);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const m = JSON.parse(text);
  if (m.version !== 1 || m.id !== 'rhein-main-dgm200-gcg-v1' || JSON.stringify(m.bounds) !== JSON.stringify([WEST, SOUTH, EAST, NORTH])
      || m.tile_degrees !== .25 || m.tile_nodes !== 129 || m.rows !== 'south-to-north'
      || m.physical_datum !== 'DHHN2016' || m.geoid_model !== 'GCG2016v2023_W'
      || m.encoding !== 'float32-le-interleaved-H-zeta' || !Array.isArray(m.tiles) || m.tiles.length !== COLS * ROWS)
    throw new Error('Unsupported regional terrain manifest.');
  const tiles = new Map();
  for (const t of m.tiles) {
    const col = Math.round((t.west_deg - WEST) / TILE), row = Math.round((t.south_deg - SOUTH) / TILE);
    const id = idAt(col, row);
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= COLS || row < 0 || row >= ROWS
        || t.west_deg !== WEST + col * TILE || t.south_deg !== SOUTH + row * TILE || t.east_deg !== t.west_deg + .25
        || t.north_deg !== t.south_deg + .25 || t.id !== id || t.asset !== id + '.f32'
        || t.width !== 129 || t.height !== 129 || t.bytes !== BYTES || !/^[a-f0-9]{64}$/.test(t.sha256)
        || tiles.has(id)) throw new Error('Invalid regional terrain tile metadata.');
    tiles.set(id, Object.freeze({ id, asset: t.asset, sha256: t.sha256, west_deg: t.west_deg, south_deg: t.south_deg,
      east_deg: t.east_deg, north_deg: t.north_deg, width: 129, height: 129, bytes: BYTES, slot: row * COLS + col }));
  }
  return tiles;
}

async function readTile(meta, fetcher, signal) {
  const bytes = await readBounded(ROOT + meta.asset + '?sha256=' + meta.sha256, BYTES, fetcher, signal);
  if (bytes.byteLength !== BYTES) throw new Error('Regional terrain tile size mismatch.');
  const hash = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
  if (hash !== meta.sha256) throw new Error('Regional terrain tile integrity check failed.');
  const physical_m = new Float64Array(129 * 129), geoid_m = new Float64Array(129 * 129), view = new DataView(bytes);
  for (let i = 0; i < physical_m.length; i++) { physical_m[i] = view.getFloat32(i * 8, true); geoid_m[i] = view.getFloat32(i * 8 + 4, true); }
  const grid = { ...meta, version: 1, west_rad: meta.west_deg * RAD, south_rad: meta.south_deg * RAD,
    east_rad: meta.east_deg * RAD, north_rad: meta.north_deg * RAD, physical_m, geoid_m };
  if (!validateTerrainGrid(grid)) throw new Error('Invalid regional terrain nodes.');
  return Object.freeze(grid);
}

// Fine-first away from the edge. A derived 0.02-degree feather matches the
// native callback; this transition is not a survey or terrain-accuracy claim.
export function atlasGridAt(fine, tiles, lat, lon) {
  if (fine && sampleTerrain(fine, lat, lon)) return fine;
  let best = null;
  for (const tile of tiles.values()) if ((!best || tile.slot < best.slot) && sampleTerrain(tile, lat, lon)) best = tile;
  return best;
}
function atlasParts(fine, tiles, lat, lon) {
  const coarse = atlasGridAt(null, tiles, lat, lon);
  const fineSample = fine && sampleTerrain(fine, lat, lon);
  const coarseSample = coarse && sampleTerrain(coarse, lat, lon);
  if (!fineSample) return coarseSample ? { sample: coarseSample, grid: coarse } : null;
  if (!coarseSample) return { sample: fineSample, grid: fine };
  const distances = [lon - fine.west_rad, fine.east_rad - lon, lat - fine.south_rad, fine.north_rad - lat];
  let edge = 0;
  for (let i = 1; i < 4; i++) if (distances[i] < distances[edge]) edge = i;
  const band = .02 * RAD, t = Math.max(0, Math.min(1, distances[edge] / band));
  const weight = t * t * (3 - 2 * t), dw = 6 * t * (1 - t) / band;
  const physical_m = coarseSample.physical_m + weight * (fineSample.physical_m - coarseSample.physical_m);
  const geoid_m = coarseSample.geoid_m + weight * (fineSample.geoid_m - coarseSample.geoid_m);
  return { sample: { physical_m, geoid_m, ellipsoid_m: physical_m + geoid_m }, fine, coarse,
    fineSample, coarseSample, weight, dlon: edge === 0 ? dw : edge === 1 ? -dw : 0,
    dlat: edge === 2 ? dw : edge === 3 ? -dw : 0 };
}
export function sampleAtlas(fine, tiles, lat, lon) { return atlasParts(fine, tiles, lat, lon)?.sample ?? null; }
function physicalGradientRadians(grid, lat, lon) {
  const gx = (lon - grid.west_rad) / (grid.east_rad - grid.west_rad) * (grid.width - 1);
  const gy = (lat - grid.south_rad) / (grid.north_rad - grid.south_rad) * (grid.height - 1);
  const x = Math.min(grid.width - 2, Math.max(0, Math.floor(gx))), y = Math.min(grid.height - 2, Math.max(0, Math.floor(gy)));
  const sw = y * grid.width + x, se = sw + 1, nw = sw + grid.width, ne = nw + 1, h = grid.physical_m;
  const lower = gy - y < gx - x;
  return { lon: (lower ? h[se] - h[sw] : h[ne] - h[nw]) * (grid.width - 1) / (grid.east_rad - grid.west_rad),
    lat: (lower ? h[ne] - h[se] : h[nw] - h[sw]) * (grid.height - 1) / (grid.north_rad - grid.south_rad) };
}
export function sampleAtlasGradient(fine, tiles, lat, lon) {
  const parts = atlasParts(fine, tiles, lat, lon);
  if (!parts) return null;
  let gradient;
  if (parts.grid) gradient = physicalGradientRadians(parts.grid, lat, lon);
  else {
    const a = physicalGradientRadians(parts.fine, lat, lon), b = physicalGradientRadians(parts.coarse, lat, lon);
    const delta = parts.fineSample.physical_m - parts.coarseSample.physical_m;
    gradient = { lon: b.lon + parts.weight * (a.lon - b.lon) + delta * parts.dlon,
      lat: b.lat + parts.weight * (a.lat - b.lat) + delta * parts.dlat };
  }
  const flattening = 1 / 298.257223563, e2 = flattening * (2 - flattening), d = 1 - e2 * Math.sin(lat) ** 2;
  const n = 6378137 / Math.sqrt(d), m = 6378137 * (1 - e2) / d ** 1.5;
  const east_slope = gradient.lon / ((n + parts.sample.physical_m) * Math.cos(lat));
  const north_slope = gradient.lat / (m + parts.sample.physical_m);
  return [east_slope, north_slope].every(Number.isFinite) ? { east_slope, north_slope } : null;
}

export class TerrainStream {
  constructor(manifest, install, remove, fetcher = globalThis.fetch) {
    this.manifest = manifest; this.install = install; this.remove = remove; this.fetcher = fetcher; this.tiles = new Map(); this.controller = new AbortController();
  }
  center(lat, lon) {
    const x = lon / RAD, y = lat / RAD;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x <= WEST || x >= EAST || y <= SOUTH || y >= NORTH) return null;
    return [Math.floor((x - WEST) / TILE), Math.floor((y - SOUTH) / TILE)];
  }
  sample(lat, lon) { return sampleAtlas(null, this.tiles, lat, lon); }
  gridAt(lat, lon) { return atlasGridAt(null, this.tiles, lat, lon); }
  cancel() { this.controller.abort(); }
  async update(lat, lon) {
    const center = this.center(lat, lon);
    if (!center) throw new Error('Regional terrain coverage boundary reached.');
    const [col, row] = center, wanted = [];
    for (let y = Math.max(0, row - 1); y <= Math.min(ROWS - 1, row + 1); y++)
      for (let x = Math.max(0, col - 1); x <= Math.min(COLS - 1, col + 1); x++) wanted.push(idAt(x, y));
    for (const [id, grid] of this.tiles) if (!wanted.includes(id)) { this.remove(grid); this.tiles.delete(id); }
    // Fetch sequentially so the cache plus staged downloads never exceeds nine tiles.
    for (const id of wanted) if (!this.tiles.has(id)) {
      const grid = await readTile(this.manifest.get(id), this.fetcher, this.controller.signal);
      if (this.controller.signal.aborted) throw new Error('Regional terrain request cancelled.');
      this.install(grid); this.tiles.set(id, grid);
    }
  }
  needsUpdate(lat, lon) {
    const center = this.center(lat, lon);
    return !center || !this.tiles.has(idAt(center[0], center[1]))
      || this.key !== center.join(',');
  }
  async move(lat, lon) { await this.update(lat, lon); this.key = this.center(lat, lon).join(','); }
}
