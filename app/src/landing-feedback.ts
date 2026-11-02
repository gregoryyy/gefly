import type { FlightState } from './types';

/** Actual generic-model ground reactions, with no invented damage thresholds. */
export function createLandingFeedback(container: HTMLElement): {
  update(state: Readonly<FlightState> | null, recorded: boolean): void;
  dispose(): void;
} {
  container.className = 'landing-feedback';
  container.setAttribute('aria-label', 'Landing gear reactions');
  container.innerHTML = `<strong>GROUND REACTIONS <span id="ground-mode"></span></strong>
    <p id="ground-motion"></p><div class="gear-loads"><span>WHEEL</span><span>LOAD</span><span>STRUT</span><span>SLIP</span>
    ${['nose', 'left', 'right'].map(wheel => `<b id="gear-${wheel}-contact">${wheel.toUpperCase()}</b><output id="gear-${wheel}-load">—</output><output id="gear-${wheel}-compression">—</output><output id="gear-${wheel}-slip">—</output>`).join('')}</div>
    <p id="ground-contact"></p><small>Flat ellipsoid · generic model · no damage limits</small>`;
  const element = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!;
  return {
    update(state, recorded) {
      const available = state?.ground_agl_m !== undefined;
      container.hidden = !available || state.ground_agl_m! > 50;
      if (!available) return;
      element('ground-mode').textContent = recorded ? 'RECORDED' : 'LIVE';
      element('ground-motion').textContent = `CG ${state.ground_agl_m!.toFixed(1)} m AGL · ↓ ${state.ground_down_mps!.toFixed(1)} m/s · side ${state.ground_side_mps!.toFixed(1)} m/s`;
      for (const wheel of ['nose', 'left', 'right'] as const) {
        const contact = state[`gear_${wheel}_wow`] === 1;
        element(`gear-${wheel}-contact`).classList.toggle('contact', contact);
        element(`gear-${wheel}-contact`).textContent = `${contact ? '●' : '○'} ${wheel.toUpperCase()}`;
        element(`gear-${wheel}-load`).textContent = `${(state[`gear_${wheel}_load_n`]! / 1000).toFixed(1)} kN`;
        element(`gear-${wheel}-compression`).textContent = `${(state[`gear_${wheel}_compression_m`]! * 1000).toFixed(0)} mm`;
        element(`gear-${wheel}-slip`).textContent = `${(state[`gear_${wheel}_slip_rad`]! * 180 / Math.PI).toFixed(1)}°`;
      }
      const mask = state.structure_contact_mask!;
      const contacts = [mask & 1 ? 'TAIL' : '', mask & 2 ? 'LEFT WINGTIP' : '', mask & 4 ? 'RIGHT WINGTIP' : ''].filter(Boolean);
      element('ground-contact').textContent = contacts.length ? `STRUCTURE CONTACT: ${contacts.join(', ')}` : 'Wheels, tyre friction and spring/damper forces';
      element('ground-contact').classList.toggle('structure-contact', !!mask);
    },
    dispose() { container.replaceChildren(); },
  };
}
