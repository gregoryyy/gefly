// Pinned generic JSBSim c172x source stations; not installed C172S limits.
const LB=.45359237, GAL=.003785411784;
export const LOAD_STATIONS=Object.freeze([
 ['pilot','Pilot',190],['copilot','Co-pilot',140],['rear_left','Rear left',130],['rear_right','Rear right',106],['baggage','Baggage',120],['external','Legacy model external load',80],
].map(([id,label,lb])=>Object.freeze({id:id+'_kg',label,default_kg:lb*LB,max_kg:250})));
export const MODEL_EMPTY_MASS_KG=1454*LB;
export const MODEL_FUEL_DENSITY_KGPM3=6.6*LB/GAL;
export const MODEL_TANK_CAPACITY_M3=130/6.6*GAL;
export const EMPTY_MASS_KG=MODEL_EMPTY_MASS_KG, FUEL_DENSITY_KGPM3=MODEL_FUEL_DENSITY_KGPM3, FUEL_CAPACITY_M3=MODEL_TANK_CAPACITY_M3;
export const DEFAULT_LOADING=Object.freeze(Object.fromEntries([...LOAD_STATIONS.map(s=>[s.id,s.default_kg]),['fuel_left_m3',MODEL_TANK_CAPACITY_M3],['fuel_right_m3',MODEL_TANK_CAPACITY_M3]]));
const keys=Object.freeze(Object.keys(DEFAULT_LOADING));
export const LOADING_FIELDS=Object.freeze(['mass_total_kg','mass_empty_kg','fuel_mass_kg',...LOAD_STATIONS.map(s=>'payload_'+s.id),'fuel_capacity_left_m3','fuel_capacity_right_m3','fuel_density_kgpm3','loading_initial_fuel_m3']);
export function validLoading(c){return !!c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===keys.length&&keys.every(k=>Object.hasOwn(c,k)&&Number.isFinite(c[k])&&c[k]>=0&&c[k]<=(k.startsWith('fuel_')?MODEL_TANK_CAPACITY_M3:250));}
export function loadingValues(c){if(!validLoading(c))throw new TypeError('Invalid model loading configuration');return new Float64Array(keys.map(k=>c[k]));}
export function validLoadingState(s){if(!s||typeof s!=='object'||Array.isArray(s))return false;if(!LOADING_FIELDS.some(k=>Object.hasOwn(s,k)))return true;return LOADING_FIELDS.every(k=>Number.isFinite(s[k])&&s[k]>=0)&&s.mass_total_kg>0&&s.mass_empty_kg>0&&s.fuel_density_kgpm3>0&&s.fuel_capacity_left_m3>0&&s.fuel_capacity_right_m3>0&&LOAD_STATIONS.every(st=>s['payload_'+st.id]<=250)&&s.loading_initial_fuel_m3<=.4&&s.mass_total_kg<=3000&&s.mass_empty_kg<=3000&&s.fuel_mass_kg<=400&&s.fuel_capacity_left_m3<=.2&&s.fuel_capacity_right_m3<=.2&&s.fuel_density_kgpm3<=5000;}
export function loadingFromState(s){if(!validLoadingState(s)||!LOADING_FIELDS.every(k=>Object.hasOwn(s,k)))return null;const config=Object.fromEntries([...LOAD_STATIONS.map(st=>[st.id,s['payload_'+st.id]]),['fuel_left_m3',s.fuel_left_m3],['fuel_right_m3',s.fuel_right_m3]]);return validLoading(config)?Object.freeze(config):null;}
export function loadingFields(values){if(!values||values.length!==LOADING_FIELDS.length)return {};const s=Object.fromEntries(LOADING_FIELDS.map((key,i)=>[key,values[i]]));return validLoadingState(s)?s:{};}
