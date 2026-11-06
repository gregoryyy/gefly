import { loadAirportRegion, type AirportRegionEntry as Entry } from './airport-region-read.ts';
export { loadAirportRegion } from './airport-region-read.ts';
import { createAirportRegionWorkerReader, type AirportRegionReader } from './airport-region-worker.ts';
import { AIRPORT_REGION_LIMITS, airportRegionAt, airportRegionId,
  type AirportRegionKey, type AirportRegionPackage } from './airport-region.ts';

export const AIRPORT_LOADER_LIMITS = Object.freeze({ regions: 32, bytes: 64 * 1024 * 1024,
  desired: 9, packageBytes: AIRPORT_REGION_LIMITS.maxBytes, timeoutMs: 35_000, failureMs: 300_000, failures: 128 });
type Status = 'disabled' | 'loading' | 'ready' | 'empty' | 'partial' | 'unavailable';
interface Failed { until: number; epoch: number }
export interface AirportRegionLoaderOptions {
  fetcher?: typeof fetch; now?: () => number; timeoutMs?: number; onChange?: () => void;
}
/** Fixed neighbouring cells, wrapping at the dateline and never inventing polar cells. */
export function nearbyAirportRegions(center: AirportRegionKey): AirportRegionKey[] {
  const result = [{ ...center }];
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const y = center.y + dy;
    if (y >= 0 && y < 360) result.push({ x: (center.x + dx + 720) % 720, y });
  }
  return result;
}

/** Display-only regional package owner. No timer retries and no flight-worker writes. */
export function createAirportRegionLoader(options: AirportRegionLoaderOptions = {}) {
  const fetcher = options.fetcher ?? fetch, now = options.now ?? Date.now;
  const cache = new Map<string, Entry>(), failures = new Map<string, Failed>();
  let reader: AirportRegionReader | null = null;
  let desired = new Map<string, AirportRegionKey>();
  let enabled = false, disposed = false, epoch = 0, bytes = 0, revision = 0;
  let active: { id: string; key: AirportRegionKey; controller: AbortController } | null = null;
  const changed = () => { revision++; options.onChange?.(); };
  function trim(): void {
    while (cache.size > AIRPORT_LOADER_LIMITS.regions || bytes > AIRPORT_LOADER_LIMITS.bytes) {
      const id = [...cache.keys()].find(candidate => !desired.has(candidate));
      if (id === undefined) break;
      bytes -= cache.get(id)!.bytes; cache.delete(id);
    }
    while (failures.size > AIRPORT_LOADER_LIMITS.failures) failures.delete(failures.keys().next().value!);
  }
  function eligible(id: string): boolean {
    const failure = failures.get(id);
    return !cache.has(id) && (!failure || (failure.epoch !== epoch && now() >= failure.until));
  }
  function pump(): void {
    if (active || disposed || !enabled) return;
    const next = [...desired].find(([id]) => eligible(id));
    if (!next) return;
    const [id, key] = next, job = { id, key, controller: new AbortController() };
    active = job;
    // The browser's default path always isolates parsing/validation in one
    // dedicated worker. Only explicit test adapters read directly here.
    const read = () => {
      if (options.fetcher || typeof window === 'undefined') return loadAirportRegion(key, job.controller.signal, fetcher, options.timeoutMs);
      reader ??= createAirportRegionWorkerReader(options.timeoutMs ?? AIRPORT_LOADER_LIMITS.timeoutMs);
      return reader.read(key, job.controller.signal);
    };
    void read().then(entry => {
      if (disposed || active !== job || job.controller.signal.aborted || !enabled || !desired.has(id)) return;
      cache.set(id, entry); bytes += entry.bytes; failures.delete(id); trim(); changed();
    }).catch(() => {
      if (disposed || active !== job || job.controller.signal.aborted) return;
      failures.delete(id); failures.set(id, { until: now() + AIRPORT_LOADER_LIMITS.failureMs, epoch });
      trim(); changed();
    }).finally(() => {
      if (active === job) { active = null; changed(); pump(); }
    });
  }
  return {
    update(lon_deg: number, lat_deg: number, live: boolean): void {
      if (disposed) return;
      const center = live ? airportRegionAt(lon_deg, lat_deg) : null;
      const next = new Map((center ? nearbyAirportRegions(center) : []).map(key => [airportRegionId(key), key]));
      const same = enabled === !!center && [...next.keys()].join(',') === [...desired.keys()].join(',');
      if (same) return;
      enabled = !!center; desired = next; epoch++;
      if (active && (!enabled || !desired.has(active.id))) {
        const old = active; active = null; old.controller.abort();
      }
      for (const id of desired.keys()) {
        const entry = cache.get(id); if (entry) { cache.delete(id); cache.set(id, entry); }
      }
      trim(); changed(); pump();
    },
    get packages(): readonly AirportRegionPackage[] {
      return [...desired.keys()].flatMap(id => cache.has(id) ? [cache.get(id)!.package] : []);
    },
    get stats() {
      const entries = [...desired.keys()].flatMap(id => cache.has(id) ? [cache.get(id)!.package] : []);
      const waiting = [...desired.keys()].filter(id => !cache.has(id) && eligible(id)).length;
      const missing = desired.size - entries.length;
      const features = entries.reduce((n, value) => n + value.features.length, 0);
      const status: Status = !enabled ? 'disabled' : active || waiting ? 'loading' : missing
        ? entries.length ? 'partial' : 'unavailable' : features ? 'ready' : 'empty';
      return { status, revision, loaded: entries.map(value => value.id), desired: desired.size,
        pending: active ? 1 : 0, queued: Math.max(0, waiting - (active ? 1 : 0)), cached: cache.size,
        cacheBytes: bytes, failures: failures.size, features,
        rejected: entries.reduce((n, value) => n + value.rejected, 0),
        sourceDates: [...new Set(entries.map(value => value.source.osm_base))].sort() };
    },
    reset(): void {
      if (disposed) return;
      const old = active; active = null; old?.controller.abort();
      desired.clear(); cache.clear(); failures.clear(); bytes = 0; enabled = false; epoch++; changed();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true; reader?.dispose(); reader = null; const old = active; active = null; old?.controller.abort();
      desired.clear(); cache.clear(); failures.clear(); bytes = 0; enabled = false; changed();
    },
  };
}
