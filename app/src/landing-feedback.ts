import type { FlightState } from './types';
import { groundReactionView } from './cockpit-views';

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
      const view = groundReactionView(state, recorded);
      container.hidden = !view.visible;
      if (!view.visible) return;
      element('ground-mode').textContent = view.mode;
      element('ground-motion').textContent = view.motion;
      for (const wheel of view.wheels) {
        element(`gear-${wheel.wheel}-contact`).classList.toggle('contact', wheel.contact);
        element(`gear-${wheel.wheel}-contact`).textContent = wheel.label;
        element(`gear-${wheel.wheel}-load`).textContent = wheel.load;
        element(`gear-${wheel.wheel}-compression`).textContent = wheel.compression;
        element(`gear-${wheel.wheel}-slip`).textContent = wheel.slip;
      }
      element('ground-contact').textContent = view.contact;
      element('ground-contact').classList.toggle('structure-contact', view.structureContact);
    },
    dispose() { container.replaceChildren(); },
  };
}
