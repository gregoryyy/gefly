import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMapZoomShortcuts } from './map-zoom-shortcuts.ts';

class TargetElement extends EventTarget {
  readonly editable: boolean;
  constructor(editable = false) { super(); this.editable = editable; }
  closest(selector: string) {
    assert.equal(selector, 'input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    return this.editable ? this : null;
  }
}

class FakeDocument extends EventTarget {
  defaultView = { Element: TargetElement };
  modal = false;
  credits: { checkVisibility(): boolean }[] = [];
  captures: (boolean | undefined)[] = [];
  querySelector(selector: string) {
    assert.equal(selector, 'dialog[open]'); return this.modal ? {} : null;
  }
  querySelectorAll(selector: string) {
    assert.equal(selector, '.cesium-credit-lightbox-overlay'); return this.credits;
  }
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    this.captures.push(typeof options === 'boolean' ? options : options?.capture);
    super.addEventListener(type, callback, options);
  }
}

function fixture() {
  const document = new FakeDocument();
  let open = true, topMenu = false, ready = true, zoom = 5, downstream = 0;
  const calls: (1 | -1)[] = [];
  const root = {
    ownerDocument: document,
    querySelector(selector: string) {
      assert.equal(selector, '.top-menu[open]'); return topMenu ? {} : null;
    },
  };
  const shortcuts = createMapZoomShortcuts({ root: root as unknown as HTMLElement,
    isOpen: () => open, onZoom(direction) { calls.push(direction); if (ready) zoom += direction; } });
  document.addEventListener('keydown', () => { downstream++; }, { capture: true });
  function key(properties: Partial<KeyboardEvent> = {}, target?: TargetElement, prevented = false) {
    const event = Object.assign(new Event('keydown', { cancelable: true }), {
      key: '+', code: 'Equal', shiftKey: true, repeat: false, ctrlKey: false, metaKey: false, altKey: false,
      ...properties,
    });
    if (target) Object.defineProperty(event, 'target', { value: target });
    if (prevented) event.preventDefault();
    document.dispatchEvent(event); return event;
  }
  return { document, shortcuts, calls, key, zoom: () => zoom, downstream: () => downstream,
    close: () => { open = false; }, reopen: () => { open = true; },
    menu: () => { topMenu = true; }, loading: () => { ready = false; } };
}

test('R-WORLD-6/R-SIM-9 open map captures US, German and numpad zoom once per press', () => {
  for (const [properties, direction] of [
    [{ key: '+', code: 'Equal', shiftKey: true }, 1], [{ key: '+', code: 'BracketRight' }, 1],
    [{ key: 'Unidentified', code: 'Equal', shiftKey: true }, 1], [{ key: '-', code: 'Minus' }, -1],
    [{ key: '+', code: 'NumpadAdd' }, 1], [{ key: '-', code: 'NumpadSubtract' }, -1],
    [{ key: 'Unidentified', code: 'NumpadAdd' }, 1], [{ key: 'Unidentified', code: 'NumpadSubtract' }, -1],
  ] as const) {
    const f = fixture();
    assert.equal(f.document.captures[0], true, 'listener is attached in capture phase');
    assert.equal(f.key(properties).defaultPrevented, true);
    assert.deepEqual(f.calls, [direction]); assert.equal(f.zoom(), 5 + direction);
    assert.equal(f.downstream(), 0, 'neither pacing nor built-in map zoom sees the consumed key');
    f.shortcuts.dispose();
  }
});

test('R-SIM-9 = is never a map zoom key, so it reaches simulation pacing over the open map', () => {
  const f = fixture();
  for (const properties of [{ key: '=', code: 'Equal' }, { key: '=', code: 'Digit0', shiftKey: true },
    { key: '=', code: 'Equal', shiftKey: true }, { key: '=', code: 'Equal', repeat: true }]) {
    assert.equal(f.key(properties).defaultPrevented, false);
  }
  assert.deepEqual(f.calls, []); assert.equal(f.zoom(), 5); assert.equal(f.downstream(), 4);
  f.shortcuts.dispose();
});

test('R-WORLD-6/R-SIM-9 repeated zoom keys are consumed without zoom or throttle leakage', () => {
  const f = fixture();
  for (const properties of [{ key: '+', code: 'Equal', shiftKey: true },
    { key: '+', code: 'NumpadAdd' }, { key: '-', code: 'Minus' }]) {
    assert.equal(f.key({ ...properties, repeat: true }).defaultPrevented, true);
  }
  assert.deepEqual(f.calls, []); assert.equal(f.zoom(), 5); assert.equal(f.downstream(), 0);
  f.shortcuts.dispose();
});

test('R-WORLD-6/R-SIM-9 closed map and unrelated keys retain normal downstream controls', () => {
  const f = fixture(); f.close();
  assert.equal(f.key().defaultPrevented, false);
  assert.equal(f.key({ key: '+', code: 'Equal', shiftKey: true, repeat: true }).defaultPrevented, false);
  f.reopen(); assert.equal(f.key({ key: '0', code: 'Digit0' }).defaultPrevented, false);
  assert.equal(f.key({ key: 'a', code: 'KeyA' }).defaultPrevented, false);
  assert.deepEqual(f.calls, []); assert.equal(f.downstream(), 4); f.shortcuts.dispose();
});

test('R-WORLD-6/R-SIM-9 modifiers, prior cancellation, editable fields, dialogs and menus guard map shortcuts', () => {
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
    const f = fixture(); assert.equal(f.key(properties).defaultPrevented, false);
    assert.deepEqual(f.calls, []); assert.equal(f.downstream(), 1); f.shortcuts.dispose();
  }
  for (const guard of ['prevented', 'editable', 'modal', 'menu', 'credit'] as const) {
    const f = fixture();
    if (guard === 'modal') f.document.modal = true;
    if (guard === 'menu') f.menu();
    if (guard === 'credit') f.document.credits = [{ checkVisibility: () => false }, { checkVisibility: () => true }];
    const event = f.key({}, guard === 'editable' ? new TargetElement(true) : undefined, guard === 'prevented');
    assert.equal(event.defaultPrevented, guard === 'prevented');
    assert.deepEqual(f.calls, []); assert.equal(f.downstream(), 1); f.shortcuts.dispose();
  }
});

test('R-WORLD-6/R-SIM-9 noneditable map focus and hidden credits do not block map zoom', () => {
  const f = fixture(); f.document.credits = [{ checkVisibility: () => false }];
  assert.equal(f.key({}, new TargetElement(false)).defaultPrevented, true);
  assert.deepEqual(f.calls, [1]); assert.equal(f.downstream(), 0); f.shortcuts.dispose();
});

test('R-WORLD-6/R-SIM-9 loading map consumes zoom keys even while zoom callback cannot move it', () => {
  const f = fixture(); f.loading();
  assert.equal(f.key().defaultPrevented, true); assert.deepEqual(f.calls, [1]);
  assert.equal(f.zoom(), 5); assert.equal(f.downstream(), 0); f.shortcuts.dispose();
});

test('R-WORLD-6/R-SIM-9 disposal is idempotent and restores downstream keyboard handling', () => {
  const f = fixture(); f.key(); f.shortcuts.dispose(); f.shortcuts.dispose();
  assert.equal(f.key().defaultPrevented, false);
  assert.equal(f.key({ key: '-', code: 'Minus' }).defaultPrevented, false);
  assert.deepEqual(f.calls, [1]); assert.equal(f.downstream(), 2);
});
