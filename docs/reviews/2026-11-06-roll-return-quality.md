# Current roll-return quality review

**CURRENT as of 2026-11-06 11:27 Europe/Berlin — no remaining blocking quality findings in the nine-file snapshot below.** Reviewer: Codex `roll_quality`, independent of the implementation authors. Scope: Task2.0.153 / bounded R-SIM-11 command return and R-SIM-5 test/numerical quality, not full aircraft stability, selected C172S fidelity, whole ROOT CI or cross-provider peer acceptance.

Review base: `64dd71efe259bcf3d2308059d3c9f4ec1ce4fbfc`. Source snapshot: HEAD`40f7493ee16d2dfbc9e9eb6bd75005635d1b3361` plus frozen working-tree source. The nine-file SHA map below is the current implementation/test identity; narrative/source pins in the historical appendix are historical only. A final commit/diff may change documentation and Git identity without changing these nine inputs; any changed input requires affected renewal.

## Current source pins — all nine files

Manifest SHA256`c2deb0730552dc2d84885baa1e10d358f9d69018b8db716647e99b58955913f4` over the sorted source-hash map. The ninth file is package/test registration; eight files are implementation or tests.

| File | SHA256 |
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

Current native WASM is`266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc`; prepared aircraft is`cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595`; build metadata is`cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65`. The normal recipe and the isolated two-value counterfactual produce the same WASM. The retained control relink is bit-identical to original`c11a9337…`. Native code, library, aerodynamic functions and other prepared model bytes retain their documented separate provenance/rights limits.

## Current outcome and independent checks

No remaining blocking finding in the reviewed adapter, native producer/checker/sequence, browser harness or registration. The adapter operation is specifically setting only the two named aileron actuator hysteresis widths to zero, preserving source rates/travel/scales, mass, pitch/yaw, existing AP/mixture/steering and aerodynamic functions. It does not force the actual surfaces to absolute zero, remove fixed trim, fit a gain or add a continuous bank correction. The actual pinned-source CLI was independently exercised, and exact two-value byte comparison/AP preservation were independently verified.

Independent executed checks supporting the current or unchanged runtime:

- 9 Python adapter tests pass after the precise malformed/unclosed fixture repair and zero-width naming. Log `/private/tmp/gefly-roll-quality-zero-width-tests.log`. Original source hash gate, exact limited changes, idempotence and expected error causes are covered.
- 5 strict evidence-admission unit tests pass, including empty/partial/duplicate/unordered samples and missing/nonfinite/forged/active-command evidence. Log `/private/tmp/gefly-roll-quality-checker-tests.log`.
- Current final wrapper independently rerun:57native diagnostic cases,18signed return checks and54successive-pulse paired settling checks pass with maximum returned-surface residual0. Log `/private/tmp/gefly-roll-quality-sequence-final.log`, output `/private/tmp/gefly-roll-quality-sequence-final/`. The sequence executes successive opposite pulses within one flight at each60/80/100kt initial CAS; it does not reinitialize between pulses.
- The new sequence independently run directly against the retained old engine fails at the first60kt +0.1pulse, with0.0025rad retained history. Earlier independent old-engine18case negative also fails the intended return assertion at0.143239°. These are meaningful criterion failures, not startup failures.
- The integer-step producer was independently rerun; complete57case results were bit-exact to the prior floating-selection run. Logs `/private/tmp/gefly-roll-quality-integer.log` and `/private/tmp/gefly-roll-quality-final.log`. Safe integer/round-trip/distinct offset assertions preserve the declared seven labels.
- Existing autopilot-native and18initial-balance/ABI/identity/reconstruction checks independently pass on this same unchanged v5 WASM. Logs `/private/tmp/gefly-roll-quality-autopilot-native.log` and `/private/tmp/gefly-roll-quality-initial-balance.log`. No old-model trajectory reference or installed KAP140 acceptance is inferred.

The final wrapper binds the on-disk producer SHA, selected metadata SHA and prepared model SHA before admitting the report; current checker/self/sequence/producer source hashes are checked again after both tests. It writes final regression success only after the successive-pulse check succeeds. The strict admission function requires18unique signed fixtures, complete ordered seven-point raw/delta/neutral sample arrays, finite consumed telemetry and zero pilot axes; it verifies derived values against raw data and actual returned L/R against each case's own pre-pulse target. Empty reductions cannot pass. Its rate comparison remains explicitly a sampled sanity guard, not a formal modal, monotonic-decay, settling-time or asymptotic-stability criterion.

## Current actual-app evidence inspected

Current installed ROOT, without native HTTP overrides: `output/flight/disturbance-input-browser-installed-final.json`, SHA`8654925e881ae9ea517c754c2d36d5548e78c529234f62e0c5a0773f749f73b8`. Independently inspected result`pass`, return`pass`, exact five expected/executed IDs and suite`complete:true`. All30paired numeric guards are finite and have exactly zero measured residual; neutral is explicitly not a deliberate return test, while four signed pointer/keyboard cases pass their return criteria. Current harness SHA matches the source table and ROOT source hashes before/after match. Actual SIM1/APoff UI/Worker/native motion is measured; scenery pixels/read-only observers are fixtures. This reviewer inspected this supplied browser execution, rather than executing the browser suite independently.

Selection-status repairs are current and verified in source and supplied artifacts:

- Installed neutral-only artifact SHA`588f8da86a4ae70aff51dd6c93a88e6f6aed4441fb1283f8fe0f9bdaea6fa4ef` reports`observed`/`not_evaluated`, suite incomplete. Its numeric control guard still executes.
- Installed positive subset artifact SHA`ea4a33b9b637b7521d7fe8a27e5ef13d73ea87242fc1822da8350157036b6b2e` reports`observed`/`partial`, suite incomplete, with its case return check passing. It cannot masquerade as a complete five-case pass.
- Unknown selectors are rejected before browser launch; this reviewer independently executed an invalid selector and observed the expected rejection. Log `/private/tmp/gefly-roll-quality-invalid-selection.log`.
- Observe-only explicitly reports`observed`/`not_evaluated`; historical meaningful old strict negative reaches the return assertion and fails at+.5s with−0.0025/+0.0025rad residual. Its earlier startup SyntaxError is separate and is not accepted as regression proof.

The source-root portability finding is repaired with a repository-derived default and explicit alternate source-root provenance. Candidate native paths use filesystem`resolve(nativeDir,name)`, avoiding hand-built file URLs. No source or real user browser context is modified by these diagnostic reads.

## 2026-11-06 11:27 current registration-only renewal

Independent byte-level verification confirms that `test:browser` now begins with exactly`node ../studies/e1-browser/sim/roll-return-native.mjs && `. Removing only that inserted prefix reconstructs the entire prior package byte stream and SHA`1f8da6f46ac8d4af79b066bfb7ce9c8d767d091124ac079cebc35079089a5941`. Every prior browser command, ordering, other script and dependency is unchanged. All eight implementation/test source hashes above are unchanged; only the ninth package pin changes to`20dd8c015cb144bef40d59cb1596a8232c741a525e8da13b7996eb04c31a23b1`. This installs the bounded native return regression in the aggregate browser gate, rather than relying only on a separately invoked script.

Inspected supplied execution of that registered prefix from app cwd:57diagnostic cases,18single-pulse return checks and54successive-pulse checks pass. Log `/private/tmp/gefly-roll-return-registered-gate.log`. This is proof of the new prefix, not a claimed execution/pass of the entire pre-existing browser chain. No browser or native-physics rerun was necessary for this text-only registration review; the independently executed checks above retain identical implementation inputs. Prior external peer coverage applies to the earlier nine-file manifest`3e4a2dc42227ca3b8e3f25fdd1ce2d0edd2fed904b632d797eb4b54d3b04c02a`; the package-only supplement retains its own actual status and must not be inferred from this quality review.

Known nonblocking external-review follow-ups remain explicit and are not silently represented as repaired: separate the sampled rate sanity guard from the mapping gate for future model-calibration work; strengthen camera references that reuse product basis functions; preserve the original failure if after-error source hashing itself fails; and include all installed glue/metadata hashes directly in future browser artifacts. Current evidence remains bounded by the independent native mapping checks, frozen runtime/install hashes and observed successful runs. No additional physics/code changes or full stability claim is included here.

## Current limits and gate separation

This supports a bounded control-history repair. Removing hysteresis can make small commands act immediately; it is not a steering-gain reduction or a promise of automatic level flight.20s post-release clean/still-air/declared loading/trim-power cases do not validate other masses/powers/turbulence, pitch hysteresis,110kt initialization, spiral modes, hardware feel or the selected C172S envelope. Source model is generic1982C172P research data with unresolved rights/applicability restrictions. No generated model/native redistribution, training credit or certification is accepted here.

The separate [ROOT integration quality review](2026-11-06-roll-return-root-integration-quality.md) records its own preserved source/install snapshot; this current feature review does not silently renew another scope. Final shared CI, assurance and separate specification validation must retain their actual evidence/outcomes. External peer findings informed the repairs, but this same-provider report is not external-peer acceptance.

## Historical appendix — superseded review snapshots, not current pins

The following is the prior dated record, retained verbatim for audit. Its earlier source manifests, browser harness variants and provisional outcomes are historical. Only the CURRENT header, nine-source table and current evidence above describe this frozen review.

````text
# Roll-return repair quality review

Recorded 2026-11-06 10:14 Europe/Berlin by Codex `roll_quality`, independently of the implementation authors. Scope: `/private/tmp/gefly-stability-response`, base `64dd71efe259bcf3d2308059d3c9f4ec1ce4fbfc` plus the implementation snapshot below. Task2.0.153, bounded R-SIM-11 control-return criterion and R-SIM-5 numerical/test quality. This is quality review, not selected-aircraft fidelity, specification acceptance or external peer review.

## Outcome

No remaining blocking runtime or adapter findings in the reviewed snapshot. The medium browser-portability issue and the external peer's regression-vacuity issue are repaired and independently rechecked below. The final normal-build v5 STRICT five-case browser artifact is current and independently inspected in the latest renewal below. No remaining blocking quality finding in this scoped snapshot. The change is a generic prepared control-mapping adaptation, not evidence that zero backlash is a measured C172 rigging value or that the aircraft must return to wings level.

## Checks actually executed

- Ran Python3.11 `studies/e1-browser/sim/prepare-aircraft.test.py`:8tests pass. Tests cover unknown/missing/duplicate/partial actuator targets, source hash gates, idempotence, exact limited changes, rate/travel/scales/elevator preservation and existing mixture/steering/AP wiring. After the external fixture-specific finding, the renewed9-test suite also independently passes with anchored error messages and a true unclosed-last-actuator case.
- Independently called the adapter CLI function against the actual pinned aircraft source into a temporary directory. Output XML is byte-equal to prior v4 prepared XML with exactly the two `0.005` aileron hysteresis values changed to `0`. Prior model SHA`02d1811a…`; new model SHA`cd85bb2afcd50b10238addf2f43493368b2266b83530786d1b3f6ccf3cc87595`. AP XML is byte-identical. The pinned upstream files remain unchanged.
- Independently reran57native cases against the current v5 engine and57against the retained control engine. Both include exact deterministic repeat and unchanged-WASM checks. Outputs are `/private/tmp/gefly-roll-quality-current/` and `/private/tmp/gefly-roll-quality-control/`; logs have matching names plus `.log`. The old source holds a signed0.0025rad/0.143239° differential aileron offset after every tested signed roll pulse. V5 returns both surfaces to their matched neutral values. At80kt CAS and+0.02command for0.5s, control20s bank/rate deltas are+8.4617468°/+0.3255478°/s, versus v5+0.4756914°/−0.0071714°/s. These are generic-model observations, not C172 acceptance tolerances.
- Independently ran `roll-return-native.mjs` against v5: all18signed roll-return assertions pass, with zero measured returned-surface residual. Independently ran the same test against the retained control engine: it fails the first surface-return assertion at0.143239° as expected. This proves the regression detects the old mechanism rather than merely accepting any finite trajectory. Logs `/private/tmp/gefly-roll-quality-regression.log` and `/private/tmp/gefly-roll-quality-negative.log`.
- Independently ran existing `autopilot-native.mjs`: passes climb/capture/descent/ALT and terrain-reference/controller boundary checks. This does not validate installed KAP140 gains or the whole autopilot envelope. Log `/private/tmp/gefly-roll-quality-autopilot-native.log`.
- Independently ran existing `initial-balance-native.mjs`:18cases and ABI/identity/reconstruction/AP/CWS/failure checks pass. No retained old-model trajectory reference is supplied (`retained_reference_exact:false`); that is not claimed. Log `/private/tmp/gefly-roll-quality-initial-balance.log`.

## Source, numerical and test inspection

The two actuator settings are in radians; the0.005rad band uses half-width0.0025rad in the pinned `FGActuator::Hysteresis` code. The repair retains source rate limits, travel limits and normalized command scales, and does not modify aerodynamic functions, loading, pitch/yaw channels, pilot gains, native step size or camera state. The original full-file source hashes remain the production admission gate; the textual helper separately rejects malformed/partial target shapes. The v5 adapter ID and prepared hash distinguish this model from v4.

The normal build produces WASM`266f201652e8fc3fb6c5ee384bad3ef1f66b335ee9885fa4a14de9a797c1edcc`, equal to the isolated two-value counterfactual. Its prepared model bytes occur exactly once in the executing WASM. The retained control relink equals the original executing WASM`c11a93378da778e34168c5b9043e44448855fb6699a640585d224313722d0f42` byte-for-byte. Together with the independent adapter comparison, this supports the causal source change without replacing aerodynamic coefficients. Build/library provenance and aircraft-data rights retain their separate documented limits. No generated aircraft XML or native binary should be redistributed by this source patch.

The diagnostic samples actual commands, actuator angles and body rates, distinguishes angle from rate and compares with a matched neutral trajectory at each speed. It uses fixed native trim and throttle with APoff, zero flaps and normal declared loading. The durable regression checks the individual surfaces after source rate-limit settling, rather than only their differential sum. Its1e−10degree equality budget is floating-point engineering equality, not a real-aircraft rigging tolerance. Rate checks show bounded sampled diminution; they do not prove modal eigenvalues, monotonic damping at every instant, the full flight envelope or automatic level recovery.

## Browser evidence inspected, not independently executed

The observation-only browser artifacts listed in this original section are historical runs at their archived harness versions. Their `pass` labels cover the then-existing checks; they are not accepted as durable aileron-return regression passes. The current STRICT artifact and meaningful failing counterexample are recorded in the latest renewal below.

Inspected the authored five-case baseline and five-case counterfactual actual-app artifacts and their source/harness metadata. The tests use isolated Chrome contexts and actual UI/Worker/native flight, with synthetic scenery pixels and read-only observers. HTTP overrides serve only candidate glue/WASM/build metadata; no state or control command is replaced. Both recorded ROOT before/after source hashes match. Pointer and keyboard release return all external axes to zero. Baseline individual ailerons retain±0.0025rad, while every candidate pulse returns to its initial positions. Camera-switch checks preserve paused native step/digest/all14state fields and use dimensionless coordinate tolerance. Gesture wall-time differs, so browser trajectories are observations rather than identical-force matched comparisons. The deterministic native paired test supplies the controlled comparison.

- `output/flight/disturbance-input-browser.json`:5cases pass; artifact SHA`59f0753697bd945ee6b70c5e5982293148b079df3cd113789079f3a44f9bc4a7`. Its original executed harness copy/hash is retained.
- `output/flight/disturbance-input-browser-no-roll-backlash.json`:5cases pass; artifact SHA`3c3e52f13d82c67370736dfbedf6106fe9d4cfd681b4019313ba7e235f00235e`. CounterfactualWASM is the same as the final v5 build.
- Earlier portable-source-root renewal `output/flight/disturbance-input-browser-no-roll-backlash-portable.json`:5cases pass, no errors; then-current archived harness SHA matches, ROOT source hashes unchanged, and explicit source root is recorded. Independently inspected this supplied execution; artifact SHA`cb9ecdf419f09f9e3efedc6c49686bfd39d4159b609a24b72808c83dd7f042c1`. The earlier normal-build v5 observation-only artifact was also inspected: `output/flight/disturbance-input-browser-final-v5.json`,5cases pass, current harness SHA/explicit source root/unchanged ROOT hashes, and actual served glue/WASM/build-info pins match final v5. Artifact SHA`97dd71b2a554d2c915f60e01834fa92c87ed4bfa26458c541225f7ac36ddb9eb`. This supplied browser execution was independently inspected, not executed by this reviewer.

## Finding Q1 — medium — browser source hashes tied to one absolute checkout

Original location: `app/tests/disturbance-input.browser.mjs` line8, `root='/Users/gregor/Documents/devel/gefly/'`. Running the diagnostic from another checkout/user would read an unrelated tree or fail with ENOENT, preventing reproducible published testing and potentially mislabeling source provenance. Expected: derive the repository path from the harness URL and allow an explicit read-only source-root override when testing a different running server.

Returned to code2. Source repair now derives `repositoryRoot` using `fileURLToPath(new URL('../..',import.meta.url))`, resolves `GF_DISTURBANCE_SOURCE_ROOT`, and records the selected source/repository/origin ownership. Independently inspected the repair. That dated portable execution renewal passed5cases with its archived harness/source provenance and unchanged ROOT hashes, independently inspected here. Q1 is resolved. The old scoped ROOT artifacts remain historical evidence and are not relabeled as current-harness execution.

## Limits

This is a bounded repair of persistent surface deflection after a returned command. Removing the band also makes small commands act immediately; it is not a steering-gain reduction. Broader sensitivity, pitch hysteresis, sustained bank/spiral behavior, other masses/powers/turbulence/110kt initialization and selected C172S dynamics remain open. The model is source-marked generic1982C172P research data with unresolved redistribution/applicability limits, not a validated classic172S. No real user VSCode/WebKit trackpad session, aircraft certification, training outcome, full ROOT integration, full shared CI or cross-provider peer acceptance is established by this report.

## 2026-11-06 10:24 renewal after external peer test findings

The earlier quality run exercised complete real native reports and did not identify the empty-array admission hole. External peer review identified that `every()` could pass on empty release arrays and `Math.max(...[])` could produce−Infinity. That was a concrete test-quality defect, independent of the valid existing native observations. It is now repaired rather than excused by the current producer contract.

Independently inspected the extracted `roll-return-checks.mjs` and its unit fixtures. Admission requires the exact18unique signed speed/pulse identities, the complete seven ordered times in raw and delta arrays and matched neutral arrays, finite consumed numeric fields and zero case pilot axes. Every consumed delta is checked against raw-minus-neutral telemetry. Actual returned left/right surface positions are compared to the case's own pre-pulse position, so the producer's derived residual cannot hide a wrong returned target. Both reductions receive statically nonempty validated arrays. The runner pins its own and checker source hashes before/after execution. Its rate check is explicitly a sampled sanity guard, not a settling-time or formal stability proof.

Independently ran `node --test studies/e1-browser/sim/roll-return-checks.test.mjs`:5tests pass, including empty/partial/duplicate/unordered samples, missing/duplicate/mislabeled cases, missing/nonfinite/forged/active-command telemetry and sampled-rate sanity negatives. Independently reran the final real native runner with a separate temporary output:57cases plus18return checks pass, maximum returned-surface residual0. Independently reran final runner against the retained old engine: it fails the returned-surface assertion at0.143239° as expected. Logs `/private/tmp/gefly-roll-quality-checker-tests.log`, `/private/tmp/gefly-roll-quality-final.log` and `/private/tmp/gefly-roll-quality-final-negative.log`.

The external low fixture finding is also repaired. The old unclosed-XML fixture removed earlier closing tags and could fail an unintended guard. The new test truncates the last/right aileron and asserts the specific anchored `Unclosed aileron actuator` message; it separately tests a nested-left shape. Other malformed fixture cases now assert their intended error, rather than any ValueError. Independently reran all9Python tests: pass. Log `/private/tmp/gefly-roll-quality-adapter-final.log`. Production adapter/model/native bytes did not change for these test repairs. No remaining blocking finding in the affected repairs.

## 2026-11-06 10:45 renewal after strict browser and source-naming repairs

Independently inspected the renamed adapter helper/constants and reran9Python tests: pass. `patch_aileron_hysteresis` and `AILERON_ZERO_HYSTERESIS` now state the actual operation, setting two widths to zero, rather than implying an absolute-zero aileron target or altering trim. The prepared model remains SHA`cd85bb2a…` and native WASM remains`266f2016…`; only source identifiers/comments and regenerated build metadata change.

The producer now selects samples by validated integer step offsets rather than floating-point membership. It asserts safe integer offsets, exact round-trip to declared seconds and distinct keys, retaining the seven declared output labels. Independently reran the final native runner:57cases plus18return checks pass. Compared the complete57`results` objects against the prior floating-selection quality run: bit-exact. The sampling repair changes neither physical trajectory nor selected observations. Logs `/private/tmp/gefly-roll-quality-zero-width-tests.log` and `/private/tmp/gefly-roll-quality-integer.log`.

The current browser harness is now a durable return regression by default. It asserts finite initial/returned actual left and right angles, each compared with its own initial trimmed position at+.5/1/2/5/10/20s, using1e−10degree numerical equality converted to radians. Case records are retained before assertion so a failure shows the actual criterion. Strict and observe-only outcomes are explicit: `GF_DISTURBANCE_OBSERVE_ONLY=1` produces`observed`/`not_evaluated`, not a return-criterion pass. Static inspection confirms no physics commands or returned angles are replaced by the observer.

Independently inspected current supplied execution `output/flight/disturbance-input-browser-final-v5-strict.json`:5cases pass,30paired surface checks are finite and have exactly zero measured residual, all released external axes are neutral, ROOT before/after hashes match, current harness hash matches and candidate glue/WASM/build-info were actually served for all cases. Artifact SHA`d21695bd53617f8a037da5027702bf0481dc14414a21ddb4854556dd3adc0388`; harness SHA`4470ed58210775a04bb3bd2b2637171bf71eafd03eb614942d01141a44640c68`; final native build-info SHA`cbbe0f59e8648b72f0c97a323c151cbddfaa2a8fb548aeea6b3186b13dde6d65`. This reviewer inspected this actual-browser execution and its raw observations, rather than executing the browser suite independently.

Inspected the meaningful old-engine strict negative `output/flight/disturbance-input-browser-old-strict-negative.json`: it reaches the return assertion and fails at+.5s with left/right residual−0.0025/+0.0025rad. Its `return_check` is`fail`. The separate old observe-only run is`observed` with`return_check:not_evaluated`. An earlier startup SyntaxError timeout is retained separately and is not counted as proof that this return criterion detects the old defect. No remaining blocking quality finding in these affected repairs. Full-root candidate integration and final shared CI remain separate evidence, not independently accepted by this scoped review.

## Frozen source identities

Manifest SHA256`5af1c0d67e9ec666f92b83fffb47b967bfe340b51c265700b9720fadb65c38bd` over the sorted source-hash map:

```json
{
  "studies/e1-browser/sim/prepare-aircraft.py": "0f0b3913598bdac84f66dec663cd70b7ea687fd3b8a601c3fd7a6f964d910678",
  "studies/e1-browser/sim/prepare-aircraft.test.py": "66c00319ddad59205e22d60701a477c2bcc45cacf4a698196b9c0311ec482c01",
  "studies/e1-browser/sim/disturbance-response-native.mjs": "6b350252e9b1bd9fadcb42ae6afd453ea7af011ff4dcccd11366b5180cda4b93",
  "studies/e1-browser/sim/roll-return-native.mjs": "98b4d32cd17894de6debd20ca1477449b78053b53ce94a6e914ded043549d8a2",
  "studies/e1-browser/sim/roll-return-checks.mjs": "7a36618833161d1830dd478fcfaf8efac1bc800e7f10f6a1f567b04a5f42c402",
  "studies/e1-browser/sim/roll-return-checks.test.mjs": "aa3f3ee5fd7dd4c62e330f53d1c462e95f22767627f204cdd634008c5495d02e",
  "app/tests/disturbance-input.browser.mjs": "4470ed58210775a04bb3bd2b2637171bf71eafd03eb614942d01141a44640c68"
}
```

````
