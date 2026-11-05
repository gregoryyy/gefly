import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl';

export const WORLD_MAP_MAX_LATITUDE = Math.atan(Math.sinh(Math.PI)) * 180 / Math.PI;
export const WORLD_MAP_BOUNDS = [-180, -WORLD_MAP_MAX_LATITUDE, 180, WORLD_MAP_MAX_LATITUDE] as const;
export const WORLD_MAP_CREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> schema (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>) · snapshot 2026-11-01 · global map fallback';

export type WorldMapColorScheme = 'original' | 'terrain';

// These are explicit cartographic paint choices over vector source data, rather
// than provider pixel colors or a color conversion. Keep all non-color style
// properties shared so switching schemes preserves geometry and label placement.
const palettes = {
  terrain: {
    ground: '#505d43', wood: '#293e2d', grass: '#526548',
    farmland: '#756b4a', ice: '#c5cdc8', wetland: '#405e50',
    rock: '#77766b', sand: '#8b805b', residential: '#6c6559',
    commercial: '#756858', industrial: '#595d56', cemetery: '#40553d',
    civic: '#706d60', sport: '#4e6645', military: '#65614a',
    quarry: '#817963', park: '#344e37', parkBoundary: '#718563',
    water: '#294951', countryBoundary: '#b1ad98', stateBoundary: '#92977e',
    transportArea: '#85816e', aerowayArea: '#74796c', building: '#756f62',
    buildingOutline: '#484e42', ferry: '#7b9b9f', railCasing: '#3b443c',
    rail: '#979b8a', path: '#92977b', roadCasing: '#343c34',
    serviceRoad: '#898574', minorRoad: '#9a927d', secondaryRoad: '#a79b7f',
    primaryRoad: '#b0a080', trunkRoad: '#b5a17b', motorway: '#bca67c',
    aerowayLine: '#92988a', placeText: '#f0ecdf', placeHalo: '#22332a',
    waterText: '#c2d5d5', waterHalo: '#223c42', streetText: '#ece7d8',
    streetHalo: '#30382e', roadRefText: '#efe6ca', roadRefHalo: '#393c2c',
    airportText: '#d4e0d6', airportHalo: '#293a31',
  },
  original: {
    ground: '#f2efe9', wood: '#add19e', grass: '#cdebb0',
    farmland: '#eef0d5', ice: '#f5f8fa', wetland: '#b4d9c1',
    rock: '#d5d2c9', sand: '#f5e9c6', residential: '#e0dfdf',
    commercial: '#eed5d2', industrial: '#ddd2dd', cemetery: '#aacbaf',
    civic: '#f0e5cb', sport: '#b9e0b3', military: '#e4dfc7',
    quarry: '#d9d0bd', park: '#b5dfaa', parkBoundary: '#6d9e66',
    water: '#aad3df', countryBoundary: '#9d80a2', stateBoundary: '#b39ab5',
    transportArea: '#eeeeea', aerowayArea: '#d1d5d8', building: '#d9d0c9',
    buildingOutline: '#b5aaa0', ferry: '#6d9fba', railCasing: '#e4e2dd',
    rail: '#777777', path: '#a88b67', roadCasing: '#c1bbae',
    serviceRoad: '#ffffff', minorRoad: '#ffffff', secondaryRoad: '#f7fabb',
    primaryRoad: '#fcd6a4', trunkRoad: '#f9b29c', motorway: '#e99caf',
    aerowayLine: '#b6bdc3', placeText: '#333333', placeHalo: '#fffdf8',
    waterText: '#367b9b', waterHalo: '#d5eaf1', streetText: '#4d4d4d',
    streetHalo: '#ffffff', roadRefText: '#60462c', roadRefHalo: '#fff9df',
    airportText: '#5b6470', airportHalo: '#f6f8fa',
  },
} as const;

/** Original cartography over the pinned OpenMapTiles source schema. Colors and
 * line widths are presentation choices; geometry/names come only from tiles.
 * No external style, glyph, font provider or sprite is required. */
const classes = (...values: string[]): ExpressionSpecification => ['in', ['get', 'class'], ['literal', values]];
const lineGeometry: ExpressionSpecification = ['==', ['geometry-type'], 'LineString'];
const polygonGeometry: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];
const width = (low: number, high: number): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], 4, low, 14, high, 18, high * 3];

export function worldMapLayers(scheme: WorldMapColorScheme = 'terrain'): LayerSpecification[] {
  const palette = palettes[scheme];
  const roads = [
    { id: 'service', classes: ['service'], minzoom: 12, color: palette.serviceRoad, low: .2, high: 1.6 },
    { id: 'minor', classes: ['minor'], minzoom: 10, color: palette.minorRoad, low: .3, high: 2.5 },
    { id: 'tertiary', classes: ['tertiary'], minzoom: 9, color: palette.minorRoad, low: .4, high: 3 },
    { id: 'secondary', classes: ['secondary'], minzoom: 7, color: palette.secondaryRoad, low: .5, high: 3.5 },
    { id: 'primary', classes: ['primary'], minzoom: 5, color: palette.primaryRoad, low: .65, high: 4 },
    { id: 'trunk', classes: ['trunk'], minzoom: 5, color: palette.trunkRoad, low: .8, high: 4.5 },
    { id: 'motorway', classes: ['motorway'], minzoom: 4, color: palette.motorway, low: .9, high: 5 },
  ];
  const roadLayers = (casing: boolean): LayerSpecification[] => roads.map(road => ({
    id: `world-roads-${road.id}${casing ? '-casing' : ''}`, type: 'line', source: 'world-map', 'source-layer': 'transportation', minzoom: road.minzoom,
    filter: ['all', lineGeometry, classes(...road.classes)],
    layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['to-number', ['get', 'layer'], 0] },
    paint: { 'line-color': casing ? palette.roadCasing : road.color,
      'line-width': width(road.low + (casing ? .5 : 0), road.high + (casing ? 1.5 : 0)),
      'line-opacity': ['case', ['==', ['get', 'brunnel'], 'tunnel'], .55, 1] },
  }));
  return [
    { id: 'world-background', type: 'background', paint: { 'background-color': palette.ground } },
    { id: 'world-landcover', type: 'fill', source: 'world-map', 'source-layer': 'landcover',
      paint: { 'fill-color': ['match', ['get', 'class'], 'wood', palette.wood, 'grass', palette.grass, 'farmland', palette.farmland,
        'ice', palette.ice, 'wetland', palette.wetland, 'rock', palette.rock, 'sand', palette.sand, palette.ground] } },
    { id: 'world-landuse', type: 'fill', source: 'world-map', 'source-layer': 'landuse',
      paint: { 'fill-color': ['match', ['get', 'class'], 'residential', palette.residential, ['commercial','retail'], palette.commercial,
        ['industrial','railway'], palette.industrial, 'cemetery', palette.cemetery, ['school','college','university','hospital'], palette.civic,
        ['stadium','pitch','playground','track'], palette.sport, 'military', palette.military, 'quarry', palette.quarry, palette.ground] } },
    { id: 'world-parks', type: 'fill', source: 'world-map', 'source-layer': 'park', minzoom: 5, filter: polygonGeometry,
      paint: { 'fill-color': palette.park, 'fill-opacity': .4 } },
    { id: 'world-park-boundaries', type: 'line', source: 'world-map', 'source-layer': 'park', minzoom: 8, filter: polygonGeometry,
      paint: { 'line-color': palette.parkBoundary, 'line-width': .7, 'line-opacity': .6, 'line-dasharray': [3,2] } },
    { id: 'world-water', type: 'fill', source: 'world-map', 'source-layer': 'water', paint: { 'fill-color': palette.water } },
    { id: 'world-waterway', type: 'line', source: 'world-map', 'source-layer': 'waterway', minzoom: 7,
      layout: { 'line-cap': 'round' }, paint: { 'line-color': palette.water, 'line-width': ['interpolate', ['linear'], ['zoom'],
        7, .5, 14, ['match', ['get', 'class'], 'river', 2.5, 'canal', 1.7, .8], 18, 5] } },
    { id: 'world-country-boundaries', type: 'line', source: 'world-map', 'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': palette.countryBoundary, 'line-width': ['interpolate', ['linear'], ['zoom'], 0, .6, 8, 1.5], 'line-dasharray': [4,3], 'line-opacity': .8 } },
    { id: 'world-state-boundaries', type: 'line', source: 'world-map', 'source-layer': 'boundary', minzoom: 3,
      filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': palette.stateBoundary, 'line-width': .7, 'line-dasharray': [2,3], 'line-opacity': .7 } },
    { id: 'world-transport-areas', type: 'fill', source: 'world-map', 'source-layer': 'transportation', minzoom: 12, filter: polygonGeometry,
      paint: { 'fill-color': palette.transportArea, 'fill-opacity': .8 } },
    { id: 'world-aeroway-areas', type: 'fill', source: 'world-map', 'source-layer': 'aeroway', minzoom: 10, filter: polygonGeometry,
      paint: { 'fill-color': palette.aerowayArea } },
    { id: 'world-buildings', type: 'fill', source: 'world-map', 'source-layer': 'building', minzoom: 13,
      paint: { 'fill-color': palette.building, 'fill-outline-color': palette.buildingOutline } },
    { id: 'world-ferries', type: 'line', source: 'world-map', 'source-layer': 'transportation', minzoom: 7, filter: ['all', lineGeometry, classes('ferry')],
      paint: { 'line-color': palette.ferry, 'line-width': 1, 'line-dasharray': [3,3] } },
    { id: 'world-rail-casing', type: 'line', source: 'world-map', 'source-layer': 'transportation', minzoom: 9, filter: ['all', lineGeometry, classes('rail','transit')],
      paint: { 'line-color': palette.railCasing, 'line-width': width(.5,2.5) } },
    { id: 'world-rail', type: 'line', source: 'world-map', 'source-layer': 'transportation', minzoom: 9, filter: ['all', lineGeometry, classes('rail','transit')],
      paint: { 'line-color': palette.rail, 'line-width': width(.3,1), 'line-dasharray': [2,2] } },
    { id: 'world-paths', type: 'line', source: 'world-map', 'source-layer': 'transportation', minzoom: 12, filter: ['all', lineGeometry, classes('path','track')],
      paint: { 'line-color': palette.path, 'line-width': width(.2,1), 'line-dasharray': [2,2] } },
    ...roadLayers(true), ...roadLayers(false),
    { id: 'world-roads-construction', type: 'line', source: 'world-map', 'source-layer': 'transportation', minzoom: 11,
      filter: ['all', lineGeometry, classes('motorway_construction','trunk_construction','primary_construction','secondary_construction','tertiary_construction','minor_construction','service_construction','path_construction','track_construction')],
      paint: { 'line-color': palette.minorRoad, 'line-width': 1.5, 'line-dasharray': [2,2] } },
    { id: 'world-aeroway-lines', type: 'line', source: 'world-map', 'source-layer': 'aeroway', minzoom: 10, filter: lineGeometry,
      paint: { 'line-color': palette.aerowayLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, .5, 14, ['match', ['get', 'class'], 'runway', 5, 1.5]] } },
  ];
}

/** Source-only labels shared by the 2D map and 3D vector cartography. MapLibre
 * rasterizes the local sans-serif font via TinySDF; no glyph URL/font provider.
 * Bounded strings, rank ordering and normal symbol collisions limit clutter. */
export function worldMapLabelLayers(scheme: WorldMapColorScheme = 'terrain'): LayerSpecification[] {
  const palette = palettes[scheme];
  const name: ExpressionSpecification = ['string', ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name'], ['get', 'name:latin'], ''], ''];
  const ref: ExpressionSpecification = ['string', ['coalesce', ['get', 'ref'], ''], ''];
  const validName: ExpressionSpecification = ['all', ['>=', ['length', name], 1], ['<=', ['length', name], 80]];
  const rank: ExpressionSpecification = ['to-number', ['get', 'rank'], 100];
  const place = (id: string, kinds: string[], minzoom: number, size: number, maxzoom?: number, priority?: 'major' | 'local'): LayerSpecification => ({
    id, type: 'symbol', source: 'world-map', 'source-layer': 'place', minzoom, ...(maxzoom === undefined ? {} : {maxzoom}),
    filter: ['all', classes(...kinds), validName, ...(priority ? [[priority === 'major' ? '<=' : '>', rank, 4] as ExpressionSpecification] : [])],
    layout: { 'text-field': name, 'text-font': ['sans-serif'], 'text-size': ['interpolate', ['linear'], ['zoom'], minzoom, size, 14, size+3],
      'text-max-width': 9, 'text-padding': 5, 'text-allow-overlap': false, 'symbol-sort-key': rank },
    paint: { 'text-color': palette.placeText, 'text-halo-color': palette.placeHalo, 'text-halo-width': 1.5 },
  });
  const lineName = (id: string, layer: string, minzoom: number, filter: ExpressionSpecification, water = false): LayerSpecification => ({
    id, type: 'symbol', source: 'world-map', 'source-layer': layer, minzoom, filter: ['all', lineGeometry, validName, filter],
    layout: { 'symbol-placement': 'line', 'symbol-spacing': 300, 'text-field': name, 'text-font': ['sans-serif'],
      'text-size': water ? 12 : 11, 'text-max-width': 10, 'text-padding': 3, 'text-max-angle': 35, 'text-allow-overlap': false },
    paint: { 'text-color': water ? palette.waterText : palette.streetText, 'text-halo-color': water ? palette.waterHalo : palette.streetHalo, 'text-halo-width': 1.3 },
  });
  return [
    place('world-place-continents', ['continent'], 0, 14, 3),
    place('world-place-countries', ['country'], 0, 12, 8, 'major'),
    place('world-place-small-countries', ['country'], 3, 12, 9, 'local'),
    place('world-place-states', ['state','province'], 3, 11, 10),
    place('world-place-cities', ['city'], 2, 13, undefined, 'major'),
    place('world-place-local-cities', ['city'], 5, 13, undefined, 'local'),
    place('world-place-towns', ['town'], 7, 12),
    place('world-place-villages', ['village'], 9, 11),
    place('world-place-local', ['suburb','borough','quarter'], 11, 11),
    place('world-place-neighbourhoods', ['neighbourhood','hamlet','isolated_dwelling'], 13, 10),
    { id: 'world-water-labels', type: 'symbol', source: 'world-map', 'source-layer': 'water_name', minzoom: 0,
      filter: ['all', ['==', ['geometry-type'], 'Point'], validName],
      layout: { 'text-field': name, 'text-font': ['sans-serif'], 'text-size': 12, 'text-max-width': 10, 'text-padding': 8, 'text-allow-overlap': false },
      paint: { 'text-color': palette.waterText, 'text-halo-color': palette.waterHalo, 'text-halo-width': 1.4 } },
    lineName('world-water-line-labels', 'water_name', 6, ['literal', true], true),
    lineName('world-waterway-labels', 'waterway', 12, ['literal', true], true),
    lineName('world-road-labels', 'transportation_name', 11, classes('primary','secondary','tertiary','trunk')),
    lineName('world-street-labels', 'transportation_name', 13, classes('minor','service','track','path')),
    { id: 'world-road-refs', type: 'symbol', source: 'world-map', 'source-layer': 'transportation_name', minzoom: 8,
      filter: ['all', lineGeometry, classes('motorway','trunk'), ['>=', ['length', ref], 1], ['<=', ['length', ref], 20]],
      layout: { 'symbol-placement': 'line', 'symbol-spacing': 400, 'text-field': ref, 'text-font': ['sans-serif'], 'text-size': 10, 'text-padding': 8, 'text-allow-overlap': false },
      paint: { 'text-color': palette.roadRefText, 'text-halo-color': palette.roadRefHalo, 'text-halo-width': 2 } },
    { id: 'world-airport-labels', type: 'symbol', source: 'world-map', 'source-layer': 'aerodrome_label', minzoom: 11, filter: validName,
      layout: { 'text-field': name, 'text-font': ['sans-serif'], 'text-size': 11, 'text-max-width': 9, 'text-padding': 7, 'text-allow-overlap': false },
      paint: { 'text-color': palette.airportText, 'text-halo-color': palette.airportHalo, 'text-halo-width': 1.4 } },
  ];
}

export function createWorldMapStyle(): StyleSpecification {
  return { version: 8, transition: { duration: 0, delay: 0 }, sources: {
    'world-map': { type: 'vector', tiles: ['/scenery/osm/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14, bounds: [...WORLD_MAP_BOUNDS], attribution: WORLD_MAP_CREDIT },
  }, layers: [...worldMapLayers(), ...worldMapLabelLayers()] };
}
