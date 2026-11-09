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
    element.dataset.status = 'unavailable'; element.textContent = `${label} N/A`;
    element.setAttribute('aria-label', `${label.toLowerCase()} unavailable`);
    container.append(element); return element;
  });
  const recorded = document.createElement('small');
  recorded.className = 'flight-warning-recorded'; recorded.textContent = 'REVIEW'; recorded.hidden = true;
  recorded.title = 'Cues recomputed from recorded state, not recorded warning history.';
  container.append(recorded);
  let disposed = false, lastReview: boolean | undefined, lastRecent: boolean | undefined;
  const frame = container.closest<HTMLElement>('.flight-app') ?? container.parentElement;
  const header = frame?.querySelector<HTMLElement>('.topbar');
  function place(): void {
    if (disposed || !frame || container.hidden) return;
    const bounds = frame.getBoundingClientRect();
    const headerBounds = header && !header.hidden ? header.getBoundingClientRect() : null;
    const desiredTop = headerBounds && headerBounds.height > 0 ? headerBounds.bottom - bounds.top + 8 : 12;
    const maximumTop = Math.max(0, bounds.height - container.getBoundingClientRect().height - 12);
    container.style.setProperty('--flight-warning-top', `${Math.max(0, Math.min(desiredTop, maximumTop))}px`);
  }
  const resize = new ResizeObserver(place);
  if (frame) resize.observe(frame);
  if (header) resize.observe(header);
  const visibility = new MutationObserver(place);
  if (header) visibility.observe(header, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', place);

  function render(element: HTMLElement, label: string, status: FlightWarningStatus, title: string): void {
    element.hidden = status === 'clear';
    if (element.dataset.status !== status) {
      element.dataset.status = status;
      element.textContent = `${label}${status === 'unavailable' ? ' N/A' : status === 'active' ? ' !' : ''}`;
      element.setAttribute('aria-label', `${label.toLowerCase()} ${status}`);
    }
    if (element.title !== title) element.title = title;
  }

  return {
    update(warnings, reviewing) {
      if (disposed) return;
      const recent = !reviewing && warnings.stall === 'active' && warnings.stallRecent === true;
      const changed = lastReview !== reviewing || lights[0].dataset.status !== warnings.stall
        || lights[1].dataset.status !== warnings.terrain || lastRecent !== recent;
      if (lastReview !== reviewing) {
        lastReview = reviewing; recorded.hidden = !reviewing; container.dataset.review = String(reviewing);
        container.setAttribute('aria-label', reviewing
          ? 'Flight warnings recomputed from recorded state, simulator cues' : 'Flight warnings, simulator cues');
      }
      render(lights[0], 'STALL', warnings.stall, warnings.stall === 'unavailable'
        ? 'Stall warning unavailable: native warning/contact data missing.'
        : warnings.stallRecent && !reviewing && warnings.stall === 'active'
          ? 'Recent genuine native stall-warning event; current signal is clear. Simulator presentation minimum, not an aircraft threshold.'
          : 'Native model software stall warning; not an installed-aircraft calibration.');
      if (lastRecent !== recent) {
        lastRecent = recent; lights[0].dataset.recent = String(recent);
        if (warnings.stall === 'active') {
          lights[0].textContent = recent ? 'RECENT STALL' : 'STALL !';
          lights[0].setAttribute('aria-label', recent ? 'Recent stall warning; current native signal clear' : 'stall active');
        }
      }
      render(lights[1], 'TERRAIN', warnings.terrain, warnings.terrain === 'unavailable'
        ? 'Terrain cue unavailable: local AGL/contact data missing.'
        : 'Generic local terrain-closure cue: enters at or below 60 m AGL with at least 3 m/s closure and at most 10 s estimated local ground contact. No forward terrain or obstacle scan; not TAWS/EGPWS.');
      const visible = warnings.stall !== 'clear' || warnings.terrain !== 'clear';
      container.hidden = !visible;
      recorded.hidden = !reviewing || !visible;
      if (changed) place();
    },
    dispose() {
      if (!disposed) {
        disposed = true; resize.disconnect(); visibility.disconnect();
        window.removeEventListener('resize', place); container.replaceChildren();
      }
    },
  };
}
