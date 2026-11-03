import { ShadowMode, type Model, type Scene } from 'cesium';
import type { FlightState } from './types';

export const SHADOW_MAX_AGL_M = 120;
/** Native Cesium sun shadow on the current zero-height ellipsoid, not terrain. */
export function aircraftShadowPresentation(state: Readonly<FlightState> | null, view: 'cockpit' | 'chase') {
  const unavailable = { enabled: false, darkness: 1, ground_height_m: null as number | null, reason: 'ground-unavailable' };
  if (view !== 'chase') return { ...unavailable, reason: 'cockpit' };
  if (!state || !Number.isFinite(state.ground_agl_m) || !Number.isFinite(state.ground_height_ellipsoid_m)) return unavailable;
  const ground = state.ground_height_ellipsoid_m! - state.ground_agl_m!;
  // The renderer has no elevated terrain receiver. Hide mismatched data rather
  // than placing a cue at MSL zero or pretending to shadow an absent surface.
  if (!Number.isFinite(ground) || Math.abs(ground) > .25) return { ...unavailable, reason: 'receiver-unavailable' };
  const fraction = Math.max(0, state.ground_agl_m!) / SHADOW_MAX_AGL_M;
  if (fraction >= 1) return { ...unavailable, ground_height_m: ground, reason: 'too-high' };
  const fade = fraction * fraction * (3 - 2 * fraction);
  return { enabled: true, darkness: .45 + .55 * fade, ground_height_m: ground, reason: 'native' };
}

export function createAircraftShadow(scene: Scene, container: HTMLElement): {
  update(state: Readonly<FlightState>, view: 'cockpit' | 'chase', model: Model | null): void;
  dispose(): void;
} {
  const map = scene.shadowMap;
  map.enabled = false;
  map.softShadows = true;
  map.maximumDistance = 200;
  map.size = 2048;
  scene.globe.shadows = ShadowMode.RECEIVE_ONLY;
  let disposed = false;
  return {
    update(state, view, model) {
      if (disposed) return;
      const presentation = aircraftShadowPresentation(state, view);
      const enabled = presentation.enabled && !!model?.ready;
      map.enabled = enabled;
      map.darkness = presentation.darkness;
      if (model) model.shadows = enabled ? ShadowMode.CAST_ONLY : ShadowMode.DISABLED;
      container.dataset.aircraftShadow = presentation.enabled && !model?.ready ? 'loading-aircraft' : presentation.reason;
      container.dataset.shadowGroundHeightM = presentation.ground_height_m === null ? '' : String(presentation.ground_height_m);
      container.dataset.shadowEnabled = String(enabled);
    },
    dispose() {
      if (disposed) return;
      disposed = true; map.enabled = false;
      delete container.dataset.aircraftShadow; delete container.dataset.shadowGroundHeightM; delete container.dataset.shadowEnabled;
    },
  };
}
