# Detailed global maps and removable plan UI: quality review

Reviewed 2026-11-05 14:05 Europe/Berlin by Codex quality, independently of the
Codex implementation authors. TODO2.0.141/142; R-WORLD-11, R-AIRPORT-1 and
R-NAV-5. Scoped working-tree snapshot based on
`700dd5386125f9864a391f85b277cb71da55290a`.

**Complete bounded review: no blocking findings.** Only this assigned report is
written. This is implementation quality review, separate from criterion-by-criterion
validation. Cross-provider peer remains pending; no exact provider CLI/model
identity is inferred. The [user input](../input/2026-11-05-global-map-detail-plan-ux.md)
explicitly requests details/names in both views and removal of the persistent plan
card. Earlier palette/2D-only label reviews remain historical snapshots.

## Source review

`world-map-style.ts:15–145` supplies one original 49-layer geometry/label style to
both the 2D map and the offscreen renderer used for Cesium texture tiles. It adds
source-backed country/state/city context and closer places, streets, road refs and
water names, alongside classed road casings, railways/paths, land use, parks,
water and buildings. Geometry, zoom, rank sorting, collisions and halos are
presentation choices; they do not create measured geographic detail. Names are
inert canvas strings bounded to 1–80 characters, refs to 1–20. No source text
becomes HTML, URLs or executable code.

No external style/glyph/sprite/font service or dependency is introduced. Reviewer
checked installed MapLibre `src/render/glyph_manager.ts:240`: without a glyph URL,
text rasterizes locally through TinySDF. System font availability still controls
glyph coverage/appearance. Existing fixed-route resource checks, tile zoom bounds,
queue/subscriber limits, disposal and 32 MiB copied-canvas cache remain in
`map-terrain-imagery.ts`; this is not a total GPU/process-memory bound. Added
labels increase rendering work; no comparative performance benchmark was run.

`practice-map.ts:926–931` places global geometry and names below route/point
presentation. The retained BKG raster is explicitly hidden; Map/Aerial toggles
only the regional photograph visibility. `scene.ts:183–199,287–296` uses the same
global cartography without the regional map renderer. All photograph arrival
paths reorder photographs above it, then reapply the selected mode, preventing a
late photograph from overriding vector mode. Photo mode retains global OSM beneath
available photography. Physical terrain samplers, native controls/model, source
inventories and saved display preferences are not changed by this slice.

The map-card instantiation/update/disposal paths are removed. The separate editor,
plan store, route rendering, custom fixes and GPS selection remain. The editor
starts hidden, opens through existing top-bar/P/header access, and its close
handler calls `setPlanVisible(false, true)`, including the host visibility
notification. Closing cancels picking without clearing the plan; map close/reopen
does not recreate the store. Existing editor input isolation, Review-context
updates and disposal remain. The unused card builder is retained without a call.

## Checks and observations

Reviewer independently ran `cd app && node --test src/world-map-style.test.ts`:
**2 passed, zero skipped**. The existing tests cover resource structure and
instance isolation; the allowed-layer expectation was updated for symbols. No new
tests were written for this reversible presentation change. Reviewer also ran the
installed `validateStyleMin(createWorldMapStyle())`: **49 layers, zero errors**.
All 10 source/tile hashes in the style packet and all 23 source/evidence hashes in
the integration-slice freeze packet were independently checked against bytes.

Author's ignored observational copy of the existing focused browser fixture ran
in headless Chrome 156.0.8078.80. Final app run56505 completed **exit 0**, with
paused native step/digest/full-state invariance, actual global layer/credit
inspection, no active regional BKG map, zero plan cards and an empty current
editor that opens and closes. It records USA overview at actual zoom1.8486,
UK overview3, New York/London streets14 and the old Germany boundary9. The USA
camera differs from requested zoom2 because the preceding wheel animation was
still settling; this is a representative captured overview, not exact camera
setup acceptance. The initial diagnostic hit the optional top bar over Follow;
the failed artifact is preserved and not counted as a pass.

The final app artifact explicitly reuses texture-provider observations from the
same-source successful run81580: six real source tiles for New York/Tokyo11,
USA2, UK3 and New York/London14, with no failed tiles and disposed renderer. That
is renderer-component evidence, paired with actual-app ground/native agreement;
it is not six newly observed whole-app 3D maneuvers. Reviewer inspected the
six-tile texture composite, actual New York street map and UK overview screenshots:
road/place/water labels and detailed geometry are readable at those samples.
An earlier successful run's incorrect Follow/camera assumption is explicitly
preserved as fixture history, not accepted UK map coverage; final app observations
supply the corrected cameras.

Existing world/map-terrain/fallback/waypoint/airport fixture adaptations were read
for the new source, mode, labels and removed card semantics. Author reports syntax
checks for all five and TypeScript passed. Their full legacy browser matrices were
**not rerun** for this freeze; no such pass is inferred. Only an empty editor was
opened in the final manual run. Populated-plan/card absence and preservation are
supported by unconditional source paths, not a separate populated-plan runtime
observation. No reviewer browser, new permanent visual cases or broad matrix ran.

## Limits and frozen identity

Representative captures do not establish worldwide name completeness, every zoom,
font/browser/device coverage, tile-edge symbol continuity, photo seam quality or
performance under sustained camera travel. Optional floating landmarks remain a
separate feature. These maps are not authoritative navigation charts, expanded
airport/NAV inventory or new physical elevation measurements. No aircraft/training
fidelity, CI/publication or native-build provenance acceptance follows. The existing
actual native binary identity remains distinct from its unresolved older build
record; this slice does not modify/rebuild it.

The two packets below identify this source/evidence freeze; nested pins were
checked independently. Later file changes require renewed affected review.

| Path | SHA-256 |
| --- | --- |
| `app/src/world-map-style.ts` | `063d434776655dc534bf8b1535f03d2326116ec7d186a9c59835bb68ed9bb62f` |
| `app/src/practice-map.ts` | `e545cd2f7d6f8f4e76fd35c1b1ebaf00f556b1ac65fb608b0034cb9eabe75032` |
| `app/src/scene.ts` | `b818e656d56de82edb39f6c7c935dee5a281a85fdf0a87c39e47bb9f0b520d64` |
| `app/src/map-terrain-imagery.ts` | `d68b1f6b2fa8be74d4b8e787d7f0dcb79d019fe84a393bf74b2e6a85ad5e4487` |
| `output/flight/world-cartography-task141-style-packet.json` | `bdffccbfc8dd9ce17bec41c5c29cacbdf43085f26c45d64cf156711d6a2922a7` |
| `output/flight/world-detail-task141-freeze.json` | `51b4a955efd827dd0a5a5bdd1a06879c3e8eac52a1bc52d71a32e96a077adeb9` |
