# Predictive terrain validation

2026-11-05 21:58 Europe/Berlin. Independent Codex validate; no implementation,
reviewer browser execution or new tests. Reviewed isolated revision
`7288046c4e976d0c0bc0cf2a72754a21b7dac029` after merged control defaults,
plus the separately pinned root world30 port.

**Recommend bounded behavioral acceptance of TODO2.0.155.** Both production
workers now prepare and adopt a prospective neighborhood during an actual
native flight. This does not establish faster cold worldwide rendering or
eliminate ordinary loading. Shared CI/publication and covering peer gates remain
separate. Scope: [request](../input/2026-11-05-predictive-terrain-loading.md),
[R-WORLD-9/R-WORLD-11](../SPEC.md) and
[policy](../design/scenery-cache.md#predictive-flight-direction-warming).

| Criterion | Expected versus observed | Outcome |
| --- | --- | --- |
| Measured ground motion and bounded pacing | Shared predictor consumes consecutive authoritative positions/simulated time, not aircraft heading or airspeed. It projects20wall seconds at confirmed1/1.5/2/5/10×, capped8km. Initial, stationary (<2m/s), implausible (>200m/s), invalid/clock-discontinuous and polar-guard motion suppress prediction. Units are loading-policy limits, not aircraft calibration. Tests cover pacing, reset and dateline direction. | Pass — source/unit |
| Prepare the next required window without speculative native changes | The first upcoming cell boundary is selected, not the distant lead endpoint. One shadow stream copies source/outcome maps, shares immutable overlap buffers and uses no-op install/remove callbacks. Only required `move` adopts its prepared nine-cell atlas between steps. Tests observe unchanged live key/source maps/callbacks during preparation, coalescing, native residency and fetch-free handoff. | Pass — source/component |
| Preserve required preparation at publication boundaries | Reviewer confirmed an initial crossed-position publication could cancel its matching prepared task. Repaired code recognizes that now-required task before ordinary cancellation; regression publishes crossed position with farther/null prediction before `move`. Both final paced native runs demonstrate completed handoff. | Pass — repaired regression/runtime |
| Isolation, cancellation and ordinary fallback | Turns/invalid targets, explicit halt/reset and new stream epochs discard obsolete work; automatic required loading preserves the matching task. Abort/generation guards precede adoption. Shadow failures cannot poison current source outcomes or modify current native terrain. Required terrain retains existing source/hash/schema/height composition; root additionally retains Copernicus limits/priority. | Pass — source/component; full interactive lifecycle not evaluated |
| Forward corridor and foreground budgets | Current containing detail/current-area URLs precede sampled forward OSM URLs; startup seeds remain first. Existing source caps, deduplication,200-URL maximum, two background slots and visible-demand promotion remain. Tests cover both modes, east/west course, dateline URLs, rate/turn/reset gates and invalid endpoints. No new render context, provider or storage permission. | Pass — source/component |
| Production wiring and pause/control separation | Main supplies explicit ready/running/live/not-Review/loading/fault eligibility; app adapter resets motion outside it. Both workers predict from published native positions only while running. Root initially omitted this hook; source repair and its final actual world30 run close that defect. Neither predictor nor shadow callbacks issue controls or native steps. | Pass — source and actual worker execution |
| Actual legacy and world30 handoff | Final New York fixtures explicitly initialize KAP, verify engagement and fly at10× to12000steps/100simulated seconds. Legacy prepares1window and adopts1; root prepares2 and adopts1. Each handoff issues zero new counted terrain/Copernicus fetches, stays within9native residents and reaches final APengaged/rate10/digest `194b17ef017c93d3`. Observed handoff durations8.9/18ms are single-run values. Both fixtures assert paused stats preserve step/digest/full vector and start no new speculation. Errors are empty. | Pass — two bounded production-native fixtures |
| Rendered corridor, cold-network speed and wider acceptance | Fixtures are native Worker harnesses, block service workers and render no scene. They do not demonstrate actual service-worker corridor warming, GPU height, all browsers/devices, full interactive Review/reset/turn sequences or worldwide cold-load latency. No prediction-disabled trajectory comparison was supplied. | Not evaluated |

Earlier browser no-handoff runs omitted KAP initialization, so the aircraft did
not cross the intended boundary. They do not establish the cause of the
independently confirmed publication race. Root component tests also missed its
absent worker hook; actual execution found it. These failures remain historical,
not passes. The legacy New York case uses bundled coarse terrain; zero handoff
fetches do not quantify remote DSM latency savings. Root and legacy height/source
contexts are distinct even though this high-altitude final digest matches.

No unresolved blocking behavioral defect was found after the affected repairs.
Reviewed supplied focused checks:21legacy and26root predictor/stream/world tests
(the root includes four Copernicus cases and executable publication wiring), plus12app cache/planner groups per
tree, all pass without skips. Final root unit log records591Node+25Python tests
passing without skips. Earlier isolated CI attempts had listener-permission and
merged package-JSON and inherited DONE-order failures; none is accepted. The JSON separator repair
retains both npm commands. Final isolated `just ci` at `7288046` completed successfully:469application
Node+22Python tests,85assurance and11training checks pass. The gate is
**passed with skips**: nine of23optional JSBSim tests and one Linux-only
repository-tool process-state test were skipped, not accepted. Independent fence-aware DONE comparison against `origin/main`
`8c4103a382733dcbf9f4f688360cc92a65c4966d` confirms all164original entries
retain their exact bodies and the preamble is unchanged; only the Task155entry
is added, with all165headings sorted. The corrected order therefore preserves
history. Earlier failed gates remain historical failures. The final gate log was independently inspected and hash-checked; integration
owns publication. External peer attempts are blocked; no
covering cross-provider acceptance is claimed.

Frozen SHA-256 identities:

| Artifact | Legacy isolated | Root world30 port |
| --- | --- | --- |
| Terrain stream | `a84f8de00506168634926f03088f89dabb1053c16894822ee4cbf4f3efdd528c` | `2c2e1696464730252d032097a8e94bc5bef13636686a7d2f5e2608b65a9ebe2b` |
| Worker | `b19d4d86f1ce7e571f5e86d62e5dd2abc3f06b75672e927401950fc8963eefbe` | `486599e53658fb80d7a8a2f5e93041264f2713e265b4812d8124e28ccc45e7fa` |
| Main | `a36181018a80155960e0c97f85393ca043c106b84c6c313d847db468cb57f155` | `7c1456b5d997e9c03587a15a4f44982ad99c4ccf0040bf120c34956ef170c09b` |
| Scene | `55ffce698d0f75cda7b60b167ca6477ee355f8bc2901c3567ab9b426a784535f` | `7ba788811880b63d6f07ad4bd3a92ca1f06002cf12d044c8018cf52ae2a648b5` |
| SPEC | `371edf652b9293470f4fa57da0b82d99f7400116b359c4d7563a79fdec650e21` | `caa9cb0677c39d941145329e5337e861e01b0c3a27fdf41c982b631789d1cfee` |

Byte-identical shared [predictor](../../studies/e1-browser/sim/terrain-prediction.js):
`c97fde3e50de9f7f7a0d78e2a28f544a92ea922f848db8eb14c8e67811bb018d`;
[cache adapter](../../app/src/scenery-cache.ts):
`03aa56a68fd6aef5c7679d5223cf0a316e4bf25ae67de511c2d873b8741a9aa5`;
[planner](../../app/src/scenery-coverage.ts):
`ed7089f108f16e02312b3084160c0a56e43313a177e8fdeb01a8229c705a419f`.
The repaired prediction/window/handoff blocks are identical across ports.

Ignored local evidence is not a fresh-checkout asset. Retain results with the
executed observer; reproduce from `app` with
`node tests/predictive-terrain.browser.mjs`. The same observer SHA-256 in both
trees is `a6ad13f9d752f6840c19f9c36bd4a5bebe0e5b86b61383f57722049152702fb8`.
`output/flight/predictive-terrain-browser.json` SHA-256:

- Legacy: `7b171a0675c07cca209b8b82040efd2a82966a596e47c2a95d514dc98b7f483a`.
- Root: `4253e8a9eae59505645921d0445c17aba5f5322a0004e2d37b7017ce161b8ff6`.

Isolated `output/flight/predictive-ci-complete.log` SHA-256:
`524fbc9d4c4a20c735da5e89fa0fe08f3cd0fff704bcc1782f78d4099f925238`.
This completed result supersedes earlier failed/incomplete gate attempts.

Root `output/flight/predictive-integrated-unit-final.log`:
`b5646f5da0c3b1933e968e881edd5d1b3ad05bdd3117d71aa891ffacebffc11b`.
Executing WASM remains
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`;
stale source-to-binary build provenance remains unverified. No aircraft, training
or terrain-source survey accuracy is accepted.
