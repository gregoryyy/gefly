// TODO2.0.133 / R-SIM-5 / R-FID-3: measurements of existing research bytes,
// not aircraft calibration, POH agreement or an operating recommendation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';
import { DEFAULT_LOADING, loadingValues, loadingFields } from './loading.js';
import { engineFields } from './engine.js';
import { stallFields } from './cockpit.js';

const M = await createJSBSim({ print: () => {}, printErr: () => {} });
const DT = 1 / 120, DEG = Math.PI / 180, KT = 1852 / 3600, LB = .45359237;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = name => sha(readFileSync(new URL(name, import.meta.url)));
const build = JSON.parse(readFileSync(new URL('./dist/build-info.json', import.meta.url)));
assert.equal(sourceHash('./dist/jsbsim.wasm'), build.wasm_sha256);
const read = (fn, count) => {
  const offset = fn() >> 3;
  const values = Array.from(M.HEAPF64.subarray(offset, offset + count));
  assert(values.every(Number.isFinite), 'existing native telemetry is available and finite');
  return values;
};
const configure = config => {
  const values = loadingValues(config), pointer = M._malloc(values.byteLength);
  try { M.HEAPF64.set(values, pointer >> 3); assert.equal(M._gf_configure_loading(pointer, values.length), 0); }
  finally { M._free(pointer); }
};
const loads = {
  original: DEFAULT_LOADING,
  without_external: { ...DEFAULT_LOADING, external_kg: 0 },
  two_occupants: { ...DEFAULT_LOADING, rear_left_kg: 0, rear_right_kg: 0, baggage_kg: 0, external_kg: 0 },
};
const sample = step => {
  const s = read(M._gf_state, 14), cockpit = read(M._gf_cockpit_state, 8), ground = read(M._gf_ground_state, 18);
  const stall = read(M._gf_stall_state, 13), engine = read(M._gf_engine_state, 13), prop = read(M._gf_propeller_state, 4);
  assert.equal(Object.keys(stallFields(stall)).length, 13);
  assert.equal(Object.keys(engineFields(engine)).length, 13);
  return { step, t_s: s[0], alt_msl_m: s[3], cas_mps: cockpit[0], tas_mps: s[7],
    climb_mps: -ground[4], pitch_rad: s[5], roll_rad: s[4], body_rates_radps: s.slice(11),
    flap_deg: cockpit[4] / DEG, stall_raw_13: stall, cockpit_raw_8: cockpit,
    engine: engineFields(engine), loading: loadingFields(read(M._gf_loading_state, 13)),
    controls_raw_7: read(M._gf_control_state, 7), trim_raw_3: read(M._gf_pitch_trim_state, 3),
    thrust_n: prop[0], shaft_power_w: prop[1], advance_ratio: prop[2], prop_radps: prop[3],
    rpm: prop[3] * 60 / (2 * Math.PI), on_ground: cockpit[7], contact_mask: ground[5],
    engine_switch_raw_2: read(M._gf_engine_switch_state, 2) };
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function run(config) {
  configure(loads[config.load]);
  let initialTas = 45;
  if (config.initial_cas_kt !== undefined) {
    initialTas = config.initial_cas_kt * KT;
    // The public native initializer takes TAS. Solve only this atmosphere's
    // CAS/TAS conversion via read-only native feedback; do not set an IAS node.
    for (let i = 0; i < 4; i++) {
      assert.equal(M._gf_init(DT, 49.96 * DEG, 8.643 * DEG, config.alt_m, 82 * DEG, initialTas), 0);
      initialTas *= config.initial_cas_kt * KT / read(M._gf_cockpit_state, 8)[0];
    }
  }
  assert.equal(M._gf_init(DT, 49.96 * DEG, 8.643 * DEG, config.alt_m, 82 * DEG, initialTas), 0);
  const trimStatus = M._gf_trim_status();
  const initial = sample(0);
  assert.equal(M._gf_set_autopilot(2, 82 * DEG), 0);
  assert.equal(M._gf_set_engine_controls(1, 1), 0);
  assert.equal(M._gf_set_secondary_inputs(config.flap_deg / 30, 0), 0);
  const samples = [], warnings = [];
  let speedIntegral = 0, vsDemand = 0, warningActive = false, maxAlpha = -Infinity, maxWarning = 0;
  let stop = 'duration', final;
  const duration = config.duration_s ?? (config.recovery_s ? config.recovery_s + 60 : config.forced_pull ? 45 : 180);
  for (let step = 0; step <= duration / DT; step++) {
    const cockpit = read(M._gf_cockpit_state, 8), ground = read(M._gf_ground_state, 18), stall = read(M._gf_stall_state, 13);
    const active = stall[11] > 0 && cockpit[7] === 0 && ground[5] === 0;
    maxAlpha = Math.max(maxAlpha, stall[9]); maxWarning = Math.max(maxWarning, stall[11]);
    if (active !== warningActive) { warnings.push({ active, sample: sample(step) }); warningActive = active; }
    if (step % 120 === 0) samples.push({ ...sample(step), commanded_vs_mps: vsDemand });
    if (cockpit[7] || ground[5] || ground[0] < 5) { stop = 'native contact or diagnostic 5m AGL floor'; final = sample(step); break; }
    if (step === duration / DT) { final = sample(step); break; }
    const recovering = config.recovery_s !== undefined && step * DT >= config.recovery_s;
    if (config.forced_pull && !recovering) {
      assert.equal(M._gf_set_autopilot_vertical(0, 0), 0);
      assert.equal(M._gf_set_inputs(-.5 * Math.min(1, step * DT / 8), 0, 0, 1), 0);
    } else if (config.fixed_vs !== undefined && !recovering) {
      vsDemand = config.fixed_vs;
      assert.equal(M._gf_set_autopilot_vertical(1, vsDemand), 0);
      assert.equal(M._gf_set_inputs(0, 0, 0, 1), 0);
    } else {
      // Diagnostic pilot only: a bounded PI speed outer loop requests the
      // already installed native VS servo. These are test-controller choices,
      // never aircraft coefficients, calibrated pilot gains or flight advice.
      const error = cockpit[0] - (recovering ? 75 : config.target_cas_kt) * KT;
      speedIntegral = clamp(speedIntegral + .03 * error * DT, -6, 6);
      const desired = clamp(.8 * error + speedIntegral, -6, 6);
      vsDemand += clamp(desired - vsDemand, -.4 * DT, .4 * DT);
      assert.equal(M._gf_set_autopilot_vertical(1, vsDemand), 0);
      assert.equal(M._gf_set_inputs(0, 0, 0, 1), 0);
    }
    assert.equal(M._gf_step(), 0);
  }
  const phaseEnd = Math.min(config.recovery_s ?? final.t_s, final.t_s);
  const tail = samples.filter(s => s.t_s >= phaseEnd - 30 && s.t_s < phaseEnd + .001);
  const mean = fn => tail.reduce((sum, s) => sum + fn(s), 0) / tail.length;
  const first = tail[0], last = tail.at(-1), span = last.t_s - first.t_s;
  const summary = { initial_mass_lb: initial.loading.mass_total_kg / LB, initial_cg_structural_m: initial.stall_raw_13.slice(6, 9),
    observed_final_window_s: [first.t_s, last.t_s], mean_alt_msl_m: mean(s => s.alt_msl_m),
    mean_cas_kt: mean(s => s.cas_mps / KT), cas_change_mps: last.cas_mps - first.cas_mps,
    mean_climb_mps: mean(s => s.climb_mps), height_change_rate_mps: span ? (last.alt_msl_m - first.alt_msl_m) / span : null,
    energy_height_change_rate_mps: span ? ((last.alt_msl_m + last.tas_mps ** 2 / (2 * 9.80665)) -
      (first.alt_msl_m + first.tas_mps ** 2 / (2 * 9.80665))) / span : null,
    mean_rpm: mean(s => s.rpm), mean_shaft_power_w: mean(s => s.shaft_power_w), mean_thrust_n: mean(s => s.thrust_n),
    mean_map_pa: mean(s => s.engine.manifold_pressure_pa), mean_mixture_norm: mean(s => s.engine.mixture_norm),
    mean_flap_deg: mean(s => s.flap_deg), max_abs_roll_deg: Math.max(...samples.map(s => Math.abs(s.roll_rad / DEG))),
    max_alpha_rad: maxAlpha, max_warning_norm: maxWarning,
    final_speed_error_kt: final.cas_mps / KT - (config.recovery_s ? 75 : config.target_cas_kt),
    recovery: config.recovery_s ? { requested_at_s: config.recovery_s, target_cas_kt: 75,
      final_cas_kt: final.cas_mps / KT, final_climb_mps: final.climb_mps, final_alpha_rad: final.stall_raw_13[9],
      final_warning_norm: final.stall_raw_13[11], final_alt_msl_m: final.alt_msl_m } : null };
  return { config, trim_status: trimStatus, initial_trim_throttle: M._gf_trim_throttle(), initial, stop, summary,
    warning_transitions: warnings, samples, final, digest_fnv1a64: M.UTF8ToString(M._gf_digest_hex()) };
}
const mode = process.argv[2] ?? 'full';
assert(['preview', 'full', 'low-start'].includes(mode), 'bounded named diagnostic mode');
const configs = [];
for (const load of Object.keys(loads)) for (const alt_m of [30, 1000]) for (const flap_deg of [0, 10, 20, 30])
  configs.push({ id: `${load}-${alt_m}m-flap${flap_deg}-75cas`, load, alt_m, flap_deg, target_cas_kt: 75 });
if (mode === 'preview') configs.splice(3);
else if (mode === 'low-start') {
  configs.length = 0;
  for (const initial_cas_kt of [40, 45, 50]) for (const flap_deg of [0, 10])
    configs.push({ id: `original-1000m-initial${initial_cas_kt}cas-flap${flap_deg}-level-recovery`, load: 'original',
      alt_m: 1000, flap_deg, initial_cas_kt, target_cas_kt: initial_cas_kt, fixed_vs: 0, duration_s: 45 });
} else {
  for (const load of Object.keys(loads)) for (const target_cas_kt of [65, 85])
    configs.push({ id: `${load}-1000m-clean-${target_cas_kt}cas`, load, alt_m: 1000, flap_deg: 0, target_cas_kt });
  for (const load of Object.keys(loads)) configs.push({ id: `${load}-1000m-fullpower-forced-pull`, load,
    alt_m: 1000, flap_deg: 0, target_cas_kt: 75, forced_pull: true, recovery_s: 20 });
  for (const target_cas_kt of [40, 45, 50]) for (const flap_deg of [0, 10])
    configs.push({ id: `original-1000m-flap${flap_deg}-${target_cas_kt}cas-recovery`, load: 'original',
      alt_m: 1000, flap_deg, target_cas_kt, recovery_s: 180 });
  for (const load of ['original', 'without_external']) for (const fixed_vs of [3, 5])
    configs.push({ id: `${load}-1000m-clean-VS${fixed_vs}-recovery`, load, alt_m: 1000,
      flap_deg: 0, target_cas_kt: 75, fixed_vs, recovery_s: 120 });
}
const results = configs.map(config => {
  const result = run(config);
  console.log(JSON.stringify({ id: config.id, stop: result.stop, trim: result.trim_status, ...result.summary }));
  return result;
});
// One exact repeated baseline checks deterministic native stepping; no numeric
// tolerance or POH performance acceptance is inferred from repeatability.
const repeat = run(configs[0]);
assert.equal(repeat.digest_fnv1a64, results[0].digest_fnv1a64);
assert.deepEqual(repeat.final, results[0].final);
const report = {
  scope: 'Existing generic c172x/160hp research configuration; diagnostic only, not C172S/POH validation or operating guidance',
  mode, node: process.version, fixed_step_s: DT, initial_tas_mps: 45,
  configuration: { loads, mixture: 'native automatic mixture enabled, command1', throttle_norm: 1,
    lateral: 'existing native heading-hold servo82deg true', longitudinal: 'existing native VS servo with declared diagnostic PI CAS-seeking outer loop; forced-pull cases disable VS',
    atmosphere: 'native initialization default; OAT/pressure not exported, no claimed matching POH atmospheric condition',
    near_sea_level: '30m initial MSL avoids placing aircraft CG/gear at native flat ground; altitude rises/falls during cases',
    settling: 'last30simseconds reported with CAS/energy changes, no assumed steady-state or invented tolerance',
    limitations: 'CAS is native vc-fps, not calibrated installation IAS. Initial trim occurs clean before flaps deploy. Generic roll/VS servos and diagnostic speed controller are not a pilot or KAP acceptance fixture.' },
  source: { diagnostic_sha256: sourceHash('./c172-performance-diagnostic.mjs'), wasm_sha256: sourceHash('./dist/jsbsim.wasm'),
    glue_sha256: sourceHash('./dist/jsbsim.mjs'), build_info_sha256: sourceHash('./dist/build-info.json'), loading_js_sha256: sourceHash('./loading.js'), build },
  deterministic_repeat: { id: configs[0].id, digest_fnv1a64: repeat.digest_fnv1a64, exact_final_match: true }, results,
};
mkdirSync(new URL('../../../output/flight/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../../../output/flight/c172-performance-task133-${mode}.json`, import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ deterministic_repeat: report.deterministic_repeat, cases: results.length }));
