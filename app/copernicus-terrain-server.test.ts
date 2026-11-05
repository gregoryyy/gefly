import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { createCopernicusTerrainMiddleware, COPERNICUS_CELL_BYTES, parseCopernicusHeader, decodeCopernicusBlock } from './copernicus-terrain-server.ts';

const ETAG = '"0123456789abcdef0123456789abcdef"';
function encodedBlock(value = 123.5): Buffer {
  const encoded = Buffer.alloc(1024 * 1024 * 4), float = Buffer.alloc(4); float.writeFloatLE(value);
  for (let y = 0; y < 1024; y++) {
    const start = y * 4096;
    for (let plane = 0; plane < 4; plane++) encoded.fill(float[3 - plane], start + plane * 1024, start + (plane + 1) * 1024);
    for (let i = 4095; i > 0; i--) encoded[start + i] = (encoded[start + i] - encoded[start + i - 1]) & 255;
  }
  return deflateSync(encoded);
}
function fixture(value = 123.5, options: { west?: number; north?: number; blocks?: Buffer[] } = {}) {
  const block = options.blocks?.[0] ?? encodedBlock(value), blocks = options.blocks ?? Array(16).fill(block), header = Buffer.alloc(16384);
  assert.equal(blocks.length, 16);
  let blockOffset = 16384;
  const offsets = blocks.map(bytes => { const offset = blockOffset; blockOffset += bytes.length; return offset; });
  const fields: Array<[number, number, number[]]> = [
    [256, 3, [3600]], [257, 3, [3600]], [258, 3, [32]], [259, 3, [8]], [262, 3, [1]], [277, 3, [1]], [284, 3, [1]], [317, 3, [3]],
    [322, 3, [1024]], [323, 3, [1024]], [324, 4, offsets], [325, 4, blocks.map(bytes => bytes.length)],
    [339, 3, [3]], [33550, 12, [1 / 3600, 1 / 3600, 0]], [33922, 12, [0, 0, 0, options.west ?? -75, options.north ?? 41, 0]],
    [34735, 3, [1,1,0,2,1025,0,1,2,2048,0,1,4326]],
  ];
  header.write('II'); header.writeUInt16LE(42, 2); header.writeUInt32LE(8, 4); header.writeUInt16LE(fields.length, 8);
  let offset = 8 + 2 + fields.length * 12 + 4;
  fields.forEach(([tag, type, values], i) => {
    const entry = 10 + i * 12, size = type === 12 ? 8 : type === 4 ? 4 : 2;
    header.writeUInt16LE(tag, entry); header.writeUInt16LE(type, entry + 2); header.writeUInt32LE(values.length, entry + 4);
    const start = values.length * size <= 4 ? entry + 8 : offset;
    if (values.length * size > 4) { header.writeUInt32LE(start, entry + 8); offset += values.length * size; }
    values.forEach((v, j) => type === 12 ? header.writeDoubleLE(v, start + j * size) : type === 4 ? header.writeUInt32LE(v, start + j * size) : header.writeUInt16LE(v, start + j * size));
  });
  return { header, block, object: Buffer.concat([header, ...blocks]) };
}
function responseFor(bytes: Buffer, start: number, end: number, total: number, etag = ETAG) {
  return new Response(bytes, { status: 206, headers: { 'Content-Type': 'image/tiff', 'Content-Length': String(bytes.length), 'Content-Range': `bytes ${start}-${end}/${total}`, ETag: etag } });
}
function request(middleware: ReturnType<typeof createCopernicusTerrainMiddleware>, url: string, method = 'GET'): Promise<{ status: number; headers: Record<string, unknown>; bytes: Buffer }> {
  return new Promise(resolve => {
    const result = { status: 0, headers: {} as Record<string, unknown>, bytes: Buffer.alloc(0) };
    const res = { destroyed: false, writableEnded: false, headersSent: false,
      writeHead(status: number, headers: Record<string, unknown> = {}) { result.status = status; result.headers = headers; return this; },
      end(bytes?: Buffer) { result.bytes = bytes ?? Buffer.alloc(0); this.writableEnded = true; resolve(result); return this; } };
    middleware({ url, method } as never, res as never, () => resolve(result));
  });
}
const cellUrl = '/scenery/elevation/copernicus/3360/4191.bin'; // west75 / north41

test('R-WORLD-11 strict COG profile and bounded floating predictor decode reproduce independent numeric inputs', () => {
  const f = fixture(-231.25), cog = parseCopernicusHeader(f.header, 'fixed', ETAG, f.object.length);
  assert.equal(cog.west, -75); assert.equal(cog.north, 41); assert.equal(cog.width, 3600);
  const values = decodeCopernicusBlock(f.block); assert.equal(values.length, 1024 ** 2);
  assert(values.every(v => v === -231.25));
  assert.throws(() => decodeCopernicusBlock(deflateSync(Buffer.alloc(1024))), /length/);
  assert.throws(() => decodeCopernicusBlock(deflateSync(Buffer.alloc(1024 ** 2 * 4 + 1))), /larger|length|buffer/i);
  for (const change of [b => b.writeUInt16LE(43, 2), b => b.writeUInt32LE(16383, 4), b => b.writeUInt16LE(65, 8)]) {
    const b = Buffer.from(f.header); change(b); assert.throws(() => parseCopernicusHeader(b, 'fixed', ETAG, f.object.length));
  }
  assert.throws(() => parseCopernicusHeader(f.header, 'fixed', 'weak', f.object.length), /identity/);
});

test('R-WORLD-11 canonical fixed routes, range/ETag identity, deduplication and finite sample payload', async () => {
  const f = fixture(); const requests: Array<{ url: string; options: RequestInit }> = [];
  const middleware = createCopernicusTerrainMiddleware({ fetcher: (async (url, options) => {
    requests.push({ url: String(url), options });
    assert.match(String(url), /^https:\/\/copernicus-dem-30m\.s3\.eu-central-1\.amazonaws\.com\/Copernicus_DSM_COG_10_N40_00_W075_00_DEM\//);
    const headers = options?.headers as Record<string, string>, [, first, last] = /^bytes=(\d+)-(\d+)$/.exec(headers.Range)!;
    const start = Number(first), end = Number(last);
    if (start) assert.equal(headers['If-Match'], ETAG);
    return responseFor(f.object.subarray(start, end + 1), start, end, f.object.length);
  }) as typeof fetch });
  const [a, b] = await Promise.all([request(middleware, cellUrl), request(middleware, cellUrl)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(a.bytes.length, COPERNICUS_CELL_BYTES); assert.deepEqual(a.bytes, b.bytes);
  assert.equal(a.bytes.toString('ascii', 0, 7), 'GFCOP30'); assert.equal(a.bytes.readUInt32LE(12), 3360);
  assert.equal(a.bytes.readFloatLE(64), 123.5);
  assert.equal(requests.filter(r => (r.options.headers as Record<string, string>).Range === 'bytes=0-16383').length, 1);
  const before = requests.length; assert.equal((await request(middleware, cellUrl, 'HEAD')).bytes.length, 0); assert.equal(requests.length, before);
  for (const bad of [cellUrl + '?url=https://evil.test', cellUrl.replace('/3360/', '/03360/'), cellUrl.replace('/3360/', '/11520/'), cellUrl.replace('/4191.', '/15.'), cellUrl.replace('.bin', '/../file')])
    assert.equal((await request(middleware, bad)).status, 404);
  assert.equal((await request(middleware, cellUrl, 'POST')).status, 404);
  assert.equal((await request(middleware, '/unrelated')).status, 0);
});

test('R-WORLD-11 unavailable, changed, oversized, redirected and stalled upstream data never become invented zero terrain', async () => {
  const f = fixture();
  const bad: Array<() => Promise<Response>> = [
    async () => new Response('', { status: 404 }),
    async () => new Response(f.header, { status: 200 }),
    async () => responseFor(f.header, 0, 16383, 100000000),
    async () => responseFor(f.header, 0, 16383, f.object.length, 'W/"0123456789abcdef0123456789abcdef"'),
    async () => new Promise(() => {}),
  ];
  for (const fetcher of bad) {
    const m = createCopernicusTerrainMiddleware({ fetcher: fetcher as typeof fetch, timeoutMs: 10 });
    const result = await request(m, cellUrl); assert.equal(result.status, 502); assert.equal(result.bytes.length, 0);
  }
  let calls = 0;
  const changed = createCopernicusTerrainMiddleware({ fetcher: (async (_url, options) => {
    const [, first, last] = /^bytes=(\d+)-(\d+)$/.exec((options?.headers as Record<string, string>).Range)!;
    const start = Number(first), end = Number(last); calls++;
    return responseFor(f.object.subarray(start, end + 1), start, end, f.object.length, start ? '"abcdef0123456789abcdef0123456789"' : ETAG);
  }) as typeof fetch });
  assert.equal((await request(changed, cellUrl)).status, 502); assert(calls >= 2);
});

test('R-WORLD-11 two decoder jobs and duplicate sharing bound concurrent output demand', async () => {
  let release: (response: Response) => void;
  const held = new Promise<Response>(resolve => { release = resolve; });
  const m = createCopernicusTerrainMiddleware({ fetcher: (() => held) as typeof fetch, timeoutMs: 20 });
  const first = request(m, cellUrl), second = request(m, cellUrl.replace('/3360/', '/3361/'));
  assert.equal((await request(m, cellUrl.replace('/3360/', '/3362/'))).status, 503);
  release!(new Response('', { status: 404 })); assert.equal((await first).status, 502); assert.equal((await second).status, 502);
  assert.throws(() => createCopernicusTerrainMiddleware({ cacheBytes: -1 }), /bounds/);
});

const overviewUrl = '/scenery/elevation/copernicus-overview/420/523.bin'; // west75 / 40.75..41 N
function fixtureFetcher(f: ReturnType<typeof fixture>, requests: string[] = []): typeof fetch {
  return (async (url, options) => {
    requests.push(String(url));
    const headers = options?.headers as Record<string, string>, [, first, last] = /^bytes=(\d+)-(\d+)$/.exec(headers.Range)!;
    const start = Number(first), end = Number(last);
    assert(end - start + 1 <= 5 * 1024 * 1024);
    if (start) assert.equal(headers['If-Match'], ETAG);
    assert.equal(options?.redirect, 'error'); assert.equal(options?.credentials, 'omit');
    return responseFor(f.object.subarray(start, end + 1), start, end, f.object.length);
  }) as typeof fetch;
}
function gradientBlock(): Buffer {
  // Explicit synthetic raster inputs, not geographic measurements. Binary
  // fractions give independently known Float32 values at every source post.
  const pixels = Buffer.alloc(1024 * 1024 * 4), encoded = Buffer.alloc(pixels.length);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) pixels.writeFloatLE(100 + x / 8 + y / 32, (y * 1024 + x) * 4);
  for (let y = 0; y < 1024; y++) {
    const start = y * 4096;
    for (let byte = 0; byte < 4; byte++) for (let x = 0; x < 1024; x++) encoded[start + byte * 1024 + x] = pixels[(y * 1024 + x) * 4 + 3 - byte];
    for (let i = 4095; i > 0; i--) encoded[start + i] = (encoded[start + i] - encoded[start + i - 1]) & 255;
  }
  return deflateSync(encoded);
}

test('Task162 overview v2 payload, canonical bounds, HEAD and unsupported paths retain the fixed wire schema', async () => {
  const f = fixture(), calls: string[] = [], middleware = createCopernicusTerrainMiddleware({ fetcher: fixtureFetcher(f, calls) });
  const a = await request(middleware, overviewUrl);
  assert.equal(a.status, 200); assert.equal(a.bytes.length, 66628);
  assert.equal(a.bytes.toString('ascii', 0, 8), 'GFCOP30\0');
  assert.equal(a.bytes.readUInt32LE(8), 2); assert.equal(a.bytes.readUInt32LE(12), 420);
  assert.equal(a.bytes.readUInt32LE(16), 523); assert.equal(a.bytes.readUInt32LE(20), 129);
  assert(a.bytes.subarray(24, 64).every(value => value === 0)); assert.equal(a.bytes.readFloatLE(64), 123.5);
  const before = calls.length; const head = await request(middleware, overviewUrl, 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.bytes.length, 0); assert.equal(calls.length, before);
  assert.equal(head.headers.ETag, a.headers.ETag); assert.equal(head.headers['Content-Length'], 66628);
  for (const bad of [overviewUrl + '?url=https://evil.test', overviewUrl + '?x=1', overviewUrl.replace('/420/', '/0420/'),
    overviewUrl.replace('/420/', '/1440/'), overviewUrl.replace('/523.', '/0.'), overviewUrl.replace('/523.', '/719.'),
    overviewUrl.replace('/523.', '/0523.'), overviewUrl.replace('/420/', '/-1/'), overviewUrl.replace('.bin', '/../file'),
    overviewUrl.replace('/420/', '/%34%32%30/'), overviewUrl.replace('.bin', '.bin/extra')]) {
    assert.equal((await request(middleware, bad)).status, 404, bad);
  }
  assert.equal((await request(middleware, overviewUrl, 'POST')).status, 404);
  assert.equal(calls.length, before, 'invalid paths do not perform source I/O');
  // Both supported extreme identities are admitted to the fixed source path;
  // this fixture has another geographic identity, so source verification fails.
  for (const url of ['/scenery/elevation/copernicus-overview/0/1.bin', '/scenery/elevation/copernicus-overview/1439/718.bin']) {
    assert.equal((await request(middleware, url)).status, 502);
  }
});

test('Task162 overview and fine aligned nodes sample identical source posts, not profile-scaled elevations', async () => {
  const block = gradientBlock(), f = fixture(0, { blocks: Array(16).fill(block) });
  const middleware = createCopernicusTerrainMiddleware({ fetcher: fixtureFetcher(f) });
  const fine = await request(middleware, cellUrl), overview = await request(middleware, overviewUrl);
  assert.equal(fine.status, 200); assert.equal(overview.status, 200);
  assert.equal(fine.bytes.readUInt32LE(8), 1); assert.equal(overview.bytes.readUInt32LE(8), 2);
  for (let y = 0; y <= 16; y++) for (let x = 0; x <= 16; x++) {
    assert.equal(overview.bytes.readFloatLE(64 + ((112 + y) * 129 + x) * 4),
      fine.bytes.readFloatLE(64 + ((y * 8) * 129 + x * 8) * 4), `shared node ${x}/${y}`);
  }
  assert.equal(overview.bytes.readFloatLE(64 + 128 * 129 * 4), 100, 'northwest source post has its input metre height');
  assert.equal(overview.bytes.readFloatLE(64 + (128 * 129 + 16) * 4), 114.125, 'nearest longitude source post, no vertical scaling');
});

test('Task162 numeric profile identities never alias output cache or pending jobs while source caches remain shared', async () => {
  const north = fixture(123.5), south = fixture(321, { west: -167, north: -73 }); let calls = 0;
  const fetcher: typeof fetch = async (url, options) => {
    calls++; return fixtureFetcher(String(url).includes('_S74_00_W167_00_') ? south : north)(url, options);
  };
  const middleware = createCopernicusTerrainMiddleware({ fetcher });
  const sameNumericFine = '/scenery/elevation/copernicus/420/523.bin';
  const [fine, overview] = await Promise.all([request(middleware, sameNumericFine), request(middleware, overviewUrl)]);
  assert.equal(fine.status, 200); assert.equal(overview.status, 200);
  assert.equal(fine.bytes.readUInt32LE(8), 1); assert.equal(fine.bytes.readFloatLE(64), 321);
  assert.equal(overview.bytes.readUInt32LE(8), 2); assert.equal(overview.bytes.readFloatLE(64), 123.5);
  const before = calls;
  assert.deepEqual((await request(middleware, sameNumericFine)).bytes, fine.bytes);
  assert.deepEqual((await request(middleware, overviewUrl)).bytes, overview.bytes);
  assert.equal(calls, before, 'each profile retains its own cache entry');
});

test('Task162 an overview spanning source blocks retains NaN gaps and rejects corrupt or absent upstream data', async () => {
  const missing = encodedBlock(NaN), valid = encodedBlock(250);
  const blocks = Array(16).fill(valid); blocks[0] = missing;
  const f = fixture(0, { blocks }), m = createCopernicusTerrainMiddleware({ fetcher: fixtureFetcher(f) });
  const result = await request(m, overviewUrl.replace('/420/', '/421/'));
  assert.equal(result.status, 200); assert(Number.isNaN(result.bytes.readFloatLE(64)));
  assert.equal(result.bytes.readFloatLE(64 + 128 * 4), 250, 'other source block remains valid');
  const allMissing = fixture(NaN);
  assert.equal((await request(createCopernicusTerrainMiddleware({ fetcher: fixtureFetcher(allMissing) }), overviewUrl)).status, 502);
  for (const fetcher of [async () => new Response('', { status: 404 }), async () => new Response(f.header, { status: 200 }),
    async () => responseFor(f.header, 0, 16383, 100000000), async () => new Promise<Response>(() => {})]) {
    const failed = await request(createCopernicusTerrainMiddleware({ fetcher: fetcher as typeof fetch, timeoutMs: 10 }), overviewUrl);
    assert.equal(failed.status, 502); assert.equal(failed.bytes.length, 0);
  }
});

test('Task162 overview shares bounded jobs and reserves a decoder slot for authoritative fine requests', async () => {
  let release!: (response: Response) => void; let calls = 0;
  const held = new Promise<Response>(resolve => { release = resolve; });
  const middleware = createCopernicusTerrainMiddleware({ fetcher: (async () => { calls++; return held; }) as typeof fetch, timeoutMs: 100 });
  const overview = request(middleware, overviewUrl), duplicate = request(middleware, overviewUrl);
  assert.equal((await request(middleware, overviewUrl.replace('/420/', '/421/'))).status, 503, 'overview cannot take the reserved slot');
  const fine = request(middleware, cellUrl);
  assert.equal((await request(middleware, cellUrl.replace('/3360/', '/3361/'))).status, 503, 'shared total remains two jobs');
  release(new Response('', { status: 404 }));
  assert.equal((await fine).status, 502); assert.equal((await overview).status, 502); assert.equal((await duplicate).status, 502);
  assert.equal(calls, 1, 'coincident overview/fine source-header work is deduplicated');
});
