import { audioStatusLabel, type EngineAudioStatus } from './engine-audio';
import './audio-controls.css';

interface AudioControlsOptions {
  buttonContainer: HTMLElement;
  settingsContainer: HTMLElement;
  onToggleMute: () => void;
  onVolume: (volume: number) => void;
}

/** Session-only preferences; this UI never changes engine state or starts audio itself. */
export function createAudioControls(options: AudioControlsOptions): {
  update(status: EngineAudioStatus): void;
  dispose(): void;
} {
  const button = document.createElement('button');
  button.id = 'audio-toggle'; button.type = 'button'; button.className = 'audio-toggle';
  button.setAttribute('aria-controls', 'audio-settings');
  button.setAttribute('aria-keyshortcuts', 'S');
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 9h4l5-4v14l-5-4H4z"/>
    <g class="audio-waves"><path d="M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/></g>
    <path class="audio-slash" d="m3 3 18 18"/>
  </svg>`;
  options.buttonContainer.append(button);

  const settings = document.createElement('section');
  settings.id = 'audio-settings'; settings.className = 'audio-settings';
  settings.setAttribute('aria-labelledby', 'audio-settings-title');
  settings.innerHTML = `<div class="audio-settings-heading"><h3 id="audio-settings-title">Engine, wind and alerts</h3><span id="audio-status" role="status">Sound off · press S to enable</span></div>
    <button id="audio-settings-toggle" type="button">Enable sound</button>
    <label for="audio-volume">Volume <output id="audio-volume-value" for="audio-volume">30%</output></label>
    <input id="audio-volume" type="range" min="0" max="100" step="1" value="30" aria-label="Engine, wind and alerts volume percentage">
    <p>Synthesized engine, airflow and warning tones. No recording or microphone access.</p>`;
  options.settingsContainer.append(settings);
  const volume = settings.querySelector<HTMLInputElement>('#audio-volume')!;
  const output = settings.querySelector<HTMLOutputElement>('#audio-volume-value')!;
  const stateLabel = settings.querySelector<HTMLElement>('#audio-status')!;
  const settingsToggle = settings.querySelector<HTMLButtonElement>('#audio-settings-toggle')!;
  let disposed = false, lastKey = '';
  function toggle(event: MouseEvent): void { if (!disposed && event.isTrusted) options.onToggleMute(); }
  function isolateShortcut(event: KeyboardEvent): void {
    // S remains the global sound shortcut. Other keys stay out of flight controls.
    if (event.code !== 'KeyS') event.stopPropagation();
  }
  function changeVolume(event: Event): void {
    const value = volume.valueAsNumber / 100;
    if (!disposed && event.isTrusted && Number.isFinite(value) && value >= 0 && value <= 1) options.onVolume(value);
  }
  button.addEventListener('click', toggle); button.addEventListener('keydown', isolateShortcut);
  settingsToggle.addEventListener('click', toggle);
  volume.addEventListener('input', changeVolume);
  return {
    update(status) {
      if (disposed) return;
      const key = `${status.supported}:${status.unlocked}:${status.muted}:${status.volume}:${status.state}`;
      if (key === lastKey) return;
      lastKey = key;
      const unavailable = !status.supported || status.state === 'disposed';
      const retry = status.supported && status.state === 'unavailable';
      button.disabled = unavailable;
      settingsToggle.disabled = unavailable;
      volume.disabled = unavailable;
      button.dataset.audioState = status.state;
      button.dataset.muted = String(status.muted);
      button.dataset.unlocked = String(status.unlocked);
      button.setAttribute('aria-pressed', String(status.muted));
      const action = unavailable ? 'Engine sound unavailable' : retry ? 'Retry engine sound'
        : !status.unlocked ? 'Enable engine sound' : status.muted ? 'Unmute engine sound' : 'Mute engine sound';
      button.setAttribute('aria-label', `${action} (S)`); button.title = `${action} (S)`;
      settingsToggle.textContent = action.replace('engine sound', 'sound');
      const percent = Math.round(status.volume * 100);
      volume.value = String(percent); output.value = `${percent}%`;
      volume.setAttribute('aria-valuetext', `${percent} percent`);
      stateLabel.textContent = audioStatusLabel(status);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      button.removeEventListener('click', toggle); button.removeEventListener('keydown', isolateShortcut);
      settingsToggle.removeEventListener('click', toggle);
      volume.removeEventListener('input', changeVolume);
      button.remove(); settings.remove();
    },
  };
}
