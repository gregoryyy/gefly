import { AIRPORT_REGION_LIMITS, airportRegionId, type AirportRegionKey } from './airport-region.ts';

import type { AirportRegionEntry } from './airport-region-read.ts';
export interface AirportRegionReader {
  read(key: AirportRegionKey, signal: AbortSignal): Promise<AirportRegionEntry>;
  dispose(): void;
}
interface Waiting { key: AirportRegionKey; resolve: (value: AirportRegionEntry) => void; reject: (error: Error) => void; release: () => void }

/** Dedicated browser data worker; network bytes are accepted only in that worker. */
export function createAirportRegionWorkerReader(timeoutMs: number): AirportRegionReader {
  let worker: Worker | null = null, disposed = false, nextId = 0;
  const pending = new Map<number, Waiting>();
  function fail(): void {
    worker?.terminate(); worker = null;
    for (const waiting of pending.values()) { waiting.release(); waiting.reject(new Error('Airport data worker unavailable')); }
    pending.clear();
  }
  function start(): Worker {
    if (worker) return worker;
    worker = new Worker(new URL('./airport-region.worker.ts', import.meta.url), { type: 'module', name: 'gefly-airport-data' });
    worker.addEventListener('message', ({ data }: MessageEvent) => {
      if (!data || !Number.isSafeInteger(data.id)) return;
      const waiting = pending.get(data.id); if (!waiting) return;
      pending.delete(data.id); waiting.release();
      // This is a protocol check on our own worker, not another source parse.
      // Full geometry and provenance validation already ran off the main thread.
      if (data.type !== 'ready' || !data.entry || !Number.isInteger(data.entry.bytes) || data.entry.bytes < 1
        || data.entry.bytes > AIRPORT_REGION_LIMITS.maxBytes || data.entry.package?.version !== 1
        || data.entry.package.id !== airportRegionId(waiting.key)
        || data.entry.package.x !== waiting.key.x || data.entry.package.y !== waiting.key.y
        || !Array.isArray(data.entry.package.features) || data.entry.package.features.length > AIRPORT_REGION_LIMITS.maxFeatures) {
        waiting.reject(new Error('Airport data unavailable or invalid')); return;
      }
      waiting.resolve(data.entry as AirportRegionEntry);
    });
    worker.addEventListener('error', event => { event.preventDefault(); fail(); });
    worker.addEventListener('messageerror', fail);
    return worker;
  }
  return {
    read(key, signal) {
      if (disposed || signal.aborted) return Promise.reject(new Error('Airport data cancelled'));
      if (pending.size) return Promise.reject(new Error('Airport data worker busy'));
      return new Promise<AirportRegionEntry>((resolve, reject) => {
        const id = ++nextId;
        let timer: ReturnType<typeof setTimeout>;
        const abort = () => {
          const item = pending.get(id); if (!item) return;
          pending.delete(id); item.release(); worker?.postMessage({ type: 'cancel', id });
          reject(new Error('Airport data cancelled or timed out'));
        };
        const release = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
        pending.set(id, { key, resolve, reject, release });
        signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(abort, timeoutMs + 1000);
        try { start().postMessage({ type: 'load', id, key, timeoutMs }); }
        catch { pending.delete(id); release(); reject(new Error('Airport data worker unavailable')); }
      });
    },
    dispose() { if (disposed) return; disposed = true; fail(); },
  };
}
