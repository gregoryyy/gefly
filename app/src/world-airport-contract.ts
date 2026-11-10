import type { Airport } from './airport-catalogue';
import type { AirportComStation } from './airport-com';

/** Pinned community discovery data; no receiver, procedure or terrain authority. */
export const WORLD_AIRPORT_LIMITS = Object.freeze({
  manifestBytes: 1048576, cellBytes: 4194304, searchBytes: 4194304,
  searchExpandedBytes: 25165824, searchEntries: 150000,
  airports: 20000, runways: 30000, com: 30000, navaids: 10000,
  cacheCells: 18, cacheBytes: 25165824, desiredCells: 9, searchResults: 40,
});
export function worldAirportCellId(lon: number, lat: number): string {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90) throw new RangeError('Invalid world catalogue position');
  const longitude = ((lon + 180) % 360 + 360) % 360 - 180;
  return `${Math.floor((longitude + 180) / 5)}-${Math.min(35, Math.floor((lat + 90) / 5))}`;
}
export interface WorldAirport extends Airport { source_id: string; iso_country: string }
export interface WorldRunwayEnd {
  ident: string; lat: number | null; lon: number | null; elevation_ft: number | null;
  heading_degT: number | null; displaced_threshold_ft: number | null;
}
export interface WorldRunway {
  id: string; source_id: string; airport_id: string;
  length_ft: number | null; width_ft: number | null; surface: string;
  lighted: boolean; closed: boolean; le: WorldRunwayEnd; he: WorldRunwayEnd;
}
export interface WorldNavaid {
  id: string; source_id: string; ident: string; name: string; type: string;
  lat: number; lon: number; elevation_ft: number | null; iso_country: string;
  frequency_khz: number | null; associated_airport: string;
}
export interface WorldAirportCounts { airports: number; runways: number; com: number; navaids: number }
export interface WorldAirportCell {
  schema: 1; id: string; airports: WorldAirport[]; runways: WorldRunway[];
  com: AirportComStation[]; navaids: WorldNavaid[];
}
export interface WorldSearchHit {
  kind: 'airport' | 'navaid'; id: string; name: string; codes: string; type: string;
  lat: number; lon: number; iso_country: string; cell: string;
}
export interface WorldAirportManifest {
  schema: 1; id: 'ourairports-world-v1'; cell_degrees: 5;
  source_commit: string; retrieved: string; source: string; source_url: string; source_terms: string;
  source_files: Record<string, { bytes: number; sha256: string; rows: number }>;
  counts: WorldAirportCounts; rejections: Record<string, number>;
  search: { path: 'search.bin'; bytes: number; sha256: string; expanded_bytes: number; expanded_sha256: string; count: number };
  cells: Record<string, { bytes: number; sha256: string; counts: WorldAirportCounts }>;
}
export interface WorldAirportSnapshot {
  airports: WorldAirport[]; runways: WorldRunway[]; com: AirportComStation[]; navaids: WorldNavaid[];
  source: string; retrieved: string; source_commit: string; partial: boolean;
  /** Cell ids whose records are fully included; absent from older workers (= coverage unknown). */
  cells?: string[];
}
