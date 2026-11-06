/** WGS84 degrees. These are visual map plans, not aircraft guidance commands. */
export interface PlannerPoint {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly lon_deg: number;
  readonly lat_deg: number;
  readonly source_label: string;
}
export interface UserGpsFix extends PlannerPoint {
  readonly kind: 'fix';
  readonly custom: true;
  readonly anonymous?: boolean;
}
export type PlanRole = 'start' | 'waypoint' | 'destination';
export type PlanResult<T = undefined> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };
export interface FlightPlanSnapshot {
  readonly fixes: readonly Readonly<UserGpsFix>[];
  readonly start: Readonly<PlannerPoint> | null;
  readonly waypoints: readonly Readonly<PlannerPoint>[];
  readonly destination: Readonly<PlannerPoint> | null;
  readonly activeLegIndex: number | null;
}
export interface PlanLeg {
  readonly index: number;
  readonly from: Readonly<PlannerPoint>;
  readonly to: Readonly<PlannerPoint>;
  readonly course_true_deg: number | null;
  readonly distance_nm: number;
}
export interface PointNavigation {
  readonly bearing_true_deg: number | null;
  readonly distance_nm: number;
  readonly heading_error_deg: number | null;
}
export interface FlightPlanStore {
  getSnapshot(): FlightPlanSnapshot;
  createFix(name: string, lat_deg: number, lon_deg: number): PlanResult<Readonly<UserGpsFix>>;
  /** Atomically create an anonymous custom fix and append it as a plan waypoint. */
  createWaypoint(lat_deg: number, lon_deg: number): PlanResult<Readonly<UserGpsFix>>;
  removeFix(id: string): PlanResult;
  setPoint(role: PlanRole, point: Readonly<PlannerPoint>): PlanResult;
  removeWaypoint(index: number): PlanResult;
  moveWaypoint(index: number, direction: -1 | 1): PlanResult;
  activateLeg(index: number): PlanResult;
  nextLeg(): PlanResult;
  stopNavigation(): void;
  clearPlan(): void;
}
export type FlightPlanPanelAction =
  | { readonly type: 'create-fix'; readonly name: string; readonly lat_deg: number; readonly lon_deg: number }
  | { readonly type: 'remove-fix'; readonly id: string }
  | { readonly type: 'set-point'; readonly role: PlanRole; readonly point: Readonly<PlannerPoint> }
  | { readonly type: 'direct-to'; readonly point: Readonly<PlannerPoint> }
  | { readonly type: 'remove-waypoint'; readonly index: number }
  | { readonly type: 'move-waypoint'; readonly index: number; readonly direction: -1 | 1 }
  | { readonly type: 'activate-leg'; readonly index: number }
  | { readonly type: 'pick-map' | 'cancel-pick' | 'next-leg' | 'stop-plan' | 'clear-plan' | 'fit-plan' | 'edit-plan' };
export interface FlightPlanPanelView {
  readonly state: FlightPlanSnapshot;
  readonly legs: readonly PlanLeg[];
  readonly navigationText: string;
  readonly picking: boolean;
  readonly reviewing: boolean;
}
