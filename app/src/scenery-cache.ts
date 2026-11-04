import { distanceMeters, planSceneryPrefetch, planStartupSceneryPrefetch } from './scenery-coverage.ts';
import { loadRegionalManifest } from '../../studies/e1-browser/sim/terrain-stream.js';

/** Public tile warming is presentation-only; the native terrain loader still
 * verifies its manifest hashes and remains authoritative for contact physics. */
export function createSceneryCache(container: HTMLElement): {
  update(lat_rad: number, lon_rad: number, vector: boolean, enabled: boolean, settled?: boolean): void;
  preload(lat_rad: number, lon_rad: number, vector: boolean, enabled: boolean): void;
  dispose(): void;
} {
  let disposed = false, registration: ServiceWorkerRegistration | null = null;
  type Focus = { lat: number; lon: number; vector: boolean; enabled: boolean; settled: boolean };
  let latest: Focus | null = null, planned: Focus | null = null;
  let startup: { lat: number; lon: number; vector: boolean; urls: readonly string[] } | null = null;
  let terrainHashes = new Map<string, string>();
  const nearby = (lat: number, lon: number, focus: { lat: number; lon: number; vector: boolean }, vector: boolean) =>
    vector === focus.vector && distanceMeters(lat, lon, focus.lat, focus.lon) < 500;
  const valid = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= Math.PI / 2 && Math.abs(lon) <= Math.PI;
  const send = () => {
    if (disposed || !latest || !registration?.active || latest.enabled && !latest.settled && !startup) return;
    const paths = latest.enabled ? [...(startup?.urls ?? []), ...planSceneryPrefetch(latest.lat, latest.lon, latest.vector)] : [];
    const urls = [...new Set(paths.flatMap(path => {
      if (!path.startsWith('/terrain/region/')) return [path];
      const hash = terrainHashes.get(path); return hash ? [`${path}?sha256=${hash}`] : [];
    }))].slice(0, 200);
    registration.active.postMessage({ type: 'scenery-cache-focus', urls });
    planned = { ...latest };
  };
  const onMessage = (event: MessageEvent) => {
    if (disposed || event.data?.type !== 'scenery-cache-status' || event.source !== registration?.active) return;
    container.dataset.sceneryCache = event.data.state;
    container.dataset.sceneryCacheQueued = String(event.data.queued);
    container.dataset.sceneryCacheCompleted = String(event.data.completed);
    container.dataset.sceneryCacheFailed = String(event.data.failed);
  };
  const supported = window.isSecureContext && 'serviceWorker' in navigator;
  container.dataset.sceneryCache = supported ? 'starting' : 'unavailable';
  if (supported) {
    navigator.serviceWorker.addEventListener('message', onMessage);
    navigator.serviceWorker.addEventListener('controllerchange', send);
    void navigator.serviceWorker.register('/scenery-cache-sw.js', { scope: '/' }).then(async value => {
      registration = value;
      if (!value.active) await navigator.serviceWorker.ready;
      if (disposed) return;
      send();
      try {
        const manifest = await loadRegionalManifest();
        terrainHashes = new Map([...manifest.values()].map(tile => [`/terrain/region/${tile.asset}`, tile.sha256]));
        send();
      } catch { /* Render/physics retain their existing source and error handling. */ }
    }).catch(() => { if (!disposed) container.dataset.sceneryCache = 'unavailable'; });
  }
  return {
    preload(lat, lon, vector, enabled) {
      if (disposed || !valid(lat, lon)) return;
      if (enabled && startup && nearby(lat, lon, startup, vector)) return;
      const settled = latest && nearby(lat, lon, latest, vector) ? latest.settled : false;
      latest = { lat, lon, vector, enabled, settled };
      startup = enabled ? { lat, lon, vector, urls: planStartupSceneryPrefetch(lat, lon) } : null;
      send();
    },
    update(lat, lon, vector, enabled, settled = true) {
      if (disposed || !valid(lat, lon)) return;
      const obsoleteStartup = !!startup && (!enabled || !nearby(lat, lon, startup, vector));
      if (obsoleteStartup) startup = null;
      latest = { lat, lon, vector, enabled, settled };
      const changed = obsoleteStartup || !planned || enabled !== planned.enabled || vector !== planned.vector || distanceMeters(lat, lon, planned.lat, planned.lon) >= 500;
      if (!changed) return;
      if (enabled && !settled && !startup) {
        // Preserve nearby warming during transient visible tile work. Only a
        // genuinely obsolete location/mode cancels it before the next plan.
        if (planned?.enabled) {
          registration?.active?.postMessage({ type: 'scenery-cache-focus', urls: [] });
          planned = null;
        }
        return;
      }
      send();
    },
    dispose() {
      if (disposed) return;
      if (registration?.active) registration.active.postMessage({ type: 'scenery-cache-focus', urls: [] });
      disposed = true; startup = null;
      if (supported) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        navigator.serviceWorker.removeEventListener('controllerchange', send);
      }
    },
  };
}
