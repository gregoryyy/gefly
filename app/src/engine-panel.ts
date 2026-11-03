import type { FlightState } from './types';
import { C172X_TANK_CAPACITY_M3 } from './c172x-instrument-references';
import './engine-panel.css';

interface EnginePanelOptions {
  container: HTMLElement;
  onMixture: (norm: number, automatic: boolean) => void;
  onEngine: () => void;
  onOpen: () => void;
  onClose: () => void;
}
interface RequestedMixture { mixture_norm: number; mixture_auto: boolean; engine_running?: boolean }

interface EngineState {
  engine_running?: number; engine_command_on?: number;
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
}

const ENGINE_KEYS = ['manifold_pressure_pa', 'prop_radps', 'mixture_norm', 'mixture_auto',
  'oil_pressure_pa', 'oil_temp_k', 'egt_k', 'fuel_flow_m3ps', 'fuel_left_m3', 'fuel_right_m3'] as const;
const PA_PER_INHG = 3386.389;
const PA_PER_PSI = 6894.757293168;
const M3_PER_US_GALLON = 0.003785411784;
const TWO_PI = 2 * Math.PI;
function fuelScale(left: boolean): string {
  const pivotX = left ? 44 : 56;
  return [0, .25, .5, .75, 1].map(fraction => {
    const angle = (-70 + 140 * fraction) * Math.PI / 180;
    const x = (radius: number) => pivotX + (left ? -1 : 1) * Math.cos(angle) * radius;
    const y = (radius: number) => 50 - Math.sin(angle) * radius;
    return `<path d="M${x(25)} ${y(25)} L${x(29)} ${y(29)}"/>`;
  }).join('');
}

function engineState(state: Readonly<FlightState> | null): EngineState | null {
  if (!state) return null;
  const value = state as Readonly<FlightState> & Partial<EngineState>;
  if (!ENGINE_KEYS.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) return null;
  if (value.mixture_norm! < 0 || value.mixture_norm! > 1 || ![0, 1].includes(value.mixture_auto!)) return null;
  return value as EngineState;
}

/** Live/recorded engine values only. Controls request worker changes; they never synthesize readings. */
export function createEnginePanel(options: EnginePanelOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, controllable: boolean, requested?: RequestedMixture): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('engine-panel');
  const opener = document.createElement('button');
  opener.type = 'button'; opener.id = 'engine-open'; opener.className = 'engine-open';
  opener.textContent = 'Engine'; opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'engine-dialog');
  const content = document.createElement('section');
  content.className = 'engine-content'; content.setAttribute('aria-label', 'Engine instruments and mixture');
  content.innerHTML = `
    <div class="engine-heading"><strong>ENGINE</strong><span id="engine-state-label">LIVE</span></div>
    <div class="engine-instrument-row"><div class="engine-fuel-instrument">
      <svg id="engine-fuel-gauge" class="engine-fuel-gauge" viewBox="0 0 100 100" role="img" aria-labelledby="engine-fuel-title engine-fuel-description" data-available="false">
        <title id="engine-fuel-title">Model tank contents unavailable</title><desc id="engine-fuel-description">Left and right model tank contents, empty to full. Each tank model capacity is 19.70 US gallons. No usable fuel, reserve or aircraft operating arcs are inferred.</desc>
        <circle class="fuel-bezel" cx="50" cy="50" r="48"/><circle class="fuel-face" cx="50" cy="50" r="44"/>
        <g class="fuel-dial"><g class="fuel-scale fuel-left-scale">${fuelScale(true)}</g><g class="fuel-scale fuel-right-scale">${fuelScale(false)}</g>
        <g class="fuel-labels"><text x="11" y="52">L</text><text x="89" y="52">R</text><text x="34" y="83">E</text><text x="34" y="20">F</text><text x="66" y="83">E</text><text x="66" y="20">F</text></g>
        <path id="engine-fuel-left-needle" class="fuel-needle fuel-left-needle" d="M44 50 L18 50"/><path id="engine-fuel-right-needle" class="fuel-needle fuel-right-needle" d="M56 50 L82 50"/>
        <circle class="fuel-hub" cx="44" cy="50" r="2"/><circle class="fuel-hub" cx="56" cy="50" r="2"/>
        <text id="engine-fuel-flag" class="fuel-flag" x="50" y="64">INOP</text></g>
        <g class="fuel-screws"><circle cx="16" cy="16" r="2"/><circle cx="84" cy="16" r="2"/><circle cx="16" cy="84" r="2"/><circle cx="84" cy="84" r="2"/><path d="m15 17 2-2m66 2 2-2m-70 70 2-2m66 2 2-2"/></g>
      </svg>
      <div class="engine-fuel"><span>MODEL TANKS · US GAL</span><b>L <output id="engine-fuel-left">—</output></b><b>R <output id="engine-fuel-right">—</output></b></div>
    </div><div class="engine-readouts">
      <div><span>RPM</span><b id="engine-rpm">—</b><small>PROP RPM</small></div>
      <div><span>MANIFOLD</span><b id="engine-map">—</b><small>inHg</small></div>
      <div><span>OIL PRESSURE</span><b id="engine-oil-press">—</b><small>psi</small></div>
      <div><span>OIL TEMPERATURE</span><b id="engine-oil-temp">—</b><small>°C</small></div>
      <div><span>EXHAUST GAS</span><b id="engine-egt">—</b><small>°C</small></div>
      <div><span>FUEL FLOW</span><b id="engine-fuel-flow">—</b><small>US gal/h</small></div>
    </div></div>
    <p id="engine-unavailable" class="engine-unavailable" role="status" title="Engine data unavailable · rebuild flight engine">INOP</p>
    <div class="engine-power-controls"><div class="engine-mixture">
      <div class="engine-control-heading"><label for="mixture-control">MIXTURE</label><output id="mixture-applied">—</output><button type="button" id="mixture-auto" aria-pressed="false">Model auto</button></div>
      <input id="mixture-control" type="range" aria-orientation="vertical" min="0" max="100" step="1" value="100" aria-label="Mixture percentage">
      <div class="engine-mixture-scale"><span>CUTOFF</span><span>FULL RICH</span></div>
    </div></div>
    <div class="engine-switch-row"><button id="engine-switch" type="button" aria-keyshortcuts="E" aria-label="Toggle engine ignition and starter" aria-pressed="false">ENG ON · E</button><output id="engine-running" aria-label="Actual engine running state">—</output></div>
  `;
  const dialog = document.createElement('dialog');
  dialog.id = 'engine-dialog'; dialog.className = 'engine-dialog';
  dialog.setAttribute('aria-labelledby', 'engine-dialog-title');
  dialog.innerHTML = '<h2 id="engine-dialog-title">Engine</h2><p class="engine-flight-note">Flight continues while this panel is open.</p><div class="engine-dialog-slot"></div><button type="button" id="engine-close" class="primary">Done</button>';
  const slot = dialog.querySelector<HTMLElement>('.engine-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#engine-close')!;
  const flightNote = dialog.querySelector<HTMLElement>('.engine-flight-note')!;
  container.replaceChildren(opener, content);
  document.body.append(dialog);
  const element = <T extends HTMLElement = HTMLElement>(id: string) => content.querySelector<T>(`#${id}`)!;
  const mixture = element<HTMLInputElement>('mixture-control');
  const automatic = element<HTMLButtonElement>('mixture-auto');
  const engineSwitch = element<HTMLButtonElement>('engine-switch');
  const media = window.matchMedia('(max-width: 900px)');
  let latest: EngineState | null = null;
  let reviewing = false, controllable = false, disposed = false;
  let requested: RequestedMixture | null = null;

  function format(value: number, digits = 0): string { return value.toFixed(digits); }
  function render(): void {
    const canControl = !!latest && controllable && !reviewing;
    const command = !reviewing && requested ? requested : latest
      ? { mixture_norm: latest.mixture_norm, mixture_auto: latest.mixture_auto === 1 } : null;
    element('engine-state-label').textContent = reviewing ? 'RECORDED' : 'LIVE';
    flightNote.textContent = reviewing ? 'Recorded engine state · controls are read-only.' : 'Controls may be adjusted while flight is paused.';
    element('engine-unavailable').hidden = !!latest;
    mixture.disabled = automatic.disabled = !canControl;
    automatic.setAttribute('aria-pressed', String(command?.mixture_auto === true));
    const hasSwitch = latest && [0, 1].includes(latest.engine_running!) && [0, 1].includes(latest.engine_command_on!);
    const selectedOn = !reviewing && requested?.engine_running !== undefined ? requested.engine_running : latest?.engine_command_on === 1;
    engineSwitch.disabled = !canControl || !hasSwitch;
    engineSwitch.setAttribute('aria-pressed', String(!!hasSwitch && selectedOn));
    engineSwitch.textContent = hasSwitch ? `ENG ${selectedOn ? 'ON' : 'OFF'} · E` : 'ENG INOP';
    engineSwitch.title = 'Simplified native ignition/starter command · applies on next flight step';
    element('engine-running').textContent = hasSwitch ? latest!.engine_running === 1 ? 'RUN' : 'STOP' : '—';
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
    const fuelAvailable = !!latest && latest.fuel_left_m3 >= 0 && latest.fuel_right_m3 >= 0;
    const fuelGauge = element('engine-fuel-gauge');
    fuelGauge.dataset.available = String(fuelAvailable); fuelGauge.dataset.recorded = String(reviewing);
    for (const [side, quantity] of [['left', latest?.fuel_left_m3], ['right', latest?.fuel_right_m3]] as const) {
      const fraction = fuelAvailable ? Math.min(1, Math.max(0, quantity! / C172X_TANK_CAPACITY_M3)) : null;
      const needle = element(`engine-fuel-${side}-needle`);
      needle.setAttribute('transform', `rotate(${fraction === null ? 0 : (side === 'left' ? -70 + 140 * fraction : 70 - 140 * fraction)} ${side === 'left' ? 44 : 56} 50)`);
      needle.dataset.fraction = fraction === null ? '' : String(fraction);
      needle.dataset.quantityM3 = fuelAvailable ? String(quantity) : '';
    }
    const beyondScale = fuelAvailable && (latest!.fuel_left_m3 > C172X_TANK_CAPACITY_M3 || latest!.fuel_right_m3 > C172X_TANK_CAPACITY_M3);
    element('engine-fuel-flag').textContent = !fuelAvailable ? 'INOP' : beyondScale ? 'OVR' : '';
    element('engine-fuel-title').textContent = fuelAvailable
      ? `${reviewing ? 'Recorded' : 'Live'} model tank contents: left ${readings['engine-fuel-left']} US gallons, right ${readings['engine-fuel-right']} US gallons${beyondScale ? ', above gauge scale' : ''}`
      : 'Model tank contents unavailable';
    element('mixture-applied').textContent = latest ? `${Math.round(latest.mixture_norm * 100)}%${latest.mixture_auto ? ' · AUTO' : ''}` : '—';
    if (latest) {
      if (reviewing || document.activeElement !== mixture) mixture.value = String(command!.mixture_norm * 100);
    } else {
      mixture.value = '100';
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
    if (!latest || !controllable || reviewing || disposed) return;
    const value = mixture.valueAsNumber / 100;
    if (Number.isFinite(value) && value >= 0 && value <= 1) {
      requested = { mixture_norm: value, mixture_auto: false };
      options.onMixture(value, false); render();
    }
  }
  function click(event: MouseEvent): void {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement) || !latest || reviewing || disposed) return;
    if (!controllable) return;
    if (button === engineSwitch) { options.onEngine(); return; }
    if (button === automatic) {
      const norm = requested?.mixture_norm ?? latest.mixture_norm;
      requested = { mixture_norm: norm, mixture_auto: true };
      options.onMixture(norm, true); render();
    }
  }
  function finish(): void { dialog.close(); }

  opener.addEventListener('click', open);
  content.addEventListener('click', click);
  mixture.addEventListener('input', changeMixture);
  done.addEventListener('click', finish);
  dialog.addEventListener('close', close);
  media.addEventListener('change', setLayout);
  setLayout(); render();

  return {
    update(state, inReview, canControl, pending) {
      if (disposed) return;
      latest = engineState(state); reviewing = inReview; controllable = canControl;
      requested = pending && Number.isFinite(pending.mixture_norm) && pending.mixture_norm >= 0
        && pending.mixture_norm <= 1 && typeof pending.mixture_auto === 'boolean' ? { ...pending } : null;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      opener.removeEventListener('click', open); content.removeEventListener('click', click);
      mixture.removeEventListener('input', changeMixture); done.removeEventListener('click', finish);
      dialog.removeEventListener('close', close); media.removeEventListener('change', setLayout);
      if (dialog.open) dialog.close(); dialog.remove(); container.replaceChildren();
    },
  };
}
