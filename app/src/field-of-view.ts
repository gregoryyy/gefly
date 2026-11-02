export const DEFAULT_FOV_RAD = Math.PI / 3;
export const MIN_FOV_RAD = 20 * Math.PI / 180;
export const MAX_FOV_RAD = 100 * Math.PI / 180;

function wheelPixels(deltaY: number, deltaMode: number, viewportHeight_px: number): number | null {
  if (!Number.isFinite(deltaY) || deltaY === 0) return null;
  const unit_px = deltaMode === 0 ? 1 : deltaMode === 1 ? 16
    : deltaMode === 2 && Number.isFinite(viewportHeight_px) && viewportHeight_px > 0
      ? viewportHeight_px : null;
  return unit_px === null ? null : Math.max(-200, Math.min(200, deltaY * unit_px));
}

/** Camera-only zoom; positive vertical scrolling widens the field of view. */
export function nextFieldOfView(current_rad: number, deltaY: number, deltaMode: number, viewportHeight_px: number): number {
  const current = Math.max(MIN_FOV_RAD, Math.min(MAX_FOV_RAD,
    Number.isFinite(current_rad) && current_rad > 0 ? current_rad : DEFAULT_FOV_RAD));
  const pixels = wheelPixels(deltaY, deltaMode, viewportHeight_px);
  return pixels === null ? current
    : Math.max(MIN_FOV_RAD, Math.min(MAX_FOV_RAD, current * Math.exp(pixels * .0015)));
}

interface FieldOfViewOptions {
  element: HTMLElement;
  getFov: () => number;
  onChange: (fov_rad: number) => void;
  isBlocked?: () => boolean;
}

/** Two-finger vertical scroll and mouse wheel over the scene share this input. */
export function createFieldOfViewControl(options: FieldOfViewOptions): { dispose(): void } {
  const { element } = options;
  function wheel(event: WheelEvent): void {
    const target = event.target as Element | null;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || options.isBlocked?.()
      || element.ownerDocument.querySelector('dialog[open]')
      || target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog')
      || !Number.isFinite(event.deltaX) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      || wheelPixels(event.deltaY, event.deltaMode, element.clientHeight) === null) return;
    event.preventDefault();
    event.stopPropagation();
    const current = options.getFov();
    const next = nextFieldOfView(current, event.deltaY, event.deltaMode, element.clientHeight);
    if (next !== current) options.onChange(next);
  }
  // Capture before the renderer's canvas listener consumes native wheel input.
  element.addEventListener('wheel', wheel, { passive: false, capture: true });
  return { dispose: () => element.removeEventListener('wheel', wheel, true) };
}
