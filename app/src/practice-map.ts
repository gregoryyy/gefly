/// <reference types="vite/client" />
import { LngLatBounds, Map as LibreMap, Marker, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './practice-map.css';
import { makePracticeMapFrame, type PracticeMapFrame } from './practice-map-data';
import { loadAirportCatalogue, type Airport } from './airport-catalogue';
import type { FlightState } from './types';

export interface PracticeMap {
  update(state: Readonly<FlightState>, path: readonly Readonly<FlightState>[], mode: 'live' | 'review'): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

interface MapOptions {
  container: HTMLElement;
  onClose: () => void;
  onInteraction: () => void;
}

/** A visual aid only; airport data is community maintained and not a chart. */
export async function createPracticeMap(options: MapOptions): Promise<PracticeMap> {
  const { container, onClose, onInteraction } = options;
  container.classList.add('practice-map-panel');
  container.setAttribute('aria-label', 'Practice map');
  const header = document.createElement('div');
  header.className = 'practice-map-heading';
  const title = document.createElement('strong');
  title.textContent = 'PRACTICE MAP';
  const modeLabel = document.createElement('span');
  modeLabel.className = 'practice-map-mode';
  modeLabel.textContent = 'Live';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close practice map');
  header.append(title, modeLabel, close);

  const viewport = document.createElement('div');
  viewport.className = 'practice-map-viewport';
  viewport.setAttribute('aria-label', 'North-up aerial imagery and recorded flight path');
  const status = document.createElement('p');
  status.className = 'practice-map-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading map…';
  const toolbar = document.createElement('div');
  toolbar.className = 'practice-map-toolbar';
  const buttons = ['−', '+', 'Fit path', 'Fit region', 'Follow'].map((label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = true;
    toolbar.append(button);
    return button;
  });
  const [zoomOut, zoomIn, fit, fitRegion, follow] = buttons;
  zoomOut.setAttribute('aria-label', 'Zoom map out');
  zoomIn.setAttribute('aria-label', 'Zoom map in');
  follow.setAttribute('aria-pressed', 'true');
  const readout = document.createElement('p');
  readout.className = 'practice-map-readout';
  readout.textContent = 'Waiting for aircraft position';
  const legend = document.createElement('p');
  legend.className = 'practice-map-legend';
  legend.textContent = 'Whole retained path · Following aircraft · North up';
  const credit = document.createElement('p');
  credit.className = 'practice-map-credit';
  credit.innerHTML = 'Map: © <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026), <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a>, <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_topplusopen.html" target="_blank" rel="noopener noreferrer">Sources</a> · Imagery: HVBG (DL-DE Zero 2.0), © Bayerische Vermessungsverwaltung (2026, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>), Datenquelle: <a href="https://www.lgl-bw.de" target="_blank" rel="noopener noreferrer">LGL-BW</a> (2026, <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a>) · Airports: OurAirports, public domain';
  const caption = document.createElement('p');
  caption.className = 'practice-map-caption';
  caption.textContent = 'Practice map · not a navigation chart';
  const airportsSection = document.createElement('details');
  airportsSection.className = 'practice-map-airports';
  const summary = document.createElement('summary');
  summary.textContent = 'Airports';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search name, code or type';
  search.setAttribute('aria-label', 'Search airports');
  const airportStatus = document.createElement('p');
  airportStatus.textContent = 'Loading airport catalogue…';
  airportStatus.setAttribute('role', 'status');
  const airportList = document.createElement('div');
  airportList.className = 'practice-map-airport-list';
  const airportDetail = document.createElement('p');
  airportDetail.className = 'practice-map-airport-detail';
  airportDetail.setAttribute('aria-live', 'polite');
  airportsSection.append(summary, search, airportStatus, airportList, airportDetail);
  container.replaceChildren(header, viewport, status, toolbar, readout, legend, airportsSection, credit, caption);

  let map: LibreMap | undefined;
  let aircraft: Marker | undefined;
  let start: Marker | undefined;
  let frame: PracticeMapFrame | undefined;
  let visible = !container.hidden;
  let ready = false;
  let disposed = false;
  let following = true;
  let failed = false;
  const airportMarkers: Marker[] = [];
  let airports: Airport[] = [];
  const selectAirport = (airport: Airport) => {
    setFollowing(false);
    map?.jumpTo({ center: [airport.lon, airport.lat], zoom: Math.max(map.getZoom(), 11) });
    const elevation = airport.elevation_ft === null ? 'Elevation unavailable' : `Elevation ${airport.elevation_ft} ft (${(airport.elevation_ft * 0.3048).toFixed(0)} m)`;
    airportDetail.textContent = `${airport.name} · ${airport.id}${airport.icao ? ` · ICAO ${airport.icao}` : ''}${airport.local ? ` · local ${airport.local}` : ''} · ${airport.type.replace('_', ' ')} · ${airport.lat.toFixed(5)}° N, ${airport.lon.toFixed(5)}° E · ${elevation}. OurAirports community data; not a navigation chart.`;
    airportsSection.open = true;
    onInteraction();
  };
  const renderAirports = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = airports.filter((a) => `${a.name} ${a.id} ${a.icao} ${a.local} ${a.type.replace('_', ' ')}`.toLocaleLowerCase().includes(query));
    airportList.replaceChildren();
    matches.forEach((airport) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${airport.id} · ${airport.name}`;
      button.addEventListener('click', () => selectAirport(airport));
      airportList.append(button);
    });
    airportStatus.textContent = `${matches.length} of ${airports.length} airports · community data, not a chart`;
  };
  search.addEventListener('input', renderAirports);
  // Keep map and search keyboard gestures away from flight-control shortcuts.
  const stopKey = (event: KeyboardEvent) => event.stopPropagation();
  container.addEventListener('pointerdown', onInteraction);
  container.addEventListener('focusin', onInteraction);
  container.addEventListener('keydown', stopKey);
  container.addEventListener('keyup', stopKey);
  const abort = new AbortController();
  const removers: Array<() => void> = [];
  const listen = (button: HTMLButtonElement, callback: () => void) => {
    const handler = () => { callback(); onInteraction(); };
    button.addEventListener('click', handler);
    removers.push(() => button.removeEventListener('click', handler));
  };
  listen(close, onClose);

  function setFollowing(value: boolean): void {
    following = value;
    follow.setAttribute('aria-pressed', String(value));
    legend.textContent = `Whole retained path · ${value ? 'Following aircraft' : 'Fit view · press Follow to recenter'} · North up`;
  }

  function paint(): void {
    if (!visible || !ready || !map || !frame || disposed) return;
    (map.getSource('recorded-path') as GeoJSONSource).setData({
      type: 'FeatureCollection', features: frame.path.length < 2 ? [] : [{
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: frame.path },
      }],
    });
    aircraft!.setLngLat(frame.position).setRotation(frame.heading_deg).addTo(map);
    if (frame.path.length) start!.setLngLat(frame.path[0]).addTo(map);
    else start!.remove();
    if (following) map.jumpTo({ center: frame.position });
  }

  listen(zoomOut, () => { if (map) map.jumpTo({ zoom: Math.max(map.getMinZoom(), map.getZoom() - 1) }); });
  listen(zoomIn, () => { if (map) map.jumpTo({ zoom: Math.min(map.getMaxZoom(), map.getZoom() + 1) }); });
  listen(fit, () => {
    if (!map || !frame) return;
    const coordinates = frame.path.length ? frame.path : [frame.position];
    const bounds = new LngLatBounds(coordinates[0], coordinates[0]);
    coordinates.forEach((coordinate) => bounds.extend(coordinate));
    bounds.extend(frame.position);
    setFollowing(false);
    map.fitBounds(bounds, { padding: 34, maxZoom: 15, duration: 0 });
  });
  listen(fitRegion, () => { if (map) { setFollowing(false); map.fitBounds([[8, 49], [10, 50.75]], { padding: 24, duration: 0 }); } });
  listen(follow, () => { setFollowing(true); paint(); });
  const observer = new ResizeObserver(() => { if (visible && !disposed) map?.resize(); });
  observer.observe(viewport);

  const controller: PracticeMap = {
    update(state, path, mode) {
      if (disposed) return;
      try {
        frame = makePracticeMapFrame(state, path);
        modeLabel.textContent = mode === 'review' ? 'Recorded review' : 'Live';
        const [longitude_deg, latitude_deg] = frame.position;
        readout.textContent = `${Math.abs(latitude_deg).toFixed(4)}° ${latitude_deg < 0 ? 'S' : 'N'}  ${Math.abs(longitude_deg).toFixed(4)}° ${longitude_deg < 0 ? 'W' : 'E'}  ·  ${(Math.round(frame.heading_deg) % 360).toString().padStart(3, '0')}° true`;
        if (ready && !failed) status.hidden = true;
        paint();
      } catch {
        status.hidden = false;
        status.textContent = 'Map position unavailable: invalid flight state.';
      }
    },
    setVisible(value) {
      if (disposed) return;
      visible = value;
      container.hidden = !value;
      if (value) { map?.resize(); paint(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      observer.disconnect();
      removers.forEach((remove) => remove());
      container.removeEventListener('pointerdown', onInteraction);
      container.removeEventListener('focusin', onInteraction);
      container.removeEventListener('keydown', stopKey);
      container.removeEventListener('keyup', stopKey);
      airportMarkers.forEach((marker) => marker.remove());
      aircraft?.remove();
      start?.remove();
      map?.remove();
      container.replaceChildren();
    },
  };

  try {
    const style: StyleSpecification = {
      version: 8,
      sources: {
        basemap: { type: 'raster', tiles: ['/scenery/map/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 5, maxzoom: 16 },
        imagery: { type: 'raster', tiles: ['/scenery/imagery/{z}/{x}/{y}.png'], tileSize: 512, minzoom: 7, maxzoom: 15, bounds: [8, 49, 10, 50.75] },
        'recorded-path': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#162530' } },
        { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 0 } },
        { id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-fade-duration': 0 } },
        { id: 'path-shadow', type: 'line', source: 'recorded-path', paint: { 'line-color': '#10212c', 'line-width': 5 } },
        { id: 'path', type: 'line', source: 'recorded-path', paint: { 'line-color': '#f3c676', 'line-width': 2.5 } },
      ],
    };
    if (disposed) return controller;
    // MapLibre's relative default worker URL is invalid after Vite prebundling.
    // Let Vite emit the worker and its dependencies for development and builds.
    setWorkerUrl(mapWorkerUrl);
    map = new LibreMap({
      container: viewport, style, center: [8.64, 49.9625], zoom: 13,
      minZoom: 7, maxZoom: 17, interactive: true, attributionControl: false,
      renderWorldCopies: false, maxPitch: 0, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.on('dragstart', () => { setFollowing(false); onInteraction(); });
    map.on('zoomstart', (event) => { if (event.originalEvent) { setFollowing(false); onInteraction(); } });
    void loadAirportCatalogue(abort.signal).then((data) => {
      if (disposed || !map) return;
      airports = data;
      renderAirports();
      for (const airport of airports) {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'practice-map-airport-marker';
        marker.textContent = airport.icao || airport.id;
        marker.setAttribute('aria-label', `Select ${airport.name}`);
        marker.addEventListener('click', (event) => { event.stopPropagation(); selectAirport(airport); });
        airportMarkers.push(new Marker({ element: marker }).setLngLat([airport.lon, airport.lat]).addTo(map));
      }
    }).catch(() => { if (!disposed) airportStatus.textContent = 'Airport catalogue unavailable.'; });
    const arrow = document.createElement('div');
    arrow.className = 'practice-map-aircraft';
    arrow.textContent = '▲';
    arrow.setAttribute('aria-label', 'Aircraft position and true heading');
    aircraft = new Marker({ element: arrow, rotationAlignment: 'map' });
    const origin = document.createElement('div');
    origin.className = 'practice-map-start';
    origin.textContent = 'Trace start';
    start = new Marker({ element: origin, anchor: 'left', offset: [5, 0] });
    map.on('error', () => {
      if (disposed) return;
      failed = true;
      status.hidden = false;
      status.textContent = 'Map imagery unavailable. Flight controls remain available.';
    });
    map.on('load', () => {
      if (disposed) return;
      ready = true;
      status.hidden = !failed;
      buttons.forEach((button) => { button.disabled = false; });
      paint();
    });
  } catch {
    if (!disposed) {
      status.textContent = 'Practice map unavailable. Flight controls remain available.';
      status.hidden = false;
    }
  }
  return controller;
}
