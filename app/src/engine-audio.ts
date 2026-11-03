import type { FlightState } from './types';
import { engineAudioParameters, type EngineAudioParameters } from './engine-audio-parameters.ts';

export interface EngineAudioStatus {
  supported: boolean;
  unlocked: boolean;
  muted: boolean;
  volume: number;
  state: 'locked' | 'ready' | 'playing' | 'muted' | 'unavailable' | 'disposed';
}
export interface EngineAudioGraph {
  update(parameters: EngineAudioParameters, volume: number, active: boolean): void;
  hasContactSound(): boolean;
  hasAlertSound(): boolean;
  dispose(): void;
}
/**
 * Visible sound status. The default state is muted and locked; it shows how to
 * enable sound (S) instead of a bare "Muted" (R-AUDIO-1).
 */
export function audioStatusLabel(status: EngineAudioStatus): string {
  if (!status.supported || status.state === 'disposed') return 'Unavailable';
  if (status.state === 'unavailable') return 'Activation unavailable · retry sound button';
  if (!status.unlocked) return status.muted ? 'Sound off · press S to enable' : 'Press S to enable';
  if (status.muted) return 'Muted · press S to unmute';
  if (status.volume === 0) return 'Volume 0%';
  return status.state === 'playing' ? 'Playing' : 'Ready · paused';
}

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

/** The same fixed original graph is used for playback and offline audio review. */
export function createEngineAudioGraph(context: BaseAudioContext): EngineAudioGraph {
  const nodes: AudioNode[] = [];
  const remember = <T extends AudioNode>(node: T): T => { nodes.push(node); return node; };
  const gain = () => remember(context.createGain());
  const oscillator = () => remember(context.createOscillator());
  const exhaust = oscillator(), mechanical = oscillator(), bladePulse = oscillator(), rotationWhirr = oscillator(), alertTone = oscillator();
  const exhaustGain = gain(), mechanicalGain = gain(), propellerGain = gain(), windGain = gain(), whistleGain = gain(), modulation = gain(), master = gain();
  const exhaustFilter = remember(context.createBiquadFilter());
  const propFilter = remember(context.createBiquadFilter());
  const windFilter = remember(context.createBiquadFilter()), windHighpass = remember(context.createBiquadFilter());
  const windWhistle = remember(context.createBiquadFilter());
  const rollingFilter = remember(context.createBiquadFilter()), contactFilter = remember(context.createBiquadFilter());
  const rollingGain = gain(), contactGain = gain();
  const rotationWhirrGain = gain();
  const alertGain = gain();
  const compressor = remember(context.createDynamicsCompressor());
  const noise = remember(context.createBufferSource()), windNoise = remember(context.createBufferSource());
  const exhaustWave = new Float32Array(33), exhaustPhase = new Float32Array(33);
  for (let harmonic = 1; harmonic < exhaustWave.length; harmonic++) {
    exhaustWave[harmonic] = Math.exp(-harmonic * .075) / Math.pow(harmonic, .8);
    exhaustPhase[harmonic] = .15 * Math.sin(harmonic * 1.7) / harmonic;
  }
  exhaust.setPeriodicWave(context.createPeriodicWave(exhaustPhase, exhaustWave));
  mechanical.type = 'triangle'; bladePulse.type = 'sine'; rotationWhirr.type = 'sine';
  // Original warning timbre/timing, not a calibrated installed KAP140 sound.
  alertTone.type = 'sine'; alertTone.frequency.value = 880;
  windWhistle.type = 'bandpass'; windWhistle.Q.value = 2.5;
  exhaustFilter.type = 'lowpass'; exhaustFilter.Q.value = .65;
  propFilter.type = 'lowpass'; propFilter.Q.value = .65;
  windFilter.type = 'lowpass'; windFilter.Q.value = .55;
  windHighpass.type = 'highpass'; windHighpass.frequency.value = 120; windHighpass.Q.value = .55;
  rollingFilter.type = 'lowpass'; rollingFilter.Q.value = .6;
  contactFilter.type = 'lowpass'; contactFilter.frequency.value = 260; contactFilter.Q.value = .6;
  function noiseBuffer(initialSeed: number): AudioBuffer {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = initialSeed;
    for (let i = 0; i < samples.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      samples[i] = (seed >>> 0) / 2147483648 - 1;
    }
    return buffer;
  }
  noise.buffer = noiseBuffer(0x172c172); noise.loop = true;
  windNoise.buffer = noiseBuffer(0x175af41); windNoise.loop = true;
  // Propeller passage modulates broadband airflow instead of adding a plain tone.
  modulation.gain.value = .25;
  const propEnvelope = gain(); propEnvelope.gain.value = .75;
  bladePulse.connect(modulation); modulation.connect(propEnvelope.gain);
  noise.connect(propFilter); propFilter.connect(propEnvelope); propEnvelope.connect(propellerGain);
  exhaust.connect(exhaustFilter); exhaustFilter.connect(exhaustGain);
  mechanical.connect(mechanicalGain);
  rotationWhirr.connect(rotationWhirrGain); rotationWhirrGain.connect(compressor);
  alertTone.connect(alertGain); alertGain.connect(compressor);
  // Airflow is independent of engine rotation/fuel and propeller modulation.
  windNoise.connect(windHighpass); windHighpass.connect(windFilter); windFilter.connect(windGain);
  windNoise.connect(windWhistle); windWhistle.connect(whistleGain); whistleGain.connect(compressor);
  noise.connect(rollingFilter); rollingFilter.connect(rollingGain); rollingGain.connect(compressor);
  noise.connect(contactFilter); contactFilter.connect(contactGain); contactGain.connect(compressor);
  exhaustGain.connect(compressor); mechanicalGain.connect(compressor); propellerGain.connect(compressor);
  windGain.connect(compressor);
  compressor.threshold.value = -18; compressor.knee.value = 14; compressor.ratio.value = 3;
  compressor.attack.value = .003; compressor.release.value = .15;
  compressor.connect(master); master.connect(context.destination);
  exhaustGain.gain.value = mechanicalGain.gain.value = rotationWhirrGain.gain.value = propellerGain.gain.value = windGain.gain.value = whistleGain.gain.value = rollingGain.gain.value = contactGain.gain.value = alertGain.gain.value = master.gain.value = 0;
  exhaust.frequency.value = mechanical.frequency.value = rotationWhirr.frequency.value = bladePulse.frequency.value = windWhistle.frequency.value = 0;
  exhaust.start(); mechanical.start(); rotationWhirr.start(); bladePulse.start(); alertTone.start(); noise.start(); windNoise.start();
  const targets = new Map<AudioParam, number>();
  let disposed = false;
  let previousGround: { step: number; time_s: number; mask: number } | null = null;
  let contactEnd_s = 0;
  let previousAlert: { step: number; time_s: number; sequence: number } | null = null;
  let alertEnd_s = 0;
  function resetAlert(): void {
    if (previousAlert || alertEnd_s > 0) {
      alertGain.gain.cancelScheduledValues(context.currentTime); alertGain.gain.setValueAtTime(0, context.currentTime);
    }
    previousAlert = null; alertEnd_s = 0;
  }
  function resetContact(): void {
    if (previousGround || contactEnd_s > 0) {
      contactGain.gain.cancelScheduledValues(context.currentTime); contactGain.gain.setValueAtTime(0, context.currentTime);
    }
    previousGround = null;
    contactEnd_s = 0;
  }
  function smooth(parameter: AudioParam, value: number): void {
    if (targets.get(parameter) === value) return;
    targets.set(parameter, value);
    parameter.setTargetAtTime(value, context.currentTime, .015);
  }
  return {
    update(parameters, volume, active) {
      if (disposed) return;
      const finite = Object.values(parameters).every(value => typeof value !== 'number' || Number.isFinite(value));
      const audible = active && parameters.valid && finite && Number.isFinite(volume);
      smooth(master.gain, audible ? clampVolume(volume) * .8 : 0);
      if (!audible || volume <= 0 || !parameters.alert_available) resetAlert();
      else {
        const previous = previousAlert;
        const newFrame = !previous || previous.step !== parameters.frame_step || previous.time_s !== parameters.frame_t_s || previous.sequence !== parameters.alert_sequence;
        if (newFrame) {
          const continuous = previous && parameters.frame_step > previous.step && parameters.frame_t_s > previous.time_s
            && parameters.frame_t_s - previous.time_s <= .25 && parameters.alert_sequence >= previous.sequence;
          if (previous && !continuous) resetAlert();
          if (continuous && parameters.alert_sequence > previous.sequence) {
            // Coalesce counter jumps into one bounded pattern, never queue an
            // arbitrary backlog. Five80ms tones have100ms gaps; sound design.
            const now = context.currentTime;
            alertGain.gain.cancelScheduledValues(now); alertGain.gain.setValueAtTime(0, now);
            for (let pulse = 0; pulse < 5; pulse++) {
              const start = now + pulse * .18;
              alertGain.gain.setValueAtTime(0, start);
              alertGain.gain.linearRampToValueAtTime(.08, start + .004);
              alertGain.gain.setValueAtTime(.08, start + .076);
              alertGain.gain.linearRampToValueAtTime(0, start + .08);
            }
            alertEnd_s = now + .8;
          }
          previousAlert = { step: parameters.frame_step, time_s: parameters.frame_t_s, sequence: parameters.alert_sequence };
        }
      }
      if (!audible || volume <= 0 || !parameters.ground_available) resetContact();
      else {
        const previous = previousGround;
        const newFrame = !previous || previous.step !== parameters.frame_step || previous.time_s !== parameters.frame_t_s;
        if (newFrame) {
          // A first frame, backward seek or long presentation gap establishes a
          // baseline. The 250 ms continuity guard is audio policy, not physics.
          const continuous = previous && parameters.frame_step > previous.step
            && parameters.frame_t_s > previous.time_s && parameters.frame_t_s - previous.time_s <= .25;
          if (previous && !continuous) resetContact();
          const newlyContacting = continuous ? parameters.wheel_contact_mask & ~previous.mask : 0;
          if (newlyContacting) {
            const count = [1, 2, 4].filter(bit => newlyContacting & bit).length;
            const amount = Math.min(.18, parameters.touchdown_gain * Math.sqrt(count)), now = context.currentTime;
            contactGain.gain.cancelScheduledValues(now); contactGain.gain.setValueAtTime(0, now);
            contactGain.gain.linearRampToValueAtTime(amount, now + .003);
            contactGain.gain.exponentialRampToValueAtTime(.00001, now + .18);
            contactGain.gain.setValueAtTime(0, now + .2);
            contactEnd_s = now + .2;
          }
          previousGround = { step: parameters.frame_step, time_s: parameters.frame_t_s, mask: parameters.wheel_contact_mask };
        }
      }
      if (!parameters.valid || !finite) return;
      smooth(exhaust.frequency, Math.min(400, Math.max(0, parameters.firing_hz)));
      smooth(mechanical.frequency, Math.min(200, Math.max(0, parameters.rotation_hz)));
      smooth(rotationWhirr.frequency, Math.min(2400, Math.max(0, parameters.rotation_whirr_hz)));
      smooth(bladePulse.frequency, Math.min(400, Math.max(0, parameters.blade_pass_hz)));
      smooth(exhaustGain.gain, Math.min(.36, Math.max(0, parameters.exhaust_gain)));
      smooth(mechanicalGain.gain, Math.min(.045, Math.max(0, parameters.mechanical_gain)));
      smooth(rotationWhirrGain.gain, Math.min(.035, Math.max(0, parameters.rotation_whirr_gain)));
      smooth(propellerGain.gain, Math.min(.1, Math.max(0, parameters.propeller_gain)));
      smooth(windGain.gain, Math.min(.14, Math.max(0, parameters.wind_gain)));
      smooth(windWhistle.frequency, Math.min(2200, Math.max(0, parameters.wind_whistle_hz)));
      smooth(whistleGain.gain, Math.min(.10, Math.max(0, parameters.wind_whistle_gain)));
      smooth(exhaustFilter.frequency, Math.min(5000, Math.max(300, parameters.noise_cutoff_hz)));
      smooth(propFilter.frequency, Math.min(2200, Math.max(200, parameters.noise_cutoff_hz * .55)));
      smooth(windFilter.frequency, Math.min(2600, Math.max(400, parameters.wind_cutoff_hz)));
      smooth(rollingGain.gain, Math.min(.12, Math.max(0, parameters.rolling_gain)));
      smooth(rollingFilter.frequency, Math.min(2000, Math.max(300, parameters.rolling_cutoff_hz)));
    },
    hasContactSound() { return !disposed && context.currentTime < contactEnd_s; },
    hasAlertSound() { return !disposed && context.currentTime < alertEnd_s; },
    dispose() {
      if (disposed) return;
      disposed = true;
      master.gain.cancelScheduledValues(context.currentTime); master.gain.setValueAtTime(0, context.currentTime);
      for (const source of [exhaust, mechanical, rotationWhirr, bladePulse, alertTone, noise, windNoise]) source.stop();
      for (const node of nodes) node.disconnect();
    },
  };
}

/** No context, permission request or sound is created before explicit unlock(). */
/** Bound for one resume() attempt. Browsers may leave resume() pending without activation. */
export const AUDIO_RESUME_TIMEOUT_MS = 3000;

export function createEngineAudio(options: {
  onStatus?: (status: EngineAudioStatus) => void;
  /** Test seam; defaults to the browser AudioContext. */
  AudioContext?: typeof AudioContext | null;
  resumeTimeout_ms?: number;
} = {}): {
  unlock(): Promise<void>;
  update(state: Readonly<FlightState> | null, playing: boolean): void;
  setMuted(value: boolean): void;
  setVolume(value: number): void;
  getStatus(): EngineAudioStatus;
  dispose(): void;
} {
  const AudioContextConstructor = options.AudioContext !== undefined ? options.AudioContext ?? undefined : globalThis.AudioContext
    ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const resumeTimeout_ms = Number.isFinite(options.resumeTimeout_ms) && options.resumeTimeout_ms! > 0 ? options.resumeTimeout_ms! : AUDIO_RESUME_TIMEOUT_MS;
  let context: AudioContext | null = null, graph: EngineAudioGraph | null = null;
  let unlocking: Promise<void> | null = null;
  let parameters = engineAudioParameters(null), playing = false, muted = true, volume = .3;
  let disposed = false, failed = false, lastStatus = '';
  const status = (): EngineAudioStatus => {
    const unlocked = context?.state === 'running';
    return { supported: !!AudioContextConstructor, unlocked, muted, volume,
      state: disposed ? 'disposed' : (!AudioContextConstructor || failed) ? 'unavailable' : !unlocked ? 'locked'
        : muted || volume === 0 ? 'muted' : playing && parameters.valid
          && (parameters.rotation_hz > 0 || parameters.wind_gain > 0 || parameters.rolling_gain > 0 || graph?.hasContactSound() || graph?.hasAlertSound()) ? 'playing' : 'ready' };
  };
  function notify(): void {
    const current = status(), signature = JSON.stringify(current);
    if (signature !== lastStatus) { lastStatus = signature; options.onStatus?.(current); }
  }
  function apply(): void { graph?.update(parameters, volume, playing && !muted && !failed && !disposed && context?.state === 'running'); notify(); }
  // A late resume() that finally runs clears an earlier timeout/failure.
  function stateChanged(): void { if (context?.state === 'running') failed = false; apply(); }
  function resumeBounded(target: AudioContext): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('AudioContext.resume() did not settle')), resumeTimeout_ms);
      target.resume().then(() => { clearTimeout(timer); resolve(); }, error => { clearTimeout(timer); reject(error); });
    });
  }
  notify();
  return {
    unlock() {
      if (disposed || !AudioContextConstructor) return Promise.resolve();
      const Constructor = AudioContextConstructor;
      if (unlocking) {
        // Each trusted retry asks the existing context again; a pending first
        // attempt is also bounded by resumeTimeout_ms, so retry never sticks.
        if (context && context.state !== 'running') void context.resume().catch(() => {});
        return unlocking;
      }
      async function attempt(): Promise<void> {
        try {
          if (!context) {
            const candidate = new Constructor();
            try {
              graph = createEngineAudioGraph(candidate);
            } catch (error) {
              // Closing also releases nodes from a partially constructed graph.
              // Finish cleanup before another explicit unlock may create one.
              await candidate.close().catch(() => {});
              throw error;
            }
            context = candidate;
            context.addEventListener('statechange', stateChanged);
          }
          await resumeBounded(context);
          if (disposed) return;
          failed = context.state !== 'running';
        } catch { failed = true; }
        apply();
      }
      unlocking = attempt().finally(() => { unlocking = null; });
      return unlocking;
    },
    update(state, active) { if (disposed) return; parameters = engineAudioParameters(state); playing = active; apply(); },
    setMuted(value) { if (disposed) return; muted = value; apply(); },
    setVolume(value) { if (disposed || !Number.isFinite(value)) return; volume = clampVolume(value); apply(); },
    getStatus: status,
    dispose() {
      if (disposed) return;
      disposed = true; playing = false;
      context?.removeEventListener('statechange', stateChanged);
      graph?.dispose(); graph = null;
      if (context) void context.close().catch(() => {});
      notify();
    },
  };
}
