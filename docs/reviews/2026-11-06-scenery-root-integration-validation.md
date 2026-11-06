# Scenery ROOT integration validation

Recorded 2026-11-06 09:34 Europe/Berlin by Codex `scenery_validate`, independent of the feature/integration authors. Scope: frozen candidate `/private/tmp/gefly-airport-root-preview` versus unchanged working ROOT `/Users/gregor/Documents/devel/gefly` and the independently reviewed feature `/private/tmp/gefly-airport-generator`.

**Outcome: scoped integration criteria pass.** This does not accept whole-ROOT CI, all earlier unpublished features, real-source airport coverage, the exact terrain landing, aircraft fidelity or a release milestone. The separate feature [validation](2026-11-06-scenery-validation.md) retains its source/fidelity limits. Source changes or a different ROOT preflight identity require affected renewal.

## Independently executed and inspected evidence

Independently ran in candidate:

```sh
node --test app/airport-region-server.test.ts app/src/airport-region-loader.test.ts app/src/airport-surface-markings.test.ts app/src/overview-camera.test.ts app/src/aircraft-shadow.test.ts app/src/view-preferences.test.ts studies/e1-browser/sim/terrain-source.test.mjs studies/e1-browser/sim/autopilot-reload.test.mjs
```

47 tests pass,0failures/skips; `/private/tmp/gefly-scenery-root-validate-tests.log`. Inspected ROOT/candidate/feature diffs and byte identity, the actual candidate airport and overview/native browser harnesses/results, candidate710-unit author log, and the independent quality review's152 preservation tests/TSC and6 actual AP reload browser groups. Those other executions are inspected evidence, not represented as executed by this validator.

The [integration quality report](2026-11-06-scenery-root-integration-quality.md)'s9 paired ROOT/candidate paths remain hash-current. Every existing ROOT npm script name, prior test token and dependency/version remains. Session, flight-location storage, practice-map, view preferences, stall delivery, AP-reload/map-start/initial-balance/stall-peak helpers and native WASM/build-info are byte-identical to ROOT. Worker differences are confined to terrain-source imports/owner/startup wiring, with its existing serialized command queue and other ROOT behavior retained.

## Criterion matrix

| Criterion | Expected | Observed | Status |
| --- | --- | --- | --- |
| R-AIRPORT-3 optional loader integration | Ordinary public-terrain live context includes paused preparation; Review/flat suppress source work; unavailable data cannot command flight | Candidate Scene gates by public terrain/live-context source epoch rather than running pacing. Loader cancellation/backtracking independently passes. Actual candidate airport browser passes4 groups including paused California geometry, Review suppression and disk reuse; all10 before/after source pins match current candidate | pass |
| R-AIRPORT-3 source/cache/height behavior | Retain reviewed bounded source pipeline and actual receiver draping with no invented heights | Contract/loader/renderer/compiler/server bodies agree with reviewed feature, aside from reader trailing blank-line normalization. Independently repeated server/cache abort/TTL/backoff and loader tests pass. Candidate browser has1ready mesh/387instances/8generic PAPI heads and1truthfully deferred feature | pass |
| R-AIRPORT-3 prepared scenery priority | Keep EDFE/Frankfurt package/metrics/lifecycle and exclude duplicated streamed source IDs only after validated pinned package load | ROOT airport-scenery diff retains static/regional collections, loader and status, update and disposal. Successful ground-package load supplies its source IDs to streamed exclusion; failed load supplies no exclusions. Existing static regional renderer is preserved, not upgraded to worldwide generic paint/PAPI | pass |
| R-AIRPORT-3 native isolation | Airport rendering/cache work cannot change commands, paused native state/time/digest or terrain provider | Fresh candidate actual-browser assertions compare native commands, final state/step/digest through compilation, transport, distant region traversal and cache reuse. Renderer owns only its primitive collection and reads atlas heights | pass |
| R-WORLD-11 terrain thread/native equivalence | Dedicated source execution retains exact physical/geoid/hash and native trajectory with existing coverage/admission guards | Candidate source modules equal reviewed feature. Independently repeated protocol tests pass complete-batch validation, cancellation, crash/fine-only/prefetch/moves. Candidate actual-browser result compares9grids,16641-node overview composition/retained arrays and14native fields/digest after120steps; digest `f4b15c1c1909b2d8` | pass |
| R-VIEW-1 overview integration | Separate orbit/zoom view,50m–20000km bounds and unchanged native state/time | Candidate menu/scroll/look-only wiring matches reviewed feature while ROOT preferences/focus/disposal remain. Camera units independently pass; actual candidate browser reaches20000000m then returns chase with paused state/step/digest fixed | pass |
| R-VIEW-1 shadow integration | Supply actual rendered receiver, preserve known unavailable/high/cockpit guards, let opaque pavement receive shadows | Candidate shadow helper equals reviewed feature; Scene supplies active atlas ellipsoid receiver or explicit flat0/null. EDFE, Frankfurt and streamed primitives use RECEIVE_ONLY; existing native/model geometry unchanged. Independently repeated helper jitter/datum/visibility tests pass | pass |
| R-AP-3/R-SIM-2 AP reload preservation | Terrain thread change retains acknowledged AP modes/targets/paused startup, NAV/BARO and Review/reset semantics | ROOT session/storage/helper bytes unchanged; worker diff retains AP initialization. Independent validator AP-reload units pass. Quality's current actual candidate browser passes6groups including engaged flight reload into pausedstep0, VS/ARM, distinct held/selected targets, OFF/BARO/NAV, Review isolation and Restart | pass |
| R-WORLD-11/R-UX-2 map/preferences preservation | Keep map/current plan, palette/label preferences, credits and shortcuts | Practice-map/view-preferences byte identity and narrow main diff preserve ROOT plan shortcut, preference initialization/palette, map/credits integration and cleanup; candidate preferences units independently pass. No claim of a new full map browser sweep | pass |
| R-SIM-2 background/handling preservation | Preserve background flight intent/focus/input-release behavior and current aircraft/balance/stall configuration | Main's background handlers/focus guard and disposal are retained in inspected diff; worker existing pacing/serialized commands remain. Native WASM/build-info and balance/stall helpers unchanged; no steering gains or aircraft coefficients changed. Background browser behavior was not independently re-exercised; this row validates preservation of this integration boundary | pass |
| Full ROOT shared CI/assurance | Whole integrated ROOT must satisfy its own gate before a full-root acceptance claim | Known wider working-copy60000-node assurance bound remains unresolved; feature592-case CI does not pass the whole ROOT. No new bound or fallback acceptance is inferred | blocked |
| Positive real OSM airport source | Demonstrate current real data renders from live provider | Actual source probes502/timeouts; candidate browser upstream/pixels are synthetic | not evaluated |
| Reported moving/sloped landing flicker | Demonstrate the exact terrain receiver remains visually stable throughout actual landing | Source wiring/helper and earlier flat shadow pixel evidence do not reproduce the user's moving/sloped landing | not evaluated |

## Source and evidence identity

Paired9-path manifest SHA-256 `c20c4737b6dff9a217a7cc6d1ce97a656c6da6307ab10d1dcce237e8d21e4b0e`. The same paired paths/hashes are fully listed in the integration quality report and independently verified here against both directories; this review adds no runtime edits. Native WASM `c11a93378da778e34168c5b9043e44448855fb6699a640585d224313722d0f42`, build-info `0b5910545b81299abfd0d8e85b35da2a4b0f2d640684d88a15165d7332815bdd` are preserved byte identities, not a fresh build or model acceptance. Candidate Worker `140d3fbadd41df7df7b37fd41fe7633f18289874f599ac4e0d0a95beec7dbf4b`.

Feature airport-region-read.ts's trailing blank-line trim is semantically identical to the tested candidate. The final feature browser was separately renewed after that trim and now has current10source pins; candidate's current airport browser pins are also fresh. A subsequent candidate metadata-only copy of the reader/test registration must preserve these reviewed semantics and be preflight-hashed by integration.

Evidence SHA-256:

- `/private/tmp/gefly-scenery-root-validate-tests.log`: `6bb9b538c3452fa36b74c4764b51f9388eb7b2a013c182ea41a9bcb413b983bf`.
- `/private/tmp/gefly-root-airport-browser-final.log`: `72990d0cdb70599171ee7382fd68afaf5064deb424319c050316d0a65b33f4af`.
- `/private/tmp/gefly-independent-root-ap-browser.log`: `2c1c43337ba6c271277f8ca65f64eb851398485b87389f04e63b466002f3a7a5`.
- `/private/tmp/gefly-airport-root-preview/output/flight/airport-generator-browser.json`: `1b7c31abf24cc34782e0ce2f73ac46c8d41472c48bf101ffb99a16d35a18bb7e`.
- `/private/tmp/gefly-airport-root-preview/output/flight/view-and-thread-browser.json`: `f0412782c22a7454954b2e22ca583419c29d1bd373643721d420433bdee28f21`.

No new OFM ingestion/current edition, new data rights, installed PAPI/marking accuracy, live source uptime, aircraft/training fidelity or cross-provider peer acceptance is established. Existing required-coverage waits and source-history guards remain. Chrome evidence does not establish internal WebKit browser acceptance.
