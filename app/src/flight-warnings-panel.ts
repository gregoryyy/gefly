import type { FlightWarnings, FlightWarningStatus } from './flight-warnings';
import './flight-warnings-panel.css';

interface FlightWarningsPanelOptions { container: HTMLElement }

/** Read-only annunciators; audio and flight-state authority remain elsewhere. */
export function createFlightWarningsPanel({ container }: FlightWarningsPanelOptions): {
  update(warnings: Readonly<FlightWarnings>, reviewing: boolean): void;
  dispose(): void;
} {
  container.classList.add('flight-warnings-panel');
  container.hidden = true;
  container.setAttribute('aria-label', 'Flight warnings, simulator cues');
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  const lights = (['STALL', 'TERRAIN'] as const).map(label => {
    const element = document.createElement('span');
    element.className = 'flight-warning-light';
    element.hidden = true;
    element.dataset.warning = label.toLowerCase();
    element.dataset.status = 'unavailable'; element.textContent = `${label} —`;
    element.setAttribute('aria-label', `${label.toLowerCase()} unavailable`);
    container.append(element); return element;
  });
  const recorded = document.createElement('small');
  recorded.className = 'flight-warning-recorded'; recorded.textContent = 'REVIEW'; recorded.hidden = true;
  recorded.title = 'Cues recomputed from recorded state, not recorded warning history.';
  container.append(recorded);
  let disposed = false, lastReview: boolean | undefined;

  function render(element: HTMLElement, label: string, status: FlightWarningStatus, title: string): void {
    if (element.dataset.status !== status) {
      element.dataset.status = status;
      element.hidden = status !== 'active';
      element.textContent = `${label}${status === 'unavailable' ? ' —' : status === 'active' ? ' !' : ''}`;
      element.setAttribute('aria-label', `${label.toLowerCase()} ${status}`);
    }
    if (element.title !== title) element.title = title;
  }

  return {
    update(warnings, reviewing) {
      if (disposed) return;
      if (lastReview !== reviewing) {
        lastReview = reviewing; recorded.hidden = !reviewing; container.dataset.review = String(reviewing);
        container.setAttribute('aria-label', reviewing
          ? 'Flight warnings recomputed from recorded state, simulator cues' : 'Flight warnings, simulator cues');
      }
      render(lights[0], 'STALL', warnings.stall, warnings.stall === 'unavailable'
        ? 'Stall warning unavailable: native warning/contact data missing.'
        : 'Native model software stall warning; not an installed-aircraft calibration.');
      render(lights[1], 'TERRAIN', warnings.terrain, warnings.terrain === 'unavailable'
        ? 'Terrain cue unavailable: local AGL/contact data missing.'
        : 'Generic local terrain-closure cue: enters at or below 60 m AGL with at least 3 m/s closure and at most 10 s estimated local ground contact. No forward terrain or obstacle scan; not TAWS/EGPWS.');
      const active = warnings.stall === 'active' || warnings.terrain === 'active';
      container.hidden = !active;
      recorded.hidden = !reviewing || !active;
    },
    dispose() { if (!disposed) { disposed = true; container.replaceChildren(); } },
  };
}
