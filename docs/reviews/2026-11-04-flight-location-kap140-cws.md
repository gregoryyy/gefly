# Flight location, KAP climb/display and CWS: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 09:49 Europe/Berlin**.
Scope: R-UX-5 launch-location persistence and the climb/display/optional-CWS slice
of R-AP-1, with R-REVIEW-1 isolation. Implementation authors are the Codex
orchestrator, `glide_cases` and `glide_model`; this reviewer authored none of their
code/tests. The reviewer's input/source notes and shared status/catalog records
are excluded from independent acceptance.

## Quality

**Pass for the frozen bounded implementation after repairs.**

Persistence stores only a small validated regional pose, with explicit version,
units, ground/airborne mode, throttled writes and guarded storage access. It
observes valid live native telemetry, excludes Review/collision frames, restores
through native initialization while paused, and clears on explicit Restart.
It neither deserializes executable data nor claims an exact dynamics checkpoint.

The generic pitch-controller adaptation is gated to AP guidance; its q-rate
damping sign and rad/s boundary are consistent with elevator conventions.
Aircraft aerodynamic coefficients remain unchanged. KAP command validation,
ALT/VS references, selector arming and display units remain distinct. CWS yields
native servos, retains mode selection and reacquires the active ALT/VS reference
on release. Neutral controls are flushed before releasing CWS; genuinely held
raw input still disconnects. The Review-entry release-order bug is repaired.
Legacy recordings without CWS telemetry show an explicit unknown indication.

## Validation

**Pass for these criteria; not full autopilot/aircraft fidelity acceptance.**

| Criterion | Evidence | Outcome |
| --- | --- | --- |
| Persist last live airborne location across browser starts, paused | Strict store/session cases and real native reload browser | Pass |
| Restore ground location settled, braked and paused | Native ground-reload browser; existing ground initializer reused | Pass |
| Explicit reset clears; malformed/denied storage falls back | Store/session tests and real Restart/corrupt-payload browser cases | Pass |
| Review/imported frames do not overwrite saved live pose | Store guard and synthetic imported-Review browser | Pass |
| Preselect/ARM remains separate from VS command; display has correct FT/FPM timing | KAP unit and panel/browser cases, including first hidden-VS UP reveal | Pass |
| Powered native climb is stable and captures selected altitude | Independently executed maintained fixed-step climb regression | Pass |
| CWS is momentary, supports manual control and safely reacquires ALT/VS | Unit/native-worker cases and actual keyboard/pointer browser | Pass |
| Release on blur/pause/Review cannot leave held commands; recorded CWS is read only | Final panel/flight browser, including CWS+yoke held on Review entry and legacy unknown-state fixture | Pass |

Independent runs: location/session **34/34**, KAP **15/15**, aircraft-preparation
Python **6/6**, `kap140-climb-native.mjs`, and `kap140-worker.mjs` all passed.
The full-power calm-air 500FPM fixture reproduced a 30–90s range of
**452.6–481.3FPM**, mean **463.8**, captured ALT at **125.0s**, and ended at
**+2.47m pressure-altitude error / −7.1FPM** at 240s. The inspected author-run
baseline had **264.3–736.5FPM** and **+13.66m pressure-altitude error**; that old
baseline was not independently rerun. These are simulator regression measurements,
not manufacturer performance tolerances or independent aircraft reference data.

Final browser evidence inspected: `output/ci/flight-location-browser.log`
(five groups), `output/flight/kap140-cws-panel.log` (12 groups), and
`output/flight/kap140-cws-flight.log` (seven groups). Actual native worker snapshots
support the outcomes; deterministic scenery and explicitly synthetic imported
poses are distinguished. The panel screenshot was visually inspected. Browser
commands were not independently rerun by this reviewer. Shared CI passes with
nine existing JSBSim-study skips; those skips are not accepted checks.

Honeywell/Cessna sources support original mode/display distinctions; Diamond
AFM Supplement A13 **9-A13-36** supports generic optional-CWS clutch release and
ALT/VS synchronization. The exact 172S CWS installation and calibrated response
remain unverified. Persistence restores position with a declared launch setup,
not exact speed/attitude/control continuity. Other flight-envelope conditions,
training credit and cross-provider peer acceptance remain outside this pass.

## Frozen packet

Base `d0ad016f98a6d6fd58c8087eed5937f3a0876154` plus reviewed working-tree changes.
Runtime WASM SHA-256:
`3698ceec71c37d98de64871af8677d21b1801272298e3ff47697f426f9f605b3`.
The ignored `output/flight/flight-location-kap140-cws-review-packet.json` lists
25 source/specification/test files. SHA-256 of sorted
`path + NUL + file SHA-256 + newline`:
`bc5b4e12c1a4baaca3df9c0dc9ae6814925184e40012c1938378e075c6dec4fd`.
