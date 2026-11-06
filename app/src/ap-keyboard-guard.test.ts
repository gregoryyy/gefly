import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApKeyboardGuard, isApProtectedFlightKey } from './ap-keyboard-guard.ts';

test('an inhibited hold and its repeats remain blocked across AP and CWS changes until release', () => {
  const guard = createApKeyboardGuard();
  assert.equal(guard.press('key:ArrowRight', true), false);
  assert.equal(guard.press('key:ArrowRight', false), false);
  guard.release('key:ArrowRight');
  assert.equal(guard.press('key:ArrowRight', false), true);
  guard.block('key:ArrowRight');
  assert.equal(guard.press('key:ArrowRight', false), false);
  guard.clear();
  assert.equal(guard.press('key:ArrowRight', false), true);
});

test('only flight axes and trim shortcuts require AP keyboard inhibition', () => {
  for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyW', 'Quote', 'Backslash']) assert(isApProtectedFlightKey(key));
  for (const key of ['KeyA', 'KeyB', 'KeyC', 'Digit0', 'BracketRight']) assert(!isApProtectedFlightKey(key));
});


test('AP transitions block already-held controls; blur cannot turn a repeat into a new press', () => {
  const guard = createApKeyboardGuard();
  assert(guard.press('trim:ArrowUp', false));
  guard.blockActive();
  assert.equal(guard.press('trim:ArrowUp', false, true), false);
  guard.release('trim:ArrowUp');
  assert(guard.press('trim:ArrowUp', false));
  guard.clear();
  assert.equal(guard.press('trim:ArrowUp', false, true), false);
  assert(guard.press('trim:ArrowUp', false));
});
