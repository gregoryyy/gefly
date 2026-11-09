import type { FlightState } from './types';

/** Compact, immutable WGS84 map history. Angles are radians; time is simulation seconds. */
export type MapTrackPoint = Readonly<Pick<FlightState, 'step' | 't_s' | 'lat_rad' | 'lon_rad'>>;

const MAX_POINTS = 8192;
const TAU = 2 * Math.PI;

interface Node {
  point: MapTrackPoint;
  previous: Node | null;
  next: Node | null;
  version: number;
  live: boolean;
  order: number;
}
interface Entry { node: Node; version: number; cost: number; order: number }

/** Shortest signed angular difference, including crossings at ±180°. */
function wrapRadians(value: number): number {
  return ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

/**
 * Squared local cross-track distance (radians²) from b to the a–c segment.
 * The local tangent approximation is only a simplification priority, not a
 * navigational distance or an accuracy guarantee.
 */
function deviation(a: MapTrackPoint, b: MapTrackPoint, c: MapTrackPoint): number {
  const scale = Math.cos(b.lat_rad);
  const ax = wrapRadians(a.lon_rad - b.lon_rad) * scale, ay = a.lat_rad - b.lat_rad;
  const cx = wrapRadians(c.lon_rad - b.lon_rad) * scale, cy = c.lat_rad - b.lat_rad;
  const dx = cx - ax, dy = cy - ay;
  const denominator = dx * dx + dy * dy;
  const position = denominator === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator));
  const x = ax + position * dx, y = ay + position * dy;
  return x * x + y * y;
}

/** A bounded ordered path whose least significant interior vertex is removed on overflow. */
class BoundedGeometry {
  readonly limit: number;
  first: Node | null = null;
  last: Node | null = null;
  count = 0;
  simplified = false;
  private heap: Entry[] = [];
  private sequence = 0;

  constructor(limit: number) { this.limit = limit; }

  private before(a: Entry, b: Entry): boolean {
    return a.cost < b.cost || a.cost === b.cost && a.order < b.order;
  }
  private push(entry: Entry): void {
    const heap = this.heap;
    let index = heap.length;
    heap.push(entry);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.before(entry, heap[parent])) break;
      heap[index] = heap[parent]; index = parent;
    }
    heap[index] = entry;
  }
  private pop(): Entry | undefined {
    const heap = this.heap, first = heap[0], last = heap.pop();
    if (!last || heap.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= heap.length) break;
      const right = left + 1, child = right < heap.length && this.before(heap[right], heap[left]) ? right : left;
      if (!this.before(heap[child], last)) break;
      heap[index] = heap[child]; index = child;
    }
    heap[index] = last;
    return first;
  }
  private update(node: Node | null): void {
    if (!node) return;
    node.version++;
    if (node.live && node.previous && node.next) this.push({
      node, version: node.version, cost: deviation(node.previous.point, node.point, node.next.point), order: node.order,
    });
  }
  private rebuild(): void {
    this.heap = [];
    for (let node = this.first; node; node = node.next) this.update(node);
  }
  append(point: MapTrackPoint): void {
    const node: Node = { point, previous: this.last, next: null, version: 0, live: true, order: this.sequence++ };
    if (this.last) this.last.next = node;
    else this.first = node;
    const previous = this.last;
    this.last = node; this.count++;
    this.update(previous);
    if (this.count > this.limit) {
      let entry: Entry | undefined;
      do { entry = this.pop(); } while (entry && (!entry.node.live || entry.node.version !== entry.version || !entry.node.previous || !entry.node.next));
      if (!entry) throw new Error('Map history simplification lost its interior vertex');
      const removed = entry.node, before = removed.previous!, after = removed.next!;
      before.next = after; after.previous = before; removed.live = false; removed.version++;
      this.count--; this.simplified = true;
      this.update(before); this.update(after);
    }
    // Lazy heap invalidation must not turn bounded history into unbounded memory.
    if (this.heap.length > this.limit * 4) this.rebuild();
  }
  truncateAfter(t_s: number): void {
    while (this.last && this.last.point.t_s > t_s) {
      const old = this.last;
      this.last = old.previous; old.live = false; old.version++;
      if (this.last) this.last.next = null;
      else this.first = null;
      this.count--;
    }
    this.rebuild();
  }
  points(): MapTrackPoint[] {
    const points: MapTrackPoint[] = [];
    for (let node = this.first; node; node = node.next) points.push(node.point);
    return points;
  }
}

/**
 * Session-only visual map track, separate from the bounded review recording.
 * Its geometrically simplified path retains departure and latest coordinates;
 * it is an approximation and is not navigation or flight-data evidence.
 */
export class MapFlightTrack {
  private readonly maxPoints: number;
  private history: BoundedGeometry;
  private sampled: BoundedGeometry | null = null;

  constructor(options: { maxPoints?: number } = {}) {
    const maxPoints = options.maxPoints ?? MAX_POINTS;
    if (!Number.isInteger(maxPoints) || maxPoints < 2 || maxPoints > MAX_POINTS) throw new RangeError(`maxPoints must be an integer from 2 to ${MAX_POINTS}`);
    this.maxPoints = maxPoints;
    this.history = new BoundedGeometry(maxPoints);
  }

  record(state: Readonly<FlightState>): boolean {
    if (!state || !Number.isInteger(state.step) || state.step < 0 || !Number.isFinite(state.t_s) || state.t_s < 0
      || !Number.isFinite(state.lat_rad) || Math.abs(state.lat_rad) > Math.PI / 2
      || !Number.isFinite(state.lon_rad) || Math.abs(state.lon_rad) > Math.PI) return false;
    const last = this.history.last?.point;
    if (last && (state.step <= last.step || state.t_s <= last.t_s)) return false;
    const point: MapTrackPoint = Object.freeze({ step: state.step, t_s: state.t_s, lat_rad: state.lat_rad, lon_rad: state.lon_rad });
    this.history.append(point); this.sampled?.append(point);
    return true;
  }

  clear(): void {
    this.history = new BoundedGeometry(this.maxPoints);
    this.sampled = null;
  }

  truncateAfter(t_s: number): void {
    if (!Number.isFinite(t_s) || t_s < 0) throw new RangeError('Branch time must be finite and nonnegative');
    this.history.truncateAfter(t_s);
    this.sampled?.truncateAfter(t_s);
  }

  sampledStates(max: number): readonly MapTrackPoint[] {
    if (!Number.isInteger(max) || max < 2 || max > MAX_POINTS) throw new RangeError(`max must be an integer from 2 to ${MAX_POINTS}`);
    if (max >= this.maxPoints) return this.history.points();
    if (!this.sampled || this.sampled.limit !== max) {
      this.sampled = new BoundedGeometry(max);
      for (const point of this.history.points()) this.sampled.append(point);
    }
    return this.sampled.points();
  }

  wasSimplified(): boolean { return this.history.simplified || !!this.sampled?.simplified; }
}
