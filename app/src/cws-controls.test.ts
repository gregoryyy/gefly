import test from 'node:test';
import assert from 'node:assert/strict';
import { createCwsControls } from './cws-controls.ts';

function fixture() {
  const target = new EventTarget(), window = new EventTarget();
  let allowed = true, neutral = 0;
  const changes: boolean[] = [];
  const controls = createCwsControls({ target, cancelTarget: window, canStart: () => allowed,
    beforeChange: () => { neutral++; }, onChange: value => changes.push(value) });
  const key = (type: string, properties = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code: 'KeyC', repeat: false, ctrlKey: false, metaKey: false, altKey: false, ...properties });
    target.dispatchEvent(event); return event;
  };
  return { controls, changes, key, window, block: () => { allowed = false; }, neutral: () => neutral };
}
test('CWS C hold starts once, ignores repeats and releases without latching', () => {
  const f = fixture(); assert(f.key('keydown').defaultPrevented);
  f.key('keydown', { repeat: true }); f.key('keydown');
  assert.deepEqual(f.changes, [true]);
  assert(f.key('keyup').defaultPrevented); f.key('keyup');
  assert.deepEqual(f.changes, [true, false]); assert.equal(f.neutral(), 2);
});
test('CWS modifiers, composing, other keys, blocked contexts and orphan repeats do not start', () => {
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { code: 'KeyV' }, { repeat: true }]) {
    const f = fixture(); assert.equal(f.key('keydown', properties).defaultPrevented, false); assert.deepEqual(f.changes, []);
  }
  const f = fixture(); f.block(); assert.equal(f.key('keydown').defaultPrevented, false); assert.deepEqual(f.changes, []);
});
test('CWS key release remains effective after context and modifiers change', () => {
  const f = fixture(); f.key('keydown'); f.block(); f.key('keyup', { ctrlKey: true });
  assert.deepEqual(f.changes, [true, false]);
});
test('CWS keyboard and panel releases cannot cancel another held source', () => {
  const f = fixture(); f.key('keydown'); f.controls.setPanel(true); f.key('keyup');
  assert.deepEqual(f.changes, [true]); f.controls.setPanel(false);
  assert.deepEqual(f.changes, [true, false]);
  f.controls.setPanel(true); f.key('keydown'); f.controls.setPanel(false);
  assert.deepEqual(f.changes, [true, false, true]); f.key('keyup');
  assert.deepEqual(f.changes, [true, false, true, false]);
});
test('CWS blur and explicit lifecycle release clear all sources exactly once', () => {
  const f = fixture(); f.key('keydown'); f.controls.setPanel(true);
  f.window.dispatchEvent(new Event('blur')); f.key('keyup'); f.controls.setPanel(false);
  assert.deepEqual(f.changes, [true, false]);
  f.key('keydown'); assert.equal(f.controls.releaseAll(), true); assert.equal(f.controls.releaseAll(), false);
  f.key('keyup'); assert.deepEqual(f.changes, [true, false, true, false]);
});
test('CWS disposal releases a hold and removes all keyboard handlers', () => {
  const f = fixture(); f.key('keydown'); f.controls.dispose(); f.controls.dispose();
  assert.equal(f.key('keydown').defaultPrevented, false); f.key('keyup'); f.controls.setPanel(true);
  assert.deepEqual(f.changes, [true, false]);
});
