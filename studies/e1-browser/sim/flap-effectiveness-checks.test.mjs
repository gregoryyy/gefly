import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFlapEffectiveness } from './flap-effectiveness-checks.mjs';

// Synthetic admission fixtures; these values are not flight observations.
function fixture() {
  const wasm = '266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc';
  const model = 'cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595';
  const configs = [
    ...[60, 75, 85].flatMap(cas_kt => ['manual-trim', 'VS0-compensation'].flatMap(profile => [0, 10, 20, 30].map(flap_deg => ({ cas_kt, profile, flap_deg, duration_s: 30 })))),
    ...[60, 75].flatMap(cas_kt => [0, 10, 20, 30].map(flap_deg => ({ cas_kt, profile: 'idle-lateral-level', flap_deg, duration_s: 120 }))),
  ];
  const results = configs.map(config => {
    config.id = `${config.cas_kt}cas-${config.profile}-flap${config.flap_deg}`;
    const state = Array.from({ length: 14 }, (_, index) => index === 7 ? config.cas_kt : 0);
    const loading = [2400 * .45359237, ...Array(12).fill(0)];
    const samples = [0, .5, 1, 2, 4, 10].map(tau_s => ({ tau_s, cas_kt: config.cas_kt - config.flap_deg * tau_s / 100,
      pitch_deg: config.flap_deg * tau_s / 100, q_degps: 0, climb_mps: 0, altitude_msl_m: 1000,
      pilot_normal_specific_force_g: 1 + config.flap_deg * tau_s / 10000, elevator_actual_deg: 0,
      flap_actual_deg: config.flap_deg * Math.min(1, tau_s / 4), flap_command_norm: config.flap_deg / 30,
      throttle_norm: config.profile === 'idle-lateral-level' ? 0 : .5,
      aileron_command_norm: 0, elevator_command_norm: 0, rudder_command_norm: 0, state_raw_14: state.slice() }));
    return { config, initial: { initial_balance: [1, 0, 0], initial_loading_raw_13: loading, trim_throttle_norm: .5,
      clean_before_command: { state_raw_14: state.slice() } }, baseline: { state_raw_14: state.slice() }, samples,
      final: { tau_s: config.duration_s }, stop: 'declared duration', digest: '0123456789abcdef', min_cas_kt: 50, max_warning_norm: 0 };
  });
  const native = { source_hashes: { 'dist/jsbsim.wasm': wasm, 'bridge.cpp': 'a'.repeat(64), 'prepare-aircraft.py': 'b'.repeat(64), 'flap-effectiveness-native.mjs': 'c'.repeat(64) },
    build: { wasm_sha256: wasm, aircraft_adapter: { adapter_id: 'gefly-c172x-mixture-pitch-ap-v5', prepared_sha256: model } }, fixed_step_s: 1 / 120,
    verification: { cases: 32, unchanged_wasm: true, exact_repeat: '75cas-manual-trim-flap30', paused_command_checks: 39 },
    actuator: [[0, 10], [10, 20], [20, 30], [30, 20], [20, 10], [10, 0]].map(([from_deg, target_deg]) => ({ from_deg, target_deg, duration_s: Math.min(from_deg, target_deg) === 0 ? 2 : 1, reached_s: Math.min(from_deg, target_deg) === 0 ? 2 : 1, maximum_error_deg: 0 })), results };
  const source = { source: { wasm_sha256: wasm, reconstructed_prepared_sha256: model, diagnostic_sha256: 'd'.repeat(64) },
    traverse: [{ degrees: 0, transition_s: 0 }, { degrees: 10, transition_s: 2 }, { degrees: 20, transition_s: 1 }, { degrees: 30, transition_s: 1 }],
    samples: [0, 5, 10, 15].flatMap(alpha_deg => [0, 10, 20, 30].map(flap_deg => ({ alpha_deg, flap_deg,
      static_lift_subset_CL: 1 + flap_deg / 100, static_drag_subset_CD: .1 + flap_deg / 1000, direct_CmDf: -flap_deg / 1000 }))) };
  return { native, source };
}
const reject = (mutate, expected) => { const data = fixture(); mutate(data); assert.throws(() => validateFlapEffectiveness(data.native, data.source), expected); };

test('complete synthetic evidence is admitted without claiming aircraft calibration', () => {
  const data = fixture(), summary = validateFlapEffectiveness(data.native, data.source);
  assert.equal(summary.cases.length, 32); assert.equal(summary.representative_75CAS.length, 8);
  assert.match(summary.scope, /real C172P\/S.*not evaluated/);
});
test('empty, partial and duplicate case matrices fail', () => {
  reject(data => { data.native.results = []; });
  reject(data => { data.native.results.pop(); });
  reject(data => { data.native.results[1] = structuredClone(data.native.results[0]); });
});
test('stale engine and mismatched reconstructed model fail', () => {
  reject(data => { data.native.source_hashes['dist/jsbsim.wasm'] = 'e'.repeat(64); });
  reject(data => { data.source.source.reconstructed_prepared_sha256 = 'f'.repeat(64); });
});
test('nonfinite telemetry and absent early samples fail', () => {
  reject(data => { data.native.results[1].samples[1].cas_kt = NaN; });
  reject(data => { data.native.results[1].samples.splice(1, 1); });
});
test('unreached flaps and zero-effect substituted traces fail', () => {
  reject(data => { data.native.results[1].samples.at(-1).flap_actual_deg = 0; });
  reject(data => {
    const row = data.native.results[1], clean = data.native.results[0];
    for (const [index, sample] of row.samples.entries()) for (const field of ['cas_kt', 'pitch_deg', 'pilot_normal_specific_force_g']) sample[field] = clean.samples[index][field];
  });
});
test('bad source actuator timing and unmatched start states fail', () => {
  reject(data => { data.native.actuator[0].reached_s = 3; });
  reject(data => { data.native.results[1].baseline.state_raw_14[7] += 1; });
});
test('missing command checks, empty digest and invalid source effects fail', () => {
  reject(data => { delete data.native.verification.paused_command_checks; });
  reject(data => { data.native.results[1].digest = ''; });
  reject(data => { data.source.samples[1].static_drag_subset_CD = 0; });
});
test('flap10 labels cannot conceal flap0 configuration and telemetry', () => {
  reject(data => {
    const row = data.native.results.find(value => value.config.id === '75cas-manual-trim-flap10');
    row.config.flap_deg = 0;
    for (const sample of row.samples) { sample.flap_command_norm = 0; sample.flap_actual_deg = 0; }
  }, /case fields match declared identifier/);
  for (const [key, value] of [['cas_kt', 60], ['profile', 'VS0-compensation'], ['duration_s', 120]]) {
    reject(data => { data.native.results.find(row => row.config.id === '75cas-manual-trim-flap10').config[key] = value; }, /case fields match declared identifier/);
  }
});
test('matching invented actuator durations cannot replace source traverse timing', () => {
  reject(data => { data.native.actuator[0].duration_s = 100; data.native.actuator[0].reached_s = 100; }, /source actuator legs and durations/);
  reject(data => { data.source.traverse[1].transition_s = 100; }, /source traverse timings/);
});
test('all sample times must be finite, on-grid, bounded, unique and sorted', () => {
  for (const time of [Infinity, NaN, -1 / 120, 30 + 1 / 120]) {
    reject(data => { const row = data.native.results[0]; row.samples.push({ ...row.samples.at(-1), tau_s: time }); }, /sample time is finite/);
  }
  reject(data => {
    const row = data.native.results[0]; row.samples.splice(2, 0, { ...row.samples[1], tau_s: .75 + 1 / 240 });
  }, /sample time is finite/);
  reject(data => { const row = data.native.results[0]; row.samples.push({ ...row.samples.at(-1) }); });
  reject(data => { const row = data.native.results[0]; row.samples.splice(1, 0, { ...row.samples[0], tau_s: Number.EPSILON / 2 }); }, /sample fixed steps are unique/);
  reject(data => { const row = data.native.results[0]; [row.samples[0], row.samples[1]] = [row.samples[1], row.samples[0]]; });
});
