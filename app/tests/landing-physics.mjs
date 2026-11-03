// Research-runtime evidence only: no C172S limits or landing-fidelity acceptance.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import create from '../../studies/e1-browser/sim/dist/jsbsim.mjs';
const M = await create({ print() {}, printErr() {} });
const DEG = Math.PI / 180;
const ground = () => {
  const p = M._gf_ground_state() >> 3;
  return Array.from(M.HEAPF64.subarray(p, p + 18));
};
const state = () => {
  const p = M._gf_state() >> 3;
  return Array.from(M.HEAPF64.subarray(p, p + M._gf_state_len()));
};
function run(preset, hz) {
  assert.equal(M._gf_init_landing(1 / hz, 49.96 * DEG, 8.643 * DEG, 82 * DEG, preset), 0);
  const initial = ground(), initialState = state();
  assert(Math.abs(initial[0] - 3) < 1e-6);
  assert(Math.abs(initial[2] - 28) < 1e-9);
  assert(Math.abs(initial[3] - (preset === 3 ? 4 : 0)) < 1e-9);
  assert(Math.abs(initial[4] - (preset === 2 ? 4 : 1.5)) < 1e-9);
  assert(Math.abs(initialState[4] - (preset === 4 ? 8 * DEG : 0)) < 1e-9);
  assert(Math.abs(initialState[5] - 4 * DEG) < 1e-9);
  const result = { preset, hz, initial, initial_roll_rad: initialState[4], initial_pitch_rad: initialState[5],
    first_contact_s: null, wheel_contact_s: [null, null, null], first_contact_down_mps: null,
    first_contact_side_mps: null, peak_strut_total_n_first_half_second: 0,
    max_slip_rad_first_half_second: 0, max_compression_m: 0, structure_mask_seen: 0, max_bank_rad: 0 };
  for (let i = 0; i < hz * 10; i++) {
    // Current application's declared roll assist; no pilot control/automatic landing.
    assert.equal(M._gf_set_inputs(0, -.109375, 0, 0), 0);
    assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
    assert.equal(M._gf_step(), 0);
    const g = ground(), s = state(), t = (i + 1) / hz;
    assert([...g, ...s].every(Number.isFinite));
    if (result.first_contact_s === null && g[6] + g[10] + g[14] > 0) {
      result.first_contact_s = t;
      result.first_contact_down_mps = g[4]; result.first_contact_side_mps = g[3];
    }
    for (let w = 0; w < 3; w++) {
      if (result.wheel_contact_s[w] === null && g[6 + w * 4]) result.wheel_contact_s[w] = t;
      result.max_compression_m = Math.max(result.max_compression_m, g[7 + w * 4]);
      assert(g[7 + w * 4] >= 0); assert(g[8 + w * 4] >= 0);
    }
    if (result.first_contact_s !== null && t <= result.first_contact_s + .5) {
      result.peak_strut_total_n_first_half_second = Math.max(result.peak_strut_total_n_first_half_second, g[8] + g[12] + g[16]);
      result.max_slip_rad_first_half_second = Math.max(result.max_slip_rad_first_half_second, Math.abs(g[9]), Math.abs(g[13]), Math.abs(g[17]));
    }
    result.structure_mask_seen |= g[5];
    result.max_bank_rad = Math.max(result.max_bank_rad, Math.abs(s[4]));
  }
  assert.notEqual(result.first_contact_s, null);
  assert(result.peak_strut_total_n_first_half_second > 0);
  result.digest = M.UTF8ToString(M._gf_digest_hex()); result.final_state = state();
  return result;
}
const runs = [];
for (const hz of [120, 240]) {
  const group = [1, 2, 3, 4].map(preset => run(preset, hz));
  for (const result of group) assert.deepEqual(run(result.preset, hz), result, 'same-step fixture repeat must be deterministic');
  assert(group[1].peak_strut_total_n_first_half_second > group[0].peak_strut_total_n_first_half_second);
  assert(group[2].max_slip_rad_first_half_second > group[0].max_slip_rad_first_half_second);
  assert(group[3].wheel_contact_s[2] < group[3].wheel_contact_s[1]);
  assert(group[3].max_bank_rad > group[0].max_bank_rad);
  runs.push(...group);
}
// R-SIM-5: step-size tolerances declared before this check was first executed
// (2026-11-03). They are regression bounds for this generic fixture, not
// validated landing-fidelity limits: contact may shift by at most two coarse
// steps, early peak strut load by 25 % and maximum bank by 1 degree.
const TOLERANCE = Object.freeze({ first_contact_s: 2 / 120, peak_strut_load_relative: .25, maximum_bank_rad: 1 * DEG });
for (const result of runs) assert.equal(result.structure_mask_seen, 0, `preset ${result.preset} at ${result.hz} Hz: assisted landing has no tail/wingtip structure contact`);
const convergence = runs.slice(0, 4).map((low, i) => {
  const high = runs[i + 4];
  return { preset: low.preset, first_contact_difference_s: Math.abs(low.first_contact_s - high.first_contact_s),
    peak_strut_load_relative_difference: Math.abs(low.peak_strut_total_n_first_half_second - high.peak_strut_total_n_first_half_second) / high.peak_strut_total_n_first_half_second,
    maximum_bank_difference_rad: Math.abs(low.max_bank_rad - high.max_bank_rad) };
});
for (const c of convergence) {
  assert(c.first_contact_difference_s <= TOLERANCE.first_contact_s, `preset ${c.preset} first-contact step-size difference ${c.first_contact_difference_s} s`);
  assert(c.peak_strut_load_relative_difference <= TOLERANCE.peak_strut_load_relative, `preset ${c.preset} peak strut load step-size difference ${c.peak_strut_load_relative_difference}`);
  assert(c.maximum_bank_difference_rad <= TOLERANCE.maximum_bank_rad, `preset ${c.preset} maximum bank step-size difference ${c.maximum_bank_difference_rad} rad`);
}
// Native structure contacts and their identity bits (F24: bound to the c172x
// contact names, not gear order). Tail skid is bit 1, right wingtip bit 4.
function structureContact(preset, elevator, aileron) {
  assert.equal(M._gf_init_landing(1 / 120, 49.96 * DEG, 8.643 * DEG, 82 * DEG, preset), 0);
  for (let i = 1; i <= 1200; i++) {
    assert.equal(M._gf_set_inputs(elevator, aileron, 0, 0), 0); assert.equal(M._gf_set_secondary_inputs(0, 0), 0); assert.equal(M._gf_step(), 0);
    const mask = ground()[5];
    if (mask) return { preset, elevator, aileron, first_structure_step: i, first_structure_mask: mask };
  }
  return { preset, elevator, aileron, first_structure_step: null, first_structure_mask: 0 };
}
const structure = { tail: structureContact(2, -1, -.109375), right_tip: structureContact(4, 0, 1) };
assert.equal(structure.tail.first_structure_mask, 1, 'hard landing with full aft elevator first touches the tail skid');
assert.equal(structure.right_tip.first_structure_mask, 4, 'right-banked landing with full right aileron first touches the right wingtip');
// The rudder window is on the ground with the nosewheel loaded throughout. This
// still combines nosewheel steering and aerodynamic rudder yaw; it does not
// isolate the steer-cmd-norm coupling (no separate steering input is exported).
const steering = [-.35, 0, .35].map(rudder => {
  M._gf_init_landing(1 / 120, 49.96 * DEG, 8.643 * DEG, 82 * DEG, 1);
  for (let i = 0; i < 120 * 8; i++) { M._gf_set_inputs(0, -.109375, 0, 0); M._gf_step(); }
  const heading = state()[6];
  let noseLoaded = true;
  for (let i = 0; i < 120; i++) { M._gf_set_inputs(0, -.109375, rudder, 0); M._gf_step(); const g = ground(); noseLoaded &&= g[6] === 1 && g[8] > 0; }
  return { rudder_norm: rudder, heading_change_rad: state()[6] - heading, nose_wheel_loaded_throughout: noseLoaded, groundspeed_mps: Math.hypot(ground()[2], ground()[3]) };
});
for (const run of steering) assert(run.nose_wheel_loaded_throughout, `rudder ${run.rudder_norm}: nosewheel stays in contact during the steering window`);
assert(steering[0].heading_change_rad > steering[1].heading_change_rad);
assert(steering[2].heading_change_rad < steering[1].heading_change_rad);
assert.equal(M._gf_init_landing(1 / 120, 0, 0, 0, 0), -6);
assert.equal(M._gf_init_landing(1 / 120, 0, 0, 0, 1.5), -6);
assert.equal(M._gf_init_landing(1 / 120, 0, 0, 0, NaN), -2);
assert.equal(M._gf_state_len(), 14);
const build = JSON.parse(await readFile(new URL('../../studies/e1-browser/sim/dist/build-info.json', import.meta.url)));
const evidence = { scope: 'Deterministic generic c172x flat-ellipsoid demonstrations, not aircraft landing or damage validation',
  setup: { cg_agl_m: 3, pitch_deg: 4, forward_mps: 28, baseline_down_mps: 1.5, faster_down_mps: 4,
    sideways_mps: 4, banked_roll_deg: 8, pilot_axes: [0, -.109375, 0], throttle: 0, flaps: 0, brakes: 0,
    duration_s: 10, peak_window_after_contact_s: .5 }, build, runs, tolerance: TOLERANCE, convergence, structure, steering,
  checks: ['all 8 runs finite', 'all 8 repeat exactly including dynamics digest and telemetry', 'higher initial sink yields higher early peak strut load',
    'sideways yields larger early wheel slip', 'banked right wheel contacts before left and more bank than baseline',
    'assisted presets show no structure contact', '120/240 Hz differences inside pre-declared tolerances',
    'tail skid and right wingtip contacts report their named structure bits',
    'rudder/steering rollout direction consistent with the nosewheel loaded (steering and aerodynamic rudder not separated)',
    'invalid preset codes rejected', '14-double original dynamics state retained'] };
await mkdir(new URL('../../output/flight/', import.meta.url), { recursive: true });
await writeFile(new URL('../../output/flight/landing-fixtures.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks, convergence, structure, steering }, null, 2));
