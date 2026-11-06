import type { MapPoint } from './map-point-popup';

export const MAP_LOCATION_TYPES = [
  ['airfield', 'Airfields'], ['heliport', 'Helipads'], ['seaplane', 'Seaplane bases'],
  ['balloonport', 'Balloonports'], ['closed', 'Closed facilities'], ['nav', 'NAV aids'], ['fix', 'Fixes'],
] as const;
export type MapLocationType = typeof MAP_LOCATION_TYPES[number][0];

/** Keep source airport types distinct without changing their popup actions. */
export function mapLocationType<T extends Pick<MapPoint, 'airport_type' | 'kind'>>(point: Readonly<T>): MapLocationType {
  const kind = (point.airport_type ?? point.kind).toLowerCase();
  if (kind === 'heliport' || kind === 'helipad') return 'heliport';
  if (kind === 'seaplane_base') return 'seaplane';
  if (kind === 'balloonport') return 'balloonport';
  if (kind === 'closed') return 'closed';
  if (/airport|airfield/.test(kind)) return 'airfield';
  return /^(fix|waypoint)$/.test(kind) ? 'fix' : 'nav';
}
