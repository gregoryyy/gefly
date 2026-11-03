import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SYSTEM_SWITCH_MASK, electricalReadings, toggleSystemSwitch, validSystemsMask } from './aircraft-systems.ts';

test('master interlock: ALT needs BAT; BAT off removes ALT without losing circuit selections', () => {
  assert.equal(toggleSystemSwitch(0, 1), 3);
  const off = toggleSystemSwitch(DEFAULT_SYSTEM_SWITCH_MASK, 0);
  assert.equal(off & 3, 0); assert.equal(off & 12, 12);
  assert.equal(toggleSystemSwitch(off, 0) & 3, 1);
  for (const mask of [-1, 2, 1024, NaN, 1.5, '3']) assert.equal(validSystemsMask(mask), false);
});
test('loads discharge battery with ALT off; running alternator supplies bus; switches retain selection without power', () => {
  const base = DEFAULT_SYSTEM_SWITCH_MASK;
  assert.equal(electricalReadings(base, 1)!.volts, 28);
  assert.equal(electricalReadings(base, 1)!.batteryAmps, 0);
  const batteryOnly = toggleSystemSwitch(base, 1);
  const supplied = electricalReadings(batteryOnly, 1)!;
  assert.equal(supplied.volts, 24); assert.equal(supplied.batteryAmps, -supplied.loadAmps);
  const landing = electricalReadings(toggleSystemSwitch(batteryOnly, 7), 1)!;
  assert(landing.loadAmps > supplied.loadAmps); assert(landing.batteryAmps < supplied.batteryAmps);
  assert.equal(electricalReadings(base, 0)!.volts, 24, 'stopped engine supplies no alternator power');
  assert.equal(electricalReadings(base, undefined), null, 'missing engine state cannot invent generation');
  assert.deepEqual(electricalReadings(toggleSystemSwitch(base, 0), 1), { volts: 0, batteryAmps: 0, loadAmps: 0, powered: false });
  assert.equal(electricalReadings(undefined, 1), null, 'old recordings remain unavailable');
});
