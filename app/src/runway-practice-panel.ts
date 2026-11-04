import type { PracticeEvent, PracticeProgress } from './runway-practice';
import type { FlightState } from './types';
import { evaluatePracticeSetup } from './practice-setup';
import './runway-practice-panel.css';

let panelSequence = 0;
const SETUP_LABELS = { match: 'Match', different: 'Different', unavailable: 'Unavailable', unsupported: 'Unsupported' } as const;

const PHASE_LABELS: Record<PracticeProgress['phase'], string> = {
  waiting: 'Waiting for runway start',
  ground: 'On ground',
  airborne: 'Airborne',
  landed: 'Ground contact after flight',
  stopped: 'Stopped after landing',
  collision: 'Collision detected',
  unavailable: 'Contact telemetry unavailable',
};
const EVENT_LABELS: Record<PracticeEvent['kind'], string> = {
  liftoff: 'Lift-off', touchdown: 'Touchdown', stopped: 'Stopped after landing', collision: 'Collision',
};
function eventTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
function eventText(event: PracticeEvent): string {
  const values = [`${eventTime(event.t_s)} · ${EVENT_LABELS[event.kind]}`];
  if (typeof event.groundspeed_mps === 'number' && Number.isFinite(event.groundspeed_mps) && event.groundspeed_mps >= 0)
    values.push(`${(event.groundspeed_mps * 3600 / 1852).toFixed(1)} kt ground`);
  else values.push('GS —');
  if (event.kind === 'touchdown') {
    values.push(typeof event.vertical_speed_mps === 'number' && Number.isFinite(event.vertical_speed_mps)
      ? `${(-event.vertical_speed_mps).toFixed(1)} m/s down` : 'vertical —');
  }
  return values.join(' · ');
}

/** A source-scoped practice briefing and observed contact log, never a grader. */
export function createRunwayPracticePanel(): {
  element: HTMLDetailsElement;
  update(progress: PracticeProgress | null, runway: '08' | '26' | null, reviewing: boolean, state?: Readonly<FlightState> | null): void;
} {
  const element = document.createElement('details');
  element.className = 'runway-practice'; element.hidden = true;
  const summary = document.createElement('summary');
  const title = document.createElement('span'), badge = document.createElement('span');
  title.className = 'runway-practice-title'; badge.className = 'runway-practice-badge';
  summary.append(title, badge);
  const body = document.createElement('div'); body.className = 'runway-practice-body';
  const objective = document.createElement('p');
  objective.textContent = 'Objective: take off, fly the north circuit and return for a manual landing. No circuit height, route or speed is prescribed here.';
  const setup = document.createElement('p');
  setup.textContent = 'Start: at rest, engine idle, parking brake set. N releases the brake; 1–9 adds power. M opens the map; R opens Review.';
  const environment = document.createElement('p');
  environment.textContent = 'Native no-wind baseline; no live weather or wet-runway simulation.';
  const limitations = document.createElement('p'); limitations.className = 'runway-practice-limits';
  limitations.textContent = 'Generic 172P research model · approximate EDFE geometry. Not a validated 172S lesson or an operational route.';
  const status = document.createElement('p'); status.className = 'runway-practice-status';
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const note = document.createElement('p'); note.className = 'runway-practice-note';
  note.textContent = 'Sensed events only, not a checklist or grade. Times are simulation time from flight start; touchdown speed is the sampled contact speed.';
  const log = document.createElement('ol'); log.className = 'runway-practice-events';
  log.setAttribute('aria-label', 'Observed runway practice events');
  const tabs = document.createElement('div'); tabs.className = 'runway-practice-tabs';
  tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Runway practice information');
  const briefing = document.createElement('section');
  const setupPanel = document.createElement('section'); setupPanel.className = 'runway-practice-setup';
  const eventsPanel = document.createElement('section');
  briefing.append(objective, setup, environment, limitations);
  eventsPanel.append(note, log);
  const setupNote = document.createElement('p'); setupNote.className = 'runway-practice-note';
  setupNote.textContent = 'Sensed simulator start reference, not a complete POH checklist or grade. Changing settings during flight is expected. Paused native values update after resuming.';
  const setupSource = document.createElement('p'); setupSource.className = 'runway-practice-setup-source';
  const table = document.createElement('table'); table.setAttribute('aria-label', 'Sensed simulator start reference');
  const head = document.createElement('thead'); head.innerHTML = '<tr><th scope="col">Item</th><th scope="col">Sensed</th><th scope="col">Expected / observed</th></tr>';
  const rows = document.createElement('tbody'); table.append(head, rows);
  setupPanel.append(setupNote, setupSource, table);
  const panels = [briefing, setupPanel, eventsPanel], buttons: HTMLButtonElement[] = [];
  const prefix = `runway-practice-${++panelSequence}`;
  let recordedTabs = false;
  function selectTab(index: number, focus = false): void {
    buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = recordedTabs || i === index ? 0 : -1; panels[i].hidden = i !== index; });
    if (focus) buttons[index].focus();
  }
  ['Briefing', 'Setup', 'Events'].forEach((label, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.setAttribute('role', 'tab'); button.id = `${prefix}-tab-${index}`;
    button.setAttribute('aria-controls', `${prefix}-section-${index}`);
    const panel = panels[index]; panel.id = `${prefix}-section-${index}`; panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id); panel.tabIndex = 0;
    button.onclick = () => selectTab(index);
    button.onkeydown = event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3
        : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
      if (next === null) return;
      event.preventDefault(); event.stopPropagation(); selectTab(next, true);
    };
    buttons.push(button); tabs.append(button);
  });
  selectTab(0);
  body.append(status, tabs, ...panels);
  element.append(summary, body);
  let renderedEvents = '', renderedSetup = '';
  return {
    element,
    update(progress, runway, reviewing, state = null) {
      element.hidden = runway === null;
      if (runway === null) return;
      title.textContent = `EDFE ${runway} · ${runway === '26' ? 'Right' : 'Left'}-hand north circuit`;
      badge.textContent = reviewing ? 'REVIEW · read only' : 'PRACTICE';
      recordedTabs = reviewing;
      buttons.forEach(button => { button.tabIndex = reviewing || button.getAttribute('aria-selected') === 'true' ? 0 : -1; });
      environment.textContent = reviewing
        ? 'Declared recording context; aircraft and weather provenance are not captured.'
        : 'Native no-wind baseline; no live weather or wet-runway simulation.';
      const phase = progress?.phase ?? 'waiting';
      status.dataset.phase = phase;
      const statusText = `${PHASE_LABELS[phase]} · ${reviewing ? 'recorded observations' : 'sensed, not assessed'}`;
      if (status.textContent !== statusText) status.textContent = statusText;
      setupSource.textContent = reviewing ? 'REVIEW · selected recorded values · read only' : 'LIVE · latest sampled values';
      const checks = evaluatePracticeSetup(state), setupKey = JSON.stringify(checks);
      if (setupKey !== renderedSetup) {
        renderedSetup = setupKey;
        rows.replaceChildren(...checks.map(check => {
          const row = document.createElement('tr'); row.dataset.check = check.id; row.dataset.status = check.status;
          const label = document.createElement('th'); label.scope = 'row'; label.textContent = check.label;
          const result = document.createElement('td'); result.textContent = SETUP_LABELS[check.status];
          const values = document.createElement('td');
          values.textContent = `Expected: ${check.expected} · Observed: ${check.observed}`;
          row.append(label, result, values); return row;
        }));
      }
      const lines = progress?.events.slice(-20).map(eventText) ?? [];
      const key = JSON.stringify(lines);
      if (key !== renderedEvents) {
        renderedEvents = key;
        log.replaceChildren(...lines.map(text => {
          const item = document.createElement('li'); item.textContent = text; return item;
        }));
      }
      log.hidden = lines.length === 0;
    },
  };
}
