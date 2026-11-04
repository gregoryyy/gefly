import { validSystemsMask } from './aircraft-systems.ts';
import type { FlightState } from './types';

export interface SetupCheck {
  readonly id: string;
  readonly label: string;
  readonly expected: string;
  readonly observed: string;
  readonly status: 'match' | 'different' | 'unavailable' | 'unsupported';
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const norm = (value: unknown): value is number => finite(value) && value >= 0 && value <= 1;
const trim = (value: unknown): value is number => finite(value) && Math.abs(value) <= 1;
const rounded = (value: number, places: number): string => Number(value.toFixed(places)).toFixed(places);
function percent(value: number): string {
  if (value === 0 || value === 1) return `${value * 100}%`;
  // A tiny applied command must not read as exactly idle/full braking while its
  // sensed row correctly says different. These are display bounds, not assists.
  if (value * 100 < .1) return '<0.1%';
  if (value * 100 > 99.9) return '>99.9%';
  return `${(value * 100).toFixed(1)}%`;
}

/** Generic simulator initial configuration, not an aircraft preflight procedure.
 * Reads actual snapshot values only. A match says that this displayed condition
 * agrees with the simulator's starting setup; it never grades a pilot or checks
 * unsensed equipment. Missing legacy data stays unavailable. Re-evaluation has
 * no memory, control mutations, automatic confirmations or I/O.
 */
export function evaluatePracticeSetup(state: Readonly<FlightState> | null): readonly SetupCheck[] {
  const checks: SetupCheck[] = [];
  const add = (id: string, label: string, expected: string, available: boolean, matches: boolean, observed: string): void => {
    checks.push(Object.freeze({ id, label, expected, observed: available ? observed : 'Unavailable',
      status: available ? matches ? 'match' : 'different' : 'unavailable' }));
  };
  const engine = state?.engine_running;
  add('engine', 'Engine combustion', 'RUNNING', engine === 0 || engine === 1, engine === 1,
    engine === 1 ? 'RUNNING' : 'OFF');

  const left = state?.brake_left_norm, right = state?.brake_right_norm;
  const brakesAvailable = norm(left) && norm(right);
  add('brakes', 'Applied wheel brakes', 'L / R 100%', brakesAvailable, left === 1 && right === 1,
    brakesAvailable ? `L ${percent(left!)} / R ${percent(right!)}` : '');

  const throttle = state?.throttle_norm;
  add('throttle', 'Applied throttle', '0%', norm(throttle), throttle === 0,
    norm(throttle) ? percent(throttle) : '');

  const flap = state?.flap_rad;
  // Same supported actual-flap range as the native cockpit snapshot boundary;
  // its tiny endpoint allowance is serialization/numerical noise, not a setting.
  const flapAvailable = finite(flap) && flap >= -1e-6 && flap <= Math.PI / 6 + 1e-6;
  const flapDegrees = flapAvailable ? rounded(flap * 180 / Math.PI, 1) : null;
  add('flaps', 'Actual flaps', '0.0°', flapAvailable, flapDegrees === '0.0',
    flapDegrees === null ? '' : `${flapDegrees}°`);

  const actualTrim = state?.pitch_trim_norm, initialTrim = state?.pitch_trim_initial_norm;
  const trimAvailable = trim(actualTrim) && trim(initialTrim);
  const actualTrimText = trimAvailable ? rounded(actualTrim!, 3) : null;
  const initialTrimText = trimAvailable ? rounded(initialTrim!, 3) : null;
  add('trim', 'Trim (raw norm)', initialTrimText === null ? 'Initial setting' : `Initial ${initialTrimText}`,
    trimAvailable, actualTrimText === initialTrimText,
    actualTrimText === null ? '' : `Actual ${actualTrimText}`);

  const kap = state?.kap_engaged, legacy = state?.ap_mode;
  const autopilotAvailable = (kap === 0 || kap === 1) && (legacy === 0 || legacy === 1 || legacy === 2);
  add('autopilot', 'Autopilot', 'Both OFF', autopilotAvailable, kap === 0 && legacy === 0,
    autopilotAvailable ? `KAP ${kap ? 'ON' : 'OFF'} / legacy ${['OFF', 'WL', 'HDG'][legacy!]}` : '');

  const mask = state?.systems_switch_mask;
  const electricalAvailable = validSystemsMask(mask);
  add('electrical', 'Model electrical', 'BAT / ALT / AV ON', electricalAvailable,
    electricalAvailable && (mask & 7) === 7,
    electricalAvailable ? ['BAT', 'ALT', 'AV'].map((label, bit) => `${label} ${mask & (1 << bit) ? 'ON' : 'OFF'}`).join(' / ') : '');

  checks.push(Object.freeze({ id: 'pilot-cabin', label: 'Pilot / cabin checks', expected: 'Pilot confirmation',
    observed: 'Not sensed', status: 'unsupported' }));
  checks.push(Object.freeze({ id: 'fuel-runup', label: 'Fuel selector / run-up equipment', expected: 'Applicable procedure',
    observed: 'Not sensed', status: 'unsupported' }));
  return Object.freeze(checks);
}
