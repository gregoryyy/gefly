import { validateTerrainGrid, loadTerrainPackage } from './terrain.js';
import { WORLD_TERRAIN, worldCellAt, worldTileId, validWorldTerrainTile, loadWorldTerrainPackage } from './world-terrain.js';
import { atlasGridAt, sampleAtlas, loadRegionalManifestOptional, WorldTerrainStream } from './terrain-stream.js';

const PROTOCOL = 1;
const DEADLINE_MS = 45000; // includes bounded required assets and optional source budgets
let nextEpoch = 0;

export class TerrainSourceClient {
  constructor(install, remove, WorkerClass = globalThis.Worker, options = {}) {
    if (typeof WorkerClass !== 'function') throw new Error('Terrain source Worker unavailable; terrain cannot be loaded.');
    this.world = null; this.fine = null; this.manifest = new Map(); this.tiles = new Map(); this.failedSources = new Set();
    this.copernicusSourceCount = 0; this.copernicusBudgetExhausted = false;
    this.key = null; this.install = install; this.remove = remove;
    this.epoch = ++nextEpoch; this.request = 0; this.pending = new Map(); this.cancelled = false;
    this.moveTask = null; this.prefetchTask = null;
    this.worker = new WorkerClass(new URL('./terrain-source-worker.js', import.meta.url), { type: 'module', name: 'gefly-terrain-source' });
    this.worker.onmessage = event => this.receive(event.data);
    this.worker.onerror = event => { event.preventDefault?.(); this.fail(new Error(`Terrain source Worker failed: ${event.message ?? 'unknown error'}`)); };
    this.worker.onmessageerror = () => this.fail(new Error('Terrain source Worker message could not be decoded.'));
    const fine = options.fine === true, streaming = options.streaming !== false;
    this.ready = this.call('init', { fine, streaming }).then(message => {
      if (message.type !== 'initialized'
        || (streaming ? !validateTerrainGrid(message.world) || message.world.width !== 361 || message.world.height !== 181 : message.world !== null)
        || (fine ? !validateTerrainGrid(message.fine) : message.fine !== null)
        || !Array.isArray(message.manifest) || message.manifest.length > 475) throw new Error('Invalid terrain source initialization.');
      const manifest = new Map(message.manifest);
      if (manifest.size !== message.manifest.length || [...manifest].some(([id, meta]) => typeof id !== 'string'
        || !meta || meta.id !== id || !/^[a-f0-9]{64}$/.test(meta.sha256))) throw new Error('Invalid terrain source manifest.');
      this.world = message.world && Object.freeze(message.world); this.fine = message.fine && Object.freeze(message.fine); this.manifest = manifest;
    }).catch(error => { this.fail(error); throw error; });
    // A cancelled initialization can precede move(), without an unhandled rejection.
    void this.ready.catch(() => {});
  }
  center(lat, lon) { return worldCellAt(lat, lon); }
  needsUpdate(lat, lon) { return this.center(lat, lon)?.join(',') !== this.key || !this.center(lat, lon); }
  gridAt(lat, lon) { return atlasGridAt(null, this.tiles, lat, lon); }
  sample(lat, lon) { return sampleAtlas(null, this.tiles, lat, lon); }
  quality(lat, lon) { const grid = this.gridAt(lat, lon); return grid ? ({ regional: 1, global: 2, mixed: 3 })[grid.source] : null; }
  nextCenter(lat, lon, prediction) { return WorldTerrainStream.prototype.nextCenter.call(this, lat, lon, prediction); }
  call(type, fields = {}) {
    if (this.cancelled) return Promise.reject(new Error('Terrain source request cancelled.'));
    if (this.pending.size >= 3) return Promise.reject(new Error('Terrain source request queue full.'));
    const request = ++this.request;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error('Terrain source Worker timed out.')), DEADLINE_MS);
      this.pending.set(request, { resolve, reject, timer });
      try { this.worker.postMessage({ protocol: PROTOCOL, epoch: this.epoch, request, type, ...fields }); }
      catch (error) { this.fail(error); }
    });
  }
  receive(message) {
    if (this.cancelled || !message || message.protocol !== PROTOCOL || message.epoch !== this.epoch) return;
    const pending = this.pending.get(message.request);
    if (!pending) return; // cancelled or obsolete responses never install a grid
    this.pending.delete(message.request); clearTimeout(pending.timer);
    if (message.type === 'error') pending.reject(new Error(String(message.message).slice(0, 500)));
    else pending.resolve(message);
  }
  fail(error) {
    if (this.cancelled) return;
    this.cancelled = true; this.worker.terminate();
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }
  cancel() { this.fail(new Error('Terrain source request cancelled.')); }
  cancelPrefetch() {
    if (!this.prefetchTask) return;
    this.prefetchTask = null;
    // Revoke local delivery immediately; the source also cancels its shadow.
    for (const [id, pending] of this.pending) if (pending.prefetch) {
      clearTimeout(pending.timer); pending.resolve({ type: 'prefetched', ready: false }); this.pending.delete(id);
    }
    if (!this.cancelled) {
      try { this.worker.postMessage({ protocol: PROTOCOL, epoch: this.epoch, request: ++this.request, type: 'cancel-prefetch' }); }
      catch (error) { this.fail(error); }
    }
  }
  prefetch(lat, lon, prediction) {
    if (this.cancelled || this.moveTask) return Promise.resolve(false);
    const requiredKey = this.center(lat, lon)?.join(',');
    if (this.prefetchTask?.key === requiredKey && this.prefetchTask.baseKey === this.key) return this.prefetchTask.promise;
    const key = this.nextCenter(lat, lon, prediction)?.join(',');
    if (!key || this.needsUpdate(lat, lon)) { this.cancelPrefetch(); return Promise.resolve(false); }
    if (this.prefetchTask?.key === key && this.prefetchTask.baseKey === this.key) return this.prefetchTask.promise;
    this.cancelPrefetch();
    const task = { key, baseKey: this.key, promise: null };
    const response = this.call('prefetch', { lat, lon, prediction: { lat_rad: prediction.lat_rad, lon_rad: prediction.lon_rad } });
    const pending = this.pending.get(this.request);
    if (pending) pending.prefetch = true;
    this.prefetchTask = task;
    task.promise = response.then(message => this.prefetchTask === task && message.type === 'prefetched' && message.ready === true).catch(() => false);
    return task.promise;
  }
  move(lat, lon) {
    if (this.moveTask) return Promise.reject(new Error('World terrain update already in progress.'));
    const center = this.center(lat, lon);
    if (!center) return Promise.reject(new Error('World terrain flight coverage is limited to latitudes between 89.5°S and 89.5°N.'));
    const key = center.join(',');
    this.moveTask = (async () => {
      await this.ready;
      const message = await this.call('move', { lat, lon });
      if (this.cancelled) throw new Error('Terrain source request cancelled.');
      const wanted = [];
      for (let y = Math.max(WORLD_TERRAIN.firstRow, center[1] - 1); y <= Math.min(WORLD_TERRAIN.lastRow, center[1] + 1); y++)
        for (let x = center[0] - 1; x <= center[0] + 1; x++) wanted.push(worldTileId((x + WORLD_TERRAIN.cols) % WORLD_TERRAIN.cols, y));
      if (message.type !== 'moved' || message.key !== key || !Array.isArray(message.tiles) || message.tiles.length !== wanted.length
        || message.tiles.some((grid, i) => !validWorldTerrainTile(grid) || grid.slot !== i || grid.id !== wanted[i]
          || !(grid.physical_m instanceof Float64Array) || !(grid.geoid_m instanceof Float64Array))
        || !Array.isArray(message.failedSources) || message.failedSources.length > 475
        || message.failedSources.some(id => !this.manifest.has(id))
        || !Number.isInteger(message.copernicusSourceCount) || message.copernicusSourceCount < 0 || message.copernicusSourceCount > 512
        || typeof message.copernicusBudgetExhausted !== 'boolean') throw new Error('Invalid terrain source batch.');
      // One synchronous installation turn between physics steps, after complete
      // batch validation. Native callbacks remain solely in the physics Worker.
      for (const grid of this.tiles.values()) this.remove(grid);
      const tiles = new Map();
      for (const grid of message.tiles) { Object.freeze(grid); this.install(grid); tiles.set(grid.id, grid); }
      this.tiles = tiles; this.key = key; this.failedSources = new Set(message.failedSources);
      this.copernicusSourceCount = message.copernicusSourceCount;
      this.copernicusBudgetExhausted = message.copernicusBudgetExhausted; this.prefetchTask = null;
    })().catch(error => { this.fail(error); throw error; }).finally(() => { this.moveTask = null; });
    return this.moveTask;
  }
}

/** Browser work always uses the source Worker. Only direct Node research
 * harnesses without browser Worker support retain the historical inline path. */
export function createTerrainSourceStream(install, remove, options = {}) {
  if (typeof globalThis.Worker === 'function' || !globalThis.process?.versions?.node)
    return new TerrainSourceClient(install, remove, globalThis.Worker, options);
  let cancelled = false, stream, fine;
  const controller = new AbortController();
  const ready = (async () => {
    fine = options.fine === true ? await loadTerrainPackage() : null;
    const world = options.streaming !== false ? await loadWorldTerrainPackage(undefined, controller.signal) : null;
    const manifest = options.streaming !== false ? await loadRegionalManifestOptional(undefined, controller.signal) : null;
    if (cancelled) throw new Error('Terrain source request cancelled.');
    if (options.streaming !== false) stream = new WorldTerrainStream(world, manifest, install, remove);
    return stream;
  })();
  void ready.catch(() => {});
  return new Proxy({
    ready,
    get fine() { return fine; },
    async move(lat, lon) { return (await ready).move(lat, lon); },
    cancel() { cancelled = true; controller.abort(); stream?.cancel(); },
  }, { get(target, name) { return name in target ? target[name] : typeof stream?.[name] === 'function' ? stream[name].bind(stream) : stream?.[name]; } });
}
