// Native bridge telemetry regression (F16, F24): actual JSBSim WASM, no browser.
// Not engine, instrument or aircraft-fidelity validation.
import assert from 'node:assert/strict';
import createJSBSim from './dist/jsbsim.mjs';
import { engineFields } from './engine.js';
import { groundFields, cockpitFields } from './cockpit.js';
const M = await createJSBSim({ print: () => {}, printErr: () => {} });
const read = (fn, n) => { const p = fn() >> 3; return Array.from(M.HEAPF64.subarray(p, p + n)); };
const engine = () => engineFields(read(M._gf_engine_state, 13));
const step = n => { for (let i = 0; i < n; i++) assert.equal(M._gf_step(), 0); };
// A missing property used to read as 0 degF, i.e. exactly this kelvin value.
const ZERO_F_K = (0 - 32) * 5 / 9 + 273.15;
assert.equal(M._gf_init(1 / 120, 49.96 * Math.PI / 180, 8.643 * Math.PI / 180, 1200, 1.4, 45), 0);
assert.equal(M._gf_set_inputs(0, 0, 0, .8), 0); assert.equal(M._gf_set_engine_controls(1, 0), 0);
step(120 * 5);
const rich = engine();
assert.equal(Object.keys(rich).length, 13, 'every engine property exists in the prepared model');
assert(rich.fuel_flow_m3ps > 0, 'running rich: positive fuel flow before any cutoff check');
assert(rich.prop_radps > 0 && rich.manifold_pressure_pa > 0);
for (const key of ['oil_temp_k', 'egt_k']) assert(Math.abs(rich[key] - ZERO_F_K) > 1, `${key} is not the missing-property 0 degF signature`);
assert(rich.egt_k > rich.oil_temp_k, 'EGT above oil temperature while running');
assert(rich.fuel_left_m3 > 0 && rich.fuel_right_m3 > 0);
assert.equal(M._gf_set_engine_controls(0, 0), 0); step(120 * 10);
const cutoff = engine();
assert.equal(cutoff.fuel_flow_m3ps, 0, 'mixture cutoff stops fuel flow after it was shown positive');
assert(Object.keys(cockpitFields(read(M._gf_cockpit_state, 8))).length >= 6, 'cockpit group available');
// Contact identities resolve by name; the ground group is complete in flight and on the ground.
assert(Object.keys(groundFields(read(M._gf_ground_state, 18))).length === 18, 'named contacts resolve in flight');
assert.equal(M._gf_init_landing(1 / 120, 49.96 * Math.PI / 180, 8.643 * Math.PI / 180, 82 * Math.PI / 180, 1), 0);
step(120 * 3);
const ground = groundFields(read(M._gf_ground_state, 18));
assert.equal(ground.gear_nose_wow + ground.gear_left_wow + ground.gear_right_wow, 3, 'all three named wheels report contact after landing');
console.log(JSON.stringify({ result: 'pass', scope: 'generic c172x bridge telemetry presence/identity, not aircraft or instrument validation',
  rich: { fuel_flow_m3ps: rich.fuel_flow_m3ps, oil_temp_k: rich.oil_temp_k, egt_k: rich.egt_k }, cutoff_fuel_flow_m3ps: cutoff.fuel_flow_m3ps,
  landed_wheel_loads_n: [ground.gear_nose_load_n, ground.gear_left_load_n, ground.gear_right_load_n] }));
