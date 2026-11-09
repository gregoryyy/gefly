# Chase zoom and return: independent validation

Reviewed 2026-11-06 14:23 Europe/Berlin by Codex validation agent
`/root/chase_validate`. This agent authored no implementation, test harness or
specification content. This is same-provider validation, not cross-provider peer
review. Task2.0.174; R-VIEW-1/R-INPUT-1; [request](../input/2026-11-06-chase-overview.md).

## Current renewal — 2026-11-06 14:33 Europe/Berlin

**Accept the bounded Task174 camera behavior in ROOT and the isolated publication
port.** The strict actual-renderer pole defect below is repaired and rechecked;
no criterion was weakened. This agent authored no repair or harness change.
Final publication CI was subsequently inspected at 2026-11-06 14:35 Europe/Berlin:
**607 Node,22 application Python,85 assurance and11 training cases pass**;9 of23
optional JSBSim study cases are explicitly skipped. The log finishes with
`Foundation CI: passed with skipped checks`; its SHA-256 is
`bf737951ad33cd3bc36560feea49ed3ba06061a289bbcd3312f893136971e0b5`.
All seven publication browser source pins still match after that run. The parent
owns final committed-revision scaffold/assurance/lineage checks. This is not a
whole-ROOT CI, hosted CI or cross-provider pass. Wider
R-VIEW-1/R-INPUT-1/device/aircraft criteria are not accepted by this report.

The repair [camera-pose helper](../../app/src/camera-pose.ts) sets the world
position/reference frame using the public Camera API and installs the prepared
orthonormal public direction/right/up vectors. This avoids Cesium's near-pole
vector-to-HPR round trip without changing the lens or aircraft data. Input
validation completes before camera mutation, and independent actual-Camera
regressions exercise both poles, multiple geographic positions/headings/ranges,
normal chase/cockpit retention, aliased inputs, reference-frame reset and invalid
or extreme finite vectors. ROOT scene and publication scene both call this
helper. No observed-source substitution was used to bypass the repair.

### Renewed evidence

| Target | Artifact SHA-256 | Actual rendered gaze evidence |
| --- | --- | --- |
| ROOT working tree | `b7831407e0eef46cf826eca8e40e6999e09a7a02f780de17a63c763e7c66f779` | Four groups,32 external-pose gaze checks, maximum unit-vector error `3.0222322093672e-11`, zero page errors. |
| Publication `/private/tmp/gefly-chase-overview` | `8f159df0c05fe58369e168abdac15e87e1bc2d02ee3c5b246b9b75de963ac537` | Four groups,32 external-pose gaze checks, maximum error `3.2889407792843e-11`, zero page errors. |

Both use Chrome156.0.8078.80. These are separate actual browser runs supplied by
an implementation author; this validator independently inspected both complete
harnesses/artifacts, verified every source pin against disk, and recomputed gaze
alignment from the saved observations. The observer only reads public Camera
world vectors and the ENU transform; native messages remain unchanged. Scenery
fixtures supply pixels/empty vector tiles, not camera or native states.

The strengthened harness checks every observed external pose against the unit
ray from camera to aircraft, error≤1e−10, and separately requires top-down
horizontal direction components≤1e−10 and down component−1 within1e−12.
Both actual top-down observations now have ENU direction approximately
`[5.55e-17,-1.67e-16,-1]`, with position approximately `[0,0,20Mm]`.
The old0.18855° discrepancy would fail the new ray and pole checks.

Independently reran the earlier five test files plus
`src/camera-pose.test.ts`: **52 tests pass, zero failures/skips**. Command:

```sh
node --test src/camera-pose.test.ts src/chase-distance.test.ts src/aircraft-orientation.test.ts src/pointer-yoke.test.ts src/overview-camera.test.ts src/field-of-view.test.ts
```

The actual installed Cesium `Camera` is used by the five new tests; its Scene
argument is a minimal data fixture. This is not a WebGL/browser run and does not
substitute for the real browser observations above. Unit execution log SHA-256:
`5d0119a13e91be2be985db88fc4ec222c1f9d5a26fe64168c93ccf00138e8792`. Parent-reported publication50-unit
result is not counted as a second independently executed unit run here (its
pointer base omits two unrelated ROOT resize tests).

### Current source pins

All fourteen listed source/file checks match the corresponding current target.
Shared new math/pose helpers and the hardened harness are byte-identical between
targets. Main/scene/pointer differences reflect the isolated parent's existing
feature context and were source-inspected without importing unrelated ROOT work.

| File under `app/` | ROOT SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `src/main.ts` | `6766b4ef43d43e4355f0b988a67818fbcd11dfb16637e0175f2f8ef76350a0f8` | `508a283c5b580e09c4402e3484b6f1b859f2627b9ea74f1ee288c0c17f703106` |
| `src/scene.ts` | `63de768859232ac66544292eb7f4da4b1588df777a0419d08894dd2319d12e3a` | `d7e74750c5e3992ae08829abc2f27aa5c3a20da070c86f8c952ff353a4c110bb` |
| `src/aircraft-orientation.ts` | `b8438d67c7ab8abd739f567fb0d88f9fff8e5c4a8299b0115b0565b3ff21a68f` | `b8438d67c7ab8abd739f567fb0d88f9fff8e5c4a8299b0115b0565b3ff21a68f` |
| `src/chase-distance.ts` | `cbfce2c4219fa78fcc1d1a4dce91d488ef9e50bad633877b8915704f18345711` | `cbfce2c4219fa78fcc1d1a4dce91d488ef9e50bad633877b8915704f18345711` |
| `src/camera-pose.ts` | `445ca24283032513b7adb4dacb058e1a1089dff4b0853651b7e4ceffeed9029e` | `445ca24283032513b7adb4dacb058e1a1089dff4b0853651b7e4ceffeed9029e` |
| `src/pointer-yoke.ts` | `416b7169a2007dc7f81213a749b61ec5b03446c825d628bb6a8752a0ac0ea643` | `c93d3453c3bd59d28f31ec91c915908e9d95cc5cfe0c9354b4d9f8094b6bb24a` |
| `tests/chase-zoom.browser.mjs` | `704acc165192809ce03a0b1553d5235646440a2d3b0857f6ff7a035286058b6f` | `704acc165192809ce03a0b1553d5235646440a2d3b0857f6ff7a035286058b6f` |

The current ROOT SPEC SHA-256 is `03fe8b41e5363f7c634839484b6ecc0edac110f14dcb1625eecc34786bbfc9aa`.
New actual-Camera test SHA-256 is
`8b850470f41a2250e753fcb0b1cfeb5c395a5a47e1ec896cfed0694e3930650d`.

### Renewed criterion matrix

| Scoped criterion | Observed expected behavior | ROOT | Publication |
| --- | --- | --- | --- |
| Actual distance zoom, fixed lens | Original30m behind/11m above radius; scroll increases actual radius; maximum20Mm reached within0.001m with lens unchanged. | pass | pass |
| Exact renderer top-down/target gaze | Pure pole and actual world camera now agree; all32 observed external poses meet target-ray tolerance, with strict separate nadir checks at maximum range. Historical failure resolved by renderer repair. | pass | pass |
| Double-click close follow | Zero-angle zoom-only and overhead cases restore original radius and current-heading relative position/gaze within1e−5m, retaining lens FOV. | pass | pass |
| Moving aircraft | Native flight advances at least180steps and target moves>1m; actual close camera follows its current position/heading. | pass, bounded1.5s case | pass, bounded1.5s case |
| Cockpit/overview independence | Cockpit still narrows FOV; overview starts at1500m and changes its own distance; returning to chase retains its separate radius. | pass | pass |
| Input guards and lifecycle | New actual editable-child guard is exercised alongside horizontal/modifier/dialog cases; pure pointer tests preserve enabled/button/Ctrl guards, click-pair mode and neutralization; Escape/disposal do not request zoom reset. | pass | pass |
| Paused and Review isolation | Native step/digest/final-state snapshots remain equal across paused camera operations and Review zoom/recenter; no new simulation values originate from camera math. | pass | pass |
| Visible/help behavior | Distance/readout and follow reset are discoverable; screenshot shows rendered globe/viewport with fixture scenery and no render-error overlay. This is not cartographic quality acceptance. | pass, source/browser scope | pass, source/browser scope |
| Device/source/aircraft fidelity | Real touchpad hardware, Safari/WebKit/other browser matrix, imagery/elevation fidelity, learning outcomes and physics are outside this increment's evidence. | not evaluated | not evaluated |
| Publication local CI | Completed log inspected:607 Node/22 application Python,85 assurance,11 training pass;9 optional study skips are explicit. Tracked-content whitespace pass covers2139 then-tracked paths; parent retains final staged/final-revision checks. No whole-ROOT or hosted CI pass claimed. | not evaluated here | pass with declared optional skips |
| External peer | Separate cross-provider evidence remains pending under project cadence. | not evaluated here | pending, not passed |

The prior failed observation and initial outcomes are preserved below as history.

---

## Historical initial recommendation — 14:21

**Needs changes for the strict actual-renderer top-down criterion.** The other
bounded ROOT camera criteria below pass. The exact mathematical pole is correct,
but the supplied real Cesium camera observation does not aim exactly at the
plane from the pole at Earth scale. Publication runtime acceptance is blocked
until the isolated port is delivered and pin-matched evidence is available.

The ROOT is a large working tree at historical HEAD
`700dd5386125f9864a391f85b277cb71da55290a`; this report accepts no whole-tree state.
The reviewed SPEC SHA-256 is
`03fe8b41e5363f7c634839484b6ecc0edac110f14dcb1625eecc34786bbfc9aa`.
Task differences were inspected against `output/chase-overview-before/app/src/`.

## Evidence inspected and independently executed

The author-run browser artifact `output/flight/chase-zoom-browser.json` has
SHA-256 `00f4a2cbfd3e9102b52e6ddccef89ff077f07c9ad936d5ebb6f345f833e78404`,
result pass, four assertion groups, nine observations, no page errors, and Chrome
`156.0.8078.80`. All six source pins match the current files independently.
The harness observes public Cesium world position/direction/up, transforms those
observations back to the aircraft ENU frame, and forwards native Worker messages
unchanged. It supplies scenery pixels/vector fixtures, not camera or flight-state
fixtures. Runtime claims here are based on inspection of that actual artifact and
its complete source, not on a second independent browser execution.

| Browser source | SHA-256 |
| --- | --- |
| `src/main.ts` | `0f7fdfcc0d08c6f40f19ff225b4409c5d3eb0802da59092ff765ad674e310f17` |
| `src/scene.ts` | `e2885bb7818fb2d548707fae2bf91a93314b7ecf6481a450244eae522dc27c41` |
| `src/aircraft-orientation.ts` | `b8438d67c7ab8abd739f567fb0d88f9fff8e5c4a8299b0115b0565b3ff21a68f` |
| `src/chase-distance.ts` | `cbfce2c4219fa78fcc1d1a4dce91d488ef9e50bad633877b8915704f18345711` |
| `src/pointer-yoke.ts` | `416b7169a2007dc7f81213a749b61ec5b03446c825d628bb6a8752a0ac0ea643` |
| `tests/chase-zoom.browser.mjs` | `130c6a03c0d0c83d7580be662fde3fb82ccfadcfaa806b1740327e658f535a45` |

Independently executed from `app/`:

```sh
node --test src/chase-distance.test.ts src/aircraft-orientation.test.ts src/pointer-yoke.test.ts src/overview-camera.test.ts src/field-of-view.test.ts
```

**47 tests pass; zero failures/skips.** These pure/DOM-fixture tests establish
math and input behavior, not an actual rendered view or aircraft fidelity.

| Independent test input | SHA-256 |
| --- | --- |
| `src/chase-distance.test.ts` | `d8019e3d514d3e1db618093a7d199afc2f146fd0882dbb2d409f25805ad64b52` |
| `src/aircraft-orientation.test.ts` | `dc38ae7447d8bb433c59debd515867de53423cdc846933ac69f51a3a021d2034` |
| `src/pointer-yoke.test.ts` | `9c35038f78396a381fa5071a8e2a35f411d151bbf7fd263e863ba0fe81bfadcb` |
| `src/overview-camera.test.ts` | `1f0333afcc7fe2d6ec5c6f4e57a90f1d44853dcf490b05080077def7c2f0690e` |
| `src/field-of-view.test.ts` | `4106c1ce225dd39c06509e11a8971aee7e702eeb3d19b58bbe7a647e0415e7aa` |

## Historical initial matrix — 14:21

| Criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| R-VIEW-1 chase distance | Scroll moves camera from original approximately32m orbit to20,000km without changing its lens | Actual default ENU offset matches30m behind/11m above; first wheel radius increases over2× with FOV unchanged; wide radius reaches20Mm within0.001m. Independent bounded wheel/pixel-line-page tests pass. | pass |
| R-VIEW-1 exact top-down | Camera directly above the aircraft aims exactly downward at it | Pure camera math reaches the exact pole. Actual top-down offset is approximately[0,0,20Mm], but direction is[0.002483594,−0.002158949,−0.9999945853],0.18855° off nadir; closest ray misses target by65,815.81m. Harness threshold `z < -.99999` admits this discrepancy. | fail |
| R-VIEW-1 double-click return | Reset orbit and distance to ordinary30m-behind/11m-above heading-relative chase, including zero-angle zoom-only case | Actual zero-angle and overhead reset observations meet the heading-relative position and gaze tests within1e−5m; pointer reset callback fires even at zero look and sees neutral controls/restored mode. | pass |
| R-VIEW-1 follow current aircraft | Close chase follows actual current position and heading | After180 native steps/1.5simulated seconds, target world coordinates move more than1m and the actual camera still matches the new position/heading-relative pose. Cardinal headings are checked independently by pure tests. Full-turn/envelope/device extrapolation is not claimed. | pass |
| R-VIEW-1 mode independence | Cockpit scroll retains FOV; separate overview retains independent distance; chase lens unchanged by distance scroll | Harness verifies cockpit FOV narrowing, separate overview default1500m then increased distance, and unchanged chase distance on return. Source has separate chase/overview variables and blocks the FOV handler outside cockpit. | pass |
| R-INPUT-1 gesture guards | Preserve horizontal/modifier/dialog guards and safe double-click lifecycle | Runtime covers pure horizontal, Ctrl/Meta/Alt and open Options dialog; source retains horizontal-dominance guard. Pointer tests cover disabled/nonprimary/Ctrl double-click, no reset callback on Escape/dispose, restored click-pair yoke mode and neutral axes. Mixed diagonal events are source-inspected, not separately exercised in the browser artifact. | pass |
| R-VIEW-1 native/Review isolation | Camera values stay outside deterministic aircraft state and Review cannot alter live flight | Before/after paused camera operations compare native step,digest and complete native final-state arrays. Review zoom/recenter repeats that comparison at paused live state; camera math and application hook contain no new native/configuration writes. Existing pointer neutralization remains. | pass |
| R-VIEW-1 help | Visible distinction between cockpit FOV and chase distance/reset | Source zoom readout names Chase distance and double-click follow; mode-dependent pointer hint and aria description explain the change. README/appREADME describe new semantics. No independent accessibility/device-matrix exercise. | pass, scoped source inspection |
| Isolated publication | Same behavior accepted at exact publication source revision | `/private/tmp/gefly-chase-overview` is being prepared; no completed publication camera artifact was supplied at this inspection. | blocked |
| Wider model/source/device fidelity | None implied by camera increment | Scenery is fixture-backed, tests use one Chrome configuration, and camera checks do not validate aircraft physics, imagery/elevation coverage, learning outcomes or training credit. | not evaluated |

## Concrete failure and repair evidence needed

The actual `top-down Earth-scale overview` observation has unit direction norm
approximately1 and radius20Mm. Its angular error from `[0,0,-1]` is
`acos(-directionENU[2]) = 0.1885487464 degrees`. Its perpendicular camera-ray miss
is `sqrt(radius² - dot(direction,offset)²) = 65815.8097m`.

This does not contradict the pure pole helper: those tests pass. It means the
strict rendered criterion is not established by the current Cesium integration.
Repair the actual pole gaze and tighten the actual-camera target/ray assertion,
then rerun affected root/publication evidence at frozen pins. Any product change
to tolerate approximate top-down aiming belongs to the orchestrator/SPEC, not to
this validation report.

## Remaining boundaries

No root full CI or isolated port CI result was independently accepted in this
inspection. The parent owns required integrated gates. Missing/currently pending
runtime and external peer evidence is not promoted to pass. Changed source
invalidates affected observations and requires renewal of this report.
