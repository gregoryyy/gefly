import type { PracticeEvent, PracticeProgress } from './runway-practice';
import './runway-practice-panel.css';

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
  update(progress: PracticeProgress | null, runway: '08' | '26' | null, reviewing: boolean): void;
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
  body.append(objective, setup, environment, limitations, status, note, log);
  element.append(summary, body);
  let renderedEvents = '';
  return {
    element,
    update(progress, runway, reviewing) {
      element.hidden = runway === null;
      if (runway === null) return;
      title.textContent = `EDFE ${runway} · ${runway === '26' ? 'Right' : 'Left'}-hand north circuit`;
      badge.textContent = reviewing ? 'REVIEW · read only' : 'PRACTICE';
      environment.textContent = reviewing
        ? 'Declared recording context; aircraft and weather provenance are not captured.'
        : 'Native no-wind baseline; no live weather or wet-runway simulation.';
      const phase = progress?.phase ?? 'waiting';
      status.dataset.phase = phase;
      const statusText = `${PHASE_LABELS[phase]} · ${reviewing ? 'recorded observations' : 'sensed, not assessed'}`;
      if (status.textContent !== statusText) status.textContent = statusText;
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
