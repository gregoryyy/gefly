import { createWorldAirportRepository } from './world-airport-repository.ts';
import type { WorldSearchHit } from './world-airport-contract.ts';

// This worker receives display-directory requests only; it has no flight-state API.
const scope = globalThis as unknown as {
  postMessage(value: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
};
const repository = createWorldAirportRepository({
  onSnapshot(snapshot) { scope.postMessage({ type: 'snapshot', snapshot }); },
  onStatus(status) { scope.postMessage({ type: 'status', status }); },
});
scope.onmessage = ({ data }: MessageEvent) => {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'center') {
    if (typeof data.lon !== 'number' || typeof data.lat !== 'number') return;
    try { repository.updateCenter(data.lon, data.lat); } catch { /* Invalid positions never create requests. */ }
    return;
  }
  if (!Number.isSafeInteger(data.id) || data.id < 1) return;
  if (data.type !== 'search' && data.type !== 'select') return;
  const id = data.id;
  const task = data.type === 'search' ? repository.search(data.value) : repository.select(data.value as WorldSearchHit);
  void task.then(value => scope.postMessage({ type: 'result', id, value }),
    () => scope.postMessage({ type: 'error', id }));
};
