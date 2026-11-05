export interface LoadingConfiguration {pilot_kg:number;copilot_kg:number;rear_left_kg:number;rear_right_kg:number;baggage_kg:number;external_kg:number;fuel_left_m3:number;fuel_right_m3:number}
export interface LoadingSnapshot {mass_total_kg?:number;mass_empty_kg?:number;fuel_mass_kg?:number;payload_pilot_kg?:number;payload_copilot_kg?:number;payload_rear_left_kg?:number;payload_rear_right_kg?:number;payload_baggage_kg?:number;payload_external_kg?:number;fuel_capacity_left_m3?:number;fuel_capacity_right_m3?:number;fuel_density_kgpm3?:number;loading_initial_fuel_m3?:number}
export const LOAD_STATIONS:readonly Readonly<{id:'pilot_kg'|'copilot_kg'|'rear_left_kg'|'rear_right_kg'|'baggage_kg'|'external_kg';label:string;default_kg:number;max_kg:number}>[];
export const LOADING_FIELDS:readonly (keyof LoadingSnapshot)[];
export const DEFAULT_LOADING:Readonly<LoadingConfiguration>;
export const FLIGHT_DEFAULT_LOADING:Readonly<LoadingConfiguration>;
export const MODEL_EMPTY_MASS_KG:number;
export const MODEL_FUEL_DENSITY_KGPM3:number;
export const MODEL_TANK_CAPACITY_M3:number;
export function validLoading(value:unknown):value is LoadingConfiguration;
export function loadingValues(value:LoadingConfiguration):Float64Array;
export function validLoadingState(value:unknown):boolean;
export function loadingFromState(value:unknown):Readonly<LoadingConfiguration>|null;
export function loadingFields(values:ArrayLike<number>):LoadingSnapshot;

export const EMPTY_MASS_KG:number, FUEL_DENSITY_KGPM3:number, FUEL_CAPACITY_M3:number;
