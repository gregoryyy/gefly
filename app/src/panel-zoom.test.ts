import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitPanel, panPanel, zoomPanel, type PanelFrame, type PanelZoom } from './panel-zoom.ts';

const frame: PanelFrame = { width: 1000, height: 300, baseWidth: 900, baseHeight: 300 };
const close = (actual: number, expected: number, message = '') => assert(Math.abs(actual - expected) <= 1e-9, `${message}: ${actual} versus ${expected}`);
const detailAt = (state: PanelZoom, pointer: { x: number; y: number }) => ({
  x: (pointer.x - state.x) / state.zoom, y: (pointer.y - state.y) / state.zoom,
});
function withinEdges(state: PanelZoom, area: PanelFrame = frame): void {
  assert(state.zoom >= 1 && state.zoom <= 3);
  for (const [offset, extent, base] of [[state.x, area.width, area.baseWidth], [state.y, area.height, area.baseHeight]]) {
    const end = offset + base * state.zoom;
    if (base * state.zoom >= extent) {
      assert(offset <= 1e-9, 'enlarged surface has no leading empty space');
      assert(end >= extent - 1e-9, 'enlarged surface has no trailing empty space');
    } else {
      assert(offset >= -1e-9 && end <= extent + 1e-9, 'smaller surface stays inside its frame');
    }
  }
}

test('R-PANEL-1 normal fit centers the surface and retains a fixed top edge', () => {
  assert.deepEqual(fitPanel(frame), { zoom: 1, x: 50, y: 0 });
  assert.deepEqual(fitPanel({ ...frame, width: 800 }), { zoom: 1, x: -50, y: 0 });
  assert.deepEqual(fitPanel({ ...frame, height: 400 }), { zoom: 1, x: 50, y: 0 });
});

test('R-PANEL-1 interior detail remains under the pointer in both dimensions', () => {
  const pointer = { x: 480, y: 155 }, original = fitPanel(frame);
  const enlarged = zoomPanel(original, frame, pointer, -150);
  const before = detailAt(original, pointer), after = detailAt(enlarged, pointer);
  close(before.x, after.x, 'horizontal anchor'); close(before.y, after.y, 'vertical anchor');
  withinEdges(enlarged);
  const reduced = zoomPanel(enlarged, frame, pointer, 75);
  const reducedDetail = detailAt(reduced, pointer);
  close(before.x, reducedDetail.x); close(before.y, reducedDetail.y); withinEdges(reduced);
});

test('R-PANEL-1 top and bottom clamps take precedence over anchoring on zoom-out', () => {
  const top = zoomPanel({ zoom: 2, x: -400, y: 0 }, frame, { x: 500, y: 300 }, 200);
  close(top.y, 0, 'top edge clamp'); withinEdges(top);
  const bottom = zoomPanel({ zoom: 2, x: -400, y: -300 }, frame, { x: 500, y: 0 }, 200);
  close(bottom.y + frame.baseHeight * bottom.zoom, frame.height, 'bottom edge clamp'); withinEdges(bottom);
  // Independent bound calculation: 2× reduced by exp(-.4), not the fit state.
  close(top.zoom, 2 * Math.exp(-.4));
});

test('R-PANEL-1 left and right edge limits prevent exposing space beside enlarged panels', () => {
  const left = zoomPanel({ zoom: 2, x: 0, y: -150 }, frame, { x: 1000, y: 150 }, 200);
  close(left.x, 0, 'left edge clamp'); withinEdges(left);
  const right = zoomPanel({ zoom: 2, x: -800, y: -150 }, frame, { x: 0, y: 150 }, 200);
  close(right.x + frame.baseWidth * right.zoom, frame.width, 'right edge clamp'); withinEdges(right);
});

test('R-PANEL-1 every mixed zoom step at upper/lower controls and padding preserves edge limits', () => {
  for (const pointer of [{ x: 5, y: 0 }, { x: 995, y: 300 }, { x: 500, y: 4 }, { x: 500, y: 296 },
    { x: -200, y: -100 }, { x: 1200, y: 450 }]) {
    let state = fitPanel(frame);
    for (const delta of [-200, -200, -200, 170, -90, 200, -180, 200, 200, 200, -200, 200]) {
      state = zoomPanel(state, frame, pointer, delta); withinEdges(state);
    }
  }
});

test('R-PANEL-1 repeated interior reversals retain the anchor without accumulated drift', () => {
  const pointer = { x: 500, y: 150 };
  const initial = zoomPanel(fitPanel(frame), frame, pointer, -100);
  let state = initial;
  for (let i = 0; i < 100; i++) {
    state = zoomPanel(state, frame, pointer, -30); withinEdges(state);
    state = zoomPanel(state, frame, pointer, 30); withinEdges(state);
  }
  close(state.zoom, initial.zoom); close(state.x, initial.x); close(state.y, initial.y);
});

test('R-PANEL-1 maximum zoom saturates and reaching 1× restores normal fit', () => {
  let state = fitPanel(frame);
  for (let i = 0; i < 20; i++) state = zoomPanel(state, frame, { x: 800, y: 280 }, -200);
  assert.equal(state.zoom, 3); withinEdges(state);
  assert.deepEqual(zoomPanel(state, frame, { x: 20, y: 20 }, -200), state, 'saturated zoom does not move the surface');
  for (let i = 0; i < 20; i++) state = zoomPanel(state, frame, { x: 0, y: 300 }, 200);
  assert.deepEqual(state, fitPanel(frame));
});

test('R-PANEL-1 large deltas are bounded and outside pointers clamp to the viewport', () => {
  const state = fitPanel(frame);
  assert.deepEqual(zoomPanel(state, frame, { x: -999, y: -999 }, -100000),
    zoomPanel(state, frame, { x: 0, y: 0 }, -200));
  assert.deepEqual(zoomPanel(state, frame, { x: 1999, y: 999 }, -100000),
    zoomPanel(state, frame, { x: 1000, y: 300 }, -200));
  const enlarged = zoomPanel(state, frame, { x: 500, y: 150 }, -200);
  assert.deepEqual(zoomPanel(enlarged, frame, { x: 500, y: 150 }, 100000),
    zoomPanel(enlarged, frame, { x: 500, y: 150 }, 200));
});

test('R-PANEL-1 smaller surfaces remain inside the viewport until they fill it', () => {
  const area = { width: 1500, height: 300, baseWidth: 600, baseHeight: 300 };
  let state = fitPanel(area);
  for (const delta of [-80, -120, -150, -200, 200, 200, 200]) {
    state = zoomPanel(state, area, { x: 10, y: 290 }, delta); withinEdges(state, area);
  }
  assert.deepEqual(state, fitPanel(area));
});

test('R-PANEL-1 invalid gestures are inert, invalid states recover, and invalid frames reject predictably', () => {
  const state = zoomPanel(fitPanel(frame), frame, { x: 500, y: 150 }, -100);
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(zoomPanel(state, frame, { x: value, y: 100 }, -50), state);
    assert.deepEqual(zoomPanel(state, frame, { x: 100, y: value }, -50), state);
    assert.deepEqual(zoomPanel(state, frame, { x: 100, y: 100 }, value), state);
    assert.deepEqual(zoomPanel({ zoom: value, x: 0, y: 0 }, frame, { x: 100, y: 100 }, 0), fitPanel(frame));
  }
  for (const zoom of [-1, 0, .5, 4])
    assert.deepEqual(zoomPanel({ zoom, x: 0, y: 0 }, frame, { x: 100, y: 100 }, 0), fitPanel(frame));
  assert.deepEqual(zoomPanel({ zoom: 2, x: 999, y: -999 }, frame, { x: 0, y: 0 }, 0), { zoom: 2, x: 0, y: -300 });
  for (const key of ['width', 'height', 'baseWidth', 'baseHeight']) for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => fitPanel({ ...frame, [key]: value }), RangeError);
    assert.throws(() => zoomPanel(state, { ...frame, [key]: value }, { x: 0, y: 0 }, -1), RangeError);
  }
  assert.throws(() => fitPanel({ ...frame, baseHeight: Number.MAX_VALUE }), RangeError);
});

test('R-PANEL-1 normal fit never pans while enlarged content moves by exact screen-pixel deltas', () => {
  assert.deepEqual(panPanel(fitPanel(frame), frame, { x: -100, y: -100 }), fitPanel(frame));
  const enlarged = { zoom: 2, x: -350, y: -150 };
  assert.deepEqual(panPanel(enlarged, frame, { x: 30, y: -40 }), { zoom: 2, x: -320, y: -190 });
  assert.deepEqual(enlarged, { zoom: 2, x: -350, y: -150 }, 'panning does not mutate the caller state');
  const narrow = { ...frame, baseWidth: 400 };
  const smaller = panPanel({ zoom: 2, x: 50, y: -150 }, narrow, { x: 100, y: 50 });
  assert.deepEqual(smaller, { zoom: 2, x: 150, y: -100 }); withinEdges(smaller, narrow);
});

test('R-PANEL-1 repeated large pans reach every content edge without exposing blank strips', () => {
  let state: PanelZoom = { zoom: 2, x: -350, y: -150 };
  for (let i = 0; i < 20; i++) {
    state = panPanel(state, frame, { x: 10000, y: 10000 });
    assert.deepEqual(state, { zoom: 2, x: 0, y: 0 }); withinEdges(state);
    state = panPanel(state, frame, { x: -10000, y: -10000 });
    assert.deepEqual(state, { zoom: 2, x: -800, y: -300 }); withinEdges(state);
  }
  const overflow = panPanel(state, frame, { x: -Number.MAX_VALUE, y: -Number.MAX_VALUE });
  assert.deepEqual(overflow, state); withinEdges(overflow);
});

test('R-PANEL-1 interior pan reversals do not drift and zoom-out still restores fit', () => {
  const initial: PanelZoom = { zoom: 2, x: -350, y: -150 }; let state = initial;
  for (let i = 0; i < 100; i++) {
    state = panPanel(state, frame, { x: 7.25, y: -11.5 }); withinEdges(state);
    state = panPanel(state, frame, { x: -7.25, y: 11.5 }); withinEdges(state);
  }
  assert.deepEqual(state, initial);
  for (let i = 0; i < 5; i++) state = zoomPanel(state, frame, { x: 10, y: 295 }, 200);
  assert.deepEqual(state, fitPanel(frame));
});

test('R-PANEL-1 invalid pan input is inert and shares zoom frame/state validation', () => {
  const state: PanelZoom = { zoom: 2, x: -350, y: -150 };
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(panPanel(state, frame, { x: value, y: 0 }), state);
    assert.deepEqual(panPanel(state, frame, { x: 0, y: value }), state);
    assert.deepEqual(panPanel({ ...state, zoom: value }, frame, { x: 10, y: 10 }), fitPanel(frame));
  }
  assert.deepEqual(panPanel({ zoom: 2, x: 500, y: -900 }, frame, { x: 0, y: 0 }), { zoom: 2, x: 0, y: -300 });
  assert.throws(() => panPanel(state, { ...frame, width: 0 }, { x: 0, y: 0 }), RangeError);
  assert.throws(() => panPanel(state, { ...frame, baseHeight: Infinity }, { x: 0, y: 0 }), RangeError);
});
