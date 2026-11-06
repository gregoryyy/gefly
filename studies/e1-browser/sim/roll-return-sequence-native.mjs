// A single-flight opposite/successive-pulse history check; not aircraft dynamics validation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { FLIGHT_DEFAULT_LOADING, loadingValues } from './loading.js';
export async function checkRollReturnSequence(output) {
  const moduleUrl = process.env.GF_NATIVE_MODULE ? pathToFileURL(process.env.GF_NATIVE_MODULE) : new URL('./dist/jsbsim.mjs', import.meta.url);
  const { default: createNative } = await import(moduleUrl.href), M = await createNative({ print() {}, printErr() {} });
  const DT = 1 / 120, RAD = Math.PI / 180, KT = 1852 / 3600, budget = 1e-10 * RAD;
  const read = (fn, count) => { const i = fn() / 8, row = Array.from(M.HEAPF64.subarray(i, i + count)); assert.equal(row.length, count); assert(row.every(Number.isFinite)); return row; };
  const checks = [], pulses = [.1, -.1, .05, -.05, .02, -.02];
  for (const cas_kt of [60, 80, 100]) {
    const loading = loadingValues(FLIGHT_DEFAULT_LOADING), pointer = M._malloc(loading.byteLength);
    try { M.HEAPF64.set(loading, pointer / 8); assert.equal(M._gf_configure_loading(pointer, loading.length), 0); }
    finally { M._free(pointer); }
    let tas = cas_kt * KT;
    for (let i = 0; i < 5; i++) { assert.equal(M._gf_init_balanced(DT, 49.96 * RAD, 8.643 * RAD, 396.24, 82 * RAD, tas), 0); tas *= cas_kt * KT / read(M._gf_cockpit_state, 8)[0]; }
    assert.equal(M._gf_init_balanced(DT, 49.96 * RAD, 8.643 * RAD, 396.24, 82 * RAD, tas), 0);
    assert.equal(M._gf_trim_status(), 1); assert.equal(M._gf_set_autopilot(0, 0), 0); assert.equal(M._gf_set_autopilot_vertical(0, 0), 0); assert.equal(M._gf_set_secondary_inputs(0, 0), 0);
    const initial = read(M._gf_control_state, 7), throttle = M._gf_trim_throttle();
    const step = command => { assert.equal(M._gf_set_inputs(0, command, 0, throttle), 0); assert.equal(M._gf_step(), 0); };
    for (const pulse_norm of pulses) {
      for (let i = 0; i < 60; i++) step(pulse_norm);
      for (let i = 1; i <= 240; i++) {
        step(0);
        if (![60, 120, 240].includes(i)) continue;
        const actual = read(M._gf_control_state, 7); assert.deepEqual(actual.slice(1, 4), [0, 0, 0]);
        const residual = Math.max(Math.abs(actual[4] - initial[4]), Math.abs(actual[5] - initial[5]));
        assert(residual < budget, `${cas_kt}kt successive pulse ${pulse_norm}: retained aileron history ${residual}rad`);
        checks.push({ cas_kt, pulse_norm, after_release_s: i * DT, surface_residual_rad: residual, step: M._gf_step_index() });
      }
    }
  }
  assert.equal(checks.length, 54, 'all successive-pulse settling samples required');
  const result = { scope: 'Successive opposite aileron command return within each fresh flight; numeric mapping budget, not aircraft tolerance', result: 'pass',
    checker_sha256: createHash('sha256').update(await readFile(new URL('./roll-return-sequence-native.mjs', import.meta.url))).digest('hex'), checks };
  await writeFile(new URL('sequence.json', output), JSON.stringify(result, null, 2) + '\n');
  return result;
}
