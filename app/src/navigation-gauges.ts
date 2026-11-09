import type { FlightState } from './types';
import type { PlannerPoint } from './map-flight-plan-types';
import { pointNavigation } from './map-flight-plan';
import { bearingDistanceIndication, navigationIndication, validRadioNavSnapshot } from './radio-nav';
import { C172X_MAX_RPM } from './c172x-instrument-references';
import './navigation-gauges.css';
import { flightNote } from './cockpit-views';
import { obsDragDelta_deg, obsHoldStep_deg, OBS_DRAG_PX_PER_DEG } from './nav-input';

interface NavigationGaugesOptions {
  container: HTMLElement;
  onObs: (receiver: 1 | 2, delta_deg: number) => void;
  onOpen: () => void;
  onClose: () => void;
}

const DEG = Math.PI / 180;
// UI gesture rates only; these do not calibrate an installed aircraft OBS knob.
const OBS_HOLD_DELAY_MS = 350;
const OBS_REPEAT_MS = 100;
const svgPoint = (radius: number, degrees: number): [number, number] => [
  120 + radius * Math.sin(degrees * DEG), 120 - radius * Math.cos(degrees * DEG),
];

/** Original compass-card artwork. Bearing/course geometry stays in the shared navigation models. */
function compassCard(): string {
  const ticks: string[] = [];
  for (let degrees = 0; degrees < 360; degrees += 5) {
    const major = degrees % 30 === 0;
    const [x1, y1] = svgPoint(major ? 91 : 96, degrees);
    const [x2, y2] = svgPoint(102, degrees);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${major ? 'nav-card-major' : 'nav-card-minor'}"/>`);
    if (major) {
      const [x, y] = svgPoint(79, degrees);
      const label = ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' } as Record<number, string>)[degrees] ?? String(degrees / 10);
      ticks.push(`<text x="${x}" y="${y}" transform="rotate(${degrees} ${x} ${y})" class="nav-card-number">${label}</text>`);
    }
  }
  return ticks.join('');
}

function face(receiver: 1 | 2): string {
  return `<svg viewBox="0 0 240 240" class="navigation-gauge-face" role="img" aria-label="NAV${receiver} unavailable"><title>Drag horizontally to turn NAV${receiver} OBS: right increases, left decreases.</title>
    <rect x="1" y="1" width="238" height="238" rx="17" class="nav-bezel-square"/>
    ${[[15, 15], [225, 15], [15, 225], [225, 225]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" class="nav-screw"/><path d="M${x - 2} ${y + 2}l4 -4" class="nav-screw-slot"/>`).join('')}
    <circle cx="120" cy="120" r="115" class="nav-bezel-ring"/>
    <circle cx="120" cy="120" r="108" class="nav-dial"/>
    <g class="nav-compass-card">${compassCard()}</g>
    <path d="M112 7h16l-8 13z" class="nav-course-index"/>
    <text x="120" y="79" class="nav-unit-title">NAV${receiver} · ${receiver === 1 ? 'VOR / ILS' : 'VOR / LOC'}</text>
    <text x="120" y="91" class="nav-unit-reference">NO SIGNAL</text>
    <line x1="51" y1="123" x2="189" y2="123" class="nav-cdi-axis"/>
    ${Array.from({ length: 11 }, (_, i) => `<circle cx="${60 + i * 12}" cy="123" r="${i === 5 ? 3 : 2}" class="nav-cdi-dot"/>`).join('')}
    <g class="nav-cdi-needle" hidden><path d="M120 108v40"/></g>
    ${receiver === 1 ? `${Array.from({ length: 11 }, (_, i) => `<circle cx="120" cy="${99 + i * 4.8}" r="${i === 5 ? 3 : 1.5}" class="nav-gs-dot"/>`).join('')}<g class="nav-gs-needle" hidden><path d="M89 123h62"/></g><g class="nav-gs-flag"><rect x="52" y="151" width="28" height="18" rx="2"/><text x="66" y="164">GS</text></g>` : ''}
    <g class="nav-warning-flag"><rect x="150" y="151" width="37" height="18" rx="2"/><text x="168.5" y="164">NAV</text></g>
    <g class="nav-to-from-symbol" hidden><path d="M91 151l-6 10h12z"/><text x="120" y="162">OFF</text></g>
    <text x="120" y="190" class="nav-dme-readout">DME — NM</text>
    <text x="120" y="210" class="nav-scale-label">5 DOTS = 10°</text>
  </svg>`;
}

function auxiliaryFace(content: string, label: string): string {
  return `<svg viewBox="0 0 240 240" class="navigation-gauge-face" role="img" aria-label="${label}">
    <rect x="1" y="1" width="238" height="238" rx="17" class="nav-bezel-square"/>
    ${[[15, 15], [225, 15], [15, 225], [225, 225]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" class="nav-screw"/>`).join('')}
    <circle cx="120" cy="120" r="115" class="nav-bezel-ring"/><circle cx="120" cy="120" r="108" class="nav-dial"/>${content}</svg>`;
}
function bearingFace(): string {
  return auxiliaryFace(`<g class="bearing-compass-card">${compassCard()}</g><path d="M112 7h16l-8 13z" class="nav-course-index"/>
    <text x="120" y="92" class="nav-unit-title">BRG / DME</text><text x="120" y="105" class="nav-unit-reference">NAV1 · TRUE AID</text>
    <g class="nav-bearing-pointer" hidden><path d="M120 42l-7 15h14zM120 55v132M113 179l7 16 7-16"/></g>
    <circle cx="120" cy="120" r="6" class="nav-course-index"/>
    <g class="bearing-warning-flag"><rect x="99" y="151" width="42" height="18" rx="2"/><text x="120" y="164">BRG</text></g>
    <g class="bearing-gps-labels" hidden><rect x="40" y="171" width="160" height="40" rx="3" class="nav-dial"/><text x="120" y="181" class="bearing-gps-id"></text><text x="120" y="193" class="bearing-gps-name"></text><text x="120" y="206" class="bearing-gps-context"></text></g>
    <title>NAV1 VOR-derived true bearing teaching aid and independent DME, not ADF/NDB reception</title>`, 'NAV1 bearing teaching aid and DME unavailable');
}
function rpmFace(): string {
  const ticks: string[] = [];
  for (let rpm = 0; rpm <= 3000; rpm += 100) {
    const angle = -135 + rpm / 3000 * 270;
    const [x1, y1] = svgPoint(rpm % 500 === 0 ? 91 : 98, angle), [x2, y2] = svgPoint(105, angle);
    ticks.push(`<path d="M${x1} ${y1}L${x2} ${y2}" class="nav-card-major"/>`);
    if (rpm % 500 === 0) { const [x, y] = svgPoint(76, angle); ticks.push(`<text x="${x}" y="${y}" class="nav-card-number">${rpm / 100}</text>`); }
  }
  const [x1, y1] = svgPoint(97, -135 + C172X_MAX_RPM / 3000 * 270), [x2, y2] = svgPoint(110, -135 + C172X_MAX_RPM / 3000 * 270);
  return auxiliaryFace(`${ticks.join('')}<path d="M${x1} ${y1}L${x2} ${y2}" class="rpm-model-reference"/>
    <text x="120" y="92" class="nav-unit-title">PROP RPM</text><text x="120" y="106" class="nav-unit-reference">×100</text>
    <g class="rpm-pointer" hidden><path d="M120 45L116 134h8z"/></g><circle cx="120" cy="120" r="6" class="nav-course-index"/>
    <text x="120" y="182" class="nav-scale-label">MODEL MAX ${C172X_MAX_RPM}</text>
    <text x="120" y="210" class="rpm-unavailable">INOP</text>`, 'Actual propeller RPM unavailable');
}

/** Four original displays over shared radio/GPS geometry and native RPM, not ADF/NDB reception. */
export function createNavigationGauges(options: NavigationGaugesOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean, flying?: boolean, gpsTarget?: Readonly<PlannerPoint> | null): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('navigation-gauges');
  container.setAttribute('aria-label', 'NAV1 ILS/VOR, NAV2 VOR/localizer, NAV1 bearing teaching aid/DME and actual propeller RPM');
  const opener = document.createElement('button');
  opener.id = 'navigation-open'; opener.type = 'button'; opener.className = 'navigation-open';
  opener.textContent = 'NAV instruments'; opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'navigation-dialog');
  const content = document.createElement('div');
  content.className = 'navigation-gauges-content';
  content.innerHTML = ([1, 2] as const).map(receiver => `<section id="nav${receiver}-gauge" class="navigation-gauge" data-receiver="${receiver}" aria-label="NAV${receiver} ${receiver === 1 ? 'VOR/localizer/glideslope' : 'VOR/localizer'} instrument">
    ${face(receiver)}
    <div class="navigation-obs-controls"><button type="button" id="nav${receiver}-gauge-obs-down" data-receiver="${receiver}" data-delta="-1" aria-label="Decrease NAV${receiver} OBS course by one degree">−</button>
      <div class="navigation-obs-knob" tabindex="0" role="spinbutton" aria-label="NAV${receiver} OBS course" aria-valuemin="0" aria-valuemax="359" title="Drag right/left to turn OBS. Arrow keys: 1 degree; Shift + arrow: 10 degrees."><span>OBS TRUE</span><output id="nav${receiver}-gauge-obs">—</output></div>
      <button type="button" id="nav${receiver}-gauge-obs-up" data-receiver="${receiver}" data-delta="1" aria-label="Increase NAV${receiver} OBS course by one degree">+</button></div>
    <p id="nav${receiver}-gauge-note" class="navigation-gauge-note">Radio configuration unavailable</p>
  </section>`).join('') + `<section id="bearing-gauge" class="navigation-gauge" data-instrument="bearing" aria-label="NAV1 VOR-derived true bearing teaching aid and independent DME">
    ${bearingFace()}<div class="navigation-aux-readout"><output id="bearing-true">—</output><span>BRG TRUE</span><output id="bearing-dme">—</output><span id="bearing-distance-label">DME NM</span></div>
    <p class="navigation-gauge-note" id="bearing-note">Navigation signal unavailable</p></section>
    <section id="rpm-gauge" class="navigation-gauge" data-instrument="rpm" aria-label="Actual propeller RPM">
    ${rpmFace()}<div class="navigation-aux-readout"><output id="rpm-value">—</output><span>PROP RPM · MODEL</span></div></section>`;
  const dialog = document.createElement('dialog');
  dialog.id = 'navigation-dialog'; dialog.className = 'navigation-dialog'; dialog.setAttribute('aria-labelledby', 'navigation-title');
  dialog.innerHTML = '<h2 id="navigation-title">NAV instruments</h2><p class="navigation-dialog-note">Flight continues while this panel is open.</p><div class="navigation-dialog-slot"></div><button type="button" id="navigation-close" class="primary">Done</button>';
  const slot = dialog.querySelector<HTMLElement>('.navigation-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#navigation-close')!;
  const media = window.matchMedia('(max-width: 620px)');
  container.replaceChildren(opener, content); document.body.append(dialog);
  let disposed = false, canAdjust = false;
  type Interaction = { pointerId: number; target: Element; receiver: 1 | 2 } & (
    { kind: 'hold'; direction: -1 | 1; started_ms: number } |
    { kind: 'drag'; startX: number; applied_deg: number });
  let interaction: Interaction | null = null;
  let repeatTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressClickFor: HTMLButtonElement | null = null;
  const gauges = ([1, 2] as const).map(receiver => {
    const root = content.querySelector<HTMLElement>(`#nav${receiver}-gauge`)!;
    return { receiver, root,
      svg: root.querySelector<SVGSVGElement>('svg')!,
      card: root.querySelector<SVGGElement>('.nav-compass-card')!,
      needle: root.querySelector<SVGGElement>('.nav-cdi-needle')!,
      flag: root.querySelector<SVGGElement>('.nav-warning-flag')!,
      direction: root.querySelector<SVGGElement>('.nav-to-from-symbol')!,
      gsNeedle: root.querySelector<SVGGElement>('.nav-gs-needle'),
      gsFlag: root.querySelector<SVGGElement>('.nav-gs-flag'),
      knob: root.querySelector<HTMLElement>('.navigation-obs-knob')!,
      obs: root.querySelector<HTMLOutputElement>('output')!,
      note: root.querySelector<HTMLElement>('.navigation-gauge-note')!,
    };
  });
  const bearingRoot = content.querySelector<HTMLElement>('#bearing-gauge')!;
  const rpmRoot = content.querySelector<HTMLElement>('#rpm-gauge')!;
  const bearingCard = bearingRoot.querySelector<SVGGElement>('.bearing-compass-card')!;
  const bearingPointer = bearingRoot.querySelector<SVGGElement>('.nav-bearing-pointer')!;
  const bearingFlag = bearingRoot.querySelector<SVGGElement>('.bearing-warning-flag')!;
  const rpmPointer = rpmRoot.querySelector<SVGGElement>('.rpm-pointer')!;

  function click(event: MouseEvent): void {
    if (!canAdjust || disposed || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-receiver][data-delta]');
    if (!button || !content.contains(button)) return;
    // Pointerdown already supplies the first degree; neither short clicks nor
    // the native click following a long hold may add another step on release.
    if (event.detail > 0 && suppressClickFor === button) { suppressClickFor = null; return; }
    const receiver = Number(button.dataset.receiver), delta = Number(button.dataset.delta);
    if ((receiver === 1 || receiver === 2) && (delta === -1 || delta === 1)) options.onObs(receiver, delta);
  }
  function stopInteraction(): void {
    clearTimeout(repeatTimer); repeatTimer = undefined;
    const previous = interaction; interaction = null;
    if (previous) {
      previous.target.removeAttribute('data-obs-active');
      if (previous.target.hasPointerCapture(previous.pointerId)) previous.target.releasePointerCapture(previous.pointerId);
    }
  }
  function repeat(): void {
    repeatTimer = undefined;
    if (!canAdjust || disposed) { stopInteraction(); return; }
    if (interaction?.kind !== 'hold') return;
    const elapsed_ms = performance.now() - interaction.started_ms;
    const degrees = obsHoldStep_deg(elapsed_ms);
    options.onObs(interaction.receiver, interaction.direction * degrees);
    // A callback can synchronously pause, close or dispose the control.
    if (interaction?.kind === 'hold' && canAdjust && !disposed) repeatTimer = setTimeout(repeat, OBS_REPEAT_MS);
  }
  function pointerDown(event: PointerEvent): void {
    if (!canAdjust || disposed || event.button !== 0 || event.isPrimary === false || interaction || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-receiver][data-delta]');
    const target = button ?? event.target.closest<HTMLElement | SVGSVGElement>('.navigation-obs-knob,.navigation-gauge-face');
    if (!target || !content.contains(target)) return;
    const receiver = Number(target.closest<HTMLElement>('.navigation-gauge')?.dataset.receiver);
    if (receiver !== 1 && receiver !== 2) return;
    event.preventDefault();
    if (target instanceof HTMLElement || target instanceof SVGSVGElement) target.focus({ preventScroll: true });
    target.setPointerCapture(event.pointerId); target.setAttribute('data-obs-active', 'true');
    if (button) {
      const direction = Number(button.dataset.delta);
      if (direction !== -1 && direction !== 1) { target.releasePointerCapture(event.pointerId); return; }
      suppressClickFor = button;
      interaction = { pointerId: event.pointerId, target, receiver, kind: 'hold', direction, started_ms: performance.now() };
      options.onObs(receiver, direction);
      if (interaction && canAdjust && !disposed) repeatTimer = setTimeout(repeat, OBS_HOLD_DELAY_MS);
    } else interaction = { pointerId: event.pointerId, target, receiver, kind: 'drag', startX: event.clientX, applied_deg: 0 };
  }
  function pointerMove(event: PointerEvent): void {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    if (!canAdjust || disposed) { stopInteraction(); return; }
    if (interaction.kind !== 'drag' || !Number.isFinite(event.clientX)) return;
    event.preventDefault();
    // Whole-displacement accounting lives in nav-input.ts (unit tested).
    const drag = obsDragDelta_deg(interaction.startX, event.clientX, interaction.applied_deg, OBS_DRAG_PX_PER_DEG);
    if (!drag) return;
    const { delta_deg } = drag;
    interaction.applied_deg = drag.total_deg;
    if (!delta_deg) return;
    options.onObs(interaction.receiver, delta_deg);
  }
  function pointerStop(event: PointerEvent): void {
    if (event.pointerId === interaction?.pointerId) stopInteraction();
  }
  function key(event: KeyboardEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.navigation-obs-knob')
      || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation();
    if (!canAdjust || disposed) return;
    const receiver = Number(event.target.closest<HTMLElement>('.navigation-gauge')?.dataset.receiver);
    if (receiver === 1 || receiver === 2) options.onObs(receiver,
      (event.code === 'ArrowRight' || event.code === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1));
  }
  function visibility(): void { if (document.hidden) stopInteraction(); }
  function focusOut(event: FocusEvent): void {
    if (interaction && event.target === interaction.target) stopInteraction();
  }
  content.addEventListener('click', click);
  content.addEventListener('pointerdown', pointerDown); content.addEventListener('pointermove', pointerMove);
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) content.addEventListener(event, pointerStop);
  content.addEventListener('keydown', key); content.addEventListener('focusout', focusOut);
  window.addEventListener('blur', stopInteraction); document.addEventListener('visibilitychange', visibility);

  function layout(): void {
    if (disposed) return;
    stopInteraction();
    opener.hidden = !media.matches;
    if (media.matches) slot.append(content);
    else { if (dialog.open) dialog.close(); container.append(content); }
  }
  function open(): void {
    if (!disposed && media.matches && !dialog.open) { options.onOpen(); dialog.showModal(); }
  }
  function close(): void { stopInteraction(); if (!disposed) options.onClose(); }
  function finish(): void { dialog.close(); }
  opener.addEventListener('click', open); done.addEventListener('click', finish);
  dialog.addEventListener('close', close); media.addEventListener('change', layout);
  layout();

  function update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean, flying = false, gpsTarget: Readonly<PlannerPoint> | null = null): void {
    if (disposed) return;
    const config = state && validRadioNavSnapshot(state) ? state : null;
    canAdjust = !!config && running && !reviewing;
    if (!canAdjust) stopInteraction();
    container.dataset.mode = reviewing ? 'recorded' : 'live';
    container.dataset.step = state ? String(state.step) : '';
    content.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = !canAdjust; });
    dialog.querySelector('.navigation-dialog-note')!.textContent = flightNote(reviewing, flying, 'Recorded NAV state · OBS controls are read-only.');
    for (const gauge of gauges) {
      const { receiver } = gauge;
      const obs = config ? (receiver === 1 ? config.radio_obs_deg : config.radio_obs2_deg) : null;
      const indication = config ? navigationIndication(config, state, receiver) : null;
      const valid = indication?.valid === true && indication.cdi_norm !== null && Number.isFinite(indication.cdi_norm);
      const localizer = indication?.station_kind === 'LOC';
      const reference = indication?.course_reference === 'MAG' ? 'MAG' : indication?.course_reference === 'TRUE' ? 'TRUE' : 'REF';
      const gsValid = receiver === 1 && indication?.gs_valid === true && indication.gs_norm !== null && Number.isFinite(indication.gs_norm);
      const dmeValid = indication?.dme_valid === true && indication.dme_nm !== null && Number.isFinite(indication.dme_nm);
      const station = indication?.station_id ?? 'NO SIGNAL';
      const fixedCourse = indication?.course_true_deg === null || indication?.course_true_deg === undefined ? 'FIXED' : `FIXED ${String(Math.round(indication.course_true_deg) % 360).padStart(3, '0')}°T`;
      gauge.root.dataset.valid = String(valid);
      gauge.root.dataset.gsValid = String(gsValid); gauge.root.dataset.dmeValid = String(dmeValid);
      gauge.root.dataset.stationId = indication?.station_id ?? ''; gauge.root.dataset.stationKind = indication?.station_kind ?? '';
      gauge.root.dataset.courseReference = indication?.course_reference ?? 'NONE';
      gauge.root.dataset.gsNorm = gsValid ? String(indication!.gs_norm) : '';
      gauge.obs.value = obs === null ? '—' : `${String(obs).padStart(3, '0')}°`;
      gauge.knob.setAttribute('aria-disabled', String(!canAdjust));
      gauge.knob.querySelector('span')!.textContent = localizer ? 'OBS REF' : `OBS ${reference}`;
      gauge.knob.setAttribute('aria-label', `NAV${receiver} OBS ${localizer ? 'reference only, localizer course is fixed' : reference + ' course'}`);
      gauge.knob.setAttribute('aria-valuetext', obs === null ? 'Unavailable' : `${obs} degrees ${localizer ? 'reference only' : reference}${reviewing ? ', recorded' : ''}`);
      if (obs === null) gauge.knob.removeAttribute('aria-valuenow');
      else gauge.knob.setAttribute('aria-valuenow', String(obs));
      gauge.svg.dataset.obsEnabled = String(canAdjust);
      const cardCourse = localizer ? indication?.course_true_deg ?? null : obs;
      gauge.card.toggleAttribute('hidden', cardCourse === null);
      if (cardCourse !== null) gauge.card.setAttribute('transform', `rotate(${-cardCourse} 120 120)`);
      gauge.needle.toggleAttribute('hidden', !valid);
      gauge.flag.toggleAttribute('hidden', valid);
      gauge.direction.toggleAttribute('hidden', !valid || localizer || indication?.to_from === 'OFF');
      gauge.gsNeedle?.toggleAttribute('hidden', !gsValid); gauge.gsFlag?.toggleAttribute('hidden', gsValid);
      if (gsValid) gauge.gsNeedle!.setAttribute('transform', `translate(0 ${-indication!.gs_norm! * 24})`);
      gauge.root.querySelector('.nav-unit-reference')!.textContent = indication?.station_id
        ? `${station} · ${localizer ? fixedCourse : reference} · ${config?.radio_demo_enabled ? 'DEMO' : 'HIST'}` : 'NO SIGNAL';
      gauge.root.querySelector('.nav-dme-readout')!.textContent = dmeValid ? `DME ${indication!.dme_nm!.toFixed(1)} NM` : 'DME — NM';
      gauge.root.querySelector('.nav-scale-label')!.textContent = localizer ? 'LOC · FIXED COURSE' : indication?.station_kind === 'DME' ? 'DME ONLY · NO CDI' : `5 DOTS = 10° · ${reference}`;
      if (valid) {
        gauge.needle.setAttribute('transform', `translate(${indication.cdi_norm! * 60} 0)`);
        gauge.direction.querySelector('text')!.textContent = indication.to_from;
        gauge.direction.querySelector('path')!.setAttribute('transform', indication.to_from === 'TO' ? '' : 'rotate(180 91 156)');
      }
      gauge.note.textContent = `${reviewing ? 'RECORDED · ' : ''}${indication?.reason ?? 'Radio configuration unavailable'}`;
      gauge.svg.setAttribute('aria-label', `NAV${receiver} ${station}, ${indication?.source_label ?? 'source unavailable'}, `
        + (valid ? `${localizer ? fixedCourse : `OBS ${obs} degrees ${reference}`}, CDI ${(indication!.cdi_norm! * 5).toFixed(1)} dots positive right${!localizer ? ', ' + indication!.to_from : ''}`
          : `NAV flag, ${indication?.reason ?? 'radio configuration unavailable'}`)
        + (receiver === 1 ? gsValid ? `, glideslope ${(indication!.gs_norm! * 5).toFixed(1)} dots positive up` : `, GS flag, ${indication?.gs_reason ?? 'glideslope unavailable'}` : ', no glideslope receiver on this instrument')
        + `, DME ${dmeValid ? indication!.dme_nm!.toFixed(1) + ' nautical miles indicated' : 'unavailable'}${reviewing ? ', recorded' : ''}`);
    }
    const heading = state && Number.isFinite(state.heading_rad) ? ((state.heading_rad / DEG) % 360 + 360) % 360 : null;
    bearingRoot.dataset.source = gpsTarget ? 'gps' : 'nav1';
    bearingRoot.querySelector('.bearing-gps-labels')!.toggleAttribute('hidden', !gpsTarget);
    bearingRoot.querySelector('.nav-unit-title')!.textContent = gpsTarget ? 'GPS BRG / DIST' : 'BRG / DME';
    bearingRoot.querySelector('#bearing-distance-label')!.textContent = gpsTarget ? 'GPS DIST NM' : 'DME NM';
    if (gpsTarget) {
      // A selected GPS target stays selected even if its bearing is unavailable;
      // never substitute an unrelated radio station in that case.
      const navigation = state ? pointNavigation({ lat_deg: state.lat_rad / DEG, lon_deg: state.lon_rad / DEG }, gpsTarget) : null;
      const bearing = navigation?.bearing_true_deg ?? null;
      const valid = bearing !== null && heading !== null;
      const distance = navigation?.distance_nm ?? null;
      const bearingText = valid ? `${String(Math.round(bearing!) % 360).padStart(3, '0')}°` : '—';
      const context = reviewing ? 'CURRENT GPS / REVIEW POSITION' : 'CURRENT GPS';
      const targetText = `${gpsTarget.id} · ${gpsTarget.name}`;
      const description = `${context}, ${targetText}, ${gpsTarget.source_label}, true bearing ${bearingText}, GPS geographic distance ${distance === null ? 'unavailable' : distance.toFixed(1) + ' nautical miles'}, not DME; current target is not recorded; no autopilot coupling`;
      bearingRoot.dataset.valid = String(valid); bearingRoot.dataset.recorded = String(reviewing);
      bearingRoot.dataset.targetId = gpsTarget.id;
      bearingRoot.dataset.bearingTrueDeg = bearing === null ? '' : String(bearing);
      bearingRoot.dataset.distanceNm = distance === null ? '' : String(distance);
      bearingRoot.dataset.dmeNm = ''; bearingRoot.dataset.dmeValid = 'false';
      bearingCard.toggleAttribute('hidden', heading === null);
      if (heading !== null) bearingCard.setAttribute('transform', `rotate(${-heading} 120 120)`);
      bearingPointer.toggleAttribute('hidden', !valid); bearingFlag.toggleAttribute('hidden', valid);
      if (valid) bearingPointer.setAttribute('transform', `rotate(${bearing! - heading!} 120 120)`);
      bearingRoot.querySelector<HTMLOutputElement>('#bearing-true')!.value = bearingText;
      bearingRoot.querySelector<HTMLOutputElement>('#bearing-dme')!.value = distance === null ? '—' : distance.toFixed(1);
      bearingRoot.querySelector('.nav-unit-reference')!.textContent = 'GPS · TRUE';
      const compact = (label: string) => label.length > 24 ? label.slice(0, 23) + '…' : label;
      bearingRoot.querySelector('.bearing-gps-id')!.textContent = compact(gpsTarget.id);
      bearingRoot.querySelector('.bearing-gps-name')!.textContent = compact(gpsTarget.name);
      bearingRoot.querySelector('.bearing-gps-context')!.textContent = context;
      bearingRoot.querySelector<HTMLElement>('#bearing-note')!.textContent = `${context} · ${targetText}`;
      bearingRoot.title = description;
      bearingRoot.setAttribute('aria-label', description);
      bearingRoot.querySelector('svg')!.setAttribute('aria-label', description);
      bearingRoot.querySelector('svg > title')!.textContent = description;
    } else {
      delete bearingRoot.dataset.targetId; delete bearingRoot.dataset.distanceNm;
      bearingRoot.querySelectorAll('.bearing-gps-labels text').forEach(label => { label.textContent = ''; });
      bearingRoot.removeAttribute('title');
      bearingRoot.setAttribute('aria-label', 'NAV1 VOR-derived true bearing teaching aid and independent DME');
      bearingRoot.querySelector('svg > title')!.textContent = 'NAV1 VOR-derived true bearing teaching aid and independent DME, not ADF/NDB reception';
      const bearing = config ? bearingDistanceIndication(config, state, 1) : null;
      const validBearing = bearing?.valid === true && heading !== null;
      bearingRoot.dataset.valid = String(validBearing); bearingRoot.dataset.recorded = String(reviewing);
      bearingRoot.dataset.bearingTrueDeg = bearing?.bearing_true_deg === null || bearing?.bearing_true_deg === undefined ? '' : String(bearing.bearing_true_deg);
      const dmeValid = bearing?.dme_valid === true && bearing.dme_nm !== null && Number.isFinite(bearing.dme_nm);
      bearingRoot.dataset.dmeNm = dmeValid ? String(bearing!.dme_nm) : ''; bearingRoot.dataset.dmeValid = String(dmeValid);
      bearingCard.toggleAttribute('hidden', heading === null);
      if (heading !== null) bearingCard.setAttribute('transform', `rotate(${-heading} 120 120)`);
      bearingPointer.toggleAttribute('hidden', !validBearing); bearingFlag.toggleAttribute('hidden', validBearing);
      if (validBearing) bearingPointer.setAttribute('transform', `rotate(${bearing.bearing_true_deg! - heading!} 120 120)`);
      const bearingText = validBearing ? `${String(Math.round(bearing.bearing_true_deg!) % 360).padStart(3, '0')}°` : '—';
      bearingRoot.querySelector<HTMLOutputElement>('#bearing-true')!.value = bearingText;
      bearingRoot.querySelector<HTMLOutputElement>('#bearing-dme')!.value = dmeValid ? bearing!.dme_nm!.toFixed(1) : '—';
      bearingRoot.querySelector('.nav-unit-reference')!.textContent = `${bearing?.station_id ?? 'NAV1'} · TRUE AID`;
      bearingRoot.querySelector<HTMLElement>('#bearing-note')!.textContent = `${reviewing ? 'RECORDED · ' : ''}${bearing?.reason ?? 'Radio configuration unavailable'}`;
      bearingRoot.querySelector('svg')!.setAttribute('aria-label', `NAV1 ${bearing?.station_id ?? 'unidentified'}, ${bearing?.source_label ?? 'source unavailable'}, VOR-derived true bearing teaching aid ${bearingText}, DME ${dmeValid ? bearing!.dme_nm!.toFixed(1) + ' nautical miles indicated' : 'unavailable'}, not ADF/NDB reception${reviewing ? ', recorded' : ''}`);
    }
    const rpm = state && typeof state.prop_radps === 'number' && Number.isFinite(state.prop_radps) && state.prop_radps >= 0 ? state.prop_radps * 60 / (2 * Math.PI) : null;
    const validRpm = rpm !== null && Number.isFinite(rpm);
    rpmRoot.dataset.valid = String(validRpm); rpmRoot.dataset.recorded = String(reviewing);
    rpmRoot.dataset.rpm = validRpm ? String(rpm) : '';
    rpmPointer.toggleAttribute('hidden', !validRpm); rpmRoot.querySelector('.rpm-unavailable')!.toggleAttribute('hidden', validRpm);
    if (validRpm) rpmPointer.setAttribute('transform', `rotate(${-135 + Math.min(3000, rpm) / 3000 * 270} 120 120)`);
    rpmRoot.querySelector<HTMLOutputElement>('#rpm-value')!.value = validRpm ? String(Math.round(rpm)) : '—';
    rpmRoot.querySelector('svg')!.setAttribute('aria-label', validRpm ? `Actual propeller ${Math.round(rpm)} RPM${rpm > 3000 ? ', above dial scale' : ''}; model maximum reference ${C172X_MAX_RPM}${reviewing ? ', recorded' : ''}` : 'Actual propeller RPM unavailable');
  }
  update(null, false, false);
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true; canAdjust = false; stopInteraction();
      content.removeEventListener('click', click);
      content.removeEventListener('pointerdown', pointerDown); content.removeEventListener('pointermove', pointerMove);
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) content.removeEventListener(event, pointerStop);
      content.removeEventListener('keydown', key); content.removeEventListener('focusout', focusOut);
      window.removeEventListener('blur', stopInteraction); document.removeEventListener('visibilitychange', visibility);
      opener.removeEventListener('click', open); done.removeEventListener('click', finish);
      dialog.removeEventListener('close', close); media.removeEventListener('change', layout);
      if (dialog.open) dialog.close(); dialog.remove(); opener.remove(); container.replaceChildren();
    },
  };
}
