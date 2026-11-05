# Predictive-terrain independent quality review

2026-11-05, Europe/Berlin. Independent Codex quality reviewer; not an implementation author. Cross-provider peer outcome remains separate/pending.

## Scope and outcome

**No blocking source finding remains after the affected repairs below.** Reviewed TODO2.0.155/R-WORLD-9/11 in isolated `/private/tmp/gefly-predictive-terrain`, final source revision `fa43055a9a70d519f4dc3d3a26b5b50c624d8a4e`, and the compatible world30 port in `/Users/gregor/Documents/devel/gefly`. The isolated branch retains quarter-degree/coarse world terrain; the root port retains its existing world30/Copernicus source policy. Their source/data profiles and runtime evidence are distinct.

This review covers prediction, one staged next terrain window, worker integration, display warming and affected tests. It does not accept unrelated root working-tree changes, aircraft fidelity, worldwide latency, complete corridor coverage or a zero-wait guarantee. Specification validation and publication remain separate gates.

## Findings and repairs

- **Medium, resolved — crossed-cell publication could cancel the needed stage.** A publication can expose a crossed aircraft cell before the next step asks for its authoritative window. The original prefetch guard treated that as stale and cancelled the matching prepared task. Final code first preserves a task whose target is the now-required cell and whose base key still matches. The regression reproduces that ordering, including a null/newer prediction, then verifies fetch-free adoption. Root identified this source race; it is not asserted as the cause of the separate AP-fixture failure.
- **Medium, resolved in root port — prediction hook absent from publication.** The first root port imported/reset the predictor but omitted the actual postState call because its stall-peak publication sequence differed. Final worker `486599e5` publishes the actual state, clears the consumed warning peak, then predicts/prefetches only while running with a stream and no current terrain load. Existing warning assembly/drain order remains intact. Component predictor tests did not prove this wiring; the renewed actual-worker browser run supplies the affected evidence.
- **Evidence correction — fetch observer.** The first browser observer counted only `/terrain/` requests, omitting root Copernicus service URLs. Final shared fixture `a6ad13f9` also counts `/scenery/elevation/copernicus/`; both final browser results below use it. The older 3.6 ms root observation is historical and not the final reported measurement. Early fixture omission of `kap140:true` prevented AP capture and proper track crossing; that fixture failure is not a native/prediction defect. Earlier sandbox port errors and inherited package-JSON syntax failure are not passing checks; the renewed source includes the syntax correction.

No further critical, high or medium implementation defect was established.

## Correctness, numerical and resource review

The shared predictor reads consecutive authoritative positions and simulated elapsed time; it never uses aircraft heading as ground track. It estimates spherical ground motion using a declared 6,371,000 m radius and projects 20 wall-seconds multiplied by confirmed pacing, capped at 8 km. Allowed rates match the existing 1/1.5/2/5/10 enum. Nonfinite/unsupported positions, time reversal/gaps, implausible jumps and stationary motion suppress/reset prediction. The 2–200 m/s and 30-second guards are loading heuristics, not aircraft limits or guaranteed detection of every possible teleport. Date-line wrapping and strict flight-latitude bounds are preserved. No navigation guidance, control or native integration value is written.

The terrain stream stages the first upcoming center boundary rather than skipping to a distant horizon cell. It owns one shadow stream/window, sharing immutable existing buffers through copied maps. Shadow install/remove callbacks are no-ops. Source/failure outcomes remain private until actual matching-key handoff; discarded speculation cannot poison the live maps. Successful adoption occurs only through ordinary required-window movement, between fixed steps. Manual pause/reset cancellation, generation/base-key checks and stopped-Review behavior retain the existing authoritative window and pause/resume intent. Ordinary validated loading remains the fallback.

Live native residency stays at nine. The one extra prospective window has at most nine staged grids, with overlap buffers shared. Existing source-owner/cache/byte/deadline budgets remain on their original readers; root Copernicus maps copy immutable outcomes and preserve the existing epoch cap. Cancellation discards the shadow and checks identity before accepting results. No new upstream provider, URL authority, dependency, device geolocation or persistence is introduced. Native ABI, H/geoid conventions and source triangle sampling are unchanged.

Display warming uses the same motion policy only when the explicit live flag is true. Main excludes Review, loading, failure and paused contexts; scene defaults prediction off for other callers. Course, mode, invalid-position and time/reset changes discard obsolete forward plans. Current nearby URLs retain reserved priority before the bounded forward OSM corridor; deterministic deduplication stays within the existing 200-URL/category limits and two service-worker background slots. Visible-demand promotion remains on the existing path. Startup seeds, transient visible work, pause/Review and unsupported storage retain optional fallback behavior. No map or extra renderer is created to warm a route. Native speculative I/O uses its existing reader/service bounds, not an invented two-request limit for all network activity.

The new worker dependency is explicitly added to the fixed runtime allowlist. The .d.ts/API and scene live-flag contracts agree in both trees. Root's additional stall-warning publication behavior was inspected separately rather than copied over from the legacy worker.

## Independent checks

Ran in each tree:

```sh
node --test studies/e1-browser/sim/terrain-prediction.test.mjs studies/e1-browser/sim/terrain-stream.test.mjs studies/e1-browser/sim/world-terrain.test.mjs app/src/scenery-coverage.test.ts
```

**Isolated legacy: 33 passed; root world30: 37 passed; zero skips.** These comprise 21/25 prediction/stream/world tests plus 12 display tests each. They are separate profile runs, not a claim of 70 unique tests. Coverage includes actual-motion direction/rate/cap, date line, rejection/reset, first boundary, preserved overlapping buffers, no speculative install/remove, fetch-free handoff, cancelled/stalled work, unchanged live source outcomes, bounded URL groups and pause/Review/course changes. Display tests use a mocked service-worker boundary; they are not actual full-UI corridor latency tests.

Final shared CI completed successfully on the reviewed implementation and documentation/review revision `7288046`. The isolated app checks report 469 Node plus 22 Python passes, zero app skips; assurance has 85 passes and training has 11. The overall gate explicitly skips nine of 23 optional JSBSim-study tests and one Linux-only repository-tool test: those skips are not passes. Inspected retained CI log `output/flight/predictive-ci-complete.log` SHA-256 `524fbc9d4c4a20c735da5e89fa0fe08f3cd0fff704bcc1782f78d4099f925238`. The integration owner confirms final root full-suite 591 Node plus 25 Python passes, zero skips, and the root production build passes in 4.96 seconds (`output/flight/predictive-integrated-build.log`). These integration runs are distinct from this reviewer’s targeted executions. The preceding CI renewal failed inherited DONE ordering after functional checks; root corrected whole entries with preservation checks and renewed the gate. That historical failure is not a predictive-behavior defect or a passing result. Final report/status integration and publication remain the integration owner’s responsibility.

## Final actual-browser evidence

Both executions use the production worker/native runtime in a browser fixture, explicit AP capability/capture and a real New York trajectory at requested 10×. The test supplies initialization/loading and ordinary commands, not fabricated positions or terrain. Prototype wrappers observe staging/fetches. It is worker-component integration, not the full simulator scene, rendered-height, actual service-worker corridor or device-matrix validation. Exact browser/GPU metadata is not retained in these JSON artifacts; no particular Chrome version is asserted here.

| Profile | Final observation |
| --- | --- |
| Isolated legacy after main merge | 1 completed preparation; 1 prepared handoff; 0 new observed terrain/COG-service fetches; 8.9 ms observed handoff; maximum 9 native cells |
| Root world30 final expanded observer | 2 completed preparations; 1 prepared handoff; 0 new observed terrain/COG-service fetches; 18 ms observed handoff; maximum 9 native cells |

Both reach exactly 12,000 steps/100 simulated seconds at requested rate 10, with no worker/page error and repeated paused stats preserving step, digest and native final-state vector. The automatic until-step halt is not a complete actual manual-Pause/Review/reset browser matrix. Timing values are single observations, not comparative performance budgets or a guarantee of achieved 10× throughput. The retained actual WASM hash is `11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`; unchanged bytes do not resolve its existing source/build-record mismatch.

## Frozen identities and local retention

Common files in both trees: predictor SHA-256 `c97fde3e50de9f7f7a0d78e2a28f544a92ea922f848db8eb14c8e67811bb018d`, scenery cache `03aa56a68fd6aef5c7679d5223cf0a316e4bf25ae67de511c2d873b8741a9aa5`, scenery coverage `ed7089f108f16e02312b3084160c0a56e43313a177e8fdeb01a8229c705a419f`, final browser fixture `a6ad13f9d752f6840c19f9c36bd4a5bebe0e5b86b61383f57722049152702fb8`.

| Tree | Relative path | SHA-256 |
| --- | --- | --- |
| Isolated legacy | `studies/e1-browser/sim/terrain-stream.js` | `a84f8de00506168634926f03088f89dabb1053c16894822ee4cbf4f3efdd528c` |
| Isolated legacy | `studies/e1-browser/sim/worker.js` | `b19d4d86f1ce7e571f5e86d62e5dd2abc3f06b75672e927401950fc8963eefbe` |
| Isolated legacy | `docs/SPEC.md` | `371edf652b9293470f4fa57da0b82d99f7400116b359c4d7563a79fdec650e21` |
| Isolated legacy | `output/flight/predictive-terrain-browser.json` | `7b171a0675c07cca209b8b82040efd2a82966a596e47c2a95d514dc98b7f483a` |
| Root world30 | `studies/e1-browser/sim/terrain-stream.js` | `2c2e1696464730252d032097a8e94bc5bef13636686a7d2f5e2608b65a9ebe2b` |
| Root world30 | `studies/e1-browser/sim/worker.js` | `486599e53658fb80d7a8a2f5e93041264f2713e265b4812d8124e28ccc45e7fa` |
| Root world30 | `output/flight/predictive-terrain-browser.json` | `4253e8a9eae59505645921d0445c17aba5f5322a0004e2d37b7017ce161b8ff6` |

Ignored output paths identify locally retained evidence, not fresh-checkout assets or portable links. Reproduction requires the documented local engine/runtime, browser and network prerequisites; run the tracked affected tests above and `node tests/predictive-terrain.browser.mjs` from app. No implementation, shared status, commit or publication was changed by this reviewer. Only the assigned review report in each tree was written.
