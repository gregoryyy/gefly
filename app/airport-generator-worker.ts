import { Worker, parentPort, threadId } from 'node:worker_threads';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { compileAirportRegion } from './airport-generator.ts';
import { AIRPORT_REGION_LIMITS, airportSourceTime, validAirportRegionKey, validateAirportRegion,
  type AirportRegionKey, type AirportRegionPackage } from './src/airport-region.ts';

const MAX_CACHE_BYTES = AIRPORT_REGION_LIMITS.maxBytes + 512;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
type Input = { kind: 'compile'; bytes: ArrayBuffer; key: AirportRegionKey; generatedAt: string }
  | { kind: 'cache'; bytes: ArrayBuffer; key: AirportRegionKey };
export interface AirportCompilerResult {
  readonly bytes: Buffer; readonly cacheBytes: Buffer; readonly hash: string;
  readonly generatedAt: string; readonly featureCount: number; readonly compilerThreadId: number;
}
interface Queued { readonly input: Input; readonly signal: AbortSignal; readonly id: number;
  resolve(value: AirportCompilerResult): void; reject(error: Error): void; aborted(): void }

// This branch executes in an actual Node thread. No source JSON parsing,
// geometry compilation or cache-envelope validation runs in the Vite event loop.
if (parentPort) parentPort.on('message', (message: Input & { id: number }) => {
  try {
    if (!message || !Number.isSafeInteger(message.id) || !validAirportRegionKey(message.key)
      || !(message.bytes instanceof ArrayBuffer) || !['compile', 'cache'].includes(message.kind)
      || message.bytes.byteLength > (message.kind === 'compile' ? AIRPORT_REGION_LIMITS.maxSourceBytes : MAX_CACHE_BYTES)) {
      throw new Error('Invalid airport compiler job');
    }
    const bytes = new Uint8Array(message.bytes);
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    let region: AirportRegionPackage;
    if (message.kind === 'compile') region = compileAirportRegion(parsed, message.key, hash(bytes), message.generatedAt);
    else {
      if (!object(parsed) || parsed.version !== 1 || Object.keys(parsed).some(k => !['version', 'sha256', 'package'].includes(k))
        || typeof parsed.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.sha256)) throw new Error('Airport cache envelope invalid');
      region = validateAirportRegion(parsed.package, message.key);
      if (hash(Buffer.from(JSON.stringify(region))) !== parsed.sha256) throw new Error('Airport cache digest mismatch');
    }
    const body = Uint8Array.from(Buffer.from(JSON.stringify(region)));
    const digest = hash(body);
    const cache = Uint8Array.from(Buffer.from(JSON.stringify({ version: 1, sha256: digest, package: region })));
    if (body.byteLength > AIRPORT_REGION_LIMITS.maxBytes || cache.byteLength > MAX_CACHE_BYTES) throw new Error('Airport compiled byte budget');
    parentPort!.postMessage({ id: message.id, ok: true, bytes: body.buffer, cacheBytes: cache.buffer,
      hash: digest, generatedAt: region.generated_at, featureCount: region.features.length, compilerThreadId: threadId }, [body.buffer, cache.buffer]);
  } catch (error) {
    parentPort!.postMessage({ id: message?.id, ok: false,
      error: error instanceof Error ? error.message.slice(0, 200) : 'Airport compiler failed' });
  }
});

/** One reusable CPU thread, eight total owners, transferred byte buffers.
 * Cancellation terminates an active worker before a replacement is created.
 */
export function createAirportCompiler() {
  let worker: Worker | null = null, active: Queued | null = null, closing: Promise<void> | null = null;
  let disposed = false, sequence = 0;
  let idle: ReturnType<typeof setTimeout> | undefined;
  const queue: Queued[] = [];
  function clean(job: Queued): void { job.signal.removeEventListener('abort', job.aborted); }
  function rejectActive(message: string): void {
    if (!active) return;
    const job = active; active = null; clean(job); job.reject(new Error(message));
  }
  function terminate(): Promise<void> {
    clearTimeout(idle); idle = undefined;
    if (closing) return closing;
    const current = worker; worker = null;
    if (!current) return Promise.resolve();
    const stopped: Promise<void> = current.terminate().then(() => {}, () => {}).finally(() => { closing = null; dispatch(); });
    closing = stopped; return stopped;
  }
  function instance(): Worker {
    if (worker) return worker;
    const current = new Worker(resolve(import.meta.dirname, 'airport-generator-worker.ts'), { execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
    worker = current; current.unref();
    current.on('message', (message: Record<string, unknown>) => {
      if (worker !== current || !active || message?.id !== active.id) return;
      const job = active;
      if (message.ok !== true) {
        active = null; clean(job); job.reject(new Error(typeof message.error === 'string' ? message.error : 'Airport compiler failed'));
      } else if (!(message.bytes instanceof ArrayBuffer) || !(message.cacheBytes instanceof ArrayBuffer)
        || message.bytes.byteLength > AIRPORT_REGION_LIMITS.maxBytes || message.cacheBytes.byteLength > MAX_CACHE_BYTES
        || typeof message.hash !== 'string' || !/^[a-f0-9]{64}$/.test(message.hash) || !airportSourceTime(message.generatedAt)
        || !Number.isInteger(message.featureCount) || (message.featureCount as number) < 0
        || (message.featureCount as number) > AIRPORT_REGION_LIMITS.maxFeatures
        || message.compilerThreadId !== current.threadId || current.threadId <= 0) {
        rejectActive('Invalid airport compiler response'); void terminate(); return;
      } else {
        active = null; clean(job);
        job.resolve({ bytes: Buffer.from(message.bytes), cacheBytes: Buffer.from(message.cacheBytes), hash: message.hash,
          generatedAt: message.generatedAt, featureCount: message.featureCount as number, compilerThreadId: current.threadId });
      }
      current.unref(); dispatch();
    });
    current.on('error', () => {
      if (worker !== current) return;
      rejectActive('Airport compiler thread failed'); void terminate();
    });
    current.on('exit', () => {
      if (worker !== current) return;
      worker = null; rejectActive('Airport compiler thread exited'); dispatch();
    });
    return current;
  }
  function dispatch(): void {
    if (disposed || active || closing) return;
    const job = queue.shift();
    if (!job) {
      worker?.unref();
      clearTimeout(idle); idle = setTimeout(() => { void terminate(); }, 30000); idle.unref(); return;
    }
    if (job.signal.aborted) { clean(job); job.reject(new Error('Airport compiler cancelled')); dispatch(); return; }
    clearTimeout(idle); idle = undefined;
    active = job;
    try { const current = instance(); current.ref(); current.postMessage({ ...job.input, id: job.id }, [job.input.bytes]); }
    catch { rejectActive('Airport compiler unavailable'); void terminate(); }
  }
  function run(input: Input, signal: AbortSignal): Promise<AirportCompilerResult> {
    if (disposed || signal.aborted) return Promise.reject(new Error('Airport compiler cancelled'));
    if (queue.length + (active ? 1 : 0) >= 8) return Promise.reject(new Error('Airport compiler queue full'));
    return new Promise((resolve, reject) => {
      const job: Queued = { input, signal, id: ++sequence, resolve, reject,
        aborted() {
          const index = queue.indexOf(job);
          if (index >= 0) { queue.splice(index, 1); clean(job); reject(new Error('Airport compiler cancelled')); }
          else if (active === job) { rejectActive('Airport compiler cancelled'); void terminate(); }
        } };
      signal.addEventListener('abort', job.aborted, { once: true }); queue.push(job); dispatch();
    });
  }
  return {
    compile(bytes: ArrayBuffer, key: AirportRegionKey, generatedAt: string, signal: AbortSignal) {
      return run({ kind: 'compile', bytes, key, generatedAt }, signal);
    },
    readCache(bytes: ArrayBuffer, key: AirportRegionKey, signal: AbortSignal) {
      return run({ kind: 'cache', bytes, key }, signal);
    },
    stats: () => ({ active: active || closing ? 1 : 0, queued: queue.length }),
    async dispose(): Promise<void> {
      disposed = true; clearTimeout(idle);
      for (const job of queue.splice(0)) { clean(job); job.reject(new Error('Airport compiler disposed')); }
      rejectActive('Airport compiler disposed'); await terminate();
    },
  };
}
