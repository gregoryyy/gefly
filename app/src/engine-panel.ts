import type { FlightState } from './types';
import './engine-panel.css';

interface EnginePanelOptions {
  container: HTMLElement;
  onMixture: (norm: number, automatic: boolean) => void;
  onAutopilot: (mode: 0 | 1 | 2, target_heading_rad?: number) => void;
  onOpen: () => void;
  onClose: () => void;
}

interface EngineState {
  manifold_pressure_pa: number;
  prop_radps: number;
  mixture_norm: number;
  mixture_auto: number;
  oil_pressure_pa: number;
  oil_temp_k: number;
  egt_k: number;
  fuel_flow_m3ps: number;
  fuel_left_m3: number;
  fuel_right_m3: number;
  ap_mode: number;
  ap_heading_target_rad: number;
  ap_aileron_norm: number;
}

const ENGINE_KEYS = ['manifold_pressure_pa', 'prop_radps', 'mixture_norm', 'mixture_auto',
  'oil_pressure_pa', 'oil_temp_k', 'egt_k', 'fuel_flow_m3ps', 'fuel_left_m3', 'fuel_right_m3',
  'ap_mode', 'ap_heading_target_rad', 'ap_aileron_norm'] as const;
const PA_PER_INHG = 3386.389;
const PA_PER_PSI = 6894.757293168;
const M3_PER_US_GALLON = 0.003785411784;
const TWO_PI = 2 * Math.PI;
const degrees = (radians: number) => ((radians * 180 / Math.PI) % 360 + 360) % 360;
const headingText = (radians: number) => `${String(Math.round(degrees(radians)) % 360).padStart(3, '0')}°`;

function engineState(state: Readonly<FlightState> | null): EngineState | null {
  if (!state) return null;
  const value = state as Readonly<FlightState> & Partial<EngineState>;
  if (!ENGINE_KEYS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) return null;
  if (value.mixture_norm! < 0 || value.mixture_norm! > 1
    || ![0, 1].includes(value.mixture_auto!) || ![0, 1, 2].includes(value.ap_mode!)) return null;
  return value as EngineState;
}

/** Live/recorded engine values only. Controls request worker changes; they never synthesize readings. */
export function createEnginePanel(options: EnginePanelOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('engine-panel');
  const opener = document.createElement('button');
  opener.type = 'button'; opener.id = 'engine-open'; opener.className = 'engine-open';
  opener.textContent = 'Engine & autopilot'; opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'engine-dialog');
  const content = document.createElement('section');
  content.className = 'engine-content'; content.setAttribute('aria-label', 'Engine instruments and basic autopilot');
  content.innerHTML = `
    <div class="engine-heading"><strong>ENGINE</strong><span id="engine-state-label">LIVE</span></div>
    <div class="engine-readouts">
      <div><span>RPM</span><b id="engine-rpm">—</b><small>PROP RPM</small></div>
      <div><span>MANIFOLD</span><b id="engine-map">—</b><small>inHg</small></div>
      <div><span>OIL PRESSURE</span><b id="engine-oil-press">—</b><small>psi</small></div>
      <div><span>OIL TEMPERATURE</span><b id="engine-oil-temp">—</b><small>°C</small></div>
      <div><span>EXHAUST GAS</span><b id="engine-egt">—</b><small>°C</small></div>
      <div><span>FUEL FLOW</span><b id="engine-fuel-flow">—</b><small>US gal/h</small></div>
    </div>
    <div class="engine-fuel"><span>FUEL · US GAL</span><b>L <output id="engine-fuel-left">—</output></b><b>R <output id="engine-fuel-right">—</output></b></div>
    <p id="engine-unavailable" class="engine-unavailable" role="status">Engine data unavailable · rebuild flight engine</p>
    <div class="engine-mixture">
      <div class="engine-control-heading"><label for="mixture-control">MIXTURE</label><output id="mixture-applied">—</output><button type="button" id="mixture-auto" aria-pressed="false">Model auto</button></div>
      <input id="mixture-control" type="range" min="0" max="100" step="1" value="100" aria-label="Mixture percentage">
      <div class="engine-mixture-scale"><span>CUTOFF</span><span>FULL RICH</span></div>
    </div>
    <div class="engine-ap">
      <div class="engine-control-heading"><strong>BASIC AUTOPILOT</strong><output id="ap-status" aria-live="polite">UNAVAILABLE</output></div>
      <div class="engine-ap-modes"><button type="button" id="ap-off" aria-pressed="false">Off</button><button type="button" id="ap-level" aria-pressed="false">Level</button><button type="button" id="ap-heading" aria-pressed="false">HDG</button></div>
      <div class="engine-ap-target"><label for="ap-heading-target">TRUE HDG</label><button type="button" id="ap-heading-decrease" aria-label="Decrease target heading by ten degrees">−10</button><input id="ap-heading-target" type="number" min="0" max="359.9" step="0.1" aria-label="Autopilot true heading target in degrees"><button type="button" id="ap-heading-increase" aria-label="Increase target heading by ten degrees">+10</button></div>
      <p>Roll/heading only · no altitude hold</p>
    </div>
  `;
  const dialog = document.createElement('dialog');
  dialog.id = 'engine-dialog'; dialog.className = 'engine-dialog';
  dialog.setAttribute('aria-labelledby', 'engine-dialog-title');
  dialog.innerHTML = '<h2 id="engine-dialog-title">Engine & autopilot</h2><p class="engine-flight-note">Flight continues while this panel is open.</p><div class="engine-dialog-slot"></div><button type="button" id="engine-close" class="primary">Done</button>';
  const slot = dialog.querySelector<HTMLElement>('.engine-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#engine-close')!;
  const flightNote = dialog.querySelector<HTMLElement>('.engine-flight-note')!;
  container.replaceChildren(opener, content);
  document.body.append(dialog);
  const element = <T extends HTMLElement = HTMLElement>(id: string) => content.querySelector<T>(`#${id}`)!;
  const mixture = element<HTMLInputElement>('mixture-control');
  const automatic = element<HTMLButtonElement>('mixture-auto');
  const off = element<HTMLButtonElement>('ap-off');
  const level = element<HTMLButtonElement>('ap-level');
  const heading = element<HTMLButtonElement>('ap-heading');
  const target = element<HTMLInputElement>('ap-heading-target');
  const decrease = element<HTMLButtonElement>('ap-heading-decrease');
  const increase = element<HTMLButtonElement>('ap-heading-increase');
  const media = window.matchMedia('(max-width: 620px)');
  let latest: EngineState | null = null;
  let reviewing = false, running = false, disposed = false;

  function format(value: number, digits = 0): string { return value.toFixed(digits); }
  function render(): void {
    const canControl = !!latest && running && !reviewing;
    element('engine-state-label').textContent = reviewing ? 'RECORDED' : 'LIVE';
    flightNote.textContent = reviewing ? 'Recorded engine state · controls are read-only.' : running ? 'Flight continues while this panel is open.' : 'Flight is paused.';
    element('engine-unavailable').hidden = !!latest;
    mixture.disabled = automatic.disabled = level.disabled = heading.disabled = !canControl;
    off.disabled = !latest || reviewing || (!running && latest.ap_mode === 0);
    const canSetHeading = canControl && latest?.ap_mode === 2;
    target.disabled = decrease.disabled = increase.disabled = !canSetHeading;
    automatic.setAttribute('aria-pressed', String(latest?.mixture_auto === 1));
    for (const [button, mode] of [[off, 0], [level, 1], [heading, 2]] as const) button.setAttribute('aria-pressed', String(latest?.ap_mode === mode));
    const readings: Record<string, string> = latest ? {
      'engine-rpm': format(latest.prop_radps * 60 / TWO_PI),
      'engine-map': format(latest.manifold_pressure_pa / PA_PER_INHG, 1),
      'engine-oil-press': format(latest.oil_pressure_pa / PA_PER_PSI),
      'engine-oil-temp': format(latest.oil_temp_k - 273.15),
      'engine-egt': format(latest.egt_k - 273.15),
      'engine-fuel-flow': format(latest.fuel_flow_m3ps * 3600 / M3_PER_US_GALLON, 1),
      'engine-fuel-left': format(latest.fuel_left_m3 / M3_PER_US_GALLON, 1),
      'engine-fuel-right': format(latest.fuel_right_m3 / M3_PER_US_GALLON, 1),
    } : {};
    for (const id of ['engine-rpm', 'engine-map', 'engine-oil-press', 'engine-oil-temp', 'engine-egt', 'engine-fuel-flow', 'engine-fuel-left', 'engine-fuel-right']) element(id).textContent = readings[id] ?? '—';
    element('mixture-applied').textContent = latest ? `${Math.round(latest.mixture_norm * 100)}%${latest.mixture_auto ? ' · AUTO' : ''}` : '—';
    element('ap-status').textContent = !latest ? 'UNAVAILABLE' : latest.ap_mode === 0 ? 'OFF' : latest.ap_mode === 1 ? 'WINGS LEVEL' : `HDG ${headingText(latest.ap_heading_target_rad)}`;
    if (latest) {
      if (reviewing || document.activeElement !== mixture) mixture.value = String(latest.mixture_norm * 100);
      if (reviewing || document.activeElement !== target) {
        target.value = ((Math.round(degrees(latest.ap_heading_target_rad) * 10) % 3600) / 10).toFixed(1);
        target.setCustomValidity('');
      }
    } else {
      target.value = ''; mixture.value = '100';
    }
  }

  function setLayout(): void {
    if (disposed) return;
    opener.hidden = !media.matches;
    if (media.matches) slot.append(content);
    else {
      if (dialog.open) dialog.close();
      container.append(content);
    }
  }
  function open(): void {
    if (disposed || !media.matches || dialog.open) return;
    options.onOpen(); dialog.showModal();
  }
  function close(): void { if (!disposed) options.onClose(); }
  function changeMixture(): void {
    if (!latest || !running || reviewing || disposed) return;
    const value = mixture.valueAsNumber / 100;
    if (Number.isFinite(value) && value >= 0 && value <= 1) options.onMixture(value, false);
  }
  function setTarget(): void {
    if (!latest || !running || reviewing || latest.ap_mode !== 2 || disposed) return;
    const value = target.valueAsNumber;
    if (!Number.isFinite(value) || value < 0 || value > 359.9 || !target.checkValidity()) {
      target.setCustomValidity('Enter a true heading from 0 to 359.9 degrees.'); target.reportValidity(); return;
    }
    target.setCustomValidity(''); options.onAutopilot(2, value * Math.PI / 180);
  }
  function clearTargetValidity(): void { target.setCustomValidity(''); }
  function click(event: MouseEvent): void {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement) || !latest || reviewing || disposed) return;
    if (button === off) { if (running || latest.ap_mode !== 0) options.onAutopilot(0); return; }
    if (!running) return;
    if (button === automatic) options.onMixture(latest.mixture_norm, true);
    else if (button === level) options.onAutopilot(1);
    else if (button === heading) options.onAutopilot(2);
    else if (latest.ap_mode === 2 && (button === decrease || button === increase)) {
      const value = (degrees(latest.ap_heading_target_rad) + (button === decrease ? -10 : 10) + 360) % 360;
      options.onAutopilot(2, value * Math.PI / 180);
    }
  }
  function finish(): void { dialog.close(); }

  opener.addEventListener('click', open);
  content.addEventListener('click', click);
  mixture.addEventListener('input', changeMixture);
  target.addEventListener('change', setTarget);
  target.addEventListener('input', clearTargetValidity);
  done.addEventListener('click', finish);
  dialog.addEventListener('close', close);
  media.addEventListener('change', setLayout);
  setLayout(); render();

  return {
    update(state, inReview, isRunning) {
      if (disposed) return;
      latest = engineState(state); reviewing = inReview; running = isRunning;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      opener.removeEventListener('click', open); content.removeEventListener('click', click);
      mixture.removeEventListener('input', changeMixture); target.removeEventListener('change', setTarget);
      target.removeEventListener('input', clearTargetValidity); done.removeEventListener('click', finish);
      dialog.removeEventListener('close', close); media.removeEventListener('change', setLayout);
      if (dialog.open) dialog.close(); dialog.remove(); container.replaceChildren();
    },
  };
}
