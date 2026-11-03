import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { loadFlightMapCatalogue } from './flight-map-catalogue.ts';

const root = new URL('../public/mapdata/', import.meta.url);
const originalManifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const originalRaw = await readFile(new URL(originalManifest.asset, root));
const originalData = JSON.parse(originalRaw.toString('utf8'));
const sha = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');

async function fixture(run: (requests: string[]) => Promise<void>, change?: (manifest: any, data: any) => void, corrupt = false) {
  const manifest = structuredClone(originalManifest), data = structuredClone(originalData);
  change?.(manifest, data);
  const raw = Buffer.from(JSON.stringify(data));
  manifest.bytes = raw.length; manifest.sha256 = corrupt ? '0'.repeat(64) : sha(raw);
  const requests: string[] = [];
  const before = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    assert.equal(options?.redirect, 'error'); assert.ok(options?.signal);
    requests.push(String(input));
    return new Response(String(input) === '/mapdata/manifest.json' ? JSON.stringify(manifest) : raw);
  };
  try { await run(requests); } finally { globalThis.fetch = before; }
}

test('R-WORLD-6 map inventory has pinned bytes, 144 snapshot stations and 66 historical localizers', async () => {
  assert.equal(originalManifest.sha256, sha(originalRaw));
  assert.equal(originalManifest.bytes, originalRaw.length);
  await fixture(async requests => {
    const data = await loadFlightMapCatalogue();
    assert.equal(data.features.length, 277);
    assert.equal(data.features.filter(feature => feature.properties.component === 'station').length, 210);
    assert.equal(data.features.filter(feature => feature.properties.historical && feature.properties.component === 'station').length, 66);
    assert.equal(data.features.filter(feature => feature.properties.component === 'GS').length, 61);
    assert.equal(data.features.filter(feature => feature.properties.component === 'DME').length, 6);
    const ndb = data.features.find(feature => feature.properties.kind === 'NDB')!;
    assert.match(ndb.properties.frequency_label, / kHz$/); assert.equal(ndb.properties.frequency_mhz, '');
    assert.equal(data.features.some(feature => feature.properties.elevation_m === null), true);
    assert.deepEqual(requests, ['/mapdata/manifest.json', '/mapdata/southern-germany-v1.json']);
  });
});

test('catalogue rejects hash corruption and manifest redirection/source substitutions', async () => {
  await fixture(async () => assert.rejects(loadFlightMapCatalogue(), /hash mismatch/), undefined, true);
  for (const change of [
    (m: any) => { m.asset = 'https://evil.test/data.json'; },
    (m: any) => { m.sources[0].sha256 = '0'.repeat(64); },
    (m: any) => { m.bounds[0] = 5; },
    (m: any) => { m.count = 1001; },
  ]) await fixture(async requests => {
    await assert.rejects(loadFlightMapCatalogue(), /Invalid/);
    assert.deepEqual(requests, ['/mapdata/manifest.json']);
  }, change);
});

test('hash-consistent malformed geometry, units, provenance, duplicates and orphan components fail closed', async () => {
  for (const change of [
    (_m: any, d: any) => { d.features[0].geometry.coordinates[0] = null; },
    (_m: any, d: any) => { d.features[0].geometry.coordinates[0] = 14.1; },
    (_m: any, d: any) => { d.features[1].id = d.features[0].id; },
    (_m: any, d: any) => { d.features[0].properties.source_label = 'Current official AIS'; },
    (_m: any, d: any) => { d.features[0].properties.source_line_ids = []; },
    (_m: any, d: any) => { d.features.find((f: any) => f.properties.kind === 'NDB').properties.frequency_label = '330.00 MHz'; },
    (_m: any, d: any) => { d.features.find((f: any) => f.properties.component === 'GS').properties.identifier = 'OTHER'; },
    (m: any) => { m.counts_by_source.nav810--; },
  ]) await fixture(async () => assert.rejects(loadFlightMapCatalogue(), /Invalid/), change);
});

test('network/oversized/aborted requests remain unavailable rather than a partial catalogue', async () => {
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(loadFlightMapCatalogue(), /unavailable/);
    globalThis.fetch = async () => new Response('x'.repeat(8193));
    await assert.rejects(loadFlightMapCatalogue(), /oversized/);
    const controller = new AbortController(); controller.abort();
    globalThis.fetch = async (_input, options) => {
      options!.signal!.throwIfAborted();
      throw new Error('Unexpected fetch');
    };
    await assert.rejects(loadFlightMapCatalogue(controller.signal), { name: 'AbortError' });
  } finally { globalThis.fetch = before; }
});
