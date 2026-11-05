export interface TerrainGrid {
  version: 1; id: string; width: number; height: number;
  west_rad: number; south_rad: number; east_rad: number; north_rad: number;
  physical_m: Float64Array; geoid_m: Float64Array;
  masked?: true;
  source_detail?: 'copernicus' | 'coarse' | 'regional' | 'mixed';
  copernicus_nodes?: number; coarse_nodes?: number;
  sha256?: string; physical_datum?: string; geoid_model?: string;
}
export const TERRAIN_PACKAGE_URL: string;
export function validateTerrainGrid(grid: unknown): grid is TerrainGrid;
export function sampleTerrain(grid: TerrainGrid, latitude_rad: number, longitude_rad: number): { physical_m: number; geoid_m: number; ellipsoid_m: number } | null;
export function terrainContainsInterior(grid: TerrainGrid, latitude_rad: number, longitude_rad: number): boolean;
export function sampleTerrainGradient(grid: TerrainGrid, latitude_rad: number, longitude_rad: number): { east_slope: number; north_slope: number } | null;
export function loadTerrainPackage(fetcher?: typeof fetch): Promise<TerrainGrid>;
