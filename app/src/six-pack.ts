import type { FlightState } from './types';
import './six-pack.css';

interface InstrumentState extends Readonly<FlightState> {
  cas_mps?: number;
  turn_rate_radps?: number;
  slip_ball_rad?: number;
}

const DEG = Math.PI / 180;
const KT_PER_MPS = 3600 / 1852;
const STANDARD_TURN_RADPS = 3 * DEG;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const headingDegrees = (heading_rad: number) => ((heading_rad / DEG) % 360 + 360) % 360;

/** Six display instruments driven by the selected worker/recorded state only. */
export function createSixPack(container: HTMLElement): {
  altimeterContainer: HTMLElement;
  update(state: Readonly<FlightState>, verticalSpeedFpm: number, reviewing: boolean): void;
  dispose(): void;
} {
  container.classList.add('six-pack');
  container.setAttribute('aria-label', 'Six primary flight instruments');
  container.innerHTML = `
    <div class="gauge six-pack-gauge" data-instrument="airspeed"><canvas id="airspeed" width="300" height="300" role="img" aria-label="Airspeed unavailable"></canvas><div class="gauge-readout"><b id="tas">—</b><span id="airspeed-kind">KT · AIRSPEED</span></div></div>
    <div class="gauge six-pack-gauge" data-instrument="attitude"><canvas id="attitude" width="300" height="300" role="img" aria-label="Attitude indicator unavailable"></canvas><div class="gauge-readout"><b id="bank">—</b><span>BANK · DEGREES</span></div></div>
    <div id="pressure-altimeter" class="gauge six-pack-gauge" data-instrument="altimeter"></div>
    <div class="gauge six-pack-gauge" data-instrument="turn"><canvas id="turn-coordinator" width="300" height="300" role="img" aria-label="Turn and slip indication unavailable"></canvas><div class="gauge-readout"><b id="turn-rate">—</b><span>TURN RATE · IDEAL</span></div></div>
    <div class="gauge six-pack-gauge" data-instrument="heading"><canvas id="heading-indicator" width="300" height="300" role="img" aria-label="True heading unavailable"></canvas><div class="gauge-readout"><b id="heading">—</b><span>HEADING · TRUE</span></div></div>
    <div class="gauge six-pack-gauge" data-instrument="vertical-speed"><canvas id="vertical-speed" width="300" height="300" role="img" aria-label="Vertical speed unavailable"></canvas><div class="gauge-readout"><b id="vsi">—</b><span id="vsi-kind">FT/MIN · DERIVED</span></div></div>
  `;
  const element = <T extends HTMLElement = HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;
  const altimeterContainer = element('pressure-altimeter');
  const canvases = ['airspeed', 'attitude', 'turn-coordinator', 'heading-indicator', 'vertical-speed']
    .map(id => element<HTMLCanvasElement>(id));
  const contexts = new Map(canvases.map(canvas => [canvas.id, canvas.getContext('2d')]));
  const cache = new Map<string, string>();
  let disposed = false;

  function paint(id: string, key: string, draw: (ctx: CanvasRenderingContext2D) => void): void {
    const ctx = contexts.get(id);
    if (!ctx || cache.get(id) === key || disposed) return;
    cache.set(id, key);
    ctx.clearRect(0, 0, 300, 300);
    ctx.save(); ctx.translate(150, 150);
    ctx.beginPath(); ctx.arc(0, 0, 139, 0, Math.PI * 2);
    ctx.fillStyle = '#060c10'; ctx.fill();
    ctx.strokeStyle = '#71818a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 132, 0, Math.PI * 2);
    ctx.fillStyle = '#111b21'; ctx.fill();
    ctx.strokeStyle = '#243943'; ctx.lineWidth = 2; ctx.stroke();
    draw(ctx);
    ctx.restore();
  }

  function text(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, size = 13, color = '#a9bbc3'): void {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`;
    ctx.fillText(label, x, y);
  }

  function pointer(ctx: CanvasRenderingContext2D, angle_rad: number, length = 108, width = 4): void {
    ctx.save(); ctx.rotate(angle_rad);
    ctx.beginPath(); ctx.moveTo(-18, -width); ctx.lineTo(length - 10, -width);
    ctx.lineTo(length, 0); ctx.lineTo(length - 10, width); ctx.lineTo(-18, width);
    ctx.closePath(); ctx.fillStyle = '#f0cd94'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#b9c7cb'; ctx.fill();
  }

  function airspeed(knots: number | null, kind: 'CAS' | 'TAS'): void {
    paint('airspeed', `${knots?.toFixed(1)}:${kind}`, ctx => {
      const start = -Math.PI * 1.25, span = Math.PI * 1.5;
      for (let speed = 0; speed <= 180; speed += 5) {
        const angle = start + speed / 180 * span;
        const major = speed % 20 === 0;
        ctx.save(); ctx.rotate(angle); ctx.beginPath();
        ctx.moveTo(major ? 103 : 113, 0); ctx.lineTo(124, 0);
        ctx.strokeStyle = major ? '#e6ece9' : '#6e858f'; ctx.lineWidth = major ? 2.5 : 1; ctx.stroke(); ctx.restore();
        if (major) text(ctx, String(speed), Math.cos(angle) * 82, Math.sin(angle) * 82, 18, '#e6ece9');
      }
      text(ctx, 'AIRSPEED', 0, -35, 14);
      text(ctx, kind === 'CAS' ? 'CALIBRATED' : 'TRUE', 0, -15, 10);
      text(ctx, 'KNOTS', 0, 49, 12);
      if (knots === null) text(ctx, 'UNAVAILABLE', 0, 13, 12, '#f0cd94');
      else pointer(ctx, start + clamp(knots, 0, 180) / 180 * span);
    });
  }

  function attitude(roll_rad: number, pitch_rad: number): void {
    paint('attitude', `${roll_rad.toFixed(4)}:${pitch_rad.toFixed(4)}`, ctx => {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 128, 0, Math.PI * 2); ctx.clip();
      ctx.save(); ctx.rotate(-roll_rad); ctx.translate(0, pitch_rad / DEG * 3);
      ctx.fillStyle = '#7fbed4'; ctx.fillRect(-450, -700, 900, 700);
      ctx.fillStyle = '#8c6c46'; ctx.fillRect(-450, 0, 900, 700);
      ctx.strokeStyle = '#f5f0dc'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-450, 0); ctx.lineTo(450, 0); ctx.stroke();
      for (let degrees = -30; degrees <= 30; degrees += 5) {
        if (!degrees) continue;
        const y = -degrees * 3, major = degrees % 10 === 0;
        ctx.beginPath(); ctx.moveTo(major ? -28 : -14, y); ctx.lineTo(major ? 28 : 14, y);
        ctx.lineWidth = major ? 2 : 1; ctx.stroke();
        if (major) { text(ctx, String(Math.abs(degrees)), -44, y, 12, '#fff8dd'); text(ctx, String(Math.abs(degrees)), 44, y, 12, '#fff8dd'); }
      }
      ctx.restore(); ctx.restore();
      for (const degrees of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
        const angle = degrees * DEG - Math.PI / 2;
        const major = degrees % 30 === 0;
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * (major ? 105 : 111), Math.sin(angle) * (major ? 105 : 111));
        ctx.lineTo(Math.cos(angle) * 122, Math.sin(angle) * 122);
        ctx.strokeStyle = '#f6edda'; ctx.lineWidth = major ? 3 : 1.5; ctx.stroke();
      }
      ctx.save(); ctx.rotate(-roll_rad); ctx.beginPath(); ctx.moveTo(0, -101); ctx.lineTo(-7, -89); ctx.lineTo(7, -89); ctx.closePath(); ctx.fillStyle = '#f0cd94'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#efc580'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-79, 0); ctx.lineTo(-28, 0); ctx.lineTo(-21, 10);
      ctx.moveTo(79, 0); ctx.lineTo(28, 0); ctx.lineTo(21, 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#efc580'; ctx.fill();
    });
  }

  function turn(rate_radps: number | null, ball_rad: number | null): void {
    paint('turn-coordinator', `${rate_radps?.toFixed(4)}:${ball_rad?.toFixed(4)}`, ctx => {
      text(ctx, 'TURN / SLIP', 0, -94, 14);
      text(ctx, 'L', -92, -43, 20, '#e6ece9'); text(ctx, 'R', 92, -43, 20, '#e6ece9');
      text(ctx, '3°/s', -91, 17, 12); text(ctx, '3°/s', 91, 17, 12);
      for (const direction of [-1, 1]) {
        ctx.save(); ctx.rotate(direction * 20 * DEG);
        ctx.beginPath(); ctx.moveTo(direction * 83, -8); ctx.lineTo(direction * 103, -8);
        ctx.strokeStyle = '#e8e9de'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      }
      if (rate_radps !== null) {
        ctx.save(); ctx.rotate(clamp(rate_radps / STANDARD_TURN_RADPS, -2, 2) * 20 * DEG);
        ctx.strokeStyle = '#e9d4aa'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-68, -8); ctx.lineTo(68, -8); ctx.moveTo(0, -21); ctx.lineTo(0, 19); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -8, 9, 0, Math.PI * 2); ctx.fillStyle = '#ebd8b5'; ctx.fill(); ctx.restore();
      } else text(ctx, 'NO TURN DATA', 0, -8, 13, '#f0cd94');
      // The tube is a display of the worker's ideal apparent-force ball angle.
      ctx.beginPath(); ctx.moveTo(-67, 54); ctx.quadraticCurveTo(0, 79, 67, 54);
      ctx.strokeStyle = '#80959d'; ctx.lineWidth = 25; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-67, 54); ctx.quadraticCurveTo(0, 79, 67, 54);
      ctx.strokeStyle = '#dce1d9'; ctx.lineWidth = 19; ctx.stroke();
      for (const x of [-12, 12]) { ctx.beginPath(); ctx.moveTo(x, 54); ctx.lineTo(x, 77); ctx.strokeStyle = '#243039'; ctx.lineWidth = 2; ctx.stroke(); }
      if (ball_rad !== null) {
        const x = clamp(Math.sin(ball_rad) * 160, -58, 58), y = 66.5 - x * x / 370;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = '#14232b'; ctx.fill();
      } else text(ctx, '×', 0, 66, 16, '#8e5f35');
      text(ctx, 'IDEAL INDICATION', 0, 105, 10);
    });
  }

  function heading(heading_deg: number): void {
    paint('heading-indicator', heading_deg.toFixed(1), ctx => {
      for (let mark = 0; mark < 360; mark += 5) {
        const angle = (mark - heading_deg) * DEG - Math.PI / 2;
        const major = mark % 30 === 0;
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * (major ? 102 : 113), Math.sin(angle) * (major ? 102 : 113));
        ctx.lineTo(Math.cos(angle) * 124, Math.sin(angle) * 124);
        ctx.strokeStyle = '#e8ece7'; ctx.lineWidth = major ? 2.5 : 1; ctx.stroke();
        if (major) {
          const label = ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' } as Record<number, string>)[mark] ?? String(mark / 10);
          ctx.save(); ctx.rotate(angle + Math.PI / 2);
          text(ctx, label, 0, -83, mark % 90 === 0 ? 22 : 18, '#e8ece7'); ctx.restore();
        }
      }
      ctx.beginPath(); ctx.moveTo(0, -129); ctx.lineTo(-8, -112); ctx.lineTo(8, -112); ctx.closePath(); ctx.fillStyle = '#efc580'; ctx.fill();
      ctx.strokeStyle = '#d2d8d5'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(0, 43); ctx.moveTo(-43, 1); ctx.lineTo(43, 1); ctx.moveTo(-19, 35); ctx.lineTo(19, 35); ctx.stroke();
      text(ctx, 'TRUE', 0, 63, 10, '#a3b7c2');
    });
  }

  function verticalSpeed(feet_per_minute: number | null): void {
    paint('vertical-speed', feet_per_minute?.toFixed(0) ?? 'unavailable', ctx => {
      for (let rate = -2000; rate <= 2000; rate += 100) {
        const angle = Math.PI + rate / 2000 * Math.PI * 5 / 6;
        const major = rate % 500 === 0;
        ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(major ? 104 : 114, 0); ctx.lineTo(124, 0);
        ctx.strokeStyle = major ? '#e8ece7' : '#718891'; ctx.lineWidth = major ? 2.5 : 1; ctx.stroke(); ctx.restore();
        if (major) text(ctx, String(Math.abs(rate / 100)), Math.cos(angle) * 82, Math.sin(angle) * 82, 19, '#e8ece7');
      }
      text(ctx, 'VERTICAL', 4, -26, 13); text(ctx, 'SPEED', 4, -8, 13);
      text(ctx, '100 FT/MIN', 4, 36, 11); text(ctx, 'UP', -43, -48, 10); text(ctx, 'DN', -43, 48, 10);
      if (feet_per_minute !== null) pointer(ctx, Math.PI + clamp(feet_per_minute, -2000, 2000) / 2000 * Math.PI * 5 / 6);
      else text(ctx, 'UNAVAILABLE', 0, 67, 11, '#f0cd94');
    });
  }

  // Empty flags remain until the first state, rather than displaying invented values.
  airspeed(null, 'TAS'); turn(null, null); verticalSpeed(null);

  return {
    altimeterContainer,
    update(state, verticalSpeedFpm, reviewing) {
      if (disposed) return;
      const value = state as InstrumentState;
      const hasCas = finite(value.cas_mps) && value.cas_mps >= 0;
      const knots = (hasCas ? value.cas_mps! : state.tas_mps) * KT_PER_MPS;
      const kind = hasCas ? 'CAS' : 'TAS';
      const heading_deg = headingDegrees(state.heading_rad);
      const turn_radps = finite(value.turn_rate_radps) ? value.turn_rate_radps : null;
      const ball_rad = finite(value.slip_ball_rad) ? value.slip_ball_rad : null;
      const vsi_fpm = finite(verticalSpeedFpm) ? verticalSpeedFpm : null;
      const prefix = reviewing ? 'Recorded ' : '';
      const heading_text = `${String(Math.round(heading_deg) % 360).padStart(3, '0')}°`;
      element('tas').textContent = knots.toFixed(0);
      element('airspeed-kind').textContent = hasCas ? 'KT · IDEAL CAS' : 'KT · TAS, NOT IAS';
      element('bank').textContent = `${Math.abs(state.roll_rad / DEG).toFixed(0)}°`;
      element('heading').textContent = heading_text;
      element('vsi').textContent = vsi_fpm === null ? '—' : `${vsi_fpm >= 0 ? '+' : ''}${Math.round(vsi_fpm / 10) * 10}`;
      element('vsi-kind').textContent = vsi_fpm !== null && Math.abs(vsi_fpm) > 2000 ? 'FT/MIN · OFF SCALE' : 'FT/MIN · DERIVED';
      element('turn-rate').textContent = turn_radps === null ? '—' : `${turn_radps < 0 ? 'L' : turn_radps > 0 ? 'R' : '—'} ${Math.abs(turn_radps / DEG).toFixed(1)}°/s`;
      element<HTMLCanvasElement>('airspeed').setAttribute('aria-label', `${prefix}${kind === 'CAS' ? 'Ideal calibrated' : 'True'} airspeed ${Math.round(knots)} knots${hasCas ? ', not an installation-calibrated IAS instrument' : ', not IAS'}`);
      element<HTMLCanvasElement>('attitude').setAttribute('aria-label', `${prefix}Attitude: bank ${(state.roll_rad / DEG).toFixed(1)} degrees, pitch ${(state.pitch_rad / DEG).toFixed(1)} degrees`);
      element<HTMLCanvasElement>('heading-indicator').setAttribute('aria-label', `${prefix}True heading ${heading_text}`);
      element<HTMLCanvasElement>('vertical-speed').setAttribute('aria-label', vsi_fpm === null ? 'Vertical speed unavailable' : `${prefix}Vertical speed ${Math.round(vsi_fpm)} feet per minute${Math.abs(vsi_fpm) > 2000 ? ', needle off scale' : ''}`);
      element<HTMLCanvasElement>('turn-coordinator').setAttribute('aria-label', turn_radps === null ? 'Turn rate unavailable' : `${prefix}Ideal turn rate ${(turn_radps / DEG).toFixed(1)} degrees per second; ${ball_rad === null ? 'slip unavailable' : `apparent-force ball angle ${(ball_rad / DEG).toFixed(1)} degrees`}`);
      airspeed(knots, kind); attitude(state.roll_rad, state.pitch_rad); turn(turn_radps, ball_rad); heading(heading_deg); verticalSpeed(vsi_fpm);
    },
    dispose() {
      if (disposed) return;
      disposed = true; cache.clear(); contexts.clear(); container.replaceChildren();
    },
  };
}
