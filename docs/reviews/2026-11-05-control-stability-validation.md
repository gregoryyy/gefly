# Control stability validation

Initially reviewed 2026-11-05 17:46 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.153;
R-INPUT-1/R-SIM-11, with R-SIM-5 fidelity limits. Production source
`e826d19801e2e4f9d50da728193ccf5b251636ab`, documentation
`214e2891aaf0438e4216dceefa4d898ccfa16d19`, based on
`700dd5386125f9864a391f85b277cb71da55290a`. Affected renewal below covers
`7512d608c86784bf8e67ca77ab8f99ae9ba1e2b8`.

**Bounded acceptance for the default configuration/input repairs only.**
The reported instability is not fully resolved or validated. A separate draft
PR can state these limits; it must not claim high-speed stability, uniform
handling improvement or C172S fidelity. The reported external peer outcome is
blocked/partial; this review does not replace covering peer acceptance.

Read the [request](../input/2026-11-05-control-stability.md), current
[SPEC](../SPEC.md), ARCH/SEC/EVAL and project/validate rules. Inspected the small
production diff, actual diagnostic/native-handler/browser outputs and test
sources; independently checked source hashes, case counts, trim statuses,
selected paired measurements and the lateral mass-moment arithmetic. No reviewer
browser or new tests were run; only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| Fresh normal loading | New airborne/runway starts use the same source seating/fuel with external load0, applied before trim/settling. Both production-handler/native cases start at step0 with external payload0 and aileron command0; actual app confirms external0. Independent mass-moment arithmetic reproduces measured lateral CG change from+0.107376m to−0.010964m when removing80lb at12ft right. | pass for default loading |
| Preserve explicit/recorded legacy loading | Source DEFAULT_LOADING stays unchanged; explicit/custom loading overrides the new default. Renewed handler harness restores the recorded36.2873896kg external payload and mass at step120. Missing-group continuation now immediately follows a distinct72kg-pilot/no-external/reduced-fuel configuration and checks all six historical payloads, empty mass, capacities/density, recorded tanks/mass and reconstructed fuel baseline. | pass for loading reconstruction; full app command handoff not evaluated |
| Zero bias and independent rudder | Main starts rollOffset0; both fresh gain presets have rudder linking off. Actual paused UI roll command is0.45 with rudder0, then both return0 on release without changing native state/digest. Command neutrality does not imply actual surface neutrality. | pass |
| Retain explicit assists and ground controls | Existing six-group browser run verifies opt-in linking, preset retention, touchpad/keyboard native commands, manual rudder priority, parking/Review/restart guards and paused invariance. Three native ground cases retain240 nose-contact steps and correctly signed yaw. No coefficients or artificial restoring moments are changed. | pass within tested controls; complete takeoff/hardware matrix not evaluated |
| Quantify complete old/new configurations | Additional40 native cases compare70/90kt initial CAS, neutral/signed pulses and trim/full power. At70kt trim-power neutral,30s bank changes40.16°→14.12°. At90kt neutral it changes−15.96°→+15.24°, leaving substantial drift. Negative0.45 pulse at70kt has larger absolute7s bank after the change:28.19°→33.83°. Trim throttles differ between loadings; CAS is not held. | pass as diagnostic comparison; uniform improvement not accepted |
| High-speed and residual model behavior | All16 initial110kt cases in the48-case sweep report trim−1. They are not trimmed-equilibrium stability evidence. Zero-command actual ailerons retain±0.0025rad after pulses, consistent with the documented hysteresis mechanism but uncalibrated. The sweep repeats one case exactly and records finite telemetry; it does not itself assert handling-regression thresholds. | high-speed/aircraft stability not evaluated; instability remains unresolved |
| Native provenance | Executing WASM11a92abd… differs from retained build record4fe24bfc…. Source/model-to-binary provenance and an older verified binary comparison are unavailable. | blocked for provenance and historical-binary regression attribution |

Local-only ignored evidence retained from the initial review stage:

- `output/flight/control-stability-native-pre-peer.json`: `553efc5d7a4bf0d46c256e9a33b7ff4e97f96810cc800b58d263238f2ade35c0`.
- `output/flight/control-stability-worker-pre-peer.json`: `71fa9fd611cd807cb0cb7560d85fabd5a28fedaa284b0d08f64c6d5a7867fbb7`.
- `output/flight/parking-rudder-browser.json`: `666da504b28a6c7ba4ed603c94d6c0b10b9ec0707d030979d9d6d866bd143a40`.
- `output/flight/control-stability-app-comparison.json`: `8892ca5be60a3320ee4f70bc101fcc10fd9d935afa51f4afcb122253336f1502`.

The five-case Node harness invokes the real production handler/native module in
one process; it is not a worker-thread transport test. The browser separately
uses actual Web Worker transport, Chrome156.0.8078.80. All six initial diagnostic
note pins and four worker-source identities were checked; renewed evidence is
assessed below.

Application408 Node +12 Python tests pass with zero failures/skips; build3.19s.
Shared CI passes with9 of23 optional JSBSim study tests skipped. No pilot handling
trial, calibrated overshoot tolerance, complete real-aircraft dynamics or
high-wing causal explanation is accepted. Final documentation, peer and
publication gates remain with the orchestrator.

## Affected renewal at 7512d60

Renewed 2026-11-05 17:56 Europe/Berlin at the frozen source revision above.

The renewed native JSON SHA256 is
`a472e3f1c2581c86e8eb129240d6d1619cf2d1285f0f045e6b178d5674b3b67a`;
the renewed handler JSON is
`8eeb52f6a2f33ae9774aedb5bc4055bf038beaa31d2b6152ba40f6cec8546626`
at their original `output/flight/control-stability-{native,worker}.json` paths.
All six current diagnostic-note pins match. Independent JSON comparison confirms
the original48 result objects are exactly unchanged. Sixteen added70/90kt,
trim/full-power, signed independent aileron/rudder cases assert the other command
stays0, the commanded surface responds with the correct sign, and both commands
release to0. Their recorded observations satisfy those checks. This is a
**pass for axis-routing/response regressions**, not a bank/overshoot tolerance.

The harness now requires trim1 for70/90kt and explicitly classifies all16
110kt trim−1 cases as unsupported equilibrium evidence. Before/after executing
WASM hashes are measured equal; build provenance remains unverified. The
legacy-after-custom assertions above pass and close the stale-loading coverage
gap. Actual browser six-group renewal after UI wording also passes;
`output/flight/control-parking-rudder-final.log` SHA256 is
`be843f8fa4e273d70561c7ee7a0bbf161c39f15073145556be9e50aafe7529f0`.

Source inspection confirms continuation initially retains recorded applied axes
through continuedAxes; deliberate new input selects current control policy.
That full app handoff/bank trend was not newly exercised. Read the retained peer
result and dispositions: external review remains blocked/partial, not accepted.
The repairs and renewed tests do not establish uniform handling improvement;
TODO2.0.153 remains open and PR86 stays draft. Final integrated CI also passes
with9 optional JSBSim study tests skipped; this is not full study acceptance.
Publication and further external peer attempts remain separate gates.
