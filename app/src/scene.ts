import { createAirportScenery, AIRPORT_VECTOR_CREDIT } from './airport-scenery';
import {
  Axis, Cartesian3, CesiumWidget, Color, Credit, Ellipsoid, EllipsoidTerrainProvider,
  ImageryLayer, Ion, JulianDate, UrlTemplateImageryProvider,
  Matrix3, Matrix4, Model, PerspectiveFrustum, Quaternion, Rectangle, ShadowMode, SingleTileImageryProvider, Transforms,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createForwardMarker } from './forward-marker';
import { projectForwardDirection } from './forward-marker-projection';
import { createAircraftVisual } from './aircraft-visual';
import { AIRCRAFT_CONTROL_SURFACES, controlSurfaceAngle } from './aircraft-control-surfaces';
import { createAircraftShadow } from './aircraft-shadow';
import { createPublicTerrainProvider } from './terrain-provider';
import { createStreamedTerrainProvider } from './streamed-terrain-provider';
import { loadRegionalManifest, TerrainStream, sampleAtlas, type RegionalTile } from '../../studies/e1-browser/sim/terrain-stream.js';
import { createRegionalImageryProvider } from './regional-imagery';
import { imageryStatusText } from './imagery-status';
import { loadTerrainPackage, sampleTerrain, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { aircraftBasisENU, boundedCameraLook, cockpitCameraENU, chaseCameraENU, type CameraLook } from './aircraft-orientation';
import { DEFAULT_FOV_RAD, MIN_FOV_RAD, MAX_FOV_RAD } from './field-of-view.ts';
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
export async function createScene(container: HTMLElement): Promise<FlightScene> {
  const terrainGrid = await loadTerrainPackage();
  const publicTerrain = createPublicTerrainProvider(terrainGrid);
  let activeTerrain = publicTerrain;
  const recordingTiles = new Map<string, TerrainGrid>();
  let streamedTiles: TerrainGrid[] = [], atlasTiles = new Map<string,RegionalTile>();
  let terrainRevision = 0, providerKey = '';
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
  const credits = document.createElement('div');
  credits.style.cssText = 'position:absolute;left:10px;right:10px;bottom:5px;z-index:1;font:10px/1.3 system-ui;color:white;text-shadow:0 1px 3px #000;';
  container.appendChild(credits);
  let widget: CesiumWidget;
  try { widget = new CesiumWidget(container, {
    creditContainer: credits,
    baseLayer: false,
    terrainProvider: publicTerrain,
    useDefaultRenderLoop: false,
    useBrowserRecommendedResolution: true,
    showRenderLoopErrors: false,
    scene3DOnly: true,
    shadows: true,
    msaaSamples: 2,
    contextOptions: { webgl: { alpha: false, antialias: true, powerPreference: 'high-performance' } },
  }); } catch (error) { credits.remove(); throw error; }
  widget.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
  widget.canvas.setAttribute('aria-label', 'Hessen aerial imagery and public terrain flight scene');
  widget.canvas.setAttribute('tabindex', '-1');
  const scene = widget.scene;
  let vectorScenery = false;
  const airportScenery = createAirportScenery(scene, (lat, lon) => atlasSample(lat, lon)?.ellipsoid_m ?? null);
  widget.creditDisplay.addStaticCredit(new Credit(AIRPORT_VECTOR_CREDIT + ' · <a href="https://www.openstreetmap.org/copyright">Source / licence</a>', true));
  const aircraftShadow = createAircraftShadow(scene, container);
  const forwardMarker = createForwardMarker(container);
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

  // Keep source credit legible above the instrument deck; never hide Cesium credits.
  const credit = credits.querySelector('.cesium-widget-credits') as HTMLElement | null;
  if (credit) { credit.style.right = '0'; credit.style.left = 'auto'; credit.style.maxWidth = '100%'; credit.style.textAlign = 'right'; }
  const status = document.createElement('div');
  status.id = 'imagery-status';
  status.setAttribute('role', 'status');
  status.style.cssText = 'position:absolute;right:12px;bottom:38px;max-width:330px;padding:7px 10px;border-radius:4px;background:#10272cdd;color:#e5eadd;font:11px/1.4 system-ui;z-index:2;pointer-events:none;';
  status.textContent = 'Loading Hessen aerial imagery…';
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
  let localRegionalLayer: ImageryLayer | null = null;
  let livePhotoLayer: ImageryLayer | null = null;
  let mapTerrain: Awaited<ReturnType<typeof import('./map-terrain-imagery').createMapTerrainImagery>> | null = null;
  let mapTerrainLayer: ImageryLayer | null = null;
  let mapTerrainLoad: Promise<void> | null = null;
  let mapTerrainStatus: 'loading' | 'ready' | 'degraded' = 'loading';
  function orderPhotographs() {
    if(livePhotoLayer)scene.imageryLayers.raiseToTop(livePhotoLayer);
    if(localRegionalLayer)scene.imageryLayers.raiseToTop(localRegionalLayer);
    if(airportLayer)scene.imageryLayers.raiseToTop(airportLayer);
    if(mapTerrainLayer)scene.imageryLayers.raiseToTop(mapTerrainLayer);
  }
  let loadSlow = false;
  const creditObserver = new ResizeObserver(() => {
    if (!disposed && credit) status.style.bottom = `${Math.max(38, credit.getBoundingClientRect().height + 12)}px`;
  });
  if (credit) creditObserver.observe(credit);
  const sourceCredit = new Credit('Hessen HVBG aerial imagery · DL-DE Zero 2.0', true);
  // A constant-color local base prevents Cesium from stretching photographic
  // edge pixels across the globe outside their actual geographic coverage.
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = baseCanvas.height = 1;
  const baseContext = baseCanvas.getContext('2d')!;
  baseContext.fillStyle = '#263a37'; baseContext.fillRect(0, 0, 1, 1);
  scene.imageryLayers.add(new ImageryLayer(new SingleTileImageryProvider({
    url: baseCanvas.toDataURL(), tileWidth: 1, tileHeight: 1,
    rectangle: Rectangle.MAX_VALUE,
  })));
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
      liveImagery,
    });
    const text = vectorScenery && state.terrain_profile === 1
      ? mapTerrainStatus === 'ready' ? '' : mapTerrainStatus === 'degraded'
        ? 'Map terrain unavailable in parts of this view; photography retained underneath.'
        : 'Loading map terrain without labels; photography retained underneath.'
      : photographText;
    container.dataset.mapTerrain = vectorScenery && state.terrain_profile === 1 ? mapTerrainStatus : vectorScenery ? 'flat-study' : 'off';
    container.dataset.mapTerrainLoaded = String(mapTerrain?.getStats().loadedTiles ?? 0);
    container.dataset.mapTerrainQueued = String(mapTerrain?.getStats().queuedTiles ?? 0);
    container.dataset.mapTerrainFailed = String(mapTerrain?.getStats().failedTiles ?? 0);
    if (liveImagery === 'ready') container.dataset.liveImagery = 'ready';
    if (status.textContent !== text) status.textContent = text;
    status.hidden = !text;
    container.dataset.imagery = outcome;
  }
  // Load the same photograph for every view. A cached source snapshot makes
  // the first practice scene independent of WMS latency and adaptive tile LOD.
  const photographAbort = new AbortController();
  function ensureMapTerrain(): void {
    if (mapTerrainLoad || disposed) return;
    mapTerrainStatus = 'loading';
    mapTerrainLoad = import('./map-terrain-imagery').then(module => module.createMapTerrainImagery({
      signal: photographAbort.signal,
      onStatus(value) {
        if (disposed) return;
        mapTerrainStatus = value; imageryStatus(lastState); scene.requestRender();
      },
    })).then(handle => {
      if (disposed) { handle.dispose(); return; }
      mapTerrain = handle;
      mapTerrainLayer = new ImageryLayer(handle.provider);
      mapTerrainLayer.show = vectorScenery && lastState.terrain_profile === 1;
      scene.imageryLayers.add(mapTerrainLayer); orderPhotographs(); scene.requestRender();
    }).catch(() => {
      if (!disposed) { mapTerrainStatus = 'degraded'; imageryStatus(lastState); }
    });
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
  const local = new Cartesian3();
  const localDirection = new Cartesian3();
  const localUp = new Cartesian3();
  let lastView: 'cockpit' | 'chase' = 'cockpit';
  let lastState = initialVisual;
  let lastLook: CameraLook = { yaw_rad: 0, pitch_rad: 0 };
  let lastFov_rad = DEFAULT_FOV_RAD;

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
    aircraft!.show = lastView === 'chase';
  }).catch(() => {
    if (!disposed) {
      container.dataset.aircraftVisual = 'error';
      // The aircraft marker is optional for cockpit flight; state remains live.
      console.warn('Generic aircraft visual could not load.');
    }
  });

  function update(state: FlightState, view: 'cockpit' | 'chase', look?: Readonly<CameraLook>): void {
    if (disposed) return;
    if (![state.lat_rad, state.lon_rad, state.alt_msl_m, state.pitch_rad, state.roll_rad, state.heading_rad].every(Number.isFinite)) {
      throw new RangeError('Cannot render a non-finite aircraft state');
    }
    const useTerrain = state.terrain_profile === 1;
    airportScenery.setVisible(useTerrain);
    airportScenery.setVectorVisible(false);
    if (vectorScenery && useTerrain) ensureMapTerrain();
    airportScenery.update(state);
    container.dataset.airportScenery = airportScenery.status;
    for (let i = 0; i < scene.imageryLayers.length; i++) {
      const layer = scene.imageryLayers.get(i);
      layer.show = layer === reliefLayer ? useTerrain : layer === mapTerrainLayer ? vectorScenery && useTerrain : true;
    }
    const terrainSample = useTerrain ? atlasSample(state.lat_rad, state.lon_rad) : null;
    if (useTerrain && (!terrainSample || !Number.isFinite(state.ground_height_ellipsoid_m))) {
      container.dataset.terrain = terrainSample ? 'height-unavailable' : 'outside-coverage';
      throw new RangeError('Public terrain needs covered coordinates and an explicit converted aircraft height');
    }
    if (useTerrain && streamedTiles.length) {
      const fine = state.lon_rad>=terrainGrid.west_rad && state.lon_rad<=terrainGrid.east_rad && state.lat_rad>=terrainGrid.south_rad && state.lat_rad<=terrainGrid.north_rad;
      const key=`${terrainRevision}/${Math.floor((state.lon_rad/DEG_RAD-8.25)*4)}/${Math.floor((state.lat_rad/DEG_RAD-49.25)*4)}/${fine}`;
      if(key!==providerKey) {
        const provider=createStreamedTerrainProvider(terrainGrid,streamedTiles,state);
        if(!provider) throw new Error('Required streamed terrain has not loaded.');
        activeTerrain=provider;providerKey=key;
        if(terrainEnabled) scene.globe.terrainProvider=activeTerrain;
      }
    } else if (activeTerrain!==publicTerrain && !streamedTiles.length) {
      activeTerrain=publicTerrain;providerKey='';if(terrainEnabled)scene.globe.terrainProvider=publicTerrain;
    }
    container.dataset.terrainStreamed=String(streamedTiles.length>0);
    container.dataset.terrainCached=String(streamedTiles.length);
    lastState = state; lastView = view; lastLook = boundedCameraLook(look);
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
    container.dataset.terrainId = useTerrain ? terrainGrid.id : '';
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
      aircraft.show = view === 'chase';
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
    aircraftShadow.update(state, view, aircraft);
    if (view === 'cockpit') {
      const camera = cockpitCameraENU(basis, lastLook);
      Cartesian3.fromElements(...camera.direction, localDirection);
      Cartesian3.fromElements(...camera.up, localUp);
      Cartesian3.fromElements(basis.up[0] * 0.7, basis.up[1] * 0.7, basis.up[2] * 0.7, local);
      Matrix4.multiplyByPoint(frame, local, cameraPosition);
      Matrix4.multiplyByPointAsVector(frame, localDirection, cameraDirection);
      Matrix4.multiplyByPointAsVector(frame, localUp, cameraUp);
    } else {
      const camera = chaseCameraENU(heading_rad, lastLook);
      Cartesian3.fromElements(...camera.offset, local);
      Cartesian3.fromElements(...camera.direction, localDirection);
      Cartesian3.fromElements(...camera.up, localUp);
      Matrix4.multiplyByPoint(frame, local, cameraPosition);
      Matrix4.multiplyByPointAsVector(frame, localDirection, cameraDirection);
      Matrix4.multiplyByPointAsVector(frame, localUp, cameraUp);
    }
    scene.camera.setView({ destination: cameraPosition, orientation: { direction: cameraDirection, up: cameraUp } });
    const frustum = scene.camera.frustum;
    if (!(frustum instanceof PerspectiveFrustum)) throw new Error('Flight view requires a perspective camera');
    // Cesium uses horizontal FOV in landscape and vertical FOV in portrait.
    // Change projection only: position, gaze and aircraft state stay unchanged.
    frustum.fov = lastFov_rad;
    const fovDeg = (frustum.fov / DEG_RAD).toFixed(1);
    if (container.dataset.fovDeg !== fovDeg) container.dataset.fovDeg = fovDeg;
    // Project body-forward as a direction at infinity: it must move when the
    // camera looks away, independently of aircraft position or velocity.
    const bounds = container.getBoundingClientRect();
    const top = Math.max(18, (header?.getBoundingClientRect().bottom ?? bounds.top) - bounds.top + 12);
    const fovy = frustum.fovy;
    forwardMarker.update(typeof fovy === 'number' ? projectForwardDirection({
      right: Cartesian3.dot(forwardWorld, scene.camera.rightWC),
      up: Cartesian3.dot(forwardWorld, scene.camera.upWC),
      forward: Cartesian3.dot(forwardWorld, scene.camera.directionWC),
      width_px: container.clientWidth, height_px: container.clientHeight,
      fov_y_rad: fovy,
      insets: { top, left: 36, right: 36, bottom: 18 },
    }) : null);
    widget.render();

  }

  const observer = new ResizeObserver(() => {
    if (!disposed) { widget.resize(); update(lastState, lastView, lastLook); }
  });
  observer.observe(container);
  update(initialVisual, 'cockpit');
  const flightScene: FlightScene = {
    setSceneryMode(vector) {
      vectorScenery = vector; airportScenery.setVectorVisible(false);
      if (vector && !mapTerrain && mapTerrainStatus === 'degraded') mapTerrainLoad = null;
      if (vector && lastState.terrain_profile === 1) ensureMapTerrain();
      if (!vector) mapTerrain?.cancelQueued();
      if (mapTerrainLayer) mapTerrainLayer.show = vector && lastState.terrain_profile === 1;
      container.dataset.sceneryMode = vector ? 'vector' : 'imagery'; imageryStatus(lastState); scene.requestRender();
    },
    setPracticePapi(enabled) { airportScenery.setPracticePapi(enabled); container.dataset.practicePapi = String(enabled); },
    update,
    async prepareRecording(states) {
      const needed = new Map<string, Readonly<FlightState>>();
      for (const state of states) if (state.terrain_profile === 1 && !atlasSample(state.lat_rad, state.lon_rad)) {
        needed.set(`${Math.floor(state.lat_rad / DEG_RAD * 4)},${Math.floor(state.lon_rad / DEG_RAD * 4)}`, state);
      }
      if (!needed.size) return;
      const tiles = new Map(streamedTiles.map(grid => [grid.id, grid]));
      const loader = new TerrainStream(await loadRegionalManifest(), grid => { tiles.set(grid.id, grid); }, () => {});
      try {
        for (const state of needed.values()) await loader.move(state.lat_rad, state.lon_rad);
        if (!disposed) {
          for (const [id, grid] of tiles) recordingTiles.set(id, grid);
          flightScene.setTerrainTiles?.(streamedTiles);
        }
      } finally { loader.cancel(); }
    },
    setTerrainTiles(tiles) {
      streamedTiles=Array.from(new Map([...tiles, ...recordingTiles.values()].map(grid => [grid.id, grid])).values());
      atlasTiles=new Map(streamedTiles.map(grid=>[grid.id,grid as RegionalTile]));terrainRevision++;
      if(tiles.length && !liveLayers) {
        liveLayers=true;
        const rectangle=Rectangle.fromDegrees(8.25,49.25,10,50.75);
        const mapLayer = new ImageryLayer(new UrlTemplateImageryProvider({url:'/scenery/map/{z}/{x}/{y}.png',minimumLevel:5,maximumLevel:12,tileWidth:256,tileHeight:256,rectangle,
          credit:new Credit('© <a href="https://www.bkg.bund.de" target="_blank" rel="noopener noreferrer">BKG</a> (2026) · <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener noreferrer">dl-de/by-2-0</a> · <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_topplusopen.html" target="_blank" rel="noopener noreferrer">TopPlusOpen sources</a> · map fallback',true)}));
        scene.imageryLayers.add(mapLayer,2);
        const photoProvider=new UrlTemplateImageryProvider({url:'/scenery/imagery/{z}/{x}/{y}.png',minimumLevel:7,maximumLevel:14,tileWidth:512,tileHeight:512,rectangle,
          credit:new Credit('Open photography: HVBG · <a href="https://www.govdata.de/dl-de/zero-2-0">DL-DE-Zero-2.0</a>; © <a href="https://www.ldbv.bayern.de">Bayerische Vermessungsverwaltung</a> (2026) · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; Datenquelle: <a href="https://www.lgl-bw.de">LGL-BW</a> (2026) · <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a> · resampled, composited · capture dates unknown',true)});
        photoProvider.errorEvent.addEventListener(()=>{container.dataset.liveImagery='degraded';});
        livePhotoLayer=new ImageryLayer(photoProvider);
        scene.imageryLayers.add(livePhotoLayer,3);orderPhotographs();
        container.dataset.liveImagery='loading';
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      photographAbort.abort();
      removeCameraListener?.(); removeCameraListener = null;
      regionalImagery?.dispose();
      mapTerrain?.dispose();
      observer.disconnect();
      creditObserver.disconnect();
      clearTimeout(loadTimeout);
      forwardMarker.dispose();
      aircraftShadow.dispose(); airportScenery.dispose();
      status.remove();
      widget.destroy();
      credits.remove();
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    },
  };
  return flightScene;
}
