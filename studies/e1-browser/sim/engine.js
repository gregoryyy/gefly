// Read-only values from the pinned generic JSBSim piston/FCS models. No aircraft
// limits or replacement controller gains are inferred from these values.
const TWO_PI = Math.PI * 2;
export const ENGINE_FIELDS = [
  'manifold_pressure_pa', 'prop_radps', 'mixture_norm', 'mixture_auto',
  'oil_pressure_pa', 'oil_temp_k', 'egt_k', 'fuel_flow_m3ps',
  'fuel_left_m3', 'fuel_right_m3', 'ap_mode', 'ap_heading_target_rad', 'ap_aileron_norm',
];
export const ENGINE_SWITCH_FIELDS = ['engine_running', 'engine_command_on'];

/** Separate optional extension: older 13-field engine instruments remain usable. */
export function engineSwitchFields(values) {
  if (!values || values.length !== 2 || !Array.from(values).every(value => value === 0 || value === 1)) return {};
  return { engine_running: values[0], engine_command_on: values[1] };
}

export function normalizedHeading(heading_rad) {
  if (!Number.isFinite(heading_rad)) return null;
  let result = heading_rad % TWO_PI;
  if (result < 0) result += TWO_PI;
  return result >= TWO_PI ? 0 : result || 0;
}

/** Commands are discrete mode plus a true-radian target; omission captures heading. */
export function autopilotCommand(message, current_heading_rad) {
  if (!message || ![0, 1, 2].includes(message.mode)) return null;
  const target = normalizedHeading(message.target_heading_rad === undefined ? current_heading_rad : message.target_heading_rad);
  return target === null ? null : { mode: message.mode, target_heading_rad: target };
}

/** Atomic optional telemetry group: never publish a half-valid engine/AP panel. */
export function engineFields(values) {
  if (!values || values.length !== ENGINE_FIELDS.length || !Array.from(values).every(Number.isFinite)) return {};
  if (values[0] <= 0 || [1, 4, 7, 8, 9].some(index => values[index] < 0)
    || values[2] < 0 || values[2] > 1 || ![0, 1].includes(values[3])
    || values[5] <= 0 || values[6] <= 0 || ![0, 1, 2].includes(values[10])
    || values[11] < 0 || values[11] >= TWO_PI) return {};
  // Raw upstream controller output may exceed normalized surface limits before
  // the existing FCS summer clips it. Keep that distinction explicit.
  return Object.fromEntries(ENGINE_FIELDS.map((name, index) => [name, values[index]]));
}
