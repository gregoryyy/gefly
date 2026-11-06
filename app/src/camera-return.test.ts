import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAMERA_RETURN_DURATION_MS, createCameraReturn, type CameraReturnPose } from './camera-return.ts';

const near = (actual: number, expected: number, tolerance = 1e-10) =>
  assert(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const degrees = (value: number) => value * Math.PI / 180;

test('R-VIEW-1 cockpit return reaches exact center in wall time without changing lens or adding a radius', () => {
  const from = { yaw_rad: 1, pitch_rad: -.5 }, to = { yaw_rad: 0, pitch_rad: 0 };
  const transition = createCameraReturn({ from, to, startedAt_ms: 100 });
  assert.deepEqual(transition.sample(0), { pose: from, done: false });
  assert.deepEqual(transition.sample(100), { pose: from, done: false });
  const middle = transition.sample(100 + CAMERA_RETURN_DURATION_MS / 2);
  near(middle.pose.yaw_rad, .5); near(middle.pose.pitch_rad, -.25);
  assert.equal(middle.done, false); assert.equal('distance_m' in middle.pose, false);
  assert.deepEqual(transition.sample(100 + CAMERA_RETURN_DURATION_MS), { pose: to, done: true });
  assert.deepEqual(transition.sample(1e9), { pose: to, done: true });
  assert.deepEqual(from, { yaw_rad: 1, pitch_rad: -.5 });
});

test('R-VIEW-1 return follows the short yaw arc across the circular boundary', () => {
  const transition = createCameraReturn({
    from: { yaw_rad: degrees(170), pitch_rad: 0 },
    to: { yaw_rad: degrees(-170), pitch_rad: 0 }, startedAt_ms: 0,
  });
  const midpoint = transition.sample(CAMERA_RETURN_DURATION_MS / 2);
  near(Math.abs(midpoint.pose.yaw_rad), Math.PI);
  near(midpoint.pose.pitch_rad, 0);
  assert.deepEqual(transition.sample(CAMERA_RETURN_DURATION_MS).pose,
    { yaw_rad: degrees(-170), pitch_rad: 0 });
});

test('R-VIEW-1 Earth-scale chase return remains positive and monotone with a geometric midpoint', () => {
  const from = { yaw_rad: Math.PI, pitch_rad: Math.PI / 2, distance_m: 20_000_000 };
  const to = { yaw_rad: 0, pitch_rad: 0, distance_m: Math.hypot(30, 11) };
  const transition = createCameraReturn({ from, to, startedAt_ms: 0 });
  let previous = from.distance_m;
  for (const time of [0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 700]) {
    const sample = transition.sample(time);
    assert(sample.pose.distance_m! <= previous && sample.pose.distance_m! >= to.distance_m);
    assert(Number.isFinite(sample.pose.distance_m));
    assert(sample.pose.pitch_rad >= 0 && sample.pose.pitch_rad <= from.pitch_rad);
    if (time === 350) near(sample.pose.distance_m!, Math.sqrt(from.distance_m * to.distance_m), 1e-8);
    previous = sample.pose.distance_m!;
  }
  assert.deepEqual(transition.sample(700), { pose: to, done: true });
});

test('R-INPUT-1 rendering frequency and backwards or invalid clocks cannot change the elapsed-time pose', () => {
  const options = { from: { yaw_rad: -.9, pitch_rad: .6 }, to: { yaw_rad: 0, pitch_rad: 0 }, startedAt_ms: 0 };
  const sparse = createCameraReturn(options), dense = createCameraReturn(options);
  for (let time = 0; time <= 350; time += 7) dense.sample(time);
  const midpoint = sparse.sample(350);
  assert.deepEqual(dense.sample(350), midpoint);
  for (const timestamp of [-10, 0, 300, NaN, Infinity, -Infinity]) assert.deepEqual(sparse.sample(timestamp), midpoint);
  assert.deepEqual(dense.sample(700), sparse.sample(700));
});

test('R-INPUT-1 cancellation freezes a detached displayed pose and a new return starts exactly there', () => {
  const target = { yaw_rad: 0, pitch_rad: 0, distance_m: 32 };
  const transition = createCameraReturn({
    from: { yaw_rad: .8, pitch_rad: .4, distance_m: 1000 }, to: target, startedAt_ms: 0,
  });
  const interrupted = transition.sample(200).pose;
  transition.cancel(); transition.cancel();
  assert.deepEqual(transition.sample(1e8), { pose: interrupted, done: true });
  const restarted = createCameraReturn({ from: interrupted, to: target, startedAt_ms: 200 });
  assert.deepEqual(restarted.sample(200), { pose: interrupted, done: false });
  interrupted.yaw_rad = 100; interrupted.distance_m = 1;
  const returned = restarted.sample(200); returned.pose.yaw_rad = 20;
  assert.notEqual(restarted.sample(200).pose.yaw_rad, 20);
  assert.deepEqual(restarted.sample(900), { pose: target, done: true });
});

test('R-VIEW-1 disabled animation can immediately select the exact target without later motion', () => {
  const to = { yaw_rad: 0, pitch_rad: 0 };
  const transition = createCameraReturn({ from: { yaw_rad: 1, pitch_rad: .3 }, to, startedAt_ms: 50, duration_ms: 0 });
  assert.deepEqual(transition.sample(NaN), { pose: to, done: true });
  assert.deepEqual(transition.sample(0), { pose: to, done: true });
});

test('R-VIEW-1 invalid camera poses, incompatible radii and timing are rejected atomically', () => {
  const valid = { yaw_rad: 0, pitch_rad: 0 };
  const invalid: CameraReturnPose[] = [
    { yaw_rad: NaN, pitch_rad: 0 }, { yaw_rad: Infinity, pitch_rad: 0 },
    { yaw_rad: 0, pitch_rad: -Infinity }, { yaw_rad: 0, pitch_rad: Math.PI },
    ...[0, -1, NaN, Infinity].map(distance_m => ({ ...valid, distance_m })),
  ];
  for (const pose of invalid) {
    assert.throws(() => createCameraReturn({ from: pose, to: valid, startedAt_ms: 0 }), RangeError);
    assert.throws(() => createCameraReturn({ from: valid, to: pose, startedAt_ms: 0 }), RangeError);
  }
  assert.throws(() => createCameraReturn({ from: { ...valid, distance_m: 32 }, to: valid, startedAt_ms: 0 }), RangeError);
  for (const time of [NaN, Infinity, -Infinity]) {
    assert.throws(() => createCameraReturn({ from: valid, to: valid, startedAt_ms: time }), RangeError);
    assert.throws(() => createCameraReturn({ from: valid, to: valid, startedAt_ms: 0, duration_ms: time }), RangeError);
  }
  assert.throws(() => createCameraReturn({ from: valid, to: valid, startedAt_ms: 0, duration_ms: -1 }), RangeError);
});

test('R-VIEW-1 extreme finite radii remain within their positive endpoint interval', () => {
  for (const [fromDistance, toDistance] of [[Number.MAX_VALUE, Number.MIN_VALUE], [Number.MIN_VALUE, Number.MAX_VALUE]]) {
    const transition = createCameraReturn({
      from: { yaw_rad: 0, pitch_rad: 0, distance_m: fromDistance },
      to: { yaw_rad: 0, pitch_rad: 0, distance_m: toDistance }, startedAt_ms: 0,
    });
    for (const time of [1, 350, 699, 700]) {
      const distance = transition.sample(time).pose.distance_m!;
      assert(Number.isFinite(distance) && distance >= Number.MIN_VALUE && distance <= Number.MAX_VALUE);
    }
  }
});
