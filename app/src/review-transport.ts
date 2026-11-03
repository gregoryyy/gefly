/** Pure Review transport logic; flight-review-controls.ts and main.ts only render/apply it. */
export interface ReviewTransportInput { available: boolean; active: boolean; playing: boolean; start_s: number; end_s: number; current_s: number; clipped: boolean }

export function elapsedTime(seconds: number): string {
  const whole = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export function reviewTransportView(state: Readonly<ReviewTransportInput>) {
  const start_s = Number.isFinite(state.start_s) ? state.start_s : 0;
  const end_s = Number.isFinite(state.end_s) ? Math.max(start_s, state.end_s) : start_s;
  const current_s = Number.isFinite(state.current_s) ? Math.min(end_s, Math.max(start_s, state.current_s)) : start_s;
  const elapsed = elapsedTime(current_s - start_s), duration = elapsedTime(end_s - start_s);
  return {
    triggerDisabled: !state.available, barHidden: !state.active, pressed: state.active,
    playLabel: state.playing ? 'Pause' : 'Play', playAria: state.playing ? 'Pause recorded flight' : 'Play recorded flight',
    start_s, end_s, current_s, seekDisabled: end_s <= start_s,
    progress: `${elapsed} / ${duration}`, valueText: `${elapsed} of ${duration} recorded`,
  };
}

/**
 * Snap a native range value to the trace bounds. Range serialization can round
 * an endpoint by floating-point noise; only such near-endpoint values snap.
 */
export function snapReviewTime(time_s: number, bounds: { start_s: number; end_s: number } | null): number | null {
  if (!bounds || !Number.isFinite(time_s)) return null;
  const tolerance_s = 8 * Number.EPSILON * Math.max(1, Math.abs(bounds.start_s), Math.abs(bounds.end_s));
  const selected = time_s >= bounds.end_s - tolerance_s ? bounds.end_s : time_s <= bounds.start_s + tolerance_s ? bounds.start_s : time_s;
  return Math.max(bounds.start_s, Math.min(bounds.end_s, selected));
}

/**
 * Keyboard routing while Review is active. Flight keys never reach live
 * controls. Arrows always seek, regardless of which replay widget has focus.
 */
export function reviewKeyAction(code: string, target: { editing: boolean; timeline: boolean; nativeButton: boolean }, repeat: boolean):
  'seek-back' | 'seek-forward' | 'toggle-play' | 'toggle-view' | 'exit' | 'ignore' | 'swallow' {
  if (code === 'ArrowLeft') return 'seek-back';
  if (code === 'ArrowRight') return 'seek-forward';
  if (code === 'KeyR') return target.editing ? 'ignore' : repeat ? 'swallow' : 'exit';
  if (target.editing && !target.timeline) return 'ignore';
  if (code === 'Space' && !target.nativeButton) return repeat ? 'swallow' : 'toggle-play';
  if (code === 'KeyV') return repeat ? 'ignore' : 'toggle-view';
  return 'ignore';
}
