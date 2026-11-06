/** An instructional visual aid from a community runway record, never an ILS procedure. */
export interface ApproachGuide {
  airportId: string;
  airportName: string;
  runwayIdent: string;
  lat_deg: number;
  lon_deg: number;
  heading_deg_true: number;
  /** Null means unknown: the physical runway end is only an approximate threshold. */
  displaced_threshold_ft: number | null;
  source: string;
}
export interface GuidePosition { lat_deg: number; lon_deg: number }
export interface GuidePoint extends GuidePosition { height_above_threshold_m: number; distance_m: number }
const RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_008.8;
export const GUIDE_LENGTH_M = 3 * 1852;
export const GUIDE_ANGLE_DEG = 3;

export function validApproachGuide(value: ApproachGuide | null): value is ApproachGuide {
  return !!value && ['airportId', 'airportName', 'runwayIdent', 'source'].every(key =>
    typeof value[key as keyof ApproachGuide] === 'string' && (value[key as keyof ApproachGuide] as string).length > 0 && (value[key as keyof ApproachGuide] as string).length <= 300)
    && Number.isFinite(value.lat_deg) && Math.abs(value.lat_deg) < 89.5
    && Number.isFinite(value.lon_deg) && Math.abs(value.lon_deg) <= 180
    && Number.isFinite(value.heading_deg_true) && value.heading_deg_true >= 0 && value.heading_deg_true <= 360
    && (value.displaced_threshold_ft === null || Number.isFinite(value.displaced_threshold_ft)
      && value.displaced_threshold_ft >= 0 && value.displaced_threshold_ft <= 10000);
}

/** Spherical destination, normalized across the antimeridian. Bearings are true. */
export function guideDestination(point: GuidePosition, bearing_deg: number, distance_m: number): GuidePosition {
  const lat = point.lat_deg * RAD, lon = point.lon_deg * RAD, bearing = bearing_deg * RAD, d = distance_m / EARTH_RADIUS_M;
  const nextLat = Math.asin(Math.max(-1, Math.min(1, Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing))));
  const nextLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(nextLat));
  return { lat_deg: nextLat / RAD, lon_deg: ((nextLon / RAD + 540) % 360) - 180 };
}

export function approachThreshold(guide: ApproachGuide): GuidePosition {
  return guideDestination(guide, guide.heading_deg_true, (guide.displaced_threshold_ft ?? 0) * .3048);
}

/** Each height is relative to the rendered threshold; no airport datum conversion is implied. */
export function approachPoints(guide: ApproachGuide): GuidePoint[] {
  const threshold = approachThreshold(guide), away = (guide.heading_deg_true + 180) % 360;
  return Array.from({ length: 31 }, (_, index) => {
    const distance_m = GUIDE_LENGTH_M * index / 30;
    return { ...guideDestination(threshold, away, distance_m), distance_m,
      height_above_threshold_m: Math.tan(GUIDE_ANGLE_DEG * RAD) * distance_m };
  });
}
