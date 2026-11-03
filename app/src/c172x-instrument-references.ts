/** Pinned JSBSim v1.3.3 generic c172x references, not installed C172S limits.
 * RPM: eng_io320.xml <maxrpm>; this does not establish a colored operating arc.
 * https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/engine/eng_io320.xml
 */
export const C172X_MAX_RPM = 2700;

/** Each c172x tank holds 130 lb. No density/type override is present; FGTank's
 * default is 6.6 lb/US gal. This is model capacity, not POH usable fuel/reserve.
 * https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml
 * https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGTank.cpp
 */
export const C172X_TANK_CAPACITY_M3 = 130 / 6.6 * 0.003785411784;

/** Provenance of the values above; redistribution/derivation rights unresolved (GAPS Q24). */
export const C172X_INSTRUMENT_SOURCES = Object.freeze({
  max_rpm: Object.freeze({ url: 'https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/engine/eng_io320.xml',
    raw_url: 'https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.3.3/engine/eng_io320.xml',
    sha256: '0cedc1e356a7a572a175f351a4abb952ba91081219a37dc7192bce3a2181d8c6',
    revision: 'JSBSim tag v1.3.3; sha256 of the raw file bytes at that tag', rights: 'unresolved (GAPS Q24)' }),
  tank_capacity: Object.freeze({ url: 'https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml',
    raw_url: 'https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.3.3/aircraft/c172x/c172x.xml',
    sha256: 'b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840',
    revision: 'JSBSim tag v1.3.3; sha256 of the raw file bytes at that tag', rights: 'unresolved (GAPS Q24)' }),
  tank_density: Object.freeze({ url: 'https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGTank.cpp',
    raw_url: 'https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.3.3/src/models/propulsion/FGTank.cpp',
    sha256: '59d11bc314a2e97197cf6dd776befb5d8297a4069d54037084d3eccd98465857',
    revision: 'JSBSim tag v1.3.3; sha256 of the raw file bytes at that tag', rights: 'unresolved (GAPS Q24)' }),
});
