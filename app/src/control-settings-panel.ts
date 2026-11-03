import {
  DEFAULT_CONTROL_SETTINGS,
  GENTLE_CONTROL_SETTINGS,
  type ControlSettings,
} from './control-settings';
import './control-settings-panel.css';

interface ControlSettingsPanelOptions {
  container: HTMLElement;
  initial: ControlSettings;
  onChange: (settings: ControlSettings) => void;
  onOpen: () => void;
  onClose: () => void;
}

/** Session-only input gains. Aircraft dynamics and study assists are unchanged. */
export function createControlSettingsPanel(options: ControlSettingsPanelOptions): {
  open(): void;
  dispose(): void;
  isOpen(): boolean;
} {
  let settings = { ...options.initial };
  let disposed = false;
  const dialog = document.createElement('dialog');
  dialog.id = 'control-settings';
  dialog.className = 'control-settings';
  dialog.setAttribute('aria-labelledby', 'control-settings-title');
  dialog.setAttribute('aria-describedby', 'control-settings-description');
  dialog.innerHTML = `
    <div class="control-settings-heading">
      <span class="eyebrow">MAKE IT YOURS</span>
      <h2 id="control-settings-title">Flight controls</h2>
      <p id="control-settings-description">Flight is paused while you adjust controls.</p>
    </div>
    <div class="control-settings-axes">
      ${([
        ['pitch', 'Pitch', 'Nose up / down'],
        ['roll', 'Roll', 'Bank left / right'],
        ['rudder', 'Rudder', 'Yaw left / right'],
        ['brake', 'Wheel brake command', 'B / brake button'],
      ] as const).map(([axis, title, hint]) => `
        <div class="control-settings-axis">
          <label for="sensitivity-${axis}">${title}<span>${hint}</span></label>
          <output for="sensitivity-${axis}" id="sensitivity-${axis}-value"></output>
          <input type="range" id="sensitivity-${axis}" min="${axis === 'brake' ? 0 : 25}" max="${axis === 'brake' ? 100 : 150}" step="5"${axis === 'pitch' ? ' autofocus' : ''}>
          <div class="control-settings-scale" aria-hidden="true"><span>${axis === 'brake' ? 'Released · 0%' : 'Gentler · 25%'}</span><span>${axis === 'brake' ? '100% · Full command' : '150% · Stronger'}</span></div>
        </div>
      `).join('')}
    </div>
    <label class="control-settings-note" for="coordinated-rudder">
      <input type="checkbox" id="coordinated-rudder" aria-describedby="coordinated-rudder-note">
      Link rudder to aileron
    </label>
    <p class="control-settings-note" id="coordinated-rudder-note">Input assist: bank input also commands rudder and nosewheel steering. Manual rudder takes priority; roll correction is excluded.</p>
    <div class="control-settings-presets">
      <span>Quick presets</span>
      <button type="button" id="settings-gentle">Gentle</button>
      <button type="button" id="settings-default">Default</button>
    </div>
    <p class="control-settings-note">Input sensitivity, not aircraft response calibration.<br>Settings apply to this session only.</p>
    <button type="button" id="settings-close" class="primary">Done</button>
  `;
  options.container.append(dialog);

  const axes = ['pitch', 'roll', 'rudder', 'brake'] as const;
  const sliders = axes.map(axis => ({
    axis,
    input: dialog.querySelector<HTMLInputElement>(`#sensitivity-${axis}`)!,
    output: dialog.querySelector<HTMLOutputElement>(`#sensitivity-${axis}-value`)!,
  }));

  const rudderLink = dialog.querySelector<HTMLInputElement>('#coordinated-rudder')!;

  function render(): void {
    rudderLink.checked = settings.coordinatedRudder ?? false;
    for (const { axis, input, output } of sliders) {
      const gain = axis === 'brake' ? settings.brake ?? DEFAULT_CONTROL_SETTINGS.brake : settings[axis];
      const percent = Math.round(gain * 100);
      input.value = String(percent);
      input.setAttribute('aria-valuetext', `${percent} percent`);
      output.value = `${percent}%`;
    }
  }

  function change(next: ControlSettings): void {
    settings = { ...next };
    render();
    options.onChange({ ...settings });
  }

  function onInput(event: Event): void {
    if (event.target === rudderLink) {
      change({ ...settings, coordinatedRudder: rudderLink.checked });
      return;
    }
    const slider = sliders.find(({ input }) => input === event.target);
    if (slider) change({ ...settings, [slider.axis]: Number(slider.input.value) / 100 });
  }

  function onClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (target.id === 'settings-gentle') change({ ...GENTLE_CONTROL_SETTINGS, coordinatedRudder: settings.coordinatedRudder ?? false });
    if (target.id === 'settings-default') change({ ...DEFAULT_CONTROL_SETTINGS, coordinatedRudder: settings.coordinatedRudder ?? false });
    if (target.id === 'settings-close') dialog.close();
  }

  function onClose(): void {
    if (!disposed) options.onClose();
  }

  dialog.addEventListener('input', onInput);
  dialog.addEventListener('click', onClick);
  // Native Escape cancellation closes the dialog and emits the same close event.
  dialog.addEventListener('close', onClose);
  render();

  return {
    open() {
      if (disposed || dialog.open) return;
      options.onOpen();
      dialog.showModal();
    },
    isOpen: () => dialog.open,
    dispose() {
      if (disposed) return;
      disposed = true;
      dialog.removeEventListener('input', onInput);
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('close', onClose);
      if (dialog.open) dialog.close();
      dialog.remove();
    },
  };
}
