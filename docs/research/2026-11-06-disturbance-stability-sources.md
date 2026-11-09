# Disturbance stability and control-return source note

Recorded 2026-11-06 10:01 Europe/Berlin by Codex `stability_sources` (housekeeping).
TODO2.0.153; R-SIM-5/R-SIM-11/R-INPUT-1. Source inspection and inventory only;
this author did not run or independently accept the parallel flight experiment.

## What the ball analogy tests

The [FAA PHAK25C Chapter5](https://www.faa.gov/sites/faa.gov/files/07_phak_ch5_0.pdf),
printed5-14–15, separates the initial restoring tendency (static stability) from
whether motion subsequently diminishes or grows (dynamic stability). Its
printed5-17–21 discussion separates lateral/directional response, Dutch roll and
spiral behavior. A slowly diverging spiral can coexist with otherwise stable
behavior; indefinite automatic wings-level flight is therefore not a general
acceptance criterion. These generic descriptions supply no C172 numerical
response tolerance. The [publisher landing page](https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-5-aerodynamics-flight)
links this chapter.

For this investigation, distinguish angular rates and sideslip after release
from bank angle alone. A retained surface deflection changes the applied moment:
a zero external command is insufficient evidence of an unforced disturbance
response. Compare actual surface positions against their pre-pulse trimmed
positions, and compare signed roll, pitch and yaw perturbations separately. This
is a proposed diagnostic distinction, not a claim that this model is stable.

## Executing source applicability

The running root checkout's `studies/e1-browser/sim/dist/build-info.json` identifies
JSBSim v1.3.3, commit`66f7fafc07fe13e7ede9db20873030fed2881713`.
The [pinned upstream c172x file](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172x/c172x.xml)
identifies a1982C172P research model, rather than the selected classic172S. Its
header disclaims manufacturer endorsement and states limited validation. Existing
[aircraft-data rights restrictions](../../THIRD_PARTY_NOTICES.md#aircraft-reference-values-in-the-application-rights-unresolved)
remain; this note adds no model/binary redistribution permission.

Local inventory read directly from the running root checkout:

| Asset | SHA-256 | Check performed |
| --- | --- | --- |
| Executing WASM | `c11a93378da778e34168c5b9043e44448855fb6699a640585d224313722d0f42` | Matches build record |
| Prepared c172x XML | `02d1811acad049a259644d4bb36cac94cfdf8600b25b14d844e484d50db347c5` | Matches record; exact bytes occur once in WASM |
| Prepared c172ap XML | `5e97d48b351d65431ee3b31bf557b3a81075634996319a9f02e244b8648b692d` | Matches record; exact bytes occur once in WASM |

The prepared files are under ignored `output/flight/engine-build/prepared-aircraft/c172x/`.
This byte inspection establishes which XML is embedded, not complete build
reproducibility or aircraft fidelity. The build record separately limits its
static-library provenance.

## Source mechanism worth isolating

In the prepared c172x XML, elevator lines367–371 contain lag60, bias0.002rad and
hysteresis width0.05rad. Each aileron actuator (lines404–437) retains its1.57rad/s
rate limit and width0.005rad. The rudder path (lines455–469) is direct scaling.

The [pinned FGActuator implementation](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/flight_control/FGActuator.cpp)
implements hysteresis using the previous output and half of the configured
width. On reversal, output can stay at its prior value within that band. Thus the
aileron half-band is0.0025rad (0.143239°), while the elevator half-band is0.025rad
(1.432394°). These are conversions of illustrative model settings, not real C172
backlash tolerances. Returning the command to its earlier value can leave a
history-dependent actual surface position. Native pulse observations must decide
whether this mechanism explains the reported motion.

The same pinned repository's [c172p roll channel](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172p/c172p.xml),
local lines273–327, maps trim-plus-command directly into left/right aileron
positions without an actuator hysteresis stage. This supports a narrowly scoped
counterfactual for the input-to-surface mapping; it does not validate transplanting
that aircraft model or its aerodynamic coefficients. Removing only the two
aileron hysteresis terms is a candidate generic-control contract choice, not an
accepted product default or a sourced installed C172 mechanism.

The prepared model already has roll-rate damping`Clp=-0.47`, alpha pitch
coefficient`Cmalpha=-1.8`, pitch-rate damping`Cmq=-12.4` and yaw-rate
damping`Cnr=-0.099` (local lines1033–1201). Those individual signs cannot establish
coupled stability. No coefficient, gain, actuator setting or runtime behavior was
changed for this note.

## Checks and remaining work

Read applicable AGENTS/housekeeping, SDLC/STYLE/SEC/SBOM and the prior
[balanced-start source note](2026-11-06-airborne-model-balance.md). Verified the
local hashes/embedded XML bytes above, inspected the prepared channels and
FGActuator, and checked the primary upstream raw files. The browser tool rejected
the21MB FAA PDF; the official file was downloaded to `/private/tmp` and printed
pages5-14–21 were extracted with native macOS PDFKit for the stated source check.
An initial Swift extraction failed due a local SDK/toolchain mismatch; the
Objective-C PDFKit extraction succeeded. No repository dependency was added.

The parallel native/browser investigations own measured response and input/camera
causality. Their eventual reports must distinguish the source-derived mechanism,
counterfactual result, product decision and independent acceptance. No invented
C172 response tolerance, automatic leveling requirement or training-credit claim
is introduced here. Shared TODO/DONE/GAPS/SPEC and research-index updates remain
with the orchestrator.
