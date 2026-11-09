/** Viewport and fitted instrument-surface dimensions in screen CSS pixels. */
export interface PanelFrame {
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
}

/** Absolute surface offsets from the viewport origin, in screen CSS pixels. */
export interface PanelZoom {
  zoom: number;
  x: number;
  y: number;
}

const MIN_ZOOM = 1, MAX_ZOOM = 3;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function validateFrame(frame: PanelFrame): void {
  if (!frame || ![frame.width, frame.height, frame.baseWidth, frame.baseHeight].every(value => Number.isFinite(value) && value > 0)
    || !Number.isFinite(frame.baseWidth * MAX_ZOOM) || !Number.isFinite(frame.baseHeight * MAX_ZOOM))
    throw new RangeError('Panel frame dimensions must be positive, finite and support 3× zoom.');
}

function axisOffset(offset: number, frameExtent: number, surfaceExtent: number): number {
  const difference = frameExtent - surfaceExtent;
  return clamp(offset, Math.min(0, difference), Math.max(0, difference));
}

/** Normal fit is centered horizontally and aligned with the top of its frame. */
export function fitPanel(frame: PanelFrame): PanelZoom {
  validateFrame(frame);
  return { zoom: MIN_ZOOM, x: (frame.width - frame.baseWidth) / 2, y: 0 };
}

function normalizedState(state: PanelZoom, frame: PanelFrame): PanelZoom {
  return !state || ![state.zoom, state.x, state.y].every(Number.isFinite)
    || state.zoom < MIN_ZOOM || state.zoom > MAX_ZOOM || state.zoom === MIN_ZOOM
    ? fitPanel(frame)
    : { zoom: state.zoom,
      x: axisOffset(state.x, frame.width, frame.baseWidth * state.zoom),
      y: axisOffset(state.y, frame.height, frame.baseHeight * state.zoom) };
}

/** Pointer-anchored zoom with edge limits applied on every step (R-PANEL-1).
 * The DOM uses frame.height === baseHeight, so vertical clamping prevents empty
 * space above or below the instrument surface at every supported zoom.
 */
export function zoomPanel(state: PanelZoom, frame: PanelFrame,
  pointer: { x: number; y: number }, deltaPixels: number): PanelZoom {
  validateFrame(frame);
  const current = normalizedState(state, frame);
  if (!pointer || ![pointer.x, pointer.y, deltaPixels].every(Number.isFinite) || deltaPixels === 0) return current;

  const zoom = clamp(current.zoom * Math.exp(-clamp(deltaPixels, -200, 200) * .002), MIN_ZOOM, MAX_ZOOM);
  if (zoom === MIN_ZOOM) return fitPanel(frame);
  const ratio = zoom / current.zoom;
  const px = clamp(pointer.x, 0, frame.width), py = clamp(pointer.y, 0, frame.height);
  return { zoom,
    x: axisOffset(px - (px - current.x) * ratio, frame.width, frame.baseWidth * zoom),
    y: axisOffset(py - (py - current.y) * ratio, frame.height, frame.baseHeight * zoom) };
}

/** Move zoomed content by screen CSS pixels, retaining the same edge limits as
 * pointer zoom. At normal fit, drag/wheel movement cannot reposition the panel.
 */
export function panPanel(state: PanelZoom, frame: PanelFrame, delta: { x: number; y: number }): PanelZoom {
  validateFrame(frame);
  const current = normalizedState(state, frame);
  if (current.zoom === MIN_ZOOM || !delta || ![delta.x, delta.y].every(Number.isFinite)) return current;
  return { zoom: current.zoom,
    x: axisOffset(current.x + delta.x, frame.width, frame.baseWidth * current.zoom),
    y: axisOffset(current.y + delta.y, frame.height, frame.baseHeight * current.zoom) };
}
