import { validFrequency, type RadioKind, type RadioReceiver } from './radio-nav';
import './map-point-popup.css';
import type { ApproachGuide } from './approach-guide.ts';

export interface MapPoint {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly airport_type?: string;
  readonly lon_deg: number;
  readonly lat_deg: number;
  readonly source_label: string;
  readonly equipment?: string;
  readonly world_record_id?: string;
  readonly details?: readonly string[];
  readonly approach_guides?: readonly ApproachGuide[];
  readonly frequencies?: readonly { readonly kind: RadioKind; readonly channel_khz: number; readonly label: string }[];
}
export interface MapPointActions {
  currentApproachGuide?: Readonly<ApproachGuide> | null;
  onApproachGuide?(guide: ApproachGuide | null): void;
  canTune(): boolean;
  onTune(kind: RadioKind, receiver: RadioReceiver, channel_khz: number): void;
  /** A visual map target/bearing; this does not command aircraft guidance. */
  onGpsTarget(point: Readonly<MapPoint>): void;
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
  const coordinate = (value: number, positive: string, negative: string) => `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;
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
      group.append(node('p', `Shown: ${current.airportName} · runway ${current.runwayIdent}${current.displaced_threshold_ft === null ? ' · runway-end approximation; displacement unknown' : ''}`));
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
    if (tunable) for (const receiver of [1, 2] as const) {
      const button = node('button', `${frequency.kind.toUpperCase()}${receiver} standby`);
      button.type = 'button'; button.disabled = !actions.canTune();
      button.dataset.radioKind = frequency.kind; button.dataset.receiver = String(receiver);
      button.dataset.channelKhz = String(frequency.channel_khz);
      button.addEventListener('click', () => {
        if (actions.canTune()) actions.onTune(frequency.kind, receiver, frequency.channel_khz);
      });
      controls.append(button);
    }
    else controls.append(node('small', 'Tuning unavailable'));
    row.append(controls); section.append(row);
  }
  const target = node('button', 'GPS target'); target.type = 'button'; target.disabled = !validPosition;
  target.className = 'map-point-popup-target'; target.title = 'Set a visual map target and bearing';
  target.addEventListener('click', () => { if (validPosition) actions.onGpsTarget(point); });
  section.append(target); return section;
}
