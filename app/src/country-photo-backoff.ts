import type { PhotoCountry } from './country-imagery.ts';

type Timer = ReturnType<typeof setTimeout>;
type Listener = (country: PhotoCountry, blocked: boolean) => void;
interface Options {
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => Timer;
  cancel?: (timer: Timer) => void;
}

/** Shared, source-specific protection for Cesium and MapLibre visible tiles. */
export function createCountryPhotoBackoff(options: Options = {}) {
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  const listeners = new Set<Listener>();
  const states: Record<PhotoCountry, { failures: number; first: number; blocked: boolean; timer: Timer | null; generation: number }> = {
    ch: { failures: 0, first: 0, blocked: false, timer: null, generation: 0 },
    at: { failures: 0, first: 0, blocked: false, timer: null, generation: 0 },
  };
  const notify = (id: PhotoCountry, blocked: boolean) => { for (const listener of listeners) listener(id, blocked); };
  function retry(id: PhotoCountry): void {
    const state = states[id]; if (!state.blocked) return;
    if (state.timer !== null) cancel(state.timer);
    state.timer = null; state.blocked = false; state.failures = 0; state.first = 0; state.generation++;
    notify(id, false);
  }
  return {
    isBlocked: (id: PhotoCountry) => states[id].blocked,
    generation: (id: PhotoCountry) => states[id].generation,
    failure(id: PhotoCountry, generation = states[id].generation): void {
      const state = states[id]; if (state.blocked || state.generation !== generation) return;
      const time = now();
      if (!state.failures || time - state.first > 5000 || time < state.first) { state.failures = 0; state.first = time; }
      if (++state.failures < 3) return;
      state.blocked = true; state.generation++;
      state.timer = schedule(() => retry(id), 30000);
      notify(id, true);
    },
    retry,
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) for (const state of Object.values(states)) {
          if (state.timer !== null) cancel(state.timer);
          state.timer = null; state.blocked = false; state.failures = 0; state.first = 0; state.generation++;
        }
      };
    },
  };
}

/** One controller for both renderers in the current application instance. */
export const countryPhotoBackoff = createCountryPhotoBackoff();
