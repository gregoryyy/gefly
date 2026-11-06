import assert from 'node:assert/strict';
import test from 'node:test';
import { Cartesian3, GeographicTilingScheme, PerspectiveFrustum, Rectangle } from 'cesium';
import { createTerrainDetailBudget, TERRAIN_RENDER_ENVELOPE_M } from './terrain-detail-budget.ts';
const RAD = Math.PI / 180, scheme = new GeographicTilingScheme();
function windowAt(lat: number, lon: number) {
  const c = Math.floor((lon + 180) * 32), r = Math.floor((lat + 90) * 32), grids = [];
  for (let y = Math.max(16, r - 1); y <= Math.min(5743, r + 1); y++) for (let dx = -1; dx <= 1; dx++) {
    const x = (c + dx + 11520) % 11520;
    grids.push({ west_rad: (-180 + x / 32) * RAD, east_rad: (-180 + (x + 1) / 32) * RAD,
      south_rad: (-90 + y / 32) * RAD, north_rad: (-90 + (y + 1) / 32) * RAD });
  }
  return grids;
}
function view(lat: number, lon: number, altitude = 2, fov = 60, pixels = 900) {
  return { cameraPosition: Cartesian3.fromDegrees(lon, lat, altitude), contactPosition: Cartesian3.fromDegrees(lon, lat, 0),
    frustumFovy_rad: fov * RAD, cssHeight: pixels, drawingBufferHeight: pixels * 2, geometricError13_m: 3.4, baseSSE: 3,
    fogScreenSpaceErrorFactor: 2 };
}
test('Task162 Cape/Hessen cached perimeter budgets are finite and preserve near-contact L14 at both FOV limits', () => {
  for (const [lat, lon] of [[-33.9715, 18.6021], [50.232, 8.457]]) {
    const grids = windowAt(lat, lon), before = structuredClone(grids), budget = createTerrainDetailBudget(scheme, grids);
    assert(budget.parentCount > 0 && budget.parentCount <= 128);
    for (const fov of [20, 60, 100]) {
      const result = budget.evaluate(view(lat, lon, 2, fov));
      assert(result.bounded, result.reason); assert(Number.isFinite(result.maximumScreenSpaceError));
      assert(result.maximumScreenSpaceError >= 3); assert(result.maximumScreenSpaceError > result.unsupportedSSEUpper!);
      assert.equal(result.contactRefines, true, result.reason);
    }
    for (const fov of [20, 100]) for (const aspectRatio of [.5, 16 / 9]) {
      const frustum = new PerspectiveFrustum({ fov: fov * RAD, aspectRatio, near: 1 });
      const result = budget.evaluate({ ...view(lat, lon), frustumFovy_rad: frustum.fovy });
      assert(result.bounded, result.reason); assert(result.contactRefines, result.reason);
    }
    assert.deepEqual(grids, before);
  }
});
test('Task162 high-latitude, dateline and polar-guard windows remain bounded; unsupported flying contact is explicit', () => {
  for (const [lat, lon] of [[80.01, 12], [89.49, 12], [-89.49, 12], [10.1, 179.999], [10.1, -179.999]]) {
    const helper = createTerrainDetailBudget(scheme, windowAt(lat, lon));
    const near = helper.evaluate(view(lat, lon, .5, 20));
    assert(near.bounded, `${lat}/${lon}: ${near.reason}`); assert(near.contactRefines, `${lat}/${lon}: ${near.reason}`);
  }
  const flying = createTerrainDetailBudget(scheme, windowAt(89.49, 12)).evaluate(view(89.49, 12, 1200));
  assert(flying.bounded, flying.reason); assert.equal(flying.contactRefines, false); assert.match(flying.reason!, /does not guarantee/);
});
test('Task162 budget reads bounds once, never arrays, and rejects unsupported camera/window cases without Infinity', () => {
  const grids = windowAt(-33.9715, 18.6021);
  for (const grid of grids) Object.defineProperty(grid, 'physical_m', { get() { throw Error('height array must not be read'); } });
  const helper = createTerrainDetailBudget(scheme, grids);
  const normal = helper.evaluate(view(-33.9715, 18.6021, 1200)); assert(normal.bounded, normal.reason);
  for (const grid of grids) Object.defineProperty(grid, 'east_rad', { get() { throw Error('bounds must not be rescanned per frame'); } });
  assert.deepEqual(helper.evaluate(view(-33.9715, 18.6021, 1200)), normal);
  for (const altered of [{ ...view(-33.9715, 18.6021), frustumFovy_rad: 0 }, { ...view(-33.9715, 18.6021), cssHeight: NaN },
    view(-33.9715, 19), view(-33.9715, 18.6021, 51001)]) {
    const result = helper.evaluate(altered); assert(!result.bounded); assert.equal(result.maximumScreenSpaceError, 3);
  }
  const fresh = windowAt(-33.9715, 18.6021);
  for (const bad of [[], fresh.slice(1), [...fresh.slice(0, 8), fresh[0]],
    fresh.map((grid, i) => i === 4 ? { ...grid, west_rad: grid.west_rad + 1e-5, east_rad: grid.east_rad + 1e-5 } : grid)])
    assert(!createTerrainDetailBudget(scheme, bad).evaluate(view(-33.9715, 18.6021)).bounded);
  const atBoundary = helper.evaluate(view(-33.9715, fresh[0].west_rad / RAD + 1e-8, 2));
  assert.equal(atBoundary.bounded, false, 'a camera inside an unsupported parent OBB cannot claim a finite draining budget');
  const regionalScheme = new GeographicTilingScheme({ rectangle: Rectangle.fromDegrees(0, 0, 10, 10) });
  assert.equal(createTerrainDetailBudget(regionalScheme, fresh).evaluate(view(-33.9715, 18.6021)).bounded, false);
  assert.equal(TERRAIN_RENDER_ENVELOPE_M, 51000);
});
test('Task162 projection scales conservatively with draw height and narrower FOV, with no model/physics inputs', () => {
  const helper = createTerrainDetailBudget(scheme, windowAt(-33.9715, 18.6021));
  const base = helper.evaluate(view(-33.9715, 18.6021, 2, 100));
  const narrow = helper.evaluate(view(-33.9715, 18.6021, 2, 20));
  const dense = helper.evaluate({ ...view(-33.9715, 18.6021), drawingBufferHeight: 3600 });
  assert(narrow.unsupportedSSEUpper! > base.unsupportedSSEUpper!); assert(dense.unsupportedSSEUpper! > base.unsupportedSSEUpper!);
});
test('Task162 contact lower bound includes worst public fog SSE loss and refuses an unspecified fog contract', () => {
  const helper = createTerrainDetailBudget(scheme, windowAt(-33.9715, 18.6021));
  const input = { ...view(-33.9715, 18.6021, 1700, 20), drawingBufferHeight: 900 };
  const clear = helper.evaluate({ ...input, fogScreenSpaceErrorFactor: 0 });
  const fog = helper.evaluate({ ...input, fogScreenSpaceErrorFactor: 2 });
  assert(clear.bounded && fog.bounded);
  assert.equal(clear.maximumScreenSpaceError, fog.maximumScreenSpaceError, 'fog can only reduce unknown-parent SSE, so the upper budget stays conservative');
  assert(Math.abs(clear.contactSSELower! - fog.contactSSELower! - 2) < 1e-12);
  assert(clear.contactRefines, clear.reason); assert.equal(fog.contactRefines, false, 'fog may invalidate contact refinement near the airborne threshold');
  for (const factor of [undefined, NaN, -1]) {
    const result = helper.evaluate({ ...view(-33.9715, 18.6021), fogScreenSpaceErrorFactor: factor });
    assert(result.bounded); assert.equal(result.contactRefines, false); assert.match(result.reason!, /fog SSE factor/);
  }
  const ground = helper.evaluate(view(-33.9715, 18.6021, .25, 20));
  assert(ground.contactRefines, ground.reason);
});
