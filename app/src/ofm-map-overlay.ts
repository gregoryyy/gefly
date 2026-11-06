import type { Map as LibreMap, MapSourceDataEvent, ErrorEvent as MapErrorEvent } from 'maplibre-gl';
import { createOfmOverlayPreferences } from './ofm-overlay-preferences.ts';

export const OFM_OVERLAY_ID = 'ofm-overlay';
export interface OfmOverlaySource {
  tiles: readonly string[];
  minzoom: number;
  maxzoom: number;
  tileSize: 256 | 512;
  edition: string;
  validFrom: string | null;
  validTo: string | null;
  attribution: string;
  sourceUrl: string;
  licenseUrl: string;
  reportUrl: string;
  coverage: string;
  bounds?: readonly [number, number, number, number];
}
interface OfmOverlayOptions {
  map: LibreMap;
  controls: HTMLElement;
  beforeLayerId?: string;
  visible?: boolean;
  onInteraction(): void;
  loadSource(signal: AbortSignal): Promise<OfmOverlaySource>;
  preferences?: ReturnType<typeof createOfmOverlayPreferences>;
}

/** Optional chart pixels only. Removing the source releases MapLibre's tile work. */
export function createOfmMapOverlay(options: OfmOverlayOptions): { setVisible(value: boolean): void; dispose(): void } {
  const { map, controls } = options;
  const document = controls.ownerDocument;
  const preferences = options.preferences ?? createOfmOverlayPreferences();
  let { enabled, opacity } = preferences.read();
  let visible = options.visible ?? false, disposed = false, generation = 0;
  let source: OfmOverlaySource | null = null;
  let pending: AbortController | null = null;
  let sourceFailed = false;
  let loaded = false;
  const beforeLayerId = options.beforeLayerId ?? 'navigation-fixes';
  const panel = document.createElement('fieldset'); panel.className = 'practice-map-ofm-overlay';
  const legend = document.createElement('legend'); legend.textContent = 'OpenFlightMaps'; panel.append(legend);
  const toggleLabel = document.createElement('label');
  const toggle = document.createElement('input'); toggle.id = 'ofm-overlay-toggle'; toggle.type = 'checkbox'; toggle.checked = enabled;
  toggleLabel.append(toggle, document.createTextNode(' Aviation overlay'));
  const opacityLabel = document.createElement('label'); opacityLabel.htmlFor = 'ofm-overlay-opacity'; opacityLabel.textContent = ' Opacity ';
  const slider = document.createElement('input'); slider.id = 'ofm-overlay-opacity'; slider.type = 'range';
  slider.min = '0'; slider.max = '100'; slider.step = '5'; slider.value = String(opacity * 100);
  const percent = document.createElement('output'); percent.setAttribute('for', slider.id); percent.textContent = `${Math.round(opacity * 100)}%`;
  opacityLabel.append(slider, percent);
  const status = document.createElement('p'); status.id = 'ofm-overlay-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const provenance = document.createElement('p'); provenance.id = 'ofm-overlay-provenance';
  const sourceLink = document.createElement('a'); sourceLink.textContent = 'Source'; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
  const licenseLink = document.createElement('a'); licenseLink.textContent = 'Terms'; licenseLink.target = '_blank'; licenseLink.rel = 'noopener noreferrer';
  const reportLink = document.createElement('a'); reportLink.textContent = 'Report a chart error'; reportLink.target = '_blank'; reportLink.rel = 'noopener noreferrer';
  const links = document.createElement('p'); links.hidden = true;
  links.append(sourceLink, document.createTextNode(' · '), licenseLink, document.createTextNode(' · '), reportLink);
  const retry = document.createElement('button'); retry.id = 'ofm-overlay-retry'; retry.type = 'button'; retry.textContent = 'Retry OFM'; retry.hidden = true;
  panel.append(toggleLabel, opacityLabel, status, provenance, links, retry); controls.append(panel);

  function available(): boolean { return enabled && visible && !disposed; }
  function hasStyle(): boolean { return !!map.getLayer(beforeLayerId); }
  function removeLayer(): void {
    if (map.getLayer(OFM_OVERLAY_ID)) map.removeLayer(OFM_OVERLAY_ID);
    if (map.getSource(OFM_OVERLAY_ID)) map.removeSource(OFM_OVERLAY_ID);
    loaded = false;
  }
  function invalidate(): void { generation++; pending?.abort(); pending = null; }
  function render(): void {
    toggle.checked = enabled; slider.disabled = !enabled;
    panel.dataset.status = !enabled ? 'off' : !visible ? 'hidden' : sourceFailed ? 'unavailable'
      : !source || pending ? 'loading' : map.getZoom() < source.minzoom ? 'zoom-in' : loaded ? 'ready' : 'loading';
    retry.hidden = !available() || !sourceFailed;
    if (!enabled) status.textContent = 'OFM overlay off.';
    else if (!visible) status.textContent = 'OFM overlay enabled; map closed.';
    else if (sourceFailed) status.textContent = 'OFM chart tiles unavailable for this view. The base map remains available.';
    else if (!source || pending) status.textContent = 'Loading OpenFlightMaps edition…';
    else if (map.getZoom() < source.minzoom) status.textContent = `Zoom in for OFM (zoom ${source.minzoom}+).`;
    else status.textContent = loaded ? 'OpenFlightMaps overlay shown where published.' : 'Loading OpenFlightMaps chart tiles…';
    if (source) {
      const expiry = source.validTo === null ? NaN : Date.parse(source.validTo);
      const before = source.validFrom === null ? NaN : Date.parse(source.validFrom);
      const validity = Number.isFinite(expiry) && Date.now() >= expiry ? 'EXPIRED'
        : Number.isFinite(before) && Date.now() < before ? 'NOT YET VALID'
        : Number.isFinite(before) && Number.isFinite(expiry) ? 'WITHIN PUBLISHED VALIDITY' : 'VALIDITY UNKNOWN';
      provenance.textContent = `${source.edition} · ${validity} · ${source.validFrom ?? 'validity start not supplied'} — ${source.validTo ?? 'validity end not supplied'} · Native zoom ${source.minzoom}–${source.maxzoom}; overzoom above ${source.maxzoom}. ${source.coverage}. ${source.attribution}. Displayed edition, not recorded chart state; not for real-flight navigation.`;
      sourceLink.href = source.sourceUrl; licenseLink.href = source.licenseUrl; reportLink.href = source.reportUrl; links.hidden = false;
    }
  }
  function attach(): void {
    if (!available() || !source || !hasStyle()) return;
    if (!map.getSource(OFM_OVERLAY_ID)) {
      const attribution = source.attribution.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
      map.addSource(OFM_OVERLAY_ID, { type: 'raster', tiles: [...source.tiles], tileSize: source.tileSize, attribution,
        minzoom: source.minzoom, maxzoom: source.maxzoom, ...(source.bounds ? { bounds: [...source.bounds] } : {}) });
    }
    if (!map.getLayer(OFM_OVERLAY_ID)) {
      map.addLayer({ id: OFM_OVERLAY_ID, type: 'raster', source: OFM_OVERLAY_ID, minzoom: source.minzoom,
        paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 } }, beforeLayerId);
    }
    render();
  }
  function refresh(): void {
    if (!available()) { invalidate(); removeLayer(); render(); return; }
    if (source) { attach(); render(); return; }
    if (pending || sourceFailed) { render(); return; }
    const current = ++generation, abort = new AbortController(); pending = abort; render();
    void options.loadSource(abort.signal).then(value => {
      if (disposed || current !== generation || abort.signal.aborted || !available()) return;
      source = value; pending = null; sourceFailed = false; attach(); render();
    }).catch(() => {
      if (disposed || current !== generation || abort.signal.aborted || !available()) return;
      pending = null; sourceFailed = true; render();
    });
  }
  function change(): void {
    enabled = toggle.checked; sourceFailed = false;
    preferences.write({ enabled, opacity }); refresh(); options.onInteraction();
  }
  function changeOpacity(): void {
    const next = Number(slider.value) / 100;
    if (!Number.isFinite(next) || next < 0 || next > 1) return;
    opacity = next; percent.textContent = `${Math.round(opacity * 100)}%`;
    if (map.getLayer(OFM_OVERLAY_ID)) map.setPaintProperty(OFM_OVERLAY_ID, 'raster-opacity', opacity);
    preferences.write({ enabled, opacity }); options.onInteraction();
  }
  function retrySource(): void {
    invalidate(); removeLayer(); source = null; sourceFailed = false; refresh(); options.onInteraction();
  }
  function styleLoaded(): void {
    if (disposed) return;
    loaded = false;
    const current = generation;
    // The host may install its foreground layers in a later style.load
    // listener. Wait until those synchronous handlers have finished so that
    // the chart can still be inserted below their anchor.
    queueMicrotask(() => { if (!disposed && current === generation) refresh(); });
  }
  function sourceLoaded(event: MapSourceDataEvent): void {
    if (!available() || sourceFailed || event.sourceId !== OFM_OVERLAY_ID) return;
    // Metadata being ready precedes actual raster requests and is not evidence
    // that any chart pixels have arrived for the view.
    if (!event.tile && event.sourceDataType !== 'idle') return;
    loaded = event.isSourceLoaded; render();
  }
  function sourceLoading(event: MapSourceDataEvent): void {
    if (available() && event.sourceId === OFM_OVERLAY_ID) { loaded = false; render(); }
  }
  function sourceError(event: MapErrorEvent): void {
    if (available() && (event as MapErrorEvent & { sourceId?: string }).sourceId === OFM_OVERLAY_ID) { sourceFailed = true; render(); }
  }
  function zoomChanged(): void { if (!disposed) render(); }
  toggle.addEventListener('change', change); slider.addEventListener('input', changeOpacity); retry.addEventListener('click', retrySource);
  map.on('style.load', styleLoaded); map.on('sourcedata', sourceLoaded); map.on('sourcedataloading', sourceLoading);
  map.on('error', sourceError); map.on('zoomend', zoomChanged);
  refresh();
  return {
    setVisible(value) { if (disposed) return; visible = value; refresh(); },
    dispose() {
      if (disposed) return;
      disposed = true; invalidate(); removeLayer();
      toggle.removeEventListener('change', change); slider.removeEventListener('input', changeOpacity); retry.removeEventListener('click', retrySource);
      map.off('style.load', styleLoaded); map.off('sourcedata', sourceLoaded); map.off('sourcedataloading', sourceLoading);
      map.off('error', sourceError); map.off('zoomend', zoomChanged); panel.remove();
    },
  };
}
