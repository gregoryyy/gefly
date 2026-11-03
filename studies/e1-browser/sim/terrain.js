// One immutable, locally bundled geographic height surface for rendering and
// native dynamics. Nodes are south→north, west→east; heights are metres.
export const TERRAIN_PACKAGE_URL = '/terrain/edfe-taunus-v1.json';
const MAX_NODES = 1025 * 1025;
let defaultPackage;

export function validateTerrainGrid(grid) {
  return !!grid && grid.version === 1 && typeof grid.id === 'string' && grid.id.length > 0 && grid.id.length <= 100
    && Number.isInteger(grid.width) && Number.isInteger(grid.height) && grid.width >= 2 && grid.height >= 2
    && grid.width * grid.height <= MAX_NODES
    && [grid.west_rad, grid.south_rad, grid.east_rad, grid.north_rad].every(Number.isFinite)
    && grid.west_rad >= -Math.PI && grid.east_rad <= Math.PI && grid.west_rad < grid.east_rad
    && grid.south_rad >= -Math.PI / 2 && grid.north_rad <= Math.PI / 2 && grid.south_rad < grid.north_rad
    && [grid.physical_m, grid.geoid_m].every(values => values instanceof Float64Array && values.length === grid.width * grid.height
      && values.every(Number.isFinite))
    && grid.physical_m.every(value => value > -1000 && value < 10000)
    && grid.geoid_m.every(value => Math.abs(value) < 200);
}

/** Same SW→NE diagonal and piecewise-linear surface as Cesium heightmaps.
 * This is interpolation of declared DEM nodes, not a claim of survey accuracy.
 */
export function sampleTerrain(grid, latitude_rad, longitude_rad) {
  if (!grid || !Number.isFinite(latitude_rad) || !Number.isFinite(longitude_rad)
    || latitude_rad < grid.south_rad || latitude_rad > grid.north_rad
    || longitude_rad < grid.west_rad || longitude_rad > grid.east_rad) return null;
  const gx = (longitude_rad - grid.west_rad) / (grid.east_rad - grid.west_rad) * (grid.width - 1);
  const gy = (latitude_rad - grid.south_rad) / (grid.north_rad - grid.south_rad) * (grid.height - 1);
  const ix = Math.min(grid.width - 2, Math.max(0, Math.floor(gx)));
  const iy = Math.min(grid.height - 2, Math.max(0, Math.floor(gy)));
  const dx = Math.min(1, Math.max(0, gx - ix)), dy = Math.min(1, Math.max(0, gy - iy));
  const sw = iy * grid.width + ix, se = sw + 1, nw = sw + grid.width, ne = nw + 1;
  const interpolate = values => dy < dx
    ? values[sw] + dx * (values[se] - values[sw]) + dy * (values[ne] - values[se])
    : values[sw] + dx * (values[ne] - values[nw]) + dy * (values[nw] - values[sw]);
  const physical_m = interpolate(grid.physical_m), geoid_m = interpolate(grid.geoid_m);
  return [physical_m, geoid_m].every(Number.isFinite)
    ? { physical_m, geoid_m, ellipsoid_m: physical_m + geoid_m } : null;
}

/** Keep every native contact point away from unloaded DEM edges. */
export function terrainContainsInterior(grid, latitude_rad, longitude_rad) {
  if (!sampleTerrain(grid, latitude_rad, longitude_rad)) return false;
  const lonMargin = (grid.east_rad - grid.west_rad) / (grid.width - 1);
  const latMargin = (grid.north_rad - grid.south_rad) / (grid.height - 1);
  return latitude_rad >= grid.south_rad + latMargin && latitude_rad <= grid.north_rad - latMargin
    && longitude_rad >= grid.west_rad + lonMargin && longitude_rad <= grid.east_rad - lonMargin;
}

/** Physical DEM triangle gradient in the local east/north tangent frame. */
export function sampleTerrainGradient(grid, latitude_rad, longitude_rad) {
  const sample = sampleTerrain(grid, latitude_rad, longitude_rad);
  if (!sample) return null;
  const gx = (longitude_rad - grid.west_rad) / (grid.east_rad - grid.west_rad) * (grid.width - 1);
  const gy = (latitude_rad - grid.south_rad) / (grid.north_rad - grid.south_rad) * (grid.height - 1);
  const ix = Math.min(grid.width - 2, Math.floor(gx)), iy = Math.min(grid.height - 2, Math.floor(gy));
  const sw = iy * grid.width + ix, se = sw + 1, nw = sw + grid.width, ne = nw + 1, h = grid.physical_m;
  const eastNode = gy - iy < gx - ix ? h[se] - h[sw] : h[ne] - h[nw];
  const northNode = gy - iy < gx - ix ? h[ne] - h[se] : h[nw] - h[sw];
  const flattening = 1 / 298.257223563, eccentricity2 = flattening * (2 - flattening);
  const denominator = 1 - eccentricity2 * Math.sin(latitude_rad) ** 2;
  const primeVertical = 6378137 / Math.sqrt(denominator), meridian = 6378137 * (1 - eccentricity2) / denominator ** 1.5;
  const east_slope = eastNode * (grid.width - 1) / (grid.east_rad - grid.west_rad)
    / ((primeVertical + sample.physical_m) * Math.cos(latitude_rad));
  const north_slope = northNode * (grid.height - 1) / (grid.north_rad - grid.south_rad) / (meridian + sample.physical_m);
  return [east_slope, north_slope].every(Number.isFinite) ? { east_slope, north_slope } : null;
}

async function readPackage(fetcher) {
  const response = await fetcher(TERRAIN_PACKAGE_URL);
  if (!response.ok) throw new Error('Public terrain package unavailable.');
  const manifestText = await response.text();
  if (manifestText.length > 100000) throw new Error('Terrain manifest is too large.');
  const metadata = JSON.parse(manifestText);
  if (metadata.version !== 1 || metadata.rows !== 'south-to-north' || metadata.physical_datum !== 'DHHN2016'
    || metadata.geoid_model !== 'GCG2016v2023_W' || metadata.encoding !== 'float32-le-interleaved-H-zeta'
    || !/^[a-z0-9][a-z0-9.-]*\.f32$/.test(metadata.asset) || !/^[a-f0-9]{64}$/.test(metadata.sha256)
    || !Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)
    || metadata.width < 2 || metadata.height < 2 || metadata.width * metadata.height > MAX_NODES)
    throw new Error('Unsupported terrain package or height datum.');
  const bytesResponse = await fetcher('/terrain/' + metadata.asset);
  if (!bytesResponse.ok) throw new Error('Public terrain heights unavailable.');
  const bytes = await bytesResponse.arrayBuffer();
  if (bytes.byteLength !== metadata.width * metadata.height * 8) throw new Error('Terrain grid size mismatch.');
  const digest = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== metadata.sha256) throw new Error('Terrain grid integrity check failed.');
  const physical_m = new Float64Array(metadata.width * metadata.height), geoid_m = new Float64Array(physical_m.length);
  const view = new DataView(bytes);
  for (let index = 0; index < physical_m.length; index++) {
    physical_m[index] = view.getFloat32(index * 8, true);
    geoid_m[index] = view.getFloat32(index * 8 + 4, true);
  }
  const grid = { ...metadata, physical_m, geoid_m };
  if (!validateTerrainGrid(grid)) throw new Error('Invalid or missing terrain/geoid nodes.');
  return Object.freeze(grid);
}

export function loadTerrainPackage(fetcher = globalThis.fetch) {
  if (fetcher !== globalThis.fetch) return readPackage(fetcher);
  if (!defaultPackage) defaultPackage = readPackage(fetcher).catch(error => { defaultPackage = undefined; throw error; });
  return defaultPackage;
}
