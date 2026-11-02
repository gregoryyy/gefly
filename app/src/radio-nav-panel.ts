import type { FlightState } from './types';
import { DEFAULT_RADIO_NAV, DEMO_NAV, navigationIndication, radioFrequencyKeys, setObs, swapRadio, tuneStandby,
  validRadioNavSnapshot, type RadioKind, type RadioNavSnapshot, type RadioReceiver } from './radio-nav';
import './radio-nav-panel.css';

interface RadioNavOptions {
  container: HTMLElement;
  onChange: (config: RadioNavSnapshot) => void;
  onOpen: () => void;
  onClose: () => void;
}
const RECEIVERS = [1, 2] as const;
const KINDS = ['com', 'nav'] as const;
const navId = (receiver: RadioReceiver, suffix: string) => `${receiver === 1 ? 'nav' : 'nav2'}-${suffix}`;
/** Dual session-only tuning units. LAB is fictional teaching geometry, never flight dynamics. */
export function createRadioNavPanel(options: RadioNavOptions): {
  snapshot(): RadioNavSnapshot;
  update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean): void;
  adjustObs(receiver: RadioReceiver, delta_deg: number): void;
  reset(): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('radio-nav-panel');
  const opener = document.createElement('button');
  opener.type = 'button'; opener.id = 'radio-nav-open'; opener.className = 'radio-nav-open';
  opener.textContent = 'Radio / NAV'; opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'radio-nav-dialog');
  const content = document.createElement('section');
  content.className = 'radio-nav-content'; content.setAttribute('aria-label', 'Dual classic radio and NAV teaching units');
  content.innerHTML = `
    <div class="radio-heading"><strong>RADIO STACK</strong><span id="radio-state-label">LIVE</span></div>
    ${RECEIVERS.map(receiver => `<section class="radio-receiver" aria-label="COM and NAV receiver ${receiver}">
      <div class="radio-receiver-title"><strong>COM / NAV ${receiver}</strong><span id="${navId(receiver, 'ident')}">NO SIGNAL</span></div>
      ${KINDS.map(kind => `<div class="radio-frequency-row">
        <div><label>${kind.toUpperCase()}${receiver} ACTIVE</label><output id="${kind}${receiver}-active">—</output></div>
        <button type="button" id="${kind}${receiver}-swap" aria-label="Swap ${kind.toUpperCase()}${receiver} active and standby">⇄</button>
        <div><label for="${kind}${receiver}-standby">STANDBY MHz</label><input id="${kind}${receiver}-standby" type="number" min="${kind === 'com' ? '118' : '108'}" max="${kind === 'com' ? '136.975' : '117.95'}" step="${kind === 'com' ? '.025' : '.05'}" aria-label="${kind.toUpperCase()}${receiver} standby frequency MHz"></div>
        <div class="radio-tune-buttons"><button type="button" id="${kind}${receiver}-down" aria-label="Decrease ${kind.toUpperCase()}${receiver} standby channel">−</button><button type="button" id="${kind}${receiver}-up" aria-label="Increase ${kind.toUpperCase()}${receiver} standby channel">+</button></div>
      </div>`).join('')}
      <div class="nav-course"><label for="${navId(receiver, 'obs')}">OBS ${receiver} TRUE</label><button type="button" id="${navId(receiver, 'obs-down')}" aria-label="Decrease NAV${receiver} OBS course">−</button><input id="${navId(receiver, 'obs')}" type="number" min="0" max="359" step="1" value="0" aria-label="NAV${receiver} OBS true course degrees"><button type="button" id="${navId(receiver, 'obs-up')}" aria-label="Increase NAV${receiver} OBS course">+</button></div>
      <div class="nav-indication"><b id="${navId(receiver, 'flag')}">NAV</b><output id="${navId(receiver, 'to-from')}">OFF</output><span>LAB DME <output id="${navId(receiver, 'dme')}">—</output> NM · <output id="${navId(receiver, 'radial')}">—</output> TRUE</span></div>
      <div id="${navId(receiver, 'cdi')}" class="nav-cdi" role="img" aria-label="CDI unavailable">${'<i></i>'.repeat(11)}<b id="${navId(receiver, 'cdi-needle')}" hidden></b></div>
      <p id="${navId(receiver, 'signal-note')}" class="nav-signal-note">LAB off · no real station database</p>
    </section>`).join('')}
    <label class="nav-demo"><input id="nav-demo" type="checkbox"> Fictional LAB ${(DEMO_NAV.frequency_khz / 1000).toFixed(2)} · both NAVs</label>
    <p class="radio-limitations">Legacy COM 25 kHz subset · 8.33 kHz/ATC unavailable.<br>LAB: true OBS/radials, geometric DME, 60 NM demo radius. No propagation/terrain, magnetic VOR or ILS.</p>
  `;
  const dialog = document.createElement('dialog');
  dialog.id = 'radio-nav-dialog'; dialog.className = 'radio-nav-dialog'; dialog.setAttribute('aria-labelledby', 'radio-nav-title');
  dialog.innerHTML = '<h2 id="radio-nav-title">Dual radio / NAV</h2><p class="radio-dialog-note">Flight continues while this panel is open.</p><div class="radio-dialog-slot"></div><button type="button" id="radio-nav-close" class="primary">Done</button>';
  const slot = dialog.querySelector<HTMLElement>('.radio-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#radio-nav-close')!;
  const media = window.matchMedia('(max-width: 900px)');
  container.replaceChildren(opener, content); document.body.append(dialog);
  const element = <T extends HTMLElement = HTMLElement>(id: string) => content.querySelector<T>(`#${id}`)!;
  const demo = element<HTMLInputElement>('nav-demo');
  let config: RadioNavSnapshot = { ...DEFAULT_RADIO_NAV };
  let state: Readonly<FlightState> | null = null;
  let reviewing = false, running = false, disposed = false;
  const canControl = () => !!state && running && !reviewing && !disposed;
  function render(): void {
    const shown = reviewing ? state && validRadioNavSnapshot(state) ? state : null : config;
    const enabled = canControl();
    content.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach(control => { control.disabled = !enabled; });
    element('radio-state-label').textContent = reviewing ? 'RECORDED' : 'LIVE';
    dialog.querySelector('.radio-dialog-note')!.textContent = reviewing ? 'Recorded radio state · controls are read-only.'
      : running ? 'Flight continues while this panel is open.' : 'Flight is paused.';
    for (const receiver of RECEIVERS) {
      for (const kind of KINDS) {
        const keys = radioFrequencyKeys(kind, receiver);
        element(`${kind}${receiver}-active`).textContent = shown ? (shown[keys.active] / 1000).toFixed(kind === 'com' ? 3 : 2) : '—';
        const input = element<HTMLInputElement>(`${kind}${receiver}-standby`);
        if (reviewing || !enabled || document.activeElement !== input) {
          input.value = shown ? (shown[keys.standby] / 1000).toFixed(kind === 'com' ? 3 : 2) : '';
          input.setCustomValidity('');
        }
      }
      const obs = element<HTMLInputElement>(navId(receiver, 'obs'));
      if (reviewing || !enabled || document.activeElement !== obs) {
        obs.value = shown ? String(receiver === 1 ? shown.radio_obs_deg : shown.radio_obs2_deg) : ''; obs.setCustomValidity('');
      }
      const indication = shown ? navigationIndication(shown, state, receiver) : null;
      const get = (suffix: string) => element(navId(receiver, suffix));
      get('flag').textContent = indication?.valid ? 'LAB' : 'NAV'; get('flag').dataset.valid = String(!!indication?.valid);
      get('to-from').textContent = indication?.to_from ?? 'OFF';
      const frequency = shown?.[radioFrequencyKeys('nav', receiver).active];
      get('ident').textContent = shown?.radio_demo_enabled && frequency === DEMO_NAV.frequency_khz ? 'LAB · FICTIONAL' : 'NO SIGNAL';
      get('signal-note').textContent = indication?.reason ?? 'Recorded radio configuration unavailable';
      get('dme').textContent = indication?.dme_nm === null || indication?.dme_nm === undefined ? '—' : indication.dme_nm.toFixed(1);
      get('radial').textContent = indication?.radial_true_deg === null || indication?.radial_true_deg === undefined ? '—' : `${String(Math.round(indication.radial_true_deg) % 360).padStart(3, '0')}°`;
      const needle = get('cdi-needle'); needle.hidden = !indication?.valid;
      if (indication?.valid) needle.style.left = `${50 + indication.cdi_norm! * 40}%`;
      get('cdi').setAttribute('aria-label', indication?.valid ? `LAB CDI ${(indication.cdi_norm! * 5).toFixed(1)} dots, positive right; ${indication.to_from}` : 'CDI unavailable · NAV flag');
    }
    demo.checked = shown?.radio_demo_enabled === 1;
  }
  function change(next: RadioNavSnapshot): void {
    if (!canControl()) return;
    config = next; options.onChange({ ...config }); render();
  }
  function adjustObs(receiver: RadioReceiver, delta_deg: number): void {
    if (!canControl() || !Number.isInteger(delta_deg) || !RECEIVERS.includes(receiver)) return;
    change(setObs(config, (receiver === 1 ? config.radio_obs_deg : config.radio_obs2_deg) + delta_deg, receiver));
  }
  function inputChange(event: Event): void {
    if (!canControl() || !(event.target instanceof HTMLInputElement)) return;
    const input = event.target;
    if (input === demo) { change({ ...config, radio_demo_enabled: demo.checked ? 1 : 0 }); return; }
    for (const receiver of RECEIVERS) {
      for (const kind of KINDS) {
        if (input.id !== `${kind}${receiver}-standby`) continue;
        const khz = input.valueAsNumber * 1000;
        try {
          if (!Number.isFinite(khz) || Math.abs(khz - Math.round(khz)) > 1e-6) throw new RangeError();
          change(tuneStandby(config, kind, Math.round(khz), receiver)); input.setCustomValidity('');
        } catch { input.setCustomValidity(`Use a supported ${kind.toUpperCase()} channel (${kind === 'com' ? '25' : '50'} kHz steps).`); input.reportValidity(); }
        return;
      }
      if (input.id === navId(receiver, 'obs')) {
        if (!input.checkValidity() || !Number.isInteger(input.valueAsNumber)) { input.setCustomValidity('Use an integer course from 0 to 359 degrees.'); input.reportValidity(); return; }
        input.setCustomValidity(''); change(setObs(config, input.valueAsNumber, receiver)); return;
      }
    }
  }
  function clearValidity(event: Event): void { if (event.target instanceof HTMLInputElement) event.target.setCustomValidity(''); }
  function click(event: MouseEvent): void {
    if (!(event.target instanceof HTMLButtonElement) || !canControl()) return;
    const id = event.target.id;
    for (const receiver of RECEIVERS) {
      for (const kind of KINDS) {
        if (id === `${kind}${receiver}-swap`) { change(swapRadio(config, kind, receiver)); return; }
        if (id === `${kind}${receiver}-up` || id === `${kind}${receiver}-down`) {
          const current = config[radioFrequencyKeys(kind, receiver).standby];
          const step = kind === 'com' ? 25 : 50, min = kind === 'com' ? 118000 : 108000, max = kind === 'com' ? 136975 : 117950;
          change(tuneStandby(config, kind, Math.max(min, Math.min(max, current + (id.endsWith('-up') ? step : -step))), receiver)); return;
        }
      }
      if (id === navId(receiver, 'obs-up') || id === navId(receiver, 'obs-down')) { adjustObs(receiver, id.endsWith('-up') ? 1 : -1); return; }
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
  opener.addEventListener('click', open); done.addEventListener('click', finish); dialog.addEventListener('close', close);
  content.addEventListener('click', click); content.addEventListener('input', clearValidity); content.addEventListener('change', inputChange);
  media.addEventListener('change', layout); layout(); render();
  return {
    snapshot: () => ({ ...config }), adjustObs,
    update(next, inReview, isRunning) { if (!disposed) { state = next; reviewing = inReview; running = isRunning; render(); } },
    reset() { if (!disposed) { config = { ...DEFAULT_RADIO_NAV }; render(); } },
    dispose() {
      if (disposed) return; disposed = true;
      opener.removeEventListener('click', open); done.removeEventListener('click', finish); dialog.removeEventListener('close', close);
      content.removeEventListener('click', click); content.removeEventListener('input', clearValidity); content.removeEventListener('change', inputChange);
      media.removeEventListener('change', layout); if (dialog.open) dialog.close(); dialog.remove(); container.replaceChildren();
    },
  };
}
