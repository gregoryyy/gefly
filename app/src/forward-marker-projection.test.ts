import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectForwardDirection } from './forward-marker-projection.ts';
import { aircraftBasisENU, cockpitCameraENU, chaseCameraENU, type VectorENU } from './aircraft-orientation.ts';

const base = { right: 0, up: 0, forward: 1, width_px: 800, height_px: 400, fov_y_rad: Math.PI / 2 };
const near = (actual: number, expected: number, tolerance = 1e-10) => assert(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
const dot = (a: VectorENU, b: VectorENU) => a.reduce((sum, value, index) => sum + value * b[index], 0);
function cameraRight(direction: VectorENU, up: VectorENU): VectorENU {
  return [direction[1] * up[2] - direction[2] * up[1], direction[2] * up[0] - direction[0] * up[2], direction[0] * up[1] - direction[1] * up[0]];
}

test('front-center and known perspective offsets use actual vertical FOV', () => {
  assert.deepEqual(projectForwardDirection(base), { x_px: 400, y_px: 200, angle_rad: 0, clipped: false });
  const offset = projectForwardDirection({ ...base, right: .5, up: .25 })!;
  near(offset.x_px, 500); near(offset.y_px, 150); near(offset.angle_rad, Math.atan2(100, 50));
  assert.equal(offset.clipped, false);
  const right45 = projectForwardDirection({ ...base, right: 1 })!;
  near(right45.x_px, 600); near(right45.y_px, 200); near(right45.angle_rad, Math.PI / 2);
  const taller = projectForwardDirection({ ...base, right: .5, height_px: 800 })!;
  near(taller.x_px, 600); near(taller.y_px, 400);
  const narrowerFov = projectForwardDirection({ ...base, right: Math.tan(Math.PI / 6), fov_y_rad: Math.PI / 3 })!;
  near(narrowerFov.x_px, 600);
});

test('ray clipping preserves direction with asymmetric safe insets', () => {
  const inset = { top: 60, right: 20, bottom: 10, left: 30 };
  const diagonal = projectForwardDirection({ ...base, right: 4, up: 2, insets: inset })!;
  near(diagonal.x_px, 680); near(diagonal.y_px, 60); assert(diagonal.clipped);
  near((diagonal.x_px - 400) / (200 - diagonal.y_px), 2);
  near(diagonal.angle_rad, Math.atan2(2, 1));
  const left = projectForwardDirection({ ...base, right: -10, insets: inset })!;
  near(left.x_px, 30); near(left.y_px, 200); near(left.angle_rad, -Math.PI / 2);
  const down = projectForwardDirection({ ...base, up: -10, insets: inset })!;
  near(down.y_px, 390); near(down.angle_rad, Math.PI);
  const edge = projectForwardDirection({ ...base, right: 2 })!;
  near(edge.x_px, 800); assert.equal(edge.clipped, false);
});

test('near-perpendicular forward directions remain finite; directions behind the camera disappear', () => {
  for (const forward of [1e-15, Number.MIN_VALUE, 0]) {
    const edge = projectForwardDirection({ ...base, right: 1, forward })!;
    assert(edge.clipped); near(edge.x_px, 800); near(edge.y_px, 200);
    assert(Object.values(edge).every(value => typeof value !== 'number' || Number.isFinite(value)));
  }
  assert.equal(projectForwardDirection({ ...base, forward: -1 }), null);
  assert.equal(projectForwardDirection({ ...base, forward: -Number.MIN_VALUE, right: 1 }), null);
  assert.equal(projectForwardDirection({ ...base, forward: 0 }), null);
  const huge = projectForwardDirection({ ...base, right: Number.MAX_VALUE, up: Number.MAX_VALUE, forward: 0 })!;
  near(huge.x_px, 600); near(huge.y_px, 0); assert(huge.clipped);
});

test('short viewports retain a safe edge cue even when header insets exclude the viewport center', () => {
  const short = { ...base, height_px: 200, insets: { top: 106, right: 36, bottom: 18, left: 36 } };
  assert.deepEqual(projectForwardDirection(short), { x_px: 400, y_px: 106, angle_rad: 0, clipped: true });
  const inside = projectForwardDirection({ ...short, right: .2, up: -.1 })!;
  near(inside.x_px, 420); near(inside.y_px, 110); assert.equal(inside.clipped, false);
  const outward = projectForwardDirection({ ...short, right: -1, up: 1 })!;
  near(outward.x_px, 400); near(outward.y_px, 106); near(outward.angle_rad, -Math.PI / 4); assert(outward.clipped);
});

test('actual camera axes put the nose left when looking right, independently of aircraft attitude', () => {
  for (const attitude of [[0, 0, 0], [1.2, .3, -.8], [-2, -.5, 1.1]]) {
    const basis = aircraftBasisENU(...attitude as [number, number, number]);
    for (const yaw of [-.3, .3]) {
      const pose = cockpitCameraENU(basis, { yaw_rad: yaw, pitch_rad: 8 * Math.PI / 180 });
      const result = projectForwardDirection({ ...base, right: dot(basis.forward, cameraRight(pose.direction, pose.up)),
        up: dot(basis.forward, pose.up), forward: dot(basis.forward, pose.direction) })!;
      near(result.x_px, 400 - 200 * Math.tan(yaw)); near(result.y_px, 200);
    }
    const defaultPose = cockpitCameraENU(basis);
    const forward = projectForwardDirection({ ...base, right: dot(basis.forward, cameraRight(defaultPose.direction, defaultPose.up)),
      up: dot(basis.forward, defaultPose.up), forward: dot(basis.forward, defaultPose.direction) })!;
    near(forward.x_px, 400); near(forward.y_px, 200 - 200 * Math.tan(8 * Math.PI / 180));
  }
  const basis = aircraftBasisENU(0, Math.PI / 6, 0), chase = chaseCameraENU(0);
  const pitched = projectForwardDirection({ ...base, right: dot(basis.forward, cameraRight(chase.direction, chase.up)),
    up: dot(basis.forward, chase.up), forward: dot(basis.forward, chase.direction) })!;
  assert(pitched.y_px < 200, 'chase projection follows actual nose pitch rather than a fixed screen offset');
});

test('invalid inputs and unusable safe rectangles return null without mutating inputs', () => {
  for (const key of ['right', 'up', 'forward', 'width_px', 'height_px', 'fov_y_rad'] as const) {
    for (const value of [NaN, Infinity, -Infinity]) assert.equal(projectForwardDirection({ ...base, [key]: value }), null);
  }
  for (const value of [0, -1]) {
    assert.equal(projectForwardDirection({ ...base, width_px: value }), null);
    assert.equal(projectForwardDirection({ ...base, height_px: value }), null);
  }
  for (const value of [0, -1, Math.PI, Math.PI + .1]) assert.equal(projectForwardDirection({ ...base, fov_y_rad: value }), null);
  for (const inset of [{ top: -1, right: 0, bottom: 0, left: 0 }, { top: NaN, right: 0, bottom: 0, left: 0 },
    { top: 400, right: 0, bottom: 0, left: 0 }, { top: 200, right: 0, bottom: 200, left: 0 },
    { top: 0, right: 800, bottom: 0, left: 0 }]) assert.equal(projectForwardDirection({ ...base, insets: inset }), null);
  const input = Object.freeze({ ...base, right: .2, insets: Object.freeze({ top: 20, right: 20, bottom: 20, left: 20 }) });
  const before = structuredClone(input); projectForwardDirection(input); assert.deepEqual(input, before);
});
