# Five-state scenery and fixed panel quality review

Reviewer: Codex quality subagent `/root/quality`, independent of the implementation authors. Provider: OpenAI/Codex; runtime model identity was not independently exposed. This is a local quality review, not cross-provider peer review or specification acceptance.

Artifact: bounded working-tree changes based on `700dd5386125f9864a391f85b277cb71da55290a`, inspected 2026-11-04 23:45 Europe/Berlin. Scope: TODO 2.0.121 / R-PANEL-1 fixed cockpit placement; TODO 2.0.120 / R-WORLD-10 official imagery proxy, prefetch coverage and associated source/security inventories. Terrain streaming/mesh/native changes were under repair during the initial inspection; the follow-up below covers their stable source and focused checks. Later repairs invalidate affected findings until rechecked.

## Disposition

No unresolved blocking quality findings in the reviewed current source. The initially identified empty-tile GPU failure is repaired and both its focused real-scene reproduction and the affected three-location regional rerun pass; the complete eleven-location browser rerun also passes at the final follow-up snapshot. The fixed-panel camera regression had obsolete zoom assertions; its source is repaired and its complete browser execution now passes. The right-map browser regression also passes after explicit camera setup. The entire historical browser suite was not rerun; specification acceptance remains validate's separate responsibility.

## Findings and repairs

- **Medium, resolved:** `app/tests/fov-smoke.mjs:101` still required panel wheel input to enlarge AP by more than 1.3×, and the former line 141 required a removed `data-panel-zoom` attribute. `npm run test:browser` invokes this test, so the obsolete expectation would fail the user's requested fixed-fit behavior. Reported to the integration owner. The revised block asserts unchanged AP, panel, deck and scene bounds after vertical/horizontal/extreme wheel input; it retains actual AP clicks, unchanged FOV/native-state checks and the independent scene-FOV tests. The complete repaired case passes in `output/flight/fixed-panel-fov-browser.log`, including camera, AP, map/dialog isolation, yoke, Review and reload checks. The later map activation setup was repaired to click visible bare canvas rather than the heading behind the optional top bar; no application behavior was changed.
- **Low, repaired:** `docs/ARCH.md:5` still presented the prior 108-tile extent as current architecture. The integration owner changed it to 475 available assets within 608 slots over the expanded envelope, explicitly retaining masked/unavailable border support.

## Evidence and inspection

Executed independently:

- `npm run check` in `app`: pass.
- `PATH=/Users/gregor/.pyenv/versions/3.11.12/bin:$PATH node --test scenery-server.test.ts src/scenery-coverage.test.ts` in `app`: 20 tests pass, zero skipped; log `output/flight/five-state-quality-scenery.log`.
- `git diff --check`: pass at inspection.

Observed the complete passing logs for `app/tests/fov-smoke.mjs` (`output/flight/fixed-panel-fov-browser.log`) and the 12-group right-map browser case (`output/flight/five-state-map-regression.log`). These runs were performed by the integration owner, not re-executed by this reviewer.

Inspected the current implementation and test diffs, the 13-case `output/flight/panel-layout.json`, the three gesture cases in `output/flight/panel-fixed-gestures.json`, and actual screenshots `panel-fixed-1440x800.png` and `panel-fixed-390x844.png`. The panel occupies the reserved bottom area, with complete fitted content and no manual transform. Mobile controls necessarily shrink; this review does not claim a new minimum physical readability or touch-target budget. The browser evidence was executed by the separate housekeeping agent; this reviewer did not re-execute that complete case.

The layout change removes zoom/pan/drag state and listeners, preserves responsive fitting and cleanup, and adds no network, persistence or flight-state writes. Existing scene/map zoom remains in separate modules. The revised panel test checks top/center alignment, full frame containment, real hit-testing, lower-control clicks and unchanged geometry after actual wheel/drag/double-click gestures. Existing responsive portal, docking and Review checks remain.

The imagery expansion keeps fixed HTTPS hosts/layers, canonical bounded XYZ paths, redirect rejection, bounded bytes/dimensions, deadlines, separate map/photo pools, capped pending jobs and memory LRU. Five-state envelopes select at most five images; the Python compositor preserves palette alpha and limits input/output. Transparent gaps and partial upstream failures remain explicit. No browser key, GPS, arbitrary target URL, aircraft-state upload or physical terrain write was introduced. Source-rights metadata was checked for internal consistency with the recorded official references; no independent legal opinion or promise of future service availability is made.

The map regression's explicit EDFE camera setup is appropriate: source markers intentionally represent the visible viewport, so a specific airport test must not depend on elapsed time during earlier flight/Follow/pan operations. Its existing paused-state assertions remain intact.

The scaffold checker change excludes the documented gitignored local `.work` SDK directory; its negative regression still rejects broken links in ordinary study documentation. It does not weaken required project-document checks.

## Terrain follow-up, 2026-11-04 23:54 Europe/Berlin

**High, resolved in the affected focused check:** fully unsupported masked tiles originally produced a zero-length index buffer. Geometry-worker construction alone succeeded, but the installed Cesium `GlobeSurfaceTile._createVertexArrayForMesh` unconditionally passed it to `Buffer.createIndexBuffer`; `Buffer` requires a positive byte count. The new actual-scene reproduction confirmed `DeveloperError: Expected sizeInBytes to be greater than 0, actual value was 0` (`output/flight/masked-terrain-empty-gpu-reproduction.log`). This could stop the regional render loop when an empty border tile reached GPU upload.

The repair adds `[0,0,0]` only when no real triangle exists. Repeated identical indices have zero area and cannot establish a triangle/ray intersection. Finite metadata remains required; empty height queries still consult the unsupported mask and return undefined. Nonempty masked geometry continues to reference only supported nodes, without skirts across source gaps. The fresh focused browser artifact/log records actual GPU upload, exactly three sentinel indices, no render errors, no globe height and no ray-pick ground. Its worker cases separately preserve partial and negative-height holes and compare post-mesh height queries to actual decoded worker geometry. This is a graphics-buffer compatibility primitive, not physical ground.

Additional independent execution:

- `node --test app/src/masked-terrain-mesh.test.ts app/src/streamed-terrain-provider.test.ts`: eight pass, zero skipped after the sentinel repair; `output/flight/five-state-quality-sentinel.log`.
- Earlier stable terrain source: 22 mask/provider/asset/terrain/stream tests pass, zero skipped; `output/flight/five-state-quality-terrain.log`.
- `c++ -std=c++17 studies/e1-browser/sim/terrain-grid.test.cpp -o output/flight/terrain-grid-quality` and the resulting executable: pass; `output/flight/five-state-quality-cpp.log`.
- `node studies/e1-browser/sim/terrain-region-native.mjs`: exit zero. Eleven real-data points, nine maximum resident tiles, 132 feather-edge samples, zero native/JS height and slope mismatches; `output/flight/five-state-quality-native.log`. These establish cross-runtime consistency, not surveyed DEM accuracy.

Source review covers fixed 608-slot identity, 475 available assets, bounded compressed/decompressed index reads, byte hashes, paired-NaN validation, absent-center failure and sequential staging with at most nine native tiles. Native and JS sampling keep their SW–NE triangle and derivative conventions. The compiler retains pinned source-byte identities and one shared geographic lattice, so source gaps do not become extrapolated finite terrain. No physics-step or aircraft-parameter change is introduced.

The exact-root-edge rendered-ray check is a bounded test tolerance: an undefined primary query may use at most `1e-10` rad offset only within `1e-12` rad of a declared root edge. Both supported side rays must be finite and agree with native height within 0.25 m, and exact-point provider/native agreement is still mandatory. This is a sub-millimetre Float32 picking allowance; it does not replace an arbitrary missing-height query, fill source holes, alter runtime geometry or claim exact seam continuity. The separate empty/missing-triangle checks remain mandatory.

The repaired affected-scope integrated browser rerun passes for Saarbrücken, Koblenz and the Bavarian Alps: `output/flight/five-state-border-browser.json` and `.log`. It verifies initial nine-tile loading, exact provider/native heights, actual rendered heights within 0.25 m, bounded residency, map/Review paused-state invariance and missing/corrupt initial tile failures. Saarbrücken records an undefined exact edge pick and both ±1e-10 rad side rays at 246.74146/246.74118 m versus native 246.74320 m; the exact-point provider returns 246.74320 m. These observations support the declared numerical display tolerance while keeping the exact seam limitation visible.

### Final integrated observation, 2026-11-04 23:56 Europe/Berlin

The default eleven-preset browser case completed successfully on the repaired source. Inspected `output/flight/five-state-streamed-region-browser.log` (explicit pass result) and `output/flight/five-state-streamed-region-browser.json` (all eleven observations and four check groups). Maximum rendered/native difference is 0.202013 m at Stuttgart, within the predeclared 0.25 m comparison; maximum exact-point provider/native difference is 0.004741 m in the fine/coarse Darmstadt feather. Saarbrücken alone uses the recorded constrained edge rays; other sites use their exact rendered ray. Pause/Review native-state invariance, bounded residency, same-origin fixture requests, missing/corrupt fail-closed behavior and absence of browser errors pass. These are actual Cesium/JSBSim checks with synthetic image pixels, not photographic-fidelity or surveyed terrain-accuracy evidence.

The refreshed real-scene empty-GPU case also passes after adding a final uncaught-page-error assertion. Its result still shows uploaded three-index zero-area geometry, no render errors, no height, no pick and no page errors. Source and inspected artifact hashes below identify this final scope. This quality disposition does not replace validate's criterion-by-criterion decision.

## Frozen input hashes

| Path | SHA-256 |
| --- | --- |
| `app/src/cockpit-layout.ts` | `8e6fb35f227fd9d88119da7929d6d2c98116829bfb5c65ab9f31ccc4ceb86fe4` |
| `app/src/style.css` | `70033cdbd7d865cce95ff018f659b3687735bef2d98cd7acafab00d79f1300f6` |
| `app/tests/panel-layout.browser.mjs` | `5989f737c73743677698c35af41f6a98f4c1166d3344047dcd8d25289497f5e4` |
| `app/tests/fov-smoke.mjs` | `144b1d9a87f051a3aa0883fa580e3ca29c56f8ede20d775eb2fde754f2005be3` |
| `app/scenery-server.ts` | `a79a58316a8414a7d8bf7df8aac72a763f35cfbbf2ab3f50f2a4098643d52ce4` |
| `app/scenery-server.test.ts` | `8de2106b2899bd5bf5df03db556bdf6e0aae8f5113405df5d22758c25838e10b` |
| `app/src/scenery-coverage.ts` | `638d8bbe1d30d086b0e3589ee0a4f22f74475d5eda8dbe58d84355f99776eeb6` |
| `app/src/scenery-coverage.test.ts` | `2dcdfb8fc7631f44e5a5f65d2b8508f11072f18d484f5fefcbf0c6db5ab6661c` |
| `utils/scenery/compose.py` | `7cd5ba8ff503b2c9d38bcd45993d10317914b7526d78466fe7ad485d5e3aae11` |
| `utils/ci/check.py` | `6bc19e0f18d74a966010244a3a22f22874f9dac9183032bf1832bd8b6e2eddf2` |
| `utils/ci/test_check.py` | `a33ac1569668732b7de2142b2aa06f2f68f4f7108919a73378776a3f2e135278` |

Additional terrain inputs:

| Path | SHA-256 |
| --- | --- |
| `app/src/masked-terrain-mesh.ts` | `f392d5fefe9f36f7bc0bb28a8c0adaaf4516d383d18bec46e35e9efb248d703f` |
| `app/src/masked-terrain-mesh.test.ts` | `7286fe0cdb280360b7b62703fe4caf83a54ba9e1295adff372adbe81110ec9c5` |
| `app/tests/masked-terrain-mesh.browser.mjs` | `2e5ac98cb687018ffe88204c7de3bfbb404f7926200975e32b7568a28e860b21` |
| `app/tests/streamed-region.browser.mjs` | `86a6fc25103393a80ee638786f66f37a2d0300a8091217655cd2fdf40bece918` |
| `app/src/streamed-terrain-provider.ts` | `cdb6c2c397c71075d1bbdf4803ea4158744b377b7bb00414b82ee293773f5127` |
| `app/src/streamed-terrain-assets.test.ts` | `fc70ce7cfd953681a19fe58ea12259507cc9d0681ba78a928d3ac8ea3625584d` |
| `studies/e1-browser/sim/terrain-stream.js` | `21a957e3807edfd8a72fdb9215f1053cdf12d0e80a29b900eefbc5c493a7fbcc` |
| `studies/e1-browser/sim/terrain.js` | `c8aaf1e3bef3c06c3121f912dab845a88957bd5a4bb75e352dcd3f9893db97f5` |
| `studies/e1-browser/sim/terrain-grid.h` | `1fb82497d6d8ad9be270e8e9f151092acc383240d79536b43c9d5938d0d2afff` |
| `studies/e1-browser/sim/bridge.cpp` | `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `utils/terrain/build_regional_terrain.py` | `e51c7b39926f525b7c48a25680a842c2b1599b7502b6a39a6a43ce30896e9343` |

## Inspected run artifact hashes

These ignored outputs identify the locally inspected evidence; they are not versioned acceptance claims.

| Artifact | SHA-256 |
| --- | --- |
| `output/flight/panel-layout.json` | `174c70fee4ad3cf4138f5a204363ecb9ae68f968f58fdb0b68bd194d6e5f8d0d` |
| `output/flight/panel-fixed-gestures.json` | `c9dd26a86514dc22d1afe78a1fcb57fb772f41d955e8ec34e501dcdcdb7b0c5e` |
| `output/flight/fixed-panel-fov-browser.log` | `215365666c72e916b78c622efdfe1539707336f81d4eedaf8004328039a3b134` |
| `output/flight/five-state-map-regression.log` | `29a6b593f8e85fb6a69fde08ebc7c441116d84ec28a3b13c801401a471119e90` |
| `output/flight/masked-terrain-empty-gpu-reproduction.log` | `1f0ccd0a57367f1ee6a0734b93e25cf5c787700d9109926c22877303da292016` |
| `output/flight/masked-terrain-mesh-browser.json` | `5ded89e723bfa88408639b1ec5c6dbe7bc9c2302981dccf75c1074dc05c75184` |
| `output/flight/five-state-border-browser.json` | `be114deff87b8ff6e46498c0f2723dd4d8497d3b576686715473700b6717506f` |
| `output/flight/five-state-quality-terrain.log` | `9ee3fc2d90fa54d9057edbef60d12dce346bc220eb8f1327cb80b43db45b5c62` |
| `output/flight/five-state-quality-sentinel.log` | `3ee93daefd69de62badfe1d67ac375b91be5ec81a2a6a5ba2e1c984f800a2d9f` |
| `output/flight/five-state-quality-cpp.log` | `bbcb00b4295f3e3ef719cc0e27c221fd650b11f65375b0d50428c2b8953cb3e4` |
| `output/flight/five-state-quality-native.log` | `3c0707d334b23adb93c125e1ab12a4314db8e631e26a575b306c63bb3661466c` |
| `output/flight/five-state-streamed-region-browser.json` | `84d55c39732a59c3e99666c8ce75a79c762af2ee5bdd470d5a0e903eb94c31f0` |
| `output/flight/five-state-streamed-region-browser.log` | `3df255e66d1fde22c127f27cdde824c7b9ce80313d0948901dd3ddd4720ebf1b` |

## Limits

Cross-provider peer review remains pending under the existing cadence. No simulation, source-height, surveyed runway, aircraft, training-credit, full regional completeness or current-chart acceptance follows from this report. The observed regional renderer/native agreement is bounded to the eleven sampled sites and the stated numerical tolerance; national-border gaps and exact picking seams remain disclosed.
