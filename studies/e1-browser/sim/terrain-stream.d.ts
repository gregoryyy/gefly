import type { TerrainGrid } from './terrain.js';
export interface RegionalTileMetadata {
  readonly id: string; readonly slot: number; readonly asset: string; readonly sha256: string;
  readonly west_deg: number; readonly south_deg: number; readonly east_deg: number; readonly north_deg: number;
  readonly width: 129; readonly height: 129; readonly bytes: number;
}
export type RegionalTile = TerrainGrid & RegionalTileMetadata;
export type TerrainSample = { physical_m: number; geoid_m: number; ellipsoid_m: number };
export function loadRegionalManifest(fetcher?: typeof fetch, signal?: AbortSignal): Promise<Map<string, RegionalTileMetadata>>;
export function atlasGridAt(fine: TerrainGrid | null, tiles: ReadonlyMap<string, RegionalTile>, lat: number, lon: number): TerrainGrid | null;
export function sampleAtlasGradient(fine: TerrainGrid | null, tiles: ReadonlyMap<string, RegionalTile>, lat: number, lon: number): { east_slope: number; north_slope: number } | null;
export function sampleAtlas(fine: TerrainGrid | null, tiles: ReadonlyMap<string, RegionalTile>, lat: number, lon: number): TerrainSample | null;
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
