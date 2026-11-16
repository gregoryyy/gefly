import { WORLD_AIRPORT_LIMITS as LIMITS, type WorldAirportCell, type WorldAirportCounts, type WorldAirportManifest,
  type WorldAirportSnapshot, type WorldSearchHit } from './world-airport-contract.ts';
import { nearbyWorldAirportCells, readWorldAirportAsset, readWorldAirportSearch, validateWorldAirportCell,
  validateWorldAirportDescriptor, validateWorldAirportManifest, worldAirportCellId } from './world-airport-data.ts';

export interface WorldAirportStatus {
  status: 'loading' | 'ready' | 'partial' | 'empty' | 'unavailable';
  loaded: number; desired: number; cached: number; cacheBytes: number;
  source: string; retrieved: string; source_commit: string; message: string;
}
export interface WorldAirportRepositoryOptions {
  fetcher?: typeof fetch; timeoutMs?: number; now?: () => number;
  onSnapshot?(snapshot: WorldAirportSnapshot): void;
  onStatus?(status: WorldAirportStatus): void;
}
const KEYS = ['airports', 'runways', 'com', 'navaids'] as const;
const EMPTY_COUNTS: WorldAirportCounts = { airports: 0, runways: 0, com: 0, navaids: 0 };
const emptyCell = (id: string): WorldAirportCell => ({ schema: 1, id, airports: [], runways: [], com: [], navaids: [] });

/** Lives in the dedicated discovery worker. It never imports or sends simulation state. */
export function createWorldAirportRepository(options: WorldAirportRepositoryOptions = {}) {
  const fetcher = options.fetcher ?? fetch, now = options.now ?? Date.now, lifetime = new AbortController();
  const cache = new Map<string, { cell: WorldAirportCell; bytes: number }>();
  const failed = new Map<string, { epoch: number; until: number }>();
  let manifest: WorldAirportManifest | null = null, manifestJob: Promise<WorldAirportManifest> | null = null;
  let indexJob: Promise<WorldSearchHit[]> | null = null, manifestFailure = 0, indexFailure = 0;
  let desired: string[] = [], epoch = 0, disposed = false, running = false, cacheBytes = 0;
  let active: { id: string; controller: AbortController } | null = null;
  let lastSnapshotKey = '', partialAdmission = false;
  let aggregateKey = '', aggregate: WorldAirportSnapshot | null = null;
  const stopped = () => { if (disposed) throw new Error('Worldwide directory disposed'); };
  const readJson = (bytes: Uint8Array) => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  async function getManifest(): Promise<WorldAirportManifest> {
    stopped();
    if (manifest) return manifest;
    if (manifestJob) return manifestJob;
    if (now() < manifestFailure) throw new Error('Worldwide manifest unavailable');
    manifestJob = readWorldAirportAsset('/airports/world/manifest.json', 4096,
      lifetime.signal, fetcher, undefined, options.timeoutMs).then(async bytes => {
      const descriptor = validateWorldAirportDescriptor(readJson(bytes));
      const catalogue = await readWorldAirportAsset('/airports/world/catalogue.bin', LIMITS.manifestBytes,
        lifetime.signal, fetcher, descriptor, options.timeoutMs);
      stopped(); manifest = validateWorldAirportManifest(readJson(catalogue)); return manifest;
    }).catch(error => { manifestFailure = now() + 60000; throw error; }).finally(() => { manifestJob = null; });
    return manifestJob;
  }
  function snapshot(): WorldAirportSnapshot {
    const key = `${epoch}|${desired.map(id => cache.has(id) ? id : '-').join(',')}|${partialAdmission}|${manifest?.source_commit ?? ''}`;
    if (aggregate && aggregateKey === key) return aggregate;
    const result: WorldAirportSnapshot = { airports: [], runways: [], com: [], navaids: [],
      source: manifest?.source ?? '', retrieved: manifest?.retrieved ?? '', source_commit: manifest?.source_commit ?? '', partial: false, cells: [] };
    const seen = { airports: new Set<string>(), runways: new Set<string>(), com: new Set<string>(), navaids: new Set<string>() };
    for (const id of desired) {
      const cell = cache.get(id)?.cell;
      if (!cell) { result.partial = true; continue; }
      if (KEYS.some(key => cell[key].length > LIMITS[key] - result[key].length)) { result.partial = true; continue; }
      for (const key of KEYS) {
        for (const row of cell[key]) {
          if (seen[key].has(row.id)) { result.partial = true; continue; }
          seen[key].add(row.id);
          // Each array is homogeneous; the key loop shares only the identity contract.
          (result[key] as { id: string }[]).push(row);
        }
      }
      result.cells!.push(id);
    }
    result.partial ||= partialAdmission;
    aggregateKey = key; aggregate = result;
    return result;
  }
  function status(): WorldAirportStatus {
    const loaded = desired.filter(id => cache.has(id)).length;
    const pending = desired.some(id => eligible(id));
    // The same aggregate admission result drives visible arrays and status,
    // including duplicate identities and per-output count limits.
    const outputLimited = snapshot().partial;
    const state = !manifest ? manifestFailure > now() ? 'unavailable' : 'loading'
      : active || pending ? 'loading' : loaded < desired.length || partialAdmission || outputLimited ? loaded ? 'partial' : 'unavailable'
        : desired.some(id => { const c = cache.get(id)?.cell; return c && (c.airports.length || c.navaids.length); }) ? 'ready' : 'empty';
    const prefix = state === 'loading' ? 'Loading worldwide airport data'
      : state === 'unavailable' ? 'Worldwide airport data unavailable'
        : state === 'partial' ? 'Partial worldwide airport coverage'
          : state === 'empty' ? 'No airport or navaid records in these source cells' : 'Worldwide airport data ready';
    return { status: state, loaded, desired: desired.length, cached: cache.size, cacheBytes,
      source: manifest?.source ?? '', retrieved: manifest?.retrieved ?? '', source_commit: manifest?.source_commit ?? '',
      message: `${prefix}${manifest ? ` · ${loaded}/${desired.length} cells · ${manifest.retrieved} community snapshot` : ''}` };
  }
  function publish(force = false): void {
    if (disposed) return;
    const key = `${epoch}|${desired.map(id => cache.has(id) ? id : '-').join(',')}|${partialAdmission}|${manifest?.source_commit ?? ''}`;
    if (force || key !== lastSnapshotKey) {
      lastSnapshotKey = key;
      if (manifest) options.onSnapshot?.(snapshot());
    }
    options.onStatus?.(status());
  }
  function eligible(id: string): boolean {
    const failure = failed.get(id);
    return !cache.has(id) && (!failure || failure.epoch !== epoch && now() >= failure.until);
  }
  function trim(needed = 0): boolean {
    while (cache.size >= LIMITS.cacheCells || cacheBytes + needed > LIMITS.cacheBytes) {
      const key = [...cache.keys()].find(id => !desired.includes(id));
      if (key === undefined) return false;
      cacheBytes -= cache.get(key)!.bytes; cache.delete(key);
    }
    return true;
  }
  function failCell(id: string): void {
    failed.delete(id); failed.set(id, { epoch, until: now() + 60000 });
    while (failed.size > 128) failed.delete(failed.keys().next().value!);
  }
  async function run(): Promise<void> {
    if (running || disposed || !desired.length) return;
    running = true;
    try {
      const m = await getManifest();
      while (!disposed) {
        const id = desired.find(eligible); if (!id) break;
        const requestedEpoch = epoch;
        if (!Object.hasOwn(m.cells, id)) {
          if (!trim()) { failCell(id); partialAdmission = true; publish(); continue; }
          cache.set(id, { cell: emptyCell(id), bytes: 0 }); publish(); continue;
        }
        const meta = m.cells[id], job = { id, controller: new AbortController() };
        active = job; publish();
        const stop = () => job.controller.abort(); lifetime.signal.addEventListener('abort', stop, { once: true });
        try {
          const raw = await readWorldAirportAsset(`/airports/world/cells/${id}.bin`, LIMITS.cellBytes,
            job.controller.signal, fetcher, meta, options.timeoutMs);
          if (disposed || job.controller.signal.aborted || !desired.includes(id) || requestedEpoch !== epoch) continue;
          const cell = validateWorldAirportCell(readJson(raw), id, meta.counts);
          if (!trim(raw.byteLength)) { failCell(id); partialAdmission = true; continue; }
          cache.set(id, { cell, bytes: raw.byteLength }); cacheBytes += raw.byteLength; failed.delete(id);
        } catch {
          if (!disposed && !job.controller.signal.aborted && desired.includes(id) && requestedEpoch === epoch) failCell(id);
        } finally {
          lifetime.signal.removeEventListener('abort', stop); if (active === job) active = null; publish();
        }
      }
    } catch { publish(); }
    finally { running = false; publish(); }
  }
  async function getIndex(): Promise<WorldSearchHit[]> {
    stopped(); if (indexJob) return indexJob;
    if (now() < indexFailure) throw new Error('Worldwide search unavailable');
    indexJob = (async () => {
      const m = await getManifest();
      const bytes = await readWorldAirportAsset('/airports/world/search.bin', LIMITS.searchBytes,
        lifetime.signal, fetcher, m.search, options.timeoutMs);
      const rows = await readWorldAirportSearch(bytes, m, lifetime.signal); stopped(); return rows;
    })().catch(error => { indexJob = null; indexFailure = now() + 60000; throw error; });
    return indexJob;
  }
  function updateCenter(lon: number, lat: number): void {
    stopped(); const cells = nearbyWorldAirportCells(worldAirportCellId(lon, lat));
    if (cells.join() === desired.join()) return;
    epoch++; desired = cells; partialAdmission = false;
    // A new center gives its central cell priority. Do not adopt a previous
    // generation's response even if it also occurs in the new neighbour set.
    active?.controller.abort();
    for (const id of desired) {
      const entry = cache.get(id); if (entry) { cache.delete(id); cache.set(id, entry); }
    }
    publish(); void run();
  }
  return {
    updateCenter,
    async search(query: string): Promise<WorldSearchHit[]> {
      stopped(); if (typeof query !== 'string' || query.length > 120) throw new Error('Invalid worldwide search');
      const text = query.trim().toLocaleLowerCase(); if (text.length < 2) return [];
      const index = await getIndex(); stopped();
      const hits = index.filter(row => `${row.id} ${row.name} ${row.codes} ${row.type} ${row.iso_country}`.toLocaleLowerCase().includes(text));
      const rank = (hit: WorldSearchHit) => hit.id.toLocaleLowerCase() === text || hit.codes.toLocaleLowerCase().split(' ').includes(text) ? 0
        : hit.id.toLocaleLowerCase().startsWith(text) || hit.codes.toLocaleLowerCase().startsWith(text) ? 1 : 2;
      hits.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind));
      return hits.slice(0, LIMITS.searchResults).map(row => ({ ...row }));
    },
    async select(hit: WorldSearchHit): Promise<WorldAirportSnapshot> {
      stopped();
      if (!hit || worldAirportCellId(hit.lon, hit.lat) !== hit.cell || !['airport', 'navaid'].includes(hit.kind)) throw new Error('Invalid worldwide selection');
      updateCenter(hit.lon, hit.lat);
      const selectedEpoch = epoch;
      await getManifest();
      // run() is single-owner, including when an obsolete request is cancelling.
      await run();
      while (running && !cache.has(hit.cell)) {
        if (failed.get(hit.cell)?.epoch === epoch) throw new Error('Worldwide selection unavailable');
        await new Promise<void>(resolve => setTimeout(resolve, 5)); stopped();
        if (selectedEpoch !== epoch) throw new Error('Worldwide selection superseded');
      }
      stopped();
      if (selectedEpoch !== epoch || !cache.has(hit.cell)) throw new Error('Worldwide selection unavailable');
      const result = snapshot();
      if (!(hit.kind === 'airport' ? result.airports : result.navaids).some(row => row.id === hit.id)) throw new Error('Worldwide selection does not match its source cell');
      return result;
    },
    get snapshot(): WorldAirportSnapshot { return snapshot(); },
    get status(): WorldAirportStatus { return status(); },
    dispose(): void {
      if (disposed) return; disposed = true; lifetime.abort(); active?.controller.abort(); active = null;
      desired = []; cache.clear(); failed.clear(); cacheBytes = 0; indexJob = null; manifest = null;
      aggregateKey = ''; aggregate = null;
    },
  };
}
