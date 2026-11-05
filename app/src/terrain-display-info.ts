import type { TerrainGrid } from '../../studies/e1-browser/sim/terrain.js';
import { validWorldTerrainTile } from '../../studies/e1-browser/sim/world-terrain.js';

export interface TerrainDisplayInfo {
  readonly detail: 'regional' | 'copernicus' | 'coarse' | 'mixed';
  readonly copernicusNodes: number;
  readonly coarseNodes: number;
}

/** Validate installed terrain once per revision, then read only copied metadata.
 * The renderer owns these installed grids until the next setTerrainTiles call;
 * per-frame status must not rescan the height/geoid buffers. A new installation
 * always validates again, even when its grid object identities are reused.
 */
export function createTerrainDisplayInfo(tiles: readonly TerrainGrid[]) {
  const entries = new Map<TerrainGrid, Readonly<TerrainDisplayInfo>>();
  for (const grid of tiles) {
    if (!validWorldTerrainTile(grid)) continue;
    entries.set(grid, Object.freeze({ detail: grid.source_detail ?? 'coarse',
      copernicusNodes: grid.copernicus_nodes ?? 0, coarseNodes: grid.coarse_nodes ?? 0 }));
  }
  return { hasWorldTerrain: entries.size > 0,
    at: (grid: TerrainGrid | null | undefined) => grid ? entries.get(grid) : undefined };
}

/** Installed grids are immutable renderer inputs; order and array identity are
 * not terrain changes. A replacement object, even under the same ID, is new. */
export function sameTerrainTiles(previous: ReadonlyMap<string, TerrainGrid>, next: ReadonlyMap<string, TerrainGrid>): boolean {
  return previous.size === next.size && [...next].every(([id, grid]) => previous.get(id) === grid);
}
