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
  rect = { left: 0, right: 800, top: 0, bottom: 600 };
  focus() {}
  getBoundingClientRect() { return this.rect; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) {
    this.captures.delete(id);
    this.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: id }));
  }
}
function fixture(centered = false) {
  const surface = new Surface();
  const yokes: number[][] = [], looks: number[][] = [], modes: PointerYokeMode[] = [];
  let enabled = true, lookOnly = false;
  const controller = createPointerYoke({ element: surface as unknown as HTMLElement,
    centered: () => centered, enabled: () => enabled, lookOnly: () => lookOnly, onYoke: (x,y) => yokes.push([x,y]),
    onLook: (yaw,pitch) => looks.push([yaw,pitch]), onMode: mode => modes.push(mode) });
  const click = (x = 200, y = 200) => { surface.dispatchEvent(pointer('pointerdown',x,y)); surface.dispatchEvent(pointer('pointerup',x,y)); };
  return { surface, controller, yokes, looks, modes, click,
    disable: () => { enabled = false; }, enable: () => { enabled = true; }, review: () => { lookOnly = true; } };
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('center query exposes the authoritative neutral point without changing controls or borrowed look', async () => {
  const f = fixture(); assert.equal(f.controller.getCenter(), null);
  f.click(180, 220); assert.deepEqual(f.controller.getCenter(), {clientX:180, clientY:220});
  const point = f.controller.getCenter()!; point.clientX = 999;
  assert.deepEqual(f.controller.getCenter(), {clientX:180, clientY:220}, 'query result cannot move the anchor');
  f.surface.dispatchEvent(pointer('pointerdown',300,300)); await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove',400,350));
  const counts = [f.yokes.length,f.looks.length,f.modes.length];
  assert.deepEqual(f.controller.getCenter(), {clientX:180, clientY:220});
  assert.deepEqual([f.yokes.length,f.looks.length,f.modes.length],counts, 'query emits no controls or gestures');
  f.surface.dispatchEvent(pointer('pointerup',400,350));
  f.surface.rect = {left:250,right:800,top:0,bottom:600}; assert.equal(f.controller.getCenter(), null, 'off-scene anchor is hidden');
  f.surface.rect.left = 0; f.review(); assert.equal(f.controller.getCenter(), null); f.controller.dispose(); assert.equal(f.controller.getCenter(), null);
  const centered = fixture(true); centered.click(10,10);
  assert.deepEqual(centered.controller.getCenter(), {clientX:400,clientY:300});
  centered.surface.rect = {left:100,right:1000,top:40,bottom:800};
  assert.deepEqual(centered.controller.getCenter(), {clientX:550,clientY:420}, 'center follows resized scene');
  centered.disable(); assert.equal(centered.controller.getCenter(), null); centered.controller.dispose();
  const off = fixture(); off.click(); off.click(); assert.equal(off.controller.getCenter(), null); off.controller.dispose();
});

function doubleClick(surface: Surface, x: number, y: number): void {
  for (const detail of [1, 2]) {
    surface.dispatchEvent(pointer('pointerdown', x, y)); surface.dispatchEvent(pointer('pointerup', x, y));
    surface.dispatchEvent(Object.assign(new Event('click', { cancelable: true }), { detail, button: 0, clientX: x, clientY: y }));
  }
  surface.dispatchEvent(Object.assign(new Event('dblclick', { cancelable: true }), { detail: 2, button: 0, clientX: x, clientY: y }));
}

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
  assert.equal(f.modes.at(-1),'yoke'); assert.deepEqual(f.looks.at(-1),[Math.PI,70*Math.PI/180]);
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

test('hold while off does not enable yoke; interruption cancels and disabled flight neutralizes gestures', async () => {
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
  assert.equal(f.modes.at(-1),'yoke'); assert.deepEqual(f.yokes.at(-1),[0,0]);
  f.controller.dispose();
  const counts=[f.yokes.length,f.looks.length,f.modes.length];
  f.click();
  await sleep(280);
  assert.deepEqual([f.yokes.length,f.looks.length,f.modes.length],counts);
});

test('temporary neutralization retains the selected reference and look without residual input', async () => {
  const f = fixture(); f.click(200, 200);
  f.surface.dispatchEvent(pointer('pointermove', 275, 125));
  f.controller.neutralize();
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  assert.deepEqual(f.controller.getCenter(), { clientX: 200, clientY: 200 });
  const count = f.yokes.length;
  f.surface.dispatchEvent(pointer('pointermove', 275, 125));
  assert.equal(f.yokes.length, count, 'unchanged position cannot restore residual input');
  f.surface.dispatchEvent(pointer('pointerenter', 275, 125));
  assert.deepEqual(f.yokes.at(-1), [.5, .5], 're-entry remains authoritative');
  f.surface.dispatchEvent(pointer('pointerdown', 275, 125)); await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 325, 175));
  const look = [...f.looks.at(-1)!]; f.controller.neutralize();
  assert.equal(f.surface.captures.size, 0); assert.equal(f.modes.at(-1), 'yoke');
  assert.deepEqual(f.looks.at(-1), look);
  f.surface.dispatchEvent(pointer('pointerup', 325, 175));
  f.surface.dispatchEvent(pointer('pointermove', 325, 175));
  assert.deepEqual(f.yokes.at(-1), [0, 0], 'interrupted look release stays neutral');
  f.disable(); f.surface.dispatchEvent(pointer('pointermove', 300, 200)); f.enable();
  assert.deepEqual(f.controller.getCenter(), { clientX: 200, clientY: 200 });
  f.surface.dispatchEvent(pointer('pointermove', 300, 200));
  assert.deepEqual(f.yokes.at(-1), [0, 0], 'menu closure alone does not apply old pointer input');
  f.surface.dispatchEvent(pointer('pointermove', 275, 125));
  assert.deepEqual(f.yokes.at(-1), [.5, .5]);
  // Disabling during a pending press must not complete its click toggle.
  f.surface.dispatchEvent(pointer('pointerdown', 275, 125)); f.disable();
  f.surface.dispatchEvent(pointer('pointerup', 300, 200)); f.enable();
  assert.deepEqual(f.controller.getCenter(), { clientX: 200, clientY: 200 });
  f.controller.cancel(); assert.equal(f.controller.getCenter(), null);
  f.surface.dispatchEvent(pointer('pointerenter', 275, 125));
  assert.deepEqual(f.yokes.at(-1), [0, 0], 'explicit cancellation cannot revive the selected mode');
  f.controller.dispose();
});

test('default relative look retains and accumulates each drag and click toggle while keeping the yoke anchor', async () => {
  const f = fixture(); f.click(200, 200);
  f.surface.dispatchEvent(pointer('pointerdown', 250, 200));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 300, 150));
  f.surface.dispatchEvent(pointer('pointerup', 300, 150));
  assert.deepEqual(f.looks.at(-1), [.2, .2]);
  const releaseCount = f.yokes.length;
  f.surface.dispatchEvent(pointer('pointermove', 300, 150));
  assert.equal(f.yokes.length, releaseCount, 'unchanged release coordinates remain neutral in relative mode too');
  f.surface.dispatchEvent(pointer('pointermove', 275, 125));
  assert.deepEqual(f.yokes.at(-1), [.5, .5], 'actual movement uses the original yoke midpoint');
  f.surface.dispatchEvent(pointer('pointerdown', 275, 125));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 325, 175));
  f.surface.dispatchEvent(pointer('pointerup', 325, 175));
  assert.deepEqual(f.looks.at(-1), [.4, 0]);
  f.surface.dispatchEvent(pointer('pointerenter', 325, 175));
  assert.deepEqual(f.yokes.at(-1), [125 / 150, 25 / 150], 'pointer entry stays authoritative, including at release coordinates');
  f.click(500, 200); assert.equal(f.modes.at(-1), 'off');
  f.click(200, 200); assert.equal(f.modes.at(-1), 'yoke');
  assert.deepEqual(f.looks.at(-1), [.4, 0], 'short clicks do not center look');
  f.disable(); f.surface.dispatchEvent(pointer('pointermove', 300, 200));
  assert.equal(f.modes.at(-1), 'yoke'); assert.deepEqual(f.yokes.at(-1), [0, 0]);
  assert.deepEqual(f.looks.at(-1), [.4, 0], 'pause/disabled controls neutralize yoke while retaining look');
  f.controller.dispose();
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

test('centered yoke always uses the current scene midpoint, never click or release coordinates', () => {
  const f = fixture(true);
  f.click(100, 100);
  f.surface.dispatchEvent(pointer('pointermove', 475, 225));
  assert.deepEqual(f.yokes.at(-1), [.5, .5]);
  f.click(700, 500); assert.equal(f.modes.at(-1), 'off');
  f.click(100, 500); assert.equal(f.modes.at(-1), 'yoke');
  f.surface.dispatchEvent(pointer('pointermove', 400, 300));
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  // A resized/repositioned scene moves the neutral point without a new click.
  f.surface.rect = { left: 100, right: 1100, top: 50, bottom: 650 };
  f.surface.dispatchEvent(pointer('pointermove', 675, 275));
  assert.deepEqual(f.yokes.at(-1), [.5, .5]);
  f.surface.dispatchEvent(pointer('pointermove', 600, 350));
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  f.surface.dispatchEvent(pointer('pointermove', 1050, 100));
  assert.deepEqual(f.yokes.at(-1), [1, 1]);
  f.controller.dispose();
});

test('centered hold-drag accumulates retained view, keeps release neutral and never moves the midpoint', async () => {
  const f = fixture(true); f.click(100, 100);
  f.surface.dispatchEvent(pointer('pointermove', 450, 300));
  f.surface.dispatchEvent(pointer('pointerdown', 450, 300));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 500, 250));
  assert.deepEqual(f.looks.at(-1), [.2, .2]);
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  f.surface.dispatchEvent(pointer('pointerup', 500, 250));
  assert.deepEqual(f.looks.at(-1), [.2, .2]);
  assert.equal(f.modes.at(-1), 'yoke');
  const releaseCount = f.yokes.length;
  f.surface.dispatchEvent(pointer('pointermove', 500, 250));
  assert.equal(f.yokes.length, releaseCount, 'unchanged release coordinates must stay neutral');
  f.surface.dispatchEvent(pointer('pointermove', 475, 225));
  assert.deepEqual(f.yokes.at(-1), [.5, .5]);
  f.surface.dispatchEvent(pointer('pointerdown', 475, 225));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 500, 250));
  assert(Math.abs(f.looks.at(-1)![0] - .3) < 1e-12);
  assert(Math.abs(f.looks.at(-1)![1] - .1) < 1e-12);
  f.surface.dispatchEvent(pointer('pointerup', 500, 250));
  const retained = [...f.looks.at(-1)!];
  f.click(700, 500); assert.equal(f.modes.at(-1), 'off');
  f.click(100, 100); assert.equal(f.modes.at(-1), 'yoke');
  assert.deepEqual(f.looks.at(-1), retained, 'click toggles do not recenter the view');
  f.surface.dispatchEvent(pointer('pointermove', 400, 300));
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  f.controller.dispose();
});

test('centered re-entry is authoritative from the fixed midpoint after leave or outside look release', async () => {
  const f = fixture(true); f.click(100, 100);
  f.surface.dispatchEvent(pointer('pointermove', 475, 225));
  f.surface.dispatchEvent(new Event('pointerleave'));
  assert.deepEqual(f.yokes.at(-1), [0, 0]); assert.equal(f.modes.at(-1), 'yoke');
  f.surface.dispatchEvent(pointer('pointerenter', 325, 375));
  assert.deepEqual(f.yokes.at(-1), [-.5, -.5]);
  f.surface.dispatchEvent(pointer('pointerdown', 325, 375));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 900, 700));
  f.surface.dispatchEvent(pointer('pointerup', 900, 700));
  const retained = [...f.looks.at(-1)!];
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  f.surface.dispatchEvent(pointer('pointerenter', 400, 300));
  assert.deepEqual(f.yokes.at(-1), [0, 0]);
  f.surface.dispatchEvent(pointer('pointermove', 475, 225));
  assert.deepEqual(f.yokes.at(-1), [.5, .5]);
  assert.deepEqual(f.looks.at(-1), retained);
  f.controller.dispose();
});

for (const centered of [false, true]) test(`${centered ? 'centered' : 'default relative'} cancellation, focus/visibility and pointer interruption retain view; Escape and reset center explicitly`, async () => {
  const f = fixture(centered); f.click();
  f.surface.dispatchEvent(pointer('pointerdown', 200, 200));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 250, 150));
  f.surface.dispatchEvent(pointer('pointerup', 250, 150));
  f.controller.cancel();
  for (const interrupt of [
    () => f.controller.cancel(),
    () => f.surface.ownerDocument.defaultView.dispatchEvent(new Event('blur')),
    () => { f.surface.ownerDocument.hidden = true; f.surface.ownerDocument.dispatchEvent(new Event('visibilitychange')); f.surface.ownerDocument.hidden = false; },
  ]) {
    f.click(); f.surface.dispatchEvent(pointer('pointermove', 475, 225)); interrupt();
    assert.equal(f.modes.at(-1), 'off');
    assert.deepEqual(f.yokes.at(-1), [0, 0]);
    assert.deepEqual(f.looks.at(-1), [.2, .2]);
  }
  for (const type of ['pointercancel', 'lostpointercapture']) {
    f.click(); f.surface.dispatchEvent(pointer('pointerdown', 200, 200));
    f.surface.dispatchEvent(Object.assign(new Event(type), { pointerId: 1 }));
    assert.equal(f.modes.at(-1), 'off'); assert.equal(f.surface.captures.size, 0);
    assert.deepEqual(f.looks.at(-1), [.2, .2]);
  }
  f.surface.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'Escape' }));
  assert.deepEqual(f.looks.at(-1), [0, 0]); assert.equal(f.modes.at(-1), 'off');
  f.surface.dispatchEvent(pointer('pointerdown', 200, 200));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 250, 150));
  f.surface.dispatchEvent(pointer('pointerup', 250, 150));
  assert.deepEqual(f.looks.at(-1), [.2, .2]);
  f.controller.reset();
  assert.deepEqual(f.looks.at(-1), [0, 0]); assert.equal(f.modes.at(-1), 'off');
  f.controller.dispose();
});

for (const centered of [false, true]) test(`${centered ? 'centered' : 'default relative'} Review look stays cumulative and read only across cancellation, then explicit reset clears it`, async () => {
  const f = fixture(centered); f.review(); f.click();
  f.surface.dispatchEvent(pointer('pointermove', 475, 225));
  assert.deepEqual(f.yokes, []);
  f.surface.dispatchEvent(pointer('pointerdown', 200, 200));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 250, 150));
  f.surface.dispatchEvent(pointer('pointerup', 250, 150));
  f.controller.cancel(); assert.deepEqual(f.looks.at(-1), [.2, .2]);
  f.surface.dispatchEvent(pointer('pointerdown', 250, 150));
  await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 300, 200));
  f.surface.dispatchEvent(pointer('pointerup', 300, 200));
  assert.deepEqual(f.looks.at(-1), [.4, 0]); assert.deepEqual(f.yokes, []);
  f.controller.reset(); assert.deepEqual(f.looks.at(-1), [0, 0]);
  f.controller.dispose();
});

for (const centered of [false, true]) test(`${centered ? 'centered' : 'relative'} double-click centers look while restoring pre-pair yoke mode and anchor`, async () => {
  const f = fixture(centered); f.click(200, 200);
  f.surface.dispatchEvent(pointer('pointermove', 475, 225)); const originalAxes = [...f.yokes.at(-1)!];
  f.surface.dispatchEvent(pointer('pointerdown', 475, 225)); await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 525, 175)); f.surface.dispatchEvent(pointer('pointerup', 525, 175));
  assert.deepEqual(f.looks.at(-1), [.2, .2]);
  doubleClick(f.surface, 600, 300);
  assert.deepEqual(f.looks.at(-1), [0, 0]); assert.equal(f.modes.at(-1), 'yoke');
  assert.deepEqual(f.yokes.at(-1), [0, 0], 'double-click ends neutral like a look release');
  const commands = f.yokes.length;
  f.surface.dispatchEvent(pointer('pointermove', 600, 300)); assert.equal(f.yokes.length, commands);
  f.surface.dispatchEvent(pointer('pointermove', 475, 225)); assert.deepEqual(f.yokes.at(-1), originalAxes,
    'both browser click toggles must not replace the original relative anchor');
  f.click(200, 200); assert.equal(f.modes.at(-1), 'off');
  doubleClick(f.surface, 600, 300); assert.equal(f.modes.at(-1), 'off', 'initially off stays off');
  f.controller.dispose();
});

test('Review double-click centers retained look without yoke input; cancellation cannot revive a saved mode', async () => {
  const f = fixture(); f.review();
  f.surface.dispatchEvent(pointer('pointerdown', 200, 200)); await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove', 250, 150)); f.surface.dispatchEvent(pointer('pointerup', 250, 150));
  doubleClick(f.surface, 500, 300);
  assert.deepEqual(f.looks.at(-1), [0, 0]); assert.deepEqual(f.yokes, []); assert.notEqual(f.modes.at(-1), 'yoke');
  const live = fixture(); live.click(); live.surface.dispatchEvent(pointer('pointermove', 275, 125));
  live.surface.dispatchEvent(pointer('pointerdown', 500, 300)); live.surface.dispatchEvent(pointer('pointerup', 500, 300));
  live.surface.dispatchEvent(Object.assign(new Event('click'), { detail: 1, button: 0 }));
  live.controller.cancel(); live.disable();
  live.surface.dispatchEvent(Object.assign(new Event('dblclick'), { detail: 2, button: 0 }));
  assert.equal(live.modes.at(-1), 'off'); assert.deepEqual(live.yokes.at(-1), [0, 0]);
  f.controller.dispose(); live.controller.dispose();
});

test('vertical margin boost reaches raw poles within the scene, preserves ordinary rate and has no stationary or release drift', async () => {
  const f=fixture();f.click(400,300);
  f.surface.dispatchEvent(pointer('pointerdown',400,300));await sleep(280);
  f.surface.dispatchEvent(pointer('pointermove',400,250));assert.deepEqual(f.looks.at(-1),[0,.2]);
  f.surface.dispatchEvent(pointer('pointermove',400,150));const outer=f.looks.at(-1)![1];assert(outer>.6&&outer<70*Math.PI/180);
  f.surface.dispatchEvent(pointer('pointermove',400,0));assert.deepEqual(f.looks.at(-1),[0,70*Math.PI/180]);
  const counts=[f.looks.length,f.yokes.length];f.surface.dispatchEvent(pointer('pointermove',400,0));await sleep(30);assert.deepEqual([f.looks.length,f.yokes.length],counts);
  f.surface.dispatchEvent(pointer('pointerup',400,0));assert.deepEqual(f.looks.at(-1),[0,70*Math.PI/180]);
  // Repeated drag starts at the retained view and can reach the opposite pole.
  f.surface.dispatchEvent(pointer('pointerdown',400,300));await sleep(280);
  assert.deepEqual(f.looks.at(-1),[0,70*Math.PI/180]);
  f.surface.dispatchEvent(pointer('pointermove',400,350));assert(Math.abs(f.looks.at(-1)![1]-(70*Math.PI/180-.2))<1e-12);
  f.surface.dispatchEvent(pointer('pointermove',400,600));assert.deepEqual(f.looks.at(-1),[0,-70*Math.PI/180]);
  f.surface.dispatchEvent(pointer('pointerup',400,600));assert.deepEqual(f.controller.getCenter(),{clientX:400,clientY:300});f.controller.dispose();
});
