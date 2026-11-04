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
#include <models/FGInertial.h>
#include <models/FGPropagate.h>
#include <models/FGPropulsion.h>
#include <models/propulsion/FGPropeller.h>
#include <models/propulsion/FGTank.h>
#include <input_output/FGGroundCallback.h>
#include <simgear/misc/sg_path.hxx>
#include <emscripten/emscripten.h>
#include <emscripten/heap.h>
#include "terrain-grid.h"

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
constexpr int kErrTerrainCoverage = -7;

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
bool g_engine_switch_controlled = false;
bool g_engine_command_on = true;
bool g_engine_start_requested = false;
int g_ap_mode = 0;
int g_ap_vertical_mode = 0;
double g_ap_vertical_target = 0.0;
double g_ap_heading_target = 0.0;
std::shared_ptr<gefly::TerrainAtlas> g_pending_terrain;
std::shared_ptr<gefly::TerrainAtlas> g_active_terrain;
bool g_terrain_query_failed = false;

class GridGroundCallback final : public JSBSim::FGGroundCallback {
 public:
  GridGroundCallback(std::shared_ptr<gefly::TerrainAtlas> grid, double a, double b)
      : grid_(std::move(grid)), a_(a), b_(b) {}
  void SetEllipse(double a, double b) override { a_ = a; b_ = b; }
  // Source DEM is immutable. IC terrain setters cannot overwrite its datum.
  void SetTerrainElevation(double) override {}
  double GetAGLevel(double, const JSBSim::FGLocation& location, JSBSim::FGLocation& contact,
      JSBSim::FGColumnVector3& normal, JSBSim::FGColumnVector3& velocity,
      JSBSim::FGColumnVector3& angularVelocity) const override {
    JSBSim::FGLocation point = location; point.SetEllipse(a_, b_);
    velocity.InitMatrix(); angularVelocity.InitMatrix(); contact = point;
    const double longitude = point.GetLongitude(), latitude = point.GetGeodLatitudeRad();
    const auto sample = grid_->sample(longitude, latitude);
    if (!sample) { g_terrain_query_failed = true; normal.InitMatrix(); return std::numeric_limits<double>::quiet_NaN(); }
    std::array<double, 3> outward;
    try { outward = gefly::terrainNormal(longitude, latitude, a_ * kFtToM, b_ * kFtToM, *sample); }
    catch (const std::exception&) { g_terrain_query_failed = true; normal.InitMatrix(); return std::numeric_limits<double>::quiet_NaN(); }
    normal = JSBSim::FGColumnVector3(outward[0], outward[1], outward[2]);
    contact.SetEllipse(a_, b_); contact.SetPositionGeodetic(longitude, latitude, sample->height_m / kFtToM);
    return point.GetGeodAltitude() - sample->height_m / kFtToM;
  }
 private:
  std::shared_ptr<gefly::TerrainAtlas> grid_;
  double a_, b_;
};

bool terrain_support_available() {
  if (!g_fdm || !g_active_terrain || g_terrain_query_failed) return false;
  const auto propagate = g_fdm->GetPropagate();
  const auto& location = propagate->GetLocation();
  if (!g_active_terrain->contains(location.GetLongitude(), location.GetGeodLatitudeRad())) return false;
  const auto gear = g_fdm->GetGroundReactions();
  for (unsigned i = 0; i < gear->GetNumGearUnits(); ++i) {
    auto point = location.LocalToLocation(propagate->GetTb2l() * gear->GetGearUnit(i)->GetBodyLocation());
    point.SetEllipse(g_fdm->GetInertial()->GetSemimajor(), g_fdm->GetInertial()->GetSemiminor());
    if (!g_active_terrain->contains(point.GetLongitude(), point.GetGeodLatitudeRad())) return false;
  }
  return true;
}

// A missing JSBSim property must stay unavailable. FGFDMExec::GetPropertyValue
// returns 0 for a missing node, which would become a plausible reading (for
// example 0 degF = 255.37 K oil temperature). NaN makes the JS group reject it.
double property_or_nan(const char* name) {
  if (!g_fdm || !g_fdm->GetPropertyManager()->HasNode(name))
    return std::numeric_limits<double>::quiet_NaN();
  return g_fdm->GetPropertyValue(name);
}

// Contact identities come from the c172x <contact name> entries, never from
// their order: nose/left/right wheels, then tail skid/left tip/right tip.
// Returns false unless each name occurs exactly once among the gear units.
constexpr const char* kContactNames[6] = {"Nose Gear", "Left Main Gear", "Right Main Gear",
                                          "TAIL_SKID", "LEFT_TIP", "RIGHT_TIP"};
bool resolve_contacts(unsigned (&index)[6]) {
  if (!g_fdm) return false;
  const auto gear = g_fdm->GetGroundReactions();
  for (int k = 0; k < 6; ++k) {
    int found = 0;
    for (unsigned i = 0; i < gear->GetNumGearUnits(); ++i)
      if (gear->GetGearUnit(i)->GetName() == kContactNames[k]) { index[k] = i; ++found; }
    if (found != 1) return false;
  }
  return true;
}

bool finite_all(std::initializer_list<double> v) {
  for (double x : v) if (!std::isfinite(x)) return false;
  return true;
}

// Reuse the upstream modern roll and generic c172x pitch controllers.
// The prepared pitch adapter changes wiring, not upstream gains.
void configure_autopilot() {
  auto& f = *g_fdm;
  for (const char* name : {"ap/heading_hold", "ap/attitude_hold",
                           "ap/airspeed_hold", "ap/aileron_cmd"}) {
    f.SetPropertyValue(name, 0.0);
  }
  f.SetPropertyValue("ap/altitude_hold", g_ap_vertical_mode == 0 ? 0.0 : 1.0);
  f.SetPropertyValue("ap/gefly-vs-mode", g_ap_vertical_mode == 1 ? 1.0 : 0.0);
  if (g_ap_vertical_mode == 1) f.SetPropertyValue("ap/gefly-vs-command-fps", g_ap_vertical_target / kFtToM);
  // Keep the inactive altitude-error filter near zero to avoid stale targets
  // when changing from VS or OFF into altitude hold.
  f.SetPropertyValue("ap/altitude_setpoint", g_ap_vertical_mode == 2
    ? g_ap_vertical_target / kFtToM : f.GetPropertyValue("position/h-sl-ft"));
  if (g_ap_vertical_mode == 0) f.SetPropertyValue("ap/elevator_cmd", 0.0);
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
  g_state[3] = f.GetPropertyValue(g_active_terrain ? "position/geod-alt-ft" : "position/h-sl-ft") * kFtToM;
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
  g_mixture_auto = 1; g_ap_mode = 0; g_ap_vertical_mode = 0; g_ap_vertical_target = 0.0; g_ap_heading_target = std::fmod(heading_rad, 2.0 * kPi);
  g_engine_switch_controlled = false; g_engine_command_on = true; g_engine_start_requested = false;
  if (g_ap_heading_target < 0) g_ap_heading_target += 2.0 * kPi;
  f.SetPropertyValue("systems/automatic-mixture-enabled", 1.0);
  configure_autopilot();
  // c172x declares a CSV output that JSBSim opens at RunIC even when disabled.
  f.SetOutputFileName(0, "/dev/null");
  f.DisableOutput();
  f.Setdt(dt_s);
  f.SetPropertyValue("ic/lat-geod-rad", lat_rad);
  f.SetPropertyValue("ic/long-gc-rad", lon_rad);
  g_active_terrain = g_pending_terrain; g_terrain_query_failed = false;
  if (g_active_terrain) {
    auto inertial = f.GetInertial();
    inertial->SetGroundCallback(new GridGroundCallback(g_active_terrain, inertial->GetSemimajor(), inertial->GetSemiminor()));
  }
  return 0;
}

void reset_study_state() {
  g_hash = 1469598103934665603ULL;
  g_steps = 0.0;
  read_state();
}

}  // namespace

extern "C" {

// Caller-owned Float64 metres are copied; staged data affects the next init only.
EMSCRIPTEN_KEEPALIVE int gf_configure_terrain_grid(double west, double south, double east, double north,
    double width, double height, const double* values, double count) {
  if (!finite_all({west, south, east, north, width, height, count})) return kErrNonFinite;
  if (width < 2 || height < 2 || count < 4 || std::floor(width) != width || std::floor(height) != height
      || std::floor(count) != count || count > gefly::TerrainGrid::kMaxPoints
      || width > gefly::TerrainGrid::kMaxPoints || height > gefly::TerrainGrid::kMaxPoints) return kErrRange;
  const uintptr_t address = reinterpret_cast<uintptr_t>(values), bytes = static_cast<size_t>(count) * sizeof(double);
  const size_t heap = emscripten_get_heap_size();
  if (!address || address % alignof(double) || address > heap || bytes > heap - address) return kErrRange;
  try {
    auto fine = std::make_shared<const gefly::TerrainGrid>(west, south, east, north,
      static_cast<size_t>(width), static_cast<size_t>(height), values, static_cast<size_t>(count));
    g_pending_terrain = std::make_shared<gefly::TerrainAtlas>(fine);
    return 0;
  } catch (const std::exception&) { return kErrRange; }
}
// Caller installs or removes a complete tile only between simulation steps.
EMSCRIPTEN_KEEPALIVE int gf_set_terrain_tile(int id, double west, double south, double east, double north,
    double width, double height, const double* values, double count) {
  if (!g_pending_terrain || id < 0 || id >= 56 || !finite_all({west,south,east,north,width,height,count})
      || width != 129 || height != 129 || count != 129 * 129) return kErrRange;
  const uintptr_t address = reinterpret_cast<uintptr_t>(values);
  const size_t bytes = static_cast<size_t>(count) * sizeof(double), heap = emscripten_get_heap_size();
  if (!address || address % alignof(double) || address > heap || bytes > heap - address) return kErrRange;
  try {
    auto tile = std::make_shared<const gefly::TerrainGrid>(west,south,east,north,129,129,values,129*129);
    g_pending_terrain->set(id, std::move(tile));
    return 0;
  } catch (const std::exception&) { return kErrRange; }
}
EMSCRIPTEN_KEEPALIVE int gf_remove_terrain_tile(int id) {
  if (!g_pending_terrain || id < 0 || id >= 56) return kErrRange;
  g_pending_terrain->remove(id); return 0;
}
EMSCRIPTEN_KEEPALIVE int gf_clear_terrain_grid() { g_pending_terrain.reset(); return 0; }
EMSCRIPTEN_KEEPALIVE int gf_terrain_available() { return terrain_support_available() ? 1 : 0; }
// Read-only sample for cross-runtime terrain/normal verification.
EMSCRIPTEN_KEEPALIVE const double* gf_terrain_sample(double longitude, double latitude) {
  static double result[3];
  const auto sample = g_active_terrain ? g_active_terrain->sample(longitude, latitude) : std::nullopt;
  result[0] = sample ? sample->height_m : std::numeric_limits<double>::quiet_NaN();
  result[1] = sample ? sample->dh_dlon_m : std::numeric_limits<double>::quiet_NaN();
  result[2] = sample ? sample->dh_dlat_m : std::numeric_limits<double>::quiet_NaN();
  return result;
}
EMSCRIPTEN_KEEPALIVE double gf_terrain_height_m(double longitude, double latitude) {
  if (g_active_terrain) {
    const auto sample = g_active_terrain->sample(longitude, latitude);
    if (sample) return sample->height_m;
  }
  return std::numeric_limits<double>::quiet_NaN();
}

EMSCRIPTEN_KEEPALIVE int gf_init(double dt_s, double lat_rad, double lon_rad,
                                 double alt_msl_m, double heading_rad, double tas_mps) {
  if (!finite_all({dt_s, lat_rad, lon_rad, alt_msl_m, heading_rad, tas_mps})) return kErrNonFinite;
  if (!(dt_s > 0.0 && dt_s <= 0.1) || std::fabs(lat_rad) > kPi / 2 || std::fabs(lon_rad) > kPi ||
      tas_mps < 0.0) return kErrRange;
  if (g_pending_terrain && !g_pending_terrain->contains(lon_rad, lat_rad)) {
    g_fdm.reset(); g_active_terrain.reset(); g_terrain_query_failed = true; return kErrTerrainCoverage;
  }
  const int rc = load_model(dt_s, lat_rad, lon_rad, heading_rad);
  if (rc != 0) return rc;
  auto& f = *g_fdm;
  f.SetPropertyValue("ic/h-sl-ft", alt_msl_m / kFtToM);
  f.SetPropertyValue("ic/vt-kts", tas_mps / kKtToMps);
  f.SetPropertyValue("ic/psi-true-rad", heading_rad);
  f.SetPropertyValue("ic/gamma-deg", 0.0);
  f.SetPropertyValue("fcs/mixture-cmd-norm", 1.0);
  f.SetPropertyValue("propulsion/magneto_cmd", 3);
  const bool ran_ic = f.RunIC();
  if (g_terrain_query_failed) { g_fdm.reset(); return kErrTerrainCoverage; }
  if (!ran_ic) { g_fdm.reset(); return kErrRunIc; }
  if (g_active_terrain && !terrain_support_available()) { g_fdm.reset(); return kErrTerrainCoverage; }
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
  if (g_terrain_query_failed) { g_fdm.reset(); return kErrTerrainCoverage; }
  g_trim_throttle = f.GetPropertyValue("fcs/throttle-cmd-norm");
  g_trim_pitch = f.GetPropertyValue("fcs/pitch-trim-cmd-norm");
  reset_study_state();
  return 0;
}

// Reconstruct exposed trace state. Integrators, engine thermal transients and
// contact histories are fresh; this is deliberately not a serialized checkpoint.
EMSCRIPTEN_KEEPALIVE int gf_init_resume(double dt_s, const double* v, double count) {
  const uintptr_t address = reinterpret_cast<uintptr_t>(v);
  if (count != 32 || !address || address % alignof(double) || address > emscripten_get_heap_size()
      || 32*sizeof(double) > emscripten_get_heap_size()-address) return kErrRange;
  for (int i=0;i<32;++i) if (!std::isfinite(v[i])) return kErrNonFinite;
  if (!(dt_s>=1e-4 && dt_s<=1.0/60) || v[0]<0 || v[0]>1e9 || v[1]<0 || v[1]>1e9 || std::floor(v[1])!=v[1]
      || std::fabs(v[2])>kPi/2 || std::fabs(v[3])>kPi || v[4]<-1000 || v[4]>11000
      || std::fabs(v[5])>kPi || std::fabs(v[6])>kPi/2 || std::fabs(v[7])>2*kPi) return kErrRange;
  for (int i=8;i<11;++i) if(std::fabs(v[i])>200) return kErrRange;
  for (int i=11;i<14;++i) if(std::fabs(v[i])>20) return kErrRange;
  for (int i=14;i<17;++i) if(std::fabs(v[i])>1) return kErrRange;
  if(v[17]<0||v[17]>1||std::fabs(v[18])>1||std::fabs(v[19])>1||v[20]<0||v[20]>1
      ||v[21]<-1e-6||v[21]>kPi/6+1e-6||v[22]<0||v[22]>1||v[23]<0||v[23]>1||v[24]<0||v[24]>1
      ||(v[25]!=0&&v[25]!=1)||(v[26]!=0&&v[26]!=1)||(v[27]!=0&&v[27]!=1)
      ||v[28]<0||v[28]>500||v[29]<0||v[29]>.2||v[30]<0||v[30]>.2) return kErrRange;
  if(g_pending_terrain&&!g_pending_terrain->contains(v[3],v[2]))return kErrTerrainCoverage;
  const int rc=load_model(dt_s,v[2],v[3],v[7]);if(rc)return rc;
  auto& f=*g_fdm;
  if(g_active_terrain){
    const auto sample=g_active_terrain->sample(v[3],v[2]);if(!sample)return kErrTerrainCoverage;
    f.SetPropertyValue("ic/h-agl-ft",(v[4]-sample->height_m)/kFtToM);
  }else f.SetPropertyValue("ic/h-sl-ft",v[4]/kFtToM);
  f.SetPropertyValue("ic/phi-rad",v[5]);f.SetPropertyValue("ic/theta-rad",v[6]);f.SetPropertyValue("ic/psi-true-rad",v[7]);
  const char* velocity[]={"ic/u-fps","ic/v-fps","ic/w-fps","ic/p-rad_sec","ic/q-rad_sec","ic/r-rad_sec"};
  for(int i=0;i<6;++i)f.SetPropertyValue(velocity[i],v[i+8]/(i<3?kFtToM:1));
  const char* controls[]={"fcs/elevator-cmd-norm","fcs/aileron-cmd-norm","fcs/rudder-cmd-norm","fcs/throttle-cmd-norm","fcs/pitch-trim-cmd-norm"};
  for(int i=0;i<5;++i)f.SetPropertyValue(controls[i],v[i+14]);
  f.SetPropertyValue("fcs/steer-cmd-norm",-v[16]);
  f.SetPropertyValue("fcs/flap-cmd-norm",v[20]);
  f.SetPropertyValue("fcs/left-brake-cmd-norm",v[22]);f.SetPropertyValue("fcs/right-brake-cmd-norm",v[23]);
  g_mixture_auto=static_cast<int>(v[25]);f.SetPropertyValue("systems/automatic-mixture-enabled",v[25]);f.SetPropertyValue("fcs/mixture-cmd-norm",v[24]);
  for(int i=0;i<2;++i){
    const auto tank=f.GetPropulsion()->GetTank(i);
    const double mass=v[29+i]/kUsGalToM3*tank->GetDensity();
    if(mass>tank->GetCapacity()+1e-8)return kErrRange;
    tank->SetContents(mass);
  }
  f.SetPropertyValue("propulsion/magneto_cmd",v[27]?3:0);
  if(!f.RunIC())return kErrRunIc;
  if(g_active_terrain&&!terrain_support_available())return kErrTerrainCoverage;
  f.SetPropertyValue("fcs/flap-pos-rad",std::max(0.0,v[21]));
  auto engine=f.GetPropulsion()->GetEngine(0);engine->SetRunning(v[26]==1);
  auto prop=dynamic_cast<JSBSim::FGPropeller*>(engine->GetThruster());if(!prop)return kErrLoad;
  prop->SetRPM(v[28]*60/(2*kPi));
  g_engine_switch_controlled=true;g_engine_command_on=v[27]==1;g_engine_start_requested=false;
  g_trim_ok=0;g_trim_throttle=v[17];g_trim_pitch=v[19];
  f.Setsim_time(v[0]);reset_study_state();g_steps=v[1];
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
  if (g_pending_terrain && !g_pending_terrain->contains(lon_rad, lat_rad)) {
    g_fdm.reset(); g_active_terrain.reset(); g_terrain_query_failed = true; return kErrTerrainCoverage;
  }
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
  const bool ran_ic = f.RunIC();
  if (g_terrain_query_failed) { g_fdm.reset(); return kErrTerrainCoverage; }
  if (!ran_ic) { g_fdm.reset(); return kErrRunIc; }
  if (g_active_terrain && !terrain_support_available()) { g_fdm.reset(); return kErrTerrainCoverage; }
  f.SetPropertyValue("propulsion/set-running", -1);
  g_trim_ok = 0;  // deliberately not attempted
  g_trim_throttle = f.GetPropertyValue("fcs/throttle-cmd-norm");
  g_trim_pitch = f.GetPropertyValue("fcs/pitch-trim-cmd-norm");
  reset_study_state();
  return 0;
}

// Stationary runway exercise. Settle the existing native gear under full brakes
// before publishing time zero; no invented gear spring/friction coefficients.
EMSCRIPTEN_KEEPALIVE int gf_init_runway(double dt_s, double lat_rad, double lon_rad,
                                       double heading_rad) {
  if (!finite_all({dt_s, lat_rad, lon_rad, heading_rad})) return kErrNonFinite;
  if (!(dt_s > 0.0 && dt_s <= 1.0 / 60.0) || std::fabs(lat_rad) > kPi/2 || std::fabs(lon_rad) > kPi) return kErrRange;
  if (g_pending_terrain && !g_pending_terrain->contains(lon_rad, lat_rad)) return kErrTerrainCoverage;
  const int rc = load_model(dt_s, lat_rad, lon_rad, heading_rad);
  if (rc != 0) return rc;
  auto& f = *g_fdm;
  f.SetPropertyValue("ic/h-agl-ft", 1.7 / kFtToM);
  f.SetPropertyValue("ic/psi-true-rad", heading_rad);
  f.SetPropertyValue("ic/vn-fps", 0); f.SetPropertyValue("ic/ve-fps", 0); f.SetPropertyValue("ic/vd-fps", 0);
  f.SetPropertyValue("fcs/throttle-cmd-norm", 0); f.SetPropertyValue("fcs/mixture-cmd-norm", 1);
  f.SetPropertyValue("fcs/left-brake-cmd-norm", 1); f.SetPropertyValue("fcs/right-brake-cmd-norm", 1);
  f.SetPropertyValue("propulsion/magneto_cmd", 3);
  if (!f.RunIC()) return kErrRunIc;
  f.SetPropertyValue("propulsion/set-running", -1);
  for (int i = 0; i < static_cast<int>(6.0 / dt_s); ++i) {
    if (!f.Run()) return kErrRun;
    if (g_terrain_query_failed) return kErrTerrainCoverage;
  }
  if (g_active_terrain && !terrain_support_available()) return kErrTerrainCoverage;
  unsigned contact[6];
  if (!resolve_contacts(contact)) return kErrRunIc;
  const auto gear = f.GetGroundReactions();
  for (unsigned i = 0; i < 3; ++i)
    if (!gear->GetGearUnit(contact[i])->GetWOW() || gear->GetGearUnit(contact[i+3])->GetWOW()) return kErrRunIc;
  if (std::hypot(f.GetPropertyValue("velocities/v-north-fps"), f.GetPropertyValue("velocities/v-east-fps")) * kFtToM > 0.05) return kErrRunIc;
  f.Setsim_time(0);
  g_trim_ok = 0; g_trim_throttle = 0; g_trim_pitch = 0;
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

// Generic ignition/starter request, not a complete installed starting procedure.
// Never call InitRunning here: it forces RPM and rewrites the pilot's mixture.
EMSCRIPTEN_KEEPALIVE int gf_set_engine_running(double command_on) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({command_on})) return kErrNonFinite;
  if (command_on != 0 && command_on != 1) return kErrRange;
  if (!g_fdm->GetPropertyManager()->HasNode("propulsion/engine[0]/set-running")) return kErrLoad;
  const bool next_on = command_on == 1;
  if (g_engine_switch_controlled && next_on == g_engine_command_on) return 0;
  g_engine_switch_controlled = true; g_engine_command_on = next_on;
  g_fdm->SetPropertyValue("propulsion/magneto_cmd", next_on ? 3 : 0);
  g_engine_start_requested = next_on && g_fdm->GetPropertyValue("propulsion/engine[0]/set-running") == 0;
  g_fdm->SetPropertyValue("propulsion/starter_cmd", g_engine_start_requested ? 1 : 0);
  return 0;
}

// Actual native combustion-running flag and distinct requested ignition state.
EMSCRIPTEN_KEEPALIVE double* gf_engine_switch_state() {
  static double values[2];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  values[0] = g_fdm->GetPropertyValue("propulsion/engine[0]/set-running") != 0 ? 1 : 0;
  values[1] = g_engine_command_on ? 1 : 0;
  return values;
}

// Read-only propulsion diagnostics for native energy/glide regressions. Positive
// thrust drives the aircraft forward; negative shaft power means engine braking.
// N, W (engine shaft), dimensionless advance ratio, propeller rad/s. A missing
// native property remains unavailable instead of masquerading as zero drag.
EMSCRIPTEN_KEEPALIVE double* gf_propeller_state() {
  static double values[4];
  const char* properties[] = {"propulsion/engine[0]/thrust-lbs",
    "propulsion/engine[0]/power-hp", "propulsion/engine[0]/advance-ratio",
    "propulsion/engine[0]/propeller-rpm"};
  const double conversions[] = {kLbfToN, 550.0 * kLbfToN * kFtToM, 1.0, 2.0 * kPi / 60.0};
  for (int i = 0; i < 4; ++i) {
    values[i] = g_fdm && g_fdm->GetPropertyManager()->HasNode(properties[i])
      ? g_fdm->GetPropertyValue(properties[i]) * conversions[i]
      : std::numeric_limits<double>::quiet_NaN();
  }
  return values;
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

// Generic research controller: target is m/s in VS mode and physical MSL m in ALT.
EMSCRIPTEN_KEEPALIVE int gf_set_autopilot_vertical(double mode, double target) {
  if (!g_fdm) return kErrNotInit;
  if (!finite_all({mode, target})) return kErrNonFinite;
  if ((mode != 0 && mode != 1 && mode != 2) ||
      (mode == 1 && std::fabs(target) > 20.0) ||
      (mode == 2 && (target < -2500.0 || target > 20000.0))) return kErrRange;
  const int next = static_cast<int>(mode);
  if (g_ap_vertical_mode != next) {
    const char* integral = "fcs/altitude-hold-pid/initial-integrator-value";
    if (g_fdm->GetPropertyManager()->HasNode(integral)) g_fdm->SetPropertyValue(integral, 0.0);
    g_fdm->SetPropertyValue("ap/elevator_cmd", 0.0);
  }
  g_ap_vertical_mode = next;
  g_ap_vertical_target = target;
  configure_autopilot();
  return 0;
}

EMSCRIPTEN_KEEPALIVE double* gf_autopilot_vertical_state() {
  static double values[3];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  values[0] = g_ap_vertical_mode;
  values[1] = g_ap_vertical_target;
  values[2] = g_fdm->GetPropertyValue("ap/elevator_cmd");
  return values;
}

EMSCRIPTEN_KEEPALIVE int gf_step() {
  if (!g_fdm) return kErrNotInit;
  if (g_active_terrain && !terrain_support_available()) return kErrTerrainCoverage;
  configure_autopilot();
  const bool ran = g_fdm->Run();
  if (g_active_terrain && !terrain_support_available()) return kErrTerrainCoverage;
  if (!ran) return kErrRun;
  // Release a requested starter as soon as the native model catches, even if no
  // further browser input arrives. Subsequent fuel starvation does not crank it
  // again automatically; a fresh off/on request is needed.
  if (g_engine_start_requested && g_fdm->GetPropertyValue("propulsion/engine[0]/set-running") != 0) {
    g_fdm->SetPropertyValue("propulsion/starter_cmd", 0);
    g_engine_start_requested = false;
  }
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
  values[0] = property_or_nan("velocities/vc-fps") * kFtToM;
  values[1] = property_or_nan("velocities/psidot-rad_sec");
  values[2] = property_or_nan("accelerations/n-pilot-y-norm");
  values[3] = property_or_nan("accelerations/n-pilot-z-norm");
  values[4] = property_or_nan("fcs/flap-pos-deg") * kPi / 180.0;
  values[5] = property_or_nan("fcs/left-brake-cmd-norm");
  values[6] = property_or_nan("fcs/right-brake-cmd-norm");
  const double wow = property_or_nan("gear/wow");
  values[7] = std::isfinite(wow) ? (wow > 0 ? 1.0 : 0.0) : wow;
  return values;
}

// Applied pilot commands and actual differential surfaces. Read-only; the
// original 14-double dynamics/digest buffer remains unchanged.
EMSCRIPTEN_KEEPALIVE double* gf_control_state() {
  static double values[7];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  auto& f = *g_fdm;
  values[0] = f.GetPropertyValue("fcs/throttle-cmd-norm");
  values[1] = f.GetPropertyValue("fcs/aileron-cmd-norm");
  values[2] = f.GetPropertyValue("fcs/elevator-cmd-norm");
  values[3] = f.GetPropertyValue("fcs/rudder-cmd-norm");
  values[4] = f.GetPropertyValue("fcs/left-aileron-pos-rad");
  values[5] = f.GetPropertyValue("fcs/right-aileron-pos-rad");
  values[6] = f.GetPropertyValue("fcs/rudder-pos-rad");
  return values;
}

// Local-airflow diagnostic inputs only; no change to the original dynamics buffer.
// Air-relative body UVW (m/s), aero PQR (rad/s), structural CG (m; aft/right/up),
// body alpha/max (rad), software warning (uncapped), hysteresis switch (0/1).
EMSCRIPTEN_KEEPALIVE double* gf_stall_state() {
  static double values[13];
  if (!g_fdm) {
    for (double& value : values) value = std::numeric_limits<double>::quiet_NaN();
    return values;
  }
  auto& f = *g_fdm;
  values[0] = f.GetPropertyValue("velocities/u-aero-fps") * kFtToM;
  values[1] = f.GetPropertyValue("velocities/v-aero-fps") * kFtToM;
  values[2] = f.GetPropertyValue("velocities/w-aero-fps") * kFtToM;
  values[3] = f.GetPropertyValue("velocities/p-aero-rad_sec");
  values[4] = f.GetPropertyValue("velocities/q-aero-rad_sec");
  values[5] = f.GetPropertyValue("velocities/r-aero-rad_sec");
  values[6] = f.GetPropertyValue("inertia/cg-x-in") * 0.0254;
  values[7] = f.GetPropertyValue("inertia/cg-y-in") * 0.0254;
  values[8] = f.GetPropertyValue("inertia/cg-z-in") * 0.0254;
  values[9] = f.GetPropertyValue("aero/alpha-rad");
  values[10] = f.GetPropertyValue("aero/alpha-max-rad");
  values[11] = f.GetPropertyValue("systems/stall-warn-norm");
  values[12] = f.GetPropertyValue("aero/stall-hyst-norm");
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

// CG AGL/native geodetic height (m), horizontal heading-aligned forward and
// rightward velocities, NED down velocity (m/s), structure mask (tail/left/right
// bits 1/2/4); then nose/left/right WOW, compression m, strut load N, slip rad.
// Actual upstream contact quantities: no damage thresholds or added forces.
// With Q18 terrain enabled, geodetic height is physical DHHN2016; the worker
// converts it to rendering ellipsoid height outside the dynamics.
EMSCRIPTEN_KEEPALIVE double* gf_ground_state() {
  static double values[18];
  unsigned contact[6];
  if (!g_fdm || g_fdm->GetGroundReactions()->GetNumGearUnits() != 6 || !resolve_contacts(contact)) {
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
    if (gear->GetGearUnit(contact[i + 3])->GetWOW()) values[5] += 1 << i;
    const auto unit = gear->GetGearUnit(contact[i]);
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
  // Every property is HasNode-checked: a misnamed or absent node yields NaN and
  // engineFields() then omits the whole group instead of a plausible zero.
  values[0] = property_or_nan("propulsion/engine[0]/map-pa");
  values[1] = property_or_nan("propulsion/engine[0]/engine-rpm") * 2.0 * kPi / 60.0;
  values[2] = property_or_nan("fcs/mixture-cmd-norm");
  values[3] = g_mixture_auto;
  values[4] = property_or_nan("propulsion/engine[0]/oil-pressure-psi") * kPsiToPa;
  values[5] = (property_or_nan("propulsion/engine[0]/oil-temperature-degF") - 32.0) * 5.0 / 9.0 + 273.15;
  values[6] = (property_or_nan("propulsion/engine[0]/egt-degF") - 32.0) * 5.0 / 9.0 + 273.15;
  values[7] = property_or_nan("propulsion/engine[0]/fuel-flow-rate-gph") * kUsGalToM3 / 3600.0;
  values[8] = property_or_nan("propulsion/tank[0]/contents-volume-gal") * kUsGalToM3;
  values[9] = property_or_nan("propulsion/tank[1]/contents-volume-gal") * kUsGalToM3;
  values[10] = g_ap_mode;
  values[11] = g_ap_heading_target;
  values[12] = property_or_nan("ap/roll-cmd-norm-output");
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
