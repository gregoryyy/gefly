import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { VISUAL_AIRFRAME } from '../../studies/e1-browser/sim/collision.js';

/** Original generic high-wing visual, deliberately independent of dynamics data.
 * glTF axes: +x forward, +y up, +z right. Dimensions are illustrative only.
 */
export async function createAircraftVisual(): Promise<string> {
  const aircraft = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f0f0e9', roughness: 0.36, metalness: 0.1 });
  const red = new THREE.MeshStandardMaterial({ color: '#b82325', roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: '#18313d', roughness: 0.12, metalness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: '#222426', roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: '#979c9f', roughness: 0.35, metalness: 0.6 });

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    aircraft.add(object);
    return object;
  }
  function strut(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): void {
    const direction = b.clone().sub(a);
    const object = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  }
  function wing(span: number, chord: number, x: number, y: number, material: THREE.Material): void {
    const half = span / 2;
    // Tapered and beveled outline; the geometry is a visual design, not an airfoil.
    const outline = new THREE.Shape();
    outline.moveTo(-chord / 2, -half + 0.22);
    outline.lineTo(-chord / 2 + 0.18, -half);
    outline.lineTo(chord / 2 - 0.18, -half);
    outline.lineTo(chord / 2, -half + 0.22);
    outline.lineTo(chord / 2, half - 0.22);
    outline.lineTo(chord / 2 - 0.18, half);
    outline.lineTo(-chord / 2 + 0.18, half);
    outline.lineTo(-chord / 2, half - 0.22);
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, {
      depth: 0.09, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, steps: 1,
    });
    geometry.rotateX(Math.PI / 2);
    mesh(geometry, material, x, y, 0);
  }

  const profile = VISUAL_AIRFRAME.profile.map(([radius, x]) => new THREE.Vector2(radius, x));
  const fuselage = new THREE.LatheGeometry(profile, 28);
  fuselage.rotateZ(-Math.PI / 2);
  fuselage.scale(1, VISUAL_AIRFRAME.scaleY, 1);
  mesh(fuselage, white);

  // Dark glazing and roof sit within the body envelope rather than an oversized box.
  const c = VISUAL_AIRFRAME.cabin;
  const cabin = mesh(new THREE.SphereGeometry(1, 28, 16), glass, c.center[0], c.center[1], c.center[2]);
  cabin.scale.set(c.scale[0], c.scale[1], c.scale[2]);
  const r = VISUAL_AIRFRAME.roof;
  const roof = mesh(new THREE.SphereGeometry(1, 24, 12), white, r.center[0], r.center[1], r.center[2]);
  roof.scale.set(r.scale[0], r.scale[1], r.scale[2]);
  wing(10.7, 1.48, 0.25, 0.87, white);
  for (const side of [-1, 1]) {
    const tip = mesh(new THREE.BoxGeometry(1.3, 0.11, 0.72), red, 0.25, 0.83, side * 4.93);
    tip.rotation.x = side * 0.025;
    strut(new THREE.Vector3(-0.22, -0.43, side * 0.42), new THREE.Vector3(0.1, 0.81, side * 3.6), 0.045, white);
    const stripe = mesh(new THREE.BoxGeometry(4.9, 0.075, 0.025), red, -0.1, -0.05, side * 0.55);
    stripe.rotation.z = -0.035;
    strut(new THREE.Vector3(0, -0.35, side * 0.4), new THREE.Vector3(-0.1, -1.05, side * 1.15), 0.055, white);
    const wheel = mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.13, 16), dark, -0.1, -1.15, side * 1.15);
    wheel.rotation.x = Math.PI / 2;
    const hub = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), metal, -0.1, -1.15, side * 1.15);
    hub.rotation.x = Math.PI / 2;
  }
  wing(3.7, 0.86, -2.85, 0.18, white);
  for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.76, 0.1, 0.4), red, -2.85, 0.14, side * 1.6);
  const finShape = new THREE.Shape();
  const fin = VISUAL_AIRFRAME.fin;
  fin.outline.forEach(([x, y], index) => { if (index === 0) finShape.moveTo(x, y); else finShape.lineTo(x, y); });
  finShape.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finShape, { depth: fin.extrusionDepth, bevelEnabled: true,
    bevelSize: fin.bevel, bevelThickness: fin.bevelThickness, bevelSegments: 1 });
  mesh(finGeometry, red, 0, 0, -fin.extrusionDepth / 2);
  strut(new THREE.Vector3(2.05, -0.26, 0), new THREE.Vector3(2.05, -1.1, 0), 0.045, metal);
  const noseWheel = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 16), dark, 2.05, -1.15, 0);
  noseWheel.rotation.x = Math.PI / 2;
  const s = VISUAL_AIRFRAME.spinner;
  const spinner = mesh(new THREE.SphereGeometry(1, 20, 12), red, s.center[0], s.center[1], s.center[2]);
  spinner.scale.set(s.scale[0], s.scale[1], s.scale[2]);
  const prop = mesh(new THREE.CircleGeometry(VISUAL_AIRFRAME.prop.radius, 40), new THREE.MeshBasicMaterial({ color: '#48525a', transparent: true, opacity: 0.12, side: THREE.DoubleSide }), VISUAL_AIRFRAME.prop.x, 0, 0);
  prop.rotation.y = Math.PI / 2;

  try {
    const data = await new GLTFExporter().parseAsync(aircraft, { binary: true, onlyVisible: true });
    if (!(data instanceof ArrayBuffer)) throw new Error('Aircraft visual export did not produce GLB');
    return URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
  } finally {
    aircraft.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    for (const material of [white, red, glass, dark, metal]) material.dispose();
    (prop.material as THREE.Material).dispose();
  }
}
