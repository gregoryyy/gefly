import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlightPlanStore, planLegs, planPoints, pointNavigation } from './map-flight-plan.ts';
import type { FlightPlanSnapshot, PlannerPoint, PlanResult } from './map-flight-plan-types.ts';

const point = (id: string, lat_deg = 50, lon_deg = 8): PlannerPoint => ({ id, name: `${id} name`, kind: 'airport',
  lat_deg, lon_deg, source_label: 'Pinned source · 2013.10' });
const home = point('HOME'), east = point('EAST', 50, 9), north = point('NORTH', 51, 8);
function value<T>(result: PlanResult<T>): T { assert(result.ok, result.ok ? '' : result.error); return result.value; }
const close = (actual: number | null, expected: number, tolerance = 1e-9) => assert(actual !== null && Math.abs(actual - expected) < tolerance, `${actual} versus ${expected}`);
function fixture() {
  const changes: FlightPlanSnapshot[] = [];
  const store = createFlightPlanStore(snapshot => changes.push(snapshot));
  return { store, changes };
}
function complete() {
  const result = fixture();
  value(result.store.setPoint('start', home)); value(result.store.setPoint('waypoint', east)); value(result.store.setPoint('destination', north));
  return result;
}

test('R-NAV-5 true courses, nautical distance and signed heading errors have independent cardinal fixtures', () => {
  // A one-degree meridian arc on the declared mean-radius sphere is 111.195 km.
  const northward = pointNavigation({ lat_deg: 0, lon_deg: 0, heading_true_deg: 350 }, { lat_deg: 1, lon_deg: 0 })!;
  close(northward.bearing_true_deg, 0); close(northward.heading_error_deg, 10); close(northward.distance_nm, 60.04046, .00001);
  close(pointNavigation({ lat_deg: 1, lon_deg: 0 }, { lat_deg: 0, lon_deg: 0 })!.bearing_true_deg, 180);
  close(pointNavigation({ lat_deg: 0, lon_deg: 0, heading_true_deg: 100 }, { lat_deg: 0, lon_deg: 1 })!.heading_error_deg, -10);
  close(pointNavigation({ lat_deg: 0, lon_deg: 0 }, { lat_deg: 0, lon_deg: 1 })!.bearing_true_deg, 90);
  close(pointNavigation({ lat_deg: 0, lon_deg: 0 }, { lat_deg: 0, lon_deg: -1 })!.bearing_true_deg, 270);
  close(pointNavigation({ lat_deg: 0, lon_deg: 0, heading_true_deg: 180 }, { lat_deg: 1, lon_deg: 0 })!.heading_error_deg, -180);
  close(pointNavigation({ lat_deg: 0, lon_deg: 0, heading_true_deg: -10 }, { lat_deg: 1, lon_deg: 0 })!.heading_error_deg, 10);
});

test('R-NAV-5 coincident, unavailable and ambiguous geometry never invents bearing or heading', () => {
  assert.deepEqual(pointNavigation({ lat_deg: 50, lon_deg: 8, heading_true_deg: 20 }, home), {
    bearing_true_deg: null, distance_nm: 0, heading_error_deg: null,
  });
  assert.equal(pointNavigation({ lat_deg: 50, lon_deg: 8 }, east)!.heading_error_deg, null);
  assert.equal(pointNavigation({ lat_deg: 50, lon_deg: 8, heading_true_deg: NaN }, east)!.heading_error_deg, null);
  assert.equal(pointNavigation({ lat_deg: 50, lon_deg: 8, heading_true_deg: null as unknown as number }, east)!.heading_error_deg, null);
  assert.equal(pointNavigation({ lat_deg: 0, lon_deg: 0 }, { lat_deg: 0, lon_deg: 180 })!.bearing_true_deg, null);
  assert.deepEqual(pointNavigation({ lat_deg: 90, lon_deg: 0 }, { lat_deg: 90, lon_deg: 80 }), {
    bearing_true_deg: null, distance_nm: 0, heading_error_deg: null,
  });
  for (const origin of [{ lat_deg: NaN, lon_deg: 8 }, { lat_deg: Infinity, lon_deg: 8 }, { lat_deg: 91, lon_deg: 8 }, { lat_deg: 50, lon_deg: -181 }])
    assert.equal(pointNavigation(origin, home), null);
  assert.equal(pointNavigation(home, { lat_deg: 50, lon_deg: Infinity }), null);
});

test('R-NAV-5 named custom fixes have bounded WGS84 coordinates, stable IDs and explicit provenance', () => {
  const { store, changes } = fixture(); assert.equal(changes.length, 0);
  assert.equal(store.createFix('bad\nname', 50, 8).ok, false);
  const first = value(store.createFix('  Home GPS  ', 47, 6));
  assert.equal(first.id, 'USER-0001'); assert.equal(first.name, 'Home GPS'); assert.equal(first.custom, true);
  assert.match(first.source_label, /User-defined.*current session/);
  assert.equal(value(store.createFix('Home GPS', 51.75, 14)).id, 'USER-0002', 'duplicate names retain distinct identities');
  value(store.removeFix(first.id));
  assert.equal(value(store.createFix('New', 50, 8)).id, 'USER-0003', 'deleted IDs are not reused');
  const before = store.getSnapshot(), count = changes.length;
  for (const name of ['x'.repeat(41), '\0GPS', 'GPS\t', 'GPS\u0085']) assert.equal(store.createFix(name, 50, 8).ok, false);
  for (const [lat, lon] of [[-90.001, 8], [90.001, 8], [50, -180.001], [50, 180.001], [NaN, 8], [50, Infinity]])
    assert.equal(store.createFix('GPS', lat, lon).ok, false);
  assert.equal(store.removeFix('unknown').ok, false); assert.equal(store.getSnapshot(), before); assert.equal(changes.length, count);
});

test('R-NAV-5 anonymous GPS fixes use distinct stable generated labels without losing provenance', () => {
  const { store, changes } = fixture();
  const first = value(store.createFix('', 50, 8)), second = value(store.createFix(' '.repeat(80), 50.5, 8.5));
  assert.equal(first.id, 'USER-0001'); assert.equal(first.name, first.id); assert.equal(first.anonymous, true);
  assert.equal(second.id, 'USER-0002'); assert.equal(second.name, second.id); assert.equal(second.anonymous, true);
  assert.notEqual(first.name, second.name); assert.equal(first.source_label, second.source_label);
  assert.match(first.source_label, /User-defined.*current session/);
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.fixes[0].anonymous, true); assert.equal(snapshot.fixes[1].anonymous, true);
  assert.equal(changes.at(-1), snapshot); assert(Object.isFrozen(snapshot.fixes[0]));
  const named = value(store.createFix('  Chosen name  ', 49, 9));
  assert.equal(named.name, 'Chosen name'); assert.equal(named.anonymous, undefined);
  assert.equal(named.source_label, first.source_label);
  value(store.removeFix(second.id));
  const replacement = value(store.createFix('  ', 49, 8));
  assert.equal(replacement.id, 'USER-0004'); assert.equal(replacement.name, replacement.id);
});

test('R-NAV-5 anonymous name validation remains atomic and reusing a generated fix preserves route identity', () => {
  const { store, changes } = complete(); value(store.activateLeg(0));
  const before = store.getSnapshot(), count = changes.length;
  for (const invalid of [null, undefined, 12, {}, '\t', '\n', '\u0085', 'x'.repeat(41), ` ${'x'.repeat(41)} `])
    assert.equal(store.createFix(invalid as string, 50, 8).ok, false);
  assert.equal(store.getSnapshot(), before); assert.equal(changes.length, count);
  const anonymous = value(store.createFix('', 49.5, 8.5));
  assert.equal(anonymous.id, 'USER-0001', 'failed anonymous/name attempts do not consume identity');
  assert.equal(store.getSnapshot().activeLegIndex, 0, 'new anonymous library entry does not change active navigation');
  value(store.setPoint('waypoint', anonymous));
  assert.equal(store.getSnapshot().activeLegIndex, null, 'adding the anonymous point to the route is still an edit');
  const accepted = store.getSnapshot().waypoints.at(-1)!;
  assert.equal(accepted.id, anonymous.id); assert.equal(accepted.name, anonymous.id);
  assert.equal(accepted.lon_deg, anonymous.lon_deg); assert.equal(accepted.lat_deg, anonymous.lat_deg);
  assert.equal(accepted.source_label, anonymous.source_label); assert.equal(store.removeFix(anonymous.id).ok, false);
  store.clearPlan(); assert.equal(store.getSnapshot().fixes[0].anonymous, true, 'clearing the route retains anonymous library provenance');
});

test('R-NAV-5 64-fix cap rejects overflow atomically without consuming an identity', () => {
  const { store, changes } = fixture();
  for (let i = 0; i < 64; i++) value(store.createFix(`Fix ${i}`, 50, 8));
  assert.equal(changes.length, 64); assert.equal(store.getSnapshot().fixes.length, 64);
  const before = store.getSnapshot(); assert.equal(store.createFix('Overflow', 50, 8).ok, false);
  assert.deepEqual(store.getSnapshot(), before); assert.equal(changes.length, 64);
  value(store.removeFix('USER-0001')); assert.equal(value(store.createFix('Replacement', 50, 8)).id, 'USER-0065');
});

test('R-NAV-5 snapshots, returned fixes and callback values cannot mutate live planning state', () => {
  const { store, changes } = fixture();
  const fix = value(store.createFix('GPS', 50, 8)), input = { ...point('MUTABLE') };
  value(store.setPoint('start', input)); value(store.setPoint('waypoint', fix)); value(store.setPoint('destination', east));
  input.lat_deg = 47; // caller-owned data remains independent of accepted snapshot.
  const first = store.getSnapshot(), second = store.getSnapshot();
  assert.equal(first, second, 'unchanged state retains its immutable snapshot identity');
  assert.notEqual(first.start, input); assert.notEqual(first.fixes[0], fix, 'accepted values are copied into the immutable snapshot');
  assert.equal(first.start!.lat_deg, 50);
  for (const item of [first, first.fixes, first.fixes[0], first.start, first.waypoints, first.waypoints[0], first.destination, fix, ...changes])
    assert(Object.isFrozen(item));
  assert.throws(() => { (first.waypoints as PlannerPoint[]).push(home); }, TypeError);
  assert.throws(() => { (fix as { name: string }).name = 'Changed'; }, TypeError);
  assert.throws(() => { (first.start as { lon_deg: number }).lon_deg = 99; }, TypeError);
  assert.equal(store.getSnapshot().fixes[0].name, 'GPS');
  value(store.setPoint('destination', north));
  assert.notEqual(store.getSnapshot(), first); assert.equal(first.destination!.id, 'EAST');
  assert.equal(changes.at(-1), store.getSnapshot(), 'callbacks receive the current cached immutable snapshot');
});

test('R-NAV-5 draft order and complete legs preserve repeated published identifiers and source coordinates', () => {
  const { store } = fixture(), duplicateA = point('DUP', 50, 8.5), duplicateB = { ...point('DUP', 50.5, 9), source_label: 'Other historical source' };
  value(store.setPoint('waypoint', duplicateA)); assert.deepEqual(planPoints(store.getSnapshot()).map(p => p.id), ['DUP']);
  assert.deepEqual(planLegs(store.getSnapshot()), []); assert.equal(store.activateLeg(0).ok, false);
  value(store.setPoint('start', home)); value(store.setPoint('waypoint', duplicateB)); value(store.setPoint('destination', home));
  const points = planPoints(store.getSnapshot()), legs = planLegs(store.getSnapshot());
  assert.deepEqual(points.map(p => [p.id, p.lon_deg]), [['HOME', 8], ['DUP', 8.5], ['DUP', 9], ['HOME', 8]]);
  assert.equal(points[2].source_label, 'Other historical source'); assert.equal(legs.length, 3);
  assert.deepEqual(legs.map(leg => leg.index), [0, 1, 2]); assert.equal(legs[2].to.id, 'HOME');
  assert(legs.every(leg => leg.distance_nm > 0 && leg.course_true_deg !== null));
  assert(Object.isFrozen(points) && Object.isFrozen(points[0]) && Object.isFrozen(legs) && Object.isFrozen(legs[0]));
  value(store.activateLeg(2)); assert.equal(store.getSnapshot().activeLegIndex, 2, 'out-and-back route is valid');
});

test('R-NAV-5 waypoint edits reorder/remove exact snapshots, stop active legs and retain failed-edit state', () => {
  const { store, changes } = complete(); value(store.setPoint('waypoint', point('THIRD', 49, 9)));
  value(store.activateLeg(0)); value(store.moveWaypoint(1, -1));
  assert.deepEqual(store.getSnapshot().waypoints.map(p => p.id), ['THIRD', 'EAST']); assert.equal(store.getSnapshot().activeLegIndex, null);
  value(store.activateLeg(1));
  const before = store.getSnapshot(), count = changes.length;
  for (const [index, direction] of [[0, -1], [1, 1], [-1, 1], [.5, 1], [0, 0], [NaN, 1]])
    assert.equal(store.moveWaypoint(index, direction as -1 | 1).ok, false);
  assert.equal(store.removeWaypoint(2).ok, false); assert.equal(store.removeWaypoint(-1).ok, false);
  assert.equal(store.getSnapshot(), before); assert.equal(changes.length, count);
  value(store.removeWaypoint(0)); assert.equal(store.getSnapshot().activeLegIndex, null); assert.deepEqual(store.getSnapshot().waypoints.map(p => p.id), ['EAST']);
  value(store.activateLeg(0)); value(store.setPoint('destination', point('NEW', 49, 8))); assert.equal(store.getSnapshot().activeLegIndex, null);
});

test('R-NAV-5 plan limits and malformed point failures preserve an active route atomically', () => {
  const { store, changes } = complete();
  for (let i = 1; i < 30; i++) value(store.setPoint('waypoint', point(`W${i}`, 49 + i / 100, 8)));
  value(store.activateLeg(0)); const before = store.getSnapshot(), count = changes.length;
  assert.equal(planPoints(before).length, 32); assert.equal(store.setPoint('waypoint', east).ok, false);
  for (const invalid of [{ ...home, lat_deg: 90.001 }, { ...home, lon_deg: NaN }, { ...home, id: '' }, { ...home, name: 'Bad\nlabel' },
    { ...home, source_label: '' }, { ...home, kind: '' }]) assert.equal(store.setPoint('destination', invalid).ok, false);
  assert.equal(store.setPoint('bogus' as 'start', home).ok, false);
  assert.equal(store.getSnapshot(), before); assert.equal(changes.length, count);
});

test('R-NAV-5 incomplete and zero-length plans cannot activate any leg', () => {
  const { store, changes } = fixture();
  assert.equal(store.activateLeg(0).ok, false); value(store.setPoint('start', home)); value(store.setPoint('destination', home));
  assert.equal(store.activateLeg(0).ok, false);
  value(store.setPoint('waypoint', east)); value(store.setPoint('waypoint', east));
  const before = store.getSnapshot(), count = changes.length;
  assert.equal(store.activateLeg(0).ok, false, 'a nonzero first leg does not hide a zero-length later leg');
  assert.equal(store.activateLeg(2).ok, false); assert.equal(store.activateLeg(NaN).ok, false);
  assert.deepEqual(store.getSnapshot(), before); assert.equal(changes.length, count);
});

test('R-NAV-5 explicit leg selection, next and stop never alter the draft route', () => {
  const { store, changes } = complete();
  const draft = planPoints(store.getSnapshot());
  assert.equal(store.nextLeg().ok, false); value(store.activateLeg(0)); value(store.nextLeg());
  assert.equal(store.getSnapshot().activeLegIndex, 1); value(store.nextLeg()); assert.equal(store.getSnapshot().activeLegIndex, null);
  assert.deepEqual(planPoints(store.getSnapshot()), draft);
  value(store.activateLeg(1)); store.stopNavigation(); assert.equal(store.getSnapshot().activeLegIndex, null);
  const count = changes.length; store.stopNavigation(); assert.equal(changes.length, count, 'already stopped is inert');
});

test('R-NAV-5 library edits preserve active navigation and plan references prevent custom-fix deletion', () => {
  const { store } = complete(); value(store.activateLeg(0));
  const unrelated = value(store.createFix('Unrelated', 49, 7)); assert.equal(store.getSnapshot().activeLegIndex, 0);
  value(store.removeFix(unrelated.id)); assert.equal(store.getSnapshot().activeLegIndex, 0);
  const used = value(store.createFix('Used', 49, 8)); value(store.setPoint('waypoint', used)); value(store.activateLeg(0));
  const before = store.getSnapshot(); assert.equal(store.removeFix(used.id).ok, false); assert.deepEqual(store.getSnapshot(), before);
  store.clearPlan(); assert.deepEqual(store.getSnapshot(), { fixes: [used], start: null, waypoints: [], destination: null, activeLegIndex: null });
  value(store.removeFix(used.id)); assert.equal(store.getSnapshot().fixes.length, 0);
});

test('R-NAV-5 HTML-looking names remain inert model text with custom identity', () => {
  const { store } = fixture(); const fix = value(store.createFix('<img src=x onerror=alert(1)>', 50, 8));
  assert.equal(fix.name, '<img src=x onerror=alert(1)>'); assert.equal(fix.kind, 'fix');
  value(store.setPoint('start', fix)); assert.equal(store.getSnapshot().start!.name, fix.name);
});

test('R-NAV-5 creating a map waypoint atomically publishes one anonymous fix and ordered route edit', () => {
  const { store, changes } = complete(); value(store.activateLeg(0));
  const before = store.getSnapshot(), count = changes.length;
  const fix = value(store.createWaypoint(49, 7));
  assert.equal(fix.id, 'USER-0001'); assert.equal(fix.name, fix.id); assert.equal(fix.anonymous, true);
  assert(Object.isFrozen(fix)); assert.equal(changes.length, count + 1, 'one combined edit notifies once');
  const after = store.getSnapshot(); assert.equal(changes.at(-1), after);
  assert.equal(after.start!.id, before.start!.id); assert.equal(after.destination!.id, before.destination!.id);
  assert.deepEqual(after.waypoints.map(point => point.id), ['EAST', fix.id]);
  assert.deepEqual(after.fixes, [fix]); assert.equal(after.activeLegIndex, null);
  assert.equal(after.waypoints[1].source_label, fix.source_label); assert.equal(after.waypoints[1].lat_deg, 49); assert.equal(after.waypoints[1].lon_deg, 7);
  assert.equal(store.removeFix(fix.id).ok, false, 'new map waypoint is already protected by its route reference');
  const duplicate = value(store.createWaypoint(49, 7));
  assert.equal(duplicate.id, 'USER-0002'); assert.notEqual(duplicate.id, fix.id, 'each successful map gesture retains its own identity');
});

test('R-NAV-5 map waypoint failures leave no orphan, callback, consumed ID or changed navigation', () => {
  const { store, changes } = complete();
  for (let i = 1; i < 30; i++) value(store.setPoint('waypoint', point(`W${i}`, 49 + i / 100, 7)));
  value(store.activateLeg(0)); const full = store.getSnapshot(), count = changes.length;
  assert.equal(store.createWaypoint(49, 7).ok, false);
  assert.equal(store.getSnapshot(), full); assert.equal(changes.length, count); assert.equal(full.fixes.length, 0);
  value(store.removeWaypoint(0));
  for (const [lat, lon] of [[NaN, 8], [50, Infinity], [-90.01, 8], [90.01, 8], [50, -180.01], [50, 180.01]]) {
    value(store.activateLeg(0)); const before = store.getSnapshot(), callbacks = changes.length;
    assert.equal(store.createWaypoint(lat, lon).ok, false); assert.equal(store.getSnapshot(), before); assert.equal(changes.length, callbacks);
  }
  assert.equal(value(store.createWaypoint(49, 7)).id, 'USER-0001', 'rejected combined edits do not consume a fix identity');
});

test('R-NAV-5 custom-fix capacity prevents partial route edits and named/anonymous IDs remain shared', () => {
  const { store, changes } = complete();
  for (let i = 0; i < 64; i++) value(store.createFix(`Named ${i}`, 49, 7));
  value(store.activateLeg(0)); const before = store.getSnapshot(), count = changes.length;
  assert.equal(store.createWaypoint(49, 7).ok, false); assert.equal(store.getSnapshot(), before); assert.equal(changes.length, count);
  assert.deepEqual(before.waypoints.map(point => point.id), ['EAST']);
  value(store.removeFix('USER-0001')); assert.equal(store.getSnapshot().activeLegIndex, 0);
  assert.equal(value(store.createWaypoint(49, 7)).id, 'USER-0065'); assert.equal(store.getSnapshot().activeLegIndex, null);
  const draft = fixture(); const first = value(draft.store.createWaypoint(47, 6));
  assert.equal(first.anonymous, true); assert.deepEqual(planPoints(draft.store.getSnapshot()).map(point => point.id), [first.id]);
  assert.deepEqual(planLegs(draft.store.getSnapshot()), [], 'creating a waypoint does not invent either endpoint');
});


test('R-NAV-5 France and other worldwide fixes retain exact coordinates, identity and custom provenance', () => {
  const { store, changes } = fixture();
  const locations = [
    ['Paris', 48.8566, 2.3522], ['Brest', 48.3904, -4.4861], ['Marseille', 43.2965, 5.3698],
    ['New York', 40.7128, -74.006], ['Sydney', -33.8688, 151.2093], ['Cape Town', -33.9249, 18.4241],
    ['Tokyo', 35.6762, 139.6503],
  ] as const;
  for (const [index, [name, lat, lon]] of locations.entries()) {
    const fix = value(store.createFix(name, lat, lon));
    assert.equal(fix.id, `USER-${String(index + 1).padStart(4, '0')}`);
    assert.deepEqual([fix.name, fix.lat_deg, fix.lon_deg, fix.custom], [name, lat, lon, true]);
    assert.match(fix.source_label, /User-defined.*current session/);
  }
  assert.equal(changes.length, locations.length);
});

test('R-NAV-5 worldwide source points and an anonymous French waypoint form a usable ordered plan', () => {
  const { store } = fixture(), paris = point('PARIS', 48.8566, 2.3522), sydney = point('SYDNEY', -33.8688, 151.2093);
  value(store.setPoint('start', paris)); value(store.setPoint('destination', sydney));
  const brest = value(store.createWaypoint(48.3904, -4.4861));
  assert.equal(brest.anonymous, true); assert.equal(brest.name, brest.id);
  assert.deepEqual(planPoints(store.getSnapshot()).map(p => [p.id, p.lat_deg, p.lon_deg]), [
    ['PARIS', 48.8566, 2.3522], [brest.id, 48.3904, -4.4861], ['SYDNEY', -33.8688, 151.2093],
  ]);
  assert.equal(store.getSnapshot().start!.source_label, paris.source_label);
  assert.equal(store.getSnapshot().destination!.source_label, sydney.source_label);
  const legs = planLegs(store.getSnapshot()); assert.equal(legs.length, 2);
  assert(legs.every(leg => Number.isFinite(leg.distance_nm) && leg.distance_nm > 0 && leg.course_true_deg !== null));
  value(store.activateLeg(0)); value(store.nextLeg()); assert.equal(store.getSnapshot().activeLegIndex, 1);
});

test('R-NAV-5 exact WGS84 endpoints are valid planning coordinates independently of flight/display coverage', () => {
  const { store } = fixture();
  for (const lat of [-90, 90]) for (const lon of [-180, 180]) {
    const fix = value(store.createFix('', lat, lon));
    assert.deepEqual([fix.lat_deg, fix.lon_deg], [lat, lon]);
    value(store.setPoint('destination', fix));
    assert.deepEqual([store.getSnapshot().destination!.lat_deg, store.getSnapshot().destination!.lon_deg], [lat, lon]);
  }
  const zero = value(store.createFix('Origin', 0, 0)); assert.deepEqual([zero.lat_deg, zero.lon_deg], [0, 0]);
});

test('R-NAV-5 malformed worldwide fix, waypoint and source-point coordinates fail without state or ID mutation', () => {
  const { store, changes } = fixture();
  const paris = value(store.createFix('Paris', 48.8566, 2.3522));
  value(store.setPoint('start', paris)); value(store.setPoint('destination', point('BREST', 48.3904, -4.4861)));
  value(store.activateLeg(0)); const before = store.getSnapshot(), callbacks = changes.length;
  const invalid = [[NaN, 0], [Infinity, 0], [-Infinity, 0], [0, NaN], [0, Infinity],
    [-90.000001, 0], [90.000001, 0], [0, -180.000001], [0, 180.000001],
    ['48.8', 2], [48.8, '2'], [null, 2], [false, 2], [undefined, 2], [{}, 2], [[], 2]];
  for (const pair of invalid) {
    const [lat, lon] = pair as [number, number];
    assert.equal(store.createFix('Invalid', lat, lon).ok, false);
    assert.equal(store.createWaypoint(lat, lon).ok, false);
    assert.equal(store.setPoint('destination', { ...point('INVALID'), lat_deg: lat, lon_deg: lon }).ok, false);
    assert.equal(store.getSnapshot(), before); assert.equal(changes.length, callbacks);
  }
  const next = value(store.createFix('', -33.8688, 151.2093));
  assert.equal(next.id, 'USER-0002', 'all rejected paths leave the shared identity sequence untouched');
  assert.equal(store.getSnapshot().activeLegIndex, 0, 'library creation preserves active plan navigation');
});

test('R-NAV-5 date-line route geometry uses the short crossing and does not invent same-point bearings', () => {
  const eastbound = pointNavigation({ lat_deg: 0, lon_deg: 179, heading_true_deg: 80 }, { lat_deg: 0, lon_deg: -179 })!;
  close(eastbound.bearing_true_deg, 90); close(eastbound.heading_error_deg, 10);
  close(eastbound.distance_nm, 120.08092, .00001);
  const same = pointNavigation({ lat_deg: 0, lon_deg: 180 }, { lat_deg: 0, lon_deg: -180 })!;
  assert.equal(same.bearing_true_deg, null); close(same.distance_nm, 0);
  const { store } = fixture(); value(store.setPoint('start', point('WEST', 0, 179)));
  value(store.setPoint('destination', point('EAST', 0, -179))); value(store.activateLeg(0));
  close(planLegs(store.getSnapshot())[0].distance_nm, 120.08092, .00001);
});
