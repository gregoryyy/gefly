/// <reference types="vite/client" />
import { createAirportPlayControls } from './airport-play-controls';
import { loadAirportComDirectory } from './airport-com';
import { createAirportComPanel } from './airport-com-panel';
import { LngLatBounds, Map as LibreMap, Marker, ScaleControl, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './practice-map.css';
import { makePracticeMapFrame, type PracticeMapFrame } from './practice-map-data';
import { AIRFIELD_BOUNDS, loadAirportCatalogue, type Airport } from './airport-catalogue';
import type { FlightState } from './types';
import { loadFlightMapCatalogue } from './flight-map-catalogue';
import type { FlightMapNavigation, FlightMapNavigationFeature } from './flight-map-navigation';

export interface PracticeMap {
  update(state: Readonly<FlightState>, path: readonly Readonly<FlightState>[], mode: 'live' | 'review'): void;
  setVisible(visible: boolean): void;
  setVector(enabled: boolean): void;
  toggleOverlap(): void;
  dispose(): void;
}

interface MapOptions {
  container: HTMLElement;
  onClose: () => void;
  onInteraction: () => void;
  onVectorChange?: (enabled: boolean) => void;
  onStartRunway?: (runway: string) => void;
  onStopExercise?: () => void;
  isExerciseActive?: () => boolean;
  canTuneCom?: () => boolean;
  onTuneCom?: (receiver: 1 | 2, channel_khz: number) => void;
}

/** A visual aid only; airport data is community maintained and not a chart. */
export async function createPracticeMap(options: MapOptions): Promise<PracticeMap> {
  const { container, onClose, onInteraction } = options;
  container.classList.add('practice-map-panel');
  container.setAttribute('aria-label', 'Flight map');
  const header = document.createElement('div');
  header.className = 'practice-map-heading';
  const title = document.createElement('strong');
  title.textContent = 'FLIGHT MAP';
  const modeLabel = document.createElement('span');
  modeLabel.className = 'practice-map-mode';
  modeLabel.textContent = 'Live';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close flight map');
  header.append(title, modeLabel, close);

  const viewport = document.createElement('div');
  viewport.className = 'practice-map-viewport';
  viewport.setAttribute('aria-label', 'North-up public map and recorded flight path');
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
  const overlap = document.createElement('button');
  overlap.type = 'button'; overlap.id = 'map-overlap'; overlap.textContent = 'Overlap cockpit · ,';
  overlap.setAttribute('aria-pressed', 'false'); overlap.setAttribute('aria-keyshortcuts', ',');
  overlap.title = 'Let the map extend over the cockpit; comma toggles this view';
  toolbar.append(overlap);
  const layers = document.createElement('div');
  layers.className = 'practice-map-layers';
  layers.setAttribute('role', 'group');
  layers.setAttribute('aria-label', 'Map layers');
  const layerButtons = ['Map', 'Aerial', 'NAV aids', 'Vector'].map((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = true;
    button.setAttribute('aria-label', ['Show public map', 'Show aerial imagery', 'Show navigation aids', 'Show vector map and terrain'][index]);
    button.setAttribute('aria-pressed', String(index === 0 || index === 2));
    layers.append(button);
    return button;
  });
  const [mapLayer, aerialLayer, navigationLayer, vectorLayer] = layerButtons;
  const navigationStatus = document.createElement('p');
  navigationStatus.className = 'practice-map-navigation-status';
  navigationStatus.setAttribute('role', 'status');
  navigationStatus.textContent = 'NAV · community snapshot + historical ILS · loading…';
  const navigationDetail = document.createElement('p');
  navigationDetail.className = 'practice-map-navigation-detail';
  navigationDetail.setAttribute('aria-live', 'polite');
  navigationDetail.hidden = true;
  const navigationKey = document.createElement('p');
  navigationKey.className = 'practice-map-navigation-key';
  navigationKey.textContent = '◇ VOR · ▰ LOC/ILS · □ DME · ○ NDB · △ TACAN · dots: separate antennas';
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
  const navCredit = document.createElement('span');
  navCredit.textContent = ' · NAV: OurAirports, public domain (snapshot 2026-11-02); ILS: Robin A. Peel / FlightGear, GPL-2.0-or-later (2013.10)';
  credit.append(navCredit);
  const caption = document.createElement('p');
  caption.className = 'practice-map-caption';
  caption.textContent = 'Southern Germany map · community inventory, not a navigation chart · historical ILS · no airspace, NOTAM or published procedures. Aerial imagery and flight terrain remain regionally bounded.';
  const airportsSection = document.createElement('details');
  airportsSection.className = 'practice-map-airports';
  const summary = document.createElement('summary');
  summary.textContent = 'Airfields & heliports';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search name, code, type or state';
  search.setAttribute('aria-label', 'Search airports');
  const airportType = document.createElement('select');
  airportType.setAttribute('aria-label', 'Airfield type');
  for (const [value, label] of [['all', 'All source entries'], ['airfields', 'Airfields'], ['heliport', 'Heliports'], ['closed', 'Closed facilities']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; airportType.append(option);
  }
  const airportStatus = document.createElement('p');
  airportStatus.textContent = 'Loading airport catalogue…';
  airportStatus.setAttribute('role', 'status');
  const airportList = document.createElement('div');
  airportList.className = 'practice-map-airport-list';
  const airportDetail = document.createElement('p');
  airportDetail.className = 'practice-map-airport-detail';
  airportDetail.setAttribute('aria-live', 'polite');
  airportsSection.append(summary, search, airportType, airportStatus, airportList, airportDetail);
  container.replaceChildren(header, viewport, status, toolbar, layers, readout, legend, navigationStatus, navigationKey, navigationDetail, airportsSection, credit, caption);

  let map: LibreMap | undefined;
  let aircraft: Marker | undefined;
  let start: Marker | undefined;
  let frame: PracticeMapFrame | undefined;
  // Project the bounded trace directly so it remains visible while worker tiles load.
  const trajectory = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  trajectory.classList.add('practice-map-trajectory');
  trajectory.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  trajectory.append(track);
  function paintTrajectory(): void {
    const points = ready && map && frame && frame.path.length > 1
      ? frame.path.map(coordinate => { const p = map!.project(coordinate); return `${p.x.toFixed(2)},${p.y.toFixed(2)}`; }).join(' ')
      : '';
    if (track.getAttribute('points') !== points) track.setAttribute('points', points);
  }

  let paintedPath = '';
  let visible = !container.hidden;
  let ready = false;
  let disposed = false;
  let following = true;
  let failed = false;
  const airportMarkers: Marker[] = [];
  let airportMarkerKey = '';
  let airportSourceKey = '';
  const navigationMarkers: Marker[] = [];
  let navigationMarkerKey = '';
  let paintedNavigationData: FlightMapNavigation | undefined;
  let navigationData: FlightMapNavigation = { type: 'FeatureCollection', features: [] };
  let aerial = false, vector = false;
  let navigationVisible = true;
  let airports: Airport[] = [];
  let selectedAirport = 'EDFE';
  let comPanel: ReturnType<typeof createAirportComPanel> | undefined;
  let reviewing = false;
  const playControls = createAirportPlayControls(options.onStartRunway, options.onStopExercise);
  airportsSection.before(playControls.element);

  const selectAirport = (airport: Airport) => {
    selectedAirport = airport.id; playControls.setAirport(airport.id);
    playControls.update(options.isExerciseActive?.() ?? false, reviewing);
    comPanel?.selectAirport(airport.id);
    if (comPanel) comPanel.element.open = false;
    setFollowing(false);
    map?.jumpTo({ center: [airport.lon, airport.lat], zoom: Math.max(map.getZoom(), 11) });
    const elevation = airport.elevation_ft === null ? 'Elevation unavailable' : `Elevation ${airport.elevation_ft} ft (${(airport.elevation_ft * 0.3048).toFixed(0)} m)`;
    airportDetail.textContent = `${airport.name} · ${airport.id}${airport.icao ? ` · ICAO ${airport.icao}` : ''}${airport.local ? ` · local ${airport.local}` : ''} · ${airport.type.replaceAll('_', ' ')} · ${airport.iso_region} · ${airport.lat.toFixed(5)}° N, ${airport.lon.toFixed(5)}° E · ${elevation}. OurAirports community data; not a navigation chart.`;
    airportsSection.open = true;
    onInteraction();
  };
  const filteredAirports = () => {
    const query = search.value.trim().toLocaleLowerCase();
    return airports.filter(a => (airportType.value === 'all'
      || (airportType.value === 'airfields' ? a.type.endsWith('_airport') : a.type === airportType.value))
      && `${a.name} ${a.id} ${a.icao} ${a.local} ${a.iso_region} ${a.type.replaceAll('_', ' ')}`.toLocaleLowerCase().includes(query));
  };
  const renderAirports = () => {
    const matches = filteredAirports();
    airportList.replaceChildren();
    matches.slice(0, 100).forEach(airport => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${airport.id} · ${airport.name}${airport.type === 'closed' ? ' · CLOSED' : ''}`;
      button.addEventListener('click', () => selectAirport(airport));
      airportList.append(button);
    });
    airportStatus.textContent = `${airports.length} airfields · ${matches.length} matching${matches.length > 100 ? ' · first 100 shown; refine search' : ''} · community source, not an official inventory`;
    paintAirports();
  };
  search.addEventListener('input', renderAirports);
  airportType.addEventListener('change', renderAirports);
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

  function setAerial(value: boolean): void {
    caption.textContent = value ? 'Public aerial imagery · capture dates vary · terrain and navigation unchanged.' : 'Southern Germany public map · community snapshot, not a navigation chart.';
    vector = false; vectorLayer.setAttribute("aria-pressed", "false");
    if (ready) for (const id of ["vector-land", "vector-lines"]) map?.setLayoutProperty(id, "visibility", "none");
    if (ready) map?.setLayoutProperty("basemap", "visibility", "visible");
    aerial = value;
    mapLayer.setAttribute('aria-pressed', String(!value));
    aerialLayer.setAttribute('aria-pressed', String(value));
    viewport.setAttribute('aria-label', `North-up ${value ? 'aerial imagery' : 'public map'} and recorded flight path`);
    if (ready) map?.setLayoutProperty('imagery', 'visibility', value ? 'visible' : 'none');
  }

  function setVector(enabled: boolean): void {
    vector = enabled;
    vectorLayer.setAttribute('aria-pressed', String(enabled));
    caption.textContent = enabled ? 'Vector coverage: EDFE immediate surroundings only · © OpenStreetMap contributors · ODbL · terrain and navigation unchanged.' : 'Southern Germany public map · community snapshot, not a navigation chart.';
    if (!ready || !map) return;
    if (!enabled) { setAerial(aerial); return; }
    mapLayer.setAttribute('aria-pressed', 'false'); aerialLayer.setAttribute('aria-pressed', 'false');
    map.setLayoutProperty('basemap', 'visibility', 'none'); map.setLayoutProperty('imagery', 'visibility', 'none');
    for (const id of ['vector-land', 'vector-lines']) map.setLayoutProperty(id, 'visibility', 'visible');
    viewport.setAttribute('aria-label', 'OpenStreetMap vector scenery · EDFE region only · public physical terrain independent');
  }

  // All points remain in GPU layers; only a bounded set of nearby labels uses DOM.
  function nearby<T>(items: T[], coordinates: (item: T) => [number, number]): T[] {
    if (!map || map.getZoom() < 10) return [];
    const bounds = map.getBounds(), center = map.getCenter();
    const distance = (item: T) => { const [lon, lat] = coordinates(item); return (lon - center.lng) ** 2 + (lat - center.lat) ** 2; };
    return items.filter(item => bounds.contains(coordinates(item))).sort((a, b) => distance(a) - distance(b)).slice(0, 80);
  }

  function paintAirports(): void {
    if (!map || !ready) return;
    const matches = filteredAirports();
    const sourceKey = matches.map(a => a.id).join(',');
    if (sourceKey !== airportSourceKey) {
      airportSourceKey = sourceKey;
      (map.getSource('airfields') as GeoJSONSource).setData({ type: 'FeatureCollection', features: matches.map(a => ({
      type: 'Feature', id: a.id, geometry: { type: 'Point', coordinates: [a.lon, a.lat] }, properties: { id: a.id, type: a.type },
      })) });
    }
    const labelled = nearby(matches, a => [a.lon, a.lat]);
    const key = labelled.map(a => a.id).join(',');
    if (key === airportMarkerKey) return;
    airportMarkerKey = key;
    airportMarkers.splice(0).forEach(marker => marker.remove());
    for (const airport of labelled) {
      const element = document.createElement('button');
      element.type = 'button'; element.className = 'practice-map-airport-marker';
      element.textContent = airport.icao || airport.id;
      element.dataset.type = airport.type;
      element.setAttribute('aria-label', `Select ${airport.name}${airport.type === 'closed' ? ', closed' : ''}`);
      element.addEventListener('click', event => { event.stopPropagation(); selectAirport(airport); });
      airportMarkers.push(new Marker({ element }).setLngLat([airport.lon, airport.lat]).addTo(map));
    }
  }

  function paintNavigation(): void {
    if (!map || !ready) return;
    if (paintedNavigationData !== navigationData) {
      (map.getSource('navigation-aids') as GeoJSONSource).setData(navigationData);
      paintedNavigationData = navigationData;
    }
    for (const layer of ['navigation-components', 'navigation-stations']) map.setLayoutProperty(layer, 'visibility', navigationVisible ? 'visible' : 'none');
    const stations = navigationVisible ? nearby(navigationData.features.filter(f => f.properties.component === 'station'), f => f.geometry.coordinates) : [];
    const key = stations.map(f => f.id).join(',');
    if (key !== navigationMarkerKey) {
      navigationMarkerKey = key;
      navigationMarkers.splice(0).forEach(marker => marker.remove());
      for (const feature of stations) {
        const p = feature.properties;
        const element = document.createElement('button');
        element.type = 'button'; element.className = 'practice-map-navigation-marker'; element.dataset.kind = p.kind;
        const source = p.historical ? 'historical 2013.10' : 'community snapshot, not current AIS';
        element.title = `${p.identifier} · ${p.equipment} · ${p.frequency_label} · ${source}`;
        element.setAttribute('aria-label', `Show navigation aid ${p.identifier}, ${p.equipment}, ${p.frequency_label}, ${source}`);
        const symbol = document.createElement('span'); symbol.className = 'practice-map-navigation-symbol';
        symbol.textContent = p.kind.includes('VOR') ? '◇' : p.kind === 'LOC' ? '▰' : p.kind.includes('NDB') ? '○' : p.kind === 'TACAN' ? '△' : '□';
        symbol.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span'); label.className = 'practice-map-navigation-label';
        label.textContent = `${p.identifier} ${p.equipment} ${p.frequency_label}`;
        element.append(symbol, label);
        element.addEventListener('click', event => { event.stopPropagation(); selectNavigation(feature); onInteraction(); });
        navigationMarkers.push(new Marker({ element }).setLngLat(feature.geometry.coordinates).addTo(map));
      }
    }
    navigationKey.hidden = !navigationVisible;
    container.dataset.navLabels = String(map.getZoom() >= 10);
  }

  const selectNavigation = (feature: FlightMapNavigationFeature) => {
    const p = feature.properties;
    const components = navigationData.features.filter(item => item.properties.station_uid === p.station_uid)
      .map(item => `${item.properties.component === 'station' ? p.equipment : item.properties.component} ${item.geometry.coordinates[1].toFixed(5)}° N, ${item.geometry.coordinates[0].toFixed(5)}° E`);
    navigationDetail.textContent = `${p.identifier} · ${p.name} · ${p.equipment} · ${p.frequency_label}${p.airport_runway ? ` · ${p.airport_runway}` : ''}. ${components.join(' · ')}. ${p.historical ? 'Historical 2013.10; source AMSL/datum unverified.' : 'OurAirports community snapshot 2026-11-02; not current AIS.'} ${p.source_line_ids.length ? `Source rows ${p.source_line_ids.join(', ')}.` : ''} Not current service or a published approach.`;
    navigationDetail.hidden = false;
  };

  listen(vectorLayer, () => { const enabled = !vector; setVector(enabled); options.onVectorChange?.(enabled); });
  listen(mapLayer, () => { setAerial(false); options.onVectorChange?.(false); });
  listen(aerialLayer, () => { setAerial(true); options.onVectorChange?.(false); });
  listen(navigationLayer, () => {
    navigationVisible = !navigationVisible;
    navigationLayer.setAttribute('aria-pressed', String(navigationVisible));
    if (!navigationVisible) navigationDetail.hidden = true;
    paintNavigation();
  });

  function paint(): void {
    if (!visible || !ready || !map || !frame || disposed) return;
    paintTrajectory();
    const pathKey = JSON.stringify(frame.path);
    if (pathKey !== paintedPath) {
      (map.getSource('recorded-path') as GeoJSONSource).setData({
        type: 'FeatureCollection', features: frame.path.length < 2 ? [] : [{
          type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: frame.path },
        }],
      });
      paintedPath = pathKey;
    }
    aircraft!.setLngLat(frame.position).setRotation(frame.heading_deg).addTo(map);
    if (frame.path.length) start!.setLngLat(frame.path[0]).addTo(map);
    else start!.remove();
    if (following) map.jumpTo({ center: frame.position });
    // Observable paint result for actual-browser checks; not navigation data.
    container.dataset.pathPoints = String(frame.path.length);
    container.dataset.markerHeadingDeg = frame.heading_deg.toFixed(1);
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
  listen(fitRegion, () => { if (map) { setFollowing(false); map.fitBounds([[AIRFIELD_BOUNDS[0], AIRFIELD_BOUNDS[1]], [AIRFIELD_BOUNDS[2], AIRFIELD_BOUNDS[3]]], { padding: 24, duration: 0 }); } });
  listen(follow, () => { setFollowing(true); paint(); });
  listen(overlap, () => controller.toggleOverlap());
  const observer = new ResizeObserver(() => { if (visible && !disposed) map?.resize(); });
  observer.observe(viewport);

  const controller: PracticeMap = {
    toggleOverlap() {
      if (disposed) return;
      const enabled = container.dataset.overlapCockpit !== 'true';
      container.dataset.overlapCockpit = String(enabled);
      overlap.setAttribute('aria-pressed', String(enabled));
    },
    update(state, path, mode) {
      reviewing = mode === 'review';
      playControls.update(options.isExerciseActive?.() ?? false, reviewing);
      comPanel?.setEnabled(!reviewing && !!options.onTuneCom && (options.canTuneCom?.() ?? true));
      comPanel?.updatePosition(state.lat_rad * 180 / Math.PI, state.lon_rad * 180 / Math.PI);
      if (disposed) return;
      modeLabel.textContent = mode === 'review' ? 'Recorded review' : 'Live';
      try {
        frame = makePracticeMapFrame(state, path);
      } catch {
        // Invalid flight state: never keep a stale marker, path or readout on screen.
        frame = undefined; paintedPath = ''; paintTrajectory();
        aircraft?.remove(); start?.remove();
        if (ready && map) (map.getSource('recorded-path') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
        readout.textContent = 'Aircraft position unavailable';
        container.dataset.pathPoints = '0'; delete container.dataset.markerHeadingDeg;
        status.hidden = false;
        status.textContent = 'Map position unavailable: invalid flight state.';
        return;
      }
      const [longitude_deg, latitude_deg] = frame.position;
      readout.textContent = `${Math.abs(latitude_deg).toFixed(4)}° ${latitude_deg < 0 ? 'S' : 'N'}  ${Math.abs(longitude_deg).toFixed(4)}° ${longitude_deg < 0 ? 'W' : 'E'}  ·  ${(Math.round(frame.heading_deg) % 360).toString().padStart(3, '0')}° true`;
      if (ready && !failed) status.hidden = true;
      // Render failures propagate so the host can dispose and offer a retry.
      paint();
    },
    setVector,
    setVisible(value) {
      if (disposed) return;
      visible = value;
      container.hidden = !value;
      if (value) { map?.resize(); paint(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort(); comPanel?.dispose();
      observer.disconnect();
      removers.forEach((remove) => remove());
      container.removeEventListener('pointerdown', onInteraction);
      container.removeEventListener('focusin', onInteraction);
      container.removeEventListener('keydown', stopKey);
      container.removeEventListener('keyup', stopKey);
      airportMarkers.forEach((marker) => marker.remove());
      navigationMarkers.forEach((marker) => marker.remove());
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
        basemap: { type: 'raster', tiles: ['/scenery/map/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 5, maxzoom: 16, bounds: [...AIRFIELD_BOUNDS] },
        imagery: { type: 'raster', tiles: ['/scenery/imagery/{z}/{x}/{y}.png'], tileSize: 512, minzoom: 7, maxzoom: 15, bounds: [8, 49, 10, 50.75] },
        'airport-vector': { type: 'geojson', data: '/airports/scenery/edfe-vector.geojson' },
        'recorded-path': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        airfields: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'navigation-aids': { type: 'geojson', data: navigationData },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#162530' } },
        { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 0 } },
        { id: 'imagery', type: 'raster', source: 'imagery', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } },
        { id: 'vector-land', type: 'fill', source: 'airport-vector', filter: ['==', ['geometry-type'], 'Polygon'], layout: { visibility: 'none' }, paint: { 'fill-color': ['match', ['get', 'kind'], 'water', '#5488a1', 'forest', '#426d4b', 'building', '#b7a89b', 'runway', '#34383b', 'apron', '#858789', 'residential', '#c7b9a7', '#8d9e6f'], 'fill-outline-color': '#68765b' } },
        { id: 'vector-lines', type: 'line', source: 'airport-vector', filter: ['==', ['geometry-type'], 'LineString'], layout: { visibility: 'none' }, paint: { 'line-color': ['match', ['get', 'kind'], 'water', '#5488a1', 'taxiway', '#9b9b92', 'runway', '#34383b', '#ded5be'], 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 5] } },
        { id: 'airfields', type: 'circle', source: 'airfields', paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 13, 5],
          'circle-color': ['match', ['get', 'type'], 'closed', '#858b91', 'heliport', '#e3bc75', '#89cfff'],
          'circle-stroke-color': '#15222d', 'circle-stroke-width': 1,
        } },
        { id: 'navigation-stations', type: 'circle', source: 'navigation-aids', filter: ['==', ['get', 'component'], 'station'],
          paint: { 'circle-radius': 4, 'circle-color': '#d7a6ef', 'circle-stroke-color': '#24202d', 'circle-stroke-width': 1.5 } },
        { id: 'navigation-components', type: 'circle', source: 'navigation-aids',
          filter: ['!=', ['get', 'component'], 'station'],
          paint: { 'circle-radius': 3, 'circle-color': '#f3a4df', 'circle-stroke-color': '#24202d', 'circle-stroke-width': 1.5 } },
        { id: 'path-shadow', type: 'line', source: 'recorded-path', paint: { 'line-color': '#10212c', 'line-width': 6 } },
        { id: 'path', type: 'line', source: 'recorded-path', paint: { 'line-color': '#54e8fa', 'line-width': 3 } },
      ],
    };
    if (disposed) return controller;
    // MapLibre's relative default worker URL is invalid after Vite prebundling.
    // Let Vite emit the worker and its dependencies for development and builds.
    setWorkerUrl(mapWorkerUrl);
    map = new LibreMap({
      container: viewport, style, center: [8.64, 49.9625], zoom: 13,
      minZoom: 5, maxZoom: 17, interactive: true, attributionControl: false,
      renderWorldCopies: false, maxPitch: 0, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    map.addControl(new ScaleControl({ unit: 'nautical', maxWidth: 100 }), 'bottom-left');
    viewport.append(trajectory);
    map.on('move', paintTrajectory); map.on('resize', paintTrajectory);
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.on('moveend', () => { paintAirports(); paintNavigation(); });
    map.on('click', 'airfields', event => {
      const airport = airports.find(a => a.id === event.features?.[0]?.properties.id);
      if (airport) selectAirport(airport);
    });
    for (const layer of ['navigation-stations', 'navigation-components']) map.on('click', layer, event => {
      const feature = navigationData.features.find(f => f.id === event.features?.[0]?.id);
      if (feature) { selectNavigation(feature); onInteraction(); }
    });
    void loadFlightMapCatalogue(abort.signal).then(data => {
      if (disposed || !map) return;
      navigationData = data;
      const stations = data.features.filter(f => f.properties.component === 'station');
      const historical = stations.filter(f => f.properties.historical).length;
      navigationStatus.textContent = `NAV · ${stations.length - historical} community sources (2026-11-02) + ${historical} historical LOC/ILS (2013.10) · not current AIS`;
      paintNavigation();
    }).catch(() => {
      if (!disposed) navigationStatus.textContent = 'NAV inventory unavailable. Community snapshot / historical ILS; not current AIS.';
    });
    map.on('dragstart', () => { setFollowing(false); onInteraction(); });
    map.on('zoomstart', (event) => { if (event.originalEvent) { setFollowing(false); onInteraction(); } });
    void loadAirportCatalogue(abort.signal).then((data) => {
      if (disposed || !map) return;
      airports = data;
      renderAirports();
      void loadAirportComDirectory(abort.signal).then(directory => {
        if (disposed) return;
        comPanel = createAirportComPanel({ airports, directory,
          onTune(receiver, channel) { if (!reviewing) options.onTuneCom?.(receiver, channel); },
          onSelectAirport(id) { const airport = airports.find(a => a.id === id); if (airport) selectAirport(airport); },
        });
        airportsSection.after(comPanel.element); comPanel.selectAirport(selectedAirport); comPanel.element.open = false;
        comPanel.setEnabled(!reviewing && !!options.onTuneCom);
      }).catch(() => { if (!disposed) { const notice = document.createElement('p'); notice.textContent = 'COM directory unavailable'; airportsSection.after(notice); } });
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
      status.textContent = 'Some map tiles unavailable. Aircraft and path remain local.';
    });
    // Local overlays must initialize even when the first raster tiles fail.
    map.on('style.load', () => {
      if (disposed) return;
      ready = true;
      status.hidden = !failed;
      [...buttons, ...layerButtons].forEach((button) => { button.disabled = false; });
      const savedVector = vector; setAerial(aerial); if (savedVector) setVector(true);
      paintAirports();
      paintNavigation();
      paint();
    });
  } catch {
    if (!disposed) {
      status.textContent = 'Flight map unavailable. Flight controls remain available.';
      status.hidden = false;
    }
  }
  return controller;
}
