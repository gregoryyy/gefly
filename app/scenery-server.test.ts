import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { sceneryMiddleware } from './scenery-server.ts';

const makePng = (size: number) => execFileSync('python3', ['-c', `from PIL import Image\nimport sys\nim=Image.new('RGBA',(${size},${size}),(40,90,30,255)); im.putpixel((1,1),(41,90,30,255)); im.save(sys.stdout.buffer,format='PNG')`]);
const mapPng = makePng(256), photoPng = makePng(512);
function tile(lat: number, lon: number, z: number): [number, number] {
  return [Math.floor((lon + 180) / 360 * 2 ** z), Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z)];
}
function call(handler: ReturnType<typeof sceneryMiddleware>, url: string, method = 'GET', requestHeaders: Record<string, string> = {}): Promise<{ status: number; headers: Record<string, string>; data: Buffer; next: boolean }> {
  return new Promise((resolve) => {
    let status = 0, headers: Record<string, string> = {};
    const res = { writeHead(code: number, h: Record<string, string> = {}) { status = code; headers = h; return this; }, end(data?: Buffer) { resolve({ status, headers, data: data || Buffer.alloc(0), next: false }); } };
    handler({ url, method, headers: requestHeaders } as IncomingMessage, res as unknown as ServerResponse, () => resolve({ status: 0, headers: {}, data: Buffer.alloc(0), next: true }));
  });
}

test('fixed paths, region bounds, cache, HEAD and upstream validation', async () => {
  let requests = 0;
  const handler = sceneryMiddleware({ fetcher: async (input) => { requests++; assert.equal(new URL(String(input)).hostname, 'sgx.geodatenzentrum.de'); return new Response(mapPng, { headers: { 'content-type': 'image/png' } }); } });
  const [x, y] = tile(49.96, 8.64, 12), path = `/scenery/map/12/${x}/${y}.png`;
  assert.equal((await call(handler, path)).status, 200);
  assert.equal((await call(handler, path, 'HEAD')).data.length, 0);
  assert.equal(requests, 1);
  for (const bad of [`${path}?url=example`, '/scenery/map/20/1/1.png', '/scenery/imagery/6/33/21.png', '/scenery/imagery/7/67/43.jpg', '/scenery/map/12/99999/1.png', '/scenery/map/12/0/0.png', '/scenery/map/12/01/1.png', '/scenery/map/12/1/1.jpg', '/scenery/../secret']) assert.equal((await call(handler, bad)).status, 404);
  assert.equal((await call(handler, '/other')).next, true);
  const invalid = sceneryMiddleware({ fetcher: async () => new Response(photoPng, { headers: { 'content-type': 'image/png' } }) });
  assert.equal((await call(invalid, path)).status, 502);
  const wrongType = sceneryMiddleware({ fetcher: async () => new Response(mapPng, { headers: { 'content-type': 'text/html' } }) });
  assert.equal((await call(wrongType, path)).status, 502);
});

test('world OSM delegates outside regional raster coverage without widening photographs or arbitrary upstream access', async () => {
  const seen: string[] = [], bytes = new Uint8Array([26, 3, 10, 1, 97]);
  const handler = sceneryMiddleware({ fetcher: async input => {
    seen.push(String(input)); return new Response(bytes, { headers: { 'content-type': 'application/vnd.mapbox-vector-tile' } });
  } });
  const [x, y] = tile(40.7, -74, 11), path = `/scenery/osm/11/${x}/${y}.pbf`;
  const result = await call(handler, path);
  assert.equal(result.status, 200); assert.match(result.headers['X-Scenery-Sources'], /OpenFreeMap/);
  assert.equal(seen[0], `https://tiles.openfreemap.org/planet/20261101_080013_pt/11/${x}/${y}.pbf`);
  assert.equal((await call(handler, `/scenery/imagery/11/${x}/${y}.png`)).status, 404);
  assert.equal((await call(handler, `${path}?url=https://example.com`)).status, 404);
  assert.equal(seen.length, 1);
});

test('R-WORLD-6 public map and imagery reject tiles outside the declared five-state envelope', async () => {
  const seen: URL[] = [];
  const handler = sceneryMiddleware({ fetcher: async (input, init) => {
    const url = new URL(String(input));
    seen.push(url);
    assert.equal(url.origin, 'https://sgx.geodatenzentrum.de');
    assert.match(url.pathname, /^\/wmts_topplus_open\/tile\/1\.0\.0\/web\/default\/WEBMERCATOR\/12\/\d+\/\d+\.png$/);
    assert.equal(url.search, '');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal);
    return new Response(mapPng, { headers: { 'content-type': 'image/png' } });
  } });
  for (const [lat, lon] of [[48.137, 11.576], [49.2346, 6.9969], [51.315, 9.493], [48.7758, 9.1829], [50.3569, 7.589]]) {
    const [x, y] = tile(lat, lon, 12);
    const result = await call(handler, `/scenery/map/12/${x}/${y}.png`);
    assert.equal(result.status, 200);
    assert.equal(result.headers['X-Scenery-Sources'], 'BKG');
    assert.deepEqual(result.data, mapPng);
  }
  // At this zoom these complete tiles lie beyond each boundary, without overlap.
  for (const [lat, lon] of [[46.7, 10], [52, 10], [49, 5.5], [49, 14.5]]) {
    const [x, y] = tile(lat, lon, 12);
    assert.equal((await call(handler, `/scenery/map/12/${x}/${y}.png`)).status, 404);
    assert.equal((await call(handler, `/scenery/imagery/12/${x}/${y}.png`)).status, 404);
  }
  assert.equal(seen.length, 5, 'out-of-bounds map/imagery tiles make no upstream requests');
});

test('five-state photography uses only published overlapping source envelopes and fixed WMS layers', async () => {
  const seen: URL[] = [];
  const endpoints: Record<string, [string, string, string]> = {
    hessen: ['www.gds-srv.hessen.de', '/cgi-bin/lika-services/ogc-free-images.ows', 'he_dop_rgb'],
    bavaria: ['geoservices.bayern.de', '/od/wms/dop/v1/dop40', 'by_dop40c'],
    bw: ['owsproxy.lgl-bw.de', '/owsproxy/ows/WMS_LGL-BW_ATKIS_DOP_20_C', 'IMAGES_DOP_20_RGB'],
    rlp: ['geo4.service24.rlp.de', '/wms/rp_dop20.fcgi', 'rp_dop20'],
    saarland: ['geoportal.saarland.de', '/freewms/dop2025', 'sl_dop20_rgb'],
  };
  const handler = sceneryMiddleware({ fetcher: async (input, init) => {
    const url = new URL(String(input)); seen.push(url);
    assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
    assert.equal(url.username, ''); assert.equal(url.password, '');
    assert.equal(url.searchParams.get('SRS'), 'EPSG:3857');
    assert.equal(url.searchParams.get('WIDTH'), '512'); assert.equal(url.searchParams.get('HEIGHT'), '512');
    assert.equal(url.searchParams.get('TRANSPARENT'), 'TRUE');
    return new Response(photoPng, { headers: { 'content-type': 'image/png' } });
  } });
  const cases: Array<[string, number, number, string[]]> = [
    ['Stuttgart', 48.7758, 9.1829, ['bavaria', 'bw']],
    ['Munich', 48.137, 11.576, ['bavaria']],
    ['Saarbruecken', 49.2346, 6.9969, ['rlp', 'saarland']],
    ['Koblenz', 50.3569, 7.589, ['hessen', 'rlp']],
    ['Kassel', 51.315, 9.493, ['hessen']],
  ];
  for (const [name, lat, lon, sources] of cases) {
    const start = seen.length, [x, y] = tile(lat, lon, 14);
    const result = await call(handler, `/scenery/imagery/14/${x}/${y}.png`);
    assert.equal(result.status, 200, name); assert.equal(result.headers['X-Scenery-Sources'], sources.join(','), name);
    assert.equal(result.headers['X-Scenery-Partial'], 'false');
    assert.deepEqual(seen.slice(start).map(url => [url.hostname, url.pathname, url.searchParams.get('LAYERS')]), sources.map(source => endpoints[source]), name);
  }
});

test('a new state provider failure remains partial instead of claiming complete photography', async () => {
  const handler = sceneryMiddleware({ fetcher: async input => new URL(String(input)).hostname === 'geoportal.saarland.de'
    ? new Response('', { status: 503 }) : new Response(photoPng, { headers: { 'content-type': 'image/png' } }) });
  const [x, y] = tile(49.2346, 6.9969, 14), result = await call(handler, `/scenery/imagery/14/${x}/${y}.png`);
  assert.equal(result.status, 200); assert.equal(result.headers['X-Scenery-Sources'], 'rlp');
  assert.equal(result.headers['X-Scenery-Partial'], 'true');
});

test('paletted state imagery preserves transparent borders over its neighboring source', async () => {
  const paletted = execFileSync('python3', ['-c', `from PIL import Image
import sys
im=Image.new('P',(512,512),0)
im.putpalette([0,0,0,80,90,100]+[0,0,0]*254)
im.info['transparency']=0
im.putpixel((100,100),1)
im.save(sys.stdout.buffer,format='PNG')`]);
  const handler = sceneryMiddleware({ fetcher: async input => new Response(
    new URL(String(input)).hostname === 'geoportal.saarland.de' ? paletted : photoPng,
    { headers: { 'content-type': 'image/png' } }) });
  const [x, y] = tile(49.2346, 6.9969, 14), result = await call(handler, `/scenery/imagery/14/${x}/${y}.png`);
  assert.equal(result.status, 200); assert.equal(result.headers['X-Scenery-Sources'], 'rlp,saarland');
  const pixels = execFileSync('python3', ['-c', `from PIL import Image
import json,sys
im=Image.open(sys.stdin.buffer).convert('RGBA')
print(json.dumps([im.getpixel((0,0)),im.getpixel((100,100))]))`], { input: result.data });
  assert.deepEqual(JSON.parse(pixels.toString()), [[40,90,30,255], [80,90,100,255]]);
});

test('imagery accepts Cesium level 7 parent tiles', async () => {
  const handler = sceneryMiddleware({ fetcher: async () => new Response(photoPng, { headers: { 'content-type': 'image/png' } }) });
  const [x, y] = tile(49.96, 8.64, 7);
  assert.equal((await call(handler, `/scenery/imagery/7/${x}/${y}.png`)).status, 200);
});

test('imagery composition reports successful sources and partial upstream failure', async () => {
  const seen: string[] = [];
  const handler = sceneryMiddleware({ fetcher: async (input) => {
    const url = new URL(String(input)); seen.push(url.hostname);
    if (url.hostname === 'geoservices.bayern.de') return new Response('', { status: 503 });
    return new Response(photoPng, { headers: { 'content-type': 'image/png' } });
  } });
  const [x, y] = tile(49.7, 9.1, 12);
  const result = await call(handler, `/scenery/imagery/12/${x}/${y}.png`);
  assert.equal(result.status, 200); assert.equal(result.headers['X-Scenery-Partial'], 'true');
  assert.match(result.headers['X-Scenery-Sources'], /hessen/);
  assert.equal(result.data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert(seen.includes('geoservices.bayern.de')); assert(seen.includes('owsproxy.lgl-bw.de'));
});

test('limits upstream concurrency and evicts within a small byte budget', async () => {
  let active = 0, peak = 0, requests = 0;
  const handler = sceneryMiddleware({ cacheBytes: mapPng.length, fetcher: async () => {
    active++; peak = Math.max(peak, active); requests++;
    await new Promise(resolve => setTimeout(resolve, 10)); active--;
    return new Response(mapPng, { headers: { 'content-type': 'image/png' } });
  } });
  const [x, y] = tile(49.96, 8.64, 12);
  const paths = Array.from({ length: 8 }, (_, i) => `/scenery/map/12/${x + i}/${y}.png`);
  assert((await Promise.all(paths.map(path => call(handler, path)))).every(result => result.status === 200));
  assert(peak <= 4); await call(handler, paths[0]); assert.equal(requests, 9);
});

test('preserves transparent photographic gaps and rejects oversized upstream bytes', async () => {
  const transparent = execFileSync('python3', ['-c', "from PIL import Image; import sys; Image.new('RGBA',(512,512),(0,0,0,0)).save(sys.stdout.buffer,format='PNG')"]);
  const [x, y] = tile(49.96, 8.64, 12);
  const gap = sceneryMiddleware({ fetcher: async () => new Response(transparent, { headers: { 'content-type': 'image/png' } }) });
  const gapResult = await call(gap, `/scenery/imagery/12/${x}/${y}.png`);
  assert.equal(gapResult.status, 200);
  const alpha = execFileSync('python3', ['-c', "from PIL import Image; import sys; print(Image.open(sys.stdin.buffer).convert('RGBA').getpixel((0,0))[3])"], { input: gapResult.data });
  assert.equal(alpha.toString().trim(), '0');
  const unavailable = sceneryMiddleware({ fetcher: async () => new Response('', { status: 503 }) });
  assert.equal((await call(unavailable, `/scenery/imagery/12/${x}/${y}.png`)).status, 502);
  const oversized = sceneryMiddleware({ fetcher: async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } }) });
  assert.equal((await call(oversized, `/scenery/map/12/${x}/${y}.png`)).status, 502);
});


test('visible map completes while every aerial network slot and job is stalled', async () => {
  let release!: () => void, saturated!: () => void, aerial = 0;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { saturated = resolve; });
  const handler = sceneryMiddleware({ fetcher: async input => {
    if (new URL(String(input)).hostname === 'sgx.geodatenzentrum.de') return new Response(mapPng, { headers: { 'content-type': 'image/png' } });
    if (++aerial === 4) saturated();
    await blocked;
    return new Response(photoPng, { headers: { 'content-type': 'image/png' } });
  } });
  const [x, y] = tile(49.96, 8.64, 12);
  const photography = Array.from({ length: 8 }, (_, i) => call(handler, `/scenery/imagery/12/${x + i}/${y}.png`));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await started;
    const result = await Promise.race([call(handler, `/scenery/map/12/${x}/${y}.png`, 'GET', { 'x-gefly-scenery-priority': 'visible' }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('map waited behind aerial work')), 1000); })]);
    assert.equal(result.status, 200);
  } finally { clearTimeout(timer); release(); await Promise.all(photography); }
});

test('visible duplicate promotes a queued map ahead of older background tiles', async () => {
  const started: string[] = [], releases: (() => void)[] = []; let freeAll = false;
  const handler = sceneryMiddleware({ fetcher: async input => {
    started.push(new URL(String(input)).pathname);
    if (!freeAll) await new Promise<void>(resolve => releases.push(resolve));
    return new Response(mapPng, { headers: { 'content-type': 'image/png' } });
  } });
  const [x, y] = tile(49.96, 8.64, 12), path = (i: number) => `/scenery/map/12/${x + i}/${y}.png`;
  const work = Array.from({ length: 7 }, (_, i) => call(handler, path(i)));
  const duplicate = call(handler, path(6), 'GET', { 'x-gefly-scenery-priority': 'visible' });
  try {
    assert.equal(started.length, 4);
    releases.shift()!();
    for (let i = 0; i < 100 && started.length < 5; i++) await new Promise(resolve => setTimeout(resolve, 1));
    assert.equal(started[4], `/wmts_topplus_open/tile/1.0.0/web/default/WEBMERCATOR/12/${y}/${x + 6}.png`);
  } finally { freeAll = true; releases.forEach(release => release()); await Promise.all([...work, duplicate]); }
  assert.equal(started.length, 7, 'duplicate visible demand still shares one upstream fetch');
});


test('northern Hessen photography expands without querying southern state providers', async () => {
  const hosts: string[] = [];
  const handler = sceneryMiddleware({ fetcher: async input => {
    hosts.push(new URL(String(input)).hostname);
    return new Response(photoPng, { headers: { 'content-type': 'image/png' } });
  } });
  const [x, y] = tile(51.2, 9.4, 12);
  const result = await call(handler, `/scenery/imagery/12/${x}/${y}.png`);
  assert.equal(result.status, 200);
  assert.deepEqual(hosts, ['www.gds-srv.hessen.de']);
  assert.equal(result.headers['X-Scenery-Partial'], 'false');
});
