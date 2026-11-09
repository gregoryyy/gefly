// Execute the actual worker scheduler in a Node Worker. A read-only observer
// records native warnings after each step; production source/engine are unchanged.
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('./', import.meta.url), output = new URL('../../../output/flight/', root);
const label = process.argv[2] ?? 'after'; assert(/^[a-z0-9-]{1,20}$/.test(label));
const source = readFileSync(new URL('./worker.js', root), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(source.split('const rc = M._gf_step();').length, 2);
const observedSource = source.replace(/from '(\.\/[^']+)'/g, (_, path) => `from ${JSON.stringify(new URL(path, root).href)}`)
  .replace("new URL('./dist/build-info.json', import.meta.url)", `new URL(${JSON.stringify(new URL('./dist/build-info.json', root).href)})`)
  .replace('const rc = M._gf_step();', 'const rc = M._gf_step(); globalThis.__observeNative(M, stepIndex + 1);');
const observerUrl = new URL(`stall-worker-readonly-observer-task132-climb-${label}.mjs`, output);
const bootstrapUrl = new URL(`stall-worker-bootstrap-task132-climb-${label}.mjs`, output);
writeFileSync(observerUrl, observedSource);
writeFileSync(bootstrapUrl, `import {parentPort} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
globalThis.self=globalThis;
const native=[];
globalThis.__observeNative=(M,step)=>{const p=M._gf_stall_state()>>3,c=M._gf_cockpit_state()>>3,g=M._gf_ground_state()>>3;
native.push({step,alpha_rad:M.HEAPF64[p+9],warning_norm:M.HEAPF64[p+11],on_ground:M.HEAPF64[c+7],contact_mask:M.HEAPF64[g+5]});};
globalThis.postMessage=message=>parentPort.postMessage(message.type==='stats'?{...message,diagnostic_native:native}:message);
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>new URL(url).protocol==='file:'?new Response(await readFile(new URL(url))):nativeFetch(url,options);
parentPort.on('message',data=>self.onmessage({data}));
await import(${JSON.stringify(observerUrl.href)});
parentPort.postMessage({type:'diagnostic-started'});
`);
const worker = new Worker(bootstrapUrl);
const messages = [], pending = [];
worker.on('message', message => { messages.push(message); for (const wait of [...pending]) if (wait.predicate(message)) { pending.splice(pending.indexOf(wait), 1); clearTimeout(wait.timer); wait.resolve(message); } });
const until = predicate => {
  const existing = messages.find(predicate); if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => { const wait = { predicate, resolve, timer: setTimeout(() => reject(new Error('Diagnostic worker timeout')), 15000) }; pending.push(wait); });
};
try {
  await until(message => message.type === 'diagnostic-started');
  worker.postMessage({ type: 'init', dt_s: 1 / 120, state_hz: 60, aircraft: 'c172x', kap140: false, terrain: false, regional_navigation: false,
    ground_collision: true, ic: { lat_rad: 49.96 * Math.PI / 180, lon_rad: 8.643 * Math.PI / 180, alt_msl_m: 1200, heading_rad: 82 * Math.PI / 180, tas_mps: 45 } });
  const ready = await until(message => message.type === 'ready'); assert.equal(ready.trim.status, 1);
  worker.postMessage({ type: 'autopilot', mode: 2, target_heading_rad: 82 * Math.PI / 180 });
  for (let step = 0; step <= 960; step++) worker.postMessage({ type: 'input', step, wall_ms: 0,
    elevator: -.4566 * step / 960, aileron: 0, rudder: 0, throttle: .2 });
  worker.postMessage({ type: 'input', step: 2880, wall_ms: 0, elevator: .1, aileron: 0, rudder: 0, throttle: .7 });
  worker.postMessage({ type: 'simulation-rate', rate: 10 });
  worker.postMessage({ type: 'run', until_step: 3000 });
  const stats = await until(message => message.type === 'stats' && message.step === 3000);
  const errors = messages.filter(message => message.type === 'error'); assert.deepEqual(errors, []);
  const native = stats.diagnostic_native;
  const positive = native.filter(frame => frame.warning_norm > 0 && frame.on_ground === 0 && frame.contact_mask === 0);
  const states = messages.filter(message => message.type === 'state');
  let previous = 0;
  const intervals = states.map(state => {
    const interval = native.filter(frame => frame.step > previous && frame.step <= state.step && frame.warning_norm > 0 && frame.on_ground === 0 && frame.contact_mask === 0);
    const peak = interval.reduce((best, frame) => !best || frame.warning_norm > best.warning_norm ? frame : best, null);
    const result = { from_step_exclusive: previous, to_step: state.step, current_warning_norm: state.stall_warning_norm,
      ...(peak ? { diagnostic_interval_peak_norm: peak.warning_norm, diagnostic_peak_step: peak.step } : {}) };
    previous = state.step; return result;
  });
  const missed = intervals.filter(interval => interval.diagnostic_interval_peak_norm > 0 && interval.current_warning_norm === 0);
  const producedPeaks = states.filter(state => state.stall_warning_peak_norm > 0);
  for (let i = 0; i < states.length; i++) {
    if (intervals[i].diagnostic_interval_peak_norm > 0) {
      assert.equal(states[i].stall_warning_peak_norm, intervals[i].diagnostic_interval_peak_norm, 'actual producer preserves native interval maximum');
      assert.equal(states[i].stall_warning_peak_step, intervals[i].diagnostic_peak_step, 'actual producer preserves its exact fixed step');
    } else assert.equal(states[i].stall_warning_peak_norm, undefined, 'no invented positive event');
  }
  const before = JSON.parse(readFileSync(new URL('stall-warning-actual-worker-task132-climb-before.json', output)));
  assert.equal(stats.digest, before.stats.digest, 'delivery-only change preserves the exact native dynamics digest');
  const report = { scope: 'Actual production worker source scheduler in Node Worker, with per-step read-only observer; legacy heading assist used to reproduce the native diagnostic maneuver. Not current app KAP/UI/audio acceptance.',
    runtime: process.version, worker_sha256: sha(source), observer_sha256: sha(observedSource), build: ready.build,
    config: { simulation_rate: 10, dt_s: 1 / 120, state_hz: 60, native_case: 'near-onset-weak-climb--0.4566', control_ramp_steps: 960, until_step: 3000 },
    stats: { max_catchup_batch: stats.max_catchup_batch, max_lag_steps: stats.max_lag_steps, dropped_steps: stats.dropped_steps, ticks: stats.ticks, digest: stats.digest },
    native_positive_steps: positive, published_positive_states: states.filter(state => state.stall_warning_norm > 0), published_peak_states: producedPeaks,
    publication_intervals: intervals, intervals_that_lost_native_positive: missed,
    warning: 'Diagnostic interval peaks are reconstructed from the native observer and compared to actual producer metadata; current raw warnings are unchanged.' };
  const destination = new URL(`stall-warning-actual-worker-task132-climb-${label}.json`, output);
  writeFileSync(destination, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ native_positive_steps: positive.map(frame => frame.step), published_positive_steps: report.published_positive_states.map(frame => frame.step),
    produced_peak_steps: producedPeaks.map(state => ({ published_step: state.step, peak_step: state.stall_warning_peak_step, peak_norm: state.stall_warning_peak_norm })),
    actual_intervals_losing_positive_in_current_raw: missed, native_digest_unchanged: true, stats: report.stats }, null, 2));
} finally { await worker.terminate(); }
