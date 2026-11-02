import type { FlightState } from './types';
import './autopilot-panel.css';

interface AutopilotOptions {
  container: HTMLElement;
  onAutopilot: (mode: 0 | 1 | 2, target_heading_rad?: number) => void;
  onOpen: () => void;
  onClose: () => void;
}
interface AutopilotState { ap_mode: number; ap_heading_target_rad: number; ap_aileron_norm: number }
const degrees = (radians: number) => ((radians * 180 / Math.PI) % 360 + 360) % 360;
const headingText = (radians: number) => `${String(Math.round(degrees(radians)) % 360).padStart(3, '0')}°`;
function autopilotState(state: Readonly<FlightState> | null): AutopilotState | null {
  if (!state || ![state.ap_mode, state.ap_heading_target_rad, state.ap_aileron_norm]
    .every(value => typeof value === 'number' && Number.isFinite(value)) || ![0, 1, 2].includes(state.ap_mode!)
    || state.ap_heading_target_rad! < 0 || state.ap_heading_target_rad! >= 2 * Math.PI) return null;
  return state as AutopilotState;
}
/** Separate classic-style mode controls for the existing generic roll AP only. */
export function createAutopilotPanel(options: AutopilotOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('autopilot-panel');
  const opener = document.createElement('button');
  opener.type = 'button'; opener.id = 'autopilot-open'; opener.className = 'autopilot-open'; opener.textContent = 'Autopilot';
  opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'autopilot-dialog');
  const content = document.createElement('section');
  content.className = 'autopilot-content'; content.setAttribute('aria-label', 'Classic-style autopilot controls');
  content.innerHTML = `
    <div class="autopilot-heading"><strong>AUTOPILOT</strong><span id="ap-state-label">LIVE</span></div>
    <output id="ap-status" aria-live="polite">UNAVAILABLE</output>
    <div class="autopilot-modes"><button type="button" id="ap-off" aria-label="Disconnect autopilot" aria-pressed="false">AP / DISC</button><button type="button" id="ap-level" aria-label="Engage wings-level roll mode" aria-pressed="false">R (LV)</button><button type="button" id="ap-heading" aria-pressed="false">HDG</button></div>
    <div class="autopilot-target"><label for="ap-heading-target">TRUE HDG</label><button type="button" id="ap-heading-decrease" aria-label="Decrease target heading by ten degrees">−10</button><input id="ap-heading-target" type="number" min="0" max="359.9" step="0.1" aria-label="Autopilot true heading target in degrees"><button type="button" id="ap-heading-increase" aria-label="Increase target heading by ten degrees">+10</button></div>
    <div class="autopilot-inop" aria-label="Unsupported autopilot modes">${['ALT', 'NAV', 'APR', 'REV'].map(mode => `<button type="button" disabled title="${mode} mode is not implemented">${mode}<small>INOP</small></button>`).join('')}</div>
    <p>Generic roll/true-heading control only. ALT, NAV, APR and REV unavailable; no vertical control or installed C172S AP fidelity.</p>
  `;
  const dialog = document.createElement('dialog');
  dialog.id = 'autopilot-dialog'; dialog.className = 'autopilot-dialog'; dialog.setAttribute('aria-labelledby', 'autopilot-title');
  dialog.innerHTML = '<h2 id="autopilot-title">Autopilot</h2><p class="autopilot-dialog-note">Flight continues while this panel is open.</p><div class="autopilot-dialog-slot"></div><button type="button" id="autopilot-close" class="primary">Done</button>';
  const slot = dialog.querySelector<HTMLElement>('.autopilot-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#autopilot-close')!;
  const element = <T extends HTMLElement = HTMLElement>(id: string) => content.querySelector<T>(`#${id}`)!;
  const off = element<HTMLButtonElement>('ap-off'), level = element<HTMLButtonElement>('ap-level'), heading = element<HTMLButtonElement>('ap-heading');
  const target = element<HTMLInputElement>('ap-heading-target');
  const decrease = element<HTMLButtonElement>('ap-heading-decrease'), increase = element<HTMLButtonElement>('ap-heading-increase');
  const media = window.matchMedia('(max-width: 0px)');
  let latest: AutopilotState | null = null;
  let reviewing = false, running = false, disposed = false;
  container.replaceChildren(opener, content); document.body.append(dialog);
  function render(): void {
    const canControl = !!latest && running && !reviewing;
    element('ap-state-label').textContent = reviewing ? 'RECORDED' : 'LIVE';
    element('ap-status').textContent = !latest ? 'UNAVAILABLE' : latest.ap_mode === 0 ? 'OFF' : latest.ap_mode === 1 ? 'WINGS LEVEL' : `HDG ${headingText(latest.ap_heading_target_rad)}`;
    dialog.querySelector('.autopilot-dialog-note')!.textContent = reviewing ? 'Recorded AP state · controls are read-only.' : running ? 'Flight continues while this panel is open.' : 'Flight is paused.';
    level.disabled = heading.disabled = !canControl;
    off.disabled = !latest || reviewing || (!running && latest.ap_mode === 0);
    target.disabled = decrease.disabled = increase.disabled = !canControl || latest?.ap_mode !== 2;
    for (const [button, mode] of [[off, 0], [level, 1], [heading, 2]] as const) button.setAttribute('aria-pressed', String(latest?.ap_mode === mode));
    if (reviewing || document.activeElement !== target) {
      target.value = latest ? ((Math.round(degrees(latest.ap_heading_target_rad) * 10) % 3600) / 10).toFixed(1) : '';
      target.setCustomValidity('');
    }
  }
  function setTarget(): void {
    if (!latest || !running || reviewing || disposed || latest.ap_mode !== 2) return;
    const value = target.valueAsNumber;
    if (!Number.isFinite(value) || value < 0 || value > 359.9 || !target.checkValidity()) {
      target.setCustomValidity('Enter a true heading from 0 to 359.9 degrees.'); target.reportValidity(); return;
    }
    target.setCustomValidity(''); options.onAutopilot(2, value * Math.PI / 180);
  }
  function clearValidity(): void { target.setCustomValidity(''); }
  function click(event: MouseEvent): void {
    if (!(event.target instanceof HTMLButtonElement) || !latest || reviewing || disposed) return;
    const button = event.target;
    if (button === off) { if (running || latest.ap_mode !== 0) options.onAutopilot(0); return; }
    if (!running) return;
    if (button === level) options.onAutopilot(1);
    else if (button === heading) options.onAutopilot(2);
    else if (latest.ap_mode === 2 && (button === decrease || button === increase)) {
      options.onAutopilot(2, ((degrees(latest.ap_heading_target_rad) + (button === decrease ? -10 : 10) + 360) % 360) * Math.PI / 180);
    }
  }
  function layout(): void {
    if (disposed) return;
    opener.hidden = !media.matches;
    if (media.matches) slot.append(content);
    else { if (dialog.open) dialog.close(); container.append(content); }
  }
  function open(): void { if (!disposed && media.matches && !dialog.open) { options.onOpen(); dialog.showModal(); } }
  function close(): void { if (!disposed) options.onClose(); }
  function finish(): void { dialog.close(); }
  opener.addEventListener('click', open); content.addEventListener('click', click); target.addEventListener('change', setTarget);
  target.addEventListener('input', clearValidity); done.addEventListener('click', finish); dialog.addEventListener('close', close);
  media.addEventListener('change', layout); layout(); render();
  return {
    update(state, inReview, isRunning) { if (!disposed) { latest = autopilotState(state); reviewing = inReview; running = isRunning; render(); } },
    dispose() {
      if (disposed) return; disposed = true;
      opener.removeEventListener('click', open); content.removeEventListener('click', click); target.removeEventListener('change', setTarget);
      target.removeEventListener('input', clearValidity); done.removeEventListener('click', finish); dialog.removeEventListener('close', close);
      media.removeEventListener('change', layout); if (dialog.open) dialog.close(); dialog.remove(); container.replaceChildren();
    },
  };
}
