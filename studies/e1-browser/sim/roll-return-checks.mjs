// Strict evidence admission for the generic FCS return regression, not aircraft tolerances.
import assert from 'node:assert/strict';
const TIMES = [0, .5, 1, 2, 5, 10, 20], SPEEDS = [60, 80, 100], PULSES = [-.1, -.05, -.02, .02, .05, .1];
const NUMERIC_BUDGET_DEG = 1e-10;
function samples(rows, label) {
  assert(Array.isArray(rows), `${label}: samples required`);
  assert.deepEqual(rows.map(r => r?.after_release_s), TIMES, `${label}: complete ordered release sample times required`);
}
function finite(row, keys, label) {
  assert(keys.every(key => Number.isFinite(row?.[key])), `${label}: finite telemetry required`);
}
export function checkRollReturn(report) {
  assert(Array.isArray(report?.results), 'native results required');
  const cases = report.results.filter(r => r.config?.axis === 'aileron');
  const wanted = SPEEDS.flatMap(speed => PULSES.map(pulse => `${speed}-aileron-${pulse}`));
  assert.deepEqual(cases.map(r => r.config.id).sort(), [...wanted].sort(), 'exactly eighteen unique signed fixtures required');
  const checks = [];
  for (const result of cases) {
    const { cas_kt, pulse_norm, id } = result.config;
    assert(SPEEDS.includes(cas_kt) && PULSES.includes(pulse_norm) && id === `${cas_kt}-aileron-${pulse_norm}`, 'fixture identity mismatch');
    assert.equal(result.stop, '20 seconds after release');
    samples(result.release, id); samples(result.delta_vs_neutral, `${id} delta`);
    finite(result.initial, ['left_aileron_deg', 'right_aileron_deg'], `${id} initial`);
    const neutralCases = report.results.filter(r => r.config?.axis === 'neutral' && r.config.cas_kt === cas_kt);
    assert.equal(neutralCases.length, 1, `${id}: one matched neutral fixture required`);
    const neutral = neutralCases[0]; samples(neutral.release, `${id} neutral`);
    for (const [i, row] of result.release.entries()) {
      finite(row, ['aileron_cmd_norm', 'elevator_cmd_norm', 'rudder_cmd_norm', 'left_aileron_deg', 'right_aileron_deg', 'p_degps', 'roll_deg'], id);
      assert.deepEqual([row.aileron_cmd_norm, row.elevator_cmd_norm, row.rudder_cmd_norm], [0, 0, 0], `${id}: neutral pilot axes required`);
      finite(neutral.release[i], ['p_degps', 'left_aileron_deg', 'right_aileron_deg', 'roll_deg'], `${id} neutral`);
      finite(result.delta_vs_neutral[i], ['p_degps', 'left_aileron_deg', 'right_aileron_deg', 'roll_deg'], `${id} delta`);
      for (const key of ['p_degps', 'left_aileron_deg', 'right_aileron_deg', 'roll_deg'])
        assert(Math.abs(result.delta_vs_neutral[i][key] - (row[key] - neutral.release[i][key])) < NUMERIC_BUDGET_DEG, `${id}: inconsistent delta telemetry`);
    }
    // The release instant retains source actuator rate limiting. Later samples
    // must return each actual surface to its own pre-pulse position, regardless
    // of the producer's derived delta fields.
    const residual = Math.max(...result.release.slice(1).flatMap(r => ['left_aileron_deg', 'right_aileron_deg'].map(k => Math.abs(r[k] - result.initial[k]))));
    assert(residual < NUMERIC_BUDGET_DEG, `${id}: aileron history remains after neutral (${residual}deg); rebuild with adapter v5`);
    const initialRate = Math.abs(result.release[0].p_degps - neutral.release[0].p_degps);
    const laterRate = Math.max(...result.release.slice(2).map((r, i) => Math.abs(r.p_degps - neutral.release[i + 2].p_degps)));
    // A sampled sanity guard only. This is not a monotonic-decay, settling-time
    // or asymptotic-stability criterion.
    assert(initialRate > 0 && laterRate < initialRate, `${id}: sampled later roll rate exceeds release rate`);
    checks.push({ id, max_returned_surface_residual_deg: residual, release_roll_rate_degps: initialRate,
      max_later_roll_rate_degps: laterRate, bank_delta_at20s_deg: result.release.at(-1).roll_deg - neutral.release.at(-1).roll_deg });
  }
  return { scope: 'Generic aileron command return; sampled rate sanity guard only, not formal stability or automatic wings-level/C172S acceptance',
    result: 'pass', source_hashes: report.source_hashes, prepared_aircraft_sha256: report.prepared_aircraft_sha256,
    numeric_equality_budget_deg: NUMERIC_BUDGET_DEG, cases: checks };
}
