import { validAirportRegionKey } from './airport-region.ts';
import { loadAirportRegion } from './airport-region-read.ts';

// Fetch, streamed decoding, SHA-256, JSON parsing and complete source validation
// run here. No simulator/terrain/avionics module is imported by this worker.
let active: { id: number; controller: AbortController } | null = null;
const scope = self as unknown as { addEventListener(type: 'message', listener: (event: MessageEvent) => void): void; postMessage(value: unknown): void };
scope.addEventListener('message', ({ data }: MessageEvent) => {
  if (!data || !Number.isSafeInteger(data.id) || data.id < 1) return;
  if (data.type === 'cancel') {
    if (active && active.id === data.id) { active.controller.abort(); active = null; }
    return;
  }
  if (data.type !== 'load' || !validAirportRegionKey(data.key) || !Number.isFinite(data.timeoutMs)
    || data.timeoutMs < 1 || data.timeoutMs > 35000 || active) {
    scope.postMessage({ type: 'error', id: data.id }); return;
  }
  const job = { id: data.id, controller: new AbortController() }; active = job;
  void loadAirportRegion(data.key, job.controller.signal, fetch, data.timeoutMs).then(entry => {
    if (active === job && !job.controller.signal.aborted) scope.postMessage({ type: 'ready', id: job.id, entry });
  }).catch(() => {
    if (active === job && !job.controller.signal.aborted) scope.postMessage({ type: 'error', id: job.id });
  }).finally(() => { if (active === job) active = null; });
});
