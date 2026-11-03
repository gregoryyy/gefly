import type { FlightState } from './types';

export interface PracticeEvent {
  kind: 'liftoff' | 'touchdown' | 'stopped' | 'collision';
  t_s: number;
  groundspeed_mps?: number;
  /** Positive upwards, opposite the native ground_down_mps observation. */
  vertical_speed_mps?: number;
}
export interface PracticeProgress {
  phase: 'waiting' | 'ground' | 'airborne' | 'landed' | 'stopped' | 'collision' | 'unavailable';
  events: readonly PracticeEvent[];
}

/** Experimental observation policy, not aircraft limits or a landing grade. */
export const RUNWAY_PRACTICE_POLICY = Object.freeze({
  contactDwell_s: .5, stopDwell_s: 2, stoppedBelow_mps: .5,
  maximumFrameGap_s: .5, maximumEvents: 20,
});
interface Observation {
  step: number; t_s: number; grounded: boolean;
  groundspeed_mps: number; vertical_speed_mps: number;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
function observation(state: Readonly<FlightState>): Observation | null {
  const wheels = [state.gear_nose_wow, state.gear_left_wow, state.gear_right_wow];
  if (!Number.isSafeInteger(state.step) || state.step < 0 || !finite(state.t_s) || state.t_s < 0
      || !wheels.every(wow => wow === 0 || wow === 1)
      || !finite(state.ground_forward_mps) || !finite(state.ground_side_mps) || !finite(state.ground_down_mps)
      || !Number.isSafeInteger(state.structure_contact_mask) || state.structure_contact_mask! < 0 || state.structure_contact_mask! > 7
      || state.collision_mask !== undefined && (!Number.isSafeInteger(state.collision_mask) || state.collision_mask < 0 || state.collision_mask > 127)) return null;
  const groundspeed_mps = Math.hypot(state.ground_forward_mps, state.ground_side_mps);
  if (!finite(groundspeed_mps)) return null;
  return { step: state.step, t_s: state.t_s, grounded: wheels.some(wow => wow === 1),
    groundspeed_mps, vertical_speed_mps: -state.ground_down_mps };
}
const positiveMask = (value: unknown, maximum: number): boolean => Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= maximum;

/** Consume actual worker samples in simulation time, never interpolated Review
 * frames. Reset for a new flight. Missing data and gaps break continuity; the
 * next valid sample establishes a baseline without inventing an unseen event.
 * Touchdown means any wheel contact; liftoff means all three wheels airborne.
 * Neither event establishes runway location, safe handling or training success.
 */
export function createRunwayPracticeMonitor(): {
  reset(): void;
  update(state: Readonly<FlightState>): PracticeProgress;
  snapshot(): PracticeProgress;
} {
  let phase: PracticeProgress['phase'] = 'waiting';
  let events: PracticeEvent[] = [];
  let previous: { step: number; t_s: number } | null = null;
  let grounded: boolean | null = null;
  let contactCandidate: Observation | null = null;
  let stopCandidate: Observation | null = null;
  let collisionLatched = false;
  const snapshot = (): PracticeProgress => ({ phase, events: events.map(event => ({ ...event })) });
  function reset(): void {
    phase = 'waiting'; events = []; previous = null; grounded = null;
    contactCandidate = null; stopCandidate = null; collisionLatched = false;
  }
  function breakContinuity(): void {
    grounded = null; contactCandidate = null; stopCandidate = null;
  }
  function record(kind: PracticeEvent['kind'], sample: Observation): void {
    events.push({ kind, t_s: sample.t_s, groundspeed_mps: sample.groundspeed_mps,
      vertical_speed_mps: sample.vertical_speed_mps });
    if (events.length > RUNWAY_PRACTICE_POLICY.maximumEvents) events.shift();
  }
  return { reset, snapshot,
    update(state) {
      if (previous && finite(state.t_s) && Number.isSafeInteger(state.step)
          && (state.t_s < previous.t_s || state.step < previous.step)) reset();
      if (collisionLatched) {
        if (finite(state.t_s) && state.t_s >= 0 && Number.isSafeInteger(state.step) && state.step >= 0)
          previous = { step: state.step, t_s: state.t_s };
        return snapshot();
      }
      // A valid native collision is decisive even if another telemetry group is
      // absent. Do not invent speed values merely to make the event complete.
      if (Number.isSafeInteger(state.step) && state.step >= 0 && finite(state.t_s) && state.t_s >= 0
          && (!previous || state.t_s !== previous.t_s && state.step !== previous.step)
          && (positiveMask(state.structure_contact_mask, 7) || positiveMask(state.collision_mask, 127))) {
        const event: PracticeEvent = { kind: 'collision', t_s: state.t_s };
        if (finite(state.ground_forward_mps) && finite(state.ground_side_mps)) {
          const speed = Math.hypot(state.ground_forward_mps, state.ground_side_mps);
          if (finite(speed)) event.groundspeed_mps = speed;
        }
        if (finite(state.ground_down_mps)) event.vertical_speed_mps = -state.ground_down_mps;
        events.push(event); if (events.length > RUNWAY_PRACTICE_POLICY.maximumEvents) events.shift();
        phase = 'collision'; collisionLatched = true; breakContinuity();
        previous = { step: state.step, t_s: state.t_s }; return snapshot();
      }
      const sample = observation(state);
      if (!sample) {
        breakContinuity(); phase = 'unavailable';
        if (finite(state.t_s) && state.t_s >= 0 && Number.isSafeInteger(state.step) && state.step >= 0)
          previous = { step: state.step, t_s: state.t_s };
        return snapshot();
      }
      if (previous && (sample.t_s === previous.t_s || sample.step === previous.step)) return snapshot();
      if (previous && sample.t_s - previous.t_s > RUNWAY_PRACTICE_POLICY.maximumFrameGap_s) breakContinuity();
      previous = sample;
      if (grounded === null) {
        grounded = sample.grounded; phase = grounded ? 'ground' : 'airborne';
      } else if (sample.grounded === grounded) {
        contactCandidate = null;
      } else {
        contactCandidate ??= sample;
        if (sample.t_s - contactCandidate.t_s >= RUNWAY_PRACTICE_POLICY.contactDwell_s) {
          grounded = sample.grounded;
          record(grounded ? 'touchdown' : 'liftoff', contactCandidate);
          phase = grounded ? 'landed' : 'airborne';
          contactCandidate = null; stopCandidate = null;
        }
      }
      // Initial parking never becomes a landing/stop. A wheel bounce interrupts
      // stop timing even while the contact-transition debounce is pending.
      if (phase === 'landed' && sample.grounded && sample.groundspeed_mps < RUNWAY_PRACTICE_POLICY.stoppedBelow_mps) {
        stopCandidate ??= sample;
        if (sample.t_s - stopCandidate.t_s >= RUNWAY_PRACTICE_POLICY.stopDwell_s) {
          record('stopped', stopCandidate); phase = 'stopped'; stopCandidate = null;
        }
      } else stopCandidate = null;
      return snapshot();
    },
  };
}
