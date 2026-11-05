import { BoundingSphere, Cartesian3, Ellipsoid, EllipsoidalOccluder,
  OrientedBoundingBox, QuantizedMeshTerrainData, Rectangle } from 'cesium';

/** North-to-south elevation grid. Missing samples remove triangles, never create ground. */
export function createMaskedTerrainMesh(rectangle: Rectangle, heights: Float64Array,
  width: number, childTileMask: number): QuantizedMeshTerrainData {
  if (!Number.isInteger(width) || width < 2 || width > 129 || heights.length !== width * width
    || !Number.isInteger(childTileMask) || childTileMask < 0 || childTileMask > 15
    || ![rectangle.west, rectangle.south, rectangle.east, rectangle.north].every(Number.isFinite)
    || rectangle.west < -Math.PI || rectangle.east > Math.PI || rectangle.east <= rectangle.west
    || rectangle.south < -Math.PI / 2 || rectangle.north > Math.PI / 2 || rectangle.north <= rectangle.south)
    throw new Error('Unsupported masked terrain grid');
  const count = heights.length, maximum = 32767, ellipsoid = Ellipsoid.WGS84;
  let minimumHeight = Infinity, maximumHeight = -Infinity;
  for (const height of heights) if (Number.isFinite(height)) {
    minimumHeight = Math.min(minimumHeight, height); maximumHeight = Math.max(maximumHeight, height);
  } else if (!Number.isNaN(height)) throw new Error('Invalid terrain height');
  // Empty geometry needs finite metadata, but no triangle uses these placeholder vertices.
  if (minimumHeight === Infinity) minimumHeight = maximumHeight = 0;
  if (minimumHeight <= -ellipsoid.minimumRadius || !Number.isFinite(maximumHeight - minimumHeight))
    throw new Error('Invalid terrain height range');
  const range = maximumHeight - minimumHeight, vertices = new Uint16Array(count * 3);
  const supported = Uint8Array.from(heights, height => Number.isFinite(height) ? 1 : 0);
  const positions: Cartesian3[] = [], indices: number[] = [];
  for (let row = 0; row < width; row++) for (let column = 0; column < width; column++) {
    const index = row * width + column;
    const u = Math.round(column / (width - 1) * maximum);
    const v = Math.round((1 - row / (width - 1)) * maximum);
    const height = heights[index];
    const h = Number.isFinite(height) && range > 0 ? Math.round((height - minimumHeight) / range * maximum) : 0;
    vertices[index] = u; vertices[count + index] = v; vertices[2 * count + index] = h;
    // Bound the actual quantized positions, including unused vertices, conservatively.
    positions.push(Cartesian3.fromRadians(rectangle.west + rectangle.width * u / maximum,
      rectangle.south + rectangle.height * v / maximum, minimumHeight + range * h / maximum, ellipsoid));
    if (row + 1 < width && column + 1 < width) {
      const nw = index, ne = index + 1, sw = index + width, se = sw + 1;
      if ([sw, se, ne].every(i => Number.isFinite(heights[i]))) indices.push(sw, se, ne);
      if ([sw, ne, nw].every(i => Number.isFinite(heights[i]))) indices.push(sw, ne, nw);
    }
  }
  const orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid);
  const boundingSphere = BoundingSphere.fromOrientedBoundingBox(orientedBoundingBox);
  const horizonOcclusionPoint = new EllipsoidalOccluder(ellipsoid)
    .computeHorizonCullingPointPossiblyUnderEllipsoid(boundingSphere.center, positions, minimumHeight);
  if (!horizonOcclusionPoint || ![horizonOcclusionPoint.x, horizonOcclusionPoint.y, horizonOcclusionPoint.z].every(Number.isFinite))
    throw new Error('Unsupported masked terrain horizon');
  // Cesium's GPU upload rejects a zero-byte index buffer. A repeated index is
  // a zero-area primitive: it uploads successfully but creates no pickable or
  // rasterized surface, including for a completely unsupported tile.
  if (!indices.length) indices.push(0, 0, 0);
  const data = new QuantizedMeshTerrainData({ minimumHeight, maximumHeight, quantizedVertices: vertices,
    indices: new Uint16Array(indices), boundingSphere, orientedBoundingBox, horizonOcclusionPoint,
    westIndices: [], southIndices: [], eastIndices: [], northIndices: [],
    westSkirtHeight: 0, southSkirtHeight: 0, eastSkirtHeight: 0, northSkirtHeight: 0, childTileMask });
  // Cesium 1.146 compares 32767-scaled query coordinates to normalized mesh UVs
  // after createMesh. Keep height queries on this same quantized lattice before
  // and after worker meshing, without scanning every triangle or filling holes.
  const interpolateHeight = (bounds: Rectangle, longitude: number, latitude: number): number | undefined => {
    if (![longitude, latitude].every(Number.isFinite)) return undefined;
    const u = Math.max(0, Math.min(maximum, (longitude - bounds.west) / bounds.width * maximum));
    const v = Math.max(0, Math.min(maximum, (latitude - bounds.south) / bounds.height * maximum));
    const cell = (coordinate: number) => {
      let index = Math.min(width - 2, Math.floor(coordinate / maximum * (width - 1)));
      if (index > 0 && coordinate < Math.round(index / (width - 1) * maximum)) index--;
      if (index < width - 2 && coordinate > Math.round((index + 1) / (width - 1) * maximum)) index++;
      return index;
    };
    const col = cell(u), southRow = cell(v), nw = (width - 2 - southRow) * width + col;
    const ne = nw + 1, sw = nw + width, se = sw + 1;
    const dx = (u - vertices[sw]) / (vertices[se] - vertices[sw]);
    const dy = (v - vertices[count + sw]) / (vertices[count + nw] - vertices[count + sw]);
    for (const [ids, weights] of [
      [[sw, se, ne], [1 - dx, dx - dy, dy]],
      [[sw, ne, nw], [1 - dy, dx, dy - dx]],
    ]) {
      if (weights.some(weight => weight < -1e-12) || ids.some(index => !supported[index])) continue;
      const height = ids.reduce((sum, index, i) => sum + vertices[2 * count + index] * weights[i], 0);
      return minimumHeight + range * height / maximum;
    }
    return undefined;
  };
  // Cesium's declaration omits the undefined result its own implementation uses
  // when a point lies outside all mesh triangles.
  data.interpolateHeight = interpolateHeight as typeof data.interpolateHeight;
  return data;
}
