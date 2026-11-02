/** Fixed manufacturer reference for the active research model's 1982 172P variant.
 * KCAS values are not the installed KIAS scale or dynamic stall predictions.
 * Source and applicability: docs/research/2026-11-02-c172p-airspeed-markings.md.
 */
export const C172P_CAS_SPEEDS = Object.freeze({
  vs0_kcas: 46,
  vs1_kcas: 52,
  vfe_kcas: 84,
  vfe10_kcas: 108,
  vno_kcas: 123,
  vne_kcas: 152,
});

const arcs = Object.freeze([
  Object.freeze({ color: '#f2f2e8', from_kcas: C172P_CAS_SPEEDS.vs0_kcas, to_kcas: C172P_CAS_SPEEDS.vfe_kcas, radius_px: 118 }),
  Object.freeze({ color: '#72bf87', from_kcas: C172P_CAS_SPEEDS.vs1_kcas, to_kcas: C172P_CAS_SPEEDS.vno_kcas, radius_px: 127 }),
  Object.freeze({ color: '#efcc66', from_kcas: C172P_CAS_SPEEDS.vno_kcas, to_kcas: C172P_CAS_SPEEDS.vne_kcas, radius_px: 127 }),
]);

export const C172P_CAS_LEGEND = '1982 C172P fixed KCAS reference: VS0 46, VS1 52, VFE 84 (10–30° flaps), VFE10 108, VNO 123, VNE 152 knots. Stall reference: 2400 lb, most forward CG, power off, zero bank. CAS teaching arcs, not installed IAS markings, current-weight stall predictions or validated JSBSim limits.';

const markings = Object.freeze({ speeds: C172P_CAS_SPEEDS, arcs, legend: C172P_CAS_LEGEND });

/** A TAS-only legacy engine must never receive CAS-referenced thresholds. */
export function airspeedMarkings(reference: 'CAS' | 'TAS'): typeof markings | null {
  return reference === 'CAS' ? markings : null;
}
