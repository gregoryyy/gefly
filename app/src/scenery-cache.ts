import { distanceMeters, planSceneryPrefetch } from './scenery-coverage';
import { loadRegionalManifest } from '../../studies/e1-browser/sim/terrain-stream.js';

/** Public tile warming is presentation-only; the native terrain loader still
 * verifies its manifest hashes and remains authoritative for contact physics. */
export function createSceneryCache(container: HTMLElement): {
  update(lat_rad: number, lon_rad: number, vector: boolean, enabled: boolean): void;
  dispose(): void;
} {
  let disposed = false, registration: ServiceWorkerRegistration | null = null;
  type Focus = { lat: number; lon: number; vector: boolean; enabled: boolean };
  let latest: Focus | null = null, planned: Focus | null = null;
  let terrainHashes = new Map<string, string>();
  const send = () => {
    if (disposed || !latest || !registration?.active) return;
    const urls = latest.enabled ? planSceneryPrefetch(latest.lat, latest.lon, latest.vector).flatMap(path => {
      if (!path.startsWith('/terrain/region/')) return [path];
      const hash = terrainHashes.get(path); return hash ? [`${path}?sha256=${hash}`] : [];
    }) : [];
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
    update(lat, lon, vector, enabled) {
      if (disposed || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > Math.PI / 2 || Math.abs(lon) > Math.PI) return;
      latest = { lat, lon, vector, enabled };
      if (!planned || enabled !== planned.enabled || vector !== planned.vector || distanceMeters(lat, lon, planned.lat, planned.lon) >= 500) send();
    },
    dispose() {
      if (disposed) return;
      if (registration?.active) registration.active.postMessage({ type: 'scenery-cache-focus', urls: [] });
      disposed = true;
      if (supported) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        navigator.serviceWorker.removeEventListener('controllerchange', send);
      }
    },
  };
}
