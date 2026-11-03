import { validNavRecord } from '../../studies/e1-browser/sim/navigation.js';
import type { NavAntenna, NavigationPackage } from '../../studies/e1-browser/sim/navigation.js';

export interface FlightMapNavigationProperties {
  station_uid: string;
  identifier: string;
  name: string;
  kind: string;
  component: 'station' | 'DME' | 'GS';
  equipment: string;
  frequency_mhz: string;
  frequency_label: string;
  airport_runway: string;
  elevation_m: number | null;
  package_id: string;
  edition: string;
  historical: boolean;
  source_label: string;
  source_sha256: string;
  source_line_ids: number[];
}

export interface FlightMapNavigationFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: FlightMapNavigationProperties;
}

export interface FlightMapNavigation {
  type: 'FeatureCollection';
  features: FlightMapNavigationFeature[];
}

/**
 * R-NAV-3/4: map the shared historical inventory, never the opt-in fictional LAB.
 * Coordinates are WGS84 [longitude, latitude] degrees; heights stay source AMSL
 * metres, with the package's unverified datum. No range/approach/service is drawn.
 * Collocated components share one primary marker; separate antennas retain their
 * exact source coordinates without inventing an ILS course or surveyed runway.
 * The caller supplies the existing hash-verified loader result. Metadata copies
 * identify those bytes but this pure conversion does not independently hash them.
 */
export function makeFlightMapNavigation(pkg: Readonly<NavigationPackage>): FlightMapNavigation {
  if (!pkg || pkg.version !== 1 || pkg.edition !== '2013.10' || pkg.historical !== true
    || typeof pkg.id !== 'string' || !pkg.id || typeof pkg.source_label !== 'string' || !pkg.source_label
    || !/^[a-f0-9]{64}$/.test(pkg.sha256) || !Array.isArray(pkg.records) || pkg.records.length > 1000
    || !pkg.records.every(validNavRecord) || new Set(pkg.records.map(record => record.uid)).size !== pkg.records.length) {
    throw new RangeError('Map requires the validated historical 2013.10 navigation package');
  }
  const features: FlightMapNavigationFeature[] = [];
  const records = pkg.records.filter(record => record.uid !== 'fictional-lab')
    .slice().sort((a, b) => a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
  for (const record of records) {
    const equipment = record.kind === 'LOC'
      ? `${record.gs ? 'ILS' : 'LOC'}${record.dme ? '/DME' : ''}`
      : `${record.kind}${record.kind === 'VOR' && record.dme ? '/DME' : ''}`;
    const add = (antenna: NavAntenna, component: FlightMapNavigationProperties['component']) => {
      features.push({
        type: 'Feature', id: `${record.uid}/${component}`,
        geometry: { type: 'Point', coordinates: [antenna.lon_deg, antenna.lat_deg] },
        properties: {
          station_uid: record.uid, identifier: record.id, name: record.name,
          kind: record.kind, component, equipment, frequency_mhz: (record.frequency_khz / 1000).toFixed(2),
          frequency_label: `${(record.frequency_khz / 1000).toFixed(2)} MHz`,
          airport_runway: [record.airport, record.runway].filter(Boolean).join(' '), elevation_m: antenna.elevation_m,
          package_id: pkg.id, edition: '2013.10', historical: true, source_label: pkg.source_label,
          source_sha256: pkg.sha256, source_line_ids: [...record.source_line_ids],
        },
      });
    };
    add(record, 'station');
    const distinct = (antenna: NavAntenna) => antenna.lon_deg !== record.lon_deg || antenna.lat_deg !== record.lat_deg;
    if (record.dme && distinct(record.dme)) add(record.dme, 'DME');
    if (record.gs && distinct(record.gs)) add(record.gs, 'GS');
  }
  return { type: 'FeatureCollection', features };
}
