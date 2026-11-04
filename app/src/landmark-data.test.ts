import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PbfWriter } from 'pbf';
import { createLandmarkSource, decodeLandmarkTile, type Landmark } from './landmark-data.ts';

interface Feature { id: number; props: Record<string, string>; type?: number; geometry?: number[] }
function fixture(layers: Record<string, Feature[]>): Uint8Array {
  const tile = new PbfWriter();
  for (const [name, features] of Object.entries(layers)) tile.writeMessage(3, (_, layer) => {
    const keys = [...new Set(features.flatMap(feature => Object.keys(feature.props)))];
    const values = [...new Set(features.flatMap(feature => Object.values(feature.props)))];
    layer.writeStringField(1, name); layer.writeVarintField(15, 2); layer.writeVarintField(5, 4096);
    for (const key of keys) layer.writeStringField(3, key);
    for (const value of values) layer.writeMessage(4, (_, writer) => writer.writeStringField(1, value), null);
    for (const feature of features) layer.writeMessage(2, (_, writer) => {
      writer.writeVarintField(1, feature.id);
      writer.writePackedVarint(2, Object.entries(feature.props).flatMap(([key, value]) => [keys.indexOf(key), values.indexOf(value)]));
      writer.writeVarintField(3, feature.type ?? 1); writer.writePackedVarint(4, feature.geometry ?? [9, 4096, 4096]);
    }, null);
  }, null);
  return tile.finish();
}
const point = (id: number, props: Record<string, string>): Feature => ({ id, props });
const tile = { z: 9 as const, x: 268, y: 173 };
const lat = 49.9116 * Math.PI / 180, lon = 8.6348 * Math.PI / 180;
const response = (bytes: Uint8Array) => new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { 'content-type': 'application/vnd.mapbox-vector-tile' } });
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise(resolve => setTimeout(resolve, 0)); };

test('landmark MVT decoding preserves preferred source names, point positions in radians and detail categories', () => {
  const places = fixture({ place: [point(1, { class: 'city', 'name:de': 'Frankfurt\u0000 am Main\u202e', name_de: 'fallback', name: 'English' }),
    point(2, { class: 'town', name_de: 'Egelsbach' }), point(3, { class: 'village', name: 'Kleiner Ort' }),
    point(4, { class: 'hamlet', name: 'Not in this tier' }), point(5, { class: 'city', name: '' })] });
  const decoded = decodeLandmarkTile(places, tile);
  assert.deepEqual(decoded.map(item => item.name), ['Frankfurt am Main', 'Egelsbach', 'Kleiner Ort']);
  const first = decoded[0]; assert.equal(first.category, 'place'); assert.equal(first.minLevel, 1);
  assert(Math.abs(first.lon_rad - ((268.5 / 512 * 2 - 1) * Math.PI)) < 1e-14);
  assert(Math.abs(first.lat_rad - Math.atan(Math.sinh(Math.PI * (1 - 2 * 173.5 / 512)))) < 1e-14);
  const landmarks = fixture({ aerodrome_label: [point(8, { name: 'Frankfurt-Egelsbach' })],
    mountain_peak: [point(9, { name: 'Melibokus' })], water_name: [point(10, { name: 'Main' })],
    poi: [point(11, { class: 'place_of_worship', name: 'Stadtkirche' }), point(12, { class: 'restaurant', name: 'Lunch' })] });
  assert.deepEqual(decodeLandmarkTile(landmarks, { z: 12, x: 2146, y: 1390 }).map(item => item.name), ['Melibokus', 'Frankfurt-Egelsbach', 'Main', 'Stadtkirche']);
  const detailed = decodeLandmarkTile(landmarks, { z: 14, x: 8584, y: 5562 });
  assert.deepEqual(detailed.map(item => item.name), ['Stadtkirche', 'Lunch']); assert(detailed.every(item => item.minLevel === 3));
});

test('road labels use the actual length-weighted polyline midpoint, not a centroid or invented polygon position', () => {
  const bytes = fixture({ transportation_name: [{ id: 20, props: { ref: 'B 3' }, type: 2,
    // Move(1024,1024), line to(3072,1024), then(3072,3072): midpoint is its bend.
    geometry: [9, 2048, 2048, 18, 4096, 0, 0, 4096] },
    { id: 21, props: { name: 'Not a point/line' }, type: 3 }] });
  const decoded = decodeLandmarkTile(bytes, { z: 14, x: 8584, y: 5562 });
  assert.equal(decoded.length, 1); assert.equal(decoded[0].name, 'B 3'); assert.equal(decoded[0].category, 'road');
  assert(Math.abs(decoded[0].lon_rad - ((8584.75 / 16384 * 2 - 1) * Math.PI)) < 1e-14);
  assert(Math.abs(decoded[0].lat_rad - Math.atan(Math.sinh(Math.PI * (1 - 2 * 5562.25 / 16384)))) < 1e-14);
});

test('remote geometry and names are bounded before allocation; malformed, oversized and out-of-owner anchors cannot become labels', () => {
  const long = 'A'.repeat(200) + '\u0001';
  const names = decodeLandmarkTile(fixture({ place: [point(1, { class: 'city', name: long })] }), tile);
  assert.equal(names[0].name.length, 80); assert(Object.isFrozen(names) && Object.isFrozen(names[0]));
  assert.deepEqual(decodeLandmarkTile(fixture({ place: [point(1, { class: 'city', name: 'A'.repeat(513) })] }), tile), [],
    'oversized dictionary names are rejected before full-string normalization');
  const outside = fixture({ place: [{ ...point(1, { class: 'city', name: 'buffer' }), geometry: [9, 8192, 4096] }] });
  assert.deepEqual(decodeLandmarkTile(outside, tile), []);
  const tooManyPoints = fixture({ place: [{ ...point(1, { class: 'city', name: 'oversized' }), geometry: [3000 * 8 + 1] }] });
  assert.deepEqual(decodeLandmarkTile(tooManyPoints, tile), [], 'over-budget command is rejected before external geometry allocation');
  const badClose = fixture({ place: [{ ...point(1, { class: 'city', name: 'bad close' }), geometry: [9, 4096, 4096, 100000000 * 8 + 7] }] });
  assert.throws(() => decodeLandmarkTile(badClose, tile), /close/);
  for (const bytes of [new Uint8Array(), new Uint8Array(2 * 1024 * 1024 + 1), new Uint8Array([26, 255, 255, 255, 127])]) assert.throws(() => decodeLandmarkTile(bytes, tile));
  assert.throws(() => decodeLandmarkTile(fixture({ place: [] }), { z: 9, x: 512, y: 0 }));
});

test('source loads cumulative tiers, deduplicates source features and reuses current keys/cache without per-frame requests', async () => {
  const requests: string[] = [], updates: { items: readonly Landmark[]; status: string }[] = [];
  const source = createLandmarkSource({ onUpdate: (items, status) => updates.push({ items, status }), fetcher: async (input, init) => {
    requests.push(String(input)); assert(init?.signal); assert.equal(init?.redirect, 'error');
    const z = Number(String(input).split('/')[3]);
    return response(z === 9 ? fixture({ place: [point(1, { class: 'city', name: 'Town' }), point(1, { class: 'city', name: 'Town' })] }) : z === 12
      ? fixture({ aerodrome_label: [point(2, { name: 'Airport' })] }) : fixture({ poi: [point(3, { name: 'Named POI' })] }));
  } });
  source.update(lat, lon, 0); await flush(); assert.equal(requests.length, 0);
  source.update(lat, lon, 1); await flush(); assert.equal(requests.length, 9);
  assert.equal(updates.at(-1)!.status, 'ready'); assert.equal(updates.at(-1)!.items.length, 9,
    'within-tile duplicates merge while adjacent tile-local IDs stay distinct');
  assert.equal(new Set(updates.at(-1)!.items.map(item => item.id)).size, 9);
  source.update(lat, lon, 1); await flush(); assert.equal(requests.length, 9);
  source.update(lat, lon, 2); await flush(); assert.equal(requests.length, 18);
  assert.equal(updates.at(-1)!.items.filter(item => item.minLevel === 1).length, 9);
  assert.equal(updates.at(-1)!.items.filter(item => item.minLevel === 2).length, 9);
  source.update(lat, lon, 3); await flush(); assert.equal(requests.length, 27);
  assert.deepEqual([1, 2, 3].map(level => updates.at(-1)!.items.filter(item => item.minLevel === level).length), [9, 9, 9]);
  source.update(lat, lon, 1); await flush(); assert.equal(requests.length, 27, 'cached tier transitions do not refetch');
  assert.equal(updates.at(-1)!.items.length, 9); source.dispose(); assert.equal(source.getStats().cacheSize, 0);
});

test('source keeps four requests and 27 tiles bounded, aborts old generations/Off and cannot publish stale responses', async () => {
  const requests: { signal: AbortSignal; release: () => void }[] = [], updates: string[] = [];
  const bytes = fixture({ place: [point(1, { class: 'city', name: 'Old' })] });
  const source = createLandmarkSource({ onUpdate: (_, status) => updates.push(status), fetcher: async (_, init) => {
    await new Promise<void>(resolve => requests.push({ signal: init!.signal!, release: resolve })); return response(bytes);
  } });
  source.update(lat, lon, 3); assert.equal(requests.length, 4); assert.equal(source.getStats().queuedTiles, 23);
  source.update(lat + .05, lon + .05, 2); assert(requests.every(request => request.signal.aborted));
  assert.equal(source.getStats().activeRequests, 4, 'aborted requests retain their slots until settled');
  source.update(lat, lon, 0); assert.equal(updates.at(-1), 'off');
  const count = updates.length; requests.forEach(request => request.release()); await flush();
  assert.equal(updates.length, count); assert.equal(source.getStats().cacheSize, 0); assert.equal(source.getStats().activeRequests, 0);
  assert.equal(requests.length, 4, 'no waiting generation leaks traffic after Off');
  source.update(lat, lon, 1); assert.equal(requests.length, 8); source.dispose();
  const afterDispose = updates.length; requests.slice(4).forEach(request => request.release()); await flush();
  assert.equal(updates.length, afterDispose); assert.equal(source.getStats().queuedTiles, 0);
});

test('source retains valid partial items when other tiles fail; invalid coordinates and MIME/byte failures stay degraded', async () => {
  let calls = 0; const updates: { items: readonly Landmark[]; status: string }[] = [];
  const source = createLandmarkSource({ onUpdate: (items, status) => updates.push({ items, status }), fetcher: async () => {
    calls++; if (calls > 1) throw new Error('offline'); return response(fixture({ place: [point(1, { class: 'city', name: 'Valid partial' })] }));
  } });
  source.update(lat, lon, 1); await flush();
  assert.equal(updates.at(-1)!.status, 'degraded'); assert.equal(updates.at(-1)!.items[0].name, 'Valid partial');
  source.update(NaN, lon, 1); assert.equal(updates.at(-1)!.status, 'degraded'); assert.deepEqual(updates.at(-1)!.items, []);
  const previous = calls; source.update(Math.PI / 2, lon, 1); await flush(); assert.equal(calls, previous);
  source.dispose();
  for (const bad of [() => new Response('HTML', { headers: { 'content-type': 'text/html' } }),
    () => new Response('x', { headers: { 'content-type': 'application/x-protobuf', 'content-length': String(2 * 1024 * 1024 + 1) } }),
    () => response(new Uint8Array([26, 255, 255, 255, 127]))]) {
    let status = '';
    const failed = createLandmarkSource({ onUpdate: (_, value) => { status = value; }, fetcher: async () => bad() });
    failed.update(lat, lon, 1); await flush(); assert.equal(status, 'degraded'); assert.equal(failed.getStats().failedTiles, 9); failed.dispose();
  }
});

test('decoded tile LRU and selected candidate counts stay bounded across regions', async () => {
  const source = createLandmarkSource({ onUpdate() {}, fetcher: async () => response(fixture({ place: [point(1, { class: 'city', name: 'Town' })] })) });
  for (let i = 0; i < 12; i++) { source.update(lat, lon + i * .1, 1); await flush(); }
  assert.equal(source.getStats().cacheSize, 96); assert(source.getStats().candidates <= 1000);
  source.dispose();
  const dense = fixture({ place: Array.from({ length: 1005 }, (_, i) => point(i + 1, { class: 'city', name: `Place ${i}` })) });
  assert.equal(decodeLandmarkTile(dense, tile).length, 1000, 'source scan/selection is bounded for a dense tile');
  const crowded = createLandmarkSource({ onUpdate() {}, fetcher: async () => response(dense) });
  crowded.update(lat, lon, 1); await flush(); assert.equal(crowded.getStats().candidates, 1000);
  crowded.dispose();
});

test('candidate budget preserves nearby detailed names and a late important landmark instead of first-tile starvation', async () => {
  const center14 = { x: 8584, y: 5562 }, center12 = { x: 2146, y: 1390 };
  const farRoads = fixture({ transportation_name: Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1, props: { name: `Far road ${i}` }, type: 2, geometry: [9, 64, 64, 10, 64, 0],
  })) });
  const nearDetailed = fixture({
    transportation_name: [{ id: 2000, props: { name: 'Near road' }, type: 2, geometry: [9, 0, 6564, 10, 64, 0] }],
    poi: [{ id: 2001, props: { name: 'Near POI', class: 'cafe' }, geometry: [9, 32, 6564] }],
  });
  let releaseImportant!: () => void;
  const important = new Promise<void>(resolve => { releaseImportant = resolve; });
  const updates: { items: readonly Landmark[]; status: string }[] = [];
  const source = createLandmarkSource({ onUpdate: (items, status) => updates.push({ items, status }), fetcher: async input => {
    const [z, x, y] = String(input).replace('.pbf', '').split('/').slice(-3).map(Number);
    if (z === 12 && x === center12.x && y === center12.y) {
      await important; return response(fixture({ aerodrome_label: [point(10000, { name: 'Important airport' })] }));
    }
    if (z === 14 && x === center14.x && y === center14.y) return response(farRoads);
    if (z === 14 && x === center14.x + 1 && y === center14.y) return response(nearDetailed);
    return response(fixture({ place: [] }));
  } });
  source.update(lat, lon, 3); await flush();
  const before = updates.at(-1)!;
  assert.equal(before.items.length, 1000); assert.equal(before.status, 'loading');
  assert(before.items.some(item => item.name === 'Near road'));
  assert(before.items.some(item => item.name === 'Near POI'), 'ordinary POIs share detailed-road priority so distance can keep nearby objects');
  assert.deepEqual(before.items.slice(0, 2).map(item => item.name).sort(), ['Near POI', 'Near road']);
  releaseImportant(); await flush();
  const after = updates.at(-1)!;
  assert.equal(after.status, 'ready'); assert.equal(after.items.length, 1000);
  assert.equal(after.items[0].name, 'Important airport', 'late higher-priority source data can displace a far candidate');
  assert(after.items.some(item => item.name === 'Near road') && after.items.some(item => item.name === 'Near POI'));
  source.dispose();
});
