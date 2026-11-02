import type { FlightState } from './types';

export interface EngineAudioParameters {
  valid: boolean;
  rpm: number;
  rotation_hz: number;
  firing_hz: number;
  blade_pass_hz: number;
  exhaust_gain: number;
  mechanical_gain: number;
  propeller_gain: number;
  noise_cutoff_hz: number;
}

const SILENT: EngineAudioParameters = Object.freeze({ valid: false, rpm: 0, rotation_hz: 0,
  firing_hz: 0, blade_pass_hz: 0, exhaust_gain: 0, mechanical_gain: 0, propeller_gain: 0,
  noise_cutoff_hz: 300 });
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Original procedural timbre, not an acoustic calibration or recorded aircraft.
 * Four-cylinder four-stroke firing and two-blade passage each occur twice/rev.
 * Gain curves/filter ranges are sound-design choices; none changes simulation.
 */
export function engineAudioParameters(state: Readonly<FlightState> | null): EngineAudioParameters {
  if (!state || ![state.prop_radps, state.manifold_pressure_pa, state.fuel_flow_m3ps]
    .every(value => typeof value === 'number' && Number.isFinite(value))
    || state.prop_radps! < 0 || state.manifold_pressure_pa! <= 0 || state.fuel_flow_m3ps! < 0) return { ...SILENT };
  const rps = state.prop_radps! / (2 * Math.PI);
  const rpm = rps * 60;
  if (!Number.isFinite(rpm)) return { ...SILENT };
  // Audio-frequency ceiling only: prevents invalid/extreme telemetry creating
  // ultrasonic fundamentals. The reported RPM remains the actual model value.
  const rotation = Math.min(rps, 200);
  const rotationGain = -Math.expm1(-rps / 35);
  const load = clamp(state.manifold_pressure_pa! / 101325, 0, 1);
  const fuel = state.fuel_flow_m3ps!;
  const combustion = fuel > 0 ? 1 / (1 + 3e-6 / fuel) : 0;
  return { valid: true, rpm, rotation_hz: rotation, firing_hz: rotation * 2, blade_pass_hz: rotation * 2,
    exhaust_gain: .36 * rotationGain * (.4 + .6 * load) * combustion,
    mechanical_gain: .045 * rotationGain,
    propeller_gain: .1 * rotationGain,
    noise_cutoff_hz: clamp(600 + rotation * 28 + load * 1000, 300, 5000) };
}
