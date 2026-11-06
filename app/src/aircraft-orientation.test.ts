import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Axis, Cartesian3, Matrix4 } from 'cesium';
import {
  aircraftBasisENU, boundedCameraLook, cockpitCameraENU, chaseCameraENU, MAX_LOOK_PITCH_RAD,
  type AircraftBasisENU, type VectorENU,
} from './aircraft-orientation.ts';
import { CHASE_DISTANCE } from './chase-distance.ts';

const EPS = 1e-12;
function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < EPS, `${actual} should be ${expected}`);
}
function vector(actual: VectorENU, expected: VectorENU): void {
  actual.forEach((value, index) => near(value, expected[index]));
}
function dot(a: VectorENU, b: VectorENU): number { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function resolvedGltfDirection(basis: AircraftBasisENU, authored: Cartesian3): VectorENU {
  // The renderer declares Y up / X forward. Test Cesium's actual Y-up
  // correction, then the forward/left/up model matrix, rather than HPR guesses.
  const corrected = Matrix4.multiplyByPointAsVector(Axis.Y_UP_TO_Z_UP, authored, new Cartesian3());
  return [0, 1, 2].map(index => basis.forward[index] * corrected.x
    - basis.right[index] * corrected.y + basis.up[index] * corrected.z) as unknown as VectorENU;
}

test('authored glTF nose/up/right resolve to north/up/east at heading zero', () => {
  const basis = aircraftBasisENU(0, 0, 0);
  vector(resolvedGltfDirection(basis, Cartesian3.UNIT_X), [0, 1, 0]);
  vector(resolvedGltfDirection(basis, Cartesian3.UNIT_Y), [0, 0, 1]);
  vector(resolvedGltfDirection(basis, Cartesian3.UNIT_Z), [1, 0, 0]);
});

test('cardinal true headings orient the nose north, east, south and west', () => {
  const cases: Array<[number, VectorENU, VectorENU]> = [
    [0, [0, 1, 0], [1, 0, 0]],
    [Math.PI / 2, [1, 0, 0], [0, -1, 0]],
    [Math.PI, [0, -1, 0], [-1, 0, 0]],
    [3 * Math.PI / 2, [-1, 0, 0], [0, 1, 0]],
  ];
  for (const [heading, forward, right] of cases) {
    const basis = aircraftBasisENU(heading, 0, 0);
    vector(resolvedGltfDirection(basis, Cartesian3.UNIT_X), forward);
    vector(resolvedGltfDirection(basis, Cartesian3.UNIT_Z), right);
  }
});

test('positive pitch raises the nose; positive bank lowers the authored right wing', () => {
  const pitched = aircraftBasisENU(0, Math.PI / 6, 0);
  vector(resolvedGltfDirection(pitched, Cartesian3.UNIT_X), [0, Math.sqrt(3) / 2, 0.5]);
  vector(resolvedGltfDirection(pitched, Cartesian3.UNIT_Y), [0, -0.5, Math.sqrt(3) / 2]);
  const rolled = aircraftBasisENU(0, 0, Math.PI / 6);
  vector(resolvedGltfDirection(rolled, Cartesian3.UNIT_Z), [Math.sqrt(3) / 2, 0, -0.5]);
  vector(resolvedGltfDirection(rolled, Cartesian3.UNIT_Y), [0.5, 0, Math.sqrt(3) / 2]);
});

test('combined attitude retains an orthonormal body frame', () => {
  for (const [heading, pitch, roll] of [[0.7, 0.2, -0.4], [2.8, -0.5, 1.2], [-5, 1.5, 3]]) {
    const basis = aircraftBasisENU(heading, pitch, roll);
    for (const axis of [basis.forward, basis.right, basis.up]) near(dot(axis, axis), 1);
    near(dot(basis.forward, basis.right), 0); near(dot(basis.forward, basis.up), 0); near(dot(basis.up, basis.right), 0);
    // A physical aircraft frame is forward/right/down; F x R is -Up.
    const f = basis.forward, r = basis.right;
    vector([f[1]*r[2]-f[2]*r[1], f[2]*r[0]-f[0]*r[2], f[0]*r[1]-f[1]*r[0]],
      [-basis.up[0], -basis.up[1], -basis.up[2]]);
  }
});

test('zero look retains a slightly downward cockpit gaze and original chase distance', () => {
  const basis = aircraftBasisENU(0, 0, 0);
  const cockpit = cockpitCameraENU(basis);
  vector(cockpit.direction, [0, Math.cos(8 * Math.PI / 180), -Math.sin(8 * Math.PI / 180)]);
  const chase = chaseCameraENU(0);
  vector(chase.offset, [0, -30, 11]);
  near(Math.hypot(...chase.offset), Math.hypot(30, 11));
});

test('FOV changes projection input without changing cockpit pose or chase orbit', () => {
  const basis = aircraftBasisENU(1.1, 0.3, -0.4);
  const look = { yaw_rad: 0.2, pitch_rad: -0.1 };
  for (const fov_rad of [20, 60, 100].map(degrees => degrees * Math.PI / 180)) {
    assert.deepEqual(cockpitCameraENU(basis, { ...look, fov_rad }), cockpitCameraENU(basis, look));
    assert.deepEqual(chaseCameraENU(1.1, { ...look, fov_rad }), chaseCameraENU(1.1, look));
  }
});

test('look changes camera gaze/orbit with finite perpendicular vectors and no body mutation', () => {
  const basis = aircraftBasisENU(1.1, 0.3, -0.4);
  const before = structuredClone(basis);
  for (const yaw_rad of [-Math.PI, -0.8, 0, 0.6, Math.PI]) {
    for (const pitch_rad of [-MAX_LOOK_PITCH_RAD, 0, MAX_LOOK_PITCH_RAD]) {
      for (const pose of [cockpitCameraENU(basis, { yaw_rad, pitch_rad }), chaseCameraENU(1.1, { yaw_rad, pitch_rad })]) {
        near(dot(pose.direction, pose.direction), 1);
        near(dot(pose.up, pose.up), 1);
        near(dot(pose.direction, pose.up), 0);
      }
    }
  }
  assert.deepEqual(basis, before);
  const right = cockpitCameraENU(aircraftBasisENU(0, 0, 0), { yaw_rad: Math.PI / 2, pitch_rad: 8 * Math.PI / 180 });
  vector(right.direction, [1, 0, 0]);
  assert.notDeepEqual(chaseCameraENU(0, { yaw_rad: 0.8, pitch_rad: 0 }).offset, chaseCameraENU(0).offset);
});

test('look bounds and invalid angles are explicit instead of producing invalid transforms', () => {
  assert.deepEqual(boundedCameraLook({ yaw_rad: 10, pitch_rad: -10 }), { yaw_rad: Math.PI, pitch_rad: -MAX_LOOK_PITCH_RAD });
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => aircraftBasisENU(bad, 0, 0), RangeError);
    assert.throws(() => aircraftBasisENU(0, bad, 0), RangeError);
    assert.throws(() => aircraftBasisENU(0, 0, bad), RangeError);
    assert.throws(() => boundedCameraLook({ yaw_rad: bad, pitch_rad: 0 }), RangeError);
    assert.throws(() => boundedCameraLook({ yaw_rad: 0, pitch_rad: bad }), RangeError);
  }
});

test('outer look reaches both real poles with stable analytic up and unchanged ordinary drag', () => {
  const basis = aircraftBasisENU(.7,.2,-.4);
  for (const yaw_rad of [-Math.PI,-.3,0,.8,Math.PI]) {
    for (const sign of [-1,1]) {
      const look={yaw_rad,pitch_rad:sign*MAX_LOOK_PITCH_RAD};
      const cockpit=cockpitCameraENU(basis,look),chase=chaseCameraENU(.7,look);
      vector(cockpit.direction,basis.up.map(v=>v*sign) as unknown as VectorENU);
      vector(chase.direction,[0,0,-sign]);
      for(const pose of [cockpit,chase]) { near(dot(pose.up,pose.direction),0);near(dot(pose.up,pose.up),1); }
      const nearPole=cockpitCameraENU(basis,{...look,pitch_rad:look.pitch_rad-sign*1e-6});
      assert(dot(cockpit.up,nearPole.up)>.999999,'up vector does not flip at pole');
    }
  }
  const neutral=aircraftBasisENU(0,0,0), small=.2;
  near(cockpitCameraENU(neutral,{yaw_rad:0,pitch_rad:small}).direction[2],Math.sin(small-8*Math.PI/180));
  const chase=chaseCameraENU(0,{yaw_rad:0,pitch_rad:small});
  near(chase.direction[2],-Math.sin(Math.atan2(11,30)+small));
  for(const sign of [-1,1]){
    let previous=-Infinity;
    for(let i=0;i<=100;i++){
      const pose=cockpitCameraENU(neutral,{yaw_rad:0,pitch_rad:sign*MAX_LOOK_PITCH_RAD*i/100});
      const elevation=Math.asin(Math.max(-1,Math.min(1,pose.direction[2])))*sign;
      assert(elevation>=previous-1e-12,'outer mapping is monotonic');previous=elevation;
    }
  }
});

test('R-VIEW-1 distance zoom keeps the chase camera behind each cardinal aircraft heading', () => {
  const cases: Array<[number, VectorENU]> = [
    [0, [0, -30, 11]], [Math.PI / 2, [-30, 0, 11]],
    [Math.PI, [0, 30, 11]], [3 * Math.PI / 2, [30, 0, 11]],
  ];
  for (const [heading, legacyOffset] of cases) {
    vector(chaseCameraENU(heading).offset, legacyOffset);
    const close = chaseCameraENU(heading);
    for (const distance of [CHASE_DISTANCE.initial_m, 1500, CHASE_DISTANCE.max_m]) {
      const pose = chaseCameraENU(heading, undefined, distance);
      assert(Math.abs(Math.hypot(...pose.offset) - distance) < distance * EPS);
      vector(pose.direction, pose.offset.map(value => -value / distance) as unknown as VectorENU);
      assert.deepEqual(pose.direction, close.direction);
      assert.deepEqual(pose.up, close.up);
    }
  }
});

test('R-VIEW-1 Earth-scale chase orbit reaches top-down and underside poles with stable axes', () => {
  for (const yaw_rad of [-Math.PI, -.8, 0, 1.1, Math.PI]) for (const sign of [-1, 1]) {
    const look = { yaw_rad, pitch_rad: sign * MAX_LOOK_PITCH_RAD };
    const pose = chaseCameraENU(.7, look, CHASE_DISTANCE.max_m);
    vector(pose.direction, [0, 0, -sign]);
    vector(pose.offset.map(value => value / CHASE_DISTANCE.max_m) as unknown as VectorENU, [0, 0, sign]);
    near(dot(pose.direction, pose.up), 0);
    near(dot(pose.direction, pose.direction), 1);
    near(dot(pose.up, pose.up), 1);
    const approaching = chaseCameraENU(.7, { ...look, pitch_rad: look.pitch_rad - sign * 1e-6 }, CHASE_DISTANCE.max_m);
    assert(dot(pose.up, approaching.up) > .999999, 'up vector does not flip approaching either pole');
  }
});

test('R-VIEW-1 explicit bounded distance changes only chase offset and preserves look/lens input', () => {
  const look = { yaw_rad: .7, pitch_rad: -.3, fov_rad: .8, distance_m: CHASE_DISTANCE.max_m };
  const before = structuredClone(look);
  const ordinary = chaseCameraENU(.4, look);
  assert.equal(Math.hypot(...ordinary.offset), Math.hypot(...chaseCameraENU(.4, { yaw_rad: .7, pitch_rad: -.3 }).offset));
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(chaseCameraENU(.4, look, invalid), ordinary);
  }
  for (const belowMinimum of [-1, 0]) {
    assert.deepEqual(chaseCameraENU(.4, look, belowMinimum), chaseCameraENU(.4, look, CHASE_DISTANCE.min_m));
  }
  assert.deepEqual(chaseCameraENU(.4, look, 1e100), chaseCameraENU(.4, look, CHASE_DISTANCE.max_m));
  const far = chaseCameraENU(.4, look, 10_000);
  assert.deepEqual(far.direction, ordinary.direction);
  assert.deepEqual(far.up, ordinary.up);
  assert.deepEqual(look, before);
});
