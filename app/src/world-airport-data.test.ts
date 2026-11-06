import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';
import type { WorldAirport, WorldAirportCell, WorldAirportManifest, WorldSearchHit } from './world-airport-contract.ts';
import { nearbyWorldAirportCells, readWorldAirportAsset, readWorldAirportSearch, validateWorldAirportCell,
  validateWorldAirportDescriptor, validateWorldAirportManifest, validateWorldSearch, worldAirportCellId } from './world-airport-data.ts';
import { createWorldAirportRepository } from './world-airport-repository.ts';
import { createWorldAirportLoader } from './world-airport-loader.ts';

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const bytes = (data: unknown) => new TextEncoder().encode(JSON.stringify(data));
export function fixture(airports: WorldAirport[] = [makeAirport('TEST', 8, 48)]) {
  const cells: Record<string, WorldAirportCell> = {};
  const entries: WorldSearchHit[] = [];
  for (const airport of airports) {
    const id = worldAirportCellId(airport.lon, airport.lat);
    cells[id] ??= { schema: 1, id, airports: [], runways: [], com: [], navaids: [] };
    cells[id].airports.push(airport);
    entries.push({ kind: 'airport', id: airport.id, name: airport.name, codes: airport.icao,
      type: airport.type, lat: airport.lat, lon: airport.lon, iso_country: airport.iso_country, cell: id });
  }
  const index = bytes({ schema: 1, entries }), compressed = new Uint8Array(gzipSync(index));
  const manifest: WorldAirportManifest = {
    schema: 1, id: 'ourairports-world-v1', cell_degrees: 5, source_commit: 'a'.repeat(40), retrieved: '2026-11-06',
    source: 'OurAirports community snapshot', source_url: 'https://github.com/davidmegginson/ourairports-data', source_terms: 'https://ourairports.com/data/',
    source_files: Object.fromEntries(['airports.csv', 'runways.csv', 'airport-frequencies.csv', 'navaids.csv'].map(name => [name, { bytes: 1, sha256: 'b'.repeat(64), rows: 1 }])),
    counts: { airports: airports.length, runways: 0, com: 0, navaids: 0 }, rejections: {},
    search: { path: 'search.bin', bytes: compressed.length, sha256: hash(compressed), expanded_bytes: index.length, expanded_sha256: hash(index), count: entries.length },
    cells: Object.fromEntries(Object.entries(cells).map(([id, cell]) => { const raw = bytes(cell); return [id, { bytes: raw.length, sha256: hash(raw), counts: { airports: cell.airports.length, runways: 0, com: 0, navaids: 0 } }]; })),
  };
  const assets = new Map<string, Uint8Array>([['/airports/world/manifest.json', bytes({ schema: 1, id: 'ourairports-world-catalogue-v1', path: 'catalogue.bin', bytes: bytes(manifest).length, sha256: hash(bytes(manifest)) })], ['/airports/world/catalogue.bin', bytes(manifest)], ['/airports/world/search.bin', compressed],
    ...Object.entries(cells).map(([id, cell]) => [`/airports/world/cells/${id}.bin`, bytes(cell)] as [string, Uint8Array])]);
  return { manifest, cells, entries, index, compressed, assets };
}
export function makeAirport(id: string, lon: number, lat: number): WorldAirport {
  return { id, source_id: String(1000 + id.split('').reduce((n, c) => n + c.charCodeAt(0), 0)), name: `${id} Airport`, type: 'small_airport',
    icao: id, local: '', lat, lon, elevation_ft: null, iso_region: 'FR-U-A', iso_country: 'FR' };
}

test('worldwide cell ownership handles edges, dateline and pole without duplicate neighbours', () => {
  assert.equal(worldAirportCellId(-180, -90), '0-0');
  assert.equal(worldAirportCellId(180, 90), '0-35');
  assert.equal(worldAirportCellId(179.999, 89.999), '71-35');
  assert.equal(worldAirportCellId(5, 50), '37-28');
  assert.deepEqual(nearbyWorldAirportCells('0-0'), ['0-0', '1-0', '0-1', '71-0', '1-1', '71-1']);
  for (const value of [NaN, Infinity, 181]) assert.throws(() => worldAirportCellId(value, 0));
  assert.throws(() => nearbyWorldAirportCells('00-0'));
});

test('manifest validates fixed paths, source provenance, totals and bounded metadata', () => {
  const { manifest } = fixture(); assert.equal(validateWorldAirportManifest(manifest), manifest);
  const mutations = [
    (m: any) => { m.search.path = 'https://evil.test/data'; },
    (m: any) => { m.cells['../0'] = Object.values(m.cells)[0]; },
    (m: any) => { m.counts.airports++; },
    (m: any) => { m.search.count++; },
    (m: any) => { m.source_files['airports.csv'].sha256 = 'bad'; },
    (m: any) => { m.cells['37-27'].counts.airports = 20001; },
  ];
  for (const mutate of mutations) { const m = structuredClone(manifest); mutate(m); assert.throws(() => validateWorldAirportManifest(m)); }
});

test('hash-valid cell semantics reject wrong ownership, duplicate identity and orphan records', () => {
  const { cells, manifest } = fixture(), cell = cells['37-27'];
  assert.equal(validateWorldAirportCell(cell, cell.id, manifest.cells[cell.id].counts).airports[0].id, 'TEST');
  const badPosition = structuredClone(cell); badPosition.airports[0].lon = -123;
  assert.throws(() => validateWorldAirportCell(badPosition, cell.id, manifest.cells[cell.id].counts), /airport/);
  const duplicate = structuredClone(cell); duplicate.airports.push({ ...duplicate.airports[0] });
  assert.throws(() => validateWorldAirportCell(duplicate, cell.id, { ...manifest.cells[cell.id].counts, airports: 2 }), /duplicate/);
  const orphan = { ...cell, com: [{ id: '1', airport_id: 'ABSENT', service: 'TWR', description: '', channel_khz: 122500, source_frequency_mhz: '122.5' }] };
  assert.throws(() => validateWorldAirportCell(orphan, cell.id, { ...manifest.cells[cell.id].counts, com: 1 }), /COM/);
});

test('community COM and NDB source values retain untunable values and fractional kHz', () => {
  const { cells, manifest } = fixture(), cell = cells['37-27'];
  cell.com = [{ id: '1', airport_id: 'TEST', service: 'TWR', description: 'Source zero', channel_khz: 0, source_frequency_mhz: '0' },
    { id: '2', airport_id: 'TEST', service: 'TWR', description: 'Source out of band', channel_khz: 1795500, source_frequency_mhz: '1795.5' },
    { id: '3', airport_id: 'TEST', service: 'TWR', description: 'Source finer than tuner', channel_khz: 122500, source_frequency_mhz: '122.5001' }];
  cell.navaids = [{ id: 'oa-nav-2', source_id: '2', ident: 'NDB', name: 'Fractional NDB', type: 'NDB', lat: 48, lon: 8,
    iso_country: 'FR', elevation_ft: null, frequency_khz: 300.5, associated_airport: '' }];
  const result = validateWorldAirportCell(cell, cell.id, { ...manifest.cells[cell.id].counts, com: 3, navaids: 1 });
  assert.equal(result.com[1].source_frequency_mhz, '1795.5'); assert.equal(result.com[2].source_frequency_mhz, '122.5001');
  assert.equal(result.navaids[0].frequency_khz, 300.5);
});

test('global search index validates wrapper, IDs and geographic cell membership', () => {
  const { entries, manifest } = fixture();
  assert.equal(validateWorldSearch({ schema: 1, entries }, manifest)[0].id, 'TEST');
  assert.throws(() => validateWorldSearch(entries, manifest));
  assert.throws(() => validateWorldSearch({ schema: 1, entries: [{ ...entries[0], cell: '0-0' }] }, manifest));
  assert.throws(() => validateWorldSearch({ schema: 2, entries }, manifest));
});

test('bounded asset reader rejects size/hash/redirect and cancelled or stalled requests', async () => {
  const ac = new AbortController(), raw = bytes({ okay: true });
  const fetcher = async () => new Response(raw);
  const path = '/airports/world/manifest.json';
  assert.deepEqual(await readWorldAirportAsset(path, 100, ac.signal, fetcher as typeof fetch, { bytes: raw.length, sha256: hash(raw) }), raw);
  await assert.rejects(readWorldAirportAsset(path, 3, ac.signal, fetcher as typeof fetch), /byte limit/);
  await assert.rejects(readWorldAirportAsset(path, 100, ac.signal, fetcher as typeof fetch, { bytes: raw.length, sha256: '0'.repeat(64) }), /integrity/);
  await assert.rejects(readWorldAirportAsset('https://evil.test/x', 100, ac.signal, fetcher as typeof fetch), /asset path/);
  await assert.rejects(readWorldAirportAsset('/airports/world/cells/072-0.bin', 100, ac.signal, fetcher as typeof fetch), /asset path/);
  const redirected = async () => { const r = new Response(raw); Object.defineProperty(r, 'redirected', { value: true }); return r; };
  await assert.rejects(readWorldAirportAsset(path, 100, ac.signal, redirected as typeof fetch), /unavailable/);
  const stalled = (() => new Promise<Response>(() => {})) as typeof fetch;
  await assert.rejects(readWorldAirportAsset(path, 100, ac.signal, stalled, undefined, 15), /timed out/);
  ac.abort(); await assert.rejects(readWorldAirportAsset(path, 100, ac.signal, fetcher as typeof fetch), /cancelled/);
});

test('gzip search reader rejects changed expanded bytes and malformed compressed data', async () => {
  const { compressed, manifest } = fixture(), signal = new AbortController().signal;
  assert.equal((await readWorldAirportSearch(compressed, manifest, signal))[0].id, 'TEST');
  await assert.rejects(readWorldAirportSearch(compressed, { ...manifest, search: { ...manifest.search, expanded_sha256: 'f'.repeat(64) } }, signal), /integrity/);
  await assert.rejects(readWorldAirportSearch(new Uint8Array([1, 2, 3]), manifest, signal));
});

test('shipped worldwide manifest, source cells and gzip search pass client validation', async () => {
  const root = new URL('../public/airports/world/', import.meta.url);
  const descriptor = validateWorldAirportDescriptor(JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')));
  const catalogue = readFileSync(new URL('catalogue.bin', root));
  assert.equal(catalogue.length, descriptor.bytes); assert.equal(hash(catalogue), descriptor.sha256);
  const manifest = validateWorldAirportManifest(JSON.parse(catalogue.toString()));
  let airportCount = 0, navaidCount = 0;
  for (const [id, meta] of Object.entries(manifest.cells)) {
    const raw = readFileSync(new URL(`cells/${id}.bin`, root));
    assert.equal(raw.length, meta.bytes); assert.equal(hash(raw), meta.sha256);
    const cell = validateWorldAirportCell(JSON.parse(raw.toString()), id, meta.counts);
    airportCount += cell.airports.length; navaidCount += cell.navaids.length;
  }
  assert.equal(airportCount, 86343); assert.equal(navaidCount, 11008);
  const compressed = new Uint8Array(readFileSync(new URL('search.bin', root)));
  assert.equal(hash(compressed), manifest.search.sha256);
  const index = await readWorldAirportSearch(compressed, manifest, new AbortController().signal);
  assert.equal(index.length, 97351);
  for (const id of ['LFPG', 'LOWW', 'LSZH', 'FACT', 'KJFK', 'EGLL', 'RJTT']) assert(index.some(row => row.kind === 'airport' && row.id === id), id);
});

async function settled(repository: ReturnType<typeof createWorldAirportRepository>, timeout = 1500): Promise<void> {
  const stop = Date.now() + timeout;
  while (repository.status.status === 'loading') {
    if (Date.now() > stop) throw new Error(`Repository did not settle: ${repository.status.message}`);
    await new Promise(resolve => setTimeout(resolve, 2));
  }
}
function sourceFetcher(assets: Map<string, Uint8Array>, calls: string[]) {
  return (async (input: RequestInfo | URL) => {
    const path = String(input); calls.push(path);
    const raw = assets.get(path);
    return new Response(raw ?? 'missing', { status: raw ? 200 : 404 });
  }) as typeof fetch;
}

test('regional owner loads centre/neighbours and uses validated absence without 404 requests', async () => {
  const { assets } = fixture(), calls: string[] = [], snapshots: string[][] = [];
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(assets, calls), onSnapshot: s => snapshots.push(s.airports.map(a => a.id)) });
  try {
    repo.updateCenter(8, 48); await settled(repo);
    assert.equal(repo.status.status, 'ready'); assert.equal(repo.status.loaded, 9);
    assert.deepEqual(repo.snapshot.airports.map(a => a.id), ['TEST']); assert.equal(repo.snapshot.partial, false);
    assert.deepEqual(calls, ['/airports/world/manifest.json', '/airports/world/catalogue.bin', '/airports/world/cells/37-27.bin']);
    assert(snapshots.some(ids => ids.includes('TEST')));
    repo.updateCenter(-40, -40); await settled(repo);
    assert.equal(repo.status.status, 'empty'); assert.equal(repo.snapshot.airports.length, 0);
    assert.equal(calls.length, 3); // Absence is accepted only from the validated manifest.
  } finally { repo.dispose(); }
});

test('global search finds distant records and selection brings their full cell into the snapshot', async () => {
  const f = fixture([makeAirport('LFPG', 2.55, 49), makeAirport('FACT', 18.6, -33.97)]), calls: string[] = [];
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, calls) });
  try {
    repo.updateCenter(2, 49); await settled(repo);
    assert(!repo.snapshot.airports.some(a => a.id === 'FACT'));
    const result = await repo.search('fact'); assert.equal(result[0].id, 'FACT');
    const s = await repo.select(result[0]); assert(s.airports.some(a => a.id === 'FACT'));
    assert.equal(s.source_commit, f.manifest.source_commit);
    assert.equal(calls.filter(path => path.endsWith('search.bin')).length, 1);
    await repo.search('LFPG'); assert.equal(calls.filter(path => path.endsWith('search.bin')).length, 1);
    assert.deepEqual(await repo.search('f'), []);
    await assert.rejects(repo.search('a'.repeat(121)), /Invalid/);
  } finally { repo.dispose(); }
});

test('failed and corrupt cells report partial/unavailable with no retry storm', async () => {
  const f = fixture([makeAirport('FIRST', 8, 48), makeAirport('SECOND', 12, 48)]), calls: string[] = [];
  f.assets.set('/airports/world/cells/38-27.bin', bytes({ corrupt: true }));
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, calls) });
  try {
    repo.updateCenter(8, 48); await settled(repo);
    assert.equal(repo.status.status, 'partial'); assert.equal(repo.snapshot.partial, true);
    assert(repo.snapshot.airports.some(a => a.id === 'FIRST')); assert(!repo.snapshot.airports.some(a => a.id === 'SECOND'));
    for (let i = 0; i < 50; i++) repo.updateCenter(8, 48);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls.filter(path => path.endsWith('/38-27.bin')).length, 1);
    const hit = (await repo.search('SECOND'))[0]; await assert.rejects(repo.select(hit), /unavailable/);
  } finally { repo.dispose(); }
});

test('obsolete uncooperative fetch cannot install or clear the new centre data', async () => {
  const f = fixture([makeAirport('OLD', 8, 48), makeAirport('NEW', 105, 25)]), calls: string[] = [];
  let release: ((response: Response) => void) | undefined;
  const normal = sourceFetcher(f.assets, calls);
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => String(input).endsWith('/37-27.bin')
    ? new Promise<Response>(resolve => { calls.push(String(input)); release = resolve; }) : normal(input, init)) as typeof fetch;
  const repo = createWorldAirportRepository({ fetcher, timeoutMs: 500 });
  try {
    repo.updateCenter(8, 48);
    const stop = Date.now() + 500;
    while (!release) { assert(Date.now() < stop); await new Promise(resolve => setTimeout(resolve, 2)); }
    repo.updateCenter(105, 25); await settled(repo);
    assert.deepEqual(repo.snapshot.airports.map(a => a.id), ['NEW']);
    release!(new Response(f.assets.get('/airports/world/cells/37-27.bin')));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(repo.snapshot.airports.map(a => a.id), ['NEW']); assert.equal(repo.status.status, 'ready');
  } finally { repo.dispose(); }
});

test('cache stays bounded over world travel and disposed repositories reject new work', async () => {
  const f = fixture(), calls: string[] = [];
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, calls) });
  for (let lon = -175; lon < 180; lon += 20) {
    repo.updateCenter(lon, 10); await settled(repo);
    assert(repo.status.cached <= 18); assert(repo.status.cacheBytes <= 25165824);
  }
  repo.dispose(); assert.equal(repo.status.cacheBytes, 0);
  assert.throws(() => repo.updateCenter(0, 0), /disposed/);
  await assert.rejects(repo.search('TEST'), /disposed/);
});

test('aggregate count limits produce partial snapshot and partial status together', async () => {
  const airports: WorldAirport[] = [];
  for (let i = 0; i < 20002; i++) airports.push({ ...makeAirport(`LIMIT${i}`, i < 10001 ? 8 : 12, 48), source_id: String(i + 1) });
  const f = fixture(airports), calls: string[] = [];
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, calls) });
  try {
    repo.updateCenter(8, 48); await settled(repo, 10000);
    assert.equal(repo.status.loaded, 9); assert.equal(repo.snapshot.airports.length, 10001);
    assert.equal(repo.snapshot.partial, true); assert.equal(repo.status.status, 'partial');
  } finally { repo.dispose(); }
});

test('duplicate cross-cell identity is disclosed in both aggregate and status', async () => {
  const f = fixture([makeAirport('SAME', 8, 48), { ...makeAirport('SAME', 12, 48), source_id: '98765' }]), calls: string[] = [];
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, calls) });
  try {
    repo.updateCenter(8, 48); await settled(repo);
    assert.equal(repo.status.loaded, 9); assert.equal(repo.snapshot.airports.length, 1);
    assert.equal(repo.snapshot.partial, true); assert.equal(repo.status.status, 'partial');
  } finally { repo.dispose(); }
});

test('disposal aborts a pending source job and suppresses late snapshot callbacks', async () => {
  const f = fixture(), snapshots: unknown[] = [];
  let release: ((value: Response) => void) | undefined;
  const fetcher = (() => new Promise<Response>(resolve => { release = resolve; })) as typeof fetch;
  const repo = createWorldAirportRepository({ fetcher, onSnapshot: value => snapshots.push(value) });
  repo.updateCenter(8, 48); assert(release); repo.dispose();
  release(new Response(f.assets.get('/airports/world/manifest.json')));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(snapshots.length, 0); assert.equal(repo.status.cacheBytes, 0);
});

test('corrupt manifest does not become empty worldwide coverage', async () => {
  const f = fixture(), calls: string[] = [];
  f.assets.set('/airports/world/manifest.json', bytes({ schema: 2 }));
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, calls) });
  try {
    repo.updateCenter(8, 48); await settled(repo);
    assert.equal(repo.status.status, 'unavailable'); assert.equal(repo.snapshot.partial, true);
    await assert.rejects(repo.search('TEST'), /manifest/);
    assert.equal(calls.length, 1);
  } finally { repo.dispose(); }
});

class FakeWorldWorker extends EventTarget {
  static instances: FakeWorldWorker[] = [];
  messages: any[] = []; terminated = false;
  constructor() { super(); FakeWorldWorker.instances.push(this); }
  postMessage(message: unknown): void { this.messages.push(message); }
  terminate(): void { this.terminated = true; }
  emit(data: unknown): void { this.dispatchEvent(new MessageEvent('message', { data })); }
}
test('browser worker protocol rejects invalid snapshots and isolates terminated-worker messages', async () => {
  const before = globalThis.Worker; globalThis.Worker = FakeWorldWorker as unknown as typeof Worker;
  const snapshots: unknown[] = [], statuses: string[] = [];
  let time = 1000;
  const loader = createWorldAirportLoader({ onSnapshot: s => snapshots.push(s), onStatus: s => statuses.push(s.status), now: () => time });
  try {
    loader.updateCenter(8, 48); const old = FakeWorldWorker.instances.at(-1)!;
    const pending = loader.search('TEST');
    old.emit({ type: 'snapshot', snapshot: { airports: [] } });
    await assert.rejects(pending, /worker unavailable/); assert.equal(old.terminated, true); assert.equal(statuses.at(-1), 'unavailable');
    const count = FakeWorldWorker.instances.length;
    for (let i = 0; i < 100; i++) loader.updateCenter(8, 48);
    assert.equal(FakeWorldWorker.instances.length, count); assert.equal(statuses.length, 1);
    time += 60001;
    loader.updateCenter(8, 48); const current = FakeWorldWorker.instances.at(-1)!;
    old.emit({ type: 'snapshot', snapshot: { broken: true } });
    assert.equal(current.terminated, false);
    const { manifest } = fixture();
    const snapshot = { airports: [], runways: [], com: [], navaids: [], source: manifest.source, retrieved: manifest.retrieved,
      source_commit: manifest.source_commit, partial: false };
    current.emit({ type: 'snapshot', snapshot }); assert.equal(snapshots.length, 1);
    const search = loader.search('TEST'), request = current.messages.at(-1);
    current.emit({ type: 'result', id: request.id, value: [] }); assert.deepEqual(await search, []);
    const selected = loader.select(fixture().entries[0]), selectionRequest = current.messages.at(-1);
    current.emit({ type: 'result', id: selectionRequest.id, value: { broken: true } });
    await assert.rejects(selected, /selection response/);
    const outstanding = loader.search('TEST'); loader.dispose(); await assert.rejects(outstanding, /disposed/);
    current.emit({ type: 'snapshot', snapshot }); assert.equal(snapshots.length, 1); assert.equal(current.terminated, true);
  } finally { loader.dispose(); globalThis.Worker = before; }
});

test('worker construction failure has a bounded restart cooldown and deduplicated unavailable status', () => {
  const before = globalThis.Worker; let attempts = 0, statuses = 0, time = 1000;
  globalThis.Worker = class { constructor() { attempts++; throw new Error('Missing worker asset'); } } as unknown as typeof Worker;
  const loader = createWorldAirportLoader({ onSnapshot() {}, onStatus() { statuses++; }, now: () => time });
  try {
    for (let i = 0; i < 100; i++) loader.updateCenter(8, 48);
    assert.equal(attempts, 1); assert.equal(statuses, 1);
    time += 60001; loader.updateCenter(8, 48); assert.equal(attempts, 2); assert.equal(statuses, 1);
  } finally { loader.dispose(); globalThis.Worker = before; }
});


test('opaque catalogue requires the descriptor size and hash before admission', async () => {
  const f = fixture();
  f.assets.set('/airports/world/catalogue.bin', bytes({ altered: true }));
  const repo = createWorldAirportRepository({ fetcher: sourceFetcher(f.assets, []) });
  try {
    repo.updateCenter(8, 48); await settled(repo);
    assert.equal(repo.status.status, 'unavailable');
    assert.equal(repo.snapshot.airports.length, 0);
    assert.throws(() => validateWorldAirportDescriptor({ schema: 1, id: 'ourairports-world-catalogue-v1', path: '../other', bytes: 10, sha256: 'f'.repeat(64) }));
  } finally { repo.dispose(); }
});
