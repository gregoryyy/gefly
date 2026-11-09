# Roll-return validation — current snapshot

Recorded 2026-11-06 11:12 Europe/Berlin by Codex `roll_validate`, independently of implementation. Current artifact: `/private/tmp/gefly-stability-response`, commit `aea4d106b886de690b5ba6db73a38504c4515501`; its single browser-test registration delta relative to 40f7493 is qualified below. **Current nine-file implementation manifest SHA-256: `c2deb0730552dc2d84885baa1e10d358f9d69018b8db716647e99b58955913f4`.** The current manifest table below is authoritative for this review. Previous snapshots are preserved only in the explicitly historical appendix.

**Outcome: bounded aileron command-return, affected initialization/AP and installed actual-app checks pass; pre-registration shared CI and the executed registration gate pass with the qualification below.** Broader Task2.0.153, selected 172S fidelity, formal stability, user's internal browser/physical hardware and whole-ROOT assurance are not accepted.

## Current nine-file implementation manifest

| Path | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/prepare-aircraft.py` | `0f0b3913598bdac84f66dec663cd70b7ea687fd3b8a601c3fd7a6f964d910678` |
| `studies/e1-browser/sim/prepare-aircraft.test.py` | `66c00319ddad59205e22d60701a477c2bcc45cacf4a698196b9c0311ec482c01` |
| `studies/e1-browser/sim/disturbance-response-native.mjs` | `6b350252e9b1bd9fadcb42ae6afd453ea7af011ff4dcccd11366b5180cda4b93` |
| `studies/e1-browser/sim/roll-return-native.mjs` | `f67bee27e8286c8dd605fba4f0fd57f966a9cc5e7dfb8702adf6210f4780735c` |
| `studies/e1-browser/sim/roll-return-checks.mjs` | `7a36618833161d1830dd478fcfaf8efac1bc800e7f10f6a1f567b04a5f42c402` |
| `studies/e1-browser/sim/roll-return-checks.test.mjs` | `aa3f3ee5fd7dd4c62e330f53d1c462e95f22767627f204cdd634008c5495d02e` |
| `studies/e1-browser/sim/roll-return-sequence-native.mjs` | `8a4f7a101459a4b4b849e7ed115d82634583c9f45fff2d41b5eb0436e563d7fc` |
| `app/tests/disturbance-input.browser.mjs` | `e3e44f81ff49d0cd78aa8e6c9f97b8a17fe1ff21b9c5e36274e9bfdeb1d23481` |
| `app/package.json` | `20dd8c015cb144bef40d59cb1596a8232c741a525e8da13b7996eb04c31a23b1` |

## Current executing model/runtime identity

| Local-only payload | SHA-256 |
| --- | --- |
| `jsbsim.mjs` | `019d393954ba61d1e09c541496a18413118ed22617608220080ddbea3dea270e` |
| `jsbsim.wasm` | `266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc` |
| `build-info.json` | `cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65` |

The normal-recipe v5 prepared aircraft hash remains `cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595`. JSBSim/library/bridge and the source model's aerodynamic functions are unchanged. The complete prepared model differs from the prior v4 prepared XML only in the two named aileron hysteresis widths 0.005→0. Elevator hysteresis, rate/travel limits, scales, mass, pitch/yaw/AP channels, pilot gains and one-time trim handoff remain. This is a generic research FCS adaptation, not measured C172 rigging or a continuous leveling controller.

## Checks independently executed

- Python3.11.12 adapter tests: 9 pass, including exact-error failure branches. Latest actual pinned-source CLI output was independently checked against the exact two-value byte patch; AP XML is byte-identical.
- Node26.13.0 checker tests: 5 pass. Empty/partial/duplicate/unordered/nonfinite/forged/active-command data is rejected rather than accepted vacuously.
- Current native runner: 57 diagnostic fixtures plus 18 isolated signed-roll checks and 54 successive/opposite-pulse paired checks pass. Every returned actual left/right angle equals its own initial value within the numerical budget; maximum residual is exactly 0. The successive test applies six alternating signed amplitudes in each of three flights, with no fresh initialization between those pulses.
- Current runner asserts producer SHA, native metadata SHA and prepared-model hash against the executed inputs, then rechecks its wrapper/checker/producer/sequence source hashes after execution. Independent output pins are in `/private/tmp/gefly-roll-validate-final-native/`.
- Independently executed unknown `GF_CASE` fails before browser launch. Neutral-only/subset semantics and the complete installed-browser run were independently inspected from supplied execution, as detailed below.
- Earlier independently executed 18 initialization native cases, 8 actual Worker initialization groups, native AP/vertical functions and 9 KAP Worker groups pass on the same physical WASM 266f2016…. Subsequent edits affect only test admission/sampling/provenance and naming; the physical engine remains identical.

Commands actually executed for this renewal:

```sh
/Users/gregor/.pyenv/versions/3.11.12/bin/python3 studies/e1-browser/sim/prepare-aircraft.test.py
node --test studies/e1-browser/sim/roll-return-checks.test.mjs
GF_ROLL_RETURN_OUTPUT=/private/tmp/gefly-roll-validate-final-native node studies/e1-browser/sim/roll-return-native.mjs
GF_CASE=not-a-case node app/tests/disturbance-input.browser.mjs
```

Logs: `/private/tmp/gefly-roll-validate-final-{{adapter,checker,native}}.log`, `/private/tmp/gefly-roll-validate-unknown-selector.log`. The old c11a9337… control engine was meaningfully rejected by the strict physical return regression at 60 kt CAS −.1: 0.1432394488° surface residue after zero command. Earlier actual-app strict old-engine negative97340773… likewise fails at +.5s on −.0025/+.0025 rad; it is distinct from the preserved inconclusive startup-timeout attempt.

The native fixtures start at 60/80/100 kt CAS, 396.24 m MSL, 1/120 s fixed step, normal loading/external station unloaded, clean flaps/AP off, still-air source atmosphere, fixed trim throttle and balanced source trim. Isolated pulses are ±.02/±.05/±.1 for 0.5 s, followed by 20 s observation. Seven release samples are selected by integer step offsets with alignment/distinctness/round-trip guards. The strict numerical mapping budget is 1e-10 degree, not aircraft handling tolerance. Later sampled roll-rate magnitude below release magnitude is a sanity guard only; monotonic decay, settling time and asymptotic stability are not established, and bank angle need not become zero.

## Current installed actual-app evidence

Supplied execution `output/flight/disturbance-input-browser-installed-final.json` SHA-256 `8654925e881ae9ea517c754c2d36d5548e78c529234f62e0c5a0773f749f73b8` is the current complete acceptance run. It uses actual installed ROOT at localhost:5173, with **no native-file override**, isolated Chrome 156 contexts, scenery-pixel fixtures and read-only observers. The executed harness matches current SHA `e3e44f81ff49d0cd78aa8e6c9f97b8a17fe1ff21b9c5e36274e9bfdeb1d23481`. This reviewer independently inspected its source, identities and all observations; I did not launch this complete browser execution.

All five expected scenarios are selected/executed exactly once, `suite.complete=true`, overall result/return status `pass`. The four deliberately excited roll rows pass 24 paired actual-surface return checks at +.5/1/2/5/10/20s. The neutral row has six passing numerical guards and correctly marks the roll-return criterion `not_evaluated`, because it contains no roll excitation. Thus 30 paired numerical guards pass, with 24 actual excited return checks. Both actual ailerons return exactly to their own initial trim, all post-release pilot axes stay zero, AP off / SIM1× conditions are retained, camera/paused-native invariance checks pass, and ROOT source/native hashes remain unchanged across the execution. The virtual position yoke retains a displaced command until centered or cancelled; finger lift alone is not a neutral command.

Diagnostic-only/subset evidence is labeled honestly:

- Installed neutral-only artifact SHA `588f8da86a4ae70aff51dd6c93a88e6f6aed4441fb1283f8fe0f9bdaea6fa4ef`: result `observed`, criterion `not_evaluated`, incomplete suite.
- Installed positive-pointer subset SHA `ea4a33b9b637b7521d7fe8a27e5ef13d73ea87242fc1822da8350157036b6b2e`: result `observed`, criterion `partial`, incomplete suite.
- Explicit observe-only runs do not pass the return criterion. Historical4470/d216 and earlier observation-only “pass” artifacts are not the current acceptance snapshot.

Browser event timings vary and are recorded; these are behavioral checks, not identical-force trajectory comparisons. Sample timestamps are retained and the nearest emitted states are checked; no hardware latency or internal-WebKit/physical-touchpad acceptance follows.

## Current criterion matrix

| In-scope criterion | Expected | Observed evidence | Status |
| --- | --- | --- | --- |
| R-SIM-11 narrow source change | Only both named aileron backlash widths become 0; all other model/runtime control data retained | Independent 9 adapter tests, actual source CLI and exact whole-file two-value comparison; model/native hashes above | pass |
| R-SIM-11 command-return identity | Actual surfaces return to own initial position after each signed command, including successive opposite history | Independent 18 isolated + 54 successive checks, exact zero residual; source rate limit retained | pass |
| R-SIM-11 test evidence admission/provenance | Reject missing/forged/nonfinite/duplicate/incomplete data and wrong producer/model identities | Independent 5 admission groups; current wrapper's producer/metadata/model binding plus before/after source pins inspected/executed | pass |
| R-INPUT-1/R-SIM-11 installed actual-app behavior | Both pointer and keyboard product-release paths satisfy actual finite L/R return | Supplied complete installed five-case run: 4 excited rows / 24 return pairs pass; neutral 6 guards N/A; axes zero / AP off / SIM1× | pass |
| Honest control/subset status | No neutral-only or incomplete suite promoted to complete return acceptance | Unknown selector independently rejected; supplied neutral-only N/A and positive-subset partial statuses inspected | pass |
| R-VIEW-1 diagnostic separation | Camera changes do not create the measured physical roll or alter paused state | Supplied installed actual camera/native invariance assertions pass on unchanged ROOT sources | pass |
| Affected initialization/AP preservation | Fixed trim identity and existing bounded AP/CWS contracts continue | Independent 18 native / 8 Worker initialization, AP-native and 9 KAP Worker groups on the identical physical engine | pass |
| Shared CI and browser registration | Pre-registration source/default-unit gate passes; new first browser command is registered without disturbing the old chain | Complete 40f release CI 555 Node + 25 Python / 85 assurance / 11 training passes with 9 optional study skips. Subsequent package-only prefix preserves all 8 code/test files, test/default/deps/old browser chain; registered native command executes 57/18/54 checks from cwd app | pass |
| Full Task153, selected-aircraft stability, training or whole-ROOT graph | Separate applicable reference/envelope, user-hardware and integrated assurance evidence | Remain outside this bounded control-return review | not evaluated |

## Browser-test registration qualification

After the 40f full CI run, only `app/package.json` changed: `scripts["test:browser"]` now prepends exactly `node ../studies/e1-browser/sim/roll-return-native.mjs && ` to the previous browser chain. Independent object comparison after stripping that prefix equals the 40f package in every field; all other eight implementation/test files retain their reviewed bytes. Default unit-test commands and dependencies are unchanged. The registered first command was executed from `app/` and passes 57 diagnostic / 18 isolated / 54 successive checks; supplied log `/private/tmp/gefly-roll-return-registered-gate.log` SHA-256 `b09617174a692e527cb463b3bfecd1454cfb56a8e1b8038ab2e5662fae5842b9`. The entire older browser chain was not rerun. Thus the full 555/25/85/11 CI evidence is explicitly pre-registration; it is supported by exact source/default-test preservation plus positive execution of the new registration. This report does not claim a whole-browser-suite replay or a fresh full CI run after that single package-field change.

## Final shared gate and compact evidence

Release CI log `/private/tmp/gefly-roll-return-ci-release.log` SHA-256 `0ac6fb02f73395078b12d67b120bac3221f4db2e5a19f10ee04da33d2c4c11e7` was started after commit `40f7493ee16d2dfbc9e9eb6bd75005635d1b3361` and inspected in full. 555 Node + 25 Python application cases, 85 assurance and 11 training pass; 9 of 23 optional JSBSim study cases skip. Integrity reports 58,797 nodes, 71,888 facts, 0 errors, 226 warnings and 135 notes. Final line correctly says “passed with skipped checks”. The eight code/test hashes match 40f; the current ninth package pin includes the subsequent single registration prefix qualified above. This reviewer inspected the supplied full CI run and independently executed the targeted suites above; no hosted-CI, whole-ROOT graph or aircraft-fidelity acceptance follows.

The final compact extract `docs/reviews/2026-11-06-roll-return-observations.json` is 48,541 bytes, SHA-256 `37378331dc745021b5f9509fa675e9c11aec056f4f20cf83dd2d48bdf32418d3`, source revision 40f7493. Independently verified all 9 listed raw artifact SHA-256/byte counts, old/new source maps, full strict regression object, 18 old/new 20 s native pairs, complete 54 successive-pulse sequence object, both five-case browser summaries and 2 selection-guard summaries against raw execution files. All supplied numbers/dictionaries match exactly. The final registered-gate record identifies the exact first native command, app working directory, successful log b0961717… and registration revision aea4d10. The final default-output producer artifact was repinned after this last execution; older generated timestamps are not claimed as fresh. Installed neutral N/A and partial-selection statuses remain distinct from complete-suite acceptance. Older raw artifacts in its source inventory remain historical and are not promoted to current coverage. Compact observations do not self-accept model physics.

## Historical appendix — superseded review snapshots

The following complete prior report (SHA-256 `999221386368f047fc04f1c9b37c83f14fe9217aef9eef53754a2d343c784f4c`) is retained solely as historical review evidence. Its headers, source tables, gates and artifact identities are superseded by the current sections above; none is a current acceptance claim.

<details>
<summary>Historical validation report, before the final nine-file freeze</summary>

````text
# Roll-return validation

Recorded 2026-11-06 10:13 Europe/Berlin by Codex `roll_validate`, independently of the implementation authors. Artifact: `/private/tmp/gefly-stability-response`, base `64dd71efe259bcf3d2308059d3c9f4ec1ce4fbfc` plus the scoped working tree. Source/build manifest SHA-256 `ce3aee51b161ee0fb262b70cdb51c2ed169620a27ead1bb7dfee51563f566c8e`; file pins appear below.

**Outcome: bounded control-return, affected initialization/AP and shared feature-CI criteria pass.** This validates the narrow R-SIM-11 command-return repair under Task2.0.153. It does not accept the full R-SIM-11 requirement, Task153, selected C172S fidelity, automatic wings-level flight, a release milestone or a later ROOT installation.

Renewed 2026-11-06 10:49 after further peer test-quality repairs. Only helper/comment naming changed in the Python adapter; actual CLI output remains byte-identical model cd85bb2a…. Native release sampling now uses integer step offsets, with distinct/aligned/round-trip guards. Independent9 adapter / 5 checker / 57+18 native renewal passes; all 57 result objects are bit-exact to the preceding independently executed run. Browser default now asserts each finite actual left/right surface against its own initial trim at six post-rate-limit times; the strict final five-case artifact passes and a meaningful old-engine strict case fails. Observe-only explicitly reports observed / not_evaluated. Latest source/build/evidence pins supersede the earlier static manifests below; physical WASM remains 266f2016….

Renewed 2026-11-06 10:32: independently inspected the complete author-run shared CI log and verified the compact observation extract against all six retained raw artifact hashes, 18 native 20 s comparisons, the complete regression object and 10 browser summaries. Implementation/build pins remain unchanged from the preceding validation. The initial implementation is commit `43a64dca90903aec0d7d42d7465c54afec24fc08`; the current reviewed working tree includes the later peer test-quality repairs; later documentation records do not constitute additional runtime acceptance. No full ROOT installation/integration is accepted here.

Renewed 2026-11-06 10:25 after the external peer identified insufficient evidence admission in the first wrapper. The prior check could pass incomplete arrays; that earlier wrapper acceptance is superseded. The extracted strict checker now requires all ordered raw/delta/neutral samples, unique signed cases, finite telemetry, zero pilot axes and raw-derived consistency, and measures each returned surface against its own initial value. No runtime, model or force coefficient changed in this renewal.

## Scope and method

Read AGENTS, validate contract, SPEC, TODO, SDLC, STYLE, SEC/EVAL scope, source note, the adapter/tests, native pulse harness/regression and browser harness. The current prepared generic c172x model identifies a 1982 C172P research model, not a validated 172S. No new aircraft-specific tolerance is supplied by this review.

Independently executed:

```sh
node --test studies/e1-browser/sim/roll-return-checks.test.mjs
/Users/gregor/.pyenv/versions/3.11.12/bin/python3 studies/e1-browser/sim/prepare-aircraft.test.py
GF_ROLL_RETURN_OUTPUT=/private/tmp/gefly-roll-validate-positive-final node studies/e1-browser/sim/roll-return-native.mjs
GF_NATIVE_MODULE=/private/tmp/gefly-stability-response/output/flight/roll-backlash-ab/control/jsbsim.mjs GF_ROLL_RETURN_OUTPUT=/private/tmp/gefly-roll-validate-negative-final node studies/e1-browser/sim/roll-return-native.mjs
```

Python 3.11.12: 9 tests pass; Node strict-checker negative-admission tests: 5 pass. Node 26.13.0: 57 diagnostic cases plus 18 signed aileron-return regressions pass against the new normal-build engine. Maximum returned left/right surface difference from their own initial values is exactly 0 degrees. The same regression rejects the old control engine with exit1: `60-aileron--0.1` retains 0.1432394488 degrees of aileron history after neutral. The old diagnostic itself remains valid; its physical return regression fails as expected. Logs: `/private/tmp/gefly-roll-validate-{adapter,checker,positive,negative}-final.log`; independent native outputs are in `/private/tmp/gefly-roll-validate-{positive,negative}-final/`. No author artifact was overwritten.

The native fixture starts at 60/80/100 kt CAS,396.24 m MSL,1/120 s fixed step, ordinary loading/external station unloaded, clean flaps, AP off, balanced start, fixed trim throttle and still-air model atmosphere. Signed±0.02/±0.05/±0.1 pulses last0.5 s after 5 s settling, then 20 s release. Return is checked at≥0.5 s to retain the source rate-limit delay. The1e-10 degree equality budget expresses a numerical FCS command identity; it is not a real-aircraft surface-rigging or handling tolerance.

I independently compared the actual old prepared XML against the normal-build v5 XML: the complete new byte string equals the old byte string with only the two `hysteresis_width` values0.005→0. AP XML is byte-identical. Normal-build WASM 266f2016… equals the isolated two-value counterfactual. The independently inspected control-build record has WASMc11a9337…, bit-identical to the then-running ROOT engine; bridge/library remain unchanged.

Actual-browser evidence below was executed by the implementation author and independently inspected here, including the executable assertions and all case values/source pins; this reviewer did not independently launch its browser run.

## Criterion matrix

| In-scope criterion | Expected | Observed evidence | Status |
| --- | --- | --- | --- |
| R-SIM-11: remove only the two source aileron backlash bands | Both named source actuator widths become 0; unrelated XML stays unchanged | Independent exact whole-file byte comparison, adapter 9 tests and source inspection. Old prepared 02d1811a… → new cd85bb2a…; AP 5e97d48b… unchanged | pass |
| R-SIM-11: retain rate/travel limits, scales, pitch/yaw channels, mass and aerodynamic functions | No retuned force/moment coefficients, controls, loading or surface travel | Exact two-number byte delta proves all other model bytes retained. Adapter tests check named actuators, elevator 0.05 rad hysteresis, rates/scales/aerodynamics and AP wiring; bridge and static library hashes unchanged | pass |
| R-SIM-11: fail closed and idempotent model preparation | Unknown/partial/missing/duplicate actuator wiring rejected; known full patch repeats exactly | Independently executed 9 adapter tests cover original source hash rejection, malformed/partial/duplicate pairs, idempotence and copied provenance; production source hash remains pinned | pass |
| R-SIM-11 test evidence admission | Missing/incomplete/duplicate/nonfinite/active-input/forged data must fail rather than pass vacuously | Independent 5 negative-admission groups pass; complete exact seven sample times and 18 unique signed cases required; raw/neutral/delta consistency and own-initial surface checks inspected | pass |
| R-SIM-11: the same returned command/trim gives the same actual aileron position | Both surfaces return to their pre-pulse positions after signed pulses despite prior direction/magnitude | Independent 57-case native run and 18 roll regression cases; zero residual for both actual surfaces against their own initial values at all checked return samples. Old control fails on retained 0.143239 degrees. Full trim identity remains fixed through every diagnostic | pass |
| R-SIM-11/R-SIM-5: sampled post-release native-rate observation | Distinguish reduced driving moment/rate decay from demanded bank self-leveling | At 80 kt CAS, +0.02 pulse, old 20 s relative roll rate +0.32555°/s and bank+8.46175°; new −0.00717°/s and +0.47569°. All 18 roll cases satisfy later sampled roll-rate magnitude below release magnitude. This is a sampled sanity guard only, not monotonic decay, settling-time or asymptotic-stability acceptance. Bank need not become 0 | pass |
| R-INPUT-1/R-SIM-11: actual pointer and keyboard release path | Product releases all pilot axes to 0; both finite actual ailerons return to their own initial trim at six post-rate-limit samples | Supplied final STRICT five-case normal-v5 artifact passes 30 paired surface checks at +.5/1/2/5/10/20s, zero residue, AP off / SIM1×. Old strict left-pointer case fails at +.5s with −.0025/+.0025 rad. Observe-only correctly remains not_evaluated. Candidate native files served in every case | pass |
| R-VIEW-1 diagnostic separation: camera motion is not the measured roll defect | Native flight roll/commands explain change; camera switches do not change physics | Supplied real cockpit/chase vector checks and paused step/digest/all 14 native-state equality assertions pass. Fresh neutral browser flight is identical before/after; source hashes stay unchanged during each run | pass |
| Build/provenance scope | Model version and executing native bytes identify the actual adapted model; no kernel replacement | New normal build metadata identifies adapter v5, WASM 266f2016…, model cd85bb2a…, bridge e7164692…, library 85bbfda4…; all six embedded model hashes declared. Candidate browser binary matches normal build | pass |
| R-AP-1/R-SIM-11 affected initialization and AP contracts | Existing initialization identity, manual/AP/CWS boundaries and bounded AP functions continue | Independently reran 18 native initialization cases, 8 actual Worker initialization groups, native AP/vertical functions and 9 actual KAP Worker groups. All pass on the 266f2016… engine; no archived old-model trajectory reference is claimed | pass |
| Final shared feature CI | Shared gate passes on the reviewed implementation with explicit skipped checks | Inspected latest author-run `/private/tmp/gefly-roll-return-ci-final.log`:555 Node + 25 Python application tests, 85 assurance and 11 training pass; 9 of 23 optional JSBSim study cases skip. Assurance 58,795 nodes / 71,879 facts / 0 errors, 226 warnings / 135 notes. Current source/build pins identify the renewed snapshot | pass |
| Versioned numerical observation extract | Tracked compact results match identified raw execution artifacts without manufacturing acceptance | Independently checked all six artifact byte counts/SHA-256, source maps, complete regression object, 18 old/new 20 s native tuples and 10 browser compact rows against raw local artifacts. Exact equality; source observations remain distinct from this review | pass |
| Broader Task153 / R-SIM-5 selected-aircraft stability and handling | Applicable references and justified independent envelope/transient tolerances | No selected 172S stability reference/tolerances or complete handling envelope. Pitch hysteresis, 110 kt trim and wider dynamics remain open | not evaluated |
| User's VSCode/internal browser and physical touchpad feel | Actual supported user browser/hardware reproduction after installation | Supplied browser uses isolated headless Chrome 156 contexts with synthetic scenery pixels. No direct internal-browser/physical trackpad acceptance | not evaluated |
| Cross-provider peer / milestone acceptance | Eligible external-provider evidence at the final integrated revision | This Codex validation is not a cross-provider review; no such acceptance supplied here | not evaluated |

## Renewed independent AP checks

Also independently executed `node studies/e1-browser/sim/initial-balance-native.mjs`, `initial-balance-worker.mjs`, `autopilot-native.mjs` and `kap140-worker.mjs`. All pass. Logs are `/private/tmp/gefly-roll-validate-{balance-native,balance-worker,ap-native,kap-worker}.log`. These establish the named source-model functional cases; they do not validate installed KAP140 servos or replace aircraft handling evidence.

## Browser observations and freshness

The supplied ROOT app was unchanged between baseline and candidate; all pinned before/after source hashes are equal and were fresh when independently checked. Baseline executing harness copy/hash is retained; candidate harness hash matches the reviewed source. Candidate native override is per isolated browser context; ROOT remains at the old c11a9337… engine at this review point. Scenery pixels and read-only observers are fixtures; product pointer/key paths and Worker/native physics are real.

| Actual app case | Old bank release→20 s | Candidate bank release→20 s | Released surface offset |
| --- | --- | --- | --- |
| Pointer right 15 px | +2.530°→+10.639° | +3.060°→+2.488° | old left+0.0025 rad/right−0.0025rad; new both 0 |
| Pointer left 15 px | −2.518°→−10.555° | −3.002°→−2.431° | old left−0.0025 rad/right+0.0025rad; new both 0 |
| Keyboard right | +4.209°→+14.144° | +2.756°→+5.074° | oldsigned residue; new 0 |
| Keyboard left | −5.516°→−14.766° | −4.804°→−6.180° | oldsigned residue; new 0 |

Keyboard candidate bank can continue initially due to inertia; its20 s roll rates point toward recovery (−0.097/+0.115°/s). Gesture timing varies and is recorded. These browser pairs are behavioral observations, not matched-force trajectories or aircraft tolerances. Neutral case is identical: bank−0.047047°→−0.046137° in20 s, surfaces unchanged.

Earlier observational normal-recipe v5 run (superseded for strict return-criterion acceptance): `output/flight/disturbance-input-browser-final-v5.json`, SHA-256 `97dd71b2a554d2c915f60e01834fa92c87ed4bfa26458c541225f7ac36ddb9eb`, passes all 5 cases. The current portable harness SHA-256 `919e964170baa878049535e43d7e8192c22c2e56959c4a0769cea1689992e57a` matches its executed pin. Provenance explicitly identifies the actual ROOT source override and server origin. MJS/WASM/build-info were served in every case; the WASM 266f2016… and normal-build metadata `f28511d50814c5a35c317b042d7e72148779790a064e36bf3c9a36c6d5527609` match the reviewed build. All released axes stay 0 and both actual ailerons return exactly to initial positions. This supplied browser execution was independently inspected, not rerun by this validator.

Historical paired mechanism artifacts independently inspected:

- `output/flight/disturbance-input-browser.json`: SHA-256 59f0753697bd945ee6b70c5e5982293148b079df3cd113789079f3a44f9bc4a7.
- `output/flight/disturbance-input-browser-no-roll-backlash.json`: SHA-256 3c3e52f13d82c67370736dfbedf6106fe9d4cfd681b4019313ba7e235f00235e.
- `output/flight/disturbance-input-comparison.json`: SHA-256 eed1998cbdd7a90ed7a6aba9f8764c49c8678bad35f39b8219ae051340284f60.

## Current strict browser acceptance

Independently inspected `output/flight/disturbance-input-browser-final-v5-strict.json`, SHA-256 `d21695bd53617f8a037da5027702bf0481dc14414a21ddb4854556dd3adc0388`. All five actual-app cases pass. Each contains six finite left/right observations at +.5/1/2/5/10/20s: 30 paired surface checks, each exactly 0 relative to its own initial trimmed angle. Numerical budget is 1.7453292519943296e-12 rad (1e-10 degree), a source numerical-repeatability check rather than aircraft rigging tolerance. Browser samples are nearest emitted states to the requested times, with timestamps retained; no exact hardware latency or timing-fidelity acceptance. All pilot axes remain 0 after product release. Current/executed harness 4470ed58210775a04bb3bd2b2637171bf71eafd03eb614942d01141a44640c68 matches, and final normal MJS/WASM/build-info are actually served in each isolated context. WASM remains 266f2016…; normal metadata SHA-256 is `cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65`.

Meaningful old strict negative artifact `output/flight/disturbance-input-browser-old-strict-negative.json`, SHA-256 `97340773d224c1b69628c3edab206d48c749cc27a00dd7d96fc23f6963ebba34`, fails at the first+.5s left-pointer return assertion with finite left/right residual −.0025/+.0025 rad. The explicit observe-only old case (`output/flight/disturbance-input-browser-old-observe-only.json`, SHA-256 `1544749d20416656198d7849b5499fbb7bbcd2fe57ad3755623f865cc75764be`) is correctly labeled `observed` and return criterion `not_evaluated`, never pass. The first old-negative startup-timeout attempt is retained separately as inconclusive infrastructure evidence, not promoted to a meaningful negative check. Historical “pass” observations above do not establish this newer strict criterion.

These browser executions were supplied by the implementation author and independently inspected here; this reviewer did not run the browser. Source/ROOT files remained unchanged across the supplied runs. This does not establish the user's internal WebKit/physical touchpad or a later full-ROOT installation.

## Final shared gate and compact evidence

Latest shared CI log `/private/tmp/gefly-roll-return-ci-final.log` SHA-256: `8aae703362f2deff1251cd74e910140846c9d814151197923fa5501a6dbffdea`. Inspected complete run:555 Node + 25 Python application tests, 85 assurance and 11 training pass; 9 of 23 optional JSBSim study cases skip. Assurance 58,795 nodes / 71,879 facts / 0 errors, 226 warnings / 135 notes. Source-file/body pins in this report identify the reviewed working tree. This reviewer inspected the full CI run; independent execution remains the targeted adapter/checker/native/initialization/AP commands above. Final line correctly says “passed with skipped checks”. Zero integrity errors does not renew historical aircraft/handling/training acceptance; hosted CI and full ROOT integration remain outside this review.

The compact extract `docs/reviews/2026-11-06-roll-return-observations.json` is 36,146 bytes, SHA-256 `42c9e40b71a3121701720d3eddbb1b1d349a848d4e649c9bffd35eb0a2554da8`. Independently checked all six retained raw artifact byte counts/SHA-256, source maps, entire strict regression object, 18 signed native old/new 20 s metric pairs and 10 browser summaries. New browser rows also include all 30 strict paired surface observations; each exact dictionary/number comparison passes. Its old-browser `return_contract_status ` annotation correctly says historical observations, not strict acceptance. Old empty native-override-hit arrays are unavailable historical instrumentation, not evidence that no native files loaded. Compact observations do not self-accept the model.

## Reviewed file pins

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `8833976955cb6ee389592f69e5e18cb8e838f08df6ba191ae976aeb610063472` |
| `studies/e1-browser/sim/prepare-aircraft.py` | `0f0b3913598bdac84f66dec663cd70b7ea687fd3b8a601c3fd7a6f964d910678` |
| `studies/e1-browser/sim/prepare-aircraft.test.py` | `66c00319ddad59205e22d60701a477c2bcc45cacf4a698196b9c0311ec482c01` |
| `studies/e1-browser/sim/disturbance-response-native.mjs` | `6b350252e9b1bd9fadcb42ae6afd453ea7af011ff4dcccd11366b5180cda4b93` |
| `studies/e1-browser/sim/roll-return-native.mjs` | `98b4d32cd17894de6debd20ca1477449b78053b53ce94a6e914ded043549d8a2` |
| `studies/e1-browser/sim/roll-return-checks.mjs` | `7a36618833161d1830dd478fcfaf8efac1bc800e7f10f6a1f567b04a5f42c402` |
| `studies/e1-browser/sim/roll-return-checks.test.mjs` | `aa3f3ee5fd7dd4c62e330f53d1c462e95f22767627f204cdd634008c5495d02e` |
| `app/tests/disturbance-input.browser.mjs` | `4470ed58210775a04bb3bd2b2637171bf71eafd03eb614942d01141a44640c68` |
| `studies/e1-browser/sim/dist/jsbsim.mjs` | `019d393954ba61d1e09c541496a18413118ed22617608220080ddbea3dea270e` |
| `studies/e1-browser/sim/dist/jsbsim.wasm` | `266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc` |
| `studies/e1-browser/sim/dist/build-info.json` | `cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65` |
| `docs/reviews/2026-11-06-roll-return-observations.json` | `42c9e40b71a3121701720d3eddbb1b1d349a848d4e649c9bffd35eb0a2554da8` |

Any later implementation/model/native change requires affected renewal. A versioned model-control adaptation does not establish source data rights, a validated C172S, training credit or regulatory approval. No source/implementation/shared-status file was changed by this validator.

````

</details>
