/** Original visual geometry in metres; X forward, Y up, Z right. */
export interface VisualEllipsoid {
  readonly center: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
}
export const VISUAL_AIRFRAME: {
  readonly profile: readonly (readonly [number, number])[];
  readonly scaleY: number;
  readonly cabin: VisualEllipsoid;
  readonly roof: VisualEllipsoid;
  readonly spinner: VisualEllipsoid;
  readonly prop: { readonly x: number; readonly radius: number };
  readonly fin: { readonly outline: readonly (readonly [number, number])[];
    readonly halfDepth: number; readonly bevel: number;
    readonly extrusionDepth: number; readonly bevelThickness: number };
};
export const EMPTY_COLLISION: Readonly<{ collision_mask: number; collision_step: number;
  collision_t_s: number; collision_down_mps: number; collision_groundspeed_mps: number }>;
export function groundCollisionContact(ground_agl_m: number, roll_rad: number, pitch_rad: number,
  structure_contact_mask: number, terrainPlane?: { east_slope: number; north_slope: number; heading_rad: number }): { available: boolean; mask: number; clearance_m: number | null };
export function collisionRecord(mask: number, step: number, t_s: number,
  previousGround: { ground_down_mps: number; ground_forward_mps: number; ground_side_mps: number }): typeof EMPTY_COLLISION | null;
export function collisionStateFields(enabled: boolean, available: boolean, latched: typeof EMPTY_COLLISION | null | undefined): Partial<typeof EMPTY_COLLISION>;
export function contactOutcome(contact: { available: boolean; mask: number } | null | undefined, record: typeof EMPTY_COLLISION | null): 'clear' | 'latch' | 'fail' | 'unavailable';
