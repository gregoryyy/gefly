// R-INPUT-1/R-SIM-5: diagnose the existing native model and application commands.
// These comparisons are regression measurements, not calibrated C172 limits.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';
import { DEFAULT_LOADING, FLIGHT_DEFAULT_LOADING, loadingValues } from './loading.js';

const DT = 1 / 120, DEG = Math.PI / 180, KT = 1852 / 3600;
const sha = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
const M = await createJSBSim({ print() {}, printErr() {} });
const read = (fn, count) => {
  const index = fn() >> 3;
  const values = Array.from(M.HEAPF64.subarray(index, index + count));
  assert(values.every(Number.isFinite), 'native telemetry must be present and finite');
  return values;
};
const build = JSON.parse(readFileSync(new URL('./dist/build-info.json', import.meta.url)));
const pointer = M._malloc(8 * 8);
function initialize(cas_kt, noExternal) {
  const values = loadingValues(noExternal ? FLIGHT_DEFAULT_LOADING : DEFAULT_LOADING);
  M.HEAPF64.set(values, pointer >> 3);
  assert.equal(M._gf_configure_loading(pointer, values.length), 0);
  let tas = cas_kt * KT;
  for (let iteration = 0; iteration < 5; iteration++) {
    assert.equal(M._gf_init(DT, 49.96 * DEG, 8.643 * DEG, 396.24, 82 * DEG, tas), 0);
    tas *= cas_kt * KT / read(M._gf_cockpit_state, 8)[0];
  }
  assert.equal(M._gf_init(DT, 49.96 * DEG, 8.643 * DEG, 396.24, 82 * DEG, tas), 0);
  // At 110 kt the current engine may fail trim; retain that observed limitation
  // and never label the resulting response as a trimmed equilibrium.
  const trimStatus = M._gf_trim_status();
  assert(Math.abs(read(M._gf_cockpit_state, 8)[0] / KT - cas_kt) < 1e-7, 'CAS matching fixture converges');
  assert.equal(M._gf_set_autopilot(0, 0), 0);
  assert.equal(M._gf_set_autopilot_vertical(0, 0), 0);
  assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
  return { status: trimStatus, throttle_norm: M._gf_trim_throttle(), pitch_trim_norm: M._gf_trim_pitch(), loading_raw_13: read(M._gf_loading_state, 13), cg_structural_m: read(M._gf_stall_state, 13).slice(6, 9) };
}
function sample(step) {
  const state = read(M._gf_state, 14), cockpit = read(M._gf_cockpit_state, 8);
  const aero = read(M._gf_stall_state, 13), controls = read(M._gf_control_state, 7);
  return { step, t_s: state[0], altitude_msl_m: state[3], roll_deg: state[4] / DEG,
    pitch_deg: state[5] / DEG, heading_deg: state[6] / DEG, cas_kt: cockpit[0] / KT,
    p_degps: state[11] / DEG, q_degps: state[12] / DEG, r_degps: state[13] / DEG,
    beta_deg: Math.atan2(aero[1], Math.hypot(aero[0], aero[2])) / DEG,
    slip_ball_deg: Math.atan2(-cockpit[2], -cockpit[3]) / DEG,
    stall_warning_norm: aero[11], on_ground: cockpit[7], controls_raw_7: controls };
}
function run(config) {
  const trim = initialize(config.cas_kt, config.no_external), samples = [], initial = sample(0);
  let maxBank = 0, maxRollRate = 0, maxBeta = 0, maxWarning = 0, stop = '60-second limit';
  for (let step = 0; step <= 60 / DT; step++) {
    const current = sample(step);
    maxBank = Math.max(maxBank, Math.abs(current.roll_deg));
    maxRollRate = Math.max(maxRollRate, Math.abs(current.p_degps));
    maxBeta = Math.max(maxBeta, Math.abs(current.beta_deg));
    maxWarning = Math.max(maxWarning, current.stall_warning_norm);
    if (step % 30 === 0) samples.push(current);
    if (current.on_ground || current.altitude_msl_m < 100) { stop = 'contact or diagnostic 100m floor'; break; }
    if (step === 60 / DT) break;
    // Two-second deliberate input at t=5..7s; held inputs then release exactly.
    const pulse = current.t_s >= 5 && current.t_s < 7 ? (config.pulse_norm ?? 0) : 0;
    const aileron = pulse + (config.offset_norm ?? 0);
    const rudder = config.link ? -pulse : 0;
    const throttle = config.power === 'full' ? 1 : trim.throttle_norm;
    assert.equal(M._gf_set_inputs(0, aileron, rudder, throttle), 0);
    assert.equal(M._gf_step(), 0);
  }
  const final = sample(M._gf_step_index());
  const at = second => samples.find(s => Math.abs(s.t_s - second) < DT / 2);
  return { config, trim, initial, stop, summary: { max_abs_bank_deg: maxBank,
    max_abs_roll_rate_degps: maxRollRate, max_abs_beta_deg: maxBeta, max_stall_warning_norm: maxWarning,
    at5: at(5), at7: at(7), at10: at(10), at30: at(30), at60: at(60) },
    final, digest: M.UTF8ToString(M._gf_digest_hex()), samples };
}
const configs = [];
for (const cas_kt of [70, 90, 110]) for (const no_external of [false, true]) {
  for (const offset_norm of [0, -.109375]) for (const power of ['trim', 'full']) {
    configs.push({ id: `${cas_kt}cas-noexternal${no_external}-neutral-offset${offset_norm}-${power}`, cas_kt, no_external, offset_norm, power });
  }
  for (const pulse_norm of [.1, .45]) for (const link of [false, true]) {
    configs.push({ id: `${cas_kt}cas-noexternal${no_external}-pulse${pulse_norm}-link${link}`, cas_kt, no_external, pulse_norm, link, power: 'trim' });
  }
}
try {
  const results = configs.map(config => {
    const result = run(config);
    console.log(JSON.stringify({ id: config.id, trim: result.trim, stop: result.stop,
      peak_bank_deg: result.summary.max_abs_bank_deg, peak_p_degps: result.summary.max_abs_roll_rate_degps,
      peak_beta_deg: result.summary.max_abs_beta_deg,
      bank7_deg: result.summary.at7?.roll_deg, bank30_deg: result.summary.at30?.roll_deg,
      bank60_deg: result.summary.at60?.roll_deg, final_cas_kt: result.final.cas_kt }));
    return result;
  });
  const repeat = run(configs[0]);
  assert.equal(repeat.digest, results[0].digest, 'same fixed-step native case repeats exactly');
  assert.deepEqual(repeat.final, results[0].final);
  const report = { scope: 'Existing generic c172x runtime command diagnosis, not C172S validation or operating advice',
    fixed_step_s: DT, initial_altitude_msl_m: 396.24, loading: { source_default: DEFAULT_LOADING, no_external: { ...DEFAULT_LOADING, external_kg: 0 } },
    conditions: 'CAS matched at initialization only; clean flaps, longitudinal trim retained, lateral and vertical AP off, still-air/default native atmosphere. Pulse amplitudes/times are input fixtures, not aircraft limits.',
    sources: { wasm_sha256: sha('./dist/jsbsim.wasm'), glue_sha256: sha('./dist/jsbsim.mjs'),
      build_info_sha256: sha('./dist/build-info.json'), script_sha256: sha('./control-stability-native.mjs'),
      build_record_wasm_sha256: build.wasm_sha256,
      build_provenance_verified: sha('./dist/jsbsim.wasm') === build.wasm_sha256,
      native_binary_not_rebuilt: true },
    deterministic_repeat: { id: configs[0].id, digest: repeat.digest, exact_final_match: true }, results };
  const output = new URL('../../../output/flight/', import.meta.url); mkdirSync(output, { recursive: true });
  writeFileSync(new URL('control-stability-native.json', output), JSON.stringify(report, null, 2));
} finally { M._free(pointer); }
