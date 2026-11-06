# Terrain horizon cliffs near Zug

Observed 2026-11-05; recorded 22:50 Europe/Berlin by Codex code2
(`/root/alps_renderer`), with raw-source diagnostics from code1
(`/root/alps_source`). Scope: TODO 2.0.158, R-WORLD-11/R-WORLD-9/R-SIM-2.
These are implementation observations, not independent acceptance or aircraft
fidelity validation. Pressure availability and the later Hessen report have
separate evidence below.

## Diagnosis from actual sources

A fresh paused application flight at 47.15°N,8.45°E installed the nine
`world30-c6029`…`c6031`, `r4387`…`r4389` cells. Their union spans
8.40625–8.5°E and47.09375–47.1875°N. Each129² grid contained16,641
Copernicus nodes, with zero regional/coarse nodes. All16 required canonical
Copernicus owners succeeded. Code1 compared every composed physical node with
its raw local service cell: maximum difference0m; adjacent raw and composed
shared-edge differences were also0m. This did not reproduce a corrupt Copernicus
decoder, failed owner or native-grid edge mismatch.

The renderer sampled these fine grids inside that rectangle, then immediately
sampled the bundled one-degree world grid outside it. At the southeast corner
47.09375°N,8.5°E, the fine physical height was413m and coarse physical height
1581.3847866m. The same geoid49.231442m applies to both, so the ellipsoid
height jumped from462.231442m to1630.616229m:1168.384787m. The independent
Zug/Rotkreuz source probes measured similarly large exterior transitions, despite
clean internal fine nodes. Their exact-window artifact retains all nine identities
and content hashes.

Public `requestTileGeometry()`/`HeightmapTerrainData.interpolateHeight()` checks
showed that the jump was already in the provider height surface. Six adjacent
Cesium shared-edge comparisons at L12/L14 differed by0m. AtL14 the coarse
fallback was reached one 0.000061035° vertex outside the fine edge, approximately
4.6m east/west at this latitude. This is a source-selection discontinuity, not
merely a mismatched Cesium skirt or an apparent texture edge.

An isolated Cesium widget using the actual production provider measured the
rendered surface through public `globe.pick()` and `globe.getHeight()`. One
vertex inside/outside that same edge returned462.097133m/1630.667275m before
the fix. The sharp wall also amplified GPU quantization/interpolation error to
about 45m exactly at its edge; the plateaus were within0.14m of provider heights.
The inspected before screenshot reproduced tall textured rectangular walls.
No synthetic heights were used for these source, provider or GPU observations.

## Bounded exterior display transition

The fix leaves every valid `sampleAtlas(fine, selected, latitude, longitude)`
result unchanged. This preserves actual resident/native heights and the existing
starter fine/regional feather. It changes only the exterior display where no
atlas sample exists.

Within an angular 1/8° band outside source coverage, the renderer projects to
nearby source rectangles and subtracts the coarse height at each projection from
the normal atlas height there. It blends those physical/geoid corrections using
normalized inverse-distance weights with compact smoothstep support. A source's
correction dominates as distance approaches zero; contributions from disconnected
history cells blend continuously at equal-distance locations. The amplitude
vanishes at the band boundary; beyond it the original coarse world sample is
returned exactly. Longitude projection wraps at the dateline, while latitude
bounds remain on the globe. Fully fine-interior world cells are excluded from
these exterior contributions because their surface is already hidden by the
unchanged starter fine source.

The 1/8° band is an explicit visual policy derived from the one-degree coarse
sample pitch. It is not measured terrain detail, an aircraft coefficient or a
physical/contact replacement. Outside the resident contact area the displayed
transition can differ from the coarse physical fallback. Actual flight contact
continues to use the independently loaded native window. No source buffers,
source outcomes, native ABI or engine binary are changed.

The existing finest coarse-preview tracking also covers the collar. An incoming
source's expanded rectangle must not intersect returned finest exterior meshes;
otherwise the provider declines the update and the scene rebuilds conservatively.
Eviction also protects returned collar contributions. Metadata-only/duplicate and
unaffected distant updates continue to retain the provider. Bounds remain 64 live
history cells, 73 static Review inputs and 512 tracked finest exterior rectangles.
No private Cesium APIs were added to production code. Browser probes use private
quadtree fields only as read-only LOD diagnostics alongside public height queries.

## Results and limits

The same L14 GPU transect after the fix measured462.226537m one vertex inside
and462.317556m one vertex outside: about0.091m change across the two-vertex
span. The provider values were462.231451m/462.315873m. Across seven edge
probes, maximum L14 GPU/provider difference was0.0051m. Adjacent provider edges
still matched exactly. A dedicated widget with a separately owned production
world-cartography renderer reached `tilesLoaded=true` in both inspected views;
the after screenshot showed continuous textured geography without the rectangular
walls. An earlier attempt that shared one imagery provider between two widgets
produced mostly blank imagery and is excluded from visual acceptance.

A real production application flight eastbound from Zug at requested10×, using
A autopilot, produced 22 sampled states from 20.08 to442.78 simulation seconds
and reached native step 53,134. There were 11 terrain installations, 9 successful
live updates and one provider change for initial installation; no later globe
rebuild occurred. Native/L14-provider height disagreement was at most
6.73e-11m. All 22 public GPU picks succeeded, with maximum native/GPU difference
0.05697m. The run loaded 445 cartography tiles and ended with zero queued tiles,
zero failed requests, no JavaScript/render errors and one page navigation.
This is one bounded flight, not a guarantee for every camera, source failure or
history-capacity transition.

The 10× run preceded the final filter excluding redundant fine-interior sources
from exterior weights. It did not intersect the starter fine area, so its Swiss
sampling branches were unaffected. The final filter has a specific regression
showing that an accepted fine-interior source cannot alter cached exterior
geometry. Final frozen code also received the actual-source Swiss visual/GPU and
Hessen application checks. A new complete10× run at the final file hash was not
performed.

Final root provider tests: 26/26 pass; TypeScript check passes. Mechanism fixtures
are explicitly synthetic and cover all four edges/corners, exact interior and
outer coarse heights, geoid correction, disconnected-source ties, dateline,
polar bounds, update/eviction safety and redundant fine-interior sources. They do
not establish real-world elevation accuracy.

The isolated branch at `/private/tmp/gefly-terrain-collar`, based on 774e914,
receives the same exterior algorithm and cache guards while retaining its legacy
quarter-degree sources and far L12/starter L14 policy. It does not import the
unpublished root world30 implementation. Its24 provider tests and TypeScript
check pass. The root disconnected-source overlap fixture is not copied literally:
a legacy quarter-degree empty-cell gap is already twice the1/8° collar width.
The root 1/32° profile exercises the actual overlapping disjoint collars. Legacy
fine-interior fixtures use a valid quarter-degree interior cell. Independent
review must cover this legacy port separately; root browser results do not prove
its entire integration.

## Durable browser mechanism regression

`app/tests/terrain-horizon.browser.mjs` now runs independently in each checkout
on port 5363 with its own Vite optimizer cache. It resolves Cesium through Vite's
transformed dependency URL, so it does not require a preexisting default cache.
The test declares synthetic resident physical 400m plus geoid 40m against a
synthetic coarse physical 1500m plus geoid 40m. These are mechanism fixtures,
not measured Swiss elevations. It measures the real checkout provider and public
`globe.pick()`/`getHeight()` at the interior, inside edge, boundary and outside
edge, and rejects a recreated 1100m wall or errors/external requests.

Both final runs pass. Root uses valid `world30-c6030-r4388`, 1/32° source cells
and terminal L14; maximum GPU/expected difference 0.001647m. Legacy uses valid
`world-c753-r548`, 1/4° cells and terminal L12; maximum difference 0.004238m.
Legacy inside/boundary/outside GPU heights were 439.997167m,439.995762m and
440.048960m against declared 440m,440m and440.050223m; its independent interior
pick was439.999328m. Both had zero JavaScript/render errors and zero external
requests. This supplies actual legacy runtime evidence for the bounded collar
mechanism; it does not establish legacy real-source flight fidelity. Early
fixture-load attempts failed on dependency URLs and are not passing evidence.

## Hessen follow-up

After the user reported no Hessen elevation following an engine rebuild, source
and native probes still returned real nonzero elevations. A final-hash fresh
actual application flight at 50.232°N,8.457°E independently observed
`terrain_profile=1`, `terrain_source=1`, `CustomHeightmapTerrainProvider`,
`terrain=public-grid` and `terrainRelief=dem-derived`. Native physical height was
867.484508m, geoid48.339383m and ellipsoid height915.823891m. The L14 provider
returned915.824226m and the public GPU pick915.824554m: native differences
0.000336m/0.000664m, within the existing0.25m engineering rendering budget.
Static pressure was85602.422827Pa. No JavaScript error occurred.

A separate fixture measured actual EDFE physical height 115.250626m with GPU
ellipsoid 163.050676m,0.0018m below its source. Its Feldberg sample used the
starter fine grid without a Hessen streamed window, so it returned875.161042m
before the normal regional feather. That fixture alone is not native parity
proof at the fine boundary; the actual application result above includes the
correct regional window and feather. The fresh normal application did not
reproduce absent Hessen relief. The user's existing live browser/session, any
explicit flat-study preset and stale served assets were not inspected or modified
by this renderer agent; the cause of that report remains unestablished.

## Remaining physical-source risk

Code1's separately injected failed-owner experiment can produce a fine/coarse
height discontinuity *inside* a composed native grid. That is a physical source
composition risk tracked separately as open TODO 2.0.160. This exterior-only fix
intentionally preserves those native samples and does not hide or resolve that
risk. The successful real Swiss owners in this investigation did not exhibit it.
The engine's stale local build record also remains a separate provenance issue;
these terrain checks do not certify its build or aircraft fidelity.

## Frozen source identities and local evidence

SHA-256 source identities:

| Source | SHA-256 |
| --- | --- |
| Root `app/src/global-terrain-provider.ts` | `0bc1b0cb742dd1cc67c147dfdb4ce77e5daf043e4a5e5b906b45248f03a4fecc` |
| Both checkout `app/tests/terrain-horizon.browser.mjs` | `3c7d585fcb983f8c5595064149fe5b0e689d4948fe2055799d37846d686c1c40` |
| Root provider tests | `b8df9730740a92b4bf81e4c1d205ba3513b0c914ed2b1adbb916df8d4ab9d7ba` |
| Legacy port provider | `0a8e79855255a5e66b3dfef6f994000bd787258ded2bf9db49b3fdc24a64b09e` |
| Legacy port provider tests | `630b3ba673a5fd605bd4004b97ccd9149cad4bc1b93cbfa47379dc5b2b213fb4` |
| Root `app/src/scene.ts` | `7ba788811880b63d6f07ad4bd3a92ca1f06002cf12d044c8018cf52ae2a648b5` |
| `studies/e1-browser/sim/terrain.js` | `c8aaf1e3bef3c06c3121f912dab845a88957bd5a4bb75e352dcd3f9893db97f5` |
| Root `terrain-stream.js` | `2c2e1696464730252d032097a8e94bc5bef13636686a7d2f5e2608b65a9ebe2b` |
| Root `world-terrain.js` | `7f66844b10832cf885e9ff9a61a33c9551f2ae6a3c8fb1bb99bc777724ddde58` |

Browser: installed Chrome 156.0.8078.80, 1440×900. Probes used an isolated Vite
port 5357 and unique optimizer cache, separate browser storage and no service
worker. They did not touch the user's live VS Code browser. Scripts and results
are disposable local evidence under ignored `output/flight/`; the following are
inline artifact identifiers, not versioned links:

| Artifact | SHA-256 |
| --- | --- |
| `output/flight/alps-source-exact.json` | `f8b08ce656eb367a8de72c80704db6d85eaaf3b90e1c38ca58e4941a0ada2747` |
| `output/flight/alps-renderer-before-result.json` | `90b70065c0989040675ae285e18d540a6e0e959686f262b25012df802e770ef9` |
| `output/flight/alps-renderer-before-overall.png` | `7a15dde61c4aa6a3e17782c28ecb9f70df7e8affbef487c340a946b3921d2d55` |
| `output/flight/alps-renderer-after-result.json` | `12fe21461d765d90b4c11629ea56dc141ddbef6fbaf7ba6b1801e70af47ed219` |
| `output/flight/alps-renderer-after-overall.png` | `65d446b69ae0a56f74b942c4eb37ede20a25a2cdf2e95f6e2db3647a9947d56f` |
| `output/flight/alps-renderer-flight-10x-alps-collar.json` | `75ed197c7de984caa4f09a70df7b54221b3a610c70f673d4688c73a345158723` |
| `output/flight/alps-renderer-hessen-actual-app.json` | `8cbfc2e2a5e425049d641a8862ba4c0e4bcadc31958271a7df15ac24c3cf17fc` |
| `output/flight/alps-renderer-durable-root.json` | `ab67087fee6775258dcdee702f4b3720d93b4a5c81b891fbe5a866d403f33015` |
| `output/flight/alps-renderer-durable-legacy.json` | `242fdd82372ccc3da9e00ea7fdebae219687c5f5a52da005abf7d0e2969c0e19` |
| `output/flight/alps-renderer-unit.log` | `cc7ad75f962dbe52f262eeeaf0c77385ef16b972fd4edbfc4b0c50b6a0c8eb13` |
| `output/flight/alps-renderer-legacy-unit.log` | `f0e8d07330ed6580698b380da2a5c456ac336789e01413e25c8891553df635a3` |

Reproduction scripts are `output/flight/alps-renderer-probe.mjs`,
`output/flight/alps-renderer-flight-probe.mjs` and
`output/flight/alps-renderer-hessen-app-probe.mjs`. Source-window and HTTP-owner
measurements belong to code1's `alps-source-*` artifacts. Final integration,
assurance, shared CI and independent quality/validation are the orchestrator's
responsibility; none is inferred from these author-run checks.
