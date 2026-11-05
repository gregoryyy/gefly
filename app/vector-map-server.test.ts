import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createVectorMapMiddleware } from './vector-map-server.ts';
import { MAP_TERRAIN_STYLE_SHA256, MAP_TERRAIN_STYLE_URL } from './src/map-terrain-style.ts';

type Handler = ReturnType<typeof createVectorMapMiddleware>;
const pbf = Buffer.from([0x1a, 0x03, 0x0a, 0x01, 0x61]);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const sprite = { rock: { x: 0, y: 0, width: 1, height: 1, pixelRatio: 1 } };
function tilePath(lat: number, lon: number, z = 12): string {
  const n = 2 ** z, x = Math.floor((lon + 180) / 360 * n), y = Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return `/scenery/vector/${z}/${x}/${y}.pbf`;
}
function call(handler: Handler, url: string, method = 'GET', requestHeaders: Record<string, string> = {}): Promise<{ status: number; headers: Record<string, string>; data: Buffer; next: boolean }> {
  return new Promise(resolve => {
    let status = 0, headers: Record<string, string> = {};
    const res = { destroyed: false, writableEnded: false, headersSent: false,
      writeHead(code: number, values: Record<string, string> = {}) { status = code; headers = values; this.headersSent = true; return this; },
      end(data?: Buffer) { this.writableEnded = true; resolve({ status, headers, data: data || Buffer.alloc(0), next: false }); },
    };
    handler({ url, method, headers: requestHeaders } as IncomingMessage, res as unknown as ServerResponse,
      () => resolve({ status: 0, headers: {}, data: Buffer.alloc(0), next: true }));
  });
}
const response = () => new Response(pbf, { headers: { 'content-type': 'application/x-protobuf' } });

test('fixed BKG vector routes cover Germany, enforce canonical XYZ and forward no query or credential', async () => {
  const seen: string[] = [];
  const handler = createVectorMapMiddleware({ fetcher: async (input, init) => {
    const url = String(input); seen.push(url);
    assert.match(url, /^https:\/\/sgx\.geodatenzentrum\.de\/gdz_basemapde_vektor\/tiles\/v2\/bm_web_de_3857\/\d+\/\d+\/\d+\.pbf$/);
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit'); assert(init?.signal);
    return response();
  } });
  for (const [lat, lon] of [[49.96, 8.64], [48.14, 11.58], [52.52, 13.405], [54.8, 9.5], [47.5, 7.6]]) {
    const path = tilePath(lat, lon), result = await call(handler, path);
    assert.equal(result.status, 200); assert.deepEqual(result.data, pbf);
    assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(result.headers['Content-Type'], 'application/vnd.mapbox-vector-tile');
  }
  assert.equal((await call(handler, '/scenery/vector/0/0/0.pbf')).status, 200, 'world parent intersects bounded coverage');
  assert.equal((await call(createVectorMapMiddleware({ fetcher: async () => new Response(pbf, { headers: { 'content-type': 'application/octet-stream' } }) }), tilePath(50, 9))).status, 200, 'official BKG octet-stream PBF response is accepted only on the fixed tile route');
  const count = seen.length;
  for (const path of [tilePath(46.8, 10), tilePath(56, 10), tilePath(50, 5), tilePath(50, 16),
    '/scenery/vector/16/34350/22222.pbf', '/scenery/vector/0/1/0.pbf', '/scenery/vector/00/0/0.pbf',
    '/scenery/vector/12/02146/1390.pbf', '/scenery/vector/12/-1/1390.pbf', '/scenery/vector/../secret',
    '/scenery/vector/%2e%2e/secret', '/scenery/vector/sprite.png?url=https://example.com',
    `${tilePath(50, 9)}?token=secret`, '/scenery/vector/12/2146/1390.pbf/extra']) {
    assert.equal((await call(handler, path)).status, 404, path);
  }
  assert.equal((await call(handler, tilePath(50, 9), 'POST')).status, 404);
  assert.equal(seen.length, count, 'invalid routes never contact upstream');
  assert((await call(handler, '/scenery/map/12/2146/1390.png')).next);
});

test('sprite endpoints accept bounded JSON/PNG including fixed @2x paths and HEAD uses cached bytes', async () => {
  const seen: string[] = [];
  const handler = createVectorMapMiddleware({ fetcher: async input => {
    const url = String(input); seen.push(url);
    assert.match(url, /^https:\/\/sgx\.geodatenzentrum\.de\/gdz_basemapde_vektor\/sprites\/v2\/bm_web_col_sprite(?:@2x)?\.(json|png)$/);
    return url.endsWith('.json') ? Response.json(sprite) : new Response(png, { headers: { 'content-type': 'image/png' } });
  } });
  for (const suffix of ['.json', '.png', '@2x.json', '@2x.png']) {
    const path = `/scenery/vector/sprite${suffix}`;
    assert.equal((await call(handler, path)).status, 200);
    const head = await call(handler, path, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.data.length, 0);
    assert.equal(Number(head.headers['Content-Length']), suffix.endsWith('.json') ? JSON.stringify(sprite).length : png.length);
  }
  assert.equal(seen.length, 4);
});

test('upstream failures, invalid MIME, streaming limits and malformed sprite data remain unavailable', async () => {
  const path = tilePath(50, 9);
  const failures = [
    () => new Response('not a tile', { headers: { 'content-type': 'text/html' } }),
    () => new Response(pbf, { status: 503, headers: { 'content-type': 'application/x-protobuf' } }),
    () => new Response(pbf, { headers: { 'content-type': 'application/x-protobuf', 'content-length': String(2 * 1024 * 1024 + 1) } }),
    () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024)); controller.enqueue(new Uint8Array(1)); controller.close(); } }), { headers: { 'content-type': 'application/x-protobuf' } }),
    () => new Response(new Uint8Array(), { headers: { 'content-type': 'application/x-protobuf' } }),
  ];
  for (const fetcher of failures) {
    const result = await call(createVectorMapMiddleware({ fetcher: async () => fetcher() }), path);
    assert.equal(result.status, 502); assert.equal(result.headers['Cache-Control'], 'no-store');
  }
  let attempts = 0;
  const retry = createVectorMapMiddleware({ fetcher: async () => { attempts++; throw new Error('network unavailable'); } });
  assert.equal((await call(retry, path)).status, 502); assert.equal((await call(retry, path)).status, 502); assert.equal(attempts, 2, 'failed jobs are not cached');
  for (const value of [[], null, { rock: { ...sprite.rock, width: -1 } }, { rock: { ...sprite.rock, pixelRatio: 0 } }, { rock: { ...sprite.rock, x: 5000 } }]) {
    assert.equal((await call(createVectorMapMiddleware({ fetcher: async () => Response.json(value) }), '/scenery/vector/sprite.json')).status, 502);
  }
  assert.equal((await call(createVectorMapMiddleware({ fetcher: async () => new Response('not png', { headers: { 'content-type': 'image/png' } }) }), '/scenery/vector/sprite.png')).status, 502);
});

test('four upstream jobs, bounded pending queue, duplicate sharing and byte LRU prevent unbounded work', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let active = 0, peak = 0, requested = 0;
  const handler = createVectorMapMiddleware({ cacheBytes: 0, fetcher: async () => {
    requested++; active++; peak = Math.max(peak, active); await gate; active--; return response();
  } });
  const paths = Array.from({ length: 49 }, (_, i) => `/scenery/vector/12/${2140 + i}/1390.pbf`);
  const jobs = paths.slice(0, 48).map(path => call(handler, path));
  const duplicate = call(handler, paths[0]);
  assert.equal((await call(handler, paths[48])).status, 503, '49th distinct pending job for one host rejected');
  assert.equal(requested, 4); release();
  assert((await Promise.all([...jobs, duplicate])).every(result => result.status === 200));
  assert.equal(requested, 48); assert.equal(peak, 4);
  let calls = 0;
  const small = createVectorMapMiddleware({ cacheBytes: pbf.length, fetcher: async () => { calls++; return response(); } });
  await call(small, paths[0]); await call(small, paths[0], 'HEAD'); assert.equal(calls, 1);
  await call(small, paths[1]); await call(small, paths[0]); assert.equal(calls, 3, 'LRU honors bytes rather than unbounded tile count');
  for (const cacheBytes of [NaN, -1, 1.5]) assert.throws(() => createVectorMapMiddleware({ cacheBytes }), RangeError);
});

test('a disconnected response does not cancel the same finite tile needed by another waiter', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let requests = 0, writes = 0;
  const handler = createVectorMapMiddleware({ fetcher: async () => { requests++; await gate; return response(); } });
  const dropped = { destroyed: false, writableEnded: false, headersSent: false, writeHead() { writes++; return this; }, end() { writes++; } };
  const path = tilePath(50, 9);
  handler({ url: path, method: 'GET' } as IncomingMessage, dropped as unknown as ServerResponse, () => assert.fail('matched vector route'));
  dropped.destroyed = true;
  const shared = call(handler, path); release();
  assert.equal((await shared).status, 200); assert.equal(requests, 1); assert.equal(writes, 0);
});

test('derived terrain style is pinned, label/extrusion free and restricted to fixed same-origin data', async () => {
  const bytes = await readFile(new URL(`./public${MAP_TERRAIN_STYLE_URL}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), MAP_TERRAIN_STYLE_SHA256);
  const style = JSON.parse(bytes.toString('utf8'));
  assert.equal(style.metadata['basemapde:style-version'], '6.0.0');
  assert.equal(style.metadata['gefly:source-sha256'], '45aacf6ac3b391e360a3d73e7f4f79eeefe32f2f7dd92527595cfffe2e1bca00');
  assert(!Object.hasOwn(style, 'glyphs'));
  assert.equal(style.sprite, '/scenery/vector/sprite');
  assert.deepEqual(Object.keys(style.sources), ['smarttiles_de']);
  assert.deepEqual(style.sources.smarttiles_de.tiles, ['/scenery/vector/{z}/{x}/{y}.pbf']);
  assert.equal(style.sources.smarttiles_de.maxzoom, 15);
  assert.deepEqual(style.transition, { duration: 0, delay: 0 });
  assert.equal(style.layers.length, 360);
  assert(style.layers.every((layer: { type: string }) => ['background', 'fill', 'line', 'circle'].includes(layer.type)));
  assert(!/https?:\/\//.test(bytes.toString('utf8')), 'style cannot trigger direct third-party requests');
});

test('pinned global landmark routes enforce canonical z7–14 coordinates, identify the client and isolate their cache from BKG', async () => {
  const seen: string[] = [];
  const handler = createVectorMapMiddleware({ fetcher: async (input, init) => {
    const url = String(input); seen.push(url);
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit');
    assert.equal(new Headers(init?.headers).get('User-Agent'), 'Gefly/0.2 (+https://github.com/gregoryyy/gefly)');
    assert(init?.signal);
    if (url.includes('openfreemap')) assert.match(url, /^https:\/\/tiles\.openfreemap\.org\/planet\/20261101_080013_pt\/\d+\/\d+\/\d+\.pbf$/);
    return new Response(url.includes('openfreemap') ? new Uint8Array([26, 1, 8]) : pbf, { headers: { 'content-type': 'application/vnd.mapbox-vector-tile' } });
  } });
  const bkg = await call(handler, '/scenery/vector/12/2146/1390.pbf');
  const landmark = await call(handler, '/scenery/landmarks/12/2146/1390.pbf');
  assert.notDeepEqual(landmark.data, bkg.data, 'identical XYZ across sources cannot alias cached bytes');
  assert.equal(landmark.headers['X-Scenery-Sources'], 'OpenFreeMap-OSM-20261101_080013_pt');
  assert.equal((await call(handler, '/scenery/landmarks/12/2146/1390.pbf', 'HEAD')).data.length, 0);
  assert.equal(seen.length, 2, 'HEAD reuses only the matching source cache');
  for (const path of ['/scenery/landmarks/7/0/0.pbf', '/scenery/landmarks/14/16383/16383.pbf',
    '/scenery/landmarks/9/100/200.pbf']) assert.equal((await call(handler, path)).status, 200, 'global tiles need not intersect Germany');
  const count = seen.length;
  for (const path of ['/scenery/landmarks/6/0/0.pbf', '/scenery/landmarks/15/0/0.pbf', '/scenery/landmarks/07/0/0.pbf',
    '/scenery/landmarks/7/00/0.pbf', '/scenery/landmarks/7/128/0.pbf', '/scenery/landmarks/7/0/128.pbf',
    '/scenery/landmarks/7/-1/0.pbf', '/scenery/landmarks/../secret', '/scenery/landmarks/9/268/173.pbf?url=https://example.com',
    '/scenery/landmarks/9/268/173.pbf/extra']) assert.equal((await call(handler, path)).status, 404, path);
  assert.equal((await call(handler, '/scenery/landmarks/9/268/173.pbf', 'POST')).status, 404);
  assert.equal(seen.length, count, 'malformed landmark routes never contact any upstream');
});

test('landmark and cartography traffic have four fetches each and a shared 64-job bound; malformed responses never enter cache', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let active = 0, peak = 0, calls = 0;
  const hosts = { bkg: { active: 0, peak: 0 }, landmarks: { active: 0, peak: 0 } };
  const handler = createVectorMapMiddleware({ fetcher: async input => {
    const host = String(input).includes('openfreemap') ? hosts.landmarks : hosts.bkg;
    calls++; active++; host.active++; peak = Math.max(peak, active); host.peak = Math.max(host.peak, host.active);
    await gate; active--; host.active--; return response();
  } });
  const paths = Array.from({ length: 64 }, (_, i) => i % 2 ? `/scenery/landmarks/12/${2140 + i}/1390.pbf` : `/scenery/vector/12/${2140 + i}/1390.pbf`);
  const pending = paths.map(path => call(handler, path));
  assert.equal((await call(handler, '/scenery/landmarks/12/100/100.pbf')).status, 503);
  assert.equal(calls, 8); release();
  assert((await Promise.all(pending)).every(result => result.status === 200)); assert.equal(peak, 8);
  assert.equal(hosts.bkg.peak, 4); assert.equal(hosts.landmarks.peak, 4);
  for (const fetcher of [async () => new Response('HTML', { headers: { 'content-type': 'text/html' } }),
    async () => new Response('x', { headers: { 'content-type': 'application/x-protobuf', 'content-length': String(2 * 1024 * 1024 + 1) } }),
    async () => new Response(pbf, { status: 503, headers: { 'content-type': 'application/x-protobuf' } })]) {
    assert.equal((await call(createVectorMapMiddleware({ fetcher }), '/scenery/landmarks/9/268/173.pbf')).status, 502);
  }
});

test('a saturated cartography host cannot starve landmarks, and either host reserves pending capacity for the other', async () => {
  for (const saturated of ['bkg', 'landmarks'] as const) {
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    let blockedActive = 0, blockedPeak = 0, otherStarted = false;
    const handler = createVectorMapMiddleware({ cacheBytes: 0, fetcher: async input => {
      const host = String(input).includes('openfreemap') ? 'landmarks' : 'bkg';
      if (host === saturated) {
        blockedActive++; blockedPeak = Math.max(blockedPeak, blockedActive); await gate; blockedActive--;
      } else otherStarted = true;
      return response();
    } });
    const prefix = saturated === 'bkg' ? 'vector' : 'landmarks', otherPrefix = saturated === 'bkg' ? 'landmarks' : 'vector';
    const waiting = Array.from({ length: 48 }, (_, i) => call(handler, `/scenery/${prefix}/12/${2140 + i}/1390.pbf`));
    assert.equal(blockedActive, 4);
    assert.equal((await call(handler, `/scenery/${prefix}/12/2200/1390.pbf`)).status, 503, 'one host cannot claim a 49th pending slot');
    const other = await call(handler, `/scenery/${otherPrefix}/12/2146/1390.pbf`);
    assert.equal(other.status, 200); assert(otherStarted, 'other fixed host completes before the saturated pool is released');
    assert.equal(blockedActive, 4, 'the saturated requests were still blocked during the other host response');
    release(); assert((await Promise.all(waiting)).every(result => result.status === 200));
    assert.equal(blockedPeak, 4);
  }
});


test('visible vector demand promotes its queued warm tile and shares one upstream load', async () => {
  const started: string[] = [], releases: (() => void)[] = []; let freeAll = false;
  const handler = createVectorMapMiddleware({ fetcher: async input => {
    started.push(new URL(String(input)).pathname);
    if (!freeAll) await new Promise<void>(resolve => releases.push(resolve));
    return response();
  } });
  const path = (i: number) => `/scenery/vector/12/${2140 + i}/1390.pbf`;
  const work = Array.from({ length: 7 }, (_, i) => call(handler, path(i)));
  const visible = call(handler, path(6), 'GET', { 'x-gefly-scenery-priority': 'visible' });
  try {
    assert.equal(started.length, 4);
    releases.shift()!();
    for (let i = 0; i < 100 && started.length < 5; i++) await new Promise(resolve => setTimeout(resolve, 1));
    assert.match(started[4], /\/12\/2146\/1390\.pbf$/);
  } finally { freeAll = true; releases.forEach(release => release()); await Promise.all([...work, visible]); }
  assert.equal(started.length, 7, 'visible and warm consumers share one finite upstream fetch');
});

test('global OSM routes share one pinned source cache and four-request pool with landmarks', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0, active = 0, peak = 0;
  const handler = createVectorMapMiddleware({ fetcher: async (input, init) => {
    assert.match(String(input), /^https:\/\/tiles\.openfreemap\.org\/planet\/20261101_080013_pt\/\d+\/\d+\/\d+\.pbf$/);
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    calls++; active++; peak = Math.max(peak, active); await gate; active--; return response();
  } });
  const waiting = ['/scenery/osm/0/0/0.pbf', '/scenery/osm/1/1/1.pbf',
    '/scenery/osm/12/100/100.pbf', '/scenery/landmarks/12/100/100.pbf',
    '/scenery/landmarks/12/101/100.pbf', '/scenery/osm/14/16383/16383.pbf'].map(path => call(handler, path));
  assert.equal(calls, 4); release();
  assert((await Promise.all(waiting)).every(result => result.status === 200));
  assert.equal(calls, 5, 'same XYZ requested as map and landmark coalesces'); assert.equal(peak, 4);
  assert.equal((await call(handler, '/scenery/osm/12/100/100.pbf', 'HEAD')).data.length, 0);
  assert.equal(calls, 5);
  for (const path of ['/scenery/osm/15/0/0.pbf', '/scenery/osm/00/0/0.pbf', '/scenery/osm/1/2/0.pbf',
    '/scenery/osm/1/0/2.pbf', '/scenery/osm/1/-1/0.pbf', '/scenery/osm/1/00/0.pbf',
    '/scenery/osm/1/0/0.pbf?url=https://example.com', '/scenery/osm/../secret']) {
    assert.equal((await call(handler, path)).status, 404, path);
  }
  assert.equal((await call(handler, '/scenery/osm/0/0/0.pbf', 'POST')).status, 404);
  assert.equal(calls, 5, 'invalid URLs never select an upstream');
});
