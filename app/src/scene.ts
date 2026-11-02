import {
  Cartesian3, CesiumWidget, Color, Credit, Ellipsoid, EllipsoidTerrainProvider,
  HeadingPitchRoll, ImageryLayer, Ion, JulianDate,
  Matrix4, Model, Rectangle, ShadowMode, SingleTileImageryProvider, Transforms,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { createAircraftVisual } from './aircraft-visual';
import type { FlightScene, FlightState } from './types';

const DEG_RAD = Math.PI / 180;
// Bundled, source-backed starter photograph: fixed coverage and no runtime
// dependency on a live WMS. Provenance/license/hash: public/imagery/SOURCE.json.
const DETAIL = Rectangle.fromDegrees(8.62, 49.95, 8.66, 49.975);
const OVERVIEW = Rectangle.fromDegrees(8.4, 49.8, 8.9, 50.1);
function inside(rectangle: Rectangle, state: FlightState): boolean {
  return state.lon_rad >= rectangle.west && state.lon_rad <= rectangle.east
    && state.lat_rad >= rectangle.south && state.lat_rad <= rectangle.north;
}
// Visual camera offset only: gives the pilot a useful ground view below the nose.
const COCKPIT_LOOK_DOWN_RAD = 8 * DEG_RAD;
const INITIAL_STATE: FlightState = {
  step: 0, t_s: 0, lat_rad: 49.96 * DEG_RAD, lon_rad: 8.643 * DEG_RAD,
  alt_msl_m: 1300 * 0.3048, pitch_rad: 0, roll_rad: 0,
  heading_rad: 82 * DEG_RAD, tas_mps: 90 * 1852 / 3600,
};

/** Geographic imagery is rendered on WGS-84 h=0, not a surveyed terrain surface.
 * The existing study height is used unchanged; this does not resolve its datum.
 * Renderer state never feeds the flight model.
 */
export async function createScene(container: HTMLElement): Promise<FlightScene> {
  Ion.defaultAccessToken = '';
  const credits = document.createElement('div');
  credits.style.cssText = 'position:absolute;left:10px;right:10px;bottom:5px;z-index:1;font:10px/1.3 system-ui;color:white;text-shadow:0 1px 3px #000;';
  container.appendChild(credits);
  let widget: CesiumWidget;
  try { widget = new CesiumWidget(container, {
    creditContainer: credits,
    baseLayer: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    useDefaultRenderLoop: false,
    useBrowserRecommendedResolution: true,
    showRenderLoopErrors: false,
    scene3DOnly: true,
    shadows: false,
    msaaSamples: 2,
    contextOptions: { webgl: { alpha: false, antialias: true, powerPreference: 'high-performance' } },
  }); } catch (error) { credits.remove(); throw error; }
  widget.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
  widget.canvas.setAttribute('aria-label', 'Hessen aerial imagery flight scene');
  widget.canvas.setAttribute('tabindex', '-1');
  const scene = widget.scene;
  scene.screenSpaceCameraController.enableInputs = false;
  scene.globe.enableLighting = false;
  scene.globe.baseColor = Color.fromCssColorString('#263a37');
  scene.globe.maximumScreenSpaceError = 3;
  scene.globe.tileCacheSize = 256;
  scene.globe.preloadSiblings = false;
  scene.globe.depthTestAgainstTerrain = false;
  scene.fog.enabled = true;
  scene.fog.density = 0.00012;
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
  let overviewLoaded = false;
  let loadSlow = false;
  const sourceCredit = new Credit('Hessen HVBG · DL-DE Zero 2.0 · ellipsoid surface (no terrain)', true);
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
  const loadTimeout = setTimeout(() => {
    if (!disposed && !imagerySettled) { loadSlow = true; imageryStatus(lastState); }
  }, 25000);
  function imageryStatus(state: FlightState): void {
    if (disposed) return;
    let text = '', outcome = 'ready';
    if (!imagerySettled) {
      outcome = 'loading';
      text = loadSlow ? 'Aerial imagery is taking longer to load. Controls remain available.' : 'Loading the local Egelsbach aerial photograph…';
    } else if (!detailLoaded && !overviewLoaded) {
      outcome = 'error'; text = 'Starter photographs unavailable. Reload to retry; flight controls still work.';
    } else if (!(detailLoaded && inside(DETAIL, state)) && !(overviewLoaded && inside(OVERVIEW, state))) {
      outcome = 'outside-coverage'; text = 'Outside this starter imagery area. No photographic ground coverage here.';
    } else if (!detailLoaded) {
      outcome = 'degraded'; text = 'Starter detail unavailable; coarse overview only.';
    } else if (!inside(DETAIL, state)) {
      text = 'Regional overview · outside detailed starter area';
    } else if (!overviewLoaded) {
      outcome = 'degraded'; text = 'Starter detail loaded; surrounding overview unavailable.';
    }
    if (status.textContent !== text) status.textContent = text;
    status.hidden = !text;
    container.dataset.imagery = outcome;
  }
  // Load the same photograph for every view. A cached source snapshot makes
  // the first practice scene independent of WMS latency and adaptive tile LOD.
  const photographAbort = new AbortController();
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
  ]).then(results => {
    if (disposed) return;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        scene.imageryLayers.add(new ImageryLayer(result.value));
        if (index === 0) overviewLoaded = true; else detailLoaded = true;
      }
    });
    imagerySettled = true; clearTimeout(loadTimeout);
    container.dataset.imageryTiles = String(Number(detailLoaded) + Number(overviewLoaded));
    container.dataset.imageryDetail = detailLoaded ? 'ready' : 'unavailable';
    container.dataset.imageryCoverage = 'detail:8.62,49.95,8.66,49.975;overview:8.4,49.8,8.9,50.1';
    imageryStatus(lastState); scene.requestRender();
  });

  let aircraft: Model | null = null;
  let modelUrl: string | null = null;
  const position = new Cartesian3();
  const frame = new Matrix4();
  const modelMatrix = new Matrix4();
  const modelHpr = new HeadingPitchRoll();
  const cameraPosition = new Cartesian3();
  const cameraDirection = new Cartesian3();
  const cameraUp = new Cartesian3();
  const local = new Cartesian3();
  const localDirection = new Cartesian3();
  const localUp = new Cartesian3();
  let lastView: 'cockpit' | 'chase' = 'cockpit';
  let lastState = INITIAL_STATE;

  // This visual is authored here, not fetched aircraft/model data. Loading it must
  // not delay the first geographic scene or start an alternate render loop.
  void createAircraftVisual().then(async url => {
    if (disposed) { URL.revokeObjectURL(url); return; }
    modelUrl = url;
    const model = await Model.fromGltfAsync({
      url, modelMatrix: Matrix4.clone(modelMatrix), scale: 1,
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

  function update(state: FlightState, view: 'cockpit' | 'chase'): void {
    if (disposed) return;
    if (![state.lat_rad, state.lon_rad, state.alt_msl_m, state.pitch_rad, state.roll_rad, state.heading_rad].every(Number.isFinite)) {
      throw new RangeError('Cannot render a non-finite aircraft state');
    }
    lastState = state; lastView = view;
    const { lat_rad, lon_rad, alt_msl_m, pitch_rad, roll_rad, heading_rad } = state;
    imageryStatus(state);
    Cartesian3.fromRadians(lon_rad, lat_rad, alt_msl_m, Ellipsoid.WGS84, position);
    Transforms.eastNorthUpToFixedFrame(position, Ellipsoid.WGS84, frame);
    modelHpr.heading = heading_rad - Math.PI / 2;
    modelHpr.pitch = pitch_rad;
    modelHpr.roll = roll_rad;
    Transforms.headingPitchRollToFixedFrame(position, modelHpr, Ellipsoid.WGS84, undefined, modelMatrix);
    if (aircraft) {
      aircraft.modelMatrix = Matrix4.clone(modelMatrix, aircraft.modelMatrix);
      aircraft.show = view === 'chase';
    }
    if (view === 'cockpit') {
      const sh = Math.sin(heading_rad), ch = Math.cos(heading_rad);
      const sp = Math.sin(pitch_rad), cp = Math.cos(pitch_rad);
      const sr = Math.sin(roll_rad), cr = Math.cos(roll_rad);
      // ENU forward and aircraft-up vectors. Positive roll lowers the right wing.
      const fx = sh * cp, fy = ch * cp, fz = sp;
      const ux = -sh * sp * cr + ch * sr;
      const uy = -ch * sp * cr - sh * sr;
      const uz = cp * cr;
      const lookCos = Math.cos(COCKPIT_LOOK_DOWN_RAD), lookSin = Math.sin(COCKPIT_LOOK_DOWN_RAD);
      Cartesian3.fromElements(fx * lookCos - ux * lookSin, fy * lookCos - uy * lookSin, fz * lookCos - uz * lookSin, localDirection);
      Cartesian3.fromElements(ux * lookCos + fx * lookSin, uy * lookCos + fy * lookSin, uz * lookCos + fz * lookSin, localUp);
      Cartesian3.fromElements(ux * 0.7, uy * 0.7, uz * 0.7, local);
      Matrix4.multiplyByPoint(frame, local, cameraPosition);
      Matrix4.multiplyByPointAsVector(frame, localDirection, cameraDirection);
      Matrix4.multiplyByPointAsVector(frame, localUp, cameraUp);
    } else {
      Cartesian3.fromElements(-Math.sin(heading_rad) * 30, -Math.cos(heading_rad) * 30, 11, local);
      Matrix4.multiplyByPoint(frame, local, cameraPosition);
      Cartesian3.subtract(position, cameraPosition, cameraDirection);
      Cartesian3.normalize(cameraDirection, cameraDirection);
      Matrix4.multiplyByPointAsVector(frame, Cartesian3.UNIT_Z, cameraUp);
    }
    scene.camera.setView({ destination: cameraPosition, orientation: { direction: cameraDirection, up: cameraUp } });
    widget.render();

  }

  const observer = new ResizeObserver(() => {
    if (!disposed) { widget.resize(); update(lastState, lastView); }
  });
  observer.observe(container);
  update(INITIAL_STATE, 'cockpit');
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      photographAbort.abort();
      observer.disconnect();
      clearTimeout(loadTimeout);
      status.remove();
      widget.destroy();
      credits.remove();
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    },
  };
}
