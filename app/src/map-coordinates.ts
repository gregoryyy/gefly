/** WGS84 planning coordinates; independent of source, display and flight coverage. */
export const GPS_COORDINATE_LIMITS = Object.freeze({
  min_lat_deg: -90, max_lat_deg: 90, min_lon_deg: -180, max_lon_deg: 180,
});

export function validGpsCoordinates(lat_deg: number, lon_deg: number): boolean {
  return Number.isFinite(lat_deg) && lat_deg >= GPS_COORDINATE_LIMITS.min_lat_deg && lat_deg <= GPS_COORDINATE_LIMITS.max_lat_deg
    && Number.isFinite(lon_deg) && lon_deg >= GPS_COORDINATE_LIMITS.min_lon_deg && lon_deg <= GPS_COORDINATE_LIMITS.max_lon_deg;
}
