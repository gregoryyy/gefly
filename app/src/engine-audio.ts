import type { FlightState } from './types';
import { engineAudioParameters, type EngineAudioParameters } from './engine-audio-parameters';

export interface EngineAudioStatus {
  supported: boolean;
  unlocked: boolean;
  muted: boolean;
  volume: number;
  state: 'locked' | 'ready' | 'playing' | 'muted' | 'unavailable' | 'disposed';
}
export interface EngineAudioGraph {
  update(parameters: EngineAudioParameters, volume: number, active: boolean): void;
  dispose(): void;
}
const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

/** The same fixed original graph is used for playback and offline audio review. */
export function createEngineAudioGraph(context: BaseAudioContext): EngineAudioGraph {
  const nodes: AudioNode[] = [];
  const remember = <T extends AudioNode>(node: T): T => { nodes.push(node); return node; };
  const gain = () => remember(context.createGain());
  const oscillator = () => remember(context.createOscillator());
  const exhaust = oscillator(), mechanical = oscillator(), bladePulse = oscillator();
  const exhaustGain = gain(), mechanicalGain = gain(), propellerGain = gain(), modulation = gain(), master = gain();
  const exhaustFilter = remember(context.createBiquadFilter());
  const propFilter = remember(context.createBiquadFilter());
  const compressor = remember(context.createDynamicsCompressor());
  const noise = remember(context.createBufferSource());
  const exhaustWave = new Float32Array(33), exhaustPhase = new Float32Array(33);
  for (let harmonic = 1; harmonic < exhaustWave.length; harmonic++) {
    exhaustWave[harmonic] = Math.exp(-harmonic * .075) / Math.pow(harmonic, .8);
    exhaustPhase[harmonic] = .15 * Math.sin(harmonic * 1.7) / harmonic;
  }
  exhaust.setPeriodicWave(context.createPeriodicWave(exhaustPhase, exhaustWave));
  mechanical.type = 'triangle'; bladePulse.type = 'sine';
  exhaustFilter.type = 'lowpass'; exhaustFilter.Q.value = .65;
  propFilter.type = 'lowpass'; propFilter.Q.value = .65;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 0x172c172;
  for (let i = 0; i < samples.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    samples[i] = (seed >>> 0) / 2147483648 - 1;
  }
  noise.buffer = buffer; noise.loop = true;
  // Propeller passage modulates broadband airflow instead of adding a plain tone.
  modulation.gain.value = .25;
  const propEnvelope = gain(); propEnvelope.gain.value = .75;
  bladePulse.connect(modulation); modulation.connect(propEnvelope.gain);
  noise.connect(propFilter); propFilter.connect(propEnvelope); propEnvelope.connect(propellerGain);
  exhaust.connect(exhaustFilter); exhaustFilter.connect(exhaustGain);
  mechanical.connect(mechanicalGain);
  exhaustGain.connect(compressor); mechanicalGain.connect(compressor); propellerGain.connect(compressor);
  compressor.threshold.value = -18; compressor.knee.value = 14; compressor.ratio.value = 3;
  compressor.attack.value = .003; compressor.release.value = .15;
  compressor.connect(master); master.connect(context.destination);
  exhaustGain.gain.value = mechanicalGain.gain.value = propellerGain.gain.value = master.gain.value = 0;
  exhaust.frequency.value = mechanical.frequency.value = bladePulse.frequency.value = 0;
  exhaust.start(); mechanical.start(); bladePulse.start(); noise.start();
  const targets = new Map<AudioParam, number>();
  let disposed = false;
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
      if (!parameters.valid || !finite) return;
      smooth(exhaust.frequency, Math.min(400, Math.max(0, parameters.firing_hz)));
      smooth(mechanical.frequency, Math.min(200, Math.max(0, parameters.rotation_hz)));
      smooth(bladePulse.frequency, Math.min(400, Math.max(0, parameters.blade_pass_hz)));
      smooth(exhaustGain.gain, Math.min(.36, Math.max(0, parameters.exhaust_gain)));
      smooth(mechanicalGain.gain, Math.min(.045, Math.max(0, parameters.mechanical_gain)));
      smooth(propellerGain.gain, Math.min(.1, Math.max(0, parameters.propeller_gain)));
      smooth(exhaustFilter.frequency, Math.min(5000, Math.max(300, parameters.noise_cutoff_hz)));
      smooth(propFilter.frequency, Math.min(2200, Math.max(200, parameters.noise_cutoff_hz * .55)));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      master.gain.cancelScheduledValues(context.currentTime); master.gain.setValueAtTime(0, context.currentTime);
      for (const source of [exhaust, mechanical, bladePulse, noise]) source.stop();
      for (const node of nodes) node.disconnect();
    },
  };
}

/** No context, permission request or sound is created before explicit unlock(). */
export function createEngineAudio(options: { onStatus?: (status: EngineAudioStatus) => void } = {}): {
  unlock(): Promise<void>;
  update(state: Readonly<FlightState> | null, playing: boolean): void;
  setMuted(value: boolean): void;
  setVolume(value: number): void;
  getStatus(): EngineAudioStatus;
  dispose(): void;
} {
  const AudioContextConstructor = globalThis.AudioContext
    ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let context: AudioContext | null = null, graph: EngineAudioGraph | null = null;
  let unlocking: Promise<void> | null = null;
  let parameters = engineAudioParameters(null), playing = false, muted = false, volume = .3;
  let disposed = false, failed = false, lastStatus = '';
  const status = (): EngineAudioStatus => {
    const unlocked = context?.state === 'running';
    return { supported: !!AudioContextConstructor, unlocked, muted, volume,
      state: disposed ? 'disposed' : (!AudioContextConstructor || failed) ? 'unavailable' : !unlocked ? 'locked'
        : muted || volume === 0 ? 'muted' : playing && parameters.valid && parameters.rotation_hz > 0 ? 'playing' : 'ready' };
  };
  function notify(): void {
    const current = status(), signature = JSON.stringify(current);
    if (signature !== lastStatus) { lastStatus = signature; options.onStatus?.(current); }
  }
  function apply(): void { graph?.update(parameters, volume, playing && !muted && !failed && !disposed); notify(); }
  function stateChanged(): void { apply(); }
  notify();
  return {
    unlock() {
      if (disposed || !AudioContextConstructor) return Promise.resolve();
      if (unlocking) return unlocking;
      async function attempt(): Promise<void> {
        try {
          if (!context) {
            const candidate = new AudioContextConstructor();
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
          await context.resume();
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
