import type { MapPoint } from './map-point-popup';
import { distanceMeters } from './scenery-coverage';
import './map-point-search.css';
import { MAP_LOCATION_TYPES, mapLocationType, type MapLocationType } from './map-location-types';
export { MAP_LOCATION_TYPES, mapLocationType, type MapLocationType } from './map-location-types';

/** A bounded view of the source catalogue; selecting opens details, never tunes. */
export function createMapPointSearch(options: { initialTypes?: ReadonlySet<MapLocationType>; onSelect(point: Readonly<MapPoint>): void; onTypesChange?(types: ReadonlySet<MapLocationType>): void }): {
  element: HTMLElement;
  setPoints(points: readonly Readonly<MapPoint>[]): void;
  setPosition(lon_deg: number, lat_deg: number): void;
  dispose(): void;
} {
  const element = document.createElement('section'); element.className = 'map-point-search';
  element.setAttribute('aria-label', 'Map point directory');
  const controls = document.createElement('div'); controls.className = 'map-point-search-controls';
  const query = document.createElement('input'); query.type = 'search';
  query.placeholder = 'Airport, NAV, fix or frequency'; query.setAttribute('aria-label', 'Search map points');
  controls.append(query);
  const filters = document.createElement('fieldset'); filters.className = 'map-location-types';
  const legend = document.createElement('legend'); legend.textContent = 'Location types'; filters.append(legend);
  const selectedTypes = new Set<MapLocationType>(options.initialTypes ?? MAP_LOCATION_TYPES.map(([type]) => type));
  for (const [type, title] of MAP_LOCATION_TYPES) {
    const label = document.createElement('label'), checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.value = type; checkbox.checked = selectedTypes.has(type);
    label.append(checkbox, document.createTextNode(title)); filters.append(label);
  }
  const status = document.createElement('p'); status.className = 'map-point-search-status'; status.setAttribute('role', 'status');
  const list = document.createElement('ul'); list.className = 'map-point-search-list';
  element.append(controls, filters, status, list);
  type Entry = { point: Readonly<MapPoint>; category: MapLocationType; search: string };
  let entries: Entry[] = [], shown: readonly Entry[] = [], position: { lat: number; lon: number } | null = null, disposed = false;
  let rowsKey = '';
  const radians = Math.PI / 180;
  function render(): void {
    if (disposed) return;
    const text = query.value.trim().toLocaleLowerCase();
    const matches = entries.filter(entry => selectedTypes.has(entry.category) && (!text || entry.search.includes(text)));
    const distance = (entry: Entry) => position ? distanceMeters(position.lat, position.lon,
      entry.point.lat_deg * radians, entry.point.lon_deg * radians) : Infinity;
    matches.sort((a, b) => (!text && position ? distance(a) - distance(b) : 0)
      || a.point.id.localeCompare(b.point.id) || a.point.kind.localeCompare(b.point.kind) || a.point.name.localeCompare(b.point.name));
    // Refresh selection metadata even when the visible rows remain unchanged
    // (for example, when the airport COM directory arrives after the airports).
    shown = matches.slice(0, 40);
    const key = JSON.stringify(shown.map(({ point }) => [point.id, point.name, point.kind, point.airport_type, point.lon_deg, point.lat_deg]));
    if (key !== rowsKey) {
      rowsKey = key; list.replaceChildren();
      for (const [index, { point }] of shown.entries()) {
        const item = document.createElement('li'), button = document.createElement('button');
        button.type = 'button'; button.dataset.index = String(index); button.className = 'map-point-search-row';
        const id = document.createElement('strong'); id.textContent = point.id;
        const name = document.createElement('span'); name.textContent = point.name;
        const kind = document.createElement('small'); kind.textContent = point.airport_type?.replaceAll('_', ' ') ?? point.kind;
        button.append(id, name, kind); item.append(button); list.append(item);
      }
    }
    status.textContent = `${matches.length} matching · ${shown.length} shown${!text && position ? ' · nearest first' : ''}`;
  }
  const onInput = () => render();
  const onTypeChange = (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
    const type = MAP_LOCATION_TYPES.find(([type]) => type === input.value)?.[0];
    if (!type) return;
    if (input.checked) selectedTypes.add(type); else selectedTypes.delete(type);
    render(); options.onTypesChange?.(new Set(selectedTypes));
  };
  const onSelect = (event: MouseEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-index]') : null;
    if (disposed || !button || !list.contains(button)) return;
    const entry = shown[Number(button.dataset.index)]; if (entry) options.onSelect(entry.point);
  };
  query.addEventListener('input', onInput); filters.addEventListener('change', onTypeChange); list.addEventListener('click', onSelect);
  render();
  return {
    element,
    setPoints(points) {
      if (disposed) return;
      entries = points.map(input => {
        const point: Readonly<MapPoint> = Object.freeze({ ...input,
          frequencies: Object.freeze((input.frequencies ?? []).slice(0, 32).map(frequency => Object.freeze({ ...frequency }))) });
        const channels = point.frequencies?.map(f => `${f.label} ${f.channel_khz} ${(f.channel_khz / 1000).toFixed(3)}`).join(' ') ?? '';
        return { point, category: mapLocationType(point), search: `${point.id} ${point.name} ${point.kind} ${point.airport_type ?? ''} ${channels}`.toLocaleLowerCase() };
      });
      render();
    },
    setPosition(lon_deg, lat_deg) {
      if (disposed) return;
      position = Number.isFinite(lat_deg) && Math.abs(lat_deg) <= 90 && Number.isFinite(lon_deg) && Math.abs(lon_deg) <= 180
        ? { lat: lat_deg * radians, lon: lon_deg * radians } : null;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true; entries = []; shown = []; rowsKey = '';
      query.removeEventListener('input', onInput); filters.removeEventListener('change', onTypeChange); list.removeEventListener('click', onSelect);
      element.remove();
    },
  };
}
