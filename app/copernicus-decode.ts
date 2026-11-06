import { Worker } from 'node:worker_threads';

interface Job { id: number; bytes: Uint8Array; resolve: (value: Float32Array) => void; reject: (error: Error) => void }
interface Slot { worker: Worker; job?: Job; timer?: ReturnType<typeof setTimeout> }
/** The two existing source slots retain a separate bounded CPU decoder pool. */
export class CopernicusBlockDecoder {
  private readonly slots: Slot[] = [];
  private readonly queue: Job[] = [];
  private nextId = 0;
  private disposed = false;
  private readonly threads = new Set<number>();
  private readonly timeoutMs: number;
  constructor(timeoutMs = 15000) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000) throw Error('Invalid terrain decoder deadline');
    this.timeoutMs = timeoutMs;
  }
  get stats() { return { active: this.slots.filter(slot => slot.job).length, queued: this.queue.length,
    workers: this.slots.length, threadIds: [...this.threads] }; }
  decode(bytes: Uint8Array): Promise<Float32Array> {
    if (this.disposed || !bytes.length || bytes.length > 5 * 1024 * 1024 || this.queue.length >= 32)
      return Promise.reject(Error('Terrain decoder unavailable or capacity exceeded'));
    return new Promise((resolve, reject) => {
      this.queue.push({ id: ++this.nextId, bytes: Uint8Array.from(bytes), resolve, reject });
      this.pump();
    });
  }
  private fail(slot: Slot, message: string) {
    if (!this.slots.includes(slot)) return;
    clearTimeout(slot.timer);
    slot.job?.reject(Error(message)); slot.job = undefined;
    this.slots.splice(this.slots.indexOf(slot), 1);
    void slot.worker.terminate(); this.pump();
  }
  private create(): Slot {
    const slot: Slot = { worker: new Worker(new URL('./copernicus-decode.worker.ts', import.meta.url), { execArgv: [] }) };
    slot.worker.on('message', (message: { id: number; values?: Float32Array; error?: string; threadId?: number }) => {
      const job = slot.job;
      if (!job || message.id !== job.id) { this.fail(slot, 'Unexpected terrain decoder response'); return; }
      clearTimeout(slot.timer); slot.job = undefined; slot.worker.unref();
      if (typeof message.threadId === 'number' && message.threadId > 0) { this.threads.add(message.threadId); while (this.threads.size > 2) this.threads.delete(this.threads.values().next().value!); }
      if (message.error || !(message.values instanceof Float32Array) || message.values.length !== 1024 * 1024)
        job.reject(Error('Terrain block decode failed'));
      else job.resolve(message.values);
      this.pump();
    });
    slot.worker.on('error', () => this.fail(slot, 'Terrain decoder worker failed'));
    slot.worker.on('exit', () => this.fail(slot, 'Terrain decoder worker exited'));
    slot.worker.unref(); this.slots.push(slot); return slot;
  }
  private pump() {
    while (!this.disposed && this.queue.length) {
      let slot = this.slots.find(value => !value.job);
      if (!slot && this.slots.length < 2) { try { slot = this.create(); } catch { this.queue.shift()!.reject(Error('Terrain decoder worker unavailable')); continue; } }
      if (!slot) return;
      const job = this.queue.shift()!; slot.job = job; slot.worker.ref();
      slot.timer = setTimeout(() => this.fail(slot, 'Terrain decoder timed out'), this.timeoutMs);
      try { slot.worker.postMessage({ id: job.id, bytes: job.bytes }, [job.bytes.buffer as ArrayBuffer]); }
      catch { this.fail(slot, 'Cannot send terrain decoder request'); }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const job of this.queue.splice(0)) job.reject(Error('Terrain decoder disposed'));
    for (const slot of this.slots.splice(0)) {
      clearTimeout(slot.timer); slot.job?.reject(Error('Terrain decoder disposed')); void slot.worker.terminate();
    }
  }
}
// Lazy workers do not start for source headers, cached hits or pure decoder tests.
export const copernicusDecoders = new CopernicusBlockDecoder();
