/** Pure OBS and standby-tuning gesture math. UI rates only; no installed knob calibration. */
import type { RadioKind } from './radio-nav';

export const OBS_DRAG_PX_PER_DEG = 4;

/** Hold-repeat tiers: 1° for the first second, then 3°, then 5° after two seconds. */
export function obsHoldStep_deg(elapsed_ms: number): 1 | 3 | 5 {
  if (!Number.isFinite(elapsed_ms) || elapsed_ms < 1000) return 1;
  return elapsed_ms >= 2000 ? 5 : 3;
}

/**
 * Course change for a captured horizontal drag. The whole displacement is
 * retained, and only its equivalent course change modulo 360° is sent, so a
 * 390° move turns 30° whether it arrives as one event or many.
 */
export function obsDragDelta_deg(startX: number, clientX: number, applied_deg: number, pxPerDeg = OBS_DRAG_PX_PER_DEG): { total_deg: number; delta_deg: number } | null {
  if (!Number.isFinite(startX) || !Number.isFinite(clientX) || !Number.isFinite(pxPerDeg) || pxPerDeg <= 0) return null;
  const total_deg = Math.trunc((clientX - startX) / pxPerDeg) || 0;
  if (!Number.isSafeInteger(total_deg) || !Number.isSafeInteger(applied_deg)) return null;
  return { total_deg, delta_deg: ((total_deg % 360 - applied_deg % 360) % 360) || 0 };
}

/** Next standby channel for the − / + buttons, clamped to the supported band. */
export function stepStandby_khz(kind: RadioKind, current_khz: number, direction: -1 | 1): number {
  const step = kind === 'com' ? 25 : 50, min = kind === 'com' ? 118000 : 108000, max = kind === 'com' ? 136975 : 117950;
  return Math.max(min, Math.min(max, current_khz + direction * step));
}

/**
 * Whether a periodic station-list rebuild must wait. Filter, catalogue and
 * availability changes rebuild at once; position-only updates wait at least
 * one second in live flight and never replace rows under a focused button,
 * a hovering pointer or a press in progress (any input, including Review).
 */
export function stationRebuildDeferred(options: {
  force: boolean; structuralChange: boolean; reviewing: boolean; sinceLastRender_ms: number;
  focusInside: boolean; pointerInside: boolean; pressActive: boolean;
}): boolean {
  if (options.force || options.structuralChange) return false;
  if (options.focusInside || options.pointerInside || options.pressActive) return true;
  return !options.reviewing && !(options.sinceLastRender_ms >= 1000);
}

/** Concise live-region text; the rebuilt list itself is not announced. */
export function stationCountText(count: number | null): string {
  if (count === null) return 'Station directory loading or unavailable.';
  return count === 0 ? 'No stations match these filters.' : `${count} station${count === 1 ? '' : 's'} listed.`;
}
