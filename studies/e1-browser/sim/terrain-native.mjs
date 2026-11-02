// Explicit native-runtime check: build.sh must have produced the local WASM.
// Synthetic heights test geometry/ABI/determinism, not DEM or aircraft fidelity.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import createJSBSim from './dist/jsbsim.mjs';
const model = await createJSBSim({ print: () => {}, printErr: () => {} });
const state = () => Array.from(model.HEAPF64.subarray(model._gf_state() >> 3, (model._gf_state() >> 3) + 14));
const ground = () => Array.from(model.HEAPF64.subarray(model._gf_ground_state() >> 3, (model._gf_ground_state() >> 3) + 18));
const digest = () => model.UTF8ToString(model._gf_digest_hex());
const bounds = values => values.map(value => value * Math.PI / 180);
function configure(rectangle, values = [120, 120, 120, 120]) {
  const pointer = model._malloc(values.length * 8);
  try {
    model.HEAPF64.set(values, pointer >> 3);
    assert.equal(model._gf_configure_terrain_grid(...bounds(rectangle), 2, 2, pointer, values.length), 0);
    model.HEAPF64.fill(999, pointer >> 3, (pointer >> 3) + values.length); // Native owns its copy.
  } finally { model._free(pointer); }
}
const init = (longitude = 8.643) => model._gf_init_landing(1 / 120,
  49.96 * Math.PI / 180, longitude * Math.PI / 180, 82 * Math.PI / 180, 1);
const checks = [];
configure([8.4, 49.8, 8.9, 50.2]); assert.equal(init(), 0);
const initial = { state: state(), ground: ground() };
assert(Math.abs(initial.state[3] - 123) < 1e-6); assert(Math.abs(initial.ground[0] - 3) < 1e-6);
assert.equal(model._gf_terrain_available(), 1);
assert.equal(model._gf_terrain_height_m(8.643 * Math.PI / 180, 49.96 * Math.PI / 180), 120);
assert(Number.isNaN(model._gf_terrain_height_m(9 * Math.PI / 180, 49.96 * Math.PI / 180)));
for (let i = 0; i < 240; i++) assert.equal(model._gf_step(), 0);
const contact = ground(); assert(contact[6] + contact[10] + contact[14] > 0);
assert(contact[8] + contact[12] + contact[16] > 0);
checks.push('copied physical-height plateau initializes CG 123m / AGL 3m and native wheel contacts support it');
configure([8.642, 49.959, 8.645, 49.961]);
assert.equal(model._gf_terrain_height_m(8.5 * Math.PI / 180, 49.9 * Math.PI / 180), 120,
  'staging next grid does not alter the active callback');
assert.equal(init(9), -7); assert.equal(model._gf_terrain_available(), 0);
assert.equal(init(), 0);
let boundary = null;
for (let i = 0; i < 1600; i++) {
  const previous = state(), hash = digest(), step = model._gf_step_index();
  const result = model._gf_step();
  if (result) {
    assert.equal(result, -7); assert.equal(model._gf_terrain_available(), 0);
    assert.deepEqual(state(), previous); assert.equal(digest(), hash); assert.equal(model._gf_step_index(), step);
    boundary = { step, state: previous }; break;
  }
}
assert(boundary); checks.push('outside initialization fails closed; boundary failure commits no state, digest or step and never falls back to flat ground');
model._gf_clear_terrain_grid(); assert.equal(init(), 0);
model._gf_set_inputs(.05, -.109375, .1, .5);
for (let i = 0; i < 240; i++) assert.equal(model._gf_step(), 0);
// Existing pre-terrain native read-only-getter fixture, retaining exact degree
// conversion operation order because the digest includes floating-point bits.
assert.equal(digest(), 'd013ca88bdd835c9'); assert.equal(model._gf_terrain_available(), 0);
checks.push('clearing terrain restores the prior 240-step flat-fixture digest exactly');
const build = JSON.parse(await readFile(new URL('./dist/build-info.json', import.meta.url), 'utf8'));
const result = { result: 'pass', checks, wasm_sha256: build.wasm_sha256, initial, contact, boundary, legacy_digest: digest() };
await mkdir(new URL('../../../output/flight/', import.meta.url), { recursive: true });
await writeFile(new URL('../../../output/flight/terrain-native.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ result: 'pass', checks, wasm_sha256: build.wasm_sha256, boundary_step: boundary.step }));
