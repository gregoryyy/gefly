import type { TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import type { CopernicusOverviewCell, TerrainOverviewGrid, TerrainOverviewSource } from './terrain-overview.ts';

/** One renderer-data Worker; the controller and synchronous admission guards stay local. */
export function createTerrainOverviewSource(world: TerrainGrid): TerrainOverviewSource {
  let worker: Worker | null = null, next = 0, closed = false;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void; detach: () => void }>();
  const fail = () => {
    closed = true; worker?.terminate(); worker = null;
    for (const entry of pending.values()) { entry.detach(); entry.reject(Error('Terrain overview Worker unavailable')); }
    pending.clear();
  };
  try {
    worker = new Worker(new URL('./terrain-overview-source.worker.ts', import.meta.url), { type: 'module', name: 'gefly-terrain-overview' });
    worker.onerror = fail;
    worker.onmessage = ({ data }) => {
      const entry = pending.get(data?.id); if (!entry) return;
      pending.delete(data.id); entry.detach();
      if (data.error) entry.reject(Error('Terrain overview source failed')); else entry.resolve(data.value);
    };
  } catch { closed = true; }
  function call(op: string, input: object, signal?: AbortSignal): Promise<any> {
    if (closed || !worker || signal?.aborted || pending.size >= 4) return Promise.reject(Error('Terrain overview source unavailable'));
    return new Promise((resolve, reject) => {
      const id = ++next;
      const abort = () => { pending.get(id)?.detach(); pending.delete(id); worker?.postMessage({ op: 'cancel', id }); reject(Error('Terrain overview cancelled')); };
      const timer = setTimeout(() => { abort(); fail(); }, 16000);
      const detach = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
      pending.set(id, { resolve, reject, detach });
      signal?.addEventListener('abort', abort, { once: true });
      try { worker!.postMessage({ id, op, ...input }); }
      catch { pending.delete(id); detach(); reject(Error('Cannot send terrain overview work')); fail(); }
    });
  }
  const ready = call('init', { world }); void ready.catch(() => {});
  return {
    async regional(lat, lon, signal) { await ready; return call('regional', { lat, lon }, signal); },
    async read(col, row, signal) { await ready; return call('read', { col, row }, signal) as Promise<CopernicusOverviewCell>; },
    async compose(col, row, raw, regional, signal) {
      try { await ready; return await call('compose', { col, row, raw, regional }, signal) as TerrainOverviewGrid | null; }
      catch { if (signal.aborted) return null; throw Error('Terrain overview composition unavailable'); }
    },
    dispose: fail,
  };
}
