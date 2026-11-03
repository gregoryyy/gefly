import type { FlightState } from './types';
import { DEFAULT_RADIO_NAV, getNavigationCatalogue, navigationIndication, radioFrequencyKeys, setObs, swapRadio, tuneStandby,
  validRadioNavSnapshot, type RadioKind, type RadioNavSnapshot, type RadioReceiver } from './radio-nav';
import './radio-nav-panel.css';
import { flightNote } from './cockpit-views';
import { stationCountText, stationRebuildDeferred, stepStandby_khz } from './nav-input';

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
  update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean, flying?: boolean): void;
  adjustObs(receiver: RadioReceiver, delta_deg: number): void;
  setConfiguration(config: RadioNavSnapshot): void;
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
      <div class="nav-course"><label id="${navId(receiver, 'obs-label')}" for="${navId(receiver, 'obs')}">OBS ${receiver}</label><button type="button" id="${navId(receiver, 'obs-down')}" aria-label="Decrease NAV${receiver} OBS course">−</button><input id="${navId(receiver, 'obs')}" type="number" min="0" max="359" step="1" value="0" aria-label="NAV${receiver} OBS true course degrees"><button type="button" id="${navId(receiver, 'obs-up')}" aria-label="Increase NAV${receiver} OBS course">+</button></div>
      <div class="nav-indication"><b id="${navId(receiver, 'flag')}">NAV</b><output id="${navId(receiver, 'to-from')}">OFF</output><span>DME <output id="${navId(receiver, 'dme')}">—</output> NM · RAD <output id="${navId(receiver, 'radial')}">—</output></span></div>
      <div id="${navId(receiver, 'cdi')}" class="nav-cdi" role="img" aria-label="CDI unavailable">${'<i></i>'.repeat(11)}<b id="${navId(receiver, 'cdi-needle')}" hidden></b></div>
      <p id="${navId(receiver, 'signal-note')}" class="nav-signal-note">LAB off · no real station database</p>
    </section>`).join('')}
    <label class="nav-demo"><input id="nav-demo" type="checkbox"> Fictional LAB only</label>
    <button type="button" id="nav-stations-open" class="nav-stations-open">Stations</button><p class="radio-limitations">Historical 2013.10 data · NOT CURRENT · teaching only. Simplified signals; no terrain or propagation. COM 25 kHz subset; no ATC.</p>
  `;
  const dialog = document.createElement('dialog');
  dialog.id = 'radio-nav-dialog'; dialog.className = 'radio-nav-dialog'; dialog.setAttribute('aria-labelledby', 'radio-nav-title');
  dialog.innerHTML = '<h2 id="radio-nav-title">Dual radio / NAV</h2><p class="radio-dialog-note">Flight continues while this panel is open.</p><div class="radio-dialog-slot"></div><button type="button" id="radio-nav-close" class="primary">Done</button>';
  const stations = document.createElement('dialog');
  stations.className = 'nav-stations-dialog'; stations.setAttribute('aria-labelledby', 'nav-stations-title');
  stations.innerHTML = `<div class="nav-stations-header"><h2 id="nav-stations-title">Stations</h2><button type="button" class="nav-stations-close" aria-label="Close stations">×</button></div>
    <p>2013.10 · HISTORICAL, NOT CURRENT · teaching only<br>Load to standby, then swap to activate.</p>
    <div class="nav-stations-filters"><label>Search name, identifier, airport or frequency <input class="nav-stations-search" type="search" autocomplete="off"></label>
    <label><input class="nav-stations-nearby" type="checkbox" checked> Within 50 NM of aircraft</label><span class="nav-stations-position"></span></div>
    <p class="nav-stations-count" role="status" aria-live="polite"></p>
    <div class="nav-stations-list" aria-label="Station results"></div>`;
  document.body.append(stations);
  const stationList = stations.querySelector<HTMLElement>('.nav-stations-list')!;
  const stationsOpen = content.querySelector<HTMLButtonElement>('#nav-stations-open')!;
  const stationsClose = stations.querySelector<HTMLButtonElement>('.nav-stations-close')!;
  const stationSearch = stations.querySelector<HTMLInputElement>('.nav-stations-search')!;
  const stationNearby = stations.querySelector<HTMLInputElement>('.nav-stations-nearby')!;
  const stationPosition = stations.querySelector<HTMLElement>('.nav-stations-position')!;
  const stationCount = stations.querySelector<HTMLElement>('.nav-stations-count')!;
  // Rows stay stable while a pointer hovers or presses (Safari does not focus clicked buttons).
  let stationPointerInside = false, stationPressActive = false;
  const pointerEnter = () => { stationPointerInside = true; };
  const pointerLeave = () => { stationPointerInside = false; };
  const pointerDown = () => { stationPressActive = true; };
  const pointerUp = () => { if (stationPressActive) { stationPressActive = false; } };
  stationList.addEventListener('pointerenter', pointerEnter); stationList.addEventListener('pointerleave', pointerLeave);
  stationList.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerUp); window.addEventListener('pointercancel', pointerUp);
  const slot = dialog.querySelector<HTMLElement>('.radio-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#radio-nav-close')!;
  const media = window.matchMedia('(max-width: 900px)');
  container.replaceChildren(opener, content); document.body.append(dialog);
  const element = <T extends HTMLElement = HTMLElement>(id: string) => content.querySelector<T>(`#${id}`)!;
  const demo = element<HTMLInputElement>('nav-demo');
  let config: RadioNavSnapshot = { ...DEFAULT_RADIO_NAV };
  let state: Readonly<FlightState> | null = null;
  let reviewing = false, running = false, flying = false, disposed = false;
  const canControl = () => !!state && running && !reviewing && !disposed;
  function render(): void {
    const shown = reviewing ? state && validRadioNavSnapshot(state) ? state : null : config;
    const enabled = canControl();
    content.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach(control => { control.disabled = control !== stationsOpen && !enabled; });
    renderStations(enabled);
    element('radio-state-label').textContent = reviewing ? 'RECORDED' : 'LIVE';
    // `running` means controls are available; only `flying` says the simulation advances.
    dialog.querySelector('.radio-dialog-note')!.textContent = flightNote(reviewing, flying, 'Recorded radio state · controls are read-only.');
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
      const valid = indication?.valid === true && indication.cdi_norm !== null && Number.isFinite(indication.cdi_norm);
      const localizer = indication?.station_kind === 'LOC';
      const reference = indication?.course_reference === 'MAG' ? 'MAG' : indication?.course_reference === 'TRUE' ? 'TRUE' : 'REF';
      get('obs-label').textContent = localizer ? `OBS ${receiver} REF ONLY` : `OBS ${receiver} ${reference}`;
      obs.setAttribute('aria-label', `NAV${receiver} OBS ${localizer ? 'reference only, localizer course fixed' : reference + ' course'} degrees`);
      get('flag').textContent = valid ? (localizer ? 'LOC' : 'VOR') : 'NAV'; get('flag').dataset.valid = String(valid);
      get('to-from').textContent = localizer ? 'FIXED' : indication?.to_from ?? 'OFF';
      get('ident').textContent = indication?.station_id ?? 'NO SIGNAL';
      get('signal-note').textContent = indication?.reason ?? 'Recorded radio configuration unavailable';
      get('dme').textContent = indication?.dme_valid && indication.dme_nm !== null ? indication.dme_nm.toFixed(1) : '—';
      const radial = reference === 'MAG' ? indication?.radial_magnetic_deg : indication?.radial_true_deg;
      get('radial').textContent = !localizer && radial !== null && radial !== undefined ? `${String(Math.round(radial) % 360).padStart(3, '0')}° ${reference}` : '—';
      const needle = get('cdi-needle'); needle.hidden = !valid;
      if (valid) needle.style.left = `${50 + indication.cdi_norm! * 40}%`;
      get('cdi').setAttribute('aria-label', valid ? `${localizer ? 'Localizer' : 'VOR'} CDI ${(indication.cdi_norm! * 5).toFixed(1)} dots, positive right${localizer ? '' : `; ${indication.to_from}`}` : 'CDI unavailable · NAV flag');
    }
    demo.checked = shown?.radio_demo_enabled === 1;
  }
  // Great-circle distance on a spherical Earth, displayed in nautical miles.
  function stationDistance(lat_deg: number, lon_deg: number): number | null {
    if (!state || !Number.isFinite(state.lat_rad) || !Number.isFinite(state.lon_rad) ||
        Math.abs(state.lat_rad) > Math.PI / 2 || Math.abs(state.lon_rad) > Math.PI ||
        !Number.isFinite(lat_deg) || !Number.isFinite(lon_deg)) return null;
    const lat = lat_deg * Math.PI / 180, lon = lon_deg * Math.PI / 180;
    const a = Math.sin((lat - state.lat_rad) / 2) ** 2 + Math.cos(state.lat_rad) * Math.cos(lat) * Math.sin((lon - state.lon_rad) / 2) ** 2;
    return 3440.065 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  }
  let stationRenderKey = '';
  let stationRenderedAt = 0;
  let displayedStationEnabled: boolean | undefined;
  let displayedPositionAvailable: boolean | undefined;
  let stationCatalogue: ReturnType<typeof getNavigationCatalogue> | undefined;
  function renderStations(enabled: boolean, force = false): void {
    if (!stations.open && !force) return;
    const catalogue = getNavigationCatalogue();
    const positionAvailable = !!state && Number.isFinite(state.lat_rad) && Number.isFinite(state.lon_rad) &&
      Math.abs(state.lat_rad) <= Math.PI / 2 && Math.abs(state.lon_rad) <= Math.PI;
    stationNearby.disabled = !positionAvailable;
    stationPosition.textContent = positionAvailable ? (reviewing ? 'Recorded position' : 'Displayed aircraft position') : 'Aircraft position unavailable; showing all stations.';
    const key = JSON.stringify([enabled, stationSearch.value, stationNearby.checked, positionAvailable,
      state?.lat_rad, state?.lon_rad, reviewing]);
    if (!force && key === stationRenderKey && stationCatalogue === catalogue) return;
    // Avoid replacing result buttons at simulation frequency or under a user's focus/pointer.
    if (stationRebuildDeferred({ force,
      structuralChange: positionAvailable !== displayedPositionAvailable || enabled !== displayedStationEnabled || stationCatalogue !== catalogue,
      reviewing, sinceLastRender_ms: performance.now() - stationRenderedAt,
      focusInside: stationList.contains(document.activeElement), pointerInside: stationPointerInside, pressActive: stationPressActive })) return;
    stationRenderKey = key; stationCatalogue = catalogue; displayedStationEnabled = enabled; displayedPositionAvailable = positionAvailable; stationRenderedAt = performance.now();
    stationList.replaceChildren();
    const announce = (count: number | null) => { const text = stationCountText(count); if (stationCount.textContent !== text) stationCount.textContent = text; };
    if (!catalogue) { announce(null); return; }
    const query = stationSearch.value.trim().toLocaleLowerCase();
    const matches = catalogue.records.map(record => ({ record, distance: stationDistance(record.lat_deg, record.lon_deg) }))
      .filter(({ record, distance }) => (!stationNearby.checked || !positionAvailable || (distance !== null && distance <= 50)) &&
        [record.id, record.name, record.airport, (record.frequency_khz / 1000).toFixed(2)].some(value => value?.toLocaleLowerCase().includes(query)))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.record.id.localeCompare(b.record.id));
    announce(matches.length);
    if (!matches.length) return;
    for (const { record, distance } of matches) {
      const row = document.createElement('div'); row.className = 'nav-station';
      const description = document.createElement('span');
      const place = [record.airport, record.runway && `RWY ${record.runway}`].filter(Boolean).join(' ');
      const capabilities = [record.kind, record.kind !== 'DME' && record.dme && 'DME', record.gs && 'GS'].filter(Boolean).join(' / ');
      description.textContent = `${record.id} · ${record.name}${place ? ` · ${place}` : ''} · ${(record.frequency_khz / 1000).toFixed(2)} MHz · ${capabilities} · ${distance === null ? 'distance unavailable' : `${distance.toFixed(1)} NM`}`;
      row.append(description);
      for (const receiver of RECEIVERS) {
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = `NAV${receiver}`; button.disabled = !enabled;
        button.setAttribute('aria-label', `Load ${record.id} ${(record.frequency_khz / 1000).toFixed(2)} MHz to NAV${receiver} standby`);
        button.addEventListener('click', () => change(tuneStandby(config, 'nav', record.frequency_khz, receiver)));
        row.append(button);
      }
      stationList.append(row);
    }
  }
  function openStations(): void { if (!disposed && !stations.open) { renderStations(canControl(), true); stations.showModal(); stationSearch.focus(); } }
  function closeStations(): void { stations.close(); }
  function stationBackdrop(event: MouseEvent): void {
    const bounds = stations.getBoundingClientRect();
    if (event.target === stations && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) stations.close();
  }
  function stationFilters(): void { renderStations(canControl(), true); }
  stationsOpen.addEventListener('click', openStations); stationsClose.addEventListener('click', closeStations);
  stations.addEventListener('click', stationBackdrop);
  stationSearch.addEventListener('input', stationFilters); stationNearby.addEventListener('change', stationFilters);
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
          change(tuneStandby(config, kind, stepStandby_khz(kind, current, id.endsWith('-up') ? 1 : -1), receiver)); return;
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
    // Establish an explicit flight preset before the first worker state arrives.
    // The worker receives this configuration atomically in init; no live tuning event.
    setConfiguration(next) { if (!disposed && !reviewing && validRadioNavSnapshot(next)) { config = { ...next }; render(); } },
    update(next, inReview, isRunning, isFlying = false) { if (!disposed) { state = next; reviewing = inReview; running = isRunning; flying = isFlying; render(); } },
    reset() { if (!disposed) { config = { ...DEFAULT_RADIO_NAV }; render(); } },
    dispose() {
      if (disposed) return; disposed = true;
      opener.removeEventListener('click', open); done.removeEventListener('click', finish); dialog.removeEventListener('close', close);
      content.removeEventListener('click', click); content.removeEventListener('input', clearValidity); content.removeEventListener('change', inputChange);
      stationsOpen.removeEventListener('click', openStations); stationsClose.removeEventListener('click', closeStations);
      stations.removeEventListener('click', stationBackdrop);
      stationList.removeEventListener('pointerenter', pointerEnter); stationList.removeEventListener('pointerleave', pointerLeave);
      stationList.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp); window.removeEventListener('pointercancel', pointerUp);
      stationSearch.removeEventListener('input', stationFilters); stationNearby.removeEventListener('change', stationFilters);
      if (stations.open) stations.close(); stations.remove();
      media.removeEventListener('change', layout); if (dialog.open) dialog.close(); dialog.remove(); container.replaceChildren();
    },
  };
}
