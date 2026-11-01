import * as THREE from 'three';
import type { FlightScene, FlightState } from './types';

// Procedural scenery, not surveyed airport data. The approximate study anchor is
// EDFE (49.96 N, 8.643 E); runway dimensions and all surrounding features are
// illustrative. World axes: x east, y up, z south. Flat ground is at study h=0.
const DEG = Math.PI / 180;
const LAT_RAD = 49.96 * DEG;
const LON_RAD = 8.643 * DEG;
const EARTH_M = 6378137;

export async function createScene(container: HTMLElement): Promise<FlightScene> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor('#accbd7');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute('aria-label', 'Procedural flight scenery');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#accbd7');
  scene.fog = new THREE.Fog('#accbd7', 6500, 31000);
  scene.add(new THREE.HemisphereLight('#f5f8f7', '#627052', 2.3));
  const sun = new THREE.DirectionalLight('#fff1cf', 3.1);
  sun.position.set(-4000, 6000, -3000);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(63, 1, 0.2, 65000);
  camera.rotation.order = 'YXZ';

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120000, 120000),
    new THREE.MeshLambertMaterial({ color: '#829267' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  scene.add(ground);

  // Seeded decoration makes a reset visually stable without random simulation inputs.
  let seed = 172;
  function random(): number {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const dummy = new THREE.Object3D();
  const fieldColors = ['#a4a876', '#769057', '#b6ae78', '#68854f', '#929b61', '#c0b48a'];
  for (const color of fieldColors) {
    const fields = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ color }), 110,
    );
    for (let i = 0; i < fields.count; i += 1) {
      dummy.position.set((random() - 0.5) * 36000, 0, (random() - 0.5) * 36000);
      dummy.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.35);
      dummy.scale.set(450 + random() * 1700, 400 + random() * 1200, 1);
      dummy.updateMatrix();
      fields.setMatrixAt(i, dummy.matrix);
    }
    scene.add(fields);
  }

  // An illustrative river gives the scene a recognizable visual landmark.
  const riverPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i += 1) {
    const z = -24000 + i * 1000;
    const x = -4700 + 1300 * Math.sin(i * 0.21);
    riverPoints.push(new THREE.Vector3(x - 95, 0.13, z), new THREE.Vector3(x + 95, 0.13, z));
  }
  const riverVertices: number[] = [];
  const riverIndices: number[] = [];
  riverPoints.forEach((p) => riverVertices.push(p.x, p.y, p.z));
  for (let i = 0; i < 48; i += 1) {
    const j = i * 2;
    riverIndices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
  }
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverVertices, 3));
  riverGeometry.setIndex(riverIndices);
  riverGeometry.computeVertexNormals();
  scene.add(new THREE.Mesh(riverGeometry,
    new THREE.MeshLambertMaterial({ color: '#6b9ba5', side: THREE.DoubleSide })));

  function box(parent: THREE.Object3D, color: string, w: number, h: number, d: number,
    x = 0, y = 0, z = 0): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  const airport = new THREE.Group();
  airport.rotation.y = -82 * DEG;
  scene.add(airport);
  box(airport, '#57676a', 29, 0.35, 1400, 0, 0.3, 0);
  box(airport, '#aab1a2', 34, 0.1, 1440, 0, 0.08, 0);
  box(airport, '#6c7977', 100, 0.2, 380, 86, 0.3, 220);
  for (let z = -620; z < 650; z += 70) box(airport, '#f3eee2', 1.1, 0.04, 32, 0, 0.51, z);
  for (const end of [-1, 1]) {
    for (const x of [-10, -6, -2, 2, 6, 10]) box(airport, '#f3eee2', 1.8, 0.04, 28, x, 0.51, end * 650);
  }
  for (let i = 0; i < 5; i += 1) {
    box(airport, '#c9c9bb', 32, 11, 24, 115, 5.8, 90 + i * 58);
    box(airport, '#8d9d99', 34, 1, 26, 115, 11.8, 90 + i * 58);
  }

  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(7, 22, 5),
    new THREE.MeshLambertMaterial({ color: '#416749' }), 1500);
  for (let i = 0; i < trees.count; i += 1) {
    const cluster = i % 7;
    const x = Math.sin(cluster * 8.9) * 9000 + (random() - 0.5) * 2800;
    const z = Math.cos(cluster * 4.1) * 9000 + (random() - 0.5) * 2800;
    const scale = 0.7 + random() * 0.9;
    dummy.position.set(x, 11 * scale, z);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }
  scene.add(trees);

  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#d2c6ad' }), 240);
  for (let i = 0; i < houses.count; i += 1) {
    const cluster = i % 4;
    dummy.position.set(1300 + cluster * 1700 + (random() - 0.5) * 1300, 5,
      -1800 + cluster * 1000 + (random() - 0.5) * 1200);
    dummy.rotation.set(0, cluster * 0.25, 0);
    dummy.scale.set(10 + random() * 16, 7 + random() * 9, 12 + random() * 16);
    dummy.updateMatrix();
    houses.setMatrixAt(i, dummy.matrix);
  }
  scene.add(houses);

  // Generic visual aircraft; these dimensions do not feed the flight dynamics.
  const aircraft = new THREE.Group();
  aircraft.rotation.order = 'YXZ';
  box(aircraft, '#f4f0df', 0.9, 1.05, 6.8);
  box(aircraft, '#c24c3e', 10.5, 0.16, 1.45, 0, 0.6, -0.4);
  box(aircraft, '#f4f0df', 7.9, 0.17, 1.46, 0, 0.61, -0.4);
  box(aircraft, '#c24c3e', 3.7, 0.12, 0.9, 0, 0.3, 2.6);
  box(aircraft, '#c24c3e', 0.12, 1.3, 1.1, 0, 0.9, 2.5);
  box(aircraft, '#385e70', 0.92, 0.48, 1.8, 0, 0.3, -0.75);
  box(aircraft, '#454b4d', 0.07, 2.2, 0.1, 0, 0, -3.6);
  scene.add(aircraft);

  const point = new THREE.Vector3();
  const cockpitOffset = new THREE.Vector3(0, 0.8, -0.5);
  const observer = new ResizeObserver(resize);
  let disposed = false;
  function resize(): void {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  observer.observe(container);
  resize();

  function update(state: FlightState, view: 'cockpit' | 'chase'): void {
    if (disposed) return;
    const { lat_rad, lon_rad, alt_msl_m, pitch_rad, roll_rad, heading_rad } = state;
    if (![lat_rad, lon_rad, alt_msl_m, pitch_rad, roll_rad, heading_rad].every(Number.isFinite)) {
      throw new RangeError('Cannot render a non-finite aircraft state');
    }
    aircraft.position.set((lon_rad - LON_RAD) * EARTH_M * Math.cos(LAT_RAD), alt_msl_m,
      -(lat_rad - LAT_RAD) * EARTH_M);
    aircraft.rotation.set(pitch_rad, -heading_rad, -roll_rad);
    aircraft.visible = view === 'chase';
    if (view === 'cockpit') {
      camera.position.copy(cockpitOffset).applyQuaternion(aircraft.quaternion).add(aircraft.position);
      camera.quaternion.copy(aircraft.quaternion);
    } else {
      camera.position.set(aircraft.position.x - 35 * Math.sin(heading_rad), alt_msl_m + 12,
        aircraft.position.z + 35 * Math.cos(heading_rad));
      camera.lookAt(point.copy(aircraft.position));
    }
    renderer.render(scene, camera);
  }

  update({ step: 0, t_s: 0, lat_rad: LAT_RAD, lon_rad: LON_RAD, alt_msl_m: 1300 * 0.3048,
    pitch_rad: 0, roll_rad: 0, heading_rad: 82 * DEG, tas_mps: 90 * 1852 / 3600 }, 'cockpit');

  return {
    update,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
