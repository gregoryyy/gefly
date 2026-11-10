/** Popup position text: WGS84 coordinates plus, for airports, the source field elevation. */
const FT_TO_M = 0.3048;

export const coordinate = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;

export const validMapPosition = (point: { lat_deg: number; lon_deg: number }): boolean =>
  Number.isFinite(point.lat_deg) && Math.abs(point.lat_deg) <= 90
  && Number.isFinite(point.lon_deg) && Math.abs(point.lon_deg) <= 180;

export interface MapPointPosition {
  readonly kind: string;
  readonly lat_deg: number;
  readonly lon_deg: number;
  /** Source field elevation in feet; null when the source has none, absent when not applicable. */
  readonly elevation_ft?: number | null;
}

/**
 * Feet are the source unit (OurAirports) and the charted convention; metres are
 * a derived display value. A missing source elevation stays visibly unavailable.
 */
export function formatPointPosition(point: MapPointPosition): string {
  const position = validMapPosition(point)
    ? `${coordinate(point.lat_deg, 'N', 'S')}, ${coordinate(point.lon_deg, 'E', 'W')}` : 'Coordinates unavailable';
  if (point.elevation_ft === undefined) return `${point.kind} · ${position}`;
  const elevation = typeof point.elevation_ft === 'number' && Number.isFinite(point.elevation_ft)
    ? `elevation ${Math.round(point.elevation_ft)} ft (${Math.round(point.elevation_ft * FT_TO_M)} m)` : 'elevation unavailable';
  return `${point.kind} · ${position} · ${elevation}`;
}
