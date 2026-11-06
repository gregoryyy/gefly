import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Fixed 2021 public COG collection. Public catalogue documents missing tiles;
// absence is unavailable data, never permission to invent ocean/zero ground.
const HOST = 'https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/';
const HEADER_BYTES = 16384, MAX_RANGE_BYTES = 5 * 1024 * 1024;
const MAX_OBJECT_BYTES = 80 * 1024 * 1024, BLOCK_PIXELS = 1024 * 1024;
const GRID_NODES = 129, CELL_COUNT_X = 11520, CELL_COUNT_Y = 5760;
const MAX_PENDING = 32, MAX_CACHE_BYTES = 64 * 1024 * 1024;
const MAGIC = Buffer.from('GFCOP30\0');
const USER_AGENT = 'Gefly/0.2 (+https://github.com/gregoryyy/gefly)';
export const COPERNICUS_CELL_BYTES = 64 + GRID_NODES * GRID_NODES * 4;
export const COPERNICUS_SOURCE = 'Copernicus-GLO30-Public-COG-2021';
interface Cog {
  url: string; key: string; etag: string; total: number; width: number; height: number;
  tileWidth: number; tileHeight: number; offsets: number[]; lengths: number[];
  west: number; north: number; dx: number; dy: number;
}
interface CacheEntry<T> { value: T; bytes: number }
interface CellProfile { version: number; prefix: string; columns: number; firstRow: number; lastRow: number; lattice: number }
const FINE: CellProfile = { version: 1, prefix: '/scenery/elevation/copernicus/', columns: CELL_COUNT_X,
  firstRow: 16, lastRow: CELL_COUNT_Y - 17, lattice: 4096 };
const OVERVIEW: CellProfile = { version: 2, prefix: '/scenery/elevation/copernicus-overview/', columns: 1440,
  firstRow: 1, lastRow: 718, lattice: 512 };
export interface CopernicusOptions { fetcher?: typeof fetch; cacheBytes?: number; timeoutMs?: number }

/** Decode only the reviewed little-endian, tiled Float32 DEFLATE/Predictor3 COG
 * profile. Unexpected TIFFs fail rather than dispatching arbitrary codecs. */
export function parseCopernicusHeader(bytes: Buffer, url: string, etag: string, total: number): Cog {
  if (bytes.length !== HEADER_BYTES || bytes.toString('ascii', 0, 2) !== 'II' || bytes.readUInt16LE(2) !== 42
    || !/^"[a-f0-9]{32}(?:-\d+)?"$/.test(etag) || !Number.isSafeInteger(total) || total <= HEADER_BYTES || total > MAX_OBJECT_BYTES)
    throw new Error('Unsupported Copernicus TIFF header or identity');
  const ifd = bytes.readUInt32LE(4);
  if (ifd < 8 || ifd + 2 > bytes.length) throw new Error('Invalid TIFF directory');
  const count = bytes.readUInt16LE(ifd);
  if (count > 64 || ifd + 2 + count * 12 + 4 > bytes.length) throw new Error('Invalid TIFF directory size');
  const tags = new Map<number, number[]>();
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 12: 8 };
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12, tag = bytes.readUInt16LE(entry), type = bytes.readUInt16LE(entry + 2), length = bytes.readUInt32LE(entry + 4);
    const size = sizes[type];
    if (!size || length > 128 || tags.has(tag)) throw new Error('Unsupported TIFF directory entry');
    const start = length * size <= 4 ? entry + 8 : bytes.readUInt32LE(entry + 8);
    if (start + length * size > bytes.length) throw new Error('TIFF entry outside bounded header');
    const values = Array.from({ length }, (_, j) => type === 12 ? bytes.readDoubleLE(start + j * size)
      : type === 4 ? bytes.readUInt32LE(start + j * size) : type === 3 ? bytes.readUInt16LE(start + j * size) : bytes[start + j]);
    tags.set(tag, values);
  }
  const scalar = (tag: number) => tags.get(tag)?.length === 1 ? tags.get(tag)![0] : NaN;
  const width = scalar(256), height = scalar(257), tileWidth = scalar(322), tileHeight = scalar(323);
  if (![3600, 2400, 1800, 1200, 720, 360].includes(width) || height !== 3600 || tileWidth !== 1024 || tileHeight !== 1024
    || scalar(258) !== 32 || scalar(259) !== 8 || scalar(262) !== 1 || scalar(277) !== 1 || scalar(284) !== 1
    || scalar(317) !== 3 || scalar(339) !== 3) throw new Error('Unsupported Copernicus raster profile');
  const scale = tags.get(33550), tie = tags.get(33922), keys = tags.get(34735);
  if (!scale || scale.length !== 3 || !tie || tie.length !== 6 || !keys || keys.length < 4
    || tie.slice(0, 3).some(value => value !== 0) || !scale.every(Number.isFinite)
    || Math.abs(scale[0] * width - 1) > 1e-12 || Math.abs(scale[1] * height - 1) > 1e-12)
    throw new Error('Unsupported Copernicus georeferencing');
  let geographic = false, pixelIsPoint = false;
  for (let i = 4; i + 3 < keys.length; i += 4) {
    if (keys[i] === 2048 && keys[i + 1] === 0 && keys[i + 2] === 1 && keys[i + 3] === 4326) geographic = true;
    if (keys[i] === 1025 && keys[i + 1] === 0 && keys[i + 2] === 1 && keys[i + 3] === 2) pixelIsPoint = true;
  }
  if (!geographic || !pixelIsPoint) throw new Error('Unsupported Copernicus coordinate reference');
  // The raw PixelIsPoint GeoTIFF tie point is the first sample centre.
  // Do not apply GDAL's separate half-pixel area-envelope conversion here.
  const west = tie[3], north = tie[4];
  if (Math.abs(west - Math.round(west)) > 1e-10 || Math.abs(north - Math.round(north)) > 1e-10
    || west < -180 || west >= 180 || north <= -90 || north > 90) throw new Error('Unexpected Copernicus tile extent');
  const offsets = tags.get(324), lengths = tags.get(325), blocks = Math.ceil(width / tileWidth) * Math.ceil(height / tileHeight);
  if (!offsets || !lengths || offsets.length !== blocks || lengths.length !== blocks
    || offsets.some((offset, i) => !Number.isSafeInteger(offset) || offset < HEADER_BYTES || !Number.isSafeInteger(lengths[i])
      || lengths[i] < 1 || lengths[i] > MAX_RANGE_BYTES || offset + lengths[i] > total)) throw new Error('Invalid Copernicus block table');
  return { url, key: url.slice(HOST.length), etag, total, width, height, tileWidth, tileHeight,
    offsets, lengths, west: Math.round(west), north: Math.round(north), dx: scale[0], dy: scale[1] };
}

/** TIFF Technical Note3 floating-point predictor: accumulate each byte plane
 * row, then undo the MSB-first plane shuffle into little-endian IEEE Float32. */
export function decodeCopernicusBlock(compressed: Buffer): Float32Array {
  const raw = inflateSync(compressed, { maxOutputLength: BLOCK_PIXELS * 4 });
  if (raw.length !== BLOCK_PIXELS * 4) throw new Error('Invalid Copernicus inflated block length');
  const result = new Float32Array(BLOCK_PIXELS), output = Buffer.from(result.buffer);
  for (let y = 0; y < 1024; y++) {
    const start = y * 4096;
    for (let i = 1; i < 4096; i++) raw[start + i] = (raw[start + i] + raw[start + i - 1]) & 255;
    for (let x = 0; x < 1024; x++) for (let byte = 0; byte < 4; byte++) output[(y * 1024 + x) * 4 + byte] = raw[start + (3 - byte) * 1024 + x];
  }
  return result;
}

function tileName(south: number, west: number): string {
  const lat = `${south < 0 ? 'S' : 'N'}${String(Math.abs(south)).padStart(2, '0')}_00`;
  const lon = `${west < 0 ? 'W' : 'E'}${String(Math.abs(west)).padStart(3, '0')}_00`;
  return `Copernicus_DSM_COG_10_${lat}_${lon}_DEM`;
}
function headerUrl(south: number, west: number): string { const key = tileName(south, west); return HOST + key + '/' + key + '.tif'; }
function cellFromPath(path: string): { profile: CellProfile; col: number; row: number } | null {
  const match = /^\/scenery\/elevation\/(copernicus|copernicus-overview)\/(0|[1-9]\d{0,4})\/(0|[1-9]\d{0,3})\.bin$/.exec(path);
  if (!match) return null;
  const profile = match[1] === 'copernicus' ? FINE : OVERVIEW;
  const col = Number(match[2]), row = Number(match[3]);
  return col < profile.columns && row >= profile.firstRow && row <= profile.lastRow ? { profile, col, row } : null;
}

export function createCopernicusTerrainMiddleware(options: CopernicusOptions = {}) {
  const fetcher = options.fetcher ?? fetch, timeoutMs = options.timeoutMs ?? 15000;
  const requested = options.cacheBytes ?? MAX_CACHE_BYTES;
  if (!Number.isSafeInteger(requested) || requested < 0 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new RangeError('Invalid Copernicus resource bounds');
  const capacity = Math.min(requested, MAX_CACHE_BYTES), cache = new Map<string, CacheEntry<unknown>>();
  const pending = new Map<string, Promise<unknown>>();
  let cacheSize = 0, active = 0;
  const queue: Array<() => void> = [];
  function remember<T>(key: string, value: T, bytes: number): T {
    if (bytes <= capacity) {
      while (cache.size && cacheSize + bytes > capacity) { const oldest = cache.keys().next().value!; cacheSize -= cache.get(oldest)!.bytes; cache.delete(oldest); }
      cache.set(key, { value, bytes }); cacheSize += bytes;
    }
    return value;
  }
  async function shared<T>(key: string, bytes: number, work: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit.value as T; }
    const old = pending.get(key); if (old) return old as Promise<T>;
    // This map also includes source blocks/headers; nested jobs remain finite.
    if (pending.size >= 96) throw new Error('Copernicus queue saturated');
    const task = work().then(value => remember(key, value, bytes)); pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  }
  async function range(url: string, start: number, length: number, identity?: Cog, expires = Date.now() + timeoutMs): Promise<{ bytes: Buffer; etag: string; total: number }> {
    if (active >= 4) await new Promise<void>(resolve => queue.push(resolve)); else active++;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); void reader?.cancel().catch(() => {}); reject(new Error('Copernicus range timed out')); }, Math.max(1, Math.min(timeoutMs, expires - Date.now())));
    });
    const work = (async () => {
      const headers: Record<string, string> = { Range: `bytes=${start}-${start + length - 1}`, 'User-Agent': USER_AGENT };
      if (identity) headers['If-Match'] = identity.etag;
      const response = await fetcher(url, { redirect: 'error', credentials: 'omit', headers, signal: controller.signal });
      try {
        const end = start + length - 1, declared = response.headers.get('content-length'), type = response.headers.get('content-type')?.split(';')[0];
        const match = new RegExp(`^bytes ${start}-${end}/(\\d+)$`).exec(response.headers.get('content-range') ?? '');
        const etag = response.headers.get('etag') ?? '', total = match ? Number(match[1]) : NaN;
        if (response.status !== 206 || response.redirected || !response.body || declared !== String(length) || !['image/tiff', 'application/octet-stream'].includes(type ?? '')
          || !match || !/^"[a-f0-9]{32}(?:-\d+)?"$/.test(etag) || total > MAX_OBJECT_BYTES || total < start + length
          || identity && (etag !== identity.etag || total !== identity.total)) throw new Error('Copernicus range identity/size/type mismatch');
        reader = response.body.getReader(); const chunks: Buffer[] = []; let size = 0;
        for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > length) throw new Error('Oversized Copernicus range'); chunks.push(Buffer.from(value)); }
        if (size !== length) throw new Error('Truncated Copernicus range');
        return { bytes: Buffer.concat(chunks, size), etag, total };
      } finally { await reader?.cancel().catch(() => {}); }
    })();
    try { return await Promise.race([work, deadline]); }
    finally { clearTimeout(timer!); controller.abort(); void reader?.cancel().catch(() => {}); if (queue.length) queue.shift()!(); else active--; }
  }

  async function header(south: number, west: number, expires: number): Promise<Cog> {
    const url = headerUrl(south, west);
    return shared('header:' + url, HEADER_BYTES, async () => {
      const data = await range(url, 0, HEADER_BYTES, undefined, expires), cog = parseCopernicusHeader(data.bytes, url, data.etag, data.total);
      if (cog.west !== west || cog.north !== south + 1) throw new Error('Copernicus source tile identity mismatch');
      return cog;
    });
  }
  async function block(cog: Cog, index: number, expires: number): Promise<Float32Array> {
    return shared('block:' + cog.url + ':' + cog.etag + ':' + index, BLOCK_PIXELS * 4, async () => {
      const data = await range(cog.url, cog.offsets[index], cog.lengths[index], cog, expires);
      return decodeCopernicusBlock(data.bytes);
    });
  }
  async function cell(profile: CellProfile, col: number, row: number): Promise<Buffer> {
    const expires = Date.now() + timeoutMs;
    const bytes = Buffer.alloc(COPERNICUS_CELL_BYTES); MAGIC.copy(bytes);
    bytes.writeUInt32LE(profile.version, 8); bytes.writeUInt32LE(col, 12); bytes.writeUInt32LE(row, 16); bytes.writeUInt32LE(GRID_NODES, 20);
    // A canonical source pixel is chosen before the cell, so neighboring cell
    // edge nodes ask for identical centres, even at integer-degree boundaries.
    const groups = new Map<string, { cog: Cog; index: number; points: Array<[number, number]> }>();
    const unavailable = new Set<string>(); let any = false;
    for (let y = 0; y < GRID_NODES; y++) for (let x = 0; x < GRID_NODES; x++) {
      if (Date.now() >= expires) throw new Error('Copernicus cell timed out');
      const offset = 64 + (y * GRID_NODES + x) * 4;
      bytes.writeFloatLE(NaN, offset);
      const latitude = Math.round((-90 + (row * 128 + y) / profile.lattice) * 3600) / 3600;
      let longitude = -180 + (col * 128 + x) / profile.lattice; if (longitude >= 180) longitude -= 360;
      const south = Math.ceil(latitude - 1e-10) - 1; let west = Math.floor(longitude + 1e-12);
      const key = `${south}/${west}`;
      if (unavailable.has(key)) continue;
      let cog: Cog;
      try { cog = await header(south, west, expires); } catch { unavailable.add(key); continue; }
      let column = Math.round((longitude - west) / cog.dx), line = Math.round((south + 1 - latitude) / cog.dy);
      if (column === cog.width) { west = (west + 181) % 360 - 180; try { cog = await header(south, west, expires); column = 0; } catch { unavailable.add(key); continue; } }
      if (line < 0 || line >= cog.height || column < 0 || column >= cog.width) continue;
      const index = Math.floor(line / 1024) * Math.ceil(cog.width / 1024) + Math.floor(column / 1024);
      const groupKey = cog.url + ':' + index;
      let group = groups.get(groupKey); if (!group) groups.set(groupKey, group = { cog, index, points: [] });
      group.points.push([offset, (line % 1024) * 1024 + column % 1024]);
    }
    for (const group of groups.values()) {
      if (Date.now() >= expires) throw new Error('Copernicus cell timed out');
      let values: Float32Array;
      try { values = await block(group.cog, group.index, expires); } catch { continue; }
      for (const [offset, index] of group.points) {
        const value = values[index];
        if (Number.isFinite(value) && value > -1000 && value < 10000) { bytes.writeFloatLE(value, offset); any = true; }
      }
    }
    if (!any) throw new Error('Copernicus source is unavailable for this cell');
    return bytes;
  }
  let cellActive = 0, overviewActive = 0;
  const cellPending = new Map<string, Promise<Buffer>>();
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const path = req.url ?? '';
    if (!path.startsWith(FINE.prefix) && !path.startsWith(OVERVIEW.prefix)) { next(); return; }
    const coordinates = cellFromPath(path);
    if (!coordinates || !['GET', 'HEAD'].includes(req.method ?? '')) { res.writeHead(404, { 'Cache-Control': 'no-store' }).end(); return; }
    // Profiles share source blocks and resource pools, but never output-cell
    // identities: equal numeric coordinates describe different geography.
    const key = `${coordinates.profile.version}/${coordinates.col}/${coordinates.row}`; let task = cellPending.get(key);
    if (!task) {
      // An optional overview never consumes both decoder slots: authoritative
      // fine demand can still enter while one overview is being prepared.
      if (cellPending.size >= MAX_PENDING || cellActive >= 2 || coordinates.profile === OVERVIEW && overviewActive >= 1) {
        res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); return;
      }
      cellActive++;
      if (coordinates.profile === OVERVIEW) overviewActive++;
      task = shared('cell:' + key, COPERNICUS_CELL_BYTES, () => cell(coordinates.profile, coordinates.col, coordinates.row));
      cellPending.set(key, task);
      task.finally(() => { cellPending.delete(key); cellActive--; if (coordinates.profile === OVERVIEW) overviewActive--; }).catch(() => {});
    }
    task.then(bytes => {
      if (res.destroyed || res.writableEnded) return;
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': bytes.length,
        'Cache-Control': 'private, max-age=3600', 'ETag': `"${sha256}"`, 'X-Copernicus-Source': COPERNICUS_SOURCE, 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    }).catch(() => { if (!res.destroyed && !res.writableEnded && !res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store' }).end(); });
  };
}
