// Source I/O, decoding, hashing and composition live in this dedicated Worker.
// It has no native-engine reference and never installs or publishes scene tiles.
import { loadWorldTerrainPackage } from './world-terrain.js';
import { loadRegionalManifestOptional, WorldTerrainStream } from './terrain-stream.js';
import { loadTerrainPackage } from './terrain.js';

export const TERRAIN_SOURCE_PROTOCOL = 1;

// Copy before transferring: the stream retains its immutable live and shadow
// caches, including shared-node source outcomes, across subsequent moves.
export function copyTerrainGrid(grid) {
  return { ...grid, physical_m: grid.physical_m.slice(), geoid_m: grid.geoid_m.slice() };
}

/** Fixed same-origin data operations only. The injectable services are for local
 * tests; messages cannot supply fetchers, URLs, executable code or module paths. */
export function installTerrainSourceHandler(scope, services = {}) {
  const loadWorld = services.loadWorld ?? loadWorldTerrainPackage;
  const loadManifest = services.loadManifest ?? loadRegionalManifestOptional;
  const loadFine = services.loadFine ?? loadTerrainPackage;
  const makeStream = services.makeStream ?? ((world, manifest) => new WorldTerrainStream(world, manifest, () => {}, () => {}));
  let stream = null, epoch = null, initializing = false, lastRequest = 0;
  const controller = new AbortController();
  const post = (request, result) => {
    const transfer = [result.world, result.fine, ...(result.tiles ?? [])].filter(Boolean)
      .flatMap(grid => [grid.physical_m.buffer, grid.geoid_m.buffer]);
    scope.postMessage({ protocol: TERRAIN_SOURCE_PROTOCOL, epoch, request, ...result }, transfer);
  };
  scope.onmessage = async ({ data: message }) => {
    if (!message || message.protocol !== TERRAIN_SOURCE_PROTOCOL || !Number.isSafeInteger(message.epoch)
      || message.epoch < 1 || !Number.isSafeInteger(message.request) || message.request <= lastRequest
      || !['init', 'move', 'prefetch', 'cancel-prefetch'].includes(message.type)) return;
    if (epoch !== null && epoch !== message.epoch) return;
    lastRequest = message.request;
    if (epoch === null) epoch = message.epoch;
    const request = message.request;
    try {
      if (message.type === 'init') {
        if (stream || initializing) throw new Error('Terrain source already initialized.');
        if (typeof message.fine !== 'boolean' || typeof message.streaming !== 'boolean'
          || (!message.fine && !message.streaming)) throw new Error('Invalid terrain source initialization.');
        initializing = true;
        const fine = message.fine ? await loadFine() : null;
        const world = message.streaming ? await loadWorld(undefined, controller.signal) : null;
        const manifest = message.streaming ? await loadManifest(undefined, controller.signal) : null;
        if (message.streaming) stream = makeStream(world, manifest);
        post(request, { type: 'initialized', world: world && copyTerrainGrid(world), fine: fine && copyTerrainGrid(fine), manifest: [...(stream?.manifest ?? [])] });
      } else {
        if (!stream) throw new Error('Terrain source not initialized.');
        if (message.type === 'cancel-prefetch') {
          stream.cancelPrefetch(); post(request, { type: 'prefetched', ready: false }); return;
        }
        if (![message.lat, message.lon].every(Number.isFinite) || !stream.center(message.lat, message.lon))
          throw new Error('Invalid terrain source coordinates.');
        if (message.type === 'prefetch') {
          const p = message.prediction;
          if (p !== null && (!p || ![p.lat_rad, p.lon_rad].every(Number.isFinite)
            || Math.abs(p.lon_rad) > Math.PI || !stream.center(p.lat_rad, p.lon_rad)))
            throw new Error('Invalid terrain prediction.');
          post(request, { type: 'prefetched', ready: await stream.prefetch(message.lat, message.lon, p) });
        } else {
          await stream.move(message.lat, message.lon);
          post(request, { type: 'moved', key: stream.key, tiles: [...stream.tiles.values()].map(copyTerrainGrid),
            failedSources: [...stream.failedSources], copernicusSourceCount: stream.copernicusSources.size,
            copernicusBudgetExhausted: stream.copernicusBudgetExhausted });
        }
      }
    } catch (error) {
      post(request, { type: 'error', message: String(error?.message ?? error).slice(0, 500) });
    }
  };
  return () => { controller.abort(); stream?.cancel(); scope.onmessage = null; };
}

if (typeof self !== 'undefined' && typeof self.document === 'undefined') installTerrainSourceHandler(self);
