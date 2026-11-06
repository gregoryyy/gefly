import { Cartesian3, Cartographic, Color, LabelCollection, LabelStyle, Material, PolylineCollection, type Scene } from 'cesium';
import { approachPoints, approachThreshold, guideDestination, validApproachGuide, type ApproachGuide } from './approach-guide.ts';

/** Display-only terrain-anchored instructional line; never feeds the worker or avionics. */
export function createApproachGuideRenderer(scene: Scene, container: HTMLElement,
  sampleHeight: (lat_rad: number, lon_rad: number) => number | null | undefined) {
  const lines = scene.primitives.add(new PolylineCollection());
  const labels = scene.primitives.add(new LabelCollection());
  const status = document.createElement('div');
  status.className = 'approach-guide-status';
  status.setAttribute('role', 'status');
  status.style.cssText = 'position:absolute;top:140px;left:12px;z-index:2;max-width:min(360px, calc(100% - 24px));padding:5px 8px;background:#10272cdd;color:#e5eadd;border-radius:4px;font:11px/1.4 system-ui;overflow-wrap:anywhere;pointer-events:none';
  status.hidden = true; container.append(status);
  let guide: ApproachGuide | null = null, height: number | null = null, nextCheck = 0, disposed = false;
  const color = Color.fromCssColorString('#70e5ee');
  function clear(): void { lines.removeAll(); labels.removeAll(); height = null; }
  function setStatus(state: 'off' | 'waiting' | 'ready'): void {
    container.dataset.approachGuide = state; status.hidden = state === 'off';
    if (!guide || state === 'off') { status.textContent = ''; return; }
    const threshold = guide.displaced_threshold_ft === null ? 'runway end used; threshold position unknown; terrain-height approximation' : 'terrain-height approximation';
    status.textContent = `3° visual guide · ${guide.airportName} ${guide.runwayIdent} · ${state === 'waiting' ? 'waiting for terrain · ' : ''}${threshold} · not a published or obstacle-cleared approach · ${guide.source}`;
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
