import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { distanceMeters, tilesWithinRadius } from './scenery-coverage.ts';

export type LandmarkLevel = 0 | 1 | 2 | 3;
export const LANDMARK_LEVEL_NAMES = Object.freeze(['Off', 'Places', 'Landmarks', 'Detailed'] as const);
export interface Landmark {
  id: string; name: string; lat_rad: number; lon_rad: number;
  category: 'place' | 'landmark' | 'road' | 'poi'; minLevel: 1 | 2 | 3; priority: number;
}
const MAX_BYTES = 2 * 1024 * 1024, MAX_SCANNED = 1000, MAX_SELECTED = 1000, MAX_POINTS = 2048, CACHE_LIMIT = 96;
// Finite nearest-first coverage; high-latitude circles can be truncated by these caps.
export const LANDMARK_RANGES_M = Object.freeze([0, 60000, 20000, 2000] as const);
const TILE_CAPS = [0, 16, 56, 18] as const, RETRY_MS = 30000, PLAN_MOVEMENT_M = 250;
const MERCATOR_LIMIT = Math.atan(Math.sinh(Math.PI));
const NOTABLE = new Set(['castle', 'museum', 'monument', 'attraction', 'viewpoint', 'tower', 'stadium', 'university', 'hospital', 'zoo', 'theme_park', 'airport',
  'place_of_worship', 'church', 'station', 'railway_station', 'water_tower', 'communications_tower']);
interface Tile { z: 9 | 12 | 14; x: number; y: number; key: string }
interface Field { number: number; wire: number; start: number; end: number }

function unsigned(bytes: Uint8Array, cursor: { pos: number }, end: number): number {
  let value = 0;
  for (let i = 0; i < 10; i++) {
    if (cursor.pos >= end) throw new Error('Truncated landmark protobuf');
    const byte = bytes[cursor.pos++]; value += (byte & 127) * 2 ** (7 * i);
    if (!(byte & 128)) return value;
  }
  throw new Error('Invalid landmark protobuf varint');
}
function* fields(bytes: Uint8Array, start: number, end: number, budget: { remaining: number }): Generator<Field> {
  const cursor = { pos: start };
  while (cursor.pos < end) {
    if (--budget.remaining < 0) throw new Error('Landmark protobuf field budget exceeded');
    const tag = unsigned(bytes, cursor, end), wire = tag % 8;
    if (!Number.isSafeInteger(tag) || tag < 8 || tag > 0xffffffff) throw new Error('Invalid landmark protobuf field');
    const number = Math.floor(tag / 8); let payload = cursor.pos;
    if (wire === 0) unsigned(bytes, cursor, end);
    else if (wire === 1) cursor.pos += 8;
    else if (wire === 5) cursor.pos += 4;
    else if (wire === 2) {
      const length = unsigned(bytes, cursor, end); payload = cursor.pos;
      if (!Number.isSafeInteger(length) || length < 0 || length > end - cursor.pos) throw new Error('Invalid landmark protobuf length');
      cursor.pos += length;
    } else throw new Error('Unsupported landmark protobuf wire type');
    if (cursor.pos > end) throw new Error('Truncated landmark protobuf field');
    yield { number, wire, start: payload, end: cursor.pos };
  }
}
/** Validate nested message bounds before the external decoder, and count source
 * geometry commands before loadGeometry allocates coordinate arrays. */
function geometryBudgets(bytes: Uint8Array): Map<string, readonly boolean[]> {
  const budget = { remaining: 100000 }, result = new Map<string, readonly boolean[]>();
  let layers = 0, featureCount = 0;
  for (const layerField of fields(bytes, 0, bytes.length, budget)) {
    if (layerField.number !== 3 || layerField.wire !== 2) continue;
    if (++layers > 64) throw new Error('Too many landmark layers');
    let name = ''; const features: Field[] = [];
    for (const field of fields(bytes, layerField.start, layerField.end, budget)) {
      if (field.number === 1 && field.wire === 2) {
        if (field.end - field.start > 80) throw new Error('Invalid landmark layer name');
        name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(field.start, field.end));
      } else if (field.number === 2 && field.wire === 2) {
        if (++featureCount > 32768) throw new Error('Too many source features');
        features.push(field);
      } else if (field.number === 4 && field.wire === 2) for (const _ of fields(bytes, field.start, field.end, budget)) { /* Bound scalar value messages too. */ }
    }
    if (result.has(name)) throw new Error('Duplicate landmark layer');
    const usable: boolean[] = [];
    for (const feature of features.slice(0, MAX_SCANNED)) {
      let geometry: Field | null = null;
      for (const field of fields(bytes, feature.start, feature.end, budget)) if (field.number === 4 && field.wire === 2) geometry = field;
      let points = 0, valid = geometry !== null;
      if (geometry) {
        const cursor = { pos: geometry.start };
        while (cursor.pos < geometry.end) {
          const command = unsigned(bytes, cursor, geometry.end), kind = command % 8, count = Math.floor(command / 8);
          if (!Number.isSafeInteger(command) || command > 0xffffffff || count < 1 || ![1, 2, 7].includes(kind)) throw new Error('Invalid landmark geometry command');
          if (kind === 7) { if (count !== 1) throw new Error('Invalid geometry close command'); points++; if (points > MAX_POINTS) valid = false; continue; }
          points += count;
          if (points > MAX_POINTS) { valid = false; break; }
          for (let i = 0; i < count * 2; i++) if (unsigned(bytes, cursor, geometry.end) > 0xffffffff) throw new Error('Invalid landmark coordinate delta');
        }
      }
      usable.push(valid);
    }
    result.set(name, usable);
  }
  return result;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length > 512) return '';
  return Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/gu, ' ').trim()).slice(0, 80).join('');
}
function featureName(properties: Record<string, unknown>, road: boolean): string {
  for (const key of ['name:de', 'name_de', 'name', ...(road ? ['ref'] : [])]) { const name = text(properties[key]); if (name) return name; }
  return '';
}
function classification(layer: string, properties: Record<string, unknown>, z: Tile['z']): Pick<Landmark, 'category' | 'minLevel' | 'priority'> | null {
  if (z === 9 && layer === 'place' && ['city', 'town', 'village'].includes(String(properties.class)))
    return { category: 'place', minLevel: 1, priority: properties.class === 'city' ? 100 : properties.class === 'town' ? 90 : 80 };
  if (z === 12 && ['mountain_peak', 'aerodrome_label', 'water_name'].includes(layer)) return { category: 'landmark', minLevel: 2, priority: layer === 'aerodrome_label' ? 75 : 70 };
  if (layer === 'poi' && z === 12 && (NOTABLE.has(String(properties.class)) || NOTABLE.has(String(properties.subclass)))) return { category: 'landmark', minLevel: 2, priority: 65 };
  if (layer === 'transportation_name' && z === 14) return { category: 'road', minLevel: 3, priority: 30 };
  if (layer === 'poi' && z === 14) return { category: 'poi', minLevel: 3, priority: 30 };
  return null;
}
function anchor(lines: readonly (readonly { x: number; y: number }[])[], point: boolean): { x: number; y: number } | null {
  if (point) return lines[0]?.[0] ?? null;
  let selected: readonly { x: number; y: number }[] | null = null, longest = 0;
  for (const line of lines) {
    let length = 0;
    for (let i = 1; i < line.length; i++) length += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
    if (length > longest) { longest = length; selected = line; }
  }
  if (!selected || !Number.isFinite(longest)) return null;
  let remaining = longest / 2;
  for (let i = 1; i < selected.length; i++) {
    const a = selected[i - 1], b = selected[i], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > 0 && remaining <= length) return { x: a.x + (b.x - a.x) * remaining / length, y: a.y + (b.y - a.y) * remaining / length };
    remaining -= length;
  }
  return null;
}

/** Decode bounded OpenMapTiles point / actual line-midpoint anchors. Polygons
 * and buffered anchors outside their owner tile never get invented centroids. */
export function decodeLandmarkTile(bytes: Uint8Array, tile: { z: 9 | 12 | 14; x: number; y: number }): readonly Landmark[] {
  if (!bytes.length || bytes.length > MAX_BYTES || ![9, 12, 14].includes(tile.z)
      || !Number.isInteger(tile.x) || !Number.isInteger(tile.y) || tile.x < 0 || tile.y < 0 || tile.x >= 2 ** tile.z || tile.y >= 2 ** tile.z) throw new Error('Invalid landmark tile');
  const usable = geometryBudgets(bytes), decoded = new VectorTile(new PbfReader(bytes)), items: Landmark[] = [];
  let scanned = 0;
  const layers = tile.z === 9 ? ['place'] : tile.z === 12 ? ['mountain_peak', 'aerodrome_label', 'water_name', 'poi'] : ['transportation_name', 'poi'];
  for (const name of layers) {
    const layer = decoded.layers[name]; if (!layer) continue;
    if (!Number.isFinite(layer.extent) || layer.extent <= 0 || layer.extent > 65536) throw new Error('Invalid landmark tile extent');
    for (let i = 0; i < layer.length && scanned < MAX_SCANNED && items.length < MAX_SELECTED; i++, scanned++) {
      if (!usable.get(name)?.[i]) continue;
      const feature = layer.feature(i);
      if (feature.type !== 1 && feature.type !== 2) continue;
      const type = classification(name, feature.properties, tile.z); if (!type) continue;
      const label = featureName(feature.properties, type.category === 'road'); if (!label) continue;
      const location = anchor(feature.loadGeometry(), feature.type === 1);
      if (!location || !Number.isFinite(location.x) || !Number.isFinite(location.y)
          || location.x < 0 || location.y < 0 || location.x >= layer.extent || location.y >= layer.extent) continue;
      const lon_rad = ((tile.x + location.x / layer.extent) / 2 ** tile.z * 2 - 1) * Math.PI;
      const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tile.y + location.y / layer.extent) / 2 ** tile.z)));
      if (!Number.isFinite(lon_rad) || !Number.isFinite(lat_rad)) continue;
      const sourceId = Number.isSafeInteger(feature.id) ? String(feature.id) : `${label}:${lat_rad.toFixed(7)}:${lon_rad.toFixed(7)}`;
      // MVT feature IDs are scoped to their tile/layer, not guaranteed global OSM
      // identities. Reused IDs elsewhere must not erase distinct places.
      items.push(Object.freeze({ id: `${name}:${tile.z}/${tile.x}/${tile.y}:${sourceId}`, name: label, lat_rad, lon_rad, ...type }));
    }
  }
  return Object.freeze(items);
}

function tilesAt(lat_rad: number, lon_rad: number, level: LandmarkLevel): Tile[] {
  const result: Tile[] = [];
  for (const [index, z] of ([9, 12, 14] as const).entries()) {
    const tier = (index + 1) as 1 | 2 | 3;
    if (tier > level) break;
    result.push(...tilesWithinRadius(lat_rad, lon_rad, z, LANDMARK_RANGES_M[tier], TILE_CAPS[tier]) as Tile[]);
  }
  return result;
}
async function tileBytes(response: Response, signal: AbortSignal): Promise<Uint8Array> {
  const mime = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase(), size = response.headers.get('content-length');
  if (!response.ok || !response.body || !['application/vnd.mapbox-vector-tile', 'application/x-protobuf', 'application/protobuf', 'application/octet-stream'].includes(mime ?? '')
      || size !== null && (!/^\d+$/.test(size) || Number(size) > MAX_BYTES)) throw new Error('Landmark tile unavailable or too large');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      signal.throwIfAborted(); const { done, value } = await reader.read(); if (done) break;
      length += value.length; if (length > MAX_BYTES) throw new Error('Landmark tile too large'); chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  signal.throwIfAborted(); const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** A bounded, latest-query lookup of mapped anchors, not a geocoder or an
 * assertion that a clicked object has a name. Adjacent tiles are not searched. */
export function createLandmarkLookup(options: { fetcher?: typeof fetch } = {}): {
  lookup(lat_rad: number, lon_rad: number, signal: AbortSignal): Promise<{ item: Landmark; distance_m: number } | null>;
  dispose(): void;
} {
  const fetcher = options.fetcher ?? fetch, cache = new Map<string, readonly Landmark[]>();
  const lifetime = new AbortController();
  let current: AbortController | null = null, active = 0;
  const queue: { run: () => void; signal: AbortSignal }[] = [];
  const pump = () => {
    while (active < 2 && queue.length) {
      const task = queue.shift()!;
      if (!task.signal.aborted) { active++; task.run(); }
    }
  };
  const load = async (tile: Tile, signal: AbortSignal): Promise<readonly Landmark[]> => {
    signal.throwIfAborted();
    const cached = cache.get(tile.key);
    if (cached) { cache.delete(tile.key); cache.set(tile.key, cached); return Promise.resolve(cached); }
    return new Promise((resolve, reject) => {
      const abort = () => { const index = queue.indexOf(task); if (index >= 0) queue.splice(index, 1); reject(signal.reason); };
      const task = { signal, run: () => {
        void (async () => {
          try {
            const response = await fetcher(`/scenery/landmarks/${tile.key}.pbf`, { signal, redirect: 'error', credentials: 'same-origin' });
            const items = decodeLandmarkTile(await tileBytes(response, signal), tile);
            signal.throwIfAborted();
            cache.delete(tile.key); cache.set(tile.key, items);
            while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
            resolve(items);
          } catch (error) { reject(error); }
          finally { signal.removeEventListener('abort', abort); active--; pump(); }
        })();
      } };
      signal.addEventListener('abort', abort, { once: true }); queue.push(task); pump();
    });
  };
  return {
    async lookup(lat_rad, lon_rad, signal) {
      current?.abort(); current = new AbortController();
      const querySignal = AbortSignal.any([signal, current.signal, lifetime.signal, AbortSignal.timeout(12000)]);
      querySignal.throwIfAborted();
      if (!Number.isFinite(lat_rad) || !Number.isFinite(lon_rad) || Math.abs(lat_rad) > MERCATOR_LIMIT || Math.abs(lon_rad) > Math.PI) return null;
      // tilesAt starts with the containing tile in each tier, even at pole rows.
      const tiles = tilesAt(lat_rad, lon_rad, 3);
      const containing = ([9, 12, 14] as const).map(z => tiles.find(tile => tile.z === z)!);
      const results = await Promise.allSettled(containing.map(tile => load(tile, querySignal)));
      querySignal.throwIfAborted();
      let nearest: { item: Landmark; distance_m: number } | null = null, failed = false;
      for (const result of results) {
        if (result.status === 'rejected') { failed = true; continue; }
        for (const item of result.value) {
          const h = Math.sin((item.lat_rad - lat_rad) / 2) ** 2
            + Math.cos(lat_rad) * Math.cos(item.lat_rad) * Math.sin((item.lon_rad - lon_rad) / 2) ** 2;
          const distance_m = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
          if (distance_m > (item.category === 'place' ? 10000 : 2000)) continue;
          if (!nearest || distance_m < nearest.distance_m || distance_m === nearest.distance_m && item.id < nearest.item.id) nearest = { item, distance_m };
        }
      }
      if (!nearest && failed) throw new Error('Mapped names unavailable; lookup was incomplete');
      return nearest;
    },
    dispose() { lifetime.abort(); current?.abort(); cache.clear(); },
  };
}

export function createLandmarkSource(options: {
  onUpdate: (items: readonly Landmark[], status: 'off' | 'loading' | 'ready' | 'degraded') => void; fetcher?: typeof fetch;
}): {
  update(lat_rad: number, lon_rad: number, level: LandmarkLevel): void; dispose(): void;
  getStats(): { loadedTiles: number; failedTiles: number; activeRequests: number; queuedTiles: number; cacheSize: number; candidates: number };
} {
  const fetcher = options.fetcher ?? fetch, cache = new Map<string, readonly Landmark[]>(), active = new Map<AbortController, number>();
  let desired: Tile[] = [], queue: Tile[] = [], failed = new Map<string, number>(), generation = 0, currentLevel: LandmarkLevel = 0;
  let center: { lat_rad: number; lon_rad: number } | null = null;
  let planCenter: { lat_rad: number; lon_rad: number } | null = null;
  let signature = '', disposed = false, loadedTiles = 0, failedTiles = 0, candidates = 0;
  const notify = (status: 'off' | 'loading' | 'ready' | 'degraded') => {
    if (disposed) return;
    const selected = new Map<string, Landmark>();
    if (currentLevel !== 0) for (const tile of desired) for (const item of cache.get(tile.key) ?? []) {
      if (item.minLevel > currentLevel) continue;
      const previous = selected.get(item.id);
      if (previous && previous.priority >= item.priority) continue;
      selected.set(item.id, item);
    }
    // At most 90 decoded tiles × 1000 items enter this selection. Rank the whole
    // bounded set before applying the display budget so arrival/tile order cannot
    // starve a nearby name or a later high-priority landmark. Haversine's term is
    // monotonic with great-circle distance, including across the antimeridian.
    const ranked = center ? [...selected.values()].map(item => ({ item, distanceRank:
      Math.sin((item.lat_rad - center!.lat_rad) / 2) ** 2
      + Math.cos(center!.lat_rad) * Math.cos(item.lat_rad) * Math.sin((item.lon_rad - center!.lon_rad) / 2) ** 2 })) : [];
    ranked.sort((a, b) => b.item.priority - a.item.priority || a.distanceRank - b.distanceRank || a.item.id.localeCompare(b.item.id));
    const items = Object.freeze(ranked.slice(0, MAX_SELECTED).map(({ item }) => item));
    candidates = items.length;
    try { options.onUpdate(items, status); } catch { /* UI code cannot fail the source queue. */ }
  };
  const progress = () => notify(failed.size ? 'degraded' : queue.length || [...active.values()].includes(generation) ? 'loading' : 'ready');
  function pump(): void {
    if (disposed || currentLevel === 0) return;
    while (active.size < 4 && queue.length) {
      const tile = queue.shift()!, epoch = generation, controller = new AbortController(); active.set(controller, epoch);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]);
      void (async () => {
        try {
          const response = await fetcher(`/scenery/landmarks/${tile.key}.pbf`, { signal, redirect: 'error', credentials: 'same-origin' });
          const bytes = await tileBytes(response, signal), items = decodeLandmarkTile(bytes, tile);
          if (disposed || signal.aborted || epoch !== generation) return;
          cache.delete(tile.key); cache.set(tile.key, items); loadedTiles++;
          while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
        } catch {
          if (!disposed && !controller.signal.aborted && epoch === generation) { failed.set(tile.key, Date.now() + RETRY_MS); failedTiles++; }
        } finally {
          active.delete(controller);
          if (!disposed) { pump(); if (epoch === generation) progress(); }
        }
      })();
    }
  }
  const cancel = () => { generation++; queue = []; for (const controller of active.keys()) controller.abort(); };
  notify('off');
  return {
    update(lat_rad, lon_rad, level) {
      if (disposed) return;
      const valid = Number.isInteger(level) && level >= 0 && level <= 3 && Number.isFinite(lat_rad) && Number.isFinite(lon_rad)
        && Math.abs(lat_rad) <= MERCATOR_LIMIT && Math.abs(lon_rad) <= Math.PI;
      center = valid ? { lat_rad, lon_rad } : null;
      // Animation updates keep the display center fresh without rebuilding or
      // cancelling an in-flight coverage plan for every small position change.
      if (valid && level !== 0 && currentLevel === level && planCenter
          && distanceMeters(planCenter.lat_rad, planCenter.lon_rad, lat_rad, lon_rad) < PLAN_MOVEMENT_M) {
        const now = Date.now(); let retry = false;
        for (const tile of desired) if ((failed.get(tile.key) ?? Infinity) <= now) {
          failed.delete(tile.key); queue.push(tile); retry = true;
        }
        if (retry) { progress(); pump(); }
        return;
      }
      planCenter = valid && level !== 0 ? { lat_rad, lon_rad } : null;
      const tiles = level === 0 || !valid ? [] : tilesAt(lat_rad, lon_rad, level);
      const nextSignature = level === 0 ? 'off' : !valid ? 'invalid' : `${level}:${tiles.map(tile => tile.key).join(',')}`;
      if (signature === nextSignature) { if (valid && level !== 0) progress(); return; }
      signature = nextSignature; cancel(); currentLevel = valid ? level : 0; desired = tiles; failed = new Map();
      if (level === 0) { notify('off'); return; }
      if (!valid) { notify('degraded'); return; }
      for (const tile of desired) {
        const cached = cache.get(tile.key);
        if (cached) { cache.delete(tile.key); cache.set(tile.key, cached); } else queue.push(tile);
      }
      progress(); pump();
    },
    dispose() { if (disposed) return; disposed = true; cancel(); cache.clear(); desired = []; center = null; planCenter = null; candidates = 0; },
    getStats: () => ({ loadedTiles, failedTiles, activeRequests: active.size, queuedTiles: queue.length, cacheSize: cache.size, candidates }),
  };
}
