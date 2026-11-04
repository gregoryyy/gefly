import {
  Cartesian2, Cartesian3, Color, Ellipsoid, EllipsoidalOccluder,
  HorizontalOrigin, LabelCollection, LabelStyle, PointPrimitiveCollection,
  SceneTransforms, VerticalOrigin, type Label, type PointPrimitive, type Scene,
} from 'cesium';
import { createLandmarkSource, LANDMARK_LEVEL_NAMES, type Landmark, type LandmarkLevel } from './landmark-data';
import type { FlightState } from './types';
import './landmark-labels.css';

export const LANDMARK_CREDIT = '© <a href="https://openfreemap.org/">OpenFreeMap</a> · © <a href="https://openmaptiles.org/">OpenMapTiles</a> · Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · ODbL · names rendered as terrain labels';
const CAPS = [0, 24, 60, 120] as const;
const RADIUS_M = 6378137;
interface Entry { label: Label; dot: PointPrimitive }
interface Placement { item: Landmark; ground: Cartesian3; above: Cartesian3; font: string; color: Color }
interface Box { left: number; right: number; top: number; bottom: number }
const overlap = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const validPosition = (state: Readonly<FlightState> | null): state is Readonly<FlightState> => !!state
  && [state.lat_rad, state.lon_rad, state.alt_msl_m].every(Number.isFinite)
  && Math.abs(state.lat_rad) <= Math.PI / 2 && Math.abs(state.lon_rad) <= Math.PI;

/** Camera-facing name labels anchored to source coordinates and rendered terrain.
 * Offsets are visual cues, not building/obstacle elevations. Normal Cesium depth
 * testing remains active: terrain can occlude both names and their ground dots.
 */
export function createLandmarkLabels(scene: Scene, container: HTMLElement,
  sampleHeight: (lat_rad: number, lon_rad: number) => number | null): {
    setLevel(level: LandmarkLevel): void;
    update(state: Readonly<FlightState> | null, publicTerrain?: boolean): void;
    dispose(): void;
  } {
  const labels = new LabelCollection({ scene });
  const dots = new PointPrimitiveCollection();
  scene.primitives.add(dots); scene.primitives.add(labels);
  const entries = new Map<string, Entry>();
  const status = document.createElement('div'); status.className = 'landmark-label-status'; status.hidden = true;
  status.setAttribute('role', 'status'); container.append(status);
  const occluder = new EllipsoidalOccluder(Ellipsoid.WGS84, scene.camera.positionWC);
  const offset = new Cartesian3(), normal = new Cartesian3();
  const placeColor = Color.fromCssColorString('#fff1bf'), otherColor = Color.fromCssColorString('#e2f2f6');
  let level: LandmarkLevel = 0, items: readonly Landmark[] = [], sourceStatus: 'off' | 'loading' | 'ready' | 'degraded' = 'off';
  let disposed = false, lastState: Readonly<FlightState> | null = null, terrainAvailable = true;
  const source = createLandmarkSource({ onUpdate(next, nextStatus) {
    if (disposed) return;
    items = next.slice(0, 1000).sort((a, b) => b.priority - a.priority);
    sourceStatus = nextStatus; scene.requestRender();
  } });
  function clear(): void {
    if (entries.size) { labels.removeAll(); dots.removeAll(); entries.clear(); }
    container.dataset.landmarkLabels = '0';
  }
  function report(count: number): void {
    container.dataset.landmarkLevel = String(level); container.dataset.landmarkStatus = sourceStatus;
    container.dataset.landmarkLabels = String(count);
    if (status.hidden !== (level === 0)) status.hidden = level === 0;
    const message = !terrainAvailable ? `${LANDMARK_LEVEL_NAMES[level]} · names unavailable without covered public terrain`
      : sourceStatus === 'degraded' ? `${LANDMARK_LEVEL_NAMES[level]} · some map names unavailable`
      : sourceStatus === 'ready' ? `Landmarks: ${LANDMARK_LEVEL_NAMES[level]}` : `${LANDMARK_LEVEL_NAMES[level]} · loading map names…`;
    if (status.textContent !== message) status.textContent = message;
  }
  function update(state: Readonly<FlightState> | null, publicTerrain = true): void {
    if (disposed) return;
    lastState = state; terrainAvailable = publicTerrain && validPosition(state);
    if (level === 0 || !terrainAvailable) {
      source.update(state?.lat_rad ?? 0, state?.lon_rad ?? 0, 0); clear(); report(0); return;
    }
    source.update(state!.lat_rad, state!.lon_rad, level);
    occluder.cameraPosition = scene.camera.positionWC;
    const width = container.clientWidth, height = container.clientHeight;
    const header = container.parentElement?.querySelector<HTMLElement>('.topbar');
    const top = Math.max(12, (header?.getBoundingClientRect().bottom ?? 0) - container.getBoundingClientRect().top + 6);
    const creditHeight = container.querySelector('.cesium-widget-credits')?.getBoundingClientRect().height ?? 0;
    const bottomInset = Math.max(60, creditHeight + 8);
    const boxes: Box[] = [], placements: Placement[] = [];
    const cosine = Math.cos(state!.lat_rad);
    const candidates = items.filter(item => item.minLevel <= level).map(item => {
      const distance2 = ((item.lon_rad - state!.lon_rad) * RADIUS_M * cosine) ** 2 + ((item.lat_rad - state!.lat_rad) * RADIUS_M) ** 2;
      return { item, distance2 };
    }).filter(({ item, distance2 }) => distance2 <= (item.category === 'place' ? 60000 : 20000) ** 2)
      .sort((a, b) => b.item.priority - a.item.priority || a.distance2 - b.distance2);
    for (const { item } of candidates) {
      if (placements.length >= CAPS[level]) break;
      const groundHeight = sampleHeight(item.lat_rad, item.lon_rad);
      if (groundHeight === null || !Number.isFinite(groundHeight)) continue;
      const ground = Cartesian3.fromRadians(item.lon_rad, item.lat_rad, groundHeight + 1);
      const above = Cartesian3.fromRadians(item.lon_rad, item.lat_rad, groundHeight + 8);
      Cartesian3.subtract(above, scene.camera.positionWC, offset);
      if (Cartesian3.dot(offset, scene.camera.directionWC) <= 0 || !occluder.isPointVisible(above)) continue;
      // The normal-facing test also rejects objects around the far hemisphere.
      Ellipsoid.WGS84.geodeticSurfaceNormal(ground, normal);
      Cartesian3.subtract(scene.camera.positionWC, ground, offset);
      if (Cartesian3.dot(normal, offset) < -1000) continue;
      const pixel = SceneTransforms.worldToWindowCoordinates(scene, above);
      if (!pixel || !Number.isFinite(pixel.x) || !Number.isFinite(pixel.y)) continue;
      const fontSize = item.category === 'place' ? 14 : item.category === 'road' ? 11 : 12;
      const halfWidth = Math.min(310, item.name.length * fontSize * .34 + 7);
      const box = { left: pixel.x - halfWidth, right: pixel.x + halfWidth, top: pixel.y - 15 - fontSize - 6, bottom: pixel.y - 11 };
      if (box.left < 8 || box.right > width - 8 || box.top < top || box.bottom > height - bottomInset || boxes.some(other => overlap(box, other))) continue;
      boxes.push(box); placements.push({ item, ground, above, font: `${fontSize}px system-ui`, color: item.category === 'place' ? placeColor : otherColor });
    }
    const selected = new Set(placements.map(placement => placement.item.id));
    for (const [id, entry] of entries) if (!selected.has(id)) {
      labels.remove(entry.label); dots.remove(entry.dot); entries.delete(id);
    }
    for (const placement of placements) {
      let entry = entries.get(placement.item.id);
      if (!entry) {
        entry = { label: labels.add({ id: placement.item.id, text: placement.item.name, position: placement.above,
          font: placement.font, fillColor: placement.color, outlineColor: Color.BLACK, outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE, showBackground: true, backgroundColor: new Color(.035, .075, .09, .72),
          backgroundPadding: new Cartesian2(5, 3), pixelOffset: new Cartesian2(0, -14),
          horizontalOrigin: HorizontalOrigin.CENTER, verticalOrigin: VerticalOrigin.BOTTOM, disableDepthTestDistance: 0 }),
          dot: dots.add({ id: placement.item.id, position: placement.ground, color: placement.color, pixelSize: 3,
            outlineColor: Color.BLACK, outlineWidth: 1, disableDepthTestDistance: 0 }) };
        entries.set(placement.item.id, entry);
      }
      entry.label.position = placement.above; entry.dot.position = placement.ground;
    }
    report(placements.length);
  }
  return {
    setLevel(next) {
      if (!Number.isInteger(next) || next < 0 || next > 3) throw new RangeError('Landmark label level must be 0–3');
      if (disposed) return;
      level = next; clear(); update(lastState, terrainAvailable);
    },
    update,
    dispose() {
      if (disposed) return; disposed = true; source.dispose();
      scene.primitives.remove(labels); scene.primitives.remove(dots); entries.clear(); status.remove();
      delete container.dataset.landmarkLevel; delete container.dataset.landmarkLabels; delete container.dataset.landmarkStatus;
    },
  };
}
