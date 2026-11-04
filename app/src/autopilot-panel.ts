import type { FlightState } from './types';
import { validKapCommand, validKapState, type KapCommand, type KapSnapshot } from '../../studies/e1-browser/sim/kap140.js';
import { validAlertState, type AltitudeAlertSnapshot } from '../../studies/e1-browser/sim/altitude-alert.js';
import './autopilot-panel.css';

interface AutopilotOptions {
  container: HTMLElement;
  onCommand: (command: KapCommand) => void;
  onOpen: () => void;
  onClose: () => void;
}
const FT_M = .3048, INHG_PA = 3386.389;
const lateral = ['ROL', 'HDG', 'NAV', 'APR', 'REV'];
const vertical = ['VS', 'ALT', 'GS'];
const degrees = (radians: number) => ((radians * 180 / Math.PI) % 360 + 360) % 360;

/** Source-backed control semantics, with explicitly separate simulator DG input.
 * Mode, capture, repeat timing and guidance are owned by the fixed-step worker.
 */
export function createAutopilotPanel(options: AutopilotOptions): {
  update(state: Readonly<FlightState> | null, reviewing: boolean, controlsAvailable: boolean, readOnly?: boolean): void;
  dispose(): void;
} {
  const { container } = options;
  container.classList.add('autopilot-panel');
  const opener = document.createElement('button');
  opener.type = 'button'; opener.id = 'autopilot-open'; opener.className = 'autopilot-open'; opener.textContent = 'Autopilot';
  opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'autopilot-dialog');
  const content = document.createElement('section');
  content.className = 'autopilot-content'; content.setAttribute('aria-label', 'KAP 140 style two-axis autopilot');
  content.innerHTML = `
    <div class="kap-unit">
      <div class="autopilot-heading"><strong>KAP 140</strong><span id="ap-state-label">LIVE</span><b id="ap-engaged-label">INOP</b></div>
      <div class="kap-lcd" id="ap-status" role="status" aria-live="polite">
        <div class="kap-axis"><span><b id="ap-lateral">—</b><i id="ap-lateral-alert"></i></span><small><span id="ap-lateral-armed"></span><i id="ap-heading-prompt"></i></small></div>
        <div class="kap-axis"><span><b id="ap-vertical">—</b><i id="ap-vertical-alert"></i></span><small id="ap-vertical-armed"></small></div>
        <label class="kap-selector"><input id="ap-selector-value" type="number" step="any" inputmode="decimal" aria-label="Selected altitude in feet, simulator entry"><span class="kap-selector-footer"><b id="ap-altitude-alert" hidden>ALERT</b><span id="ap-selector-unit">FT</span></span></label>
      </div>
      <div class="kap-mode-keys">${[['engage', 'AP'], ['heading', 'HDG'], ['nav', 'NAV'], ['apr', 'APR'], ['rev', 'REV'], ['alt', 'ALT']].map(([id, label]) => `<button type="button" id="ap-${id}" aria-pressed="false">${label}</button>`).join('')}</div>
      <div class="kap-adjust-keys"><button type="button" id="ap-arm" aria-pressed="false">ARM</button><button type="button" id="ap-baro">BARO</button><button type="button" id="ap-up" aria-label="Increase autopilot vertical command">UP</button><button type="button" id="ap-down" aria-label="Decrease autopilot vertical command">DN</button><button type="button" id="ap-selector-decrease" aria-label="Turn altitude selector down 100 feet, simulator knob">−</button><button type="button" id="ap-selector-increase" aria-label="Turn altitude selector up 100 feet, simulator knob">+</button></div>
    </div>
    <div class="kap-dg-bug" role="group" aria-label="External control wheel steering and directional gyro controls"><button type="button" id="ap-cws" aria-label="Hold control wheel steering" aria-pressed="false" title="Hold to hand-fly; release captures the current altitude in ALT or vertical speed in VS. Optional KAP 140 control; installed C172 fit unverified.">CWS</button><label for="ap-heading-target">DG BUG · TRUE</label><button type="button" id="ap-heading-decrease" aria-label="Decrease external heading bug ten degrees">−</button><input id="ap-heading-target" type="number" min="0" max="359.9" step="0.1" aria-label="External directional gyro true heading bug in degrees"><button type="button" id="ap-heading-increase" aria-label="Increase external heading bug ten degrees">+</button></div>
  `;
  const dialog = document.createElement('dialog');
  dialog.id = 'autopilot-dialog'; dialog.className = 'autopilot-dialog'; dialog.setAttribute('aria-labelledby', 'autopilot-title');
  dialog.innerHTML = '<h2 id="autopilot-title">Autopilot</h2><div class="autopilot-dialog-slot"></div><button type="button" id="autopilot-close" class="primary">Done</button>';
  const slot = dialog.querySelector<HTMLElement>('.autopilot-dialog-slot')!;
  const done = dialog.querySelector<HTMLButtonElement>('#autopilot-close')!;
  const element = <T extends HTMLElement = HTMLElement>(id: string) => content.querySelector<T>(`#${id}`)!;
  const ap = element<HTMLButtonElement>('ap-engage'), baro = element<HTMLButtonElement>('ap-baro'), cws = element<HTMLButtonElement>('ap-cws');
  const selector = element<HTMLInputElement>('ap-selector-value'), heading = element<HTMLInputElement>('ap-heading-target');
  const buttons = [...content.querySelectorAll<HTMLButtonElement>('button')];
  const media = window.matchMedia('(max-width: 0px)');
  let latest: KapSnapshot | null = null, reviewing = false, available = false, readOnly = false, disposed = false;
  let altitudeAlert: AltitudeAlertSnapshot | null = null;
  let gesture: { button: HTMLButtonElement; pointerId?: number; key?: string; action: 'ap' | 'baro' | 'vertical' | 'cws'; fired: boolean } | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  // The shared selector is interpreted by the page and units shown when the
  // entry started (first keystroke, or press of a +/− knob button), never by the
  // page shown at commit: BARO/VS pages expire after 3 s while the user types,
  // and a pressure value must never become a selected altitude (F45).
  type SelectorPage = { page: number; units: number };
  let entry: SelectorPage | null = null;
  let knobPress: (SelectorPage & { button: HTMLButtonElement }) | null = null;
  const shownPage = (): SelectorPage => ({ page: latest?.kap_display_page ?? 0, units: latest?.kap_baro_units ?? 0 });
  container.replaceChildren(opener, content); document.body.append(dialog);
  const canControl = () => !!latest && available && !reviewing && !readOnly && !disposed;
  function text(id: string, value: string): void {
    const node = element(id);
    // Avoid replacing unchanged text in the live region on every render frame.
    if (node.textContent !== value) node.textContent = value;
  }
  function send(command: KapCommand): void { if (canControl() && validKapCommand(command)) options.onCommand(command); }
  function stopGesture(commitBaro = false): void {
    if (holdTimer !== undefined) clearTimeout(holdTimer);
    holdTimer = undefined;
    const previous = gesture; gesture = null;
    if (!previous) return;
    previous.button.classList.remove('kap-held');
    if (previous.action === 'vertical') options.onCommand({ action: 'vertical', value: 0 });
    if (previous.action === 'cws') options.onCommand({ action: 'cws', value: 0 });
    // A completed browser click represents the physical AP press. Long holds
    // still fire at 250 ms; release must never send a duplicate engagement.
    if (commitBaro && previous.action === 'ap' && !previous.fired) send({ action: 'ap' });
    if (commitBaro && previous.action === 'baro' && !previous.fired) send({ action: 'baro' });
    if (previous.pointerId !== undefined && previous.button.hasPointerCapture(previous.pointerId)) previous.button.releasePointerCapture(previous.pointerId);
  }
  function beginGesture(button: HTMLButtonElement, pointerId?: number, key?: string): void {
    if (!canControl() || button.disabled) return;
    stopGesture();
    const action = button === ap ? 'ap' : button === baro ? 'baro' : button === cws ? 'cws' : 'vertical';
    if (action === 'ap' && latest!.kap_engaged) { send({ action: 'disconnect' }); return; }
    gesture = { button, pointerId, key, action, fired: false }; button.classList.add('kap-held');
    if (pointerId !== undefined) button.setPointerCapture(pointerId);
    if (action === 'cws') send({ action: 'cws', value: 1 });
    else if (action === 'vertical') send({ action: 'vertical', value: button.id === 'ap-up' ? 1 : -1 });
    else holdTimer = setTimeout(() => {
      if (!gesture || gesture.button !== button || !canControl()) return;
      gesture.fired = true; send({ action: action === 'ap' ? 'ap' : 'baro-units' });
    }, action === 'ap' ? 250 : 2000);
  }
  function render(): void {
    const enabled = canControl(), state = latest;
    if (!enabled) stopGesture();
    text('ap-state-label', reviewing ? 'REC' : 'LIVE');
    // Generic simulator fault flag: invalid AP sensors disconnect the AP (F48).
    const fault = state?.kap_sensor_fault === 1;
    text('ap-engaged-label', !state ? 'INOP' : fault ? 'FAULT' : state.kap_engaged ? 'AP' : 'OFF');
    element('ap-engaged-label').classList.toggle('kap-flashing', fault);
    element('ap-engaged-label').title = fault ? 'Autopilot sensors invalid; autopilot disconnected (simulator safety substitution)' : '';
    text('ap-lateral', state?.kap_engaged ? lateral[state.kap_lateral] : '—');
    text('ap-vertical', state?.kap_engaged ? vertical[state.kap_vertical] : '—');
    text('ap-lateral-armed', state?.kap_lateral_arm ? `${lateral[state.kap_lateral_arm]} ARM` : '');
    text('ap-heading-prompt', state?.kap_hdg_prompt ? 'HDG' : '');
    const alert = element('ap-altitude-alert'), alertState = altitudeAlert?.kap_alert_state;
    alert.hidden = alertState === undefined || alertState === 0;
    alert.classList.toggle('kap-flashing', alertState === 2 || alertState === 3);
    alert.setAttribute('aria-label', alertState === 1 ? 'Altitude approach alert' : alertState === 2 ? 'Selected altitude crossing alert' : alertState === 3 ? 'Altitude deviation alert' : 'Altitude alert unavailable or inactive');
    element('ap-heading-prompt').classList.toggle('kap-flashing', !!state?.kap_hdg_prompt);
    text('ap-vertical-armed', state ? [state.kap_alt_arm ? 'ALT' : '', state.kap_gs_arm ? 'GS' : ''].filter(Boolean).join(' ') + (state.kap_alt_arm || state.kap_gs_arm ? ' ARM' : '') : '');
    // Source-loss alerts belong to an engagement; never show them with AP OFF (F47).
    for (const [id, label] of [['ap-lateral-alert', state?.kap_engaged && state.kap_lateral_alert ? lateral[state.kap_lateral_alert] : ''], ['ap-vertical-alert', state?.kap_engaged && state.kap_vertical_alert ? 'GS' : '']] as const) {
      text(id, label); element(id).classList.toggle('kap-flashing', !!label);
    }
    for (const button of buttons) button.disabled = !enabled;
    cws.disabled = !enabled || !state?.kap_engaged;
    cws.setAttribute('aria-pressed', reviewing && state?.kap_cws === undefined ? 'mixed' : String(state?.kap_cws === 1));
    cws.title = reviewing && state?.kap_cws === undefined ? 'CWS state was not recorded in this older recording.'
      : 'Hold to hand-fly; release captures the current altitude in ALT or vertical speed in VS. Optional KAP 140 control; installed C172 fit unverified.';
    element<HTMLButtonElement>('ap-rev').disabled = !enabled || state?.kap_nav_kind !== 2 && state?.kap_lateral_alert !== 4;
    selector.disabled = heading.disabled = !enabled;
    const page = state?.kap_display_page ?? 0;
    // While an entry is in progress, keep the label, unit and editability of the
    // page it started on, so what is typed is shown with the units it will use.
    const editing = !reviewing && entry !== null && document.activeElement === selector;
    const selectorPage = editing ? entry!.page : page, units = editing ? entry!.units : state?.kap_baro_units ?? 0;
    selector.readOnly = selectorPage === 1;
    const pageLabel = selectorPage === 1 ? 'Vertical speed in feet per minute, use UP and DN' : selectorPage === 2 ? `Autopilot barometric setting in ${units ? 'inches of mercury' : 'hectopascals'}, simulator entry` : 'Selected altitude in feet, simulator entry';
    selector.setAttribute('aria-label', pageLabel);
    text('ap-selector-unit', selectorPage === 1 ? 'FPM' : selectorPage === 2 ? units ? 'IN HG' : 'HPA' : 'FT');
    // Refresh until the first keystroke; an entry in progress keeps its text.
    if (reviewing || document.activeElement !== selector || entry === null) {
      selector.value = !state ? '' : page === 1 ? (state.kap_vs_target_mps / FT_M * 60).toFixed(0)
        : page === 2 ? (state.kap_baro_setting_pa / (state.kap_baro_units ? INHG_PA : 100)).toFixed(state.kap_baro_units ? 2 : 0)
          : (state.kap_selected_altitude_m / FT_M).toFixed(0);
      selector.setCustomValidity('');
    }
    if (reviewing || document.activeElement !== heading) { heading.value = state ? ((Math.round(degrees(state.kap_heading_bug_rad) * 10) % 3600) / 10).toFixed(1) : ''; heading.setCustomValidity(''); }
    ap.setAttribute('aria-label', state?.kap_engaged ? 'Disconnect autopilot' : 'Engage autopilot');
    ap.title = state?.kap_engaged ? 'Disconnect autopilot' : 'Click to engage; a browser click represents the physical 0.25-second AP press';
    baro.title = 'Press to display BARO; hold 2 seconds to change pressure units';
    element('ap-up').title = element('ap-down').title = state?.kap_vertical === 1
      ? 'ALT: tap adjusts held altitude 20 ft; hold requests 500 FPM. For a preselected climb, press ALT to enter VS first.'
      : 'VS: first press reveals a hidden rate; subsequent taps change 100 FPM. Hold changes 300 FPM per second. Set climb power manually.';
    element('ap-alt').title = 'Toggle current-altitude hold and vertical-speed mode; select an altitude and confirm ALT ARM for automatic capture from VS.';
    for (const [id, pressed] of [['ap-engage', !!state?.kap_engaged], ['ap-heading', !!state?.kap_engaged && state.kap_lateral === 1],
      ['ap-nav', !!state?.kap_engaged && state.kap_lateral === 2 || state?.kap_lateral_arm === 2], ['ap-apr', !!state?.kap_engaged && state.kap_lateral === 3 || state?.kap_lateral_arm === 3],
      ['ap-rev', !!state?.kap_engaged && state.kap_lateral === 4 || state?.kap_lateral_arm === 4], ['ap-alt', !!state?.kap_engaged && state.kap_vertical === 1], ['ap-arm', !!state?.kap_alt_arm]] as const)
      element(id).setAttribute('aria-pressed', String(pressed));
    element('ap-nav').title = state?.kap_nav_valid ? 'NAV1 valid' : 'NAV1 signal unavailable; capture is not established';
    element('ap-apr').title = state?.kap_gs_valid ? 'NAV1 and glideslope valid' : 'No valid glideslope; GS capture is not established';
    element('ap-rev').title = state?.kap_nav_kind === 2 ? 'Localizer reverse course' : 'REV requires a localizer source';
    for (const id of ['ap-selector-decrease', 'ap-selector-increase']) element(id).setAttribute('aria-label', page === 2
      ? `Turn autopilot barometric setting ${id.endsWith('decrease') ? 'down' : 'up'}, simulator knob`
      : `Turn altitude selector ${id.endsWith('decrease') ? 'down' : 'up'} 100 feet, simulator knob`);
  }
  function click(event: MouseEvent): void {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button || !canControl()) return;
    if ([ap, baro, cws, element('ap-up'), element('ap-down')].includes(button)) { event.preventDefault(); return; }
    const modes: Record<string, KapCommand['action']> = { 'ap-heading': 'hdg', 'ap-nav': 'nav', 'ap-apr': 'apr', 'ap-rev': 'rev', 'ap-alt': 'alt', 'ap-arm': 'arm' };
    if (modes[button.id]) send({ action: modes[button.id] });
    else if (button.id.startsWith('ap-heading-')) send({ action: 'heading', value: ((degrees(latest!.kap_heading_bug_rad) + (button.id.endsWith('decrease') ? -10 : 10) + 360) % 360) * Math.PI / 180 });
    else if (button.id.startsWith('ap-selector-')) {
      const direction = button.id.endsWith('decrease') ? -1 : 1;
      const pressed = knobPress?.button === button ? knobPress : shownPage(); knobPress = null;
      send(pressed.page === 2 ? { action: 'baro-setting', value: latest!.kap_baro_setting_pa + direction * (pressed.units ? .01 * INHG_PA : 100) }
        : { action: 'select-altitude', value: latest!.kap_selected_altitude_m + direction * 100 * FT_M });
    }
  }
  function change(event: Event): void {
    if (!event.isTrusted || !canControl() || !(event.target instanceof HTMLInputElement)) return;
    const input = event.target, value = input.valueAsNumber;
    // A rejected entry keeps its text and starting page; a sent one ends it.
    const started = input === selector ? entry ?? shownPage() : null;
    if (started?.page === 1) { input.setCustomValidity('Vertical speed is set with UP and DN.'); input.reportValidity(); return; }
    const command: KapCommand = input === heading ? { action: 'heading', value: value * Math.PI / 180 }
      : started!.page === 2 ? { action: 'baro-setting', value: value * (started!.units ? INHG_PA : 100) }
        : { action: 'select-altitude', value: value * FT_M };
    if (input.readOnly || !input.checkValidity() || !validKapCommand(command)) { input.setCustomValidity('Enter a value within the simulator setting range.'); input.reportValidity(); return; }
    input.setCustomValidity(''); if (input === selector) entry = null; send(command);
  }
  function pointerDown(event: PointerEvent): void {
    if (event.isTrusted && event.button === 0) knobDown(event);
    if (!event.isTrusted || event.button !== 0 || !(event.target instanceof HTMLButtonElement)) return;
    if (![ap, baro, cws, element('ap-up'), element('ap-down')].includes(event.target)) return;
    event.preventDefault(); event.target.focus(); beginGesture(event.target, event.pointerId);
  }
  function pointerUp(event: PointerEvent): void { if (gesture?.pointerId === event.pointerId) stopGesture(event.type === 'pointerup'); }
  function keyDown(event: KeyboardEvent): void {
    // A held external CWS switch must allow the flight keys to reach the yoke.
    if (gesture?.action === 'cws' && !['Space', 'Enter'].includes(event.code)) return;
    event.stopPropagation();
    if (event.repeat) { event.preventDefault(); return; }
    if (event.isTrusted && ['Space', 'Enter'].includes(event.code)) knobDown(event);
    if (!event.isTrusted || !['Space', 'Enter'].includes(event.code) || !(event.target instanceof HTMLButtonElement)) return;
    if (![ap, baro, cws, element('ap-up'), element('ap-down')].includes(event.target)) return;
    event.preventDefault(); beginGesture(event.target, undefined, event.code);
  }
  function keyUp(event: KeyboardEvent): void { if (gesture?.key === event.code) { event.preventDefault(); stopGesture(true); } }
  function clearValidity(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target === selector && entry === null && !selector.readOnly) entry = shownPage();
    event.target.setCustomValidity('');
  }
  // Chrome dispatches focusout before the commit's change event, so end the
  // entry in a later task; rendering now would overwrite the uncommitted text.
  function selectorBlur(event: FocusEvent): void {
    if (event.target !== selector) return;
    setTimeout(() => { if (!disposed && document.activeElement !== selector) { entry = null; render(); } }, 0);
  }
  function knobDown(event: Event): void {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (button?.id.startsWith('ap-selector-')) knobPress = { button, ...shownPage() };
  }
  function cancel(): void { stopGesture(); }
  function visibility(): void { if (document.hidden) cancel(); }
  function layout(): void {
    if (disposed) return;
    opener.hidden = !media.matches;
    if (media.matches) slot.append(content);
    else { if (dialog.open) dialog.close(); container.append(content); }
  }
  function open(): void { if (!disposed && media.matches && !dialog.open) { options.onOpen(); dialog.showModal(); } }
  function close(): void { cancel(); if (!disposed) options.onClose(); }
  function finish(): void { dialog.close(); }
  content.addEventListener('click', click); content.addEventListener('change', change); content.addEventListener('input', clearValidity); content.addEventListener('focusout', selectorBlur);
  content.addEventListener('pointerdown', pointerDown); content.addEventListener('pointerup', pointerUp); content.addEventListener('pointercancel', pointerUp); content.addEventListener('lostpointercapture', pointerUp);
  content.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', visibility);
  opener.addEventListener('click', open); done.addEventListener('click', finish); dialog.addEventListener('close', close); media.addEventListener('change', layout);
  layout(); render();
  return {
    update(state, inReview, controlsAvailable, locked = false) {
      if (disposed) return;
      latest = state && state.kap_profile === 1 && validKapState(state) ? state as unknown as KapSnapshot : null;
      altitudeAlert = state?.kap_alert_state !== undefined && state.kap_alert_sequence !== undefined && validAlertState(state) ? state as unknown as AltitudeAlertSnapshot : null;
      reviewing = inReview; available = controlsAvailable; readOnly = locked; render();
    },
    dispose() {
      if (disposed) return;
      stopGesture(); disposed = true;
      content.removeEventListener('click', click); content.removeEventListener('change', change); content.removeEventListener('input', clearValidity); content.removeEventListener('focusout', selectorBlur);
      content.removeEventListener('pointerdown', pointerDown); content.removeEventListener('pointerup', pointerUp); content.removeEventListener('pointercancel', pointerUp); content.removeEventListener('lostpointercapture', pointerUp);
      content.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', visibility);
      opener.removeEventListener('click', open); done.removeEventListener('click', finish); dialog.removeEventListener('close', close); media.removeEventListener('change', layout);
      if (dialog.open) dialog.close(); dialog.remove(); container.replaceChildren();
    },
  };
}
