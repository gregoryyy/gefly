import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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

  const profile = [new THREE.Vector2(0.06, -3.6), new THREE.Vector2(0.2, -2.7),
    new THREE.Vector2(0.48, -1.2), new THREE.Vector2(0.62, 0.4),
    new THREE.Vector2(0.61, 1.4), new THREE.Vector2(0.48, 2.2),
    new THREE.Vector2(0.3, 2.85), new THREE.Vector2(0.08, 3.05)];
  const fuselage = new THREE.LatheGeometry(profile, 28);
  fuselage.rotateZ(-Math.PI / 2);
  fuselage.scale(1, 0.87, 1);
  mesh(fuselage, white);

  // Dark glazing and roof sit within the body envelope rather than an oversized box.
  const cabin = mesh(new THREE.SphereGeometry(1, 28, 16), glass, 0.45, 0.35, 0);
  cabin.scale.set(1.32, 0.62, 0.57);
  const roof = mesh(new THREE.SphereGeometry(1, 24, 12), white, 0.2, 0.63, 0);
  roof.scale.set(1.14, 0.21, 0.55);
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
  finShape.moveTo(-3.5, 0.17); finShape.lineTo(-3.35, 1.75); finShape.lineTo(-2.78, 1.62);
  finShape.lineTo(-2.18, 0.16); finShape.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finShape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 1 });
  mesh(finGeometry, red, 0, 0, -0.045);
  strut(new THREE.Vector3(2.05, -0.26, 0), new THREE.Vector3(2.05, -1.1, 0), 0.045, metal);
  const noseWheel = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 16), dark, 2.05, -1.15, 0);
  noseWheel.rotation.x = Math.PI / 2;
  const spinner = mesh(new THREE.SphereGeometry(0.28, 20, 12), red, 3.04, 0, 0);
  spinner.scale.set(1.45, 1, 1);
  const prop = mesh(new THREE.CircleGeometry(1.05, 40), new THREE.MeshBasicMaterial({ color: '#48525a', transparent: true, opacity: 0.12, side: THREE.DoubleSide }), 3.17, 0, 0);
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
