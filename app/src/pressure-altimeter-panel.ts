import type { FlightState } from './types';
import './pressure-altimeter-panel.css';

interface PressureAltimeterOptions {
  container: HTMLElement;
  onSetting: (setting_pa: number) => void;
  onOpen: () => void;
  onClose: () => void;
}

type DisplayUnit = 'hPa' | 'inHg';
const PA_PER_INHG = 3386.389;
// Practice UI bounds, not the limits of a sourced aircraft instrument.
const MIN_SETTING_PA = 80_000;
const MAX_SETTING_PA = 110_000;
const STANDARD_PA = 101_325;
const METRES_PER_FOOT = 0.3048;

interface Indication {
  p_static_pa: number;
  altimeter_setting_pa: number;
  altimeter_indicated_m: number;
  altimeter_qnh_pa: number;
  altimeter_qfe_pa: number;
  altimeter_qfe_datum_m: number;
}

function indication(state: Readonly<FlightState> | null): Indication | null {
  if (!state) return null;
  const value = state as Readonly<FlightState> & Partial<Indication>;
  const fields = [value.p_static_pa, value.altimeter_setting_pa, value.altimeter_indicated_m,
    value.altimeter_qnh_pa, value.altimeter_qfe_pa, value.altimeter_qfe_datum_m];
  if (!fields.every(field => typeof field === 'number' && Number.isFinite(field))
    || !(value.p_static_pa! > 0) || !(value.altimeter_qnh_pa! > 0) || !(value.altimeter_qfe_pa! > 0)
    || value.altimeter_setting_pa! < MIN_SETTING_PA || value.altimeter_setting_pa! > MAX_SETTING_PA) return null;
  return value as Indication;
}

function referenceLabel(value: Indication): string {
  const matches: string[] = [];
  if (Math.abs(value.altimeter_setting_pa - value.altimeter_qnh_pa) <= 1) matches.push('QNH');
  if (Math.abs(value.altimeter_setting_pa - value.altimeter_qfe_pa) <= 1) matches.push('Launch QFE');
  if (Math.abs(value.altimeter_setting_pa - STANDARD_PA) <= 1) matches.push('STD');
  return matches.length ? matches.join(' / ') : 'Custom pressure';
}

/** Renders worker-computed indications; changing a display unit never changes physics. */
export function createPressureAltimeterPanel(options: PressureAltimeterOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, readOnly?: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('pressure-altimeter');
  container.innerHTML = `
    <canvas id="altitude" width="300" height="300" role="img" aria-label="Pressure altimeter unavailable"></canvas>
    <div class="gauge-readout"><b id="altimeter-alt">—</b><span id="altimeter-reference">FT · PRESSURE ALTITUDE</span></div>
    <button type="button" id="altimeter-open" disabled aria-haspopup="dialog">Set pressure</button>
    <span class="altimeter-availability" id="altimeter-availability">Waiting for pressure data</span>
  `;
  const canvas = container.querySelector<HTMLCanvasElement>('#altitude')!;
  const ctx = canvas.getContext('2d');
  const altitude = container.querySelector<HTMLElement>('#altimeter-alt')!;
  const reference = container.querySelector<HTMLElement>('#altimeter-reference')!;
  const availability = container.querySelector<HTMLElement>('#altimeter-availability')!;
  const opener = container.querySelector<HTMLButtonElement>('#altimeter-open')!;
  const dialog = document.createElement('dialog');
  dialog.id = 'altimeter-dialog';
  dialog.className = 'altimeter-dialog';
  dialog.setAttribute('aria-labelledby', 'altimeter-title');
  dialog.setAttribute('aria-describedby', 'altimeter-description');
  dialog.innerHTML = `
    <span class="eyebrow">PRESSURE PRACTICE</span>
    <h2 id="altimeter-title">Altimeter setting</h2>
    <p id="altimeter-description">Flight is paused. Change the pressure and compare the indicated altitude.</p>
    <div class="altimeter-setting-row">
      <button type="button" id="altimeter-decrease" aria-label="Decrease altimeter setting">−</button>
      <div><label for="altimeter-setting">Pressure setting</label><input id="altimeter-setting" type="number" inputmode="decimal" autofocus required></div>
      <button type="button" id="altimeter-increase" aria-label="Increase altimeter setting">+</button>
      <div><label for="altimeter-unit">Display units</label><select id="altimeter-unit"><option value="hPa">hPa</option><option value="inHg">inHg</option></select></div>
    </div>
    <p class="altimeter-applied" id="altimeter-applied"></p>
    <p id="altimeter-indication" class="altimeter-indication" aria-live="polite"></p>
    <div class="altimeter-presets" aria-label="Practice pressure shortcuts">
      <button type="button" id="altimeter-qnh">Use QNH</button>
      <button type="button" id="altimeter-qfe">Use launch QFE</button>
      <button type="button" id="altimeter-std">Use standard</button>
    </div>
    <p class="altimeter-datum" id="altimeter-datum"></p>
    <p class="altimeter-note">These shortcuts set a pressure; they are practice aids, not aircraft mode switches. The 800–1100 hPa practice range is not a validated instrument limit. Ideal pressure indication; instrument errors and lag are not modeled.</p>
    <p id="altimeter-setting-status" role="status" aria-live="polite"></p>
    <button type="button" id="altimeter-close" class="primary">Done</button>
  `;
  // Keep the modal outside the instrument container's sizing and text styles.
  document.body.append(dialog);
  const input = dialog.querySelector<HTMLInputElement>('#altimeter-setting')!;
  const unitSelect = dialog.querySelector<HTMLSelectElement>('#altimeter-unit')!;
  const applied = dialog.querySelector<HTMLElement>('#altimeter-applied')!;
  const datum = dialog.querySelector<HTMLElement>('#altimeter-datum')!;
  const indicated = dialog.querySelector<HTMLElement>('#altimeter-indication')!;
  const status = dialog.querySelector<HTMLElement>('#altimeter-setting-status')!;
  const qnh = dialog.querySelector<HTMLButtonElement>('#altimeter-qnh')!;
  const qfe = dialog.querySelector<HTMLButtonElement>('#altimeter-qfe')!;
  const standard = dialog.querySelector<HTMLButtonElement>('#altimeter-std')!;
  let displayUnit: DisplayUnit = 'hPa';
  let latest: Indication | null = null;
  let reviewing = false, readOnly = false;
  let disposed = false;
  let requested_pa: number | null = null;
  let lastDial = '';

  const factor = () => displayUnit === 'hPa' ? 100 : PA_PER_INHG;
  const pressureText = (pressure_pa: number) => `${(pressure_pa / factor()).toFixed(2)} ${displayUnit}`;

  function refreshInput(): void {
    input.min = String(MIN_SETTING_PA / factor());
    input.max = String(MAX_SETTING_PA / factor());
    // Arbitrary decimal settings, including 1013.25, remain valid; +/- supplies a useful step.
    input.step = 'any';
    const pressure_pa = requested_pa ?? latest?.altimeter_setting_pa;
    if (pressure_pa !== undefined) input.value = (pressure_pa / factor()).toFixed(displayUnit === 'hPa' ? 2 : 5);
    input.setCustomValidity('');
  }

  function draw(): void {
    const pressure = latest ? pressureText(latest.altimeter_setting_pa) : 'NO PRESSURE';
    const altitude_ft = latest ? latest.altimeter_indicated_m / METRES_PER_FOOT : null;
    const key = `${altitude_ft?.toFixed(1)}:${pressure}`;
    if (!ctx || key === lastDial) return;
    lastDial = key;
    ctx.clearRect(0, 0, 300, 300);
    ctx.save(); ctx.translate(150, 150);
    ctx.beginPath(); ctx.arc(0, 0, 137, 0, Math.PI * 2);
    ctx.fillStyle = '#10191d'; ctx.fill();
    ctx.strokeStyle = '#4b575b'; ctx.lineWidth = 2; ctx.stroke();
    for (let tick = 0; tick < 50; tick++) {
      const angle = tick / 50 * Math.PI * 2 - Math.PI / 2;
      const major = tick % 5 === 0;
      ctx.save(); ctx.rotate(angle); ctx.beginPath();
      ctx.moveTo(major ? 102 : 114, 0); ctx.lineTo(125, 0);
      ctx.strokeStyle = major ? '#e8e9de' : '#74858b';
      ctx.lineWidth = major ? 3 : 1.5; ctx.stroke(); ctx.restore();
      if (major) {
        ctx.fillStyle = '#e8e9de'; ctx.font = '22px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(tick / 5), Math.cos(angle) * 84, Math.sin(angle) * 84);
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#a8b9bf';
    ctx.fillText('ALT', 0, -43); ctx.font = '10px sans-serif'; ctx.fillText('FEET', 0, 34);
    ctx.fillStyle = '#030c11'; ctx.fillRect(-58, 49, 116, 27);
    ctx.strokeStyle = '#63797f'; ctx.lineWidth = 1; ctx.strokeRect(-58, 49, 116, 27);
    ctx.fillStyle = '#e9d5b0'; ctx.font = latest ? '15px monospace' : '11px monospace';
    ctx.fillText(pressure, 0, 63);
    if (altitude_ft !== null) {
      const hand = (period_ft: number, length: number, width: number, color: string) => {
        ctx.save(); ctx.rotate(altitude_ft / period_ft * Math.PI * 2);
        ctx.beginPath(); ctx.moveTo(-width, 16); ctx.lineTo(-width, -length + 12);
        ctx.lineTo(0, -length); ctx.lineTo(width, -length + 12); ctx.lineTo(width, 16);
        ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
      };
      // Conventional three-pointer reading: 100s, 1,000s and 10,000s of feet.
      hand(100_000, 116, 2, '#a6b6bc');
      hand(10_000, 65, 6, '#e8e9de');
      hand(1_000, 108, 3, '#f0c889');
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#d4d6cc'; ctx.fill();
    }
    ctx.restore();
  }

  function render(): void {
    opener.disabled = !latest || reviewing || readOnly;
    const label = latest ? referenceLabel(latest) : 'Pressure unavailable';
    const altitude_ft = latest ? latest.altimeter_indicated_m / METRES_PER_FOOT : null;
    altitude.textContent = altitude_ft === null ? '—' : (Math.round(altitude_ft) || 0).toLocaleString('en-US');
    reference.textContent = `FT · ${reviewing ? 'RECORDED · ' : ''}${label.toUpperCase()}`;
    opener.textContent = latest ? pressureText(latest.altimeter_setting_pa) : 'Set pressure';
    availability.hidden = !!latest;
    availability.textContent = 'Pressure unavailable · check supported range or rebuild engine';
    canvas.setAttribute('aria-label', latest
      ? `Pressure altimeter: ${Math.round(altitude_ft!)} feet, ${pressureText(latest.altimeter_setting_pa)}, ${label}${reviewing ? ', recorded' : ''}`
      : 'Pressure altimeter unavailable; check supported range or rebuild engine');
    for (const control of [input, unitSelect, qnh, qfe, standard,
      dialog.querySelector<HTMLButtonElement>('#altimeter-decrease')!,
      dialog.querySelector<HTMLButtonElement>('#altimeter-increase')!]) control.disabled = !latest || reviewing || readOnly;
    if (latest) {
      applied.textContent = `Applied: ${pressureText(latest.altimeter_setting_pa)} · ${label}`;
      indicated.textContent = `${(Math.round(altitude_ft!) || 0).toLocaleString('en-US')} ft indicated`;
      qnh.textContent = `Use QNH · ${pressureText(latest.altimeter_qnh_pa)}`;
      qfe.textContent = `Use launch QFE · ${pressureText(latest.altimeter_qfe_pa)}`;
      standard.textContent = `Use standard · ${pressureText(STANDARD_PA)}`;
      datum.textContent = `Launch-point QFE · not airport elevation. Its zero is the launch point at ${Math.round(latest.altimeter_qfe_datum_m / METRES_PER_FOOT).toLocaleString('en-US')} ft in the study datum.`;
      if (Math.abs(latest.altimeter_qnh_pa - STANDARD_PA) <= 1) datum.textContent += ' QNH and standard pressure coincide in this atmosphere fixture.';
    }
    draw();
  }

  function request(pressure_pa: number): void {
    if (!latest || reviewing || readOnly || disposed) return;
    if (!Number.isFinite(pressure_pa) || pressure_pa < MIN_SETTING_PA || pressure_pa > MAX_SETTING_PA) {
      input.setCustomValidity(`Enter a pressure between ${pressureText(MIN_SETTING_PA)} and ${pressureText(MAX_SETTING_PA)}.`);
      input.reportValidity(); return;
    }
    input.setCustomValidity('');
    requested_pa = pressure_pa;
    status.textContent = 'Applying pressure setting…';
    refreshInput();
    options.onSetting(pressure_pa);
  }

  function open(): void {
    if (!latest || reviewing || readOnly || disposed || dialog.open) return;
    options.onOpen();
    refreshInput(); render();
    dialog.showModal();
  }
  function close(): void { if (!disposed) options.onClose(); }
  function changeInput(): void { request(input.valueAsNumber * factor()); }
  function changeUnits(): void {
    displayUnit = unitSelect.value === 'inHg' ? 'inHg' : 'hPa';
    refreshInput(); render();
  }
  function click(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (target.id === 'altimeter-close') { dialog.close(); return; }
    if (!latest || reviewing || readOnly) return;
    if (target.id === 'altimeter-qnh') request(latest.altimeter_qnh_pa);
    if (target.id === 'altimeter-qfe') request(latest.altimeter_qfe_pa);
    if (target.id === 'altimeter-std') request(STANDARD_PA);
    if (target.id === 'altimeter-decrease' || target.id === 'altimeter-increase') {
      const direction = target.id === 'altimeter-increase' ? 1 : -1;
      const step_pa = displayUnit === 'hPa' ? 100 : PA_PER_INHG * 0.01;
      request(Math.max(MIN_SETTING_PA, Math.min(MAX_SETTING_PA,
        (requested_pa ?? latest.altimeter_setting_pa) + direction * step_pa)));
    }
  }

  opener.addEventListener('click', open);
  input.addEventListener('change', changeInput);
  unitSelect.addEventListener('change', changeUnits);
  dialog.addEventListener('click', click);
  dialog.addEventListener('close', close);
  render();

  return {
    update(state, inReview, locked = false) {
      if (disposed) return;
      const wasReviewing = reviewing;
      latest = indication(state); reviewing = inReview; readOnly = locked;
      if (reviewing || readOnly || !latest) {
        requested_pa = null;
        if (dialog.open) dialog.close();
      }
      if (requested_pa !== null && latest && Math.abs(requested_pa - latest.altimeter_setting_pa) <= 0.01) {
        requested_pa = null; status.textContent = 'Pressure setting applied.';
      }
      if (requested_pa === null && document.activeElement !== input) refreshInput();
      if (wasReviewing !== reviewing) status.textContent = '';
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      opener.removeEventListener('click', open);
      input.removeEventListener('change', changeInput);
      unitSelect.removeEventListener('change', changeUnits);
      dialog.removeEventListener('click', click);
      dialog.removeEventListener('close', close);
      if (dialog.open) dialog.close();
      dialog.remove(); container.replaceChildren();
    },
  };
}
