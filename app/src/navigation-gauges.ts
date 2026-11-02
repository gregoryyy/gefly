import type { FlightState } from './types';
import { navigationIndication, validRadioNavSnapshot } from './radio-nav';
import './navigation-gauges.css';

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
const OBS_DRAG_PX_PER_DEG = 4;
const svgPoint = (radius: number, degrees: number): [number, number] => [
  120 + radius * Math.sin(degrees * DEG), 120 - radius * Math.cos(degrees * DEG),
];

/** Original compass-card artwork. Bearing/course geometry stays in radio-nav. */
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
    <text x="120" y="91" class="nav-unit-title">NAV${receiver} · ${receiver === 1 ? 'VOR / LOC' : 'VOR'}</text>
    <text x="120" y="104" class="nav-unit-reference">TRUE · DEMO LAB</text>
    <line x1="51" y1="123" x2="189" y2="123" class="nav-cdi-axis"/>
    ${Array.from({ length: 11 }, (_, i) => `<circle cx="${60 + i * 12}" cy="123" r="${i === 5 ? 3 : 2}" class="nav-cdi-dot"/>`).join('')}
    <g class="nav-cdi-needle" hidden><path d="M120 108v40"/></g>
    <g class="nav-warning-flag"><rect x="150" y="151" width="37" height="18" rx="2"/><text x="168.5" y="164">NAV</text></g>
    <g class="nav-to-from-symbol" hidden><path d="M91 151l-6 10h12z"/><text x="120" y="162">OFF</text></g>
    ${receiver === 1 ? '<g class="nav-gs-inop"><rect x="88.5" y="66" width="63" height="17" rx="2"/><text x="120" y="78">GS INOP</text></g>' : ''}
    <text x="120" y="210" class="nav-scale-label">5 DOTS = 10°</text>
  </svg>`;
}

/** Two independent LAB VOR-style displays; never invents an ILS/GS indication. */
export function createNavigationGauges(options: NavigationGaugesOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('navigation-gauges');
  container.setAttribute('aria-label', 'NAV1 and NAV2 true-reference teaching instruments');
  const opener = document.createElement('button');
  opener.id = 'navigation-open'; opener.type = 'button'; opener.className = 'navigation-open';
  opener.textContent = 'NAV instruments'; opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'navigation-dialog');
  const content = document.createElement('div');
  content.className = 'navigation-gauges-content';
  content.innerHTML = ([1, 2] as const).map(receiver => `<section id="nav${receiver}-gauge" class="navigation-gauge" data-receiver="${receiver}" aria-label="NAV${receiver} VOR teaching instrument">
    ${face(receiver)}
    <div class="navigation-obs-controls"><button type="button" id="nav${receiver}-gauge-obs-down" data-receiver="${receiver}" data-delta="-1" aria-label="Decrease NAV${receiver} OBS true course by one degree">−</button>
      <div class="navigation-obs-knob" tabindex="0" role="spinbutton" aria-label="NAV${receiver} OBS true course" aria-valuemin="0" aria-valuemax="359" title="Drag right/left to turn OBS. Arrow keys: 1 degree; Shift + arrow: 10 degrees."><span>OBS TRUE</span><output id="nav${receiver}-gauge-obs">—</output></div>
      <button type="button" id="nav${receiver}-gauge-obs-up" data-receiver="${receiver}" data-delta="1" aria-label="Increase NAV${receiver} OBS true course by one degree">+</button></div>
    <p id="nav${receiver}-gauge-note" class="navigation-gauge-note">Radio configuration unavailable</p>
  </section>`).join('');
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
      knob: root.querySelector<HTMLElement>('.navigation-obs-knob')!,
      obs: root.querySelector<HTMLOutputElement>('output')!,
      note: root.querySelector<HTMLElement>('.navigation-gauge-note')!,
    };
  });

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
    const degrees = elapsed_ms >= 2000 ? 5 : elapsed_ms >= 1000 ? 3 : 1;
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
    const total_deg = Math.trunc((event.clientX - interaction.startX) / OBS_DRAG_PX_PER_DEG);
    if (!Number.isSafeInteger(total_deg)) return;
    // Retain the entire pointer displacement, then send only its equivalent
    // course change. A captured 390-degree move must turn 30 degrees whether
    // the browser delivers one event or many; clamping loses that remainder.
    const delta_deg = (total_deg % 360 - interaction.applied_deg % 360) % 360;
    interaction.applied_deg = total_deg;
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

  function update(state: Readonly<FlightState> | null, reviewing: boolean, running: boolean): void {
    if (disposed) return;
    const config = state && validRadioNavSnapshot(state) ? state : null;
    canAdjust = !!config && running && !reviewing;
    if (!canAdjust) stopInteraction();
    container.dataset.mode = reviewing ? 'recorded' : 'live';
    content.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = !canAdjust; });
    dialog.querySelector('.navigation-dialog-note')!.textContent = reviewing ? 'Recorded NAV state · OBS controls are read-only.'
      : running ? 'Flight continues while this panel is open.' : 'Flight is paused.';
    for (const gauge of gauges) {
      const { receiver } = gauge;
      const obs = config ? (receiver === 1 ? config.radio_obs_deg : config.radio_obs2_deg) : null;
      const indication = config ? navigationIndication(config, state, receiver) : null;
      const valid = indication?.valid === true;
      gauge.root.dataset.valid = String(valid);
      gauge.obs.value = obs === null ? '—' : `${String(obs).padStart(3, '0')}°`;
      gauge.knob.setAttribute('aria-disabled', String(!canAdjust));
      gauge.knob.setAttribute('aria-valuetext', obs === null ? 'Unavailable' : `${obs} degrees TRUE${reviewing ? ', recorded' : ''}`);
      if (obs === null) gauge.knob.removeAttribute('aria-valuenow');
      else gauge.knob.setAttribute('aria-valuenow', String(obs));
      gauge.svg.dataset.obsEnabled = String(canAdjust);
      gauge.card.toggleAttribute('hidden', obs === null);
      if (obs !== null) gauge.card.setAttribute('transform', `rotate(${-obs} 120 120)`);
      gauge.needle.toggleAttribute('hidden', !valid);
      gauge.flag.toggleAttribute('hidden', valid);
      gauge.direction.toggleAttribute('hidden', !valid);
      if (valid) {
        gauge.needle.setAttribute('transform', `translate(${indication.cdi_norm! * 60} 0)`);
        gauge.direction.querySelector('text')!.textContent = indication.to_from;
        gauge.direction.querySelector('path')!.setAttribute('transform', indication.to_from === 'TO' ? '' : 'rotate(180 91 156)');
      }
      gauge.note.textContent = `${reviewing ? 'RECORDED · ' : ''}${indication?.reason ?? 'Radio configuration unavailable'}`;
      gauge.svg.setAttribute('aria-label', valid
        ? `NAV${receiver} fictional LAB, OBS ${obs} degrees TRUE, CDI ${(indication.cdi_norm! * 5).toFixed(1)} dots positive right, ${indication.to_from}${receiver === 1 ? ', glide slope inoperative' : ''}${reviewing ? ', recorded' : ''}`
        : `NAV${receiver} unavailable, NAV flag. ${indication?.reason ?? 'Radio configuration unavailable'}${receiver === 1 ? '. Glide slope inoperative' : ''}`);
    }
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
