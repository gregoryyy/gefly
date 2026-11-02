import type { ForwardMarkerProjection } from './forward-marker-projection';
import './forward-marker.css';

/** Displays camera-projected body-forward direction without receiving control input. */
export function createForwardMarker(container: HTMLElement): {
  update(projection: ForwardMarkerProjection | null): void;
  dispose(): void;
} {
  const marker = document.createElement('div');
  marker.id = 'aircraft-forward-marker';
  marker.setAttribute('role', 'img');
  marker.setAttribute('aria-label', 'Aircraft forward direction');
  marker.title = 'Aircraft forward direction';
  marker.hidden = true;
  const crosshair = document.createElement('span');
  crosshair.className = 'forward-marker-crosshair';
  const dot = document.createElement('span');
  dot.className = 'forward-marker-dot';
  crosshair.append(dot);
  const arrow = document.createElement('span');
  arrow.className = 'forward-marker-arrow';
  crosshair.setAttribute('aria-hidden', 'true');
  arrow.setAttribute('aria-hidden', 'true');
  marker.append(crosshair, arrow);
  container.append(marker);
  let lastX_px: number | undefined;
  let lastY_px: number | undefined;
  let lastAngle_rad: number | undefined;
  let lastClipped: boolean | undefined;
  let disposed = false;

  return {
    update(projection) {
      if (disposed) return;
      if (!projection || ![projection.x_px, projection.y_px, projection.angle_rad].every(Number.isFinite)) {
        if (!marker.hidden) marker.hidden = true;
        return;
      }
      const { x_px, y_px, angle_rad, clipped } = projection;
      if (x_px !== lastX_px) {
        marker.style.left = `${x_px}px`;
        marker.dataset.xPx = String(x_px);
        lastX_px = x_px;
      }
      if (y_px !== lastY_px) {
        marker.style.top = `${y_px}px`;
        marker.dataset.yPx = String(y_px);
        lastY_px = y_px;
      }
      if (angle_rad !== lastAngle_rad) {
        arrow.style.transform = `rotate(${angle_rad}rad)`;
        lastAngle_rad = angle_rad;
      }
      if (clipped !== lastClipped) {
        marker.dataset.clipped = String(clipped);
        lastClipped = clipped;
      }
      if (marker.hidden) marker.hidden = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      marker.remove();
    },
  };
}
