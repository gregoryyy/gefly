/** Shared pressure display/setting constants for the altimeter UI and simulated airport contact. */
export const PA_PER_INHG = 3386.389;
// Practice UI bounds, not the limits of a sourced aircraft instrument (mirrors the worker's validSetting).
export const MIN_SETTING_PA = 80_000;
export const MAX_SETTING_PA = 110_000;
export const STANDARD_PA = 101_325;
