# E1 bounded study: JSBSim as a deterministic fixed-step dynamics core

Status: **run once on a Linux container (2026-11-01); not reviewed; no decision.**
Scope: TODO 1.2.2, [EVAL E1](../../docs/EVAL.md#e1-which-web-simulation-architecture-is-adequate),
R-REUSE-1. Engine-behaviour evidence only. This study does **not** select an engine,
aircraft model or browser adapter and does not validate any Cessna 172 variant.

## Question

Can the JSBSim flight-dynamics library, driven by an external fixed-step loop,
provide (a) bit-reproducible state for replay, (b) bounded, converging
fixed-step integration error, (c) a sane stationary/trim baseline and (d) enough
CPU headroom for a real-time web exercise?

## Candidate (pinned)

| Item | Value |
| --- | --- |
| Engine | JSBSim **1.3.3**, PyPI wheel `jsbsim-1.3.3-cp313-cp313-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl`, SHA-256 `3a933792b350f2c2e75783ea746daa026dd59a160101682fdd32654faa7a5a6f` |
| Upstream | <https://github.com/JSBSim-Team/jsbsim>, tag `v1.3.3` (lightweight) at commit `66f7fafc07fe13e7ede9db20873030fed2881713` |
| Engine license | Wheel ships `licenses/COPYING` = GNU LGPL 2.1; classifier "LGPLv2+" |
| Aircraft data | Bundled `aircraft/c172x/c172x.xml` (`$Revision: 1.91 $`, author Tony Peden, "Models a 1982 Cessna 172P") with `engine/eng_io320.xml`, `engine/prop_75in2f.xml`, `systems/GNCUtilities.xml`, `systems/Autopilot.xml`, `aircraft/c172x/c172ap.xml` |
| Python | CPython 3.13.18 in an isolated scratch venv (not in the repository) |

**Aircraft-data rights.** `c172x.xml` declares `licenseName="GPL (General Public
License)"` with no version and a note "not endorsed by the manufacturer ... not to
be sold"; it states it was "validated only to the extent that it seems to fly
right". The engine, propeller and system files used carry no per-file license
notice (author lines only); only the repository-level LGPL-2.1 `COPYING` is shipped.
`c172p.xml` (not used) has author "Unknown", no license element and the same
"not to be sold" note. Applying the repository license to the unmarked files, and
reading an unversioned "GPL" as compatible with GPL-3.0-or-later, are **unconfirmed
interpretations** requiring the GAPS Q5 compatibility review. Nothing is copied
into the repository.

**Applicability.** The models are generic C172/172P data, **not** the selected
172S (serials 9491-9809) or FR172. No number below is aircraft-performance evidence.

## Method

Script: [harness.py](harness.py) (stdlib + `jsbsim` only). Tests:
[test_harness.py](test_harness.py). SI at the boundary: helper functions convert
JSBSim's ft, ft/s, kt, deg and slug units once (`ft_to_m` uses the exact
0.3048 m/ft; kt uses 1852/3600 m/s). JSBSim runs at debug level 0; any remaining native
console output (for example its output-file error below) is routed to stderr
while the fixtures run, so `harness.py all` writes only JSON to stdout.
Time is step-indexed (`k * dt`); no wall clock enters the simulation. Integrator
settings are the model defaults and are recorded in the output.

Fixtures:

- **F1 determinism.** Airborne IC (1219.2 m MSL, 51.4 m/s TAS, heading 0 deg, engine
  running), scripted throttle/elevator/aileron profile, 2400 steps at 1/120 s.
  Hash (SHA-256 over IEEE-754 little-endian doubles) of 16 state properties after
  every step. Compare: two fresh instances in one process; a fresh child process;
  and the same instance after `reset_to_initial_conditions`.
- **F2 timestep refinement.** Same IC, simple trim, then 5 s hold, 20 s climb
  (full throttle, elevator -0.05 from trim), 15 s back at trim inputs (40 s total).
  Input changes fall on multiples of every dt. Run at dt = 1/60, 1/120, 1/240,
  1/480 s; compare altitude (m), TAS (m/s) and pitch (deg) at t = 10/20/30/40 s
  with the 1/480 s run; report maximum absolute difference and observed order
  `log2(e(dt)/e(dt/2))`.
- **F3 stationary/trim.** `reset_at_rest` ground IC, engine off, parking brakes
  full; 5 s settling then 25 s observation. Plus a simple longitudinal trim at
  the F1 IC: trim status, controls and residual accelerations.
- **F4 cost.** Three repetitions of: wall-clock (`time.perf_counter`) for `run()` alone and with F1 state
  capture, 12 000 steps at 1/120 s; per-step microseconds and real-time factor.

## Proposed budgets and stop criteria (declared before running)

Budgets are trial values for this study, pending TODO 1.2.1's reference Mac and
user-confirmed numerical budgets.

| Fixture | Proposed pass budget | Stop the candidate if |
| --- | --- | --- |
| F1 | All hashes identical (bitwise) | any divergence that cannot be traced to an input/IC difference |
| F2 | At dt = 1/120 s vs 1/480 s: altitude <= 0.5 m, TAS <= 0.05 m/s, pitch <= 0.05 deg over 40 s; differences shrink with dt | non-convergence or growing error with smaller dt |
| F3 | After settling: horizontal drift <= 0.01 m, speed <= 0.001 m/s; trim reports success with residual body accelerations <= 0.01 m/s^2 | ground creep or trim failure at a nominal cruise IC |
| F4 | >= 20x real time per core at 1/120 s on this container (headroom for browser, rendering and WASM overhead) | < 2x real time |

Stop the whole study early if the package cannot be installed reproducibly or its
license terms exclude GPL-3.0-or-later distribution. Do not count visual
smoothness as dynamics accuracy.

## Commands (as run, 2026-11-01)

```sh
# run from the repository root; S = a scratch directory outside the repository
python3 -m venv $S/venv-e1
$S/venv-e1/bin/pip install "jsbsim==1.3.3" \
  --hash=sha256:3a933792b350f2c2e75783ea746daa026dd59a160101682fdd32654faa7a5a6f
# (that hash is the cp313 manylinux x86-64 wheel; numpy resolved unpinned as a dependency,
#  so drop --hash or add numpy hashes when pip requires hashes for every package)
$S/venv-e1/bin/python studies/e1-jsbsim/harness.py all --out $S/e1-results.json
$S/venv-e1/bin/python -m unittest discover -s studies/e1-jsbsim -v
python3 -m unittest discover -s studies/e1-jsbsim     # without jsbsim: engine tests skip
python3 utils/ci.py   # repository gate; runs these too (engine tests skip without jsbsim)
# optional WASM path, all in $S (SRC = $S/src/jsbsim-1.3.3 from
#   git clone --depth 1 --branch v1.3.3 https://github.com/JSBSim-Team/jsbsim.git)
git clone https://github.com/emscripten-core/emsdk && cd emsdk && ./emsdk install 6.0.13 \
  && ./emsdk activate 6.0.13 && source ./emsdk_env.sh   # run used emsdk@d7b4130 "latest" = 6.0.13
mkdir $S/build-wasm-exc && cd $S/build-wasm-exc   # working directory for the next two commands
emcmake cmake $SRC -DCMAKE_BUILD_TYPE=Release -DBUILD_PYTHON_MODULE=OFF -DBUILD_DOCS=OFF \
  -DCMAKE_CXX_FLAGS=-fwasm-exceptions -DCMAKE_C_FLAGS=-fwasm-exceptions && emmake make -j4 libJSBSim
em++ -O2 -std=c++17 -fwasm-exceptions -I$SRC/src -Isrc <repo>/studies/e1-jsbsim/wasm/driver.cpp \
  src/libJSBSim.a -sNODERAWFS=1 -sALLOW_MEMORY_GROWTH=1 -o $S/driver-wasm.js
node $S/driver-wasm.js $S/venv-e1/lib/python3.13/site-packages/jsbsim   # data root = wheel's files
# native comparison: in $S/build-native, cmake $SRC (same options, no emcmake/flags) && make libJSBSim,
# then g++ -O2 -std=c++17 -I$SRC/src -Isrc <driver.cpp> src/libJSBSim.a -o $S/driver-native
```

No WASM/native build artefacts, logs or emsdk installation are retained or
committed; only `wasm/driver.cpp` is kept.

Side finding: `c172x.xml` declares a CSV `<output>` that JSBSim tries to open at
`run_ic()` even after `disable_output()`; by default it lands in the working
directory. The harness points it at a harness-owned temporary directory removed
at exit. JSBSim nevertheless reports "unable to open the file ..." for that
writable path too (cause not determined; likely JSBSim behaviour rather than the
environment) to the redirected stream and writes nothing; `driver.cpp` points
it at `/dev/null`, whose open JSBSim likewise reports as failed. A test checks that
`harness.py all` leaves its working directory empty and prints parseable JSON.

The harness run takes about 3-4 s wall time on this container (child-process digest included).

## Results (Linux container; not the reference Mac)

Environment: Intel Xeon @ 2.80 GHz (KVM, 4 vCPU, AVX-512), Linux 6.18 x86-64,
glibc 2.39, CPython 3.13.18. Model default integrators: rotational rate and
attitude **rectangular Euler**; translational rate Adams-Bashforth 2; position
Adams-Bashforth 3.

| Fixture | Observation | Against budget |
| --- | --- | --- |
| F1 | SHA-256 `9daa3605...fa4e7c` identical for two fresh instances, a fresh child process and the same instance after `reset_to_initial_conditions` (2400 steps) | pass (same build) |
| F2 | Max diff vs 1/480 s over t = 10-40 s: 1/60 s: 0.097 m, 0.011 m/s, 0.017 deg; **1/120 s: 0.042 m, 0.0047 m/s, 0.0071 deg**; 1/240 s: 0.014 m, 0.0016 m/s, 0.0024 deg. Consecutive-difference order 1.00 +/- 0.002 for all three states | pass; **first-order** convergence |
| F3 | After 5 s settling: horizontal drift 0.00035 m, max speed 0.00050 m/s, height change 0.00008 m over 25 s. The bundled IC needs about 4 s to settle (0.135 m/s at 0.5 s). Trim at the F1 IC succeeds: throttle 0.749, pitch-trim 0.201, alpha = pitch 1.12 deg, residual udot -6.2e-6 m/s^2, wdot -4.0e-5 m/s^2 | pass; settling transient must be hidden or pre-run at scenario start |
| F4 | Recorded `all` run, 3 repetitions x 12 000 steps at 1/120 s, single thread. `run()` alone: 14.2-22.9 us/step = **364-588x** real time. With 3 inputs, 16 reads and hashing: 20.2-35.0 us/step = **238-413x**. An independent reviewer run (with I/O) observed 234x, 299x, 347x. Lowest observation is about 11.7x the 20x budget; variance between runs is large (shared VM) | pass |

Reference-based order estimates (1.22 and 1.58) are the expected artefact of
using the finest run as truth for a first-order method (log2(7/3), log2(3)).

### WASM feasibility (optional, time-boxed)

Unmodified JSBSim v1.3.3 source builds as a static library with emsdk
(repository commit `d7b4130688bfa348392b921ab04015aa15c4f154`, emcc 6.0.13) in
about 50 s; upstream already guards sockets for `__EMSCRIPTEN__`. It needs
`-fwasm-exceptions` (or another exception mode): the default no-exception build
aborts at model load. [wasm/driver.cpp](wasm/driver.cpp) replays F1 through the
C++ API (`harness.py fnv` is the Python counterpart; FNV-1a 64 over the same
state bytes):

| Build | F1 digest (2400 steps) |
| --- | --- |
| PyPI wheel 1.3.3 | `104981b1df1b16d6` |
| Local g++ 13.3 `-O2` native build | `104981b1df1b16d6` (bit-identical to the wheel) |
| Emscripten WASM under Node 22.23 | `d4fafb3e52710414`, repeatable run to run |

WASM differs from native **from the first step** at ULP level (max relative
difference 2.0e-13 after 20 s; altitude identical), most likely from the
different math library. Under Node, the driver costs about 28 us/step (about
300x real time) after about 0.3 s start-up; `.wasm` is 1.63 MB (0.47 MB gzip-9)
including the library. No browser, threading, data packaging or
JavaScript binding was attempted; build outputs stay in the scratchpad.

## Interpretation and limitations

- Determinism holds **within one build and platform**. Cross-platform or
  native-vs-WASM bit identity does **not** hold; replay must log inputs and
  re-simulate on the same build, or compare with declared tolerances. Browser
  engines, CPU architectures (Apple Silicon) and compiler versions are untested.
- Default rotational integration is first order. Error at 1/120 s is small for
  this 40 s case, but long-horizon error and alternative integrator settings
  are not evaluated.
- Not evaluated: E1 known force/torque reference cases, frame-convention
  fixtures, input latency, frame pacing, browser main-thread/worker cost, the
  reference Mac, turbulence/random seeds, ground handling beyond rest, and the
  existing third-party JSBSim WASM wrapper.
- The c172x data is a generic 1982 172P model of unconfirmed licence scope; all
  numbers are engine behaviour, not 172S/FR172 performance or fidelity.
- Unit helpers are tested; JSBSim's internal unit conversions are trusted, not
  independently verified beyond the SI IC round trip.

## Review and decision

Not yet reviewed by quality/validate; no architecture decision. Proposed outcome
for TODO 1.2.3 review: JSBSim remains a viable candidate for the fixed-step core
(R-REUSE-1) subject to the licence review and a browser/reference-Mac run.
