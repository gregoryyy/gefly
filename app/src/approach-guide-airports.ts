import { validApproachGuide, type ApproachGuide } from './approach-guide.ts';
import type { Airport } from './airport-catalogue';
import type { WorldRunway } from './world-airport-contract';

/** Return bounded runway-end choices from the selected airport's source records. */
export function airportApproachGuides(airport: Airport, runways: readonly WorldRunway[], source: string): ApproachGuide[] {
  const guides: ApproachGuide[] = [];
  if (airport.type === 'closed') return guides;
  for (const runway of runways) {
    if (guides.length >= 64) break;
    if (runway.closed || runway.airport_id !== airport.id) continue;
    for (const end of [runway.le, runway.he]) {
      if (guides.length >= 64) break;
      if (!end.ident || end.lat === null || end.lon === null || end.heading_degT === null
        || !Number.isFinite(end.heading_degT) || end.heading_degT < 0 || end.heading_degT > 360
        || end.displaced_threshold_ft !== null && runway.length_ft !== null && end.displaced_threshold_ft > runway.length_ft) continue;
      const guide: ApproachGuide = { airportId: airport.id, airportName: airport.name, runwayIdent: end.ident,
        lat_deg: end.lat, lon_deg: end.lon, heading_deg_true: end.heading_degT % 360,
        displaced_threshold_ft: end.displaced_threshold_ft, source };
      if (validApproachGuide(guide)) guides.push(guide);
    }
  }
  return guides;
}
