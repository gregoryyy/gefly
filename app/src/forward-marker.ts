import type { BodyDirectionId, BodyDirectionProjections, ForwardMarkerProjection } from './forward-marker-projection';
import './forward-marker.css';

function createDirectionMarker(container: HTMLElement, direction: BodyDirectionId): {
  update(projection: ForwardMarkerProjection | null): void;
  dispose(): void;
} {
  const marker = document.createElement('div');
  marker.id = `aircraft-${direction}-marker`;
  if (direction !== 'forward') marker.className = 'aircraft-direction-marker';
  marker.dataset.direction = direction;
  marker.setAttribute('role', 'img');
  const description = `Aircraft ${direction} direction${direction === 'forward' ? '' : ` (${direction === 'back' ? 180 : 90}°)`}`;
  marker.setAttribute('aria-label', description);
  marker.title = description;
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
  if (direction === 'forward') marker.append(crosshair, arrow);
  else {
    const label = document.createElement('span'); label.className = 'direction-marker-label';
    label.textContent = { left: 'L', right: 'R', up: 'U', down: 'D', back: 'B' }[direction];
    label.setAttribute('aria-hidden', 'true'); marker.append(label, arrow);
  }
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

/** The existing nose crosshair plus small body-axis references. Every cue is
 * camera-projected and pointer-transparent; none receives flight controls. */
export function createForwardMarker(container: HTMLElement): {
  update(projection: ForwardMarkerProjection | null, directions?: BodyDirectionProjections): void;
  dispose(): void;
} {
  const ids: BodyDirectionId[] = ['forward', 'left', 'right', 'up', 'down', 'back'];
  const markers = new Map(ids.map(id => [id, createDirectionMarker(container, id)]));
  return {
    update(projection, directions) {
      markers.get('forward')!.update(projection);
      for (const id of ids) if (id !== 'forward') markers.get(id)!.update(directions?.[id] ?? null);
    },
    dispose() { for (const marker of markers.values()) marker.dispose(); },
  };
}
