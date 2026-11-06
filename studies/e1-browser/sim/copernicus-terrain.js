import { WORLD_TERRAIN, readWorldBytes, terrainDigest } from './world-terrain.js';
const N = 129, BYTES = 64 + N * N * 4;
const MAGIC = [71,70,67,79,80,51,48,0];
/** A bounded, source-marked physical DSM cell. Its geoid remains the existing
 * coarse EGM2008 model; denser height samples do not improve geoid accuracy. */
export async function readCopernicusCell(col, row, fetcher = globalThis.fetch, signal) {
  if (!Number.isInteger(col) || col < 0 || col >= WORLD_TERRAIN.cols || !Number.isInteger(row)
    || row < WORLD_TERRAIN.firstRow || row > WORLD_TERRAIN.lastRow) throw new Error('Invalid Copernicus cell identity.');
  const bytes = await readWorldBytes(`/scenery/elevation/copernicus/${col}/${row}.bin`, BYTES, fetcher, signal);
  const view = new DataView(bytes);
  if (bytes.byteLength !== BYTES || !MAGIC.every((value, i) => view.getUint8(i) === value)
    || view.getUint32(8, true) !== 1 || view.getUint32(12, true) !== col || view.getUint32(16, true) !== row || view.getUint32(20, true) !== N
    || new Uint8Array(bytes, 24, 40).some(value => value !== 0)) throw new Error('Invalid Copernicus cell payload.');
  const physical_m = new Float32Array(N * N); let valid = 0;
  for (let i = 0; i < physical_m.length; i++) {
    const value = view.getFloat32(64 + i * 4, true);
    if (Number.isNaN(value)) { physical_m[i] = NaN; continue; }
    if (!Number.isFinite(value) || value <= -1000 || value >= 10000) throw new Error('Invalid Copernicus height.');
    physical_m[i] = value; valid++;
  }
  if (!valid) throw new Error('Empty Copernicus cell.');
  return Object.freeze({ col, row, physical_m, sha256: await terrainDigest(bytes), source: 'Copernicus-GLO30-Public-COG-2021' });
}
