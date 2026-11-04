import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { test } from 'node:test';
import { loadMapFixes, parseMapFixes, decodeMapFixes, MAP_FIX_SOURCE_LABEL } from './map-fixes.ts';

const root = new URL('../public/mapdata/', import.meta.url);
const manifestBytes = await readFile(new URL('fixes-manifest.json', root));
const manifest = JSON.parse(manifestBytes.toString());
const asset = await readFile(new URL(manifest.asset, root));
const pkg = JSON.parse(gunzipSync(asset).toString());

test('source-backed historical fixes preserve exact source coordinates, duplicate names and immutable identity', async () => {
  assert.equal(createHash('sha256').update(asset).digest('hex'), manifest.sha256);
  assert.equal(asset.length, manifest.bytes);
  assert.equal(gunzipSync(asset).length, manifest.decoded_bytes);
  const fixes = parseMapFixes(pkg);
  assert.equal(fixes.length, 2739);
  const rudus = fixes.find(fix => fix.name === 'RUDUS')!;
  assert.deepEqual(rudus, { id: 'fix201310-93759', name: 'RUDUS', lon_deg: 8.078333, lat_deg: 50.0475, source_label: MAP_FIX_SOURCE_LABEL });
  const source = (await readFile(new URL('fixes-source.dat', root), 'utf8')).split('\n');
  const sourceRows = new Set(source.map(line => {
    const [lat, lon, name] = line.trim().split(/\s+/);
    return `${name}/${Number(lon)}/${Number(lat)}`;
  }));
  for (const fix of fixes) assert(sourceRows.has(`${fix.name}/${fix.lon_deg}/${fix.lat_deg}`), `original source row for ${fix.id}`);
  const duplicate = fixes.filter(fix => fix.name === 'DF162');
  assert.equal(duplicate.length, 2); assert.notEqual(duplicate[0].id, duplicate[1].id);
  assert(Object.isFrozen(fixes)); assert(Object.isFrozen(rudus));
  assert.equal(pkg.fixes.find((fix: { name: string }) => fix.name === 'RUDUS').source_line, 93759);
});

test('fixes reject invalid coordinates, duplicate identities, invented editions and unsafe names without partial results', () => {
  for (const change of [{ historical: false }, { fixes: [] }, { source: { ...pkg.source, edition: '2026.11' } }, { bounds: [0, 0, 180, 90] }]) {
    assert.throws(() => parseMapFixes({ ...pkg, ...change }));
  }
  for (const row of [ { ...pkg.fixes[0], lon_deg: NaN }, { ...pkg.fixes[0], lat_deg: 52 },
    { ...pkg.fixes[0], name: '<svg>' }, { ...pkg.fixes[0], source_line: Infinity }, pkg.fixes[1] ]) {
    assert.throws(() => parseMapFixes({ ...pkg, fixes: [row, ...pkg.fixes.slice(1)] }));
  }
});

test('fixed same-origin loader verifies both hashes and returns source-backed fixes; corruption fails closed', async () => {
  const previous = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async input => {
      calls.push(String(input));
      return new Response(String(input).endsWith('fixes-manifest.json') ? manifestBytes : asset);
    };
    assert.equal((await loadMapFixes()).length, 2739);
    assert.deepEqual(calls, ['/mapdata/fixes-manifest.json', '/mapdata/fixes-2013.10-v1.json.bin']);
    globalThis.fetch = async () => new Response('{}');
    await assert.rejects(loadMapFixes(), /hash mismatch/);
    globalThis.fetch = async input => new Response(String(input).endsWith('fixes-manifest.json') ? manifestBytes : Buffer.alloc(asset.length, 32));
    await assert.rejects(loadMapFixes(), /hash mismatch/);
    globalThis.fetch = async () => new Response('', { headers: { 'content-length': '5000' } });
    await assert.rejects(loadMapFixes(), /too large/);
    const aborted = new AbortController(); aborted.abort();
    calls.length = 0; await assert.rejects(loadMapFixes(aborted.signal)); assert.equal(calls.length, 0);
    await assert.rejects(decodeMapFixes(new Uint8Array([1, 2, 3])));
    await assert.rejects(decodeMapFixes(new Uint8Array(asset.subarray(0, asset.length - 6))));
    const crc = Uint8Array.from(asset); crc[crc.length - 8] ^= 1;
    await assert.rejects(decodeMapFixes(crc));
    await assert.rejects(decodeMapFixes(new Uint8Array(gzipSync(Buffer.alloc(manifest.decoded_bytes + 1, 32)))), /decoded size invalid/);
  } finally { globalThis.fetch = previous; }
});
