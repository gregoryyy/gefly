import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WASM = '266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc';
const MODEL = 'cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595';
const HEX = /^[0-9a-f]{64}$/;
const fields = ['cas_kt', 'pitch_deg', 'q_degps', 'climb_mps', 'altitude_msl_m', 'pilot_normal_specific_force_g', 'elevator_actual_deg'];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const expectedConfigs = () => [
  ...[60, 75, 85].flatMap(cas => ['manual-trim', 'VS0-compensation'].flatMap(profile => [0, 10, 20, 30].map(flap => `${cas}cas-${profile}-flap${flap}`))),
  ...[60, 75].flatMap(cas => [0, 10, 20, 30].map(flap => `${cas}cas-idle-lateral-level-flap${flap}`)),
];
const expectedConfigFields = id => {
  const match = /^(60|75|85)cas-(manual-trim|VS0-compensation|idle-lateral-level)-flap(0|10|20|30)$/.exec(id);
  assert(match, 'known declared case identifier');
  return { id, cas_kt: Number(match[1]), profile: match[2], flap_deg: Number(match[3]), duration_s: match[2] === 'idle-lateral-level' ? 120 : 30 };
};
const expectedActuatorLegs = [[0, 10, 2], [10, 20, 1], [20, 30, 1], [30, 20, 1], [20, 10, 1], [10, 0, 2]];
function gridTime(time, maximum, message) {
  assert(finite(time) && time >= 0 && time <= maximum, message);
  const step = Math.round(time * 120);
  assert(Number.isSafeInteger(step) && Math.abs(time - step / 120) <= 8 * Number.EPSILON * Math.max(1, Math.abs(time)), message);
  return step;
}
const at = (row, time) => row.samples.find(sample => sample.tau_s === time);
const rounded = value => Number(value.toFixed(5));

/** Software wiring/effect admission only; no invented real-aircraft tolerances. */
export function validateFlapEffectiveness(native, source) {
  assert.equal(native?.source_hashes?.['dist/jsbsim.wasm'], WASM, 'current installed native bytes');
  assert.equal(native?.build?.wasm_sha256, WASM);
  assert.equal(native?.build?.aircraft_adapter?.adapter_id, 'gefly-c172x-mixture-pitch-ap-v5');
  assert.equal(native?.build?.aircraft_adapter?.prepared_sha256, MODEL);
  assert.equal(source?.source?.wasm_sha256, WASM);
  assert.equal(source?.source?.reconstructed_prepared_sha256, MODEL, 'exact reconstructed executing model');
  assert.equal(native.fixed_step_s, 1 / 120);
  for (const value of Object.values(native.source_hashes)) assert(HEX.test(value), 'source identities are explicit');
  assert.equal(native.verification?.cases, 32); assert.equal(native.verification?.unchanged_wasm, true);
  assert.equal(native.verification?.exact_repeat, '75cas-manual-trim-flap30');
  assert.equal(native.verification?.paused_command_checks, 39);
  assert(Array.isArray(native.results)); assert.equal(native.results.length, 32, 'complete declared case matrix');
  assert.deepEqual([...native.results.map(row => row.config?.id)].sort(), expectedConfigs().sort(), 'exact nonduplicate matrix');
  assert.deepEqual(native.actuator?.map(row => [row.from_deg, row.target_deg, row.duration_s]), expectedActuatorLegs, 'source actuator legs and durations match model');
  assert.deepEqual(source.traverse?.map(row => [row.degrees, row.transition_s]), [[0, 0], [10, 2], [20, 1], [30, 1]], 'source traverse timings match model');
  for (const row of native.actuator) {
    assert(finite(row.reached_s)); assert(Math.abs(row.reached_s - row.duration_s) <= 1 / 120 + 1e-8);
    assert(finite(row.maximum_error_deg) && row.maximum_error_deg < 1e-7);
  }
  const bySpeed = new Map();
  const statuses = [];
  for (const row of native.results) {
    assert.deepEqual(row.config, expectedConfigFields(row.config.id), 'case fields match declared identifier');
    const { cas_kt, profile, flap_deg, duration_s } = row.config;
    assert.equal(row.initial.initial_balance[0], 1); assert.equal(row.initial.initial_loading_raw_13[8], 0, 'no outboard legacy load');
    assert(Math.abs(row.initial.initial_loading_raw_13[0] / .45359237 - 2400) < 1e-6);
    assert.deepEqual(row.baseline.state_raw_14, row.initial.clean_before_command.state_raw_14);
    if (bySpeed.has(cas_kt)) assert.deepEqual(row.baseline.state_raw_14, bySpeed.get(cas_kt), 'same physical start across flaps and controller profiles');
    else bySpeed.set(cas_kt, row.baseline.state_raw_14);
    assert(Array.isArray(row.samples) && row.samples.length >= 5);
    gridTime(row.final?.tau_s, duration_s, 'final time is finite, on the fixed-step grid and within duration');
    assert(row.final.tau_s >= 4);
    const times = row.samples.map(sample => sample.tau_s);
    const steps = times.map(time => gridTime(time, row.final.tau_s, 'sample time is finite, on the fixed-step grid and within observed duration'));
    assert.equal(new Set(steps).size, steps.length, 'sample fixed steps are unique');
    assert(steps.every((step, index) => index === 0 || step > steps[index - 1]), 'sample fixed steps are sorted');
    for (const time of [0, .5, 1, 2, 4]) assert(at(row, time), `${row.config.id} retains early transient samples`);
    for (const sample of row.samples) {
      for (const field of [...fields, 'flap_actual_deg', 'throttle_norm', 'elevator_command_norm']) assert(finite(sample[field]), `finite ${field}`);
      assert.equal(sample.flap_command_norm, flap_deg / 30);
      assert.equal(sample.throttle_norm, profile === 'idle-lateral-level' ? 0 : row.initial.trim_throttle_norm);
      assert.equal(sample.aileron_command_norm, 0); assert.equal(sample.elevator_command_norm, 0); assert.equal(sample.rudder_command_norm, 0);
      if (sample.tau_s >= 4) assert(Math.abs(sample.flap_actual_deg - flap_deg) < 1e-7, 'actual target reached');
      assert.equal(sample.state_raw_14.length, 14); assert(sample.state_raw_14.every(finite));
    }
    assert(finite(row.final.tau_s) && row.final.tau_s <= duration_s && row.final.tau_s >= 4);
    assert(typeof row.digest === 'string' && /^[0-9a-f]{16}$/.test(row.digest), 'native digest is an actual16-digit hexadecimal value');
    const clean = native.results.find(item => item.config.cas_kt === cas_kt && item.config.profile === profile && item.config.flap_deg === 0);
    const differences = [.5, 1, 2, 4].map(time => {
      const actual = at(row, time), baseline = at(clean, time);
      return { g: Math.abs(actual.pilot_normal_specific_force_g - baseline.pilot_normal_specific_force_g),
        pitch: Math.abs(actual.pitch_deg - baseline.pitch_deg), cas: Math.abs(actual.cas_kt - baseline.cas_kt) };
    });
    const measurable = differences.some(value => value.g > 1e-6 || value.pitch > 1e-5 || value.cas > 1e-5);
    assert(flap_deg === 0 || measurable, 'flap response exceeds numerical detectability guards');
    statuses.push({ id: row.config.id, end_s: rounded(row.final.tau_s), stop: row.stop });
  }
  assert(Array.isArray(source.samples)); assert.equal(source.samples.length, 16);
  assert.deepEqual(source.samples.map(row => `${row.alpha_deg}/${row.flap_deg}`).sort(), [0, 5, 10, 15].flatMap(alpha => [0, 10, 20, 30].map(flap => `${alpha}/${flap}`)).sort());
  for (const row of source.samples) {
    for (const key of ['static_lift_subset_CL', 'static_drag_subset_CD', 'direct_CmDf']) assert(finite(row[key]));
    if (row.flap_deg) {
      const base = source.samples.find(item => item.alpha_deg === row.alpha_deg && item.flap_deg === 0);
      assert(row.static_lift_subset_CL > base.static_lift_subset_CL);
      assert(row.static_drag_subset_CD > base.static_drag_subset_CD);
      assert(row.direct_CmDf < 0);
    }
  }
  const source5 = source.samples.filter(row => row.alpha_deg === 5);
  const representative = native.results.filter(row => row.config.cas_kt === 75 && row.config.profile !== 'idle-lateral-level').map(row => {
    const clean = native.results.find(item => item.config.cas_kt === 75 && item.config.profile === row.config.profile && item.config.flap_deg === 0);
    const difference = time => {
      const a = at(row, time), b = at(clean, time);
      return Object.fromEntries(['cas_kt', 'pitch_deg', 'climb_mps', 'elevator_actual_deg'].map(key => [key, rounded(a[key] - b[key])]));
    };
    return { profile: row.config.profile, flap_deg: row.config.flap_deg, delta_at4s: difference(4), delta_at10s: difference(10) };
  });
  return { scope: 'Connected command/actuator and measurable generic-model response pass; real C172P/S flap calibration and stall/steady-glide acceptance remain not evaluated.',
    criteria: { matrix: '32 complete unique cases', actuator: 'source timing within one fixed step; actual target within1e-7degree',
      effects: 'early response differs above numerical detectability guards (g1e-6, pitch/CAS1e-5); not aircraft tolerances',
      matched_source: 'positive lift/drag source increments at alpha0/5/10/15,beta0,ground-effect1; negative directCmDf',
      repeat: native.verification.exact_repeat, stall: `${native.results.filter(row => row.max_warning_norm > 0).length}cases with native warning; stall-speed comparison not evaluated`,
      glide: 'idle trajectories have different final airspeeds; no stabilized glide acceptance' },
    source_pins: { wasm: WASM, reconstructed_prepared_aircraft: MODEL, bridge: native.source_hashes['bridge.cpp'], adapter: native.source_hashes['prepare-aircraft.py'],
      native_diagnostic: native.source_hashes['flap-effectiveness-native.mjs'], source_diagnostic: source.source.diagnostic_sha256 },
    matched_source_alpha5: source5.map(row => ({ flap_deg: row.flap_deg, CL: rounded(row.static_lift_subset_CL), CD: rounded(row.static_drag_subset_CD), direct_CmDf: row.direct_CmDf,
      lift_change_percent: rounded((row.static_lift_subset_CL / source5[0].static_lift_subset_CL - 1) * 100), drag_change_percent: rounded((row.static_drag_subset_CD / source5[0].static_drag_subset_CD - 1) * 100) })),
    representative_75CAS: representative, cases: statuses };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = new URL('../../../output/flight/flap-effectiveness/', import.meta.url);
  const nativeBytes = await readFile(new URL('native.json', root)), sourceBytes = await readFile(new URL('source.json', root));
  const summary = validateFlapEffectiveness(JSON.parse(nativeBytes), JSON.parse(sourceBytes));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  summary.artifacts = { native: { path: 'output/flight/flap-effectiveness/native.json', sha256: sha(nativeBytes) },
    source: { path: 'output/flight/flap-effectiveness/source.json', sha256: sha(sourceBytes) }, checks_sha256: sha(await readFile(fileURLToPath(import.meta.url))) };
  summary.commands = ['python3 studies/e1-browser/sim/flap-effectiveness-source.py', 'node studies/e1-browser/sim/flap-effectiveness-native.mjs', 'node studies/e1-browser/sim/flap-effectiveness-checks.mjs'];
  await writeFile(new URL('summary.json', root), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ result: 'pass', cases: summary.cases.length, representative_75CAS: summary.representative_75CAS, source_alpha5: summary.matched_source_alpha5 }, null, 2));
}
