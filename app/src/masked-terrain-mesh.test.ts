import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cartesian3, Ellipsoid, Rectangle } from 'cesium';
import { createMaskedTerrainMesh } from './masked-terrain-mesh.ts';

const rectangle = Rectangle.fromDegrees(8, 50, 8 + .25 / 16, 50 + .25 / 16);
const point = (u: number, v: number) => [rectangle.west + u * rectangle.width,
  rectangle.south + v * rectangle.height] as const;

test('actual Cesium interpolation preserves SW–NE triangles and leaves missing triangles empty', () => {
  const mesh = createMaskedTerrainMesh(rectangle, new Float64Array([NaN, 10, 0, 0]), 2, 5);
  assert.equal(mesh.childTileMask, 5);
  assert(Math.abs(mesh.interpolateHeight(rectangle, ...point(.75, .25))! - 2.5) < .001);
  assert.equal(mesh.interpolateHeight(rectangle, ...point(.25, .75)), undefined);
  assert.equal(createMaskedTerrainMesh(rectangle, new Float64Array([0, NaN, 0, 0]), 2, 0)
    .interpolateHeight(rectangle, ...point(.75, .25)), undefined, 'missing diagonal endpoint removes both triangles');
  const empty = createMaskedTerrainMesh(rectangle, new Float64Array(4).fill(NaN), 2, 0);
  assert.equal(empty.interpolateHeight(rectangle, ...point(.5, .5)), undefined, 'all missing is empty, not sea level');
  assert.deepEqual(Array.from((empty as unknown as { _indices: Uint16Array })._indices), [0,0,0],
    'a zero-area sentinel satisfies GPU buffer allocation without creating a terrain triangle');
});

test('finest-grid affine terrain stays within its quantization error and bounds include negative heights', () => {
  const width = 129, heights = new Float64Array(width * width);
  for (let row = 0; row < width; row++) for (let col = 0; col < width; col++)
    heights[row * width + col] = -100 + 250 * col / (width - 1) + 500 * (1 - row / (width - 1));
  heights[0] = NaN;
  const mesh = createMaskedTerrainMesh(rectangle, heights, width, 15);
  for (const [u, v] of [[.03, .02], [.34567, .45678], [.999, .003], [.5, .5]]) {
    const actual = mesh.interpolateHeight(rectangle, ...point(u, v));
    assert(actual !== undefined && Math.abs(actual - (-100 + 250 * u + 500 * v)) < .05,
      '≤5 cm numerical budget includes UV and height quantization; this is not DEM accuracy');
  }
  // Inspect Cesium metadata solely to independently check conservative Cartesian bounds.
  const sphere = (mesh as unknown as { _boundingSphere: { center: Cartesian3; radius: number } })._boundingSphere;
  for (const [u, v] of [[0, 0], [1, 0], [1, 1], [.5, .5]]) {
    const [lon, lat] = point(u, v), position = Cartesian3.fromRadians(lon, lat, -100 + 250*u + 500*v, Ellipsoid.WGS84);
    assert(Cartesian3.distance(position, sphere.center) <= sphere.radius + .05);
  }
});

test('invalid shape, nonfinite physical heights and invalid rectangle/mask fail explicitly', () => {
  assert.throws(() => createMaskedTerrainMesh(rectangle, new Float64Array(4), 1, 0));
  assert.throws(() => createMaskedTerrainMesh(rectangle, new Float64Array(8), 3, 0));
  assert.throws(() => createMaskedTerrainMesh(rectangle, new Float64Array([0, Infinity, 0, 0]), 2, 0));
  assert.throws(() => createMaskedTerrainMesh(rectangle, new Float64Array(4), 2, 16));
  assert.throws(() => createMaskedTerrainMesh(new Rectangle(.2, .5, .1, .6), new Float64Array(4), 2, 0));
});
