import type { FlightState } from './types';
import { DEFAULT_SYSTEM_SWITCH_MASK, SYSTEM_SWITCHES, electricalReadings, toggleSystemSwitch, validSystemsMask } from './aircraft-systems';
import './aircraft-systems-panel.css';

export function createAircraftSystemsPanel({ container, opener, onChange, onOpen, onClose }: {
  container: HTMLElement; opener: HTMLButtonElement; onChange(): void; onOpen(): void; onClose(): void;
}) {
  let mask = DEFAULT_SYSTEM_SWITCH_MASK, enabled = false, reviewing = false, disposed = false;
  let state: Readonly<FlightState> | null = null;
  const content = document.createElement('section');
  content.className = 'aircraft-systems-content';
  content.setAttribute('aria-label', 'Aircraft electrical systems, simplified estimates');
  content.innerHTML = `<header><strong>SYSTEMS</strong><span title="Simplified electrical estimates, not native engine telemetry or installed C172 calibration">MODEL</span></header>
    <div class="systems-readings" title="Ideal 24 V battery / 28 V alternator, generic circuit loads. No battery depletion, charging transient or low-RPM output curve.">
      <label>BUS <output id="systems-volts">—</output><small>V</small></label>
      <label>BATT <output id="systems-amps">—</output><small>A</small></label>
      <label>LOAD <output id="systems-load">—</output><small>A</small></label>
    </div>
    <div class="systems-switches">${SYSTEM_SWITCHES.map((item, index) => `<button type="button" id="systems-${item.id}" data-system-switch="${index}" aria-pressed="false" title="${item.label}: simplified circuit/load model; external lighting, avionics failure and icing effects are not coupled"><span>${item.label}</span><b>OFF</b></button>`).join('')}</div>`;
  container.append(content);
  const dialog = document.createElement('dialog');
  dialog.className = 'aircraft-systems-dialog'; dialog.id = 'aircraft-systems-dialog';
  dialog.setAttribute('aria-label', 'Aircraft systems');
  dialog.innerHTML = '<div class="systems-dialog-slot"></div><button type="button" class="primary">Done</button>';
  document.body.append(dialog);
  const slot = dialog.querySelector<HTMLElement>('.systems-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('.primary')!;
  const switches = [...content.querySelectorAll<HTMLButtonElement>('[data-system-switch]')];
  function render() {
    const shownMask = reviewing ? state?.systems_switch_mask : mask;
    const valid = validSystemsMask(shownMask);
    const readings = electricalReadings(shownMask, state?.engine_running);
    for (const [index, button] of switches.entries()) {
      const selected = valid && !!(shownMask & (1 << index));
      button.disabled = !enabled || reviewing || !valid;
      button.setAttribute('aria-pressed', valid ? String(selected) : 'mixed');
      button.querySelector('b')!.textContent = !valid ? '—' : selected ? 'ON' : 'OFF';
      button.dataset.powered = String(selected && !!readings?.powered);
    }
    content.dataset.recorded = String(reviewing);
    for (const [id, value] of [['volts', readings?.volts], ['amps', readings?.batteryAmps], ['load', readings?.loadAmps]] as const) {
      content.querySelector(`#systems-${id}`)!.textContent = value === undefined ? '—' : value.toFixed(1);
    }
  }
  function click(event: MouseEvent) {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-system-switch]');
    if (!button || !enabled || reviewing || disposed) return;
    mask = toggleSystemSwitch(mask, Number(button.dataset.systemSwitch)); render(); onChange();
  }
  function open() { if (!disposed && !dialog.open) { onOpen(); slot.append(content); dialog.showModal(); } }
  function close() { dialog.close(); }
  function restore() { if (!disposed) { container.append(content); onClose(); } }
  content.addEventListener('click', click); opener.addEventListener('click', open);
  done.addEventListener('click', close); dialog.addEventListener('close', restore);
  render();
  return {
    snapshot: () => mask,
    update(next: Readonly<FlightState> | null, inReview: boolean, canControl: boolean) {
      if (disposed) return;
      state = next; reviewing = inReview; enabled = canControl; render();
    },
    reset() { mask = DEFAULT_SYSTEM_SWITCH_MASK; render(); },
    dispose() {
      disposed = true; content.removeEventListener('click', click); opener.removeEventListener('click', open);
      done.removeEventListener('click', close); dialog.removeEventListener('close', restore);
      dialog.remove(); container.replaceChildren();
    },
  };
}
