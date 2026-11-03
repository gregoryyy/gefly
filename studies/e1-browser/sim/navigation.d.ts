export interface NavigationConfig { radio_nav_active_khz: number; radio_obs_deg: number; radio_demo_enabled: number; radio_nav2_active_khz?: number; radio_obs2_deg?: number }
export interface NavAntenna {lat_deg:number;lon_deg:number;elevation_m:number;range_nm:number}
export interface NavRecord extends NavAntenna {uid:string;id:string;name:string;frequency_khz:number;kind:'VOR'|'LOC'|'DME';variation_deg_east:number|null;front_course_true_deg:number|null;airport:string|null;runway:string|null;dme:(NavAntenna & {bias_nm:number})|null;gs:(NavAntenna & {angle_deg:number;front_course_true_deg:number})|null;source_line_ids:number[]}
export interface NavigationPackage {version:1;id:string;edition:string;historical:true;source_label:string;vertical_reference:string;records:NavRecord[];sha256:string}
export interface NavigationSignal {valid:boolean;kind:0|1|2;cdi_norm:number;course_rad:number;gs_valid:boolean;gs_norm:number;station_id:string|null;station_name:string|null;station_uid:string|null;source_label:string|null;station_kind:'VOR'|'LOC'|'DME'|null;course_reference:'MAG'|'TRUE'|'NONE';course_true_deg:number|null;to_from:'TO'|'FROM'|'OFF';radial_true_deg:number|null;radial_magnetic_deg:number|null;bearing_true_deg:number|null;dme_valid:boolean;dme_nm:number|null;dme_slant_nm:number|null;reason:string;gs_reason:string}
export const DEFAULT_NAVIGATION: Readonly<NavigationConfig>;
export const NAVIGATION_FIELDS: readonly (keyof NavigationConfig)[];
export function validNavigation(value:unknown):value is NavigationConfig;
export function validNavRecord(value:unknown):value is NavRecord;
export function navigationSignal(config:NavigationConfig,position:{lat_rad:number;lon_rad:number;alt_msl_m?:number},records?:readonly NavRecord[],sourceLabel?:string,receiver?:1|2):NavigationSignal;
export function loadNavigationPackage():Promise<NavigationPackage>;
