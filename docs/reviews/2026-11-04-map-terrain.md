# Cartography without labels on terrain: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 02:29 Europe/Berlin**.
Scope: replace the small EDFE-only Vector landscape with actual regional map
cartography on the 3D terrain; preserve the normal 2D flight map and native state.
Relevant slices: R-WORLD-2/R-WORLD-3/R-WORLD-6 and R-DATA-1. Implementation authors
are the Codex orchestrator, `glide_cases` and `glide_model`; the reviewer did not
author their implementation/tests. The reviewer's research note, shared status,
catalog and run-observation JSON are outside independent acceptance scope.

## Quality outcome

**Pass for the frozen bounded implementation after repaired findings.**

The provider uses one 512px MapLibre renderer and returns separate canvases to
Cesium with Web Mercator tile coordinates. Its queue, copied-image LRU, failure
records and MapLibre tile cache are bounded; cancellation/disposal remove active
work and release renderer/cache references. Style bytes are hash-checked before
rendering, symbol/extrusion layers and glyphs are absent, and resources use fixed
same-origin routes. The proxy accepts canonical XYZ/sprite paths only, bounds
stream sizes and memory, shares duplicate jobs, limits upstream concurrency and
forwards no caller-selected URL or credentials.

Repaired findings include the real service's `application/octet-stream` PBF MIME
being initially rejected, plain rather than linked attribution, and a later
successful tile obscuring recent partial-failure status. The final source accepts
the official MIME only on fixed tile routes, supplies linked BKG/CC BY 4.0 credit
and change indication, and retains degraded status for outstanding recent failures.
The renderer also has an explicit internal tile-cache limit.

Scene integration keeps photography beneath the new overlay, disables the old
small vector-land replacement, and gates the map texture to public-terrain flights.
Transparent failed tiles expose the photograph rather than an opaque blank.
The 2D Map/Aerial background remains independent of the terrain-texture choice.
No native dynamics, elevation package or navigation source is changed.

An early 3D screenshot showed only one loaded cartographic patch over photography.
That capture and its tile-counter-only criterion were rejected. The final app
fixture starts and pauses before comparison, removes the initial Start card,
and waits for a settled queue before capturing the actual view. The final image
shows cartography throughout the foreground and city, not just dataset flags.

## Independently executed evidence

- `node --test app/vector-map-server.test.ts`: **6 passed, 0 failed, 0 skipped**.
  Includes fixed routes, official MIME, sprite validation, malformed/oversized
  responses, concurrency/pending bounds, sharing and byte LRU. Local stdout:
  `output/flight/map-terrain-quality-proxy.log`.
- `node app/tests/map-terrain-imagery.browser.mjs`: **8 groups passed**, actual
  **Chrome 156.0.8078.80**, with live official PBF/sprites except named failure
  cases. Local stdout: `output/flight/map-terrain-quality-provider.log`.
  At 49.9116°N, 8.6348°E, tile 14/8584/5562 rendered 4,410 colors and all
  262,144 pixels opaque; the neighboring tile contributed 1,553 rendered features.
  The reviewer visually inspected the resulting roads, buildings, fields and lake.
  Tests cover independent returned canvases, native source ceiling 15 with image
  overzoom 16, 34 distinct requests exercising the 32-image LRU, queue saturation,
  cancellation, transparent failure, disposal, external abort and style tampering.
- Independently re-fetched the official color style, SHA-256
  `45aacf6ac3b391e360a3d73e7f4f79eeefe32f2f7dd92527595cfffe2e1bca00`.
  All 360 retained local layers compare **exactly equal** to the official 573
  layers after excluding only symbols/extrusions. Their real cartographic colors,
  filters, geometries and layer order were not replaced with invented scenery.

The orchestrator separately ran `node app/tests/map-terrain.browser.mjs` against
the actual app/native worker at the requested initial point, then briefly flew
and paused before taking the baseline. Final stdout reports 103 rendered imagery
tiles, zero queued/failed, ready status and 221 successful real PBF responses.
The reviewer inspected its assertions, stdout and the final standard/cartographic/
restored captures; this is not claimed as an independently executed app suite.
Paired images visibly distinguish photography from cartography while retaining
the labeled public flight map. Native paused step/digest/state and worker identity
remain unchanged across texture switches. Local log:
`output/ci/map-terrain-integration.log`; final capture:
`output/flight/map-terrain-cartography.png`.

## Affected failure-test review, 2026-11-04 02:33

The orchestrator added and executed
`node app/tests/map-terrain-fallback.browser.mjs`; three reported checks pass on
Chrome 156.0.8078.80. This reviewer inspected the final source, stdout and actual
`output/flight/map-terrain-fallback.png`. Forced vector HTTP 502 responses leave
real bundled starter photography visible, retain the normal 2D base-layer
selection, and display the explicit degraded/photography-retained message.
Native paused step, digest and final state remain unchanged. Local stdout:
`output/ci/map-terrain-fallback.log`.

This named failure fixture substitutes deterministic pixels for other live WMS
map/imagery requests; its green 2D background is a fixture, not evidence of real
cartographic content. The prior settled live-data app comparison supplies that
separate evidence. No recovery after the upstream service returns is claimed.
The reviewer did not rerun unchanged provider/proxy checks or claim independent
execution of this orchestrator test. Production implementation bytes remain
unchanged from the preceding packet.

Package wiring was inspected: the six proxy units join the default app test and
`test:scenery`, while `test:map-terrain` explicitly runs provider, whole-app and
failure browser suites with their network/runtime prerequisites.

## Main integration: affected review renewed 2026-11-04 02:41

The branch incorporated main `18e52fe0697eff6d8dccb3a450d63977f24cee5a`,
including PR67 portable recording context and PR68 sensed Setup. Exactly three
previously covered files changed: package wiring, practice-map integration and
the existing airport browser test. Provider, proxy, style, scene and the new map
browser suites remain byte-identical to the earlier reviewed packet; their
independently executed provider/proxy checks were not redundantly rerun.

The reviewer inspected the integrated boundaries. The map retains main's fourth
Setup argument, forwarding the selected snapshot after a practice baseline exists.
Main still selects recorded floor states and keys event reconstruction by trace
identity; imported/legacy context does not borrow live runway/control data. The
new map texture toggle remains independent of Map/Aerial selection. The package's
default test command exactly preserves main after removing the single added proxy
test; its full browser command is unchanged from main. The airport-test diff
against main is only the updated Map terrain accessible label, retaining all
portable-context and Setup-era behavior.

The orchestrator renewed production build, actual 3D comparison, whole-scene
failure and the full seven-group airport browser regression after integration;
all commands exited zero. The fresh 3D run has 103 rendered tiles, zero queued/
failed, ready status and 214 successful PBF responses. This reviewer inspected
the fresh capture: roads, fields and the city cover the 3D view without labels,
while the normal labeled 2D map remains. Native paused step/digest/state are
unchanged. Fresh evidence remains in `output/ci/map-terrain-integration.log`,
`output/ci/map-terrain-fallback.log`, `output/ci/map-terrain-build.log` and
`output/ci/map-terrain-airport-regression.log`.

These are renewed orchestrator executions and independently inspected artifacts,
not new independent browser executions. The source packet now additionally pins
the reviewed main/trace/Setup/type interface boundaries. Quality and the bounded
validation outcomes remain Pass; upstream recovery, full scenario/training
acceptance and external-provider peer remain unclaimed.

## Bounded assurance compatibility: affected review renewed 2026-11-04 02:51

The final gate exposed the generic JSON extractor's 12,000-node per-file cap:
the pinned 174,559-byte map style contains **15,988 traversal nodes at maximum
depth 8**, independently counted by this reviewer. The narrowly scoped adjustment
raises that per-file traversal cap to 20,000 and updates its documented value.
The style is still fully extracted, not hidden or excluded. The depth-48 limit,
file/read limits, graph-wide budgets and error behavior remain unchanged.

The reviewer independently inspected the three changed assurance files and ran
`node --test utils/assure/src/graph.test.ts`: **16 passed, 0 failed, 0 skipped**.
The added boundary case accepts exactly 20,000 nodes (root plus 19,999 leaves)
and retains the last pointer, rejects 20,001 nodes, accepts depth 48 and rejects
depth 49. Local stdout: `output/flight/map-terrain-quality-assure-graph.log`.
This bounded AS1/AS7 compatibility change passes scoped quality/validation; it
neither establishes source truth nor accepts the aircraft or the full assurance
system. No new tooling architecture or asset exclusion was introduced. Product
implementation bytes and their previous executed evidence remain unchanged.

## Scoped specification validation

| Criterion | Expected / observed | Outcome |
| --- | --- | --- |
| Regional visible geography | Real official map material renders outside the EDFE extract, including the requested area south of the airfield. Actual provider pixels and settled app capture show roads, urban footprints, fields and water. | **Pass for exercised region/view** |
| No terrain labels | All symbol/extrusion layers and glyph dependencies are removed; preserved cartographic layers match the source. Actual request/render checks and visual inspection agree. | **Pass** |
| R-WORLD-6 / normal map | Selecting Map terrain leaves the normal 2D map present; Map/Aerial selection does not reset the terrain preference. The actual 2D map remains nonblank. | **Pass** |
| R-WORLD-2 / visual-only boundary | Existing elevation and native state remain separate; app switches retain paused step/digest/state and one worker. Public/flat-study gating is inspected in source. | **Pass for exercised switches and inspected gating** |
| Failure and resource bounds | Independently executed provider failures return transparent pixels with degraded status; the orchestrator’s whole-scene forced-failure run also preserves starter photos, base-layer selection and paused native state. Queue/LRU/cancellation/disposal assertions pass. | **Pass for executed cases; upstream recovery unclaimed** |
| R-DATA-1 / source and rights | Versioned derived style, source/hash metadata, official CC BY 4.0 terms, visible linked attribution and change notice accompany the new source. | **Pass for this data slice** |
| Global/world/aircraft acceptance | Germany cartography does not extend the physical terrain domain, prove surveyed airport or obstacle accuracy, supply operational charts, or validate aircraft/training fidelity. | **Not evaluated / not accepted** |
| External-provider peer | No external-provider review ran for this increment. | **Peer pending** |

The source is basemap.de cartography, not pixel-identical TopPlusOpen styling.
Its live vector database/sprites can change independently of the pinned style;
this review does not freeze a global scenery edition or assess all boundary tiles,
all-device performance or full end-to-end network-failure recovery. Initial tile
loading can show photography until cartography arrives. The evidence supports
this visible increment, not full R-WORLD or training-milestone acceptance.

## Frozen source packet

Current renewed working tree is based on `18e52fe0697eff6d8dccb3a450d63977f24cee5a`.
The initial pre-main review was based on `05ec1ca515548436ba81f7b86da432ddbf693fd0`.
Packet SHA-256:
`da3fdecd1801beb557148a2fa6823085541a57b9fc47610f65408d2d9c40cdfa`.
Calculated over sorted `path + NUL + lowercase SHA-256(file bytes) + newline`.
Ignored inventory: `output/flight/map-terrain-review-packet.json`. Covered byte
changes require renewed affected review. Shared documentation/status/catalog,
observation JSON are outside this source packet. The previous packet
`69b0ceae27dea401995d00ac4b3abcc2d36b3701aa2fad3be0ba390d969d2b37`
was superseded first by failure-test/package review packet
`e900ec737750ff2d1233823f71c1e9f1e2daaaf9d09b3b0a460cd63def226913`,
then by main-integration packet
`42e9237fa887d08976b25cddbad92324dfd77195a467e5cb756680f17b53618d`
and the current assurance-compatibility packet. Historical observations remain
historical; unchanged implementation evidence remains applicable as scoped above.

```text
app/package-lock.json
app/package.json
app/public/mapdata/terrain-style-README.md
app/public/mapdata/terrain-style.json
app/scenery-server.ts
app/src/control-settings-panel.ts
app/src/flight-trace.ts
app/src/main.ts
app/src/map-terrain-imagery.ts
app/src/map-terrain-style.ts
app/src/practice-map.ts
app/src/practice-setup.ts
app/src/runway-practice-panel.ts
app/src/scene.ts
app/src/types.ts
app/tests/airport-play.browser.mjs
app/tests/flight-actions.mjs
app/tests/map-terrain-fallback.browser.mjs
app/tests/map-terrain-imagery.browser.mjs
app/tests/map-terrain.browser.mjs
app/vector-map-server.test.ts
app/vector-map-server.ts
app/vite.config.ts
utils/assure/README.md
utils/assure/src/graph.test.ts
utils/assure/src/graph.ts
```
