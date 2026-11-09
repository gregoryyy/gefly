// TODO2.0.133: existing-WASM full-power level-flight propulsion diagnostic.
// No model, engine, propeller, native API or aircraft coefficient is changed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';
import { DEFAULT_LOADING, loadingValues } from './loading.js';
const DT = 1 / 120, DEG = Math.PI / 180, HP_W = 745.6998715822702;
const M = await createJSBSim({ print: () => {}, printErr: () => {} });
const read = (fn, count) => {
  const pointer = fn() >> 3, values = Array.from(M.HEAPF64.subarray(pointer, pointer + count));
  assert.equal(values.length, count); assert(values.every(Number.isFinite)); return values;
};
const load = input => {
  if (!input) { assert.equal(M._gf_configure_loading(0, 0), 0); return; }
  const values = loadingValues(input), pointer = M._malloc(values.byteLength);
  try { M.HEAPF64.set(values, pointer >> 3); assert.equal(M._gf_configure_loading(pointer, values.length), 0); }
  finally { M._free(pointer); }
};
const source = name => createHash('sha256').update(readFileSync(new URL(name, import.meta.url))).digest('hex');
const cases = [];
for (const [loadingName, loading] of [['native-default', null], ['same-without-external', { ...DEFAULT_LOADING, external_kg: 0 }]]) {
  for (const initialHeight_m of [400, 1000]) {
    load(loading);
    assert.equal(M._gf_init(DT, 49.96 * DEG, 8.643 * DEG, initialHeight_m, 82 * DEG, 45), 0);
    const initialMass = read(M._gf_loading_state, 13);
    assert.equal(M._gf_set_inputs(0, 0, 0, 1), 0);
    assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
    assert.equal(M._gf_set_engine_controls(1, 1), 0);
    assert.equal(M._gf_set_autopilot(2, 82 * DEG), 0);
    assert.equal(M._gf_set_autopilot_vertical(2, initialHeight_m), 0);
    const samples = [];
    for (let step = 0; step <= 180 / DT; step++) {
      if (step % 120 === 0) {
        const state = read(M._gf_state, 14), prop = read(M._gf_propeller_state, 4);
        const cockpit = read(M._gf_cockpit_state, 8), air = read(M._gf_stall_state, 13);
        const ground = read(M._gf_ground_state, 18), engine = read(M._gf_engine_state, 13);
        const controls = read(M._gf_control_state, 7), switches = read(M._gf_engine_switch_state, 2);
        assert.equal(controls[0], 1); assert.equal(switches[0], 1);
        assert.equal(cockpit[4], 0); assert.equal(cockpit[7], 0);
        samples.push({ t_s: state[0], alt_msl_m: state[3], tas_mps: state[7], cas_mps: cockpit[0],
          climb_mps: -ground[4], roll_rad: state[4], pitch_rad: state[5],
          thrust_n: prop[0], native_engine_power_w: prop[1], native_engine_power_hp: prop[1] / HP_W,
          propeller_rpm: prop[3] * 60 / (2 * Math.PI), advance_ratio: prop[2],
          approximate_propulsive_efficiency: prop[0] * state[7] / prop[1],
          aero_alpha_rad: air[9], stall_warning_norm: air[11], manifold_pressure_pa: engine[0],
          applied_mixture_norm: engine[2], mixture_automatic: engine[3], throttle_norm: controls[0], engine_running: switches[0] });
      }
      if (step < 180 / DT) assert.equal(M._gf_step(), 0);
    }
    const window = samples.filter(s => s.t_s >= 150 - DT);
    const mean = key => window.reduce((sum, sample) => sum + sample[key], 0) / window.length;
    const keys = ['alt_msl_m','tas_mps','cas_mps','climb_mps','roll_rad','pitch_rad','thrust_n','native_engine_power_hp','propeller_rpm','advance_ratio','approximate_propulsive_efficiency','aero_alpha_rad'];
    const result = { loading: loadingName, initial_height_m: initialHeight_m,
      initial_mass_kg: initialMass[0], initial_mass_lb: initialMass[0] / .45359237,
      initial_payload_kg: initialMass.slice(3, 9), initial_fuel_mass_kg: initialMass[2],
      trim_status: M._gf_trim_status(), diagnostic_window_s: [150, 180],
      means: Object.fromEntries(keys.map(key => [key, mean(key)])),
      window_altitude_change_m: window.at(-1).alt_msl_m - window[0].alt_msl_m,
      window_tas_change_mps: window.at(-1).tas_mps - window[0].tas_mps,
      maximum_warning: Math.max(...samples.map(s => s.stall_warning_norm)),
      final_digest: M.UTF8ToString(M._gf_digest_hex()), samples };
    cases.push(result);
    console.log(JSON.stringify({ ...result, samples: undefined }));
  }
}
const result = { scope: 'Actual existing WASM; full-power generic level/heading servos. Observations, not C172 performance acceptance. Efficiency uses TAS rather than exact prop-axis local velocity, so is explicitly approximate.',
  units: 'SI except explicitly hp/rpm/lb diagnostic boundaries',
  diagnostic_sha256: source('./c172-propeller-audit.mjs'),
  wasm_sha256: source('./dist/jsbsim.wasm'), bridge_sha256: source('./bridge.cpp'),
  prepared_propeller_sha256: source('./.work/prepared-engine/prop_75in2f.xml'),
  build_info: JSON.parse(readFileSync(new URL('./dist/build-info.json', import.meta.url))), cases };
writeFileSync(new URL('../../../output/flight/c172-propeller-task133.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
