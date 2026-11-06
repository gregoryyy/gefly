import assert from 'node:assert/strict';
import test from 'node:test';
import { createAirportRegionWorkerReader } from './airport-region-worker.ts';
import { airportRegionId } from './airport-region.ts';

class WorkerFixture extends EventTarget {
  static instances: WorkerFixture[] = [];
  messages: unknown[] = []; terminated = false;
  readonly url: URL; readonly options: WorkerOptions;
  constructor(url: URL, options: WorkerOptions) { super(); this.url = url; this.options = options; WorkerFixture.instances.push(this); }
  postMessage(message: unknown) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  reply(data: unknown) { this.dispatchEvent(new MessageEvent('message', { data })); }
}
const key = { x: 115, y: 255 };
const entry = { bytes: 100, package: { version: 1, ...key, id: airportRegionId(key), features: [] } };
test('R-AIRPORT-3 one named worker handles data reads and rejects unexpected protocol replies', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { value: WorkerFixture, configurable: true });
  t.after(() => previous ? Object.defineProperty(globalThis, 'Worker', previous) : Reflect.deleteProperty(globalThis, 'Worker'));
  WorkerFixture.instances = [];
  const reader = createAirportRegionWorkerReader(20), controller = new AbortController();
  const first = reader.read(key, controller.signal), worker = WorkerFixture.instances[0];
  assert.equal(worker.options.type, 'module'); assert.equal(worker.options.name, 'gefly-airport-data');
  assert.match(String(worker.url), /airport-region\.worker\.ts$/);
  await assert.rejects(reader.read(key, controller.signal), /busy/);
  worker.reply({ type: 'ready', id: 999, entry });
  worker.reply({ type: 'ready', id: 1, entry });
  assert.deepEqual(await first, entry);
  const second = reader.read(key, controller.signal);
  worker.reply({ type: 'ready', id: 2, entry: { ...entry, package: { ...entry.package, x: 1 } } });
  await assert.rejects(second, /invalid/); assert.equal(WorkerFixture.instances.length, 1);
  reader.dispose(); assert.equal(worker.terminated, true);
});
test('R-AIRPORT-3 cancellation and disposal reject owned work and discard late worker results', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { value: WorkerFixture, configurable: true });
  t.after(() => previous ? Object.defineProperty(globalThis, 'Worker', previous) : Reflect.deleteProperty(globalThis, 'Worker'));
  WorkerFixture.instances = [];
  const reader = createAirportRegionWorkerReader(20), abort = new AbortController();
  const first = reader.read(key, abort.signal), worker = WorkerFixture.instances[0];
  abort.abort(); await assert.rejects(first, /cancelled/);
  assert.deepEqual(worker.messages.at(-1), { type: 'cancel', id: 1 });
  worker.reply({ type: 'ready', id: 1, entry });
  const second = reader.read(key, new AbortController().signal);
  reader.dispose(); await assert.rejects(second, /unavailable/);
  worker.reply({ type: 'ready', id: 2, entry }); assert.equal(worker.terminated, true);
  await assert.rejects(reader.read(key, new AbortController().signal), /cancelled/);
});
