# OSM floating landmarks: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 09:13 Europe/Berlin**.
Scope: the optional OSM-name overlay in R-WORLD-7, with source/rights handling in
R-DATA-1 and recorded-view isolation in R-REVIEW-1. Implementation authors are the
Codex orchestrator, `glide_cases` and `glide_model`; this reviewer authored none
of their implementation/tests. The reviewer's
[source note](../research/2026-11-04-osm-landmark-labels.md), shared status,
catalog and observation records are excluded from independent acceptance.

## Quality outcome

**Pass for this bounded implementation after repaired findings.**

The fixed host/edition proxy rejects noncanonical paths and caller-selected URLs,
omits upstream credentials, rejects redirects and validates MIME/stream sizes.
Separate fixed BKG/OpenFreeMap pools allow four fetches each, eight total, with a
shared 32MiB cache/64 pending jobs and 48-job limit per provider. This repairs
observed BKG queue starvation of landmark requests; a symmetric blocked-provider
test proves the other provider can finish before the blocked pool is released.
OpenFreeMap receives an identifying User-Agent and at most four requests.

The client bounds tile bytes to 2MiB, scans/selection, geometry allocation,
four active requests, 27 desired tiles and a 96-tile cache. Geometry commands are
counted before external coordinate allocation. Raw names over 512 UTF-16 units
are rejected before normalization; output is limited to 80 code points and stays
inert Cesium text. Internal IDs include owner tile/layer, repairing collisions
between different tiles. The bounded candidate union is ranked by priority and
geographic distance before the 1000-item cap, preventing first-arrival starvation.
Epoch checks, aborts and cleanup prevent obsolete callbacks republishing labels.

Source points and actual line midpoints are converted from tile coordinates to
radians. The renderer samples existing terrain ellipsoid heights, uses small
visual offsets and bounds visible labels to 24/60/120 with distance, collision,
front/horizon and screen culling. Normal terrain depth testing remains enabled.
Selected live/recorded state drives placement; label code issues no flight inputs.
Label/dot collections, status UI and event handlers have disposal paths.

Linked OpenMapTiles/OSM/ODbL credits are visible. BSD parser and ISC point-geometry
notices match the installed licenses and the generated UI-build copies byte for
byte. The hosting software's MIT license is correctly distinguished from map
data rights. No offline tile/landmark database is added.

## Specification validation

**Pass for the following scoped criteria, not complete geography or fidelity.**

| Criterion | Observed evidence | Outcome |
| --- | --- | --- |
| Off/Places/Landmarks/Detailed cycling, guarded Period and bounded visible counts | Final actual-browser fixture suite: repeat/modifier/editable/modal/menu guards, cumulative source categories and counts | Pass |
| Actual public names above vector terrain, with source credit | Fresh screenshot visually inspected: full visible BKG cartography foreground with 57 real road/POI glyphs, including Heinrichstraße and Weyprechtstraße | Pass |
| Source-derived radian anchors, visual float/depth settings and camera declutter | Actual Cesium world-position checks, ground/label 7m difference, rendered look reversal and screen-overlap rejection; source point/line math tests | Pass |
| Pause and selected Review remain isolated from native state | Real worker step/digest/final-state comparisons; explicitly synthetic imported recorded-heading change and Back to live checks | Pass |
| Missing/malformed/stale data degrades without stopping flight | Decoder/provider/proxy adverse tests; forced source-failure browser case shows visible degraded status while the native worker continues advancing | Pass |

Independent final executions: `node --test app/src/landmark-data.test.ts`
**8/8 pass**, and `node --test app/vector-map-server.test.ts` **9/9 pass**.
These affected reruns supersede the earlier combined 15-test run. Implementation
browser evidence inspected: `output/ci/landmark-labels-browser.log` (five groups)
and `output/ci/landmark-public-capture.log`; those browser commands were not
independently rerun by this reviewer. The deterministic MVT fixtures are clearly
separate from the public capture and are not presented as real geographic data.

`output/flight/landmark-public-capture.json`, observed
**2026-11-04 08:10:01 UTC**, records 57 public labels, 22 loaded/5 failed name
tiles and no active/queued name requests. Partial source failure is visibly
declared. Cartography had 32 rendered tiles, zero failed and 20 still queued;
the screenshot visibly covers the foreground with vector streets/buildings/park,
but does not establish full source settlement or a loading-performance budget.
Earlier loading/photo-only captures were insufficient and are not accepted as
combined-vector evidence. The separate public decoder sample records actual
source tile hashes/names in `output/flight/landmark-public-decode.json`.

This does not establish all-OSM coverage, current AIS/navigation data, historical
geography for replay, surveyed anchors/obstacle heights or aircraft/training
fidelity. Cross-provider peer review remains pending.

## Frozen source packet

Base `8cb653600953e463497364a179ead8ec22e95240` plus reviewed working-tree
changes. `output/flight/osm-landmark-labels-review-packet.json` lists 24 exact
source/specification/package/test/license files. SHA-256 of sorted
`path + NUL + file SHA-256 + newline`:
`a76738ab13a1aad52b84380bfe97dfa0d4c081d17d3914b86361cb1bbe38d78a`.
