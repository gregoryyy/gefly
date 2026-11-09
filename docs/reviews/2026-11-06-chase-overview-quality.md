# Chase overview quality review

Task 2.0.174; R-VIEW-1/R-INPUT-1. Reviewer: Codex
`chase_housekeeping`, independent of the runtime implementation. The reviewer
authored the source-only integration note, which is outside this runtime review.
This is a same-provider quality review, not cross-provider peer evidence or
aircraft/model validation. The orchestrator owns integration and shared status.

## Renewed quality review — 2026-11-06 14:33 Europe/Berlin

**Outcome: no blocking findings for the bounded camera increment in the working
app and isolated publication port.** The initial renderer-target finding below
is resolved; it remains historical evidence of why the stricter test is needed.
No aircraft/source-fidelity or external peer acceptance is implied.

### Repair and independent source checks

The new `camera-pose.ts` validates and copies the complete position/basis before
camera mutation, normalizes vectors with scaled arithmetic, rejects degenerate
frames and constructs a perpendicular right/up basis. It uses the public
`Camera.setView` destination/identity reference-frame behavior, then assigns the
public direction/right/up vectors directly. This avoids the library's vector to
heading/pitch/roll near-pole conversion while preserving the intended world pose.

The reviewer inspected the installed primary implementation in
`app/node_modules/@cesium/engine/Source/Scene/Camera.js`: these vector members are
public, `updateMembers` detects their changes, and the direction/up `setView`
overload performs the HPR conversion that caused the initial miss. The tests use
that installed real Camera class; the minimal Scene dependency is a data fixture,
not a substituted Camera method. The actual browser separately checks rendering.

Independently executed the renewed math/application tests:

```sh
cd app
node --test src/camera-pose.test.ts src/chase-distance.test.ts src/aircraft-orientation.test.ts
```

All 21 pass. The five new real-Camera cases cover cardinal headings, multiple
latitudes/ranges, both poles, ordinary Chase/cockpit vectors, unchanged lens,
nonidentity reference-frame reset, aliased public inputs, invalid-input atomicity
and extreme finite vector normalization. The earlier 41-test pointer/math run
remains applicable to unchanged pointer behavior; it is not counted as a new
browser run.

Root and publication share identical camera-pose, chase-distance,
aircraft-orientation and browser-harness bytes. Each main/scene/pointer file is
checked against its own pinned browser artifact; their pre-existing baselines
are allowed to differ. The publication diff retains the same narrow camera
hooks and callback, without importing unrelated working-app features. No new
blocking source issue was found in either integration.

### Strengthened actual-camera evidence

The renewed harness evaluates the actual Cesium direction against the negative
normalized camera offset after each sampled external-view operation, with unit
vector error at most 1e-10. At the 20,000 km limit that bounds a perpendicular miss
to approximately 2 mm. The pole additionally checks both horizontal direction and
normalized-offset components, and vertical direction/offset independently. This
strengthens the original test; it does not relax the requested top-down target.

| Scope | Raw artifact SHA-256 | Four groups | Gaze evaluations | Maximum unit-vector error |
| --- | --- | --- | --- | --- |
| Working app | `b7831407e0eef46cf826eca8e40e6999e09a7a02f780de17a63c763e7c66f779` | pass |32 |3.0222322093672e-11 |
| Publication port | `8f159df0c05fe58369e168abdac15e87e1bc2d02ee3c5b246b9b75de963ac537` | pass |32 |3.2889407792843e-11 |

Both artifacts report no page errors. In both, the actual overhead direction is
`[5.551115123125783e-17, -1.6653345369377348e-16, -1]`, with actual vertical
camera offset 20,000,000 m to floating precision. This closes the 65.8 km target miss
in the rejected candidate. The recorded operations also cover distance-only and
overhead double-click reset, fixed Chase lens, separate cockpit/overview zoom,
modifier/horizontal/editable/modal guards, moving native target and paused
Review/native invariance.

All seven source pins were independently rehashed and matched each artifact:

| File under `app/` | Working-app SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `src/main.ts` | `6766b4ef43d43e4355f0b988a67818fbcd11dfb16637e0175f2f8ef76350a0f8` | `508a283c5b580e09c4402e3484b6f1b859f2627b9ea74f1ee288c0c17f703106` |
| `src/scene.ts` | `63de768859232ac66544292eb7f4da4b1588df777a0419d08894dd2319d12e3a` | `d7e74750c5e3992ae08829abc2f27aa5c3a20da070c86f8c952ff353a4c110bb` |
| `src/camera-pose.ts` | `445ca24283032513b7adb4dacb058e1a1089dff4b0853651b7e4ceffeed9029e` | same |
| `src/aircraft-orientation.ts` | `b8438d67c7ab8abd739f567fb0d88f9fff8e5c4a8299b0115b0565b3ff21a68f` | same |
| `src/chase-distance.ts` | `cbfce2c4219fa78fcc1d1a4dce91d488ef9e50bad633877b8915704f18345711` | same |
| `src/pointer-yoke.ts` | `416b7169a2007dc7f81213a749b61ec5b03446c825d628bb6a8752a0ac0ea643` | `c93d3453c3bd59d28f31ec91c915908e9d95cc5cfe0c9354b4d9f8094b6bb24a` |
| `tests/chase-zoom.browser.mjs` | `704acc165192809ce03a0b1553d5235646440a2d3b0857f6ff7a035286058b6f` | same |

The five new real-Camera test cases are pinned separately by
`camera-pose.test.ts` SHA-256
`8b850470f41a2250e753fcb0b1cfeb5c395a5a47e1ec896cfed0694e3930650d`.

### Remaining limits

The initial failure is repaired at the reviewed hashes. No new runtime changes
are covered automatically by this result. Full CI/publication lineage and any
subsequent merge resolution remain the orchestrator's integration gates. Fixture
imagery does not accept terrain or photographic fidelity. Aircraft dynamics,
camera persistence, the entire legacy browser suite and cross-provider peer
remain outside this bounded quality outcome.

## Initial candidate: needs changes

The reviewed working-app delta is relative to
`output/chase-overview-before/app/src/` for main, scene, pointer-yoke and aircraft
orientation, plus the new chase-distance helper/tests and browser harness.
No implementation files were edited by this reviewer.

### Medium: rendered Earth-scale top-down gaze misses its aircraft target

Locations: `app/src/scene.ts`, the `scene.camera.setView` orientation application;
`app/tests/chase-zoom.browser.mjs`, the Earth-scale overhead assertion.

The initial actual-browser artifact
`output/flight/chase-zoom-browser.json` has SHA-256
`00f4a2cbfd3e9102b52e6ddccef89ff077f07c9ad936d5ebb6f345f833e78404`.
It reports four groups passed, but the top-down direction tolerance admits a
material camera-target error. Its observed direction in the aircraft ENU frame
is `[0.0024835940002659873, -0.0021589494815294485, -0.9999945853343297]`.
The camera offset is vertical at 20,000 km. Independently comparing that actual
direction with the negative normalized offset gives 0.1885487464 degrees, or a
65,815.81 m perpendicular miss at the target distance.

The harness only requires `directionENU[2] < -.99999` at that pole. That is too
loose to establish the declared exact top-down, aircraft-targeted view. The pure
camera helper returns correct finite orthogonal axes, so passing helper tests do
not settle Cesium's applied orientation.

Expected: the actual rendered-camera direction points at the current aircraft at
close, distant and pole views, with an explicit numerical angular or target-miss
budget. Repair the renderer application and strengthen the real-camera check;
rerun both root/publication evidence as affected. This finding was also reported
by the independent validator and was reproduced from the raw observation here.
No aircraft state or dynamics defect is implied.

### Other source checks

No additional blocking source findings at initial inspection:

- Chase distance is finite and bounded; the exponential step cannot escape its
  declared limits. Pixel/line/page conversion and unsupported modes are explicit.
- Default radius retains the original 30 m behind/11 m above geometry. Lens FOV is
  separate; only offset radius changes in the pure Chase camera function.
- The new optional double-click callback runs after capture, yoke neutralization,
  look reset and click-pair restoration. It also runs for already-zero angles,
  while lifecycle reset, Escape, disabled input and disposal do not invoke it.
- The main callback changes Chase distance/look only. Cockpit and overview retain
  separate camera semantics; modal/modifier/horizontal guards are preserved.
- No new dependency, asset, persistence path, native-state field or service is
  introduced by the reviewed delta. Existing look neutralization is retained.

## Executed checks and observed evidence

Independently executed:

```sh
cd app
node --test src/chase-distance.test.ts src/aircraft-orientation.test.ts src/pointer-yoke.test.ts
```

All 41 tests pass. This covers the new distance bounds/unit handling, cardinal
poses/poles, unchanged defaults and callback/lifecycle cases alongside existing
pointer regressions. These tests validate source-level math and pointer behavior;
they do not establish the renderer's singular orientation behavior.

The actual browser harness uses fixture scenery, a served-module observer that
reads the actual Cesium camera after application, and an unchanged native Worker
wrapped only to observe messages. The inserted observer does not substitute a
camera pose or flight sample. The recorded close/default pose and distance-only
double-click are consistent with the implementation. During live follow, heading
changes from 1.431169986635351 to1.4311828216634195 radians at 1.5 s; the actual camera
offset remains behind that current heading. Paused step/digest/final-state checks
support the bounded native-state invariance claim. Source inspection additionally
shows that zoom does not send a steering command.

All six source pins matched the working app at the initial evidence inspection:

| File under `app/` | SHA-256 |
| --- | --- |
| `src/main.ts` | `0f7fdfcc0d08c6f40f19ff225b4409c5d3eb0802da59092ff765ad674e310f17` |
| `src/scene.ts` | `e2885bb7818fb2d548707fae2bf91a93314b7ecf6481a450244eae522dc27c41` |
| `src/aircraft-orientation.ts` | `b8438d67c7ab8abd739f567fb0d88f9fff8e5c4a8299b0115b0565b3ff21a68f` |
| `src/chase-distance.ts` | `cbfce2c4219fa78fcc1d1a4dce91d488ef9e50bad633877b8915704f18345711` |
| `src/pointer-yoke.ts` | `416b7169a2007dc7f81213a749b61ec5b03446c825d628bb6a8752a0ac0ea643` |
| `tests/chase-zoom.browser.mjs` | `130c6a03c0d0c83d7580be662fde3fb82ccfadcfaa806b1740327e658f535a45` |

## Limits and renewal

The initial candidate is not accepted for the rendered top-down criterion. A
source-only repair or another loosely labeled browser pass is insufficient;
inspect the strengthened actual-camera observations at the corrected revision.
The isolated publication worktree has not received runtime acceptance in this
initial review. Terrain/imagery fidelity, aircraft dynamics, camera persistence,
the full legacy browser suite and cross-provider peer review remain outside this
bounded quality result.
