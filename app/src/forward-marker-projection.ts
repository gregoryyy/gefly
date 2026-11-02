export interface ForwardMarkerProjection {
  x_px: number;
  y_px: number;
  /** Clockwise from screen-up; suitable for an upward-pointing CSS chevron. */
  angle_rad: number;
  clipped: boolean;
}
interface ProjectionInput {
  /** Aircraft forward resolved along the actual camera right/up/forward axes. */
  right: number; up: number; forward: number;
  width_px: number; height_px: number; fov_y_rad: number;
  insets?: { top: number; right: number; bottom: number; left: number };
}

/** View-only perspective projection; inset clipping retains the actual screen direction. */
export function projectForwardDirection(input: Readonly<ProjectionInput>): ForwardMarkerProjection | null {
  const { right, up, forward, width_px, height_px, fov_y_rad } = input;
  const inset = input.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  if (![right, up, forward, width_px, height_px, fov_y_rad].every(Number.isFinite)
    || width_px <= 0 || height_px <= 0 || fov_y_rad <= 0 || fov_y_rad >= Math.PI || forward < 0
    || ![inset.top, inset.right, inset.bottom, inset.left].every(value => Number.isFinite(value) && value >= 0)) return null;
  const cx = width_px / 2, cy = height_px / 2, tanY = Math.tan(fov_y_rad / 2);
  if (cx === 0 || cy === 0 || !Number.isFinite(tanY) || tanY <= 0
    || inset.left + inset.right >= width_px || inset.top + inset.bottom >= height_px) return null;
  const clampX = (x: number) => Math.max(inset.left, Math.min(width_px - inset.right, x));
  const clampY = (y: number) => Math.max(inset.top, Math.min(height_px - inset.bottom, y));
  const originX = clampX(cx), originY = clampY(cy);
  const horizontal = Math.max(Math.abs(right), Math.abs(up));
  if (horizontal === 0) return forward > 0 ? { x_px: originX, y_px: originY, angle_rad: 0,
    clipped: originX !== cx || originY !== cy } : null;
  const dx = right / horizontal, dy = -up / horizontal;
  // A shared ray distance preserves the arrow direction at side/corner clipping.
  const edge = Math.min(
    dx > 0 ? (width_px - inset.right - originX) / dx : dx < 0 ? (originX - inset.left) / -dx : Infinity,
    dy > 0 ? (height_px - inset.bottom - originY) / dy : dy < 0 ? (originY - inset.top) / -dy : Infinity,
  );
  // Pixel displacement = camera-axis ratio * half-height / tan(vertical FOV/2).
  // Logarithms avoid overflow/underflow products for finite extreme inputs.
  // Clamp the forward component relative to vector scale at the near plane.
  const logForward = Math.max(forward > 0 ? Math.log(forward) : -Infinity,
    Math.log(Math.max(horizontal, forward)) + Math.log(1e-12));
  const projected = Math.exp(Math.log(horizontal) - logForward + Math.log(cy) - Math.log(tanY));
  const angle_rad = Math.atan2(dx, -dy);
  if (Number.isFinite(projected)) {
    const x = cx + dx * projected, y = cy + dy * projected;
    const tolerance = 8 * Number.EPSILON * Math.max(1, width_px, height_px);
    if (Number.isFinite(x) && Number.isFinite(y) && x >= inset.left - tolerance
      && x <= width_px - inset.right + tolerance && y >= inset.top - tolerance && y <= height_px - inset.bottom + tolerance) {
      return { x_px: clampX(x), y_px: clampY(y), angle_rad: projected === 0 ? 0 : angle_rad, clipped: false };
    }
  }
  return {
    x_px: clampX(originX + dx * edge), y_px: clampY(originY + dy * edge), angle_rad, clipped: true,
  };
}
