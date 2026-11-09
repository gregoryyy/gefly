import { sampleTerrain, validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { REGIONAL_TERRAIN, TerrainStream, loadRegionalManifestOptional, type RegionalTile } from '../../studies/e1-browser/sim/terrain-stream.js';
import { readWorldBytes, sampleWorldTerrain, terrainDigest } from '../../studies/e1-browser/sim/world-terrain.js';

const RAD = Math.PI / 180, NODES = 129, COUNT = NODES * NODES, BYTES = 64 + COUNT * 4;
const MAGIC = [71, 70, 67, 79, 80, 51, 48, 0];
const SOURCE = 'Copernicus-GLO30-Public-COG-2021' as const;
const identity = (col: number, row: number) => Number.isInteger(col) && col >= 0 && col < 1440
  && Number.isInteger(row) && row >= 1 && row <= 718;
export const overviewId = (col: number, row: number): string => {
  if (!identity(col, row)) throw new Error('Invalid display overview identity');
  return `display-overview-c${col}-r${row}`;
};
/** Display-only type: no version1 or native slot; never a session terrain grid. */
export interface TerrainOverviewGrid {
  readonly kind: 'display-overview-v2'; readonly id: string; readonly col: number; readonly row: number;
  readonly width: 129; readonly height: 129;
  readonly west_rad: number; readonly east_rad: number; readonly south_rad: number; readonly north_rad: number;
  readonly physical_m: Float64Array; readonly geoid_m: Float64Array;
  readonly sha256: string; readonly copernicus_sha256: string | null;
  readonly regional_nodes: number; readonly copernicus_nodes: number;
  readonly source: 'regional' | 'copernicus' | 'mixed';
}
export interface CopernicusOverviewCell {
  readonly col: number; readonly row: number; readonly physical_m: Float32Array;
  readonly sha256: string; readonly source: typeof SOURCE;
}
export function overviewCenter(lat: number, lon: number): readonly [number, number] | null {
  if (![lat, lon].every(Number.isFinite) || Math.abs(lat / RAD) >= 89.5 || lon < -Math.PI || lon > Math.PI) return null;
  return [Math.min(1439, Math.floor((lon / RAD + 180) * 4)), Math.floor((lat / RAD + 90) * 4)];
}
export function validTerrainOverview(value: unknown): value is TerrainOverviewGrid {
  const grid = value as TerrainOverviewGrid;
  if (!grid || typeof grid !== 'object' || 'version' in grid || 'slot' in grid || !identity(grid.col, grid.row)
    || grid.kind !== 'display-overview-v2' || grid.id !== overviewId(grid.col, grid.row)
    || grid.width !== NODES || grid.height !== NODES
    || !(grid.physical_m instanceof Float64Array) || !(grid.geoid_m instanceof Float64Array)
    || grid.physical_m.length !== COUNT || grid.geoid_m.length !== COUNT || !/^[a-f0-9]{64}$/.test(grid.sha256)
    || grid.copernicus_sha256 !== null && !/^[a-f0-9]{64}$/.test(grid.copernicus_sha256)
    || !Number.isInteger(grid.regional_nodes) || grid.regional_nodes < 0
    || !Number.isInteger(grid.copernicus_nodes) || grid.copernicus_nodes < 0
    || grid.regional_nodes + grid.copernicus_nodes !== COUNT
    || grid.copernicus_nodes > 0 && grid.copernicus_sha256 === null
    || grid.source !== (grid.regional_nodes === COUNT ? 'regional' : grid.regional_nodes === 0 ? 'copernicus' : 'mixed')) return false;
  const bounds = [(-180 + grid.col / 4) * RAD, (-180 + (grid.col + 1) / 4) * RAD,
    (-90 + grid.row / 4) * RAD, (-90 + (grid.row + 1) / 4) * RAD];
  if (![grid.west_rad, grid.east_rad, grid.south_rad, grid.north_rad].every((v, i) => v === bounds[i])) return false;
  return grid.physical_m.every((v, i) => Number.isFinite(v) && v > -1000 && v < 10000
    && Number.isFinite(grid.geoid_m[i]) && Math.abs(grid.geoid_m[i]) < 200);
}
const samplingViews = new WeakMap<TerrainOverviewGrid, TerrainGrid>();
export function sampleTerrainOverview(grids: readonly TerrainOverviewGrid[], lat: number, lon: number, used?: (grid: TerrainOverviewGrid) => void) {
  for (const grid of grids) {
    if (lat < grid.south_rad || lat > grid.north_rad || lon < grid.west_rad || lon > grid.east_rad) continue;
    // Internal sampler view only. The branded public object lacks native version/slot.
    let view = samplingViews.get(grid);
    if (!view) { view = { ...grid, version: 1 }; samplingViews.set(grid, view); }
    const sample = sampleTerrain(view, lat, lon);
    if (sample) { used?.(grid); return sample; }
  }
  return null;
}
export async function decodeCopernicusOverview(bytes: ArrayBuffer, col: number, row: number): Promise<CopernicusOverviewCell> {
  if (!identity(col, row) || bytes.byteLength !== BYTES) throw new Error('Invalid display overview payload size/identity');
  bytes = bytes.slice(0);
  const view = new DataView(bytes);
  if (!MAGIC.every((v, i) => view.getUint8(i) === v) || view.getUint32(8, true) !== 2
    || view.getUint32(12, true) !== col || view.getUint32(16, true) !== row || view.getUint32(20, true) !== NODES
    || new Uint8Array(bytes, 24, 40).some(v => v !== 0)) throw new Error('Invalid display overview header');
  const physical_m = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const value = view.getFloat32(64 + i * 4, true);
    if (!Number.isNaN(value) && (!Number.isFinite(value) || value <= -1000 || value >= 10000)) throw new Error('Invalid display overview height');
    physical_m[i] = value;
  }
  return Object.freeze({ col, row, physical_m, sha256: await terrainDigest(bytes), source: SOURCE });
}
export async function readCopernicusOverview(col: number, row: number, fetcher: typeof fetch = globalThis.fetch, signal?: AbortSignal) {
  if (!identity(col, row)) throw new Error('Invalid display overview identity');
  let etag: string | null = null, source: string | null = null;
  const checkedFetch: typeof fetch = async (url, init) => {
    let response = await fetcher(url, init);
    while(response.status===503){
      void response.body?.cancel().catch(()=>{});
      await new Promise(resolve=>setTimeout(resolve,100));
      if(init?.signal?.aborted)throw new Error('Display overview cancelled');
      response=await fetcher(url,init);
    }
    etag = response.headers.get('ETag'); source = response.headers.get('X-Copernicus-Source');
    return response;
  };
  const bytes = await readWorldBytes(`/scenery/elevation/copernicus-overview/${col}/${row}.bin`, BYTES, checkedFetch, signal);
  const cell = await decodeCopernicusOverview(bytes, col, row);
  // Exact body identity and declared fixed source, not provider authentication.
  if (etag !== `"${cell.sha256}"` || source !== SOURCE) throw new Error('Display overview source/body identity mismatch');
  return cell;
}
function validRegional(grid: TerrainGrid) {
  const west = grid.west_rad / RAD, south = grid.south_rad / RAD;
  return validateTerrainGrid(grid) && grid.width === 129 && grid.height === 129
    && Math.abs((grid.east_rad - grid.west_rad) / RAD - .25) < 1e-10
    && Math.abs((grid.north_rad - grid.south_rad) / RAD - .25) < 1e-10
    && west >= 6 - 1e-10 && west < 14 && south >= 47 - 1e-10 && south < 51.75
    && Math.abs(west * 4 - Math.round(west * 4)) < 1e-8 && Math.abs(south * 4 - Math.round(south * 4)) < 1e-8
    && grid.id === `e${Math.round(west * 100)}-n${Math.round(south * 100)}`
    && /^[a-f0-9]{64}$/.test((grid as Partial<RegionalTile>).sha256 ?? '');
}
function bounded<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('Display overview cancelled'));
  let abort: () => void;
  const interrupted = new Promise<never>((_, reject) => { abort = () => reject(new Error('Display overview cancelled')); signal.addEventListener('abort', abort, { once: true }); });
  return Promise.race([promise, interrupted]).finally(() => signal.removeEventListener('abort', abort));
}
function regionalNode(regional: readonly TerrainGrid[], lat: number, lon: number) {
  for (const grid of regional) {
    if (lon < grid.west_rad - 1e-12 || lon > grid.east_rad + 1e-12 || lat < grid.south_rad - 1e-12 || lat > grid.north_rad + 1e-12) continue;
    const x = Math.round((lon - grid.west_rad) / (grid.east_rad - grid.west_rad) * 128);
    const y = Math.round((lat - grid.south_rad) / (grid.north_rad - grid.south_rad) * 128), index = y * 129 + x;
    if (x >= 0 && x <= 128 && y >= 0 && y <= 128 && Number.isFinite(grid.physical_m[index]) && Number.isFinite(grid.geoid_m[index]))
      return { physical_m: grid.physical_m[index], geoid_m: grid.geoid_m[index] };
  }
  return null;
}
export async function composeTerrainOverview(world: TerrainGrid, col: number, row: number,
  raw: CopernicusOverviewCell | null, regional: readonly TerrainGrid[]): Promise<TerrainOverviewGrid | null> {
  if (!identity(col, row) || !validateTerrainGrid(world) || regional.length > 9 || regional.some(g => !validRegional(g))) throw new Error('Invalid display overview composition');
  if (raw && (raw.col !== col || raw.row !== row || raw.source !== SOURCE || !(raw.physical_m instanceof Float32Array) || raw.physical_m.length !== COUNT || !/^[a-f0-9]{64}$/.test(raw.sha256))) throw new Error('Mismatched display overview source');
  const physical_m = new Float64Array(COUNT), geoid_m = new Float64Array(COUNT);
  let regional_nodes = 0;
  for (let y = 0; y < 129; y++) for (let x = 0; x < 129; x++) {
    const lon = (-180 + (col * 128 + x) / 512) * RAD, lat = (-90 + (row * 128 + y) / 512) * RAD, index = y * 129 + x;
    const preferred = regionalNode(regional, lat, lon);
    if (preferred) { physical_m[index] = preferred.physical_m; geoid_m[index] = preferred.geoid_m; regional_nodes++; }
    else {
      const h = raw?.physical_m[index], n = sampleWorldTerrain(world, lat, lon)?.geoid_m;
      // Do not splice the coarse one-degree physical surface into a partial cell.
      if (h === undefined || !Number.isFinite(h) || h <= -1000 || h >= 10000 || n === undefined) return null;
      physical_m[index] = h; geoid_m[index] = n;
    }
  }
  const packed = new Float64Array(COUNT * 2);
  for (let i = 0; i < COUNT; i++) { packed[i * 2] = physical_m[i]; packed[i * 2 + 1] = geoid_m[i]; }
  const grid: TerrainOverviewGrid = Object.freeze({ kind: 'display-overview-v2', id: overviewId(col, row), col, row,
    width: 129, height: 129, west_rad: (-180 + col / 4) * RAD, east_rad: (-180 + (col + 1) / 4) * RAD,
    south_rad: (-90 + row / 4) * RAD, north_rad: (-90 + (row + 1) / 4) * RAD, physical_m, geoid_m,
    sha256: await terrainDigest(packed), copernicus_sha256: raw?.sha256 ?? null, regional_nodes, copernicus_nodes: COUNT - regional_nodes,
    source: regional_nodes === COUNT ? 'regional' : regional_nodes === 0 ? 'copernicus' : 'mixed' });
  if (!validTerrainOverview(grid)) throw new Error('Invalid composed display overview');
  return grid;
}
export interface TerrainOverviewStatus { readonly state: 'off' | 'loading' | 'ready' | 'partial' | 'unavailable' | 'pending'; readonly cells: number; readonly missing: number; readonly cache: number }
export interface OverviewCellIdentity { readonly col: number; readonly row: number }
export interface OverviewResolution extends OverviewCellIdentity { readonly grid: TerrainOverviewGrid | null; readonly reason?: string }
export interface TerrainOverviewSource {
  regional(lat: number, lon: number, signal: AbortSignal): Promise<readonly RegionalTile[]>;
  read(col: number, row: number, signal: AbortSignal): Promise<CopernicusOverviewCell>;
  compose(col: number, row: number, raw: CopernicusOverviewCell | null, regional: readonly TerrainGrid[], signal: AbortSignal): Promise<TerrainOverviewGrid | null>;
  dispose(): void;
}
interface Options {
  source?: TerrainOverviewSource;
  onResolved?: (result: OverviewResolution) => void;
  fetcher?: typeof fetch; budgetMs?: number; onStatus?: (status: TerrainOverviewStatus) => void;
  regional?: (lat: number, lon: number, signal: AbortSignal) => Promise<readonly TerrainGrid[]>;
}
interface Cached { raw?: CopernicusOverviewCell | null; grid?: TerrainOverviewGrid | null; regionalKey?: string }
/** Optional background work: one sequential request, nine active cells,32 cached
 * identities and one atomic batch publication. Never installs native terrain. */
export class TerrainOverview {
  private cache = new Map<string, Cached>();
  private controller: AbortController | null = null;
  private generation = 0;
  private key = '';
  private current: readonly TerrainOverviewGrid[] = [];
  private task: Promise<void> | null = null;
  private disposed = false;
  private serial: Promise<unknown> = Promise.resolve();
  private scheduledDemand = new Set<string>();
  private demand = new Map<string, OverviewCellIdentity>();
  private demandTask: Promise<void> | null = null;
  private demandController: AbortController | null = null;
  private outcomes = new Map<string, Readonly<{ col: number; row: number; missing: boolean; sha256?: string }>>();
  private exhausted = false;
  private stoppedReason: string | null = null;
  private fetcher: typeof fetch;
  private budget: number;
  private regional: NonNullable<Options['regional']>;
  private world: TerrainGrid;
  private install: (grids: readonly TerrainOverviewGrid[]) => void;
  private options: Options;
  constructor(world: TerrainGrid, install: (grids: readonly TerrainOverviewGrid[]) => void, options: Options = {}) {
    this.world = world; this.install = install; this.options = options;
    if (!validateTerrainGrid(world)) throw new Error('Invalid overview world baseline');
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.budget = options.budgetMs ?? 15000;
    if (!Number.isFinite(this.budget) || this.budget < 1 || this.budget > 15000) throw new Error('Invalid display overview deadline');
    this.regional = options.regional ?? options.source?.regional ?? ((lat, lon, signal) => this.loadRegional(lat, lon, signal));
  }
  private read(col: number, row: number, signal: AbortSignal) {
    return this.options.source ? this.options.source.read(col, row, signal) : readCopernicusOverview(col, row, this.fetcher, signal);
  }
  private compose(col: number, row: number, raw: CopernicusOverviewCell | null, regional: readonly TerrainGrid[], signal: AbortSignal) {
    return this.options.source ? this.options.source.compose(col, row, raw, regional, signal) : composeTerrainOverview(this.world, col, row, raw, regional);
  }
  private notify(state: TerrainOverviewStatus['state'], missing = 0) {
    try { this.options.onStatus?.(Object.freeze({ state, cells: this.current.length, missing, cache: this.cache.size })); } catch { /* Optional presentation callback. */ }
  }
  private async loadRegional(lat: number, lon: number, signal: AbortSignal): Promise<readonly RegionalTile[]> {
    const x = lon / RAD, y = lat / RAD;
    if (x + .5 < REGIONAL_TERRAIN.west || x - .5 > REGIONAL_TERRAIN.east || y + .5 < REGIONAL_TERRAIN.south || y - .5 > REGIONAL_TERRAIN.north) return [];
    const manifest = await loadRegionalManifestOptional(this.fetcher, signal);
    if (!manifest) return [];
    const tiles: RegionalTile[] = [], loader = new TerrainStream(manifest, grid => { tiles.push(grid); }, () => {}, this.fetcher);
    const cancel = () => loader.cancel(); signal.addEventListener('abort', cancel, { once: true });
    try {
      await loader.move(Math.max(47 + 1e-8, Math.min(51.75 - 1e-8, y)) * RAD,
        Math.max(6 + 1e-8, Math.min(14 - 1e-8, x)) * RAD);
    } catch { if (signal.aborted) throw new Error('Display overview cancelled'); }
    finally { signal.removeEventListener('abort', cancel); loader.cancel(); }
    return tiles;
  }
  update(lat: number, lon: number): Promise<void> {
    if(this.stoppedReason)return Promise.resolve();
    const center = overviewCenter(lat, lon);
    if (this.disposed || !center) { this.cancel(true); return Promise.resolve(); }
    const key = center.join('/');
    if (key === this.key) return this.task ?? Promise.resolve();
    this.controller?.abort(); this.demandController?.abort(); this.demandController=null;
    this.demand.clear(); this.scheduledDemand.clear(); this.demandTask=null;
    const generation = ++this.generation, controller = new AbortController();
    this.controller = controller; this.key = key;
    let expired = false;
    const timer = setTimeout(() => { expired = true; controller.abort(); }, this.budget);
    this.notify('loading');
    const valid = () => !this.disposed && !controller.signal.aborted && generation === this.generation;
    const task = this.serialize(async () => {
      const staged: TerrainOverviewGrid[] = [];
      let missing = 0, published = false;
      try {
        if (!valid()) return;
        let regional: readonly TerrainGrid[] = [];
        try { regional = await bounded(this.regional(lat, lon, controller.signal), controller.signal); } catch { /* Optional source; cancellation checked below. */ }
        if (!valid()) return;
        if (regional.length > 9 || regional.some(g => !validRegional(g))) throw new Error('Invalid overview regional sources');
        const regionalKey = regional.map(g => `${g.id}:${(g as Partial<RegionalTile>).sha256 ?? ''}`).sort().join('|');
        const offsets = [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
        for (const [dx, dy] of offsets) {
          if (!valid()) { if (expired && generation === this.generation) break; return; }
          const row = center[1] + dy;
          if (row < 1 || row > 718) continue;
          const col = (center[0] + dx + 1440) % 1440, id = overviewId(col, row);
          const known=this.outcomes.get(id);
          if(known?.missing){missing++;continue;}
          if(!known&&this.outcomes.size>=512){this.exhausted=true;this.stop('source outcome capacity');return;}
          const entry = { ...(this.cache.get(id) ?? {}) };
          let grid = entry.regionalKey === regionalKey ? entry.grid : undefined;
          if (grid === undefined) {
            // Regional-only completion avoids an unnecessary remote DSM request.
            grid = await this.compose(col, row, null, regional, controller.signal);
            if (!grid) {
              let raw = entry.raw;
              if (raw === undefined) try {
                raw = await this.read(col, row, controller.signal);
              } catch { raw = null; }
              if (!valid()) { if (expired && generation === this.generation) break; return; }
              grid = await this.compose(col, row, raw, regional, controller.signal);
              if (raw) entry.raw = raw;
            }
            entry.grid = grid ?? (entry.raw ? null : undefined); entry.regionalKey = regionalKey;
          }
          if (!valid()) { if (expired && generation === this.generation) break; return; }
          if(!this.resolved(col,row,grid??null))return;
          if(!valid())return;
          this.cache.delete(id); this.cache.set(id, entry);
          while (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
          if (grid) staged.push(grid); else missing++;
        }
        if (this.disposed || generation !== this.generation || controller.signal.aborted && !expired) return;
        if (expired) missing = 9 - staged.length;
        this.current = Object.freeze(staged);
        this.install(this.current); published = true;
        this.notify(this.exhausted?'pending':staged.length ? missing ? 'partial' : 'ready' : 'unavailable', missing);
      } finally {
        clearTimeout(timer);
        if (generation === this.generation) {
          this.controller = null; this.task = null;
          if (controller.signal.aborted && !published && !this.disposed) this.notify('unavailable', 9);
        }
      }
    });
    this.task = task;
    // Optional display work cannot fault the deterministic simulation.
    void task.catch(() => { if (generation === this.generation) this.notify('unavailable', 9); });
    return task;
  }
  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.serial.catch(() => {}).then(work);
    this.serial = result.catch(() => {});
    return result;
  }
  private resolved(col: number, row: number, grid: TerrainOverviewGrid | null): boolean {
    const id = overviewId(col, row), old = this.outcomes.get(id);
    if(old?.missing){if(grid){this.stop('changed missing source');return false;}return true;}
    if(old?.sha256 && grid?.sha256!==old.sha256){this.stop('changed or unavailable retained source');return false;}
    if (!old && this.outcomes.size >= 512) { this.exhausted = true; this.stop('source outcome capacity'); return false; }
    this.outcomes.set(id, Object.freeze({ col, row, missing: !grid, ...(grid ? { sha256: grid.sha256 } : {}) }));
    try { this.options.onResolved?.(Object.freeze({ col, row, grid })); } catch { /* Optional renderer observer. */ }
    return !this.stoppedReason;
  }
  /** An explicit reset starts a new epoch. A closed optional source stream must
   * not restart every frame while the retained provider finishes its tile queue. */
  stop(reason:string):void {
    if(this.stoppedReason||this.disposed)return;
    this.stoppedReason=reason.trim() || 'optional terrain source stopped';this.cancel(false);this.notify('pending');
  }
  get stopped():string|null{return this.stoppedReason;}
  get sourceOutcomes() { return Object.freeze([...this.outcomes.values()]); }
  get budgetExhausted() { return this.exhausted; }
  /** Visible terrain may need cells beyond the nine-cell preload window. This
   * bounded queue shares the same serial owner as preloading and never physics. */
  requestCells(cells: readonly OverviewCellIdentity[]): void {
    if (this.disposed || this.exhausted || this.stoppedReason) return;
    for (const cell of cells) {
      // A synchronous renderer callback may close admission while resolving a
      // cached owner earlier in this same request list.
      if (this.stoppedReason) return;
      if (!identity(cell.col, cell.row)) continue;
      const id = overviewId(cell.col, cell.row), outcome = this.outcomes.get(id), cached = this.cache.get(id);
      if(!outcome&&this.outcomes.size>=512){this.exhausted=true;this.stop('source outcome capacity');return;}
      if (outcome?.missing) { this.resolved(cell.col, cell.row, null); continue; }
      if (cached?.grid) { this.resolved(cell.col, cell.row, cached.grid); continue; }
      if (!this.scheduledDemand.has(id) && this.scheduledDemand.size < 32) {this.scheduledDemand.add(id);this.demand.set(id, cell);}
    }
    if (this.demandTask || !this.demand.size) return;
    const generation = this.generation;
    const task = (async () => {
      while (this.demand.size && !this.disposed && !this.stoppedReason && generation === this.generation) {
        const [id, cell] = this.demand.entries().next().value!; this.demand.delete(id);
        await this.serialize(async () => {
          if (this.disposed || generation !== this.generation) return;
          const controller = new AbortController(); this.demandController = controller;
          const timer = setTimeout(() => controller.abort('deadline'), this.budget);
          const valid = () => !this.disposed && generation === this.generation;
          try {
            const cached = this.cache.get(id);
            if(this.outcomes.get(id)?.missing)return;
            if(!this.outcomes.has(id)&&this.outcomes.size>=512){this.exhausted=true;this.stop('source outcome capacity');return;}
            if (cached?.grid) { this.resolved(cell.col, cell.row, cached.grid); return; }
            let regional: readonly TerrainGrid[] = [];
            try { regional = await bounded(this.regional((-90 + (cell.row + .5) / 4) * RAD,
              (-180 + (cell.col + .5) / 4) * RAD, controller.signal), controller.signal); } catch { /* Optional regional source. */ }
            if (!valid()) return;
            let grid: TerrainOverviewGrid | null = null, rawCandidate:CopernicusOverviewCell|undefined;
            try {
              grid = await this.compose(cell.col, cell.row, null, regional, controller.signal);
              if (!grid && !controller.signal.aborted) {
                const raw = cached?.raw ?? await this.read(cell.col, cell.row, controller.signal);
                grid = await this.compose(cell.col, cell.row, raw, regional, controller.signal);
                rawCandidate=raw;
              }
            } catch { /* This epoch will disclose this optional source as missing. */ }
            if (!valid()) return;
            // Cancellation is not a missing-source outcome; the caller may resume.
            if (controller.signal.aborted && controller.signal.reason !== 'deadline') return;
            if(!this.resolved(cell.col,cell.row,grid)||!valid())return;
            if (grid) this.cache.set(id, { ...(this.cache.get(id) ?? {}), ...(rawCandidate?{raw:rawCandidate}:{}), grid });
            while (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
          } finally {
            clearTimeout(timer); if (this.demandController === controller) this.demandController = null;
          }
        });
        if(generation===this.generation)this.scheduledDemand.delete(id);
      }
    })().finally(() => { if (generation === this.generation) this.demandTask = null; });
    this.demandTask = task; void task.catch(() => {});
  }
  get hasSources(): boolean { return this.stoppedReason!==null || this.cache.size > 0 || this.current.length > 0 || this.controller !== null || this.demand.size > 0 || this.demandController !== null; }
  cancel(clear = false): void {
    const interrupted = this.controller !== null;
    this.demandController?.abort(); this.demandController = null; this.demand.clear(); this.scheduledDemand.clear(); this.demandTask = null;
    this.generation++; this.controller?.abort(); this.controller = null; this.task = null;
    // A completed quarter-window remains complete through brief native loading;
    // only an interrupted batch needs to resume from its cached cells.
    if (clear || interrupted) this.key = '';
    if (clear) { this.current = []; this.cache.clear(); this.outcomes.clear(); this.exhausted = false; this.stoppedReason=null; this.install(this.current); }
    if (clear || interrupted) this.notify('off');
  }
  dispose(): void { if (this.disposed) return; this.cancel(true); this.options.source?.dispose(); this.disposed = true; }
}
