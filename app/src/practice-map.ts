/// <reference types="vite/client" />
import { LngLatBounds, Map as LibreMap, Marker, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './practice-map.css';
import { imageryCorners, makePracticeMapFrame, type PracticeMapFrame } from './practice-map-data';
import type { FlightState } from './types';

export interface PracticeMap {
  update(state: Readonly<FlightState>, path: readonly Readonly<FlightState>[], mode: 'live' | 'review'): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

interface MapOptions {
  container: HTMLElement;
  onClose: () => void;
  onInteraction: () => void;
}

/** A local imagery aid only: it contains no airport, airspace or procedure data. */
export async function createPracticeMap(options: MapOptions): Promise<PracticeMap> {
  const { container, onClose, onInteraction } = options;
  container.classList.add('practice-map-panel');
  container.setAttribute('aria-label', 'Practice map');
  const header = document.createElement('div');
  header.className = 'practice-map-heading';
  const title = document.createElement('strong');
  title.textContent = 'PRACTICE MAP';
  const modeLabel = document.createElement('span');
  modeLabel.className = 'practice-map-mode';
  modeLabel.textContent = 'Live';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close practice map');
  header.append(title, modeLabel, close);

  const viewport = document.createElement('div');
  viewport.className = 'practice-map-viewport';
  viewport.setAttribute('aria-label', 'North-up aerial imagery and recorded flight path');
  const status = document.createElement('p');
  status.className = 'practice-map-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading local imagery…';
  const toolbar = document.createElement('div');
  toolbar.className = 'practice-map-toolbar';
  const buttons = ['−', '+', 'Fit path', 'Follow'].map((label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = true;
    toolbar.append(button);
    return button;
  });
  const [zoomOut, zoomIn, fit, follow] = buttons;
  zoomOut.setAttribute('aria-label', 'Zoom map out');
  zoomIn.setAttribute('aria-label', 'Zoom map in');
  follow.setAttribute('aria-pressed', 'true');
  const readout = document.createElement('p');
  readout.className = 'practice-map-readout';
  readout.textContent = 'Waiting for aircraft position';
  const legend = document.createElement('p');
  legend.className = 'practice-map-legend';
  legend.textContent = 'Whole retained path · Following aircraft · North up';
  const credit = document.createElement('p');
  credit.className = 'practice-map-credit';
  credit.textContent = 'HVBG · DL-DE Zero 2.0 · Limited imagery coverage';
  const caption = document.createElement('p');
  caption.className = 'practice-map-caption';
  caption.textContent = 'Practice map · not a navigation chart';
  container.replaceChildren(header, viewport, status, toolbar, readout, legend, credit, caption);

  let map: LibreMap | undefined;
  let aircraft: Marker | undefined;
  let start: Marker | undefined;
  let frame: PracticeMapFrame | undefined;
  let visible = !container.hidden;
  let ready = false;
  let disposed = false;
  let following = true;
  let failed = false;
  const abort = new AbortController();
  const removers: Array<() => void> = [];
  const listen = (button: HTMLButtonElement, callback: () => void) => {
    const handler = () => { callback(); onInteraction(); };
    button.addEventListener('click', handler);
    removers.push(() => button.removeEventListener('click', handler));
  };
  listen(close, onClose);

  function setFollowing(value: boolean): void {
    following = value;
    follow.setAttribute('aria-pressed', String(value));
    legend.textContent = `Whole retained path · ${value ? 'Following aircraft' : 'Fit view · press Follow to recenter'} · North up`;
  }

  function paint(): void {
    if (!visible || !ready || !map || !frame || disposed) return;
    (map.getSource('recorded-path') as GeoJSONSource).setData({
      type: 'FeatureCollection', features: frame.path.length < 2 ? [] : [{
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: frame.path },
      }],
    });
    aircraft!.setLngLat(frame.position).setRotation(frame.heading_deg).addTo(map);
    if (frame.path.length) start!.setLngLat(frame.path[0]).addTo(map);
    else start!.remove();
    if (following) map.jumpTo({ center: frame.position });
  }

  listen(zoomOut, () => { if (map) map.jumpTo({ zoom: Math.max(map.getMinZoom(), map.getZoom() - 1) }); });
  listen(zoomIn, () => { if (map) map.jumpTo({ zoom: Math.min(map.getMaxZoom(), map.getZoom() + 1) }); });
  listen(fit, () => {
    if (!map || !frame) return;
    const coordinates = frame.path.length ? frame.path : [frame.position];
    const bounds = new LngLatBounds(coordinates[0], coordinates[0]);
    coordinates.forEach((coordinate) => bounds.extend(coordinate));
    bounds.extend(frame.position);
    setFollowing(false);
    map.fitBounds(bounds, { padding: 34, maxZoom: 15, duration: 0 });
  });
  listen(follow, () => { setFollowing(true); paint(); });
  const observer = new ResizeObserver(() => { if (visible && !disposed) map?.resize(); });
  observer.observe(viewport);

  const controller: PracticeMap = {
    update(state, path, mode) {
      if (disposed) return;
      try {
        frame = makePracticeMapFrame(state, path);
        modeLabel.textContent = mode === 'review' ? 'Recorded review' : 'Live';
        const [longitude_deg, latitude_deg] = frame.position;
        readout.textContent = `${Math.abs(latitude_deg).toFixed(4)}° ${latitude_deg < 0 ? 'S' : 'N'}  ${Math.abs(longitude_deg).toFixed(4)}° ${longitude_deg < 0 ? 'W' : 'E'}  ·  ${(Math.round(frame.heading_deg) % 360).toString().padStart(3, '0')}° true`;
        if (ready && !failed) status.hidden = true;
        paint();
      } catch {
        status.hidden = false;
        status.textContent = 'Map position unavailable: invalid flight state.';
      }
    },
    setVisible(value) {
      if (disposed) return;
      visible = value;
      container.hidden = !value;
      if (value) { map?.resize(); paint(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      observer.disconnect();
      removers.forEach((remove) => remove());
      aircraft?.remove();
      start?.remove();
      map?.remove();
      container.replaceChildren();
    },
  };

  try {
    const response = await fetch('/imagery/SOURCE.json', { signal: abort.signal });
    if (!response.ok) throw new Error('Imagery metadata unavailable');
    const source: unknown = await response.json();
    if (!source || typeof source !== 'object') throw new Error('Invalid imagery metadata');
    const metadata = source as { bounds_west_south_east_north?: unknown; overview?: { bounds_west_south_east_north?: unknown } };
    const detailBounds = metadata.bounds_west_south_east_north;
    const overviewBounds = metadata.overview?.bounds_west_south_east_north;
    if (!Array.isArray(detailBounds) || !Array.isArray(overviewBounds)) throw new Error('Imagery bounds unavailable');
    // Resource URLs are fixed; metadata source/request URLs never enter the renderer.
    const style: StyleSpecification = {
      version: 8,
      sources: {
        overview: { type: 'image', url: '/imagery/edfe-overview.jpg', coordinates: imageryCorners(overviewBounds) },
        detail: { type: 'image', url: '/imagery/edfe-starter.jpg', coordinates: imageryCorners(detailBounds) },
        'recorded-path': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#162530' } },
        { id: 'overview', type: 'raster', source: 'overview', paint: { 'raster-fade-duration': 0 } },
        { id: 'detail', type: 'raster', source: 'detail', paint: { 'raster-fade-duration': 0 } },
        { id: 'path-shadow', type: 'line', source: 'recorded-path', paint: { 'line-color': '#10212c', 'line-width': 5 } },
        { id: 'path', type: 'line', source: 'recorded-path', paint: { 'line-color': '#f3c676', 'line-width': 2.5 } },
      ],
    };
    if (disposed) return controller;
    // MapLibre's relative default worker URL is invalid after Vite prebundling.
    // Let Vite emit the worker and its dependencies for development and builds.
    setWorkerUrl(mapWorkerUrl);
    map = new LibreMap({
      container: viewport, style, center: [8.64, 49.9625], zoom: 13,
      minZoom: 7, maxZoom: 17, interactive: false, attributionControl: false,
      renderWorldCopies: false, maxPitch: 0, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    const arrow = document.createElement('div');
    arrow.className = 'practice-map-aircraft';
    arrow.textContent = '▲';
    arrow.setAttribute('aria-label', 'Aircraft position and true heading');
    aircraft = new Marker({ element: arrow, rotationAlignment: 'map' });
    const origin = document.createElement('div');
    origin.className = 'practice-map-start';
    origin.textContent = 'Trace start';
    start = new Marker({ element: origin, anchor: 'left', offset: [5, 0] });
    map.on('error', () => {
      if (disposed) return;
      failed = true;
      status.hidden = false;
      status.textContent = 'Map imagery unavailable. Flight controls remain available.';
    });
    map.on('load', () => {
      if (disposed) return;
      ready = true;
      status.hidden = !failed;
      buttons.forEach((button) => { button.disabled = false; });
      paint();
    });
  } catch {
    if (!disposed) {
      status.textContent = 'Practice map unavailable. Flight controls remain available.';
      status.hidden = false;
    }
  }
  return controller;
}
