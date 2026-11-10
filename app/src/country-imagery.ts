import { COUNTRY_PHOTO_OUTLINES } from './country-imagery-outlines.ts';

/** Fixed official photo sources. Bounds are service envelopes, not coverage claims. */
export const COUNTRY_IMAGERY = Object.freeze([
  Object.freeze({ id: 'ch' as const, name: 'Switzerland', bounds: [5.14, 45.39, 11.48, 48.24] as const,
    attribution: '©<a href="https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices">swisstopo</a> · Includes material © (2016-2018) Planet. All rights reserved',
  }),
  Object.freeze({ id: 'at' as const, name: 'Austria', bounds: [8.78, 46.35, 17.5, 49.04] as const,
    attribution: 'Datenquelle: <a href="https://basemap.at/">basemap.at</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · masked near borders',
  }),
  Object.freeze({ id: 'nrw' as const, name: 'North Rhine-Westphalia', bounds: [5.5, 50.0, 9.85, 52.9] as const,
    attribution: 'Digitale Orthophotos: <a href="https://www.bezreg-koeln.nrw.de/geobasis-nrw">Geobasis NRW</a> · <a href="https://www.govdata.de/dl-de/zero-2-0">Datenlizenz Deutschland Zero 2.0</a>',
  }),
  Object.freeze({ id: 'bb' as const, name: 'Berlin / Brandenburg', bounds: [11.1, 51.2, 15.1, 53.7] as const,
    attribution: '© <a href="https://registry.gdi-de.org/id/de.bb.metadata/253b7d3d-6b42-47dc-b127-682de078b7ae">GeoBasis-DE/LGB</a>, <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>; © <a href="https://www.berlin.de/geoportal/">Geoportal Berlin</a>, <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>',
  }),
  Object.freeze({ id: 'es' as const, name: 'Spain PNOA 2024 (partial coverage)', bounds: [-18.3, 27.5, 4.4, 43.9] as const,
    attribution: 'Obra derivada de <a href="https://pnoa.ign.es/pnoa-imagen/visualizadores-y-servicios-web">PNOA 2024</a> <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a> <a href="https://www.scne.es/">scne.es</a>',
  }),
]);

export type PhotoCountry = typeof COUNTRY_IMAGERY[number]['id'];
export const COUNTRY_PHOTO_MIN_LEVEL = 0;
export const COUNTRY_PHOTO_MAX_LEVEL = 20;
export const COUNTRY_PHOTO_DETAIL_MIN_LEVEL = 7;
export const countryPhotoUrl = (country: PhotoCountry): string => `/scenery/photo-country/${country}/{z}/{x}/{y}.png`;

/** A position within this distance of a coarse outline names the source (outline generalization is about 1 km). */
export const COUNTRY_PHOTO_POSITION_TOLERANCE_KM = 2;
/**
 * Tiles and views within this distance of a coarse outline may carry provider pixels. Sampled
 * provider overhang beyond the outlines was at most about 5 km (2026-11-09, see
 * utils/scenery/photo-outlines-source.md); the margin is conservative because rendered
 * photography must remain credited.
 */
export const COUNTRY_PHOTO_TILE_MARGIN_KM = 10;
const KM_PER_DEGREE = 111.32;

type Ring = Readonly<{ points: readonly number[]; west: number; south: number; east: number; north: number }>;
const RINGS = {} as Record<PhotoCountry, readonly Ring[]>;
const ENVELOPES = {} as Record<PhotoCountry, readonly [number, number, number, number]>;
for (const { id, bounds } of COUNTRY_IMAGERY) {
  ENVELOPES[id] = bounds;
  RINGS[id] = COUNTRY_PHOTO_OUTLINES[id].map(points => {
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      west = Math.min(west, points[i]); east = Math.max(east, points[i]);
      south = Math.min(south, points[i + 1]); north = Math.max(north, points[i + 1]);
    }
    return Object.freeze({ points, west, south, east, north });
  });
}

function insideRing(ring: Ring, lon: number, lat: number): boolean {
  const p = ring.points; let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const yi = p[i + 1], yj = p[j + 1];
    if ((yi > lat) !== (yj > lat) && lon < (p[j] - p[i]) * (lat - yi) / (yj - yi) + p[i]) inside = !inside;
  }
  return inside;
}

/** Local equirectangular distance; adequate for kilometre-scale tolerances away from the poles. */
function ringDistance_km(ring: Ring, lon: number, lat: number): number {
  const p = ring.points, kx = Math.cos(lat * Math.PI / 180) * KM_PER_DEGREE; let best = Infinity;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const ax = (p[j] - lon) * kx, ay = (p[j + 1] - lat) * KM_PER_DEGREE;
    const dx = (p[i] - p[j]) * kx, dy = (p[i + 1] - p[j + 1]) * KM_PER_DEGREE;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

function segmentCrossesRectangle(x0: number, y0: number, x1: number, y1: number, w: number, s: number, e: number, n: number): boolean {
  // Liang-Barsky clipping against [w, e] x [s, n].
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - w], [dx, e - x0], [-dy, y0 - s], [dy, n - y0]] as const) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

function ringIntersectsRectangle(ring: Ring, w: number, s: number, e: number, n: number): boolean {
  if (ring.east < w || ring.west > e || ring.north < s || ring.south > n) return false;
  if (insideRing(ring, w, s)) return true; // rectangle inside the ring
  const p = ring.points;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    if (segmentCrossesRectangle(p[j], p[j + 1], p[i], p[i + 1], w, s, e, n)) return true;
  }
  return false;
}

/**
 * Sources whose coarse outline contains, or lies within the position tolerance of, the position.
 * This names plausible sources only; the server's alpha still defines usable coverage.
 */
export function countryPhotoCandidates(lat_deg: number, lon_deg: number): readonly PhotoCountry[] {
  if (!Number.isFinite(lat_deg) || !Number.isFinite(lon_deg)) return [];
  const tolerance_deg = COUNTRY_PHOTO_POSITION_TOLERANCE_KM / (KM_PER_DEGREE * Math.max(0.05, Math.cos(lat_deg * Math.PI / 180)));
  return COUNTRY_IMAGERY.filter(({ id, bounds: [west, south, east, north] }) =>
    lon_deg >= west && lon_deg <= east && lat_deg >= south && lat_deg <= north
    && RINGS[id].some(ring => lon_deg >= ring.west - tolerance_deg && lon_deg <= ring.east + tolerance_deg
      && lat_deg >= ring.south - tolerance_deg && lat_deg <= ring.north + tolerance_deg
      && (insideRing(ring, lon_deg, lat_deg) || ringDistance_km(ring, lon_deg, lat_deg) <= COUNTRY_PHOTO_POSITION_TOLERANCE_KM))).map(({ id }) => id);
}

/**
 * Whether a geographic rectangle (degrees) may show this source's pixels: it must meet the
 * service envelope and lie within the tile margin of the coarse outline.
 */
export function countryPhotoRectangleMayContain(country: PhotoCountry, west: number, south: number, east: number, north: number): boolean {
  if (![west, south, east, north].every(Number.isFinite) || west > east || south > north) return false;
  const latMargin = COUNTRY_PHOTO_TILE_MARGIN_KM / KM_PER_DEGREE;
  const cos = Math.max(0.05, Math.cos(Math.min(89, Math.max(Math.abs(south), Math.abs(north))) * Math.PI / 180));
  const lonMargin = latMargin / cos;
  const [ew, es, ee, en] = ENVELOPES[country];
  if (east < ew || west > ee || north < es || south > en) return false;
  const w = west - lonMargin, s = south - latMargin, e = east + lonMargin, n = north + latMargin;
  return RINGS[country].some(ring => ringIntersectsRectangle(ring, w, s, e, n));
}

/** Web Mercator XYZ tile test. The proxy serves transparent tiles below the detail level. */
export function countryPhotoTileMayContain(country: PhotoCountry, z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || z < COUNTRY_PHOTO_DETAIL_MIN_LEVEL || z > COUNTRY_PHOTO_MAX_LEVEL) return false;
  const n = 2 ** z;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= n || y >= n) return false;
  const lon = (value: number) => value / n * 360 - 180;
  const lat = (value: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * value / n))) * 180 / Math.PI;
  return countryPhotoRectangleMayContain(country, lon(x), lat(y + 1), lon(x + 1), lat(y));
}
