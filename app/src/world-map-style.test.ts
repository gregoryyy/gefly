import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorldMapStyle, WORLD_MAP_BOUNDS, WORLD_MAP_CREDIT } from './world-map-style.ts';

test('world fallback style has global Mercator coverage with no external style, glyph or sprite dependencies', () => {
  const style = createWorldMapStyle();
  assert.equal(style.version, 8); assert.equal(style.glyphs, undefined); assert.equal(style.sprite, undefined);
  assert.deepEqual(WORLD_MAP_BOUNDS.slice(0, 3), [-180, -85.05112877980659, 180]);
  const source = style.sources['world-map'];
  assert.equal(source.type, 'vector');
  if (source.type !== 'vector') throw new Error('Expected vector source');
  assert.deepEqual(source.tiles, ['/scenery/osm/{z}/{x}/{y}.pbf']); assert.equal(source.maxzoom, 14);
  assert.match(WORLD_MAP_CREDIT, /OpenStreetMap contributors/); assert.match(WORLD_MAP_CREDIT, /2026-11-01/);
  assert.match(WORLD_MAP_CREDIT, /href="https:\/\/openmaptiles.org"/); assert.match(WORLD_MAP_CREDIT, /creativecommons.org\/licenses\/by\/4.0/);
  assert(style.layers.some(layer => 'source-layer' in layer && layer['source-layer'] === 'water'));
  assert(style.layers.every(layer => ['background', 'fill', 'line', 'symbol'].includes(layer.type)));
});

test('each fallback style is detached so MapLibre request rewriting cannot corrupt future maps', () => {
  const first = createWorldMapStyle(), second = createWorldMapStyle();
  first.layers.splice(0); delete first.sources['world-map'];
  assert(second.layers.length > 0); assert(second.sources['world-map']);
});
