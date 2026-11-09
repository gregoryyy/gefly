# Five-state and fixed-panel specification validation

Reviewed 2026-11-04 23:44 Europe/Berlin by the independent Codex `validate`
subagent. The reviewer did not author the implementation or its browser test.
This is local specification validation, separate from quality and cross-provider
peer review. Peer remains pending.

Current disposition: the fixed-panel correction and bounded five-state increment
pass local specification validation. The final integrated section below supersedes
earlier pending terrain observations; historical failures remain evidence of the
repaired GPU defect. Full milestone/aircraft fidelity and peer acceptance are separate.

## Scope and artifact identity

Panel scope: TODO 2.0.121 and the fixed-placement/manual-interaction slice of
R-PANEL-1, following the [user correction](../input/2026-11-04-panel-fixed-fit.md).
Review against working-tree HEAD `700dd5386125f9864a391f85b277cb71da55290a`;
the working tree is not a committed revision. Reviewed SHA-256 inputs:

| Input | SHA-256 |
| --- | --- |
| `app/src/cockpit-layout.ts` | `8e6fb35f227fd9d88119da7929d6d2c98116829bfb5c65ab9f31ccc4ceb86fe4` |
| `app/src/style.css` | `70033cdbd7d865cce95ff018f659b3687735bef2d98cd7acafab00d79f1300f6` |
| `app/tests/panel-layout.browser.mjs` | `5989f737c73743677698c35af41f6a98f4c1166d3344047dcd8d25289497f5e4` |
| `docs/SPEC.md` | `32542be9abdd24c73ef6e1cd33b3164d1187c7cc0a3f6eb06af1b98f8183ed74` |

Changed versions require renewed affected validation. This report does not accept
all historical R-PANEL-1 aircraft indications or any training-fidelity claim.

## Evidence and independent checks

The housekeeping runner executed `node tests/panel-layout.browser.mjs` from
`app/` with the working Python 3.11.12 interpreter first on PATH and observed
exit 0. The validator inspected the actual test, its emitted geometry records
and screenshots; it did not repeat that complete browser execution or claim to
have done so. The run uses actual application/browser geometry and a real local
engine; scenery pixels are fixtures, not photography-quality evidence.

The validator independently recomputed center, top, width, bottom and window
bounds from all 13 entries in `output/flight/panel-layout.json`. Every panel top
matches its frame top, every deck bottom matches window bottom, and maximum
horizontal center error is 0.0078125 px. The three complete gesture before/after
records have exactly equal surface, fitted scale, deck and scene geometry.

The validator inspected `panel-fixed-1440x800.png` and
`panel-fixed-390x844.png`: both show the entire fitted panel centered in the
bottom area, with both gauge rows and lower controls. The narrow view exposes
Engine, Radio/NAV and Aircraft systems openers. It independently ran
`node --test src/field-of-view.test.ts` from `app/`: four tests pass, zero skipped.

Evidence SHA-256:

| Artifact under `output/flight/` | SHA-256 |
| --- | --- |
| `panel-layout.json` | `174c70fee4ad3cf4138f5a204363ecb9ae68f968f58fdb0b68bd194d6e5f8d0d` |
| `panel-fixed-gestures.json` | `c9dd26a86514dc22d1afe78a1fcb57fb772f41d955e8ec34e501dcdcdb7b0c5e` |
| `panel-fixed-1440x800.png` | `e948bb61f9b6344d2d76426416cdbacf72738875be48cacc10f1d2a2cab524a4` |
| `panel-fixed-1440x480.png` | `c7bd35d67921bd65f8902d501356142a99d3b34fa7c5a109dc1d1cf9c4acc1ca` |
| `panel-fixed-390x844.png` | `a1a9995b4075205b5f1ca3e99e5964b801c95672900fda782380f81e775a1f04` |

These are disposable local artifacts; hashes identify the reviewed evidence and
do not establish a published/hosted test run.

## Panel criterion matrix

| Criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| Fixed placement | Panel bottom anchored, horizontally centered and fitted inside its frame | Independently checked all 13 emitted viewport geometries from 390×844 through 1440×900, including 1440×400; inspected desktop/mobile screenshots | pass |
| Disable manual zoom and panning | Wheel, background/header dragging and double-click leave fit and placement unchanged | Implementation has no manual zoom/pan state or listeners. Browser test performs vertical/horizontal wheel over lower buttons, VSI, trim and AP, housing drags and housing/face double-clicks. Three final records retain exact geometry | pass |
| Pointer/focus stability | Entering or operating controls must not move the panel | Browser test checks pointer entry, lower-control real hit-testing and actual clicks after gestures; fitting has no focus/pointer handlers | pass |
| Both rows and lower controls | Primary instrument rows and lower inline controls remain in bounds/reachable | All responsive cases check gauge/control bounds; 1440×800, 1440×480 and 390×844 cases use `elementFromPoint`, then click actual lower controls. Narrow Radio/NAV opener opens its dialog | pass |
| Responsive fit and portals | Resize retains fit; engine/radio dialogs remain usable on narrow views | Existing 13-case checks retain shared scale/column alignment, width containment, engine/radio dialog open/close and 900↔901 px portal restoration; fresh-mobile load checked | pass |
| Review | Fitted placement and transport remain usable in recorded Review | Browser checks fitted placement at 1440×900, 760×844 and 390×844, transport above deck and readouts clear of header/transport | pass |
| Independent camera/map behavior | Panel removal preserves independent scene/map zoom behavior | Panel diff removes only panel listeners/state/cursors; scene/map handlers are untouched. Four independently executed FOV unit tests pass; browser map-docking checks preserve scene height. Full map-zoom regression is not re-executed by this validator | pass, bounded to unchanged handlers and available checks |
| Aeronautical fidelity and universal legibility | No unsupported aircraft/training claim | No coefficient, control boundary or aircraft indication change in this panel slice. Short windows necessarily shrink controls; no minimum physical touch-target or universal readability acceptance is inferred | not evaluated |

Additional integrated regression evidence was subsequently inspected:
`output/flight/fixed-panel-fov-browser.log` reports the real camera/AP, map/dialog,
yoke, Review and reload cases passing; `output/flight/five-state-map-regression.log`
reports the complete right-map interaction suite passing. These were executed by
the integration owner, not by this validator. They support the unchanged independent
camera/map behavior in the panel matrix.

Recommendation: accept the bounded TODO 2.0.121 panel correction at the hashes
above. No blocking panel criterion failure found. The remaining whole-project,
publication and cross-provider gates stay separate.

## Five-state terrain/maps status

TODO 2.0.120 / R-WORLD-10 remains **not evaluated for acceptance** at this report's
initial panel review. The terrain worker is repairing the rendered border-tile
behavior and has not supplied a stable final artifact and complete fresh browser
height evidence. Manifest/design inspection alone cannot satisfy representative
native/rendered-height, shared-edge or pause-intent criteria. The five-state
container and declared source limits were inspected, but no full terrain result
is inferred from those records. Add a new bounded validation section only after
receiving the integrated freeze and current run evidence.

### Independent terrain checks completed before final browser acceptance

The validator ran `node --test src/masked-terrain-mesh.test.ts
src/streamed-terrain-assets.test.ts src/scenery-coverage.test.ts` from `app/`:
12 tests pass, zero skipped. This independently checks all 475 tile hashes and
paired-NaN/finite-node counts, more than 800 exact shared source edges, masked
triangle holes, quantized affine/negative-height bounds and eight scenery-prefetch
coverage/resource cases. It does not establish the complete integrated browser
criterion.

The fresh `node studies/e1-browser/sim/terrain-region-native.mjs` artifact
`output/flight/five-state-terrain-native.json` was produced by the terrain worker
with exit 0 and inspected by the validator. It records 11 geographic points,
maximum nine resident tiles, 132 fine/coarse edge samples, maximum boundary
change 0.002945630872829952 m, native/JavaScript height mismatch 0 m and slope
mismatch 0. Its SHA-256 is
`3c0707d334b23adb93c125e1ab12a4314db8e631e26a575b306c63bb3661466c`.
This is consistency evidence between implementations of the same pinned source,
not independent terrain-survey accuracy.

`output/flight/masked-terrain-mesh-browser.json`, SHA-256
`0220cd4613036cb7f93ee9aa50a712674d69da89a55da3756ec2cd742ada50ea`,
records actual Cesium worker meshes for partial, empty, negative and affine cases,
finite encodings, no indices referencing missing input nodes, no skirts and no
worker/page errors. Missing upper triangles remain unavailable before and after
meshing. This supports the source-gap boundary; it cannot substitute for a failed
representative rendered-state case.

The numerical root-edge exception in the final browser fixture is bounded:
classify an exact root edge within 1e-12 rad, permit only adjacent ±1e-10 rad
(less than 0.7 mm on Earth) actual rendered rays if the exact ray is unavailable,
record that miss and each offset, require both supported-side heights within the
existing 0.25 m vertical comparison budget, and retain the exact-center
provider/native comparison. Runtime geometry is unchanged and real masked holes
remain unavailable. This can establish representative height agreement with an
explicit display-picking seam limitation; it does not establish exact continuity
of Cesium picking at every root edge.

### Five-state criterion matrix before the final browser rerun

| R-WORLD-10 criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| Declared region and source-marked coverage | Five named states enclosed by 6–14°E / 47–51.75°N; unsupported margins remain explicit | SPEC/design and fixed manifest agree; index has 608 slots, 382 full/93 partial assets and 133 unavailable slots. Independent asset checks confirm metadata, bytes and paired-NaN masks | pass for declared package scope; no claim every border point is supported |
| Baseline, datum and fine local patch | DGM200 200 m physical source with DHHN2016/GCG conversion; fine patch preserved; subdivision not new measurement | Manifest source ZIP/TIFF/geoid/compiler identities and source notices inspected; unchanged fine package remains loaded first/interpolated through existing feather; fresh native 132-edge consistency artifact inspected | pass for provenance/configuration and cross-runtime consistency |
| Shared source edges | Adjacent source nodes agree exactly | Validator-executed asset test compares both height and geoid on more than 800 available adjacent edges, including NaNs | pass |
| Native residency and fixed integration | Maximum nine current native tiles; terrain moves do not advance native state or change fixed step | Native fixture asserts max nine, initializes at 1/120 s, compares state/digest/step before and after stream movement and then steps successfully at all 11 points | pass |
| Bounded retained renderer data | Retain only regionally identified terrain assets for current/recorded views | Source validation confines tile identities to fixed 608 slots; immutable available manifest limits current source to 475 assets; provider selects a resident rectangle around focus. Browser fixture checks cached count ≤475 at tested sites | pass for bounded fixed-manifest design; final full-view run pending |
| Missing source and invalid assets | Source gaps do not become zero/last-known ground; corrupt/missing assets fail closed | Independent masked/asset tests, actual worker no-hole-fill evidence and native uncovered initialization rejection inspected; stream validates lengths/digests and skips only declared-unavailable neighbors. Fresh full-browser startup failure cases still pending | pass for unit/native boundaries; integrated startup cases not evaluated until final artifact |
| Representative rendered/native heights across five states | Actual rendered mesh and exact-point provider/native heights agree within the fixture's 0.25 m comparison budget, with explicitly bounded picking-seam exception | Current complete artifact is still pending. Eight successful city observations do not cover all five states; Saarbrücken has not completed in the current integrated run | not evaluated for final acceptance |
| Pause and Review intent | Terrain loading does not alter integration step; explicit pause/stop cancels automatic resume and recorded viewing does not mutate native state | Worker pause/stop handlers still clear `resumeAfterTerrain`; unchanged request sequence halts before asynchronous move. Native move invariance passes. Final browser pause/map/Review assertions have not yet completed | source preservation inspected; final integrated criterion not evaluated |
| Fixed official map/photo sources, bounds and failures | Five state services and public map coverage, bounded requests/composition with transparent gaps and source-specific notices | Fixed server source/footprint table and tests inspected; independently executed eight prefetch/coverage cases pass. Integration owner's 22 scenery tests and five-state real-image probe records support service availability at sampled cities. New RP/SL metadata and credits are recorded in SBOM/notices | pass for bounded configured sources and sampled availability, not complete imagery coverage |
| Honest applicability | No new 1 m, surveyed runway/obstacle, current chart or training claim | Current design, app limitations, source notices and manifest distinguish 200 m source, resampling, mutable photography and unsupported border/source areas | pass |

Overall R-WORLD-10 acceptance remains pending the complete stable integrated
browser artifact. Passing package and native checks do not override that missing
rendered-state evidence.

### Renewed masked-mesh validation after the GPU upload repair

The earlier worker-only empty-mesh evidence did not cover GPU upload. The
full-scene reproduction in
`output/flight/masked-terrain-empty-gpu-reproduction.log` exposes a real failure:
Cesium rejects a zero-byte index buffer and stops rendering. That earlier empty
geometry result is historical and does not accept the repaired implementation.

The repaired source adds `[0, 0, 0]` only when no supported triangles exist.
This is a zero-area primitive, with no runtime terrain extension and no source
height added. The existing supported-node mask still makes height queries
unavailable. The validator inspected the updated implementation and actual GPU
regression, then independently ran
`node --test src/masked-terrain-mesh.test.ts` from `app/`: three tests pass,
zero skipped.

Current renewed hashes:

| Input or evidence | SHA-256 |
| --- | --- |
| `app/src/masked-terrain-mesh.ts` | `f392d5fefe9f36f7bc0bb28a8c0adaaf4516d383d18bec46e35e9efb248d703f` |
| `app/src/masked-terrain-mesh.test.ts` | `7286fe0cdb280360b7b62703fe4caf83a54ba9e1295adff372adbe81110ec9c5` |
| `app/tests/masked-terrain-mesh.browser.mjs` | `91bb5b3a8e4819f7ee4641a618140934dcfd66d64b545402fbbdd10b7f2e7a93` |
| `output/flight/masked-terrain-mesh-browser.json` | `5ded89e723bfa88408639b1ec5c6dbe7bc9c2302981dccf75c1074dc05c75184` |

The fresh artifact records `gpuUploaded: true`, three indices, no render errors,
no `globe.getHeight` value and no ray-pick ground for the all-missing tile. The
partial, negative and affine worker cases continue to preserve holes and finite
geometry; the all-missing case explicitly permits only the degenerate sentinel
to reference an unsupported placeholder vertex. It does not permit any
nonzero-area triangle to use missing source nodes. The affected empty-mesh/GPU
criterion passes at these hashes. Complete regional rendered-state acceptance
still awaits the final integrated representative-point result.

## Final integrated five-state validation — 2026-11-04 23:57 Europe/Berlin

This section supersedes the pending outcomes in the earlier five-state matrix.
The terrain implementation is frozen at the hashes below. The terrain worker
confirmed exit 0 for the default eleven-preset real-browser run, the renewed
four-case worker/full-scene GPU regression and the fresh native consistency run.
The validator inspected the final source, test assertions and all final geometry
records; it independently recomputed all eleven rendered/provider height errors
and the two-sided Saarbrücken exception. It did not claim to have executed those
browser/native commands itself.

The default run is `node tests/streamed-region.browser.mjs` from `app/`, with
`GEFLY_REGION_PRESETS` unset and the working Python interpreter first on PATH.
The preserved final artifact is
`output/flight/five-state-streamed-region-browser.json`, SHA-256
`84d55c39732a59c3e99666c8ce75a79c762af2ee5bdd470d5a0e903eb94c31f0`.
The matching log contains `result: pass` and all four check groups. Its source
pixels remain fixtures; this run does not establish photographic detail.

All eleven observations are present: Darmstadt, Odenwald, Spessart, Westerwald,
Marburg, Kassel, Stuttgart, Munich, Saarbrücken, Koblenz and the Bavarian Alps.
Maximum rendered/native difference is **0.2020124885544874 m**, at Stuttgart;
maximum exact-point provider/native difference is **0.004740085573160968 m**, at
Darmstadt. Every comparison is within the 0.25 m consistency budget. This budget
is numerical agreement between surfaces, not a statement of DEM survey accuracy.

Saarbrücken explicitly records an unavailable exact root-edge `globe.getHeight`
query and actual rays at longitude offsets −1e-10 and +1e-10 rad. Both remain
within 0.25 m of the independently available exact-center native/provider height;
there is no runtime source fill or geometry extension. Exact root-edge picking
continuity remains unsupported. All other final observations use zero ray offset.

Final implementation/source identities:

| Input | SHA-256 |
| --- | --- |
| `app/src/masked-terrain-mesh.ts` | `f392d5fefe9f36f7bc0bb28a8c0adaaf4516d383d18bec46e35e9efb248d703f` |
| `app/src/streamed-terrain-provider.ts` | `cdb6c2c397c71075d1bbdf4803ea4158744b377b7bb00414b82ee293773f5127` |
| `app/tests/masked-terrain-mesh.browser.mjs` | `2e5ac98cb687018ffe88204c7de3bfbb404f7926200975e32b7568a28e860b21` |
| `app/tests/streamed-region.browser.mjs` | `86a6fc25103393a80ee638786f66f37a2d0300a8091217655cd2fdf40bece918` |
| `studies/e1-browser/sim/terrain-stream.js` | `21a957e3807edfd8a72fdb9215f1053cdf12d0e80a29b900eefbc5c493a7fbcc` |
| `studies/e1-browser/sim/terrain-grid.h` | `1fb82497d6d8ad9be270e8e9f151092acc383240d79536b43c9d5938d0d2afff` |
| `studies/e1-browser/sim/bridge.cpp` | `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `app/public/terrain/region/manifest.json` | `3743765a79b987c7e92119a15d2f3c043e1a12bd6a15bae2c4687d22e0ac8d85` |
| `app/public/terrain/region/tiles-v2.json.bin` | `6a54dd885714a54ec6adfd93b84a1e336aa6900990865962060a6e0bc467618f` |
| `utils/terrain/build_regional_terrain.py` | `e51c7b39926f525b7c48a25680a842c2b1599b7502b6a39a6a43ce30896e9343` |
| `app/scenery-server.ts` | `a79a58316a8414a7d8bf7df8aac72a763f35cfbbf2ab3f50f2a4098643d52ce4` |
| `utils/scenery/compose.py` | `7cd5ba8ff503b2c9d38bcd45993d10317914b7526d78466fe7ad485d5e3aae11` |
| `docs/design/five-state-world.md` | `7d1fda0aaf6a2f96e1ad025992ff0d29977bd6193ecfec68a2a40f36a35a5179` |

The local engine build record has SHA-256
`d535d34f6f3956949724d9b3fbcae704e545b73bdce138f39bebf63bf4b24b26`;
it records JSBSim v1.3.3 at `66f7fafc07fe13e7ede9db20873030fed2881713`
and WASM SHA-256
`4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
This remains the declared generic research model, not a validated 172S model.

### Final R-WORLD-10 matrix

| Criterion | Expected versus observed at the integrated freeze | Outcome |
| --- | --- | --- |
| Five-state declared scope and honest support | Fixed envelope encloses the five named states; manifest/index distinguish 382 full, 93 partial and 133 unavailable slots. Independent asset validation confirms actual support masks and hashes | pass for the declared package, retaining border/source gaps |
| DGM200, height datum and fine patch | Pinned 200 m source, DHHN2016 physical heights and GCG conversion retained; fine package unchanged; native feather fixture covers 132 edge positions and reports zero implementation height/slope mismatch | pass for source configuration and consistency |
| Source identities and shared edges | Compiler/index/tile hashes checked independently; over 800 adjacent source edges agree exactly, including NaNs | pass |
| Bounded native/rendered residency | Default browser checks maximum nine native tiles and retained cache ≤475 at all eleven presets; native movement fixture independently reports max nine; source identities bound retained package assets | pass |
| Representative native/rendered heights in every state | Eleven final observations cover all five states and the Alps; independently recomputed maximum render difference 0.202013 m and provider difference 0.004741 m, within 0.25 m; Saarbrücken uses only the explicit two-sided submillimetre picking exception | pass within the declared numerical/display limitation |
| Fixed step and pause/Review isolation | Native 1/120 s fixture verifies tile movement preserves state/digest/step. Final browser verifies map search/pan and recorded Review preserve paused native step/digest/state; pause/stop resume-intent handlers remain unchanged | pass for the scoped preserved behavior; no new timing-performance claim |
| Missing/corrupt assets and true holes | Final real-browser missing/corrupt initial tiles fail before ready with Start disabled. Native unavailable coverage rejects initialization. Independent masked tests and actual GPU sentinel regression show no nonzero-area missing-source surface, no empty-tile height/pick and no GPU/page error | pass |
| Official maps/imagery, rights and resource bounds | Fixed source/footprint table spans all five states; 22 scenery tests and independent eight coverage cases pass. Source/rights/credit records and five-state real-image probes are present; image gaps remain transparent and dates uncertain | pass for configured sources and sampled availability; no complete imagery-footprint promise |
| Honest applicability | 200 m source/interpolation, current-source photography, coarse aircraft data and unsupported borders/seams remain explicit; no surveyed runway/obstacle/current-chart or training approval inferred | pass |

Recommendation: accept the bounded local TODO 2.0.120 / R-WORLD-10 increment at
this freeze, alongside the already validated TODO 2.0.121 panel correction.
There are no unresolved in-scope specification failures. This does not accept
full regional survey coverage, exact picking continuity, installed-aircraft or
training fidelity, a milestone/release, or the pending cross-provider peer gate.

Shared CI was observed passing with skipped checks: nine optional Python JSBSim
study cases and one Linux-only repository case are not passes. The separately
executed actual WASM native/browser evidence above supplies the scoped runtime
checks. The integration owner also reports the final TypeScript/UI build and
413 Node plus 12 Python application tests passing; no hosted result is inferred.
