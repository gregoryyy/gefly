import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { AIRFIELD_BOUNDS, AIRFIELD_REGIONS, loadAirportCatalogue } from './airport-catalogue.ts';

const root = new URL('../public/airports/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const data = readFileSync(new URL('regional.json', root));
const originalFetch = globalThis.fetch;

async function withPackage(bytes: Uint8Array, metadata: object, check: () => Promise<void>) {
  globalThis.fetch = async input => new Response(String(input).endsWith('manifest.json') ? JSON.stringify(metadata) : bytes);
  try { await check(); } finally { globalThis.fetch = originalFetch; }
}

test('five-state package retains all source types and source counts, including unknown elevations', async () => {
  await withPackage(data, manifest, async () => {
    const airports = await loadAirportCatalogue();
    assert.equal(airports.length, 731);
    for (const id of ['EDFE', 'EDDF', 'EDDM', 'EDDR', 'EDVK']) assert(airports.some(a => a.id === id), id);
    assert.deepEqual([...new Set(airports.map(a => a.iso_region))].sort(), [...AIRFIELD_REGIONS]);
    assert.equal(airports.filter(a => a.type === 'heliport').length, 244);
    assert.equal(airports.filter(a => a.type === 'closed').length, 41);
    assert(airports.some(a => /glider/i.test(a.name)));
    assert(airports.some(a => a.elevation_ft === null));
    assert(airports.every(a => a.lon >= AIRFIELD_BOUNDS[0] && a.lon <= AIRFIELD_BOUNDS[2]
      && a.lat >= AIRFIELD_BOUNDS[1] && a.lat <= AIRFIELD_BOUNDS[3]));
  });
});

test('airfield loader rejects changed scope and corrupt bytes', async () => {
  await withPackage(data, { ...manifest, regions: ['DE-BY'] }, () => assert.rejects(loadAirportCatalogue(), /manifest/));
  await withPackage(Buffer.from('[]'), manifest, () => assert.rejects(loadAirportCatalogue(), /size mismatch/));
  const corrupt = Buffer.from(data); corrupt[20] ^= 1;
  await withPackage(corrupt, manifest, () => assert.rejects(loadAirportCatalogue(), /hash mismatch/));
});

test('hash-valid airfield data still rejects invalid coordinates, region, duplicate ID or type', async () => {
  for (const mutate of [
    (rows: any[]) => { rows[0].lat = 60; },
    (rows: any[]) => { rows[0].iso_region = 'DE-NW'; },
    (rows: any[]) => { rows[1].id = rows[0].id; },
    (rows: any[]) => { rows[0].type = 'invented'; },
  ]) {
    const rows = JSON.parse(data.toString()); mutate(rows);
    const bytes = Buffer.from(JSON.stringify(rows));
    const metadata = { ...manifest, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    await withPackage(bytes, metadata, () => assert.rejects(loadAirportCatalogue(), /Invalid airport/));
  }
});
