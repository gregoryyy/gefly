import type { Airport } from './airport-catalogue.ts';
import { filterAirportComStations, isComChannel } from './airport-com.ts';
import type { AirportComDirectory } from './airport-com.ts';
import './airport-com-panel.css';

export interface AirportComPanelOptions {
  airports: readonly Airport[];
  directory: AirportComDirectory;
  onTune: (receiver: 1 | 2, channel_khz: number) => void;
  onSelectAirport: (id: string) => void;
}

/** A map-owned directory; selecting only loads standby, never swaps or creates an ATC service. */
export function createAirportComPanel(options: AirportComPanelOptions) {
  const element = document.createElement('details'); element.className = 'airport-com';
  const summary = document.createElement('summary'); summary.textContent = 'Airport COM'; element.append(summary);
  const filters = document.createElement('div'); filters.className = 'airport-com-filters';
  const query = document.createElement('input'); query.type = 'search'; query.placeholder = 'Airport / service'; query.setAttribute('aria-label', 'Search COM airports and services');
  const service = document.createElement('select'); service.setAttribute('aria-label', 'COM service');
  for (const value of ['', ...new Set(options.directory.stations.map(s => s.service.toUpperCase()))].sort()) {
    const option = document.createElement('option'); option.value = value; option.textContent = value || 'All services'; service.append(option);
  }
  const nearby = document.createElement('input'); nearby.type = 'checkbox'; nearby.disabled = true;
  const nearLabel = document.createElement('label'); nearLabel.append(nearby, document.createTextNode('Within 50 NM'));
  const selected = document.createElement('button'); selected.type = 'button'; selected.hidden = true;
  selected.title = 'Clear selected airport and show all airports';
  const status = document.createElement('p'); status.className = 'airport-com-status'; status.setAttribute('role', 'status');
  const results = document.createElement('div'); results.className = 'airport-com-results';
  const credits = document.createElement('p'); credits.className = 'airport-com-credits';
  credits.textContent = `OurAirports · ${options.directory.retrieved} snapshot · Not operational/current. Standby only; no ATC audio. Missing data means unknown.`;
  filters.append(query, service, nearLabel, selected); element.append(filters, status, results, credits);
  let airportId = ''; let enabled = true; let position: { lat: number; lon: number } | undefined; let lastPaintKey = '';
  const byId = new Map(options.airports.map(a => [a.id, a]));
  const render = () => {
    const stations = filterAirportComStations(options.directory.stations, options.airports, {
      airportId, query: query.value, service: service.value, position, nearby_nm: nearby.checked ? 50 : undefined,
    });
    const key = `${enabled}|${stations.map(s => s.id).join(',')}`;
    status.textContent = stations.length ? `${stations.length} station${stations.length === 1 ? '' : 's'}${stations.length > 80 ? ' · first 80 shown; filter to narrow' : ''}` : 'No matching COM data in this snapshot.';
    if (key === lastPaintKey) return; lastPaintKey = key; results.replaceChildren();
    for (const station of stations.slice(0, 80)) {
      const a = byId.get(station.airport_id)!; const row = document.createElement('div'); row.className = 'airport-com-row';
      const select = document.createElement('button'); select.type = 'button'; select.className = 'airport-com-airport';
      const valid = isComChannel(station.channel_khz) && Math.abs(Number(station.source_frequency_mhz) * 1000 - station.channel_khz) < 1e-6;
      select.textContent = `${a.icao || a.id} · ${station.service} · ${valid ? (station.channel_khz / 1000).toFixed(3) : station.source_frequency_mhz}`;
      select.title = `${a.name} — ${station.description || station.service}`; select.onclick = () => options.onSelectAirport(a.id);
      const description = document.createElement('small'); description.textContent = station.description || a.name;
      const tuning = document.createElement('span'); tuning.className = 'airport-com-tuning';
      for (const receiver of [1, 2] as const) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = `COM${receiver} STBY`;
        button.disabled = !enabled || !valid; button.title = valid ? `Load ${(station.channel_khz / 1000).toFixed(3)} into COM${receiver} standby; swap on radio to activate` : 'Source value unavailable on this VHF tuner; retained without rounding';
        button.onclick = () => { if (enabled && valid) options.onTune(receiver, station.channel_khz); }; tuning.append(button);
      }
      if (!valid) { const note = document.createElement('small'); note.textContent = 'Channel unavailable'; tuning.append(note); }
      row.append(select, description, tuning); results.append(row);
    }
  };
  const outside = (event: PointerEvent) => { if (element.open && event.target instanceof Node && !element.contains(event.target)) element.open = false; };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && element.open) { element.open = false; event.preventDefault(); event.stopPropagation(); } };
  document.addEventListener('pointerdown', outside, true); element.addEventListener('keydown', escape);
  query.addEventListener('input', render); service.addEventListener('change', render); nearby.addEventListener('change', render);
  selected.onclick = () => { airportId = ''; selected.hidden = true; render(); };
  render();
  return {
    element,
    selectAirport(id: string) {
      airportId = id; selected.hidden = !id; selected.textContent = `${id} ×`; query.value = ''; service.value = ''; nearby.checked = false;
      element.open = true; render();
    },
    updatePosition(lat: number, lon: number) {
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      position = { lat, lon }; nearby.disabled = false; if (element.open) render();
    },
    setEnabled(value: boolean) { enabled = value; render(); },
    dispose() { document.removeEventListener('pointerdown', outside, true); element.removeEventListener('keydown', escape); element.remove(); },
  };
}
