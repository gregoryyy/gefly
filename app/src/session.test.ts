import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createSession } from './session.ts';

class MockWorker {
  static instances: MockWorker[] = [];
  messages: Record<string, unknown>[] = [];
  terminated = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { preventDefault(): void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly url: string;
  readonly options: unknown;
  constructor(url: string, options: unknown) { this.url = url; this.options = options; MockWorker.instances.push(this); }
  postMessage(value: Record<string, unknown>) { this.messages.push(value); }
  terminate() { this.terminated = true; }
  emit(data: unknown) { this.onmessage?.({ data }); }
}

function fixture(t: TestContext) {
  const original = globalThis.Worker;
  globalThis.Worker = MockWorker as unknown as typeof Worker;
  MockWorker.instances = [];
  const states: unknown[] = [], errors: string[] = [], statuses: string[] = [];
  const session = createSession({
    onState: (state) => states.push(state), onReady: () => {},
    onError: (error) => errors.push(error), onStatus: (status) => statuses.push(status),
  });
  t.after(() => { session.dispose(); globalThis.Worker = original; });
  return { session, states, errors, statuses };
}

const ready = { type: 'ready', trim: { throttle: 0.693, pitch_trim: 0.168, status: 1 } };
const state = {
  type: 'state', step: 3, t_s: 0.025, lat_rad: 0.87, lon_rad: 0.15,
  alt_msl_m: 396.24, roll_rad: 0, pitch_rad: 0.04, heading_rad: 1.43, tas_mps: 46.3,
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('starts a real module worker, waits for ready and sends trimmed input before run', (t) => {
  const { session, errors, states } = fixture(t);
  session.start(); session.start();
  assert.equal(MockWorker.instances.length, 1);
  const worker = MockWorker.instances[0];
  assert.equal(worker.url, '/studies/e1-browser/sim/worker.js');
  assert.deepEqual(worker.options, { type: 'module' });
  assert.equal(worker.messages[0].type, 'init');
  assert.equal(worker.messages[0].dt_s, 1 / 120);
  assert.equal(worker.messages.length, 1);
  worker.emit(ready);
  assert.equal(worker.messages[1].type, 'input');
  assert.equal(worker.messages[1].throttle, 0.693);
  assert.equal(worker.messages[2].type, 'run');
  worker.emit(state);
  assert.equal(states.length, 1);
  assert.equal(Object.hasOwn(states[0] as object, 'type'), false);
  assert.deepEqual(errors, []);
});

test('pause during loading prevents auto-run; resume and reset preserve intent', (t) => {
  const { session } = fixture(t);
  session.start();
  const old = MockWorker.instances[0];
  session.pause(); old.emit(ready);
  assert.equal(old.messages.filter((m) => m.type === 'run').length, 0);
  session.start();
  assert.equal(old.messages.at(-1)?.type, 'run');
  session.reset();
  assert.equal(old.terminated, true);
  const replacement = MockWorker.instances[1];
  old.emit({ type: 'error', message: 'late stale event' });
  replacement.emit(ready);
  assert.equal(replacement.messages.at(-1)?.type, 'run');
  session.pause(); session.reset();
  const pausedReplacement = MockWorker.instances[2];
  pausedReplacement.emit(ready);
  assert.equal(pausedReplacement.messages.some((m) => m.type === 'run'), false);
});

test('high-frequency inputs coalesce to the latest immutable snapshot and stop while paused', async (t) => {
  const { session } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0];
  worker.emit(ready); worker.emit(state);
  const initial = worker.messages.length;
  for (let i = 0; i < 100; i++) {
    session.input({ elevator: i / 100, aileron: 0.2, rudder: -0.1, throttle: 0.8 });
  }
  const final = { elevator: -0.4, aileron: 0.5, rudder: 0, throttle: 0.9 };
  session.input(final); final.elevator = 1;
  assert.equal(worker.messages.length, initial);
  await sleep(70);
  const inputs = worker.messages.slice(initial);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].type, 'input');
  assert.equal(inputs[0].step, 3);
  assert.equal(inputs[0].elevator, -0.4);
  session.pause();
  session.input({ elevator: 0, aileron: 0, rudder: 0, throttle: 0.5 });
  const pausedCount = worker.messages.length;
  await sleep(70);
  assert.equal(worker.messages.length, pausedCount);
});

test('invalid numerical state stops the worker and reports failure without a fallback', (t) => {
  const { session, errors, states } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0];
  worker.emit(ready); worker.emit({ ...state, tas_mps: NaN });
  assert.equal(worker.terminated, true);
  assert.equal(states.length, 0);
  assert.match(errors[0], /invalid state/);
});

test('invalid controls and worker-load failures are visible; disposed sessions ignore further work', (t) => {
  const { session, errors } = fixture(t);
  session.start();
  const worker = MockWorker.instances[0];
  worker.onerror?.({ preventDefault() {} });
  assert.match(errors[0], /just build-flight-engine/);
  session.start();
  session.input({ elevator: 0, aileron: Infinity, rudder: 0, throttle: 0.5 });
  assert.match(errors[1], /Control input must be finite/);
  session.dispose(); session.start(); session.reset();
  assert.equal(MockWorker.instances.length, 2);
});
