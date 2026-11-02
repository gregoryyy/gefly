import assert from 'node:assert/strict';
import { test } from 'node:test';
import { airspeedMarkings } from './airspeed-markings.ts';

test('172P CAS thresholds reproduce the separate manufacturer KCAS columns, not installed KIAS markings', () => {
  const { speeds } = airspeedMarkings('CAS')!;
  // POH Figure 2-1 (KCAS) and Figure 5-3: 2400 lb, forward CG, zero bank.
  assert.deepEqual(Object.values(speeds), [46, 52, 84, 108, 123, 152]);
  assert.notEqual(speeds.vs0_kcas, 33);
  assert.notEqual(speeds.vs1_kcas, 44);
  assert.notEqual(speeds.vne_kcas, 158);
  assert(speeds.vfe_kcas < speeds.vfe10_kcas);
});

test('white/green/yellow teaching ranges meet their named limits and are immutable', () => {
  const data = airspeedMarkings('CAS')!;
  assert.deepEqual(data.arcs.map(arc => [arc.from_kcas, arc.to_kcas]), [
    [data.speeds.vs0_kcas, data.speeds.vfe_kcas],
    [data.speeds.vs1_kcas, data.speeds.vno_kcas],
    [data.speeds.vno_kcas, data.speeds.vne_kcas],
  ]);
  assert(data.arcs.every(arc => arc.from_kcas < arc.to_kcas && Object.isFrozen(arc)));
  assert(Object.isFrozen(data)); assert(Object.isFrozen(data.arcs)); assert(Object.isFrozen(data.speeds));
  assert.match(data.legend, /2400 lb.*forward CG.*power off.*zero bank/);
  assert.match(data.legend, /not installed IAS/);
});

test('TAS fallback has no misleading CAS limits or arcs', () => {
  assert.equal(airspeedMarkings('TAS'), null);
});
