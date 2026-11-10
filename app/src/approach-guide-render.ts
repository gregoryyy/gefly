import { Cartesian3, Cartographic, Color, LabelCollection, LabelStyle, Material, PolylineCollection, type Scene } from 'cesium';
import { approachGuideDisclosure, approachGuideLimitations, approachPoints, approachThreshold, guideDestination, validApproachGuide, type ApproachGuide } from './approach-guide.ts';

/** Display-only terrain-anchored instructional line; never feeds the worker or avionics. */
export function createApproachGuideRenderer(scene: Scene, container: HTMLElement,
  sampleHeight: (lat_rad: number, lon_rad: number) => number | null | undefined) {
  const lines = scene.primitives.add(new PolylineCollection());
  const labels = scene.primitives.add(new LabelCollection());
  const status = document.createElement('div');
  status.className = 'approach-guide-status';
  status.setAttribute('role', 'status');
  // One compact line over the flying view. The full disclosure is the tooltip,
  // visually hidden text for assistive technology, and the airport popup.
  status.style.cssText = 'position:absolute;top:140px;left:12px;z-index:2;max-width:min(380px, calc(100% - 24px));padding:2px 7px;background:#10272cb3;color:#e5eadd;border-radius:10px;font:10px/1.5 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;user-select:none';
  const summary = document.createElement('span'), detail = document.createElement('span');
  detail.className = 'approach-guide-detail';
  detail.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
  status.append(summary, detail);
  status.hidden = true; container.append(status);
  let guide: ApproachGuide | null = null, height: number | null = null, nextCheck = 0, disposed = false;
  const color = Color.fromCssColorString('#70e5ee');
  function clear(): void { lines.removeAll(); labels.removeAll(); height = null; }
  function setStatus(state: 'off' | 'waiting' | 'ready'): void {
    container.dataset.approachGuide = state; status.hidden = state === 'off';
    if (!guide || state === 'off') { summary.textContent = detail.textContent = status.title = ''; return; }
    // The state comes before the optional note, so narrow views clip the note, not the state.
    summary.textContent = `3° guide · ${guide.airportId} ${guide.runwayIdent} · ${state === 'waiting' ? 'waiting for terrain' : 'illustrative'}${guide.displaced_threshold_ft === null ? ' · threshold ≈ runway end' : ''}`;
    status.title = approachGuideDisclosure(guide); detail.textContent = ` · ${approachGuideLimitations(guide)}`;
  }
  function build(anchor_m: number): void {
    clear(); height = anchor_m;
    const points = approachPoints(guide!);
    const at = (lat: number, lon: number, h: number) => Cartesian3.fromDegrees(lon, lat, h);
    const positions = points.map(p => at(p.lat_deg, p.lon_deg, anchor_m + p.height_above_threshold_m));
    const material = Material.fromType('Color', { color });
    lines.add({ positions, width: 3, material });
    // Short crossbars every half nautical mile make the line visible against terrain.
    for (let i = 5; i < points.length; i += 5) {
      const p = points[i], left = guideDestination(p, guide!.heading_deg_true - 90, 45), right = guideDestination(p, guide!.heading_deg_true + 90, 45);
      lines.add({ positions: [at(left.lat_deg,left.lon_deg,anchor_m+p.height_above_threshold_m), at(right.lat_deg,right.lon_deg,anchor_m+p.height_above_threshold_m)], width: 2, material: Material.fromType('Color', { color }) });
    }
    labels.add({ position: positions[positions.length - 1], text: `3° VISUAL · ${guide!.runwayIdent}`, fillColor: color,
      outlineColor: Color.BLACK, outlineWidth: 3, style: LabelStyle.FILL_AND_OUTLINE, font: '14px sans-serif', showBackground: true,
      backgroundColor: Color.fromCssColorString('#10272cdd') });
    setStatus('ready'); scene.requestRender();
  }
  return {
    set(value: ApproachGuide | null): void {
      if (disposed) return;
      guide = validApproachGuide(value) ? { ...value } : null; clear(); nextCheck = 0;
      container.dataset.approachGuideRunway = guide?.runwayIdent ?? '';
      setStatus(guide ? 'waiting' : 'off'); scene.requestRender();
    },
    update(terrain: boolean): void {
      if (disposed || !guide) return;
      if (!terrain) { if (height !== null) clear(); setStatus('waiting'); return; }
      const now = performance.now(); if (now < nextCheck) return; nextCheck = now + 1000;
      const threshold = approachThreshold(guide), radians = Math.PI / 180;
      const sample = sampleHeight(threshold.lat_deg * radians, threshold.lon_deg * radians)
        ?? scene.globe.getHeight(Cartographic.fromDegrees(threshold.lon_deg, threshold.lat_deg));
      if (typeof sample !== 'number' || !Number.isFinite(sample)) { if (height !== null) clear(); setStatus('waiting'); return; }
      if (height === null || Math.abs(sample - height) > 2) build(sample);
    },
    dispose(): void { if (disposed) return; disposed = true; scene.primitives.remove(lines); scene.primitives.remove(labels); status.remove(); delete container.dataset.approachGuide; delete container.dataset.approachGuideRunway; },
  };
}
