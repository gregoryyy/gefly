import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = new URL('../public/terrain/region/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'));
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('regional terrain assets retain exact compiler identity, hashes, finite nodes and shared edges', () => {
  assert.equal(manifest.source.compiler_sha256, hash(readFileSync(new URL('../../utils/terrain/build_regional_terrain.py', import.meta.url))));
  assert.equal(manifest.tiles.length, 42);
  const tiles = new Map<string, DataView>();
  for (const tile of manifest.tiles) {
    const bytes = readFileSync(new URL(tile.asset, base));
    assert.equal(bytes.byteLength, 129 * 129 * 8);
    assert.equal(hash(bytes), tile.sha256, tile.id);
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < 129 * 129; i++) {
      const height = data.getFloat32(i * 8, true), geoid = data.getFloat32(i * 8 + 4, true);
      assert(Number.isFinite(height) && height > -1000 && height < 10000, tile.id);
      assert(Number.isFinite(geoid) && Math.abs(geoid) < 200, tile.id);
    }
    assert(!tiles.has(tile.id)); tiles.set(tile.id, data);
  }
  for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
    const data = tiles.get(`e${825 + col * 25}-n${4925 + row * 25}`)!;
    assert(data);
    const east = tiles.get(`e${850 + col * 25}-n${4925 + row * 25}`);
    const north = tiles.get(`e${825 + col * 25}-n${4950 + row * 25}`);
    for (let i = 0; i < 129; i++) for (const offset of [0, 4]) {
      if (east) assert.equal(data.getFloat32((i * 129 + 128) * 8 + offset, true), east.getFloat32(i * 129 * 8 + offset, true));
      if (north) assert.equal(data.getFloat32((128 * 129 + i) * 8 + offset, true), north.getFloat32(i * 8 + offset, true));
    }
  }
});
