import './flight-assists.css';

const RATES = Object.freeze([1, 1.5, 2, 5, 10]);

interface FlightAssistsOptions {
  root: HTMLElement;
  /** Toggle AP; engagement captures the worker's current heading and altitude. */
  onCapture(): void;
  onRate(rate: number): void;
  canCapture(): boolean;
  isAutopilotEngaged(): boolean;
  canChangeRate(): boolean;
  /** Open-map zoom shortcuts take precedence over keyboard pacing controls. */
  mapOpen?(): boolean;
}

/** Keyboard/menu conveniences; the worker remains authoritative for flight and pacing. */
export function createFlightAssists(options: FlightAssistsOptions): {
  update(rate: number, reviewing: boolean): void;
  cycleRate(direction?: 1 | -1): void;
  reset(): void;
  dispose(): void;
} {
  const { root } = options;
  const menu = root.querySelector<HTMLElement>('#flight-menu nav');
  const surface = root.querySelector<HTMLElement>('.flight-app') ?? root;
  if (!menu) throw new Error('Flight assists require the Flight menu');
  let confirmedRate = 1;
  let requestedRate: number | null = null;
  let reviewing = false;
  let disposed = false;

  const capture = document.createElement('button');
  capture.type = 'button'; capture.id = 'capture-autopilot';
  const captureLabel = document.createElement('span');
  capture.append(captureLabel, ' ', shortcut('A'));
  capture.setAttribute('aria-keyshortcuts', 'A');
  const speed = document.createElement('button');
  speed.type = 'button'; speed.id = 'simulation-rate';
  const speedShortcut = shortcut('= / Shift+=');
  speed.append(document.createElement('span'), ' ', speedShortcut);
  menu.append(capture, speed);

  const overlay = document.createElement('output');
  overlay.id = 'simulation-rate-overlay'; overlay.className = 'simulation-rate-overlay';
  overlay.setAttribute('aria-label', 'Simulation speed');
  overlay.setAttribute('aria-live', 'polite');
  surface.append(overlay);

  function shortcut(key: string): HTMLElement {
    const label = document.createElement('kbd'); label.textContent = key; return label;
  }
  function render(): void {
    const label = `${confirmedRate}×`;
    const text = `${reviewing ? 'REPLAY' : 'SIM'} ${label}`;
    if (overlay.textContent !== text) overlay.textContent = text;
    if (overlay.dataset.rate !== String(confirmedRate)) overlay.dataset.rate = String(confirmedRate);
    if (overlay.dataset.review !== String(reviewing)) overlay.dataset.review = String(reviewing);
    const ariaLabel = reviewing ? 'Replay speed' : 'Simulation speed';
    if (overlay.getAttribute('aria-label') !== ariaLabel) overlay.setAttribute('aria-label', ariaLabel);
    const mapOpen = options.mapOpen?.() ?? false;
    const keyboardHelp = mapOpen ? '= / + / - zoom the open map; click cycles speed, Shift-click steps down'
      : '= cycles 1×, 1.5×, 2×, 5×, 10×; Shift+= steps down to 1×; Shift-click steps down';
    const title = `${reviewing ? 'Replay' : 'Simulation'} speed; ${keyboardHelp}`;
    if (overlay.title !== title) overlay.title = title;
    if (speed.title !== title) speed.title = title;
    const shortcutText = mapOpen ? 'Menu' : '= / Shift+=';
    if (speedShortcut.textContent !== shortcutText) speedShortcut.textContent = shortcutText;
    if (mapOpen) speed.removeAttribute('aria-keyshortcuts');
    else if (!speed.hasAttribute('aria-keyshortcuts')) speed.setAttribute('aria-keyshortcuts', '= Shift+=');
    const span = speed.querySelector('span')!;
    const menuLabel = `${reviewing ? 'Replay' : 'Simulation'} speed: ${label}`;
    if (span.textContent !== menuLabel) span.textContent = menuLabel;
    const engaged = options.isAutopilotEngaged();
    const captureText = engaged ? 'Autopilot off' : 'Autopilot on · current heading + altitude';
    if (captureLabel.textContent !== captureText) captureLabel.textContent = captureText;
    capture.setAttribute('aria-label', engaged ? 'Disconnect autopilot' : 'Engage autopilot at current heading and altitude');
    capture.title = engaged ? 'A: disconnect autopilot' : 'A: engage autopilot and hold current heading and altitude';
    capture.disabled = reviewing || !options.canCapture();
    speed.disabled = !options.canChangeRate();
  }
  function captureCurrent(): void {
    if (disposed || reviewing || !options.canCapture()) return;
    options.onCapture();
  }
  function cycleRate(direction: 1 | -1 = 1): void {
    if (disposed || !options.canChangeRate()) return;
    // Queue intent without presenting it as acknowledged worker state. An older
    // acknowledgment must not rewind a rapidly repeated user's cycle position.
    const current = requestedRate ?? confirmedRate;
    const index = RATES.indexOf(current);
    const rate = RATES[direction < 0 ? Math.max(0, index - 1) : (index + 1) % RATES.length];
    if (rate === current) return;
    requestedRate = rate;
    options.onRate(rate);
  }
  function blocked(event: KeyboardEvent): boolean {
    return event.repeat || event.altKey || event.ctrlKey || event.metaKey
      || !!document.querySelector('dialog[open]')
      || !!root.querySelector('#view-menu[open], #flight-menu[open]')
      || (event.target instanceof Element && !!event.target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), .practice-map-panel, .flight-plan-overlay'));
  }
  function onKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || blocked(event)) return;
    if (event.code === 'KeyA') {
      if (event.shiftKey || reviewing || !options.canCapture()) return;
      event.preventDefault(); event.stopPropagation(); captureCurrent();
    } else if (event.key === '=' || event.key === '+' || event.code === 'Equal' && event.shiftKey) {
      if (options.mapOpen?.()) return;
      // Match the character: German keyboards produce '=' with Shift+Digit0.
      // Consume it before the global digit/throttle handler sees that code.
      if (!options.canChangeRate()) return;
      event.preventDefault(); event.stopPropagation();
      cycleRate(event.key === '+' || event.code === 'Equal' && event.shiftKey ? -1 : 1);
    }
  }
  capture.addEventListener('click', captureCurrent);
  speed.addEventListener('click', event => cycleRate(event.shiftKey ? -1 : 1));
  document.addEventListener('keydown', onKey, true);
  render();

  return {
    cycleRate,
    update(rate, inReview) {
      if (disposed) return;
      if (!RATES.includes(rate)) throw new RangeError('Unsupported simulation speed');
      if (reviewing !== inReview) requestedRate = null;
      confirmedRate = rate; reviewing = inReview;
      if (requestedRate === rate) requestedRate = null;
      render();
    },
    reset() {
      if (disposed) return;
      confirmedRate = 1; requestedRate = null; reviewing = false; render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('keydown', onKey, true);
      capture.remove(); speed.remove(); overlay.remove();
    },
  };
}
