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
