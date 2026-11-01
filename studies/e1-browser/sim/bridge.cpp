// E1 browser check: minimal C bridge between JSBSim (v1.3.3) and a Web Worker.
// Study code, not a product component. All values crossing this boundary are SI
// (m, m/s, rad, s); JSBSim's ft/kt units are converted here, once.
//
// Exports (C ABI, called from worker.js through the Emscripten module):
//   int     gf_init(dt_s, lat_rad, lon_rad, alt_msl_m, heading_rad, tas_mps)
//   int     gf_set_inputs(elevator, aileron, rudder, throttle)
//   int     gf_step()                 advance exactly one fixed step
//   double* gf_state()                pointer to kStateLen doubles (see below)
//   double  gf_step_index()           completed steps since init
//   int     gf_trim_status(), double gf_trim_throttle(), gf_trim_pitch()
//   const char* gf_digest_hex()       FNV-1a 64 over every post-step state
// Return codes: 0 ok, negative = error (see kErr*).
#include <FGFDMExec.h>
#include <FGJSBBase.h>
#include <simgear/misc/sg_path.hxx>
#include <emscripten/emscripten.h>

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <initializer_list>
#include <memory>

namespace {

constexpr double kFtToM = 0.3048;            // exact
constexpr double kKtToMps = 1852.0 / 3600.0; // exact
constexpr double kPi = 3.141592653589793;

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

bool finite_all(std::initializer_list<double> v) {
  for (double x : v) if (!std::isfinite(x)) return false;
  return true;
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

}  // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE int gf_init(double dt_s, double lat_rad, double lon_rad,
                                 double alt_msl_m, double heading_rad, double tas_mps) {
  if (!finite_all({dt_s, lat_rad, lon_rad, alt_msl_m, heading_rad, tas_mps})) return kErrNonFinite;
  if (!(dt_s > 0.0 && dt_s <= 0.1) || std::fabs(lat_rad) > kPi / 2 || std::fabs(lon_rad) > kPi ||
      tas_mps < 0.0) return kErrRange;
  JSBSim::FGJSBBase::debug_lvl = 0;
  g_fdm = std::make_unique<JSBSim::FGFDMExec>();
  JSBSim::FGFDMExec& f = *g_fdm;
  f.SetDebugLevel(0);
  f.SetRootDir(SGPath("/jsbsim"));  // embedded at build time (build.sh)
  if (!f.LoadModel(SGPath("aircraft"), SGPath("engine"), SGPath("systems"), "c172x")) {
    g_fdm.reset();
    return kErrLoad;
  }
  // c172x declares a CSV output that JSBSim opens at RunIC even when disabled.
  f.SetOutputFileName(0, "/dev/null");
  f.DisableOutput();
  f.Setdt(dt_s);
  f.SetPropertyValue("ic/lat-geod-rad", lat_rad);
  f.SetPropertyValue("ic/long-gc-rad", lon_rad);
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
  // which later elevator inputs add to. Trim failure is reported, not fatal.
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
  g_hash = 1469598103934665603ULL;
  g_steps = 0.0;
  read_state();
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
  f.SetPropertyValue("fcs/throttle-cmd-norm", throttle);
  return 0;
}

EMSCRIPTEN_KEEPALIVE int gf_step() {
  if (!g_fdm) return kErrNotInit;
  if (!g_fdm->Run()) return kErrRun;
  g_steps += 1.0;
  read_state();
  hash_state();
  return 0;
}

EMSCRIPTEN_KEEPALIVE double* gf_state() { return g_state; }
EMSCRIPTEN_KEEPALIVE int gf_state_len() { return kStateLen; }
EMSCRIPTEN_KEEPALIVE double gf_step_index() { return g_steps; }
// 1 trimmed, -1 trim failed (state as after RunIC), 0 not attempted.
EMSCRIPTEN_KEEPALIVE int gf_trim_status() { return g_trim_ok; }
EMSCRIPTEN_KEEPALIVE double gf_trim_throttle() { return g_trim_throttle; }
EMSCRIPTEN_KEEPALIVE double gf_trim_pitch() { return g_trim_pitch; }

EMSCRIPTEN_KEEPALIVE const char* gf_digest_hex() {
  std::snprintf(g_hex, sizeof g_hex, "%016llx", static_cast<unsigned long long>(g_hash));
  return g_hex;
}

}  // extern "C"
