import { validCollisionState, type FlightState } from './types';
import './ground-collision-panel.css';

interface GroundCollisionPanelOptions {
  container: HTMLElement;
  onReview: () => void;
  onFlightMenu: () => void;
  onContinue: () => void;
}

const CONTACTS = [[1, 'Tail'], [2, 'Left wingtip'], [4, 'Right wingtip'],
  [8, 'Fuselage visual sample'], [16, 'Propeller visual sample'],
  [32, 'Fin visual sample'], [64, 'CG below ground']] as const;
const KT_PER_MPS = 3600 / 1852;

/** Presentation of the worker's latched event only; this panel never detects an impact. */
export function createGroundCollisionPanel(options: GroundCollisionPanelOptions): {
  update(state: Readonly<FlightState> | null, recorded: boolean, reviewAvailable: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('ground-collision-panel'); container.hidden = true;
  container.setAttribute('role', 'region'); container.setAttribute('aria-labelledby', 'collision-title');
  container.innerHTML = `<button id="collision-close" type="button" aria-label="Close collision panel and continue flight">×</button><h2 id="collision-title" role="status" aria-live="polite"></h2>
    <p id="collision-parts"></p>
    <dl class="collision-readings"><div><dt>First contact</dt><dd><output id="collision-time"></output> s</dd></div>
      <div><dt>Pre-impact down</dt><dd><output id="collision-down"></output> m/s</dd></div>
      <div><dt>Pre-impact GS</dt><dd><output id="collision-groundspeed"></output> kt</dd></div></dl>
    <div class="collision-actions"><button id="collision-continue" type="button" class="primary">Continue flight</button><button id="collision-review" type="button">Review flight</button><button id="collision-flight-menu" type="button">Flight menu</button></div>`;
  const element = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!;
  const review = element('collision-review') as HTMLButtonElement, menu = element('collision-flight-menu');
  const resume = element('collision-continue'), close = element('collision-close');
  let disposed = false, lastKey = '', dismissedKey = '', recordedFrame = false;
  const onReview = () => { if (!disposed && !review.disabled) options.onReview(); };
  const onMenu = () => { if (!disposed) options.onFlightMenu(); };
  // Preserve native button activation and Tab. Keyup can still release held flight keys.
  const onContinue = () => { if (!disposed && !recordedFrame) options.onContinue(); };
  const onClose = () => { if (disposed) return; if (recordedFrame) { dismissedKey = lastKey; container.hidden = true; } else onContinue(); };
  const isolateKeys = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } event.stopPropagation(); };
  review.addEventListener('click', onReview); menu.addEventListener('click', onMenu);
  resume.addEventListener('click', onContinue); close.addEventListener('click', onClose);
  container.addEventListener('keydown', isolateKeys);
  function reading(id: string, value: number, digits: number, scale = 1): void {
    const output = element(id); output.textContent = (value * scale).toFixed(digits);
    output.dataset.value = String(value);
  }
  return {
    update(state, recorded, reviewAvailable) {
      if (disposed) return;
      const mask = state?.collision_mask;
      const valid = !!state && typeof mask === 'number' && mask > 0 && validCollisionState(state);
      recordedFrame = recorded;
      if (!valid) { container.hidden = true; lastKey = dismissedKey = ''; return; }
      const key = `${mask}:${state!.collision_step}:${state!.collision_t_s}:${state!.collision_down_mps}:${state!.collision_groundspeed_mps}:${recorded}:${reviewAvailable}`;
      container.hidden = key === dismissedKey;
      if (key === lastKey) return;
      lastKey = key;
      container.dataset.recorded = String(recorded); container.dataset.collisionMask = String(mask);
      container.dataset.collisionStep = String(state!.collision_step);
      element('collision-title').textContent = recorded ? 'Recorded ground collision' : 'Ground collision · flight stopped';
      element('collision-parts').textContent = CONTACTS.filter(([bit]) => mask! & bit).map(([, label]) => label).join(' · ');
      reading('collision-time', state!.collision_t_s!, 2);
      reading('collision-down', state!.collision_down_mps!, 1);
      reading('collision-groundspeed', state!.collision_groundspeed_mps!, 1, KT_PER_MPS);
      review.disabled = recorded || !reviewAvailable;
      resume.hidden = recorded;
      close.setAttribute('aria-label', recorded ? 'Close recorded collision panel' : 'Close collision panel and continue flight');
    },
    dispose() {
      if (disposed) return;
      disposed = true; review.removeEventListener('click', onReview); menu.removeEventListener('click', onMenu);
      resume.removeEventListener('click', onContinue); close.removeEventListener('click', onClose);
      container.removeEventListener('keydown', isolateKeys); container.hidden = true; container.replaceChildren();
    },
  };
}
