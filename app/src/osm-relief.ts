import { Material } from 'cesium';

/**
 * Presentation-only directional shading of the rendered terrain triangles.
 * Heightmap providers do not supply vertex normals, so the fragment derives a
 * face direction from eye-space position. All terrain receives a small white
 * lift; faces turned towards the illustrative north-west light are lifted
 * further and faces turned away are darkened, preserving the map's hues.
 *
 * Cesium disables globe materials mentioning `slope` or `normalEC` when a
 * terrain provider does not expose normals. Do not add either word to the GLSL.
 */
export const OSM_RELIEF = Object.freeze({
  /** White mixed into every terrain fragment (0..1). */
  lift: 0.14,
  /** Darkening per unit of light-dot deficit against flat ground, and its cap. */
  shadeGain: 1.5, shadeMax: 0.5,
  /** Additional white per unit of light-dot excess against flat ground, and its cap. */
  highlightGain: 0.9, highlightMax: 0.22,
});

const glsl = (value: number): string => value.toFixed(4);

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
      float relief = 0.0;
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
          relief = dot(face, light) - dot(up, light);
        }
      }
      // Target color: (map * (1 - lift) + lift) * keep, expressed as Cesium's
      // alpha blend map * (1 - alpha) + diffuse * alpha.
      float lift = ${glsl(OSM_RELIEF.lift)} + clamp(relief * ${glsl(OSM_RELIEF.highlightGain)}, 0.0, ${glsl(OSM_RELIEF.highlightMax)});
      float keep = 1.0 - clamp(-relief * ${glsl(OSM_RELIEF.shadeGain)}, 0.0, ${glsl(OSM_RELIEF.shadeMax)});
#ifdef HDR
      // With HDR, Cesium blends globe colors in linear light. Convert the
      // perceptual (sRGB) parameters: exact for darkening, and exact for the
      // lift at a mid-dark reference map value (0.3 sRGB).
      float referenceLinear = pow(0.3, 2.2);
      lift = (pow(0.3 + 0.7 * lift, 2.2) - referenceLinear) / (1.0 - referenceLinear);
      keep = pow(keep, 2.2);
#endif
      float alpha = 1.0 - (1.0 - lift) * keep;
      result.diffuse = alpha > 1.0e-6 ? vec3(lift * keep / alpha) : vec3(0.0);
      result.alpha = alpha;
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
