import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkRollReturn } from './roll-return-checks.mjs';
const times = [0, .5, 1, 2, 5, 10, 20];
function fixture() {
  const results = [];
  for (const cas_kt of [60, 80, 100]) {
    const neutral = { config: { axis: 'neutral', cas_kt }, release: times.map(after_release_s => ({ after_release_s, p_degps: 0, left_aileron_deg: 0, right_aileron_deg: 0, roll_deg: 0 })) };
    results.push(neutral);
    for (const pulse_norm of [-.1, -.05, -.02, .02, .05, .1]) {
      const release = times.map((after_release_s, i) => ({ after_release_s, p_degps: [1, .5, .3, .2, .1, .05, .01][i],
        aileron_cmd_norm: 0, elevator_cmd_norm: 0, rudder_cmd_norm: 0, left_aileron_deg: 0, right_aileron_deg: 0, roll_deg: 1 }));
      results.push({ config: { axis: 'aileron', cas_kt, pulse_norm, id: `${cas_kt}-aileron-${pulse_norm}` }, stop: '20 seconds after release',
        initial: { left_aileron_deg: 0, right_aileron_deg: 0 }, release, delta_vs_neutral: structuredClone(release) });
    }
  }
  return { results };
}
const first = d => d.results.find(r => r.config.axis === 'aileron');
test('complete signed telemetry is admitted and actual nonzero surface residue is rejected', () => {
  assert.equal(checkRollReturn(fixture()).cases.length, 18);
  const d = fixture(), r = first(d); r.release[1].left_aileron_deg = .143; r.delta_vs_neutral[1].left_aileron_deg = .143;
  assert.throws(() => checkRollReturn(d), /aileron history remains/);
});
test('empty, partial, duplicated and unordered release/delta samples cannot silently pass', () => {
  for (const field of ['release', 'delta_vs_neutral']) for (const transform of [() => [], rows => rows.slice(0, 1), rows => rows.slice(1), rows => [...rows.slice(0, -1), rows[0]], rows => rows.toReversed()]) {
    const d = fixture(), r = first(d); r[field] = transform(r[field]);
    assert.throws(() => checkRollReturn(d), /complete ordered release sample times/);
  }
});
test('missing, duplicated or mislabeled signed and neutral fixtures are rejected', () => {
  for (const mutate of [d => d.results.splice(1, 1), d => d.results.push(structuredClone(first(d))), d => first(d).config.cas_kt = 99,
    d => d.results.splice(0, 1), d => d.results.push(structuredClone(d.results[0]))]) {
    const d = fixture(); mutate(d); assert.throws(() => checkRollReturn(d), /fixtures required|identity mismatch|neutral fixture required/);
  }
});
test('nonfinite, missing, forged delta and active-command telemetry is rejected', () => {
  for (const mutate of [r => r.initial.left_aileron_deg = NaN, r => delete r.release[2].p_degps, r => r.release[2].right_aileron_deg = Infinity,
    r => r.delta_vs_neutral[2].p_degps = 99, r => r.release[2].aileron_cmd_norm = .1]) {
    const d = fixture(); mutate(first(d)); assert.throws(() => checkRollReturn(d), /finite telemetry|inconsistent delta|neutral pilot axes/);
  }
});
test('sampled-rate sanity guard rejects absent excitation and larger later rate without claiming formal stability', () => {
  for (const rates of [[0, 0, 0, 0, 0, 0, 0], [1, .5, .3, .2, .1, .05, 2]]) {
    const d = fixture(), r = first(d); for (let i = 0; i < rates.length; i++) r.release[i].p_degps = r.delta_vs_neutral[i].p_degps = rates[i];
    assert.throws(() => checkRollReturn(d), /sampled later roll rate/);
  }
});
