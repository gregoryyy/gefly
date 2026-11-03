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
function call(handler: ReturnType<typeof sceneryMiddleware>, url: string, method = 'GET'): Promise<{ status: number; headers: Record<string, string>; data: Buffer; next: boolean }> {
  return new Promise((resolve) => {
    let status = 0, headers: Record<string, string> = {};
    const res = { writeHead(code: number, h: Record<string, string> = {}) { status = code; headers = h; return this; }, end(data?: Buffer) { resolve({ status, headers, data: data || Buffer.alloc(0), next: false }); } };
    handler({ url, method } as IncomingMessage, res as unknown as ServerResponse, () => resolve({ status: 0, headers: {}, data: Buffer.alloc(0), next: true }));
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
