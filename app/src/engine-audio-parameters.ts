import type { FlightState } from './types';
import { validAlertState } from '../../studies/e1-browser/sim/altitude-alert.js';

export interface EngineAudioParameters {
  valid: boolean;
  rpm: number;
  rotation_hz: number;
  firing_hz: number;
  blade_pass_hz: number;
  exhaust_gain: number;
  mechanical_gain: number;
  rotation_whirr_hz: number;
  rotation_whirr_gain: number;
  propeller_gain: number;
  noise_cutoff_hz: number;
  wind_gain: number;
  wind_cutoff_hz: number;
  wind_whistle_hz: number;
  wind_whistle_gain: number;
  frame_step: number;
  frame_t_s: number;
  ground_available: boolean;
  wheel_contact_mask: number;
  rolling_gain: number;
  rolling_cutoff_hz: number;
  touchdown_gain: number;
  alert_available: boolean;
  alert_sequence: number;
}

const SILENT: EngineAudioParameters = Object.freeze({ valid: false, rpm: 0, rotation_hz: 0,
  firing_hz: 0, blade_pass_hz: 0, exhaust_gain: 0, mechanical_gain: 0, rotation_whirr_hz: 0, rotation_whirr_gain: 0, propeller_gain: 0,
  noise_cutoff_hz: 300, wind_gain: 0, wind_cutoff_hz: 400, wind_whistle_hz: 0, wind_whistle_gain: 0,
  frame_step: -1, frame_t_s: -1, ground_available: false, wheel_contact_mask: 0, rolling_gain: 0,
  rolling_cutoff_hz: 300, touchdown_gain: 0, alert_available: false, alert_sequence: 0 });
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Original procedural timbre, not an acoustic calibration or recorded aircraft.
 * Four-cylinder four-stroke firing and two-blade passage each occur twice/rev.
 * Gain curves/filter ranges are sound-design choices; none changes simulation.
 */
export function engineAudioParameters(state: Readonly<FlightState> | null): EngineAudioParameters {
  const result = { ...SILENT };
  if (!state) return result;
  if (Number.isInteger(state.step) && state.step >= 0 && Number.isFinite(state.t_s) && state.t_s >= 0) {
    result.frame_step = state.step; result.frame_t_s = state.t_s;
    if (state.kap_alert_state !== undefined && state.kap_alert_sequence !== undefined && validAlertState(state)) {
      result.valid = result.alert_available = true;
      result.alert_sequence = state.kap_alert_sequence;
    }
    const wheels = ['nose', 'left', 'right'] as const;
    if ([state.ground_forward_mps, state.ground_side_mps].every(value => typeof value === 'number' && Number.isFinite(value))
      && wheels.every(wheel => [0, 1].includes(state[`gear_${wheel}_wow`]!)
        && typeof state[`gear_${wheel}_load_n`] === 'number' && Number.isFinite(state[`gear_${wheel}_load_n`]) && state[`gear_${wheel}_load_n`]! >= 0)) {
      const motion = Math.hypot(state.ground_forward_mps!, state.ground_side_mps!);
      if (Number.isFinite(motion)) {
        result.valid = result.ground_available = true;
        result.wheel_contact_mask = wheels.reduce((mask, wheel, index) => mask | (state[`gear_${wheel}_wow`] === 1 ? 1 << index : 0), 0);
        const load = wheels.reduce((sum, wheel) => sum + (state[`gear_${wheel}_wow`] === 1 ? Math.min(1e6, state[`gear_${wheel}_load_n`]!) : 0), 0);
        // Saturation and load/speed gain curves are original sound design only.
        const loading = -Math.expm1(-load / 10000);
        result.rolling_gain = result.wheel_contact_mask ? .12 * clamp(motion / 40, 0, 1) * loading : 0;
        result.rolling_cutoff_hz = 300 + 1700 * clamp(motion / 40, 0, 1);
        result.touchdown_gain = .04 + .08 * loading;
      }
    }
  }
  if (Number.isFinite(state.tas_mps) && state.tas_mps >= 0) {
    // Original sound-design envelope/filter range, not aerodynamic coefficients
    // or an acoustic calibration. TAS is airflow speed, not groundspeed/RPM.
    const airflow = clamp(state.tas_mps / 80, 0, 1);
    result.valid = true;
    result.wind_gain = .14 * Math.pow(airflow, 1.3);
    result.wind_cutoff_hz = 400 + 2200 * airflow;
    result.wind_whistle_hz = 2200 * airflow;
    // Whistle onset is a sound-design choice, not an aircraft speed limit.
    result.wind_whistle_gain = .10 * Math.pow(clamp((state.tas_mps - 35) / 45, 0, 1), 2);
  }
  if (![state.prop_radps, state.manifold_pressure_pa, state.fuel_flow_m3ps]
    .every(value => typeof value === 'number' && Number.isFinite(value))
    || state.prop_radps! < 0 || state.manifold_pressure_pa! <= 0 || state.fuel_flow_m3ps! < 0) return result;
  const rps = state.prop_radps! / (2 * Math.PI);
  const rpm = rps * 60;
  if (!Number.isFinite(rpm)) return result;
  // Audio-frequency ceiling only: prevents invalid/extreme telemetry creating
  // ultrasonic fundamentals. The reported RPM remains the actual model value.
  const rotation = Math.min(rps, 200);
  // A steeper sound-design envelope keeps idle quieter than upper RPM without
  // treating requested throttle as actual engine output or changing physics.
  const rotationGain = Math.pow(clamp(rps / 45, 0, 1), 1.7);
  const load = clamp(state.manifold_pressure_pa! / 101325, 0, 1);
  const fuel = state.fuel_flow_m3ps!;
  // Current engines expose actual running state; older engines retain the fuel
  // proxy. A requested start/stop command never establishes combustion sound.
  const combustion = (state.engine_running === undefined || state.engine_running === 1) && fuel > 0
    ? 1 / (1 + 3e-6 / fuel) : 0;
  return { ...result, valid: true, rpm, rotation_hz: rotation, firing_hz: rotation * 2, blade_pass_hz: rotation * 2,
    exhaust_gain: .36 * rotationGain * (.4 + .6 * load) * combustion,
    mechanical_gain: .045 * rotationGain,
    // An audible rotational harmonic makes actual starter/coast RPM changes
    // perceptible even when combustion stops and the fundamental is sub-bass.
    // Harmonic/envelope are original timbre choices, not a modeled gear ratio.
    rotation_whirr_hz: rotation * 12,
    rotation_whirr_gain: .035 * Math.pow(clamp(rps / 45, 0, 1), .75),
    propeller_gain: .1 * rotationGain,
    noise_cutoff_hz: clamp(600 + rotation * 28 + load * 1000, 300, 5000) };
}
