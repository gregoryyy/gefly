// R-WORLD-11 / R-SIM-2: source protocol and authoritative-grid identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TerrainSourceClient } from './terrain-source-client.js';
import { installTerrainSourceHandler } from './terrain-source-worker.js';
import { WorldTerrainStream } from './terrain-stream.js';

const rad = Math.PI / 180;
const world = () => ({ version: 1, id: 'terrain-source-fixture', width: 361, height: 181,
  west_rad: -Math.PI, east_rad: Math.PI, south_rad: -Math.PI / 2, north_rad: Math.PI / 2,
  physical_m: Float64Array.from({ length: 361 * 181 }, (_, i) => 100 + Math.sin(i % 361 / 360 * Math.PI * 2) * 30 + Math.floor(i / 361)),
  geoid_m: new Float64Array(361 * 181).fill(25) });
const fine = () => ({ version: 1, id: 'fine-fixture', width: 2, height: 2, west_rad: 0, east_rad: .1, south_rad: 0, north_rad: .1,
  physical_m: new Float64Array(4).fill(42), geoid_m: new Float64Array(4).fill(25) });

function linkedWorker(options = {}) {
  const instances = [], sources = [];
  class LinkedWorker {
    constructor(url, workerOptions) {
      assert.equal(url.pathname.split('/').at(-1), 'terrain-source-worker.js');
      assert.equal(workerOptions.type, 'module');
      instances.push(this); this.messages = [];
      this.scope = { postMessage: (message, transfer) => {
        options.mutate?.(message);
        const copy = structuredClone(message, { transfer });
        queueMicrotask(() => { if (!this.terminated) this.onmessage?.({ data: copy }); });
      } };
      this.dispose = installTerrainSourceHandler(this.scope, {
        loadWorld: options.loadWorld ?? (async () => world()), loadManifest: async () => null, loadFine: async () => fine(),
        makeStream: (grid, manifest) => {
          const stream = new WorldTerrainStream(grid, manifest, () => {}, () => {}, async () => { throw new Error('unexpected source request'); }, { copernicus: false });
          sources.push(stream); return stream;
        },
      });
    }
    postMessage(message) { this.messages.push(message); queueMicrotask(() => this.scope.onmessage?.({ data: structuredClone(message) })); }
    terminate() { this.terminated = true; this.dispose(); }
  }
  return { Worker: LinkedWorker, instances, sources };
}

test('threaded source batches exactly preserve inline physical/geoid nodes and digests across moves', async () => {
  const link = linkedWorker(), installed = new Map();
  const client = new TerrainSourceClient(grid => installed.set(grid.id, grid), grid => installed.delete(grid.id), link.Worker, { fine: true });
  const inline = new WorldTerrainStream(world(), null, () => {}, () => {}, undefined, { copernicus: false });
  try {
    for (const [latitude, longitude] of [[49.6, 8.6], [49.6, 8.64], [-33.9, 18.4], [10, 179.999], [10, -179.999]]) {
      const lat = latitude * rad, lon = longitude * rad;
      await client.move(lat, lon); await inline.move(lat, lon);
      assert.equal(client.key, inline.key); assert.equal(client.needsUpdate(lat, lon), false);
      assert(installed.size <= 9); assert.equal(client.tiles.size, inline.tiles.size);
      assert.deepEqual([...client.tiles.values()], [...inline.tiles.values()]);
      assert.deepEqual(client.sample(lat, lon), inline.sample(lat, lon));
      assert.equal(client.quality(lat, lon), inline.quality(lat, lon));
      for (const grid of link.sources[0].tiles.values()) assert.equal(grid.physical_m.byteLength, 129 * 129 * 8, 'cache survives transferable replies');
    }
    assert.equal(client.fine.physical_m[0], 42);
    assert.equal(link.sources[0].world.physical_m.byteLength, 361 * 181 * 8, 'world init transfer does not detach source');
  } finally { client.cancel(); inline.cancel(); }
});

test('prefetch remains private and is adopted without changing already installed arrays', async () => {
  const link = linkedWorker(); let installations = 0;
  const client = new TerrainSourceClient(() => installations++, () => {}, link.Worker);
  try {
    const lat = 49.6 * rad, lon = 8.623 * rad, prediction = { lat_rad: lat, lon_rad: 8.66 * rad };
    await client.move(lat, lon); const current = [...client.tiles.values()];
    assert.equal(await client.prefetch(lat, lon, prediction), true);
    assert.equal(installations, 9); assert.deepEqual([...client.tiles.values()], current);
    await client.move(lat, 8.64 * rad);
    assert.equal(installations, 18); assert.equal(client.tiles.size, 9);
    assert.equal(link.sources[0].prefetchTask, null);
  } finally { client.cancel(); }
});

test('cancelled initialization and old epoch responses cannot install or resume anything', async () => {
  let complete;
  const link = linkedWorker({ loadWorld: () => new Promise(resolve => { complete = resolve; }) });
  const client = new TerrainSourceClient(() => assert.fail('cancelled install'), () => {}, link.Worker);
  const move = client.move(49.6 * rad, 8.6 * rad);
  await new Promise(resolve => setImmediate(resolve)); client.cancel();
  await assert.rejects(move, /cancelled/); complete(world());
  client.receive({ protocol: 1, epoch: client.epoch - 1, request: client.request, type: 'moved', tiles: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(client.tiles.size, 0); assert(link.instances[0].terminated);
});

test('complete malformed batches fail before native removal or installation', async () => {
  let corrupt = false, installs = 0, removes = 0;
  const link = linkedWorker({ mutate(message) { if (corrupt && message.type === 'moved') message.tiles[8].physical_m[0] = NaN; } });
  const client = new TerrainSourceClient(() => installs++, () => removes++, link.Worker);
  await client.move(49.6 * rad, 8.6 * rad);
  corrupt = true;
  await assert.rejects(client.move(49.6 * rad, 8.64 * rad), /Invalid terrain source batch/);
  assert.equal(installs, 9); assert.equal(removes, 0); assert.equal(client.tiles.size, 9);
  assert(link.instances[0].terminated);
});

test('worker crash and post failures reject pending work rather than execute inline', async () => {
  const link = linkedWorker({ loadWorld: () => new Promise(() => {}) });
  const client = new TerrainSourceClient(() => assert.fail('unexpected install'), () => {}, link.Worker);
  const move = client.move(49.6 * rad, 8.6 * rad);
  link.instances[0].onerror({ message: 'fixture crash' });
  await assert.rejects(move, /fixture crash/); assert.equal(client.tiles.size, 0);
  assert.throws(() => new TerrainSourceClient(() => {}, () => {}, null), /Worker unavailable/);
});

test('fine-only startup uses source worker without loading a world stream', async () => {
  const link = linkedWorker({ loadWorld: () => assert.fail('fine-only must not load global data') });
  const client = new TerrainSourceClient(() => {}, () => {}, link.Worker, { fine: true, streaming: false });
  try { await client.ready; assert.deepEqual(client.fine, fine()); assert.equal(client.world, null); assert.equal(link.sources.length, 0); }
  finally { client.cancel(); }
});
