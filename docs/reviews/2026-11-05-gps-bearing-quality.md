# GPS bearing display quality review

Reviewer: Codex `/root/quality`, independent of the implementation and test authors. Provider: OpenAI/Codex; no independently exposed model-version identity claimed. Scope: TODO 2.0.128 / current SPEC R-NAV-5, R-PANEL-1 and R-REVIEW-1, bounded working-tree increment based on `700dd5386125f9864a391f85b277cb71da55290a`. Final affected review: 2026-11-05 02:00 Europe/Berlin. Read AGENTS, quality-role instructions and applicable SPEC/ARCH/SEC/STYLE/SDLC. This review covers the current-target getter, main render/reset integration, bearing-gauge GPS presentation and affected tests. Earlier map/terrain/panel/native implementation is excluded except explicit boundary checks.

## Disposition

No unresolved blocking quality findings in the frozen source. The medium reset integration defect below is repaired and verified by passing author and independent nine-group browser runs. This quality report does not replace specification validation or cross-provider peer review.

## Finding and affected repair

**Medium, resolved — reset silently substituted NAV1 for a retained GPS target.** Location: `app/src/main.ts:990`. Reproduction: select a GPS direct-to or plan-leg target, restart flight, and delay the replacement worker's native runtime response. The planner/controller retained the GPS selection, but reset called `navigationGauges.update(null, false, false)` without the selected target. The default-null argument changed the dial to NAV1 while GPS position geometry was unavailable. Expected R-NAV-5 behavior is selected GPS identity with an unavailable pointer/readout until the new native frame arrives, without substituting radio bearing/DME.

The integration owner now passes the current getter target into the reset's null-state update. Source re-review confirms it reaches the existing GPS-selected/missing-state branch, which retains identity, hides the pointer, shows unavailable geometry and marks DME false. The final delayed-native-readiness browser regression passes in both the author and independent validate runs: selected GPS identity stays visible with unavailable geometry until the fresh native state arrives. The affected source and runtime repair are accepted in this quality scope.

## Source and numerical inspection

The map getter selects the same frozen direct-to or active-plan-leg point used by the map readout. Cached immutable snapshots and direct array indexing keep ordinary per-frame lookup bounded/constant; it is independent of map visibility and returns null after disposal. Draft-only edits do not select a target. Plan Next/Stop/Clear and deleted custom direct-to transitions use the existing model/selection state rather than an extra stored GPS state.

The gauge consumes a read-only target plus the displayed live/recorded aircraft frame. It converts radians to degrees at the existing `pointNavigation` boundary, retaining true bearing and spherical geographic NM rather than magnetic course or radio slant-range DME. Compass-card rotation is negative true heading; pointer rotation is target true bearing minus heading, matching the existing NAV bearing geometry. A selected GPS target remains GPS when state/coordinates/heading are invalid or the target coincides; unavailable geometry hides the pointer instead of falling back to NAV1. Coincidence may still show zero distance. Null selection restores the original NAV1 VOR-derived teaching bearing and independent radio DME path.

Visible titles, target identifiers/names and current/Review labels distinguish GPS BRG/DIST from radio DME. Long labels are bounded on the face with full inert tooltip/accessible descriptions. Existing internal DME element IDs are reused, but displayed labels and DME-valid metadata are changed for GPS. Review explicitly combines CURRENT GPS with REVIEW POSITION, without claiming captured GPS avionics. No installed C172/G5/GPS/FMS fidelity or AP GPS guidance is inferred.

The GPS branch is presentation-only. NAV1/NAV2 signal/OBS and RPM update paths remain independent. It does not call worker, radio, autopilot, OBS, terrain or recording mutation APIs and adds no storage, network, dependency or permission flow. AP NAV remains native NAV1-radio guidance. No keyboard binding or editable heading-control behavior was changed by this increment.

## Test inspection and evidence

Independently executed `node --test app/src/map-flight-plan.test.ts app/src/radio-nav.test.ts`: **26 pass, zero skipped**, `/tmp/gefly-gps-quality-unit.log`; `npm --prefix app run check`: **pass**, `/tmp/gefly-gps-quality-types.log`. Scoped implementation `git diff --check` passes.

Inspected the implementation author's nine-group pass and a separate validate agent's independent nine-group rerun, each confirmed exit 0 on the frozen source. Stable copies are `gps-bearing-author-browser.json` and `gps-bearing-validation-browser.json`; the latter reports pass, nine groups and no browser errors. Direct north geometry independently gives 0° TRUE and 12.008091430298238 NM. The browser uses actual map controls and native JSBSim, with an independent three-dimensional vector/central-angle reference rather than importing the app navigation helper. Its checks include true pointer/card signs, geographic distance labels, hidden-map selection/Next, no GPS selection from draft creation, coincidence/unavailable source retention, exact NAV1 fallback, native/AP/radio/NAV/RPM invariance, current-target Review, live operation and compact/zoomed labels. Explicit isolated invalid-data fixtures are kept separate from actual native frames. The added delayed-runtime regression observes the actual missing-state reset interval with selected GPS identity, unavailable bearing/distance and no NAV1 fallback, then restores the pointer from a fresh native frame. Explicit draft/Stop/Clear/deleted direct-to cases pass. Inspected the 390×844 NAV dialog screenshot: GPS identity, BRG TRUE and GPS DIST NM remain visible within the face and are distinct from radio DME. The final ten-group legacy planning rerun also passes on the integrated GPS/Follow/reset source (`gps-bearing-legacy-plan.log`, integration-owner execution). The legacy three-group navigation-aux log also passes, retaining LAB, station-passage/flag, actual RPM/slant-DME, OBS and recorded/native boundaries. These browser processes were executed by their author/integration owner and separate independent validate agent, then independently inspected here; this reviewer executed the targeted unit/type checks. The separate validate report owns criterion acceptance. After the complete code freeze, this reviewer independently reran TypeScript successfully in `/tmp/gefly-final-quality-types.log`. Inspected the final integrated `final-gps-unit.log` (445 Node tests plus twelve Python tests, zero skipped) and `gps-bearing-build.log` (pass); those full checks were executed by the integration owner.

## Frozen source hashes

Full-file identities pin the inspected integration; only the criteria and code slice declared above are accepted here.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/practice-map.ts` | `c5658fa8eaab8fbb289b606eb7ad75132504a3c6497fe4b9fc6d2300b58d0318` |
| `app/src/navigation-gauges.ts` | `0ede1a58d1ce28826eadede1f25e65c76762497371d60c9dd2b107712d14e619` |
| `app/src/navigation-gauges.css` | `cd9b5a20bac0e28703b9258aa968a75a8b314b87bdba34e20b50dedd13489b29` |
| `app/src/map-flight-plan.ts` | `20d456997d58575a7c866b218b5dc48ea8c0c9099b5a460cdf343a0eaacc2c90` |
| `app/src/map-flight-plan-types.ts` | `2c3bb3e9a536fa0907e912b5e1b12624069efaf542a66e5d0148c6412afcbf5c` |
| `app/tests/gps-bearing.browser.mjs` | `eb136939905d0307370455a486cb2bee4feeffbd5f572ad53094f31d768db45d` |
| `app/tests/navigation-aux.browser.mjs` | `8e683910c03ca54378fa85c0f817ffefd5be7195fd3adfe170641a473cc43712` |
| `app/package.json` | `e6ea6233364b412c001a660234baf22e493735944b45df4be20be76ab334f4a7` |

## Inspected evidence hashes

Disposable outputs identify inspected evidence, not versioned acceptance claims.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/gefly-gps-quality-unit.log` | `b59924c1a6f1c9b6b06803666f11997eee776cb111f9fc7557844646c39c1e01` |
| `/tmp/gefly-gps-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `/tmp/gefly-final-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/gps-bearing-author-browser.json` | `83bb6cecff02836dbf2e7ffc930a8673daabee9c8c4ed5c5aaefb0ffe28292bb` |
| `output/flight/gps-bearing-validation-browser.json` | `d5a17ddf6271b92868bc49ec91b3e22ae0a9e1d61230f696c008d3fae65a46ca` |
| `output/flight/gps-bearing-browser.log` | `b2e7bc2c01fe4278bfdb83b1053f1bb171684552da93860c560f84b6110566a4` |
| `output/flight/gps-bearing-mobile.png` | `d1d74dd4bb5accabe94242c7872b09aa07941be3c0281e9d37d9f0c03afc7ef0` |
| `output/flight/gps-bearing-zoom.png` | `6167fc09435bb32218e8bc61348fd1280a1f15a37673e74c4fe4a98de93ef46c` |
| `output/flight/gps-bearing-legacy-navigation-aux.log` | `4933b485d9a8df984da62a6415a5294c92b5411930c3345e16eb6a33930971d9` |
| `output/flight/final-gps-unit.log` | `e4696109b88c01cff09de572b7baa6c93bbf834cc1197f35543bafd9ba589486` |
| `output/flight/gps-bearing-build.log` | `c4af66d93b72ad5be8e8afcab07a92b01fd23ebbc9b5d217a987ebb7c7cfa756` |
| `output/flight/gps-bearing-legacy-plan.log` | `2d0b9331f00171bb920dccbae8379208a8c19f37c639eb152bf2f1a12050d28b` |

## Limits

This is a generic visual GPS bearing aid, not installed-aircraft GPS/FMS, certified receiver, wind-corrected heading or AP GPS coupling. No operational navigation currency, training credit or aircraft fidelity acceptance follows. Quality and independent specification validation remain separate; cross-provider peer remains pending. Changed affected source/tests require renewed review and hashes.
