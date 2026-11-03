/** Visual approximation from EDFE operating rules dated 25 November 2025.
 * The ARP is declared as runway midpoint; heading is magnetic 082 + 4°E.
 * This is not surveyed threshold data or an operational navigation database. */
export const EDFE_REFERENCE = Object.freeze({ lat_rad: (49 + 57.65 / 60) * Math.PI / 180, lon_rad: (8 + 38.49 / 60) * Math.PI / 180 });
export const EDFE_RUNWAY_LENGTH_M = 1400;
export const EDFE_RUNWAY_WIDTH_M = 25;
const RADIUS_M = 6378137;
export function airportOffset(origin: {lat_rad: number; lon_rad: number}, east_m: number, north_m: number) {
  return { lat_rad: origin.lat_rad + north_m / RADIUS_M, lon_rad: origin.lon_rad + east_m / (RADIUS_M * Math.cos(origin.lat_rad)) };
}
export function airportLocal(point: {lat_rad: number; lon_rad: number}, origin = EDFE_REFERENCE) {
  return { east_m: (point.lon_rad - origin.lon_rad) * RADIUS_M * Math.cos(origin.lat_rad), north_m: (point.lat_rad - origin.lat_rad) * RADIUS_M };
}
export function runwayPoint(along_m: number, right_m = 0) {
  const h = 86 * Math.PI / 180;
  return airportOffset(EDFE_REFERENCE, along_m * Math.sin(h) + right_m * Math.cos(h), along_m * Math.cos(h) - right_m * Math.sin(h));
}
export const EDFE_RUNWAYS = Object.freeze([
  Object.freeze({ id: '08', airport: 'EDFE', ...runwayPoint(-700), heading_true_rad: 86 * Math.PI / 180, length_m: 1400, width_m: 25, displaced_threshold_m: 0, approximate: true }),
  Object.freeze({ id: '26', airport: 'EDFE', ...runwayPoint(700 - 234), heading_true_rad: 266 * Math.PI / 180, length_m: 1400, width_m: 25, displaced_threshold_m: 234, approximate: true }),
]);
/** Generic practice cue, FAA AIM 2-1-2 Fig 2-1-5. No obstacle-clearance claim.
 * Uses the selected light bar, not MSL or height above the threshold. */
export function practicePapiWhites(angle_deg: number): number {
  if (!Number.isFinite(angle_deg)) return 0;
  return [2.5, 3 - 1 / 6, 3 + 1 / 6, 3.5].filter(a => angle_deg >= a).length;
}

/** Generic exercise installation, not a claim about EDFE's installed lighting. */
export function practiceRunwayLights() {
  const lights: {lat_rad:number;lon_rad:number;along_m:number;kind:'edge'|'threshold'|'end';facing:1|-1}[]=[];
  for(let along=-700;along<=700;along+=1400/24) for(const side of [-1,1])lights.push({...runwayPoint(along,side*13.5),along_m:along,kind:'edge',facing:1});
  for(const {along,kind,facing} of [
    {along:-700,kind:'threshold' as const,facing:-1 as const}, {along:466,kind:'threshold' as const,facing:1 as const},
    {along:-700,kind:'end' as const,facing:1 as const}, {along:700,kind:'end' as const,facing:-1 as const},
  ]) for(const right of [-11,-7,-3,3,7,11]) lights.push({...runwayPoint(along,right),along_m:along,kind,facing});
  return lights;
}
export function sampleAirportPoints<T extends {lat_rad:number;lon_rad:number}>(points:readonly T[],sampleHeight:(lat:number,lon:number)=>number|null): (T&{ellipsoid_m:number})[]|null {
  const sampled:(T&{ellipsoid_m:number})[]=[];
  for(const p of points){const h=sampleHeight(p.lat_rad,p.lon_rad);if(h===null||!Number.isFinite(h))return null;sampled.push({...p,ellipsoid_m:h});}
  return sampled;
}
