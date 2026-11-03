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
