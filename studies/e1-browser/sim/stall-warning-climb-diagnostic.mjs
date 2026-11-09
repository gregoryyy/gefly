// Weak-power climb/sampling diagnosis only. Existing WASM, unchanged model and
// fixed step; source-derived static CL components are not exported total lift.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';
import { stallFields } from './cockpit.js';
const M = await createJSBSim({ print: () => {}, printErr: () => {} });
const dt = 1 / 120, deg = Math.PI / 180;
const read = (fn, n) => { const p = fn() >> 3; return Array.from(M.HEAPF64.subarray(p, p + n)); };
const sha = data => createHash('sha256').update(data).digest('hex');
const build = JSON.parse(readFileSync(new URL('./dist/build-info.json', import.meta.url)));
assert.equal(sha(readFileSync(new URL('./dist/jsbsim.wasm', import.meta.url))), build.wasm_sha256);
const xml = readFileSync(new URL('../../../output/flight/engine-build/prepared-aircraft/c172x/c172x.xml', import.meta.url), 'utf8');
assert.equal(sha(xml), build.aircraft_adapter.prepared_sha256, 'source table bytes match the recorded prepared model');
const fn = name => xml.match(new RegExp(`<function name="aero/coefficient/${name}">([\\s\\S]*?)</function>`))[1];
const rows = text => text.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));
const wbh = rows(fn('CLwbh').match(/<tableData>([\s\S]*?)<\/tableData>/)[1]).slice(1);
const derivative = rows(fn('CLalpha').match(/<tableData breakPoint="0">([\s\S]*?)<\/tableData>/)[1]);
const betaColumn = derivative[0].indexOf(0) + 1;
const alphaDerivative = derivative.slice(1).map(row => [row[0], row[betaColumn]]);
function interpolate(table, x, column = 1) {
  if (x <= table[0][0]) return table[0][column];
  for (let i = 1; i < table.length; i++) if (x <= table[i][0]) {
    const p = table[i - 1], q = table[i]; return p[column] + (q[column] - p[column]) * (x - p[0]) / (q[0] - p[0]);
  }
  return table.at(-1)[column]; // JSBSim FGTable clamps outside its grid.
}
const components = alpha => ({ CLwbh: interpolate(wbh, alpha), CLalpha_term: alpha * interpolate(alphaDerivative, alpha / deg) });
const tableCurve = wbh.map(([alpha]) => { const c = components(alpha); return { alpha_rad: alpha, ...c, source_static_sum: c.CLwbh + c.CLalpha_term }; });
const configs = [];
for (const elevator of [-.35, -.5, -.6, -.7, -.8]) for (const heading of [false, true]) configs.push({
  id: `weak-climb-elevator-${elevator}-${heading ? 'heading-held' : 'manual'}`, throttle: .2, elevator, heading, ramp: 8, duration: 40, recover: 24,
});
for (const trim of [-.15, -.35]) for (const heading of [false, true]) configs.push({
  id: `weak-climb-trim-${trim}-${heading ? 'heading-held' : 'manual'}`, throttle: .2, trim, heading, ramp: 12, duration: 40, recover: 24,
});
configs.push({ id: 'weak-power-VS-climb-servo', throttle: .2, heading: true, vs: 3, duration: 80 });
// A bounded near-onset input sweep measures transient signal duration. It tunes
// neither the aircraft model nor the warning threshold and is not a user trace.
for (const elevator of [-.45, -.455, -.4566, -.457, -.458, -.46, -.465]) configs.push({
  id: `near-onset-weak-climb-${elevator}`, throttle: .2, elevator, heading: true, ramp: 8, duration: 25, recover: 24,
});
for (const elevator of [-.5, -.7]) configs.push({
  id: `weak-climb-existing-app-roll-offset-${elevator}`, throttle: .2, elevator, heading: false,
  aileron: -.109375, ramp: 8, duration: 40, recover: 24,
});
const results = [];
for (const config of configs) {
  assert.equal(M._gf_init(dt, 49.96 * deg, 8.643 * deg, 1200, 82 * deg, 45), 0);
  assert.equal(M._gf_trim_status(), 1);
  assert.equal(M._gf_set_autopilot(config.heading ? 2 : 0, 82 * deg), 0);
  assert.equal(M._gf_set_autopilot_vertical(config.vs ? 1 : 0, config.vs ?? 0), 0);
  assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
  const initialTrim = read(M._gf_pitch_trim_state, 3)[0];
  const samples = [], windows = [], reversals = [], positiveSteps = [];
  let current = null, previousUp = 0, maxAlpha = -Infinity, maxAltitude = 1200, minCas = Infinity, maxFormulaError = 0;
  for (let step = 0; step <= config.duration / dt; step++) {
    const state = read(M._gf_state, 14), stall = read(M._gf_stall_state, 13), cockpit = read(M._gf_cockpit_state, 8), ground = read(M._gf_ground_state, 18);
    assert.equal(Object.keys(stallFields(stall)).length, 13);
    const active = stall[11] > 0 && !cockpit[7] && !ground[5]; positiveSteps.push(active);
    const expected = stall[9] > .85 * stall[10] ? 10 * (stall[9] / stall[10] - .85) : 0;
    maxFormulaError = Math.max(maxFormulaError, Math.abs(expected - stall[11]));
    maxAlpha = Math.max(maxAlpha, stall[9]); maxAltitude = Math.max(maxAltitude, state[3]); minCas = Math.min(minCas, cockpit[0]);
    const c = components(stall[9]);
    const sample = { step, t_s: state[0], alt_msl_m: state[3], cas_mps: cockpit[0], tas_mps: state[7],
      pitch_rad: state[5], roll_rad: state[4], alpha_rad: stall[9], warning_norm: stall[11], stall_hysteresis: stall[12],
      climb_mps: -ground[4], flight_path_rad: Math.atan2(-ground[4], Math.hypot(ground[2], ground[3])),
      pilot_body_nz_norm: cockpit[3], on_ground: cockpit[7], contact_mask: ground[5], source_zero_beta_zero_rate_CL_reference: c };
    if (step % 30 === 0) samples.push(sample);
    if (step > 120 && previousUp > 0 && -ground[4] <= 0) reversals.push(sample);
    previousUp = -ground[4];
    if (active && !current) current = { start_step: step, onset: sample };
    if (!active && current) { windows.push({ ...current, end_step_exclusive: step, duration_s: (step - current.start_step) * dt, clear: sample }); current = null; }
    if (cockpit[7] || ground[5] || state[3] < 100 || step === config.duration / dt) break;
    const time = step * dt, recovering = config.recover !== undefined && time >= config.recover;
    const fraction = Math.min(1, time / (config.ramp ?? 1));
    if (config.trim !== undefined) assert.equal(M._gf_set_pitch_trim(recovering ? initialTrim : initialTrim + (config.trim - initialTrim) * fraction), 0);
    assert.equal(M._gf_set_inputs(recovering ? .1 : (config.elevator ?? 0) * fraction, config.aileron ?? 0, 0, recovering ? .7 : config.throttle), 0);
    assert.equal(M._gf_step(), 0);
  }
  if (current) windows.push({ ...current, end_step_exclusive: positiveSteps.length, duration_s: (positiveSteps.length - current.start_step) * dt, still_active_at_end: true });
  const resampling = [1, 1.5, 2, 5, 10].map(rate => {
    const intervalSteps = 2 * rate;
    const phases = Array.from({ length: intervalSteps }, (_, phase) => {
      const sampled = windows.map(window => {
        const first = window.start_step + ((phase - window.start_step) % intervalSteps + intervalSteps) % intervalSteps;
        return first < window.end_step_exclusive;
      });
      return { phase_step: phase, captured_window_indices: sampled.flatMap((hit, i) => hit ? [i] : []), missed_window_indices: sampled.flatMap((hit, i) => hit ? [] : [i]) };
    });
    return { rate, ideal_60_wall_hz_interval_steps: intervalSteps, ideal_interval_sim_s: intervalSteps * dt, phases };
  });
  assert(maxFormulaError < 1e-10);
  results.push({ config, initial_trim_norm: initialTrim, max_alpha_rad: maxAlpha, min_cas_mps: minCas,
    max_altitude_gain_m: maxAltitude - 1200, warning_formula_max_error: maxFormulaError, windows, climb_reversals: reversals, resampling, samples });
}
const report = { scope: 'Existing WASM weak-power climb diagnostics and exact phase resampling; not aircraft fidelity, browser or observed real-worker-packet acceptance',
  fixed_step_s: dt, worker_state_hz: 60, sampling_limit: 'Ideal phase grids only. Actual worker tick batching/catch-up can produce different publication steps; UI RAF may be coarser again.',
  native_total_CL_and_lift: 'Not exported. Source reference components use zero sideslip, zero flap and hysteresis=0, omitting dynamic rate, elevator and ground-effect contributions; they are not total native lift during the maneuvers.',
  source: { wasm_sha256: build.wasm_sha256, prepared_model_sha256: sha(xml), worker_sha256: sha(readFileSync(new URL('./worker.js', import.meta.url))) },
  table_curve_zero_flap_zero_beta_hysteresis_zero: tableCurve, results };
writeFileSync(new URL('../../../output/flight/stall-warning-native-task132-climb.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(results.map(r => ({ id: r.config.id, max_alpha_rad: r.max_alpha_rad, min_cas_mps: r.min_cas_mps,
  max_altitude_gain_m: r.max_altitude_gain_m, windows: r.windows.map(w => ({ start_s: w.onset.t_s, duration_s: w.duration_s, cas_mps: w.onset.cas_mps, climb_mps: w.onset.climb_mps })),
  rates_with_phase_misses: r.resampling.filter(s => s.phases.some(p => p.missed_window_indices.length)).map(s => s.rate) })), null, 2));
