import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPointerYoke, type PointerYokeMode } from './pointer-yoke.ts';

function pointer(type: string, x = 200, y = 200, button = 0): Event {
  return Object.assign(new Event(type, { cancelable: true }), {
    pointerId: 1, isPrimary: true, button, clientX: x, clientY: y,
  });
}
class Surface extends EventTarget {
  ownerDocument = Object.assign(new EventTarget(), { hidden: false, defaultView: new EventTarget() });
  captures = new Set<number>();
  focus() {}
  getBoundingClientRect() { return { left: 0, right: 800, top: 0, bottom: 600 }; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) {
    this.captures.delete(id);
    this.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: id }));
  }
}
function fixture() {
  const surface = new Surface();
  const yokes: number[][] = [], looks: number[][] = [], modes: PointerYokeMode[] = [];
  let enabled = true;
  const controller = createPointerYoke({ element: surface as unknown as HTMLElement,
    enabled: () => enabled, onYoke: (x,y) => yokes.push([x,y]),
    onLook: (yaw,pitch) => looks.push([yaw,pitch]), onMode: mode => modes.push(mode) });
  const click = (x = 200, y = 200) => { surface.dispatchEvent(pointer('pointerdown',x,y)); surface.dispatchEvent(pointer('pointerup',x,y)); };
  return { surface, controller, yokes, looks, modes, click, disable: () => { enabled = false; } };
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('short clicks toggle relative yoke; input clamps and leaving neutralizes once', () => {
  const f = fixture();
  f.surface.dispatchEvent(pointer('pointerdown',200,200,2));
  assert.deepEqual(f.modes, []);
  f.click(); assert.equal(f.modes.at(-1),'yoke');
  f.surface.dispatchEvent(pointer('pointermove',500,0));
  assert.deepEqual(f.yokes.at(-1),[1,1]);
  f.click(500,200); assert.equal(f.modes.at(-1),'off');
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  f.click(); f.surface.dispatchEvent(pointer('pointermove',275,275));
  assert.deepEqual(f.yokes.at(-1),[.5,-.5]);
  f.surface.dispatchEvent(new Event('pointerleave'));
  assert.equal(f.modes.at(-1),'off'); assert.deepEqual(f.yokes.at(-1),[0,0]);
  const counts = [f.yokes.length,f.looks.length,f.modes.length];
  f.controller.cancel(); assert.deepEqual([f.yokes.length,f.looks.length,f.modes.length],counts);
  f.controller.dispose();
});

test('hold-drag looks without yoke input; release restores prior mode and a neutral anchor', async () => {
  const f = fixture(); f.click();
  f.surface.dispatchEvent(pointer('pointermove',250,200));
  f.surface.dispatchEvent(pointer('pointerdown',250,200));
  f.surface.dispatchEvent(pointer('pointermove',300,150));
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  await sleep(280);
  assert.equal(f.modes.at(-1),'look'); assert.deepEqual(f.looks.at(-1),[.2,.2]);
  // Captured looking continues outside the scene; it must not become yoke input.
  f.surface.dispatchEvent(new Event('pointerleave'));
  f.surface.dispatchEvent(pointer('pointermove',2000,-2000));
  assert.deepEqual(f.looks.at(-1),[Math.PI,70*Math.PI/180]);
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  f.surface.dispatchEvent(pointer('pointerup',300,200));
  assert.equal(f.modes.at(-1),'yoke'); assert.deepEqual(f.looks.at(-1),[0,0]);
  f.surface.dispatchEvent(pointer('pointermove',375,125));
  assert.deepEqual(f.yokes.at(-1),[.5,.5]);
  f.controller.dispose();
});

test('hold while off does not enable yoke; interruption and disabled flight cancel gestures', async () => {
  const f = fixture();
  f.surface.dispatchEvent(pointer('pointerdown'));
  await sleep(280);
  assert.equal(f.modes.at(-1),'look');
  f.surface.dispatchEvent(pointer('pointerup'));
  assert.equal(f.modes.at(-1),'off');
  f.click(); f.surface.dispatchEvent(pointer('pointermove',250,250));
  f.surface.ownerDocument.defaultView.dispatchEvent(new Event('blur'));
  assert.equal(f.modes.at(-1),'off'); assert.deepEqual(f.yokes.at(-1),[0,0]);
  f.click();
  f.surface.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{code:'Escape'}));
  assert.equal(f.modes.at(-1),'off');
  f.click(); f.disable(); f.surface.dispatchEvent(pointer('pointermove',400,200));
  assert.equal(f.modes.at(-1),'off');
  const counts=[f.yokes.length,f.looks.length,f.modes.length];
  f.controller.dispose(); f.click();
  await sleep(280);
  assert.deepEqual([f.yokes.length,f.looks.length,f.modes.length],counts);
});
