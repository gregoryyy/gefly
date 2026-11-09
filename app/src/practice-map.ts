import { COUNTRY_IMAGERY, COUNTRY_PHOTO_DETAIL_MIN_LEVEL, COUNTRY_PHOTO_MAX_LEVEL, COUNTRY_PHOTO_MIN_LEVEL, countryPhotoCandidates, countryPhotoUrl, type PhotoCountry } from './country-imagery.ts';
import { countryPhotoBackoff } from './country-photo-backoff.ts';
import { showVisibleSpainCredit } from './visible-photo-credit.ts';
import { createOfmMapOverlay, OFM_OVERLAY_ID } from './ofm-map-overlay.ts';
import { airportApproachGuides } from './approach-guide-airports.ts';
import type { ApproachGuide } from './approach-guide.ts';
import { loadOfmOverlaySource } from './ofm-overlay-source.ts';
import './ofm-map-overlay.css';

import { createFlightPlanStore, planPoints, planLegs, pointNavigation } from './map-flight-plan';
import { createFlightPlanPanel } from './map-flight-plan-panel';
import type { FlightPlanPanelAction, PlannerPoint, PlanResult } from './map-flight-plan-types';
import { loadMapLocationPreferences, saveMapLocationPreferences } from './map-location-preferences.ts';
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
import { makePracticeMapFrame, unwrapMapPath, type MapPathPosition, type PracticeMapFrame } from './practice-map-data';
import { AIRFIELD_BOUNDS, loadAirportCatalogue, type Airport } from './airport-catalogue';
import type { FlightState } from './types';
import { loadFlightMapCatalogue } from './flight-map-catalogue';
import type { FlightMapNavigation, FlightMapNavigationFeature } from './flight-map-navigation';
import { createMapPointPopup, type MapPoint } from './map-point-popup';
import { createMapPointSearch, mapLocationType, type MapLocationType } from './map-point-search';
import { loadMapFixes, type MapFix } from './map-fixes';
import { distanceMeters } from './scenery-coverage';
import type { AirportComDirectory } from './airport-com';
import { createWorldAirportLoader } from './world-airport-loader';
import { worldAirportCellId, type WorldAirportSnapshot, type WorldNavaid, type WorldSearchHit, type WorldRunway } from './world-airport-contract';

export interface PracticeMap {
  zoom(direction: 1 | -1): void;
  getGpsTarget(): Readonly<PlannerPoint> | null;
  setPlanVisible(visible: boolean): void;
  update(state: Readonly<FlightState>, path: readonly MapPathPosition[], mode: 'live' | 'review', options?: { simplified?: boolean; recordingStart?: boolean }): void;
  setVisible(visible: boolean): void;
  setVector(enabled: boolean): void;
  setCircuitGuide(enabled: boolean): void;
  toggleOverlap(): void;
  dispose(): void;
}

function countryRasterSource(source: typeof COUNTRY_IMAGERY[number]) {
  return { type: 'raster' as const, tiles: [countryPhotoUrl(source.id)], tileSize: 256,
    minzoom: source.id === 'es' ? COUNTRY_PHOTO_DETAIL_MIN_LEVEL : COUNTRY_PHOTO_MIN_LEVEL, maxzoom: COUNTRY_PHOTO_MAX_LEVEL,
    bounds: [...source.bounds] as [number, number, number, number], attribution: source.attribution };
}
function countryRasterLayer(source: typeof COUNTRY_IMAGERY[number]) {
  return { id: `country-photo-${source.id}`, type: 'raster' as const, source: `country-photo-${source.id}`,
    minzoom: COUNTRY_PHOTO_DETAIL_MIN_LEVEL, layout: { visibility: 'none' as const }, paint: { 'raster-fade-duration': 0 } };
}

interface MapOptions {
  creditsContainer?: HTMLElement;
  initialApproachGuide?: Readonly<ApproachGuide> | null;
  onApproachGuide?: (guide: ApproachGuide | null) => void;
  container: HTMLElement;
  planContainer?: HTMLElement;
  onPlanVisibilityChange?: (visible: boolean) => void;
  onRequestMap?: () => void;
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
  zoomOut.setAttribute('aria-keyshortcuts', '-'); zoomOut.title = '- · Zoom map out';
  zoomIn.setAttribute('aria-keyshortcuts', '= +'); zoomIn.title = '= / + · Zoom map in';
  follow.setAttribute('aria-pressed', 'true');
  const readout = document.createElement('p');
  readout.className = 'practice-map-readout';
  readout.textContent = 'Waiting for aircraft position';
  const legend = document.createElement('p');
  legend.className = 'practice-map-legend';
  legend.textContent = 'Flight track · Following aircraft · North up';
  const credit = document.createElement('p');
  credit.className = 'practice-map-credit';
  credit.innerHTML = 'Map: © <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026), <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a>, <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_topplusopen.html" target="_blank" rel="noopener noreferrer">Sources</a> · Imagery: HVBG (DL-DE Zero 2.0), © Bayerische Vermessungsverwaltung (2026, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>), Datenquelle: <a href="https://www.lgl-bw.de" target="_blank" rel="noopener noreferrer">LGL-BW</a> (2026, <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a>) · Airports: OurAirports, public domain';
  const navCredit = document.createElement('span');
  navCredit.textContent = ' · NAV: OurAirports, public domain (snapshot 2026-11-02); ILS: Robin A. Peel / FlightGear, GPL-2.0-or-later (2013.10)';
  navCredit.append(document.createTextNode(' · Fixes: Robin A. Peel / FlightGear, GPL-2.0-or-later (2013.10)'));
  credit.append(navCredit);
  const caption = document.createElement('p');
  caption.className = 'practice-map-caption';
  caption.textContent = 'Global OpenStreetMap · worldwide OurAirports community airport/NAV discovery near map centre; receiver signals use a separate historical NAV810 inventory; published fix coverage remains regional. Not a navigation chart.';
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
  const ofmControls = document.createElement('div');
  extendedMenu.append(layers, ofmControls, charts, circuitNote, circuitReadout, readout, legend, navigationStatus, navigationKey, navigationDetail, airportsSection, credit, caption);
  container.dataset.extendedMenu = 'false'; delete container.dataset.overlapCockpit;
  container.replaceChildren(header, viewport, toolbar, extendedMenu);
  viewport.append(status);

  let map: LibreMap | undefined;
  let mapCreditObserver: MutationObserver | undefined;
  let removeVisibleSpainCredit: (() => void) | undefined;
  let ofmOverlay: ReturnType<typeof createOfmMapOverlay> | undefined;
  let aircraft: Marker | undefined;
  let start: Marker | undefined;
  let markerStartsAtRecording = false;
  let frame: PracticeMapFrame | undefined;
  // Project the bounded trace directly so it remains visible while worker tiles load.
  const trajectory = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  trajectory.classList.add('practice-map-trajectory');
  trajectory.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  trajectory.append(track);
  function paintTrajectory(): void {
    const points = ready && map && frame && frame.path.length > 1
      ? unwrapMapPath(frame.path, map.getCenter().lng).map(coordinate => { const p = map!.project(coordinate); return `${p.x.toFixed(2)},${p.y.toFixed(2)}`; }).join(' ')
      : '';
    if (track.getAttribute('points') !== points) track.setAttribute('points', points);
  }

  let paintedPath = '';
  let visible = !container.hidden;
  let ready = false;
  let disposed = false;
  let following = true;
  let failed = false;
  function refreshMapStatus(): void {
    if (!ready && !failed) return;
    const center = map?.getCenter();
    const candidates = center && aerial && visible ? countryPhotoCandidates(center.lat, center.lng) : [];
    const affected = COUNTRY_IMAGERY.filter(source => candidates.includes(source.id)
      && (countryPhotoBackoff.isBlocked(source.id) || countryPhotoProblems.has(source.id)));
    const country = affected.length ? `${affected.map(source => source.name).join(' / ')} photography temporarily unavailable; map fallback remains.` : '';
    const spainZoom = candidates.includes('es') && map && map.getZoom() < COUNTRY_PHOTO_DETAIL_MIN_LEVEL
      ? 'Spain PNOA 2024 is available from map zoom 7 in some areas; showing map fallback.' : '';
    status.hidden = !failed && !country && !spainZoom;
    status.textContent = [country, spainZoom, failed ? 'Some map tiles unavailable. Aircraft and path remain local.' : ''].filter(Boolean).join(' ');
  }
  const airportMarkers: Marker[] = [];
  let airportMarkerKey = '';
  let airportSourceKey = '';
  const navigationMarkers: Marker[] = [];
  let navigationMarkerKey = '';
  let paintedNavigationData: FlightMapNavigation | undefined;
  let navigationData: FlightMapNavigation = { type: 'FeatureCollection', features: [] };
  let aerial = false, vector = false;
  const countryPhotoProblems = new Set<PhotoCountry>();
  const countryPhotoNeedsRefresh = new Set<PhotoCountry>();
  const countryPhotoEpoch: Record<PhotoCountry, number> = { ch: 0, at: 0, nrw: 0, bb: 0, es: 0 };
  const countryPhotoTiles = new WeakMap<object, { id: PhotoCountry; generation: number; epoch: number }>();
  const removeCountryPhotoBackoff = countryPhotoBackoff.subscribe((id, blocked) => {
    if (disposed) return;
    if (!blocked) { countryPhotoProblems.delete(id); countryPhotoNeedsRefresh.add(id); }
    syncCountryPhotoLayers(); refreshMapStatus();
  });
  const locationPreferenceStorage = (() => { try { return window.localStorage; } catch { return null; } })();
  let locationTypes: ReadonlySet<MapLocationType> = new Set(loadMapLocationPreferences(locationPreferenceStorage));
  let airports: Airport[] = [];
  let selectedAirport = 'EDFE';
  let circuitEnabled = false, circuitFitPending = false, circuitDataKey = '', circuitLabelKey = '', circuitLegKey = '';
  let circuitGuide: CircuitGuide | null = null;
  let circuitState: Readonly<FlightState> | null = null;
  const circuitMarkers: Marker[] = [];
  let comPanel: ReturnType<typeof createAirportComPanel> | undefined;
  let reviewing = false;
  let comDirectory: AirportComDirectory | null = null;
  let regionalAirports: Airport[] = [];
  let regionalComDirectory: AirportComDirectory | null = null;
  let worldSnapshot: WorldAirportSnapshot | null = null;
  let latestWorldSnapshot: WorldAirportSnapshot | null = null;
  let worldLoader: ReturnType<typeof createWorldAirportLoader> | undefined;
  let worldSelectionGeneration = 0;
  let selectedWorldHit: WorldSearchHit | null = null;
  let worldwideSearchGeneration = 0;
  let worldwideSearchHits = new Map<string, WorldSearchHit>();
  const worldNavMarkers: Marker[] = [];
  let worldNavMarkerKey = '';
  let paintedWorldNavaids: readonly WorldNavaid[] | undefined;
  let worldAirportIds = new Set<string>();
  let runwayByAirport = new Map<string, WorldRunway[]>();
  let comByAirport = new Map<string, AirportComDirectory['stations']>();
  const worldStatus = document.createElement('p'); worldStatus.className = 'practice-map-world-status';
  worldStatus.setAttribute('role', 'status'); worldStatus.textContent = 'Loading worldwide airport discovery…';
  extendedMenu.prepend(worldStatus);
  let fixes: readonly MapFix[] = [];
  let fixMarkerKey = '';
  let paintedFixes: readonly MapFix[] | undefined;
  const fixMarkers: Marker[] = [];
  let selectedPoint: Readonly<MapPoint> | null = null, pointPopup: Popup | null = null;
  let approachGuide: Readonly<ApproachGuide> | null = options.initialApproachGuide ?? null;
  let gpsTarget: Readonly<MapPoint> | null = null, gpsDataKey = '';
  let pickingGpsFix = false;
  const customFixMarkers: Marker[] = [], planPointMarkers: Marker[] = [];
  let plannerMarkerKey = '', plannerRouteKey = '';
  const planStore = createFlightPlanStore(() => {
    if (gpsTarget?.custom && !planStore.getSnapshot().fixes.some(fix => fix.id === gpsTarget!.id)) gpsTarget = null;
    gpsDataKey = ''; refreshPointSearch(); paintPlanner(); paintGpsTarget();
  });
  let searchPosition: { lat: number; lon: number } | null = null;
  const fixesStatus = document.createElement('p'); fixesStatus.className = 'practice-map-navigation-status';
  fixesStatus.textContent = 'Loading historical navigation fixes…';
  const gpsReadout = document.createElement('output'); gpsReadout.id = 'map-gps-readout';
  const gpsClear = document.createElement('button'); gpsClear.type = 'button'; gpsClear.textContent = '×'; gpsClear.setAttribute('aria-label', 'Clear GPS target');
  const gpsOverlay = document.createElement('div'); gpsOverlay.className = 'practice-map-gps-target'; gpsOverlay.hidden = true; gpsOverlay.append(gpsReadout, gpsClear); viewport.append(gpsOverlay);
  const pointSearch = createMapPointSearch({ initialTypes: locationTypes,
    searchWorldwide: async query => {
      if (!worldLoader) throw new Error('Worldwide search unavailable');
      const generation = ++worldwideSearchGeneration, hits = await worldLoader.search(query);
      if (generation === worldwideSearchGeneration) worldwideSearchHits = new Map(hits.map(hit => [hit.id, hit]));
      return hits.map(worldSearchPoint);
    },
    onSelect(point) {
    setFollowing(false); map?.jumpTo({ center: [point.lon_deg, point.lat_deg], zoom: Math.max(map.getZoom(), 11) });
    if (point.world_record_id && worldLoader) {
      const source = worldSnapshot?.airports.find(a => a.id === point.world_record_id) ?? worldSnapshot?.navaids.find(n => n.id === point.world_record_id);
      const hit: WorldSearchHit = worldwideSearchHits.get(point.world_record_id) ?? { kind: point.kind === 'airport' ? 'airport' : 'navaid', id: point.world_record_id,
        name: point.name, codes: point.id, type: point.airport_type ?? point.equipment ?? point.kind,
        lat: point.lat_deg, lon: point.lon_deg, iso_country: source?.iso_country ?? '', cell: worldAirportCellId(point.lon_deg, point.lat_deg) };
      selectedWorldHit = hit;
      const generation = ++worldSelectionGeneration;
      openPoint(point, true);
      void worldLoader.select(hit).then(snapshot => {
        if (disposed || generation !== worldSelectionGeneration || selectedWorldHit !== hit) return;
        const airport = snapshot.airports.find(a => a.id === hit.id);
        const nav = snapshot.navaids.find(n => n.id === hit.id);
        if (airport) selectAirport(airport); else if (nav) openPoint(worldNavaidPoint(nav));
      }).catch(() => { if (!disposed && generation === worldSelectionGeneration) worldStatus.textContent = 'Selected location details unavailable; verified search position remains.'; });
      onInteraction(); return;
    }
    const airport = point.kind === 'airport' ? airports.find(a => a.id === point.id || a.icao === point.id) : undefined;
    if (airport) selectAirport(airport);
    else {
      const nav = navigationData.features.find(f => f.properties.identifier === point.id && Math.abs(f.geometry.coordinates[0] - point.lon_deg) < 1e-7 && Math.abs(f.geometry.coordinates[1] - point.lat_deg) < 1e-7);
      if (nav) selectNavigation(nav); else openPoint(point);
    }
    onInteraction();
  }, onTypesChange(types) {
    locationTypes = new Set(types);
    saveMapLocationPreferences([...types], locationPreferenceStorage);
    paintedNavigationData = undefined; paintedFixes = undefined;
    if (selectedPoint && !locationTypes.has(mapLocationType(selectedPoint))) {
      pointPopup?.remove(); pointPopup = null; selectedPoint = null;
    }
    if (!locationTypes.has('nav')) navigationDetail.hidden = true;
    plannerMarkerKey = ''; paintedWorldNavaids = undefined; worldNavMarkerKey = ''; renderAirports(); paintNavigation(); paintWorldNavigation(); paintFixes(); paintPlanner(); onInteraction();
  } });
  const planner = createFlightPlanPanel({ onAction: handlePlannerAction });
  const planOverlay = document.createElement('section');
  planOverlay.id = 'flight-plan-overlay'; planOverlay.className = 'flight-plan-overlay'; planOverlay.hidden = true;
  planOverlay.setAttribute('aria-label', 'Flight plan');
  const planHeading = document.createElement('header'); planHeading.className = 'flight-plan-overlay-heading';
  const planTitle = document.createElement('strong'); planTitle.textContent = 'Flight plan';
  const planPickCancel = document.createElement('button'); planPickCancel.type = 'button';
  planPickCancel.textContent = 'Cancel picking'; planPickCancel.hidden = true;
  planPickCancel.onclick = () => { handlePlannerAction({ type: 'cancel-pick' }); };
  const planClose = document.createElement('button'); planClose.type = 'button'; planClose.textContent = '×';
  planClose.setAttribute('aria-label', 'Close flight plan');
  planClose.onclick = () => setPlanVisible(false, true);
  planHeading.append(planTitle, planPickCancel, planClose); planOverlay.append(planHeading, planner.element);
  (options.planContainer ?? container.parentElement ?? container).append(planOverlay);
  function setPlanVisible(value: boolean, notify = false): void {
    if (disposed || planOverlay.hidden === !value) return;
    planOverlay.hidden = !value; planButton.setAttribute('aria-expanded', String(value));
    if (!value && pickingGpsFix) { pickingGpsFix = false; updatePlannerPanel(); }
    if (notify) options.onPlanVisibilityChange?.(value);
  }
  const planButton = document.createElement('button'); planButton.type = 'button';
  planButton.textContent = 'Flight plan'; planButton.setAttribute('aria-label', 'Edit flight plan');
  planButton.setAttribute('aria-controls', 'flight-plan-overlay'); planButton.setAttribute('aria-expanded', 'false');
  planButton.onclick = () => { handlePlannerAction({ type: 'edit-plan' }); };
  header.insertBefore(planButton, overlap);
  const pickNotice = document.createElement('p'); pickNotice.className = 'practice-map-pick-notice';
  pickNotice.textContent = 'Click a map position, then name and create the GPS fix.'; pickNotice.hidden = true;
  viewport.append(pickNotice);
  extendedMenu.prepend(pointSearch.element, fixesStatus);
  updatePlannerPanel();
  function airportPoint(airport: Airport): MapPoint {
    const worldAirport = worldAirportIds.has(airport.id);
    const runways = runwayByAirport.get(airport.id) ?? [];
    const guides = airportApproachGuides(airport, runways, `OurAirports community snapshot ${worldSnapshot?.retrieved ?? 'date unavailable'} · revision ${worldSnapshot?.source_commit ?? 'unavailable'}`);
    return { approach_guides: guides, id: airport.icao || airport.id, name: airport.name, kind: 'airport', airport_type: airport.type, lon_deg: airport.lon, lat_deg: airport.lat,
      ...(worldAirport ? { world_record_id: airport.id, details: runways.length ? runways.slice(0, 8).map(r =>
        `Runway ${r.le.ident || '?'} / ${r.he.ident || '?'} · ${r.length_ft === null ? 'length unknown' : `${r.length_ft} ft`}${r.width_ft === null ? '' : ` × ${r.width_ft} ft`} · ${r.surface || 'surface unknown'}${r.closed ? ' · CLOSED' : ''}`)
        : ['Runway details unavailable in this snapshot.'] } : {}),
      source_label: `OurAirports community snapshot${comDirectory ? ` · COM ${comDirectory.retrieved}` : ''}`,
      frequencies: (comByAirport.get(airport.id) ?? []).filter(station => Math.abs(Number(station.source_frequency_mhz) * 1000 - station.channel_khz) < 1e-6)
        .map(station => ({ kind: 'com', channel_khz: station.channel_khz, label: station.service })) };
  }
  function worldNavaidPoint(nav: WorldNavaid): MapPoint {
    return { id: nav.ident, world_record_id: nav.id, name: nav.name, kind: nav.type, equipment: nav.type,
      lon_deg: nav.lon, lat_deg: nav.lat,
      source_label: `OurAirports · ${worldSnapshot?.retrieved ?? ''} · community discovery; receiver signals use a separate historical NAV810 inventory`,
      frequencies: nav.frequency_khz === null ? [] : [{ kind: 'nav', channel_khz: nav.frequency_khz, label: nav.type }] };
  }
  function worldSearchPoint(hit: WorldSearchHit): MapPoint {
    return { id: hit.kind === 'airport' ? hit.id : hit.codes.split(' ')[0] || hit.id,
      world_record_id: hit.id, name: hit.name, kind: hit.kind === 'airport' ? 'airport' : hit.type,
      ...(hit.kind === 'airport' ? { airport_type: hit.type } : { equipment: hit.type }),
      lon_deg: hit.lon, lat_deg: hit.lat, source_label: 'OurAirports worldwide search · select to load frequencies and details' };
  }
  function navigationPoint(feature: FlightMapNavigationFeature): MapPoint {
    const p = feature.properties;
    return { id: p.identifier, name: p.name + (p.component === 'station' ? '' : ` · ${p.component}`), kind: p.kind, equipment: p.equipment,
      lon_deg: feature.geometry.coordinates[0], lat_deg: feature.geometry.coordinates[1], source_label: p.source_label,
      frequencies: [{ kind: 'nav', channel_khz: p.frequency_mhz ? Math.round(Number(p.frequency_mhz) * 1000) : Number(p.frequency_label.split(' ')[0]), label: p.equipment }] };
  }
  const fixPoint = (fix: MapFix): MapPoint => ({ ...fix, id: fix.name, kind: 'fix' });
  function refreshPointSearch(): void { pointSearch.setPoints([...airports.map(airportPoint), ...navigationData.features.map(navigationPoint), ...(worldSnapshot?.navaids.map(worldNavaidPoint) ?? []), ...fixes.map(fixPoint), ...planStore.getSnapshot().fixes]); }
  function refreshPointPopup(): void {
    if (!selectedPoint || !pointPopup) return;
    const point = selectedPoint, popup = pointPopup;
    const content = createMapPointPopup(point, {
      currentApproachGuide: approachGuide,
      onApproachGuide: options.onApproachGuide ? guide => {
        if (disposed || pointPopup !== popup || selectedPoint !== point || !content.isConnected || !popup.getElement().contains(content)) return;
        if (guide && !point.approach_guides?.some(candidate => candidate.airportId === guide.airportId
          && candidate.runwayIdent === guide.runwayIdent && candidate.lat_deg === guide.lat_deg && candidate.lon_deg === guide.lon_deg
          && candidate.heading_deg_true === guide.heading_deg_true && candidate.displaced_threshold_ft === guide.displaced_threshold_ft)) return;
        approachGuide = guide ? Object.freeze({ ...guide }) : null;
        options.onApproachGuide?.(approachGuide ? { ...approachGuide } : null);
        onInteraction(); refreshPointPopup();
      } : undefined,
      canTune: () => !reviewing && (options.canTuneCom?.() ?? true) && !!point.frequencies?.some(f => f.kind === 'com' ? options.onTuneCom : options.onTuneNav),
      onTune(kind, receiver, channel) {
        if (reviewing || !(options.canTuneCom?.() ?? true)) return;
        (kind === 'com' ? options.onTuneCom : options.onTuneNav)?.(receiver, channel); onInteraction();
      },
      onGpsTarget(target) { setDirectTo(target); },
      onPlanPoint(target, role) {
        if (disposed || pointPopup !== popup || selectedPoint !== point || !content.isConnected || !popup.getElement().contains(content)) return;
        const result = handlePlannerAction({ type: 'set-point', role, point: target });
        feedback.textContent = result.ok ? `${target.id}: ${role} added to current flight plan.` : result.error;
      },
    });
    const feedback = document.createElement('p'); feedback.setAttribute('role', 'status'); content.append(feedback);
    popup.setDOMContent(content);
  }
  function openPoint(point: Readonly<MapPoint>, preserveWorldSelection = false): void {
    if (!preserveWorldSelection) { ++worldSelectionGeneration; selectedWorldHit = null; }
    if (pickingGpsFix) { pickGpsPosition(point.lon_deg, point.lat_deg); return; }
    if (!map || disposed || !locationTypes.has(mapLocationType(point))) return;
    pointPopup?.remove(); selectedPoint = point;
    pointPopup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: '290px', offset: 10 }).setLngLat([point.lon_deg, point.lat_deg]);
    refreshPointPopup(); pointPopup.addTo(map);
  }
  function pickGpsPosition(lon: number, lat: number): void { pickingGpsFix = false; planner.setPickedPosition(lon, lat); updatePlannerPanel(); onInteraction(); }
  function navigationTarget(): Readonly<PlannerPoint> | null {
    const state = planStore.getSnapshot();
    return state.activeLegIndex === null ? gpsTarget : state.waypoints[state.activeLegIndex] ?? state.destination;
  }
  function navigationText(): string {
    const target = navigationTarget();
    if (!target) return 'Select GPS target or navigate a complete flight plan.';
    if (!frame) return `GPS ${target.id} · Aircraft position unavailable`;
    const nav = pointNavigation({ lon_deg: frame.position[0], lat_deg: frame.position[1], heading_true_deg: frame.heading_deg }, target);
    if (!nav) return `GPS ${target.id} · Navigation unavailable`;
    const degrees = (value: number) => (Math.round(value) % 360).toString().padStart(3, '0');
    const bearing = nav.bearing_true_deg === null ? (nav.distance_nm < 1e-6 ? 'BRG — (at fix)' : 'BRG — (course unavailable)') : `BRG ${degrees(nav.bearing_true_deg)}°T`;
    const turn = nav.heading_error_deg === null ? '' : ` · ${nav.heading_error_deg < 0 ? 'L' : 'R'} ${Math.abs(nav.heading_error_deg).toFixed(0)}°`;
    const prefix = planStore.getSnapshot().activeLegIndex === null ? 'GPS' : 'PLAN GPS';
    return `${prefix} ${target.id} · ${bearing} · ${nav.distance_nm.toFixed(1)} NM · HDG ${degrees(frame.heading_deg)}°T${turn}${reviewing ? ' · Current plan / Review position' : ''}`;
  }
  function updatePlannerPanel(): void {
    const state = planStore.getSnapshot();
    const view = { state, legs: planLegs(state), navigationText: navigationText(), picking: pickingGpsFix, reviewing };
    planner.update(view);
    pickNotice.hidden = !pickingGpsFix; container.dataset.pickingGpsFix = String(pickingGpsFix);
    planOverlay.dataset.picking = String(pickingGpsFix); planPickCancel.hidden = !pickingGpsFix;
    planTitle.textContent = pickingGpsFix ? 'Pick a map position' : 'Flight plan';
  }
  function setDirectTo(point: Readonly<PlannerPoint>): PlanResult {
    const custom = planStore.getSnapshot().fixes.some(fix => fix.id === point.id && fix.lon_deg === point.lon_deg && fix.lat_deg === point.lat_deg && fix.source_label === point.source_label);
    if ((point as MapPoint).custom && !custom) return { ok: false, error: 'This custom GPS fix no longer exists.' };
    gpsTarget = Object.freeze({ ...point, ...(custom ? { custom: true as const } : {}) }); planStore.stopNavigation();
    gpsDataKey = 'dirty'; paintGpsTarget(); onInteraction();
    return { ok: true, value: undefined };
  }
  function handlePlannerAction(action: FlightPlanPanelAction): PlanResult<unknown> {
    const ok = { ok: true as const, value: undefined };
    let result: PlanResult<unknown> = ok;
    switch (action.type) {
      case 'create-fix': result = planStore.createFix(action.name, action.lat_deg, action.lon_deg); break;
      case 'remove-fix': result = planStore.removeFix(action.id); break;
      case 'set-point': result = planStore.setPoint(action.role, action.point); break;
      case 'remove-waypoint': result = planStore.removeWaypoint(action.index); break;
      case 'move-waypoint': result = planStore.moveWaypoint(action.index, action.direction); break;
      case 'activate-leg': result = planStore.activateLeg(action.index); if (result.ok) gpsTarget = null; break;
      case 'next-leg': result = planStore.nextLeg(); break;
      case 'stop-plan': planStore.stopNavigation(); break;
      case 'clear-plan': planStore.clearPlan(); break;
      case 'direct-to': result = setDirectTo(action.point); break;
      case 'pick-map':
        if (!visible) options.onRequestMap?.();
        if (!visible) return { ok: false, error: 'Open the flight map to pick a position.' };
        pickingGpsFix = true; break;
      case 'cancel-pick': pickingGpsFix = false; break;
      case 'edit-plan': {
        setPlanVisible(true, true);
        const details = planner.element.querySelector('details'); if (details) details.open = true;
        planOverlay.scrollTop = 0;
        planner.element.querySelector<HTMLInputElement>('input:not([disabled])')?.focus({ preventScroll: true }); break;
      }
      case 'fit-plan': {
        const points = planPoints(planStore.getSnapshot());
        if (!map || !points.length) return { ok: false, error: 'Add a start, waypoint or destination first.' };
        const bounds = new LngLatBounds(); points.forEach(point => bounds.extend([point.lon_deg, point.lat_deg]));
        setFollowing(false); map.fitBounds(bounds, { padding: 45, maxZoom: 13, duration: 0 }); break;
      }
    }
    if (result.ok) { gpsDataKey = 'dirty'; paintPlanner(); paintGpsTarget(); onInteraction(); }
    return result;
  }
  function paintPlanner(): void {
    updatePlannerPanel();
    if (!ready || !map) return;
    const state = planStore.getSnapshot(), points = planPoints(state), legs = planLegs(state);
    const key = JSON.stringify([points, state.activeLegIndex]);
    if (key !== plannerRouteKey) {
      plannerRouteKey = key;
      (map.getSource('flight-plan-route') as GeoJSONSource).setData({ type: 'FeatureCollection', features:
        legs.map(leg => ({ type: 'Feature', properties: { leg: leg.index, active: leg.index === state.activeLegIndex },
          geometry: { type: 'LineString', coordinates: [[leg.from.lon_deg, leg.from.lat_deg], [leg.to.lon_deg, leg.to.lat_deg]] } })) });
      planPointMarkers.splice(0).forEach(marker => marker.remove());
      points.forEach((point, index) => {
        const role = state.start && index === 0 ? 'Start' : state.destination && index === points.length - 1 ? 'Destination' : `Waypoint ${state.start ? index : index + 1}`;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'practice-map-plan-point';
        button.textContent = `${role === 'Start' ? 'S' : role === 'Destination' ? 'D' : role.split(' ')[1]} · ${point.id}`;
        button.dataset.planPointId = point.id;
        button.setAttribute('aria-label', `Flight plan ${role.toLowerCase()} ${point.name}`);
        button.dataset.active = String(state.activeLegIndex !== null && index === state.activeLegIndex + 1);
        button.onclick = event => { event.stopPropagation(); openPoint(point); onInteraction(); };
        planPointMarkers.push(new Marker({ element: button, anchor: 'top', offset: [0, 7] }).setLngLat([point.lon_deg, point.lat_deg]).addTo(map!));
      });
    }
    const markers = locationTypes.has('fix') ? state.fixes.filter(fix => !points.some(point => point.id === fix.id
      && point.lon_deg === fix.lon_deg && point.lat_deg === fix.lat_deg && point.source_label === fix.source_label)) : [];
    const markerKey = JSON.stringify(markers);
    if (markerKey !== plannerMarkerKey) {
      plannerMarkerKey = markerKey; customFixMarkers.splice(0).forEach(marker => marker.remove());
      for (const fix of markers) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'practice-map-custom-fix';
        button.textContent = `◇ ${fix.name}`; button.setAttribute('aria-label', `Select custom GPS fix ${fix.name}`);
        button.dataset.customFixId = fix.id;
        button.onclick = event => { event.stopPropagation(); openPoint(fix); onInteraction(); };
        customFixMarkers.push(new Marker({ element: button, anchor: 'bottom' }).setLngLat([fix.lon_deg, fix.lat_deg]).addTo(map));
      }
    }
  }
  function paintGpsTarget(): void {
    updatePlannerPanel();
    if (!ready || !map) return;
    const target = navigationTarget();
    gpsOverlay.hidden = !target;
    const key = target ? `${target.id}/${target.lon_deg}/${target.lat_deg}/${frame?.position.join('/')}/${frame?.heading_deg}/${reviewing}` : '';
    if (key === gpsDataKey) return;
    gpsDataKey = key;
    const features = target && frame ? [
      { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [frame.position, [target.lon_deg, target.lat_deg]] } },
      { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [target.lon_deg, target.lat_deg] } },
    ] : [];
    (map.getSource('gps-target') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
    gpsReadout.textContent = navigationText();
  }
  gpsClear.onclick = () => { gpsTarget = null; planStore.stopNavigation(); gpsDataKey = 'clear'; paintGpsTarget(); onInteraction(); };
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
  planOverlay.addEventListener('pointerdown', onInteraction); planOverlay.addEventListener('focusin', onInteraction);
  planOverlay.addEventListener('keydown', stopKey); planOverlay.addEventListener('keyup', stopKey);
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
    legend.textContent = `${reviewing ? 'Recorded path' : 'Flight track'} · ${value ? 'Following aircraft' : 'Fit view · press Follow to recenter'} · North up`;
  }

  function syncCountryPhotoLayers(): void {
    if (!ready || !map) return;
    for (const source of COUNTRY_IMAGERY) {
      const layerId = `country-photo-${source.id}`, show = visible && aerial && !countryPhotoBackoff.isBlocked(source.id);
      if (!map.getLayer(layerId)) continue;
      if (show && countryPhotoNeedsRefresh.has(source.id)) {
        // Recreate only this source and its layer, so every retry gets fresh
        // MapLibre tile objects and late errors cannot inherit a new ticket.
        countryPhotoEpoch[source.id]++;
        map.removeLayer(layerId); if (map.getSource(layerId)) map.removeSource(layerId);
        map.addSource(layerId, countryRasterSource(source));
        const index = COUNTRY_IMAGERY.findIndex(item => item.id === source.id);
        const next = COUNTRY_IMAGERY.slice(index + 1).find(item => map!.getLayer(`country-photo-${item.id}`));
        const before = next ? `country-photo-${next.id}` : map.getLayer('imagery') ? 'imagery' : undefined;
        map.addLayer(countryRasterLayer(source), before);
        countryPhotoNeedsRefresh.delete(source.id);
      }
      const next = show ? 'visible' : 'none';
      const current = map.getLayoutProperty(layerId, 'visibility');
      if (current !== next) {
        if (current === 'visible' && next === 'none') countryPhotoNeedsRefresh.add(source.id);
        countryPhotoEpoch[source.id]++; map.setLayoutProperty(layerId, 'visibility', next);
      }
    }
  }
  function setAerial(value: boolean): void {
    aerial = value;
    updateLayerCaption();
    mapLayer.setAttribute('aria-pressed', String(!value));
    aerialLayer.setAttribute('aria-pressed', String(value));
    viewport.setAttribute('aria-label', `North-up ${value ? 'aerial imagery' : 'public map'} and recorded flight path`);
    if (ready && map) {
      map.setLayoutProperty('imagery', 'visibility', value ? 'visible' : 'none');
      syncCountryPhotoLayers(); refreshMapStatus();
    }
  }

  function updateLayerCaption(): void {
    caption.textContent = `${aerial ? 'Regional aerial imagery, including Switzerland and Austria where available · capture dates vary; global OSM fallback.' : 'Public map · not a navigation chart.'}${vector ? ' Terrain: map without labels.' : ''} Worldwide community airport/NAV discovery near map centre. Receiver signals use a separate historical NAV810 inventory; published fix coverage remains regional.`;
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

  function paintWorldNavigation(): void {
    if (!map || !ready) return;
    const visibleNavs = locationTypes.has('nav') ? worldSnapshot?.navaids ?? [] : [];
    if (paintedWorldNavaids !== visibleNavs) {
      const source = map.getSource('world-navigation-aids') as GeoJSONSource | undefined;
      source?.setData({ type: 'FeatureCollection', features: visibleNavs.map(nav => ({
        type: 'Feature', id: nav.id, geometry: { type: 'Point', coordinates: [nav.lon, nav.lat] }, properties: { id: nav.id, type: nav.type },
      })) });
      paintedWorldNavaids = visibleNavs;
    }
    const labelled = nearby(visibleNavs.filter(nav => !navigationData.features.some(feature =>
      feature.properties.identifier === nav.ident && Math.abs(feature.geometry.coordinates[0] - nav.lon) < .01
      && Math.abs(feature.geometry.coordinates[1] - nav.lat) < .01)), nav => [nav.lon, nav.lat]);
    const key = labelled.map(nav => nav.id).join(',');
    if (key === worldNavMarkerKey) return;
    worldNavMarkerKey = key; worldNavMarkers.splice(0).forEach(marker => marker.remove());
    for (const nav of labelled) {
      const element = document.createElement('button'); element.type = 'button'; element.className = 'practice-map-navigation-marker';
      element.dataset.kind = nav.type; element.dataset.worldRecordId = nav.id;
      element.setAttribute('aria-label', `Show navigation aid ${nav.ident}, ${nav.type}, OurAirports community discovery`);
      const symbol = document.createElement('span'); symbol.className = 'practice-map-navigation-symbol'; symbol.textContent = nav.type.includes('VOR') ? '◇' : '○';
      const label = document.createElement('span'); label.className = 'practice-map-navigation-label'; label.textContent = `${nav.ident} ${nav.type}`;
      element.append(symbol, label); element.addEventListener('click', event => { event.stopPropagation(); openPoint(worldNavaidPoint(nav)); onInteraction(); });
      worldNavMarkers.push(new Marker({ element, offset: [0, -15] }).setLngLat([nav.lon, nav.lat]).addTo(map));
    }
  }

  function updateComDirectory(): void {
    if (!comDirectory) return;
    comByAirport = new Map();
    for (const station of comDirectory.stations) {
      const rows = comByAirport.get(station.airport_id) ?? []; rows.push(station); comByAirport.set(station.airport_id, rows);
    }
    if (comPanel) { comPanel.updateDirectory(airports, comDirectory); return; }
    comPanel = createAirportComPanel({ airports, directory: comDirectory,
      onTune(receiver, channel) { if (!reviewing && (options.canTuneCom?.() ?? true)) options.onTuneCom?.(receiver, channel); },
      onSelectAirport(id) { const airport = airports.find(a => a.id === id); if (airport) selectAirport(airport); },
    });
    airportsSection.after(comPanel.element); comPanel.selectAirport(selectedAirport); comPanel.element.open = false;
    comPanel.setEnabled(!reviewing && !!options.onTuneCom && (options.canTuneCom?.() ?? true));
  }

  function applyWorldSnapshot(snapshot: WorldAirportSnapshot | null): void {
    if (disposed) return;
    worldSnapshot = snapshot; airports = snapshot?.airports ?? regionalAirports;
    worldAirportIds = new Set(snapshot?.airports.map(a => a.id) ?? []); runwayByAirport = new Map();
    for (const runway of snapshot?.runways ?? []) {
      const rows = runwayByAirport.get(runway.airport_id) ?? []; rows.push(runway); runwayByAirport.set(runway.airport_id, rows);
    }
    comDirectory = snapshot ? { stations: snapshot.com, source: snapshot.source, retrieved: snapshot.retrieved } : regionalComDirectory;
    container.dataset.worldAirportsCount = String(snapshot?.airports.length ?? 0);
    container.dataset.worldNavaidsCount = String(snapshot?.navaids.length ?? 0);
    container.dataset.worldAirportsRevision = snapshot?.source_commit ?? '';
    container.dataset.worldAirportsFallback = String(!snapshot);
    updateComDirectory(); refreshPointSearch(); renderAirports(); paintWorldNavigation();
    if (selectedPoint?.world_record_id) {
      const airport = snapshot?.airports.find(a => a.id === selectedPoint!.world_record_id);
      const nav = snapshot?.navaids.find(n => n.id === selectedPoint!.world_record_id);
      if (airport || nav) { selectedPoint = airport ? airportPoint(airport) : worldNavaidPoint(nav!); refreshPointPopup(); }
      else { pointPopup?.remove(); pointPopup = null; selectedPoint = null; }
    }
  }

  function requestWorldCenter(): void {
    const center = following && frame ? frame.position : map ? [map.getCenter().lng, map.getCenter().lat] : null;
    if (center) worldLoader?.updateCenter(((center[0] + 180) % 360 + 360) % 360 - 180, center[1]);
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
    const unwrappedPath = unwrapMapPath(frame.path, frame.position[0]);
    const pathKey = JSON.stringify(unwrappedPath);
    if (pathKey !== paintedPath) {
      (map.getSource('recorded-path') as GeoJSONSource).setData({
        type: 'FeatureCollection', features: frame.path.length < 2 ? [] : [{
          type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: unwrappedPath },
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

  function changeZoom(direction: 1 | -1): void {
    if (!map || !ready || disposed || !visible || (direction !== 1 && direction !== -1)) return;
    map.jumpTo({ zoom: Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + direction)) });
  }
  listen(zoomOut, () => changeZoom(-1));
  listen(zoomIn, () => changeZoom(1));
  listen(fit, () => {
    if (!map || !frame) return;
    const coordinates = frame.path.length ? unwrapMapPath(frame.path, frame.position[0]) : [frame.position];
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
    zoom(direction) { if (!disposed && visible && ready) { onInteraction(); changeZoom(direction); } },
    getGpsTarget() { return disposed ? null : navigationTarget(); },
    setPlanVisible,
    toggleOverlap() {
      if (disposed) return;
      const enabled = container.dataset.extendedMenu !== 'true';
      container.dataset.extendedMenu = String(enabled); extendedMenu.hidden = !enabled;
      overlap.setAttribute('aria-pressed', String(enabled)); overlap.setAttribute('aria-expanded', String(enabled));
    },
    update(state, path, mode, pathOptions) {
      if (disposed) return;
      const wasReviewing = reviewing; reviewing = mode === 'review';
      if (wasReviewing !== reviewing) setFollowing(following);
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
      modeLabel.textContent = mode === 'review' ? 'Recorded review' : pathOptions?.simplified ? 'Live · Track simplified' : 'Live';
      markerStartsAtRecording = mode === 'review' || !!pathOptions?.recordingStart;
      if (start) start.getElement().textContent = markerStartsAtRecording ? 'Recording start' : 'Trace start';
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
      if (following) requestWorldCenter();
      const lat = latitude_deg * Math.PI / 180, lon = longitude_deg * Math.PI / 180;
      if (!searchPosition || distanceMeters(lat, lon, searchPosition.lat, searchPosition.lon) >= 500) {
        searchPosition = { lat, lon }; pointSearch.setPosition(longitude_deg, latitude_deg);
      }
      readout.textContent = `${Math.abs(latitude_deg).toFixed(4)}° ${latitude_deg < 0 ? 'S' : 'N'}  ${Math.abs(longitude_deg).toFixed(4)}° ${longitude_deg < 0 ? 'W' : 'E'}  ·  ${(Math.round(frame.heading_deg) % 360).toString().padStart(3, '0')}° true`;
      refreshMapStatus();
      if (!visible) updatePlannerPanel();
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
      visible = value; ofmOverlay?.setVisible(value);
      syncCountryPhotoLayers(); refreshMapStatus();
      if (!value) { pointPopup?.remove(); pointPopup = null; }
      container.hidden = !value;
      if (value) { map?.resize(); requestWorldCenter(); paint(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true; pointPopup?.remove(); pointSearch.dispose(); planner.dispose(); planOverlay.remove(); customFixMarkers.splice(0).forEach(marker => marker.remove()); planPointMarkers.splice(0).forEach(marker => marker.remove()); fixMarkers.splice(0).forEach(marker => marker.remove());
      removeCountryPhotoBackoff(); abort.abort(); worldLoader?.dispose(); ++worldSelectionGeneration; ++worldwideSearchGeneration; worldwideSearchHits.clear(); comPanel?.dispose();
      observer.disconnect();
      removers.forEach((remove) => remove());
      container.removeEventListener('pointerdown', onInteraction);
      container.removeEventListener('focusin', onInteraction);
      container.removeEventListener('keydown', stopKey);
      container.removeEventListener('keyup', stopKey);
      airportMarkers.forEach((marker) => marker.remove());
      navigationMarkers.forEach((marker) => marker.remove());
      worldNavMarkers.forEach((marker) => marker.remove());
      circuitMarkers.forEach((marker) => marker.remove());
      aircraft?.remove();
      start?.remove();
      mapCreditObserver?.disconnect();
      removeVisibleSpainCredit?.();
      if (options.creditsContainer) { options.creditsContainer.replaceChildren(); options.creditsContainer.parentElement!.hidden = true; }
      ofmOverlay?.dispose(); map?.remove();
      container.replaceChildren();
    },
  };

  try {
    const style: StyleSpecification = {
      version: 8,
      sources: {
        ...createWorldMapStyle().sources,
        'navigation-fixes': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'flight-plan-route': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'gps-target': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        basemap: { type: 'raster', tiles: ['/scenery/map/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 5, maxzoom: 16, bounds: [...AIRFIELD_BOUNDS] },
        imagery: { type: 'raster', tiles: ['/scenery/imagery/{z}/{x}/{y}.png'], tileSize: 512, minzoom: 7, maxzoom: 15, bounds: [6, 47, 14, 51.75] },
        ...Object.fromEntries(COUNTRY_IMAGERY.map(source => [`country-photo-${source.id}`, countryRasterSource(source)])),
        'recorded-path': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        airfields: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'navigation-aids': { type: 'geojson', data: navigationData },
        'world-navigation-aids': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        'practice-circuit': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      },
      layers: [
        ...worldMapLayers(),
        ...worldMapLabelLayers(),
        { id: 'basemap', type: 'raster', source: 'basemap', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } },
        ...COUNTRY_IMAGERY.map(countryRasterLayer),
        { id: 'imagery', type: 'raster', source: 'imagery', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } },
        { id: 'navigation-fixes', type: 'circle', source: 'navigation-fixes', minzoom: 8, paint: { 'circle-radius': 3, 'circle-color': '#e3a1e8', 'circle-stroke-color': '#34203e', 'circle-stroke-width': 1 } },
        { id: 'flight-plan-route-casing', type: 'line', source: 'flight-plan-route', paint: { 'line-color': '#123342', 'line-width': 8, 'line-opacity': .95 } },
        { id: 'flight-plan-route-line', type: 'line', source: 'flight-plan-route', paint: { 'line-color': ['case', ['get', 'active'], '#ffdb6c', '#6fd9ff'], 'line-width': ['case', ['get', 'active'], 5, 3.5] } },
        { id: 'gps-target-line', type: 'line', source: 'gps-target', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#ff8af1', 'line-width': 2, 'line-dasharray': [3, 2] } },
        { id: 'gps-target-point', type: 'circle', source: 'gps-target', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 7, 'circle-color': '#ff8af1', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } },
        { id: 'airfields', type: 'circle', source: 'airfields', paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 13, 5],
          'circle-color': ['match', ['get', 'type'], 'closed', '#858b91', 'heliport', '#e3bc75', '#89cfff'],
          'circle-stroke-color': '#15222d', 'circle-stroke-width': 1,
        } },
        { id: 'navigation-stations', type: 'circle', source: 'navigation-aids', filter: ['==', ['get', 'component'], 'station'],
          paint: { 'circle-radius': 4, 'circle-color': '#d7a6ef', 'circle-stroke-color': '#24202d', 'circle-stroke-width': 1.5 } },
        { id: 'world-navigation-stations', type: 'circle', source: 'world-navigation-aids',
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
            if (target.origin === window.location.origin && /^\/scenery\/(?:map|imagery|osm|photo-country)\//.test(target.pathname))
              return { url, headers: { 'X-Gefly-Scenery-Priority': 'visible' } };
          } catch { /* Preserve MapLibre's handling of other request URLs. */ }
        }
        return { url };
      },
    });
    const mapAttribution = viewport.querySelector('.maplibregl-ctrl-attrib-inner');
    if (mapAttribution) removeVisibleSpainCredit = showVisibleSpainCredit(viewport, mapAttribution, 28);
    if (mapAttribution && options.creditsContainer) {
      const target = options.creditsContainer;
      const syncMapCredits = () => {
        target.replaceChildren(...Array.from(mapAttribution.childNodes, child => child.cloneNode(true)));
        if (target.parentElement) target.parentElement.hidden = !target.textContent?.trim();
      };
      mapCreditObserver = new MutationObserver(syncMapCredits);
      mapCreditObserver.observe(mapAttribution, { childList: true, subtree: true, characterData: true });
      syncMapCredits();
    }
    ofmOverlay = createOfmMapOverlay({ map, controls: ofmControls, visible, onInteraction, loadSource: loadOfmOverlaySource });
    map.addControl(new ScaleControl({ unit: 'nautical', maxWidth: 100 }), 'bottom-left');
    viewport.append(trajectory);
    map.on('move', () => { paintTrajectory(); refreshMapStatus(); }); map.on('resize', paintTrajectory);
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.on('moveend', () => { requestWorldCenter(); paintAirports(); paintNavigation(); paintWorldNavigation(); paintFixes(); paintCircuit(); });
    map.on('click', 'world-navigation-stations', event => { const nav = worldSnapshot?.navaids.find(n => n.id === event.features?.[0]?.properties.id); if (nav) { openPoint(worldNavaidPoint(nav)); onInteraction(); } });
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
    map.on('click', event => { if (pickingGpsFix) pickGpsPosition(event.lngLat.lng, event.lngLat.lat); });
    map.on('dragstart', () => { setFollowing(false); onInteraction(); });
    map.on('zoomstart', (event) => { if (event.originalEvent) { setFollowing(false); onInteraction(); } });
    try {
      worldLoader = createWorldAirportLoader({
        onStatus(state) {
          if (disposed) return;
          worldStatus.textContent = `${state.message} · details near map centre · community source`;
          container.dataset.worldAirportsStatus = state.status;
          container.dataset.worldAirportsCached = String(state.cached);
          container.dataset.worldAirportsCacheBytes = String(state.cacheBytes);
          if (state.status === 'empty' && latestWorldSnapshot) applyWorldSnapshot(latestWorldSnapshot);
          if (state.status === 'unavailable') applyWorldSnapshot(null);
        },
        onSnapshot(snapshot) {
          if (disposed) return;
          latestWorldSnapshot = snapshot;
          // An empty loading/failed publication is not verified empty coverage.
          // Keep the regional fallback until actual records or an empty status arrive.
          applyWorldSnapshot(snapshot.airports.length || snapshot.navaids.length ? snapshot : null);
        },
      });
      requestWorldCenter();
    } catch { worldStatus.textContent = 'Worldwide discovery unavailable; bundled regional inventory remains available.'; }
    void loadAirportCatalogue(abort.signal).then((data) => {
      if (disposed || !map) return;
      regionalAirports = data; if (!worldSnapshot) airports = data; refreshPointSearch();
      renderAirports();
      void loadAirportComDirectory(abort.signal).then(directory => {
        if (disposed) return;
        regionalComDirectory = directory; if (!worldSnapshot) comDirectory = directory;
        updateComDirectory(); refreshPointSearch();
        if (selectedPoint?.kind === 'airport') { const airport = airports.find(a => a.id === selectedPoint!.id || a.icao === selectedPoint!.id); if (airport) { selectedPoint = airportPoint(airport); refreshPointPopup(); } }
      }).catch(() => { if (!disposed) { const notice = document.createElement('p'); notice.textContent = 'COM directory unavailable'; airportsSection.after(notice); } });
    }).catch(() => { if (!disposed) airportStatus.textContent = 'Airport catalogue unavailable.'; });
    const arrow = document.createElement('div');
    arrow.className = 'practice-map-aircraft';
    arrow.textContent = '▲';
    arrow.setAttribute('aria-label', 'Aircraft position and true heading');
    aircraft = new Marker({ element: arrow, rotationAlignment: 'map' });
    const origin = document.createElement('div');
    origin.className = 'practice-map-start';
    origin.textContent = markerStartsAtRecording ? 'Recording start' : 'Trace start';
    start = new Marker({ element: origin, anchor: 'left', offset: [5, 0] });
    map.on('sourcedataloading', event => {
      const sourceId = event.sourceId, tile = (event as typeof event & { tile?: object }).tile;
      const source = COUNTRY_IMAGERY.find(item => sourceId === `country-photo-${item.id}`);
      if (source && tile && visible && aerial) countryPhotoTiles.set(tile, { id: source.id,
        generation: countryPhotoBackoff.generation(source.id), epoch: countryPhotoEpoch[source.id] });
    });
    map.on('sourcedata', event => {
      const tile = (event as unknown as { tile?: { state?: string } }).tile;
      const ticket = tile ? countryPhotoTiles.get(tile) : undefined;
      if (ticket && tile?.state === 'loaded' && visible && aerial && ticket.epoch === countryPhotoEpoch[ticket.id]
        && ticket.generation === countryPhotoBackoff.generation(ticket.id) && countryPhotoProblems.delete(ticket.id)) refreshMapStatus();
    });
    map.on('error', event => {
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;
      if (disposed || sourceId === OFM_OVERLAY_ID) return;
      const country = COUNTRY_IMAGERY.find(source => sourceId === `country-photo-${source.id}`);
      if (country) {
        const tile = (event as typeof event & { tile?: object }).tile, ticket = tile && countryPhotoTiles.get(tile);
        if (visible && aerial && ticket && ticket.id === country.id && ticket.epoch === countryPhotoEpoch[country.id]
          && ticket.generation === countryPhotoBackoff.generation(country.id)) {
          countryPhotoProblems.add(country.id); countryPhotoBackoff.failure(country.id, ticket.generation); refreshMapStatus();
        }
        return;
      }
      failed = true;
      refreshMapStatus();
    });
    // Local overlays must initialize even when the first raster tiles fail.
    map.on('style.load', () => {
      if (disposed) return;
      ready = true;
      refreshMapStatus();
      [...buttons, ...layerButtons].forEach((button) => { button.disabled = false; });
      circuitToggle.disabled = false;
      circuitDataKey = ''; circuitLabelKey = ''; circuitLegKey = ''; paintedFixes = undefined;
      airportSourceKey = ''; paintedNavigationData = undefined; paintedWorldNavaids = undefined;
      refreshCircuit();
      const savedVector = vector; setAerial(aerial); if (savedVector) setVector(true);
      paintAirports();
      paintNavigation();
      paintWorldNavigation(); requestWorldCenter();
      paintFixes();
      gpsDataKey = ''; plannerRouteKey = ''; plannerMarkerKey = ''; paintPlanner();
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
