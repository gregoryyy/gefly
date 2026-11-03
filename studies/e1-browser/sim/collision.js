// Shared original visual geometry, in metres: +X forward, +Y up, +Z right.
// It is an illustrative collision proxy, not certified aircraft dimensions.
const tuple = (...values) => Object.freeze(values);
export const VISUAL_AIRFRAME = Object.freeze({
  profile: Object.freeze([[.06, -3.6], [.2, -2.7], [.48, -1.2], [.62, .4],
    [.61, 1.4], [.48, 2.2], [.3, 2.85], [.08, 3.05]].map(pair => Object.freeze(pair))),
  scaleY: .87,
  cabin: Object.freeze({ center: tuple(.45, .35, 0), scale: tuple(1.32, .62, .57) }),
  roof: Object.freeze({ center: tuple(.2, .63, 0), scale: tuple(1.14, .21, .55) }),
  prop: Object.freeze({ x: 3.17, radius: 1.05 }),
  spinner: Object.freeze({ center: tuple(3.04, 0, 0), scale: tuple(.406, .28, .28) }),
  fin: Object.freeze({ outline: Object.freeze([[-3.5, .17], [-3.35, 1.75], [-2.78, 1.62], [-2.18, .16]]
    .map(pair => Object.freeze(pair))), halfDepth: .065, extrusionDepth: .09, bevelThickness: .02, bevel: .025 }),
});

export const EMPTY_COLLISION = Object.freeze({ collision_mask: 0, collision_step: 0,
  collision_t_s: 0, collision_down_mps: 0, collision_groundspeed_mps: 0 });

/** Contact sampled at a fixed step, not continuous collision detection or damage.
 * Wheel WOW/compression/load are deliberately absent: JSBSim owns wheel response.
 * Native structure bits are tail/left wing/right wing, then proxy body/prop/fin.
 */
export function groundCollisionContact(ground_agl_m, roll_rad, pitch_rad, structure_contact_mask, terrainPlane, groundMotion) {
  if (!Number.isFinite(ground_agl_m) || !Number.isInteger(structure_contact_mask)
    || structure_contact_mask < 0 || structure_contact_mask > 7) return { available: false, mask: 0, clearance_m: null };
  let mask = structure_contact_mask;
  let clearance = null;
  if (Number.isFinite(roll_rad) && Number.isFinite(pitch_rad)) {
    // Local down expressed in VISUAL axes. Body +Z is down, visual +Y is up.
    let dx = -Math.sin(pitch_rad), dy = -Math.cos(roll_rad) * Math.cos(pitch_rad), dz = Math.sin(roll_rad) * Math.cos(pitch_rad);
    if (terrainPlane !== undefined) {
      const { east_slope: east, north_slope: north, heading_rad: heading } = terrainPlane;
      if (![east, north, heading].every(Number.isFinite)) return { available: false, mask: structure_contact_mask, clearance_m: null };
      // Unnormalized plane-down [northSlope,eastSlope,1] in NED. Keeping its
      // vertical component one preserves the native vertical-AGL convention.
      const cp = Math.cos(pitch_rad), sp = Math.sin(pitch_rad), cr = Math.cos(roll_rad), sr = Math.sin(roll_rad);
      const ch = Math.cos(heading), sh = Math.sin(heading);
      dx += north * cp * ch + east * cp * sh;
      dy += north * (-cr * sp * ch - sr * sh) + east * (-cr * sp * sh + sr * ch);
      dz += north * (sr * sp * ch - cr * sh) + east * (sr * sp * sh + cr * ch);
    }
    const ringSupport = Math.hypot(dy * VISUAL_AIRFRAME.scaleY, dz);
    let body = Math.max(...VISUAL_AIRFRAME.profile.map(([radius, x]) => dx * x + radius * ringSupport));
    for (const shape of [VISUAL_AIRFRAME.cabin, VISUAL_AIRFRAME.roof]) {
      const [x, y, z] = shape.center, [sx, sy, sz] = shape.scale;
      body = Math.max(body, dx * x + dy * y + dz * z + Math.hypot(dx * sx, dy * sy, dz * sz));
    }
    const spinner = VISUAL_AIRFRAME.spinner;
    const spinnerSupport = dx * spinner.center[0] + dy * spinner.center[1] + dz * spinner.center[2]
      + Math.hypot(dx * spinner.scale[0], dy * spinner.scale[1], dz * spinner.scale[2]);
    const prop = Math.max(spinnerSupport,
      dx * VISUAL_AIRFRAME.prop.x + VISUAL_AIRFRAME.prop.radius * Math.hypot(dy, dz));
    // Conservative fin box, including the authored extrusion/bevel. It is a
    // proxy around the sloping fin outline, not an exact mesh intersection.
    const fin = VISUAL_AIRFRAME.fin;
    const finX = fin.outline.map(point => point[0]), finY = fin.outline.map(point => point[1]);
    const finSupport = Math.max(dx * Math.min(...finX), dx * Math.max(...finX))
      + Math.max(dy * Math.min(...finY), dy * Math.max(...finY))
      // THREE ExtrudeGeometry caps XY bevel-vector length at sqrt(2), not one.
      // Its miter can therefore extend farther than bevelSize at sharp corners.
      + Math.SQRT2 * fin.bevel * Math.hypot(dx, dy) + (fin.extrusionDepth / 2 + fin.bevelThickness) * Math.abs(dz);
    if (ground_agl_m <= body) mask |= 8;
    // The illustrative prop disc can graze the plane as the nose strut settles
    // under braking. Allow at most 5 cm only near rest with all wheels supported.
    // This is a proxy tolerance, not a real-aircraft prop clearance or damage limit.
    const settled = groundMotion && structure_contact_mask === 0
      && [groundMotion.ground_forward_mps, groundMotion.ground_side_mps, groundMotion.ground_down_mps].every(Number.isFinite)
      && Math.hypot(groundMotion.ground_forward_mps, groundMotion.ground_side_mps) <= 1
      && Math.abs(groundMotion.ground_down_mps) <= .2
      && ['nose', 'left', 'right'].every(name => groundMotion[`gear_${name}_wow`] === 1);
    if (ground_agl_m <= prop - (settled ? .05 : 0)) mask |= 16;
    if (ground_agl_m <= finSupport) mask |= 32;
    clearance = ground_agl_m - Math.max(body, prop, finSupport);
  }
  if (mask === 0 && ground_agl_m <= 0) mask = 64;
  return { available: true, mask, clearance_m: clearance };
}

/** Immutable first-contact metadata from post-step identity and pre-step motion. */
export function collisionRecord(mask, step, t_s, previousGround) {
  if (!Number.isInteger(mask) || mask <= 0 || mask > 127 || !Number.isInteger(step) || step < 1
    || !Number.isFinite(t_s) || t_s < 0 || !previousGround
    || ![previousGround.ground_down_mps, previousGround.ground_forward_mps, previousGround.ground_side_mps].every(Number.isFinite)) return null;
  const speed = Math.hypot(previousGround.ground_forward_mps, previousGround.ground_side_mps);
  if (!Number.isFinite(speed)) return null;
  return Object.freeze({ collision_mask: mask, collision_step: step, collision_t_s: t_s,
    collision_down_mps: previousGround.ground_down_mps, collision_groundspeed_mps: speed });
}

/** Published collision group. Contact telemetry that is disabled or unavailable
 * is omitted, never reported as collision_mask 0 (a definitive "clear"). A
 * latched first-contact record is always published. */
export function collisionStateFields(enabled, available, latched) {
  if (latched && latched.collision_mask) return latched;
  return enabled === true && available === true ? EMPTY_COLLISION : {};
}

/** Outcome of one fixed-step sample. A detected contact is never dropped: with
 * no valid record (missing/non-finite pre-step motion) the result is "fail". */
export function contactOutcome(contact, record) {
  // An unavailable proxy sample can still carry an actual native structure
  // contact (for example with an invalid terrain plane); that contact counts.
  if (contact && contact.mask) return record ? 'latch' : 'fail';
  return contact && contact.available === true ? 'clear' : 'unavailable';
}
