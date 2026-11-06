import { type Camera, Cartesian3, Matrix4 } from 'cesium';

const position = new Cartesian3();
const direction = new Cartesian3();
const up = new Cartesian3();
const right = new Cartesian3();

/** Normalize without squaring unbounded components or underflowing tiny ones. */
function normalize(vector: Cartesian3): void {
  if (![vector.x, vector.y, vector.z].every(Number.isFinite)) {
    throw new RangeError('Camera axes must be finite and nonzero');
  }
  const scale = Math.max(Math.abs(vector.x), Math.abs(vector.y), Math.abs(vector.z));
  if (!Number.isFinite(scale) || scale === 0) throw new RangeError('Camera axes must be finite and nonzero');
  vector.x /= scale; vector.y /= scale; vector.z /= scale;
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  vector.x /= magnitude; vector.y /= magnitude; vector.z /= magnitude;
}

/** Exact world-coordinate pose, avoiding setView's near-pole HPR round trip. */
export function setCameraPose(camera: Camera, destination: Cartesian3, worldDirection: Cartesian3, worldUp: Cartesian3): void {
  if (!destination || !worldDirection || !worldUp) throw new RangeError('Camera pose vectors are required');
  // Prepare and validate the whole pose before touching the camera. Copying also
  // supports inputs aliased to its current public position/direction/up members.
  Cartesian3.clone(destination, position);
  Cartesian3.clone(worldDirection, direction);
  Cartesian3.clone(worldUp, up);
  if (![position.x, position.y, position.z].every(Number.isFinite)) {
    throw new RangeError('Camera destination must be finite world coordinates');
  }
  normalize(direction); normalize(up);
  Cartesian3.cross(direction, up, right);
  if (Math.hypot(right.x, right.y, right.z) <= 1e-12) {
    throw new RangeError('Camera direction and up must define a nondegenerate frame');
  }
  normalize(right);
  Cartesian3.cross(right, direction, up);
  normalize(up);

  // setView's vector overload converts via heading/pitch/roll in the camera's
  // own ENU frame. Its near-pole heuristic can lose the exact target direction
  // at Earth-scale ranges. These writable basis members are public Camera API.
  camera.setView({ destination: position, endTransform: Matrix4.IDENTITY });
  Cartesian3.clone(direction, camera.direction);
  Cartesian3.clone(right, camera.right);
  Cartesian3.clone(up, camera.up);
}
