# Predictive terrain loading evidence

TODO2.0.155; R-WORLD-9/R-WORLD-11/R-SIM-2. The loading policy uses measured
simulated ground track from consecutive positions/time, with20wall-seconds of
lead scaled by confirmed simulation pacing and capped at8km. This is a bounded
loading policy, not an aircraft value. The first approaching center-cell boundary
is staged rather than skipping required cells to the distant horizon.

The current terrain remains installed while a private no-op-install shadow stream
prepares one next nine-cell neighborhood. Maps share immutable current buffers;
ordinary axis/diagonal advancement adds three/five grids, respectively. The
private regional source halo is bounded at16 entries. The integrated world30
port copies existing immutable optional-source outcomes and preserves its512
outcome cap. Cancellation discards private decisions; required-window promotion
uses the ordinary checked install/remove transaction and nine native slots.
Source hashes, H/N geometry and shared nodes retain their existing validators.

Display warming reserves current-area detail before three forward corridor
samples. Current/ahead focus changes of500m trigger replanning; aggregate layer
limits and200URLs/two background slots remain unchanged. Review/paused/invalid,
stationary and reset predictions are cleared. Warming PBF data does not create
GPU terrain meshes or additional map renderers.

## Actual runtime observations

Both cases execute the production worker with unchanged WASM, actual native
positions and no injected geometry. Explicit AP capability/engagement and unloaded
external payload match the flight fixture. Each runs12000fixed steps/100native
seconds at10×, then checks unchanged paused step/digest/fullstate. The common
final native digest is194b17ef017c93d3. The browser test observes worker staging,
not the full simulator UI or service-worker rendering performance.

| Source | Preparations | Completed staged handoffs | New terrain/Copernicus fetches at handoff | Native residency | Observed promotion time |
| --- | --- | --- | --- | --- | --- |
| Merged foundation legacy quarter-degree port |1|1|0|9 maximum|8.9ms|
| Current integrated world30/Copernicus port |2|1|0|9 maximum|18ms|

These are individual observations, not cold-network timing guarantees. The legacy
New York case needs no regional downloads even without prefetch; its evidence
establishes prepared adoption rather than measured remote-download savings.
Neither case establishes world-wide coverage, all-device latency, rendered GPU
height parity, full Review/NewFlight lifecycle or aircraft fidelity. The unchanged
WASM SHA-256 is11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7;
its recorded native build provenance remains unverified.

## Checks and repaired integration findings

Legacy native/predictor component checks21; integrated26including four Copernicus
and the actual postState wiring regression; display/cache checks12in each tree.
All focused checks pass with zero skips. Integrated complete app unit checks
pass591Node+25Python tests, zero skips. Final branch CI is recorded separately
when complete; planned or skipped criteria are not passes.

A crossed-boundary publication could discard a matching prepared task before
required loading. Matching current-key promotion now takes precedence over an
invalid/farther prediction; the regression tests both continued and absent next
forecasts. The divergent integrated stall-warning publication initially missed
the worker prefetch hook; actual runtime caught the omission, and an executable
publication test now checks publish/clear/predict ordering and paused/loading
suppression. Invalid early browser fixtures omitted AP capability and never
crossed a boundary; they are not evidence that the publication race caused their
no-handoff assertion. The merged main npm scripts also lacked one JSON comma;
7a0e69c preserves both commands and repairs the syntax.

## Pinned local evidence

Ignored output artifacts are local records, not fresh-checkout assets. The common
harness is app/tests/predictive-terrain.browser.mjs, SHA-256
a6ad13f9d752f6840c19f9c36bd4a5bebe0e5b86b61383f57722049152702fb8.
Both branches use `npm run test:predictive-terrain` to reproduce the bounded case.

- Isolated `output/flight/predictive-terrain-browser.json`, SHA-256
  7b171a0675c07cca209b8b82040efd2a82966a596e47c2a95d514dc98b7f483a.
- Integrated `output/flight/predictive-terrain-browser.json`, SHA-256
  4253e8a9eae59505645921d0445c17aba5f5322a0004e2d37b7017ce161b8ff6.
- Integrated `output/flight/predictive-integrated-unit-final.log`, SHA-256
  b5646f5da0c3b1933e968e881edd5d1b3ad05bdd3117d71aa891ffacebffc11b.
