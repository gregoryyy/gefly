import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOfmMapOverlay, OFM_OVERLAY_ID, type OfmOverlaySource } from './ofm-map-overlay.ts';
import type { Map as LibreMap } from 'maplibre-gl';

class Element extends EventTarget {
  children: Element[] = [];
  parent: Element | null = null;
  ownerDocument = { createElement: () => new Element(), createTextNode: () => new Element() };
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  id = ''; className = ''; textContent = ''; type = ''; value = ''; min = ''; max = ''; step = ''; href = ''; htmlFor = ''; target = ''; rel = '';
  checked = false; disabled = false; hidden = false;
  append(...children: Element[]) { for (const child of children) { child.parent = this; this.children.push(child); } }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  find(id: string): Element { return this.id === id ? this : this.children.map(child => { try { return child.find(id); } catch { return null; } }).find(Boolean) ?? (() => { throw new Error(`Missing ${id}`); })(); }
}
class FakeMap {
  layers: Record<string, unknown>[] = [{ id: 'basemap' }, { id: 'navigation-fixes' }, { id: 'flight-plan-route' }];
  sources = new Map<string, unknown>();
  handlers = new Map<string, Set<(event: Record<string, unknown>) => void>>();
  zoom = 10;
  getLayer(id: string) { return this.layers.find(layer => layer.id === id); }
  getSource(id: string) { return this.sources.get(id); }
  addSource(id: string, source: unknown) { this.sources.set(id, source); }
  addLayer(layer: Record<string, unknown>, before: string) { this.layers.splice(this.layers.findIndex(candidate => candidate.id === before), 0, layer); }
  removeLayer(id: string) { this.layers = this.layers.filter(layer => layer.id !== id); }
  removeSource(id: string) { this.sources.delete(id); }
  setPaintProperty(id: string, property: string, value: number) { (this.getLayer(id)!.paint as Record<string, number>)[property] = value; }
  getZoom() { return this.zoom; }
  on(type: string, handler: (event: Record<string, unknown>) => void) { if (!this.handlers.has(type)) this.handlers.set(type, new Set()); this.handlers.get(type)!.add(handler); }
  off(type: string, handler: (event: Record<string, unknown>) => void) { this.handlers.get(type)?.delete(handler); }
  fire(type: string, event: Record<string, unknown> = {}) { this.handlers.get(type)?.forEach(handler => handler(event)); }
}
const source: OfmOverlaySource = {
  tiles: ['/charts/ofm/2611/{z}/{x}/{y}.png'], minzoom: 7, maxzoom: 13, tileSize: 256,
  edition: 'AIRAC 2611', validFrom: '2026-10-29T00:00:00Z', validTo: '2026-11-26T00:00:00Z',
  attribution: 'Contains information from the open flightmaps database', sourceUrl: 'https://openflightmaps.org/downloads/ed/',
  licenseUrl: 'https://openflightmaps.org/about/', reportUrl: 'mailto:info@openflightmaps.org', coverage: 'OFM published regions; Germany edition verified',
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function fixture(loader: (signal: AbortSignal) => Promise<OfmOverlaySource> = async () => source) {
  const controls = new Element(), map = new FakeMap(), writes: unknown[] = [];
  let calls = 0, interactions = 0;
  const controller = createOfmMapOverlay({ map: map as unknown as LibreMap, controls: controls as unknown as HTMLElement,
    onInteraction() { interactions++; }, loadSource(signal) { calls++; return loader(signal); },
    preferences: { read: () => ({ enabled: false, opacity: .8 }), write(value) { writes.push(value); } } });
  const toggle = controls.find('ofm-overlay-toggle');
  return { map, controls, controller, writes, toggle, calls: () => calls, interactions: () => interactions,
    enable() { toggle.checked = true; toggle.dispatchEvent(new Event('change')); } };
}

test('R-CHART-1 hidden/off chart has no demand; enabling preserves foreground routes and native source zoom', async () => {
  const f = fixture(); assert.equal(f.calls(), 0);
  f.enable(); assert.equal(f.calls(), 0); assert.equal(f.map.sources.size, 0);
  f.controller.setVisible(true); await flush();
  assert.equal(f.calls(), 1); assert.deepEqual(f.map.layers.map(layer => layer.id), ['basemap', OFM_OVERLAY_ID, 'navigation-fixes', 'flight-plan-route']);
  const added = f.map.getSource(OFM_OVERLAY_ID) as Record<string, unknown>;
  assert.equal(added.maxzoom, 13); assert.equal(f.map.getLayer(OFM_OVERLAY_ID)!.maxzoom, undefined, 'raster overzooms past its native source level');
  assert.equal((f.map.getLayer(OFM_OVERLAY_ID)!.paint as Record<string, number>)['raster-opacity'], .8);
  f.controller.setVisible(false); assert.equal(f.map.sources.size, 0);
  f.controller.setVisible(true); await flush(); assert.equal(f.calls(), 1, 'accepted descriptor stays pinned for this map session');
  f.toggle.checked = false; f.toggle.dispatchEvent(new Event('change'));
  assert.equal(f.map.sources.size, 0); assert.equal(f.interactions(), 2); f.controller.dispose();
});

test('R-CHART-1 stale metadata cannot recreate a hidden or disposed chart and style reload restores foreground ordering', async () => {
  let resolve!: (value: OfmOverlaySource) => void, signal!: AbortSignal;
  const f = fixture(current => { signal = current; return new Promise(done => { resolve = done; }); });
  f.controller.setVisible(true); f.enable(); f.controller.setVisible(false); assert(signal.aborted);
  resolve(source); await flush(); assert.equal(f.map.sources.size, 0);
  f.controller.setVisible(true); resolve(source); await flush();
  f.map.layers = [{ id: 'basemap' }, { id: 'navigation-fixes' }]; f.map.sources.clear(); f.map.fire('style.load'); await flush();
  assert.deepEqual(f.map.layers.map(layer => layer.id), ['basemap', OFM_OVERLAY_ID, 'navigation-fixes']);
  f.controller.dispose(); assert.equal(f.map.sources.size, 0); assert.equal(f.controls.children.length, 0);
  assert([...f.map.handlers.values()].every(handlers => handlers.size === 0));
});

test('R-CHART-1 style replacement can install its foreground anchor after the chart listener', async () => {
  const f = fixture(); f.controller.setVisible(true); f.enable(); await flush();
  f.map.layers = [{ id: 'basemap' }]; f.map.sources.clear();
  f.map.on('style.load', () => { f.map.layers.push({ id: 'navigation-fixes' }, { id: 'flight-plan-route' }); });
  f.map.fire('style.load'); await flush();
  assert.deepEqual(f.map.layers.map(layer => layer.id), ['basemap', OFM_OVERLAY_ID, 'navigation-fixes', 'flight-plan-route']);
  assert(f.map.getSource(OFM_OVERLAY_ID));
  f.controller.dispose();
});

test('R-CHART-1 optional errors remain separate, low zoom is explicit, opacity persists and retry refreshes metadata', async () => {
  const f = fixture(); f.map.zoom = 5; f.controller.setVisible(true); f.enable(); await flush();
  const status = f.controls.find('ofm-overlay-status'); assert.match(status.textContent, /Zoom in.*7/);
  f.map.zoom = 17; f.map.fire('zoomend');
  f.map.fire('sourcedata', { sourceId: OFM_OVERLAY_ID, sourceDataType: 'metadata', isSourceLoaded: true });
  assert.doesNotMatch(status.textContent, /shown where published/, 'metadata alone cannot claim chart pixels');
  f.map.fire('sourcedata', { sourceId: OFM_OVERLAY_ID, tile: { state: 'loaded' }, isSourceLoaded: true });
  assert.match(status.textContent, /shown where published/);
  const opacity = f.controls.find('ofm-overlay-opacity'); opacity.value = '35'; opacity.dispatchEvent(new Event('input'));
  assert.deepEqual(f.writes.at(-1), { enabled: true, opacity: .35 });
  assert.equal((f.map.getLayer(OFM_OVERLAY_ID)!.paint as Record<string, number>)['raster-opacity'], .35);
  f.map.fire('error', { sourceId: 'basemap' }); assert.match(status.textContent, /shown/);
  f.map.fire('error', { sourceId: OFM_OVERLAY_ID }); assert.match(status.textContent, /unavailable/);
  f.map.fire('sourcedata', { sourceId: OFM_OVERLAY_ID, tile: { state: 'loaded' }, isSourceLoaded: true }); assert.match(status.textContent, /unavailable/, 'failed tiles cannot masquerade as loaded');
  f.controls.find('ofm-overlay-retry').dispatchEvent(new Event('click')); await flush(); assert.equal(f.calls(), 2);
  assert(f.map.getLayer('navigation-fixes')); f.controller.dispose();
});
