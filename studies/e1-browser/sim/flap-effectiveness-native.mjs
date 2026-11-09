// Current installed generic172P flap-response diagnostic; no model/bridge edits.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import createNative from './dist/jsbsim.mjs';
import { FLIGHT_DEFAULT_LOADING, loadingValues } from './loading.js';

const DT = 1 / 120, RAD = Math.PI / 180, KT = 1852 / 3600, G = 9.80665;
const EXPECTED_WASM = '266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc';
const EXPECTED_XML = 'cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['dist/jsbsim.wasm', 'dist/jsbsim.mjs', 'dist/build-info.json', 'bridge.cpp', 'prepare-aircraft.py', 'loading.js', 'flap-effectiveness-native.mjs'];
const sources = Object.fromEntries(await Promise.all(files.map(async path => [path, sha(await readFile(new URL(path, import.meta.url)))])));
const build = JSON.parse(await readFile(new URL('./dist/build-info.json', import.meta.url), 'utf8'));
assert.equal(sources['dist/jsbsim.wasm'], EXPECTED_WASM);
assert.equal(build.wasm_sha256, EXPECTED_WASM);
assert.equal(build.aircraft_adapter.adapter_id, 'gefly-c172x-mixture-pitch-ap-v5');
assert.equal(build.aircraft_adapter.prepared_sha256, EXPECTED_XML);
assert.equal(sources['bridge.cpp'], build.bridge_sha256);
assert.equal(sources['prepare-aircraft.py'], build.aircraft_adapter.adapter_script_sha256);
const M = await createNative({ print() {}, printErr() {} });
const read = (fn, count) => {
  const offset = fn() / 8, result = Array.from(M.HEAPF64.subarray(offset, offset + count));
  assert.equal(result.length, count); assert(result.every(Number.isFinite), 'native telemetry is finite'); return result;
};
function balance() {
  const pointer = M._malloc(24);
  try { assert.equal(M._gf_initial_balance_state(pointer), 0); return Array.from(M.HEAPF64.subarray(pointer / 8, pointer / 8 + 3)); }
  finally { M._free(pointer); }
}
function sample() {
  const state = read(M._gf_state, 14), cockpit = read(M._gf_cockpit_state, 8), ground = read(M._gf_ground_state, 18);
  const aero = read(M._gf_stall_state, 13), control = read(M._gf_control_state, 7), pitch = read(M._gf_pitch_trim_state, 3);
  const engine = read(M._gf_engine_state, 13), prop = read(M._gf_propeller_state, 4);
  return { step: M._gf_step_index(), t_s: state[0], cas_kt: cockpit[0] / KT, tas_mps: state[7], altitude_msl_m: state[3],
    roll_deg: state[4] / RAD, pitch_deg: state[5] / RAD, p_degps: state[11] / RAD, q_degps: state[12] / RAD,
    alpha_deg: aero[9] / RAD, alpha_max_deg: aero[10] / RAD, stall_warning_norm: aero[11], stall_hysteresis: aero[12],
    pilot_normal_specific_force_g: cockpit[3], climb_mps: -ground[4], flap_command_norm: M._gf_flap_command_norm(), flap_actual_deg: cockpit[4] / RAD,
    aileron_command_norm: control[1], elevator_command_norm: control[2], rudder_command_norm: control[3],
    elevator_actual_deg: pitch[2] / RAD, pitch_trim_norm: pitch[0], throttle_norm: control[0],
    engine_rpm: engine[1] * 60 / (2 * Math.PI), mixture_norm: engine[2], mixture_auto: engine[3],
    propeller_thrust_N: prop[0], shaft_power_W: prop[1], static_pressure_pa: M._gf_static_pressure_pa(),
    on_ground: cockpit[7], structure_contact_mask: ground[5], energy_height_proxy_m: state[3] + state[7] ** 2 / (2 * G),
    state_raw_14: state };
}
function initialize(cas_kt) {
  const values = loadingValues(FLIGHT_DEFAULT_LOADING), pointer = M._malloc(values.byteLength);
  try { M.HEAPF64.set(values, pointer / 8); assert.equal(M._gf_configure_loading(pointer, values.length), 0); }
  finally { M._free(pointer); }
  let tas_mps = cas_kt * KT;
  for (let i = 0; i < 5; i++) {
    assert.equal(M._gf_init_balanced(DT, 49.96 * RAD, 8.643 * RAD, 1000, 82 * RAD, tas_mps), 0);
    tas_mps *= cas_kt * KT / read(M._gf_cockpit_state, 8)[0];
  }
  assert.equal(M._gf_init_balanced(DT, 49.96 * RAD, 8.643 * RAD, 1000, 82 * RAD, tas_mps), 0);
  assert.equal(M._gf_trim_status(), 1); assert.equal(balance()[0], 1);
  assert.equal(M._gf_set_autopilot(0, 0), 0); assert.equal(M._gf_set_autopilot_vertical(0, 0), 0);
  assert.equal(M._gf_set_secondary_inputs(0, 0), 0); assert.equal(M._gf_set_engine_controls(1, 1), 0);
  const throttle = M._gf_trim_throttle();
  const initialLoading = read(M._gf_loading_state, 13);
  assert(Math.abs(initialLoading[0] / .45359237 - 2400) < 1e-6, 'fresh loading is2400lb before the declared clean settling interval');
  assert(Math.abs(sample().cas_kt - cas_kt) < 1e-6);
  // Identical clean controls/history for all members of each speed comparison.
  for (let step = 0; step < 240; step++) { assert.equal(M._gf_set_inputs(0, 0, 0, throttle), 0); assert.equal(M._gf_step(), 0); }
  return { requested_initial_cas_kt: cas_kt, trim_throttle_norm: throttle, trim_pitch_norm: M._gf_trim_pitch(),
    initial_balance: balance(), initial_loading_raw_13: initialLoading, loading_raw_13: read(M._gf_loading_state, 13), clean_before_command: sample() };
}
let pausedCommandChecks = 0;
function commandFlaps(degrees) {
  const before = sample(), digest = M.UTF8ToString(M._gf_digest_hex());
  assert.equal(M._gf_set_secondary_inputs(degrees / 30, 0), 0);
  assert.equal(M._gf_step_index(), before.step); assert.equal(M.UTF8ToString(M._gf_digest_hex()), digest);
  assert.equal(sample().flap_actual_deg, before.flap_actual_deg); assert.equal(M._gf_flap_command_norm(), degrees / 30);
  pausedCommandChecks++;
}
const sampleTimes = [0, .5, 1, 2, 4, 5, 10, 20, 30, 60, 90, 120];
const requestedSteps = new Map(sampleTimes.map(time => [Math.round(time / DT), time]));
function run(config) {
  const initial = initialize(config.cas_kt), baseline = sample();
  if (config.profile !== 'manual-trim') assert.equal(M._gf_set_autopilot(1, 0), 0);
  if (config.profile === 'VS0-compensation') assert.equal(M._gf_set_autopilot_vertical(1, 0), 0);
  commandFlaps(config.flap_deg);
  const throttle = config.profile === 'idle-lateral-level' ? 0 : initial.trim_throttle_norm;
  const samples = [], warningTransitions = [];
  let stop = 'declared duration', warning = false, minCas = Infinity, maxAlpha = -Infinity, maxWarning = 0, maxBank = 0, maxClimb = -Infinity, minClimb = Infinity;
  let final;
  const end = Math.round(config.duration_s / DT);
  for (let step = 0; step <= end; step++) {
    assert.equal(M._gf_set_inputs(0, 0, 0, throttle), 0);
    const row = sample(), tau_s = step * DT;
    minCas = Math.min(minCas, row.cas_kt); maxAlpha = Math.max(maxAlpha, row.alpha_deg);
    maxWarning = Math.max(maxWarning, row.stall_warning_norm); maxBank = Math.max(maxBank, Math.abs(row.roll_deg));
    maxClimb = Math.max(maxClimb, row.climb_mps); minClimb = Math.min(minClimb, row.climb_mps);
    if (requestedSteps.has(step)) samples.push({ tau_s, ...row });
    const active = row.stall_warning_norm > 0;
    if (active !== warning) { warning = active; warningTransitions.push({ active, tau_s, cas_kt: row.cas_kt, alpha_deg: row.alpha_deg }); }
    if (row.on_ground || row.structure_contact_mask || row.altitude_msl_m < 100 || Math.abs(row.roll_deg) > 30 || Math.abs(row.pitch_deg) > 45 || row.cas_kt < 15 || row.cas_kt > 140) {
      stop = 'contact/altitude/attitude/airspeed diagnostic bound'; final = { tau_s, ...row }; break;
    }
    if (step === end) { final = { tau_s, ...row }; break; }
    assert.equal(M._gf_step(), 0);
  }
  return { config, initial, baseline, samples, warningTransitions, final, stop, min_cas_kt: minCas, max_alpha_deg: maxAlpha,
    max_warning_norm: maxWarning, max_abs_roll_deg: maxBank, climb_range_mps: [minClimb, maxClimb],
    digest: M.UTF8ToString(M._gf_digest_hex()) };
}
const actuator = [];
initialize(75); assert.equal(M._gf_set_autopilot(1, 0), 0); assert.equal(M._gf_set_autopilot_vertical(1, 0), 0);
for (const target of [10, 20, 30, 20, 10, 0]) {
  const before = sample(), from = Math.round(before.flap_actual_deg), duration_s = Math.min(from, target) === 0 ? 2 : 1;
  commandFlaps(target);
  let reached_s = null, maximum_error_deg = 0;
  for (let index = 1; index <= Math.round(duration_s / DT) + 2; index++) {
    assert.equal(M._gf_step(), 0); const current = sample(), elapsed_s = index * DT;
    const expected = from + Math.sign(target - from) * Math.min(10, 10 * elapsed_s / duration_s);
    maximum_error_deg = Math.max(maximum_error_deg, Math.abs(current.flap_actual_deg - expected));
    if (reached_s === null && Math.abs(current.flap_actual_deg - target) < 1e-7) reached_s = elapsed_s;
  }
  assert(reached_s !== null && Math.abs(reached_s - duration_s) <= DT + 1e-8); assert(maximum_error_deg < 1e-7);
  actuator.push({ from_deg: from, target_deg: target, duration_s, reached_s, maximum_error_deg });
}
const configs = [];
for (const cas_kt of [60, 75, 85]) for (const profile of ['manual-trim', 'VS0-compensation']) for (const flap_deg of [0, 10, 20, 30])
  configs.push({ id: `${cas_kt}cas-${profile}-flap${flap_deg}`, cas_kt, profile, flap_deg, duration_s: 30 });
for (const cas_kt of [60, 75]) for (const flap_deg of [0, 10, 20, 30])
  configs.push({ id: `${cas_kt}cas-idle-lateral-level-flap${flap_deg}`, cas_kt, profile: 'idle-lateral-level', flap_deg, duration_s: 120 });
const results = configs.map(config => {
  const result = run(config);
  console.log(JSON.stringify({ id: config.id, final_s: result.final.tau_s, cas_kt: result.final.cas_kt, pitch_deg: result.final.pitch_deg,
    climb_mps: result.final.climb_mps, flap_actual_deg: result.final.flap_actual_deg, min_cas_kt: result.min_cas_kt, warning: result.max_warning_norm, stop: result.stop }));
  return result;
});
for (const result of results) {
  const clean = results.find(row => row.config.cas_kt === result.config.cas_kt && row.config.profile === result.config.profile && row.config.flap_deg === 0);
  assert.deepEqual(result.baseline.state_raw_14, clean.baseline.state_raw_14, 'matched initial physical state per speed/profile');
  assert.equal(result.initial.trim_throttle_norm, clean.initial.trim_throttle_norm);
  const fields = ['cas_kt', 'pitch_deg', 'q_degps', 'climb_mps', 'altitude_msl_m', 'pilot_normal_specific_force_g', 'elevator_actual_deg', 'energy_height_proxy_m'];
  result.delta_vs_clean = result.samples.map(row => {
    const reference = clean.samples.find(value => value.tau_s === row.tau_s);
    return reference ? { tau_s: row.tau_s, ...Object.fromEntries(fields.map(field => [field, row[field] - reference[field]])) } : { tau_s: row.tau_s, unavailable: 'clean case reached a diagnostic bound earlier' };
  });
}
const repeat = run(configs.find(config => config.id === '75cas-manual-trim-flap30'));
const original = results.find(row => row.config.id === repeat.config.id);
assert.equal(repeat.digest, original.digest); assert.deepEqual(repeat.samples, original.samples);
assert.equal(sha(await readFile(new URL('./dist/jsbsim.wasm', import.meta.url))), EXPECTED_WASM);
const report = { scope: 'Current generic1982C172P native flap-response diagnostic; not aircraft calibration, C172S fidelity or flight instruction.',
  generated_at: new Date().toISOString(), fixed_step_s: DT, source_hashes: sources, build,
  conditions: { initial_altitude_msl_m: 1000, initial_heading_true_deg: 82, initial_clean_settle_s: 2, loading: FLIGHT_DEFAULT_LOADING,
    atmosphere: 'native default still air; exact OAT not exported', matching: 'same clean balanced initialization, initial CAS, loading and control history; evolving airspeed/attitude not imposed',
    manual: 'all autopilots off, zero pilot axes and retained clean trim/throttle', compensation: 'existing generic lateral-level and VS0 servos, same clean throttle, not installed KAP response validation',
    idle: 'idle throttle, lateral-level servo only, retained clean pitch trim; finite transient, not stabilized glide',
    force: 'pilot normal specific-force telemetry is observed; separate static source coefficients are not claimed as measured native forces',
    stopping: 'contact, altitude<100m, bank>30deg, pitch>45deg, CASoutside15..140kt; stop is a diagnostic interpretation bound, not an aircraft limit' },
  actuator, results, verification: { exact_repeat: repeat.config.id, cases: results.length, unchanged_wasm: true, paused_command_checks: pausedCommandChecks } };
const output = new URL('../../../output/flight/flap-effectiveness/', import.meta.url); await mkdir(output, { recursive: true });
await writeFile(new URL('native.json', output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: results.length, exact_repeat: repeat.config.id, actuator }));
