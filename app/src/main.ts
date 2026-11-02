import './style.css';
import './practice-map.css';
import { createPitchTrimControl } from './pitch-trim';
import { createNavigationGauges } from './navigation-gauges';
import { createLandingFeedback } from './landing-feedback';
import { createSixPack } from './six-pack';
import { createAutopilotPanel } from './autopilot-panel';
import { createRadioNavPanel } from './radio-nav-panel';
import { createEnginePanel } from './engine-panel';
import { createPointerYoke } from './pointer-yoke';
import { createFieldOfViewControl, DEFAULT_FOV_RAD } from './field-of-view';
import { createPressureAltimeterPanel } from './pressure-altimeter-panel';
import { createScene } from './scene';
import { createSession } from './session';
import { FlightTrace } from './flight-trace';
import { createFlightReviewControls } from './flight-review-controls';
import { applyControlSettings, DEFAULT_CONTROL_SETTINGS, type ControlSettings } from './control-settings';
import { createControlSettingsPanel } from './control-settings-panel';
import type { Controls, FlightState, FlightScene, LandingPreset } from './types';
import type { PracticeMap } from './practice-map';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
<main class="flight-app">
  <div id="scene" aria-label="Flight scene" tabindex="0" data-pointer-mode="off"></div>
  <header class="topbar">
    <a class="brand" href="https://github.com/gregoryyy/gefly" target="_blank" rel="noreferrer">gefly<span>FLIGHT LAB</span></a>
    <div class="location"><strong>EGELSBACH</strong><span>C172 research aircraft · airborne practice</span></div>
    <div class="session-status"><i id="status-dot"></i><span id="status" role="status">Loading flight…</span><span id="clock">00:00</span></div>
    <details id="view-menu" class="top-menu"><summary>View</summary><nav class="menu-content view-controls" aria-label="Flight views"><button id="cockpit" class="selected" aria-pressed="true">Cockpit</button><button id="chase" aria-pressed="false">Chase <kbd>V</kbd></button><button id="toggle-map" aria-pressed="false" aria-controls="practice-map-panel">Map</button><button id="toggle-controls" aria-pressed="true" aria-controls="flight-controls-panel">Flight controls</button></nav></details>
    <span id="review-button-slot"></span>
    <button id="controls-settings" class="settings-trigger" aria-haspopup="dialog">Options</button>
    <details id="flight-menu" class="top-menu"><summary>Flight</summary><nav class="menu-content" aria-label="Flight session"><button id="reset">Restart flight <kbd>R</kbd></button><span class="menu-label">FLAT-GROUND LANDING STUDY</span><button data-landing="normal">Baseline touchdown</button><button data-landing="hard">Fast descent</button><button data-landing="side">Sideways touchdown</button><button data-landing="banked">Banked touchdown</button><button id="airborne-practice">Airborne practice</button></nav></details>
    <button id="pause" disabled>Pause <kbd>SPACE</kbd></button>
  </header>
  <section id="notice" class="notice" role="status" aria-live="polite" hidden></section>
  <section id="flight-gate" class="flight-gate" aria-label="Flight session">
    <span class="eyebrow" id="gate-label">PREPARING YOUR FLIGHT</span>
    <h1 id="gate-title">Loading aircraft…</h1>
    <p id="gate-copy">The aircraft starts airborne at 90 kt. Flight time stays paused until you start.</p>
    <button id="start" class="primary" disabled>Loading…</button>
    <span class="gate-hint">Drag the stick or hold the control buttons. Keyboard arrows also work.</span>
  </section>
  <aside id="landing-feedback" hidden></aside>
  <div id="camera-fov" class="camera-fov">60° FOV · two-finger scroll</div>
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
    <div class="axis-display"><span>ROLL <b id="roll-control">0</b></span><span>PITCH <b id="pitch-control">0</b></span><span>RUDDER <b id="rudder-control">0</b></span></div>
    <details class="control-options"><summary>Keyboard & assistance</summary><p>↑ Push nose down · ↓ Pull nose up<br>← / → Bank · Q / W Rudder<br>1–9 Throttle: 10–90% · 0: idle<br>[ / ] Retract / extend flaps · B Hold wheel brakes<br>&#39; / &#92; Trim nose up / down<br>P Capture heading / AP off<br>Space Pause · R Restart</p><label for="roll-offset">Roll correction <output id="offset-value">−0.109</output></label><input id="roll-offset" type="range" min="-0.25" max="0.25" step="0.001" value="-0.109375" aria-label="Experimental roll correction for the generic model"><small>The generic model tends to roll right with centered controls. This adds a small constant left-aileron command. Zero removes the correction; it is not aircraft trim.</small><div class="roll-correction-presets"><button id="roll-correction-off" type="button">Off · 0%</button><button id="roll-correction-default" type="button">Study default</button></div></details>
  </aside>
  <div class="scenery-label">Egelsbach starter photograph · ellipsoid surface (no terrain)</div>
  <aside id="practice-map-panel" class="practice-map-panel" aria-label="Practice map" hidden></aside>
  <section class="flight-deck" aria-label="Flight instruments">
    <div class="deck-heading"><span class="eyebrow">CLASSIC INSTRUMENTS <b>EXPERIMENTAL</b></span><span id="view-label">COCKPIT VIEW</span></div>
    <div class="instruments">
      <div class="primary-instruments"><div id="six-pack"></div><div id="navigation-gauges"></div></div>
      <aside class="engine-controls" aria-label="Aircraft controls"><div id="autopilot-systems"></div>
        <div class="throttle-control"><label for="throttle">THROTTLE <b id="power">—</b></label><input id="throttle" type="range" aria-orientation="vertical" min="0" max="100" value="69" aria-label="Throttle percentage"><span>IDLE <i></i> FULL</span><p><kbd>1–9</kbd> 10–90% <kbd>0</kbd> Idle</p></div>
        <div class="vertical-config-controls"><div class="flap-controls"><div class="config-heading"><label for="flap-control">FLAPS</label><b id="flaps-actual">—</b></div><div class="flap-slider"><input id="flap-control" type="range" min="0" max="30" step="10" value="0" list="flap-stops" aria-label="Flap lever angle degrees" aria-orientation="vertical"><datalist id="flap-stops"><option value="0"></option><option value="10"></option><option value="20"></option><option value="30"></option></datalist><div class="flap-stop-labels" aria-hidden="true"><span>UP</span><span>10</span><span>20</span><span>30</span></div></div><div class="flap-keycaps"><button id="flaps-retract" type="button" aria-label="Retract flaps one detent">[</button><button id="flaps-extend" type="button" aria-label="Extend flaps one detent">]</button></div></div>
        <div id="pitch-trim"></div></div>
        <div class="brake-controls"><button id="wheel-brakes" data-code="KeyB" class="control-key" aria-label="Hold wheel brakes">WHEEL BRAKES <kbd>B</kbd></button><small id="brake-state">Wheel brakes · ground contact only</small></div>
      </aside>
      <div class="avionics-units"><div class="avionics-stack"><div id="engine-systems"></div></div><div id="radio-nav-systems"></div></div>
    </div>
    <footer><span>LOCAL RESEARCH PROTOTYPE · NOT VALIDATED FOR TRAINING</span><span>Imagery: HVBG · DL-DE Zero 2.0</span></footer>
    <div id="limitations" hidden>Generic JSBSim 172P research data, not the planned C172S. Aerial imagery provides geographic context on an ellipsoid; no terrain heights, current airport information or navigation data are supplied. Airspeed shows ideal engine CAS, not installation-calibrated IAS; older engines explicitly fall back to TAS. Heading is true, and the ideal turn-rate aid is not a full gyro turn-coordinator model. The pressure altimeter uses an ideal ISA scale-offset model driven by JSBSim static pressure; launch-point QFE is a practice datum, not airport elevation. Installed C172S instrument errors and limits are not modeled. No validated landing, circuit assessment, weather, radio or checklists yet. The adjustable study roll offset adds a constant aileron input to counter the generic model’s initial roll-off; this is an experimental assist, not an aircraft trim specification. Local research runtime assets are excluded from distribution. Radio controls use a legacy 25 kHz COM subset, with no 8.33 kHz or communication service. LAB is an opt-in fictional teaching station, using true OBS/radials and spherical geometric slant distance. No real navaid database, magnetic VOR, propagation or ILS is modeled. ALT/NAV/APR/REV autopilot modes remain INOP. Landing contact studies use a flat zero-height ellipsoid, upstream generic gear forces and illustrative fixed-wheel visuals; they do not establish aircraft damage or safe load limits.</div>
  </section>
</main>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sixPack = createSixPack(el('six-pack'));
const landingFeedback = createLandingFeedback(el('landing-feedback'));
const sceneContainer = el('scene');
const focusFlight = () => sceneContainer.focus({ preventScroll: true });
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
let view: 'cockpit' | 'chase' = 'cockpit';
let pointerYoke: ReturnType<typeof createPointerYoke> | null = null;
let cameraLook = { yaw_rad: 0, pitch_rad: 0 };
let cameraFov_rad = DEFAULT_FOV_RAD;
let flapTarget_deg = 0;
let pitchTrimTarget: number | null = null;
let controlsVisible = true;
let landingPreset: LandingPreset | undefined;
let mixtureCommand = 1, mixtureAutomatic = true, apDisconnectPending = false;
let scene: FlightScene | null = null;
let sceneFailed = false, ready = false, running = false, failed = false;
let hasFlown = false, startWhenReady = false;
let latest: FlightState | null = null, previous: FlightState | null = null;
let verticalSpeedFpm = 0, throttle = 0.69, stickX = 0, stickY = 0;
const flightTrace = new FlightTrace();
let reviewing = false, reviewPlaying = false, reviewTime_s = 0;
let liveStatus = 'Loading flight…';
let practiceMap: PracticeMap | null = null;
let mapVisible = false, mapLoading = false, mapDisposed = false;
let lastMapUpdate_ms = -Infinity;
// Existing E1 fixture's empirical input offset, not an aircraft coefficient.
let rollOffset = -0.109375;
let controlSettings: ControlSettings = { ...DEFAULT_CONTROL_SETTINGS };
const keys = new Set<string>();
const pointerControls = new Map<number, string>();
const keyboardControls = new Set<string>();
let stickPointer: number | null = null;
const flightKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyW', 'KeyB', 'Quote', 'Backslash']);
const editing = (target: EventTarget | null) => target instanceof HTMLElement && (!!target.closest('input,select,textarea') || target.isContentEditable);
const notice = (message: string) => { el('notice').textContent = message; el('notice').hidden = !message; };

function controlsAvailable() { return ready && !failed && !sceneFailed && !reviewing; }
function updateSessionUI() {
  const unavailable = !ready || failed || sceneFailed;
  el('flight-gate').hidden = running || reviewing || (hasFlown && controlsAvailable());
  el<HTMLButtonElement>('start').disabled = unavailable || reviewing;
  el<HTMLButtonElement>('pause').disabled = unavailable || reviewing;
  el<HTMLButtonElement>('reset').disabled = reviewing;
  el<HTMLButtonElement>('airborne-practice').disabled = reviewing;
  document.querySelectorAll<HTMLButtonElement>('[data-landing]').forEach(button => { button.disabled = reviewing; });
  el<HTMLButtonElement>('controls-settings').disabled = reviewing;
  el<HTMLInputElement>('throttle').disabled = !controlsAvailable();
  document.querySelector<HTMLElement>('.control-panel')!.hidden = reviewing || !controlsVisible;
  document.querySelector<HTMLElement>('.throttle-control')!.hidden = reviewing;
  if (reviewing) el('power').textContent = '—';
  updateReviewControls();
  el('pause').innerHTML = `${running ? 'Pause' : 'Resume'} <kbd>SPACE</kbd>`;
  el('status-dot').classList.toggle('flying', running);
  el('control-state').textContent = running ? (latest?.ap_mode ? 'AUTOPILOT · ROLL' : 'CONTROLS ACTIVE') : (controlsAvailable() ? 'PAUSED · CONTROLS READY' : 'LOADING CONTROLS');
  el('control-state').classList.toggle('active', running);
  if (reviewing) el('pointer-mode').textContent = 'REVIEW · hold-drag to set view · Escape to center';
  else if (sceneContainer.dataset.pointerMode === 'off') el('pointer-mode').textContent = 'Click scene: yoke · Hold-drag: look';
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
    el('gate-label').textContent = hasFlown ? 'SIMULATION PAUSED' : 'READY AT EGELSBACH';
    el('gate-title').textContent = hasFlown ? 'Ready when you are.' : 'Take the controls.';
    el('gate-copy').textContent = landingPreset ? 'Flat-ground contact study: CG starts 3 m above the ellipsoid, at 28 m/s. These are test fixtures, not landing procedures.' : hasFlown ? 'Flight time is paused. Resume, then drag the stick or use the keyboard.' : 'Start airborne at 90 kt and 1,300 ft study altitude. Drag the stick or hold the buttons to fly.';
    el('start').textContent = hasFlown ? 'Resume flight →' : 'Start flight →';
  }
}

const session = createSession({
  onState(workerState) {
    const state = { ...workerState, ...radioPanel.snapshot() };
    const oldAp = latest?.ap_mode ?? 0;
    if (previous && state.t_s > previous.t_s) {
      const dt = state.t_s - previous.t_s;
      const raw = (state.alt_msl_m - previous.alt_msl_m) / dt / 0.3048 * 60;
      verticalSpeedFpm += (1 - Math.exp(-dt / 0.5)) * (raw - verticalSpeedFpm);
    }
    previous = state; latest = state;
    if (!reviewing) flightTrace.record(state, verticalSpeedFpm * 0.3048 / 60);
    updateReviewControls();
    if (oldAp !== (state.ap_mode ?? 0)) { apDisconnectPending = false; publishInput(); updateSessionUI(); }
  },
  onReady(trim) {
    ready = true; failed = false; throttle = trim.throttle;
    pitchTrimTarget = Math.abs(trim.pitch_trim) <= 1 ? trim.pitch_trim : null;
    el<HTMLInputElement>('throttle').value = String(throttle * 100);
    notice(!landingPreset && trim.status !== 1 ? 'Initial trim did not converge. Handling may be unstable; restart if needed.' : '');
    publishInput();
    if (startWhenReady && !document.hidden && !sceneFailed) { startWhenReady = false; startFlight(); }
    updateSessionUI();
  },
  onStatus(message) { liveStatus = message; el('status').textContent = reviewing ? 'Review' : message; },
  onError(message) {
    failed = true; running = false; ready = false; startWhenReady = false;
    neutralize(); notice(`Flight stopped. ${message}`); updateSessionUI();
  },
});

const controlSettingsPanel = createControlSettingsPanel({
  container: root, initial: controlSettings,
  onOpen: pauseFlight,
  onClose: focusFlight,
  onChange(settings) { controlSettings = { ...settings }; neutralize(); },
});
// Options belong to the top menu; preserve the existing controls and their IDs.
const optionsDialog = el<HTMLDialogElement>('control-settings');
el('control-settings-title').textContent = 'Options';
optionsDialog.insertBefore(document.querySelector('.control-options')!, el('settings-close'));
const limitsButton = document.createElement('button');
limitsButton.id = 'limits'; limitsButton.type = 'button';
limitsButton.textContent = 'Model & systems information'; limitsButton.setAttribute('aria-expanded', 'false');
optionsDialog.insertBefore(limitsButton, el('settings-close'));
optionsDialog.insertBefore(el('limitations'), el('settings-close'));
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
  onSetting(setting_pa) { if (!reviewing && ready && !failed) session.setAltimeter(setting_pa); },
});

const enginePanel = createEnginePanel({
  container: el('engine-systems'),
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
  onAutopilot(mode, target_heading_rad) {
    if (!controlsAvailable() && mode !== 0) return;
    apDisconnectPending = false; session.setAutopilot(mode, target_heading_rad);
  },
  onOpen: neutralize, onClose: focusFlight,
});
const radioPanel = createRadioNavPanel({
  container: el('radio-nav-systems'),
  onChange(config) {
    if (!controlsAvailable() || !latest) return;
    latest = { ...latest, ...config };
    flightTrace.record(latest, verticalSpeedFpm * 0.3048 / 60);
  },
  onOpen: neutralize, onClose: focusFlight,
});

document.querySelector('.radio-heading strong')!.textContent = 'RADIO STACK · 25 kHz';
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

const fieldOfView = createFieldOfViewControl({
  element: sceneContainer, getFov: () => cameraFov_rad,
  isBlocked: () => !!document.querySelector('dialog[open]'),
  onChange(fov_rad) {
    cameraFov_rad = fov_rad;
    el('camera-fov').textContent = `${Math.round(fov_rad * 180 / Math.PI)}° FOV · two-finger scroll`;
  },
});

el('toggle-map').onclick = () => { void setMapVisible(!mapVisible); closeViewMenu(); focusFlight(); };
function mapUnavailable() {
  practiceMap?.dispose(); practiceMap = null;
  el('practice-map-panel').textContent = 'Practice map unavailable. Close and reopen to retry; flight controls still work.';
}
async function setMapVisible(visible: boolean) {
  mapVisible = visible;
  const panel = el('practice-map-panel');
  panel.hidden = !visible;
  el('toggle-map').setAttribute('aria-pressed', String(visible));
  if (practiceMap) { practiceMap.setVisible(visible); lastMapUpdate_ms = -Infinity; return; }
  if (!visible || mapLoading || mapDisposed) return;
  mapLoading = true; panel.textContent = 'Loading practice map…';
  try {
    const { createPracticeMap } = await import('./practice-map');
    if (mapDisposed) return;
    const created = await createPracticeMap({
      container: panel,
      onClose: () => { void setMapVisible(false); focusFlight(); },
      onInteraction: focusFlight,
    });
    if (mapDisposed) { created.dispose(); return; }
    practiceMap = created; created.setVisible(mapVisible); lastMapUpdate_ms = -Infinity;
  } catch {
    if (!mapDisposed) panel.textContent = 'Practice map unavailable. Close and reopen to retry; flight controls still work.';
  } finally { mapLoading = false; }
}


const reviewControls = createFlightReviewControls({
  buttonContainer: el('review-button-slot'),
  barContainer: document.querySelector<HTMLElement>('.flight-app')!,
  onEnter: enterReview,
  onExit: exitReview,
  onSeek(time_s) {
    const bounds = flightTrace.bounds();
    if (!reviewing || !bounds || !Number.isFinite(time_s)) return;
    reviewPlaying = false; reviewTime_s = clamp(time_s, bounds.start_s, bounds.end_s);
    lastMapUpdate_ms = -Infinity;
    updateReviewControls();
  },
  onTogglePlay: toggleReviewPlayback,
});
function updateReviewControls() {
  const bounds = flightTrace.bounds();
  reviewControls.update({
    available: !!bounds && bounds.count >= 2 && ready && !failed && !sceneFailed,
    active: reviewing, playing: reviewPlaying,
    start_s: bounds?.start_s ?? 0, end_s: bounds?.end_s ?? 0,
    current_s: reviewing ? reviewTime_s : (bounds?.end_s ?? 0), clipped: bounds?.clipped ?? false,
  });
}
function enterReview() {
  const bounds = flightTrace.bounds();
  if (reviewing || !bounds || bounds.count < 2 || !ready || failed || sceneFailed) return;
  pointerYoke?.cancel();
  reviewing = true; reviewTime_s = bounds.start_s; lastMapUpdate_ms = -Infinity;
  pauseFlight(); el('status').textContent = 'Review'; focusFlight();
}
function exitReview() {
  if (!reviewing) return;
  reviewing = reviewPlaying = false; lastMapUpdate_ms = -Infinity;
  el('status').textContent = liveStatus;
  neutralize(); updateSessionUI(); focusFlight();
}
function toggleReviewPlayback() {
  const bounds = flightTrace.bounds();
  if (!reviewing || !bounds) return;
  if (!reviewPlaying && reviewTime_s >= bounds.end_s) reviewTime_s = bounds.start_s;
  reviewPlaying = !reviewPlaying; updateReviewControls();
}


function held(code: string) { return keys.has(code) || keyboardControls.has(code) || [...pointerControls.values()].includes(code); }
function publishInput() {
  const raw: Controls = {
    elevator: clamp((held('ArrowUp') ? 0.35 : 0) - (held('ArrowDown') ? 0.35 : 0) + stickY * 0.4, -1, 1),
    aileron: clamp((held('ArrowRight') ? 0.45 : 0) - (held('ArrowLeft') ? 0.45 : 0) + stickX * 0.5, -1, 1),
    rudder: (held('KeyQ') ? 0.35 : 0) - (held('KeyW') ? 0.35 : 0), throttle,
    flap_norm: flapTarget_deg / 30, brake_norm: held('KeyB') ? 1 : 0,
    mixture_norm: mixtureCommand, mixture_auto: mixtureAutomatic,
    ...(pitchTrimTarget !== null ? { pitch_trim_norm: pitchTrimTarget } : {}),
  };
  if (latest?.ap_mode && !apDisconnectPending && (raw.elevator !== 0 || raw.aileron !== 0 || raw.rudder !== 0)) {
    apDisconnectPending = true; session.setAutopilot(0);
  }
  const controls = applyControlSettings(raw, controlSettings, latest?.ap_mode ? 0 : rollOffset);
  const direction = rollOffset < 0 ? 'left' : rollOffset > 0 ? 'right' : 'off';
  el('offset-value').textContent = `${Math.abs(rollOffset * 100).toFixed(1)}% ${direction}${latest?.ap_mode ? ' · suspended by AP' : ''}`;
  session.input(controls);
  el('roll-control').textContent = controls.aileron.toFixed(2);
  el('pitch-control').textContent = controls.elevator.toFixed(2);
  el('rudder-control').textContent = controls.rudder.toFixed(2);
  el('power').textContent = reviewing ? '—' : `${Math.round(throttle * 100)}%`;
  el('joystick-knob').style.transform = `translate(${stickX * 46}px, ${-stickY * 46}px)`;
  document.querySelectorAll<HTMLElement>('[data-code]').forEach(button => button.classList.toggle('held', held(button.dataset.code!)));
}
function neutralize() {
  if (!reviewing || failed || sceneFailed) pointerYoke?.cancel();
  keys.clear(); pointerControls.clear(); keyboardControls.clear(); stickX = stickY = 0;
  if (stickPointer !== null) {
    const pointer = stickPointer; stickPointer = null;
    if (el('joystick').hasPointerCapture(pointer)) el('joystick').releasePointerCapture(pointer);
  }
  publishInput();
}
function pauseFlight() {
  reviewPlaying = false;
  startWhenReady = false; neutralize(); running = false; session.pause(); updateSessionUI();
}
function startFlight() {
  if (!ready || failed || sceneFailed || !scene || reviewing) return;
  neutralize(); running = true; hasFlown = true; session.start(); updateSessionUI(); focusFlight();
}
function togglePause() { if (running) pauseFlight(); else startFlight(); }
function reset(preset = landingPreset) {
  closeViewMenu();
  if (reviewing) return;
  if (sceneFailed) { notice('The 3D scene is unavailable. Reload with WebGL enabled.'); return; }
  landingPreset = preset;
  radioPanel.reset();
  flightTrace.clear(); pitchTrimTarget = null; flapTarget_deg = 0; mixtureCommand = 1; mixtureAutomatic = true; apDisconnectPending = false;
  if (practiceMap && latest) { try { practiceMap.update(latest, [], 'live'); } catch { mapUnavailable(); } }
  lastMapUpdate_ms = -Infinity;
  pressureAltimeter.update(null, false);
  startWhenReady = running; running = false; ready = false; failed = false;
  neutralize(); session.pause(); latest = previous = null; verticalSpeedFpm = 0;
  pitchTrimControl.update(null, false, false, null);
  enginePanel.update(null, false, false); autopilotPanel.update(null, false, false);
  radioPanel.update(null, false, false); navigationGauges.update(null, false, false); landingFeedback.update(null, false);
  updateConfiguration(null, false);
  notice(''); session.reset(landingPreset); updateSessionUI(); focusFlight();
}
function setView(next: typeof view) {
  closeViewMenu(); view = next;
  for (const name of ['cockpit', 'chase']) { el(name).classList.toggle('selected', name === view); el(name).setAttribute('aria-pressed', String(name === view)); }
  el('view-label').textContent = `${view.toUpperCase()} VIEW`;
}
el('start').onclick = startFlight;
el('pause').onclick = () => { togglePause(); focusFlight(); };
el('reset').onclick = () => reset();
document.querySelectorAll<HTMLButtonElement>('[data-landing]').forEach(button => {
  button.onclick = () => { if (!reviewing) reset(button.dataset.landing as LandingPreset); };
});
el('airborne-practice').onclick = () => { landingPreset = undefined; reset(); };
el('cockpit').onclick = () => { setView('cockpit'); focusFlight(); };
el('chase').onclick = () => { setView('chase'); focusFlight(); };
el<HTMLInputElement>('throttle').oninput = event => { throttle = Number((event.target as HTMLInputElement).value) / 100; publishInput(); };
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
  const available = state?.flap_rad !== undefined && state.brake_left_norm !== undefined;
  const flapLever = el<HTMLInputElement>('flap-control');
  flapLever.disabled = !available || !controlsAvailable() || recorded;
  for (const id of ['flaps-retract', 'flaps-extend']) el<HTMLButtonElement>(id).disabled = flapLever.disabled;
  const selected = recorded ? state?.flap_command_norm === undefined ? null : state.flap_command_norm * 30 : flapTarget_deg;
  flapLever.value = String(selected ?? 0);
  flapLever.setAttribute('aria-valuetext', selected === null ? 'Recorded lever position unavailable' : `${Math.round(selected)} degrees selected`);
  el<HTMLButtonElement>('wheel-brakes').disabled = !available || !controlsAvailable() || recorded;
  el('flaps-actual').textContent = available ? `${(state!.flap_rad! * 180 / Math.PI).toFixed(0)}°${recorded ? ' · recorded' : ' actual'}` : 'Rebuild engine';
  el('brake-state').textContent = !available ? 'Wheel brakes unavailable' : recorded
    ? `Recorded wheel brakes: ${Math.round(Math.max(state!.brake_left_norm!, state!.brake_right_norm!) * 100)}%`
    : `${state!.on_ground ? 'Ground contact' : 'Airborne · ground braking only'} · applied ${Math.round(Math.max(state!.brake_left_norm!, state!.brake_right_norm!) * 100)}%`;
}
function setFlaps(degrees: number) {
  if (!controlsAvailable() || latest?.flap_rad === undefined) return;
  flapTarget_deg = clamp(Math.round(degrees / 10) * 10, 0, 30); publishInput();
}
el<HTMLInputElement>('flap-control').oninput = event => setFlaps((event.target as HTMLInputElement).valueAsNumber);
el('flaps-retract').onclick = () => { setFlaps(flapTarget_deg - 10); focusFlight(); };
el('flaps-extend').onclick = () => { setFlaps(flapTarget_deg + 10); focusFlight(); };
pointerYoke = createPointerYoke({
  element: sceneContainer,
  lookOnly: () => reviewing,
  enabled: () => (controlsAvailable() || reviewing) && !menuOpen() && !controlSettingsPanel.isOpen() && !document.querySelector('dialog[open]'),
  onYoke(x, y) { stickX = x; stickY = y; publishInput(); },
  onLook(yaw_rad, pitch_rad) { cameraLook = { yaw_rad, pitch_rad }; },
  onMode(mode) {
    el('pointer-mode').textContent = reviewing ? (mode === 'look' ? 'REVIEW LOOK · release to keep view' : 'REVIEW · hold-drag to set view · Escape to center') : mode === 'yoke' ? 'YOKE ACTIVE · click to release · hold-drag to look' : mode === 'look' ? 'LOOKING · release to return' : 'Click scene: yoke · Hold-drag: look';
    sceneContainer.dataset.pointerMode = mode;
  },
});

const joystick = el('joystick');
function moveStick(event: PointerEvent) {
  const rect = joystick.getBoundingClientRect();
  let x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.32);
  let y = (rect.top + rect.height / 2 - event.clientY) / (rect.height * 0.32);
  const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
  stickX = x; stickY = y; publishInput();
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
    pointerControls.set(event.pointerId, code); publishInput();
  });
  const release = (event: PointerEvent) => {
    if (pointerControls.delete(event.pointerId)) publishInput();
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => release(event as PointerEvent));
  button.addEventListener('keydown', event => {
    if (controlsAvailable() && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); event.stopPropagation(); keyboardControls.add(code); publishInput(); }
  });
  button.addEventListener('keyup', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); event.stopPropagation(); keyboardControls.delete(code); publishInput(); }
  });
  button.addEventListener('blur', () => { if (keyboardControls.delete(code)) publishInput(); });
}

addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || menuOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
  if (reviewing) {
    const timeline = event.target instanceof HTMLElement && event.target.id === 'review-time';
    if (editing(event.target) && !timeline) return;
    const nativeSpace = event.target instanceof HTMLElement && !!event.target.closest('button,a,summary');
    if (event.code === 'Space' && !nativeSpace) {
      event.preventDefault(); if (!event.repeat) toggleReviewPlayback();
    }
    if (event.code === 'KeyV' && !event.repeat) {
      event.preventDefault(); setView(view === 'cockpit' ? 'chase' : 'cockpit');
    }
    return;
  }
  if (editing(event.target)) return;
  if (event.code === 'Space' && event.target instanceof HTMLElement && event.target.closest('button,a,summary')) return;
  if (flightKeys.has(event.code)) {
    event.preventDefault(); if (controlsAvailable()) { keys.add(event.code); publishInput(); }
  }
  if (event.repeat) return;
  if (controlsAvailable() && /^(Digit|Numpad)[0-9]$/.test(event.code)) {
    event.preventDefault(); throttle = Number(event.code.at(-1)) / 10;
    el<HTMLInputElement>('throttle').value = String(throttle * 100); publishInput();
  }
  if (event.code === 'KeyP' && controlsAvailable() && latest?.ap_mode !== undefined) {
    event.preventDefault(); session.setAutopilot(latest.ap_mode ? 0 : 2);
  }
  if (['BracketLeft', 'BracketRight'].includes(event.code) && controlsAvailable() && latest?.flap_rad !== undefined) {
    event.preventDefault(); flapTarget_deg = clamp(flapTarget_deg + (event.code === 'BracketLeft' ? -10 : 10), 0, 30); publishInput();
  }
  if (event.code === 'Slash' && controlsAvailable() && latest?.pitch_trim_initial_norm !== undefined) { event.preventDefault(); pitchTrimTarget = latest.pitch_trim_initial_norm; publishInput(); }
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
  if (event.code === 'KeyR') reset();
  if (event.code === 'KeyV') setView(view === 'cockpit' ? 'chase' : 'cockpit');
});
addEventListener('keyup', event => { if (keys.delete(event.code)) { event.preventDefault(); publishInput(); } });
addEventListener('blur', pauseFlight);
addEventListener('focusin', event => { if (editing(event.target) && !reviewing) neutralize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFlight(); });

const sceneReady = createScene(sceneContainer).then(result => {
  scene = result; session.reset();
}).catch((error: unknown) => {
  sceneFailed = true; running = false; startWhenReady = false;
  notice(`Scene unavailable: ${error instanceof Error ? error.message : String(error)}. Reload with WebGL enabled.`);
  session.pause(); updateSessionUI();
});
let lastFrame = performance.now();
function animate(now: number) {
  const dt = clamp((now - lastFrame) / 1000, 0, 0.1); lastFrame = now;
  if (controlsAvailable() && pitchTrimTarget !== null && latest?.pitch_trim_norm !== undefined && (held('Quote') || held('Backslash'))) {
    // UI repeat speed only; this is not a calibrated aircraft trim-wheel rate.
    pitchTrimTarget = clamp(pitchTrimTarget + ((held('Backslash') ? 1 : 0) - (held('Quote') ? 1 : 0)) * dt * 0.08, -1, 1);
    publishInput();
  }
  if (reviewing && reviewPlaying) {
    const bounds = flightTrace.bounds();
    if (bounds) {
      reviewTime_s = Math.min(bounds.end_s, reviewTime_s + dt);
      if (reviewTime_s >= bounds.end_s) reviewPlaying = false;
      updateReviewControls();
    }
  }
  const reviewSample = reviewing ? flightTrace.atTime(reviewTime_s) : null;
  if (latest) {
    const state = reviewSample?.state ?? latest;
    const shownVsiFpm = reviewSample ? reviewSample.vertical_speed_mps / 0.3048 * 60 : verticalSpeedFpm;
    if (practiceMap && mapVisible && now - lastMapUpdate_ms >= 250) {
      try {
        practiceMap.update(state, flightTrace.sampledStates(600), reviewing ? 'review' : 'live');
        lastMapUpdate_ms = now;
      } catch {
        mapUnavailable();
      }
    }

    if (scene && !sceneFailed) {
      try { scene.update(state, view, { ...cameraLook, fov_rad: cameraFov_rad }); } catch {
        sceneFailed = true; pauseFlight(); notice('The 3D scene stopped rendering. Reload to restart.'); updateSessionUI();
      }
    }
    pressureAltimeter.update(state, reviewing);
    sixPack.update(state, shownVsiFpm, reviewing);
    enginePanel.update(state, reviewing, controlsAvailable(), { mixture_norm: mixtureCommand, mixture_auto: mixtureAutomatic });
    autopilotPanel.update(state, reviewing, controlsAvailable());
    radioPanel.update(state, reviewing, controlsAvailable());
    navigationGauges.update(state, reviewing, controlsAvailable());
    pitchTrimControl.update(state, reviewing, controlsAvailable(), pitchTrimTarget);
    updateConfiguration(state, reviewing);
    landingFeedback.update(state, reviewing);
    el('clock').textContent = `${String(Math.floor(state.t_s / 60)).padStart(2, '0')}:${String(Math.floor(state.t_s % 60)).padStart(2, '0')}`;
  }
  requestAnimationFrame(animate);
}
publishInput(); updateSessionUI(); requestAnimationFrame(animate);
addEventListener('pagehide', () => { mapDisposed = true; practiceMap?.dispose(); session.dispose(); controlSettingsPanel.dispose(); pressureAltimeter.dispose(); enginePanel.dispose(); autopilotPanel.dispose(); radioPanel.dispose(); navigationMedia.removeEventListener('change', placeNavigationOpener); navigationGauges.dispose(); pitchTrimControl.dispose(); landingFeedback.dispose(); fieldOfView.dispose(); pointerYoke?.dispose(); sixPack.dispose(); reviewControls.dispose(); flightTrace.clear(); scene?.dispose(); });
void sceneReady;
