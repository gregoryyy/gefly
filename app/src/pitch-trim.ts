import type { FlightState } from './types';

interface PitchTrimOptions {
  container: HTMLElement;
  onChange: (norm: number) => void;
  onRestoreInitial: () => void;
  onFocusFlight?: () => void;
}

const validTrim = (value: unknown): value is number => typeof value === 'number'
  && Number.isFinite(value) && value >= -1 && value <= 1;
const direction = (norm: number) => norm === 0 ? 'neutral' : `${Math.abs(norm * 100).toFixed(1)}% nose ${norm < 0 ? 'up' : 'down'}`;

/** Generic normalized trim command, not an installed aircraft wheel/tab position. */
export function createPitchTrimControl(options: PitchTrimOptions): {
  update(state: Readonly<FlightState> | null, recorded: boolean, running: boolean, target: number | null): void;
  dispose(): void;
} {
  const panel = options.container.ownerDocument.createElement('section');
  panel.className = 'pitch-trim';
  panel.setAttribute('aria-label', 'Pitch trim');
  panel.innerHTML = `
    <div class="pitch-trim-heading"><label for="pitch-trim-control">PITCH TRIM</label><output id="pitch-trim-actual">Unavailable</output></div>
    <input id="pitch-trim-control" type="range" aria-orientation="vertical" min="-100" max="100" step="0.1" value="0" aria-label="Pitch trim command, positive percent nose up" disabled>
    <div class="pitch-trim-buttons"><button type="button" id="pitch-trim-up" data-code="Quote" aria-label="Hold nose-up trim, apostrophe key" aria-keyshortcuts="'" title="Apostrophe · Nose-up trim" disabled>↑ <kbd>&#39;</kbd></button><button type="button" id="pitch-trim-initial" aria-label="Restore initial trim, slash key" aria-keyshortcuts="/" title="/ · Restore initial trim" disabled><kbd>/</kbd></button><button type="button" id="pitch-trim-down" data-code="Backslash" aria-label="Hold nose-down trim, backslash key" aria-keyshortcuts="&#92;" title="Backslash · Nose-down trim" disabled>↓ <kbd>&#92;</kbd></button></div>
    <small id="pitch-trim-note">Trim unavailable · rebuild flight engine</small>
  `;
  options.container.append(panel);
  const slider = panel.querySelector<HTMLInputElement>('#pitch-trim-control')!;
  const actual = panel.querySelector<HTMLOutputElement>('#pitch-trim-actual')!;
  const up = panel.querySelector<HTMLButtonElement>('#pitch-trim-up')!;
  const down = panel.querySelector<HTMLButtonElement>('#pitch-trim-down')!;
  const initial = panel.querySelector<HTMLButtonElement>('#pitch-trim-initial')!;
  const note = panel.querySelector<HTMLElement>('#pitch-trim-note')!;
  let canControl = false, canRestore = false, disposed = false;

  function change(): void {
    if (disposed || !canControl) return;
    const norm = -slider.valueAsNumber / 100;
    if (validTrim(norm)) options.onChange(norm);
    // Leave focus on the native slider so arrow keys continue to adjust trim.
  }
  function restore(): void {
    if (disposed || !canRestore) return;
    options.onRestoreInitial();
    options.onFocusFlight?.();
  }
  slider.addEventListener('input', change);
  initial.addEventListener('click', restore);
  return {
    update(state, recorded, running, target) {
      if (disposed) return;
      const available = validTrim(state?.pitch_trim_norm);
      const hasInitial = validTrim(state?.pitch_trim_initial_norm);
      canControl = available && running && !recorded;
      canRestore = canControl && hasInitial;
      slider.disabled = up.disabled = down.disabled = !canControl;
      initial.disabled = !canRestore;
      actual.textContent = available ? `${direction(state!.pitch_trim_norm!)} · ${recorded ? 'recorded' : 'actual'}` : 'Unavailable';
      note.textContent = !available ? 'Trim unavailable · rebuild flight engine'
        : 'Normalized command · not wheel/tab position';
      initial.title = hasInitial ? `Restore startup ${direction(state!.pitch_trim_initial_norm!)}` : 'Startup trim unavailable';
      const command = !recorded && validTrim(target) ? target : available ? state!.pitch_trim_norm! : 0;
      if (recorded || !canControl || panel.ownerDocument.activeElement !== slider) slider.value = String(-command * 100);
      slider.setAttribute('aria-valuetext', `${direction(command)} command`);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      slider.removeEventListener('input', change);
      initial.removeEventListener('click', restore);
      panel.remove();
    },
  };
}
