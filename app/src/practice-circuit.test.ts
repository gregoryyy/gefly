import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makePracticeCircuit, locateOnCircuit, type CircuitGuide } from './practice-circuit.ts';
import { EDFE_REFERENCE, EDFE_RUNWAYS, airportLocal, airportOffset } from './airport-geometry.ts';

const radians = ([lon, lat]: readonly number[]) => ({ lon_rad: lon * Math.PI / 180, lat_rad: lat * Math.PI / 180 });
const local = (coordinate: readonly number[]) => airportLocal(radians(coordinate));
const close = (actual: number, expected: number) => assert(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const length = (start: readonly number[], end: readonly number[]) => {
  const a = local(start), b = local(end); return Math.hypot(b.east_m - a.east_m, b.north_m - a.north_m);
};

test('R-TRAIN-5 generated circuit is closed, north-side and direction-consistent with five labelled finite degree segments', () => {
  for (const runway of ['08', '26'] as const) {
    const guide = makePracticeCircuit(runway);
    assert.equal(guide.direction, runway === '08' ? 'left' : 'right');
    assert.deepEqual(guide.legs.map(leg => leg.id), ['upwind', 'crosswind', 'downwind', 'base', 'final']);
    const vectors = guide.legs.map((leg, i) => {
      assert(leg.label); assert.deepEqual(leg.end, guide.legs[(i + 1) % 5].start);
      for (const coordinate of [leg.start, leg.end]) {
        assert(coordinate[0] > 8 && coordinate[0] < 9 && coordinate[1] > 49 && coordinate[1] < 51, 'MapLibre coordinates are longitude/latitude degrees');
        assert(coordinate[0] >= guide.bounds[0] && coordinate[0] <= guide.bounds[2]);
        assert(coordinate[1] >= guide.bounds[1] && coordinate[1] <= guide.bounds[3]);
      }
      const a = local(leg.start), b = local(leg.end);
      return { east: b.east_m - a.east_m, north: b.north_m - a.north_m };
    });
    for (let i = 0; i < 4; i++) {
      const a = vectors[i], b = vectors[i + 1], cross = a.east * b.north - a.north * b.east;
      assert(runway === '08' ? cross > 0 : cross < 0, 'each actual corner turns the selected way');
    }
    const crosswind = vectors[1]; assert(crosswind.north > 1800, 'lateral leg is on the north side for both runways');
    close(length(guide.legs[1].start, guide.legs[1].end), 1852);
    close(length(guide.legs[3].start, guide.legs[3].end), 1852);
    close(length(guide.legs[4].start, guide.legs[4].end), 1852);
  }
});

test('R-TRAIN-5 independent along-runway geometry includes displaced 26 threshold and extends past the physical departure end', () => {
  const h = 86 * Math.PI / 180;
  const along = (coordinate: readonly number[]) => { const p = local(coordinate); return p.east_m * Math.sin(h) + p.north_m * Math.cos(h); };
  const a = makePracticeCircuit('08'), b = makePracticeCircuit('26');
  close(along(a.legs[0].start), -700); close(along(a.legs[0].end), 700 + 1852);
  close(along(a.legs[4].start), -700 - 1852);
  close(along(b.legs[0].start), 466); close(along(b.legs[0].end), -700 - 1852);
  close(along(b.legs[4].start), 466 + 1852);
  close(length(a.legs[0].start, a.legs[0].end), 1400 + 1852);
  close(length(b.legs[0].start, b.legs[0].end), 1166 + 1852);
  for (const [guide, selected] of [[a, EDFE_RUNWAYS[0]], [b, EDFE_RUNWAYS[1]]] as const) {
    const threshold = radians(guide.legs[0].start);
    close(threshold.lat_rad, selected.lat_rad); close(threshold.lon_rad, selected.lon_rad);
  }
});

test('R-TRAIN-5 nearest classification uses finite segments and deterministic shared endpoints, not extended lines or progress', () => {
  for (const runway of ['08', '26'] as const) {
    const guide = makePracticeCircuit(runway);
    for (const leg of guide.legs) {
      const a = local(leg.start), b = local(leg.end);
      const midpoint = airportOffset(EDFE_REFERENCE, (a.east_m + b.east_m) / 2, (a.north_m + b.north_m) / 2);
      const nearest = locateOnCircuit(guide, midpoint)!;
      assert.equal(nearest.legId, leg.id); close(nearest.distance_m, 0);
    }
    const crosswindEnd = locateOnCircuit(guide, radians(guide.legs[1].end))!;
    assert.equal(crosswindEnd.legId, 'crosswind'); close(crosswindEnd.distance_m, 0);
    const a = local(guide.legs[0].start), b = local(guide.legs[0].end);
    const de = b.east_m - a.east_m, dn = b.north_m - a.north_m, norm = Math.hypot(de, dn);
    const beyond = airportOffset(EDFE_REFERENCE, b.east_m + de / norm * 100, b.north_m + dn / norm * 100);
    const endDistance = locateOnCircuit(guide, beyond)!;
    assert.equal(endDistance.legId, 'upwind'); close(endDistance.distance_m, 100);
  }
});

test('R-TRAIN-5 invalid coordinates/guides and points farther than 5 km remain unavailable', () => {
  const guide = makePracticeCircuit('26');
  for (const position of [{ lat_rad: NaN, lon_rad: 0 }, { lat_rad: Infinity, lon_rad: 0 },
    { lat_rad: Math.PI, lon_rad: 0 }, { lat_rad: 0, lon_rad: 4 }, { lat_rad: 0, lon_rad: 0 }]) {
    assert.equal(locateOnCircuit(guide, position), null);
  }
  const center = local(guide.legs[0].start);
  assert.equal(locateOnCircuit(guide, airportOffset(EDFE_REFERENCE, center.east_m, center.north_m - 6000)), null);
  const malformed = structuredClone(guide); malformed.legs[0].start[0] = NaN;
  assert.equal(locateOnCircuit(malformed, EDFE_REFERENCE), null);
  assert.equal(locateOnCircuit({ ...guide, legs: [] }, EDFE_REFERENCE), null);
  assert.equal(locateOnCircuit(null as unknown as CircuitGuide, EDFE_REFERENCE), null);
  assert.throws(() => makePracticeCircuit('09' as '08'), RangeError);
});

test('R-TRAIN-5 geometry/snapshots are deterministic and immutable without modifying aircraft or shared airport data', () => {
  const before = JSON.stringify(EDFE_RUNWAYS), guide = makePracticeCircuit('26');
  assert.deepEqual(makePracticeCircuit('26'), guide);
  assert(Object.isFrozen(guide)); assert(Object.isFrozen(guide.legs)); assert(Object.isFrozen(guide.bounds));
  assert(guide.legs.every(leg => Object.isFrozen(leg) && Object.isFrozen(leg.start) && Object.isFrozen(leg.end)));
  assert.throws(() => { guide.legs[0].start[0] = 100; }, TypeError);
  locateOnCircuit(guide, Object.freeze({ ...EDFE_REFERENCE }));
  assert.equal(JSON.stringify(EDFE_RUNWAYS), before);
});
