# World-map place-label validation

Reviewed 2026-11-05 13:32 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO 2.0.139;
bounded R-WORLD-11. **Pass for the source-scoped label increment and observed
New York rendering.** Cross-provider peer pending.

Read the [USA-label report](../input/2026-11-05-usa-labels-rpm-response.md),
current SPEC and label/consumer source. Independently viewed both saved images
and inspected actual browser JSON; no reviewer browser run, new tests or source
changes were made. Only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| Actual 2D place names, including USA | Screenshot clearly shows readable “New York” with a dark halo on the interactive map. Actual style JSON includes the three new symbol layers. This directly demonstrates one city label, not complete USA coverage. | pass at observed location |
| Bounded names and zoom/collision rules | Source selects city at z4, town at z7, village/suburb at z11; names must be strings of 1–80 characters. It sets padding, rank sorting, non-overlap and a 1.5 px halo. | pass by source inspection; zoom boundaries, dense placement and other scripts not evaluated |
| 2D-only, below regional cartography | Practice map adds symbols before regional raster layers; actual JSON confirms ordering. The 3D world style still uses geometry-only `worldMapLayers()`. Viewed source tiles contain no place labels; the app screenshot shows 2D names with optional 3D landmark labels Off. | pass for source/order and viewed samples |
| Existing source/font/credits | Uses the same pinned OSM vector source and local sans-serif, with no glyph/sprite/font service or dependency added. OSM/OpenFreeMap/OpenMapTiles credit remains in actual map attribution; obsolete “labels omitted” wording is removed. Base palette remains the TODO138 palette. | pass by source/JSON inspection |
| Regression scope | Existing unchanged focused browser run 3038 exits 0, two generic groups, Chrome156.0.8078.80; checks cover actual source rendering, world startup/ordering/credits and paused invariance. They do not directly assert the new name filters or text pixels. Screenshot inspection supplies the specific city observation above. | pass for those existing checks only |

Frozen identities independently match:

| File | SHA256 |
| --- | --- |
| `app/src/world-map-style.ts` | `195bfe471f55394daffaf373c7ce75d0d02495da92445241ad52196124267a12` |
| `app/src/practice-map.ts` | `9b72207fd17c0ff8666d67fa4cb613558e372633ee03c558c199b9523547076e` |
| `world-labels-task139-browser.json` | `8464735206bca1c478900a61d2e05399b71b58db5a85958972c1fd0de4a2a779` |
| Matching `.log` | `713e2eb2515d70a9bfd9cf5d7ff0ce62122774b20ecf8233ddf79ca759e60ded` |
| Outside screenshot (`output/flight/world-labels-task139-outside.png`, ignored local evidence) | `796c8112361f63719f6a0d8771d6db1ef3fac44638efe5e07efbfa5192ca9068` |
| Source tiles (`output/flight/world-labels-task139-real-source.png`, ignored local evidence) | `9c98c38f0735ed6358f661148a320bf66c86b7fccab37a200490072749ca1104` |

Evidence files are under `output/flight/`. Read SPEC hash is
`5a8bb6364c3fbb964b71a7623f0d99169c2d81fd332396d44d777d024168b57d`;
input hash is `54f3cd3733cd1093da87aa544653cdc5bb01f842e7902b6fd7738fb74d75fbbe`.
No blocking finding remains. Road/country labels, exhaustive names, worldwide
font/browser coverage and navigation accuracy are not accepted. The RPM report
is separate TODO2.0.140; integration/publication gates belong to the orchestrator.
