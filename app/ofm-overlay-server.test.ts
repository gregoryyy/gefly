import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createOfmOverlayMiddleware } from './ofm-overlay-server.ts';

type Handler = ReturnType<typeof createOfmOverlayMiddleware>;
// Generated fixture pixels, not copied chart content. CRCs make this a valid PNG.
function crc(bytes: Buffer): number {
  let value = 0xffffffff;
  for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(kind: string, data: Buffer): Buffer {
  const type = Buffer.from(kind), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}
const header = Buffer.alloc(13); header.writeUInt32BE(512); header.writeUInt32BE(512, 4); header[8] = 8; header[9] = 6;
const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
  chunk('IDAT', deflateSync(Buffer.alloc(512 * (512 * 4 + 1)))), chunk('IEND', Buffer.alloc(0))]);
const response = () => new Response(png, { headers: { 'content-type': 'image/png' } });
function call(handler: Handler, url: string, method = 'GET') {
  return new Promise<{ status: number; headers: Record<string, string>; data: Buffer; next: boolean }>(resolve => {
    let status = 0, headers: Record<string, string> = {};
    const res = { destroyed: false, writableEnded: false, headersSent: false,
      writeHead(code: number, values: Record<string, string> = {}) { status = code; headers = values; this.headersSent = true; return this; },
      end(data?: Buffer) { this.writableEnded = true; resolve({ status, headers, data: data ?? Buffer.alloc(0), next: false }); },
    };
    handler({ url, method, headers: { authorization: 'must-not-forward', cookie: 'private' } } as IncomingMessage,
      res as unknown as ServerResponse, () => resolve({ status: 0, headers: {}, data: Buffer.alloc(0), next: true }));
  });
}

test('R-CHART-1 fixed source routes serve metadata and transparent tiles without arbitrary URLs or credentials', async () => {
  const seen: string[] = [];
  const handler = createOfmOverlayMiddleware({ fetcher: async (url, init) => {
    seen.push(String(url)); assert.equal(String(url), 'https://nwy-tiles-api.prod.newaydata.com/tiles/9/268/173.png?path=2611/aero/latest');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit'); assert(init?.signal);
    assert.deepEqual(Object.keys(init?.headers ?? {}), ['User-Agent']); return response();
  } });
  const metadata = await call(handler, '/charts/ofm/metadata.json'); assert.equal(metadata.status, 200);
  assert.equal(JSON.parse(metadata.data.toString()).edition, 'AIRAC 2611'); assert.equal(seen.length, 0);
  const tile = await call(handler, '/charts/ofm/2611/9/268/173.png');
  assert.equal(tile.status, 200); assert.deepEqual(tile.data, png); assert.equal(tile.headers['Content-Type'], 'image/png');
  assert.equal(tile.headers['X-Content-Type-Options'], 'nosniff');
  const head = await call(handler, '/charts/ofm/2611/9/268/173.png', 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.data.length, 0); assert.equal(Number(head.headers['Content-Length']), png.length);
  for (const path of ['/charts/ofm/2610/9/268/173.png', '/charts/ofm/latest/9/268/173.png',
    '/charts/ofm/2611/6/1/1.png', '/charts/ofm/2611/14/1/1.png', '/charts/ofm/2611/7/128/1.png',
    '/charts/ofm/2611/9/0268/173.png', '/charts/ofm/2611/9/268/173.png?url=https://example.com',
    '/charts/ofm/metadata.json?token=private', '/charts/ofm/%2e%2e/file', '/charts/ofm/2611/9/268/-1.png']) {
    assert.equal((await call(handler, path)).status, 404, path);
  }
  assert.equal((await call(handler, '/charts/ofm/2611/9/268/173.png', 'POST')).status, 404);
  assert.equal(seen.length, 1); assert((await call(handler, '/unrelated')).next);
});

test('R-CHART-1 malformed, redirected, oversized and unavailable upstream tiles stay failed with bounded cooldown', async () => {
  const path = '/charts/ofm/2611/9/268/173.png';
  const wrongSize = Buffer.from(png); wrongSize.writeUInt32BE(65535, 16);
  for (const source of [() => new Response('html', { headers: { 'content-type': 'text/html' } }),
    () => new Response(png, { status: 503 }), () => new Response(png, { headers: { 'content-type': 'image/png', 'content-length': '1048577' } }),
    () => new Response(wrongSize, { headers: { 'content-type': 'image/png' } }),
    () => new Response(png.subarray(0, 40), { headers: { 'content-type': 'image/png' } }),
    () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1048577)); c.close(); } }), { headers: { 'content-type': 'image/png' } }),
    () => Object.defineProperty(response(), 'redirected', { value: true })]) {
    const result = await call(createOfmOverlayMiddleware({ fetcher: async () => source() }), path);
    assert.equal(result.status, 502); assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(result.data.length, 0);
  }
  let now = 0, count = 0;
  const retry = createOfmOverlayMiddleware({ now: () => now, fetcher: async () => { count++; throw new Error('offline'); } });
  assert.equal((await call(retry, path)).status, 502); assert.equal((await call(retry, path)).status, 502); assert.equal(count, 1);
  now = 30001; assert.equal((await call(retry, path)).status, 502); assert.equal(count, 2);
});

test('R-CHART-1 duplicate sharing, source concurrency and queue/cache budgets remain bounded', async () => {
  let running = 0, peak = 0, count = 0; const releases: Array<() => void> = [];
  const handler = createOfmOverlayMiddleware({ fetcher: async () => {
    count++; running++; peak = Math.max(peak, running);
    await new Promise<void>(resolve => releases.push(resolve)); running--; return response();
  } });
  const tasks = Array.from({ length: 32 }, (_, x) => call(handler, `/charts/ofm/2611/9/${x}/173.png`));
  const duplicate = call(handler, '/charts/ofm/2611/9/0/173.png');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(count, 4); assert.equal((await call(handler, '/charts/ofm/2611/9/100/173.png')).status, 503);
  for (let i = 0; i < 8; i++) {
    releases.splice(0).forEach(resolve => resolve()); await new Promise(resolve => setImmediate(resolve));
  }
  const results = await Promise.all([...tasks, duplicate]); assert(results.every(result => result.status === 200));
  assert.equal(peak, 4); assert.equal(count, 32);
  await call(handler, '/charts/ofm/2611/9/0/173.png'); assert.equal(count, 32, 'shared completed tile is cached');
  let now = 0, fetched = 0;
  const lru = createOfmOverlayMiddleware({ now: () => now, cacheBytes: png.length, fetcher: async () => { fetched++; return response(); } });
  const a = '/charts/ofm/2611/9/1/173.png', b = '/charts/ofm/2611/9/2/173.png';
  await call(lru, a); await call(lru, b); await call(lru, a); assert.equal(fetched, 3, 'byte budget evicts oldest image');
  now = 3600001; await call(lru, a); assert.equal(fetched, 4, 'expired images are reloaded');
});

test('R-CHART-1 cancelled waiters do not start queued source work, shared requests survive and disposal aborts all work', async () => {
  const sourceSignals: AbortSignal[] = []; const releases: Array<() => void> = [];
  const handler = createOfmOverlayMiddleware({ fetcher: async (_url, init) => {
    const signal = init!.signal!; sourceSignals.push(signal);
    await new Promise<void>((resolve, reject) => {
      releases.push(resolve); signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
    return response();
  } });
  function waiter(x: number) {
    const req = Object.assign(new EventEmitter(), { url: `/charts/ofm/2611/9/${x}/173.png`, method: 'GET' });
    let status = 0; let finish!: (value: number) => void;
    const completed = new Promise<number>(resolve => { finish = resolve; });
    const res = Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false, headersSent: false,
      writeHead(code: number) { status = code; this.headersSent = true; return this; },
      end() { this.writableEnded = true; finish(status); },
    });
    handler(req as IncomingMessage, res as unknown as ServerResponse, () => assert.fail('expected chart route'));
    return { completed, cancel() { res.destroyed = true; req.emit('aborted'); res.emit('close'); } };
  }
  const active = Array.from({ length: 4 }, (_, i) => waiter(i));
  const queued = waiter(4), shared = waiter(0);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(sourceSignals.length, 4);
  queued.cancel(); active[0].cancel();
  assert.equal(sourceSignals[0].aborted, false, 'one remaining consumer retains shared source request');
  releases[0](); assert.equal(await shared.completed, 200);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sourceSignals.length, 4, 'cancelled queued request never contacts source');
  handler.dispose(); handler.dispose();
  assert(sourceSignals.slice(1).every(signal => signal.aborted));
  assert.deepEqual(await Promise.all(active.slice(1).map(item => item.completed)), [502, 502, 502]);
  assert.equal((await call(handler, '/charts/ofm/metadata.json')).status, 503);
  // A user cancellation must not poison the next enable with source-failure cooldown.
  const signals: AbortSignal[] = [];
  const repeat = createOfmOverlayMiddleware({ fetcher: async (_url, init) => {
    signals.push(init!.signal!);
    return new Response(new ReadableStream({ start() {}, cancel() {} }), { headers: { 'content-type': 'image/png' } });
  } });
  const req = Object.assign(new EventEmitter(), { url: '/charts/ofm/2611/9/0/173.png', method: 'GET' });
  const res = Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false, headersSent: false,
    writeHead() { return this; }, end() { this.writableEnded = true; } });
  repeat(req as IncomingMessage, res as unknown as ServerResponse, () => {});
  await new Promise(resolve => setImmediate(resolve)); res.destroyed = true; req.emit('aborted');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(signals[0].aborted, true, 'last waiter aborts an active streamed response');
  const second = call(repeat, req.url);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(signals.length, 2);
  repeat.dispose(); assert.equal((await second).status, 502);
});

test('R-CHART-1 one deadline includes queue wait, source fetch and response body without resetting for shared consumers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  const handler = createOfmOverlayMiddleware({ fetcher: async (_url, init) => {
    const signal = init!.signal!; signals.push(signal);
    await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    return response();
  } });
  const tasks = Array.from({ length: 8 }, (_, x) => call(handler, `/charts/ofm/2611/9/${x}/173.png`));
  await new Promise(resolve => setImmediate(resolve)); assert.equal(signals.length, 4);
  t.mock.timers.tick(5000);
  const shared = call(handler, '/charts/ofm/2611/9/0/173.png');
  t.mock.timers.tick(9999); assert(signals.every(signal => !signal.aborted));
  t.mock.timers.tick(1);
  assert((await Promise.all([...tasks, shared])).every(result => result.status === 502));
  assert.equal(signals.length, 4, 'expired queued requests never contact the source');
  handler.dispose();
  let cancelled = false;
  const streamed = createOfmOverlayMiddleware({ fetcher: async () => new Response(new ReadableStream({
    start() {}, cancel() { cancelled = true; },
  }), { headers: { 'content-type': 'image/png' } }) });
  const reading = call(streamed, '/charts/ofm/2611/9/0/173.png');
  await new Promise(resolve => setImmediate(resolve));
  t.mock.timers.tick(15000);
  assert.equal((await reading).status, 502); assert.equal(cancelled, true, 'deadline also stops the response body');
  streamed.dispose();
});
