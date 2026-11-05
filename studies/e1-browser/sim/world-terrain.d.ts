import type { TerrainGrid } from './terrain.js';
export interface WorldTerrainProfile { readonly step: number; readonly cols: number; readonly rows: number; readonly nodes: 129; readonly south: -89.5; readonly north: 89.5; readonly firstRow: number; readonly lastRow: number; readonly maxResident: 9 }
export const WORLD_TERRAIN: Readonly<WorldTerrainProfile>;
export const LEGACY_WORLD_TERRAIN: Readonly<WorldTerrainProfile>;
export function worldTerrainProfile(grid: unknown): Readonly<WorldTerrainProfile> | null;
export interface WorldTerrainTile extends TerrainGrid { slot: number; source: 'regional' | 'global' | 'mixed'; sha256: string }
export function validWorldTerrainTile(grid: unknown): grid is WorldTerrainTile;
export function worldCellAt(lat: number, lon: number, profile?: Readonly<WorldTerrainProfile>): [number, number] | null;
export function worldTileId(col: number, row: number): string;
export function loadWorldTerrainPackage(fetcher?: typeof fetch, signal?: AbortSignal): Promise<TerrainGrid>;
export function sampleWorldTerrain(grid: TerrainGrid, lat: number, lon: number): { physical_m: number; geoid_m: number; ellipsoid_m: number } | null;
export function terrainDigest(bytes: BufferSource): Promise<string>;
export function readWorldBytes(url: string, limit: number, fetcher: typeof fetch, signal?: AbortSignal): Promise<ArrayBuffer>;
