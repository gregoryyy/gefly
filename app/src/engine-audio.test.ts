import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { audioStatusLabel, createEngineAudio, type EngineAudioStatus } from './engine-audio.ts';

/** Minimal Web Audio stand-in: every node accepts the graph's calls and records nothing audible. */
function fakeParam() {
  return { value: 0, setTargetAtTime() {}, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
}
function fakeNode() {
  const params = new Map<string | symbol, unknown>();
  return new Proxy({ connect() {}, disconnect() {}, start() {}, stop() {}, setPeriodicWave() {} } as Record<string | symbol, unknown>, {
    get(target, key) {
      if (key in target) return target[key];
      if (['gain', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release'].includes(String(key))) {
        if (!params.has(key)) params.set(key, fakeParam());
        return params.get(key);
      }
      return undefined;
    },
    set(target, key, value) { target[key] = value; return true; },
  });
}

type ResumeMode = 'resolve' | 'reject' | 'pending';
function fakeAudio(options: { resume: ResumeMode[]; graphThrows?: boolean }) {
  const contexts: FakeContext[] = [];
  class FakeContext {
    state: 'suspended' | 'running' | 'closed' = 'suspended';
    sampleRate = 8000; currentTime = 0; destination = fakeNode();
    resumeCalls = 0; closed = 0;
    private listeners = new Set<() => void>();
    pending: (() => void)[] = [];
    constructor() { contexts.push(this); }
    addEventListener(_name: string, listener: () => void) { this.listeners.add(listener); }
    removeEventListener(_name: string, listener: () => void) { this.listeners.delete(listener); }
    run() { this.state = 'running'; for (const listener of this.listeners) listener(); }
    resume(): Promise<void> {
      this.resumeCalls++;
      const mode = options.resume[Math.min(this.resumeCalls, options.resume.length) - 1];
      if (mode === 'reject') return Promise.reject(new Error('NotAllowedError'));
      if (mode === 'pending') return new Promise<void>(resolve => this.pending.push(() => { this.run(); resolve(); }));
      this.run(); return Promise.resolve();
    }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
    createGain() { if (options.graphThrows) throw new Error('graph failure'); return fakeNode(); }
    createOscillator() { return fakeNode(); }
    createBiquadFilter() { return fakeNode(); }
    createDynamicsCompressor() { return fakeNode(); }
    createBufferSource() { return fakeNode(); }
    createPeriodicWave() { return {}; }
    createBuffer(_channels: number, length: number) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  }
  return { AudioContext: FakeContext as unknown as typeof AudioContext, contexts };
}

const base: EngineAudioStatus = { supported: true, unlocked: false, muted: true, volume: .3, state: 'locked' };

test('R-AUDIO-1 default sound-off state shows the S enable hint, not a bare Muted label', () => {
  assert.equal(audioStatusLabel(base), 'Sound off · press S to enable');
  assert.equal(audioStatusLabel({ ...base, muted: false }), 'Press S to enable');
  assert.equal(audioStatusLabel({ ...base, unlocked: true, state: 'muted' }), 'Muted · press S to unmute');
  assert.equal(audioStatusLabel({ ...base, unlocked: true, muted: false, volume: 0, state: 'muted' }), 'Volume 0%');
  assert.equal(audioStatusLabel({ ...base, unlocked: true, muted: false, state: 'playing' }), 'Playing');
  assert.equal(audioStatusLabel({ ...base, unlocked: true, muted: false, state: 'ready' }), 'Ready · paused');
  assert.equal(audioStatusLabel({ ...base, state: 'unavailable' }), 'Activation unavailable · retry sound button');
  assert.equal(audioStatusLabel({ ...base, supported: false, state: 'unavailable' }), 'Unavailable');
  assert.equal(audioStatusLabel({ ...base, state: 'disposed' }), 'Unavailable');
});

test('no AudioContext is created before unlock; unlock creates one context and resumes it', async () => {
  const fake = fakeAudio({ resume: ['resolve'] });
  const statuses: EngineAudioStatus[] = [];
  const audio = createEngineAudio({ AudioContext: fake.AudioContext, onStatus: s => statuses.push(s) });
  assert.equal(fake.contexts.length, 0);
  assert.deepEqual(audio.getStatus(), base, 'sound defaults muted and locked');
  audio.setMuted(false); await audio.unlock(); await audio.unlock();
  assert.equal(fake.contexts.length, 1);
  assert.equal(audio.getStatus().state, 'ready');
  audio.update(null, true); assert.equal(audio.getStatus().state, 'ready', 'invalid state is never reported as playing');
  audio.setMuted(true); assert.equal(audio.getStatus().state, 'muted');
  audio.setMuted(false); audio.setVolume(0); assert.equal(audio.getStatus().state, 'muted');
  audio.setVolume(Number.NaN); assert.equal(audio.getStatus().volume, 0, 'non-finite volume is ignored');
  audio.setVolume(7); assert.equal(audio.getStatus().volume, 1);
  audio.dispose(); audio.dispose();
  assert.equal(fake.contexts[0].closed, 1); assert.equal(audio.getStatus().state, 'disposed');
  assert.equal(statuses.at(-1)?.state, 'disposed');
});

test('F36: a resume() that never settles times out to a retryable state, and retries call resume() again', async () => {
  const fake = fakeAudio({ resume: ['pending', 'pending', 'resolve'] });
  const audio = createEngineAudio({ AudioContext: fake.AudioContext, resumeTimeout_ms: 20 });
  audio.setMuted(false);
  const first = audio.unlock();
  const retryWhilePending = audio.unlock();
  assert.equal(fake.contexts[0].resumeCalls, 2, 'a retry during a pending attempt asks the context again');
  await first; await retryWhilePending;
  assert.equal(audio.getStatus().state, 'unavailable', 'bounded attempt reports activation unavailable');
  await audio.unlock();
  assert.equal(fake.contexts.length, 1, 'retries reuse the context');
  assert.equal(fake.contexts[0].resumeCalls, 3);
  assert.equal(audio.getStatus().state, 'ready');
  audio.dispose();
});

test('F36: a late resume after timeout clears the failure through statechange', async () => {
  const fake = fakeAudio({ resume: ['pending'] });
  const audio = createEngineAudio({ AudioContext: fake.AudioContext, resumeTimeout_ms: 10 });
  audio.setMuted(false); await audio.unlock();
  assert.equal(audio.getStatus().state, 'unavailable');
  fake.contexts[0].pending.shift()!();
  assert.equal(audio.getStatus().state, 'ready');
  audio.dispose();
});

test('rejected activation is retryable; partial graph failure closes the candidate context', async () => {
  const rejected = fakeAudio({ resume: ['reject', 'resolve'] });
  const audio = createEngineAudio({ AudioContext: rejected.AudioContext });
  audio.setMuted(false); await audio.unlock();
  assert.equal(audio.getStatus().state, 'unavailable');
  await audio.unlock(); assert.equal(audio.getStatus().state, 'ready');
  audio.dispose();

  const broken = fakeAudio({ resume: ['resolve'], graphThrows: true });
  const failing = createEngineAudio({ AudioContext: broken.AudioContext });
  await failing.unlock();
  assert.equal(broken.contexts[0].closed, 1, 'partially built graph context is closed');
  assert.equal(failing.getStatus().state, 'unavailable');
  await failing.unlock();
  assert.equal(broken.contexts.length, 2, 'a later explicit unlock may try a fresh context');
  failing.dispose();
});

test('dispose during a pending unlock leaves a disposed state and unsupported browsers stay unavailable', async () => {
  const fake = fakeAudio({ resume: ['pending'] });
  const audio = createEngineAudio({ AudioContext: fake.AudioContext, resumeTimeout_ms: 10 });
  const pending = audio.unlock(); audio.dispose(); await pending;
  assert.equal(audio.getStatus().state, 'disposed');
  const unsupported = createEngineAudio({ AudioContext: null });
  await unsupported.unlock();
  assert.deepEqual([unsupported.getStatus().supported, unsupported.getStatus().state], [false, 'unavailable']);
});
