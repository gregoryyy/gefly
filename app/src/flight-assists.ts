import './flight-assists.css';

const RATES = Object.freeze([1, 1.5, 2, 5, 10]);

interface FlightAssistsOptions {
  root: HTMLElement;
  /** Simulator convenience: capture the worker's current heading and altitude. */
  onCapture(): void;
  onRate(rate: number): void;
  canCapture(): boolean;
  canChangeRate(): boolean;
}

/** Keyboard/menu conveniences; the worker remains authoritative for flight and pacing. */
export function createFlightAssists(options: FlightAssistsOptions): {
  update(rate: number, reviewing: boolean): void;
  cycleRate(): void;
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
  capture.append('Hold current heading + altitude ', shortcut('A'));
  capture.setAttribute('aria-keyshortcuts', 'A');
  capture.title = 'Simulator shortcut: capture current heading and altitude; KAP 140 panel controls remain separate';
  const speed = document.createElement('button');
  speed.type = 'button'; speed.id = 'simulation-rate';
  speed.setAttribute('aria-keyshortcuts', '=');
  speed.append(document.createElement('span'), ' ', shortcut('='));
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
    const title = reviewing ? 'Replay speed; = cycles 1×, 1.5×, 2×, 5×, 10×'
      : 'Simulation speed; = cycles 1×, 1.5×, 2×, 5×, 10×';
    if (overlay.title !== title) overlay.title = title;
    const span = speed.querySelector('span')!;
    const menuLabel = `${reviewing ? 'Replay' : 'Simulation'} speed: ${label}`;
    if (span.textContent !== menuLabel) span.textContent = menuLabel;
    capture.disabled = reviewing || !options.canCapture();
    speed.disabled = !options.canChangeRate();
  }
  function captureCurrent(): void {
    if (disposed || reviewing || !options.canCapture()) return;
    options.onCapture();
  }
  function cycleRate(): void {
    if (disposed || !options.canChangeRate()) return;
    // Queue intent without presenting it as acknowledged worker state. An older
    // acknowledgment must not rewind a rapidly repeated user's cycle position.
    const current = requestedRate ?? confirmedRate;
    const rate = RATES[(RATES.indexOf(current) + 1) % RATES.length];
    requestedRate = rate;
    options.onRate(rate);
  }
  function blocked(event: KeyboardEvent): boolean {
    return event.repeat || event.altKey || event.ctrlKey || event.metaKey
      || !!document.querySelector('dialog[open]')
      || !!root.querySelector('#view-menu[open], #flight-menu[open]')
      || (event.target instanceof Element && !!event.target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), .practice-map-panel'));
  }
  function onKey(event: KeyboardEvent): void {
    if (blocked(event)) return;
    if (event.code === 'KeyA') {
      if (event.shiftKey || reviewing || !options.canCapture()) return;
      event.preventDefault(); event.stopPropagation(); captureCurrent();
    } else if (event.key === '=') {
      // Match the character: German keyboards produce '=' with Shift+Digit0.
      // Consume it before the global digit/throttle handler sees that code.
      if (!options.canChangeRate()) return;
      event.preventDefault(); event.stopPropagation(); cycleRate();
    }
  }
  capture.addEventListener('click', captureCurrent);
  speed.addEventListener('click', cycleRate);
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
