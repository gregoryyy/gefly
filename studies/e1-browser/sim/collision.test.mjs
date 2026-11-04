import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VISUAL_AIRFRAME, EMPTY_COLLISION, groundCollisionContact, collisionRecord, collisionStateFields, contactOutcome } from './collision.js';

test('ordinary wheel-supported clearance is not a crash and shared visual dimensions are immutable', () => {
  assert.equal(groundCollisionContact(1.4, 0, 0, 0).mask, 0);
  assert.equal(groundCollisionContact(1.2, 0, 0, 0).mask, 0);
  assert.equal(groundCollisionContact(1.2, 0, .07, 0).mask, 0);
  assert(Object.isFrozen(VISUAL_AIRFRAME)); assert(Object.isFrozen(VISUAL_AIRFRAME.profile[0]));
  assert.equal(VISUAL_AIRFRAME.prop.radius, 1.05);
});

test('actual tail and wing structure contacts stop independently of wheel or proxy clearance', () => {
  for (const mask of [1, 2, 4, 7]) assert.equal(groundCollisionContact(3, .2, .1, mask).mask, mask);
  assert.equal(groundCollisionContact(3, -.5, .1, 2).mask, 2);
});

test('propeller, belly, steep nose and inverted fin use body-pose-dependent visual supports', () => {
  assert.equal(groundCollisionContact(1.04, 0, 0, 0).mask, 16);
  assert(groundCollisionContact(.5, 0, 0, 0).mask & 8);
  const nose = groundCollisionContact(2, 0, -Math.PI / 3, 0);
  assert(nose.mask & 16); assert(nose.clearance_m < 0);
  const inverted = groundCollisionContact(1.7, Math.PI, 0, 0);
  assert(inverted.mask & 32); assert.equal(inverted.mask & 8, 0);
  assert(groundCollisionContact(1.777, Math.PI, 0, 0).mask & 32,
    'conservative fin support includes the authored THREE miter beyond 1.775m');
  assert.equal(groundCollisionContact(5, Math.PI, 0, 0).mask, 0);
  for (const roll of [-.6, .6]) assert.equal(groundCollisionContact(3, roll, -.2, 0).mask, 0);
});

test('zero clearance contacts, CG fallback and unavailable older-engine inputs never imply wheel crashes', () => {
  assert(groundCollisionContact(1.05, 0, 0, 0).mask & 16);
  assert.equal(groundCollisionContact(0, NaN, 0, 0).mask, 64);
  assert.equal(groundCollisionContact(0, NaN, 0, 2).mask, 2);
  for (const [agl, mask] of [[undefined, undefined], [NaN, 0], [Infinity, 0], [1, undefined], [1, 8], [1, .5]]) {
    assert.deepEqual(groundCollisionContact(agl, 0, 0, mask), { available: false, mask: 0, clearance_m: null });
  }
  assert.deepEqual(groundCollisionContact(2, NaN, 0, 0), { available: true, mask: 0, clearance_m: null });
});

test('nose-vertical spinner ellipsoid reaches beyond the propeller plane without false level wheel contacts', () => {
  const spinner = groundCollisionContact(3.3, 0, -Math.PI / 2, 0);
  assert.equal(spinner.mask, 16);
  assert(Math.abs(spinner.clearance_m - (3.3 - 3.446)) < 1e-12);
  assert.equal(groundCollisionContact(1.2, 0, 0, 0).mask, 0);
  assert.equal(groundCollisionContact(1.04, 0, 0, 0).mask, 16);
});

test('first sampled contact keeps post-step identity and signed pre-step motion without synthesizing impact severity', () => {
  const before = Object.freeze({ ground_down_mps: -2, ground_forward_mps: -3, ground_side_mps: 4 });
  const first = collisionRecord(16, 4, 4 / 120, before);
  assert.deepEqual(first, { collision_mask: 16, collision_step: 4, collision_t_s: 4 / 120, collision_down_mps: -2, collision_groundspeed_mps: 5 });
  assert(Object.isFrozen(first)); assert.equal(EMPTY_COLLISION.collision_step, 0);
  // A fast descent can pass below the surface between fixed samples. The first
  // sampled penetration is caught; no exact crossing time/CCD is manufactured.
  const heights = [2, 1.5, .9, -.2];
  const hits = heights.map(height => groundCollisionContact(height, 0, 0, 0));
  const firstIndex = hits.findIndex(hit => hit.mask);
  assert.equal(firstIndex, 2); assert(hits[3].mask);
  assert.equal(groundCollisionContact(2, 0, 0, 0).mask, 0, 'ascending with clearance remains clear');
});

test('malformed or overflowing pre-step motion cannot become invented zero collision metadata', () => {
  for (const previous of [null, {}, { ground_down_mps: NaN, ground_forward_mps: 0, ground_side_mps: 0 },
    { ground_down_mps: 1, ground_forward_mps: Number.MAX_VALUE, ground_side_mps: Number.MAX_VALUE }]) assert.equal(collisionRecord(8, 1, .1, previous), null);
  for (const [mask, step, time] of [[0, 1, .1], [128, 1, .1], [8, 0, 0], [8, 1.5, .1], [8, 1, Infinity]]) {
    assert.equal(collisionRecord(mask, step, time, { ground_down_mps: 1, ground_forward_mps: 1, ground_side_mps: 0 }), null);
  }
});

test('local terrain grade moves proxy contact with actual heading without changing legacy flat clearance', () => {
  const flat = groundCollisionContact(1.2, 0, 0, 0);
  assert.equal(flat.mask, 0);
  assert(groundCollisionContact(1.2, 0, 0, 0, { north_slope: .2, east_slope: 0, heading_rad: 0 }).mask & 16);
  assert.equal(groundCollisionContact(1.2, 0, 0, 0, { north_slope: .2, east_slope: 0, heading_rad: Math.PI }).mask, 0);
  assert(groundCollisionContact(1.2, 0, 0, 0, { north_slope: 0, east_slope: .2, heading_rad: Math.PI / 2 }).mask & 16);
  const level = groundCollisionContact(1.2, 0, 0, 0, { north_slope: 0, east_slope: 0, heading_rad: .7 });
  assert.equal(level.clearance_m, flat.clearance_m);
});

test('F39: unavailable contact telemetry is omitted, never published as a definitive clear', () => {
  assert.deepEqual(collisionStateFields(true, false, EMPTY_COLLISION), {});
  assert.deepEqual(collisionStateFields(false, true, EMPTY_COLLISION), {}, 'disabled detection publishes no clear claim');
  assert.equal(collisionStateFields(true, true, EMPTY_COLLISION), EMPTY_COLLISION);
  const latched = collisionRecord(8, 3, .025, { ground_down_mps: 1, ground_forward_mps: 2, ground_side_mps: 0 });
  assert.equal(collisionStateFields(true, false, latched), latched, 'a latched record survives later unavailability');
  const missing = groundCollisionContact(1, 0, 0, undefined);
  assert.equal(contactOutcome(missing, null), 'unavailable');
  assert.deepEqual(collisionStateFields(true, missing.available, EMPTY_COLLISION), {});
});

test('F39: a detected contact without a valid record fails explicitly instead of being dropped', () => {
  const contact = groundCollisionContact(.5, 0, 0, 0);
  assert(contact.mask);
  assert.equal(contactOutcome(contact, collisionRecord(contact.mask, 2, .02, null)), 'fail');
  assert.equal(contactOutcome(contact, collisionRecord(contact.mask, 2, .02, { ground_down_mps: NaN, ground_forward_mps: 0, ground_side_mps: 0 })), 'fail');
  assert.equal(contactOutcome(contact, collisionRecord(contact.mask, 2, .02, { ground_down_mps: 2, ground_forward_mps: 0, ground_side_mps: 0 })), 'latch');
  assert.equal(contactOutcome(groundCollisionContact(3, 0, 0, 0), null), 'clear');
  const nativeOnly = groundCollisionContact(3, 0, 0, 2, { north_slope: NaN, east_slope: 0, heading_rad: 0 });
  assert.equal(nativeOnly.available, false); assert.equal(nativeOnly.mask, 2);
  assert.equal(contactOutcome(nativeOnly, null), 'fail', 'native structure contact with an unavailable proxy still counts');
});

test('near-rest wheel-supported prop proxy tolerates settling, not impacts or deeper strikes', () => {
  const supported = { ground_forward_mps: .7, ground_side_mps: 0, ground_down_mps: .05,
    gear_nose_wow: 1, gear_left_wow: 1, gear_right_wow: 1 };
  const contact = (motion, agl = 1.02, native = 0) => groundCollisionContact(agl, 0, 0, native, undefined, motion);
  assert.equal(contact(supported).mask, 0, '3 cm proxy overlap while settling is not a crash');
  assert(contact(supported).clearance_m < 0, 'raw geometric clearance remains truthful');
  assert(contact(supported, .99).mask & 16, '6 cm prop strike still counts');
  for (const change of [{ ground_forward_mps: 1.01 }, { ground_down_mps: .21 }, { ground_down_mps: -.21 },
    { gear_nose_wow: 0 }, { gear_left_wow: 0 }, { gear_right_wow: 0 }, { ground_forward_mps: NaN }]) {
    assert(contact({ ...supported, ...change }).mask & 16);
  }
  assert(contact(undefined).mask & 16, 'missing motion never hides contact');
  assert.equal(contact(supported, 1.02, 2).mask, 18, 'native wing contact remains authoritative');
  assert(contact(supported, .5).mask & 8, 'body collision is unchanged');
});


test('collision grace requires both strict pre-step speed limits and preserves raw contact masks', () => {
  const horizontal = 10 * 1852 / 3600, down = 2.5 * 1852 / 3600;
  const cases = [
    [horizontal - 1e-6, 0, down - 1e-6, 'clear'],
    [horizontal, 0, 0, 'latch'], [0, 0, down, 'latch'],
    [horizontal + 1, 0, 0, 'latch'], [0, 0, down + 1, 'latch'],
    [0, horizontal, 0, 'latch'], [3, 4, 0, 'clear'],
    [0, 0, -2, 'clear'],
  ];
  for (const mask of [1, 2, 4, 8, 16, 32, 64, 127]) {
    const contact = Object.freeze({ available: true, mask, clearance_m: -.1 });
    for (const [forward, side, vertical, expected] of cases) {
      const record = collisionRecord(mask, 1, 1 / 120, { ground_forward_mps: forward, ground_side_mps: side, ground_down_mps: vertical });
      assert.equal(contactOutcome(contact, record), expected, JSON.stringify({ mask, forward, side, vertical }));
      assert.equal(contact.mask, mask); assert.equal(record.collision_mask, mask);
    }
    assert.equal(contactOutcome(contact, null), 'fail', 'missing pre-step motion cannot become a safe zero');
  }
});
