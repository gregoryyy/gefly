import type { FlightPlanPanelAction, FlightPlanPanelView, PlannerPoint, PlanResult } from './map-flight-plan-types.ts';
import { GPS_COORDINATE_LIMITS, validGpsCoordinates } from './map-coordinates.ts';
import './map-flight-plan-panel.css';

function canNavigate(view: FlightPlanPanelView): boolean {
  return !!view.state.start && !!view.state.destination && view.legs.length > 0
    && view.legs.every(leg => Number.isFinite(leg.distance_nm) && leg.distance_nm > 0 && Number.isFinite(leg.course_true_deg));
}

/** Session-only map planning controls. Actions never write aircraft or radio state. */
export function createFlightPlanPanel(options: { onAction(action: FlightPlanPanelAction): PlanResult<unknown> }): {
  element: HTMLElement;
  update(view: FlightPlanPanelView): void;
  setPickedPosition(lon_deg: number, lat_deg: number): void;
  dispose(): void;
} {
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
    const result = document.createElement(tag); if (text !== undefined) result.textContent = text; return result;
  };
  const button = (text: string, action: string, title?: string) => {
    const result = node('button', text); result.type = 'button'; result.dataset.planAction = action;
    if (title) result.title = title; return result;
  };
  const element = node('section'); element.className = 'map-flight-plan'; element.setAttribute('aria-label', 'GPS fixes and flight plan');
  const details = node('details'); details.open = true;
  details.append(node('summary', 'GPS fixes & flight plan'));
  const scope = node('p', 'Session-only visual map planning · no AP or aircraft guidance'); scope.className = 'map-flight-plan-note';
  const reviewLabel = node('p', 'Current plan · live aircraft position'); reviewLabel.className = 'map-flight-plan-context';
  const error = node('p'); error.className = 'map-flight-plan-error'; error.setAttribute('role', 'alert'); error.hidden = true;
  const form = node('form'); form.className = 'map-flight-plan-form'; form.noValidate = true;
  const field = (title: string, type: string) => {
    const label = node('label', title), input = node('input'); input.type = type; input.setAttribute('aria-label', title);
    label.append(input); form.append(label); return input;
  };
  const name = field('GPS fix name', 'text'); name.maxLength = 40; name.autocomplete = 'off'; name.placeholder = 'Optional · blank creates anonymous fix';
  const anonymousLabel = node('label'); anonymousLabel.className = 'map-flight-plan-anonymous';
  const anonymous = node('input'); anonymous.type = 'checkbox'; anonymous.setAttribute('aria-label', 'Anonymous GPS fix');
  anonymousLabel.append(anonymous, document.createTextNode('Anonymous GPS fix · no name')); form.append(anonymousLabel);
  const latitude = field('Latitude °N', 'number'); latitude.min = String(GPS_COORDINATE_LIMITS.min_lat_deg); latitude.max = String(GPS_COORDINATE_LIMITS.max_lat_deg); latitude.step = 'any'; latitude.required = true;
  const longitude = field('Longitude °E', 'number'); longitude.min = String(GPS_COORDINATE_LIMITS.min_lon_deg); longitude.max = String(GPS_COORDINATE_LIMITS.max_lon_deg); longitude.step = 'any'; longitude.required = true;
  const create = node('button', 'Create GPS fix'); create.type = 'submit';
  const pick = button('Pick on map', 'pick-map'), cancelPick = button('Cancel picking', 'cancel-pick'); cancelPick.hidden = true;
  const formActions = node('div'); formActions.className = 'map-flight-plan-actions'; formActions.append(create, pick, cancelPick); form.append(formActions);
  const pickStatus = node('p', 'Enter coordinates or pick a map position, then create the fix. A name is optional.');
  pickStatus.className = 'map-flight-plan-note'; pickStatus.setAttribute('role', 'status');
  const fixCount = node('p', 'Custom GPS fixes · 0/64'); fixCount.className = 'map-flight-plan-note';
  const fixes = node('ul'); fixes.className = 'map-flight-plan-fixes'; fixes.setAttribute('aria-label', 'Custom GPS fixes');
  const fixEmpty = node('p', 'No custom GPS fixes.'); fixEmpty.className = 'map-flight-plan-note';
  const hint = node('p', 'Select map point → Set start / Add waypoint / Set destination.'); hint.className = 'map-flight-plan-note';
  const points = node('ol'); points.className = 'map-flight-plan-points'; points.setAttribute('aria-label', 'Flight plan points');
  const legs = node('ol'); legs.className = 'map-flight-plan-legs'; legs.setAttribute('aria-label', 'Flight plan legs');
  const total = node('p', 'Total distance: 0.0 NM'); total.className = 'map-flight-plan-total';
  const navigate = button('Navigate plan', 'navigate-plan'), next = button('Next leg', 'next-leg');
  const stop = button('Stop plan', 'stop-plan'), clear = button('Clear plan', 'clear-plan'), fit = button('Fit plan', 'fit-plan');
  const planActions = node('div'); planActions.className = 'map-flight-plan-actions'; planActions.append(navigate, next, stop, clear, fit);
  const navigation = node('p'); navigation.className = 'map-flight-plan-navigation'; navigation.setAttribute('aria-label', 'Current map navigation');
  details.append(scope, reviewLabel, error, form, pickStatus, fixCount, fixEmpty, fixes, node('h4', 'Flight plan'), hint, points, legs, total, planActions, navigation);
  element.append(details);
  let disposed = false, view: FlightPlanPanelView | null = null;
  let renderedFixes: FlightPlanPanelView['state']['fixes'] | undefined;
  let renderedRoute: FlightPlanPanelView['state'] | null = null;
  const text = (element: HTMLElement, value: string) => { if (element.textContent !== value) element.textContent = value; };
  function showError(message: string): void { text(error, message.slice(0, 500)); error.hidden = !message; }
  function act(action: FlightPlanPanelAction): boolean {
    if (disposed) return false;
    const result = options.onAction(action); showError(result.ok ? '' : result.error); return result.ok;
  }
  const position = (point: Readonly<PlannerPoint>) => `${Math.abs(point.lat_deg).toFixed(5)}° ${point.lat_deg < 0 ? 'S' : 'N'}, ${Math.abs(point.lon_deg).toFixed(5)}° ${point.lon_deg < 0 ? 'W' : 'E'}`;
  function pointDescription(item: HTMLElement, point: Readonly<PlannerPoint>, role?: string): void {
    item.append(node('strong', `${role ? `${role}: ` : ''}${point.name}`));
    const metadata = node('small', `${point.id} · ${position(point)} · ${point.source_label}`); item.append(metadata);
  }
  function renderFixes(): void {
    if (!view) return;
    const { state } = view;
    text(fixCount, `Custom GPS fixes · ${state.fixes.length}/64`); fixEmpty.hidden = state.fixes.length > 0;
    if (state.fixes === renderedFixes) return;
    renderedFixes = state.fixes; fixes.replaceChildren();
    for (const point of state.fixes.slice(0, 64)) {
      const item = node('li'); item.dataset.fixId = point.id; pointDescription(item, point, point.anonymous ? 'Anonymous custom' : 'Custom');
      const actions = node('div'); actions.className = 'map-flight-plan-actions';
      for (const [label, action] of [['GPS target', 'direct-to'], ['Set start', 'start'], ['Add waypoint', 'waypoint'], ['Set destination', 'destination'], ['Delete', 'remove-fix']]) {
        const control = button(label, action); control.dataset.fixId = point.id; actions.append(control);
      }
      item.append(actions); fixes.append(item);
    }
  }
  function renderRoute(): void {
    if (!view) return;
    const { state } = view;
    const routeChanged = !renderedRoute || renderedRoute.start !== state.start || renderedRoute.waypoints !== state.waypoints
      || renderedRoute.destination !== state.destination || renderedRoute.activeLegIndex !== state.activeLegIndex;
    renderedRoute = state;
    if (!routeChanged) return;
    points.replaceChildren(); legs.replaceChildren();
    const appendPoint = (point: Readonly<PlannerPoint> | null, role: string, index?: number) => {
      const item = node('li');
      if (point) pointDescription(item, point, role); else item.append(node('span', `${role}: not selected`));
      if (index !== undefined) {
        const actions = node('div'); actions.className = 'map-flight-plan-actions';
        for (const [label, action] of [['Move up', 'move-up'], ['Move down', 'move-down'], ['Remove waypoint', 'remove-waypoint']]) {
          const control = button(label, action); control.dataset.index = String(index);
          control.setAttribute('aria-label', `${label} ${index + 1}`);
          control.disabled = action === 'move-up' && index === 0 || action === 'move-down' && index === state.waypoints.length - 1;
          actions.append(control);
        }
        item.append(actions);
      }
      points.append(item);
    };
    appendPoint(state.start, 'Start');
    state.waypoints.slice(0, 30).forEach((point, index) => appendPoint(point, `Waypoint ${index + 1}`, index));
    appendPoint(state.destination, 'Destination');
    const complete = canNavigate(view);
    for (const leg of view.legs.slice(0, 31)) {
      const item = node('li');
      item.append(node('span', `${leg.index + 1}. ${leg.from.name} → ${leg.to.name}`));
      item.append(node('small', `${leg.course_true_deg === null ? 'Course unavailable' : `${leg.course_true_deg.toFixed(1)}° TRUE`} · ${leg.distance_nm.toFixed(1)} NM`));
      const go = button(`Go to leg ${leg.index + 1}`, 'activate-leg'); go.dataset.index = String(leg.index); go.disabled = !complete;
      go.setAttribute('aria-pressed', String(state.activeLegIndex === leg.index)); item.append(go); legs.append(item);
    }
    const distance = view.legs.reduce((sum, leg) => sum + leg.distance_nm, 0);
    text(total, Number.isFinite(distance) ? `Total distance: ${distance.toFixed(1)} NM` : 'Total distance unavailable');
    navigate.disabled = !complete; next.disabled = stop.disabled = state.activeLegIndex === null;
    clear.disabled = !state.start && !state.destination && !state.waypoints.length;
    fit.disabled = !state.start && !state.destination && !state.waypoints.length;
  }
  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (disposed) return;
    const label = anonymous.checked ? '' : name.value.trim(), lat = latitude.valueAsNumber, lon = longitude.valueAsNumber;
    if (!anonymous.checked && (label.length > 40 || /[\u0000-\u001f\u007f-\u009f]/u.test(name.value))) {
      showError('Use up to 40 characters without control characters, or leave the name blank for an anonymous fix.'); return;
    }
    if (!validGpsCoordinates(lat, lon)) {
      showError('Enter finite WGS84 latitude −90…90° and longitude −180…180°.'); return;
    }
    if (act({ type: 'create-fix', name: label, lat_deg: lat, lon_deg: lon }) && !anonymous.checked) name.value = '';
  }
  function click(event: MouseEvent): void {
    const control = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-plan-action]') : null;
    if (disposed || !control || !element.contains(control) || control.disabled) return;
    const action = control.dataset.planAction, index = Number(control.dataset.index);
    const fix = view?.state.fixes.find(point => point.id === control.dataset.fixId);
    if (action === 'pick-map' || action === 'cancel-pick') {
      if (act({ type: action })) text(pickStatus, action === 'pick-map' ? 'Click a position on the map, then create the fix. A name is optional.' : 'Map picking cancelled. Enter coordinates or pick another position.');
    } else if (fix && (action === 'start' || action === 'waypoint' || action === 'destination')) act({ type: 'set-point', role: action, point: fix });
    else if (fix && action === 'direct-to') act({ type: 'direct-to', point: fix });
    else if (fix && action === 'remove-fix') act({ type: 'remove-fix', id: fix.id });
    else if (action === 'move-up' || action === 'move-down') act({ type: 'move-waypoint', index, direction: action === 'move-up' ? -1 : 1 });
    else if (action === 'remove-waypoint') act({ type: 'remove-waypoint', index });
    else if (action === 'activate-leg' || action === 'navigate-plan') act({ type: 'activate-leg', index: action === 'navigate-plan' ? 0 : index });
    else if (action === 'next-leg' || action === 'stop-plan' || action === 'clear-plan' || action === 'fit-plan') act({ type: action });
  }
  const toggleAnonymous = () => { name.disabled = anonymous.checked; };
  anonymous.addEventListener('change', toggleAnonymous);
  form.addEventListener('submit', submit); element.addEventListener('click', click);
  return {
    element,
    update(nextView) {
      if (disposed) return;
      view = nextView;
      text(reviewLabel, nextView.reviewing ? 'Current plan · recorded aircraft position' : 'Current plan · live aircraft position');
      text(navigation, nextView.navigationText || 'No map navigation target.');
      pick.disabled = nextView.picking; cancelPick.hidden = !nextView.picking;
      create.disabled = nextView.state.fixes.length >= 64;
      renderFixes(); renderRoute();
    },
    setPickedPosition(lon_deg, lat_deg) {
      if (disposed) return;
      if (!validGpsCoordinates(lat_deg, lon_deg)) {
        showError('Pick a valid WGS84 position: latitude −90…90°, longitude −180…180°.'); return;
      }
      longitude.value = String(lon_deg); latitude.value = String(lat_deg); showError('');
      text(pickStatus, 'Map position filled. Choose Create GPS fix; a name is optional.');
    },
    dispose() {
      if (disposed) return;
      disposed = true; view = null; renderedFixes = undefined; renderedRoute = null;
      anonymous.removeEventListener('change', toggleAnonymous);
      form.removeEventListener('submit', submit); element.removeEventListener('click', click); element.remove();
    },
  };
}

/** A compact map overlay; opening/editing and navigation remain delegated actions. */
export function createFlightPlanMapCard(options: { onAction(action: FlightPlanPanelAction): PlanResult<unknown> }): {
  element: HTMLElement;
  update(view: FlightPlanPanelView): void;
  dispose(): void;
} {
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] => {
    const result = document.createElement(tag); if (text !== undefined) result.textContent = text; return result;
  };
  const element = node('section'); element.className = 'map-flight-plan-card'; element.setAttribute('aria-label', 'Flight plan on map');
  const header = node('div'); header.className = 'map-flight-plan-card-heading';
  const context = node('small', 'Visual · session only'); header.append(node('strong', 'Flight plan'), context);
  const route = node('p', 'Choose start/destination'); route.className = 'map-flight-plan-card-route';
  const summary = node('p', '0 legs · 0.0 NM total'); summary.className = 'map-flight-plan-card-summary';
  const active = node('p', 'Not navigating'); active.className = 'map-flight-plan-card-active';
  const error = node('p'); error.className = 'map-flight-plan-card-error'; error.setAttribute('role', 'alert'); error.hidden = true;
  const actions = node('div'); actions.className = 'map-flight-plan-card-actions';
  const button = (label: string, action: string) => {
    const result = node('button', label); result.type = 'button'; result.dataset.planAction = action; actions.append(result); return result;
  };
  button('Edit plan', 'edit-plan');
  const fit = button('Fit plan', 'fit-plan'), navigate = button('Navigate plan', 'navigate-plan');
  const next = button('Next leg', 'next-leg'), stop = button('Stop plan', 'stop-plan');
  fit.disabled = navigate.disabled = next.disabled = stop.disabled = true;
  element.append(header, route, summary, active, actions, error);
  let disposed = false;
  const text = (target: HTMLElement, value: string) => { if (target.textContent !== value) target.textContent = value; };
  function click(event: MouseEvent): void {
    event.stopPropagation();
    const control = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-plan-action]') : null;
    if (disposed || !control || !element.contains(control) || control.disabled) return;
    const action = control.dataset.planAction;
    let request: FlightPlanPanelAction;
    if (action === 'navigate-plan') request = { type: 'activate-leg', index: 0 };
    else if (action === 'edit-plan' || action === 'fit-plan' || action === 'next-leg' || action === 'stop-plan') request = { type: action };
    else return;
    const result = options.onAction(request); text(error, result.ok ? '' : result.error.slice(0, 500)); error.hidden = result.ok;
  }
  const stopPropagation = (event: Event) => event.stopPropagation();
  element.addEventListener('click', click);
  element.addEventListener('pointerdown', stopPropagation);
  element.addEventListener('wheel', stopPropagation, { passive: true });
  return {
    element,
    update(view) {
      if (disposed) return;
      element.hidden = view.picking;
      const { state } = view, distance = view.legs.reduce((sum, leg) => sum + leg.distance_nm, 0);
      const empty = !state.start && !state.destination && !state.waypoints.length;
      summary.hidden = active.hidden = empty;
      fit.hidden = navigate.hidden = next.hidden = stop.hidden = empty;
      text(context, view.reviewing ? 'Current plan · Review' : 'Visual · session only');
      text(route, !state.start && !state.destination ? 'Choose start/destination'
        : `${state.start?.name ?? 'Choose start'} → ${state.destination?.name ?? 'Choose destination'}`);
      text(summary, `${view.legs.length} ${view.legs.length === 1 ? 'leg' : 'legs'} · ${Number.isFinite(distance) ? `${distance.toFixed(1)} NM total` : 'distance unavailable'}`);
      const leg = state.activeLegIndex === null ? null : view.legs.find(item => item.index === state.activeLegIndex);
      text(active, leg ? `Active leg ${leg.index + 1}/${view.legs.length} → ${leg.to.name}`
        : !state.start || !state.destination ? 'Choose start and destination to navigate'
          : canNavigate(view) ? 'Ready to navigate' : 'Adjacent points must be distinct');
      fit.disabled = !state.start && !state.destination && !state.waypoints.length;
      navigate.disabled = !canNavigate(view); next.disabled = stop.disabled = state.activeLegIndex === null;
    },
    dispose() {
      if (disposed) return;
      disposed = true; element.removeEventListener('click', click); element.removeEventListener('pointerdown', stopPropagation);
      element.removeEventListener('wheel', stopPropagation); element.remove();
    },
  };
}
