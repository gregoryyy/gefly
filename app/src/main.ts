import './style.css';
import { createScene } from './scene';
import { createSession } from './session';
import type { Controls, FlightState, FlightScene } from './types';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
  <main class="flight-app">
    <div id="scene" aria-label="Flight scene"></div>
    <header class="topbar">
      <a class="brand" href="https://github.com/gregoryyy/gefly" target="_blank" rel="noreferrer"><span class="brand-mark">g.</span> gefly <span class="alpha">FLIGHT LAB</span></a>
      <div class="location"><span class="live-dot"></span> FRANKFURT / EGELSBACH <span class="muted">49.96° N · 8.64° E</span></div>
      <span class="model-label">JSBSim · c172x research model</span>
    </header>
    <section class="briefing" aria-label="Practice objective">
      <div class="eyebrow">FREE FLIGHT <span>01</span></div>
      <h1>A little room<br>to find your wings.</h1>
      <p>Start airborne. Hold a steady attitude,<br>then explore gentle turns.</p>
      <div class="session-status"><span id="status">Preparing flight…</span><span id="clock">00:00</span></div>
    </section>
    <nav class="view-controls" aria-label="Flight views">
      <button id="cockpit" class="selected" aria-pressed="true">Cockpit <kbd>V</kbd></button>
      <button id="chase" aria-pressed="false">Chase</button>
    </nav>
    <section id="notice" class="notice" role="status" aria-live="polite" hidden></section>
    <div class="crosshair" aria-hidden="true"><i></i><b></b><i></i></div>
    <aside class="controls-help">
      <span class="eyebrow">YOUR CONTROLS</span>
      <div><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><span>Pitch / roll</span></div>
      <div><kbd>A</kbd><kbd>D</kbd><span>Rudder</span><kbd>W</kbd><kbd>S</kbd><span>Throttle</span></div>
      <button id="pointer" aria-pressed="false">Enable touchpad stick</button>
      <label class="roll-offset" for="roll-offset">STUDY ROLL OFFSET <output id="offset-value">−0.109</output><input id="roll-offset" type="range" min="-0.25" max="0.25" step="0.001" value="-0.109375" aria-label="Experimental roll input offset"></label>
      <p id="stick-help">Move the pointer over the flight scene.<br>Center to neutral; leave to release.</p>
    </aside>
    <div id="stick" class="stick" hidden aria-hidden="true"><span></span></div>
    <section class="flight-deck" aria-label="Flight instruments">
      <div class="deck-heading"><span class="eyebrow">CLASSIC / EXPERIMENTAL</span><span>LIVE FLIGHT STATE <i class="live-dot"></i></span></div>
      <div class="instruments">
        <div class="gauge"><canvas id="airspeed" width="300" height="300" aria-label="True airspeed dial"></canvas><div class="gauge-readout"><b id="tas">—</b><span>KT · TRUE AIRSPEED</span></div></div>
        <div class="gauge attitude"><canvas id="attitude" width="300" height="300" aria-label="Attitude indicator"></canvas><div class="gauge-readout"><b id="bank">—</b><span>BANK · DEGREES</span></div></div>
        <div class="gauge"><canvas id="altitude" width="300" height="300" aria-label="Study geometric altitude dial"></canvas><div class="gauge-readout"><b id="alt">—</b><span>FT · STUDY ALTITUDE</span></div></div>
        <div class="flight-data"><div><span>HEADING · TRUE</span><b id="heading">—</b></div><div><span>VERTICAL SPEED</span><b id="vsi">—</b><small>FT / MIN · DERIVED</small></div></div>
        <div class="throttle-control"><label for="throttle">THROTTLE <b id="power">—</b></label><input id="throttle" type="range" min="0" max="100" value="69" aria-label="Throttle percentage"><span>IDLE <i></i> FULL</span><div class="axis-display">ROLL <b id="roll-control">0</b> · PITCH <b id="pitch-control">0</b></div></div>
        <div class="session-controls"><button id="pause" disabled>Pause <kbd>SPACE</kbd></button><button id="reset">Restart flight <kbd>R</kbd></button><span id="view-label">COCKPIT VIEW</span></div>
      </div>
      <footer><span>LOCAL RESEARCH PROTOTYPE · NOT VALIDATED FOR TRAINING</span><button id="limits" aria-expanded="false">Model & scenery limits ↗</button></footer>
      <div id="limitations" hidden>Generic JSBSim 172P research data, not the planned C172S. Procedural scenery and an illustrative runway near approximate EDFE coordinates; no real terrain, airport elevation or navigation data. TAS is not IAS. Altitude uses the study's uncorrected geometric datum, not a QNH/QFE pressure altimeter. No validated landing, circuit assessment, weather, radio or checklists yet. The adjustable study roll offset adds a constant aileron input to counter the generic model’s initial roll-off; this is an experimental assist, not an aircraft trim specification. Local research runtime assets are excluded from distribution.</div>
    </section>
  </main>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sceneContainer = el('scene');
sceneContainer.tabIndex = 0;
const focusFlight = () => sceneContainer.focus({ preventScroll: true });
let view: 'cockpit' | 'chase' = 'cockpit';
let ready = false, running = false, failed = false, pointerEnabled = false;
let scene: FlightScene | null = null;
let sceneFailed = false;
let latest: FlightState | null = null, previous: FlightState | null = null;
let verticalSpeedFpm = 0, throttle = 0.69, pointerX = 0, pointerY = 0;
// Existing E1 fixture's empirical input offset, not an aircraft coefficient.
let rollOffset = -0.109375;
const keys = new Set<string>();
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const editable = (target: EventTarget | null) => target instanceof HTMLElement && (!!target.closest('input,button,a,select,textarea') || target.isContentEditable);
const notice = (message: string) => { el('notice').textContent = message; el('notice').hidden = !message; };
const updatePause = () => { el('pause').innerHTML = `${running ? 'Pause' : 'Resume'} <kbd>SPACE</kbd>`; };
const sceneReady = createScene(sceneContainer).then(result => { scene = result; return true; }).catch((error: unknown) => {
  sceneFailed = true; notice(`Scene unavailable: ${error instanceof Error ? error.message : String(error)}. Reload with WebGL enabled.`);
  session.pause(); running = false; el<HTMLButtonElement>('pause').disabled = true; updatePause(); return false;
});

const session = createSession({
  onState(state) {
    if (previous && state.t_s > previous.t_s) {
      const dt = state.t_s - previous.t_s;
      const raw = (state.alt_msl_m - previous.alt_msl_m) / dt / 0.3048 * 60;
      const alpha = 1 - Math.exp(-dt / 0.5);
      verticalSpeedFpm += alpha * (raw - verticalSpeedFpm);
    }
    previous = state; latest = state;
  },
  onReady(trim) {
    ready = true; failed = false; throttle = trim.throttle;
    el<HTMLInputElement>('throttle').value = String(throttle * 100);
    el<HTMLButtonElement>('pause').disabled = false;
    notice(trim.status !== 1 ? 'Initial trim did not converge. Handling may be unstable; restart if needed.' : '');
    publishInput(); updatePause();
  },
  onStatus(message) { el('status').textContent = message; },
  onError(message) {
    failed = true; running = false; ready = false;
    el<HTMLButtonElement>('pause').disabled = true; updatePause();
    notice(`Flight stopped. ${message}`);
  },
});

function publishInput() {
  const controls: Controls = {
    elevator: clamp((keys.has('ArrowUp') ? 0.35 : 0) - (keys.has('ArrowDown') ? 0.35 : 0) + pointerY * 0.4, -1, 1),
    aileron: clamp((keys.has('ArrowRight') ? 0.45 : 0) - (keys.has('ArrowLeft') ? 0.45 : 0) + pointerX * 0.5 + rollOffset, -1, 1),
    rudder: (keys.has('KeyD') ? 0.35 : 0) - (keys.has('KeyA') ? 0.35 : 0), throttle,
  };
  session.input(controls);
  el('roll-control').textContent = controls.aileron.toFixed(2);
  el('pitch-control').textContent = controls.elevator.toFixed(2);
  el('power').textContent = `${Math.round(throttle * 100)}%`;
}
function neutralize() { keys.clear(); pointerX = pointerY = 0; el('stick').hidden = true; publishInput(); }
function pauseFlight() { neutralize(); running = false; session.pause(); updatePause(); }
function togglePause() {
  if (!ready || failed || sceneFailed) return;
  if (running) pauseFlight(); else { running = true; session.start(); updatePause(); }
}
function reset() {
  if (sceneFailed) { notice('The 3D scene is unavailable. Reload with WebGL enabled.'); return; }
  neutralize(); latest = previous = null; verticalSpeedFpm = 0; ready = false; failed = false;
  running = true; el<HTMLButtonElement>('pause').disabled = true; notice(''); session.reset(); session.start(); updatePause();
}
function setView(next: typeof view) {
  view = next;
  for (const name of ['cockpit', 'chase']) { el(name).classList.toggle('selected', name === view); el(name).setAttribute('aria-pressed', String(name === view)); }
  el('view-label').textContent = `${view.toUpperCase()} VIEW`;
}
el('pause').onclick = () => { togglePause(); focusFlight(); };
el('reset').onclick = () => { reset(); focusFlight(); };
el('cockpit').onclick = () => { setView('cockpit'); focusFlight(); };
el('chase').onclick = () => { setView('chase'); focusFlight(); };
el('pointer').onclick = () => {
  pointerEnabled = !pointerEnabled; neutralize();
  el('pointer').setAttribute('aria-pressed', String(pointerEnabled));
  el('pointer').textContent = pointerEnabled ? 'Disable touchpad stick' : 'Enable touchpad stick';
  el('stick-help').classList.toggle('visible', pointerEnabled); focusFlight();
};
el<HTMLInputElement>('throttle').oninput = (event) => { throttle = Number((event.target as HTMLInputElement).value) / 100; publishInput(); };
el<HTMLInputElement>('roll-offset').oninput = (event) => {
  rollOffset = Number((event.target as HTMLInputElement).value); el('offset-value').textContent = rollOffset.toFixed(3); publishInput();
};
el('limits').onclick = () => { const expanded = el('limitations').hidden; el('limitations').hidden = !expanded; el('limits').setAttribute('aria-expanded', String(expanded)); };
const flightKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyA','KeyD','KeyW','KeyS']);
addEventListener('keydown', (event) => {
  if ((event.target instanceof HTMLElement && event.target.closest('input,select,textarea,[contenteditable=true]')) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space' && editable(event.target)) return;
  if (flightKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); publishInput(); }
  if (event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
  if (event.code === 'KeyR') reset();
  if (event.code === 'KeyV') setView(view === 'cockpit' ? 'chase' : 'cockpit');
});
addEventListener('keyup', (event) => { if (keys.delete(event.code)) { event.preventDefault(); publishInput(); } });
addEventListener('blur', pauseFlight);
addEventListener('focusin', (event) => { if (editable(event.target)) neutralize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFlight(); });
sceneContainer.addEventListener('pointermove', (event) => {
  if (!pointerEnabled || !running) return;
  const rect = sceneContainer.getBoundingClientRect();
  pointerX = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width * 0.3), -1, 1);
  pointerY = clamp((rect.top + rect.height / 2 - event.clientY) / (rect.height * 0.3), -1, 1);
  el('stick').hidden = false; el('stick').style.left = `${event.clientX}px`; el('stick').style.top = `${event.clientY}px`;
  publishInput();
});
sceneContainer.addEventListener('pointerleave', () => { pointerX = pointerY = 0; el('stick').hidden = true; publishInput(); });

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
  const dt=clamp((now-lastFrame)/1000,0,0.1);lastFrame=now;
  if(running && (keys.has('KeyW') || keys.has('KeyS'))) {
    throttle=clamp(throttle+((keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0))*dt*0.25,0,1);
    el<HTMLInputElement>('throttle').value=String(throttle*100);publishInput();
  }
  if(latest) {
    const state=latest;
    if (scene && !sceneFailed) {
      try { scene.update(state,view); } catch {
        sceneFailed = true; pauseFlight(); el<HTMLButtonElement>('pause').disabled = true;
        notice('The 3D scene stopped rendering. Reload to restart.');
      }
    }
    const kt=state.tas_mps*3600/1852, ft=state.alt_msl_m/0.3048;
    const heading=((state.heading_rad*180/Math.PI)%360+360)%360;
    el('tas').textContent=kt.toFixed(0);el('alt').textContent=Math.round(ft).toLocaleString('en-US');
    el('heading').textContent=`${Math.round(heading)%360}°`;
    el('bank').textContent=`${Math.abs(state.roll_rad*180/Math.PI).toFixed(0)}°`;
    el('vsi').textContent=`${verticalSpeedFpm>=0?'+':''}${Math.round(verticalSpeedFpm/10)*10}`;
    el('clock').textContent=`${String(Math.floor(state.t_s/60)).padStart(2,'0')}:${String(Math.floor(state.t_s%60)).padStart(2,'0')}`;
    dial('airspeed',kt,180,'TRUE AIRSPEED','KNOTS · NOT IAS',20);
    dial('altitude',((ft%1000)+1000)%1000,1000,'ALTITUDE','FEET · MODULO 1000',100);
    attitude(state);
  }
  requestAnimationFrame(animate);
}
dial('airspeed',0,180,'TRUE AIRSPEED','KNOTS · NOT IAS',20);dial('altitude',0,1000,'ALTITUDE','STUDY DATUM',100);
attitude({roll_rad:0,pitch_rad:0} as FlightState);
publishInput();
void sceneReady.then(ok => { if (ok) { running = true; session.start(); updatePause(); } });
requestAnimationFrame(animate);
addEventListener('pagehide',()=>{session.dispose();scene?.dispose();});
