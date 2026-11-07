import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOsmReliefMaterial, supportsOsmRelief } from './osm-relief.ts';

type Precision = { precision: number; rangeMin: number; rangeMax: number } | null;
function fakeCanvas(version: 1 | 2, highp: Precision, derivatives = true): HTMLCanvasElement {
  const gl = {
    FRAGMENT_SHADER: 0x8b30, HIGH_FLOAT: 0x8df2,
    getExtension: (name: string) => name === 'OES_standard_derivatives' && derivatives ? {} : null,
    getShaderPrecisionFormat: (shader: number, kind: number) => {
      assert.equal(shader, 0x8b30); assert.equal(kind, 0x8df2); return highp;
    },
  };
  return { getContext: (name: string) => name === (version === 2 ? 'webgl2' : 'webgl') ? gl : null } as unknown as HTMLCanvasElement;
}

test('relief requires adequate fragment highp on both WebGL versions', () => {
  for (const version of [1, 2] as const) {
    assert(supportsOsmRelief(fakeCanvas(version, { precision: 23, rangeMin: 127, rangeMax: 127 })));
    assert(supportsOsmRelief(fakeCanvas(version, { precision: 16, rangeMin: 62, rangeMax: 62 })));
    for (const unsupported of [null, { precision: 0, rangeMin: 127, rangeMax: 127 },
      { precision: 15, rangeMin: 127, rangeMax: 127 }, { precision: 23, rangeMin: 61, rangeMax: 127 },
      { precision: 23, rangeMin: 127, rangeMax: 61 }]) {
      assert.equal(supportsOsmRelief(fakeCanvas(version, unsupported)), false);
    }
  }
  assert.equal(supportsOsmRelief(fakeCanvas(1, { precision: 23, rangeMin: 127, rangeMax: 127 }, false)), false);
  // WebGL2 has derivatives without the WebGL1 extension.
  assert(supportsOsmRelief(fakeCanvas(2, { precision: 23, rangeMin: 127, rangeMax: 127 }, false)));
  assert.equal(supportsOsmRelief({ getContext() { throw new Error('context unavailable'); } } as unknown as HTMLCanvasElement), false);
});

test('Cesium accepts the derivative material on heightmap providers without vertex normals', () => {
  const material = createOsmReliefMaterial();
  try {
    // Globe's material gate disables shaders containing either token when the
    // terrain provider does not supply vertex normals.
    assert.doesNotMatch(material.shaderSource, /slope|normalEC/);
    assert.match(material.shaderSource, /dFdx\(/);
    assert.match(material.shaderSource, /dFdy\(/);
  } finally { material.destroy(); }
});
