// TODO2.0.153 / R-SIM-5: bounded diagnostic, not aircraft stability acceptance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const moduleUrl = process.env.GF_NATIVE_MODULE ? pathToFileURL(process.env.GF_NATIVE_MODULE) : new URL('./dist/jsbsim.mjs', import.meta.url);
const { default: createNative } = await import(moduleUrl.href);
import { FLIGHT_DEFAULT_LOADING, loadingValues } from './loading.js';

const DT = 1 / 120, RAD = Math.PI / 180, KT = 1852 / 3600;
const START = 600, RELEASE = 660, END = 3060; // 5s settled +0.5s pulse +20s release.
const RELEASE_SAMPLES_S = [0, .5, 1, 2, 5, 10, 20];
const RELEASE_SAMPLE_STEPS = new Map(RELEASE_SAMPLES_S.map(seconds => {
  const steps = seconds / DT;
  assert(Number.isSafeInteger(steps), 'release sample must align with an integer simulation step');
  assert.equal(steps * DT, seconds, 'release sample seconds must round-trip through the fixed step');
  return [steps, seconds];
}));
assert.equal(RELEASE_SAMPLE_STEPS.size, RELEASE_SAMPLES_S.length, 'release samples have distinct steps');
const M = await createNative({ print() {}, printErr() {} });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['dist/jsbsim.wasm', 'dist/jsbsim.mjs', 'dist/build-info.json', 'loading.js', 'bridge.cpp', 'disturbance-response-native.mjs'];
const fileUrl = path => path.startsWith('dist/') ? new URL(path.slice(5), moduleUrl) : new URL(path, import.meta.url);
const sources = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, hash(await readFile(fileUrl(path)))])));
const build = JSON.parse(await readFile(fileUrl('dist/build-info.json'), 'utf8'));
assert.equal(sources['dist/jsbsim.wasm'], build.wasm_sha256);
const read = (fn, length) => {
  const p = fn() / 8, result = Array.from(M.HEAPF64.subarray(p, p + length));
  assert.equal(result.length, length); assert(result.every(Number.isFinite)); return result;
};
const balance = () => {
  const p = M._malloc(24);
  try { assert.equal(M._gf_initial_balance_state(p), 0); return Array.from(M.HEAPF64.subarray(p / 8, p / 8 + 3)); }
  finally { M._free(p); }
};
function initialize(cas_kt) {
  const values = loadingValues(FLIGHT_DEFAULT_LOADING), p = M._malloc(values.byteLength);
  try { M.HEAPF64.set(values, p / 8); assert.equal(M._gf_configure_loading(p, values.length), 0); }
  finally { M._free(p); }
  let tas_mps = cas_kt * KT;
  for (let i = 0; i < 5; i++) {
    assert.equal(M._gf_init_balanced(DT, 49.96 * RAD, 8.643 * RAD, 396.24, 82 * RAD, tas_mps), 0);
    tas_mps *= cas_kt * KT / read(M._gf_cockpit_state, 8)[0];
  }
  assert.equal(M._gf_init_balanced(DT, 49.96 * RAD, 8.643 * RAD, 396.24, 82 * RAD, tas_mps), 0);
  assert.equal(M._gf_trim_status(), 1); assert.equal(M._gf_set_autopilot(0, 0), 0);
  assert.equal(M._gf_set_autopilot_vertical(0, 0), 0); assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
  assert(Math.abs(read(M._gf_cockpit_state, 8)[0] / KT - cas_kt) < 1e-6);
  return { balance: balance(), throttle_norm: M._gf_trim_throttle(), pitch_trim_norm: M._gf_trim_pitch() };
}
function sample() {
  const state = read(M._gf_state, 14), controls = read(M._gf_control_state, 7), cockpit = read(M._gf_cockpit_state, 8);
  const pitch = read(M._gf_pitch_trim_state, 3), aero = read(M._gf_stall_state, 13);
  return { step: M._gf_step_index(), t_s: state[0], roll_deg: state[4] / RAD, pitch_deg: state[5] / RAD,
    heading_deg: state[6] / RAD, altitude_msl_m: state[3], cas_kt: cockpit[0] / KT,
    p_degps: state[11] / RAD, q_degps: state[12] / RAD, r_degps: state[13] / RAD,
    beta_deg: Math.atan2(aero[1], Math.hypot(aero[0], aero[2])) / RAD,
    aileron_cmd_norm: controls[1], elevator_cmd_norm: controls[2], rudder_cmd_norm: controls[3],
    left_aileron_deg: controls[4] / RAD, right_aileron_deg: controls[5] / RAD,
    differential_aileron_deg: (controls[4] - controls[5]) / 2 / RAD,
    elevator_deg: pitch[2] / RAD, rudder_deg: controls[6] / RAD,
    alpha_deg: aero[9] / RAD, stall_warning_norm: aero[11], on_ground: cockpit[7],
    state_raw_14: state, controls_raw_7: controls, pitch_raw_3: pitch, aero_raw_13: aero };
}
function run(config) {
  const trim = initialize(config.cas_kt), initial = sample(), trace = [], release = [];
  let stop = '20 seconds after release';
  for (let step = 0; step <= END; step++) {
    const pulse = step >= START && step < RELEASE ? config.pulse_norm : 0;
    assert.equal(M._gf_set_inputs(config.axis === 'elevator' ? pulse : 0,
      config.axis === 'aileron' ? pulse : 0, config.axis === 'rudder' ? pulse : 0, trim.throttle_norm), 0);
    const current = step % 12 === 0 || step === RELEASE || step === END ? sample() : null;
    if (current) trace.push(current);
    const afterReleaseSteps = step - RELEASE;
    if (RELEASE_SAMPLE_STEPS.has(afterReleaseSteps))
      release.push({ after_release_s: RELEASE_SAMPLE_STEPS.get(afterReleaseSteps), ...sample() });
    if (current?.on_ground || (current && current.altitude_msl_m < 100)) { stop = 'contact or100m diagnostic floor'; break; }
    if (step === END) break;
    assert.equal(M._gf_step(), 0);
  }
  assert.deepEqual(balance(), trim.balance, 'fixed trim identity stays unchanged');
  assert(release.every(row => row.aileron_cmd_norm === 0 && row.elevator_cmd_norm === 0 && row.rudder_cmd_norm === 0));
  const atPulse = trace.find(row => row.step === START + 12);
  if (config.axis !== 'neutral') assert.equal(atPulse[config.axis + '_cmd_norm'], config.pulse_norm);
  return { config, trim, initial, release, trace, stop, final: sample(), digest: M.UTF8ToString(M._gf_digest_hex()) };
}
const configs = [];
for (const cas_kt of [60, 80, 100]) {
  configs.push({ id: `${cas_kt}-neutral`, cas_kt, axis: 'neutral', pulse_norm: 0 });
  for (const axis of ['aileron', 'elevator', 'rudder']) for (const pulse_norm of [-.1, -.05, -.02, .02, .05, .1])
    configs.push({ id: `${cas_kt}-${axis}-${pulse_norm}`, cas_kt, axis, pulse_norm });
}
const results = configs.map(run), fields = ['roll_deg', 'pitch_deg', 'cas_kt', 'p_degps', 'q_degps', 'r_degps',
  'beta_deg', 'left_aileron_deg', 'right_aileron_deg', 'differential_aileron_deg', 'elevator_deg', 'rudder_deg'];
for (const result of results) {
  const neutral = results.find(row => row.config.cas_kt === result.config.cas_kt && row.config.axis === 'neutral');
  result.delta_vs_neutral = result.release.map(row => {
    const base = neutral.release.find(x => x.after_release_s === row.after_release_s);
    return { after_release_s: row.after_release_s, ...Object.fromEntries(fields.map(field => [field, row[field] - base[field]])) };
  });
}
const repeat = run(configs.find(config => config.id === '80-aileron-0.05'));
const original = results.find(result => result.config.id === repeat.config.id);
assert.equal(repeat.digest, original.digest); assert.deepEqual(repeat.release, original.release);
assert.equal(hash(await readFile(fileUrl('dist/jsbsim.wasm'))), sources['dist/jsbsim.wasm']);
const report = { scope: 'Generic prepared c172x native pulse/release diagnostic; no aircraft stability or self-leveling acceptance',
  generated_at: new Date().toISOString(), native_module: moduleUrl.href, fixed_step_s: DT, initial_altitude_msl_m: 396.24,
  pulse_start_s: START * DT, pulse_duration_s: (RELEASE - START) * DT, release_samples_s: RELEASE_SAMPLES_S,
  loading: FLIGHT_DEFAULT_LOADING, atmosphere: 'existing default still-air native atmosphere', flaps: 'up', autopilot: 'off',
  configuration: 'balanced fresh start; fixed source-derived roll/yaw and pitch trim; fixed trim throttle; no continuous assist',
  source_hashes: sources, jsbsim_commit: build.jsbsim_commit, prepared_aircraft_sha256: build.aircraft_adapter.prepared_sha256,
  verification: { cases: results.length, deterministic_repeat: repeat.config.id, exact_repeat: true, unchanged_wasm: true }, results };
const output = process.env.GF_DISTURBANCE_OUTPUT ? pathToFileURL(process.env.GF_DISTURBANCE_OUTPUT.replace(/\/?$/, '/')) : new URL('../../../output/flight/disturbance-response-native/', import.meta.url);
await mkdir(output, { recursive: true });
const serialized = JSON.stringify(report, null, 2) + '\n';
await writeFile(new URL('observations.json', output), serialized);
await writeFile(new URL('summary.json', output), JSON.stringify({ ...report, results: results.map(({ trace, release, initial, final, ...result }) => ({
  ...result, initial: Object.fromEntries(['roll_deg', 'pitch_deg', ...fields.slice(7)].map(field => [field, initial[field]])),
  final: Object.fromEntries(fields.map(field => [field, final[field]])),
})), observations_sha256: hash(serialized) }, null, 2) + '\n');
for (const result of results.filter(row => row.config.axis === 'aileron' || row.config.axis === 'neutral')) {
  const at = seconds => result.delta_vs_neutral.find(row => row.after_release_s === seconds);
  console.log(JSON.stringify({ id: result.config.id, stop: result.stop, delta_surface_deg: at(1).differential_aileron_deg,
    delta_p0_degps: at(0).p_degps, delta_p1_degps: at(1).p_degps, delta_p5_degps: at(5).p_degps,
    delta_p20_degps: at(20).p_degps, delta_bank20_deg: at(20).roll_deg, delta_beta20_deg: at(20).beta_deg }));
}
console.log(JSON.stringify({ result: 'pass', cases: results.length, exact_repeat: true, artifact: new URL('observations.json', output).pathname }));
