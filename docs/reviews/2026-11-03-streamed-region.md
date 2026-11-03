# Streamed region and airport map review

Independent Codex reviewer `region_sources`; started 2026-11-03 06:02 CET,
Europe/Berlin. Runtime/assets/ingestion implementation by the orchestrator and
other subagents; this reviewer did not implement them. The reviewer's earlier
research/input prose is excluded from self-acceptance. This is a scoped working-
tree review; reviewed runtime hashes and repaired checks are recorded below. Final shared documentation and CI are owned by the orchestrator.

## Current outcome

Quality: **no blocking runtime findings after repairs**, subject to the final
shared source/network disclosures and map attribution noted below. Validation:
**pass for the exercised bounded runtime criteria**; source, loader, native
consistency, named-region meshes, airport controls, recorded Review and failure
UI were independently exercised. Live upstream photography was checked as
transport/decoded pixels, not exhaustive coverage or positional fidelity. No aircraft, surveyed
runway, current navigation or complete EDDF/100 NM acceptance is claimed.

## Findings and repair status

1. **Medium, shared terrain seams:** compiling each geographic tile with a
   separate GDAL warp produces different values at identical boundary nodes.
   Independently checked all 42 shipped tile edges: maximum mismatch
   **0.13519287109375 m**. Reprojecting the same entire 897×769 destination lattice
   in one operation differs from individual tiles by up to **14.366928006106207 m**.
   This is a source-transform consistency issue, separate from native-versus-JS
   agreement. A shared single raster followed by overlapping node slices, or
   exact coordinate-based source sampling, is needed to make common nodes equal.
   **Resolved:** owner changed to one exact PROJ source-center bilinear lattice
   and slices shared nodes. All shared-edge H/ζ values are now bit-identical;
   126 independent source-pixel holdouts agree within 0.0000243561 m. The
   final method intentionally avoids approximate GDAL warps; the earlier full-
   warp comparison is retained only as the failure diagnosis.
2. **Medium, live photo route:** initial `scene.ts` requested `.jpg`, whereas
   middleware accepts only `.png`. Every Cesium photo request would fail. The
   owner changed the route to PNG/minimum level 7; **resolved**, independently
   rerun regional browser test requested both map and imagery fixtures.
3. **Medium, attribution completeness:** initial credits omitted some mandatory
   linked provider/license/year/data-source notices, and the TopPlusOpen source
   URL was obsolete. Canonical current official source strings supplied to the
   owner; **resolved for 3D credits**, verified linked provider/license/year and
   current TopPlusOpen source URL. Map credit needs its LGL provider link or
   www.lgl-bw.de text retained in the final integration; owner notified.
4. **Low, airport ingestion provenance:** the compiler labels one fixed source
   commit but initially accepted arbitrary CSV bytes. The current actual CSV
   matches the manifest's source hash and all output records, but regeneration
   should reject a changed hash before assigning that commit URL. **Resolved:**
   compiler now checks the expected source hash before processing/writing.
5. Partial upstream imagery can return HTTP 200 with an `X-Scenery-Partial`
   header; the image provider cannot inspect it. Keep a visible photography/map-
   fallback/unknown-date limitation rather than claim complete photographic
   coverage. **Resolved:** final inspected generic label says photography / map
   fallback and capture dates unknown; no completeness claim is made.

## Independently executed evidence

| Check | Actual result |
| --- | --- |
| `node --test app/src/streamed-terrain-provider.test.ts app/src/airport-catalogue.test.ts app/scenery-server.test.ts studies/e1-browser/sim/terrain-stream.test.mjs` | **16/16 pass**: fixed URLs, bounds, PNG dimensions/type/size, cache eviction, concurrency, transparent composition, missing upstreams, catalogue hash, atlas/renderer samples, missing cache rectangle, manifest/byte/hash/redirect/timeout/cancel rejection, fine/coarse feather slopes. |
| `node studies/e1-browser/sim/terrain-region-native.mjs` | **Pass**: actual WASM and shipped assets, native cache ≤9, state/digest/step unchanged during movement/loading, 132 boundary positions ×4 band distances, native/JS height and slope mismatch exactly 0; change across ±1e-9 rad at original fine boundary ≤0.002946 m. This test did not detect the separate coarse tile seam finding above. |
| `node studies/e1-browser/sim/terrain-stream-worker.mjs` | **Pass**: held fetch with pause/stop preserves state/digest/step without auto-resume; missing/corrupt tiles fail closed without advancing physics. |
| Independent source-byte and node inspection | DGM ZIP/TIFF and GCG source hashes match manifest. Actual TIFF EPSG:25832, 3211×4331, 200 m pixel spacing, area origin (279900,6101900), `-9999` NoData. All 698,922 regional node pairs finite. Independently selected source-coordinate GCG rows at 126 nodes agree with stored anomalies within 1.89209e-6 m. Initial coarse terrain edge comparison **failed**, then passed after repair; independent exact source-pixel 126-node holdouts are within 0.0000243561 m and all shared edges differ by exactly 0 m. |
| Independent complete airport source comparison | **Pass**: pinned CSV SHA-256 `6852f06007ec1154256faff98edb8bbfbbce93fdb279525940864f07e9d90b32`; all 103 output names/coordinates/elevations agree with independently filtered source rows. |
| `node app/tests/airport-map.browser.mjs` | **Pass**, actual Chrome, exit 0: 103 markers, EDFE search/detail/elevation, null elevation, empty search, pan disables Follow, 390 px layout. Initial sandbox-localhost listen failed EPERM; network-enabled local run succeeded. This test does not establish upstream photo pixels or flight dynamics. |
| `npm --prefix app run check` | **Pass**, TypeScript check. |
| `node app/tests/streamed-region.browser.mjs` after regeneration | **Pass**, actual Chrome and real WASM/DEM, exit 0: nine initial tiles, Darmstadt/Odenwald/Spessart initial state and actual GPU meshes, finest provider samples, bounded caches, map/search/keyboard/Review physics invariance, missing/corrupt initial tile failure before ready. Only photography/map pixels are synthetic fixtures; output labels say so. |
| Independent real public WMS through `sceneryMiddleware` | **Pass**, actual 200 PNG responses: Darmstadt XYZ12/2146/1391 (829,816 bytes), Bavarian Spessart 12/2156/1391 (605,288 bytes), BW Odenwald 12/2151/1397 (642,014 bytes), each 512² RGBA/varied pixels and correct source headers. TopPlusOpen map12/2150/1390: 15,643-byte 256² RGBA. Partial=false for these responses. No exhaustive seam/coverage/flight-date acceptance inferred. |

## Security and numerical review

Inspected constant upstream origins/layers, strict XYZ/extension/region parsing,
no request-controlled URL or filesystem path, 2 MiB upstream/compose output
bounds, 32 MiB memory cache, four upstream requests/two compositors/eight jobs,
128 pending keys and 15 s timeouts. Compositor receives bounded stdin, checks
PNG dimensions and decodes to RGBA; catalogue strings enter textContent rather
than untrusted HTML. No critical SSRF/path/injection finding in inspected scope.
This is a localhost developer proxy; public deployment/abuse protection remains
outside scope. Runtime network behavior needs explicit SEC/product documentation.

Terrain downloads are local, timeout/cancel/byte/hash checked before install;
worker physics halts before cache mutation. Physical heights remain DHHN2016;
quasigeoid offsets are added outside native dynamics. Fine/coarse smoothstep
includes derivative terms and the inspected native/JS rules agree. Renderer
retains visited tiles for Review (at most the fixed 42-tile manifest); native
cache is a 3×3 neighborhood. Source 200 m sampling and display subdivision do
not establish finer measurement resolution or accepted landing fidelity.

## Scoped validation matrix

| Requirement / criterion | Status and limits |
| --- | --- |
| R-WORLD-2 / R-DATA-1: applicable physical datum, geoid sign, source bytes, finite data | **Pass** for inspected repaired assets, independent source-pixel/GCG/native checks and exact shared edges. |
| R-WORLD-2: shared physical/rendered region surface and ≤0.25 m finest loaded GPU budget | **Pass** at the three named aircraft locations: actual GPU residuals 0.12843 m / 0.00036 m / 0.03014 m; finest provider sample residuals 0.004741 m / <1e-9 m / <1e-9 m. This is an implementation budget, not DEM accuracy or all-view proof. |
| R-WORLD-2: deterministic halt/missing/corrupt/cancel handling | **Pass** for exercised loader/worker cases and integrated missing/corrupt browser failure UI. |
| R-WORLD-1 / R-REGION-1: named-region terrain and map airport increment | **Pass for bounded increment**: all airport source records, actual map interaction and three region initial states/meshes pass. Complete 100 NM target not evaluated. |
| R-WORLD-4: on-demand live cross-state images, source attribution and degraded fallback | **Pass for transport/resource/fallback-label increment**, actual proxy source-pixel responses and browser fixture path loading. Exhaustive upstream coverage/seams, point-specific acquisition dates, positional accuracy and all camera views **not evaluated**. |
| R-REVIEW-1: visited regional Review without physics mutation | **Pass** for selected recorded state/keyboard-map/camera interaction preserving paused native step/digest/state in the integrated browser. Long flights retaining all 42 tiles and distant Review traversal are not independently exercised. |
| Aircraft physics, airport/runway surveys, current charts/procedures, full region, training approval | **Not evaluated**, outside this increment. |

## Reviewed runtime snapshot

Hashes captured 2026-11-03 06:08 CET. The regional manifest binds all 42 tile
byte hashes. Unchanged original terrain/source notices retain their earlier
review; this is not an acceptance of the reviewer-authored research records.

| Artifact | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/terrain-stream.js` | `5a08344350340a68d84e3862862b2e972dde30c0671065918e8f4a7cd462636f` |
| `studies/e1-browser/sim/worker.js` | `f8e7f48b8cc062650ae9fbe7219e42c75669d686268b148f1ab914d35a284a73` |
| `studies/e1-browser/sim/terrain-grid.h` | `54e05fe5639780cc85872bdc57d52b266cceb3898bae730ac73291368a185bbe` |
| `studies/e1-browser/sim/bridge.cpp` | `3ea31c5fff3a760a1ec78bc0243c3369e6acc848334784f83e8c1b8c39052af5` |
| `app/src/streamed-terrain-provider.ts` | `b886eccd11095de8e98245253a52a15e0e49ef990f9af9def0c329a00ad9c711` |
| `app/src/scene.ts` | `af73f7a8729dce98d53eb5252b0502a472da532a8e171e59dc018dd5005454d2` |
| `app/src/session.ts` | `a9c796a1b98540aa6bd40f82baa1621b75c9358b722be5f88eaa50a67362d485` |
| `app/src/main.ts` | `2049f3838766cb78633f6267ebc38b0bc9c1033dce73dbda534661363a3733dc` |
| `app/scenery-server.ts` | `00d57e06916935ec3efc564da9a8c4631795ebec3cdf117d1187f94e69a6f522` |
| `utils/scenery/compose.py` | `627d8c726f91e2ca79171663e5f6c59f88e93b85e058468c577433eb36be92a9` |
| `app/src/airport-catalogue.ts` | `d5e128539d15046ac6faa58e8d3477c0edc5c28238a88dde334e3584fd17d5c7` |
| `app/src/practice-map.ts` | `f28f3220469d92976ed31e33e9046ec6df8762f4b324f3787c341215a5ee0949` |
| `utils/airports/build.py` | `1692ae3167e867ee0a6b8d507e4fdc919badaaa257dae627b7461f6e797a1a3d` |
| `utils/terrain/build_regional_terrain.py` | `7c48bc431e63149cd5308e7b8d10d0ff4a3f413d97dcbcbd21920f281e551e1e` |
| `app/public/terrain/region/manifest.json` | `dde79aab6efcb4911fa8d7071ca50e57c4b5526e8092ff9bce6144b41f2d126c` |
| `app/public/airports/manifest.json` | `6d9a11a0ca93d273e19c608af0f532713d62be249350d458fb81be7815604b95` |
| `app/public/airports/regional.json` | `2c12970b49a71709445254d9f46ee9f7ef0c640c92c8c3fb31c564fc4e035e35` |
| `app/tests/streamed-region.browser.mjs` | `8e67b50215e56d64d691fd2325af7ffe3d84a2d3ad0bb7b58ae2e81b8235a2ca` |

## Final integration renewal, 2026-11-03

Independent reviewer `increment_quality` renewed affected integration coverage
for R-WORLD-5 alongside [flight assists and overlays](2026-11-03-flight-assists.md).
It did not author the implementation, source research or maintained tests.
Quality and scoped validation **pass** at the 116-path runtime/test packet
`55fcea2cd15cd82963e9196e11883342dd7f552876ffadd01c7017e283fbe042`.
The exact packet scope and current integration hashes are in that linked review;
the earlier per-file hashes above remain historical, not current worker/session/
main hashes.

The reviewer independently re-hashed the terrain loader, native atlas/bridge,
renderer provider/scene, proxy/compositor, airport catalogue/compiler, terrain
compiler, regional manifest and airport packages. They still match the earlier
reviewed bytes. Thus the earlier independent source-pixel, exact shared-edge,
named-location GPU and actual WMS pixel evidence remains applicable to those
unchanged artifacts; it was not presented as a new source/photography execution.
The changed worker/session/main, map keyboard integration and overlay modules
were source-reviewed and exercised through current tests.

Independently reran **65 unit tests**, including all 42 regional hashes, compiler
identity, finite nodes and exact shared edges; all pass with zero skips. Actual
WASM regional sampling again passes at two regional positions and 132 boundary
points with native/JS height/slope differences exactly zero and native cache ≤9.
The worker held-fetch pause/stop and missing/corrupt cases pass without advancing
physics. Actual Chrome airport map and overlay integration tests pass, including
all 103 markers, filtering/select/elevation/unknown states, narrow view, guarded
map keyboard input and frozen Review. Map/photo pixels in those browser tests
are explicitly fixtures. The additional A/rate worker and browser cases pass as
recorded in the linked review.

The map now includes the linked `https://www.lgl-bw.de` provider credit, resolving
the old map attribution condition. Current SEC/ARCH/SBOM/notices describe the
fixed live-WMS external flow, source-specific rights, capture-date limitations,
Pillow runtime dependency, cache/resource bounds and development-only hosting.
Live photographs remain unversioned and may differ during Review; aircraft
state and physical terrain remain separately pinned. No full EDDF/100 NM,
current airport/runway/chart, actual browser latency, exhaustive imagery or
training-fidelity acceptance is added. The separate reported touchpad
overshoot/jump issue is **not resolved** by this delivery. Cross-provider peer
remains pending.
