import './style.css';
import './practice-map.css';
import { createPressureAltimeterPanel } from './pressure-altimeter-panel';
import { createScene } from './scene';
import { createSession } from './session';
import { FlightTrace } from './flight-trace';
import { createFlightReviewControls } from './flight-review-controls';
import { applyControlSettings, DEFAULT_CONTROL_SETTINGS, type ControlSettings } from './control-settings';
import { createControlSettingsPanel } from './control-settings-panel';
import type { Controls, FlightState, FlightScene } from './types';
import type { PracticeMap } from './practice-map';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
<main class="flight-app">
  <div id="scene" aria-label="Flight scene" tabindex="0"></div>
  <header class="topbar">
    <a class="brand" href="https://github.com/gregoryyy/gefly" target="_blank" rel="noreferrer">gefly<span>FLIGHT LAB</span></a>
    <div class="location"><strong>EGELSBACH</strong><span>C172 research aircraft · airborne practice</span></div>
    <div class="session-status"><i id="status-dot"></i><span id="status" role="status">Loading flight…</span><span id="clock">00:00</span></div>
    <nav class="view-controls" aria-label="Flight views"><button id="cockpit" class="selected" aria-pressed="true">Cockpit</button><button id="chase" aria-pressed="false">Chase <kbd>V</kbd></button></nav>
    <span id="review-button-slot"></span>
    <button id="toggle-map" class="settings-trigger" aria-pressed="false" aria-controls="practice-map-panel">Map</button>
    <button id="controls-settings" class="settings-trigger" aria-haspopup="dialog">Controls</button>
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
  <div class="crosshair" aria-hidden="true"><i></i><b></b><i></i></div>
  <aside class="control-panel" aria-label="Flight controls">
    <div class="control-heading"><strong>FLIGHT CONTROLS</strong><span id="control-state">START FLIGHT TO CONTROL</span></div>
    <div class="control-body">
      <div class="joystick-column"><div id="joystick" class="joystick" tabindex="0" role="application" aria-label="Flight stick: drag up to push nose down, down to pull nose up, left or right to bank"><span class="stick-label top">PUSH / NOSE DOWN</span><span class="stick-label bottom">PULL / NOSE UP</span><i class="stick-line vertical"></i><i class="stick-line horizontal"></i><b id="joystick-knob"></b></div><span class="drag-hint">DRAG TO FLY · RELEASE TO CENTER</span></div>
      <div class="button-controls" aria-label="Press and hold flight controls">
        <div class="pitch-roll"><button id="pitch-down" data-code="ArrowUp" class="control-key up" aria-label="Hold to push nose down">↑<small>PUSH</small></button><button id="roll-left" data-code="ArrowLeft" class="control-key left" aria-label="Hold to bank left">←<small>BANK</small></button><button id="pitch-up" data-code="ArrowDown" class="control-key down" aria-label="Hold to pull nose up">↓<small>PULL</small></button><button id="roll-right" data-code="ArrowRight" class="control-key right" aria-label="Hold to bank right">→<small>BANK</small></button></div>
        <div class="rudder-buttons"><button id="rudder-left" data-code="KeyA" class="control-key" aria-label="Hold left rudder">A<small>RUDDER</small></button><button id="rudder-right" data-code="KeyD" class="control-key" aria-label="Hold right rudder">D<small>RUDDER</small></button></div>
      </div>
    </div>
    <div class="axis-display"><span>ROLL <b id="roll-control">0</b></span><span>PITCH <b id="pitch-control">0</b></span><span>RUDDER <b id="rudder-control">0</b></span></div>
    <details class="control-options"><summary>Keyboard & assistance</summary><p>↑ Push nose down · ↓ Pull nose up<br>← / → Bank · A / D Rudder<br>W / S Throttle · Space Pause · R Restart</p><label for="roll-offset">Study roll offset <output id="offset-value">−0.109</output></label><input id="roll-offset" type="range" min="-0.25" max="0.25" step="0.001" value="-0.109375" aria-label="Experimental roll input offset"><small>Experimental input assist. Set to zero for unassisted roll input.</small></details>
  </aside>
  <div class="scenery-label">Egelsbach starter photograph · ellipsoid surface (no terrain)</div>
  <aside id="practice-map-panel" class="practice-map-panel" aria-label="Practice map" hidden></aside>
  <section class="flight-deck" aria-label="Flight instruments">
    <div class="deck-heading"><span class="eyebrow">CLASSIC INSTRUMENTS <b>EXPERIMENTAL</b></span><span id="view-label">COCKPIT VIEW</span></div>
    <div class="instruments">
      <div class="gauge"><canvas id="airspeed" width="300" height="300" aria-label="True airspeed dial"></canvas><div class="gauge-readout"><b id="tas">—</b><span>KT · TRUE AIRSPEED</span></div></div>
      <div class="gauge attitude"><canvas id="attitude" width="300" height="300" aria-label="Attitude indicator"></canvas><div class="gauge-readout"><b id="bank">—</b><span>BANK · DEGREES</span></div></div>
      <div id="pressure-altimeter" class="gauge"></div>
      <div class="flight-data"><div><span>HEADING · TRUE</span><b id="heading">—</b></div><div><span>VERTICAL SPEED</span><b id="vsi">—</b><small>FT / MIN · DERIVED</small></div></div>
      <div class="throttle-control"><label for="throttle">THROTTLE <b id="power">—</b></label><input id="throttle" type="range" min="0" max="100" value="69" aria-label="Throttle percentage"><span>IDLE <i></i> FULL</span><p><kbd>W</kbd> Increase <kbd>S</kbd> Decrease</p></div>
      <div class="session-controls"><button id="reset">Restart flight <kbd>R</kbd></button><p>Fixed-step JSBSim<br>Generic c172x research model</p><button id="limits" aria-expanded="false">Model & scenery limits</button></div>
    </div>
    <footer><span>LOCAL RESEARCH PROTOTYPE · NOT VALIDATED FOR TRAINING</span><span>Imagery: HVBG · DL-DE Zero 2.0</span></footer>
    <div id="limitations" hidden>Generic JSBSim 172P research data, not the planned C172S. Aerial imagery provides geographic context on an ellipsoid; no terrain heights, current airport information or navigation data are supplied. TAS is not IAS. The pressure altimeter uses an ideal ISA scale-offset model driven by JSBSim static pressure; launch-point QFE is a practice datum, not airport elevation. Installed C172S instrument errors and limits are not modeled. No validated landing, circuit assessment, weather, radio or checklists yet. The adjustable study roll offset adds a constant aileron input to counter the generic model’s initial roll-off; this is an experimental assist, not an aircraft trim specification. Local research runtime assets are excluded from distribution.</div>
  </section>
</main>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sceneContainer = el('scene');
const focusFlight = () => sceneContainer.focus({ preventScroll: true });
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
let view: 'cockpit' | 'chase' = 'cockpit';
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
const flightKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyW', 'KeyS']);
const editing = (target: EventTarget | null) => target instanceof HTMLElement && (!!target.closest('input,select,textarea') || target.isContentEditable);
const notice = (message: string) => { el('notice').textContent = message; el('notice').hidden = !message; };

function updateSessionUI() {
  const unavailable = !ready || failed || sceneFailed;
  const paused = !running;
  el('flight-gate').hidden = running || reviewing;
  el<HTMLButtonElement>('start').disabled = unavailable || reviewing;
  el<HTMLButtonElement>('pause').disabled = unavailable || reviewing;
  el<HTMLButtonElement>('reset').disabled = reviewing;
  el<HTMLButtonElement>('controls-settings').disabled = reviewing;
  el<HTMLInputElement>('throttle').disabled = reviewing;
  document.querySelector<HTMLElement>('.control-panel')!.hidden = reviewing;
  document.querySelector<HTMLElement>('.throttle-control')!.hidden = reviewing;
  if (reviewing) el('power').textContent = '—';
  updateReviewControls();
  el('pause').innerHTML = `${running ? 'Pause' : 'Resume'} <kbd>SPACE</kbd>`;
  el('status-dot').classList.toggle('flying', running);
  el('control-state').textContent = running ? 'CONTROLS ACTIVE' : 'START FLIGHT TO CONTROL';
  el('control-state').classList.toggle('active', running);
  el('joystick').setAttribute('aria-disabled', String(paused));
  document.querySelectorAll<HTMLButtonElement>('[data-code]').forEach(button => { button.disabled = paused; });
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
    el('gate-copy').textContent = hasFlown ? 'Flight time is paused. Resume, then drag the stick or use the keyboard.' : 'Start airborne at 90 kt and 1,300 ft study altitude. Drag the stick or hold the buttons to fly.';
    el('start').textContent = hasFlown ? 'Resume flight →' : 'Start flight →';
  }
}

const session = createSession({
  onState(state) {
    if (previous && state.t_s > previous.t_s) {
      const dt = state.t_s - previous.t_s;
      const raw = (state.alt_msl_m - previous.alt_msl_m) / dt / 0.3048 * 60;
      verticalSpeedFpm += (1 - Math.exp(-dt / 0.5)) * (raw - verticalSpeedFpm);
    }
    previous = state; latest = state;
    if (!reviewing) flightTrace.record(state, verticalSpeedFpm * 0.3048 / 60);
    updateReviewControls();
  },
  onReady(trim) {
    ready = true; failed = false; throttle = trim.throttle;
    el<HTMLInputElement>('throttle').value = String(throttle * 100);
    notice(trim.status !== 1 ? 'Initial trim did not converge. Handling may be unstable; restart if needed.' : '');
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
el('controls-settings').onclick = () => controlSettingsPanel.open();
const pressureAltimeter = createPressureAltimeterPanel({
  container: el('pressure-altimeter'), onOpen: pauseFlight, onClose: focusFlight,
  onSetting(setting_pa) { if (!reviewing && ready && !failed) session.setAltimeter(setting_pa); },
});

el('toggle-map').onclick = () => { void setMapVisible(!mapVisible); focusFlight(); };
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
    rudder: (held('KeyD') ? 0.35 : 0) - (held('KeyA') ? 0.35 : 0), throttle,
  };
  const controls = applyControlSettings(raw, controlSettings, rollOffset);
  session.input(controls);
  el('roll-control').textContent = controls.aileron.toFixed(2);
  el('pitch-control').textContent = controls.elevator.toFixed(2);
  el('rudder-control').textContent = controls.rudder.toFixed(2);
  el('power').textContent = reviewing ? '—' : `${Math.round(throttle * 100)}%`;
  el('joystick-knob').style.transform = `translate(${stickX * 46}px, ${-stickY * 46}px)`;
  document.querySelectorAll<HTMLElement>('[data-code]').forEach(button => button.classList.toggle('held', held(button.dataset.code!)));
}
function neutralize() {
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
function reset() {
  if (reviewing) return;
  if (sceneFailed) { notice('The 3D scene is unavailable. Reload with WebGL enabled.'); return; }
  flightTrace.clear();
  if (practiceMap && latest) { try { practiceMap.update(latest, [], 'live'); } catch { mapUnavailable(); } }
  lastMapUpdate_ms = -Infinity;
  pressureAltimeter.update(null, false);
  startWhenReady = running; running = false; ready = false; failed = false;
  neutralize(); session.pause(); latest = previous = null; verticalSpeedFpm = 0;
  notice(''); session.reset(); updateSessionUI(); focusFlight();
}
function setView(next: typeof view) {
  view = next;
  for (const name of ['cockpit', 'chase']) { el(name).classList.toggle('selected', name === view); el(name).setAttribute('aria-pressed', String(name === view)); }
  el('view-label').textContent = `${view.toUpperCase()} VIEW`;
}
el('start').onclick = startFlight;
el('pause').onclick = () => { togglePause(); focusFlight(); };
el('reset').onclick = reset;
el('cockpit').onclick = () => { setView('cockpit'); focusFlight(); };
el('chase').onclick = () => { setView('chase'); focusFlight(); };
el<HTMLInputElement>('throttle').oninput = event => { throttle = Number((event.target as HTMLInputElement).value) / 100; publishInput(); };
el<HTMLInputElement>('roll-offset').oninput = event => {
  rollOffset = Number((event.target as HTMLInputElement).value);
  el('offset-value').textContent = rollOffset.toFixed(3); publishInput();
};
el('limits').onclick = () => {
  const expanded = el('limitations').hidden;
  el('limitations').hidden = !expanded; el('limits').setAttribute('aria-expanded', String(expanded));
};

// Pointer capture keeps a drag usable when it crosses the pad edge. Release,
// cancellation, lost capture and focus loss all clear user axes immediately.
const joystick = el('joystick');
function moveStick(event: PointerEvent) {
  const rect = joystick.getBoundingClientRect();
  let x = (event.clientX - rect.left - rect.width / 2) / (rect.width * 0.32);
  let y = (rect.top + rect.height / 2 - event.clientY) / (rect.height * 0.32);
  const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
  stickX = x; stickY = y; publishInput();
}
joystick.addEventListener('pointerdown', event => {
  if (!running || stickPointer !== null) return;
  event.preventDefault(); focusFlight(); stickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId); moveStick(event);
});
joystick.addEventListener('pointermove', event => { if (event.pointerId === stickPointer && running) moveStick(event); });
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
    if (!running) return;
    event.preventDefault(); focusFlight(); button.setPointerCapture(event.pointerId);
    pointerControls.set(event.pointerId, code); publishInput();
  });
  const release = (event: PointerEvent) => {
    if (pointerControls.delete(event.pointerId)) publishInput();
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => release(event as PointerEvent));
  button.addEventListener('keydown', event => {
    if (running && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); event.stopPropagation(); keyboardControls.add(code); publishInput(); }
  });
  button.addEventListener('keyup', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); event.stopPropagation(); keyboardControls.delete(code); publishInput(); }
  });
  button.addEventListener('blur', () => { if (keyboardControls.delete(code)) publishInput(); });
}

addEventListener('keydown', event => {
  if (controlSettingsPanel.isOpen() || el<HTMLDialogElement>('altimeter-dialog').open || event.ctrlKey || event.metaKey || event.altKey) return;
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
    event.preventDefault(); if (running) { keys.add(event.code); publishInput(); }
  }
  if (event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
  if (event.code === 'KeyR') reset();
  if (event.code === 'KeyV') setView(view === 'cockpit' ? 'chase' : 'cockpit');
});
addEventListener('keyup', event => { if (keys.delete(event.code)) { event.preventDefault(); publishInput(); } });
addEventListener('blur', pauseFlight);
addEventListener('focusin', event => { if (editing(event.target)) neutralize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFlight(); });

const sceneReady = createScene(sceneContainer).then(result => {
  scene = result; session.reset();
}).catch((error: unknown) => {
  sceneFailed = true; running = false; startWhenReady = false;
  notice(`Scene unavailable: ${error instanceof Error ? error.message : String(error)}. Reload with WebGL enabled.`);
  session.pause(); updateSessionUI();
});
function dial(id: string, value: number, max: number, label: string, unit: string, increment: number) {
  const canvas = el<HTMLCanvasElement>(id), ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 300, 300); ctx.save(); ctx.translate(150,150);
  ctx.beginPath(); ctx.arc(0,0,137,0,Math.PI*2); ctx.fillStyle='#10191d'; ctx.fill();
  ctx.strokeStyle='#4b575b'; ctx.lineWidth=2; ctx.stroke();
  const start=-Math.PI*1.25, span=Math.PI*1.5;
  for(let n=0;n<=max;n+=increment/2) {
    const angle=start+n/max*span, major=n%increment===0;
    ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(major?105:113,0); ctx.lineTo(124,0); ctx.strokeStyle=major?'#e8e9de':'#677477'; ctx.lineWidth=major?2:1; ctx.stroke(); ctx.restore();
    if(major) { ctx.fillStyle='#e8e9de'; ctx.font='17px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(n),Math.cos(angle)*87,Math.sin(angle)*87); }
  }
  ctx.textAlign='center'; ctx.fillStyle='#94a7ac'; ctx.font='13px sans-serif'; ctx.fillText(label,0,-37); ctx.font='11px sans-serif';ctx.fillText(unit,0,48);
  ctx.rotate(start+clamp(value,0,max)/max*span); ctx.beginPath(); ctx.moveTo(-17,-4);ctx.lineTo(110,0);ctx.lineTo(-17,4);ctx.fillStyle='#e9bf78';ctx.fill();
  ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fillStyle='#d4d6cc';ctx.fill();ctx.restore();
}
function attitude(state: FlightState) {
  const ctx=el<HTMLCanvasElement>('attitude').getContext('2d')!;
  ctx.clearRect(0,0,300,300);ctx.save();ctx.translate(150,150);
  ctx.beginPath();ctx.arc(0,0,136,0,Math.PI*2);ctx.clip();ctx.save();ctx.rotate(-state.roll_rad);ctx.translate(0,state.pitch_rad*180/Math.PI*3);
  ctx.fillStyle='#7cabc0';ctx.fillRect(-400,-600,800,600);ctx.fillStyle='#886b49';ctx.fillRect(-400,0,800,600);
  ctx.strokeStyle='#f2ead6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-400,0);ctx.lineTo(400,0);ctx.stroke();
  ctx.font='13px monospace';ctx.textAlign='center';ctx.fillStyle='#f2ead6';
  for(let deg=-30;deg<=30;deg+=10) { if(!deg)continue;const y=-deg*3;ctx.beginPath();ctx.moveTo(-25,y);ctx.lineTo(25,y);ctx.stroke();ctx.fillText(String(Math.abs(deg)),44,y+4); }
  ctx.restore();ctx.strokeStyle='#ebbf77';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-75,0);ctx.lineTo(-25,0);ctx.lineTo(-25,8);ctx.moveTo(75,0);ctx.lineTo(25,0);ctx.lineTo(25,8);ctx.stroke();ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fillStyle='#ebbf77';ctx.fill();ctx.restore();
}
let lastFrame = performance.now();
function animate(now: number) {
  const dt = clamp((now - lastFrame) / 1000, 0, 0.1); lastFrame = now;
  if (running && (held('KeyW') || held('KeyS'))) {
    throttle = clamp(throttle + ((held('KeyW') ? 1 : 0) - (held('KeyS') ? 1 : 0)) * dt * 0.25, 0, 1);
    el<HTMLInputElement>('throttle').value = String(throttle * 100); publishInput();
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
      try { scene.update(state, view); } catch {
        sceneFailed = true; pauseFlight(); notice('The 3D scene stopped rendering. Reload to restart.'); updateSessionUI();
      }
    }
    const kt = state.tas_mps * 3600 / 1852;
    pressureAltimeter.update(state, reviewing);
    const heading = ((state.heading_rad * 180 / Math.PI) % 360 + 360) % 360;
    el('tas').textContent = kt.toFixed(0);
    el('heading').textContent = `${String(Math.round(heading) % 360).padStart(3, '0')}°`;
    el('bank').textContent = `${Math.abs(state.roll_rad * 180 / Math.PI).toFixed(0)}°`;
    el('vsi').textContent = `${shownVsiFpm >= 0 ? '+' : ''}${Math.round(shownVsiFpm / 10) * 10}`;
    el('clock').textContent = `${String(Math.floor(state.t_s / 60)).padStart(2, '0')}:${String(Math.floor(state.t_s % 60)).padStart(2, '0')}`;
    dial('airspeed', kt, 180, 'TRUE AIRSPEED', 'KNOTS · NOT IAS', 20);
    attitude(state);
  }
  requestAnimationFrame(animate);
}
dial('airspeed', 0, 180, 'TRUE AIRSPEED', 'KNOTS · NOT IAS', 20);
attitude({ roll_rad: 0, pitch_rad: 0 } as FlightState);
publishInput(); updateSessionUI(); requestAnimationFrame(animate);
addEventListener('pagehide', () => { mapDisposed = true; practiceMap?.dispose(); session.dispose(); controlSettingsPanel.dispose(); pressureAltimeter.dispose(); reviewControls.dispose(); flightTrace.clear(); scene?.dispose(); });
void sceneReady;
