import { EDFE_RUNWAYS, airportOffset } from './airport-geometry';
import { tuneStandby } from './radio-nav';
import type { RunwayStart } from './types';
import { createAircraftSystemsPanel } from './aircraft-systems-panel';
import { createOverlayPresentation } from './overlay-presentation';
import { installMenuShortcuts } from './menu-shortcuts';
import { installFullscreenControls } from './fullscreen';
import { createFlightAssists } from './flight-assists';
import { loadTerrainPackage, sampleTerrain, type TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import './style.css';
import './practice-map.css';
import { createCockpitLayout } from './cockpit-layout';
import { createPitchTrimControl } from './pitch-trim';
import { createNavigationGauges } from './navigation-gauges';
import { createLandingFeedback } from './landing-feedback';
import { createGroundCollisionPanel } from './ground-collision-panel';
import { createFlightPathGroundPanel } from './flight-path-ground';
import { createStallAwarenessPanel } from './stall-awareness-panel';
import { createFlightWarningMonitor } from './flight-warnings';
import { createFlightWarningsPanel } from './flight-warnings-panel';
import { createAircraftHandbook } from './aircraft-handbook';
import { createSixPack } from './six-pack';
import { createAutopilotPanel } from './autopilot-panel';
import { createRadioNavPanel } from './radio-nav-panel';
import { loadNavigationPackage } from '../../studies/e1-browser/sim/navigation.js';
import { getNavigationCatalogue, setNavigationCatalogue } from './radio-nav';
import { eddfApproachPractice } from './navigation-approach';
import { createEnginePanel } from './engine-panel';
import { createLoadingPanel } from './loading-panel';
import { createEngineAudio } from './engine-audio';
import { createAudioControls } from './audio-controls';
import { createPointerYoke } from './pointer-yoke';
import { createFieldOfViewControl, DEFAULT_FOV_RAD } from './field-of-view';
import { createPressureAltimeterPanel } from './pressure-altimeter-panel';
import { createScene } from './scene';
import { createSession } from './session';
import { resumeProblem } from '../../studies/e1-browser/sim/continue-flight.js';
import { loadingFromState } from '../../studies/e1-browser/sim/loading.js';
import { createFlightLocationStore } from './flight-location';
import { FlightTrace } from './flight-trace';
import { createRunwayPracticeMonitor, type PracticeProgress } from './runway-practice';
import { createFlightReviewControls } from './flight-review-controls';
import { applyControlSettings, DEFAULT_CONTROL_SETTINGS, type ControlSettings } from './control-settings';
import { createControlSettingsPanel } from './control-settings-panel';
import { reviewKeyAction, snapReviewTime } from './review-transport';
import { checkNavdata, eddfPracticeReady, workerNavdata, type NavdataCheck, type NavdataSide } from './navdata-identity';
import { pilotAxes, recordedControlView, recordedHeldKeys } from './pilot-controls';
import type { Controls, FlightState, FlightScene, LandingPreset, AirborneSite, FlightLocation } from './types';
import type { PracticeMap } from './practice-map';
import { practiceMapUpdateDue } from './practice-map-data';
import { LANDMARK_LEVEL_NAMES, type LandmarkLevel } from './landmark-data';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
<main class="flight-app">
  <div id="scene" aria-label="Flight scene" tabindex="0" data-pointer-mode="off"></div>
  <header class="topbar">
    <a class="brand" href="https://github.com/gregoryyy/gefly" target="_blank" rel="noreferrer">gefly<span>FLIGHT LAB</span></a>
    <div class="location"><strong>EGELSBACH</strong><span>C172 research aircraft · airborne practice</span></div>
    <div class="session-status"><i id="status-dot"></i><span id="status" role="status">Loading flight…</span><span id="clock">00:00</span><span id="audio-button-slot"></span></div>
    <details id="view-menu" class="top-menu"><summary>View</summary><nav class="menu-content view-controls" aria-label="Flight views"><button id="cockpit" class="selected" aria-pressed="true">Cockpit</button><button id="chase" aria-pressed="false">Chase <kbd>V</kbd></button><button id="toggle-fullscreen" type="button" aria-keyshortcuts="F" aria-pressed="false"><span data-fullscreen-label>Full screen</span> <kbd>F</kbd></button><button id="toggle-map-terrain" type="button" aria-pressed="false" aria-keyshortcuts="/" title="/ · Switch vector/photo terrain (US keyboard)">Terrain: photos <kbd>/</kbd></button><button id="toggle-map" aria-pressed="false" aria-controls="practice-map-panel" aria-keyshortcuts="M">Flight map <kbd>M</kbd></button><button id="cycle-landmarks" type="button" aria-keyshortcuts="." title=". · Cycle landmark labels">Landmarks: Off <kbd>.</kbd></button><button id="toggle-flight-data" aria-pressed="false" aria-controls="flight-data-panel">Flight data</button><button id="toggle-stall-awareness" aria-pressed="false" aria-controls="stall-awareness-panel">Stall awareness</button><button id="toggle-controls" aria-pressed="true" aria-controls="flight-controls-panel">Flight controls</button></nav></details>
    <span id="review-button-slot"></span>
    <button id="controls-settings" class="settings-trigger" aria-haspopup="dialog">Options</button>
    <details id="flight-menu" class="top-menu"><summary>Flight</summary><nav class="menu-content" aria-label="Flight session">
      <label class="practice-runway-choice">Egelsbach runway <select id="practice-runway" aria-label="Practice runway"><option value="26">26</option><option value="08">08</option></select></label>
      <button id="practice-takeoff" disabled>Takeoff</button>
      <button id="practice-landing" disabled title="Start 3 NM before the selected threshold at a geometric 3-degree height, 90 kt, flaps up. Set power and configuration manually; approximate practice geometry, not a published approach.">Landing · 3 NM final</button>
      <button id="practice-circuit" disabled title="Start on the runway with the generated north-circuit map guide. Not a published circuit or graded exercise.">Fly a circuit</button>
      <details id="flight-research" class="flight-research"><summary>Research & other locations</summary>
        <span class="menu-label">REGIONAL FLIGHTS</span><button id="airborne-practice">Egelsbach airborne practice</button><button id="taunus-practice">Taunus ridge flight</button><button data-region="darmstadt">Darmstadt flight</button><button data-region="odenwald">Odenwald ridge flight</button><button data-region="spessart">Spessart flight</button><button data-region="westerwald">Westerwald flight</button><button data-region="marburg">Marburg / Lahn flight</button><button data-region="kassel">Kassel flight</button><button id="eddf-ils-practice" disabled>EDDF 25C ILS practice · historical</button>
        <span class="menu-label">FLAT-GROUND CONTACT STUDIES</span><button data-landing="normal">Baseline touchdown</button><button data-landing="hard">Fast descent</button><button data-landing="side">Sideways touchdown</button><button data-landing="banked">Banked touchdown</button>
      </details>
      <span class="menu-label">FLIGHT TOOLS</span><button id="reset">Restart flight</button>
    </nav></details>
    <button id="pause" disabled>Pause <kbd>SPACE</kbd></button>
  </header>
  <section id="notice" class="notice" role="status" aria-live="polite" hidden></section>
  <section id="navdata-error" class="notice navdata-error" role="alert" hidden></section>
  <section id="flight-gate" class="flight-gate" aria-label="Flight session">
    <span class="eyebrow" id="gate-label">PREPARING YOUR FLIGHT</span>
    <h1 id="gate-title">Loading aircraft…</h1>
    <p id="gate-copy">The aircraft starts airborne at 90 kt. Flight time stays paused until you start.</p>
    <button id="start" class="primary" disabled>Loading…</button>
    <span class="gate-hint">I opens the menu · O opens Options · Space starts/pauses · M opens the map · , opens map menu · . labels · / vector/photos (US keyboard).</span>
  </section>
  <aside id="landing-feedback" hidden></aside>
  <aside id="ground-collision-panel" hidden></aside>
  <aside id="flight-data-panel" aria-label="Flight path and ground reactions" hidden></aside>
  <aside id="stall-awareness-panel" aria-label="Spatial stall awareness estimates" hidden></aside>
  <aside id="flight-warnings" aria-label="Flight warnings, simulator cues"></aside>
  <div id="camera-fov" class="camera-fov">60° FOV · two-finger scroll</div>
  <div id="yoke-center-marker" class="yoke-center-marker" aria-hidden="true" hidden></div>
  <div id="pointer-mode" class="pointer-mode">Click scene: yoke · Hold-drag: look</div>
  <aside id="flight-controls-panel" class="control-panel" aria-label="Flight controls">
    <div class="control-heading"><strong>FLIGHT CONTROLS</strong><span id="control-state">START FLIGHT TO CONTROL</span></div>
    <div class="control-body">
      <div class="joystick-column"><div id="joystick" class="joystick" tabindex="0" role="application" aria-label="Flight stick: drag up to push nose down, down to pull nose up, left or right to bank"><span class="stick-label top">PUSH / NOSE DOWN</span><span class="stick-label bottom">PULL / NOSE UP</span><i class="stick-line vertical"></i><i class="stick-line horizontal"></i><b id="joystick-knob"></b></div><span class="drag-hint">DRAG TO FLY · RELEASE TO CENTER</span></div>
      <div class="button-controls" aria-label="Press and hold flight controls">
        <div class="pitch-roll"><button id="pitch-down" data-code="ArrowUp" class="control-key up" aria-label="Hold to push nose down">↑<small>PUSH</small></button><button id="roll-left" data-code="ArrowLeft" class="control-key left" aria-label="Hold to bank left">←<small>BANK</small></button><button id="pitch-up" data-code="ArrowDown" class="control-key down" aria-label="Hold to pull nose up">↓<small>PULL</small></button><button id="roll-right" data-code="ArrowRight" class="control-key right" aria-label="Hold to bank right">→<small>BANK</small></button></div>
        <div class="rudder-buttons"><button id="rudder-left" data-code="KeyQ" class="control-key" aria-label="Hold left rudder">Q<small>RUDDER</small></button><button id="rudder-right" data-code="KeyW" class="control-key" aria-label="Hold right rudder">W<small>RUDDER</small></button></div>
      </div>
    </div>
    <div class="axis-display"><span><span id="roll-control-label">ROLL</span> <b id="roll-control">0</b></span><span><span id="pitch-control-label">PITCH</span> <b id="pitch-control">0</b></span><span><span id="rudder-control-label">RUDDER</span> <b id="rudder-control">0</b></span></div>
    <div id="recorded-control-details" hidden>
      <div class="axis-display"><span>L AIL <b id="recorded-left-aileron">—</b></span><span>R AIL <b id="recorded-right-aileron">—</b></span><span>ELEV <b id="recorded-elevator">—</b></span></div>
      <div class="axis-display"><span>RUDDER <b id="recorded-rudder">—</b></span><span>L BRAKE <b id="recorded-left-brake">—</b></span><span>R BRAKE <b id="recorded-right-brake">—</b></span></div>
      <div class="axis-display"><span>FLAP CMD <b id="recorded-flap-command">—</b></span><span>ACTUAL <b id="recorded-flap-actual">—</b></span><span>TRIM <b id="recorded-trim">—</b></span></div>
      <div class="axis-display"><span>THROTTLE <b id="recorded-throttle">—</b></span><span>MIXTURE <b id="recorded-mixture">—</b></span><span>MODE <b id="recorded-mixture-mode">—</b></span><span>ENGINE <b id="recorded-engine">—</b></span></div>
    </div>
    <details class="control-options"><summary>Keyboard & assistance</summary><p>↑ Push nose down · ↓ Pull nose up<br>← / → Bank · Q / W Rudder<br>1–9 Throttle: 10–90% · 0: idle<br>[ / ] Retract / extend flaps · B Hold wheel brakes · N Toggle parking brake<br>&#39; / &#92; Trim nose up / down<br>P Autopilot on / off<br>E Engine on/off · S Sound on/off<br>Space Pause · R Review</p><label for="roll-offset">Roll correction <output id="offset-value">0</output></label><input id="roll-offset" type="range" min="-0.25" max="0.25" step="0.001" value="0" aria-label="Experimental roll correction for the generic model"><small>Optional constant aileron command for experiments. Normal flight starts at zero; this is not aircraft trim.</small><div class="roll-correction-presets"><button id="roll-correction-off" type="button">Off · 0%</button><button id="roll-correction-default" type="button">Legacy study offset</button></div></details>
  </aside>
  <div class="scenery-label">Hessen public terrain · Egelsbach–Frankfurt–Taunus</div>
  <aside id="practice-map-panel" class="practice-map-panel" aria-label="Flight map" hidden></aside>
  <section class="flight-deck" aria-label="Flight instruments">
    <div class="deck-heading"><span class="eyebrow">CLASSIC INSTRUMENTS <b>EXPERIMENTAL</b></span><span id="view-label">COCKPIT VIEW</span></div>
    <div class="instruments">
      <aside id="aircraft-systems" class="aircraft-systems-panel" aria-label="Aircraft systems"><button id="systems-open" type="button" class="systems-open">Aircraft systems</button></aside>
      <div class="primary-instruments"><div id="six-pack"></div><div id="navigation-gauges"></div></div>
      <div class="avionics-stack cockpit-engine"><div id="engine-systems"></div></div>
      <aside class="engine-controls" aria-label="Aircraft controls"><div id="autopilot-systems"></div>
        <div class="throttle-control"><label for="throttle">THROTTLE <b id="power">—</b></label><input id="throttle" type="range" aria-orientation="vertical" min="0" max="100" value="69" aria-label="Throttle percentage"><span>IDLE <i></i> FULL</span><p><kbd>1–9</kbd> 10–90% <kbd>0</kbd> Idle</p></div>
        <div class="vertical-config-controls"><div class="flap-controls"><div class="config-heading"><label for="flap-control">FLAPS</label><b id="flaps-actual">—</b></div><div class="flap-slider"><input id="flap-control" type="range" min="0" max="30" step="10" value="0" list="flap-stops" aria-label="Flap lever angle degrees" aria-orientation="vertical"><datalist id="flap-stops"><option value="0"></option><option value="10"></option><option value="20"></option><option value="30"></option></datalist><div class="flap-stop-labels" aria-hidden="true"><span>UP</span><span>10</span><span>20</span><span>30</span></div></div><div class="flap-keycaps"><button id="flaps-retract" type="button" aria-label="Retract flaps one detent, left bracket key" aria-keyshortcuts="[" title="[ · Retract flaps">↑ <kbd>[</kbd></button><button id="flaps-extend" type="button" aria-label="Extend flaps one detent, right bracket key" aria-keyshortcuts="]" title="] · Extend flaps">↓ <kbd>]</kbd></button></div></div>
        <div id="pitch-trim"></div></div>
        <div class="brake-controls"><div class="brake-buttons"><button id="wheel-brakes" data-code="KeyB" class="control-key" aria-label="Hold wheel brakes">WHEEL <kbd>B</kbd></button><button id="parking-brake" type="button" class="control-key" aria-label="Toggle parking brake" aria-keyshortcuts="N" aria-pressed="false" disabled>PARK OFF <kbd>N</kbd></button></div><small id="brake-state">Wheel brakes · ground contact only</small></div>
      </aside>
      <div class="avionics-units cockpit-radio"><div id="radio-nav-systems"></div></div>
    </div>
    <footer><span>LOCAL RESEARCH PROTOTYPE · NOT VALIDATED FOR TRAINING</span><span>Imagery: HVBG · DL-DE Zero 2.0</span></footer>
    <div id="limitations" hidden>Generic JSBSim 172P research data, not the planned C172S. The local fixed-pitch propeller uses generic Aero-Matic windmilling tables; low-RPM/stopped-prop drag remains unsupported, and glide performance is not calibrated to a real aircraft. Official Hessen DGM terrain is active on normal flights, with DHHN2016 heights in dynamics and GCG2016/2023 ellipsoid conversion for rendering. A 108-tile DGM200 region extends across the Taunus and beyond, including Darmstadt, Odenwald and Spessart within 7–10°E, 49.25–51.5°N. Its 200 m source is blended into the fine Hessen patch near the edge; fine source nodes are approximately 32–54 m. This is not full EDDF/100 NM coverage or surveyed runway/obstacle fidelity. Photography and map tiles load from official public services; acquisition dates and coverage vary. Flat-ground landing-study presets remain separate. The map shows 731 community airfield and heliport entries across five southern German states, with source elevations and closed facilities distinguished; these are not current operational airport information. Bundled radio navigation uses a historical 2013.10 FlightGear NAV810 snapshot within approximately 100 NM of a community EDDF point; it is not current AIRAC or operational flight information. Airspeed shows ideal engine CAS, not installation-calibrated IAS; older engines explicitly fall back to TAS. Heading is true, and the ideal turn-rate aid is not a full gyro turn-coordinator model. The pressure altimeter uses an ideal ISA scale-offset model driven by JSBSim static pressure; launch-point QFE is a practice datum, not airport elevation. Installed C172S instrument errors and limits are not modeled. Electrical controls use an independent ideal 24/28 V teaching model and generic circuit-current estimates, not native electrical telemetry. Battery depletion/recharge, low-RPM alternator response, external light rendering, avionics power failures and pitot icing are not coupled. No validated landing, circuit assessment, weather, radio or checklists yet. The adjustable study roll offset adds a constant aileron input to counter the generic model’s initial roll-off; this is an experimental assist, not an aircraft trim specification. Local research runtime assets are excluded from distribution. COM channel names support 25/8.33 kHz designators; the source-dated station directory does not provide an ATC service. Historical real VOR/LOC/GS/DME sources are modeled with spherical geometry and approximate service sectors; no RF propagation or terrain masking. VOR OBS uses sourced station magnetic calibration; LOC courses and the DG remain TRUE. Missing components stay unavailable. Autopilot operating logic follows the KAP 140 two-axis altitude-preselect reference, over reused generic JSBSim servos. AP engages ROL/current VS; ALT captures current pressure altitude, separate from the selector. Native controller response and capture anticipation are uncalibrated. TRUE DG reference remains a teaching substitution. NAV/APR/REV can use historical NAV1 VOR/LOC and APR uses paired GS where available. Current LOC/GS/GPS service data, hardware PFT timing and installed trim-servo/electrical/fault dynamics are not supplied. AP and altimeter BARO settings are separate. Raw manual input or trim change disconnects AP as a simulator safety substitution. Supported pressure-sensor height is −2 km to 11 km; incompatible selector/BARO combinations are rejected. A is a simulator convenience that captures current heading and pressure altitude in HDG/ALT; it is not an original KAP 140 button. Throttle remains manual; no automatic stall or overspeed protection is claimed. The = shortcut cycles requested simulation pacing through 1×, 1.5×, 2×, 5× and 10× without enlarging the physics step; achievable speed depends on the computer and loading. Landing contact studies use a flat zero-height ellipsoid, upstream generic gear forces and illustrative fixed-wheel visuals; they do not establish aircraft damage or safe load limits. Airspeed colored arcs use fixed 1982 C172P CAS references (2400 lb, forward CG, power off and zero bank for stalls), not installed IAS arcs, current-weight stall predictions or validated model bounds. The TAS fallback hides those arcs.</div>
  </section>
</main>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let audioControls: ReturnType<typeof createAudioControls> | null = null;
const engineAudio = createEngineAudio({ onStatus(status) { audioControls?.update(status); } });
const sixPack = createSixPack(el('six-pack'));
const landingFeedback = createLandingFeedback(el('landing-feedback'));
const groundCollisionPanel = createGroundCollisionPanel({
  container: el('ground-collision-panel'),
  onReview: () => enterReview(),
  onContinue: () => { void continueAfterGroundCollision(); },
  onFlightMenu() {
    if (reviewing) exitReview();
    document.querySelector<HTMLElement>('.topbar')!.hidden = false;
    closeViewMenu(); el<HTMLDetailsElement>('flight-menu').open = true;
    el('practice-takeoff').focus({ preventScroll: true });
  },
});
const flightData = createFlightPathGroundPanel({ container: el('flight-data-panel'), onClose: () => setFlightDataVisible(false) });
const stallAwareness = createStallAwarenessPanel({ container: el('stall-awareness-panel'), onClose: () => setStallAwarenessVisible(false) });
const liveWarningMonitor = createFlightWarningMonitor();
const reviewWarningMonitor = createFlightWarningMonitor();
const unavailableWarnings = liveWarningMonitor.update(null);
let liveWarnings = unavailableWarnings;
const flightWarningsPanel = createFlightWarningsPanel({ container: el('flight-warnings') });
const sceneContainer = el('scene');
const focusFlight = () => sceneContainer.focus({ preventScroll: true });
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
let view: 'cockpit' | 'chase' = 'cockpit';
let landmarkLevel: LandmarkLevel = 0;
let pointerYoke: ReturnType<typeof createPointerYoke> | null = null;
let cameraLook = { yaw_rad: 0, pitch_rad: 0 };
let cameraFov_rad = DEFAULT_FOV_RAD;
let flapTarget_deg = 0;
let pitchTrimTarget: number | null = null;
let controlsVisible = false;
let landingPreset: LandingPreset | undefined;
let airborneSite: AirborneSite = 'edfe';
const regionalTiles = new Map<string,TerrainGrid>();
let terrainLoading = false;
let mixtureCommand = 1, mixtureAutomatic = true, apDisconnectPending = false, cwsHeld = false;
let autopilotCapturePending = false;
let startupPreloadPending = false;
const flightLocationStore = createFlightLocationStore();
const initialFlightLocation = flightLocationStore.read();
let restoredFlightLocationActive = !!initialFlightLocation;
let engineCommand: boolean | null = null;
let parkingBrake = false;
let runwayStart: RunwayStart | null = null;
let practiceInitialLocation: FlightLocation | undefined;
let practiceLaunchPending = false;
let exerciseActive = false;
const runwayPractice = createRunwayPracticeMonitor();
let practiceReviewCache: { trace: FlightTrace; time: number; count: number; progress: PracticeProgress } | null = null;
let scene: FlightScene | null = null;
let sceneFailed = false, ready = false, running = false, failed = false;
let hasFlown = false, startWhenReady = false;
let latest: FlightState | null = null, previous: FlightState | null = null;
let collisionUnavailableNoticed = false;
let verticalSpeedFpm = 0, throttle = 0.69, stickX = 0, stickY = 0;
let flightTrace = new FlightTrace();
let loadedTrace: FlightTrace | null = null;
let resumeAfterReview = false;
let recordingLoadVersion = 0;
const recordedTrace = () => loadedTrace ?? flightTrace;
let reviewing = false, reviewPlaying = false, reviewTime_s = 0;
let continuingReplay = false;
let continuingCollision = false;
let continuedAxes: Pick<Controls, 'elevator' | 'aileron' | 'rudder' | 'brake_norm'> | null = null;
let reviewRate = 1;
let liveStatus = 'Loading flight…';
let practiceMap: PracticeMap | null = null;
let mapVisible = false, mapLoading = false, mapDisposed = false;
let lastMapUpdate_ms = -Infinity;
let lastMapSample: unknown = undefined;
// Existing E1 fixture's empirical input offset, not an aircraft coefficient.
let rollOffset = 0;
let controlSettings: ControlSettings = { ...DEFAULT_CONTROL_SETTINGS };
const keys = new Set<string>();
const pointerControls = new Map<number, string>();
const keyboardControls = new Set<string>();
let stickPointer: number | null = null;
const flightKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyW', 'KeyB', 'Quote', 'Backslash']);
const editing = (target: EventTarget | null) => target instanceof HTMLElement && (!!target.closest('input,select,textarea') || target.isContentEditable);
const notice = (message: string) => { el('notice').textContent = message; el('notice').hidden = !message; };

function groundCollisionStopped() { return (latest?.collision_mask ?? 0) > 0; }
async function continueAfterGroundCollision(): Promise<void> {
  if (continuingCollision || reviewing || !groundCollisionStopped()) return;
  continuingCollision = true;
  try {
    await session.continueAfterCollision();
    notice(''); startFlight();
  } catch (error) { notice(`Cannot continue flight: ${error instanceof Error ? error.message : String(error)}`); }
  finally { continuingCollision = false; }
}
function controlsAvailable() { return ready && !failed && !sceneFailed && !reviewing && !groundCollisionStopped(); }
function updateSessionUI() {
  if (mapDisposed) return;
  const unavailable = !ready || failed || sceneFailed;
  const collided = groundCollisionStopped();
  document.querySelector<HTMLElement>('.flight-app')!.dataset.review = String(reviewing);
  el('flight-gate').hidden = collided || running || reviewing || (hasFlown && controlsAvailable());
  el<HTMLButtonElement>('start').disabled = unavailable || reviewing || collided;
  el<HTMLButtonElement>('pause').disabled = unavailable || reviewing || collided;
  el<HTMLButtonElement>('reset').disabled = reviewing;
  for (const id of ['practice-takeoff', 'practice-landing', 'practice-circuit']) el<HTMLButtonElement>(id).disabled = unavailable || reviewing || practiceLaunchPending;
  el<HTMLSelectElement>('practice-runway').disabled = reviewing || practiceLaunchPending;
  el<HTMLButtonElement>('airborne-practice').disabled = reviewing;
  el<HTMLButtonElement>('taunus-practice').disabled = reviewing;
  document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button=>button.disabled=reviewing);
  el<HTMLButtonElement>('eddf-ils-practice').disabled = reviewing || !getNavigationCatalogue() || document.querySelector<HTMLElement>('.flight-app')!.dataset.navdata !== 'match';
  document.querySelectorAll<HTMLButtonElement>('[data-landing]').forEach(button => { button.disabled = reviewing; });
  el<HTMLButtonElement>('controls-settings').disabled = reviewing;
  el<HTMLInputElement>('throttle').disabled = !controlsAvailable();
  renderParkingBrake(latest, reviewing);
  document.querySelector<HTMLElement>('.control-panel')!.hidden = !reviewing && !controlsVisible;
  document.querySelector<HTMLElement>('.throttle-control')!.hidden = false;
  el('recorded-control-details').hidden = !reviewing;
  el<HTMLButtonElement>('toggle-controls').disabled = reviewing;
  el('toggle-controls').setAttribute('aria-pressed', String(reviewing || controlsVisible));
  updateReviewControls();
  el('pause').innerHTML = collided ? 'Stopped' : `${running ? 'Pause' : 'Resume'} <kbd>SPACE</kbd>`;
  el('status-dot').classList.toggle('flying', running);
  el('control-state').textContent = reviewing ? 'RECORDED · READ ONLY' : collided ? 'COLLISION · CONTROLS LOCKED' : running ? (latest?.ap_mode ? 'AUTOPILOT · ROLL' : 'CONTROLS ACTIVE') : (controlsAvailable() ? 'PAUSED · CONTROLS READY' : 'LOADING CONTROLS');
  for (const [id, live, recorded] of [['roll-control-label', 'ROLL', 'AIL CMD'], ['pitch-control-label', 'PITCH', 'ELEV CMD'], ['rudder-control-label', 'RUDDER', 'RUD CMD']] as const) el(id).textContent = reviewing ? recorded : live;
  el('control-state').classList.toggle('active', running);
  updatePointerHint();
  el('joystick').setAttribute('aria-disabled', String(!controlsAvailable()));
  document.querySelectorAll<HTMLButtonElement>('[data-code]').forEach(button => { button.disabled = !controlsAvailable(); });
  if (failed || sceneFailed) {
    el('gate-label').textContent = 'FLIGHT UNAVAILABLE';
    el('gate-title').textContent = sceneFailed ? 'The 3D scene could not start.' : 'The flight engine stopped.';
    el('gate-copy').textContent = sceneFailed ? 'Reload with WebGL enabled to try again.' : 'See the message above. Restart after fixing the runtime problem.';
    el('start').textContent = 'Flight unavailable';
  } else if (!ready) {
    el('gate-label').textContent = 'PREPARING YOUR FLIGHT';
    el('gate-title').textContent = 'Loading aircraft…';
    el('gate-copy').textContent = 'The aircraft starts airborne at 90 kt. Flight time stays paused until you start.';
    el('start').textContent = 'Loading…';
  } else {
    el('gate-label').textContent = hasFlown ? 'SIMULATION PAUSED' : ['darmstadt','odenwald','spessart','westerwald','marburg','kassel'].includes(airborneSite) ? `${airborneSite.toUpperCase()} TERRAIN FLIGHT` : airborneSite === 'eddf-ils' ? 'HISTORICAL EDDF 25C PRACTICE' : airborneSite === 'taunus' ? 'TAUNUS TERRAIN FLIGHT' : 'READY AT EGELSBACH';
    el('gate-title').textContent = hasFlown ? 'Ready when you are.' : 'Take the controls.';
    el('gate-copy').textContent = runwayStart ? `Runway ${runwayStart.runway} at EDFE · at rest, engine idle and parking brake set. N releases the brake; 1–9 adds throttle. Approximate practice geometry.` : landingPreset ? 'Flat-ground contact study: CG starts 3 m above the ellipsoid, at 28 m/s. These are test fixtures, not landing procedures.' : hasFlown ? 'Flight time is paused. Resume, then drag the stick or use the keyboard.' : ['darmstadt','odenwald','spessart','westerwald','marburg','kassel'].includes(airborneSite) ? 'Regional terrain demonstration at 90 kt. Elevation tiles load as you fly; this is not a published route or surveyed airport exercise.' : airborneSite === 'eddf-ils' ? 'Start 5 NM from the historical 25C glideslope antenna at 90 kt, slightly below its beam. NAV1 111.55, NAV2 FFM 114.20. Engage AP, then APR to practice capture. Geometric simulator fixture, not a published procedure.' : airborneSite === 'taunus' ? 'Start at 90 kt and 3,609 ft MSL, facing the Taunus ridge. This is a terrain demonstration, not a published route.' : 'Start airborne at 90 kt and 1,300 ft MSL over public Hessen terrain. Drag the stick or hold the buttons to fly.';
    el('start').textContent = hasFlown ? 'Resume flight →' : 'Start flight →';
    if (restoredFlightLocationActive) {
      el('gate-label').textContent = 'SAVED FLIGHT LOCATION';
      el('gate-copy').textContent = initialFlightLocation?.mode === 'ground'
        ? 'Last location restored at rest, engine idle and parking brake set. Restart flight resets the location.'
        : 'Last position, altitude and heading restored at 90 kt. Flight stays paused until you start; Restart flight resets the location.';
    }
  }
}

const session = createSession({
  onTerrainTile(grid) { regionalTiles.set(grid.id,grid); },
  onTerrainLoading(loading) { terrainLoading=loading; if (!loading) scene?.setTerrainTiles?.([...regionalTiles.values()]); },
  onState(workerState) {
    if (continuingReplay) return;
    const state = { ...radioPanel.snapshot(), ...workerState, systems_switch_mask: systemsPanel.snapshot() };
    if (!reviewing && ready) flightLocationStore.observe(state);
    const oldAp = latest?.ap_mode ?? 0;
    const wasCollided = groundCollisionStopped();
    if (previous && state.t_s > previous.t_s) {
      const dt = state.t_s - previous.t_s;
      const raw = (state.alt_msl_m - previous.alt_msl_m) / dt / 0.3048 * 60;
      verticalSpeedFpm += (1 - Math.exp(-dt / 0.5)) * (raw - verticalSpeedFpm);
    }
    previous = state; latest = state;
    if (!reviewing && ready && startupPreloadPending && scene) {
      startupPreloadPending = false;
      scene.preloadScenery?.(state);
    }
    if (state.kap_engaged) autopilotCapturePending = false;
    liveWarnings = liveWarningMonitor.update(state);
    if (!reviewing) {
      flightTrace.record(state, verticalSpeedFpm * 0.3048 / 60);
      practiceReviewCache = null;
    }
    if (!reviewing && runwayStart) runwayPractice.update(state);
    if (state.collision_mask && !wasCollided) pauseFlight();
    if (!collisionUnavailableNoticed && ready && (state.collision_mask === undefined || state.ground_agl_m === undefined)) {
      collisionUnavailableNoticed = true;
      notice('Ground collision detection unavailable. Rebuild the local flight engine/runtime.');
    }
    updateReviewControls();
    if (oldAp !== (state.ap_mode ?? 0)) { apDisconnectPending = false; publishInput(); updateSessionUI(); }
  },
  onReady(trim, reply?: { navdata_sha256?: string | null; navdata_error?: string | null }) {
    // session.ts forwards the worker's ready {navdata_sha256, navdata_error}; undefined = older worker.
    engineNavdata = workerNavdata(reply); const navdataStatus = applyNavdataCheck();
    if (continuingReplay) return;
    ready = true; failed = false; startupPreloadPending = true; throttle = trim.throttle;
    if (runwayStart || (restoredFlightLocationActive && initialFlightLocation?.mode === 'ground')) parkingBrake = true;
    terrainLoading=false; scene?.setTerrainTiles?.([...regionalTiles.values()]);
    pitchTrimTarget = Math.abs(trim.pitch_trim) <= 1 ? trim.pitch_trim : null;
    el<HTMLInputElement>('throttle').value = String(throttle * 100);
    const restoredGround = restoredFlightLocationActive && initialFlightLocation?.mode === 'ground';
    const trimNotice = !landingPreset && !runwayStart && !restoredGround && trim.status !== 1 ? 'Initial trim did not converge. Handling may be unstable; restart if needed.' : '';
    if (restoredFlightLocationActive) {
      document.querySelector('.location strong')!.textContent = 'SAVED FLIGHT LOCATION';
      document.querySelector('.location span')!.textContent = 'C172 research aircraft · local position restored';
    }
    notice(trimNotice);
    const eddf = eddfPracticeReady(airborneSite, landingPreset, navdataStatus);
    if (eddf === 'apply') {
      try {
        const approach = eddfApproachPractice(getNavigationCatalogue());
        radioPanel.setConfiguration(approach.navigation);
        session.setKap140({action:'heading', value: approach.ic.heading_rad});
      } catch { notice(`${trimNotice} EDDF 25C practice guidance unavailable; flying without the historical approach setup.`.trim()); }
    } else if (eddf === 'degraded') {
      // The visible navdata alert explains why; the flight still becomes ready (Paused).
      notice(`${trimNotice} EDDF 25C practice guidance disabled: navigation data is unavailable or does not match.`.trim());
    }
    publishInput();
    if (startWhenReady && !document.hidden && !sceneFailed) { startWhenReady = false; startFlight(); }
    updateSessionUI();
  },
  onStatus(message) { liveStatus = message; el('status').textContent = reviewing ? 'Review' : groundCollisionStopped() ? 'Ground collision' : message; },
  onAutopilotRejected(message) { autopilotCapturePending = false; notice(message); updatePointerHint(); },
  onError(message) {
    autopilotCapturePending = false;
    failed = true; running = false; ready = false; startWhenReady = false; engineAudio.update(null, false);
    neutralize(); notice(`Flight stopped. ${message}`); updateSessionUI();
  },
});

let openingOptions = { rollOffset, volume: engineAudio.getStatus().volume, muted: engineAudio.getStatus().muted };
const controlSettingsPanel = createControlSettingsPanel({
  container: root, initial: controlSettings,
  onOpen() { openingOptions = { rollOffset, volume: engineAudio.getStatus().volume, muted: engineAudio.getStatus().muted }; pauseFlight(); },
  onClose(saved) {
    if (!saved) {
      rollOffset = openingOptions.rollOffset;
      el<HTMLInputElement>('roll-offset').value = String(rollOffset);
      engineAudio.setVolume(openingOptions.volume);
      engineAudio.setMuted(openingOptions.muted);
      publishInput();
    }
    focusFlight();
  },
  onChange(settings) { controlSettings = { ...settings }; scene?.setSceneryMode?.(!!settings.vectorScenery); scene?.setPracticePapi?.(!!settings.practicePapi); practiceMap?.setVector?.(!!settings.vectorScenery); neutralize(); updateConfiguration(latest, reviewing); updatePointerHint(); renderTerrainMode(); },
});
function renderTerrainMode(): void {
  const enabled = !!controlSettings.vectorScenery;
  const button = el<HTMLButtonElement>('toggle-map-terrain');
  button.setAttribute('aria-pressed', String(enabled));
  button.firstChild!.textContent = `Terrain: ${enabled ? 'map · no labels' : 'photos'} `;
}
function setTerrainMode(enabled: boolean): void {
  controlSettings = { ...controlSettings, vectorScenery: enabled };
  controlSettingsPanel.setSettings(controlSettings);
  scene?.setSceneryMode?.(enabled); practiceMap?.setVector?.(enabled);
  renderTerrainMode();
}
el('toggle-map-terrain').onclick = () => {
  setTerrainMode(!controlSettings.vectorScenery); closeViewMenu(); focusFlight();
};
renderTerrainMode();
// Options belong to the top menu; preserve the existing controls and their IDs.
el('control-settings-title').textContent = 'Options';
const keyboardOptions = document.querySelector('.control-options')!;
const rollCorrection = keyboardOptions.querySelector('#roll-offset')!;
const correctionLabel = keyboardOptions.querySelector('label[for="roll-offset"]')!;
const correctionNote = rollCorrection.nextElementSibling!;
el('settings-advanced-slot').append(correctionLabel, rollCorrection, correctionNote, keyboardOptions.querySelector('.roll-correction-presets')!);
el('settings-controls-extra').append(keyboardOptions);
const limitsButton = document.createElement('button');
limitsButton.id = 'limits'; limitsButton.type = 'button';
limitsButton.textContent = 'Model & systems information'; limitsButton.setAttribute('aria-expanded', 'false');
el('settings-advanced-slot').append(limitsButton, el('limitations'));
const audioSettingsSlot = document.createElement('div'); audioSettingsSlot.id = 'audio-settings-slot';
el('settings-sound-slot').append(audioSettingsSlot);
audioControls = createAudioControls({
  buttonContainer: el('audio-button-slot'), settingsContainer: audioSettingsSlot,
  onToggleMute() {
    const status = engineAudio.getStatus();
    if (!status.unlocked || status.state === 'unavailable') {
      if (status.muted) engineAudio.setMuted(false);
      void engineAudio.unlock();
    }
    else engineAudio.setMuted(!status.muted);
  },
  onVolume(volume) { engineAudio.setVolume(volume); if (!engineAudio.getStatus().muted) void engineAudio.unlock(); },
});
audioControls.update(engineAudio.getStatus());
// Unlock only from a trusted activation, never from worker/RAF/startup callbacks.
function activateEngineAudio(event: Event): void {
  if (!event.isTrusted || engineAudio.getStatus().muted || !(event.target instanceof Element)) return;
  const target = event.target;
  const button = target.closest('#start, #pause, #review-play');
  const key = event instanceof KeyboardEvent ? event : null;
  const flightSpace = key?.code === 'Space' && !editing(target) && !menuOpen()
    && !document.querySelector('dialog[open]') && !target.closest('button,a,summary');
  if ((button && (!key || key.code === 'Space' || key.code === 'Enter')) || flightSpace) void engineAudio.unlock();
}
document.addEventListener('click', activateEngineAudio, true);
document.addEventListener('keydown', activateEngineAudio, true);
function soundShortcut(event: KeyboardEvent): void {
  if (event.code !== 'KeyS' || event.repeat || !event.isTrusted || event.ctrlKey || event.metaKey || event.altKey
    || editing(event.target) || menuOpen() || document.querySelector('dialog[open]')) return;
  if (!engineAudio.getStatus().supported) return;
  event.preventDefault(); event.stopPropagation();
  const muted = !engineAudio.getStatus().muted;
  engineAudio.setMuted(muted);
  if (!muted) void engineAudio.unlock();
}
document.addEventListener('keydown', soundShortcut, true);
function engineShortcut(event: KeyboardEvent): void {
  if (event.code !== 'KeyE' || !event.isTrusted || event.repeat || event.ctrlKey || event.metaKey || event.altKey
    || editing(event.target) || menuOpen() || document.querySelector('dialog[open]')) return;
  if (!controlsAvailable() || latest?.engine_command_on === undefined) return;
  event.preventDefault(); event.stopPropagation(); toggleEngine();
}
document.addEventListener('keydown', engineShortcut, true);
function parkingBrakeShortcut(event: KeyboardEvent): void {
  if (event.code !== 'KeyN' || !event.isTrusted || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
    || editing(event.target) || menuOpen() || document.querySelector('dialog[open]')
    || (event.target instanceof Element && event.target.closest('.practice-map-panel'))) return;
  if (!controlsAvailable() || latest?.brake_left_norm === undefined) return;
  event.preventDefault(); event.stopPropagation(); toggleParkingBrake();
}
document.addEventListener('keydown', parkingBrakeShortcut, true);
function toggleParkingBrake(): void {
  if (!controlsAvailable() || latest?.brake_left_norm === undefined) return;
  if (continuedAxes) continuedAxes.brake_norm = 0;
  parkingBrake = !parkingBrake;
  publishInput();
}
el('parking-brake').onclick = () => { toggleParkingBrake(); focusFlight(); };
function renderParkingBrake(state: Readonly<FlightState> | null, recorded: boolean): void {
  const button = el<HTMLButtonElement>('parking-brake');
  button.disabled = recorded || !controlsAvailable() || state?.brake_left_norm === undefined;
  button.setAttribute('aria-pressed', recorded ? 'mixed' : String(parkingBrake));
  button.classList.toggle('held', !recorded && parkingBrake);
  button.firstChild!.textContent = recorded ? 'PARK — ' : `PARK ${parkingBrake ? 'ON' : 'OFF'} `;
  button.setAttribute('aria-label', recorded ? 'Parking brake latch not recorded; Review is read only'
    : `Toggle parking brake, ${parkingBrake ? 'set' : 'released'}; full wheel brake command`);
}
function toggleEngine(): void {
  if (!controlsAvailable() || latest?.engine_command_on === undefined) return;
  engineCommand = !(engineCommand ?? latest.engine_command_on === 1);
  publishInput();
}


el('controls-settings').onclick = () => { closeViewMenu(); controlSettingsPanel.open(); };
const viewMenu = el<HTMLDetailsElement>('view-menu');
function closeViewMenu() { for (const id of ['view-menu', 'flight-menu']) el<HTMLDetailsElement>(id).open = false; }
for (const menu of [viewMenu, el<HTMLDetailsElement>('flight-menu')]) {
  menu.addEventListener('toggle', () => { if (menu.open) { neutralize(); for (const other of [viewMenu, el<HTMLDetailsElement>('flight-menu')]) if (other !== menu) other.open = false; } });
  menu.addEventListener('keydown', event => {
    if (event.code === 'Escape') { event.preventDefault(); closeViewMenu(); menu.querySelector('summary')!.focus(); }
  });
  document.addEventListener('pointerdown', event => { if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false; });
}
function menuOpen() { return viewMenu.open || el<HTMLDetailsElement>('flight-menu').open; }
el('toggle-controls').onclick = () => {
  controlsVisible = !controlsVisible; neutralize(); updateSessionUI();
  el('toggle-controls').setAttribute('aria-pressed', String(controlsVisible)); closeViewMenu(); focusFlight();
};
const pitchTrimControl = createPitchTrimControl({
  container: el('pitch-trim'),
  onChange(norm) { if (!controlsAvailable() || latest?.pitch_trim_norm === undefined) return; pitchTrimTarget = norm; publishInput(); },
  onRestoreInitial() {
    if (!controlsAvailable() || latest?.pitch_trim_initial_norm === undefined) return;
    pitchTrimTarget = latest.pitch_trim_initial_norm; publishInput(); focusFlight();
  },
  onFocusFlight: focusFlight,
});
const pressureAltimeter = createPressureAltimeterPanel({
  container: sixPack.altimeterContainer, onOpen: pauseFlight, onClose: focusFlight,
  onSetting(setting_pa) { if (controlsAvailable()) session.setAltimeter(setting_pa); },
});

const enginePanel = createEnginePanel({
  container: el('engine-systems'),
  onEngine: toggleEngine,
  onMixture(norm, automatic) {
    if (!controlsAvailable()) return;
    mixtureCommand = norm; mixtureAutomatic = automatic; publishInput();
  },
  onOpen: neutralize, onClose: focusFlight,
});
el('engine-unavailable').textContent = 'INOP';
(document.querySelector('.engine-power-controls') ?? document.querySelector('.engine-content'))!.insertBefore(document.querySelector('.throttle-control')!, document.querySelector('.engine-mixture'));
const autopilotPanel = createAutopilotPanel({
  container: el('autopilot-systems'),
  onCommand(command) {
    const release = (command.action === 'vertical' || command.action === 'cws') && command.value === 0;
    if (!release && (reviewing || (!controlsAvailable() && command.action !== 'disconnect'))) return;
    if (command.action === 'cws') {
      if (command.value === 0) { neutralize(); return; }
      neutralize(); cwsHeld = true;
    }
    if (continuedAxes && command.action === 'ap') { continuedAxes = null; publishInput(); }
    apDisconnectPending = false; session.setKap140(command);
  },
  onOpen: neutralize, onClose: focusFlight,
});
const systemsPanel = createAircraftSystemsPanel({
  container: el('aircraft-systems'), opener: el<HTMLButtonElement>('systems-open'),
  onOpen() { neutralize(); closeViewMenu(); }, onClose: focusFlight,
  onChange() {
    if (!latest || reviewing) return;
    latest = { ...latest, systems_switch_mask: systemsPanel.snapshot() };
    flightTrace.record(latest, verticalSpeedFpm * 0.3048 / 60);
  },
});
const radioPanel = createRadioNavPanel({
  container: el('radio-nav-systems'),
  onChange(config) {
    if (!controlsAvailable() || !latest) return;
    session.setNavigation(config);
    latest = { ...latest, ...config };
    // NAV1 tuning is acknowledged by the worker before the next recorded frame.
  },
  onOpen: neutralize, onClose: focusFlight,
});

// R-NAV-4: the UI and worker each load the package; their byte hashes must agree.
let uiNavdata: NavdataSide = { settled: false, sha256: null, error: null };
let engineNavdata: NavdataSide = { settled: false, sha256: null, error: null };
let loadedCatalogue: ReturnType<typeof getNavigationCatalogue> = null;
function applyNavdataCheck(): NavdataCheck['status'] {
  const check = checkNavdata(uiNavdata, engineNavdata);
  document.querySelector<HTMLElement>('.flight-app')!.dataset.navdata = check.status;
  // Fail closed on an error. While a restarted worker is pending, keep the UI
  // catalogue: session init needs it for the EDDF practice preset.
  setNavigationCatalogue(check.status === 'error' ? null : loadedCatalogue);
  el('navdata-error').textContent = check.status === 'error' ? check.message : '';
  el('navdata-error').hidden = check.status !== 'error';
  el<HTMLButtonElement>('eddf-ils-practice').disabled = reviewing || check.status !== 'match';
  radioPanel.update(latest, reviewing, controlsAvailable(), running);
  return check.status;
}
void loadNavigationPackage().then(pkg => {
  // loadNavigationPackage verifies the SHA-256 (crypto.subtle) of the exact bytes it fetched.
  loadedCatalogue = pkg; uiNavdata = { settled: true, sha256: pkg.sha256, error: null };
  applyNavdataCheck();
}).catch((error: unknown) => {
  uiNavdata = { settled: true, sha256: null, error: error instanceof Error ? error.message : String(error) };
  applyNavdataCheck();
});

document.querySelector('.radio-heading strong')!.textContent = 'RADIO STACK · COM/NAV';
const navigationGauges = createNavigationGauges({
  container: el('navigation-gauges'),
  onObs(receiver, delta_deg) { if (controlsAvailable()) radioPanel.adjustObs(receiver, delta_deg); },
  onOpen() { closeViewMenu(); neutralize(); }, onClose: focusFlight,
});
const navigationMedia = matchMedia('(max-width: 620px)');
function placeNavigationOpener() {
  const destination = navigationMedia.matches ? viewMenu.querySelector('nav')! : el('navigation-gauges');
  destination.append(el('navigation-open'));
}
navigationMedia.addEventListener('change', placeNavigationOpener); placeNavigationOpener();
const loadingPanel = createLoadingPanel({
  buttonContainer: el('flight-menu').querySelector<HTMLElement>('nav')!,
  onOpen() { closeViewMenu(); neutralize(); }, onClose: focusFlight,
  onApply(config) { if (!reviewing && session.setLoading(config)) reset(landingPreset, runwayStart, practiceInitialLocation); },
});
const aircraftHandbook = createAircraftHandbook({
  buttonContainer: viewMenu.querySelector<HTMLElement>('nav')!,
  onOpen() {
    closeViewMenu();
    if (reviewing) { reviewPlaying = false; engineAudio.update(null, false); updateReviewControls(); }
    else pauseFlight();
  },
  onClose: focusFlight,
});
const cockpitLayout = createCockpitLayout(document.querySelector<HTMLElement>('.flight-app')!);

const fieldOfView = createFieldOfViewControl({
  element: sceneContainer, getFov: () => cameraFov_rad,
  isBlocked: () => !!document.querySelector('dialog[open]'),
  onChange(fov_rad) {
    cameraFov_rad = fov_rad;
    el('camera-fov').textContent = `${Math.round(fov_rad * 180 / Math.PI)}° FOV · two-finger scroll`;
  },
});

function setFlightDataVisible(visible: boolean): void {
  el('flight-data-panel').hidden = !visible;
  el('toggle-flight-data').setAttribute('aria-pressed', String(visible));
  if (visible) {
    el('stall-awareness-panel').hidden = true;
    el('toggle-stall-awareness').setAttribute('aria-pressed', 'false');
    void setMapVisible(false);
    closeViewMenu(); el('flight-data-close').focus({ preventScroll: true });
  } else focusFlight();
}
el('toggle-flight-data').onclick = () => setFlightDataVisible(el('flight-data-panel').hasAttribute('hidden'));
function setStallAwarenessVisible(visible: boolean): void {
  el('stall-awareness-panel').hidden = !visible;
  el('toggle-stall-awareness').setAttribute('aria-pressed', String(visible));
  if (visible) {
    el('flight-data-panel').hidden = true;
    el('toggle-flight-data').setAttribute('aria-pressed', 'false');
    void setMapVisible(false);
    closeViewMenu(); el('stall-awareness-close').focus({ preventScroll: true });
  } else focusFlight();
}
el('toggle-stall-awareness').onclick = () => setStallAwarenessVisible(el('stall-awareness-panel').hasAttribute('hidden'));

el('toggle-map').onclick = () => {
  setFlightDataVisible(false); void setMapVisible(!mapVisible); closeViewMenu(); focusFlight();
};
function flightMapShortcut(event: KeyboardEvent): void {
  if (!['KeyM', 'Comma', 'Slash'].includes(event.code) || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
    || editing(event.target) || menuOpen() || document.querySelector('dialog[open]')) return;
  if (event.code === 'Slash' && event.key !== '/') return;
  if (event.code === 'Comma') {
    if (mapVisible && practiceMap) { event.preventDefault(); event.stopPropagation(); practiceMap.toggleOverlap(); }
    return;
  }
  event.preventDefault(); event.stopPropagation();
  el<HTMLButtonElement>(event.code === 'Slash' ? 'toggle-map-terrain' : 'toggle-map').click();
}
document.addEventListener('keydown', flightMapShortcut, true);
function cycleLandmarks(): void {
  landmarkLevel = (landmarkLevel + 1) % LANDMARK_LEVEL_NAMES.length as LandmarkLevel;
  el('cycle-landmarks').firstChild!.textContent = `Landmarks: ${LANDMARK_LEVEL_NAMES[landmarkLevel]} `;
  scene?.setLandmarkLevel?.(landmarkLevel);
}
el('cycle-landmarks').onclick = () => { cycleLandmarks(); closeViewMenu(); focusFlight(); };
function landmarkShortcut(event: KeyboardEvent): void {
  if (event.code !== 'Period' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
    || editing(event.target) || menuOpen() || document.querySelector('dialog[open]')) return;
  event.preventDefault(); event.stopPropagation(); cycleLandmarks();
}
document.addEventListener('keydown', landmarkShortcut, true);


function mapUnavailable() {
  practiceMap?.dispose(); practiceMap = null;
  el('practice-map-panel').textContent = 'Practice map unavailable. Close and reopen to retry; flight controls still work.';
}
async function setMapVisible(visible: boolean) {
  if (visible !== mapVisible) neutralize();
  mapVisible = visible;
  document.querySelector<HTMLElement>('.flight-app')!.dataset.flightMap = String(visible);
  if (visible) {
    el('flight-data-panel').hidden = el('stall-awareness-panel').hidden = true;
    el('toggle-flight-data').setAttribute('aria-pressed', 'false');
    el('toggle-stall-awareness').setAttribute('aria-pressed', 'false');
  }
  const panel = el('practice-map-panel');
  panel.hidden = !visible;
  el('toggle-map').setAttribute('aria-pressed', String(visible));
  if (practiceMap) { try { practiceMap.setVisible(visible); } catch { mapUnavailable(); } lastMapUpdate_ms = -Infinity; return; }
  if (!visible || mapLoading || mapDisposed) return;
  mapLoading = true; panel.textContent = 'Loading practice map…';
  try {
    const { createPracticeMap } = await import('./practice-map');
    if (mapDisposed) return;
    const created = await createPracticeMap({
      container: panel,
      onClose: () => { void setMapVisible(false); focusFlight(); },
      onInteraction: neutralize,
      onVectorChange: setTerrainMode,
      onStartRunway(id) {
        const runway = EDFE_RUNWAYS.find(r => r.id === id); if (!runway || reviewing) return;
        pauseFlight(); airborneSite = 'edfe';
        const start = airportOffset(runway, Math.sin(runway.heading_true_rad) * 20, Math.cos(runway.heading_true_rad) * 20);
        reset(null, { airport: 'EDFE', runway: id, ...start, heading_rad: runway.heading_true_rad });
        exerciseActive = true; startWhenReady = true;
      },
      onStopExercise() { pauseFlight(); exerciseActive = false; notice('Exercise stopped. Review remains available; Start at runway begins a new flight.'); },
      isExerciseActive: () => exerciseActive,
      getRunwayPractice() {
        const trace = reviewing ? recordedTrace() : flightTrace;
        const runway = trace.getContext()?.runway;
        if (!runway) return null;
        if (!reviewing) return { runway, progress: runwayPractice.snapshot() };
        const count = trace.bounds()?.count ?? 0;
        if (!practiceReviewCache || practiceReviewCache.trace !== trace || practiceReviewCache.time !== reviewTime_s || practiceReviewCache.count !== count) {
          const monitor = createRunwayPracticeMonitor();
          for (const state of trace.recordedStates()) {
            if (state.t_s > reviewTime_s) break;
            monitor.update(state);
          }
          practiceReviewCache = { trace, time: reviewTime_s, count, progress: monitor.snapshot() };
        }
        return { runway, progress: practiceReviewCache.progress };
      },
      onTuneNav(receiver, channel) {
        if (!controlsAvailable()) return;
        const config = tuneStandby(radioPanel.snapshot(), 'nav', channel, receiver);
        radioPanel.setConfiguration(config); session.setNavigation(config);
        if (latest) latest = { ...latest, ...config };
      },
      canTuneCom: controlsAvailable,
      onTuneCom(receiver, channel) {
        if (!controlsAvailable()) return;
        const config = tuneStandby(radioPanel.snapshot(), 'com', channel, receiver);
        radioPanel.setConfiguration(config); session.setNavigation(config);
        if (latest) latest = { ...latest, ...config };
      },
    });
    if (mapDisposed) { created.dispose(); return; }
    practiceMap = created; created.setVector(!!controlSettings.vectorScenery); created.setVisible(mapVisible); lastMapUpdate_ms = -Infinity;
  } catch {
    if (!mapDisposed) panel.textContent = 'Practice map unavailable. Close and reopen to retry; flight controls still work.';
  } finally { mapLoading = false; }
}


const reviewControls = createFlightReviewControls({
  buttonContainer: el('review-button-slot'),
  barContainer: document.querySelector<HTMLElement>('.flight-app')!,
  fileContainer: el('flight-menu').querySelector<HTMLElement>('nav')!,
  onEnter: enterReview,
  onExit: exitReview,
  onContinue: continueLiveFromReview,
  onSave: () => recordedTrace().exportJSON(),
  async onLoad(text) {
    if (continuingReplay) throw new Error('Wait for the selected flight to finish loading.');
    const version = ++recordingLoadVersion;
    if (!ready || failed || sceneFailed) throw new Error('Wait for the flight to be ready before loading a recording.');
    const recording = FlightTrace.fromJSON(text);
    await scene?.prepareRecording?.(recording.recordedStates());
    if (mapDisposed || version !== recordingLoadVersion) return;
    if (!ready || failed || sceneFailed) throw new Error('The live flight is unavailable. Please restart before loading a recording.');
    loadedTrace = recording;
    if (!reviewing) enterReview();
    else { reviewPlaying = false; reviewTime_s = recording.bounds()!.start_s; reviewWarningMonitor.reset(); }
    lastMapUpdate_ms = -Infinity; updateReviewControls(); closeViewMenu(); focusFlight();
    notice(`Loaded recording · replay only${recording.getContext() ? ' · runway context declared by recording' : ' · runway context unknown'}. Back to live returns to your current flight.`);
  },
  onFileError: message => notice(`Recording: ${message}`),
  onSeek(time_s) {
    const selected_s = snapReviewTime(time_s, recordedTrace().bounds());
    if (!reviewing || continuingReplay || selected_s === null) return;
    reviewPlaying = false; engineAudio.update(null, false); reviewTime_s = selected_s;
    lastMapUpdate_ms = -Infinity;
    updateReviewControls();
  },
  onTogglePlay: toggleReviewPlayback,
  onCycleRate() { flightAssists.cycleRate(); },
});
function updateReviewControls() {
  const bounds = recordedTrace().bounds();
  const selected = reviewing ? recordedTrace().atTime(reviewTime_s) : null;
  reviewControls.update({
    available: !!bounds && bounds.count >= 2 && ready && !failed && !sceneFailed,
    active: reviewing, playing: reviewPlaying, playbackRate: reviewRate,
    start_s: bounds?.start_s ?? 0, end_s: bounds?.end_s ?? 0,
    current_s: reviewing ? reviewTime_s : (bounds?.end_s ?? 0), clipped: bounds?.clipped ?? false,
    continuing: continuingReplay, continuationUnavailable: selected ? resumeProblem(selected.state) : 'Select a recorded frame.',
    continuationNote: selected && selected.state.mass_total_kg === undefined ? 'Uses the original model loading.' : undefined,
  });
}
function enterReview() {
  const bounds = recordedTrace().bounds();
  if (reviewing || !bounds || bounds.count < 2 || !ready || failed || sceneFailed) return;
  pointerYoke?.cancel();
  reviewWarningMonitor.reset();
  resumeAfterReview = running;
  // Release the live yoke/CWS before Review disables live input publication.
  neutralize();
  reviewing = true; reviewTime_s = bounds.start_s; lastMapUpdate_ms = -Infinity;
  pauseFlight(); el('status').textContent = 'Review'; focusFlight();
}
function exitReview() {
  if (!reviewing || continuingReplay) return;
  recordingLoadVersion++;
  engineAudio.update(null, false);
  reviewing = reviewPlaying = false; lastMapUpdate_ms = -Infinity;
  loadedTrace = null;
  reviewWarningMonitor.reset();
  el('status').textContent = liveStatus;
  neutralize(); updateSessionUI();
  el<HTMLInputElement>('throttle').value = String(throttle * 100); el('throttle').dataset.unavailable = 'false';
  enginePanel.update(latest, false, controlsAvailable(), { mixture_norm: mixtureCommand, mixture_auto: mixtureAutomatic,
    ...(engineCommand === null ? {} : { engine_running: engineCommand }) });
  pitchTrimControl.update(latest, false, controlsAvailable(), pitchTrimTarget);
  updateConfiguration(latest, false);
  focusFlight();
  const resume = resumeAfterReview; resumeAfterReview = false;
  if (resume && !document.hidden) startFlight();
}
async function continueLiveFromReview() {
  if (!reviewing || continuingReplay || !ready || failed || sceneFailed) return;
  const source = recordedTrace(), selected = source.atTime(reviewTime_s);
  if (!selected || resumeProblem(selected.state)) return;
  continuingReplay = true; recordingLoadVersion++; reviewPlaying = false; updateReviewControls();
  try {
    const actual = await session.restoreFromReview(selected.state);
    if (mapDisposed) return;
    const initial: FlightState = { ...selected.state, ...actual };
    const restoredLoading = loadingFromState(initial);
    if (restoredLoading) loadingPanel.setConfiguration(restoredLoading);
    flightTrace = source.prefixBefore(selected.state.t_s);
    loadedTrace = null; recordingLoadVersion++; resumeAfterReview = false;
    flightTrace.record(initial, selected.vertical_speed_mps);
    previous = null; latest = initial; verticalSpeedFpm = selected.vertical_speed_mps * 60 / .3048;
    keys.clear(); keyboardControls.clear(); pointerControls.clear(); pointerYoke?.cancel();
    stickX = stickY = 0; cwsHeld = apDisconnectPending = false;
    continuedAxes = { elevator: initial.elevator_cmd_norm!, aileron: initial.aileron_cmd_norm!,
      rudder: initial.rudder_cmd_norm!, brake_norm: Math.max(initial.brake_left_norm!, initial.brake_right_norm!) };
    throttle = initial.throttle_norm!; flapTarget_deg = initial.flap_command_norm! * 30;
    pitchTrimTarget = initial.pitch_trim_norm!; mixtureCommand = initial.mixture_norm!;
    mixtureAutomatic = initial.mixture_auto === 1; engineCommand = initial.engine_command_on === 1;
    parkingBrake = false; restoredFlightLocationActive = false; landingPreset = undefined; airborneSite = 'edfe';
    const context = source.getContext(), runway = context && EDFE_RUNWAYS.find(item => item.id === context.runway);
    runwayStart = runway ? { airport: 'EDFE', runway: runway.id, lat_rad: runway.lat_rad,
      lon_rad: runway.lon_rad, heading_rad: runway.heading_true_rad } : null;
    exerciseActive = !!context; runwayPractice.reset();
    if (runwayStart) for (const frame of flightTrace.recordedStates()) runwayPractice.update(frame);
    practiceReviewCache = null; lastMapUpdate_ms = -Infinity; collisionUnavailableNoticed = false;
    liveWarningMonitor.reset(); reviewWarningMonitor.reset(); liveWarnings = liveWarningMonitor.update(initial);
    if (initial.systems_switch_mask !== undefined) systemsPanel.restore(initial.systems_switch_mask);
    else systemsPanel.reset();
    reviewing = false; ready = true; failed = false;
    radioPanel.update(initial, false, true, false);
    const radios = { ...radioPanel.snapshot() };
    for (const key of Object.keys(radios) as (keyof typeof radios)[]) {
      const value = initial[key]; if (value !== undefined) radios[key] = value;
    }
    radioPanel.setConfiguration(radios);
    flightLocationStore.clear(); flightLocationStore.observe(initial);
    document.querySelector('.location strong')!.textContent = 'CONTINUED FLIGHT';
    document.querySelector('.location span')!.textContent = `From recording · ${initial.t_s.toFixed(1)} s`;
    el<HTMLInputElement>('throttle').value = String(throttle * 100);
    pressureAltimeter.update(initial, false); updateConfiguration(initial, false);
    hasFlown = true; startWhenReady = false;
    running = !document.hidden && document.hasFocus();
    if (running) session.start();
    el('status').textContent = running ? 'Flying' : 'Paused';
    notice(`Continuing from ${initial.t_s.toFixed(1)} s${running ? '.' : ' · paused.'}`);
    updateSessionUI(); focusFlight();
  } catch (error) {
    if (!mapDisposed) notice(`Could not continue: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    continuingReplay = false;
    if (!mapDisposed) updateReviewControls();
  }
}
function toggleReviewPlayback() {
  if (continuingReplay) return;
  const bounds = recordedTrace().bounds();
  if (!reviewing || !bounds) return;
  if (!reviewPlaying && reviewTime_s >= bounds.end_s) reviewTime_s = bounds.start_s;
  reviewPlaying = !reviewPlaying;
  if (!reviewPlaying) engineAudio.update(null, false);
  updateReviewControls();
}

// Capture before range/map/menu widgets consume arrow keys. No live inputs change.
function reviewSeekShortcut(event: KeyboardEvent): void {
  if (!reviewing || event.ctrlKey || event.metaKey || event.altKey) return;
  const action = reviewKeyAction(event.code, { editing: false, timeline: false, nativeButton: false }, event.repeat);
  if (action !== 'seek-back' && action !== 'seek-forward') return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (continuingReplay) return;
  const selected = snapReviewTime(reviewTime_s + (action === 'seek-back' ? -1 : 1), recordedTrace().bounds());
  if (selected === null) return;
  reviewTime_s = selected;
  lastMapUpdate_ms = -Infinity;
  updateReviewControls();
}
document.addEventListener('keydown', reviewSeekShortcut, true);


function held(code: string) { return keys.has(code) || keyboardControls.has(code) || [...pointerControls.values()].includes(code); }
function publishInput() {
  if (reviewing || mapDisposed || groundCollisionStopped()) return;
  const raw: Controls = {
    // Sign conventions (positive rudder = left yaw) are documented in pilot-controls.ts.
    ...pilotAxes(held, stickX, stickY), throttle,
    flap_norm: flapTarget_deg / 30, brake_norm: held('KeyB') ? 1 : 0,
    mixture_norm: mixtureCommand, mixture_auto: mixtureAutomatic,
    ...(engineCommand === null ? {} : { engine_running: engineCommand }),
    ...(pitchTrimTarget !== null ? { pitch_trim_norm: pitchTrimTarget } : {}),
  };
  if (latest?.ap_mode && !cwsHeld && latest.kap_cws !== 1 && !apDisconnectPending && (raw.elevator !== 0 || raw.aileron !== 0 || raw.rudder !== 0)) {
    apDisconnectPending = true; session.setKap140({action: 'disconnect'});
  }
  raw.pilot_override = raw.elevator !== 0 || raw.aileron !== 0 || raw.rudder !== 0;
  const controls = applyControlSettings(raw, controlSettings, latest?.ap_mode ? 0 : rollOffset, parkingBrake);
  if (continuedAxes) {
    Object.assign(controls, continuedAxes);
    controls.brake_norm = Math.max(continuedAxes.brake_norm ?? 0, parkingBrake ? 1 : 0);
    controls.pilot_override = false;
  }
  const direction = rollOffset < 0 ? 'left' : rollOffset > 0 ? 'right' : 'off';
  el('offset-value').textContent = `${Math.abs(rollOffset * 100).toFixed(1)}% ${direction}${latest?.ap_mode ? ' · suspended by AP' : ''}`;
  session.input(controls);
  renderParkingBrake(latest, false);
  el('roll-control').textContent = controls.aileron.toFixed(2);
  el('pitch-control').textContent = controls.elevator.toFixed(2);
  el('rudder-control').textContent = controls.rudder.toFixed(2);
  el('power').textContent = `${Math.round(throttle * 100)}%`;
  el('joystick-knob').hidden = false; el('joystick').dataset.unavailable = 'false';
  el('joystick-knob').style.transform = `translate(${stickX * 46}px, ${-stickY * 46}px)`;
  document.querySelectorAll<HTMLElement>('[data-code]').forEach(button => button.classList.toggle('held', held(button.dataset.code!)));
}
function neutralize() {
  continuedAxes = null;
  if (latest?.kap_profile === 1) session.setKap140({action:'vertical', value:0});
  if (failed || sceneFailed || groundCollisionStopped()) pointerYoke?.cancel();
  else if (!reviewing) pointerYoke?.neutralize();
  keys.clear(); pointerControls.clear(); keyboardControls.clear(); stickX = stickY = 0;
  if (stickPointer !== null) {
    const pointer = stickPointer; stickPointer = null;
    if (el('joystick').hasPointerCapture(pointer)) el('joystick').releasePointerCapture(pointer);
  }
  publishInput();
  if (cwsHeld) { cwsHeld = false; session.setKap140({action: 'cws', value: 0}); }
}
function pauseFlight() {
  if (mapDisposed) return;
  reviewPlaying = false; engineAudio.update(null, false);
  startWhenReady = false; neutralize(); running = false; session.pause(); updateSessionUI();
}
function startFlight() {
  if (!ready || failed || sceneFailed || !scene || reviewing || groundCollisionStopped()) return;
  if (el('notice').textContent?.startsWith('Exercise stopped.')) notice('');
  neutralize(); running = true; hasFlown = true; session.start(); updateSessionUI(); focusFlight();
}
function togglePause() { if (running) pauseFlight(); else startFlight(); }
function reset(preset: LandingPreset | null | undefined = landingPreset, start: RunwayStart | null = runwayStart, location?: FlightLocation) {
  autopilotCapturePending = false; startupPreloadPending = false;
  closeViewMenu();
  if (reviewing) return;
  flightLocationStore.clear(); restoredFlightLocationActive = false;
  runwayStart = start; practiceInitialLocation = location;
  runwayPractice.reset(); practiceReviewCache = null;
  if (sceneFailed) { notice('The 3D scene is unavailable. Reload with WebGL enabled.'); return; }
  landingPreset = preset ?? undefined;
  flightAssists.reset();
  liveWarningMonitor.reset(); reviewWarningMonitor.reset(); liveWarnings = unavailableWarnings;
  flightWarningsPanel.update(unavailableWarnings, false);
  regionalTiles.clear(); terrainLoading=false; scene?.setTerrainTiles?.([]);
  document.querySelector('.location strong')!.textContent = ['darmstadt','odenwald','spessart','westerwald','marburg','kassel'].includes(airborneSite) ? airborneSite.toUpperCase() : airborneSite === 'eddf-ils' ? 'FRANKFURT 25C' : airborneSite === 'taunus' ? 'TAUNUS' : 'EGELSBACH';
  document.querySelector('.location span')!.textContent = runwayStart ? `C172 research aircraft · ${runwayStart.airport} runway ${runwayStart.runway}` : 'C172 research aircraft · airborne practice';
  collisionUnavailableNoticed = false;
  systemsPanel.reset(); radioPanel.reset();
  recordingLoadVersion++; loadedTrace = null; resumeAfterReview = false;
  const runway = runwayStart?.runway;
  flightTrace.clear(runwayStart?.airport === 'EDFE' && (runway === '08' || runway === '26')
    ? { kind: 'runway-practice', version: 1, airport: 'EDFE', runway } : undefined);
  parkingBrake = false; pitchTrimTarget = null; flapTarget_deg = 0; mixtureCommand = 1; mixtureAutomatic = true; engineCommand = null; apDisconnectPending = false;
  if (practiceMap && latest) { try { practiceMap.update(latest, [], 'live'); } catch { mapUnavailable(); } }
  lastMapUpdate_ms = -Infinity;
  pressureAltimeter.update(null, false);
  startWhenReady = running; running = false; ready = false; failed = false;
  engineAudio.update(null, false);
  pointerYoke?.reset(); neutralize(); session.pause(); latest = previous = null; verticalSpeedFpm = 0;
  pitchTrimControl.update(null, false, false, null);
  flightData.update(null, false); stallAwareness.update(null, false); groundCollisionPanel.update(null, false, false);
  enginePanel.update(null, false, false); autopilotPanel.update(null, false, false);
  radioPanel.update(null, false, false); navigationGauges.update(null, false, false); landingFeedback.update(null, false);
  updateConfiguration(null, false);
  engineNavdata = { settled: false, sha256: null, error: null }; applyNavdataCheck();
  notice(''); session.reset(landingPreset, airborneSite, runwayStart ?? undefined, location); updateSessionUI(); focusFlight();
}
function setView(next: typeof view) {
  closeViewMenu(); view = next;
  for (const name of ['cockpit', 'chase']) { el(name).classList.toggle('selected', name === view); el(name).setAttribute('aria-pressed', String(name === view)); }
  el('view-label').textContent = `${view.toUpperCase()} VIEW`;
}
async function launchPractice(kind: 'takeoff' | 'landing' | 'circuit'): Promise<void> {
  if (!ready || reviewing || practiceLaunchPending) return;
  const runway = EDFE_RUNWAYS.find(r => r.id === el<HTMLSelectElement>('practice-runway').value)!;
  practiceLaunchPending = true; pauseFlight(); closeViewMenu();
  try {
    airborneSite = 'edfe';
    if (kind === 'landing') {
      const ground = sampleTerrain(await loadTerrainPackage(), runway.lat_rad, runway.lon_rad);
      if (!ground) throw new Error('The selected runway terrain is unavailable.');
      const distance = 3 * 1852;
      const point = airportOffset(runway, -Math.sin(runway.heading_true_rad) * distance, -Math.cos(runway.heading_true_rad) * distance);
      reset(null, null, { version: 1, ...point, alt_msl_m: ground.physical_m + Math.tan(3 * Math.PI / 180) * distance,
        heading_rad: runway.heading_true_rad, mode: 'airborne' });
      exerciseActive = false;
    } else {
      const point = airportOffset(runway, Math.sin(runway.heading_true_rad) * 20, Math.cos(runway.heading_true_rad) * 20);
      reset(null, { airport: 'EDFE', runway: runway.id, ...point, heading_rad: runway.heading_true_rad });
      exerciseActive = true;
    }
    startWhenReady = true;
    if (kind === 'circuit') { await setMapVisible(true); practiceMap?.setCircuitGuide(true); }
  } catch (error) { notice(`Cannot start practice: ${error instanceof Error ? error.message : String(error)}`); }
  finally { practiceLaunchPending = false; updateSessionUI(); }
}
for (const [id, kind] of [['practice-takeoff', 'takeoff'], ['practice-landing', 'landing'], ['practice-circuit', 'circuit']] as const)
  el(id).onclick = () => { void launchPractice(kind); };
el('start').onclick = startFlight;
el('pause').onclick = () => { togglePause(); focusFlight(); };
el('reset').onclick = () => reset(landingPreset, runwayStart, practiceInitialLocation);
document.querySelectorAll<HTMLButtonElement>('[data-landing]').forEach(button => {
  button.onclick = () => { if (!reviewing) { runwayStart = null; exerciseActive = false; airborneSite = 'edfe'; reset(button.dataset.landing as LandingPreset); } };
});
el('airborne-practice').onclick = () => { if (reviewing) return; runwayStart = null; exerciseActive = false; airborneSite = 'edfe'; landingPreset = undefined; reset(); };
el('eddf-ils-practice').onclick = () => { if (!reviewing && getNavigationCatalogue()) { runwayStart = null; exerciseActive = false; airborneSite = 'eddf-ils'; landingPreset = undefined; reset(); } };
document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button => { button.onclick=()=>{if(!reviewing){runwayStart=null;exerciseActive=false;airborneSite=button.dataset.region as AirborneSite;landingPreset=undefined;reset();}}; });
el('taunus-practice').onclick = () => { if (reviewing) return; runwayStart = null; exerciseActive = false; airborneSite = 'taunus'; landingPreset = undefined; reset(); };

el('cockpit').onclick = () => { setView('cockpit'); focusFlight(); };
el('chase').onclick = () => { setView('chase'); focusFlight(); };
el<HTMLInputElement>('throttle').oninput = event => { if (!controlsAvailable()) return; throttle = Number((event.target as HTMLInputElement).value) / 100; publishInput(); };
el<HTMLInputElement>('roll-offset').oninput = event => {
  rollOffset = Number((event.target as HTMLInputElement).value);
  el('offset-value').textContent = rollOffset.toFixed(3); publishInput();
};
for (const [id, value] of [['roll-correction-off', 0], ['roll-correction-default', -0.109375]] as const) {
  el(id).onclick = () => { rollOffset = value; el<HTMLInputElement>('roll-offset').value = String(value); publishInput(); focusFlight(); };
}

el('limits').onclick = () => {
  const expanded = el('limitations').hidden;
  el('limitations').hidden = !expanded; el('limits').setAttribute('aria-expanded', String(expanded));
};

// Pointer capture keeps a drag usable when it crosses the pad edge. Release,
// cancellation, lost capture and focus loss all clear user axes immediately.
function updateConfiguration(state: Readonly<FlightState> | null, recorded: boolean): void {
  renderParkingBrake(state, recorded);
  const available = state?.flap_rad !== undefined && state.brake_left_norm !== undefined;
  const capturedBrake = Number.isFinite(state?.brake_left_norm) && Number.isFinite(state?.brake_right_norm)
    ? Math.max(state!.brake_left_norm!, state!.brake_right_norm!) : null;
  const brakePercent = recorded ? capturedBrake === null ? null : Math.round(capturedBrake * 100) : Math.round((controlSettings.brake ?? .25) * 100);
  el('wheel-brakes').firstChild!.textContent = `WHEEL ${brakePercent === null ? '—' : `${brakePercent}%`} `;
  el('wheel-brakes').setAttribute('aria-label', recorded ? brakePercent === null ? 'Recorded wheel brakes unavailable' : `Recorded wheel brakes, ${brakePercent} percent command` : `Hold wheel brakes, ${brakePercent} percent command; adjustable in Options`);
  const flapLever = el<HTMLInputElement>('flap-control');
  flapLever.disabled = !available || !controlsAvailable() || recorded;
  for (const id of ['flaps-retract', 'flaps-extend']) el<HTMLButtonElement>(id).disabled = flapLever.disabled;
  const selected = recorded || groundCollisionStopped() ? state?.flap_command_norm === undefined ? null : state.flap_command_norm * 30 : flapTarget_deg;
  flapLever.dataset.unavailable = String(selected === null);
  if (selected !== null) flapLever.value = String(selected);
  flapLever.setAttribute('aria-valuetext', selected === null ? 'Recorded lever position unavailable' : `${Math.round(selected)} degrees selected`);
  el<HTMLButtonElement>('wheel-brakes').disabled = !available || !controlsAvailable() || recorded;
  el('flaps-actual').textContent = available ? `${(state!.flap_rad! * 180 / Math.PI).toFixed(0)}°${recorded ? ' · recorded' : ' actual'}` : 'Rebuild engine';
  el('brake-state').textContent = !available ? 'Wheel brakes unavailable' : recorded
    ? `Recorded wheel brakes: ${Math.round(Math.max(state!.brake_left_norm!, state!.brake_right_norm!) * 100)}%`
    : `${state!.on_ground ? 'Ground contact' : 'Airborne · ground braking only'} · applied ${Math.round(Math.max(state!.brake_left_norm!, state!.brake_right_norm!) * 100)}%`;
}
/** Render only captured values; never copy review values into pending live controls. */
function updateRecordedControls(state: Readonly<FlightState>): void {
  const value = (number: number | undefined, unit = '', scale = 1) => number !== undefined && Number.isFinite(number)
    ? `${(number * scale).toFixed(1)}${unit}` : '—';
  const recordedView = recordedControlView(state);
  const throttleInput = el<HTMLInputElement>('throttle');
  // Missing recorded positions are marked unavailable; the CSS hides the thumb/knob.
  throttleInput.dataset.unavailable = String(recordedView.throttle_percent === null);
  if (recordedView.throttle_percent !== null) throttleInput.value = String(recordedView.throttle_percent);
  throttleInput.setAttribute('aria-valuetext', recordedView.throttle_percent === null ? 'Recorded throttle unavailable' : `${Math.round(recordedView.throttle_percent)} percent recorded`);
  el('power').textContent = recordedView.throttle_percent === null ? 'NO DATA' : `${Math.round(recordedView.throttle_percent)}%`;
  for (const [id, number] of [['roll-control', state.aileron_cmd_norm], ['pitch-control', state.elevator_cmd_norm], ['rudder-control', state.rudder_cmd_norm]] as const) {
    el(id).textContent = number !== undefined && Number.isFinite(number) ? number.toFixed(2) : '—';
  }
  for (const [id, number] of [['recorded-left-aileron', state.aileron_rad], ['recorded-right-aileron', state.right_aileron_rad],
    ['recorded-elevator', state.elevator_rad], ['recorded-rudder', state.rudder_rad]] as const) el(id).textContent = value(number, '°', 180 / Math.PI);
  el('recorded-left-brake').textContent = value(state.brake_left_norm, '%', 100);
  el('recorded-right-brake').textContent = value(state.brake_right_norm, '%', 100);
  el('recorded-flap-command').textContent = value(state.flap_command_norm, '°', 30);
  el('recorded-flap-actual').textContent = value(state.flap_rad, '°', 180 / Math.PI);
  el('recorded-trim').textContent = value(state.pitch_trim_norm, '%', 100);
  el('recorded-throttle').textContent = value(state.throttle_norm, '%', 100);
  el('recorded-mixture').textContent = value(state.mixture_norm, '%', 100);
  el('recorded-mixture-mode').textContent = state.mixture_auto === 1 ? 'AUTO' : state.mixture_auto === 0 ? 'MANUAL' : '—';
  el('recorded-engine').textContent = state.engine_running === 1 ? 'RUN' : state.engine_running === 0 ? 'STOP' : '—';
  const knob = el('joystick-knob');
  knob.hidden = recordedView.stick === null;
  el('joystick').dataset.unavailable = String(recordedView.stick === null);
  if (recordedView.stick) knob.style.transform = `translate(${recordedView.stick.x * 46}px, ${-recordedView.stick.y * 46}px)`;
  const active = recordedHeldKeys(state);
  document.querySelectorAll<HTMLElement>('[data-code]').forEach(button => button.classList.toggle('held', active[button.dataset.code!] === true));
}
function setFlaps(degrees: number) {
  if (!controlsAvailable() || latest?.flap_rad === undefined) return;
  flapTarget_deg = clamp(Math.round(degrees / 10) * 10, 0, 30); publishInput();
}
el<HTMLInputElement>('flap-control').oninput = event => setFlaps((event.target as HTMLInputElement).valueAsNumber);
el('flaps-retract').onclick = () => { setFlaps(flapTarget_deg - 10); focusFlight(); };
el('flaps-extend').onclick = () => { setFlaps(flapTarget_deg + 10); focusFlight(); };
function updatePointerHint(mode = sceneContainer.dataset.pointerMode ?? 'off'): void {
  const centered = controlSettings.centeredTouchpad === true;
  el('pointer-mode').textContent = groundCollisionStopped() && !reviewing ? 'COLLISION VIEW · hold-drag to inspect'
    : reviewing ? (mode === 'look' ? 'REVIEW LOOK · release to keep view' : 'REVIEW · hold-drag: look · double-click: front')
    : (autopilotCapturePending || latest?.kap_engaged) && !cwsHeld ? 'AUTOPILOT · P disconnects · CWS to hand-fly'
    : mode === 'look' ? 'LOOKING · release keeps view · double-click: front'
    : centered ? (mode === 'yoke' ? 'CENTERED YOKE · click off · hold-drag to look' : 'CENTERED YOKE · click on · hold-drag to look')
    : mode === 'yoke' ? 'YOKE ACTIVE · hold-drag: look · double-click: front' : 'Click: yoke · hold-drag: look · double-click: front';
}
pointerYoke = createPointerYoke({
  element: sceneContainer,
  lookOnly: () => reviewing || groundCollisionStopped(),
  centered: () => controlSettings.centeredTouchpad === true,
  enabled: () => (controlsAvailable() || reviewing || groundCollisionStopped()) && !menuOpen() && !controlSettingsPanel.isOpen() && !document.querySelector('dialog[open]'),
  onYoke(x, y) {
    // The pointer also travels to cockpit buttons. That is not a request to
    // override AP; keyboard/stick input and held CWS remain deliberate controls.
    if ((autopilotCapturePending || latest?.kap_engaged) && !cwsHeld) return;
    continuedAxes = null; stickX = x; stickY = y; publishInput();
  },
  onLook(yaw_rad, pitch_rad) { cameraLook = { yaw_rad, pitch_rad }; },
  onMode(mode) {
    updatePointerHint(mode);
    sceneContainer.dataset.pointerMode = mode;
  },
});

const joystick = el('joystick');
function moveStick(event: PointerEvent) {
  const rect = joystick.getBoundingClientRect();
  let x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.32);
  let y = (rect.top + rect.height / 2 - event.clientY) / (rect.height * 0.32);
  const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
  continuedAxes = null; stickX = x; stickY = y; publishInput();
}
joystick.addEventListener('pointerdown', event => {
  if (!controlsAvailable() || stickPointer !== null) return;
  event.preventDefault(); focusFlight(); stickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId); moveStick(event);
});
joystick.addEventListener('pointermove', event => { if (event.pointerId === stickPointer && controlsAvailable()) moveStick(event); });
function releaseStick(event: PointerEvent) {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null; stickX = stickY = 0;
  if (joystick.hasPointerCapture(event.pointerId)) joystick.releasePointerCapture(event.pointerId);
  publishInput();
}
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(name, event => releaseStick(event as PointerEvent));

for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-code]'))) {
  const code = button.dataset.code!;
  button.addEventListener('pointerdown', event => {
    if (!controlsAvailable()) return;
    event.preventDefault(); focusFlight(); button.setPointerCapture(event.pointerId);
    continuedAxes = null; pointerControls.set(event.pointerId, code); publishInput();
  });
  const release = (event: PointerEvent) => {
    if (pointerControls.delete(event.pointerId)) publishInput();
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => release(event as PointerEvent));
  button.addEventListener('keydown', event => {
    if (controlsAvailable() && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); event.stopPropagation(); continuedAxes = null; keyboardControls.add(code); publishInput(); }
  });
  button.addEventListener('keyup', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); event.stopPropagation(); keyboardControls.delete(code); publishInput(); }
  });
  button.addEventListener('blur', () => { if (keyboardControls.delete(code)) publishInput(); });
}

addEventListener('keydown', event => {
  if ((event.target instanceof Element && event.target.closest('.practice-map-panel')) || document.querySelector('dialog[open]') || menuOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'KeyR' && !reviewing) {
    if (!editing(event.target)) { event.preventDefault(); if (!event.repeat) enterReview(); }
    return;
  }
  if (reviewing) {
    // Routing is unit tested in review-transport.test.ts; flight keys never reach live controls.
    const action = reviewKeyAction(event.code, {
      editing: editing(event.target),
      timeline: event.target instanceof HTMLElement && event.target.id === 'review-time',
      nativeButton: event.target instanceof HTMLElement && !!event.target.closest('button,a,summary'),
    }, event.repeat);
    if (action !== 'ignore') event.preventDefault();
    if (action === 'exit') exitReview();
    else if (action === 'toggle-play') toggleReviewPlayback();
    else if (action === 'toggle-view') setView(view === 'cockpit' ? 'chase' : 'cockpit');
    return;
  }
  if (editing(event.target)) return;
  if (event.code === 'Space' && event.target instanceof HTMLElement && event.target.closest('button,a,summary')) return;
  if (flightKeys.has(event.code)) {
    event.preventDefault(); if (controlsAvailable()) { continuedAxes = null; keys.add(event.code); publishInput(); }
  }
  if (event.repeat) return;
  if (controlsAvailable() && /^(Digit|Numpad)[0-9]$/.test(event.code)) {
    event.preventDefault(); throttle = Number(event.code.at(-1)) / 10;
    el<HTMLInputElement>('throttle').value = String(throttle * 100); publishInput();
  }
  if (event.code === 'KeyP' && controlsAvailable() && latest?.ap_mode !== undefined) {
    event.preventDefault(); session.setKap140({action: latest.kap_engaged ? 'disconnect' : 'ap'});
  }
  if (['BracketLeft', 'BracketRight'].includes(event.code) && controlsAvailable() && latest?.flap_rad !== undefined) {
    event.preventDefault(); flapTarget_deg = clamp(flapTarget_deg + (event.code === 'BracketLeft' ? -10 : 10), 0, 30); publishInput();
  }
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
  if (event.code === 'KeyV') setView(view === 'cockpit' ? 'chase' : 'cockpit');
});
addEventListener('keyup', event => { if (keys.delete(event.code)) { event.preventDefault(); publishInput(); } });
addEventListener('blur', pauseFlight);
addEventListener('focusin', event => { if (editing(event.target) && !reviewing) neutralize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFlight(); });

const overlayPresentation = createOverlayPresentation({root, title:document.querySelector<HTMLElement>('.topbar')!, onActivate:neutralize});
const disposeMenuShortcuts=installMenuShortcuts(root);
const disposeFullscreen = installFullscreenControls({
  button: el<HTMLButtonElement>('toggle-fullscreen'), onError: notice,
  onChange() { closeViewMenu(); if (!document.querySelector('dialog[open]')) focusFlight(); },
});
const flightAssists = createFlightAssists({
  root,
  canCapture: () => controlsAvailable() && latest?.kap_profile === 1,
  isAutopilotEngaged: () => autopilotCapturePending || latest?.kap_engaged === 1,
  canChangeRate: () => !continuingReplay && (reviewing || controlsAvailable()),
  onCapture() {
    const disconnect = autopilotCapturePending || latest?.kap_engaged === 1;
    autopilotCapturePending = !disconnect;
    closeViewMenu(); neutralize();
    if (disconnect) session.setKap140({action: 'disconnect'});
    else if (!session.captureAutopilot()) autopilotCapturePending = false;
    updatePointerHint(); focusFlight();
  },
  onRate(rate) {
    closeViewMenu();
    if (reviewing) { reviewRate = rate; flightAssists.update(reviewRate, true); updateReviewControls(); }
    else session.setSimulationRate(rate);
    focusFlight();
  },
});
sceneContainer.setAttribute('aria-description','I toggles the menu. O opens Options. F toggles full screen. M toggles the flight map. Comma toggles the extended menu below the map. Period cycles terrain labels. Slash switches vector and photo terrain on a US keyboard.');

const sceneReady = createScene(sceneContainer).then(result => {
  scene = result; scene.setLandmarkLevel?.(landmarkLevel); scene.setSceneryMode?.(!!controlSettings.vectorScenery); scene.setPracticePapi?.(!!controlSettings.practicePapi);
  scene.setTerrainTiles?.([...regionalTiles.values()]); session.reset(undefined, undefined, undefined, initialFlightLocation ?? undefined);
}).catch((error: unknown) => {
  sceneFailed = true; running = false; startWhenReady = false;
  notice(`Scene unavailable: ${error instanceof Error ? error.message : String(error)}. Reload with WebGL enabled.`);
  session.pause(); updateSessionUI();
});
let lastFrame = performance.now();
const yokeCenterMarker = el('yoke-center-marker');
function animate(now: number) {
  const yokeCenter = pointerYoke?.getCenter() ?? null;
  yokeCenterMarker.hidden = yokeCenter === null;
  if (yokeCenter) {
    yokeCenterMarker.style.left = `${yokeCenter.clientX}px`;
    yokeCenterMarker.style.top = `${yokeCenter.clientY}px`;
  }
  if (mapDisposed) return;
  const dt = clamp((now - lastFrame) / 1000, 0, 0.1); lastFrame = now;
  if (controlsAvailable() && pitchTrimTarget !== null && latest?.pitch_trim_norm !== undefined && (held('Quote') || held('Backslash'))) {
    // UI repeat speed only; this is not a calibrated aircraft trim-wheel rate.
    pitchTrimTarget = clamp(pitchTrimTarget + ((held('Backslash') ? 1 : 0) - (held('Quote') ? 1 : 0)) * dt * 0.08, -1, 1);
    publishInput();
  }
  if (reviewing && reviewPlaying) {
    const bounds = recordedTrace().bounds();
    if (bounds) {
      reviewTime_s = Math.min(bounds.end_s, reviewTime_s + dt * reviewRate);
      if (reviewTime_s >= bounds.end_s) reviewPlaying = false;
      updateReviewControls();
    }
  }
  const reviewSample = reviewing ? recordedTrace().atTime(reviewTime_s) : null;
  const shownWarnings = ready && !failed && !sceneFailed && !terrainLoading && latest
    ? reviewSample ? reviewWarningMonitor.update(reviewSample.state) : liveWarnings : unavailableWarnings;
  flightWarningsPanel.update(shownWarnings, reviewing);
  if (latest) {
    const state = reviewSample?.state ?? latest;
    flightAssists.update(reviewing ? reviewRate : (state.simulation_rate ?? 1), reviewing);
    const shownVsiFpm = reviewSample ? reviewSample.vertical_speed_mps / 0.3048 * 60 : verticalSpeedFpm;
    if (practiceMap && mapVisible && practiceMapUpdateDue({ reviewing, now_ms: now, lastUpdate_ms: lastMapUpdate_ms, sample: reviewSample, lastSample: lastMapSample })) {
      try {
        practiceMap.update(state, recordedTrace().sampledStates(600), reviewing ? 'review' : 'live');
        lastMapUpdate_ms = now; lastMapSample = reviewSample;
      } catch {
        mapUnavailable();
      }
    }

    if (scene && !sceneFailed) {
      try { scene.update(state, view, { ...cameraLook, fov_rad: cameraFov_rad }); } catch {
        sceneFailed = true; pauseFlight(); notice('The 3D scene stopped rendering. Reload to restart.'); updateSessionUI();
      }
    }
    engineAudio.update(state, ready && !failed && !sceneFailed && !terrainLoading && !document.hidden
      && (reviewing ? reviewPlaying : running), { warnings: shownWarnings, live: !reviewing });
    pressureAltimeter.update(state, reviewing, groundCollisionStopped());
    const sceneryLabel = state.terrain_profile === 1 ? 'Streamed terrain · Westerwald–Lahn–Kassel' : 'Flat-ground contact study · zero-height ellipsoid';
    const scenery = document.querySelector<HTMLElement>('.scenery-label')!;
    if (scenery.textContent !== sceneryLabel) scenery.textContent = sceneryLabel;
    sixPack.update(state, shownVsiFpm, reviewing);
    enginePanel.update(state, reviewing, controlsAvailable(), groundCollisionStopped() ? undefined : { mixture_norm: mixtureCommand, mixture_auto: mixtureAutomatic,
    ...(engineCommand === null ? {} : { engine_running: engineCommand }) }, running);
    autopilotPanel.update(state, reviewing, controlsAvailable(), groundCollisionStopped());
    radioPanel.update(state, reviewing, controlsAvailable(), running);
    systemsPanel.update(state, reviewing, controlsAvailable());
    loadingPanel.update(state, reviewing);
    navigationGauges.update(state, reviewing, controlsAvailable(), running);
    pitchTrimControl.update(state, reviewing, controlsAvailable(), groundCollisionStopped() ? null : pitchTrimTarget);
    updateConfiguration(state, reviewing);
    if (reviewing || groundCollisionStopped()) updateRecordedControls(state);
    else {
      el<HTMLInputElement>('throttle').value = String(throttle * 100);
      el('throttle').dataset.unavailable = 'false';
      el('throttle').setAttribute('aria-valuetext', `${Math.round(throttle * 100)} percent selected`);
      el('power').textContent = `${Math.round(throttle * 100)}%`;
    }
    landingFeedback.update(state, reviewing);
    flightData.update(state, reviewing);
    stallAwareness.update(state, reviewing);
    groundCollisionPanel.update(state, reviewing, !reviewing && (flightTrace.bounds()?.count ?? 0) >= 2);
    el('clock').textContent = `${String(Math.floor(state.t_s / 60)).padStart(2, '0')}:${String(Math.floor(state.t_s % 60)).padStart(2, '0')}`;
  }
  requestAnimationFrame(animate);
}
publishInput(); updateSessionUI(); requestAnimationFrame(animate);
addEventListener('pagehide', () => { flightLocationStore.flush(); document.removeEventListener('keydown', reviewSeekShortcut, true); document.removeEventListener('keydown', flightMapShortcut, true); document.removeEventListener('keydown', landmarkShortcut, true); flightAssists.dispose(); overlayPresentation.dispose();disposeMenuShortcuts(); disposeFullscreen(); mapDisposed = true; engineAudio.dispose(); audioControls?.dispose(); document.removeEventListener('click', activateEngineAudio, true); document.removeEventListener('keydown', activateEngineAudio, true); document.removeEventListener('keydown', soundShortcut, true); document.removeEventListener('keydown', engineShortcut, true); document.removeEventListener('keydown', parkingBrakeShortcut, true); groundCollisionPanel.dispose(); loadingPanel.dispose(); aircraftHandbook.dispose(); flightData.dispose(); stallAwareness.dispose(); flightWarningsPanel.dispose(); liveWarningMonitor.reset(); reviewWarningMonitor.reset(); cockpitLayout.dispose(); practiceMap?.dispose(); session.dispose(); controlSettingsPanel.dispose(); pressureAltimeter.dispose(); enginePanel.dispose(); systemsPanel.dispose(); autopilotPanel.dispose(); radioPanel.dispose(); navigationMedia.removeEventListener('change', placeNavigationOpener); navigationGauges.dispose(); pitchTrimControl.dispose(); landingFeedback.dispose(); fieldOfView.dispose(); pointerYoke?.dispose(); sixPack.dispose(); reviewControls.dispose(); flightTrace.clear(); scene?.dispose(); });
void sceneReady;
