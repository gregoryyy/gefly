import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { loadAirportComDirectory, filterAirportComStations, isComChannel } from './airport-com.ts';
import type { Airport } from './airport-catalogue.ts';

const root = new URL('../public/airports/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('com-manifest.json', root), 'utf8'));
const bytes = readFileSync(new URL('com-regional.json', root));
const airports: Airport[] = JSON.parse(readFileSync(new URL('regional.json', root), 'utf8'));
const stations = JSON.parse(bytes.toString());
async function withPackage(data: Uint8Array, metadata: object, check: () => Promise<void>) {
  const fetch = globalThis.fetch;
  globalThis.fetch = async input => new Response(String(input).endsWith('com-manifest.json') ? JSON.stringify(metadata) : data);
  try { await check(); } finally { globalThis.fetch = fetch; }
}

test('COM snapshot joins existing airport IDs and preserves 8.33 channel names and source values', async () => {
  await withPackage(bytes, manifest, async () => {
    const directory = await loadAirportComDirectory();
    assert.equal(directory.stations.length, 631);
    assert.equal(new Set(directory.stations.map(s => s.airport_id)).size, 251);
    assert(directory.stations.every(s => airports.some(a => a.id === s.airport_id)));
    const egelsbach = filterAirportComStations(directory.stations, airports, { airportId: 'EDFE' });
    assert(egelsbach.some(s => s.channel_khz === 118405 && s.service === 'INFO'));
    assert(egelsbach.some(s => s.channel_khz === 121730 && s.service === 'RMP'));
    assert(directory.stations.some(s => s.airport_id === 'EDMC' && s.source_frequency_mhz === '130.661'));
    assert(isComChannel(118405)); assert(isComChannel(136990));
    for (const n of [118020, 118405.5, 117995, 137000, NaN]) assert.equal(isComChannel(n), false);
  });
});

test('COM filtering supports name, service, nearby and explicit airport without fabricating missing stations', () => {
  const nearby = filterAirportComStations(stations, airports, { query: 'Egelsbach', service: 'INFO', position: { lat: 49.96, lon: 8.643 }, nearby_nm: 50 });
  assert(nearby.length > 0); assert(nearby.every(s => s.airport_id === 'EDFE' && s.service === 'INFO'));
  assert.equal(filterAirportComStations(stations, airports, { airportId: 'EDFE', position: { lat: 0, lon: 0 }, nearby_nm: 50 }).length, 0);
  assert.deepEqual(filterAirportComStations(stations, airports, { airportId: 'unknown' }), []);
});

test('COM loader rejects corrupted data, excessive manifest sizes and hash-valid malformed rows', async () => {
  const corrupt = Buffer.from(bytes); corrupt[20] ^= 1;
  await withPackage(corrupt, manifest, () => assert.rejects(loadAirportComDirectory(), /hash mismatch/));
  await withPackage(bytes, { ...manifest, bytes: 99999999 }, () => assert.rejects(loadAirportComDirectory(), /manifest/));
  for (const mutate of [
    (rows: any[]) => { rows[1].id = rows[0].id; },
    (rows: any[]) => { rows[0].channel_khz = null; },
    (rows: any[]) => { rows[0].source_frequency_mhz = 'not a frequency'; },
  ]) {
    const rows = JSON.parse(bytes.toString()); mutate(rows); const data = Buffer.from(JSON.stringify(rows));
    const meta = { ...manifest, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
    await withPackage(data, meta, () => assert.rejects(loadAirportComDirectory(), /station/));
  }
});
