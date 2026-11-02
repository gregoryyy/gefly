// Read-only ideal instrument display values from the pinned JSBSim properties.
// No gyro dynamics or installation errors are inferred. See the source note.
export function cockpitFields(values) {
  if (values.length !== 8 || !Array.from(values).every(Number.isFinite)) return {};
  const [cas_mps, turn_rate_radps, ny, nz, flap_rad, brake_left_norm, brake_right_norm, on_ground] = values;
  if (cas_mps < 0 || flap_rad < -1e-6 || flap_rad > Math.PI / 6 + 1e-6
    || brake_left_norm < 0 || brake_left_norm > 1 || brake_right_norm < 0 || brake_right_norm > 1
    || ![0, 1].includes(on_ground)) return {};
  const fields = { cas_mps, turn_rate_radps, flap_rad, brake_left_norm, brake_right_norm, on_ground };
  // Body Y is right, Z down; apparent gravity opposes specific force. A ball
  // cannot supply a useful conventional indication at zero/inverted loading.
  if (-nz > 1e-6) fields.slip_ball_rad = Math.atan2(-ny, -nz) || 0;
  return fields;
}

// Generic c172x additive pitch-trim command, not physical trim-tab position.
// Positive command is nose-down; elevator position remains in model radians.
export function pitchTrimFields(values) {
  if (values.length !== 3 || !Array.from(values).every(Number.isFinite)) return {};
  const [pitch_trim_norm, pitch_trim_initial_norm, elevator_rad] = values;
  if (Math.abs(pitch_trim_norm) > 1 || Math.abs(pitch_trim_initial_norm) > 1) return {};
  return { pitch_trim_norm, pitch_trim_initial_norm, elevator_rad };
}

// Whole optional contact group: old engines and invalid groups stay unavailable.
export function groundFields(values) {
  if (values.length !== 18 || !Array.from(values).every(Number.isFinite)) return {};
  const [ground_agl_m, ground_height_ellipsoid_m, ground_forward_mps, ground_side_mps,
    ground_down_mps, structure_contact_mask] = values;
  if (!Number.isInteger(structure_contact_mask) || structure_contact_mask < 0 || structure_contact_mask > 7) return {};
  const fields = { ground_agl_m, ground_height_ellipsoid_m, ground_forward_mps, ground_side_mps,
    ground_down_mps, structure_contact_mask };
  for (const [i, name] of ['nose', 'left', 'right'].entries()) {
    const [wow, compression_m, load_n, slip_rad] = values.slice(6 + i * 4, 10 + i * 4);
    if (![0, 1].includes(wow) || compression_m < 0 || load_n < 0) return {};
    Object.assign(fields, { [`gear_${name}_wow`]: wow, [`gear_${name}_compression_m`]: compression_m,
      [`gear_${name}_load_n`]: load_n, [`gear_${name}_slip_rad`]: slip_rad });
  }
  return fields;
}
