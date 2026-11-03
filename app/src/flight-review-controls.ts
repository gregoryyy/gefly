import './flight-review-controls.css';
import { reviewTransportView, type ReviewTransportInput } from './review-transport';

export type ReviewTransportState = ReviewTransportInput;

interface FlightReviewControlsOptions {
  buttonContainer: HTMLElement;
  barContainer: HTMLElement;
  onEnter: () => void;
  onExit: () => void;
  onSeek: (t_s: number) => void;
  onTogglePlay: () => void;
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
    <p id="review-note">Recorded commands and actuator state · no input-event replay</p>
  `;
  options.barContainer.append(bar);
  const play = bar.querySelector<HTMLButtonElement>('#review-play')!;
  const slider = bar.querySelector<HTMLInputElement>('#review-time')!;
  const progress = bar.querySelector<HTMLOutputElement>('#review-progress')!;
  const exit = bar.querySelector<HTMLButtonElement>('#review-exit')!;
  const clipped = bar.querySelector<HTMLElement>('#review-clipped')!;

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
  slider.addEventListener('input', seek);

  return {
    update(state) {
      if (disposed) return;
      active = state.active;
      available = state.available;
      const view = reviewTransportView(state);
      button.disabled = view.triggerDisabled;
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
      button.removeEventListener('click', enter);
      exit.removeEventListener('click', leave);
      play.removeEventListener('click', togglePlay);
      slider.removeEventListener('input', seek);
      button.remove();
      bar.remove();
    },
  };
}
