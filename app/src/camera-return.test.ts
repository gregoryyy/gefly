import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAMERA_RETURN_DURATION_MS, CAMERA_RETURN_MAX_DURATION_MS, cameraReturnDuration_ms, createCameraReturn, type CameraReturnPose } from './camera-return.ts';

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
  const duration = cameraReturnDuration_ms(from, to);
  assert.equal(duration, 6000);
  let previous = from.distance_m;
  for (const fraction of [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1]) {
    const time = duration * fraction;
    const sample = transition.sample(time);
    assert(sample.pose.distance_m! <= previous && sample.pose.distance_m! >= to.distance_m);
    assert(Number.isFinite(sample.pose.distance_m));
    assert(sample.pose.pitch_rad >= 0 && sample.pose.pitch_rad <= from.pitch_rad);
    if (fraction === .5) near(sample.pose.distance_m!, Math.sqrt(from.distance_m * to.distance_m), 1e-8);
    previous = sample.pose.distance_m!;
  }
  assert.deepEqual(transition.sample(duration), { pose: to, done: true });
});

test('R-INPUT-1 rendering frequency and backwards or invalid clocks cannot change the elapsed-time pose', () => {
  for (const radii of [{}, { from: 20_000_000, to: Math.hypot(30, 11) }]) {
    const options = { from: { yaw_rad: -.9, pitch_rad: .6, ...(radii.from ? { distance_m: radii.from } : {}) },
      to: { yaw_rad: 0, pitch_rad: 0, ...(radii.to ? { distance_m: radii.to } : {}) }, startedAt_ms: 0 };
    const duration = cameraReturnDuration_ms(options.from, options.to), halfway = duration / 2;
    const sparse = createCameraReturn(options), dense = createCameraReturn(options);
    for (let step = 0; step <= 50; step++) dense.sample(halfway * step / 50);
    const midpoint = sparse.sample(halfway);
    assert.deepEqual(dense.sample(halfway), midpoint);
    for (const timestamp of [-10, 0, halfway - 1, NaN, Infinity, -Infinity]) assert.deepEqual(sparse.sample(timestamp), midpoint);
    assert.deepEqual(dense.sample(duration), sparse.sample(duration));
    assert.equal(sparse.sample(duration).done, true);
  }
});

test('R-INPUT-1 cancellation freezes a detached displayed pose and a new return starts exactly there', () => {
  const target = { yaw_rad: 0, pitch_rad: 0, distance_m: 32 };
  const transition = createCameraReturn({
    from: { yaw_rad: .8, pitch_rad: .4, distance_m: 20_000_000 }, to: target, startedAt_ms: 0,
  });
  const restartAt = 4500, interrupted = transition.sample(restartAt).pose;
  const remainingDuration = cameraReturnDuration_ms(interrupted, target);
  assert(remainingDuration > 700 && remainingDuration < 6000, 'restart timing follows the remaining visible radius');
  transition.cancel(); transition.cancel();
  assert.deepEqual(transition.sample(1e8), { pose: interrupted, done: true });
  const restarted = createCameraReturn({ from: interrupted, to: target, startedAt_ms: restartAt });
  assert.deepEqual(restarted.sample(restartAt), { pose: interrupted, done: false });
  interrupted.yaw_rad = 100; interrupted.distance_m = 1;
  const returned = restarted.sample(restartAt); returned.pose.yaw_rad = 20;
  assert.notEqual(restarted.sample(restartAt).pose.yaw_rad, 20);
  assert.equal(restarted.sample(restartAt + 700).done, false);
  assert.deepEqual(restarted.sample(restartAt + remainingDuration), { pose: target, done: true });
});

test('R-VIEW-1 disabled animation can immediately select the exact target without later motion', () => {
  for (const distance_m of [undefined, 20_000_000]) {
    const to = { yaw_rad: 0, pitch_rad: 0, ...(distance_m === undefined ? {} : { distance_m: Math.hypot(30, 11) }) };
    const from = { yaw_rad: 1, pitch_rad: .3, ...(distance_m === undefined ? {} : { distance_m }) };
    const transition = createCameraReturn({ from, to, startedAt_ms: 50, duration_ms: 0 });
    assert.deepEqual(transition.sample(NaN), { pose: to, done: true });
    assert.deepEqual(transition.sample(0), { pose: to, done: true });
    assert.deepEqual(transition.sample(10000), { pose: to, done: true });
  }
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
    assert.throws(() => cameraReturnDuration_ms(pose, valid), RangeError);
    assert.throws(() => cameraReturnDuration_ms(valid, pose), RangeError);
  }
  assert.throws(() => createCameraReturn({ from: { ...valid, distance_m: 32 }, to: valid, startedAt_ms: 0 }), RangeError);
  assert.throws(() => cameraReturnDuration_ms({ ...valid, distance_m: 32 }, valid), RangeError);
  assert.throws(() => cameraReturnDuration_ms(valid, { ...valid, distance_m: 32 }), RangeError);
  for (const missing of [null, undefined] as unknown as CameraReturnPose[]) {
    assert.throws(() => cameraReturnDuration_ms(missing, valid), RangeError);
    assert.throws(() => cameraReturnDuration_ms(valid, missing), RangeError);
  }
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
    const from = { yaw_rad: 0, pitch_rad: 0, distance_m: fromDistance }, to = { yaw_rad: 0, pitch_rad: 0, distance_m: toDistance };
    const duration = cameraReturnDuration_ms(from, to);
    for (const time of [1, duration / 2, duration - 1, duration]) {
      const distance = transition.sample(time).pose.distance_m!;
      assert(Number.isFinite(distance) && distance >= Number.MIN_VALUE && distance <= Number.MAX_VALUE);
    }
    assert.deepEqual(transition.sample(duration), { pose: to, done: true });
  }
});

test('R-VIEW-1 chase duration scales by radius ratio and saturates at the six-second policy cap', () => {
  const target = { yaw_rad: 0, pitch_rad: 0, distance_m: 32 };
  // Independently calculated policy examples; the expected values are not read
  // from the production duration helper or its private rate constant.
  const cases = [[.5, 700], [1, 700], [2, 1150], [10, 2194.867642699313],
    [100, 3689.735285398626], [1024, 5200], [2048, 5650], [4096, 6000]];
  let previous = 0;
  for (const [factor, expected] of cases) {
    const duration = cameraReturnDuration_ms({ yaw_rad: 1, pitch_rad: .4, distance_m: 32 * factor }, target);
    near(duration, expected, 1e-9);
    assert(duration >= previous && duration >= 700 && duration <= 6000);
    previous = duration;
  }
  assert.equal(CAMERA_RETURN_MAX_DURATION_MS, 6000);
  assert.equal(cameraReturnDuration_ms({ yaw_rad: Math.PI, pitch_rad: Math.PI / 2, distance_m: 20_000_000 },
    { ...target, distance_m: Math.hypot(30, 11) }), 6000);
  assert.equal(cameraReturnDuration_ms({ yaw_rad: 0, pitch_rad: 0 }, { yaw_rad: 0, pitch_rad: 0 }), 700);
  assert.equal(cameraReturnDuration_ms({ yaw_rad: Math.PI, pitch_rad: Math.PI / 2 }, { yaw_rad: 0, pitch_rad: 0 }), 700);
});

test('R-VIEW-1 default chase factory completes at its selected duration rather than the former fixed deadline', () => {
  const to = { yaw_rad: 0, pitch_rad: 0, distance_m: 32 };
  for (const [factor, expected] of [[1, 700], [2, 1150], [10, 2194.867642699313], [100, 3689.735285398626], [4096, 6000]]) {
    const from = { yaw_rad: .8, pitch_rad: .4, distance_m: factor * 32 };
    // The policy table is independently checked; use its actual floating-point
    // duration for the exact completion timestamp rather than a rounded decimal.
    const duration = cameraReturnDuration_ms(from, to); near(duration, expected, 1e-9);
    const transition = createCameraReturn({ from, to, startedAt_ms: 0 });
    assert.deepEqual(transition.sample(0), { pose: from, done: false });
    assert.equal(transition.sample(duration - 1).done, false);
    assert.deepEqual(transition.sample(duration), { pose: to, done: true });
    assert.deepEqual(transition.sample(duration + 1000), { pose: to, done: true });
  }
});

test('R-VIEW-1 duration remains finite for huge and subnormal finite radii without changing the inputs', () => {
  for (const [start, end, expected] of [[Number.MAX_VALUE, Number.MIN_VALUE, 6000],
    [Number.MIN_VALUE, Number.MAX_VALUE, 700], [Number.MAX_VALUE, Number.MAX_VALUE / 2, 1150],
    [Number.MIN_VALUE * 2, Number.MIN_VALUE, 1150], [Number.MAX_VALUE, Number.MAX_VALUE, 700]]) {
    const from = { yaw_rad: .4, pitch_rad: -.1, distance_m: start }, to = { yaw_rad: 0, pitch_rad: 0, distance_m: end };
    near(cameraReturnDuration_ms(from, to), expected);
    assert.equal(from.distance_m, start); assert.equal(to.distance_m, end);
  }
});

test('R-VIEW-1 angular and inward radial travel decelerate over equal late wall-time intervals', () => {
  for (const distance_m of [64, 320, 3200, 20_000_000]) {
    const from = { yaw_rad: 1, pitch_rad: .4, distance_m }, to = { yaw_rad: 0, pitch_rad: 0, distance_m: 32 };
    const duration = cameraReturnDuration_ms(from, to), transition = createCameraReturn({ from, to, startedAt_ms: 0 });
    const samples = [.6, .7, .8, .9, 1].map(fraction => transition.sample(duration * fraction).pose);
    const travel = samples.slice(1).map((pose, i) => ({
      yaw: samples[i].yaw_rad - pose.yaw_rad,
      pitch: samples[i].pitch_rad - pose.pitch_rad,
      radius: samples[i].distance_m! - pose.distance_m!,
    }));
    for (let i = 0; i < travel.length; i++) {
      assert(travel[i].yaw > 0 && travel[i].pitch > 0 && travel[i].radius > 0);
      if (i > 0) {
        assert(travel[i].yaw < travel[i - 1].yaw, 'late angular speed falls');
        assert(travel[i].pitch < travel[i - 1].pitch, 'late pitch-look speed falls');
        assert(travel[i].radius < travel[i - 1].radius, 'late inward radial speed falls');
      }
    }
    assert.deepEqual(samples.at(-1), to);
  }
});
