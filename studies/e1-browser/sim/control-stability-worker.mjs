// R-INPUT-1/R-SIM-5/R-REVIEW-1: actual-worker loading boundary regression.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DEFAULT_LOADING, FLIGHT_DEFAULT_LOADING, LOADING_FIELDS, LOAD_STATIONS,
  MODEL_EMPTY_MASS_KG, MODEL_FUEL_DENSITY_KGPM3, MODEL_TANK_CAPACITY_M3 } from './loading.js';
import { resumeProblem } from './continue-flight.js';

globalThis.self = globalThis;
const messages = [];
globalThis.postMessage = message => messages.push(message);
await import('./worker.js');
async function send(data, type) {
  const start = messages.length;
  self.onmessage({ data });
  for (let attempt = 0; attempt < 3000; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2));
    const result = messages.slice(start).find(message => message.type === type || message.type === 'error');
    if (result) {
      assert.notEqual(result.type, 'error', result.message);
      return result;
    }
  }
  throw new Error(`Worker timeout: ${type}`);
}
const config = { type: 'init', aircraft: 'c172x', kap140: true, terrain: false,
  regional_navigation: false, ground_collision: true, dt_s: 1 / 120, state_hz: 60,
  ic: { lat_rad: .87, lon_rad: .15, alt_msl_m: 1200, heading_rad: 1, tas_mps: 45 } };
const state = () => send({ type: 'kap140', command: { action: 'baro' } }, 'state');
const dryMass = sample => sample.mass_empty_kg + ['pilot', 'copilot', 'rear_left', 'rear_right', 'baggage', 'external']
  .reduce((sum, station) => sum + sample[`payload_${station}_kg`], 0);
const dryMassIs = (sample, pounds) => assert(Math.abs(dryMass(sample) - pounds * .45359237) < 1e-9,
  'configured dry mass excludes fuel consumed during initialization; numerical roundoff only');
const cases = [];
for (const runway_start of [false, true]) {
  await send({ ...config, runway_start }, 'ready');
  const first = await state();
  assert.equal(first.payload_external_kg, 0, 'ordinary flight defaults omit the agricultural wing payload');
  dryMassIs(first, 2140);
  assert.equal(first.step, 0, 'choosing loading does not advance physics');
  assert.equal(first.aileron_cmd_norm, 0, 'worker initialization does not invent lateral input');
  cases.push({ id: runway_start ? 'normal-runway' : 'normal-airborne', first });
}

await send({ ...config, loading: DEFAULT_LOADING }, 'ready');
let legacy = await state();
assert.equal(legacy.payload_external_kg, DEFAULT_LOADING.external_kg, 'explicit legacy loading remains available');
dryMassIs(legacy, 2220);
await send({ type: 'burst', steps: 120, blocks: 1 }, 'burst');
legacy = await state();
assert.equal(resumeProblem(legacy), null);
await send({ ...config, resume_state: legacy }, 'ready');
const restored = await state();
assert.equal(restored.payload_external_kg, legacy.payload_external_kg, 'recorded loading takes precedence over new defaults');
assert.equal(restored.mass_total_kg, legacy.mass_total_kg);
assert.equal(restored.step, legacy.step);
cases.push({ id: 'recorded-legacy-loading', original: legacy, restored });

const noLoading = { ...legacy };
for (const key of LOADING_FIELDS) delete noLoading[key];
assert.equal(resumeProblem(noLoading), null, 'legacy recording loading group is optional');
// Adversarial predecessor: if the worker forgets to reset pending loading, this
// unrelated lightweight/low-fuel configuration must not leak into continuation.
const customLoading = { ...FLIGHT_DEFAULT_LOADING, pilot_kg: 72, copilot_kg: 66,
  rear_left_kg: 0, rear_right_kg: 0, baggage_kg: 0,
  fuel_left_m3: .02, fuel_right_m3: .025 };
await send({ ...config, loading: customLoading }, 'ready');
const customBeforeFallback = await state();
assert.equal(customBeforeFallback.payload_external_kg, 0);
assert.equal(customBeforeFallback.payload_pilot_kg, customLoading.pilot_kg);
assert.equal(customBeforeFallback.payload_baggage_kg, 0);
assert(customBeforeFallback.fuel_left_m3 < .021 && customBeforeFallback.fuel_right_m3 < .026,
  'predecessor deliberately differs from the full-fuel source and recorded group');
await send({ ...config, resume_state: noLoading }, 'ready');
const oldRestored = await state();
for (const station of LOAD_STATIONS) assert.equal(oldRestored[`payload_${station.id}`], DEFAULT_LOADING[station.id],
  'missing loading resets every source payload station after custom loading');
assert.equal(oldRestored.mass_empty_kg, MODEL_EMPTY_MASS_KG);
assert.equal(oldRestored.fuel_capacity_left_m3, MODEL_TANK_CAPACITY_M3);
assert.equal(oldRestored.fuel_capacity_right_m3, MODEL_TANK_CAPACITY_M3);
assert.equal(oldRestored.fuel_density_kgpm3, MODEL_FUEL_DENSITY_KGPM3);
assert.equal(oldRestored.loading_initial_fuel_m3, legacy.fuel_left_m3 + legacy.fuel_right_m3,
  'missing historical fuel-use baseline reconstructs from recorded contents, never custom predecessor');
for (const key of ['fuel_left_m3', 'fuel_right_m3', 'fuel_mass_kg', 'mass_total_kg'])
  assert.equal(oldRestored[key], restored[key], 'recorded tank contents and reconstructed mass survive missing loading metadata');
assert.equal(oldRestored.step, legacy.step);
cases.push({ id: 'recorded-no-loading-fallback', custom_predecessor: customBeforeFallback, restored: oldRestored });

await send({ ...config, loading: FLIGHT_DEFAULT_LOADING }, 'ready');
const explicitNormal = await state();
assert.equal(explicitNormal.payload_external_kg, 0);
dryMassIs(explicitNormal, 2140);
cases.push({ id: 'explicit-normal-loading', first: explicitNormal });

const sha = path => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
const report = { result: 'pass', scope: 'Actual worker/native new-flight and legacy-continuation loading; no dynamics checkpoint/fidelity claim',
  source: { wasm_sha256: sha('./dist/jsbsim.wasm'), worker_sha256: sha('./worker.js'),
    loading_sha256: sha('./loading.js'), harness_sha256: sha('./control-stability-worker.mjs') }, cases };
const output = new URL('../../../output/flight/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('control-stability-worker.json', output), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ result: report.result, cases: cases.map(value => value.id), source: report.source }));
