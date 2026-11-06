# Generic-model initial airborne balance

Recorded 2026-11-06 07:12 Europe/Berlin by Codex housekeeping `handling_housekeeping`.
TODO2.0.153; R-SIM-11. This note records source applicability, an inspected
diagnostic and the implementation contract. It is not independent acceptance.

## Report and scope

The user reports both sensitive steering and instability after releasing the
controls; see the [original clarification](../input/2026-11-06-handling-regression.md).
The later immutable working-tree record
`docs/input/2026-11-06-local-handling-context.md` confirms localhost:5173 and SIM1×.
That workspace already sends neutral external commands after actual pointer
center/exit and key release. The published startup-bias repair is separate; it
does not explain every remaining local handling observation.

The proposed change initializes the existing generic prepared c172x model nearer
its own solved airborne equilibrium. It does not tune coefficients, reduce input
gain, continually correct bank, establish installed C172 trim equipment or
promise wings-level recovery after a control pulse.

## Source and applicability

The inspected source is JSBSim v1.3.3, pinned in the existing
[SBOM](../SBOM.md) at commit66f7fafc07fe13e7ede9db20873030fed2881713,
with the six byte-identified local prepared aircraft/engine/system assets.
The c172x model is generic research data, not the selected validated classic172S.
Existing [rights limitations](../../THIRD_PARTY_NOTICES.md#aircraft-reference-values-in-the-application-rights-unresolved) remain:
engine LGPL acceptance does not settle the aircraft-data notices/redistribution
conditions. This increment adds no permission to distribute generated models or
native binaries.

- FGTrim.cpp837–848 full mode actively solves Wdot/alpha, Udot/throttle,
  Qdot/pitch trim, Vdot/bank, Pdot/aileron and Rdot/rudder. The beta/heading-track
  axis is commented out; header prose is not evidence that it participates.
- Prepared c172x.xml382–468 already sums external roll/yaw commands with
  `fcs/roll-trim-cmd-norm` and `fcs/yaw-trim-cmd-norm`, clipping at±1. FGFCS.cpp
  binds those retained channels. These values are normalized, dimensionless
  commands, not surface angles or real cockpit trim positions.
- Existing actuator rate/hysteresis state affects the response. The handoff
  preserves that solved state: no extra integration step, second RunIC or
  actuator reset occurs during the transfer. Nosewheel steering separately uses
  external pilot rudder; airborne equivalence does not establish ground behavior.
- Physical boundary units remain metres, m/s, radians, rad/s and seconds; source
  ft/kt conversions stay in the native bridge. The diagnostic uses CAS to name
  fixtures; production initialization takes TAS. They are not interchangeable.

## Bounded diagnostic evidence

The author-run predeclared comparison uses60/80/100kt CAS, neutral and±0.1
normalized roll pulses at5–7s, default atmosphere,396.24m MSL,82°true heading,
flaps/brakes zero, AP off, external payload zero and the declared normal loading.
It compares holding successful full trim's solved pilot controls with moving
those commands into the existing trim channels and making external commands zero.

All nine60-second cases report exact equality at7201 sampled step boundaries
for the14-double native state and sampled FCS/force diagnostics, with equal
trajectory digests. This is inspected authored evidence, not a new housekeeping
run or independent aircraft validation. It supports only this one-time handoff.
At100kt, the±0.1 pulse cases still finish near+21.16/−23.29°bank: the handoff
is not a sensitivity or self-leveling correction.

Artifact identities (retained under the working tree's ignored output):

| Artifact | SHA-256 |
| --- | --- |
| `local-handling-native/comparison.json` | `9e139010645261155ec0429d8b2f226d39df2e4c66df9cdbffd7bd5668f1537f` |
| `local-handling-native/evidence.json` | `bb55310ba022567c2d8f19c8ae9ea4de6eec8516e91375dabee68be05acaf4c4` |
| `local-handling-native/build-record.json` | `75ae282f1aaf97f50ae5e8228ebf8377f7f19b3be22d6ba11701e840434e8dca` |
| isolated diagnostic WASM | `67c415159a4bb47de0456d6cf2e396db750a46edb27fd0b7190ce3327b6cda72` |
| `handling-regression-input/input-browser.json` | `e4960fbbdc5838e4cfe86304acdea0d17c58a098ed66afe72f62ec754f4cc65f` |

The diagnostic kept production WASM11a92abd… unchanged. Its stale build record
remains a separate provenance limitation. The input browser artifact observes
zero commands at release and source actuator residue; its headless page switch
did not produce actual focus loss. Neither artifact reproduces every condition
in the user's embedded browser.

## Implementation contract and unaccepted gates

Profile0 retains legacy longitudinal initialization. Fresh ordinary airborne
profile1 requires successful full trim, validates the solved roll/yaw values,
transfers them once into existing trim channels and leaves external inputs neutral.
Failure is visible and must not silently fall back to a supposedly balanced start.
Fresh ground launches use0. A later landed continuation retains its recorded1
identity/compensation; it is not a fresh ground initialization.

The atomic telemetry group is `initial_balance_profile`, `roll_trim_norm`,
`yaw_trim_norm`: profile0 requires zero compensation; profile1 uses finite
normalized values within±1. Missing legacy identity means0; partial/invalid
new groups are rejected. Current explicit profile groups use version2, including zero-profile ground starts. Older-recording compatibility is not required by the user (2026-11-06). Continuation restores compensation before RunIC during native
reconstruction without overwriting legacy layouts.

The nine-case handoff comparison does **not** establish recording reconstruction:
RunIC can recreate exposed state without reproducing hidden actuator/integrator
history. Native initialization/failure, Worker publication, actual browser
disclosure, saved-location/reset, fresh ground/landed continuation, versioned
trace import/export and reconstruction limits need their own current tests and
independent reviews. No such implementation gate is accepted by this note.
The broader handling task,110kt trim envelope, selected-aircraft fidelity,
redistribution and cross-provider peer review remain open/pending.


## Implementation observations

The isolated updated bridge passes18 source-derived regression cases: both
initialization profiles at60/80/100kt CAS with neutral/±0.1 roll pulses.
Initial/final native states and the original trajectory digest equal their
retained reference. This differs from the earlier nine-case every-step diagnostic.
It also passes bounded35-value reconstruction, invalid input/failed-full-trim
rejection, AP authority toggles, later ground-frame identity retention and fresh
runway/landing-profile reset checks. Reconstruction is exposed-state rebuilding,
with fresh integrator/contact/engine histories; it is not a full checkpoint.

The actual app/Worker/new-engine browser probe atSIM1× runs30seconds with all
three external pilot axes exactly zero. Bank changes+0.0013272693° across that
interval (ends−0.0457173°); the declared regression budget was1°, an engineering
check on this initial-equilibrium case, not a C172 tolerance. AP engagement,
heldCWS/release/disconnect preserve the fixed profile, and saved-location reload
requests fresh balance. A persistent MODEL BALANCED START badge exposes the
separate initial compensation. Scenery pixels/read-only observers are fixtures;
actual headlessChrome156/nativeflight behavior is measured, not the user's
VSCode browser/physical trackpad. Published current-runtime helper inclusion and
strict recording-group preservation receive separate integration checks.

- Native18case artifact: `output/flight/initial-balance/native.json`, SHA-256 `9e3e281fac055f1ad60ef78e12b5349d2f3b3ee38b98412f3b47366146e91f9d`.
- Actualapp/Worker/browser artifact: `output/flight/initial-balance-browser.json`, SHA-256 `b8507cc7dd7e013326065c26636d75323df72044572dcc3e020c03d215590e07`.
- Buildinputrecord: `output/flight/initial-balance/build-record.json`, SHA-256 `330f48250874f1a29b2b3fdbe4c8dce4081e61145c1f8a6a229b9a8aa2e0f8a2`.
