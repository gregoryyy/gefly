import { WORLD_AIRPORT_LIMITS as LIMITS, type WorldAirportSnapshot, type WorldSearchHit } from './world-airport-contract.ts';
import type { WorldAirportStatus } from './world-airport-repository.ts';
export type { WorldAirportStatus } from './world-airport-repository.ts';

export interface WorldAirportLoaderOptions {
  onSnapshot(snapshot: WorldAirportSnapshot): void;
  onStatus(status: WorldAirportStatus): void;
  now?: () => number;
}
interface Pending { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }
function validSnapshot(s: unknown): s is WorldAirportSnapshot {
  if (!s || typeof s !== 'object') return false;
  const value = s as Record<string, unknown>;
  return (['airports', 'runways', 'com', 'navaids'] as const).every(key => Array.isArray(value[key]) && value[key].length <= LIMITS[key])
    && typeof value.source === 'string' && value.source.length <= 200 && typeof value.retrieved === 'string' && value.retrieved.length <= 10
    && typeof value.source_commit === 'string' && /^[a-f0-9]{40}$/.test(value.source_commit) && typeof value.partial === 'boolean';
}
/** Browser discovery work is isolated from both UI rendering and the physics worker. */
export function createWorldAirportLoader(options: WorldAirportLoaderOptions) {
  let worker: Worker | null = null, disposed = false, nextId = 0;
  const now = options.now ?? Date.now;
  let retryAfter = 0, unavailableReported = false;
  const pending = new Map<number, Pending>();
  const rejectAll = (message: string) => {
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error(message)); }
    pending.clear();
  };
  const unavailable = () => {
    if (unavailableReported || disposed) return;
    unavailableReported = true;
    options.onStatus({ status: 'unavailable', loaded: 0, desired: 0, cached: 0, cacheBytes: 0,
      source: '', retrieved: '', source_commit: '', message: 'Worldwide airport data worker unavailable · retry after one minute' });
  };
  function fail(): void { worker?.terminate(); worker = null; retryAfter = now() + 60000; rejectAll('Worldwide data worker unavailable'); if (!disposed) unavailable(); }
  function start(): Worker {
    if (disposed) throw new Error('Worldwide directory disposed');
    if (worker) return worker;
    if (now() < retryAfter) throw new Error('Worldwide worker retry cooling down');
    let owned: Worker;
    try { owned = new Worker(new URL('./world-airport.worker.ts', import.meta.url), { type: 'module', name: 'gefly-world-airport-discovery' }); }
    catch (error) { retryAfter = now() + 60000; throw error; }
    unavailableReported = false;
    worker = owned;
    owned.addEventListener('message', ({ data }: MessageEvent) => {
      if (disposed || worker !== owned || !data || typeof data !== 'object') return;
      if (data.type === 'snapshot') {
        const s = data.snapshot;
        if (!validSnapshot(s)) { fail(); return; }
        options.onSnapshot(s); return;
      }
      if (data.type === 'status') {
        const s = data.status;
        if (!s || !['loading', 'ready', 'partial', 'empty', 'unavailable'].includes(s.status) || typeof s.message !== 'string'
          || !Number.isInteger(s.cached) || s.cached < 0 || s.cached > LIMITS.cacheCells
          || !Number.isInteger(s.cacheBytes) || s.cacheBytes < 0 || s.cacheBytes > LIMITS.cacheBytes
          || !Number.isInteger(s.desired) || s.desired < 0 || s.desired > LIMITS.desiredCells
          || !Number.isInteger(s.loaded) || s.loaded < 0 || s.loaded > s.desired) { fail(); return; }
        options.onStatus(s as WorldAirportStatus); return;
      }
      if (!Number.isSafeInteger(data.id)) return;
      const request = pending.get(data.id); if (!request) return;
      pending.delete(data.id); clearTimeout(request.timer);
      if (data.type !== 'result') request.reject(new Error('Worldwide directory request unavailable'));
      else request.resolve(data.value);
    });
    owned.addEventListener('error', event => { event.preventDefault(); if (worker === owned) fail(); });
    owned.addEventListener('messageerror', () => { if (worker === owned) fail(); });
    return owned;
  }
  function request(type: 'search' | 'select', value: unknown): Promise<unknown> {
    if (disposed) return Promise.reject(new Error('Worldwide directory disposed'));
    if (pending.size >= 16) return Promise.reject(new Error('Worldwide directory busy'));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        const item = pending.get(id); if (!item) return;
        pending.delete(id); item.reject(new Error('Worldwide directory request timed out'));
      }, 45000);
      pending.set(id, { resolve, reject, timer });
      try { start().postMessage({ type, id, value }); }
      catch { pending.delete(id); clearTimeout(timer); reject(new Error('Worldwide data worker unavailable')); unavailable(); }
    });
  }
  return {
    updateCenter(lon: number, lat: number): void {
      if (disposed) return;
      if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90) return;
      try { start().postMessage({ type: 'center', lon, lat }); } catch { unavailable(); }
    },
    async search(query: string): Promise<WorldSearchHit[]> {
      if (typeof query !== 'string' || query.length > 120) throw new Error('Invalid worldwide search');
      const result = await request('search', query);
      if (!Array.isArray(result) || result.length > LIMITS.searchResults) throw new Error('Invalid worldwide search response');
      return result as WorldSearchHit[];
    },
    async select(hit: WorldSearchHit): Promise<WorldAirportSnapshot> {
      const result = await request('select', hit);
      if (!validSnapshot(result)) throw new Error('Invalid worldwide selection response');
      return result;
    },
    dispose(): void {
      if (disposed) return; disposed = true; worker?.terminate(); worker = null; rejectAll('Worldwide directory disposed');
    },
  };
}
