// R-COMM-2 / R-DATA-1 / TODO 2.0.194: build-time data for simulated airport contact.
// Usage: node com-contact-data.ts            (rewrite public/airports/com-contact.json)
//        node com-contact-data.ts --check    (fail when the committed file is stale)
// Inputs are the hash-pinned bundled five-state airport/COM packages and the
// hash-pinned worldwide OurAirports cells; the output records every input hash.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Airport } from './src/airport-catalogue.ts';
import { AIRFIELD_BOUNDS } from './src/airport-catalogue.ts';
import { airportDistance_nm, type AirportComStation } from './src/airport-com.ts';
import { CONTACT_RELEASE_NM, SHARED_NAME_AIRPORTS, nameKey } from './src/airport-contact.ts';

export const COM_CONTACT_ID = 'airport-com-contact-v1';
export const COVERAGE_CELL_DEG = 0.25;
const root = new URL('./public/airports/', import.meta.url);
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

interface WorldCell { airports: (Airport & { id: string })[]; com: AirportComStation[] }
export interface ComContactInputs {
  regionalManifest: { sha256: string }; comManifest: { sha256: string };
  worldManifestSha256: string; worldCatalogue: { source_commit: string; retrieved: string };
  regionalCom: AirportComStation[]; worldCells: WorldCell[];
}

/** Reads and integrity-checks the committed inputs. */
export function readComContactInputs(): ComContactInputs {
  const json = (name: string) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
  const regionalManifest = json('manifest.json'); const comManifest = json('com-manifest.json');
  const comBytes = readFileSync(new URL('com-regional.json', root));
  if (sha256(comBytes) !== comManifest.sha256) throw new Error('Bundled COM package hash mismatch');
  if (sha256(readFileSync(new URL('regional.json', root))) !== regionalManifest.sha256) throw new Error('Bundled airport package hash mismatch');
  const worldManifest = json('world/manifest.json'); const catalogueBytes = readFileSync(new URL('world/catalogue.bin', root));
  if (sha256(catalogueBytes) !== worldManifest.sha256) throw new Error('World catalogue hash mismatch');
  const worldCatalogue = JSON.parse(catalogueBytes.toString('utf8'));
  const worldCells = Object.entries(worldCatalogue.cells as Record<string, { sha256: string }>).sort(([a], [b]) => a.localeCompare(b)).map(([id, meta]) => {
    const bytes = readFileSync(new URL(`world/cells/${id}.bin`, root));
    if (sha256(bytes) !== meta.sha256) throw new Error(`World cell ${id} hash mismatch`);
    return JSON.parse(bytes.toString('utf8')) as WorldCell;
  });
  return { regionalManifest, comManifest, worldManifestSha256: worldManifest.sha256, worldCatalogue,
    regionalCom: JSON.parse(comBytes.toString('utf8')), worldCells };
}

/** Distance from a cell centre to its farthest corner, in NM. */
function halfDiagonal_nm(lat: number, lon: number): number {
  const h = COVERAGE_CELL_DEG / 2;
  return Math.max(...[[-h, -h], [-h, h], [h, -h], [h, h]].map(([dlat, dlon]) => airportDistance_nm({ lat, lon }, { lat: lat + dlat, lon: lon + dlon })));
}

/**
 * Pure builder. A coverage cell is complete ('1') when every open worldwide airport
 * that lists any COM row within CONTACT_RELEASE_NM of any point of the cell also has
 * COM rows in the bundled package. Regional names count distinct airports per
 * normalized station name over all worldwide COM rows (a stable, view-independent set).
 */
export function buildComContactData(input: ComContactInputs) {
  const bundled = new Set(input.regionalCom.map(s => s.airport_id));
  const comAirports = new Set(input.worldCells.flatMap(cell => cell.com.map(s => s.airport_id)));
  const [west, south, east, north] = AIRFIELD_BOUNDS;
  const margin = CONTACT_RELEASE_NM / 60 + COVERAGE_CELL_DEG;
  const nearby = input.worldCells.flatMap(cell => cell.airports).filter(a => a.type !== 'closed' && comAirports.has(a.id)
    && a.lat >= south - margin && a.lat <= north + margin && a.lon >= west - 2 * margin && a.lon <= east + 2 * margin);
  const rows: string[] = []; let complete = 0;
  const cols = Math.round((east - west) / COVERAGE_CELL_DEG), count = Math.round((north - south) / COVERAGE_CELL_DEG);
  for (let r = 0; r < count; r++) {
    let row = '';
    for (let c = 0; c < cols; c++) {
      const lat = south + (r + 0.5) * COVERAGE_CELL_DEG, lon = west + (c + 0.5) * COVERAGE_CELL_DEG;
      const reach_nm = CONTACT_RELEASE_NM + halfDiagonal_nm(lat, lon);
      const ok = nearby.every(a => bundled.has(a.id) || airportDistance_nm({ lat, lon }, a) > reach_nm);
      row += ok ? '1' : '0'; if (ok) complete++;
    }
    rows.push(row);
  }
  const names = new Map<string, Set<string>>();
  for (const cell of input.worldCells) for (const s of cell.com) {
    const key = nameKey(s.description); if (!key) continue;
    const ids = names.get(key) ?? new Set<string>(); ids.add(s.airport_id); names.set(key, ids);
  }
  const regional_names = [...names].filter(([, ids]) => ids.size >= SHARED_NAME_AIRPORTS)
    .map(([name, ids]) => [name, ids.size] as [string, number]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return {
    schema: 1, id: COM_CONTACT_ID,
    inputs: { airports_sha256: input.regionalManifest.sha256, com_sha256: input.comManifest.sha256,
      world_catalogue_sha256: input.worldManifestSha256, world_source_commit: input.worldCatalogue.source_commit, world_retrieved: input.worldCatalogue.retrieved },
    coverage: { bounds: [...AIRFIELD_BOUNDS], cell_deg: COVERAGE_CELL_DEG, radius_nm: CONTACT_RELEASE_NM, complete_cells: complete, rows },
    shared_name_airports: SHARED_NAME_AIRPORTS, regional_names,
  };
}

export const serializeComContactData = (data: ReturnType<typeof buildComContactData>) => `${JSON.stringify(data)}\n`;

if (import.meta.main) {
  const output = new URL('com-contact.json', root);
  const text = serializeComContactData(buildComContactData(readComContactInputs()));
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== text) { console.error('public/airports/com-contact.json is stale; run node com-contact-data.ts'); process.exit(1); }
    console.log('com-contact.json is current');
  } else { writeFileSync(output, text); console.log(`Wrote ${output.pathname} (${text.length} bytes)`); }
}
