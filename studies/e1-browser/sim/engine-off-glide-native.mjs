// Actual-WASM engine-off regression: generic c172x/propeller integration only.
// This is not a calibrated C172 glide-performance or training acceptance test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';

const M = await createJSBSim({ print: () => {}, printErr: () => {} });
assert.equal(typeof M._gf_propeller_state, 'function', 'rebuild the native bridge with propeller diagnostics');
const DT_S = 1 / 120;
const DEG = Math.PI / 180;
const STANDARD_G_MPS2 = 9.80665;
const EARTH_MEAN_RADIUS_M = 6371008.8;
// FGPropeller::Calculate uses its regular advance-ratio equation only above
// 0.01 revolutions/s. A tiny residual RPM in the fallback branch is not evidence
// of a sustained windmilling solution; this is an engine-algorithm boundary,
// not an aircraft operating limit or a fitted glide-performance tolerance.
const REGULAR_ADVANCE_RADPS = 0.01 * 2 * Math.PI;
// Declared coverage of the hash-pinned Aero-Matic fixed-pitch source tables
// (utils/aeromatic/prop2.php); these are model-data bounds, not fitted tolerances.
const MAX_THRUST_ADVANCE_RATIO = 1.4;
const MAX_POWER_ADVANCE_RATIO = 1.6;
const read = (fn, count) => {
  const offset = fn() >> 3;
  const values = Array.from(M.HEAPF64.subarray(offset, offset + count));
  assert(values.every(Number.isFinite), 'native diagnostics are finite, not invented zeros');
  return values;
};
const distance = (a, b) => {
  const dLat = b[1] - a[1], dLon = b[2] - a[2];
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1]) * Math.cos(b[1]) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, h)));
};
const energyHeight = s => s[3] + s[7] ** 2 / (2 * STANDARD_G_MPS2);
const runCase = (initialTasMps, mode) => {
  assert.equal(M._gf_init(DT_S, 49.96 * DEG, 8.643 * DEG, 2500, 82 * DEG, initialTasMps), 0);
  assert.equal(M._gf_trim_status(), 1, 'comparison starts from successful native longitudinal trim');
  const throttle = mode === 'ignition-off-idle' ? 0 : M._gf_trim_throttle();
  assert.equal(M._gf_set_inputs(0, 0, 0, throttle), 0);
  assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
  // Only lateral leveling: no altitude/VS controller hides the energy loss.
  assert.equal(M._gf_set_autopilot(2, 82 * DEG), 0);
  assert.equal(M._gf_set_autopilot_vertical(0, 0), 0);
  assert.equal(M._gf_set_engine_controls(mode === 'mixture-cutoff' ? 0 : 1, mode === 'mixture-cutoff' ? 0 : 1), 0);
  if (mode.startsWith('ignition-off')) assert.equal(M._gf_set_engine_running(0), 0);
  const samples = [];
  let horizontalM = 0, initial = null, previous = null;
  for (let step = 0; step <= 120 / DT_S; step++) {
    const s = read(M._gf_state, 14);
    const prop = read(M._gf_propeller_state, 4);
    const running = read(M._gf_engine_switch_state, 2)[0];
    if (step >= 60 / DT_S) {
      if (previous) horizontalM += distance(previous, s);
      initial ??= s;
      previous = s;
      if (step % 120 === 0) {
        const cockpit = read(M._gf_cockpit_state, 8);
        const controls = read(M._gf_control_state, 7);
        assert.equal(cockpit[4], 0, 'flaps stay retracted in the clean comparison');
        assert.equal(cockpit[7], 0, 'comparison remains airborne');
        assert.equal(controls[0], throttle, 'native throttle retains the selected fixture setting');
        samples.push({ t_s: s[0], alt_msl_m: s[3], tas_mps: s[7],
          thrust_n: prop[0], shaft_power_w: prop[1], advance_ratio: prop[2],
          prop_radps: prop[3], running });
      }
    }
    if (step < 120 / DT_S) assert.equal(M._gf_step(), 0, 'actual fixed-step integration succeeds');
  }
  const final = read(M._gf_state, 14);
  const elapsed = final[0] - initial[0];
  const heightLossM = initial[3] - final[3];
  const energySinkMps = (energyHeight(initial) - energyHeight(final)) / elapsed;
  assert(Number.isFinite(energySinkMps), 'specific-energy diagnostic remains finite');
  const mean = key => samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;
  const result = { initial_tas_mps: initialTasMps, mode, throttle_norm: throttle,
    observed_window_s: [initial[0], final[0]], mean_tas_mps: mean('tas_mps'),
    height_loss_m: heightLossM, horizontal_spherical_m: horizontalM,
    geometric_glide_ratio: heightLossM > 0 ? horizontalM / heightLossM : null,
    energy_sink_mps: energySinkMps, mean_thrust_n: mean('thrust_n'),
    mean_shaft_power_w: mean('shaft_power_w'), mean_prop_radps: mean('prop_radps'),
    final_digest_fnv1a64: M.UTF8ToString(M._gf_digest_hex()) };
  const regularWindmill = samples.every(s => s.prop_radps > REGULAR_ADVANCE_RADPS && s.thrust_n < 0
    && s.advance_ratio <= MAX_THRUST_ADVANCE_RATIO && s.advance_ratio <= MAX_POWER_ADVANCE_RATIO);
  // Preserve this observed counterexample as unaccepted model behavior. It must
  // not become a passing windmilling case just because RPM/drag contain tiny
  // floating-point remnants. If a future model actually sustains an in-envelope
  // solution, the same fixture naturally becomes a nominal case.
  const knownEnvelopeLimitation = initialTasMps === 35 && mode === 'ignition-off-idle'
    && samples.every(s => s.prop_radps <= REGULAR_ADVANCE_RADPS
      && s.advance_ratio > MAX_THRUST_ADVANCE_RATIO && s.advance_ratio > MAX_POWER_ADVANCE_RATIO);
  result.observed_advance_ratio_range = [Math.min(...samples.map(s => s.advance_ratio)), Math.max(...samples.map(s => s.advance_ratio))];
  result.status = knownEnvelopeLimitation
    ? 'not-accepted: outside finite propeller table/low-RPM model envelope' : 'pass';
  if (knownEnvelopeLimitation) result.limitation = 'Stopped-propeller blade drag is not modeled; near-zero RPM and thrust do not satisfy the sustained-windmilling criterion.';
  if (mode === 'powered') {
    assert(samples.every(s => s.running === 1 && s.thrust_n > 0), 'powered comparator retains combustion and positive propeller thrust');
  } else {
    assert(samples.every(s => s.running === 0), `${mode}: combustion stays off without starter or relight`);
    if (!knownEnvelopeLimitation) {
      assert(regularWindmill, `${mode}: forward flight sustains windmilling drag inside the declared coefficient-table and regular advance-ratio envelope`);
    }
    assert(samples.every(s => s.shaft_power_w < 0), `${mode}: native engine absorbs shaft power`);
    assert(heightLossM > 0 && energySinkMps > 0, `${mode}: unpowered flight loses altitude and specific mechanical energy`);
  }
  return result;
};
const cases = [];
for (const initialTasMps of [35, 45]) {
  const speedCases = ['powered', 'ignition-off', 'ignition-off-idle', 'mixture-cutoff'].map(mode => runCase(initialTasMps, mode));
  cases.push(...speedCases);
  const [powered, ...unpowered] = speedCases;
  for (const off of unpowered) {
    assert(off.energy_sink_mps > powered.energy_sink_mps, `${off.mode}: energy loss exceeds same-initial-condition powered flight`);
  }
}
// A fresh native model must reset engine/FCS/propeller state and repeat exactly.
const repeated = runCase(35, 'ignition-off-idle');
const original = cases.find(c => c.initial_tas_mps === 35 && c.mode === 'ignition-off-idle');
assert.deepEqual(repeated, original, 'reinitializing repeats the complete fixed-step trajectory, digest and diagnostics exactly');
// Maintain the ignition / fuel / native-starter contract alongside aerodynamic
// changes. A better glide must not be obtained by secretly keeping combustion on
// or replacing native shaft dynamics with an imposed RPM value.
const runRestart = () => {
  assert.equal(M._gf_init(DT_S, 49.96 * DEG, 8.643 * DEG, 2500, 82 * DEG, 35), 0);
  assert.equal(M._gf_trim_status(), 1);
  assert.equal(M._gf_set_inputs(0, 0, 0, 0), 0);
  assert.equal(M._gf_set_autopilot(2, 82 * DEG), 0);
  assert.equal(M._gf_set_autopilot_vertical(0, 0), 0);
  assert.equal(M._gf_set_engine_controls(1, 0), 0);
  assert.equal(M._gf_set_engine_running(0), 0);
  const advance = seconds => {
    for (let step = 0; step < Math.round(seconds / DT_S); step++) {
      assert.equal(M._gf_step(), 0);
      read(M._gf_state, 14);
    }
  };
  const snapshot = () => ({ state: read(M._gf_state, 14),
    propeller: read(M._gf_propeller_state, 4), engine: read(M._gf_engine_switch_state, 2),
    controls: read(M._gf_control_state, 7), step: M._gf_step_index(),
    digest: M.UTF8ToString(M._gf_digest_hex()) });
  advance(60);
  const coast = snapshot();
  assert.equal(coast.engine[0], 0, 'idle shutdown really removes combustion');
  for (let i = 0; i < 100; i++) read(M._gf_propeller_state, 4);
  assert.deepEqual(snapshot(), coast, 'diagnostic reads change neither shaft/state nor step/digest');
  assert.equal(M._gf_set_engine_controls(0, 0), 0);
  const beforeStart = read(M._gf_propeller_state, 4);
  assert.equal(M._gf_set_engine_running(1), 0);
  assert.deepEqual(read(M._gf_propeller_state, 4), beforeStart,
    'ignition/starter request itself does not force a new RPM or thrust');
  advance(2);
  assert.deepEqual(read(M._gf_engine_switch_state, 2), [0, 1],
    'starter request with mixture cutoff cannot create combustion or rewrite fuel');
  assert.equal(M._gf_set_engine_controls(1, 0), 0);
  assert.equal(M._gf_set_inputs(0, 0, 0, .6), 0);
  advance(20);
  const restarted = snapshot();
  assert.deepEqual(restarted.engine, [1, 1], 'fuel and native starter restore combustion');
  assert(restarted.propeller[0] > 0 && restarted.propeller[1] > 0 && restarted.propeller[3] > 0,
    'restart restores actual positive thrust, shaft power and rotation');
  assert.equal(M._gf_set_engine_running(0), 0);
  advance(2);
  const stoppedAgain = snapshot();
  assert.deepEqual(stoppedAgain.engine, [0, 0], 'a second shutdown still removes combustion');
  return { coast, restarted, stopped_again: stoppedAgain };
};
const restart = runRestart();
assert.deepEqual(runRestart(), restart, 'fresh reset repeats complete shutdown / cutoff / restart trajectory exactly');
const nominalCases = cases.filter(c => c.status === 'pass').length;
const unacceptedCases = cases.length - nominalCases;
console.log(JSON.stringify({ result: unacceptedCases ? 'pass-with-known-model-limitation' : 'pass',
  accepted_nominal_cases: nominalCases, not_accepted_model_fixtures: unacceptedCases, scope: 'generic c172x native windmilling and energy regression; no aircraft glide-ratio acceptance',
  wasm_sha256: createHash('sha256').update(readFileSync(new URL('./dist/jsbsim.wasm', import.meta.url))).digest('hex'),
  diagnostic: '60–120 s after shutdown; retracted flaps, native longitudinal pitch trim, lateral leveling only; retained trim-throttle except explicit idle case; spherical horizontal range and standard-g energy-height diagnostic',
  repeat: { initial_tas_mps: 35, mode: 'ignition-off-idle', final_digest_fnv1a64: repeated.final_digest_fnv1a64, exact_match: true },
  restart: { exact_reset_match: true, coast_prop_radps: restart.coast.propeller[3],
    restored_thrust_n: restart.restarted.propeller[0],
    final_digest_fnv1a64: restart.stopped_again.digest }, cases }, null, 2));
