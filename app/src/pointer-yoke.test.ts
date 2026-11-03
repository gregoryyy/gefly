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
  let enabled = true, lookOnly = false;
  const controller = createPointerYoke({ element: surface as unknown as HTMLElement,
    enabled: () => enabled, lookOnly: () => lookOnly, onYoke: (x,y) => yokes.push([x,y]),
    onLook: (yaw,pitch) => looks.push([yaw,pitch]), onMode: mode => modes.push(mode) });
  const click = (x = 200, y = 200) => { surface.dispatchEvent(pointer('pointerdown',x,y)); surface.dispatchEvent(pointer('pointerup',x,y)); };
  return { surface, controller, yokes, looks, modes, click,
    disable: () => { enabled = false; }, review: () => { lookOnly = true; } };
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('short clicks toggle relative yoke; input clamps and leaving neutralizes without switching off', () => {
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
  assert.equal(f.modes.at(-1),'yoke'); assert.deepEqual(f.yokes.at(-1),[0,0]);
  const counts = [f.yokes.length,f.looks.length,f.modes.length];
  f.surface.dispatchEvent(new Event('pointerleave'));
  assert.deepEqual([f.yokes.length,f.looks.length,f.modes.length],counts);
  f.controller.cancel(); assert.equal(f.modes.at(-1),'off');
  f.controller.dispose();
});

test('re-entering restores authoritative yoke input from the original anchor until clicked off', () => {
  const f = fixture(); f.click(200,200);
  f.surface.dispatchEvent(pointer('pointermove',275,125));
  assert.deepEqual(f.yokes.at(-1),[.5,.5]);
  f.surface.dispatchEvent(new Event('pointerleave'));
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  // Re-entry itself applies the position; no new click or recentering is needed.
  f.surface.dispatchEvent(pointer('pointerenter',125,275));
  assert.deepEqual(f.yokes.at(-1),[-.5,-.5]);
  f.surface.dispatchEvent(pointer('pointermove',200,200));
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  f.click(350,300); assert.equal(f.modes.at(-1),'off');
  const count = f.yokes.length;
  f.surface.dispatchEvent(pointer('pointerenter',125,275));
  assert.equal(f.yokes.length,count);
  f.controller.dispose();
});

test('leaving during a pending hold cancels only that gesture and retains the prior yoke anchor', async () => {
  const f = fixture(); f.click(200,200);
  f.surface.dispatchEvent(pointer('pointermove',275,275));
  f.surface.dispatchEvent(pointer('pointerdown',275,275));
  f.surface.dispatchEvent(pointer('pointermove',850,275));
  assert.equal(f.surface.captures.size,0);
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  await sleep(280);
  assert.equal(f.modes.at(-1),'yoke');
  assert.deepEqual(f.looks,[]);
  f.surface.dispatchEvent(pointer('pointerup',850,275));
  f.surface.dispatchEvent(pointer('pointerenter',125,275));
  assert.deepEqual(f.yokes.at(-1),[-.5,-.5]);
  f.click(); assert.equal(f.modes.at(-1),'off');
  f.surface.dispatchEvent(pointer('pointerdown',250,250));
  f.surface.dispatchEvent(new Event('pointerleave'));
  await sleep(280);
  assert.equal(f.modes.at(-1),'off');
  f.surface.dispatchEvent(pointer('pointerenter',300,300));
  assert.deepEqual(f.yokes.at(-1),[0,0]);
  f.controller.dispose();
});

test('hold-drag looks without yoke input; release preserves the original yoke midpoint', async () => {
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
  const releaseCount = f.yokes.length;
  f.surface.dispatchEvent(pointer('pointerup',300,200));
  assert.equal(f.modes.at(-1),'yoke'); assert.deepEqual(f.looks.at(-1),[0,0]);
  assert.equal(f.yokes.length,releaseCount,'release does not introduce another control command');
  f.surface.dispatchEvent(pointer('pointermove',275,125));
  assert.deepEqual(f.yokes.at(-1),[.5,.5]);
  f.surface.dispatchEvent(pointer('pointermove',200,200));
  assert.deepEqual(f.yokes.at(-1),[0,0],'the original midpoint still centers both axes');
  // A second look, including release outside the scene, must preserve it too.
  f.surface.dispatchEvent(pointer('pointerdown',200,200));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove',900,700));
  f.surface.dispatchEvent(pointer('pointerup',900,700));
  assert.equal(f.modes.at(-1),'yoke');
  f.surface.dispatchEvent(pointer('pointerenter',125,275));
  assert.deepEqual(f.yokes.at(-1),[-.5,-.5]);
  f.surface.dispatchEvent(pointer('pointermove',200,200));
  assert.deepEqual(f.yokes.at(-1),[0,0]);
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

test('review hold-drag retains camera orientation and accumulates later drags without enabling yoke', async () => {
  const f = fixture(); f.review();
  f.click(); assert.notEqual(f.modes.at(-1),'yoke');
  f.surface.dispatchEvent(pointer('pointermove',350,50));
  assert.deepEqual(f.yokes,[]);
  f.surface.dispatchEvent(pointer('pointerdown',200,200));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove',250,150));
  assert.deepEqual(f.looks.at(-1),[.2,.2]);
  f.surface.dispatchEvent(pointer('pointerup',250,150));
  assert.equal(f.modes.at(-1),'off');
  assert.deepEqual(f.looks.at(-1),[.2,.2]);
  f.click(250,150);
  assert.deepEqual(f.looks.at(-1),[.2,.2]);
  f.surface.dispatchEvent(pointer('pointerdown',250,150));
  await sleep(280);
  f.surface.dispatchEvent(new Event('pointerleave'));
  f.surface.dispatchEvent(pointer('pointermove',300,200));
  assert.deepEqual(f.looks.at(-1),[.4,0]);
  f.surface.dispatchEvent(pointer('pointerup',300,200));
  assert.deepEqual(f.looks.at(-1),[.4,0]);
  assert.deepEqual(f.yokes,[]);
  f.surface.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{code:'Escape'}));
  assert.deepEqual(f.looks.at(-1),[0,0]);
  f.controller.dispose();
});
