import type { PlanRole, PlanResult } from './map-flight-plan-types';
import { validFrequency, type RadioKind, type RadioReceiver } from './radio-nav';
import './map-point-popup.css';
import type { ApproachGuide } from './approach-guide.ts';

export type MapLaunchHeightFt = 0 | 1000 | 5000 | 10000;
export interface MapFlyFromActions {
  canFlyFrom?(): boolean;
  onFlyFrom?(position: { lat_deg: number; lon_deg: number }, height_ft: MapLaunchHeightFt): void;
}
const flightAvailability = new WeakMap<HTMLElement, () => void>();
const coordinate = (value: number, positive: string, negative: string) => `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;
/** Refresh availability without rebuilding a popup or losing its height choice. */
export function refreshMapPopupFlightAvailability(popup: HTMLElement): void { flightAvailability.get(popup)?.(); }

function appendFlyFrom(section: HTMLElement, input: { lat_deg: number; lon_deg: number }, actions: MapFlyFromActions): void {
  if (!actions.onFlyFrom) return;
  const valid = Number.isFinite(input.lat_deg) && Math.abs(input.lat_deg) < 89.5 && Number.isFinite(input.lon_deg);
  const position = { lat_deg: input.lat_deg, lon_deg: ((input.lon_deg + 180) % 360 + 360) % 360 - 180 };
  const group = document.createElement('fieldset'); group.className = 'map-fly-from';
  const legend = document.createElement('legend'); legend.textContent = 'Start a new flight here';
  const label = document.createElement('label'); label.textContent = 'Launch height';
  const height = document.createElement('select'); height.setAttribute('aria-label', 'Launch height above ground');
  for (const [value, text] of [[0, 'Ground'], [1000, '1,000 ft AGL'], [5000, '5,000 ft AGL'], [10000, '10,000 ft AGL']] as const) {
    const option = document.createElement('option'); option.value = String(value); option.textContent = text; height.append(option);
  }
  label.append(height);
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Fly from here';
  const note = document.createElement('small');
  note.textContent = 'Repositions the aircraft. Ground starts stopped; airborne heights use terrain at this point. AGL means above ground.';
  const update = () => { height.disabled = button.disabled = !valid || !(actions.canFlyFrom?.() ?? true); };
  button.addEventListener('click', () => {
    update();
    if (button.disabled || !['0', '1000', '5000', '10000'].includes(height.value)) return;
    actions.onFlyFrom?.({ ...position }, Number(height.value) as MapLaunchHeightFt);
  });
  flightAvailability.set(section, update); update();
  group.append(legend, label, button, note); section.append(group);
}

export interface MapPoint {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly airport_type?: string;
  readonly lon_deg: number;
  readonly lat_deg: number;
  readonly source_label: string;
  readonly equipment?: string;
  readonly custom?: true;
  readonly world_record_id?: string;
  readonly details?: readonly string[];
  readonly approach_guides?: readonly ApproachGuide[];
  readonly frequencies?: readonly { readonly kind: RadioKind; readonly channel_khz: number; readonly label: string }[];
}

/** A coordinate menu has no point identity until the user explicitly creates it. */
export function createMapLocationPopup(position: { lon_deg: number; lat_deg: number }, actions: {
  onCreateFix(): PlanResult<unknown>;
  onAddWaypoint(): PlanResult<unknown>;
  onCancel(): void;
} & MapFlyFromActions): HTMLElement {
  const section = document.createElement('section'); section.className = 'map-point-popup map-location-popup';
  section.setAttribute('aria-label', 'Map location');
  const heading = document.createElement('strong'); heading.textContent = 'Map location';
  const coordinates = document.createElement('p');
  coordinates.textContent = `${coordinate(position.lat_deg, 'N', 'S')}, ${coordinate(position.lon_deg, 'E', 'W')}`;
  const note = document.createElement('p'); note.className = 'map-point-popup-source';
  note.textContent = 'GPS fix and waypoint actions only edit the current plan; they do not move the aircraft or tune radios. Fly from here separately starts a new flight.';
  const error = document.createElement('p'); error.setAttribute('role', 'alert'); error.hidden = true;
  const controls = document.createElement('div'); controls.className = 'map-location-popup-actions';
  for (const [label, action] of [['Create GPS fix', actions.onCreateFix], ['Add waypoint', actions.onAddWaypoint]] as const) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => { const result = action(); error.textContent = result.ok ? '' : result.error; error.hidden = result.ok; });
    controls.append(button);
  }
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
  cancel.addEventListener('click', actions.onCancel); controls.append(cancel);
  section.append(heading, coordinates, note, controls, error);
  appendFlyFrom(section, position, actions);
  return section;
}
export interface MapPointActions extends MapFlyFromActions {
  currentApproachGuide?: Readonly<ApproachGuide> | null;
  onApproachGuide?(guide: ApproachGuide | null): void;
  canTune(): boolean;
  onTune(kind: RadioKind, receiver: RadioReceiver, channel_khz: number): boolean;
  /** A visual map target/bearing; this does not command aircraft guidance. */
  onGpsTarget(point: Readonly<MapPoint>): void;
  onPlanPoint?(point: Readonly<MapPoint>, role: PlanRole): void;
  onDeleteFix?(point: Readonly<MapPoint>): PlanResult<unknown>;
}

/** Inert source text and standby-only actions; no radio or aircraft state lives here. */
export function createMapPointPopup(input: Readonly<MapPoint>, actions: MapPointActions): HTMLElement {
  const point: Readonly<MapPoint> = Object.freeze({ ...input,
    frequencies: Object.freeze((input.frequencies ?? []).slice(0, 32).map(frequency => Object.freeze({ ...frequency }))) });
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
    const element = document.createElement(tag); if (text !== undefined) element.textContent = text; return element;
  };
  const section = node('section'); section.className = 'map-point-popup';
  section.setAttribute('aria-label', 'Selected map point'); section.dataset.pointId = point.id;
  section.append(node('strong', point.name === point.id ? point.id : `${point.id} · ${point.name}`));
  const validPosition = Number.isFinite(point.lat_deg) && Math.abs(point.lat_deg) <= 90
    && Number.isFinite(point.lon_deg) && Math.abs(point.lon_deg) <= 180;
  section.append(node('p', `${point.kind} · ${validPosition
    ? `${coordinate(point.lat_deg, 'N', 'S')}, ${coordinate(point.lon_deg, 'E', 'W')}` : 'Coordinates unavailable'}`));
  const source = node('p', point.source_label); source.className = 'map-point-popup-source'; section.append(source);
  for (const detail of (point.details ?? []).slice(0, 12)) section.append(node('p', detail));
  if (point.kind === 'airport' && actions.onApproachGuide) {
    const group = node('fieldset'); group.className = 'map-approach-guide';
    group.append(node('legend', '3° approach guide'));
    const guides = point.approach_guides ?? [];
    const current = actions.currentApproachGuide;
    if (current) {
      group.append(node('p', `Shown: ${current.airportName} · runway ${current.runwayIdent}${current.displaced_threshold_ft === null ? ' · runway-end approximation; displacement unknown' : ''} · terrain-height approximation`));
      const source = node('p', current.source); source.className = 'map-point-popup-source'; group.append(source);
      const hide = node('button', 'Hide 3° guide'); hide.type = 'button';
      hide.addEventListener('click', () => actions.onApproachGuide?.(null)); group.append(hide);
    }
    if (guides.length) {
      const label = node('label', 'Runway direction');
      const select = node('select'); select.setAttribute('aria-label', 'Approach runway direction');
      for (const [index, guide] of guides.entries()) {
        const option = node('option', `${guide.runwayIdent}${guide.displaced_threshold_ft === null ? ' · displacement unknown' : ''}`);
        option.value = String(index); select.append(option);
        if (current?.airportId === guide.airportId && current.runwayIdent === guide.runwayIdent
          && current.lat_deg === guide.lat_deg && current.lon_deg === guide.lon_deg) select.value = option.value;
      }
      label.append(select); group.append(label);
      const show = node('button', 'Show 3° guide'); show.type = 'button';
      show.addEventListener('click', () => { const guide = guides[Number(select.value)]; if (guide) actions.onApproachGuide?.({ ...guide }); });
      group.append(show);
    } else group.append(node('p', point.airport_type === 'closed' ? 'Airport marked closed in this snapshot.' : 'Suitable runway direction data unavailable for this airport.'));
    group.append(node('small', 'Illustrative only: not an instrument approach, ILS, or obstacle clearance.'));
    section.append(group);
  }
  const unsupported = /\b(?:NDB|TACAN)\b/i.test(`${point.kind} ${point.equipment ?? ''}`);
  const unique = new Set<string>();
  let lastTuning: { button: HTMLButtonElement; label: string; feedback: HTMLElement } | null = null;
  for (const frequency of point.frequencies ?? []) {
    if (unique.size >= 8) break;
    const key = `${frequency.kind}/${frequency.channel_khz}`; if (unique.has(key)) continue;
    unique.add(key);
    const row = node('div'); row.className = 'map-point-popup-channel';
    const supportedKind = frequency.kind === 'com' || frequency.kind === 'nav';
    const tunable = supportedKind && validFrequency(frequency.kind, frequency.channel_khz)
      && !(frequency.kind === 'nav' && unsupported);
    const channel = Number.isFinite(frequency.channel_khz)
      ? tunable ? `${(frequency.channel_khz / 1000).toFixed(3)} MHz` : `${frequency.channel_khz} kHz` : 'Channel unavailable';
    row.append(node('span', `${frequency.label} · ${channel}`));
    const controls = node('div'); controls.className = 'map-point-popup-tuning';
    const feedback = node('p'); feedback.className = 'map-point-popup-tuning-feedback';
    feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.hidden = true;
    if (tunable) for (const receiver of [1, 2] as const) {
      const label = `${frequency.kind.toUpperCase()}${receiver} standby`;
      const button = node('button', label);
      button.type = 'button'; button.disabled = !actions.canTune();
      button.dataset.radioKind = frequency.kind; button.dataset.receiver = String(receiver);
      button.dataset.channelKhz = String(frequency.channel_khz);
      button.addEventListener('click', () => {
        if (lastTuning) {
          lastTuning.button.classList.remove('is-loaded'); lastTuning.button.textContent = lastTuning.label;
          lastTuning.feedback.textContent = ''; lastTuning.feedback.hidden = true; lastTuning = null;
        }
        const accepted = actions.canTune() && actions.onTune(frequency.kind, receiver, frequency.channel_khz) === true;
        feedback.hidden = false; feedback.dataset.accepted = String(accepted);
        feedback.textContent = accepted
          ? `${point.id} · ${channel} sent to ${label}. Swap to activate.`
          : `${label} was not changed. Tuning is unavailable.`;
        if (accepted) { button.classList.add('is-loaded'); button.textContent = `✓ ${label}`; }
        lastTuning = { button, label, feedback };
      });
      controls.append(button);
    }
    else controls.append(node('small', 'Tuning unavailable'));
    row.append(controls, feedback); section.append(row);
  }
  const target = node('button', 'GPS target'); target.type = 'button'; target.disabled = !validPosition;
  target.className = 'map-point-popup-target'; target.title = 'Set a visual map target and bearing';
  target.addEventListener('click', () => { if (validPosition) actions.onGpsTarget(point); });
  section.append(target);
  if (actions.onPlanPoint) for (const [role, label] of [['start', 'Set start'], ['waypoint', 'Add waypoint'], ['destination', 'Set destination']] as const) {
    const button = node('button', label); button.type = 'button'; button.disabled = !validPosition;
    button.addEventListener('click', () => { if (validPosition) actions.onPlanPoint?.(point, role); });
    section.append(button);
  }
  const onDeleteFix = actions.onDeleteFix;
  if (point.custom && onDeleteFix) {
    const remove = node('button', 'Delete GPS fix'); remove.type = 'button';
    remove.className = 'map-point-popup-delete';
    const error = node('p'); error.setAttribute('role', 'alert'); error.hidden = true;
    remove.addEventListener('click', () => {
      const result = onDeleteFix(point);
      error.textContent = result.ok ? '' : result.error; error.hidden = result.ok;
    });
    section.append(remove, error);
  }
  appendFlyFrom(section, point, actions);
  return section;
}
