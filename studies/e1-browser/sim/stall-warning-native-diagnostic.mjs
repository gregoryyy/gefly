// Diagnostic maneuvers on the existing generic research WASM; no model tuning,
// aircraft stall-speed acceptance, browser rendering or audio claim.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';
import { stallFields } from './cockpit.js';

const M = await createJSBSim({ print: () => {}, printErr: () => {} });
const dt = 1 / 120, deg = Math.PI / 180;
const read = (fn, count) => { const pointer = fn() >> 3; return Array.from(M.HEAPF64.subarray(pointer, pointer + count)); };
const hash = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
const build = JSON.parse(readFileSync(new URL('./dist/build-info.json', import.meta.url), 'utf8'));
assert.equal(hash('./dist/jsbsim.wasm'), build.wasm_sha256, 'existing WASM matches its build record');
const cases = [
  { id: 'powered-trim', duration: 20, throttle: 'trim' },
  { id: 'idle-trim-retained', duration: 60, throttle: 0 },
  { id: 'idle-gradual-pull', duration: 60, throttle: 0, ramp: 30, elevator: -.45, recover: 45 },
  { id: 'idle-level-altitude-servo', duration: 90, throttle: 0, altitude: true },
  { id: 'idle-full-aft-trim-retained', duration: 30, throttle: 0, ramp: 2, elevator: -.75, recover: 10 },
  { id: 'prior-ui-stress-max-nose-up-trim', duration: 15, throttle: 0, ramp: .1, elevator: -.75, trim: -1, recover: 5 },
];
const results = [];
for (const config of cases) {
  assert.equal(M._gf_init(dt, 49.96 * deg, 8.643 * deg, 2500, 82 * deg, 45), 0);
  assert.equal(M._gf_trim_status(), 1, `${config.id}: successful native longitudinal trim`);
  // Declared lateral leveling assist isolates the longitudinal maneuver. This
  // is the existing generic native roll servo, not a calibrated pilot model.
  assert.equal(M._gf_set_autopilot(1, 0), 0);
  assert.equal(M._gf_set_autopilot_vertical(config.altitude ? 2 : 0, config.altitude ? 2500 : 0), 0);
  assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
  if (config.trim !== undefined) assert.equal(M._gf_set_pitch_trim(config.trim), 0);
  const trim = read(M._gf_pitch_trim_state, 3)[0];
  const throttle = config.throttle === 'trim' ? M._gf_trim_throttle() : config.throttle;
  const initialStallFields = stallFields(read(M._gf_stall_state, 13));
  const samples = [], transitions = [];
  let previousActive = false, maxFormulaError = 0, maxAlpha = -Infinity, minCas = Infinity, maxWarning = 0, stop = 'duration';
  for (let step = 0; step <= config.duration / dt; step++) {
    const state = read(M._gf_state, 14), raw = read(M._gf_stall_state, 13);
    const cockpit = read(M._gf_cockpit_state, 8), ground = read(M._gf_ground_state, 18);
    const fields = stallFields(raw);
    assert.equal(Object.keys(fields).length, 13, `${config.id}: all native stall fields remain valid`);
    const expected = raw[9] > .85 * raw[10] ? 10 * (raw[9] / raw[10] - .85) : 0;
    const active = raw[11] > 0 && cockpit[7] === 0 && ground[5] === 0;
    maxFormulaError = Math.max(maxFormulaError, Math.abs(expected - raw[11]));
    maxAlpha = Math.max(maxAlpha, raw[9]); minCas = Math.min(minCas, cockpit[0]); maxWarning = Math.max(maxWarning, raw[11]);
    const sample = { t_s: state[0], alt_msl_m: state[3], cas_mps: cockpit[0], tas_mps: state[7],
      pitch_rad: state[5], roll_rad: state[4], alpha_rad: raw[9], alpha_max_rad: raw[10],
      native_warning_norm: raw[11], native_hysteresis: raw[12], on_ground: cockpit[7], structure_contact_mask: ground[5],
      native_body_nz: cockpit[3], elevator_rad: read(M._gf_pitch_trim_state, 3)[2] };
    if (step % 60 === 0) samples.push(sample);
    if (active !== previousActive) { transitions.push({ active, ...sample, stall_fields: fields }); previousActive = active; }
    if (cockpit[7] || ground[5]) { stop = 'native contact'; break; }
    if (state[3] < 100) { stop = 'diagnostic altitude floor'; break; }
    if (step === config.duration / dt) break;
    const elapsed = step * dt, recovering = config.recover !== undefined && elapsed >= config.recover;
    const elevator = recovering ? .1 : (config.elevator ?? 0) * Math.min(1, elapsed / (config.ramp ?? 1));
    assert.equal(M._gf_set_inputs(elevator, 0, 0, recovering ? .7 : throttle), 0);
    assert.equal(M._gf_step(), 0, `${config.id}: native fixed-step integration`);
  }
  assert(maxFormulaError < 1e-10, `${config.id}: warning matches the pinned native AoA formula`);
  results.push({ config, trim_norm: trim, throttle_norm: throttle, initial_stall_fields: initialStallFields, stop,
    max_alpha_rad: maxAlpha, min_cas_mps: minCas, max_native_warning_norm: maxWarning,
    max_warning_formula_error: maxFormulaError, transitions, samples });
}
const report = { scope: 'Existing generic c172x WASM signal correspondence and diagnostic maneuvers; not aircraft calibration or UI/audio acceptance',
  fixed_step_s: dt, initial: { lat_deg: 49.96, lon_deg: 8.643, alt_msl_m: 2500, heading_true_deg: 82, tas_mps: 45, flaps_deg: 0 },
  lateral_assist: 'existing generic roll-level servo enabled in all cases; altitude servo only in its named case',
  source: { native: 'https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/FGAerodynamics.cpp',
    wasm_sha256: build.wasm_sha256, bridge_sha256: hash('./bridge.cpp'), adapter: build.aircraft_adapter }, results };
mkdirSync(new URL('../../../output/flight/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../../output/flight/stall-warning-native-diagnostic.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(results.map(({ config, stop, max_alpha_rad, min_cas_mps, max_native_warning_norm, max_warning_formula_error, transitions }) =>
  ({ id: config.id, stop, max_alpha_rad, min_cas_mps, max_native_warning_norm, max_warning_formula_error, transitions })), null, 2));
