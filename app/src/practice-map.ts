import { createWorldMapStyle, worldMapLayers, worldMapLabelLayers } from './world-map-style';
/// <reference types="vite/client" />
import { createAirportPlayControls } from './airport-play-controls';
import { createRunwayPracticePanel } from './runway-practice-panel';
import type { PracticeProgress } from './runway-practice';
import { makePracticeCircuit, locateOnCircuit, type CircuitGuide } from './practice-circuit';
import { loadAirportComDirectory } from './airport-com';
import { createAirportComPanel } from './airport-com-panel';
import { LngLatBounds, Map as LibreMap, Marker, Popup, ScaleControl, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './practice-map.css';
import { makePracticeMapFrame, type PracticeMapFrame } from './practice-map-data';
import { AIRFIELD_BOUNDS, loadAirportCatalogue, type Airport } from './airport-catalogue';
import type { FlightState } from './types';
import { loadFlightMapCatalogue } from './flight-map-catalogue';
import type { FlightMapNavigation, FlightMapNavigationFeature } from './flight-map-navigation';
import { createMapPointPopup, type MapPoint } from './map-point-popup';
import { createMapPointSearch, MAP_LOCATION_TYPES, mapLocationType, type MapLocationType } from './map-point-search';
import { loadMapFixes, type MapFix } from './map-fixes';
import { distanceMeters } from './scenery-coverage';
import type { AirportComDirectory } from './airport-com';

export interface PracticeMap {
  update(state: Readonly<FlightState>, path: readonly Readonly<FlightState>[], mode: 'live' | 'review'): void;
  setVisible(visible: boolean): void;
  setVector(enabled: boolean): void;
  setCircuitGuide(enabled: boolean): void;
  toggleOverlap(): void;
  dispose(): void;
}

interface MapOptions {
  container: HTMLElement;
  onClose: () => void;
  onInteraction: () => void;
  onVectorChange?: (enabled: boolean) => void;
  onStartRunway?: (runway: string) => void;
  getRunwayPractice?: () => { runway: '08' | '26'; progress: PracticeProgress } | null;
  onStopExercise?: () => void;
  isExerciseActive?: () => boolean;
  canTuneCom?: () => boolean;
  onTuneCom?: (receiver: 1 | 2, channel_khz: number) => void;
  onTuneNav?: (receiver: 1 | 2, channel_khz: number) => void;
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
  overlap.type = 'button'; overlap.id = 'map-overlap'; overlap.textContent = 'Map menu · ,';
  overlap.setAttribute('aria-pressed', 'false');
  overlap.setAttribute('aria-keyshortcuts', ',');
  overlap.title = ', · Toggle extended map menu';
  overlap.setAttribute('aria-controls', 'flight-map-extended-menu'); overlap.setAttribute('aria-expanded', 'false');
  header.insertBefore(overlap, close);
  const layers = document.createElement('div');
  layers.className = 'practice-map-layers';
  layers.setAttribute('role', 'group');
  layers.setAttribute('aria-label', 'Map layers');
  const layerButtons = ['Map', 'Aerial', 'Map terrain'].map((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = true;
    button.setAttribute('aria-label', ['Show public map', 'Show aerial imagery', 'Use map without labels as terrain texture'][index]);
    button.setAttribute('aria-pressed', String(index === 0));
    layers.append(button);
    return button;
  });
  const [mapLayer, aerialLayer, vectorLayer] = layerButtons;
  const chartButton = document.createElement('button');
  chartButton.type = 'button'; chartButton.textContent = 'Charts';
  chartButton.setAttribute('aria-controls', 'flight-map-charts'); chartButton.setAttribute('aria-expanded', 'false');
  layers.append(chartButton);
  const charts = document.createElement('section'); charts.id = 'flight-map-charts'; charts.className = 'practice-map-charts'; charts.hidden = true;
  charts.setAttribute('aria-label', 'Aeronautical charts');
  const chartAirport = document.createElement('p'); chartAirport.textContent = 'Select an airport for its identifier, then open the published charts.';
  const chartLinks = document.createElement('div');
  for (const [label, href] of [
    ['Germany VFR charts · open flightmaps', 'https://openflightmaps.org/downloads/ed/'],
    ['Airport and approach charts · DFS AIP', 'https://aip.dfs.de/'],
  ]) {
    const link = document.createElement('a'); link.textContent = label; link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; chartLinks.append(link);
  }
  const chartNote = document.createElement('small'); chartNote.textContent = 'Published charts open with their provider. Check the edition there; the generated circuit guide is separate.';
  charts.append(chartAirport, chartLinks, chartNote);

  const circuitToggle = document.createElement('button');
  circuitToggle.type = 'button'; circuitToggle.textContent = 'Circuit guide';
  circuitToggle.setAttribute('aria-pressed', 'false'); circuitToggle.disabled = true;
  const circuitFit = document.createElement('button');
  circuitFit.type = 'button'; circuitFit.textContent = 'Fit circuit'; circuitFit.disabled = true;
  layers.append(circuitToggle, circuitFit);
  const circuitNote = document.createElement('p'); circuitNote.className = 'practice-map-circuit-note'; circuitNote.hidden = true;
  circuitNote.textContent = 'Generated practice guide · not published EDFE route · no altitude/speed/obstacle guidance';
  const circuitReadout = document.createElement('p'); circuitReadout.className = 'practice-map-circuit-readout'; circuitReadout.hidden = true;
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
  navCredit.append(document.createTextNode(' · Fixes: Robin A. Peel / FlightGear, GPL-2.0-or-later (2013.10)'));
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
  const extendedMenu = document.createElement('section');
  extendedMenu.id = 'flight-map-extended-menu'; extendedMenu.className = 'practice-map-extended-menu';
  extendedMenu.setAttribute('aria-label', 'Extended flight map menu'); extendedMenu.hidden = true;
  extendedMenu.append(layers, charts, circuitNote, circuitReadout, readout, legend, navigationStatus, navigationKey, navigationDetail, airportsSection, credit, caption);
  container.dataset.extendedMenu = 'false'; delete container.dataset.overlapCockpit;
  container.replaceChildren(header, viewport, toolbar, extendedMenu);
  viewport.append(status);

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
  let locationTypes: ReadonlySet<MapLocationType> = new Set(MAP_LOCATION_TYPES.map(([type]) => type));
  let airports: Airport[] = [];
  let selectedAirport = 'EDFE';
  let circuitEnabled = false, circuitFitPending = false, circuitDataKey = '', circuitLabelKey = '', circuitLegKey = '';
  let circuitGuide: CircuitGuide | null = null;
  let circuitState: Readonly<FlightState> | null = null;
  const circuitMarkers: Marker[] = [];
  let comPanel: ReturnType<typeof createAirportComPanel> | undefined;
  let reviewing = false;
  let comDirectory: AirportComDirectory | null = null;
  let fixes: readonly MapFix[] = [];
  let fixMarkerKey = '';
  let paintedFixes: readonly MapFix[] | undefined;
  const fixMarkers: Marker[] = [];
  let selectedPoint: Readonly<MapPoint> | null = null, pointPopup: Popup | null = null;
  let gpsTarget: Readonly<MapPoint> | null = null, gpsDataKey = '';
  let searchPosition: { lat: number; lon: number } | null = null;
  const fixesStatus = document.createElement('p'); fixesStatus.className = 'practice-map-navigation-status';
  fixesStatus.textContent = 'Loading historical navigation fixes…';
  const gpsReadout = document.createElement('output'); gpsReadout.id = 'map-gps-readout';
  const gpsClear = document.createElement('button'); gpsClear.type = 'button'; gpsClear.textContent = '×'; gpsClear.setAttribute('aria-label', 'Clear GPS target');
  const gpsOverlay = document.createElement('div'); gpsOverlay.className = 'practice-map-gps-target'; gpsOverlay.hidden = true; gpsOverlay.append(gpsReadout, gpsClear); viewport.append(gpsOverlay);
  const pointSearch = createMapPointSearch({ onSelect(point) {
    setFollowing(false); map?.jumpTo({ center: [point.lon_deg, point.lat_deg], zoom: Math.max(map.getZoom(), 11) });
    const airport = point.kind === 'airport' ? airports.find(a => a.id === point.id || a.icao === point.id) : undefined;
    if (airport) selectAirport(airport);
    else {
      const nav = navigationData.features.find(f => f.properties.identifier === point.id && Math.abs(f.geometry.coordinates[0] - point.lon_deg) < 1e-7 && Math.abs(f.geometry.coordinates[1] - point.lat_deg) < 1e-7);
      if (nav) selectNavigation(nav); else openPoint(point);
    }
    onInteraction();
  }, onTypesChange(types) {
    locationTypes = new Set(types);
    paintedNavigationData = undefined; paintedFixes = undefined;
    if (selectedPoint && !locationTypes.has(mapLocationType(selectedPoint))) {
      pointPopup?.remove(); pointPopup = null; selectedPoint = null;
    }
    if (!locationTypes.has('nav')) navigationDetail.hidden = true;
    renderAirports(); paintNavigation(); paintFixes(); onInteraction();
  } });
  extendedMenu.prepend(pointSearch.element, fixesStatus);
  function airportPoint(airport: Airport): MapPoint {
    return { id: airport.icao || airport.id, name: airport.name, kind: 'airport', airport_type: airport.type, lon_deg: airport.lon, lat_deg: airport.lat,
      source_label: `OurAirports community snapshot${comDirectory ? ` · COM ${comDirectory.retrieved}` : ''}`,
      frequencies: (comDirectory?.stations ?? []).filter(station => station.airport_id === airport.id).map(station => ({ kind: 'com', channel_khz: station.channel_khz, label: station.service })) };
  }
  function navigationPoint(feature: FlightMapNavigationFeature): MapPoint {
    const p = feature.properties;
    return { id: p.identifier, name: p.name + (p.component === 'station' ? '' : ` · ${p.component}`), kind: p.kind, equipment: p.equipment,
      lon_deg: feature.geometry.coordinates[0], lat_deg: feature.geometry.coordinates[1], source_label: p.source_label,
      frequencies: [{ kind: 'nav', channel_khz: p.frequency_mhz ? Math.round(Number(p.frequency_mhz) * 1000) : Number(p.frequency_label.split(' ')[0]), label: p.equipment }] };
  }
  const fixPoint = (fix: MapFix): MapPoint => ({ ...fix, id: fix.name, kind: 'fix' });
  function refreshPointSearch(): void { pointSearch.setPoints([...airports.map(airportPoint), ...navigationData.features.map(navigationPoint), ...fixes.map(fixPoint)]); }
  function refreshPointPopup(): void {
    if (!selectedPoint || !pointPopup) return;
    const point = selectedPoint;
    pointPopup.setDOMContent(createMapPointPopup(point, {
      canTune: () => !reviewing && (options.canTuneCom?.() ?? true) && !!point.frequencies?.some(f => f.kind === 'com' ? options.onTuneCom : options.onTuneNav),
      onTune(kind, receiver, channel) {
        if (reviewing || !(options.canTuneCom?.() ?? true)) return;
        (kind === 'com' ? options.onTuneCom : options.onTuneNav)?.(receiver, channel); onInteraction();
      },
      onGpsTarget(target) { gpsTarget = target; gpsDataKey = ''; paintGpsTarget(); onInteraction(); },
    }));
  }
  function openPoint(point: Readonly<MapPoint>): void {
    if (!map || disposed || !locationTypes.has(mapLocationType(point))) return;
    pointPopup?.remove(); selectedPoint = point;
    pointPopup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: '290px', offset: 10 }).setLngLat([point.lon_deg, point.lat_deg]);
    refreshPointPopup(); pointPopup.addTo(map);
  }
  function paintGpsTarget(): void {
    if (!ready || !map) return;
    gpsOverlay.hidden = !gpsTarget || !frame;
    const key = gpsTarget && frame ? `${gpsTarget.id}/${gpsTarget.lon_deg}/${gpsTarget.lat_deg}/${frame.position.map(n => n.toFixed(5)).join('/')}` : '';
    if (key === gpsDataKey) return;
    gpsDataKey = key;
    const features = gpsTarget && frame ? [
      { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [frame.position, [gpsTarget.lon_deg, gpsTarget.lat_deg]] } },
      { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [gpsTarget.lon_deg, gpsTarget.lat_deg] } },
    ] : [];
    (map.getSource('gps-target') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
    if (gpsTarget && frame) {
      const rad = Math.PI / 180, lon = frame.position[0] * rad, lat = frame.position[1] * rad;
      const tlat = gpsTarget.lat_deg * rad, dl = gpsTarget.lon_deg * rad - lon;
      const bearing = (Math.atan2(Math.sin(dl) * Math.cos(tlat), Math.cos(lat) * Math.sin(tlat) - Math.sin(lat) * Math.cos(tlat) * Math.cos(dl)) / rad + 360) % 360;
      gpsReadout.textContent = `GPS ${gpsTarget.id} · ${Math.round(bearing).toString().padStart(3, '0')}°T · ${(distanceMeters(lat, lon, tlat, gpsTarget.lon_deg * rad) / 1852).toFixed(1)} NM`;
    }
  }
  gpsClear.onclick = () => { gpsTarget = null; gpsDataKey = 'clear'; paintGpsTarget(); onInteraction(); };
  function paintFixes(): void {
    if (!map || !ready) return;
    const matches = locationTypes.has('fix') ? fixes : [];
    if (paintedFixes !== fixes) {
      (map.getSource('navigation-fixes') as GeoJSONSource).setData({ type: 'FeatureCollection', features: matches.map(f => ({ type: 'Feature', id: f.id, properties: { fixId: f.id, name: f.name }, geometry: { type: 'Point', coordinates: [f.lon_deg, f.lat_deg] } })) });
      paintedFixes = fixes;
    }
    const labelled = nearby([...matches], f => [f.lon_deg, f.lat_deg]).slice(0, 40);
    const key = labelled.map(f => f.id).join(','); if (key === fixMarkerKey) return;
    fixMarkerKey = key; fixMarkers.splice(0).forEach(marker => marker.remove());
    for (const fix of labelled) {
      const element = document.createElement('button'); element.type = 'button'; element.className = 'practice-map-fix-marker'; element.textContent = `△ ${fix.name}`;
      element.dataset.fixId = fix.id; element.setAttribute('aria-label', `Select fix ${fix.name}`);
      element.onclick = event => { event.stopPropagation(); openPoint(fixPoint(fix)); onInteraction(); };
      fixMarkers.push(new Marker({ element }).setLngLat([fix.lon_deg, fix.lat_deg]).addTo(map));
    }
  }

  const playControls = createAirportPlayControls(options.onStartRunway, options.onStopExercise);
  airportsSection.before(playControls.element);
  const practiceCard = createRunwayPracticePanel();
  playControls.element.after(practiceCard.element);

  const selectAirport = (airport: Airport) => {
    selectedAirport = airport.id; playControls.setAirport(airport.id);
    playControls.update(options.isExerciseActive?.() ?? false, reviewing);
    comPanel?.selectAirport(airport.id);
    if (comPanel) comPanel.element.open = false;
    refreshCircuit();
    setFollowing(false);
    map?.jumpTo({ center: [airport.lon, airport.lat], zoom: Math.max(map.getZoom(), 11) });
    const elevation = airport.elevation_ft === null ? 'Elevation unavailable' : `Elevation ${airport.elevation_ft} ft (${(airport.elevation_ft * 0.3048).toFixed(0)} m)`;
    airportDetail.textContent = `${airport.name} · ${airport.id}${airport.icao ? ` · ICAO ${airport.icao}` : ''}${airport.local ? ` · local ${airport.local}` : ''} · ${airport.type.replaceAll('_', ' ')} · ${airport.iso_region} · ${airport.lat.toFixed(5)}° N, ${airport.lon.toFixed(5)}° E · ${elevation}. OurAirports community data; not a navigation chart.`;
    chartAirport.textContent = `Charts for ${airport.icao || airport.id} · ${airport.name}`;
    airportsSection.open = true;
    openPoint(airportPoint(airport));
    onInteraction();
  };
  const filteredAirports = () => {
    const query = search.value.trim().toLocaleLowerCase();
    return airports.filter(a => locationTypes.has(mapLocationType({ id: a.id, name: a.name, kind: 'airport', airport_type: a.type,
      lon_deg: a.lon, lat_deg: a.lat, source_label: '' })) && (airportType.value === 'all'
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
  listen(chartButton, () => { charts.hidden = !charts.hidden; chartButton.setAttribute('aria-expanded', String(!charts.hidden)); });

  function setFollowing(value: boolean): void {
    following = value;
    follow.setAttribute('aria-pressed', String(value));
    legend.textContent = `Whole retained path · ${value ? 'Following aircraft' : 'Fit view · press Follow to recenter'} · North up`;
  }

  function setAerial(value: boolean): void {
    aerial = value;
    updateLayerCaption();
    mapLayer.setAttribute('aria-pressed', String(!value));
    aerialLayer.setAttribute('aria-pressed', String(value));
    viewport.setAttribute('aria-label', `North-up ${value ? 'aerial imagery' : 'public map'} and recorded flight path`);
    if (ready) map?.setLayoutProperty('imagery', 'visibility', value ? 'visible' : 'none');
  }

  function updateLayerCaption(): void {
    caption.textContent = `${aerial ? 'Public aerial imagery · capture dates vary.' : 'Southern Germany public map · not a navigation chart.'}${vector ? ' Terrain: map without labels.' : ''}`;
  }

  function setVector(enabled: boolean): void {
    vector = enabled;
    vectorLayer.setAttribute('aria-pressed', String(enabled));
    updateLayerCaption();
  }

  function refreshCircuit(): void {
    const practice = options.getRunwayPractice?.();
    const runway = reviewing ? practice?.runway ?? null
      : practice?.runway ?? (selectedAirport === 'EDFE' ? playControls.selectedRunway() : null);
    if (runway !== circuitGuide?.runway) circuitGuide = runway ? makePracticeCircuit(runway) : null;
    paintCircuit();
    if (circuitFitPending && ready && map && circuitGuide && frame) {
      circuitFitPending = false;
      const [west, south, east, north] = circuitGuide.bounds;
      setFollowing(false); map.fitBounds([[west, south], [east, north]], { padding: 48, maxZoom: 14, duration: 0 });
    }
  }
  function paintCircuit(): void {
    circuitNote.hidden = !circuitEnabled;
    circuitReadout.hidden = !circuitEnabled;
    const guide = circuitEnabled && frame ? circuitGuide : null;
    circuitFit.disabled = !ready || !guide;
    if (!ready || !map) return;
    const key = guide?.runway ?? '';
    if (key !== circuitDataKey) {
      circuitDataKey = key;
      (map.getSource('practice-circuit') as GeoJSONSource).setData({ type: 'FeatureCollection', features: guide ? guide.legs.map(leg => ({
        type: 'Feature', id: leg.id, properties: { id: leg.id, label: leg.label, runway: guide.runway },
        geometry: { type: 'LineString', coordinates: [[...leg.start], [...leg.end]] },
      })) : [] });
    }
    const nearest = guide && circuitState ? locateOnCircuit(guide, circuitState) : null;
    const nearestId = nearest?.legId ?? '';
    if (nearestId !== circuitLegKey) {
      circuitLegKey = nearestId;
      map.setFilter('practice-circuit-nearest', ['==', ['get', 'id'], nearestId]);
    }
    circuitReadout.textContent = !circuitGuide
      ? reviewing ? 'Circuit guide unavailable · recording runway unknown' : 'Circuit guide unavailable · select EDFE or start an EDFE flight'
      : !frame ? 'Circuit guide unavailable · aircraft position unknown'
      : nearest ? `EDFE ${circuitGuide.runway} · ${circuitGuide.direction === 'right' ? 'Right' : 'Left'}-hand north circuit · Nearest guide leg: ${circuitGuide.legs.find(leg => leg.id === nearest.legId)!.label} · ${Math.round(nearest.distance_m)} m`
      : `EDFE ${circuitGuide.runway} · Nearest guide leg unavailable · outside guide area`;
    if (key !== circuitLabelKey) {
      circuitLabelKey = key;
      circuitMarkers.splice(0).forEach(marker => marker.remove());
      if (guide) for (const leg of guide.legs) {
        const element = document.createElement('div'); element.className = 'practice-map-circuit-label'; element.dataset.leg = leg.id;
        const arrow = document.createElement('span'); arrow.className = 'practice-map-circuit-arrow'; arrow.textContent = '➜'; arrow.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span'); label.textContent = leg.label;
        element.append(arrow, label);
        circuitMarkers.push(new Marker({ element }).setLngLat([(leg.start[0] + leg.end[0]) / 2, (leg.start[1] + leg.end[1]) / 2]).addTo(map));
      }
    }
    for (let index = 0; index < circuitMarkers.length && guide; index++) {
      const leg = guide.legs[index], a = map.project(leg.start), b = map.project(leg.end);
      const element = circuitMarkers[index].getElement(); element.dataset.nearest = String(leg.id === nearestId);
      element.querySelector<HTMLElement>('.practice-map-circuit-arrow')!.style.transform = `rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI}deg)`;
    }
  }
  listen(circuitToggle, () => {
    circuitEnabled = !circuitEnabled; circuitToggle.setAttribute('aria-pressed', String(circuitEnabled)); refreshCircuit();
  });
  listen(circuitFit, () => {
    if (!map || !circuitEnabled || !circuitGuide || !frame) return;
    const [west, south, east, north] = circuitGuide.bounds;
    setFollowing(false); map.fitBounds([[west, south], [east, north]], { padding: 48, maxZoom: 14, duration: 0 });
  });
  const selectedRunway = playControls.element.querySelector('select')!;
  selectedRunway.addEventListener('change', refreshCircuit);
  removers.push(() => selectedRunway.removeEventListener('change', refreshCircuit));

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
      airportMarkers.push(new Marker({ element, offset: [0, 9] }).setLngLat([airport.lon, airport.lat]).addTo(map));
    }
  }

  function paintNavigation(): void {
    if (!map || !ready) return;
    const navigationVisible = locationTypes.has('nav');
    if (paintedNavigationData !== navigationData) {
      (map.getSource('navigation-aids') as GeoJSONSource).setData(navigationVisible ? navigationData : { type: 'FeatureCollection', features: [] });
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
        navigationMarkers.push(new Marker({ element, offset: [0, -15] }).setLngLat(feature.geometry.coordinates).addTo(map));
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
    openPoint(navigationPoint(feature));
  };

  listen(vectorLayer, () => { const enabled = !vector; setVector(enabled); options.onVectorChange?.(enabled); });
  listen(mapLayer, () => { setAerial(false); });
  listen(aerialLayer, () => { setAerial(true); });

  function paint(): void {
    if (!visible || !ready || !map || !frame || disposed) return;
    paintTrajectory();
    paintCircuit();
    paintGpsTarget();
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
      const enabled = container.dataset.extendedMenu !== 'true';
      container.dataset.extendedMenu = String(enabled); extendedMenu.hidden = !enabled;
      overlap.setAttribute('aria-pressed', String(enabled)); overlap.setAttribute('aria-expanded', String(enabled));
    },
    update(state, path, mode) {
      if (disposed) return;
      const wasReviewing = reviewing; reviewing = mode === 'review';
      if (wasReviewing !== reviewing) refreshPointPopup();
      playControls.update(options.isExerciseActive?.() ?? false, reviewing);
      const practice = options.getRunwayPractice?.();
      circuitState = state;
      practiceCard.update(practice?.progress ?? null,
        selectedAirport !== 'EDFE' || (reviewing && !practice) ? null : practice?.runway ?? playControls.selectedRunway(), reviewing,
        practice && practice.progress.phase !== 'waiting' ? state : null);
      comPanel?.setEnabled(!reviewing && !!options.onTuneCom && (options.canTuneCom?.() ?? true));
      comPanel?.updatePosition(state.lat_rad * 180 / Math.PI, state.lon_rad * 180 / Math.PI);
      if (disposed) return;
      modeLabel.textContent = mode === 'review' ? 'Recorded review' : 'Live';
      try {
        frame = makePracticeMapFrame(state, path);
      } catch {
        // Invalid flight state: never keep a stale marker, path or readout on screen.
        frame = undefined; circuitState = null; paintedPath = ''; paintTrajectory(); refreshCircuit(); gpsDataKey = 'clear'; paintGpsTarget();
        searchPosition = null; pointSearch.setPosition(NaN, NaN);
        aircraft?.remove(); start?.remove();
        if (ready && map) (map.getSource('recorded-path') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
        readout.textContent = 'Aircraft position unavailable';
        container.dataset.pathPoints = '0'; delete container.dataset.markerHeadingDeg;
        status.hidden = false;
        status.textContent = 'Map position unavailable: invalid flight state.';
        return;
      }
      refreshCircuit();
      const [longitude_deg, latitude_deg] = frame.position;
      const lat = latitude_deg * Math.PI / 180, lon = longitude_deg * Math.PI / 180;
      if (!searchPosition || distanceMeters(lat, lon, searchPosition.lat, searchPosition.lon) >= 500) {
        searchPosition = { lat, lon }; pointSearch.setPosition(longitude_deg, latitude_deg);
      }
      readout.textContent = `${Math.abs(latitude_deg).toFixed(4)}° ${latitude_deg < 0 ? 'S' : 'N'}  ${Math.abs(longitude_deg).toFixed(4)}° ${longitude_deg < 0 ? 'W' : 'E'}  ·  ${(Math.round(frame.heading_deg) % 360).toString().padStart(3, '0')}° true`;
      if (ready && !failed) status.hidden = true;
      // Render failures propagate so the host can dispose and offer a retry.
      paint();
    },
    setVector,
    setCircuitGuide(enabled) {
      circuitEnabled = enabled; circuitFitPending = enabled;
      circuitToggle.setAttribute('aria-pressed', String(enabled)); refreshCircuit();
    },
    setVisible(value) {
      if (disposed) return;
      visible = value;
      if (!value) { pointPopup?.remove(); pointPopup = null; }
      container.hidden = !value;
      if (value) { map?.resize(); paint(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true; pointPopup?.remove(); pointSearch.dispose(); fixMarkers.splice(0).forEach(marker => marker.remove());
      abort.abort(); comPanel?.dispose();
      observer.disconnect();
      removers.forEach((remove) => remove());
      container.removeEventListener('pointerdown', onInteraction);
      container.removeEventListener('focusin', onInteraction);
      container.removeEventListener('keydown', stopKey);
      container.removeEventListener('keyup', stopKey);
      airportMarkers.forEach((marker) => marker.remove());
      navigationMarkers.forEach((marker) => marker.remove());
      circuitMarkers.forEach((marker) => marker.remove());
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
        ...createWorldMapStyle().sources,
        'navigation-fixes': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'gps-target': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        basemap: { type: 'raster', tiles: ['/scenery/map/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 5, maxzoom: 16, bounds: [...AIRFIELD_BOUNDS] },
        imagery: { type: 'raster', tiles: ['/scenery/imagery/{z}/{x}/{y}.png'], tileSize: 512, minzoom: 7, maxzoom: 15, bounds: [6, 47, 14, 51.75] },
        'recorded-path': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        airfields: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'navigation-aids': { type: 'geojson', data: navigationData },
        'practice-circuit': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      },
      layers: [
        ...worldMapLayers(),
        ...worldMapLabelLayers(),
        { id: 'basemap', type: 'raster', source: 'basemap', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } },
        { id: 'imagery', type: 'raster', source: 'imagery', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } },
        { id: 'navigation-fixes', type: 'circle', source: 'navigation-fixes', minzoom: 8, paint: { 'circle-radius': 3, 'circle-color': '#e3a1e8', 'circle-stroke-color': '#34203e', 'circle-stroke-width': 1 } },
        { id: 'gps-target-line', type: 'line', source: 'gps-target', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#ff8af1', 'line-width': 2, 'line-dasharray': [3, 2] } },
        { id: 'gps-target-point', type: 'circle', source: 'gps-target', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 7, 'circle-color': '#ff8af1', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } },
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
        { id: 'practice-circuit-guide', type: 'line', source: 'practice-circuit', paint: { 'line-color': '#efcb76', 'line-width': 2, 'line-dasharray': [3, 2] } },
        { id: 'practice-circuit-nearest', type: 'line', source: 'practice-circuit', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#fff3a8', 'line-width': 4, 'line-dasharray': [2, 1.5] } },
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
      minZoom: 5, maxZoom: 17, interactive: true, attributionControl: { compact: true, customAttribution: '© BKG (2026) · HVBG · Bayerische Vermessungsverwaltung · LGL-BW · OurAirports · FlightGear (2013)' },
      renderWorldCopies: false, maxPitch: 0, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      transformRequest(url, resourceType) {
        if (visible && resourceType === 'Tile') {
          try {
            const target = new URL(url, window.location.href);
            if (target.origin === window.location.origin && /^\/scenery\/(?:map|imagery|osm)\//.test(target.pathname))
              return { url, headers: { 'X-Gefly-Scenery-Priority': 'visible' } };
          } catch { /* Preserve MapLibre's handling of other request URLs. */ }
        }
        return { url };
      },
    });
    map.addControl(new ScaleControl({ unit: 'nautical', maxWidth: 100 }), 'bottom-left');
    viewport.append(trajectory);
    map.on('move', paintTrajectory); map.on('resize', paintTrajectory);
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.on('moveend', () => { paintAirports(); paintNavigation(); paintFixes(); paintCircuit(); });
    map.on('click', 'airfields', event => {
      const airport = airports.find(a => a.id === event.features?.[0]?.properties.id);
      if (airport) selectAirport(airport);
    });
    for (const layer of ['navigation-stations', 'navigation-components']) map.on('click', layer, event => {
      const hit = event.features?.[0];
      const feature = navigationData.features.find(f => f.id === hit?.id || (f.properties.station_uid === hit?.properties.station_uid && f.properties.component === hit?.properties.component));
      if (feature) { selectNavigation(feature); onInteraction(); }
    });
    void loadFlightMapCatalogue(abort.signal).then(data => {
      if (disposed || !map) return;
      navigationData = data; refreshPointSearch();
      const stations = data.features.filter(f => f.properties.component === 'station');
      const historical = stations.filter(f => f.properties.historical).length;
      navigationStatus.textContent = `NAV · ${stations.length - historical} community sources (2026-11-02) + ${historical} historical LOC/ILS (2013.10) · not current AIS`;
      paintNavigation();
    }).catch(() => {
      if (!disposed) navigationStatus.textContent = 'NAV inventory unavailable. Community snapshot / historical ILS; not current AIS.';
    });
    void loadMapFixes(abort.signal).then(data => {
      if (disposed || !map) return;
      fixes = data; refreshPointSearch();
      fixesStatus.textContent = `${fixes.length} regional fixes · FlightGear 2013.10 · historical`; paintFixes();
    }).catch(() => { if (!disposed) fixesStatus.textContent = 'Historical navigation fixes unavailable'; });
    map.on('click', 'gps-target-point', () => { if (gpsTarget) { openPoint(gpsTarget); onInteraction(); } });
    map.on('click', 'navigation-fixes', event => {
      const fix = fixes.find(f => f.id === event.features?.[0]?.properties.fixId); if (fix) { openPoint(fixPoint(fix)); onInteraction(); }
    });
    map.on('dragstart', () => { setFollowing(false); onInteraction(); });
    map.on('zoomstart', (event) => { if (event.originalEvent) { setFollowing(false); onInteraction(); } });
    void loadAirportCatalogue(abort.signal).then((data) => {
      if (disposed || !map) return;
      airports = data; refreshPointSearch();
      renderAirports();
      void loadAirportComDirectory(abort.signal).then(directory => {
        if (disposed) return;
        comDirectory = directory; refreshPointSearch();
        if (selectedPoint?.kind === 'airport') { const airport = airports.find(a => a.id === selectedPoint!.id || a.icao === selectedPoint!.id); if (airport) { selectedPoint = airportPoint(airport); refreshPointPopup(); } }
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
      circuitToggle.disabled = false;
      circuitDataKey = ''; circuitLabelKey = ''; circuitLegKey = ''; paintedFixes = undefined;
      airportSourceKey = ''; paintedNavigationData = undefined;
      refreshCircuit();
      const savedVector = vector; setAerial(aerial); if (savedVector) setVector(true);
      paintAirports();
      paintNavigation();
      paintFixes();
      gpsDataKey = '';
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
