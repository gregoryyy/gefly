# Global cartography and plan-editor validation

Reviewed 2026-11-05 14:10 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO2.0.141/142;
bounded R-WORLD-11, R-AIRPORT-1 and R-NAV-5. **Pass for the delivered display
and editor increment within the observed/source-reviewed scope.** Peer pending.

Read the [both-views/detail/card request](../input/2026-11-05-global-map-detail-plan-ux.md),
current criteria and integrated source. Independently inspected style, consumers,
scene ordering, editor/store routing, browser JSON and all five map clips,
the app screenshot and provider-texture composite. No reviewer browser run,
new tests or production edits were made; only this report was written.

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| R-WORLD-11: useful overview/street cartography | Shared style has 49 geometry/symbol layers, classified roads, paths/rail, land use, water and buildings. Viewed USA overview at actual zoom **1.8486**, UK3, New York14 and London14 show source context and readable names/detail. JSON records actual centers, rendered layers and source names, including street/water names. USA is not reported as exact zoom2. | pass at representative views |
| Labels in both views | `createWorldMapStyle()` now includes shared labels for both the practice map and world terrain rasterizer, superseding the earlier label-free restriction. The six-tile provider composite visibly includes USA2/UK3 and New York14/London14 labels/detail, plus New York/Tokyo11. These are actual renderer-component outputs reused from an earlier same-source run, not new full-globe flights. | pass for source wiring and observed texture outputs |
| Bounded source names/presentation | Source-only name fallbacks, 1–80-character limits, road refs up to20, rank/zoom filters, normal collisions and halos use local sans-serif. The source packet records seven pinned real MVT profiles with applicable feature classes. It records MapLibre validation of49 layers with zero errors; existing two style units/typecheck pass. Actual views have no glyph/sprite URL. | pass for inspected source/output; exhaustive names/font/clutter coverage not evaluated |
| Consistent global default; retain Photo/BKG reuse | 2D BKG raster remains defined but invisible; the scene no longer creates its opaque regional map overlay by default. Actual app reports basemap=`none`, no active regional map layer, and the Germany-edge9 view shows one detailed style across the old boundary. Source retains regional factories/server and photographs above OSM in Photo mode; existing focused mode/preference assertions pass. | pass for source/observed default; real regional photo availability not evaluated |
| R-NAV-5: remove always-on card | Production no longer constructs/appends the plan card, regardless of store contents. All five actual map observations have card count0. Plan store/route painting and existing fixes remain in source. | pass for unconditional removal; populated-plan runtime not evaluated |
| Explicit editor and effective close | Top-bar/P and accessible map-header Edit route to the existing editor. Final manual empty-editor observation records opened=true, closed=true, cards=0; closing changes visibility/picking state rather than clearing the plan. No named-plan library or automatic replacement card is introduced. | pass for source and empty-editor observation; all access paths/populated editing not rerun |
| Preserve flight/independent data | Fresh focused app checks preserve paused step/digest/full native pose through map/mode/editor interaction; renderer errors=[] and sampled rendered/native height error is0.00099848m. No physical terrain, plan-model, radio/NAV or dynamics change is part of these display edits. | pass for bounded invariance; no new physics/fidelity acceptance |

## Frozen identities and evidence lineage

The integrated packet (`output/flight/world-map-task138-142-integrated-packet.json`, ignored local evidence)
SHA256 is `23ac83b33297f6c49115090e6ec262dfde29b5ccdbb497686d71c4ecdd7e6ae0`,
over base `700dd5386125f9864a391f85b277cb71da55290a`. All **47** current pins
independently match. Style source is `063d434776655dc534bf8b1535f03d2326116ec7d186a9c59835bb68ed9bb62f`;
practice map is `e545cd2f7d6f8f4e76fd35c1b1ebaf00f556b1ac65fb608b0034cb9eabe75032`.
The style child packet (`output/flight/world-cartography-task141-style-packet.json`, ignored local evidence)
hash `bdffccbfc8dd9ce17bec41c5c29cacbdf43085f26c45d64cf156711d6a2922a7`
and scene/evidence freeze (`output/flight/world-detail-task141-freeze.json`, ignored local evidence)
hash `51b4a955efd827dd0a5a5bdd1a06879c3e8eac52a1bc52d71a32e96a077adeb9`
also match, including their3 and23 respective file pins.

Final run **56505 exits0**, Chrome156.0.8078.80. Its JSON contains **one fresh
focused app group** plus manual camera/editor observations. `sourceRenderingProvenance`
explicitly reuses unchanged candidate texture observations from **81580**, whose
earlier existing focused run passed two groups. The earlier incorrect Follow/
camera assumptions and top-bar interception remain preserved as fixture history;
their manual views are not accepted as UK coverage. Final corrected centers and
images are used here. No claim of newly authored test cases is made.

Full units record **523 Node +22 Python**, zero failures/skips; final production
build passes. Five legacy browser expectations were adapted and syntax checked;
their complete matrices were not rerun. Only the empty editor was exercised;
populated route/fix preservation is source-reviewed. Narrow/mobile interaction,
exhaustive geographic detail, all fonts and operational navigation remain not
evaluated. World elevation remains the separate one-degree fallback outside
accepted regional data; detailed graphics do not add terrain measurements or
building collision fidelity. Native build provenance remains unverified.

Historical138–140 packet `9f70cc7ae2a52161ea6fd6e17de73834c7de64e9053d6deedf0bf03771976c34`
and all19 immutable pins were independently rechecked; earlier reports remain
historical. No unresolved blocking finding remains for141/142. Aircraft/training
and release acceptance, shared status and final gates remain separate.
