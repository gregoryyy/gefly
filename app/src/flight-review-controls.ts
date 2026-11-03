import './flight-review-controls.css';
import { reviewTransportView, type ReviewTransportInput } from './review-transport';
import { MAX_RECORDING_BYTES } from './flight-trace';

export type ReviewTransportState = ReviewTransportInput & { playbackRate: number };

interface FlightReviewControlsOptions {
  buttonContainer: HTMLElement;
  barContainer: HTMLElement;
  onEnter: () => void;
  onExit: () => void;
  onSeek: (t_s: number) => void;
  onTogglePlay: () => void;
  onCycleRate: () => void;
  fileContainer: HTMLElement;
  onSave: () => string;
  onLoad: (text: string) => void | Promise<void>;
  onFileError: (message: string) => void;
}

/** Transport for recorded states. The caller owns time, frame selection and flight pause. */
export function createFlightReviewControls(options: FlightReviewControlsOptions): {
  update(state: ReviewTransportState): void;
  dispose(): void;
} {
  let disposed = false;
  let active = false;
  let available = false;
  let lastCurrent_s: number | undefined;
  let loadSequence = 0;
  const button = document.createElement('button');
  button.id = 'review-flight';
  button.type = 'button';
  button.className = 'review-trigger';
  button.innerHTML = 'Review <kbd>R</kbd>';
  button.setAttribute('aria-keyshortcuts', 'R');
  button.disabled = true;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-controls', 'flight-review');
  button.title = 'Review this session’s recorded flight states';
  options.buttonContainer.append(button);

  const bar = document.createElement('section');
  bar.id = 'flight-review';
  bar.className = 'flight-review';
  bar.hidden = true;
  bar.setAttribute('aria-label', 'Recorded flight review');
  bar.innerHTML = `
    <div class="review-heading">
      <strong>Recorded state trace · not re-simulated</strong>
      <span id="review-clipped" hidden>Last 10 min</span>
    </div>
    <div class="review-transport">
      <button type="button" id="review-play">Play</button>
      <input type="range" id="review-time" min="0" max="0" value="0" step="any" aria-label="Recorded flight time" aria-describedby="review-progress review-note">
      <output id="review-progress" for="review-time">00:00 / 00:00</output>
      <button type="button" id="review-exit">Back to live</button>
    </div>
    <p id="review-note">Recorded actuator state, not input-event replay · ← / → Seek 1 s · Space Play/Pause</p>
    <div class="review-files"><button type="button" id="review-rate" aria-keyshortcuts="=">Speed 1× · =</button><button type="button" id="review-save">Save JSON</button><button type="button" id="review-load">Load JSON</button></div>
  `;
  options.barContainer.append(bar);
  const play = bar.querySelector<HTMLButtonElement>('#review-play')!;
  const slider = bar.querySelector<HTMLInputElement>('#review-time')!;
  const progress = bar.querySelector<HTMLOutputElement>('#review-progress')!;
  const exit = bar.querySelector<HTMLButtonElement>('#review-exit')!;
  const clipped = bar.querySelector<HTMLElement>('#review-clipped')!;
  const save = bar.querySelector<HTMLButtonElement>('#review-save')!;
  const load = bar.querySelector<HTMLButtonElement>('#review-load')!;
  const rate = bar.querySelector<HTMLButtonElement>('#review-rate')!;
  const saveMenu = document.createElement('button'), loadMenu = document.createElement('button');
  saveMenu.type = loadMenu.type = 'button';
  saveMenu.id = 'save-recording'; loadMenu.id = 'load-recording';
  saveMenu.textContent = 'Save recording JSON'; loadMenu.textContent = 'Load recording JSON';
  options.fileContainer.append(saveMenu, loadMenu);
  const file = document.createElement('input');
  file.id = 'recording-file'; file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
  options.fileContainer.append(file);

  function saveRecording(): void {
    if (disposed || !available) return;
    try {
      const url = URL.createObjectURL(new Blob([options.onSave()], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `gefly-flight-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { options.onFileError(error instanceof Error ? error.message : 'Could not save recording.'); }
  }
  function chooseRecording(): void { if (!disposed) file.click(); }
  async function loadRecording(): Promise<void> {
    const selected = file.files?.[0], sequence = ++loadSequence;
    if (!selected) return;
    try {
      if (selected.size > MAX_RECORDING_BYTES) throw new Error('Recording exceeds the 256 MB limit.');
      const text = await selected.text();
      if (!disposed && sequence === loadSequence) await options.onLoad(text);
    } catch (error) { if (!disposed && sequence === loadSequence) options.onFileError(error instanceof Error ? error.message : 'Could not load recording.'); }
    finally { if (sequence === loadSequence) file.value = ''; }
  }

  function enter(): void {
    if (!disposed && available && !active) options.onEnter();
  }
  function leave(): void {
    if (!disposed && active) options.onExit();
  }
  function togglePlay(): void {
    if (!disposed && active) options.onTogglePlay();
  }
  function seek(): void {
    const time_s = Number(slider.value);
    if (!disposed && active && Number.isFinite(time_s)) options.onSeek(time_s);
  }
  button.addEventListener('click', enter);
  exit.addEventListener('click', leave);
  play.addEventListener('click', togglePlay);
  rate.addEventListener('click', options.onCycleRate);
  slider.addEventListener('input', seek);
  save.addEventListener('click', saveRecording); saveMenu.addEventListener('click', saveRecording);
  load.addEventListener('click', chooseRecording); loadMenu.addEventListener('click', chooseRecording);
  file.addEventListener('change', loadRecording);

  return {
    update(state) {
      if (disposed) return;
      active = state.active;
      rate.textContent = `Speed ${state.playbackRate}× · =`;
      available = state.available;
      const view = reviewTransportView(state);
      button.disabled = view.triggerDisabled;
      save.disabled = saveMenu.disabled = !state.available;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(view.pressed));
      bar.hidden = view.barHidden;
      play.textContent = view.playLabel;
      play.setAttribute('aria-label', view.playAria);
      clipped.hidden = !state.clipped;
      const { start_s, end_s, current_s } = view;
      const boundsChanged = slider.min !== String(start_s) || slider.max !== String(end_s);
      if (boundsChanged) {
        slider.min = String(start_s);
        slider.max = String(end_s);
      }
      // Leave the native range untouched when the selected time has not changed.
      if (boundsChanged || current_s !== lastCurrent_s) slider.value = String(current_s);
      lastCurrent_s = current_s;
      slider.disabled = play.disabled = view.seekDisabled;
      if (progress.value !== view.progress) progress.value = view.progress;
      slider.setAttribute('aria-valuetext', view.valueText);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      loadSequence++;
      button.removeEventListener('click', enter);
      exit.removeEventListener('click', leave);
      play.removeEventListener('click', togglePlay);
      rate.removeEventListener('click', options.onCycleRate);
      slider.removeEventListener('input', seek);
      save.removeEventListener('click', saveRecording); saveMenu.removeEventListener('click', saveRecording);
      load.removeEventListener('click', chooseRecording); loadMenu.removeEventListener('click', chooseRecording);
      file.removeEventListener('change', loadRecording);
      saveMenu.remove(); loadMenu.remove(); file.remove();
      button.remove();
      bar.remove();
    },
  };
}
