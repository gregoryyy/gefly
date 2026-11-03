import { RADIO_NAV_FIELDS, validRadioNavSnapshot } from './radio-nav.ts';
import { ALERT_FIELDS, validAlertState, KAP_FIELDS, validKapState, TERRAIN_FIELDS, validTerrainState, COLLISION_FIELDS, validCollisionState, STALL_FIELDS, validStallState, CONTROL_FIELDS, validControlState, ALTIMETER_FIELDS, COCKPIT_FIELDS, ENGINE_FIELDS, ENGINE_SWITCH_FIELDS, PITCH_TRIM_FIELDS, GROUND_FIELDS, validGroundState, validPitchTrimState, validAltimeterState, validCockpitState, validEngineState } from './types.ts';
import type { FlightState } from './types';
import { validSimulationRate } from '../../studies/e1-browser/sim/simulation-rate.js';

export interface TraceSample {
  readonly state: Readonly<FlightState>;
  readonly vertical_speed_mps: number;
}

export interface TraceBounds {
  readonly start_s: number;
  readonly end_s: number;
  readonly count: number;
  readonly clipped: boolean;
}

const MAX_SAMPLES = 36_000;
const MAX_DURATION_S = 600;
export const MAX_RECORDING_BYTES = 256 * 1024 * 1024;

/** Bounded, session-only recorded states. Seeking never re-simulates physics. */
export class FlightTrace {
  private readonly samples: (TraceSample | undefined)[];
  private readonly maxDuration_s: number;
  private head = 0;
  private count = 0;
  private clipped = false;

  constructor(options: { maxSamples?: number; maxDuration_s?: number } = {}) {
    const maxSamples = options.maxSamples ?? MAX_SAMPLES;
    const maxDuration_s = options.maxDuration_s ?? MAX_DURATION_S;
    if (!Number.isInteger(maxSamples) || maxSamples < 2 || maxSamples > MAX_SAMPLES) {
      throw new RangeError(`maxSamples must be an integer from 2 to ${MAX_SAMPLES}`);
    }
    if (!Number.isFinite(maxDuration_s) || maxDuration_s <= 0 || maxDuration_s > MAX_DURATION_S) {
      throw new RangeError(`maxDuration_s must be greater than 0 and at most ${MAX_DURATION_S}`);
    }
    this.samples = new Array(maxSamples);
    this.maxDuration_s = maxDuration_s;
  }

  record(state: FlightState, vertical_speed_mps: number): boolean {
    if (!state || typeof state !== 'object' || !Number.isFinite(vertical_speed_mps) || !validAltimeterState(state) || !validCockpitState(state) || !validEngineState(state) || !validPitchTrimState(state) || !validGroundState(state) || !validControlState(state) || !validStallState(state) || !validCollisionState(state) || !validTerrainState(state) || !validKapState(state) || !validAlertState(state)
      || (RADIO_NAV_FIELDS.some(key => state[key] !== undefined) && !validRadioNavSnapshot(state))
      || (state.simulation_rate !== undefined && !validSimulationRate(state.simulation_rate))) return false;
    const snapshot: FlightState = {
      step: state.step, t_s: state.t_s, lat_rad: state.lat_rad, lon_rad: state.lon_rad,
      alt_msl_m: state.alt_msl_m, roll_rad: state.roll_rad, pitch_rad: state.pitch_rad,
      heading_rad: state.heading_rad, tas_mps: state.tas_mps,
      ...(state.simulation_rate === undefined ? {} : { simulation_rate: state.simulation_rate }),
    };
    for (const key of [...ALERT_FIELDS, ...KAP_FIELDS, ...TERRAIN_FIELDS, ...COLLISION_FIELDS, ...STALL_FIELDS, ...CONTROL_FIELDS, ...ALTIMETER_FIELDS, ...COCKPIT_FIELDS, ...ENGINE_FIELDS, ...ENGINE_SWITCH_FIELDS, ...PITCH_TRIM_FIELDS, ...GROUND_FIELDS, ...RADIO_NAV_FIELDS]) if (state[key] !== undefined) snapshot[key] = state[key];
    if (!Object.values(snapshot).every((value) => typeof value === 'number' && Number.isFinite(value))
      || !Number.isInteger(snapshot.step) || snapshot.step < 0 || snapshot.t_s < 0
      || snapshot.tas_mps < 0 || Math.abs(snapshot.lat_rad) > Math.PI / 2
      || Math.abs(snapshot.lon_rad) > Math.PI) return false;
    if (this.count > 0) {
      const latest = this.sample(this.count - 1).state;
      if (snapshot.step === latest.step && snapshot.t_s === latest.t_s
        && ['simulation_rate','altimeter_setting_pa','ap_mode','ap_heading_target_rad', ...ALERT_FIELDS, ...KAP_FIELDS, ...RADIO_NAV_FIELDS]
          .some(key => snapshot[key as keyof FlightState] !== latest[key as keyof FlightState])) {
        // A paused setting/mode change replaces only the last instrument snapshot. Old
        // samples remain immutable; physics, environment and recorded VSI cannot change.
        const fixed = Object.keys({ ...latest, ...snapshot }).filter((key) => !['simulation_rate','altimeter_setting_pa', 'altimeter_indicated_m','ap_mode','ap_heading_target_rad','ap_aileron_norm', ...ALERT_FIELDS, ...KAP_FIELDS, ...RADIO_NAV_FIELDS].includes(key)) as (keyof FlightState)[];
        if (!fixed.every((key) => snapshot[key] === latest[key])) return false;
        const index = (this.head + this.count - 1) % this.samples.length;
        this.samples[index] = Object.freeze({ state: Object.freeze(snapshot), vertical_speed_mps: this.sample(this.count - 1).vertical_speed_mps });
        return true;
      }
      if (snapshot.step <= latest.step || snapshot.t_s <= latest.t_s) return false;
    }

    if (this.count === this.samples.length) this.evict();
    this.samples[(this.head + this.count) % this.samples.length] = Object.freeze({
      state: Object.freeze(snapshot), vertical_speed_mps,
    });
    this.count++;
    while (this.count > 1 && snapshot.t_s - this.sample(0).state.t_s > this.maxDuration_s) {
      this.evict();
    }
    return true;
  }

  clear(): void {
    this.samples.fill(undefined);
    this.head = 0;
    this.count = 0;
    this.clipped = false;
  }

  bounds(): TraceBounds | null {
    if (this.count === 0) return null;
    return Object.freeze({
      start_s: this.sample(0).state.t_s, end_s: this.sample(this.count - 1).state.t_s,
      count: this.count, clipped: this.clipped,
    });
  }

  /** Portable SI state trace, for viewing only; not a native physics checkpoint. */
  exportJSON(): string {
    if (this.count < 2) throw new Error('Record a flight before saving it.');
    return JSON.stringify({ format: 'gefly-flight-recording', version: 1, units: 'SI',
      clipped: this.clipped, samples: Array.from({ length: this.count }, (_, index) => this.sample(index)) });
  }

  static fromJSON(text: string): FlightTrace {
    if (text.length > MAX_RECORDING_BYTES) throw new Error('Recording exceeds the 256 MB limit.');
    const data = JSON.parse(text);
    if (!data || data.format !== 'gefly-flight-recording' || data.version !== 1 || data.units !== 'SI'
      || typeof data.clipped !== 'boolean' || !Array.isArray(data.samples)
      || data.samples.length < 2 || data.samples.length > MAX_SAMPLES) {
      throw new Error('Unsupported recording. Expected a Gefly version 1 JSON flight recording.');
    }
    const trace = new FlightTrace();
    let previousStep = -1, previousTime = -1;
    for (const sample of data.samples) {
      const state = sample?.state;
      if (!state || typeof state !== 'object' || Array.isArray(state)
        || state.step <= previousStep || state.t_s <= previousTime
        || Math.abs(state.alt_msl_m) > 1e6 || Math.abs(state.ground_height_ellipsoid_m ?? 0) > 1e6
        || (state.terrain_profile === 1 && !Number.isFinite(state.ground_height_ellipsoid_m))
        || !trace.record(state, sample.vertical_speed_mps)) {
        throw new Error('Recording contains an invalid or out-of-order flight frame.');
      }
      previousStep = state.step; previousTime = state.t_s;
    }
    if (trace.count !== data.samples.length) throw new Error('Recording exceeds the ten-minute trace limit.');
    trace.clipped = data.clipped;
    return trace;
  }

  *recordedStates(): IterableIterator<Readonly<FlightState>> {
    for (let index = 0; index < this.count; index++) yield this.sample(index).state;
  }

  /** Floor seek, allowing only floating-point serialization noise at a stored timestamp. */
  atTime(t_s: number): TraceSample | null {
    if (!Number.isFinite(t_s) || this.count === 0) return null;
    // A native range serializes doubles to decimal and can round just below an
    // exact stored frame. This tolerance is far smaller than a flight step.
    const tolerance_s = 8 * Number.EPSILON * Math.max(1, Math.abs(t_s));
    let low = 0;
    let high = this.count - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.sample(middle).state.t_s <= t_s + tolerance_s) low = middle;
      else high = middle - 1;
    }
    return this.sample(low);
  }

  /** Bounded plotting samples, including retained endpoints; never used for replay or physics. */
  sampledStates(maxPoints = 600): readonly Readonly<FlightState>[] {
    if (!Number.isInteger(maxPoints) || maxPoints < 2 || maxPoints > 1000) {
      throw new RangeError('maxPoints must be an integer from 2 to 1000');
    }
    const length = Math.min(this.count, maxPoints);
    const states: Readonly<FlightState>[] = [];
    for (let index = 0; index < length; index++) {
      const sampleIndex = length === 1 ? 0 : Math.floor(index * (this.count - 1) / (length - 1));
      states.push(this.sample(sampleIndex).state);
    }
    return Object.freeze(states);
  }

  private sample(index: number): TraceSample {
    return this.samples[(this.head + index) % this.samples.length]!;
  }

  private evict(): void {
    this.samples[this.head] = undefined;
    this.head = (this.head + 1) % this.samples.length;
    this.count--;
    this.clipped = true;
  }
}
