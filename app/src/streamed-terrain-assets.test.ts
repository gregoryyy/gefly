import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const base = new URL('../public/terrain/region/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'));
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const packed = readFileSync(new URL(manifest.index.asset, base));
assert.equal(packed.length, manifest.index.bytes);
assert.equal(hash(packed), manifest.index.sha256);
const decoded = gunzipSync(packed, { maxOutputLength: 300000 });
assert.equal(decoded.length, manifest.index.decoded_bytes);
const index = JSON.parse(decoded.toString('utf8'));

test('five-state terrain assets retain compiler identity, explicit source gaps, hashes and exact shared edges', () => {
  assert.equal(manifest.source.compiler_sha256, hash(readFileSync(new URL('../../utils/terrain/build_regional_terrain.py', import.meta.url))));
  assert.equal(index.tiles.length, 608);
  const tiles = new Map<string, DataView>();
  const counts = { full: 0, partial: 0, unavailable: 0 };
  for (const tile of index.tiles) {
    assert(['full', 'partial', 'unavailable'].includes(tile.coverage));
    counts[tile.coverage as keyof typeof counts]++;
    if (tile.coverage === 'unavailable') {
      assert.equal(tile.valid_nodes, 0); assert.equal(tile.asset, undefined); continue;
    }
    const bytes = readFileSync(new URL(tile.asset, base));
    assert.equal(bytes.byteLength, 129 * 129 * 8);
    assert.equal(hash(bytes), tile.sha256, tile.id);
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let valid = 0;
    for (let i = 0; i < 129 * 129; i++) {
      const height = data.getFloat32(i * 8, true), geoid = data.getFloat32(i * 8 + 4, true);
      if (Number.isNaN(height) && Number.isNaN(geoid)) { assert.equal(tile.coverage, 'partial'); continue; }
      assert(Number.isFinite(height) && height > -1000 && height < 10000, tile.id);
      assert(Number.isFinite(geoid) && Math.abs(geoid) < 200, tile.id); valid++;
    }
    assert.equal(valid, tile.valid_nodes, tile.id);
    assert(valid > 0 && (tile.coverage === 'full' ? valid === 129 * 129 : valid < 129 * 129));
    assert(!tiles.has(tile.id)); tiles.set(tile.id, data);
  }
  assert.deepEqual(counts, { full: 382, partial: 93, unavailable: 133 });
  assert.equal(tiles.size, manifest.index.available);
  let edges = 0;
  for (let row = 0; row < 19; row++) for (let col = 0; col < 32; col++) {
    const data = tiles.get(`e${600 + col * 25}-n${4700 + row * 25}`);
    if (!data) continue;
    const east = col < 31 ? tiles.get(`e${625 + col * 25}-n${4700 + row * 25}`) : undefined;
    const north = row < 18 ? tiles.get(`e${600 + col * 25}-n${4725 + row * 25}`) : undefined;
    if (east) edges++; if (north) edges++;
    for (let i = 0; i < 129; i++) for (const offset of [0, 4]) {
      if (east) assert.equal(data.getFloat32((i * 129 + 128) * 8 + offset, true), east.getFloat32(i * 129 * 8 + offset, true));
      if (north) assert.equal(data.getFloat32((128 * 129 + i) * 8 + offset, true), north.getFloat32(i * 8 + offset, true));
    }
  }
  assert(edges > 800, 'the expanded region checks its actual adjacent source edges');
});
