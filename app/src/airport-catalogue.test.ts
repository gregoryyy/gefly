import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadAirportCatalogue } from './airport-catalogue.ts';

const root = new URL('../public/airports/', import.meta.url);
const manifest = readFileSync(new URL('manifest.json', root));
const data = readFileSync(new URL('regional.json', root));
const originalFetch = globalThis.fetch;

test('regional airport package loads verified bytes and rejects corruption', async () => {
  let corrupt = false;
  globalThis.fetch = async (input) => {
    const bytes = String(input).endsWith('manifest.json') ? manifest : corrupt ? Buffer.from('[]') : data;
    return new Response(bytes);
  };
  try {
    const airports = await loadAirportCatalogue();
    assert.equal(airports.length, 103);
    assert(airports.some((airport) => airport.id === 'EDFE'));
    assert(airports.some((airport) => airport.id === 'EDDF'));
    assert(airports.every((airport) => airport.lat >= 49 && airport.lat <= 50.75 && airport.lon >= 8 && airport.lon <= 10));
    corrupt = true;
    await assert.rejects(loadAirportCatalogue());
  } finally { globalThis.fetch = originalFetch; }
});
