// E1 browser check: worker benchmark page. Runs the JSBSim worker with one
// scripted input log, twice with the log pre-scheduled (determinism, step cost,
// pacing) and once with the same values sent live at their wall-clock time
// (input-to-state latency). Results: on the page and as window.__results.
// Query: ?seconds=30&live=10&state_hz=60
const q = new URLSearchParams(location.search);
const SECONDS = Number(q.get('seconds') || 30);
const LIVE_SECONDS = Number(q.get('live') || 10);
const STATE_HZ = Number(q.get('state_hz') || 60);
const DT_S = 1 / 120;
const D2R = Math.PI / 180;

// Benchmark fixture only (not a navigation source): approximately EDFE,
// 1000 m MSL, heading 0 (true), 46 m/s TAS.
const IC = { lat_rad: 49.9614 * D2R, lon_rad: 8.6428 * D2R, alt_msl_m: 1000, heading_rad: 0, tas_mps: 46 };

const wallNow = () => performance.timeOrigin + performance.now();
const out = document.getElementById('out');
const statusEl = document.getElementById('status');
const log = (s) => { statusEl.textContent = s; };

// Scripted input log: one input every 0.25 s (30 steps). The aileron bias
// roughly cancels the model's roll-off at this IC so 30 s stay airborne; it is a
// fixture choice, not aircraft data. Values are exact binary fractions.
function scriptedLog(seconds) {
  const out = [];
  const n = Math.floor(seconds * 4);
  for (let i = 0; i < n; i++) {
    const phase = i % 16;
    out.push({
      step: i * 30,
      elevator: [0, -0.0625, -0.125, -0.0625, 0, 0.0625, 0.125, 0.0625][phase % 8] / 2,
      aileron: -0.109375 + (phase < 8 ? 0.03125 : -0.03125),
      rudder: phase === 4 ? 0.0625 : 0,
      throttle: i % 40 < 20 ? 0.6875 : 0.75,
    });
  }
  return out;
}

function pct(sorted, p) {
  if (!sorted.length) return null;
  const k = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[k];
}
const sortNum = (a) => Float64Array.from(a).sort();

function startWorker() {
  const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  const handlers = new Set();
  w.onmessage = (ev) => { const recv = wallNow(); for (const h of handlers) h(ev.data, recv); };
  w.onerror = (e) => { for (const h of handlers) h({ type: 'error', message: e.message || 'worker error' }, wallNow()); };
  const next = (type) => new Promise((res, rej) => {
    const h = (m) => {
      if (m.type === type) { handlers.delete(h); res(m); } else if (m.type === 'error') { handlers.delete(h); rej(new Error(m.message)); }
    };
    handlers.add(h);
  });
  return { w, handlers, next };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runOnce(label, mode, seconds) {
  log(`${label}: loading worker`);
  const t0 = performance.now();
  const { w, handlers, next } = startWorker();
  const readyP = next('ready');
  w.postMessage({ type: 'init', dt_s: DT_S, aircraft: 'c172x', ic: IC, state_hz: STATE_HZ });
  const ready = await readyP;
  const readyMs = performance.now() - t0;
  const inputs = scriptedLog(seconds);
  const states = { count: 0, last: null, intervals: [], prevRecv: null };
  const sent = [];        // live mode: {wall_ms, latency_ms}
  let latestStep = 0;
  const errors = [];
  handlers.add((m, recv) => {
    if (m.type === 'error') { errors.push(m.message); return; }
    if (m.type !== 'state') return;
    states.count += 1;
    states.last = m;
    latestStep = m.step;
    if (states.prevRecv !== null) states.intervals.push(recv - states.prevRecv);
    states.prevRecv = recv;
    if (m.last_input_wall_ms !== null) {
      for (const s of sent) if (s.latency_ms === null && m.last_input_wall_ms >= s.wall_ms) s.latency_ms = recv - s.wall_ms;
    }
  });
  if (mode === 'scheduled') {
    const wall = wallNow();
    for (const inp of inputs) w.postMessage({ type: 'input', wall_ms: wall, ...inp });
  }
  log(`${label}: running ${seconds} s`);
  const runStart = performance.now();
  const untilStep = Math.round(seconds / DT_S);
  const statsP = next('stats');
  w.postMessage(mode === 'scheduled' ? { type: 'run', until_step: untilStep } : { type: 'run' });
  if (mode === 'live') {
    // Deterministic phase jitter in [0, 25) ms so sends sample all phases of the
    // worker's step and state cadence instead of locking to step boundaries.
    let lcg = 12345;
    for (const inp of inputs) {
      lcg = (Math.imul(lcg, 1103515245) + 12345) >>> 0;
      const due = runStart + inp.step * DT_S * 1000 + (lcg / 2 ** 32) * 25;
      const wait = due - performance.now();
      if (wait > 0) await sleep(wait);
      const wall_ms = wallNow();
      sent.push({ wall_ms, latency_ms: null, step_sent: latestStep });
      w.postMessage({ type: 'input', ...inp, step: latestStep, wall_ms });
    }
  }
  if (mode === 'live') {
    const remaining = runStart + seconds * 1000 - performance.now();
    if (remaining > 0) await sleep(remaining);
    w.postMessage({ type: 'stop' });
  }
  const st = await statsP;
  w.terminate();
  const cost = sortNum(st.step_cost_us);
  const lat = sortNum(sent.map((s) => s.latency_ms).filter((x) => x !== null));
  const iv = sortNum(states.intervals);
  return {
    label, mode, seconds, ready_ms: readyMs, build: ready.build, trim: ready.trim,
    steps: st.step, t_s: st.t_s, run_wall_ms: st.run_wall_ms,
    sim_to_wall: st.t_s / (st.run_wall_ms / 1000),
    missed_steps: st.missed_steps, late_inputs: st.late_inputs, applied_inputs: st.applied_inputs,
    pending_inputs: st.pending_inputs, max_catchup_batch: st.max_catchup_batch, ticks: st.ticks,
    worker_cross_origin_isolated: st.cross_origin_isolated,
    step_cost_us: { n: cost.length, p50: pct(cost, 50), p99: pct(cost, 99), max: pct(cost, 100),
                    mean: cost.reduce((a, b) => a + b, 0) / (cost.length || 1) },
    state_msgs: states.count,
    state_interval_ms: { p50: pct(iv, 50), p95: pct(iv, 95), max: pct(iv, 100) },
    latency_ms: mode === 'live' ? { n: lat.length, of: sent.length, p50: pct(lat, 50), p95: pct(lat, 95), max: pct(lat, 100) } : null,
    digest: st.digest, final_state: st.final_state, errors,
  };
}

// Unpaced back-to-back steps on a fresh worker (compute cost without timer
// sleeps between steps). Uses the same IC and a constant input.
async function burstOnce() {
  log('burst: unpaced steps');
  const { w, next } = startWorker();
  const readyP = next('ready');
  w.postMessage({ type: 'init', dt_s: DT_S, aircraft: 'c172x', ic: IC, state_hz: STATE_HZ });
  await readyP;
  const first = scriptedLog(1)[0];
  w.postMessage({ type: 'input', wall_ms: wallNow(), ...first });
  const p = next('burst');
  w.postMessage({ type: 'burst', steps: 2400, blocks: 5 });
  const r = await p;
  w.terminate();
  return { steps_per_block: r.steps, us_per_step: r.us_per_step };
}

async function main() {
  const results = {
    evidence: 'preliminary: headless or local browser run; not the reference M1/Chrome platform',
    started: new Date().toISOString(),
    env: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
           crossOriginIsolated: self.crossOriginIsolated === true },
    params: { seconds: SECONDS, live_seconds: LIVE_SECONDS, state_hz: STATE_HZ, dt_s: DT_S, ic: IC },
    runs: [],
  };
  try {
    results.runs.push(await runOnce('A', 'scheduled', SECONDS));
    results.runs.push(await runOnce('B', 'scheduled', SECONDS));
    if (LIVE_SECONDS > 0) results.runs.push(await runOnce('L', 'live', LIVE_SECONDS));
    results.burst = await burstOnce();
    const [a, b] = results.runs;
    const l = results.runs[2];
    const wall_s = a.run_wall_ms / 1000;
    const sameFinal = a.final_state.length === b.final_state.length && a.final_state.every((v, i) => Object.is(v, b.final_state[i]));
    results.summary = {
      step_cost_us_p50: a.step_cost_us.p50, step_cost_us_p99: a.step_cost_us.p99,
      step_cost_us_p99_b: b.step_cost_us.p99,
      burst_us_per_step_last_block: results.burst.us_per_step[results.burst.us_per_step.length - 1],
      missed_steps_a: a.missed_steps, missed_steps_b: b.missed_steps,
      missed_per_10s_a: a.missed_steps / wall_s * 10,
      latency_ms_p50: l ? l.latency_ms.p50 : null, latency_ms_p95: l ? l.latency_ms.p95 : null,
      digest_a: a.digest, digest_b: b.digest, final_state_identical: sameFinal,
      deterministic: a.digest === b.digest && sameFinal && a.steps === b.steps
        && a.late_inputs === 0 && b.late_inputs === 0,
      note: 'digest = FNV-1a 64 over 14 post-step state doubles at every step; A and B both stop at the same step (run.until_step)',
    };
    // Budgets from ../README.md (reference Mac); here informational only.
    const s = results.summary;
    results.budgets_informational = {
      step_cost_p99_le_830us: s.step_cost_us_p99 <= 830,
      missed_le_1_per_10s: s.missed_per_10s_a <= 1,
      latency_p95_le_25ms: s.latency_ms_p95 !== null ? s.latency_ms_p95 <= 25 : null,
      deterministic_replay: s.deterministic,
    };
  } catch (e) {
    results.error = String(e && e.message ? e.message : e);
  }
  results.finished = new Date().toISOString();
  window.__results = results;
  out.textContent = JSON.stringify(results, null, 2);
  log(results.error ? `error: ${results.error}` : 'done');
}

main();
