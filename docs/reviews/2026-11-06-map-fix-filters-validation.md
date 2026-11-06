# Map fixes and saved location filters — independent validation

Task 2.0.175; R-WORLD-6 and the source-filter portion of R-NAV-5.
Reviewed 2026-11-06; renewed at the final browser snapshot by Codex validation agent
`/root/map_filters_validate`. Implementation was authored by other Codex agents;
this reviewer changed only this report. This is independent same-provider
validation, not cross-provider peer evidence. Actual model/CLI metadata was not
exposed by this runtime.

## Artifact and evidence

The root working-tree snapshot is based on
`700dd5386125f9864a391f85b277cb71da55290a`; its unrelated dirty files are outside
this review. The ordered packet below hashes each file's bytes with SHA-256,
then hashes the UTF-8 lines `path hash\n`. Packet hash:
`af195835ae1bb23aaddb695ce8e9345e587c73cadaeffea3bb800d6e1c89da77`.

| Root packet input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `17a08c3e096ddbe885db026f57a75ea3c242324e502b998b91c2c97bac5dfdec` |
| `docs/input/2026-11-06-map-fix-filters.md` | `aa114f126656689986484d86996369607fc63f69a9fa522f591c694b69a621e4` |
| `app/src/practice-map.ts` | `a4ecfcf494822836f58a3e5d0111bca4e6b7ec4f6b17f764cb38707b86f68e88` |
| `app/src/map-point-search.ts` | `1388b06f42de5551ac904a22a189dccb495c19979373aa82b96906b9bf1fefc6` |
| `app/src/map-location-types.ts` | `4d885a01eafb450d2570a53a9dd3946ab7e4dbcce896921029ccaef87baf4549` |
| `app/src/map-location-preferences.ts` | `e351e3c39b690c1ea2dadfeb26a1d66742e338f3fc3b309732794978d027c2aa` |
| `app/src/map-location-types.test.ts` | `d547a28749eeb7e2f84c2f94d77d778b71257bf355d95da8fc094d32050f3578` |
| `app/src/map-location-preferences.test.ts` | `31a8ed7b6b31c2ffc50252dfd7e79a77bfd6be3dcd73ab854f6b800f4b02d907` |
| `app/tests/map-location-preferences.browser.mjs` | `87373aea1512db548fe8fe5e7ea94decd4ef28eaac1ffdf85594453ebfd649a1` |

I independently ran, from `app/`:

```sh
node --test src/map-location-types.test.ts src/map-location-preferences.test.ts
```

Observed independently in both the root and publication `app/` directories:
10 tests passed, no failures/skips in each. I inspected their assertions,
the implementation, the pre-change gate in the task snapshot, the browser
harness, and the actual root artifact
`output/flight/map-location-preferences-browser.json` (SHA-256
`01e97ba6587ee5d99cb3e1368698cfdbac29f7c8468c68466a9cb7acb408cdb3`).
Its result is pass, Chromium `156.0.8078.80`, five check groups, no page errors.
All five browser-recorded source hashes match the reviewed root files. I did not
rerun the browser or claim its producer's execution as my own.

The browser uses the actual application, native worker, pinned historical fixes
and MapLibre. Scenery/tile pixels are fixtures; a transformed module exposes a
read-only reference to the real MapLibre instance. Native telemetry is observed
through worker messages. This establishes marker geometry/rendering and UI
behavior, not external basemap availability or operational data currency.

## Root criterion matrix

| Requirement / scoped criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| R-NAV-5: common Fixes visibility | One checked Fixes control governs published markers and matching rows; no second default-off gate. | Root `paintFixes()` now uses `locationTypes.has('fix')`; browser checks absence of the old checkbox, 2,739 actual source fixes, ASKIK directory selection, correct map center, actual `queryRenderedFeatures()` match and visible selectable marker. Unchecking removes source/DOM markers and ASKIK rows; checking restores them. | **pass** |
| R-NAV-5: bounded source presentation | Retain existing source identity, historical labeling, nearest-40 label cap and zoom-dependent circles; showing source points does not create custom GPS fixes. | Source mapper still preserves fix ID/name/coordinates, historical status remains 2013.10, browser asserts catalogue count, circle `minzoom: 8` and at most40 labels. Only an explicit GPS-target action creates the displayed direct-to target. No creation is added to filter/paint handlers. | **pass** |
| R-WORLD-6: seven independent categories | Existing seven defaults remain on; airport subtypes, NAV and fixes use the same category classification for directory/map. | Pure tests verify all seven keys and airport/NAV/fix classification. Search clones its initial Set, initializes checkboxes before render and filters rows by that set. Map callbacks update the corresponding source/marker caches with the same selection. Browser confirms all seven fresh defaults and a fix-only factory independent of later caller mutation, with no initialization callback. | **pass** |
| R-WORLD-6: map/application reload | Mixed selections and explicit all-off survive reopening and reload, restored before first display. | Browser selects `[airfield, nav]` and `[]`, checks exact canonical stored records, closes/reopens the map, reloads the real page and opens fresh same-origin tabs. MutationObserver observations match expected checked values at first insertion, before opening the extended menu. All-off reload has no directory rows or fix source points. | **pass** |
| R-WORLD-6: recreation/new-flight lifetime | Creating a map and restarting a flight retain saved choices. | Each `createPracticeMap()` reads the separate record before creating the search/map. Real reload/fresh-tab runs exercise fresh construction. Final harness additionally triggers the actual Flight → Restart action after saving mixed choices, waits for new worker readiness, verifies retained selections, hidden fix source, visible NAV source and airfield-only facility types. A fresh native baseline stays paused; no cross-worker state-equality claim is made. | **pass** |
| R-WORLD-6 / SEC: bounded category-only record | Exact version1 schema, seven unique known strings, canonical order, max512 UTF-8 bytes, explicit empty valid; no query/coordinates/plan/aircraft persistence. | Helper is injected storage with no network path; pure tests inspect serialized output, reject extra fields/coercion/duplicates/future versions, exercise exact512-byte and513-byte edges, multibyte oversize, detached results and single-read accessor snapshots. Root callback passes only the current category array. | **pass** |
| R-WORLD-6: safe storage failure | Invalid/missing/denied records default to all categories without rewriting; denied writes keep session controls usable. | Pure tests cover missing/corrupt/unavailable reads and denied/quota writes. Actual browser corrupt/future/513-byte/denied-storage runs restore defaults; session fix-only changes/reopening work, and denied reload safely defaults. | **pass** |
| R-WORLD-6 / R-NAV-5: isolation | Display changes preserve other categories, explicit GPS target and native aircraft/radio/AP state. | Browser compares airfield/NAV GeoJSON and GPS-target line/point before/after Fixes toggles. Within each paused worker it compares native step, digest and complete final state; it does not compare unrelated workers across reload. Storage schema excludes receiver/native/planning fields. No new filter callback invokes tuning or native stepping. | **pass** for tested paused interactions |
| Current explanatory records | Current requirements/security/user instructions match new behavior, with old decisions retained as history. | Root SPEC, SEC saved-category section, ARCH and application README now describe the common Fixes gate and separate category persistence. Prior completed-task/review descriptions remain historical. Research note is explicitly a pre-integration maintenance handoff, not acceptance evidence. | **pass** |
| Additional root live/Review/AP map regression | Existing map controls, source filters, paused-state invariance and Review remain usable. | Inspected the actual completed `output/map-filters-legacy-browser.log`:12 groups pass, including live map open/close, paused native/AP invariance around ASKIK selection/tuning, independent location filters/all-off/reopen, tile failure, Review and narrow layout. This extends root regression evidence, not the smaller port's feature inventory. | **pass** for the listed regression groups |
| Live providers and all unrelated R-WORLD-6/R-NAV-5 criteria | Only accept when separately exercised at matching artifacts. | Fixture scenery does not establish provider availability. Aircraft coefficients, navigation inventory, physical terrain and all unrelated requirement clauses remain outside scope. | **not evaluated** |

No root criterion failure was identified. Root behavior is accepted within the
matrix's bounded evidence; the additional12-group legacy map run supplies the
listed live/Review/AP regressions without accepting unrelated requirement clauses.

## Publication integration

The proposed standalone branch is `fix/map-fix-filter-preferences` in
`/private/tmp/gefly-map-filters`, based on main
`52897de10dfdafb4f7b3252cdb41828f8a22b5f5`. I inspected its small delta: unlike
the root working tree, this base already uses Fixes as the sole published-marker
gate. The proposed changes add preference initialization/saving and the pure
classifier/helper without importing the root's unrelated worldwide-search or
plan UI. Root browser hashes do not validate this different application snapshot.

| Publication criterion | Observed | Outcome |
| --- | --- | --- |
| Actual browser behavior at ported source hashes | Final port artifact passes the same five groups, including actual Flight → Restart. All five recorded source hashes match current port files. The helper, classifier and final harness match root byte-for-byte; differing map/search hashes are listed below. I inspected the unchanged shared assertions, not just the producer's summary. | **pass** for the same bounded criteria |
| Integrated CI/assurance and source freeze | Inspected `output-map-filters-ci-corrected.log`: full `just ci` completes with its explicit passed-with-skips result, 560 application Node tests,22 application Python tests,85 assurance tests,11 training tests and assurance integrity passed. Native-study9 skips and one Linux-only repository-tool skip are recorded, not passed. All ten root/port runtime/harness source pins still match after the run. | **pass** for executed gates; optional skipped checks **not evaluated** |
| Cross-provider peer | Not performed by this same-provider validation agent; retain peer-pending status under the existing cadence. | **not evaluated** |

Final port packet (same ordered paths/algorithm as the root table):
`226f323f0abc2a5a2618f268c40e02d34955cfbb7ef008776337f3460459529e`.
Port SPEC hash:
`6fa61e4760dafbd726775e246d472974c0e81dc9180083c90a779d63a537e69f`.
The port's two differing runtime hashes are:

- `app/src/practice-map.ts`: `78b54be4d57ac3092d3c5eaf639f31600b8129d27c53f122eb0377ddb370fc58`.
- `app/src/map-point-search.ts`: `f97d65c03d3080f2d264161b865ab182d895b4088a6575a60962db2b0a1fea45`.

Its distinct `output/flight/map-location-preferences-browser.json` hashes to
`904cc5e747b03cd5de0cf048311e4ca3ef3d5b8d5462856a9e99f54bb87779ee`;
Chromium is `156.0.8078.80`, five groups pass and no page errors were recorded.

Preserved unsuccessful observation: the first port run, using harness
`040a316e2354409807bde81bc07197d916fd631ab657ff891cda38e69fdb696c`,
timed out at30seconds waiting for the ASKIK popup before completing any group.
The integration owner diagnosed the older main map's first-click activation
guard consuming the directory click; the root already contains an unrelated
activation UX change. I inspected the final harness repair: it activates the
older map by clicking a noninteractive legend before exercising point selection,
without bypassing callbacks or backporting unrelated product changes. The
successful rerun retains the original feature assertions and adds actual Flight
restart coverage. No runtime implementation file changed to resolve this
compatibility observation.

The corrected full CI log's SHA-256 is
`67eafcb3df3210ab15be61bb212503ba90255294d12727fef296231d9224253d`.
It identifies Python3.11.12 and includes the actual scaffold, test counts,
assurance integrity and final passed-with-skips line. The earlier full attempt
failed on a preparation-note Markdown link to a root-only test; integration
changed that to an explicit plain working-app reference and reran the whole gate.
This preserves the unsuccessful documentation check without attributing it to
runtime behavior. The corrected gate's scaffold phase reports406 Markdown files;
later review/status additions are the integration owner's final structural scope.

The root legacy-map log hashes to
`29a6b593f8e85fb6a69fde08ebc7c441116d84ec28a3b13c801401a471119e90`.
I also inspected the compact versioned runtime record
`docs/reviews/2026-11-06-map-fix-filters-runtime.json` (SHA-256
`121467ef6401fde503bf36432dac690c42217eccfd54ec05640ea427017d31e2`)
against both original browser artifacts and actual gate logs. Its source pins,
observations, artifact hashes and outcome counts agree; its nine optional-study
skips do not represent the additional Linux-only repository-tool skip as a pass.

Runtime acceptance now covers both frozen snapshots. Executed publication gates
pass within their explicit skips. Recommend accepting this bounded feature
increment, retaining peer-pending status and final integration-record checks.
Any later source or harness repair requires rechecking affected criteria at its
new hash.
