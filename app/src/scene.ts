import { createOsmReliefMaterial, supportsOsmRelief } from './osm-relief.ts';
import { COUNTRY_IMAGERY, COUNTRY_PHOTO_MAX_LEVEL, COUNTRY_PHOTO_MIN_LEVEL, countryPhotoCandidates, countryPhotoTileMayContain, countryPhotoUrl, type PhotoCountry } from './country-imagery.ts';
import { countryPhotoBackoff } from './country-photo-backoff.ts';
import { showVisibleSpainCredit } from './visible-photo-credit.ts';
import { CHASE_DISTANCE } from './chase-distance.ts';
import { setCameraPose } from './camera-pose.ts';
import { overviewCameraENU } from './overview-camera.ts';
import { createTerrainOverviewSource } from './terrain-overview-source.ts';
import { createSceneryCache } from './scenery-cache';
import { createLandmarkLabels, LANDMARK_CREDIT } from './landmark-labels';
import { createAirportScenery, AIRPORT_VECTOR_CREDIT } from './airport-scenery';
import {
  Axis, Cartesian3, Cartographic, CesiumWidget, Color, Credit, Ellipsoid, EllipsoidTerrainProvider, GeographicTilingScheme,
  ImageryLayer, Ion, JulianDate, UrlTemplateImageryProvider,
  Matrix3, Matrix4, Model, PerspectiveFrustum, Quaternion, Rectangle, RequestScheduler, Resource, ShadowMode, SingleTileImageryProvider, Transforms,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createForwardMarker } from './forward-marker';
import { projectBodyDirections } from './forward-marker-projection';
import { createAircraftVisual } from './aircraft-visual';
import { AIRCRAFT_CONTROL_SURFACES, controlSurfaceAngle } from './aircraft-control-surfaces';
import { createAircraftShadow } from './aircraft-shadow';
import { createApproachGuideRenderer } from './approach-guide-render.ts';
import { createPublicTerrainProvider } from './terrain-provider';
import { createStreamedTerrainProvider } from './streamed-terrain-provider';
import { createGlobalTerrainProvider, tryUpdateGlobalTerrainProvider, tryUpdateGlobalTerrainOverview, acceptGlobalTerrainOverviewSource, closeGlobalTerrainOverview, globalTerrainOverviewInfo } from './global-terrain-provider';
import { createTerrainDetailBudget } from './terrain-detail-budget.ts';
import { TerrainOverview, type TerrainOverviewGrid, type TerrainOverviewStatus } from './terrain-overview.ts';
import { createTerrainDisplayInfo, sameTerrainTiles } from './terrain-display-info';
import { REGIONAL_TERRAIN, loadRegionalManifestOptional, WorldTerrainStream, sampleAtlas, atlasGridAt, type AtlasTile } from '../../studies/e1-browser/sim/terrain-stream.js';
import { loadWorldTerrainPackage, worldCellAt } from '../../studies/e1-browser/sim/world-terrain.js';
import { createRegionalImageryProvider } from './regional-imagery';
import { createMapTerrainImagery } from './map-terrain-imagery';
import { imageryStatusText, parsePhotoCompositorStatus, withPhotoCompositorNotice, type PhotoCompositorState } from './imagery-status';
import { loadTerrainPackage, sampleTerrain, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { aircraftBasisENU, boundedCameraLook, cockpitCameraENU, chaseCameraENU, type CameraLook } from './aircraft-orientation';
import { DEFAULT_FOV_RAD, MIN_FOV_RAD, MAX_FOV_RAD } from './field-of-view.ts';
import { WORLD_MAP_MAX_LATITUDE } from './world-map-style';
import type { FlightScene, FlightState } from './types';

const DEG_RAD = Math.PI / 180;
// Bundled, source-backed starter photograph: fixed coverage and no runtime
// dependency on a live WMS. Provenance/license/hash: public/imagery/SOURCE.json.
const DETAIL = Rectangle.fromDegrees(8.62, 49.95, 8.66, 49.975);
const AIRPORT_DETAIL = Rectangle.fromDegrees(8.628, 49.954, 8.660, 49.966);
const OVERVIEW = Rectangle.fromDegrees(8.4, 49.8, 8.9, 50.1);
function inside(rectangle: Rectangle, state: FlightState): boolean {
  return state.lon_rad >= rectangle.west && state.lon_rad <= rectangle.east
    && state.lat_rad >= rectangle.south && state.lat_rad <= rectangle.north;
}
const INITIAL_STATE: FlightState = {
  step: 0, t_s: 0, lat_rad: 49.96 * DEG_RAD, lon_rad: 8.643 * DEG_RAD,
  alt_msl_m: 1300 * 0.3048, pitch_rad: 0, roll_rad: 0,
  heading_rad: 82 * DEG_RAD, tas_mps: 90 * 1852 / 3600,
};

/** Original visual relief from the actual elevation field, not a photograph or
 * a real-time lighting/weather claim. Official photographs are drawn above it.
 */
function elevationRelief(grid: TerrainGrid): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(513, grid.width); canvas.height = Math.min(513, grid.height);
  const context = canvas.getContext('2d')!, image = context.createImageData(canvas.width, canvas.height);
  const height = (x: number, y: number) => grid.physical_m[y * grid.width + x] + grid.geoid_m[y * grid.width + x];
  const radius = Ellipsoid.WGS84.maximumRadius;
  const dx = (grid.east_rad - grid.west_rad) / (grid.width - 1);
  const dy = (grid.north_rad - grid.south_rad) / (grid.height - 1);
  for (let row = 0; row < canvas.height; row++) {
    const y = Math.round((1 - row / (canvas.height - 1)) * (grid.height - 1));
    const south = Math.max(0, y - 1), north = Math.min(grid.height - 1, y + 1);
    const latitude = grid.south_rad + y * dy;
    for (let column = 0; column < canvas.width; column++) {
      const x = Math.round(column / (canvas.width - 1) * (grid.width - 1));
      const west = Math.max(0, x - 1), east = Math.min(grid.width - 1, x + 1);
      const eastSlope = (height(east, y) - height(west, y)) / ((east - west) * dx * radius * Math.cos(latitude));
      const northSlope = (height(x, north) - height(x, south)) / ((north - south) * dy * radius);
      const light = (.5 * eastSlope - .5 * northSlope + Math.SQRT1_2) / Math.hypot(eastSlope, northSlope, 1);
      const brightness = Math.max(.3, Math.min(1.2, .55 + .65 * light)), index = (row * canvas.width + column) * 4;
      image.data[index] = Math.round(58 * brightness); image.data[index + 1] = Math.round(86 * brightness);
      image.data[index + 2] = Math.round(69 * brightness); image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0); return canvas;
}

/** Bundled public terrain and photographs share the worker's elevation package.
 * Physical H and GCG2016 ζ are converted outside dynamics to render h = H + ζ.
 * Explicit flat-ground/legacy studies retain their ellipsoid receiver.
 * Renderer state never feeds the flight model.
 */
export async function createScene(container: HTMLElement, creditContainer?: HTMLElement): Promise<FlightScene> {
  const [terrainGrid, worldGrid] = await Promise.all([loadTerrainPackage(), loadWorldTerrainPackage()]);
  const sceneryCache = createSceneryCache(container);
  const publicTerrain = createPublicTerrainProvider(terrainGrid);
  let activeTerrain = publicTerrain;
  const recordingTiles = new Map<string, TerrainGrid>();
  let liveTiles: TerrainGrid[] = [], recordingLoad: WorldTerrainStream | null = null, recordingVersion = 0;
  let recordingController: AbortController | null = null;
  let streamedTiles: TerrainGrid[] = [], atlasTiles = new Map<string,AtlasTile>();
  let terrainRevision = 0, providerKey = '';
  let globalProviderLive = false;
  let terrainDisplayInfo = createTerrainDisplayInfo([]);
  let liveLayers = false;
  const atlasSample=(lat:number,lon:number)=>streamedTiles.length ? sampleAtlas(terrainGrid,atlasTiles,lat,lon) : sampleTerrain(terrainGrid,lat,lon);
  const flatTerrain = new EllipsoidTerrainProvider();
  const initialGround = sampleTerrain(terrainGrid, INITIAL_STATE.lat_rad, INITIAL_STATE.lon_rad);
  if (!initialGround) throw new Error('Initial visual position is outside the public terrain package');
  // A placeholder view only, replaced by the first authoritative worker frame.
  const initialVisual: FlightState = { ...INITIAL_STATE, terrain_profile: 1,
    terrain_height_msl_m: initialGround.physical_m, terrain_geoid_m: initialGround.geoid_m,
    terrain_height_ellipsoid_m: initialGround.ellipsoid_m,
    ground_height_ellipsoid_m: INITIAL_STATE.alt_msl_m + initialGround.geoid_m,
    ground_agl_m: INITIAL_STATE.alt_msl_m - initialGround.physical_m };
  let terrainEnabled = true;
  Ion.defaultAccessToken = '';
  // Local HTTP/1.1 has six connections. Leave room for worker scripts and
  // terrain data instead of filling every connection with live photographs.
  RequestScheduler.maximumRequestsPerServer = 2;
  const credits = document.createElement('div');
  credits.className = 'scene-credits';
  if (!creditContainer) credits.style.cssText = 'position:absolute;left:10px;right:10px;bottom:5px;z-index:1;font:10px/1.3 system-ui;color:white;text-shadow:0 1px 3px #000;';
  (creditContainer ?? container).appendChild(credits);
  const removeVisibleSpainCredit = showVisibleSpainCredit(container, credits, 4);
  let widget: CesiumWidget;
  try { widget = new CesiumWidget(container, {
    creditContainer: credits,
    creditViewport: creditContainer ? document.body : container,
    baseLayer: false,
    terrainProvider: publicTerrain,
    useDefaultRenderLoop: false,
    useBrowserRecommendedResolution: true,
    showRenderLoopErrors: false,
    scene3DOnly: true,
    shadows: true,
    msaaSamples: 2,
    contextOptions: { webgl: { alpha: false, antialias: true, powerPreference: 'high-performance' } },
  }); } catch (error) { removeVisibleSpainCredit(); credits.remove(); throw error; }
  widget.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
  widget.canvas.setAttribute('aria-label', 'Hessen aerial imagery and public terrain flight scene');
  widget.canvas.setAttribute('tabindex', '-1');
  const scene = widget.scene;
  let vectorScenery = false;
  // This optional visual aid needs fragment derivatives. Keep ordinary
  // imagery usable on older contexts and if the material fails to compile.
  let reliefFailed = !supportsOsmRelief(widget.canvas);
  let osmRelief: ReturnType<typeof createOsmReliefMaterial> | undefined;
  if (!reliefFailed) {
    try { osmRelief = createOsmReliefMaterial(); }
    catch { reliefFailed = true; }
  }
  const removeReliefError = scene.renderError.addEventListener((_scene, error) => {
    if (osmRelief && scene.globe.material === osmRelief && /shader.*(?:compile|link)|(?:compile|link).*shader|program.*link/i.test(String(error))) {
      reliefFailed = true;
      scene.globe.material = undefined;
      container.dataset.osmRelief = 'unsupported';
      scene.requestRender();
    }
  });
  const airportScenery = createAirportScenery(scene, (lat, lon) => atlasSample(lat, lon)?.ellipsoid_m ?? null);
  widget.creditDisplay.addStaticCredit(new Credit(AIRPORT_VECTOR_CREDIT + ' · <a href="https://www.openstreetmap.org/copyright">Source / licence</a>', true));
  const landmarkLabels = createLandmarkLabels(scene, container, (lat, lon) => {
    const height = atlasSample(lat, lon)?.ellipsoid_m ?? scene.globe.getHeight(Cartographic.fromRadians(lon, lat));
    return typeof height === 'number' && Number.isFinite(height) ? height : null;
  });
  const landmarkCredit = new Credit(LANDMARK_CREDIT, true);
  let landmarkCreditVisible = false;
  const aircraftShadow = createAircraftShadow(scene, container);
  const approachGuide = createApproachGuideRenderer(scene, container, (lat, lon) => atlasSample(lat, lon)?.ellipsoid_m ?? null);
  const forwardMarker = createForwardMarker(container);
  let directionReferencesVisible = false;
  // View-only hysteresis: 22° also clears the default 20.14° chase orbit.
  const showDirectionsAt_rad = 25 * Math.PI / 180, hideDirectionsAt_rad = 22 * Math.PI / 180;
  const header = container.parentElement?.querySelector<HTMLElement>('.topbar');
  scene.screenSpaceCameraController.enableInputs = false;
  scene.globe.enableLighting = false;
  scene.globe.baseColor = Color.fromCssColorString('#263a37');
  scene.globe.maximumScreenSpaceError = 3;
  scene.globe.tileCacheSize = 256;
  scene.globe.preloadSiblings = false;
  scene.globe.depthTestAgainstTerrain = true;
  scene.fog.enabled = true;
  scene.fog.density = 0.00004; // Fixed visual haze, not a weather observation.
  scene.fog.minimumBrightness = 0.65;
  scene.backgroundColor = Color.fromCssColorString('#80b7d8');
  scene.highDynamicRange = true;
  scene.postProcessStages.fxaa.enabled = true;
  widget.clock.currentTime = JulianDate.fromIso8601('2026-06-21T10:00:00Z');
  widget.clock.shouldAnimate = false;
  if (scene.camera.frustum && 'near' in scene.camera.frustum) scene.camera.frustum.near = 0.15;

  // The app hosts live credits in its Credits menu; standalone scenes retain
  // their original overlay. Keep Cesium/provider content and source links intact.
  const credit = credits.querySelector('.cesium-widget-credits') as HTMLElement | null;
  if (credit && !creditContainer) { credit.style.right = '0'; credit.style.left = 'auto'; credit.style.maxWidth = '100%'; credit.style.textAlign = 'right'; }
  const status = document.createElement('div');
  status.id = 'imagery-status';
  status.setAttribute('role', 'status');
  status.style.cssText = 'position:absolute;right:12px;bottom:38px;max-width:330px;padding:7px 10px;border-radius:4px;background:#10272cdd;color:#e5eadd;font:11px/1.4 system-ui;z-index:2;pointer-events:none;';
  status.textContent = 'Loading southern Germany aerial imagery…';
  container.appendChild(status);
  container.dataset.imagery = 'loading';

  let disposed = false;
  let imagerySettled = false;
  let detailLoaded = false;
  let airportLoaded = false;
  let overviewLoaded = false;
  let regionalImagery: Awaited<ReturnType<typeof createRegionalImageryProvider>> | null = null;
  let regionalSettled = false;
  let removeCameraListener: (() => void) | null = null;
  let airportLayer: ImageryLayer | null = null;
  const starterLayers: ImageryLayer[] = [];
  let localRegionalLayer: ImageryLayer | null = null;
  let livePhotoLayer: ImageryLayer | null = null;
  const countryPhotoLayers = new Map<PhotoCountry, ImageryLayer>();
  const countryPhotoFailures = new Set<PhotoCountry>();
  const countryPhotoEpoch: Record<PhotoCountry, number> = { ch: 0, at: 0, nrw: 0, bb: 0, es: 0 };
  let worldMap: Awaited<ReturnType<typeof createMapTerrainImagery>> | null = null;
  let worldMapLayer: ImageryLayer | null = null;
  let worldMapLoad: Promise<void> | null = null;
  let worldMapStatus: 'loading' | 'ready' | 'degraded' = 'loading';
  // Asked only after a photo tile failure, so a missing Python Pillow is named in the status.
  let photoCompositor: PhotoCompositorState = 'unknown', photoCompositorCheckedAt = -Infinity, photoCompositorCheck = false;
  let photoCompositorPoll: ReturnType<typeof setTimeout> | undefined;
  function orderPhotographs() {
    // Photographs cover the OSM map only in Photo mode. Vector mode uses the
    // same detailed OSM presentation everywhere, independent of regional bounds.
    if(worldMapLayer)scene.imageryLayers.raiseToTop(worldMapLayer);
    for (const layer of countryPhotoLayers.values()) scene.imageryLayers.raiseToTop(layer);
    if(livePhotoLayer)scene.imageryLayers.raiseToTop(livePhotoLayer);
    if(localRegionalLayer)scene.imageryLayers.raiseToTop(localRegionalLayer);
    for(const layer of starterLayers)scene.imageryLayers.raiseToTop(layer);
    applyImageryMode();
  }
  function applyImageryMode(useTerrain = lastState.terrain_profile === 1): void {
    const wantsRelief = vectorScenery && useTerrain;
    const nextMaterial = wantsRelief && !reliefFailed ? osmRelief : undefined;
    if (scene.globe.material !== nextMaterial) scene.globe.material = nextMaterial;
    const reliefStatus = wantsRelief ? (nextMaterial ? 'active' : 'unsupported') : 'off';
    if (container.dataset.osmRelief !== reliefStatus) container.dataset.osmRelief = reliefStatus;
    for (let i = 0; i < scene.imageryLayers.length; i++) {
      const layer = scene.imageryLayers.get(i);
      // Failed or unavailable photographs expose OSM beneath them.
      const photoSource = COUNTRY_IMAGERY.find(source => layer === countryPhotoLayers.get(source.id));
      const show = layer === baseLayer ? true : layer === reliefLayer ? useTerrain
        : layer === worldMapLayer ? useTerrain
        : photoSource ? useTerrain && !vectorScenery && !countryPhotoBackoff.isBlocked(photoSource.id)
        : !vectorScenery;
      if (layer.show !== show) {
        if (photoSource) countryPhotoEpoch[photoSource.id]++;
        layer.show = show;
      }
    }
  }
  let loadSlow = false;
  const creditObserver = new ResizeObserver(() => {
    if (!disposed && credit) status.style.bottom = `${Math.max(38, credit.getBoundingClientRect().height + 12)}px`;
  });
  if (credit && !creditContainer) creditObserver.observe(credit);
  const sourceCredit = new Credit('Hessen HVBG aerial imagery · DL-DE Zero 2.0', true);
  // A constant-color local base prevents Cesium from stretching photographic
  // edge pixels across the globe outside their actual geographic coverage.
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = baseCanvas.height = 1;
  const baseContext = baseCanvas.getContext('2d')!;
  baseContext.fillStyle = '#263a37'; baseContext.fillRect(0, 0, 1, 1);
  const baseLayer = new ImageryLayer(new SingleTileImageryProvider({
    url: baseCanvas.toDataURL(), tileWidth: 1, tileHeight: 1,
    rectangle: Rectangle.MAX_VALUE,
  }));
  scene.imageryLayers.add(baseLayer);
  const relief = elevationRelief(terrainGrid);
  const reliefLayer = new ImageryLayer(new SingleTileImageryProvider({
    url: relief.toDataURL('image/png'), tileWidth: relief.width, tileHeight: relief.height,
    rectangle: new Rectangle(terrainGrid.west_rad, terrainGrid.south_rad, terrainGrid.east_rad, terrainGrid.north_rad),
    credit: new Credit('Height-derived relief: Hessen HVBG DGM1 · GCG2016 (BKG)', true),
  }));
  scene.imageryLayers.add(reliefLayer);
  const loadTimeout = setTimeout(() => {
    if (!disposed && !imagerySettled) { loadSlow = true; imageryStatus(lastState); }
  }, 25000);
  function imageryStatus(state: FlightState): void {
    if (disposed) return;
    const regionalStats = regionalImagery?.getStats();
    const regionalLevel = regionalStats?.resolutionAt(state.lat_rad / DEG_RAD, state.lon_rad / DEG_RAD) ?? null;
    container.dataset.imageryRegional = !regionalSettled ? 'loading' : !regionalImagery ? 'unavailable'
      : regionalStats!.failedTiles > 0 ? 'degraded' : regionalLevel === null ? 'outside-coverage' : 'ready';
    container.dataset.imageryRegionalLevel = regionalLevel === null ? '' : String(regionalLevel);
    const loadedLevel = regionalStats?.loadedLevelAt(state.lat_rad / DEG_RAD, state.lon_rad / DEG_RAD) ?? null;
    container.dataset.imageryRegionalLoadedLevel = loadedLevel === null ? '' : String(loadedLevel);
    container.dataset.imageryRegionalLoaded = String(regionalStats?.loadedTiles ?? 0);
    container.dataset.imageryRegionalCache = String(regionalStats?.cacheSize ?? 0);
    container.dataset.imageryRegionalInflight = String(regionalStats?.inflight ?? 0);
    container.dataset.imageryRegionalFailed = String(regionalStats?.failedTiles ?? 0);
    const liveImagery = !liveLayers ? undefined : container.dataset.liveImagery === 'degraded' ? 'degraded'
      : scene.globe.tilesLoaded ? 'ready' : 'loading';
    const { outcome, text: photographText } = imageryStatusText({
      settled: imagerySettled, slow: loadSlow, detailLoaded, overviewLoaded, airportLoaded,
      insideDetail: inside(DETAIL, state), insideOverview: inside(OVERVIEW, state), insideAirport: inside(AIRPORT_DETAIL, state),
      regional: !regionalSettled ? 'loading' : regionalImagery ? 'ready' : 'failed', regionalLevel,
      regionalFailedTiles: regionalStats?.failedTiles ?? 0, tilesLoaded: scene.globe.tilesLoaded,
      liveImagery, photoCompositor,
    });
    let text = vectorScenery && state.terrain_profile === 1
      ? worldMapStatus === 'ready' ? '' : worldMapStatus === 'degraded'
        ? 'Map terrain unavailable in parts of this view; terrain relief remains visible.'
        : 'Loading detailed OSM map terrain; terrain relief remains visible.'
      : photographText;
    const bounds = [6, 47, 14, 51.75];
    const lat = state.lat_rad / DEG_RAD, lon = state.lon_rad / DEG_RAD;
    const outside = lon < bounds[0] || lon > bounds[2] || lat < bounds[1] || lat > bounds[3];
    const polar = Math.abs(lat) > WORLD_MAP_MAX_LATITUDE;
    const countryCandidates = state.terrain_profile === 1 && !vectorScenery ? countryPhotoCandidates(lat, lon) : [];
    container.dataset.countryImagery = countryCandidates.length ? countryCandidates.join(',') : 'off';
    container.dataset.sceneryFallback = state.terrain_profile !== 1 ? 'off-flat-study' : polar ? 'outside-map-coverage' : vectorScenery || outside ? 'osm' : 'regional';
    container.dataset.worldMap = worldMapStatus;
    container.dataset.worldMapLoaded = String(worldMap?.getStats().loadedTiles ?? 0);
    container.dataset.worldMapCache = String(worldMap?.getStats().cacheSize ?? 0);
    container.dataset.worldMapQueued = String(worldMap?.getStats().queuedTiles ?? 0);
    const activeGrid = atlasGridAt(terrainGrid, atlasTiles, state.lat_rad, state.lon_rad);
    const displayInfo = terrainDisplayInfo.at(activeGrid);
    const globalDetail = displayInfo?.detail ?? 'regional';
    const copernicusNodes = displayInfo?.copernicusNodes ?? 0;
    const coarseNodes = displayInfo?.coarseNodes ?? 0;
    container.dataset.terrainDetail = globalDetail;
    container.dataset.terrainCopernicusNodes = String(copernicusNodes);
    container.dataset.terrainCoarseNodes = String(coarseNodes);
    const globalTerrainText = copernicusNodes > 0
      ? `Copernicus global DSM · 30 m source${coarseNodes ? ' with coarse fallback gaps' : ''}`
      : globalDetail === 'regional' ? 'regional terrain' : 'coarse global fallback · detailed elevation unavailable';
    if (state.terrain_profile === 1 && outside) {
      text = polar ? `${globalTerrainText} · OSM map unavailable beyond Web Mercator coverage.`
        : worldMapStatus === 'degraded' ? 'Global OSM map unavailable in parts of this view; physical terrain remains available.'
        : worldMapStatus === 'loading' ? vectorScenery
          ? 'Loading detailed global OSM map; terrain relief remains visible.'
          : 'Loading global OSM fallback; regional photography unavailable here.'
        : vectorScenery ? `Global OpenStreetMap · ${globalTerrainText}.`
        : `Global OSM fallback · regional photography unavailable here · ${globalTerrainText}.`;
    }
    if (countryCandidates.length) {
      const names = (blocked: boolean) => COUNTRY_IMAGERY.filter(source => countryCandidates.includes(source.id)
        && countryPhotoBackoff.isBlocked(source.id) === blocked).map(source => source.name).join(' / ');
      const available = names(false), blocked = names(true);
      text = withPhotoCompositorNotice(photoCompositor, [available && `${available} photography requested · coverage and capture dates vary${countryCandidates.some(id => !countryPhotoBackoff.isBlocked(id) && countryPhotoFailures.has(id)) ? ' · some tile requests failed' : ''}`,
        blocked && `${blocked} photography temporarily unavailable · retrying shortly`, `OSM fallback · ${globalTerrainText}`].filter(Boolean).join(' · ') + '.');
    }
    container.dataset.mapTerrain = vectorScenery && state.terrain_profile === 1 ? worldMapStatus : vectorScenery ? 'flat-study' : 'off';
    container.dataset.mapTerrainLoaded = String(worldMap?.getStats().loadedTiles ?? 0);
    container.dataset.mapTerrainQueued = String(worldMap?.getStats().queuedTiles ?? 0);
    container.dataset.mapTerrainFailed = String(worldMap?.getStats().failedTiles ?? 0);
    if (liveImagery === 'ready') container.dataset.liveImagery = 'ready';
    if (container.dataset.reviewTerrain === 'loading') text = 'Loading selected Review terrain; showing the previous 3D position.';
    else if (container.dataset.reviewTerrain === 'unavailable') text = 'Selected Review terrain unavailable; showing the previous 3D position.';
    else if (container.dataset.reviewTerrain === 'reconstructed') text = 'Review terrain reconstructed from currently available sources; ground differs from the recorded terrain.';
    if (status.textContent !== text) status.textContent = text;
    status.hidden = !text;
    container.dataset.imagery = outcome;
  }
  // Load the same photograph for every view. A cached source snapshot makes
  // the first practice scene independent of WMS latency and adaptive tile LOD.
  const photographAbort = new AbortController();
  function checkPhotoCompositor(): void {
    const now = performance.now();
    if (disposed || photoCompositorCheck || now - photoCompositorCheckedAt < 30000) return;
    photoCompositorCheck = true; photoCompositorCheckedAt = now;
    void fetch('/scenery/imagery/status.json', { cache: 'no-store', signal: AbortSignal.any([photographAbort.signal, AbortSignal.timeout(15000)]) })
      .then(async response => response.ok && /^application\/json\b/i.test(response.headers.get('content-type') ?? '') ? parsePhotoCompositorStatus(await response.json()) : 'unknown' as const)
      .catch(() => 'unknown' as const)
      .then(value => {
        photoCompositorCheck = false;
        if (disposed) return;
        // While unavailable, keep asking so a repaired server clears the notice.
        clearTimeout(photoCompositorPoll);
        if (value === 'unavailable') photoCompositorPoll = setTimeout(checkPhotoCompositor, 31000);
        if (value === photoCompositor) return;
        photoCompositor = value; container.dataset.photoCompositor = value;
        imageryStatus(lastState); scene.requestRender();
      });
  }
  function ensureWorldMap(): void {
    if (worldMapLoad || disposed) return;
    worldMapLoad = createMapTerrainImagery({ profile: 'world', signal: photographAbort.signal,
      onStatus(value) { if (!disposed) { worldMapStatus = value; imageryStatus(lastState); scene.requestRender(); } },
    }).then(handle => {
      if (disposed) { handle.dispose(); return; }
      worldMap = handle; worldMapLayer = new ImageryLayer(handle.provider);
      scene.imageryLayers.add(worldMapLayer, Math.min(2, scene.imageryLayers.length));
      orderPhotographs(); scene.requestRender();
    }).catch(() => { if (!disposed) { worldMapStatus = 'degraded'; imageryStatus(lastState); } });
  }
  async function loadPhotograph(path: string, rectangle: Rectangle): Promise<SingleTileImageryProvider> {
    const response = await fetch(path, {
      signal: AbortSignal.any([photographAbort.signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/')) {
      throw new Error('Starter photograph unavailable.');
    }
    const url = URL.createObjectURL(await response.blob());
    try { return await SingleTileImageryProvider.fromUrl(url, { rectangle, credit: sourceCredit }); }
    finally { URL.revokeObjectURL(url); }
  }
  void Promise.allSettled([
    loadPhotograph('/imagery/edfe-overview.jpg', OVERVIEW),
    loadPhotograph('/imagery/edfe-starter.jpg', DETAIL),
    loadPhotograph('/imagery/edfe-detail.jpg', AIRPORT_DETAIL),
  ]).then(results => {
    if (disposed) return;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const layer = new ImageryLayer(result.value);
        starterLayers.push(layer);
        scene.imageryLayers.add(layer);
        if (index === 2) airportLayer = layer;
        if (index === 0) overviewLoaded = true; else if (index === 1) detailLoaded = true; else airportLoaded = true;
      }
    });
    orderPhotographs();
    imagerySettled = true; clearTimeout(loadTimeout);
    container.dataset.imageryTiles = String(Number(detailLoaded) + Number(overviewLoaded) + Number(airportLoaded));
    container.dataset.imageryDetail = detailLoaded ? 'ready' : 'unavailable';
    container.dataset.imageryAirportDetail = airportLoaded ? 'ready' : 'unavailable';
    container.dataset.imageryCoverage = 'airport:8.628,49.954,8.66,49.966;detail:8.62,49.95,8.66,49.975;overview:8.4,49.8,8.9,50.1';
    imageryStatus(lastState); scene.requestRender();
    // Keep the existing 0.75 m airfield overlay above regional 1.5–3 m tiles.
    void createRegionalImageryProvider({ signal: photographAbort.signal, onStatus() { if (!disposed) { imageryStatus(lastState); scene.requestRender(); } } }).then(handle => {
      if (disposed) { handle.dispose(); return; }
      regionalImagery = handle; regionalSettled = true;
      // Per-view cancellation: a substantial camera change drops queued tile loads
      // for the old view; Cesium re-requests tiles that remain visible.
      removeCameraListener = scene.camera.changed.addEventListener(() => { if (!disposed) handle.cancelQueued(); });
      const index = airportLayer ? scene.imageryLayers.indexOf(airportLayer) : scene.imageryLayers.length;
      localRegionalLayer=new ImageryLayer(handle.provider);
      scene.imageryLayers.add(localRegionalLayer,index);orderPhotographs();
      imageryStatus(lastState); scene.requestRender();
    }).catch(() => { if (!disposed) { regionalSettled = true; imageryStatus(lastState); } });
  });

  let aircraft: Model | null = null;
  const controlSurfaces = AIRCRAFT_CONTROL_SURFACES.map(surface => ({
    surface, axis: Cartesian3.normalize(Cartesian3.fromElements(surface.axis[0], surface.axis[1], surface.axis[2]), new Cartesian3()),
    hinge: Cartesian3.fromElements(surface.hinge[0], surface.hinge[1], surface.hinge[2]), rotation: new Quaternion(),
    basis: new Matrix3(), matrix: new Matrix4(),
  }));
  let modelUrl: string | null = null;
  const position = new Cartesian3();
  const frame = new Matrix4();
  const modelMatrix = new Matrix4();
  const modelRotation = new Matrix3();
  const localModelMatrix = new Matrix4();
  const cameraPosition = new Cartesian3();
  const cameraDirection = new Cartesian3();
  const cameraUp = new Cartesian3();
  const forwardWorld = new Cartesian3();
  const rightWorld = new Cartesian3(), upWorld = new Cartesian3();
  const local = new Cartesian3();
  const localDirection = new Cartesian3();
  const localUp = new Cartesian3();
  let lastView: 'cockpit' | 'chase' | 'overview' = 'cockpit';
  let lastState = initialVisual;
  let lastLook: CameraLook = { yaw_rad: 0, pitch_rad: 0 };
  // Country services are independent of the German regional terrain stream.
  // Their transparent tiles reveal the OSM base outside actual coverage.
  // Cesium shows a provider-level credit wherever a layer is shown, even in
  // another country, so each source is credited per rendered tile instead: only
  // tiles that can carry its pixels (near its outline, at proxy detail levels).
  // Other tiles are a deliberate client coverage cut-off: a local transparent
  // tile without a request. Below level 7 that matches the proxy; farther inside
  // the envelope the proxy would have asked upstream, and tile-aligned cut-off
  // edges remain possible where provider imagery overhangs beyond the margin.
  const emptyCountryTile = document.createElement('canvas');
  emptyCountryTile.width = emptyCountryTile.height = 1;
  const noCountryCredits: Credit[] = [];
  for (const source of COUNTRY_IMAGERY) {
    const provider = new UrlTemplateImageryProvider({
      url: new Resource({ url: countryPhotoUrl(source.id), headers: { 'X-Gefly-Scenery-Priority': 'visible' } }),
      minimumLevel: COUNTRY_PHOTO_MIN_LEVEL, maximumLevel: COUNTRY_PHOTO_MAX_LEVEL,
      tileWidth: 256, tileHeight: 256, rectangle: Rectangle.fromDegrees(...source.bounds),
    });
    const sourceCredits = [new Credit(source.attribution, true)];
    provider.getTileCredits = (x, y, level) => countryPhotoTileMayContain(source.id, level, x, y) ? sourceCredits : noCountryCredits;
    // Error accounting is attached to each request below so stale completions
    // after a mode change or retry cannot reopen the shared circuit.
    provider.errorEvent.addEventListener(() => {});
    const requestImage = provider.requestImage.bind(provider);
    provider.requestImage = (x, y, level, request) => {
      if (!countryPhotoTileMayContain(source.id, level, x, y)) return Promise.resolve(emptyCountryTile);
      const generation = countryPhotoBackoff.generation(source.id), epoch = countryPhotoEpoch[source.id];
      const result = requestImage(x, y, level, request);
      if (!result) return undefined;
      return result.then(image => {
        if (photoCompositor === 'unavailable') checkPhotoCompositor(); // a decoded tile suggests recovery
        if (!disposed && epoch === countryPhotoEpoch[source.id] && generation === countryPhotoBackoff.generation(source.id)
          && level >= 7 && countryPhotoFailures.delete(source.id)) imageryStatus(lastState);
        return image;
      }, error => {
        if (!disposed && epoch === countryPhotoEpoch[source.id] && generation === countryPhotoBackoff.generation(source.id)
          && !countryPhotoBackoff.isBlocked(source.id)) {
          const first = !countryPhotoFailures.has(source.id);
          countryPhotoFailures.add(source.id); countryPhotoBackoff.failure(source.id, generation); checkPhotoCompositor();
          if (first) imageryStatus(lastState);
        }
        throw error;
      });
    };
    const layer = new ImageryLayer(provider, { show: false });
    countryPhotoLayers.set(source.id, layer); scene.imageryLayers.add(layer);
  }
  const removeCountryPhotoBackoff = countryPhotoBackoff.subscribe((id, blocked) => {
    if (disposed) return;
    if (!blocked) countryPhotoFailures.delete(id);
    applyImageryMode(lastState.terrain_profile === 1); imageryStatus(lastState); scene.requestRender();
  });
  orderPhotographs();
  let lastFov_rad = DEFAULT_FOV_RAD;
  let overviewActive = false, overviewRetain = false, overviewRevision = 0;
  let displayOverview: readonly TerrainOverviewGrid[] = [];
  const pendingOverview = new Set<string>();
  let detailBudget: ReturnType<typeof createTerrainDetailBudget> | null = null, detailBudgetRevision = -1;
  const requestOverview = (cells: Parameters<TerrainOverview['requestCells']>[0]) => {
    if (!disposed && overviewActive && lastState.terrain_profile === 1) overviewLoader.requestCells(cells.filter(cell=>!pendingOverview.has(`${cell.col}/${cell.row}`)));
  };
  const closeOverviewIfRequired = () => {
    const reason=globalTerrainOverviewInfo(activeTerrain)?.closed;
    if(globalProviderLive&&overviewRetain&&reason&&!overviewLoader.stopped)overviewLoader.stop(reason);
  };
  const airportRegionStatus = document.createElement('div');
  airportRegionStatus.id = 'airport-region-status';
  airportRegionStatus.setAttribute('role', 'status');
  airportRegionStatus.style.cssText = 'position:absolute;left:12px;bottom:74px;max-width:330px;padding:4px 8px;border-radius:4px;background:#10272cdd;color:#e5eadd;font:10px/1.4 system-ui;z-index:2;pointer-events:none;';
  airportRegionStatus.hidden = true; container.appendChild(airportRegionStatus);
  const overviewStatus = document.createElement('div');
  overviewStatus.setAttribute('role', 'status');
  overviewStatus.style.cssText = 'position:absolute;left:12px;bottom:38px;max-width:330px;padding:5px 8px;border-radius:4px;background:#10272cdd;color:#e5eadd;font:10px/1.4 system-ui;z-index:2;pointer-events:none;';
  overviewStatus.hidden = true; container.appendChild(overviewStatus);
  let latestOverviewStatus: TerrainOverviewStatus = {state:'off',cells:0,missing:0,cache:0};
  const presentOverviewStatus = (info = latestOverviewStatus) => {
    latestOverviewStatus=info;
    if(globalProviderLive&&info.state==='pending'&&overviewLoader.stopped)closeGlobalTerrainOverview(activeTerrain,overviewLoader.stopped);
    const stopped=(globalProviderLive?globalTerrainOverviewInfo(activeTerrain)?.closed:null) ?? overviewLoader.stopped;
    if (disposed) return;
    container.dataset.terrainOverview = pendingOverview.size ? 'pending' : info.state;
    container.dataset.terrainOverviewPending = String(pendingOverview.size);
    container.dataset.terrainOverviewStopped=stopped??'';
    container.dataset.terrainOverviewHistory = String(globalTerrainOverviewInfo(activeTerrain)?.history ?? 0);
    container.dataset.terrainOverviewCells = String(info.cells);
    container.dataset.terrainOverviewMissing = String(info.missing);
    container.dataset.terrainOverviewCache = String(info.cache);
    const copernicus = displayOverview.some(grid => grid.copernicus_nodes > 0);
    const regional = displayOverview.some(grid => grid.regional_nodes > 0);
    const sources = copernicus ? regional ? 'regional / 30 m Copernicus sources' : '30 m Copernicus source' : 'regional elevation';
    overviewStatus.textContent = stopped ? `Landscape overview stopped (${stopped}) · retaining terrain; reset to resume`
      : pendingOverview.size || info.state==='pending' ? 'Landscape detail pending · retaining previous terrain'
      : info.state === 'unavailable' ? `Landscape overview unavailable${info.cells ? ' · retaining prior overview' : ' · current ground unchanged'}`
      : info.state === 'loading' ? 'Landscape elevation · loading wider overview'
      : info.cells ? `Landscape elevation · ${info.cells}/9 overview cells · ~217 m N–S grid from ${sources}`
      : 'Landscape overview unavailable · current ground terrain unchanged';
    overviewStatus.hidden = info.state === 'off' && !info.cells;
  };
  const overviewLoader = new TerrainOverview(worldGrid, grids => {
    if (disposed || grids.length > 0 && (!overviewActive || lastState.terrain_profile !== 1 || recordingController !== null)) return;
    displayOverview = grids;
    if (!globalProviderLive || !overviewActive && !overviewRetain) {
      // Explicit reset/Review/flat epoch changes can discard a provider; ordinary
      // source-window progress must preserve its terrain and imagery cache.
      overviewRevision++; providerKey = ''; globalProviderLive = false; pendingOverview.clear();
    } else if (tryUpdateGlobalTerrainOverview(activeTerrain, grids)) pendingOverview.delete('window');
    else if (globalProviderLive) pendingOverview.add('window');
    closeOverviewIfRequired(); presentOverviewStatus(); scene.requestRender();
  }, { source: createTerrainOverviewSource(worldGrid), onResolved(result) {
    if (disposed || !overviewActive || lastState.terrain_profile !== 1) return;
    const id=`${result.col}/${result.row}`;
    if(acceptGlobalTerrainOverviewSource(activeTerrain,result))pendingOverview.delete(id);
    else pendingOverview.add(id);
    if(result.grid) displayOverview=displayOverview.map(grid=>grid.id===result.grid!.id?result.grid!:grid);
    closeOverviewIfRequired(); presentOverviewStatus(); scene.requestRender();
  }, onStatus: presentOverviewStatus
  });


  // This visual is authored here, not fetched aircraft/model data. Loading it must
  // not delay the first geographic scene or start an alternate render loop.
  void createAircraftVisual().then(async url => {
    if (disposed) { URL.revokeObjectURL(url); return; }
    modelUrl = url;
    const model = await Model.fromGltfAsync({
      url, modelMatrix: Matrix4.clone(modelMatrix), scale: 1,
      // Our original visual is +X nose, +Y up, +Z right. Cesium's glTF
      // default +Z forward would rotate it again and put the aircraft sideways.
      // Y-up correction alone maps it to +X forward, +Y left, +Z up.
      // https://cesium.com/learn/cesiumjs/ref-doc/Model.html#fromGltfAsync
      upAxis: Axis.Y, forwardAxis: Axis.X,
      minimumPixelSize: 0, shadows: ShadowMode.DISABLED,
    });
    if (disposed) { model.destroy(); return; }
    aircraft = scene.primitives.add(model);
    model.readyEvent.addEventListener(() => { if (!disposed) container.dataset.aircraftVisual = 'ready'; });
    aircraft!.show = lastView !== 'cockpit';
  }).catch(() => {
    if (!disposed) {
      container.dataset.aircraftVisual = 'error';
      // The aircraft marker is optional for cockpit flight; state remains live.
      console.warn('Generic aircraft visual could not load.');
    }
  });

  function update(state: FlightState, view: 'cockpit' | 'chase' | 'overview', look?: Readonly<CameraLook>, livePrediction = false): void {
    if (disposed) return;
    if (![state.lat_rad, state.lon_rad, state.alt_msl_m, state.pitch_rad, state.roll_rad, state.heading_rad].every(Number.isFinite)) {
      landmarkLabels.update(null, false);
      throw new RangeError('Cannot render a non-finite aircraft state');
    }
    const useTerrain = state.terrain_profile === 1;
    approachGuide.update(useTerrain);
    if (!useTerrain && (overviewActive || overviewLoader.hasSources)) { overviewActive = false; overviewLoader.cancel(true); }
    if (useTerrain && overviewActive && !overviewLoader.stopped && streamedTiles.length && recordingController === null && recordingTiles.size === 0)
      void overviewLoader.update(state.lat_rad, state.lon_rad).catch(() => {});
    if (useTerrain) ensureWorldMap();
    // Start a new warm plan after visible tiles settle; retain nearby progress through brief camera tile work.
    sceneryCache.update(state.lat_rad, state.lon_rad, vectorScenery, useTerrain, scene.globe.tilesLoaded,
      { t_s: state.t_s, simulation_rate: state.simulation_rate, live: livePrediction });
    airportScenery.setVisible(useTerrain);
    airportScenery.setVectorVisible(false);
    airportScenery.update(state, terrainRevision, { live: useTerrain && (overviewActive || overviewRetain)
      && recordingController === null && recordingTiles.size === 0 });
    const airportRegions = airportScenery.streamedStats;
    const airportFields = { airportRegions: airportRegions.status, airportRegionsResident: airportRegions.resident,
      airportRegionsReady: airportRegions.readyMeshes, airportRegionsInstances: airportRegions.instances,
      airportRegionsLoaded: airportRegions.loadedRegions.join(','), airportRegionsSourceDates: airportRegions.sourceDates.join(','),
      airportRegionsRejected: airportRegions.rejected, airportRegionsDeferred: airportRegions.deferred,
      airportRegionsTruncated: airportRegions.truncated };
    for (const [key, value] of Object.entries(airportFields)) if (container.dataset[key] !== String(value)) container.dataset[key] = String(value);
    const airportMessage = airportRegions.status === 'disabled' ? '' : airportRegions.status === 'loading' ? 'Airport surfaces · loading nearby OSM geometry'
      : airportRegions.status === 'empty' ? 'Airport surfaces · no mapped layout in this region'
      : airportRegions.status === 'unavailable' ? 'Airport surfaces unavailable · flight continues'
      : airportRegions.status === 'terrain-pending' ? 'Airport surfaces · waiting for terrain heights'
      : airportRegions.status === 'limited' || airportRegions.status === 'partial' || airportRegions.rejected
        ? 'Airport surfaces · partial source/detail coverage' : '';
    if (airportRegionStatus.textContent !== airportMessage) airportRegionStatus.textContent = airportMessage;
    airportRegionStatus.hidden = !airportMessage;
    airportRegionStatus.title = `OpenStreetMap · ODbL · source snapshots ${airportRegions.sourceDates.join(', ') || 'unavailable'}`;
    container.dataset.airportScenery = airportScenery.status;
    applyImageryMode(useTerrain);
    const terrainSample = useTerrain ? atlasSample(state.lat_rad, state.lon_rad) : null;
    if (container.dataset.reviewTerrain === 'reconstructed' && terrainSample
      && Math.abs(terrainSample.physical_m - (state.terrain_height_msl_m ?? Infinity)) <= .25
      && Math.abs(terrainSample.geoid_m - (state.terrain_geoid_m ?? Infinity)) <= .25) container.dataset.reviewTerrain = 'ready';
    if (useTerrain && (!terrainSample || !Number.isFinite(state.ground_height_ellipsoid_m))) {
      container.dataset.terrain = terrainSample ? 'height-unavailable' : 'outside-coverage';
      landmarkLabels.update(null, false);
      throw new RangeError('Public terrain needs covered coordinates and an explicit converted aircraft height');
    }
    if (useTerrain && streamedTiles.length) {
      const fine = state.lon_rad>=terrainGrid.west_rad && state.lon_rad<=terrainGrid.east_rad && state.lat_rad>=terrainGrid.south_rad && state.lat_rad<=terrainGrid.north_rad;
      const cell = worldCellAt(state.lat_rad, state.lon_rad);
      const key = terrainDisplayInfo.hasWorldTerrain ? `${terrainRevision}/global/${overviewRevision}` : `${terrainRevision}/${cell?.join('/')}/${fine}`;
      if(key!==providerKey) {
        const reused = terrainDisplayInfo.hasWorldTerrain && globalProviderLive && recordingTiles.size === 0
          && tryUpdateGlobalTerrainProvider(activeTerrain, streamedTiles);
        if (!reused) {
          const provider = terrainDisplayInfo.hasWorldTerrain
            ? createGlobalTerrainProvider(worldGrid, terrainGrid, streamedTiles, displayOverview, { stream: recordingController === null && recordingTiles.size === 0, request: requestOverview, outcomes: overviewLoader.sourceOutcomes })
            : createStreamedTerrainProvider(terrainGrid, streamedTiles, state);
          if (!provider) throw new Error('Required streamed terrain has not loaded.');
          if(overviewLoader.stopped)closeGlobalTerrainOverview(provider,overviewLoader.stopped);
          activeTerrain = provider; globalProviderLive = terrainDisplayInfo.hasWorldTerrain && recordingTiles.size === 0;
          if (terrainEnabled && scene.globe.terrainProvider !== activeTerrain) scene.globe.terrainProvider = activeTerrain;
        }
        providerKey = key;
        if (pendingOverview.size && globalProviderLive && displayOverview.length
          && tryUpdateGlobalTerrainOverview(activeTerrain,displayOverview)) pendingOverview.delete('window');
        if (pendingOverview.size && overviewActive) overviewLoader.requestCells([...pendingOverview].filter(id=>id!=='window').map(id=>{const [col,row]=id.split('/').map(Number);return{col,row};}));
        presentOverviewStatus();
      }
    } else if (activeTerrain!==publicTerrain && !streamedTiles.length) {
      activeTerrain=publicTerrain;providerKey='';if(terrainEnabled)scene.globe.terrainProvider=publicTerrain;
    }
    container.dataset.terrainStreamed=String(streamedTiles.length>0);
    container.dataset.terrainCached=String(streamedTiles.length);
    lastState = state; lastView = view; lastLook = { ...boundedCameraLook(look), distance_m: look?.distance_m };
    // Keep zoom independent of look gestures and updates that omit camera input.
    if (look?.fov_rad !== undefined) {
      lastFov_rad = Number.isFinite(look.fov_rad)
        ? Math.max(MIN_FOV_RAD, Math.min(MAX_FOV_RAD, look.fov_rad)) : DEFAULT_FOV_RAD;
    }
    const { lat_rad, lon_rad, alt_msl_m, pitch_rad, roll_rad, heading_rad } = state;
    if (useTerrain !== terrainEnabled) {
      scene.globe.terrainProvider = useTerrain ? activeTerrain : flatTerrain;
      scene.globe.depthTestAgainstTerrain = useTerrain;
      reliefLayer.show = useTerrain;
      terrainEnabled = useTerrain;
    }
    container.dataset.terrain = useTerrain ? terrainSample ? 'public-grid' : 'outside-coverage' : 'flat-study';
    container.dataset.terrainId = useTerrain ? atlasGridAt(terrainGrid, atlasTiles, state.lat_rad, state.lon_rad)?.id ?? '' : '';
    container.dataset.terrainHeightEllipsoidM = terrainSample ? String(terrainSample.ellipsoid_m) : '';
    container.dataset.terrainRelief = useTerrain ? 'dem-derived' : 'off-flat-study';
    imageryStatus(state);
    const renderHeight = state.ground_height_ellipsoid_m ?? alt_msl_m;
    container.dataset.aircraftHeightEllipsoidM = String(renderHeight);
    Cartesian3.fromRadians(lon_rad, lat_rad, renderHeight, Ellipsoid.WGS84, position);
    Transforms.eastNorthUpToFixedFrame(position, Ellipsoid.WGS84, frame);
    const basis = aircraftBasisENU(heading_rad, pitch_rad, roll_rad);
    Cartesian3.fromElements(...basis.forward, localDirection);
    Matrix4.multiplyByPointAsVector(frame, localDirection, forwardWorld);
    Cartesian3.fromElements(...basis.right, localDirection);
    Matrix4.multiplyByPointAsVector(frame, localDirection, rightWorld);
    Cartesian3.fromElements(...basis.up, localDirection);
    Matrix4.multiplyByPointAsVector(frame, localDirection, upWorld);
    // Cesium's corrected model axes are forward/left/up. Build those columns
    // directly in ENU, then resolve them to Earth-fixed coordinates. This avoids
    // a glTF axis correction being confused with heading/pitch/roll conventions.
    Matrix3.fromArray([
      ...basis.forward, ...basis.right.map(value => -value), ...basis.up,
    ], 0, modelRotation);
    Matrix4.fromRotationTranslation(modelRotation, Cartesian3.ZERO, localModelMatrix);
    Matrix4.multiplyTransformation(frame, localModelMatrix, modelMatrix);
    if (aircraft) {
      aircraft.modelMatrix = Matrix4.clone(modelMatrix, aircraft.modelMatrix);
      aircraft.show = view !== 'cockpit';
      if (aircraft.ready) {
        for (const binding of controlSurfaces) {
          const node = aircraft.getNode(binding.surface.name);
          if (!node) continue;
          Quaternion.fromAxisAngle(binding.axis, controlSurfaceAngle(state, binding.surface), binding.rotation);
          Matrix3.fromQuaternion(binding.rotation, binding.basis);
          // Assign the local hinge transform on every selected live/replay frame.
          node.matrix = Matrix4.fromRotationTranslation(binding.basis, binding.hinge, binding.matrix);
        }
      }
    }
    aircraftShadow.update(state, view, aircraft, useTerrain ? atlasSample(state.lat_rad, state.lon_rad)?.ellipsoid_m ?? null : 0);
    if (view === 'cockpit') {
      const camera = cockpitCameraENU(basis, lastLook);
      Cartesian3.fromElements(...camera.direction, localDirection);
      Cartesian3.fromElements(...camera.up, localUp);
      Cartesian3.fromElements(basis.up[0] * 0.7, basis.up[1] * 0.7, basis.up[2] * 0.7, local);
      Matrix4.multiplyByPoint(frame, local, cameraPosition);
      Matrix4.multiplyByPointAsVector(frame, localDirection, cameraDirection);
      Matrix4.multiplyByPointAsVector(frame, localUp, cameraUp);
    } else {
      const camera = view === 'overview' ? overviewCameraENU(heading_rad, lastLook, lastLook.distance_m ?? 1500) : chaseCameraENU(heading_rad, lastLook, lastLook.distance_m ?? CHASE_DISTANCE.initial_m);
      container.dataset.cameraDistanceM = String(Math.hypot(...camera.offset));
      Cartesian3.fromElements(...camera.offset, local);
      Cartesian3.fromElements(...camera.direction, localDirection);
      Cartesian3.fromElements(...camera.up, localUp);
      Matrix4.multiplyByPoint(frame, local, cameraPosition);
      Matrix4.multiplyByPointAsVector(frame, localDirection, cameraDirection);
      Matrix4.multiplyByPointAsVector(frame, localUp, cameraUp);
    }
    container.dataset.cameraView = view;
    container.dataset.overviewDistanceM = String(lastLook.distance_m ?? 1500);
    setCameraPose(scene.camera, cameraPosition, cameraDirection, cameraUp);
    const frustum = scene.camera.frustum;
    if (!(frustum instanceof PerspectiveFrustum)) throw new Error('Flight view requires a perspective camera');
    // Cesium uses horizontal FOV in landscape and vertical FOV in portrait.
    // Change projection only: position, gaze and aircraft state stay unchanged.
    frustum.fov = lastFov_rad;
    const fovDeg = (frustum.fov / DEG_RAD).toFixed(1);
    if (container.dataset.fovDeg !== fovDeg) container.dataset.fovDeg = fovDeg;
    // Project actual body axes as directions at infinity, independently of
    // aircraft position/velocity, in cockpit/chase and every recorded attitude.
    const bounds = container.getBoundingClientRect();
    const top = Math.max(18, (header?.getBoundingClientRect().bottom ?? bounds.top) - bounds.top + 12);
    const fovy = frustum.fovy;
    const tuple = (axis: Cartesian3): [number, number, number] => [axis.x, axis.y, axis.z];
    const directions = typeof fovy === 'number' ? projectBodyDirections({
      bodyForward: tuple(forwardWorld), bodyRight: tuple(rightWorld), bodyUp: tuple(upWorld),
      cameraRight: tuple(scene.camera.rightWC), cameraUp: tuple(scene.camera.upWC), cameraForward: tuple(scene.camera.directionWC),
      width_px: container.clientWidth, height_px: container.clientHeight,
      fov_y_rad: fovy,
      insets: { top, left: 36, right: 36, bottom: 18 },
    }) : undefined;
    const forwardAlignment = Cartesian3.dot(forwardWorld, scene.camera.directionWC)
      / (Cartesian3.magnitude(forwardWorld) * Cartesian3.magnitude(scene.camera.directionWC));
    const separation_rad = Math.acos(Math.max(-1, Math.min(1, forwardAlignment)));
    if (!Number.isFinite(separation_rad) || separation_rad <= hideDirectionsAt_rad) directionReferencesVisible = false;
    else if (separation_rad >= showDirectionsAt_rad) directionReferencesVisible = true;
    forwardMarker.update(directions?.forward ?? null, directions, directionReferencesVisible);
    landmarkLabels.update(state, useTerrain);
    if (useTerrain && overviewRetain && globalProviderLive && liveTiles.length) {
      if(detailBudgetRevision!==terrainRevision || !detailBudget){
        detailBudget=createTerrainDetailBudget(activeTerrain.tilingScheme as GeographicTilingScheme,liveTiles);detailBudgetRevision=terrainRevision;
      }
      const frustum=scene.camera.frustum as PerspectiveFrustum;
      const contact=Number.isFinite(state.terrain_height_ellipsoid_m)
        ? Cartesian3.fromRadians(state.lon_rad,state.lat_rad,state.terrain_height_ellipsoid_m!) : undefined;
      const budget=detailBudget.evaluate({cameraPosition:scene.camera.positionWC,frustumFovy_rad:frustum.fovy ?? NaN,
        cssHeight:widget.canvas.clientHeight,drawingBufferHeight:widget.canvas.height,
        geometricError13_m:activeTerrain.getLevelMaximumGeometricError(13),baseSSE:3,contactPosition:contact,
        fogScreenSpaceErrorFactor:scene.fog.enabled?scene.fog.screenSpaceErrorFactor:0});
      scene.globe.maximumScreenSpaceError=budget.maximumScreenSpaceError;
      container.dataset.terrainDetailBudget=budget.bounded?'bounded':'unbounded';
      container.dataset.terrainDetailSse=String(budget.maximumScreenSpaceError);
      container.dataset.terrainContactRefines=String(budget.contactRefines??false);
    } else scene.globe.maximumScreenSpaceError=3;
    widget.render();

  }

  const observer = new ResizeObserver(() => {
    if (!disposed) { widget.resize(); update(lastState, lastView, lastLook); }
  });
  observer.observe(container);
  update(initialVisual, 'cockpit');
  const flightScene: FlightScene = {
    setDisplayOverviewActive(active, retain = false) {
      active = active && lastState.terrain_profile === 1;
      retain = retain && lastState.terrain_profile === 1;
      if (disposed || active === overviewActive && retain === overviewRetain) return;
      overviewActive = active; overviewRetain = retain;
      if (!active) { if(!retain)pendingOverview.clear(); overviewLoader.cancel(!retain); }
    },
    preloadScenery(state) {
      if (!disposed) sceneryCache.preload(state.lat_rad, state.lon_rad, vectorScenery, state.terrain_profile === 1);
    },
    setLandmarkLevel(level) {
      landmarkLabels.setLevel(level);
      landmarkLabels.update(lastState, lastState.terrain_profile === 1);
      if (level > 0 && !landmarkCreditVisible) widget.creditDisplay.addStaticCredit(landmarkCredit);
      if (level === 0 && landmarkCreditVisible) widget.creditDisplay.removeStaticCredit(landmarkCredit);
      landmarkCreditVisible = level > 0; scene.requestRender();
    },
    setSceneryMode(vector) {
      vectorScenery = vector; airportScenery.setVectorVisible(false);
      if (vector && lastState.terrain_profile === 1) ensureWorldMap();
      if (vector) regionalImagery?.cancelQueued();
      applyImageryMode();
      container.dataset.sceneryMode = vector ? 'vector' : 'imagery'; imageryStatus(lastState); scene.requestRender();
    },
    setPracticePapi(enabled) { airportScenery.setPracticePapi(enabled); container.dataset.practicePapi = String(enabled); },
    setApproachGuide(guide) { approachGuide.set(guide); },
    update,
    cancelTerrainPreparation() {
      recordingVersion++;
      recordingController?.abort(); recordingController = null;
      recordingLoad?.cancel(); recordingLoad = null;
      if (container.dataset.reviewTerrain === 'loading' || container.dataset.reviewTerrain === 'unavailable') {
        container.dataset.reviewTerrain = 'ready'; imageryStatus(lastState);
      }
    },
    terrainReady(state: Readonly<FlightState>) {
      const sample = state.terrain_profile === 1 ? atlasSample(state.lat_rad, state.lon_rad) : null;
      if (state.terrain_profile === 1 && !sample) return false;
      // Optional regional availability can differ from a historic recording.
      // Display the current source honestly instead of claiming an exact replay
      // of a previously available surface. This never replaces recorded state.
      const difference = sample && Number.isFinite(state.terrain_height_msl_m) && Number.isFinite(state.terrain_geoid_m)
        ? Math.max(Math.abs(sample.physical_m - state.terrain_height_msl_m!), Math.abs(sample.geoid_m - state.terrain_geoid_m!)) : 0;
      container.dataset.reviewTerrainDifferenceM = String(difference);
      container.dataset.reviewTerrain = difference > .25 ? 'reconstructed' : 'ready';
      return true;
    },
    async prepareRecording(states) {
      overviewLoader.cancel(true);
      // The caller supplies the selected frame. Never warm an entire worldwide
      // recording: one 3×3 window per request, with at most64 retained cells.
      let state: Readonly<FlightState> | undefined;
      for (const selected of states) { state = selected; break; }
      // Invalidate the previous request before every early return, including a
      // cached cursor, so obsolete manifest fetches cannot outlive the seek.
      flightScene.cancelTerrainPreparation!();
      if (!state || state.terrain_profile !== 1 || atlasSample(state.lat_rad, state.lon_rad)) return;
      const version = recordingVersion, controller = new AbortController();
      recordingController = controller;
      container.dataset.reviewTerrain = 'loading'; imageryStatus(lastState);
      const tiles = new Map<string, TerrainGrid>();
      let loader: WorldTerrainStream | null = null;
      const abort = () => loader?.cancel();
      controller.signal.addEventListener('abort', abort, { once: true });
      try {
        const manifest = await loadRegionalManifestOptional(globalThis.fetch, controller.signal);
        if (disposed || controller.signal.aborted || version !== recordingVersion) return;
        loader = new WorldTerrainStream(worldGrid, manifest, grid => { tiles.set(grid.id, grid); }, () => {});
        recordingLoad = loader;
        await loader.move(state.lat_rad, state.lon_rad);
        if (!disposed && !controller.signal.aborted && version === recordingVersion) {
          for (const [id, grid] of tiles) { recordingTiles.delete(id); recordingTiles.set(id, grid); }
          while (recordingTiles.size > 64) recordingTiles.delete(recordingTiles.keys().next().value!);
          flightScene.setTerrainTiles?.(liveTiles);
          container.dataset.reviewTerrain = 'ready'; imageryStatus(lastState);
        }
      } catch (error) {
        if (controller.signal.aborted || disposed || version !== recordingVersion) return;
        if (!disposed && version === recordingVersion) { container.dataset.reviewTerrain = 'unavailable'; imageryStatus(lastState); }
        throw error;
      } finally {
        controller.signal.removeEventListener('abort', abort); loader?.cancel();
        if (recordingLoad === loader) recordingLoad = null;
        if (recordingController === controller) recordingController = null;
      }
    },
    setTerrainTiles(tiles) {
      if (!tiles.length) { globalProviderLive = false; overviewLoader.cancel(true); }
      liveTiles = Array.from(tiles);
      const nextTiles = new Map([...recordingTiles.values(), ...liveTiles].map(grid => [grid.id, grid]));
      // Validate each revision once; frame labels read copied source metadata.
      terrainDisplayInfo = createTerrainDisplayInfo([...nextTiles.values()]);
      container.dataset.reviewTerrainCached = String(recordingTiles.size);
      if (!nextTiles.size) globalProviderLive = false;
      if (sameTerrainTiles(atlasTiles, nextTiles)) return;
      streamedTiles = [...nextTiles.values()];
      atlasTiles = nextTiles as Map<string, AtlasTile>; terrainRevision++;
      if(tiles.length && !liveLayers) {
        liveLayers=true;
        const rectangle=Rectangle.fromDegrees(REGIONAL_TERRAIN.west, REGIONAL_TERRAIN.south, REGIONAL_TERRAIN.east, REGIONAL_TERRAIN.north);
        const photoProvider=new UrlTemplateImageryProvider({url:new Resource({url:'/scenery/imagery/{z}/{x}/{y}.png',headers:{'X-Gefly-Scenery-Priority':'visible'}}),minimumLevel:7,maximumLevel:14,tileWidth:512,tileHeight:512,rectangle,
          credit:new Credit('Open photography: HVBG · <a href="https://www.govdata.de/dl-de/zero-2-0">DL-DE-Zero-2.0</a>; © <a href="https://www.ldbv.bayern.de">Bayerische Vermessungsverwaltung</a> (2026) · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; Datenquelle: <a href="https://www.lgl-bw.de">LGL-BW</a> (2026) · <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>; © GeoBasis-DE / <a href="https://lvermgeo.rlp.de">LVermGeoRP</a> (2026), <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a> [Daten bearbeitet]; © GeoBasis DE / <a href="https://www.saarland.de/lvgl">LVGL-SL</a> (2026), <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>, DOP2025 · resampled, composited · capture dates unknown',true)});
        photoProvider.errorEvent.addEventListener(()=>{container.dataset.liveImagery='degraded';checkPhotoCompositor();});
        livePhotoLayer=new ImageryLayer(photoProvider);
        scene.imageryLayers.add(livePhotoLayer);orderPhotographs();
        container.dataset.liveImagery='loading';
      }
    },
    dispose() {
      if (disposed) return;
      overviewLoader.dispose(); overviewStatus.remove(); airportRegionStatus.remove();
      disposed = true;
      flightScene.cancelTerrainPreparation!(); recordingTiles.clear();
      sceneryCache.dispose();
      photographAbort.abort();
      removeCameraListener?.(); removeCameraListener = null;
      regionalImagery?.dispose();
      worldMap?.dispose();
      observer.disconnect();
      creditObserver.disconnect();
      clearTimeout(loadTimeout); clearTimeout(photoCompositorPoll);
      forwardMarker.dispose(); removeReliefError(); removeCountryPhotoBackoff();
      scene.globe.material = undefined; osmRelief?.destroy(); delete container.dataset.osmRelief;
      approachGuide.dispose(); aircraftShadow.dispose(); airportScenery.dispose(); landmarkLabels.dispose();
      status.remove();
      widget.destroy();
      removeVisibleSpainCredit(); credits.remove();
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    },
  };
  return flightScene;
}
