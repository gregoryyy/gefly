import { validGpsCoordinates } from './map-coordinates.ts';
import { distanceMeters } from './scenery-coverage.ts';
import type { FlightPlanSnapshot, FlightPlanStore, PlannerPoint, PlanLeg, PlanResult, PointNavigation, UserGpsFix } from './map-flight-plan-types.ts';

const RAD = Math.PI / 180;
const MAX_FIXES = 64, MAX_WAYPOINTS = 30;
const CUSTOM_SOURCE = 'User-defined GPS fix · current session';
const controls = /[\u0000-\u001f\u007f-\u009f]/;
const text = (value: unknown, max: number): value is string => typeof value === 'string'
  && value.length <= max && value.trim().length > 0 && !controls.test(value);
const validPoint = (point: PlannerPoint) => !!point && text(point.id, 300) && text(point.name, 200)
  && text(point.kind, 40) && text(point.source_label, 500) && validGpsCoordinates(point.lat_deg, point.lon_deg);
const copyPoint = (point: PlannerPoint): Readonly<PlannerPoint> => Object.freeze({ id: point.id, name: point.name,
  kind: point.kind, lon_deg: point.lon_deg, lat_deg: point.lat_deg, source_label: point.source_label });
const copyFix = (fix: UserGpsFix): Readonly<UserGpsFix> => Object.freeze({ ...copyPoint(fix), kind: 'fix', custom: true,
  ...(fix.anonymous === undefined ? {} : { anonymous: fix.anonymous }) });
const ok = (): PlanResult => ({ ok: true, value: undefined });
const fail = (error: string): PlanResult<never> => ({ ok: false, error });

/** Spherical true course/distance for a visual map readout, not wind correction
 * or receiver guidance. Missing heading leaves heading error unavailable.
 */
export function pointNavigation(origin: { lon_deg: number; lat_deg: number; heading_true_deg?: number },
  target: Pick<PlannerPoint, 'lon_deg' | 'lat_deg'>): PointNavigation | null {
  if (!origin || !target || !validGpsCoordinates(origin.lat_deg, origin.lon_deg) || !validGpsCoordinates(target.lat_deg, target.lon_deg)) return null;
  const lat1 = origin.lat_deg * RAD, lat2 = target.lat_deg * RAD, dlon = (target.lon_deg - origin.lon_deg) * RAD;
  const distance_nm = distanceMeters(lat1, origin.lon_deg * RAD, lat2, target.lon_deg * RAD) / 1852;
  const samePole = Math.abs(origin.lat_deg) === 90 && origin.lat_deg === target.lat_deg;
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon);
  const y = Math.sin(dlon) * Math.cos(lat2);
  // A coincident point has no direction. An antipodal point also has no unique
  // initial course; the small vector tolerance only covers floating-point noise.
  const bearing_true_deg = samePole || distance_nm === 0 || Math.hypot(x, y) < 1e-15
    ? null : (Math.atan2(y, x) / RAD + 360) % 360;
  const heading_error_deg = bearing_true_deg === null || !Number.isFinite(origin.heading_true_deg)
    ? null : ((bearing_true_deg - (origin.heading_true_deg! % 360) + 540) % 360) - 180;
  return Object.freeze({ bearing_true_deg, distance_nm: samePole ? 0 : distance_nm, heading_error_deg });
}

/** Ordered draft points are useful before both endpoints are selected. */
export function planPoints(snapshot: FlightPlanSnapshot): readonly Readonly<PlannerPoint>[] {
  return Object.freeze([...(snapshot.start ? [snapshot.start] : []), ...snapshot.waypoints,
    ...(snapshot.destination ? [snapshot.destination] : [])].map(copyPoint));
}

/** Leg readouts require a complete plan; draft points never imply an active leg. */
export function planLegs(snapshot: FlightPlanSnapshot): readonly Readonly<PlanLeg>[] {
  if (!snapshot.start || !snapshot.destination) return Object.freeze([]);
  const points = planPoints(snapshot);
  return Object.freeze(points.slice(1).map((to, index) => {
    const from = points[index], navigation = pointNavigation(from, to)!;
    return Object.freeze({ index, from, to, course_true_deg: navigation.bearing_true_deg, distance_nm: navigation.distance_nm });
  }));
}

/** Session-only declarative planning state. No aircraft, radio or storage access. */
export function createFlightPlanStore(onChange: (snapshot: FlightPlanSnapshot) => void): FlightPlanStore {
  const fixes: Readonly<UserGpsFix>[] = [];
  let start: Readonly<PlannerPoint> | null = null;
  let waypoints: Readonly<PlannerPoint>[] = [], destination: Readonly<PlannerPoint> | null = null;
  let activeLegIndex: number | null = null, nextFixId = 1;
  let cachedSnapshot: FlightPlanSnapshot | null = null;

  function getSnapshot(): FlightPlanSnapshot {
    return cachedSnapshot ??= Object.freeze({ fixes: Object.freeze(fixes.map(copyFix)), start: start && copyPoint(start),
      waypoints: Object.freeze(waypoints.map(copyPoint)), destination: destination && copyPoint(destination), activeLegIndex });
  }
  const changed = () => { cachedSnapshot = null; onChange(getSnapshot()); };
  const edited = () => { activeLegIndex = null; changed(); };
  const waypointIndex = (index: number) => Number.isInteger(index) && index >= 0 && index < waypoints.length;
  function fixProblem(name: string, lat_deg: number, lon_deg: number): string | null {
    if (typeof name !== 'string' || controls.test(name) || name.trim().length > 40)
      return 'Use up to 40 name characters without control characters, or leave the name blank for a generated label.';
    if (!validGpsCoordinates(lat_deg, lon_deg)) return 'Use finite WGS84 coordinates: latitude −90…90° and longitude −180…180°.';
    if (fixes.length >= MAX_FIXES) return 'At most 64 custom GPS fixes are available per session.';
    if (!Number.isSafeInteger(nextFixId)) return 'Custom GPS fix identifiers are exhausted for this session.';
    return null;
  }
  function appendFix(name: string, lat_deg: number, lon_deg: number): Readonly<UserGpsFix> {
    const id = `USER-${String(nextFixId++).padStart(4, '0')}`, anonymous = name.trim().length === 0;
    const fix: Readonly<UserGpsFix> = Object.freeze({ id, name: anonymous ? id : name.trim(), kind: 'fix', custom: true,
      ...(anonymous ? { anonymous: true } : {}), lon_deg, lat_deg, source_label: CUSTOM_SOURCE });
    fixes.push(fix); return fix;
  }
  return {
    getSnapshot,
    createFix(name, lat_deg, lon_deg) {
      const problem = fixProblem(name, lat_deg, lon_deg); if (problem) return fail(problem);
      const fix = appendFix(name, lat_deg, lon_deg); changed();
      return { ok: true, value: copyFix(fix) };
    },
    createWaypoint(lat_deg, lon_deg) {
      const problem = fixProblem('', lat_deg, lon_deg); if (problem) return fail(problem);
      if (waypoints.length >= MAX_WAYPOINTS) return fail('A flight plan supports at most 30 intermediate points.');
      // Validate both collections before consuming an ID or publishing a state;
      // observers receive the new library fix and route point together.
      const fix = appendFix('', lat_deg, lon_deg); waypoints.push(copyPoint(fix)); edited();
      return { ok: true, value: copyFix(fix) };
    },
    removeFix(id) {
      const index = fixes.findIndex(fix => fix.id === id);
      if (index < 0) return fail('Custom GPS fix not found.');
      const fix = fixes[index];
      if (planPoints(getSnapshot()).some(point => point.id === fix.id && point.lat_deg === fix.lat_deg && point.lon_deg === fix.lon_deg))
        return fail('Remove this GPS fix from the flight plan before deleting it.');
      fixes.splice(index, 1); changed(); return ok();
    },
    setPoint(role, point) {
      if (!['start', 'waypoint', 'destination'].includes(role) || !validPoint(point)) return fail('Choose a valid source-marked point with WGS84 coordinates (latitude −90…90°, longitude −180…180°).');
      if (role === 'waypoint' && waypoints.length >= MAX_WAYPOINTS) return fail('A flight plan supports at most 30 intermediate points.');
      const owned = copyPoint(point);
      if (role === 'start') start = owned;
      else if (role === 'destination') destination = owned;
      else waypoints.push(owned);
      edited(); return ok();
    },
    removeWaypoint(index) {
      if (!waypointIndex(index)) return fail('Waypoint index is unavailable.');
      waypoints.splice(index, 1); edited(); return ok();
    },
    moveWaypoint(index, direction) {
      if (!waypointIndex(index) || ![-1, 1].includes(direction) || !waypointIndex(index + direction)) return fail('Waypoint cannot move beyond the plan boundary.');
      const other = index + direction;
      [waypoints[index], waypoints[other]] = [waypoints[other], waypoints[index]];
      edited(); return ok();
    },
    activateLeg(index) {
      const legs = planLegs(getSnapshot());
      if (!Number.isInteger(index) || index < 0 || index >= legs.length || legs.some(leg => leg.distance_nm === 0 || leg.course_true_deg === null))
        return fail('Choose a leg in a complete plan with distinct adjacent points.');
      if (activeLegIndex !== index) { activeLegIndex = index; changed(); }
      return ok();
    },
    nextLeg() {
      if (activeLegIndex === null) return fail('Select a plan leg before advancing.');
      activeLegIndex = activeLegIndex + 1 < waypoints.length + 1 ? activeLegIndex + 1 : null;
      changed(); return ok();
    },
    stopNavigation() { if (activeLegIndex !== null) { activeLegIndex = null; changed(); } },
    clearPlan() {
      if (start === null && destination === null && waypoints.length === 0 && activeLegIndex === null) return;
      start = destination = null; waypoints = []; edited();
    },
  };
}
