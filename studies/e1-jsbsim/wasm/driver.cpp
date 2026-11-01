// E1 study: replay the harness F1 determinism fixture through the JSBSim C++
// API so native and Emscripten/WASM builds can be compared with the Python
// wheel. Output: FNV-1a 64 over little-endian IEEE-754 state doubles after each
// step, plus the final state in hex-float. Not a product component.
#include <FGFDMExec.h>
#include <FGJSBBase.h>
#include <simgear/misc/sg_path.hxx>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <string>

static const char* kProps[] = {
  "position/lat-geod-rad", "position/long-gc-rad", "position/h-sl-ft",
  "attitude/phi-rad", "attitude/theta-rad", "attitude/psi-rad",
  "velocities/u-fps", "velocities/v-fps", "velocities/w-fps",
  "velocities/p-rad_sec", "velocities/q-rad_sec", "velocities/r-rad_sec",
  "propulsion/engine/engine-rpm", "propulsion/engine/thrust-lbs",
  "fcs/elevator-pos-rad", "simulation/sim-time-sec"};

int main(int argc, char** argv) {
  if (argc < 2) { std::fprintf(stderr, "usage: driver ROOT [STEPS]\n"); return 2; }
  const std::string root = argv[1];
  const int steps = argc > 2 ? std::atoi(argv[2]) : 2400;
  const double dt = 1.0 / 120.0;
  const double pi = 3.141592653589793;  // equals Python math.pi
  JSBSim::FGJSBBase::debug_lvl = 0;
  JSBSim::FGFDMExec fdm;
  fdm.SetDebugLevel(0);
  fdm.SetRootDir(SGPath(root));
  if (!fdm.LoadModel(SGPath("aircraft"), SGPath("engine"), SGPath("systems"), "c172x")) return 3;
  // The model declares a CSV output opened at RunIC even when disabled.
  fdm.SetOutputFileName(0, "/dev/null");
  fdm.DisableOutput();
  fdm.Setdt(dt);
  fdm.SetPropertyValue("ic/lat-geod-rad", 50.0 * (pi / 180.0));
  fdm.SetPropertyValue("ic/long-gc-rad", 8.6 * (pi / 180.0));
  fdm.SetPropertyValue("ic/h-sl-ft", 1219.2 / 0.3048);
  fdm.SetPropertyValue("ic/vt-kts", 51.4 / (1852.0 / 3600.0));
  fdm.SetPropertyValue("ic/psi-true-rad", 0.0);
  fdm.SetPropertyValue("ic/gamma-deg", 0.0);
  fdm.SetPropertyValue("fcs/mixture-cmd-norm", 1.0);
  fdm.SetPropertyValue("fcs/throttle-cmd-norm", 0.7);
  fdm.SetPropertyValue("propulsion/magneto_cmd", 3);
  if (!fdm.RunIC()) return 4;
  fdm.SetPropertyValue("propulsion/set-running", -1);
  uint64_t h = 1469598103934665603ULL;
  double v[16];
  for (int k = 0; k < steps; ++k) {
    const double t = k * dt;
    fdm.SetPropertyValue("fcs/throttle-cmd-norm", 0.7 + 0.3 * (t >= 4.0 ? 1.0 : 0.0));
    fdm.SetPropertyValue("fcs/elevator-cmd-norm", -0.1 * std::sin(0.5 * t));
    fdm.SetPropertyValue("fcs/aileron-cmd-norm", 0.05 * ((5.0 <= t && t < 10.0) ? 1.0 : 0.0));
    if (!fdm.Run()) return 5;
    for (int i = 0; i < 16; ++i) {
      v[i] = fdm.GetPropertyValue(kProps[i]);
      unsigned char b[8];
      std::memcpy(b, &v[i], 8);  // little-endian on x86-64 and wasm32
      for (unsigned char c : b) { h ^= c; h *= 1099511628211ULL; }
    }
  }
  std::printf("fnv1a64 %016llx\n", static_cast<unsigned long long>(h));
  for (int i = 0; i < 16; ++i) std::printf("%s %a\n", kProps[i], v[i]);
  return 0;
}
