import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { AIRPORT_REGION_ENDPOINT, airportRegionAt, airportRegionBounds, airportRegionId,
  type AirportRegionKey, type AirportRegionPackage } from './airport-region.ts';
import { AIRPORT_LOADER_LIMITS, createAirportRegionLoader, loadAirportRegion, nearbyAirportRegions } from './airport-region-loader.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 2));
async function settled(loader: ReturnType<typeof createAirportRegionLoader>) {
  for (let i = 0; i < 500 && (loader.stats.pending || loader.stats.queued); i++) await tick();
  assert.equal(loader.stats.pending, 0); assert.equal(loader.stats.queued, 0);
}
function pack(key: AirportRegionKey, empty = true): AirportRegionPackage {
  const bounds = airportRegionBounds(key), [w, s] = bounds;
  return { version: 1, ...key, id: airportRegionId(key), bounds, generated_at: '2026-11-06T10:00:00Z',
    source: { endpoint: AIRPORT_REGION_ENDPOINT, osm_base: '2026-11-05T10:00:00Z', sha256: 'a'.repeat(64) }, rejected: 0,
    features: empty ? [] : [{ id: `osm/way/${key.x * 360 + key.y + 1}`, kind: 'runway', version: 1,
      timestamp: '2026-11-05T10:00:00Z', surface: 'asphalt', ref: '09/27', width_m: 30,
      geometry: { type: 'LineString', coordinates: [[w + .1, s + .1], [w + .11, s + .1]] } }] };
}
function response(value: unknown, patch: Record<string, string> = {}): Response {
  const body = JSON.stringify(value), digest = createHash('sha256').update(body).digest('hex');
  return new Response(body, { headers: { 'content-type': 'application/json', etag: `"${digest}"`, ...patch } });
}
const keyFromUrl = (url: string | URL | Request): AirportRegionKey => {
  const m = /\/(\d+)\/(\d+)\.json$/.exec(String(url)); assert(m); return { x: Number(m[1]), y: Number(m[2]) };
};

test('R-AIRPORT-3 bounded neighbours wrap at the dateline without invalid polar cells', () => {
  const neighbors = nearbyAirportRegions({ x: 719, y: 359 });
  assert.equal(neighbors.length, 6); assert(neighbors.some(k => k.x === 0));
  assert(neighbors.every(k => k.y >= 0 && k.y < 360));
  assert.equal(new Set(neighbors.map(airportRegionId)).size, neighbors.length);
});
test('R-AIRPORT-3 validates exact content identity and region before accepting a package', async () => {
  const key = airportRegionAt(-122.3, 37.7)!;
  const entry = await loadAirportRegion(key, new AbortController().signal, async () => response(pack(key, false)));
  assert.equal(entry.package.features.length, 1); assert(Object.isFrozen(entry.package));
  for (const fetcher of [async () => response(pack(key), { etag: '"' + '0'.repeat(64) + '"' }),
    async () => response(pack({ x: key.x + 1, y: key.y })),
    async () => response({ ...pack(key), source: { ...pack(key).source, user: 'private' } }),
    async () => response(pack(key), { 'content-length': String(AIRPORT_LOADER_LIMITS.packageBytes + 1) })]) {
    await assert.rejects(loadAirportRegion(key, new AbortController().signal, fetcher));
  }
});
test('R-AIRPORT-3 deadlines settle uncooperative fetch and stream, with streamed byte cap', async () => {
  const key = { x: 100, y: 100 }, signal = new AbortController().signal;
  await assert.rejects(loadAirportRegion(key, signal, () => new Promise(() => {}), 10), /timed out/);
  await assert.rejects(loadAirportRegion(key, signal, async () => new Response(new ReadableStream({ start() {} }),
    { headers: { 'content-type': 'application/json', etag: '"' + 'a'.repeat(64) + '"' } }), 10), /timed out/);
  await assert.rejects(loadAirportRegion(key, signal, async () => new Response(new Uint8Array(AIRPORT_LOADER_LIMITS.packageBytes + 1),
    { headers: { 'content-type': 'application/json', etag: '"' + 'a'.repeat(64) + '"' } })), /byte limit/);
});
test('R-AIRPORT-3 one request at a time, stable window and cached backtracking do not refetch', async () => {
  let calls = 0, active = 0, max = 0;
  const loader = createAirportRegionLoader({ fetcher: async url => {
    calls++; active++; max = Math.max(max, active); await tick(); active--; return response(pack(keyFromUrl(url), false));
  } });
  loader.update(-122.3, 37.7, true); await settled(loader);
  assert.equal(calls, 9); assert.equal(max, 1); assert.equal(loader.stats.status, 'ready');
  for (let i = 0; i < 20; i++) loader.update(-122.3, 37.7, true);
  await tick(); assert.equal(calls, 9);
  loader.update(-121.8, 37.7, true); await settled(loader); const afterMove = calls;
  loader.update(-122.3, 37.7, true); await settled(loader); assert.equal(calls, afterMove);
  loader.update(-122.3, 37.7, false); assert.equal(loader.stats.status, 'disabled');
  assert.equal(loader.packages.length, 0); assert.equal(loader.stats.pending, 0);
  loader.update(-122.3, 37.7, true); await settled(loader); assert.equal(calls, afterMove);
  loader.dispose();
});
test('R-AIRPORT-3 failures are not empty coverage and do not retry on frame ticks or cooldown alone', async () => {
  let calls = 0, time = 0;
  const loader = createAirportRegionLoader({ now: () => time, fetcher: async () => { calls++; return new Response('', { status: 503 }); } });
  loader.update(18.6, -33.9, true); await settled(loader); assert.equal(calls, 9); assert.equal(loader.stats.status, 'unavailable');
  time = AIRPORT_LOADER_LIMITS.failureMs + 1;
  for (let i = 0; i < 20; i++) loader.update(18.6, -33.9, true);
  await tick(); assert.equal(calls, 9);
  loader.update(19.1, -33.9, true); await settled(loader); assert(calls > 9);
  loader.dispose();
});
test('R-AIRPORT-3 obsolete/disposed responses cannot publish or continue their queues', async () => {
  const pending: { resolve: (value: Response) => void; key: AirportRegionKey; signal: AbortSignal }[] = [];
  const loader = createAirportRegionLoader({ fetcher: (url, init) => new Promise(resolve => pending.push({ resolve, key: keyFromUrl(url), signal: init!.signal! })) });
  loader.update(18.6, -33.9, true); assert.equal(pending.length, 1);
  loader.update(-122.3, 37.7, true); assert.equal(pending.length, 2); assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve(response(pack(pending[0].key))); await tick(); assert.equal(loader.stats.cached, 0);
  loader.dispose(); assert.equal(pending[1].signal.aborted, true);
  pending[1].resolve(response(pack(pending[1].key))); await tick();
  assert.equal(loader.stats.cached, 0); assert.equal(pending.length, 2);
});
test('R-AIRPORT-3 cache and negative metadata remain bounded while traversing distant regions', async () => {
  const loader = createAirportRegionLoader({ fetcher: async url => response(pack(keyFromUrl(url))) });
  for (let i = 0; i < 8; i++) { loader.update(-160 + i * 8, 20, true); await settled(loader); }
  assert(loader.stats.cached <= AIRPORT_LOADER_LIMITS.regions); assert(loader.stats.cacheBytes <= AIRPORT_LOADER_LIMITS.bytes);
  assert.equal(loader.stats.status, 'empty'); loader.dispose();
  const failed = createAirportRegionLoader({ fetcher: async () => new Response('', { status: 404 }) });
  for (let i = 0; i < 17; i++) { failed.update(-160 + i * 8, 20, true); await settled(failed); }
  assert(failed.stats.failures <= AIRPORT_LOADER_LIMITS.failures); failed.dispose();
});
