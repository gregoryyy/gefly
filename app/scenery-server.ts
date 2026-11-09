import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createVectorMapMiddleware } from './vector-map-server.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

const LIMIT = 2 * 1024 * 1024;
const WORLD = 20037508.342789244;
// WGS84 [west, south, east, north]. Public cartography covers the five-state
// inventory. State photography keeps its own published footprint/transparent gaps.
const MAP_BOUNDS = [6, 47, 14, 51.75] as const;
const IMAGERY_BOUNDS = [6, 47, 14, 51.75] as const;
const SOURCES = {
  map: ['https://sgx.geodatenzentrum.de/wmts_topplus_open', 'web'],
  hessen: ['https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-images.ows', 'he_dop_rgb'],
  bavaria: ['https://geoservices.bayern.de/od/wms/dop/v1/dop40', 'by_dop40c'],
  bw: ['https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ATKIS_DOP_20_C', 'IMAGES_DOP_20_RGB'],
  // Official metadata: DL-DE-BY-2.0; credit LVermGeoRP / LVGL-SL and processing.
  // https://www.geoportal.rlp.de/mapbender/php/mod_showMetadata.php?resource=layer&id=61676
  // https://geoportal.saarland.de/mapbender/php/mod_showMetadata.php?resource=layer&id=49804
  rlp: ['https://geo4.service24.rlp.de/wms/rp_dop20.fcgi', 'rp_dop20'],
  saarland: ['https://geoportal.saarland.de/freewms/dop2025', 'sl_dop20_rgb'],
} as const;
type Source = keyof typeof SOURCES;
// Layer envelopes from each official GetCapabilities (checked 2026-11-04).
// The services, not these rectangles, provide the actual state-boundary alpha.
const PHOTO_BOUNDS: Record<Exclude<Source, 'map'>, readonly [number, number, number, number]> = {
  hessen: [7.41867, 49.25, 10.5, 51.7596],
  bavaria: [8.957580, 47.117703, 14.037541, 50.632870],
  bw: [7.20, 47.40, 10.70, 50.00],
  rlp: [6.037773, 48.897996, 8.617703, 51.000893],
  saarland: [6.340597, 49.082884, 7.438171, 49.659757],
};
type Fetcher = typeof fetch;
type Result = { bytes: Buffer; type: string; sources: string; partial: boolean; expires: number };
export interface SceneryOptions { fetcher?: Fetcher; cacheBytes?: number; python?: string; warn?: (message: string) => void }
/** Local compositor state; 'unavailable' means the interpreter could not start or import Pillow. */
export type CompositorState = 'unknown' | 'ready' | 'unavailable';
const COMPOSITOR_RECHECK_MS = 30000;
// Raised when the interpreter cannot start or cannot import Pillow, unlike an invalid image.
class CompositorUnavailable extends Error {}
const PILLOW_MISSING = /No module named ['"]?PIL\b/;

class Semaphore {
  private active = 0;
  private queue: Array<{ resolve: () => void; priority: () => number }> = [];
  private readonly max: number;
  constructor(max: number) { this.max = max; }
  async run<T>(work: () => Promise<T>, priority: () => number = () => 0): Promise<T> {
    if (this.active < this.max) this.active++;
    else await new Promise<void>((resolve) => this.queue.push({ resolve, priority }));
    try { return await work(); } finally {
      if (this.queue.length) {
        let first = 0;
        for (let i = 1; i < this.queue.length; i++) if (this.queue[i].priority() > this.queue[first].priority()) first = i;
        this.queue.splice(first, 1)[0].resolve();
      } else this.active--;
    }
  }
}

function bbox(z: number, x: number, y: number): [number, number, number, number] {
  const span = 2 * WORLD / 2 ** z;
  return [-WORLD + x * span, WORLD - (y + 1) * span, -WORLD + (x + 1) * span, WORLD - y * span];
}
function latitude(y: number): number { return (2 * Math.atan(Math.exp(y / WORLD * Math.PI)) - Math.PI / 2) * 180 / Math.PI; }
function longitude(x: number): number { return x / WORLD * 180; }
function pngValid(data: Uint8Array, size: number): boolean {
  const b = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return b.length >= 33 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
    b.toString('ascii', 12, 16) === 'IHDR' && b.readUInt32BE(16) === size && b.readUInt32BE(20) === size;
}
function urlFor(source: Source, box: number[], size: number, tile: { z: number; x: number; y: number }): string {
  if (source === 'map') return `${SOURCES.map[0]}/tile/1.0.0/web/default/WEBMERCATOR/${tile.z}/${tile.y}/${tile.x}.png`;
  const [base, layer] = SOURCES[source];
  const url = new URL(base);
  const params: Record<string, string> = { SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.1.1', LAYERS: layer,
    STYLES: '', SRS: 'EPSG:3857', BBOX: box.join(','), WIDTH: String(size), HEIGHT: String(size), FORMAT: 'image/png', TRANSPARENT: 'TRUE' };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}
async function readBounded(response: Response): Promise<Buffer> {
  if (!response.ok || !response.body || !/^image\/png(?:;|$)/i.test(response.headers.get('content-type') || '') || Number(response.headers.get('content-length') || 0) > LIMIT) throw new Error('invalid upstream response');
  const reader = response.body.getReader();
  const chunks: Buffer[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) throw new Error('upstream too large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks, size);
}
function runPython(python: string, args: string[], input: string, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, args, { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH || '/usr/bin:/bin' } });
    let done = false, size = 0, diagnostic = ''; const chunks: Buffer[] = [];
    const finish = (error?: Error) => { if (done) return; done = true; clearTimeout(timer); if (error) { child.kill(); reject(error); } else resolve(Buffer.concat(chunks, size)); };
    const timer = setTimeout(() => finish(new Error('compositor timeout')), timeoutMs);
    child.on('error', () => finish(new CompositorUnavailable('compositor interpreter unavailable')));
    child.stdin.on('error', () => finish(new Error('compositor input failed')));
    // Bounded diagnostics only distinguish a missing Pillow import from an invalid image.
    child.stderr.on('data', (chunk: Buffer) => { if (diagnostic.length < 4096) diagnostic += chunk.toString('utf8').slice(0, 4096 - diagnostic.length); });
    child.stdout.on('data', (chunk: Buffer) => { size += chunk.length; if (size > LIMIT) finish(new Error('compositor output too large')); else chunks.push(chunk); });
    child.on('close', (code) => code === 0 ? finish()
      : finish(PILLOW_MISSING.test(diagnostic) ? new CompositorUnavailable('Pillow unavailable') : new Error('compositor failed')));
    child.stdin.end(input);
  });
}
async function compose(images: Buffer[], python: string): Promise<Buffer> {
  const script = fileURLToPath(new URL('../utils/scenery/compose.py', import.meta.url));
  const result = await runPython(python, [script], JSON.stringify(images.map((image) => image.toString('base64'))), 15000);
  if (result.length <= 3) throw new Error('compositor failed');
  return result;
}

/** Fixed-source, memory-bounded local XYZ proxy. No request parameter becomes a URL or path. */
export function sceneryMiddleware(options: SceneryOptions = {}) {
  const vectorMap = createVectorMapMiddleware(options);
  // PYTHON selects the same interpreter as the country-photo proxy, e.g. the `just scenery-venv` environment.
  const fetcher = options.fetcher || fetch, python = options.python || process.env.PYTHON || 'python3';
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let compositor: CompositorState = 'unknown', recheckAt = 0, warned = false, probe: Promise<void> | null = null;
  function compositorFailed(): void {
    compositor = 'unavailable'; recheckAt = Date.now() + COMPOSITOR_RECHECK_MS;
    if (warned) return;
    warned = true;
    warn(`[gefly scenery] ${python} cannot run the photo compositor (Python Pillow missing or interpreter unavailable); `
      + 'live aerial photos are disabled. Run `just scenery-venv` and restart `just fly`, or set PYTHON to an interpreter with Pillow.');
  }
  function probeCompositor(): Promise<void> {
    probe ??= runPython(python, ['-c', 'import PIL.Image'], '', 10000).then(() => { compositor = 'ready'; }, (error: unknown) => {
      if (error instanceof CompositorUnavailable) compositorFailed();
    }).finally(() => { probe = null; });
    return probe;
  }
  const capacity = Math.max(0, Math.min(32 * 1024 * 1024, options.cacheBytes ?? 32 * 1024 * 1024));
  // Visible cartography never waits for regional photography or composition.
  const mapNetwork = new Semaphore(4), photoNetwork = new Semaphore(4), composers = new Semaphore(2);
  const mapJobs = new Semaphore(4), photoJobs = new Semaphore(4);
  const priorities = new Map<string, { value: number }>();
  const cache = new Map<string, Result>(), pending = new Map<string, Promise<Result>>(); let cacheSize = 0;
  async function acquire(source: Source, box: number[], size: number, tile: { z: number; x: number; y: number }, priority: () => number): Promise<Buffer> {
    return (source === 'map' ? mapNetwork : photoNetwork).run(async () => {
      const response = await fetcher(urlFor(source, box, size, tile), { redirect: 'error', signal: AbortSignal.timeout(15000) });
      const bytes = await readBounded(response);
      if (!pngValid(bytes, size)) throw new Error('invalid PNG dimensions');
      return bytes;
    }, priority);
  }
  async function generate(kind: string, box: number[], tile: { z: number; x: number; y: number }, priority: () => number): Promise<Result> {
    if (kind === 'map') return { bytes: await acquire('map', box, 256, tile, priority), type: 'image/png', sources: 'BKG', partial: false, expires: Date.now() + 3600000 };
    const [west, south, east, north] = [longitude(box[0]), latitude(box[1]), longitude(box[2]), latitude(box[3])];
    const selected: Source[] = [];
    // Query envelopes bound providers; actual state footprints remain transparent.
    for (const source of Object.keys(PHOTO_BOUNDS) as Array<keyof typeof PHOTO_BOUNDS>) {
      const [w, s, e, n] = PHOTO_BOUNDS[source];
      if (east >= w && west <= e && north >= s && south <= n) selected.push(source);
    }
    const results = await Promise.allSettled(selected.map((source) => acquire(source, box, 512, tile, priority)));
    const images: Buffer[] = [], sources: string[] = [];
    results.forEach((result, i) => { if (result.status === 'fulfilled') { images.push(result.value); sources.push(selected[i]); } });
    if (!images.length) throw new Error('imagery unavailable');
    const bytes = await composers.run(() => compose(images, python)).then((value) => { compositor = 'ready'; return value; }, (error: unknown) => {
      if (error instanceof CompositorUnavailable) compositorFailed();
      throw error;
    });
    return { bytes, type: 'image/png', sources: sources.join(','), partial: sources.length !== selected.length, expires: Date.now() + 900000 };
  }
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const url = req.url || '';
    if (url.startsWith('/scenery/vector/') || url.startsWith('/scenery/landmarks/') || url.startsWith('/scenery/osm/')) { vectorMap(req, res, next); return; }
    if (!url.startsWith('/scenery/')) { next(); return; }
    if (url === '/scenery/imagery/status.json' && ['GET', 'HEAD'].includes(req.method || '')) {
      // Fixed local self-description: no interpreter path or diagnostic text is exposed.
      const recheck = compositor === 'unknown' || (compositor === 'unavailable' && Date.now() >= recheckAt);
      void (recheck ? probeCompositor() : Promise.resolve()).then(() => {
        const body = Buffer.from(JSON.stringify({ compositor }));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(req.method === 'HEAD' ? undefined : body);
      });
      return;
    }
    const match = /^\/scenery\/(map|imagery)\/(\d{1,2})\/(\d{1,6})\/(\d{1,6})\.(png|jpg)$/.exec(url);
    if (!match || !['GET', 'HEAD'].includes(req.method || '') || match[5] !== 'png') { res.writeHead(404).end(); return; }
    const [, kind, zs, xs, ys] = match; const z = Number(zs), x = Number(xs), y = Number(ys), n = 2 ** z;
    if (z < (kind === 'map' ? 5 : 7) || z > (kind === 'map' ? 16 : 15) || x >= n || y >= n || String(z) !== zs || String(x) !== xs || String(y) !== ys) { res.writeHead(404).end(); return; }
    const box = bbox(z, x, y);
    const [west, south, east, north] = kind === 'map' ? MAP_BOUNDS : IMAGERY_BOUNDS;
    if (longitude(box[2]) < west || longitude(box[0]) > east || latitude(box[3]) < south || latitude(box[1]) > north) { res.writeHead(404).end(); return; }
    const key = `${kind}/${z}/${x}/${y}`;
    let result = cache.get(key);
    if (result && result.expires <= Date.now()) { cache.delete(key); cacheSize -= result.bytes.length; result = undefined; }
    if (result) { cache.delete(key); cache.set(key, result); }
    let task = result ? Promise.resolve(result) : pending.get(key);
    // Without a working compositor, spend no public WMS requests until the next recheck.
    if (!task && kind === 'imagery' && compositor === 'unavailable' && Date.now() < recheckAt) {
      res.writeHead(503, { 'Cache-Control': 'no-store', 'X-Scenery-Status': 'compositor-unavailable' }).end(); return;
    }
    const visible = req.headers['x-gefly-scenery-priority'] === 'visible';
    if (visible && priorities.has(key)) priorities.get(key)!.value = 1;
    if (!task) {
      if (pending.size >= 128) { res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); return; }
      const rank = { value: visible ? 1 : 0 }; priorities.set(key, rank);
      const priority = () => rank.value;
      task = (kind === 'map' ? mapJobs : photoJobs).run(() => generate(kind, box, { z, x, y }, priority), priority).then((value) => {
        if (value.bytes.length <= capacity) {
          while (cacheSize + value.bytes.length > capacity) { const oldest = cache.keys().next().value as string; cacheSize -= cache.get(oldest)!.bytes.length; cache.delete(oldest); }
          cache.set(key, value); cacheSize += value.bytes.length;
        }
        return value;
      });
      pending.set(key, task); task.finally(() => { pending.delete(key); priorities.delete(key); }).catch(() => {});
    }
    task.then((value) => {
      res.writeHead(200, { 'Content-Type': value.type, 'Content-Length': value.bytes.length, 'Cache-Control': 'private, max-age=300', 'X-Scenery-Sources': value.sources, 'X-Scenery-Partial': String(value.partial), 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : value.bytes);
    }).catch((error: unknown) => {
      if (res.headersSent) return;
      if (error instanceof CompositorUnavailable) res.writeHead(503, { 'Cache-Control': 'no-store', 'X-Scenery-Status': 'compositor-unavailable' }).end();
      else res.writeHead(502, { 'Cache-Control': 'no-store' }).end();
    });
  };
}
