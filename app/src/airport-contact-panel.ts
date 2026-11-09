import { airportIdent, contactMessage, qnhActionState } from './airport-contact';
import type { AirportContact, ContactUpdate } from './airport-contact';
import './airport-contact-panel.css';

/** Full message time before it collapses to a one-line pill that keeps the QNH action. */
export const CONTACT_EXPANDED_MS = 10_000;

interface ContactPanelOptions {
  container: HTMLElement;
  /** Requests the explicit altimeter change; the caller re-checks its own guards. */
  onSetQnh: () => void;
  onDone: () => void;
}

/** Small, dismissible on-screen airport text near the radio stack; never modal, never voice. */
export function createAirportContactPanel(options: ContactPanelOptions) {
  const element = document.createElement('aside');
  element.className = 'airport-contact'; element.id = 'airport-contact'; element.hidden = true;
  element.setAttribute('aria-label', 'Simulated airport radio text');
  element.innerHTML = `
    <div class="airport-contact-text" role="status" aria-live="polite" aria-atomic="true">
      <strong class="airport-contact-title"></strong>
      <span class="airport-contact-detail"></span>
      <small class="airport-contact-note"></small>
    </div>
    <span class="airport-contact-compact" aria-hidden="true"></span>
    <button type="button" class="airport-contact-qnh"></button>
    <button type="button" class="airport-contact-dismiss" aria-label="Dismiss airport radio text">×</button>`;
  const title = element.querySelector<HTMLElement>('.airport-contact-title')!;
  const detail = element.querySelector<HTMLElement>('.airport-contact-detail')!;
  const note = element.querySelector<HTMLElement>('.airport-contact-note')!;
  const compact = element.querySelector<HTMLElement>('.airport-contact-compact')!;
  const qnh = element.querySelector<HTMLButtonElement>('.airport-contact-qnh')!;
  const dismiss = element.querySelector<HTMLButtonElement>('.airport-contact-dismiss')!;
  options.container.append(element);
  let shown: AirportContact | null = null; let shownAt_ms = 0; let dismissedKey = ''; let textKey = '';
  qnh.onclick = () => { if (!qnh.disabled) { options.onSetQnh(); options.onDone(); } };
  dismiss.onclick = () => { if (shown) dismissedKey = shown.key; element.hidden = true; options.onDone(); };
  return {
    element,
    update(input: ContactUpdate & { now_ms: number; qnh_pa?: number; setting_pa?: number; reviewing: boolean; controlsAvailable: boolean }) {
      // A single airport contact takes priority over a shared-channel notice.
      const primary = input.contacts.find(c => c.kind === 'contact') ?? input.contacts[0] ?? null;
      const announced = input.announce.some(c => c.key === primary?.key);
      if (primary && (announced || shown?.key !== primary.key)) { shownAt_ms = input.now_ms; if (announced) dismissedKey = ''; }
      shown = primary;
      if (!primary) { element.hidden = true; textKey = ''; dismissedKey = ''; return; }
      if (dismissedKey === primary.key) { element.hidden = true; return; }
      const message = contactMessage(primary, input.qnh_pa);
      const key = `${primary.key}|${primary.receivers.join()}|${message.detail}`;
      // Live-region text changes only with the contact itself, not every frame.
      if (key !== textKey) {
        textKey = key; title.textContent = message.title; detail.textContent = message.detail; note.textContent = message.note;
        element.dataset.kind = primary.kind; element.dataset.key = primary.key;
      }
      const action = qnhActionState({ reviewing: input.reviewing, controlsAvailable: input.controlsAvailable, qnh_pa: input.qnh_pa, setting_pa: input.setting_pa });
      qnh.hidden = primary.kind !== 'contact';
      if (qnh.textContent !== action.label) qnh.textContent = action.label;
      qnh.disabled = !action.enabled;
      qnh.title = action.enabled ? 'Sets the altimeter to the simulator sea-level pressure; flight dynamics are unchanged' : action.label;
      const expanded = input.now_ms - shownAt_ms < CONTACT_EXPANDED_MS || element.matches(':hover, :focus-within');
      // A shared-channel notice has no action to keep, so it simply fades out.
      element.hidden = !expanded && primary.kind !== 'contact';
      element.classList.toggle('compact', !expanded);
      const compactText = primary.kind === 'contact' ? `${airportIdent(primary.airport)}${message.qnh ? ` · QNH ${message.qnh.hpa}` : ''}` : '';
      if (compact.textContent !== compactText) compact.textContent = compactText;
      element.dataset.review = String(input.reviewing);
    },
    dispose() { element.remove(); },
  };
}
