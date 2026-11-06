import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  Camera, Cartesian3, Ellipsoid, GeographicProjection, Matrix4, PerspectiveFrustum,
  SceneMode, Transforms, type Scene,
} from 'cesium';
import { aircraftBasisENU, chaseCameraENU, cockpitCameraENU, MAX_LOOK_PITCH_RAD } from './aircraft-orientation.ts';
import { CHASE_DISTANCE } from './chase-distance.ts';
import { setCameraPose } from './camera-pose.ts';

// Use the installed real Camera implementation; only its Scene dependency is a
// minimal data fixture. No WebGL, source replacement or camera-method mock.
function camera(): Camera {
  return new Camera({
    drawingBufferWidth: 1440, drawingBufferHeight: 900,
    mapProjection: new GeographicProjection(Ellipsoid.WGS84),
    mode: SceneMode.SCENE3D, ellipsoid: Ellipsoid.WGS84,
  } as unknown as Scene);
}
function nearVector(actual: Cartesian3, expected: Cartesian3, tolerance = 2e-14): void {
  assert(Cartesian3.distance(actual, expected) < tolerance,
    `${actual.toString()} should match ${expected.toString()}`);
}
const vector = (values: readonly number[]): Cartesian3 => new Cartesian3(...values);
function worldVector(frame: Matrix4, values: readonly number[]): Cartesian3 {
  return Matrix4.multiplyByPointAsVector(frame, vector(values), new Cartesian3());
}
function poseSnapshot(value: Camera): object {
  return structuredClone({
    position: value.position, direction: value.direction, right: value.right, up: value.up,
    transform: value.transform, frustum: value.frustum,
  });
}

test('R-VIEW-1 actual Cesium camera targets the aircraft at both Earth-scale orbit poles', () => {
  const actual = camera();
  for (const [longitude, latitude] of [[8.643, 49.96], [-122.4, 37.7], [135, -33]]) {
    const target = Cartesian3.fromDegrees(longitude, latitude, 1000);
    const frame = Transforms.eastNorthUpToFixedFrame(target);
    for (const heading of [0, 1.431169986635351, Math.PI, -2]) {
      for (const pitch of [-MAX_LOOK_PITCH_RAD, MAX_LOOK_PITCH_RAD]) {
        for (const distance of [CHASE_DISTANCE.initial_m, 1500, CHASE_DISTANCE.max_m]) {
          const pose = chaseCameraENU(heading, { yaw_rad: .3, pitch_rad: pitch }, distance);
          const destination = Matrix4.multiplyByPoint(frame, vector(pose.offset), new Cartesian3());
          setCameraPose(actual, destination, worldVector(frame, pose.direction), worldVector(frame, pose.up));
          assert.deepEqual(actual.positionWC, destination);
          const targetRay = Cartesian3.normalize(Cartesian3.subtract(target, destination, new Cartesian3()), new Cartesian3());
          // At close range, ECEF position subtraction loses a few low bits.
          nearVector(actual.directionWC, targetRay, distance < 100 ? 1e-10 : 1e-12);
          assert(Math.abs(Cartesian3.dot(actual.directionWC, actual.upWC)) < 1e-14);
          assert(Math.abs(Cartesian3.magnitude(actual.upWC) - 1) < 1e-14);
        }
      }
    }
  }
});

test('R-VIEW-1 actual Cesium camera preserves normal chase and cockpit poses without changing the lens', () => {
  const actual = camera(), frustum = actual.frustum;
  assert(frustum instanceof PerspectiveFrustum);
  frustum.fov = .8; frustum.near = .3; frustum.far = 90_000_000; frustum.aspectRatio = 1.4;
  const lens = [frustum.fov, frustum.near, frustum.far, frustum.aspectRatio];
  const target = Cartesian3.fromDegrees(8.643, 49.96, 1000), frame = Transforms.eastNorthUpToFixedFrame(target);
  for (const heading of [0, .7, Math.PI, -2]) {
    const basis = aircraftBasisENU(heading, .2, -.4);
    for (const pose of [chaseCameraENU(heading, { yaw_rad: .7, pitch_rad: -.3 }, 2000), cockpitCameraENU(basis, { yaw_rad: -.4, pitch_rad: .2 })]) {
      const direction = worldVector(frame, pose.direction), up = worldVector(frame, pose.up);
      const before = structuredClone({ target, direction, up });
      setCameraPose(actual, target, direction, up);
      nearVector(actual.directionWC, direction);
      nearVector(actual.upWC, up);
      nearVector(actual.rightWC, Cartesian3.cross(direction, up, new Cartesian3()));
      assert.deepEqual([frustum.fov, frustum.near, frustum.far, frustum.aspectRatio], lens);
      assert.deepEqual(structuredClone({ target, direction, up }), before);
    }
  }
});

test('R-VIEW-1 world pose resets an existing camera reference frame and supports aliased public inputs', () => {
  const actual = camera();
  actual.lookAtTransform(Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(10, 48)), new Cartesian3(20, -50, 30));
  const destination = Cartesian3.fromDegrees(9, 50, 10_000);
  setCameraPose(actual, destination, new Cartesian3(0, 0, -1), new Cartesian3(0, 1, .2));
  assert.deepEqual(actual.transform, Matrix4.clone(Matrix4.IDENTITY));
  assert.deepEqual(actual.positionWC, destination);
  nearVector(actual.directionWC, new Cartesian3(0, 0, -1));
  nearVector(actual.upWC, new Cartesian3(0, 1, 0));
  const before = poseSnapshot(actual);
  setCameraPose(actual, actual.position, actual.direction, actual.up);
  assert.deepEqual(poseSnapshot(actual), before);
});

test('R-VIEW-1 invalid and degenerate camera vectors fail before any public camera mutation', () => {
  const actual = camera(), validPosition = Cartesian3.fromDegrees(8.6, 49.9, 1000);
  setCameraPose(actual, validPosition, new Cartesian3(0, 0, -1), new Cartesian3(0, 1, 0));
  const before = poseSnapshot(actual);
  const cases: Array<[Cartesian3, Cartesian3, Cartesian3]> = [];
  for (const bad of [NaN, Infinity, -Infinity]) {
    cases.push([new Cartesian3(bad, 0, 0), new Cartesian3(0, 0, -1), new Cartesian3(0, 1, 0)]);
    cases.push([validPosition, new Cartesian3(0, bad, -1), new Cartesian3(0, 1, 0)]);
    cases.push([validPosition, new Cartesian3(0, 0, -1), new Cartesian3(0, 1, bad)]);
  }
  cases.push(
    [validPosition, Cartesian3.ZERO, new Cartesian3(0, 1, 0)],
    [validPosition, new Cartesian3(0, 0, -1), Cartesian3.ZERO],
    [validPosition, new Cartesian3(0, 0, -1), new Cartesian3(0, 0, 10)],
    [validPosition, new Cartesian3(0, 0, -1), new Cartesian3(1e-13, 0, 1)],
    [validPosition, undefined as unknown as Cartesian3, new Cartesian3(0, 1, 0)],
    [validPosition, { x: '1', y: 0, z: 0 } as unknown as Cartesian3, new Cartesian3(0, 1, 0)],
  );
  for (const [destination, direction, up] of cases) {
    assert.throws(() => setCameraPose(actual, destination, direction, up), RangeError);
    assert.deepEqual(poseSnapshot(actual), before);
  }
});

test('R-VIEW-1 finite extreme vector magnitudes normalize without overflow or underflow', () => {
  const actual = camera(), destination = Cartesian3.fromDegrees(8.6, 49.9, 1000);
  for (const size of [Number.MIN_VALUE, 1e-300, 1, 1e300, Number.MAX_VALUE]) {
    setCameraPose(actual, destination, new Cartesian3(size, 0, 0), new Cartesian3(0, size, 0));
    nearVector(actual.directionWC, new Cartesian3(1, 0, 0));
    nearVector(actual.upWC, new Cartesian3(0, 1, 0));
    nearVector(actual.rightWC, new Cartesian3(0, 0, 1));
  }
});
