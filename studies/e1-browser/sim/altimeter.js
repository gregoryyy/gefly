// Ideal ISA pressure-scale altimeter for the local research worker, not a
// validated mechanical 172S instrument. The setting shifts the standard scale:
// indicated altitude = H(static pressure) - H(setting), not H(p / setting).
// NASA TP-2007-213475, Appendix A, and TP-2009-215402, section 4:
// coherent ISA constants; see docs/research/2026-11-02-pressure-altimeter.md.
// https://ntrs.nasa.gov/citations/20120003268
// The -2 km through 11 km pressure-height envelope covers the troposphere only;
// other atmosphere layers, instrument/installation error and lag are unsupported.
export const STANDARD_PRESSURE_PA = 101325;
export const PRACTICE_SETTING_MIN_PA = 80000;
export const PRACTICE_SETTING_MAX_PA = 110000;
const SEA_LEVEL_TEMPERATURE_K = 288.15;
const LAPSE_K_PER_M = 0.0065;
const GAS_CONSTANT_J_PER_KG_K = 287.053;
const GRAVITY_M_PER_S2 = 9.80665;
const SCALE_M = SEA_LEVEL_TEMPERATURE_K / LAPSE_K_PER_M;
const EXPONENT = GAS_CONSTANT_J_PER_KG_K * LAPSE_K_PER_M / GRAVITY_M_PER_S2;

/** App practice bounds only: these are not a sourced aircraft subscale range. */
export function validSetting(setting_pa) {
  return Number.isFinite(setting_pa)
    && setting_pa >= PRACTICE_SETTING_MIN_PA && setting_pa <= PRACTICE_SETTING_MAX_PA;
}

/** Standard-atmosphere pressure height in metres; null outside supported inputs. */
export function pressureAltitude_m(pressure_pa) {
  if (!Number.isFinite(pressure_pa) || pressure_pa <= 0) return null;
  const height_m = SCALE_M * (1 - (pressure_pa / STANDARD_PRESSURE_PA) ** EXPONENT);
  return Number.isFinite(height_m) && height_m >= -2000 && height_m <= 11000 ? height_m : null;
}

/** Ideal scale-offset indication; no atmosphere or dynamics state is mutated. */
export function indicatedAltitude_m(static_pressure_pa, setting_pa) {
  if (!validSetting(setting_pa)) return null;
  const pressure_height_m = pressureAltitude_m(static_pressure_pa);
  const setting_height_m = pressureAltitude_m(setting_pa);
  if (pressure_height_m === null || setting_height_m === null) return null;
  return pressure_height_m - setting_height_m;
}
