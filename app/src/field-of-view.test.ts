import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFieldOfViewControl, DEFAULT_FOV_RAD, MAX_FOV_RAD, MIN_FOV_RAD, nextFieldOfView } from './field-of-view.ts';

test('vertical wheel zooms in and out with equivalent pixel, line and page deltas', () => {
  const up = nextFieldOfView(DEFAULT_FOV_RAD, -120, 0, 600);
  const down = nextFieldOfView(DEFAULT_FOV_RAD, 120, 0, 600);
  assert.ok(up < DEFAULT_FOV_RAD);
  assert.ok(down > DEFAULT_FOV_RAD);
  assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, -7.5, 1, 600), up);
  assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, -.2, 2, 600), up);
  assert.ok(Math.abs(nextFieldOfView(up, 120, 0, 600) - DEFAULT_FOV_RAD) < 1e-12);
});

test('field of view stays bounded and a single wheel event cannot jump across its range', () => {
  assert.equal(nextFieldOfView(MIN_FOV_RAD, -1e9, 0, 600), MIN_FOV_RAD);
  assert.equal(nextFieldOfView(MAX_FOV_RAD, 1e9, 0, 600), MAX_FOV_RAD);
  assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, 1e9, 0, 600), nextFieldOfView(DEFAULT_FOV_RAD, 200, 0, 600));
  assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, -1e9, 2, 600), nextFieldOfView(DEFAULT_FOV_RAD, -200, 0, 600));
  assert.ok(nextFieldOfView(DEFAULT_FOV_RAD, 1e9, 0, 600) < MAX_FOV_RAD);
});

test('invalid wheel data is ignored; invalid camera values recover to a bounded default', () => {
  for (const delta of [0, NaN, Infinity, -Infinity]) {
    assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, delta, 0, 600), DEFAULT_FOV_RAD);
  }
  assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, 1, 3, 600), DEFAULT_FOV_RAD);
  for (const height of [0, -1, NaN, Infinity]) {
    assert.equal(nextFieldOfView(DEFAULT_FOV_RAD, 1, 2, height), DEFAULT_FOV_RAD);
  }
  for (const current of [NaN, Infinity, -Infinity, 0, -1]) {
    assert.equal(nextFieldOfView(current, 0, 0, 600), DEFAULT_FOV_RAD);
  }
  assert.equal(nextFieldOfView(20, 0, 0, 600), MAX_FOV_RAD);
});

function wheel(values: Partial<WheelEvent> = {}): Event {
  return Object.assign(new Event('wheel', { cancelable: true }), {
    deltaX: 0, deltaY: 80, deltaMode: 0, ctrlKey: false, metaKey: false, altKey: false, ...values,
  });
}
class Surface extends EventTarget {
  clientHeight = 600;
  dialogOpen = false;
  editable = false;
  ownerDocument = { querySelector: () => this.dialogOpen ? {} : null };
  closest() { return this.editable ? {} : null; }
}

test('scene wheel prevents default only for eligible vertical input and disposal removes it', () => {
  const surface = new Surface();
  const unrelatedPanel = new EventTarget();
  let fov = DEFAULT_FOV_RAD, blocked = false, changes = 0;
  const control = createFieldOfViewControl({ element: surface as unknown as HTMLElement,
    getFov: () => fov, onChange: next => { fov = next; changes++; }, isBlocked: () => blocked });
  const accepted = wheel(); surface.dispatchEvent(accepted);
  assert.equal(accepted.defaultPrevented, true);
  assert.ok(fov > DEFAULT_FOV_RAD);
  for (const values of [{ deltaX: 100 }, { deltaX: 80 }, { deltaY: 0 }, { deltaY: NaN },
    { deltaX: Infinity }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { deltaMode: 3 }]) {
    const ignored = wheel(values); surface.dispatchEvent(ignored);
    assert.equal(ignored.defaultPrevented, false);
  }
  for (const boundary of ['blocked', 'dialog', 'editable'] as const) {
    blocked = boundary === 'blocked'; surface.dialogOpen = boundary === 'dialog'; surface.editable = boundary === 'editable';
    const ignored = wheel(); surface.dispatchEvent(ignored); assert.equal(ignored.defaultPrevented, false);
  }
  blocked = false; surface.dialogOpen = false; surface.editable = false;
  const outside = wheel(); unrelatedPanel.dispatchEvent(outside);
  assert.equal(outside.defaultPrevented, false);
  assert.equal(changes, 1);
  control.dispose();
  const disposed = wheel(); surface.dispatchEvent(disposed);
  assert.equal(disposed.defaultPrevented, false);
  assert.equal(changes, 1);
});
