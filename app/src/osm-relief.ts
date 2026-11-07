import { Material } from 'cesium';

/**
 * Presentation-only directional shading of the rendered terrain triangles.
 * Heightmap providers do not supply vertex normals, so the fragment derives a
 * face direction from eye-space position. Flat terrain stays unchanged and
 * shaded faces are only darkened, preserving the map's original hues.
 *
 * Cesium disables globe materials mentioning `slope` or `normalEC` when a
 * terrain provider does not expose normals. Do not add either word to the GLSL.
 */
export function createOsmReliefMaterial(): Material {
  return new Material({ fabric: { type: 'GeflyOsmRelief', source: `
    czm_material czm_getMaterial(czm_materialInput i) {
      czm_material result = czm_getDefaultMaterial(i);
      vec3 p = -i.positionToEyeEC;
      vec3 face = czm_inverseViewRotation * cross(dFdx(p), dFdy(p));
      vec3 world = (czm_inverseView * vec4(p, 1.0)).xyz;
      vec3 ellipsoid = world * czm_ellipsoidInverseRadii * czm_ellipsoidInverseRadii;
      float faceLength = length(face);
      float upLength = length(ellipsoid);
      float shade = 0.0;
      if (faceLength > 1.0e-12 && upLength > 1.0e-12) {
        vec3 up = ellipsoid / upLength;
        face /= faceLength;
        if (dot(face, up) < 0.0) face = -face;
        vec3 east = cross(vec3(0.0, 0.0, 1.0), up);
        float eastLength = length(east);
        if (eastLength > 1.0e-6) {
          east /= eastLength;
          vec3 north = normalize(cross(up, east));
          vec3 light = normalize(-0.5 * east + 0.5 * north + 0.70710678 * up);
          float flatLight = dot(up, light);
          shade = clamp((flatLight - dot(face, light)) * 0.42, 0.0, 0.25);
        }
      }
      result.diffuse = vec3(0.0);
      result.alpha = shade;
      return result;
    }
  ` } });
}

/** Read the existing context; do not create an extra rendering context. */
export function supportsOsmRelief(canvas: HTMLCanvasElement): boolean {
  try {
    const webgl2 = canvas.getContext('webgl2');
    const gl = webgl2 ?? canvas.getContext('webgl');
    if (!gl || (!webgl2 && !gl.getExtension('OES_standard_derivatives'))) return false;
    // The fragment reconstructs ECEF positions (~6.4e6 m) and squares inverse
    // ellipsoid radii (~2.5e-14). A mediump-only shader can overflow/underflow
    // before it reaches the guard in the shader, so reject insufficient highp.
    const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    // Require the GLSL ES highp minimum exponent range as well as precision;
    // the derivative cross product has intermediate values beyond ECEF alone.
    return !!highp && highp.precision >= 16 && highp.rangeMax >= 62 && highp.rangeMin >= 62;
  } catch {
    return false;
  }
}
