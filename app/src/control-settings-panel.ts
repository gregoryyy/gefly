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
  onClose: (saved: boolean) => void;
}

/** Session-only input gains. Aircraft dynamics and study assists are unchanged. */
export function createControlSettingsPanel(options: ControlSettingsPanelOptions): {
  open(): void;
  setSettings(settings: ControlSettings): void;
  dispose(): void;
  isOpen(): boolean;
} {
  let settings = { ...options.initial };
  let openingSettings = { ...settings };
  let saved = false;
  let backdropPressed = false;
  let disposed = false;
  const dialog = document.createElement('dialog');
  dialog.id = 'control-settings';
  dialog.className = 'control-settings';
  dialog.setAttribute('aria-labelledby', 'control-settings-title');
  dialog.setAttribute('aria-describedby', 'control-settings-description');
  dialog.innerHTML = `
    <div class="control-settings-heading">
      <h2 id="control-settings-title">Options</h2>
      <p id="control-settings-description">Flight is paused. Preview changes, then Save for this session.</p>
    </div>
    <div class="control-settings-sections">
    <fieldset class="control-settings-controls">
      <legend>Controls</legend>
      <div class="control-settings-toggles">
        <div>
          <label class="control-settings-toggle" for="coordinated-rudder">
            <input type="checkbox" id="coordinated-rudder" aria-describedby="coordinated-rudder-note">Link rudder to aileron
          </label>
          <p class="control-settings-note" id="coordinated-rudder-note">Optional fixed link, off by default; not calibrated turn coordination. Q/W controls rudder and nosewheel independently.</p>
        </div>
        <div>
          <label class="control-settings-toggle" for="centered-touchpad">
            <input type="checkbox" id="centered-touchpad" aria-describedby="centered-touchpad-note">Centered touchpad controls
          </label>
          <p class="control-settings-note" id="centered-touchpad-note">Flight-view center is neutral. Hold-drag looks around; Escape centers the view.</p>
        </div>
      </div>
    <h3 class="control-settings-subheading">Input gain</h3>
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
    <div class="control-settings-presets">
      <span>Presets</span>
      <button type="button" id="settings-gentle">Gentle</button>
      <button type="button" id="settings-default">Default</button>
    </div>
    <p class="control-settings-note">Gains change input commands, not aircraft calibration.</p>
    <div id="settings-controls-extra"></div>
    </fieldset>
    <fieldset>
      <legend>Scenery</legend>
      <label class="control-settings-toggle"><input id="vector-scenery" type="checkbox">Map terrain · no labels</label>
      <p class="control-settings-note">Cartography replaces photography; unavailable tiles show terrain relief.</p>
      <label class="control-settings-toggle"><input id="practice-papi" type="checkbox">Practice PAPI / runway lights</label>
      <p class="control-settings-note">Illustrative lights, not surveyed EDFE equipment.</p>
    </fieldset>
    <fieldset>
      <legend>Sound</legend>
      <div id="settings-sound-slot"></div>
    </fieldset>
    <details class="control-settings-advanced" id="settings-advanced">
      <summary>Advanced</summary>
      <div id="settings-advanced-slot"></div>
    </details>
    </div>
    <button type="button" id="settings-close" class="primary">Save</button>
  `;
  options.container.append(dialog);

  const axes = ['pitch', 'roll', 'rudder', 'brake'] as const;
  const sliders = axes.map(axis => ({
    axis,
    input: dialog.querySelector<HTMLInputElement>(`#sensitivity-${axis}`)!,
    output: dialog.querySelector<HTMLOutputElement>(`#sensitivity-${axis}-value`)!,
  }));

  const toggles = ([
    ['coordinatedRudder', 'coordinated-rudder'],
    ['centeredTouchpad', 'centered-touchpad'],
    ['vectorScenery', 'vector-scenery'], ['practicePapi', 'practice-papi'],
  ] as const).map(([setting, id]) => ({ setting, input: dialog.querySelector<HTMLInputElement>(`#${id}`)! }));

  function render(): void {
    for (const { setting, input } of toggles) input.checked = settings[setting] ?? false;
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
    const toggle = toggles.find(({ input }) => input === event.target);
    if (toggle) {
      change({ ...settings, [toggle.setting]: toggle.input.checked });
      return;
    }
    const slider = sliders.find(({ input }) => input === event.target);
    if (slider) change({ ...settings, [slider.axis]: Number(slider.input.value) / 100 });
  }

  function onClick(event: MouseEvent): void {
    if (backdropPressed && outsideDialog(event)) {
      backdropPressed = false;
      dialog.close();
      return;
    }
    backdropPressed = false;
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const preferences = { vectorScenery: settings.vectorScenery ?? false, practicePapi: settings.practicePapi ?? false, coordinatedRudder: settings.coordinatedRudder ?? false, centeredTouchpad: settings.centeredTouchpad ?? false };
    if (target.id === 'settings-gentle') change({ ...GENTLE_CONTROL_SETTINGS, ...preferences });
    if (target.id === 'settings-default') change({ ...DEFAULT_CONTROL_SETTINGS, ...preferences });
    if (target.id === 'settings-close') { saved = true; dialog.close(); }
  }

  function outsideDialog(event: MouseEvent): boolean {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom);
  }

  function onPointerDown(event: PointerEvent): void {
    backdropPressed = event.button === 0 && outsideDialog(event);
  }

  function onClose(): void {
    if (disposed) return;
    if (!saved) change(openingSettings);
    options.onClose(saved);
  }

  dialog.addEventListener('input', onInput);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('pointerdown', onPointerDown);
  // Escape and backdrop dismissal share the same rollback path.
  dialog.addEventListener('close', onClose);
  render();

  return {
    setSettings(next) { if (!disposed) { settings = { ...next }; render(); } },
    open() {
      if (disposed || dialog.open) return;
      openingSettings = { ...settings };
      saved = false;
      backdropPressed = false;
      options.onOpen();
      dialog.showModal();
    },
    isOpen: () => dialog.open,
    dispose() {
      if (disposed) return;
      disposed = true;
      dialog.removeEventListener('input', onInput);
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('close', onClose);
      if (dialog.open) dialog.close();
      dialog.remove();
    },
  };
}
