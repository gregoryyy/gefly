import type { TerrainGrid } from './terrain.js';
import type { WorldTerrainTile } from './world-terrain.js';
export const REGIONAL_TERRAIN: Readonly<{ west: 6; south: 47; east: 14; north: 51.75; cols: 32; rows: 19; step: 0.25; tileCount: 608 }>;
export interface RegionalTileMetadata {
  readonly coverage: 'full' | 'partial'; readonly valid_nodes: number; readonly masked?: true;
  readonly id: string; readonly slot: number; readonly asset: string; readonly sha256: string;
  readonly west_deg: number; readonly south_deg: number; readonly east_deg: number; readonly north_deg: number;
  readonly width: 129; readonly height: 129; readonly bytes: number;
}
export type RegionalTile = TerrainGrid & RegionalTileMetadata;
export type AtlasTile = TerrainGrid & { readonly slot: number; readonly source?: 'regional' | 'global' | 'mixed' };
export type TerrainSample = { physical_m: number; geoid_m: number; ellipsoid_m: number };
export function loadRegionalManifest(fetcher?: typeof fetch, signal?: AbortSignal): Promise<Map<string, RegionalTileMetadata>>;
export function loadRegionalManifestOptional(fetcher?: typeof fetch, signal?: AbortSignal): Promise<Map<string, RegionalTileMetadata> | null>;
export function atlasGridAt(fine: TerrainGrid | null, tiles: ReadonlyMap<string, AtlasTile>, lat: number, lon: number): AtlasTile | TerrainGrid | null;
export function sampleAtlasGradient(fine: TerrainGrid | null, tiles: ReadonlyMap<string, AtlasTile>, lat: number, lon: number): { east_slope: number; north_slope: number } | null;
export function sampleAtlas(fine: TerrainGrid | null, tiles: ReadonlyMap<string, AtlasTile>, lat: number, lon: number): TerrainSample | null;
export class TerrainStream {
  constructor(manifest: Map<string, RegionalTileMetadata>, install: (grid: RegionalTile) => void, remove: (grid: RegionalTile) => void, fetcher?: typeof fetch);
  tiles: Map<string, RegionalTile>;
  center(lat: number, lon: number): [number, number] | null;
  sample(lat: number, lon: number): TerrainSample | null;
  gridAt(lat: number, lon: number): RegionalTile | null;
  cancel(): void;
  needsUpdate(lat: number, lon: number): boolean;
  move(lat: number, lon: number): Promise<void>;
}
export class WorldTerrainStream {
  constructor(world: TerrainGrid, manifest: Map<string, RegionalTileMetadata> | null, install: (grid: WorldTerrainTile) => void, remove: (grid: WorldTerrainTile) => void, fetcher?: typeof fetch);
  tiles: Map<string, WorldTerrainTile>;
  sources: Map<string, RegionalTile>;
  failedSources: Set<string>;
  center(lat: number, lon: number): [number, number] | null;
  sample(lat: number, lon: number): TerrainSample | null;
  gridAt(lat: number, lon: number): WorldTerrainTile | null;
  quality(lat: number, lon: number): 1 | 2 | 3 | null;
  cancel(): void;
  cancelPrefetch(): void;
  prefetch(lat: number, lon: number, prediction: Pick<import('./terrain-prediction.js').TerrainPrediction, 'lat_rad' | 'lon_rad'> | null): Promise<boolean>;
  needsUpdate(lat: number, lon: number): boolean;
  move(lat: number, lon: number): Promise<void>;
}
