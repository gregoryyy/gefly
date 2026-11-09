// TODO2.0.133 diagnostic only: existing research WASM, no model/production edits.
// Matched initial airspeed is not an artificially maintained flight condition.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import createJSBSim from './dist/jsbsim.mjs';
import { DEFAULT_LOADING, loadingValues } from './loading.js';

const dt = 1 / 120, deg = Math.PI / 180, lb = .45359237;
const initial = { lat_deg: 49.96, lon_deg: 8.643, altitude_msl_m: 396.24, heading_true_deg: 82, tas_mps: 40 };
const readText = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const sha = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
const build = JSON.parse(readText('./dist/build-info.json'));
assert.equal(sha('./dist/jsbsim.wasm'), build.wasm_sha256);
const sourcePath = './.work/jsbsim-1.3.3/aircraft/c172x/c172x.xml';
const preparedPath = './.work/prepared-aircraft/c172x/c172x.xml';
assert.equal(sha(sourcePath), build.aircraft_adapter.source_sha256);
assert.equal(sha(preparedPath), build.aircraft_adapter.prepared_sha256);
const xml = readText(preparedPath).replace(/<!--[\s\S]*?-->/g, '');
function table(name) {
  const block = xml.match(new RegExp(`<function name="aero/coefficient/${name}">([\\s\\S]*?)<\\/function>`))?.[1];
  assert(block, name); assert.match(block, /<independentVar>fcs\/flap-pos-deg<\/independentVar>/);
  return block.match(/<tableData>([\s\S]*?)<\/tableData>/)[1].trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));
}
const flapChannel = xml.match(/<channel name="Flaps">([\s\S]*?)<\/channel>/)?.[1];
assert(flapChannel); assert.doesNotMatch(flapChannel, /<noscale/);
const traverse = [...flapChannel.matchAll(/<setting>\s*<position>\s*([\d.]+)\s*<\/position>\s*<time>\s*([\d.]+)\s*<\/time>\s*<\/setting>/g)]
  .map(match => ({ degrees: Number(match[1]), transition_s: Number(match[2]) }));
assert.deepEqual(traverse.map(value => value.degrees), [0, 10, 20, 30]);
const sourceTables = { delta_CL: table('CLDf'), delta_CD: table('CDDf'), delta_Cm: table('CmDf'), traverse };

const M = await createJSBSim({ print() {}, printErr() {} });
const read = (fn, count) => { const pointer = fn() >> 3; return Array.from(M.HEAPF64.subarray(pointer, pointer + count)); };
const digest = () => M.UTF8ToString(M._gf_digest_hex());
const loadingPointer = M._malloc(8 * 8);
function initialize(load) {
  if (load === 'source-default') assert.equal(M._gf_configure_loading(0, 0), 0);
  else {
    const values = loadingValues({ ...DEFAULT_LOADING, external_kg: 0 });
    M.HEAPF64.set(values, loadingPointer >> 3);
    assert.equal(M._gf_configure_loading(loadingPointer, values.length), 0);
  }
  assert.equal(M._gf_init(dt, initial.lat_deg * deg, initial.lon_deg * deg, initial.altitude_msl_m,
    initial.heading_true_deg * deg, initial.tas_mps), 0);
  assert.equal(M._gf_trim_status(), 1, 'existing native longitudinal initialization trimmed');
  assert.equal(M._gf_set_autopilot(1, 0), 0, 'declared generic roll-level isolation');
  assert.equal(M._gf_set_autopilot_vertical(0, 0), 0);
  assert.equal(M._gf_flap_command_norm(), 0, 'native launch command is UP');
  assert(Math.abs(read(M._gf_cockpit_state, 8)[4]) < 1e-12, 'native launch actuator is UP');
  return { loading: read(M._gf_loading_state, 13), trim_norm: M._gf_trim_pitch(), trim_throttle_norm: M._gf_trim_throttle() };
}
function sample() {
  const state = read(M._gf_state, 14), cockpit = read(M._gf_cockpit_state, 8), stall = read(M._gf_stall_state, 13);
  const controls = read(M._gf_control_state, 7), engine = read(M._gf_engine_state, 13), ground = read(M._gf_ground_state, 18);
  const prop = typeof M._gf_propeller_state === 'function' ? read(M._gf_propeller_state, 4) : null;
  assert([...state, ...cockpit, ...stall, ...controls, ...engine, ...ground].every(Number.isFinite));
  return { step: M._gf_step_index(), t_s: state[0], altitude_msl_m: state[3], tas_mps: state[7], cas_mps: cockpit[0],
    pitch_rad: state[5], roll_rad: state[4], flap_command_norm: M._gf_flap_command_norm(), flap_actual_deg: cockpit[4] / deg,
    elevator_command_norm: controls[2], elevator_actual_rad: read(M._gf_pitch_trim_state, 3)[2],
    trim_norm: read(M._gf_pitch_trim_state, 3)[0], alpha_rad: stall[9], native_stall_warning: stall[11],
    specific_force_body_z_g: cockpit[3], climb_mps: -ground[4], throttle_actual_norm: controls[0],
    engine_rpm: engine[1] * 60 / (2 * Math.PI), mixture_norm: engine[2],
    propeller: prop && prop.every(Number.isFinite) ? { thrust_N: prop[0], shaft_power_W: prop[1], advance_ratio: prop[2], rpm: prop[3] * 60 / (2 * Math.PI) } : null,
    on_ground: cockpit[7], structure_contact_mask: ground[5] };
}
function setFlaps(degrees) {
  const before = sample(), beforeDigest = digest();
  assert.equal(M._gf_set_secondary_inputs(degrees / 30, 0), 0);
  assert.equal(M._gf_flap_command_norm(), degrees / 30, 'UI degrees/30 reaches the native normalized command');
  assert.equal(M._gf_step_index(), before.step, 'flap command does not advance paused physics');
  assert.equal(digest(), beforeDigest);
  assert.equal(sample().flap_actual_deg, before.flap_actual_deg, 'actuator traverses only on physics steps');
}

const actuator = [], trajectories = [];
try {
  for (const load of ['source-default', 'no-external']) {
    const config = initialize(load), segments = [];
    assert.equal(M._gf_set_inputs(0, 0, 0, 1), 0);
    for (const target of [10, 20, 30, 20, 10, 0]) {
      const start = sample(), startDegrees = Math.round(start.flap_actual_deg), lower = Math.min(startDegrees, target), upper = Math.max(startDegrees, target);
      const expected_s = traverse.filter(value => value.degrees > lower && value.degrees <= upper).reduce((total, value) => total + value.transition_s, 0);
      setFlaps(target);
      let reached_s = null, maximumError_deg = 0, previousDegrees = start.flap_actual_deg;
      for (let index = 1; index <= Math.round((expected_s + 2 * dt) / dt); index++) {
        assert.equal(M._gf_step(), 0);
        const actual = sample(), elapsed_s = actual.t_s - start.t_s;
        const expectedDegrees = startDegrees + Math.sign(target - startDegrees) * Math.min(Math.abs(target - startDegrees), elapsed_s * 10 / expected_s);
        maximumError_deg = Math.max(maximumError_deg, Math.abs(actual.flap_actual_deg - expectedDegrees));
        assert((actual.flap_actual_deg - previousDegrees) * Math.sign(target - startDegrees) >= -1e-9, 'actuator moves in commanded direction');
        if (reached_s === null && Math.abs(actual.flap_actual_deg - target) < 1e-7) reached_s = elapsed_s;
        previousDegrees = actual.flap_actual_deg;
      }
      assert(reached_s !== null && Math.abs(reached_s - expected_s) <= dt + 1e-8);
      assert(maximumError_deg < 1e-7, 'native timing follows the unchanged source traverse');
      segments.push({ from_deg: startDegrees, to_deg: target, expected_s, observed_s: reached_s, maximumError_deg, end: sample() });
    }
    const command = M._gf_flap_command_norm(), before = digest();
    assert.equal(M._gf_set_secondary_inputs(NaN, 0), -2);
    assert.equal(M._gf_set_secondary_inputs(-.1, 0), -6);
    assert.equal(M._gf_set_secondary_inputs(1.1, 0), -6);
    assert.equal(M._gf_flap_command_norm(), command); assert.equal(digest(), before);
    actuator.push({ load, config, segments });

    for (const profile of ['full-power-trim-retained', 'full-power-generic-VS-1mps']) {
      for (const flap_deg of profile === 'full-power-trim-retained' ? [0, 10, 20, 30] : [0, 10, 30]) {
        const config = initialize(load); setFlaps(flap_deg);
        assert.equal(M._gf_set_inputs(0, 0, 0, 1), 0);
        if (profile === 'full-power-generic-VS-1mps') assert.equal(M._gf_set_autopilot_vertical(1, 1), 0);
        const samples = []; let maxWarning = 0, maxAlpha_rad = -Infinity, maxBank_rad = 0, stop = '30-second diagnostic limit';
        let minimumCAS = null, maximum_climb_mps = -Infinity, steps_in_reported_40_50kt = 0;
        for (let step = 0; step <= 30 / dt; step++) {
          const current = sample();
          maxWarning = Math.max(maxWarning, current.native_stall_warning); maxAlpha_rad = Math.max(maxAlpha_rad, current.alpha_rad);
          maxBank_rad = Math.max(maxBank_rad, Math.abs(current.roll_rad));
          if (!minimumCAS || current.cas_mps < minimumCAS.cas_mps) minimumCAS = current;
          maximum_climb_mps = Math.max(maximum_climb_mps, current.climb_mps);
          const cas_kt = current.cas_mps * 3600 / 1852;
          if (cas_kt >= 40 && cas_kt <= 50) steps_in_reported_40_50kt++;
          if (step % 30 === 0) samples.push(current);
          if (current.on_ground || current.structure_contact_mask || current.altitude_msl_m < 100) { stop = 'contact/100m diagnostic floor'; break; }
          if (step === 30 / dt) break;
          assert.equal(M._gf_step(), 0);
        }
        trajectories.push({ load, profile, requested_flap_deg: flap_deg, config, stop, maxWarning, maxAlpha_rad, maxBank_rad,
          altitude_gain_m: sample().altitude_msl_m - initial.altitude_msl_m, minimumCAS, minimum_cas_kt: minimumCAS.cas_mps * 3600 / 1852,
          maximum_climb_mps, steps_in_reported_40_50kt, final: sample(), digest: digest(), samples });
      }
    }
  }
  assert(Math.abs(actuator[0].config.loading[0] / lb - 2480) < 1e-6);
  assert(Math.abs(actuator[1].config.loading[0] / lb - 2400) < 1e-6);
  const report = { scope: 'Diagnostic existing research model response; not accepted C172P/S flap effectiveness, aircraft performance or operating advice.',
    fixed_step_s: dt, initial, model: 'Pinned generic c172x BETA XML describes a 1982 C172P, not the planned C172S.',
    source: { build, source_xml_sha256: sha(sourcePath), prepared_xml_sha256: sha(preparedPath), script_sha256: sha('./c172-flap-diagnostic.mjs'),
      bridge_source_sha256: sha('./bridge.cpp'), main_source_sha256: sha('../../../app/src/main.ts'),
      limits: 'Current bridge source inspected read-only; exact executing binary is identified by its build/WASM hash. No rebuild or generic property/force export added.' },
    sourceTables, conditions: { power: 'full throttle1, existing automatic mixture, retained clean initialization trim',
      lateral: 'existing generic roll-level servo, no study roll offset', vertical: 'off for transients; existing generic VS servo1m/s only for its named profile',
      airspeed: 'identical initial TAS40m/s; allowed to evolve naturally. No imposed airspeed or fixed-state aerodynamic-force claim.',
      loading_order: 'loading13: total/empty/fuel kg; six station kg; tank capacities m3; fuel density kg/m3; initial fuel m3' },
    actuator, trajectories };
  const destination = new URL('../../../output/flight/', import.meta.url); mkdirSync(destination, { recursive: true });
  writeFileSync(new URL('c172-flaps-task133.json', destination), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ actuator: actuator.map(value => ({ load: value.load, mass_lb: value.config.loading[0] / lb,
    segments: value.segments.map(segment => ({ from: segment.from_deg, to: segment.to_deg, expected_s: segment.expected_s, observed_s: segment.observed_s })) })),
    trajectories: trajectories.map(({ load, profile, requested_flap_deg, maxWarning, altitude_gain_m, final }) => ({ load, profile, requested_flap_deg, maxWarning,
      altitude_gain_m, final_tas_mps: final.tas_mps, final_climb_mps: final.climb_mps, final_flap_deg: final.flap_actual_deg })) }, null, 2));
} finally { M._free(loadingPointer); }
