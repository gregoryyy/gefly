import { validateTerrainGrid, sampleTerrain } from './terrain.js';
import { WORLD_TERRAIN, worldCellAt, worldTileId, sampleWorldTerrain, terrainDigest, validWorldTerrainTile } from './world-terrain.js';

const ROOT = '/terrain/region/';
const RAD = Math.PI / 180;
const BYTES = 129 * 129 * 8;
export const REGIONAL_TERRAIN = Object.freeze({ west: 6, south: 47, east: 14, north: 51.75, cols: 32, rows: 19, step: .25, tileCount: 608 });
const { west: WEST, south: SOUTH, east: EAST, north: NORTH, cols: COLS, rows: ROWS, step: TILE } = REGIONAL_TERRAIN;
const idAt = (col, row) => `e${WEST * 100 + col * TILE * 100}-n${SOUTH * 100 + row * TILE * 100}`;

const TIMEOUT_MS = 15000;
const OPTIONAL_BUDGET_MS = 5000;
function optionalBudget(signal) {
  const controller = new AbortController(), abort = () => controller.abort();
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, OPTIONAL_BUDGET_MS);
  return { signal: controller.signal, dispose() { clearTimeout(timer); signal?.removeEventListener('abort', abort); } };
}

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

async function digest(bytes) {
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
}
async function decodeIndex(bytes, expected, signal) {
  if (typeof DecompressionStream !== 'function') throw new Error('Regional terrain decompression unavailable.');
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  let timer, onAbort;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  const interrupted = new Promise((_, reject) => {
    const abort = () => { cancel(); reject(new Error('Regional terrain index timed out or was cancelled.')); };
    timer = setTimeout(abort, TIMEOUT_MS);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    onAbort = abort;
  });
  const work = (async () => {
    const chunks = []; let total = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (value.byteLength > expected - total) throw new Error('Regional terrain decoded index too large.');
      total += value.byteLength; chunks.push(value);
    }
    if (total !== expected) throw new Error('Regional terrain decoded index size mismatch.');
    const joined = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(joined));
  })();
  try { return await Promise.race([work, interrupted]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); cancel(); }
}
export async function loadRegionalManifest(fetcher = globalThis.fetch, signal) {
  const bytes = await readBounded(ROOT + 'manifest.json', 100000, fetcher, signal);
  const m = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const index = m.index;
  if (m.version !== 2 || m.id !== 'southern-germany-dgm200-gcg-v2' || JSON.stringify(m.bounds) !== JSON.stringify([WEST, SOUTH, EAST, NORTH])
      || m.tile_degrees !== .25 || m.tile_nodes !== 129 || m.rows !== 'south-to-north'
      || m.physical_datum !== 'DHHN2016' || m.geoid_model !== 'GCG2016v2023' || m.nodata !== 'paired-NaN'
      || m.encoding !== 'float32-le-interleaved-H-zeta' || !index || index.asset !== 'tiles-v2.json.bin'
      || !Number.isInteger(index.bytes) || index.bytes < 1 || index.bytes > 100000
      || !Number.isInteger(index.decoded_bytes) || index.decoded_bytes < 1 || index.decoded_bytes > 300000
      || index.count !== COLS * ROWS || index.available !== 475 || !/^[a-f0-9]{64}$/.test(index.sha256))
    throw new Error('Unsupported regional terrain manifest.');
  const packed = await readBounded(ROOT + index.asset + '?sha256=' + index.sha256, index.bytes, fetcher, signal);
  if (packed.byteLength !== index.bytes || await digest(packed) !== index.sha256) throw new Error('Regional terrain index integrity check failed.');
  const decoded = await decodeIndex(packed, index.decoded_bytes, signal);
  if (decoded.version !== 2 || !Array.isArray(decoded.tiles) || decoded.tiles.length !== COLS * ROWS) throw new Error('Invalid regional terrain index.');
  const tiles = new Map(), seen = new Set();
  for (const t of decoded.tiles) {
    const col = Math.round((t.west_deg - WEST) / TILE), row = Math.round((t.south_deg - SOUTH) / TILE);
    const id = idAt(col, row);
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= COLS || row < 0 || row >= ROWS
        || t.west_deg !== WEST + col * TILE || t.south_deg !== SOUTH + row * TILE || t.east_deg !== t.west_deg + .25
        || t.north_deg !== t.south_deg + .25 || t.id !== id || t.width !== 129 || t.height !== 129 || seen.has(id)
        || !Number.isInteger(t.valid_nodes) || t.valid_nodes < 0 || t.valid_nodes > 129 * 129
        || t.coverage !== (t.valid_nodes === 129 * 129 ? 'full' : t.valid_nodes ? 'partial' : 'unavailable'))
      throw new Error('Invalid regional terrain tile metadata.');
    seen.add(id);
    if (!t.valid_nodes) {
      if (t.asset !== undefined || t.bytes !== undefined || t.sha256 !== undefined) throw new Error('Unavailable regional terrain tile has an asset.');
      continue;
    }
    if (t.asset !== id + '.f32' || t.bytes !== BYTES || !/^[a-f0-9]{64}$/.test(t.sha256)) throw new Error('Invalid regional terrain tile metadata.');
    tiles.set(id, Object.freeze({ id, asset: t.asset, sha256: t.sha256, west_deg: t.west_deg, south_deg: t.south_deg,
      east_deg: t.east_deg, north_deg: t.north_deg, width: 129, height: 129, bytes: BYTES, slot: row * COLS + col,
      coverage: t.coverage, valid_nodes: t.valid_nodes, ...(t.coverage === 'partial' ? {masked:true} : {}) }));
  }
  if (tiles.size !== index.available) throw new Error('Regional terrain availability count mismatch.');
  return tiles;
}

/** Optional regional enhancement has one total budget, including its index
 * request/decode. Caller cancellation remains cancellation, never degradation. */
export async function loadRegionalManifestOptional(fetcher = globalThis.fetch, signal) {
  const budget = optionalBudget(signal);
  try { return await loadRegionalManifest(fetcher, budget.signal); }
  catch (error) { if (signal?.aborted) throw error; return null; }
  finally { budget.dispose(); }
}

async function readTile(meta, fetcher, signal) {
  const bytes = await readBounded(ROOT + meta.asset + '?sha256=' + meta.sha256, BYTES, fetcher, signal);
  if (bytes.byteLength !== BYTES) throw new Error('Regional terrain tile size mismatch.');
  const hash = await digest(bytes);
  if (hash !== meta.sha256) throw new Error('Regional terrain tile integrity check failed.');
  const physical_m = new Float64Array(129 * 129), geoid_m = new Float64Array(129 * 129), view = new DataView(bytes);
  for (let i = 0; i < physical_m.length; i++) { physical_m[i] = view.getFloat32(i * 8, true); geoid_m[i] = view.getFloat32(i * 8 + 4, true); }
  const grid = { ...meta, version: 1, west_rad: meta.west_deg * RAD, south_rad: meta.south_deg * RAD,
    east_rad: meta.east_deg * RAD, north_rad: meta.north_deg * RAD, physical_m, geoid_m };
  if (!validateTerrainGrid(grid) || physical_m.reduce((count, value) => count + Number(Number.isFinite(value)), 0) !== meta.valid_nodes) throw new Error('Invalid regional terrain nodes.');
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
    if (!this.manifest.has(idAt(col, row))) throw new Error('Regional terrain source coverage unavailable.');
    for (const [id, grid] of this.tiles) if (!wanted.includes(id)) { this.remove(grid); this.tiles.delete(id); }
    // Fetch sequentially so the cache plus staged downloads never exceeds nine tiles.
    for (const id of wanted) if (this.manifest.has(id) && !this.tiles.has(id)) {
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

/** Coarse global baseline with valid regional samples preferred; nine native cells. */
export class WorldTerrainStream {
  constructor(world, manifest, install, remove, fetcher = globalThis.fetch) {
    if (!validateTerrainGrid(world) || world.width !== 361 || world.height !== 181) throw new Error('Invalid bundled world terrain.');
    this.world = world; this.manifest = manifest ?? new Map(); this.install = install; this.remove = remove; this.fetcher = fetcher;
    this.tiles = new Map(); this.sources = new Map(); this.failedSources = new Set(); this.controller = new AbortController();
    this.key = null; this.busy = false;
  }
  center(lat, lon) { return worldCellAt(lat, lon); }
  sample(lat, lon) { return sampleAtlas(null, this.tiles, lat, lon); }
  gridAt(lat, lon) { return atlasGridAt(null, this.tiles, lat, lon); }
  quality(lat, lon) {
    const grid = this.gridAt(lat, lon);
    return grid ? ({ regional: 1, global: 2, mixed: 3 })[grid.source] : null;
  }
  cancel() { this.controller.abort(); }
  needsUpdate(lat, lon) { const center = this.center(lat, lon); return !center || center.join(',') !== this.key; }
  nodeOwner(lon, lat) {
    if (lon < WEST || lon > EAST || lat < SOUTH || lat > NORTH) return null;
    const col = Math.min(COLS - 1, Math.floor((lon - WEST) / TILE)), row = Math.min(ROWS - 1, Math.floor((lat - SOUTH) / TILE));
    return this.manifest.get(idAt(col, row)) ?? null;
  }
  regionalSample(lon, lat) {
    const meta = this.nodeOwner(lon, lat), source = meta && this.sources.get(meta.id);
    return source ? sampleTerrain(source, lat * RAD, lon * RAD) : null;
  }
  async compose(col, row, slot) {
    const physical_m = new Float64Array(129 * 129), geoid_m = new Float64Array(129 * 129);
    let regional = 0;
    for (let y = 0; y < 129; y++) for (let x = 0; x < 129; x++) {
      // Integer lattice first: all cells compute identical shared node inputs.
      const lon = -180 + (col + x / 128) * WORLD_TERRAIN.step, lat = -90 + (row + y / 128) * WORLD_TERRAIN.step;
      const sample = this.regionalSample(lon, lat);
      let h, n;
      if (sample) { h = sample.physical_m; n = sample.geoid_m; regional++; }
      else {
        const global = sampleWorldTerrain(this.world, lat * RAD, lon * RAD);
        if (!global) throw new Error('Bundled world terrain sample unavailable.');
        h = global.physical_m;
        n = global.geoid_m;
      }
      physical_m[y * 129 + x] = h; geoid_m[y * 129 + x] = n;
    }
    const source = regional === physical_m.length ? 'regional' : regional ? 'mixed' : 'global';
    const packed = new ArrayBuffer(129 * 129 * 16), view = new DataView(packed);
    for (let i = 0; i < physical_m.length; i++) { view.setFloat64(i * 16, physical_m[i], true); view.setFloat64(i * 16 + 8, geoid_m[i], true); }
    const step = WORLD_TERRAIN.step;
    const grid = { version: 1, id: worldTileId(col, row), slot, width: 129, height: 129, source,
      west_rad: (-180 + col * step) * RAD, south_rad: (-90 + row * step) * RAD,
      east_rad: (-180 + (col + 1) * step) * RAD, north_rad: (-90 + (row + 1) * step) * RAD,
      physical_m, geoid_m, sha256: await terrainDigest(packed),
      physical_datum: source === 'regional' ? 'DHHN2016' : source === 'global' ? 'EGM2008' : 'DHHN2016/EGM2008 approximate transition',
      geoid_model: source === 'regional' ? 'GCG2016v2023' : source === 'global' ? 'EGM2008 coarse geoid' : 'GCG2016v2023/EGM2008 approximate transition' };
    if (!validWorldTerrainTile(grid)) throw new Error('Invalid composed world terrain cell.');
    return Object.freeze(grid);
  }
  async move(lat, lon) {
    if (this.busy) throw new Error('World terrain update already in progress.');
    if (this.controller.signal.aborted) throw new Error('World terrain request cancelled.');
    const center = this.center(lat, lon);
    if (!center) throw new Error('World terrain flight coverage is limited to latitudes between 89.5°S and 89.5°N.');
    this.busy = true;
    try {
      const [col, row] = center, wanted = [], step = WORLD_TERRAIN.step;
      for (let y = Math.max(WORLD_TERRAIN.firstRow, row - 1); y <= Math.min(WORLD_TERRAIN.lastRow, row + 1); y++)
        for (let x = col - 1; x <= col + 1; x++) wanted.push([(x + WORLD_TERRAIN.cols) % WORLD_TERRAIN.cols, y]);
      const required = new Map();
      for (const [x, y] of wanted) for (const dx of [0, 1]) for (const dy of [0, 1]) {
        const meta = this.nodeOwner(-180 + (x + dx) * step, -90 + (y + dy) * step);
        if (meta) required.set(meta.id, meta);
      }
      for (const id of this.sources.keys()) if (!required.has(id)) this.sources.delete(id);
      const budget = optionalBudget(this.controller.signal);
      try {
        for (const [id, meta] of required) if (!this.sources.has(id) && !this.failedSources.has(id)) {
          try { this.sources.set(id, await readTile(meta, this.fetcher, budget.signal)); }
          catch (error) { if (this.controller.signal.aborted) throw error; this.failedSources.add(id); }
        }
      } finally { budget.dispose(); }

      const staged = new Map(); let slot = 0;
      for (const [x, y] of wanted) {
        const id = worldTileId(x, y), previous = this.tiles.get(id);
        staged.set(id, previous ? Object.freeze({ ...previous, slot: slot++ }) : await this.compose(x, y, slot++));
      }
      if (this.controller.signal.aborted) throw new Error('World terrain request cancelled.');
      for (const grid of this.tiles.values()) this.remove(grid);
      this.tiles.clear();
      for (const [id, grid] of staged) { this.install(grid); this.tiles.set(id, grid); }
      this.key = center.join(',');
    } finally { this.busy = false; }
  }
}
