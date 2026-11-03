export type SimulationRate = 1 | 1.5 | 2 | 5 | 10;
export const SIMULATION_RATES: readonly SimulationRate[];
export function validSimulationRate(value: unknown): value is SimulationRate;
export function pacedStepMilliseconds(dt_s: number, rate: SimulationRate): number;
