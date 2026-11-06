import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, afterEach } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAirportRegionMiddleware, type AirportRegionServerOptions } from './airport-region-server.ts';
import { createAirportCompiler } from './airport-generator-worker.ts';
import { AIRPORT_REGION_ENDPOINT, AIRPORT_REGION_LIMITS } from './src/airport-region.ts';

type Handler = ReturnType<typeof createAirportRegionMiddleware>;
interface Result { status: number; headers: Record<string, string>; data: Buffer; next: boolean }
const handlers = new Set<Handler>();
afterEach(async () => { await Promise.all([...handlers].map(h => h.dispose())); handlers.clear(); });
const instant = Date.parse('2026-11-06T09:00:00Z');
const path = (x = 377, y = 280) => `/scenery/airports/v1/${x}/${y}.json`;
function fixtureSource(input: RequestInfo | URL, init?: RequestInit, empty = false): Response {
  assert.equal(String(input), AIRPORT_REGION_ENDPOINT);
  const query = new URLSearchParams(String(init?.body)).get('data')!;
  const match = /\]\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\);out meta geom;$/.exec(query)!;
  assert(match, query); const [south, west] = match.slice(1).map(Number);
  return Response.json({ osm3s: { timestamp_osm_base: '2026-11-06T08:00:00Z' }, elements: empty ? [] : [{
    type: 'way', id: Math.round((west + 180) * 1000 + south + 90) + 1, version: 1,
    timestamp: '2026-07-28T12:00:00Z', user: 'SECRET_MAPPER', uid: 123456789,
    tags: { aeroway: 'runway', surface: 'asphalt', ref: '08/26', width: '25' },
    geometry: [{ lon: west + .1, lat: south + .1 }, { lon: west + .101, lat: south + .101 }],
  }] });
}
function handler(options: AirportRegionServerOptions = {}): Handler {
  const created = createAirportRegionMiddleware({ cacheDir: null, minIntervalMs: 0, deadlineMs: 1000, now: () => instant,
    fetcher: async (input, init) => fixtureSource(input, init), ...options });
  handlers.add(created); return created;
}
function request(h: Handler, url: string, method = 'GET', headers: Record<string, string> = {}) {
  const req = Object.assign(new EventEmitter(), { url, method, headers });
  let finish!: (value: Result) => void;
  const promise = new Promise<Result>(resolve => { finish = resolve; });
  const res = Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false, headersSent: false,
    status: 0, headers: {} as Record<string, string>,
    writeHead(status: number, values: Record<string, string> = {}) { this.status = status; this.headers = values; this.headersSent = true; return this; },
    end(data?: Buffer) { this.writableEnded = true; finish({ status: this.status, headers: this.headers, data: data ?? Buffer.alloc(0), next: false }); return this; },
  });
  h(req as unknown as IncomingMessage, res as unknown as ServerResponse,
    () => finish({ status: 0, headers: {}, data: Buffer.alloc(0), next: true }));
  return { promise, abort() { res.destroyed = true; req.emit('aborted'); res.emit('close'); finish({ status: 0, headers: {}, data: Buffer.alloc(0), next: false }); } };
}
const call = (h: Handler, url = path(), method = 'GET', headers: Record<string, string> = {}) => request(h, url, method, headers).promise;
async function tickUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 300 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert(predicate());
}

test('R-AIRPORT-3 fixed route and query forward no caller URL, credentials or arbitrary text', async () => {
  let calls = 0;
  const h = handler({ fetcher: async (input, init) => {
    calls++; assert.equal(String(input), AIRPORT_REGION_ENDPOINT); assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit'); assert(init?.signal);
    assert.match(String((init?.headers as Record<string, string>)['User-Agent']), /Gefly.*github/);
    assert(!JSON.stringify(init?.headers).includes('SECRET_COOKIE'));
    return fixtureSource(input, init);
  } });
  const result = await call(h, path(), 'GET', { cookie: 'SECRET_COOKIE', authorization: 'SECRET_COOKIE' });
  assert.equal(result.status, 200); assert.equal(result.headers['X-Airport-Cache'], 'generated');
  assert.equal(result.headers['X-Airport-Persistence'], 'disabled'); assert(!result.data.includes('SECRET_MAPPER'));
  const expected = '"' + createHash('sha256').update(result.data).digest('hex') + '"'; assert.equal(result.headers.ETag, expected);
  assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal((await call(h, path(), 'HEAD')).data.length, 0); assert.equal(calls, 1);
  assert.equal((await call(h, path(), 'GET', { 'if-none-match': expected })).status, 304);
  for (const invalid of [path() + '?url=https://evil.example', path() + '?token=SECRET', '/scenery/airports/v1/../secret',
    '/scenery/airports/v1/%2e%2e/1.json', '/scenery/airports/v1/00/1.json', '/scenery/airports/v1/720/0.json',
    '/scenery/airports/v1/0/360.json', '/scenery/airports/v1/-1/0.json', path() + '/extra', '/scenery/airports/v2/0/0.json']) {
    assert.equal((await call(h, invalid)).status, 404, invalid);
  }
  assert.equal((await call(h, path(), 'POST')).status, 404); assert.equal(calls, 1);
  assert((await call(h, '/other.json')).next);
});

test('R-AIRPORT-3 generated disk cache survives a new service instance and validates SHA/schema on every read', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gefly-airport-cache-')); t.after(() => rm(directory, { recursive: true, force: true }));
  let calls = 0; const fetcher: typeof fetch = async (input, init) => { calls++; return fixtureSource(input, init); };
  const first = await call(handler({ cacheDir: directory, fetcher })); assert.equal(first.status, 200);
  assert.equal((await call(handler({ cacheDir: directory, fetcher }))).headers['X-Airport-Cache'], 'disk'); assert.equal(calls, 1);
  const files = await readdir(directory); assert.deepEqual(files, ['377-280.json']);
  const envelope = JSON.parse(await readFile(join(directory, files[0]), 'utf8'));
  envelope.package.features[0].geometry.coordinates[0][0] = 120;
  envelope.sha256 = createHash('sha256').update(JSON.stringify(envelope.package)).digest('hex');
  await writeFile(join(directory, files[0]), JSON.stringify(envelope));
  const repaired = await call(handler({ cacheDir: directory, fetcher })); assert.equal(repaired.status, 200); assert.equal(calls, 2);
  await writeFile(join(directory, files[0]), '{corrupt');
  assert.equal((await call(handler({ cacheDir: directory, fetcher }))).status, 200); assert.equal(calls, 3);
  assert(!String(await readFile(join(directory, files[0]))).includes('SECRET_MAPPER'));
});

test('R-AIRPORT-3 disk byte/entry LRU is bounded and unavailable persistence leaves working memory scenery', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gefly-airport-lru-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const h = handler({ cacheDir: directory, cacheEntries: 1 });
  assert.equal((await call(h, path(377))).status, 200); assert.equal((await call(h, path(378))).status, 200);
  assert.equal((await readdir(directory)).length, 1); assert.equal(h.stats().diskEntries, 1); assert.equal(h.stats().memoryEntries, 1);
  const blocked = join(directory, 'not-a-directory'); await writeFile(blocked, 'x');
  let calls = 0; const fallback = handler({ cacheDir: blocked, fetcher: async (input, init) => { calls++; return fixtureSource(input, init); } });
  const result = await call(fallback); assert.equal(result.status, 200); assert.equal(result.headers['X-Airport-Persistence'], 'disabled');
  assert.equal((await call(fallback)).headers['X-Airport-Cache'], 'memory'); assert.equal(calls, 1);
});

test('R-AIRPORT-3 cancelling disk validation preserves the valid file and index for the next request', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gefly-airport-cache-abort-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const seeded = await call(handler({ cacheDir: directory }));
  assert.equal(seeded.status, 200);
  const filename = join(directory, '377-280.json');
  const original = await readFile(filename);
  let sourceCalls = 0;
  const h = handler({ cacheDir: directory, fetcher: async () => {
    sourceCalls++; throw new Error('A valid disk entry must not need an upstream request');
  } });
  await tickUntil(() => h.stats().diskEntries === 1);
  const cancelled = request(h, path());
  // Observe actual worker ownership before aborting, rather than racing a
  // timer against disk startup or cancelling before validation has begun.
  await tickUntil(() => h.stats().compilerActive === 1);
  cancelled.abort();
  await tickUntil(() => h.stats().pending === 0 && h.stats().compilerActive === 0);
  assert.equal(h.stats().diskEntries, 1);
  assert.equal(h.stats().diskBytes, original.length);
  assert.deepEqual(await readFile(filename), original);
  const next = await call(h);
  assert.equal(next.status, 200);
  assert.equal(next.headers['X-Airport-Cache'], 'disk');
  assert.deepEqual(next.data, seeded.data);
  assert.equal(sourceCalls, 0);
});

test('R-AIRPORT-3 success lasts seven days, verified empty one day, and failed source never becomes empty cache', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gefly-airport-ttl-')); t.after(() => rm(directory, { recursive: true, force: true }));
  let clock = instant, calls = 0, empty = false;
  const make = () => handler({ cacheDir: directory, now: () => clock, fetcher: async (input, init) => { calls++; return fixtureSource(input, init, empty); } });
  assert.equal((await call(make())).status, 200); clock += 6 * 86400000;
  assert.equal((await call(make())).headers['X-Airport-Cache'], 'disk'); assert.equal(calls, 1);
  clock += 86400001; assert.equal((await call(make())).headers['X-Airport-Cache'], 'generated'); assert.equal(calls, 2);
  empty = true; assert.equal((await call(make(), path(378))).status, 200); clock += 86400001;
  assert.equal((await call(make(), path(378))).headers['X-Airport-Cache'], 'generated'); assert.equal(calls, 4);
  const failing = handler({ cacheDir: directory, fetcher: async () => Response.json({ remark: 'runtime error: timeout', elements: [] }) });
  assert.equal((await call(failing, path(379))).status, 502); assert(!(await readdir(directory)).includes('379-280.json'));
});

test('R-AIRPORT-3 one physical source owner, eight pending jobs and duplicate sharing bound demand', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0, active = 0, peak = 0;
  const h = handler({ fetcher: async (input, init) => {
    calls++; active++; peak = Math.max(peak, active); if (calls === 1) await gate; active--; return fixtureSource(input, init);
  } });
  const jobs = Array.from({ length: 8 }, (_, i) => call(h, path(370 + i)));
  await tickUntil(() => h.stats().sourceActive === 1 && h.stats().sourceQueued === 7);
  assert.equal((await call(h, path(380))).status, 503);
  const duplicate = call(h, path(370)); assert.equal(h.stats().pending, 8);
  release(); const values = await Promise.all([...jobs, duplicate]); assert(values.every(value => value.status === 200));
  assert.equal(calls, 8); assert.equal(peak, 1); assert.equal(h.stats().pending, 0);
});

test('R-AIRPORT-3 failed source is negative-cached for five minutes, with global cooldown on throttle', async () => {
  let clock = instant, calls = 0;
  const h = handler({ deadlineMs: 1000, now: () => clock, fetcher: async (input, init) => {
    calls++; return calls === 1 ? Response.json({ error: 'busy' }, { status: 429 }) : fixtureSource(input, init);
  } });
  assert.equal((await call(h)).status, 502); assert.equal((await call(h)).status, 502); assert.equal(calls, 1);
  assert.equal((await call(h, path(378))).status, 502); assert.equal(calls, 1, 'another cell cannot bypass source cooldown');
  clock += 60001; assert.equal((await call(h, path(379))).status, 200); assert.equal(calls, 2);
  clock += 300001; assert.equal((await call(h)).status, 200); assert.equal(calls, 3);
});

test('R-AIRPORT-3 source bytes, MIME, redirects and malformed JSON fail closed', async () => {
  const sources = [
    () => new Response('html', { headers: { 'content-type': 'text/html' } }),
    () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': String(AIRPORT_REGION_LIMITS.maxSourceBytes + 1) } }),
    () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(AIRPORT_REGION_LIMITS.maxSourceBytes)); c.enqueue(new Uint8Array(1)); c.close(); } }), { headers: { 'content-type': 'application/json' } }),
    () => new Response('{bad', { headers: { 'content-type': 'application/json' } }),
    () => Object.defineProperty(Response.json({}), 'redirected', { value: true }),
  ];
  for (const fixture of sources) assert.equal((await call(handler({ fetcher: async () => fixture() }))).status, 502);
});

test('R-AIRPORT-3 deadline responds promptly but retains a noncooperative physical owner and rejects late results', async () => {
  let release!: (value: Response) => void, calls = 0, sourceRequest: [RequestInfo | URL, RequestInit | undefined] | undefined;
  const h = handler({ deadlineMs: 25, fetcher: async (input, init) => {
    calls++; sourceRequest = [input, init]; return new Promise<Response>(resolve => { release = resolve; });
  } });
  assert.equal((await call(h)).status, 502); assert.equal(h.stats().sourceActive, 1);
  assert.equal((await call(h, path(378))).status, 502); assert.equal(calls, 1, 'a timed-out uncooperative owner cannot overlap a replacement');
  release(fixtureSource(...sourceRequest!)); await tickUntil(() => h.stats().sourceActive === 0 && h.stats().sourceQueued === 0);
  assert.equal(h.stats().memoryEntries, 0); assert.equal(h.stats().pending, 0);
});

test('R-AIRPORT-3 disconnecting one subscriber preserves shared work; the final subscriber aborts it', async () => {
  let release!: () => void, sourceSignal: AbortSignal | undefined, calls = 0;
  const h = handler({ fetcher: async (input, init) => {
    calls++; sourceSignal = init?.signal as AbortSignal;
    await new Promise<void>((resolve, reject) => { release = resolve; sourceSignal!.addEventListener('abort', () => reject(Error('aborted')), { once: true }); });
    return fixtureSource(input, init);
  } });
  const a = request(h, path()), b = request(h, path()); await tickUntil(() => calls === 1);
  a.abort(); assert.equal(sourceSignal!.aborted, false); release(); assert.equal((await b.promise).status, 200);
  const c = request(h, path(378)); await tickUntil(() => calls === 2); c.abort();
  assert.equal(sourceSignal!.aborted, true); await tickUntil(() => h.stats().pending === 0 && h.stats().sourceActive === 0);
  assert.equal(h.stats().memoryEntries, 1, 'only the completed shared region enters the cache');
});

test('R-AIRPORT-3 minimum start spacing applies across distinct regions', async () => {
  const starts: number[] = [];
  const h = handler({ now: Date.now, minIntervalMs: 25, fetcher: async (input, init) => { starts.push(Date.now()); return fixtureSource(input, init); } });
  const values = await Promise.all([call(h, path(377)), call(h, path(378)), call(h, path(379))]);
  assert(values.every(v => v.status === 200)); assert.equal(starts.length, 3);
  assert(starts[1] - starts[0] >= 20); assert(starts[2] - starts[1] >= 20);
});


test('R-AIRPORT-3 source parsing, compilation, cache serialization and revalidation run in a real reusable CPU thread', async () => {
  const pool = createAirportCompiler();
  try {
    const abort = new AbortController(), key = {x:377,y:280};
    const response = fixtureSource(AIRPORT_REGION_ENDPOINT,{body:'data='+encodeURIComponent('[x](50,8.5,50.5,9);out meta geom;')});
    const raw = await response.arrayBuffer();
    let ticks = 0; const heartbeat = setInterval(() => {ticks++;}, 1);
    const first = await pool.compile(raw,key,'2026-11-06T09:00:00Z',abort.signal);clearInterval(heartbeat);
    assert(first.compilerThreadId>0);assert(ticks>0,'main event-loop heartbeat continues while worker starts and compiles');
    const cached = await pool.readCache(Uint8Array.from(first.cacheBytes).buffer,key,abort.signal);
    assert.equal(cached.compilerThreadId,first.compilerThreadId,'the active service reuses one CPU thread');
    assert.deepEqual(cached.bytes,first.bytes);assert.equal(pool.stats().active,0);
    assert.equal(JSON.parse(first.bytes.toString()).features.length,1);
  } finally {await pool.dispose();}
});

test('R-AIRPORT-3 queued compiler work is bounded; cancellation terminates active CPU work before replacement', async () => {
  const pool=createAirportCompiler();
  const controllers=Array.from({length:9},()=>new AbortController());
  const data=new TextEncoder().encode(JSON.stringify({osm3s:{timestamp_osm_base:'2026-11-06T08:00:00Z'},elements:[],padding:'x'.repeat(7_000_000)}));
  const make=(i:number)=>pool.compile(Uint8Array.from(data).buffer,{x:377,y:280},'2026-11-06T09:00:00Z',controllers[i].signal);
  try {
    const jobs=Array.from({length:8},(_,i)=>make(i).then(()=>false,()=>true));
    await assert.rejects(make(8),/queue full/);
    assert(pool.stats().queued<=7);assert.equal(pool.stats().active,1);
    controllers.forEach(c=>c.abort());assert((await Promise.all(jobs)).every(Boolean));
    await tickUntil(()=>pool.stats().active===0&&pool.stats().queued===0);
    const next=new AbortController();const empty=new TextEncoder().encode(JSON.stringify({osm3s:{timestamp_osm_base:'2026-11-06T08:00:00Z'},elements:[]}));
    const result=await pool.compile(empty.buffer,{x:377,y:280},'2026-11-06T09:00:00Z',next.signal);assert.equal(result.featureCount,0);assert(result.compilerThreadId>0);
  } finally {await pool.dispose();}
});
