import { TerrainStream, loadRegionalManifestOptional } from '../../studies/e1-browser/sim/terrain-stream.js';
import { validateTerrainGrid, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { composeTerrainOverview, readCopernicusOverview } from './terrain-overview.ts';

const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage: (value: unknown, transfer?: Transferable[]) => void };
let world: TerrainGrid | null = null;
const active = new Map<number, AbortController>();
scope.onmessage = ({ data }) => {
  if (data?.op === 'cancel') { active.get(data.id)?.abort(); return; }
  if (!Number.isSafeInteger(data?.id) || data.id < 1 || active.size >= 4) return;
  const controller = new AbortController(); active.set(data.id, controller);
  void (async () => {
    let value: any;
    if (data.op === 'init') { if (!validateTerrainGrid(data.world)) throw Error(); world = data.world; value = true; }
    else if (!world) throw Error();
    else if (data.op === 'read') value = await readCopernicusOverview(data.col, data.row, fetch, controller.signal);
    else if (data.op === 'compose') value = await composeTerrainOverview(world, data.col, data.row, data.raw, data.regional);
    else if (data.op === 'regional') {
      if (![data.lat, data.lon].every(Number.isFinite) || Math.abs(data.lat) > Math.PI / 2 || Math.abs(data.lon) > Math.PI) throw Error();
      value = [];
      const rad = Math.PI / 180, x = data.lon / rad, y = data.lat / rad;
      if (x + .5 >= 6 && x - .5 <= 14 && y + .5 >= 47 && y - .5 <= 51.75) {
        const manifest = await loadRegionalManifestOptional(fetch, controller.signal);
        if (manifest) {
          const loader = new TerrainStream(manifest, grid => value.push(grid), () => {}, fetch);
          const cancel = () => loader.cancel(); controller.signal.addEventListener('abort', cancel, { once: true });
          try { await loader.move(Math.max(47.00000001, Math.min(51.74999999, y)) * rad,
            Math.max(6.00000001, Math.min(13.99999999, x)) * rad); }
          finally { loader.cancel(); controller.signal.removeEventListener('abort', cancel); }
        }
      }
    } else throw Error();
    if (controller.signal.aborted) return;
    const transfers: Transferable[] = [];
    const collect = (grid: any) => { for (const key of ['physical_m', 'geoid_m']) if (grid?.[key]?.buffer instanceof ArrayBuffer) transfers.push(grid[key].buffer); };
    if (Array.isArray(value)) value.forEach(collect); else collect(value);
    scope.postMessage({ id: data.id, value }, [...new Set(transfers)]);
  })().catch(() => { if (!controller.signal.aborted) scope.postMessage({ id: data.id, error: true }); })
    .finally(() => active.delete(data.id));
};
