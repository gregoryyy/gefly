/** Simulation-time acceleration changes pacing, never the physics integration step. */
export const SIMULATION_RATES = Object.freeze([1, 1.5, 2, 5, 10]);

export function validSimulationRate(value) {
  return typeof value === 'number' && SIMULATION_RATES.includes(value);
}

export function pacedStepMilliseconds(dt_s, rate) {
  if (!Number.isFinite(dt_s) || dt_s <= 0 || !validSimulationRate(rate)) {
    throw new RangeError('Invalid fixed step or simulation rate.');
  }
  return dt_s * 1000 / rate;
}
