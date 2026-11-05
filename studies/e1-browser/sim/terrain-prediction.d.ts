export interface TerrainPrediction {
  readonly lat_rad: number; readonly lon_rad: number; readonly distance_m: number;
  readonly north_mps: number; readonly east_mps: number;
}
export interface TerrainPosition { readonly t_s: number; readonly lat_rad: number; readonly lon_rad: number }
/** Optional loading policy:20 wall seconds at confirmed pacing, capped at8km. */
export function createTerrainPrediction(): {
  update(state: TerrainPosition, simulationRate?: number): TerrainPrediction | null;
  reset(): void;
};
