import { GROUND_FIELDS, validGroundState, type FlightState } from './types';
import { flightPathGradient, MIN_HORIZONTAL_GROUNDSPEED_MPS } from './flight-path-gradient';
import './flight-path-ground.css';

interface FlightPathGroundOptions { container: HTMLElement; onClose: () => void }
const WHEELS = ['nose', 'left', 'right'] as const;
const KT_PER_MPS = 3600 / 1852;
const FPM_PER_MPS = 60 / .3048;

/** Read-only actual ground motion and model strut reactions; Review supplies its selected state. */
export function createFlightPathGroundPanel(options: FlightPathGroundOptions): {
  update(state: Readonly<FlightState> | null, recorded: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('flight-path-ground-panel');
  container.setAttribute('role', 'region'); container.setAttribute('aria-labelledby', 'flight-data-title');
  container.setAttribute('aria-describedby', 'flight-data-description'); container.tabIndex = 0;
  container.innerHTML = `
    <header class="flight-data-heading"><h2 id="flight-data-title">Flight path & ground reactions</h2><button id="flight-data-close" type="button" aria-label="Close flight data panel">×</button></header>
    <div class="flight-data-reference"><span id="flight-data-mode">LIVE</span><span>GROUND PATH · NOT ILS</span></div>
    <p id="flight-data-description" hidden>Flight-path percent is vertical climb speed divided by horizontal groundspeed, times 100: climb positive, descent negative. Below 1 m/s horizontal groundspeed the display is unavailable; that is a presentation threshold, not a flight limit. Wheel loads are model strut compression reactions, not full ground-force vectors or damage limits.</p>
    <section aria-label="Ground flight path"><div class="flight-path-reading"><output id="flight-path-percent">—</output><span id="flight-path-direction">UNAVAILABLE</span></div>
      <dl class="flight-path-motion"><div><dt>Horizontal GS</dt><dd><output id="flight-path-groundspeed">—</output> kt</dd></div><div><dt>Vertical speed</dt><dd><output id="flight-path-verticalspeed">—</output> ft/min</dd></div><div><dt>CG AGL</dt><dd><output id="flight-data-agl">—</output> m</dd></div></dl>
      <p id="flight-path-status">Ground velocity data unavailable</p>
    </section>
    <section aria-label="Model wheel strut reactions"><h3>Wheel reactions</h3><div class="flight-data-table-scroll"><table>
      <thead><tr><th scope="col">Wheel / contact</th><th scope="col">Strut load<br>kN</th><th scope="col">Compression<br>mm</th><th scope="col">Slip<br>degrees</th></tr></thead>
      <tbody>${WHEELS.map(wheel => `<tr><th scope="row">${wheel.toUpperCase()} <output id="flight-data-${wheel}-contact">—</output></th><td><output id="flight-data-${wheel}-load">—</output></td><td><output id="flight-data-${wheel}-compression">—</output></td><td><output id="flight-data-${wheel}-slip">—</output></td></tr>`).join('')}</tbody>
    </table></div><p id="ground-data-status">Ground reaction data unavailable</p>
      <div class="flight-data-structure"><span>Structure contact</span><output id="flight-data-structure">—</output></div>
    </section>`;
  const element = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!;
  const close = element('flight-data-close');
  let disposed = false;
  function closePanel(): void { if (!disposed) options.onClose(); }
  function keydown(event: KeyboardEvent): void {
    // Keep native scrolling/close-button activation without issuing flight shortcuts.
    event.stopPropagation();
    if (event.code === 'Escape') { event.preventDefault(); closePanel(); }
  }
  function reading(id: string, value: number | null | undefined, digits: number, scale = 1): void {
    const output = element(id), converted = value === null || value === undefined ? NaN : value * scale;
    output.textContent = Number.isFinite(converted) ? converted.toFixed(digits) : '—';
    output.dataset.value = value !== null && value !== undefined && Number.isFinite(value) ? String(value) : '';
  }
  close.addEventListener('click', closePanel); container.addEventListener('keydown', keydown);
  function update(state: Readonly<FlightState> | null, recorded: boolean): void {
    if (disposed) return;
    container.dataset.recorded = String(recorded); container.dataset.step = state ? String(state.step) : '';
    element('flight-data-mode').textContent = recorded ? 'RECORDED' : 'LIVE';
    const gradient = flightPathGradient(state);
    container.dataset.gradientStatus = gradient.status;
    const percent = gradient.gradient_percent;
    element('flight-path-percent').textContent = percent === null ? '—' : `${percent > 0 ? '+' : ''}${percent.toFixed(1).replace('-0.0', '0.0')}%`;
    element('flight-path-percent').dataset.value = percent === null ? '' : String(percent);
    element('flight-path-direction').textContent = percent === null ? 'UNAVAILABLE' : percent > 0 ? 'CLIMB' : percent < 0 ? 'DESCENT' : 'LEVEL';
    reading('flight-path-groundspeed', gradient.horizontal_groundspeed_mps, 1, KT_PER_MPS);
    reading('flight-path-verticalspeed', gradient.vertical_speed_up_mps, 0, FPM_PER_MPS);
    element('flight-path-status').textContent = gradient.status === 'available' ? ''
      : gradient.status === 'low-groundspeed' ? `LOW GS < ${MIN_HORIZONTAL_GROUNDSPEED_MPS} m/s`
        : gradient.status === 'numerical-range' ? 'OUT OF RANGE' : 'INOP · VELOCITY';
    element('flight-path-status').title = 'Below 1 m/s horizontal groundspeed is unavailable by display policy; this does not change physics.';
    const available = !!state && GROUND_FIELDS.every(key => typeof state[key] === 'number' && Number.isFinite(state[key])) && validGroundState(state);
    container.dataset.groundAvailable = String(available);
    reading('flight-data-agl', available ? state!.ground_agl_m : null, 1);
    for (const wheel of WHEELS) {
      const contact = element(`flight-data-${wheel}-contact`);
      contact.textContent = available ? state![`gear_${wheel}_wow`] === 1 ? 'CONTACT' : 'AIR' : '—';
      contact.dataset.contact = available ? String(state![`gear_${wheel}_wow`]) : '';
      reading(`flight-data-${wheel}-load`, available ? state![`gear_${wheel}_load_n`] : null, 2, .001);
      reading(`flight-data-${wheel}-compression`, available ? state![`gear_${wheel}_compression_m`] : null, 1, 1000);
      reading(`flight-data-${wheel}-slip`, available ? state![`gear_${wheel}_slip_rad`] : null, 1, 180 / Math.PI);
    }
    const mask = available ? state!.structure_contact_mask! : null;
    element('flight-data-structure').textContent = mask === null ? '—' : [mask & 1 ? 'TAIL' : '', mask & 2 ? 'LEFT WINGTIP' : '', mask & 4 ? 'RIGHT WINGTIP' : ''].filter(Boolean).join(' · ') || 'NONE';
    element('ground-data-status').textContent = available ? '' : 'INOP · GROUND DATA';
  }
  update(null, false);
  return { update, dispose() { if (disposed) return; disposed = true; close.removeEventListener('click', closePanel);
    container.removeEventListener('keydown', keydown); container.replaceChildren(); } };
}
