import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { ancestorCrop, createRegionalImageryProvider, regionalTileAt, validateRegionalManifest } from './regional-imagery.ts';

const bytes = new Uint8Array([255, 216, 1, 2, 255, 217]);
const hash = createHash('sha256').update(bytes).digest('hex');
const tile = { z: 10, ...regionalTileAt(50, 8.6, 10), bytes: bytes.length, sha256: hash };
const manifest = () => ({ version: 1, id: 'hessen-rhein-main-dop-v1', scheme: 'xyz', projection: 'EPSG:3857', tile_size_px: 512,
  min_level: 10, max_level: 15, bounds: [8.48, 49.93, 8.80, 50.12], source: { name: 'HVBG', license: 'DL-DE-Zero-2.0', capture_date: null }, tiles: [{ ...tile }] });

test('XYZ geographic fixtures and north-to-south ancestor cropping', () => {
  assert.deepEqual(regionalTileAt(0, 0, 10), { x: 512, y: 512 });
  assert.deepEqual(regionalTileAt(50, 8.6, 10), { x: 536, y: 347 });
  assert.deepEqual(ancestorCrop(2145, 1389, 12, 10), { sx: 128, sy: 128, size: 128 });
  assert.deepEqual(ancestorCrop(2147, 1391, 12, 10), { sx: 384, sy: 384, size: 128 });
});

test('manifest rejects duplicate, hostile paths, bounds, hash and level', () => {
  assert.ok(Object.isFrozen(validateRegionalManifest(manifest()).tiles[0]));
  for (const change of [
    (m: any) => m.tiles.push({ ...m.tiles[0] }),
    (m: any) => m.tiles[0].path = 'https://example.com/a.jpg',
    (m: any) => m.bounds[0] = -180,
    (m: any) => m.tiles[0].sha256 = 'invalid',
    (m: any) => m.tiles[0].z = 16,
    (m: any) => m.tiles[0].x = 0,
  ]) { const m = manifest(); change(m); assert.throws(() => validateRegionalManifest(m)); }
});

test('requests deduplicate parents, crop correctly, and disposal closes cache', async () => {
  const oldFetch = globalThis.fetch, oldBitmap = globalThis.createImageBitmap, oldDocument = globalThis.document;
  let count = 0, closed = 0; const draws: number[][] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify(manifest()));
    count++; return new Response(bytes);
  }) as typeof fetch;
  globalThis.createImageBitmap = (async () => ({ width: 512, height: 512, close: () => closed++ })) as typeof createImageBitmap;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (_image: unknown, ...args: number[]) => draws.push(args) }) }) } as unknown as Document;
  try {
    const { provider, dispose, getStats } = await createRegionalImageryProvider();
    const x = tile.x * 4 + 1, y = tile.y * 4 + 2;
    await Promise.all([provider.requestImage(x, y, 12), provider.requestImage(x, y, 12)]);
    assert.equal(count, 1); assert.equal(getStats().loadedTiles, 1);
    assert.deepEqual(draws[0], [128, 256, 128, 128, 0, 0, 512, 512]);
    assert.equal(getStats().resolutionAt(50, 8.6), 10);
    assert.equal(getStats().resolutionAt(0, 0), null);
    dispose(); dispose(); assert.equal(closed, 1); assert.equal(getStats().cacheSize, 0);
  } finally { globalThis.fetch = oldFetch; globalThis.createImageBitmap = oldBitmap; globalThis.document = oldDocument; }
});

test('failed finer tile degrades to its valid parent', async () => {
  const oldFetch = globalThis.fetch, oldBitmap = globalThis.createImageBitmap, oldDocument = globalThis.document;
  const m = manifest(); const child = { ...tile, z: 11, x: tile.x * 2, y: tile.y * 2 };
  m.tiles.push(child); const draws: number[][] = [], notices: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify(m));
    return new Response(String(url).includes('/11/') ? new Uint8Array([1, 2, 3]) : bytes);
  }) as typeof fetch;
  globalThis.createImageBitmap = (async () => ({ width: 512, height: 512, close() {} })) as typeof createImageBitmap;
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage: (_image: unknown, ...args: number[]) => draws.push(args) }) }) } as unknown as Document;
  try {
    const { provider, dispose, getStats } = await createRegionalImageryProvider({ onStatus: s => notices.push(s) });
    await provider.requestImage(child.x, child.y, 11);
    assert.equal(getStats().failedTiles, 1); assert.equal(getStats().loadedTiles, 1);
    assert.deepEqual(draws[0], [0, 0, 256, 256, 0, 0, 512, 512]);
    assert.ok(notices.some(s => s.includes('unavailable'))); dispose();
  } finally { globalThis.fetch = oldFetch; globalThis.createImageBitmap = oldBitmap; globalThis.document = oldDocument; }
});

test('tile fetch concurrency is bounded and disposal aborts queued work', async () => {
  const oldFetch = globalThis.fetch, oldDocument = globalThis.document;
  const m = manifest(); const nw = regionalTileAt(50.12, 8.48, 15);
  m.tiles = Array.from({ length: 10 }, (_, i) => ({ ...tile, z: 15, x: nw.x + i, y: nw.y }));
  let active = 0, peak = 0, requests = 0;
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith('manifest.json')) return Promise.resolve(new Response(JSON.stringify(m)));
    requests++; active++; peak = Math.max(peak, active);
    return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => { active--; reject(new Error('aborted')); }, { once: true }));
  }) as typeof fetch;
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) } as unknown as Document;
  try {
    const { provider, dispose, getStats } = await createRegionalImageryProvider();
    const pending = m.tiles.map(t => provider.requestImage(t.x, t.y, t.z));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(peak, 6); assert.equal(getStats().inflight, 6); assert.equal(requests, 6);
    dispose(); await Promise.all(pending); assert.equal(getStats().inflight, 0); assert.equal(requests, 6);
  } finally { globalThis.fetch = oldFetch; globalThis.document = oldDocument; }
});

test('scene cancellation can abort the manifest before a provider handle exists', async () => {
  const priorFetch = globalThis.fetch, controller = new AbortController();
  let redirect: RequestRedirect | undefined;
  globalThis.fetch = ((_url: unknown, init?: RequestInit) => {
    redirect = init?.redirect;
    return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('cancelled')), {once:true}));
  }) as typeof fetch;
  try {
    const pending = createRegionalImageryProvider({signal:controller.signal});
    controller.abort(); await assert.rejects(pending,/cancelled/); assert.equal(redirect,'error');
  } finally { globalThis.fetch = priorFetch; }
});
