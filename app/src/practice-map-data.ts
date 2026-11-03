import type { FlightState } from './types';

/** MapLibre's WGS84 longitude/latitude degrees, in that order. */
export type MapCoordinate = [number, number];

export interface PracticeMapFrame {
  position: MapCoordinate;
  heading_deg: number;
  path: MapCoordinate[];
}

function coordinate(state: Readonly<FlightState>): MapCoordinate {
  if (!state || !Number.isFinite(state.lon_rad) || !Number.isFinite(state.lat_rad)
    || Math.abs(state.lon_rad) > Math.PI || Math.abs(state.lat_rad) > Math.PI / 2) {
    throw new RangeError('Map position must be finite WGS84 longitude/latitude radians');
  }
  return [state.lon_rad * 180 / Math.PI, state.lat_rad * 180 / Math.PI];
}

/** Detached plotting data; this conversion does not establish navigation accuracy. */
export function makePracticeMapFrame(
  state: Readonly<FlightState>, path: readonly Readonly<FlightState>[],
): PracticeMapFrame {
  const position = coordinate(state);
  if (!Number.isFinite(state.heading_rad)) {
    throw new RangeError('Map true heading must be finite radians');
  }
  // Reduce radians first so even a large finite input cannot overflow conversion.
  const heading_deg = ((state.heading_rad % (2 * Math.PI)) * 180 / Math.PI + 360) % 360;
  return { position, heading_deg, path: Array.from(path, coordinate) };
}

/** Convert [west, south, east, north] to MapLibre image-source NW, NE, SE, SW. */
export function imageryCorners(
  bounds: readonly number[],
): [MapCoordinate, MapCoordinate, MapCoordinate, MapCoordinate] {
  if (bounds.length !== 4 || !Array.from(bounds).every(Number.isFinite)) {
    throw new RangeError('Imagery bounds require four finite WGS84 degree values');
  }
  const [west, south, east, north] = bounds;
  if (west < -180 || east > 180 || south < -90 || north > 90
    || west >= east || south >= north) {
    throw new RangeError('Imagery bounds must be ordered west/east and south/north within WGS84');
  }
  return [[west, north], [east, north], [east, south], [west, south]];
}

/**
 * Map update scheduling. Live flight is limited to four updates per second.
 * Review updates whenever the selected recorded sample changes, so the marker
 * stays synchronized with the instruments during playback (R-REVIEW-1).
 */
export function practiceMapUpdateDue(options: {
  reviewing: boolean; now_ms: number; lastUpdate_ms: number; sample: unknown; lastSample: unknown;
}): boolean {
  if (options.reviewing) return options.sample !== options.lastSample || options.lastUpdate_ms === -Infinity;
  return options.now_ms - options.lastUpdate_ms >= 250;
}
