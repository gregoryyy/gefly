// E1 browser check: minimal C bridge between JSBSim (v1.3.3) and a Web Worker.
// Study code, not a product component. All values crossing this boundary are SI
// (m, m/s, rad, s); JSBSim's ft/kt units are converted here, once.
//
// Exports (C ABI, called from worker.js through the Emscripten module):
//   int     gf_init(dt_s, lat_rad, lon_rad, alt_msl_m, heading_rad, tas_mps)
//   int     gf_set_inputs(elevator, aileron, rudder, throttle)
//   int     gf_set_pitch_trim(norm), double* gf_pitch_trim_state()
//   int     gf_step()                 advance exactly one fixed step
//   double* gf_state()                pointer to kStateLen doubles (see below)
//   double  gf_step_index()           completed steps since init
//   int     gf_trim_status(), double gf_trim_throttle(), gf_trim_pitch()
//   const char* gf_digest_hex()       FNV-1a 64 over every post-step state
// Return codes: 0 ok, negative = error (see kErr*).
#include <FGFDMExec.h>
#include <FGJSBBase.h>
#include <input_output/FGPropertyManager.h>
#include <models/FGGroundReactions.h>
#include <simgear/misc/sg_path.hxx>
#include <emscripten/emscripten.h>

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <initializer_list>
#include <memory>
#include <limits>

namespace {

constexpr double kFtToM = 0.3048;            // exact
constexpr double kKtToMps = 1852.0 / 3600.0; // exact
constexpr double kPi = 3.141592653589793;
// NIST SP 811: pound-force per square foot to Pa (physical conversion).
constexpr double kPsfToPa = 47.88025898033584;
constexpr double kPsiToPa = 6894.757293168;
constexpr double kUsGalToM3 = 0.003785411784;
constexpr double kLbfToN = 4.4482216152605;

constexpr int kErrNotInit = -1;
constexpr int kErrNonFinite = -2;
constexpr int kErrLoad = -3;
constexpr int kErrRunIc = -4;
constexpr int kErrRun = -5;
constexpr int kErrRange = -6;

// State layout (indices are part of the worker.js contract):
// 0 t_s, 1 lat_rad (geodetic), 2 lon_rad, 3 alt_msl_m, 4 roll_rad, 5 pitch_rad,
// 6 heading_rad (true), 7 tas_mps, 8-10 body u,v,w m/s, 11-13 body p,q,r rad/s
constexpr int kStateLen = 14;
double g_state[kStateLen] = {0.0};
std::unique_ptr<JSBSim::FGFDMExec> g_fdm;
uint64_t g_hash = 1469598103934665603ULL;
double g_steps = 0.0;
char g_hex[17] = {0};
int g_trim_ok = 0;
double g_trim_throttle = 0.0;
double g_trim_pitch = 0.0;
int g_mixture_auto = 1;
int g_ap_mode = 0;
double g_ap_heading_target = 0.0;

bool finite_all(std::initializer_list<double> v) {
  for (double x : v) if (!std::isfinite(x)) return false;
  return true;
}

// Reuse the upstream modern roll AP only. Legacy c172ap channels remain off;
// no altitude hold, replacement controller or new tuning coefficients are added.
void configure_autopilot() {
  auto& f = *g_fdm;
  for (const char* name : {"ap/heading_hold", "ap/altitude_hold", "ap/attitude_hold",
                           "ap/airspeed_hold", "ap/aileron_cmd", "ap/elevator_cmd"}) {
    f.SetPropertyValue(name, 0.0);
  }
  f.SetPropertyValue("ap/autopilot-roll-on", g_ap_mode == 0 ? 0.0 : 1.0);
  f.SetPropertyValue("ap/roll-attitude-mode", g_ap_mode == 2 ? 1.0 : 0.0);
  f.SetPropertyValue("guidance/heading-selector-switch", 1.0);
  f.SetPropertyValue("guidance/specified-heading-rad", g_ap_heading_target);
  f.SetPropertyValue("navigation/actual-heading-rad", f.GetPropertyValue("attitude/heading-true-rad"));
  if (g_ap_mode == 0) f.SetPropertyValue("ap/roll-cmd-norm-output", 0.0);
}

void reset_ap_integrators() {
  auto& f = *g_fdm;
  for (const char* name : {"ap/roll-rate-pid-control/initial-integrator-value",
                           "ap/roll-command-pid-control/initial-integrator-value"}) {
    if (f.GetPropertyManager()->HasNode(name)) f.SetPropertyValue(name, 0.0);
  }
  f.SetPropertyValue("ap/roll-cmd-norm-output", 0.0);
}

void read_state() {
  JSBSim::FGFDMExec& f = *g_fdm;
  g_state[0] = f.GetPropertyValue("simulation/sim-time-sec");
  g_state[1] = f.GetPropertyValue("position/lat-geod-rad");
  g_state[2] = f.GetPropertyValue("position/long-gc-rad");
  g_state[3] = f.GetPropertyValue("position/h-sl-ft") * kFtToM;
  g_state[4] = f.GetPropertyValue("attitude/phi-rad");
  g_state[5] = f.GetPropertyValue("attitude/theta-rad");
  g_state[6] = f.GetPropertyValue("attitude/psi-rad");
  g_state[7] = f.GetPropertyValue("velocities/vtrue-fps") * kFtToM;
  g_state[8] = f.GetPropertyValue("velocities/u-fps") * kFtToM;
  g_state[9] = f.GetPropertyValue("velocities/v-fps") * kFtToM;
  g_state[10] = f.GetPropertyValue("velocities/w-fps") * kFtToM;
  g_state[11] = f.GetPropertyValue("velocities/p-rad_sec");
  g_state[12] = f.GetPropertyValue("velocities/q-rad_sec");
  g_state[13] = f.GetPropertyValue("velocities/r-rad_sec");
}

void hash_state() {
  for (int i = 0; i < kStateLen; ++i) {
    unsigned char b[8];
    std::memcpy(b, &g_state[i], 8);  // wasm32 is little-endian
    for (unsigned char c : b) { g_hash ^= c; g_hash *= 1099511628211ULL; }
  }
}

int load_model(double dt_s, double lat_rad, double lon_rad, double heading_rad) {
  JSBSim::FGJSBBase::debug_lvl = 0;
  g_fdm = std::make_unique<JSBSim::FGFDMExec>();
  JSBSim::FGFDMExec& f = *g_fdm;
  f.SetDebugLevel(0);
  f.SetRootDir(SGPath("/jsbsim"));  // embedded at build time (build.sh)
  if (!f.LoadModel(SGPath("aircraft"), SGPath("engine"), SGPath("systems"), "c172x")) {
    g_fdm.reset();
    return kErrLoad;
  }
  g_mixture_auto = 1; g_ap_mode = 0; g_ap_heading_target = std::fmod(heading_rad, 2.0 * kPi);
  if (g_ap_heading_target < 0) g_ap_heading_target += 2.0 * kPi;
  f.SetPropertyValue("systems/automatic-mixture-enabled", 1.0);
  configure_autopilot();
  // c172x declares a CSV output that JSBSim opens at RunIC even when disabled.
  f.SetOutputFileName(0, "/dev/null");
  f.DisableOutput();
  f.Setdt(dt_s);
  f.SetPropertyValue("ic/lat-geod-rad", lat_rad);
  f.SetPropertyValue("ic/long-gc-rad", lon_rad);
  return 0;
}

void reset_study_state() {
  g_hash = 1469598103934665603ULL;
  g_steps = 0.0;
  read_state();
}

}  // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE int gf_init(double dt_s, double lat_rad, double lon_rad,
                                 double alt_msl_m, double heading_rad, double tas_mps) {
  if (!finite_all({dt_s, lat_rad, lon_rad, alt_msl_m, heading_rad, tas_mps})) return kErrNonFinite;
  if (!(dt_s > 0.0 && dt_s <= 0.1) || std::fabs(lat_rad) > kPi / 2 || std::fabs(lon_rad) > kPi ||
      tas_mps < 0.0) return kErrRange;
  const int rc = load_model(dt_s, lat_rad, lon_rad, heading_rad);
  if (rc != 0) return rc;
  auto& f = *g_fdm;
  f.SetPropertyValue("ic/h-sl-ft", alt_msl_m / kFtToM);
  f.SetPropertyValue("ic/vt-kts", tas_mps / kKtToMps);
  f.SetPropertyValue("ic/psi-true-rad", heading_rad);
  f.SetPropertyValue("ic/gamma-deg", 0.0);
  f.SetPropertyValue("fcs/mixture-cmd-norm", 1.0);
  f.SetPropertyValue("propulsion/magneto_cmd", 3);
  if (!f.RunIC()) { g_fdm.reset(); return kErrRunIc; }
  f.SetPropertyValue("propulsion/set-running", -1);
  // Longitudinal trim (JSBSim mode 0) so a neutral elevator command holds
  // approximately level flight; the result lands in fcs/pitch-trim-cmd-norm,
  // which later elevator inputs add to. Trim failure is reported, not fatal;
  // a failed trim may leave partially adjusted state/controls (not rolled back).
  g_trim_ok = 0;
  try {
    f.SetPropertyValue("fcs/throttle-cmd-norm", 0.7);
    f.SetPropertyValue("simulation/do_simple_trim", 0);
    g_trim_ok = 1;
  } catch (...) {
    g_trim_ok = -1;
  }
  g_trim_throttle = f.GetPropertyValue("fcs/throttle-cmd-norm");
  g_trim_pitch = f.GetPropertyValue("fcs/pitch-trim-cmd-norm");
  reset_study_state();
  return 0;
}

// Flat ellipsoid landing demonstrations, not aircraft procedures or limits.
// 1 baseline, 2 faster descent, 3 sideways, 4 right bank. All share CG AGL 3 m,
// 28 m/s horizontal forward speed and 4 deg nose-up attitude. NED velocity
// setters preserve the specified ground motion independently of attitude;
// airborne longitudinal trim is deliberately NOT run over these fixtures.
EMSCRIPTEN_KEEPALIVE int gf_init_landing(double dt_s, double lat_rad, double lon_rad,
                                         double heading_rad, double preset) {
  if (!finite_all({dt_s, lat_rad, lon_rad, heading_rad, preset})) return kErrNonFinite;
  if (!(dt_s > 0.0 && dt_s <= 0.1) || std::fabs(lat_rad) > kPi / 2 || std::fabs(lon_rad) > kPi ||
      (preset != 1 && preset != 2 && preset != 3 && preset != 4)) return kErrRange;
  const int rc = load_model(dt_s, lat_rad, lon_rad, heading_rad);
  if (rc != 0) return rc;
  auto& f = *g_fdm;
  f.SetPropertyValue("ic/terrain-elevation-ft", 0.0);
  f.SetPropertyValue("ic/h-agl-ft", 3.0 / kFtToM);
  f.SetPropertyValue("ic/psi-true-rad", heading_rad);
  f.SetPropertyValue("ic/theta-rad", 4.0 * kPi / 180.0);
  f.SetPropertyValue("ic/phi-rad", preset == 4 ? 8.0 * kPi / 180.0 : 0.0);
  const double side = preset == 3 ? 4.0 : 0.0;
  f.SetPropertyValue("ic/vn-fps", (28.0 * std::cos(heading_rad) - side * std::sin(heading_rad)) / kFtToM);
  f.SetPropertyValue("ic/ve-fps", (28.0 * std::sin(heading_rad) + side * std::cos(heading_rad)) / kFtToM);
  f.SetPropertyValue("ic/vd-fps", (preset == 2 ? 4.0 : 1.5) / kFtToM);
  f.SetPropertyValue("fcs/mixture-cmd-norm", 1.0);
  f.SetPropertyValue("fcs/throttle-cmd-norm", 0.0);
  f.SetPropertyValue("fcs/pitch-trim-cmd-norm", 0.0);
  f.SetPropertyValue("propulsion/magneto_cmd", 3);
  if (!f.RunIC()) { g_fdm.reset(); return kErrRunIc; }
  f.SetPropertyValue("propulsion/set-running", -1);
  g_trim_ok = 0;  // deliberately not attempted
  g_trim_throttle = f.GetPropertyValue("fcs/throttle-cmd-norm");
  g_trim_pitch = f.GetPropertyValue("fcs/pitch-trim-cmd-norm");
  reset_study_state();
  return 0;
}

// Normalized JSBSim command properties (fcs/*-cmd-norm); sign conventions are
// JSBSim's, not verified against a specific aircraft control rig.
EMSCRIPTEN_KEEPALIVE int gf_set_inputs(double elevator, double aileron, double rudder,
                                       double throttle) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({elevator, aileron, rudder, throttle})) return kErrNonFinite;
  if (std::fabs(elevator) > 1 || std::fabs(aileron) > 1 || std::fabs(rudder) > 1 ||
      throttle < 0 || throttle > 1) return kErrRange;
  JSBSim::FGFDMExec& f = *g_fdm;
  f.SetPropertyValue("fcs/elevator-cmd-norm", elevator);
  f.SetPropertyValue("fcs/aileron-cmd-norm", aileron);
  f.SetPropertyValue("fcs/rudder-cmd-norm", rudder);
  // In this pinned model positive rudder produces left yaw, while positive
  // steering angle points the nosewheel right. Couple their turning directions.
  f.SetPropertyValue("fcs/steer-cmd-norm", -rudder);
  f.SetPropertyValue("fcs/throttle-cmd-norm", throttle);
  return 0;
}

// Existing generic c172x flap/gear controls. Normalized commands, not new
// aerodynamic coefficients; flaps traverse 0..30 degrees in the model itself.
EMSCRIPTEN_KEEPALIVE int gf_set_secondary_inputs(double flap_norm, double brake_norm) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({flap_norm, brake_norm})) return kErrNonFinite;
  if (flap_norm < 0 || flap_norm > 1 || brake_norm < 0 || brake_norm > 1) return kErrRange;
  g_fdm->SetPropertyValue("fcs/flap-cmd-norm", flap_norm);
  g_fdm->SetPropertyValue("fcs/left-brake-cmd-norm", brake_norm);
  g_fdm->SetPropertyValue("fcs/right-brake-cmd-norm", brake_norm);
  return 0;
}

// The pinned generic c172x sums normalized pitch trim with elevator input.
// Positive is nose-down, negative nose-up; this is not a trim-tab angle.
// No input/reset path changes the longitudinal trim captured by gf_init.
EMSCRIPTEN_KEEPALIVE int gf_set_pitch_trim(double norm) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({norm})) return kErrNonFinite;
  if (norm < -1 || norm > 1) return kErrRange;
  g_fdm->SetPropertyValue("fcs/pitch-trim-cmd-norm", norm);
  return 0;
}

// Manual mixture gates the existing automatic channel in the prepared model.
// The original auto-mixture formula and all engine coefficients are unchanged.
EMSCRIPTEN_KEEPALIVE int gf_set_engine_controls(double mixture_norm, double mixture_auto) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({mixture_norm, mixture_auto})) return kErrNonFinite;
  if (mixture_norm < 0 || mixture_norm > 1 || (mixture_auto != 0 && mixture_auto != 1)) return kErrRange;
  if (!g_fdm->GetPropertyManager()->HasNode("systems/automatic-mixture-enabled")) return kErrLoad;
  g_mixture_auto = static_cast<int>(mixture_auto);
  g_fdm->SetPropertyValue("systems/automatic-mixture-enabled", mixture_auto);
  if (g_mixture_auto == 0) g_fdm->SetPropertyValue("fcs/mixture-cmd-norm", mixture_norm);
  return 0;
}

EMSCRIPTEN_KEEPALIVE int gf_set_autopilot(double mode, double target_true_rad) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({mode, target_true_rad})) return kErrNonFinite;
  if (mode != 0 && mode != 1 && mode != 2) return kErrRange;
  const int next_mode = static_cast<int>(mode);
  if (g_ap_mode != next_mode) reset_ap_integrators();
  g_ap_mode = next_mode;
  g_ap_heading_target = std::fmod(target_true_rad, 2.0 * kPi);
  if (g_ap_heading_target < 0) g_ap_heading_target += 2.0 * kPi;
  configure_autopilot();
  return 0;
}

EMSCRIPTEN_KEEPALIVE int gf_step() {
  if (!g_fdm) return kErrNotInit;
  configure_autopilot();
  if (!g_fdm->Run()) return kErrRun;
  g_steps += 1.0;
  read_state();
  hash_state();
  return 0;
}

EMSCRIPTEN_KEEPALIVE double* gf_state() { return g_state; }
EMSCRIPTEN_KEEPALIVE int gf_state_len() { return kStateLen; }
EMSCRIPTEN_KEEPALIVE double gf_step_index() { return g_steps; }
// Read-only atmosphere accessors. Kept outside the original 14-double study
// state/digest: adding an instrument must not alter the dynamics benchmark.
EMSCRIPTEN_KEEPALIVE double gf_flap_command_norm() {
  return g_fdm ? g_fdm->GetPropertyValue("fcs/flap-cmd-norm")
               : std::numeric_limits<double>::quiet_NaN();
}
EMSCRIPTEN_KEEPALIVE double gf_static_pressure_pa() {
  return g_fdm ? g_fdm->GetPropertyValue("atmosphere/P-psf") * kPsfToPa
               : std::numeric_limits<double>::quiet_NaN();
}
EMSCRIPTEN_KEEPALIVE double gf_sealevel_pressure_pa() {
  return g_fdm ? g_fdm->GetPropertyValue("atmosphere/P-sl-psf") * kPsfToPa
               : std::numeric_limits<double>::quiet_NaN();
}

// Read-only cockpit values, separate from the original study dynamics digest.
// CAS m/s, true heading rate rad/s, pilot specific force body Y/Z in g,
// actual flap rad, left/right normalized brake commands, weight-on-wheels 0/1.
EMSCRIPTEN_KEEPALIVE double* gf_cockpit_state() {
  static double values[8];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  auto& f = *g_fdm;
  values[0] = f.GetPropertyValue("velocities/vc-fps") * kFtToM;
  values[1] = f.GetPropertyValue("velocities/psidot-rad_sec");
  values[2] = f.GetPropertyValue("accelerations/n-pilot-y-norm");
  values[3] = f.GetPropertyValue("accelerations/n-pilot-z-norm");
  values[4] = f.GetPropertyValue("fcs/flap-pos-deg") * kPi / 180.0;
  values[5] = f.GetPropertyValue("fcs/left-brake-cmd-norm");
  values[6] = f.GetPropertyValue("fcs/right-brake-cmd-norm");
  values[7] = f.GetPropertyValue("gear/wow") > 0 ? 1.0 : 0.0;
  return values;
}

// Actual applied normalized trim command, initial longitudinal-trim command,
// and actual elevator radians. Separate from the original dynamics digest.
EMSCRIPTEN_KEEPALIVE double* gf_pitch_trim_state() {
  static double values[3];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  values[0] = g_fdm->GetPropertyValue("fcs/pitch-trim-cmd-norm");
  values[1] = g_trim_pitch;
  values[2] = g_fdm->GetPropertyValue("fcs/elevator-pos-rad");
  return values;
}

// CG AGL/geodetic ellipsoid height (m), horizontal heading-aligned forward and
// rightward velocities, NED down velocity (m/s), structure mask (tail/left/right
// bits 1/2/4); then nose/left/right WOW, compression m, strut load N, slip rad.
// Actual upstream contact quantities: no damage thresholds or added forces.
EMSCRIPTEN_KEEPALIVE double* gf_ground_state() {
  static double values[18];
  if (!g_fdm || g_fdm->GetGroundReactions()->GetNumGearUnits() != 6) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  auto& f = *g_fdm;
  auto gear = f.GetGroundReactions();
  const double heading = f.GetPropertyValue("attitude/heading-true-rad");
  const double north = f.GetPropertyValue("velocities/v-north-fps") * kFtToM;
  const double east = f.GetPropertyValue("velocities/v-east-fps") * kFtToM;
  values[0] = f.GetPropertyValue("position/h-agl-ft") * kFtToM;
  values[1] = f.GetPropertyValue("position/geod-alt-ft") * kFtToM;
  values[2] = north * std::cos(heading) + east * std::sin(heading);
  values[3] = -north * std::sin(heading) + east * std::cos(heading);
  values[4] = f.GetPropertyValue("velocities/v-down-fps") * kFtToM;
  values[5] = 0;
  for (int i = 0; i < 3; ++i) {
    if (gear->GetGearUnit(i + 3)->GetWOW()) values[5] += 1 << i;
    const auto unit = gear->GetGearUnit(i);
    values[6 + i * 4] = unit->GetWOW() ? 1.0 : 0.0;
    values[7 + i * 4] = unit->GetCompLen() * kFtToM;
    values[8 + i * 4] = -unit->GetCompForce() * kLbfToN;
    values[9 + i * 4] = unit->GetWheelSlipAngle() * kPi / 180.0;
  }
  return values;
}

// MAP Pa, prop/engine rad/s (fixed direct drive), applied mixture/auto state,
// oil Pa/K, EGT K, fuel m3/s and left/right m3, then AP mode/true target/raw output.
// These are upstream generic model values, not a validated C172S instrument fit.
EMSCRIPTEN_KEEPALIVE double* gf_engine_state() {
  static double values[13];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  auto& f = *g_fdm;
  values[0] = f.GetPropertyValue("propulsion/engine[0]/map-pa");
  values[1] = f.GetPropertyValue("propulsion/engine[0]/engine-rpm") * 2.0 * kPi / 60.0;
  values[2] = f.GetPropertyValue("fcs/mixture-cmd-norm");
  values[3] = g_mixture_auto;
  values[4] = f.GetPropertyValue("propulsion/engine[0]/oil-pressure-psi") * kPsiToPa;
  values[5] = (f.GetPropertyValue("propulsion/engine[0]/oil-temperature-degF") - 32.0) * 5.0 / 9.0 + 273.15;
  values[6] = (f.GetPropertyValue("propulsion/engine[0]/egt-degF") - 32.0) * 5.0 / 9.0 + 273.15;
  values[7] = f.GetPropertyValue("propulsion/engine[0]/fuel-flow-rate-gph") * kUsGalToM3 / 3600.0;
  values[8] = f.GetPropertyValue("propulsion/tank[0]/contents-volume-gal") * kUsGalToM3;
  values[9] = f.GetPropertyValue("propulsion/tank[1]/contents-volume-gal") * kUsGalToM3;
  values[10] = g_ap_mode;
  values[11] = g_ap_heading_target;
  values[12] = f.GetPropertyValue("ap/roll-cmd-norm-output");
  return values;
}

// 1 trimmed, -1 trim threw (state and controls are whatever the partial trim
// left, not restored to the post-RunIC state), 0 not attempted.
EMSCRIPTEN_KEEPALIVE int gf_trim_status() { return g_trim_ok; }
EMSCRIPTEN_KEEPALIVE double gf_trim_throttle() { return g_trim_throttle; }
EMSCRIPTEN_KEEPALIVE double gf_trim_pitch() { return g_trim_pitch; }

EMSCRIPTEN_KEEPALIVE const char* gf_digest_hex() {
  std::snprintf(g_hex, sizeof g_hex, "%016llx", static_cast<unsigned long long>(g_hash));
  return g_hex;
}

}  // extern "C"
