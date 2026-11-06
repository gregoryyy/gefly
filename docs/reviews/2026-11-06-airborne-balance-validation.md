# Generic-model airborne balance validation

Independent Codex `cws_validate`; recorded 2026-11-06 07:26 Europe/Berlin. Scope:
R-SIM-11's added generic-model balanced-start criterion, associated current
state/recording/reconstruction boundaries and disclosure, working-tree diff in
`/private/tmp/gefly-airborne-balance` against
`6563c5936f6c74dc3f34d04b5000c6d7a8328b85`. I authored no production code,
permanent fixture or requirement. Only this report and ignored independent
execution fixtures/results were written by this validator.

**Recommendation: pass the bounded balanced-start implementation at these pins,
subject to the final integration gate renewal.** This validates a one-time generic
model equilibrium handoff and its exposed identity, not complete C172S handling,
continuous wings-level assistance, real cockpit roll/yaw trim, complete native
checkpoints, physical trackpad behavior or aircraft/training acceptance. The
broader Task2.0.153 and external peer/fidelity gates remain open.

## Snapshot and independent checks

| Path | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/bridge.cpp` | `e71646929a6f13dbf9abd3eddc2f158fb79fd0ae16e8ed929038d22a3bd893c8` |
| `studies/e1-browser/sim/worker.js` | `5910f3309bc3a6beda64b4b5122f82902ca997d7340df2d628f06896291c96e8` |
| `studies/e1-browser/sim/initial-balance.js` | `470ae2d587f081ae4555b032d07cb7496cf255062911ba6b110612723dd543e4` |
| `studies/e1-browser/sim/initial-balance.test.mjs` | `f3175b20a697b03a8b3332feda057371bbc4de1f3986f6dca30c8acccba18dce` |
| `studies/e1-browser/sim/continue-flight.js` | `12c7ad993ffe2376932606cccee01d0d36e299d420e183780e95f90c9fb463ae` |
| `app/runtime.ts` | `bf5c57769689d88cd3af9a039555dc4cbfd97d28c1a3c5be17db2ffdc76820fa` |
| `app/src/session.ts` | `65c63e37e57b47473fa326e60bb3065c6b309484922077daa8da2a869b26fccb` |
| `app/src/flight-trace.ts` | `ba738d47720fd1e05e4233eaf8e9d4d8e405ed849ff4b1d7268ff9480742b824` |
| `app/src/flight-location.ts` | `d5229f3ea6f2544a938f159aaaafcbf25d3bd084991795a461fa9da23090c82f` |
| `app/src/main.ts` | `3fbbb19b5d620dfa84d1e9f90e0a3eecce3ea1207a9a96daa1ef65e5c28bd4fe` |
| `app/tests/initial-balance.browser.mjs` | `1650a8f26827dbacffaea9022a97d2b3829501ad6405bbaebb30ef9c90d9ae7e` |
| `docs/SPEC.md` | `5eb501674ca926208b13f01ef1ab76aa95ebed7c53f4de7ae835093108466611` |

Read AGENTS/validate, SDLC/STYLE/SEC, applicable SPEC/TODO/EVAL, the user handling
report and the source-applicability/research note. The criterion explicitly uses
existing source full trim once, transfers solved aileron/rudder plus existing
compensation into the model's existing additive trim channels and returns
external axes to zero. It is not a coefficient change or continuous bank servo.
The full trim source's beta/heading-track axis is commented out; solved lateral
moments do not establish coordinated flight or real aircraft fidelity.

I independently ran:

- `node --test studies/e1-browser/sim/initial-balance.test.mjs app/src/session.test.ts app/src/flight-trace.test.ts app/src/flight-location.test.ts`:103 passed, zero skipped, renewed after all trace-identity repairs.
- From `app`, `npm run check && node tests/initial-balance.browser.mjs`:
  TypeScript passed,4 real application/browser groups passed.
- `GF_BALANCE_REFERENCE=/Users/gregor/Documents/devel/gefly/output/flight/handling-regression-native/fulltrim/comparison.json GF_BALANCE_OUTPUT=/private/tmp/gefly-airborne-balance/output/flight/initial-balance/native-validator.json node studies/e1-browser/sim/initial-balance-native.mjs`:18 native cases pass with exact retained reference agreement, plus the harness's ABI/restore/failure/ground boundaries.
- `node output/flight/initial-balance/worker-validator.mjs`:8 independent actual
  browser Worker/native boundary cases pass using a lightweight declared HTML
  wrapper and production runtime/module paths.

Native and app tests overlap source/model conditions; they are distinct boundary
checks, not evidence of an enlarged aircraft-validity envelope.

## Independent actual-runtime artifacts

| Artifact | SHA-256 | Observation |
| --- | --- | --- |
| Author app result preserved as `output/flight/initial-balance-browser-author.json` | `6bea68a78fb12cd6c8fdf07e71709e7058327ebae3b46c5d29b03d620d2ec4e8` |4 authored groups pass before independent rerun. |
| Independent `output/flight/initial-balance-browser.json` | `b8507cc7dd7e013326065c26636d75323df72044572dcc3e020c03d215590e07` |4 groups pass, no page errors,8 source hashes match before/after. |
| Independent `output/flight/initial-balance/native-validator.json` | `9e3e281fac055f1ad60ef78e12b5349d2f3b3ee38b98412f3b47366146e91f9d` |18 cases exactly match retained initial/final14-value native states and trajectory digests. Its bytes equal the author's native result. |
| Independent ignored Worker harness | `7fbdd0a8b9b0900e65e1ee6a764c0f7dd55be68035a3d7341acc66edf1827497` |`output/flight/initial-balance/worker-validator.mjs`, real Worker/native, declared minimal HTML wrapper. |
| Independent Worker result | `1da93efb4939c9de6234838692b856d5316179fa0b69dce01ddd26004b0c4215` |8 cases pass, no page errors,5 production hashes match before/after. |

Both browser executions use Chrome156.0.8078.80 and actual c11a9337… WASM. The
full app fixture uses synthetic scenery pixels and read-only input observation,
not injected aircraft commands/states. My Worker fixture uses actual messages
against the production Worker; only the HTML wrapper is synthetic.

In my full app run, the first SIM1 external axes and subsequent30s sampled axes
are zero with AP off. Bank changes+0.001325507° over the measured interval,
within the predeclared1°/30s generic regression budget. Fixed profile/roll/yaw
identity stays unchanged through the interval and actual AP engagement, held CWS,
release and disconnect. MODEL BALANCED START is visible with a tooltip explicitly
saying there is no continuous wings-level assistance. Saved-location reload
requests profile1 and freshly solves a new airborne initialization. This does not
promise stable response after power/configuration/control disturbances.

My Worker cases directly observe:

1. Profile1 Ready/state agree, trim succeeds and external lateral commands are0;
  120 fixed steps retain the group.
2. Reconstruction from the actual exposed state returns the same profile/trims,
   clock and step, without requesting fresh balance.
3. A partial recorded group is rejected before Ready/state and cannot burst-step.
4. Fresh ground/runway initialization has profile0/roll0/yaw0 and on-ground state.
5. Fresh landing-study initialization has profile0/roll0/yaw0.
6. Zero-speed failed full trim returns an explicit error, no Ready/state, and a
   subsequent run is rejected before init.
7. An incompatible balanced ground request rejects before startup.
8. On the same Worker after a valid balanced flight, an invalid balanced-ground
   reinitialization clears the initialized lifecycle: no new Ready/state is
   published, and both burst and run reject before init.

The native harness separately restores a synthetic later ground-contact frame
with recorded profile1 compensation retained. This is a declared component
boundary, not a real flown landing. All18 cases use60/80/100kt initial matched CAS,
neutral or±0.1 roll pulses at5–7s and normal external-zero loading; they compare
the new transferred-trim handoff against the retained generic full-trim held-input
reference or longitudinal profile0 as applicable. Exact agreement establishes
this handoff, not independent aircraft truth. Pulse cases still retain substantial
bank and do not demonstrate wings-level recovery.

## Criteria

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Default airborne selection/disclosure | Main explicitly requests1 for ordinary fresh airborne starts and absent saved airborne choice; actual app publishes1 with visible model-balanced label. | pass |
| One-time source equilibrium handoff | Native transfer uses existing additive channels after successful full trim, zeros external aileron/rudder/steering and does not add RunIC/step/controller. Independent18-case exact source-reference comparison passes. | pass for generic handoff |
| External commands remain independent | Actual full app first/all sampled30s external axes0; model compensation is separately visible/recorded, and native identity stays fixed through pulses/AP modes. | pass |
| Failed initialization stops | Independent native invalid/failed balanced init leaves gf_step unavailable; actual Worker failed trim has no Ready/state and rejects run/burst afterward. | pass for exercised failures |
| Atomic ready/state identity |103 boundary tests reject malformed/lost/changed groups, old-engine/failed-trim acknowledgement and mismatches among ready/first/later state. Actual Worker ready/state agree. | pass |
| Fixed identity through AP/CWS/input | Actual app AP/CWS/release/disconnect and native pulse/AP transitions retain exact profile/trims. | pass for exercised transitions, no AP tuning acceptance |
| Ground/landing zero; landed continuation retains identity | Actual Worker fresh ground/landing0 and native synthetic landed continuation1 succeed. | pass for scoped boundaries; actual flown landing not evaluated |
| Exposed-state reconstruction | Native35-tail restore sets compensation before RunIC; actual Worker returns exact identity/clock/step. Session unit rejects changed/lost candidate identity without replacing old ready worker. | pass; complete hidden checkpoint not evaluated |
| Current recording group preserved | Final explicit0 and1 traces export version2 with all3 fields; import requires complete group in every v2 frame; record rejects values or group presence changing, including paused rewrite. Renewed103 tests pass. | pass |
| Saved launch profile | Saved data retain request only, ground0; absent saved airborne choice selects1; actual app reload initializes1 freshly. | pass for tests and actual reload |
| Runtime module closure | Explicit allowlist includes initial-balance.js; independent full app and direct Worker run succeed through actual served imports. | pass |
| Build/input identity | All9 actual inputs and both generated glue/WASM hashes equal the isolated build record; dist build-info matches actual c11a9337… output and current bridge. | pass for inspected local build linkage, not an independent rebuild or aircraft rights acceptance |
| Source/numerical units | Metres/radians/mps/time boundaries unchanged; roll/yaw are finite normalized values±1. Existing14-state/32-prefix ABI remains, with atomic35 continuation extension. Boundary/native tests exercise sizes, pointers and invalid tails. | pass for scoped API/units |
| Final shared CI/publication | Prior CI passes but final trace repairs/doc integration require the new final gate execution. | blocked pending final renewal |
| Aircraft fidelity, complete Task153, real editor/trackpad/device behavior, peer/release | Generic short equilibrium and source-algorithm equivalence do not establish these broader claims. | not evaluated / peer pending |

## Build provenance and scope

Inspected build record `output/flight/initial-balance/build-record.json`, SHA-256
`330f48250874f1a29b2b3fdbe4c8dce4081e61145c1f8a6a229b9a8aa2e0f8a2`.
I independently hashed all9 referenced inputs: all match. Current dist outputs
match record glue/WASM hashes; actual WASM is1770590 bytes, SHA-256
`c11a93378da778e34168c5b9043e44448855fb6699a640585d224313722d0f42`.
The bridge hash matches the current source and dist build metadata. Recorded
compiler is existing Emscripten6.0.13 with the existing JSBSim library and six
unchanged model assets. No independent recompilation is claimed. This evidence
belongs to the isolated new build; it does not repair the earlier root11a92… stale
build record or establish model redistribution/installed-aircraft fidelity.

## Repairs and unsuccessful observations retained

Quality first found the missing runtime helper allowlist and v2 identity-loss
acceptance. Those source paths are repaired and affected execution renewed.
Validation additionally found that the initial exporter dropped an explicit
profile0 group to legacy format despite the current-group preservation criterion.
The owner chose implementation preservation: explicit0/1 both use v2, complete
fields required, and presence changes are rejected. I reran all103 affected tests
at the final source, with no added legacy-compatibility acceptance requirement.

My first ignored Worker fixture disabled collision telemetry, so its continuation
was correctly rejected for missing collision_mask. This was a validator-fixture
error, not a product defect. The unsuccessful result is preserved as
`output/flight/initial-balance/worker-validator-collision-fixture-failed.json`,
SHA-256 `6dd544fd5389efe5a5c0c630354b9e81349ec4428e4816a7e770ba0e6313c9a4`.
I corrected the fixture to request real collision telemetry and all7 cases pass.
No production source was edited by the validator.

Prior `/private/tmp/gefly-balance-ci.log` ends passed with skipped checks,
SHA-256 `57e746166160efbe41c1eafc2240966bd62552e1a12cc687167cc07e7b8d9791`:
548 Node+22 Python application tests,85assurance/11training pass, optional JSBSim
9of23 and platform-dependent skip are not passes. Because final trace changes and
documents were integrated afterward, this is not silently promoted to the final
publication gate. The orchestrator must attach the renewed final CI/assurance
result and exact revision. Source changes invalidate affected rows; full hidden
state, generic handling envelope and real-world applicability remain unaccepted.

## Invalid-reinitialization lifecycle renewal

The owner later identified that the new profile validation originally ran before
onInit cleared the previous initialized flag. An invalid request after an
existing valid flight could leave that flag reusable. The owner moved validation
after the original lifecycle reset; no native engine bytes changed. I independently
added/executed the eighth ignored Worker case above on the final branch source,
then executed the same eight cases on the combined root preview separately.
Both pass with source-freeze hashes. This renews the changed failure ordering and
valid Worker initialization/restore/ground paths. The full app30s artifact above
pins the earlier Worker, so it remains evidence for its unchanged normal path,
not proof that it executed this later failure repair. Final shared CI still needs
its explicitly recorded renewed revision.
