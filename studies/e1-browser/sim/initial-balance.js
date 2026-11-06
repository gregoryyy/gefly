// Separate optional identity group for generic-model initial equilibrium.
// These are additive model trim commands, not physical C172 cockpit controls.
export const INITIAL_BALANCE_FIELDS = Object.freeze([
  'initial_balance_profile', 'roll_trim_norm', 'yaw_trim_norm',
]);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const present = state => INITIAL_BALANCE_FIELDS.some(key => key in state);
export function validInitialBalanceState(state) {
  if (!record(state)) return false;
  if (!present(state)) return true; // Legacy longitudinal-only profile.
  const [profile, roll, yaw] = INITIAL_BALANCE_FIELDS.map(key => state[key]);
  return (profile === 0 || profile === 1) && Number.isFinite(roll) && Number.isFinite(yaw)
    && Math.abs(roll) <= 1 && Math.abs(yaw) <= 1
    && (profile === 1 || (roll === 0 && yaw === 0));
}
export function initialBalanceFields(values) {
  if (!values || values.length !== 3) return {};
  const fields = Object.fromEntries(INITIAL_BALANCE_FIELDS.map((key, index) => [key, values[index]]));
  return validInitialBalanceState(fields) ? fields : {};
}
export function initialBalanceProfile(state) {
  return validInitialBalanceState(state) ? (state.initial_balance_profile ?? 0) : null;
}
export function equalInitialBalance(a, b) {
  if (!validInitialBalanceState(a) || !validInitialBalanceState(b)) return false;
  return INITIAL_BALANCE_FIELDS.every(key => (a[key] ?? 0) === (b[key] ?? 0));
}
