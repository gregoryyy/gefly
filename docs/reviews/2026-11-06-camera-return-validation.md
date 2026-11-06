# Animated camera return — independent validation

2026-11-06 16:17 Europe/Berlin. Task2.0.178; R-VIEW-1/R-INPUT-1/R-UX-2.
Reviewer: Codex `/root/camera_return_validate`, separate from implementation and
quality authors. This reviewer writes only this report; no implementation,
requirements, test harness or shared status changes were made.

## Artifact and acceptance scope

The publication checkout is `/private/tmp/gefly-camera-return`, based on chase
PR106 head `5f8ff7306b7d088138f6b5e59579698b3e35b5e0` (itself stacked on PR100).
The working application at `/Users/gregor/Documents/devel/gefly` contains other
features. The two contexts have separate main/pointer source pins, and this
report does not accept unrelated work or claim those surrounding features are
backported. The Task178 delta was inspected against the publication Git base and
working-app `output/camera-return-before` snapshots.

Frozen criteria come from the new camera-return portion of
[SPEC R-VIEW-1](../SPEC.md), the [user request](../input/2026-11-06-camera-return.md)
and [SEC](../SEC.md#animated-view-return-preference). R-INPUT-1 and R-UX-2 apply
to gesture isolation and bounded saved preferences within this camera slice.
[EVAL](../EVAL.md) does not turn these camera software observations into aircraft,
training or browser-matrix acceptance. The authored scope supplies a default-on
saved animation option,700ms wall-time return, reduced-motion override and a
gentler first100px chase-distance increase no greater than25%, keeping lens FOV.

| Frozen path | Working-app SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `docs/SPEC.md` | `2973b5153cf4da232726aee03633f78941bd45b46719ff9a33ed6640d2005473` | `d46d11d40b5af617cebec4977b61239534c4de8f12213a6b1549050251ec0b88` |
| `app/src/main.ts` | `2c883da2c5c996948caa371c710d3ff9f69bd8d4a55b0f38b56b557eb0ac7129` | `f3eaca90fe7e4570486a4650a7da66c5d0cccded7600febe3bb29c43cf9db6d9` |
| `app/src/pointer-yoke.ts` | `01b70ea4c83891835535449e97eed4c89a60f0d07703f286b4d9a4c85f686d76` | `7b975d0778f2aeca730ff608be57bd7dacc1cb48eac71978827276a4ece1dfca` |
| `app/src/chase-distance.ts` | `aa786ff673050d4059220da44ccf13a92405b4b6c2e0eac38c90cf40c9da9745` | Same |
| `app/src/camera-return.ts` | `4c10e39aebcf10b21b9d0897120351d037c822413079a21a09d37e3b4a61170b` | Same |
| `app/src/camera-preferences.ts` | `fbd5e9963b3712426a8dd1a07a4211fac696432260ea28e378de72f5c618f055` | Same |
| `app/tests/camera-return.browser.mjs` | `bf6a91e715dc3ad6e1934a85fe529c932fdf35d586b219f13d55604f6ca0578d` | Same |
| `app/tests/chase-zoom.browser.mjs` | `21dd6fa756d66047721bc64cd9f0d17e47e8b58c73b81e542300605659121ae5` | Same |

## Independent checks and supplied runtime evidence

Reviewer independently ran in the publication `app` directory:

- `node --test src/camera-return.test.ts src/camera-preferences.test.ts src/chase-distance.test.ts`:
  **16 passed,0 failed,0 skipped** (8return,2preference,6distance tests).
- `node --test src/pointer-yoke.test.ts`: **24 passed,0 failed,0 skipped** in the publication checkout.

The supplied new working-app browser result at
`output/flight/camera-return-browser.json` reports **PASS5groups**, no page errors,
Chromium156.0.8078.80. Reviewer recomputed its artifact SHA-256
`4d6fd224d846629d76099a2448e53b09db546c8a97cb3ed43293427a623a96a1`
and independently verified all seven recorded runtime/harness source hashes
against files. The observer insertion reads actual public Cesium camera values
after the application's frustum assignment; it does not replace camera values.
The Worker wrapper transparently forwards commands while observing actual native
state/stats. Scenery pixels are fixtures, not terrain-source acceptance.

The recorded animated chase and cockpit groups contain36/66 rendered frames,
including25/30 active frames. Their active-frame spans are approximately674/699ms;
this is observed frame sampling, not a separately measured exact duration bound.
The pure helper/source defines the700ms wall-clock endpoint. All frames are
finite, with orthogonal unit axes, constant FOV and external gaze at the aircraft.
Intermediate radii/directions differ from both endpoints; final camera pose is
checked against actual heading-relative30m behind/11m above or the original
cockpit direction, not only a UI string or option flag.

The old working-app `chase-zoom-browser.json` observed during initial inspection
reports4groups, but its main/distance/pointer/harness hashes belong to the earlier
implementation. It is **historical evidence, not a renewed pass** for Task178.
New legacy-suite and publication-browser results are pending at this draft.
No browser run or full CI was independently repeated by this reviewer.

## Criterion matrix at initial review

| Requirement / criterion | Expected and observed evidence | Outcome |
| --- | --- | --- |
| R-VIEW-1, visible saved View option and default-on behavior | Source creates a native toggle button with `aria-pressed`, initializes the separate boolean record and writes immediately. New working-app browser checks default-on and real-menu toggling. Publication runtime still pending. | Pass for inspected source/working-app; publication pending |
| R-VIEW-1, cockpit return with unchanged FOV | Actual working-app Cesium frames show intermediate direction/up vectors and exact original centered axes after return. All frame FOV values equal the selected cockpit FOV; pure helper has no FOV field. | Pass for working-app; publication pending |
| R-VIEW-1, chase return behind current aircraft | Actual working-app frames show monotone decreasing positive radius and target gaze; endpoint checks use actual aircraft heading and offsets−30m/11m. Existing moving-aircraft/Review regression renewal pending. | Pass for working-app; inherited regression pending |
| R-VIEW-1,700ms wall time and shortest yaw/log radius | Independent helper tests/source check exact endpoint, geometric radius midpoint, shortest arc across±π, monotonic progress, repeated/backwards/nonfinite clocks, frame-subdivision independence and finite extremes. Source samples RAF wall time without changing simulation step. Working-app runtime has real intermediate frames. | Pass |
| R-VIEW-1, repeated request starts at displayed pose | Working-app browser collects a partial return, double-clicks again, observes a new rendered transition without radius jumping back to the former start. Pure cancellation/restart test verifies detached visible pose; main synchronizes pointer angles every animated sample. | Pass for source/working-app; publication pending |
| R-INPUT-1, interrupt without stale motion or new control input | Source cancels accepted cockpit/chase wheel input, pointer-down, view/reset/Review transitions, blur/hidden and disposal. Working-app runtime checks wheel/view/drag and explicit synthetic blur, with stable poses850ms later. Silent pointer synchronization has no flight callback. Reset/Review/hidden/disposal were source-inspected, not separately exercised in the new browser suite. | Pass for inspected paths; genuine hidden-tab runtime not evaluated |
| R-VIEW-1, reduced motion / disabled option | Working-app browser observes no active animated frame when off and in a reduced-motion context despite saved-on default. Media-query change listener also completes an in-progress return by source inspection. | Pass for source/working-app; dynamic-media-change runtime not evaluated |
| R-UX-2, strict saved boolean / pose remains transient | Independent tests check new-controller restore, exact two-field encoding, malformed/version/type/extra-field/oversized records and denied storage. Working-app browser reload preserves off state. Reset does not write the preference by source inspection; no camera pose or aircraft state enters this record. | Pass |
| R-VIEW-1, gentle close zoom and fixed lens | Independent tests confirm initial100px moves31.953→37.506m (about17.38%increase), reversal/subdivision and unit conversion/bounds. Working-app actual camera checks increase≤25% with constant FOV. Analytic travel mapping reaches20Mm while preserving far sensitivity; no lens change in this source delta. | Pass for source/working-app; full-range browser renewal pending |
| R-INPUT-1/R-VIEW-1, paused native isolation | Working-app browser compares actual worker step/digest/final state after camera actions and checks no worker commands during a chase animation after existing click neutralization. New interpolation/synchronization functions have no session/worker interface. Live-flight animation and separate replay pacing are not newly measured here. | Pass for paused source/working-app; live animation runtime not evaluated |
| Publication gates / stable integrated evidence | Corrected focused tests and source inspected; publication browser, renewed legacy browser, final shared CI and assurance output not yet supplied. An initial new pointer test expected the wrong yaw sign and was corrected in the test, not the implementation; retain this preparation history. | Blocked pending evidence |
| Cross-provider peer | This is same-provider independent validation, not the external-provider gate. | Not evaluated; peer pending |

## Initial recommendation and limits

No implementation defect found in the inspected Task178 source. Pure behavior
and the new working-app camera observations meet their bounded criteria.
**Publication acceptance remains blocked pending current publication/legacy
browser and final integration-gate evidence.** Untested lifecycle/device paths
are explicit above; Chromium fixtures do not establish embedded WebKit, genuine
hidden-tab behavior, terrain fidelity, camera performance under every load,
aircraft dynamics or training validity. Changed runtime, harness or criteria pins
require affected renewal. A later renewal must preserve this initial state.

## Renewal — current working-app chase regression

2026-11-06 16:20 Europe/Berlin. The historical legacy artifact noted above has
now been replaced by a fresh **PASS4group** run. Reviewer independently recomputed
artifact SHA-256
`710aa7a38f796bb190b165c948bea15b4fb3bf22ed70d9935213c891c40787dd`
and verified all seven source hashes, including the updated main, pointer,
distance and harness, against current files. Chromium156.0.8078.80; no page errors.
The runtime implementation and frozen criteria above are unchanged.

The renewed suite deliberately disables the new animation option through the
actual View menu to retain its immediate-return assertions. It checks actual
Cesium distances with fixed FOV,20Mm and exact top-down target gaze, independent
cockpit FOV/overview controls and wheel guards, moving-aircraft chase following,
and paused read-only Review zoom/recenter/native isolation. It records39 gaze
evaluations with maximum vector error `3.070453235030418e-11`; the first200px
response is gentler than the old exponential requirement. This renews the
inherited regression rows above for the working-app context, including the
full-range and moving-target/Review checks. It does not measure an animated
live-flight return or replace the separate new5group animation suite.

Reviewer `just check` passed550Markdown files after writing the initial report;
that is structural link/routing coverage only. Publication browser and final
CI/assurance acceptance remain pending. The initial historical artifact and the
wrong-sign test-preparation observation are retained, not rewritten as passes.

## Final renewal — publication runtime and shared gate

2026-11-06 16:24 Europe/Berlin. **Bounded Task178 validation passes in both
contexts.** This renewal supersedes the pending publication recommendation above
while preserving that historical review state. Reviewer independently re-read
both complete publication artifacts, recomputed hashes and verified every
runtime/harness pin against current files. Both SPEC hashes remain exactly those
in the frozen table; no runtime or criterion repair occurred after inspection.

| Context / suite | Observed outcome | Exact artifact SHA-256 |
| --- | --- | --- |
| Working app, new camera-return | PASS5groups, no page errors | `4d6fd224d846629d76099a2448e53b09db546c8a97cb3ed43293427a623a96a1` |
| Working app, renewed chase regression | PASS4groups,39gaze evaluations | `710aa7a38f796bb190b165c948bea15b4fb3bf22ed70d9935213c891c40787dd` |
| Publication, new camera-return | PASS5groups, no page errors | `9a7eb3accf95249052aa773136594874932e86eddf829bff0d3ebaa4406ed8f7` |
| Publication, renewed chase regression | PASS4groups,39gaze evaluations | `43034152fe1de60cbd9c7c3c4c6a621e669cfc394d44b8af390dce72bfe4fb13` |

All four runs identify Chromium156.0.8078.80. Publication new-suite chase/cockpit
observations contain32/44 actual rendered frames, with30/40 active frames and
approximately684ms active-frame spans. The unchanged helper's elapsed-time tests
establish exact700ms endpoints; these observed spans reflect frame sampling.
Publication legacy maximum gaze-vector error is `3.070452396802395e-11`, including
Earth-scale/pole and moving-target/Review checks. Off-option and reduced-motion
contexts have no active animated frames; saved-off survives actual page reload.
The first100px zoom observation remains within the predeclared≤25% radius increase
and keeps the actual Cesium frustum FOV fixed.

Reviewer also independently probed exact preference byte boundaries with a valid
saved-false JSON record padded with JSON whitespace:127/128bytes restore false,
129bytes safely returns default true. This supplements the independent16pure and
24pointer tests above; it changes no implementation/test file.

The final publication `output-camera-return-ci.log` was inspected through its
terminal Foundation CI result: **passed with the existing nine optional JSBSim
study skips**. Observed counts are620application Node tests,22application Python
tests,85assurance tests and11training tests. Repository tooling executed242of243
with one platform-specific skip; JSBSim study14of23 executed, nine skipped;
C172S study25of25 executed. Tracked-content whitespace passed2151tracked paths,
with untracked-file exclusion stated by the gate. No skip is treated as a pass.
The full CI was run by the integration owner, not duplicated by this reviewer.
Final commit, publication assurance/diff and mergeability remain integration-owned.

### Final criterion dispositions

- **Pass:** native accessible saved toggle/default; both view animations and
  exact endpoints; fixed-lens behavior; shortest-yaw/log-radius/wall-time pure
  contract; repeated request from displayed pose; silent pointer reference
  synchronization; observed wheel/view/drag/synthetic-blur interruption;
  disabled/reduced-motion snapping; reload persistence and malformed/denied/
  byte-bound storage; gentle reversible close zoom and20Mm reach; inherited
  guards, moving-target follow and paused Review; actual paused native-state
  invariance and no animation worker commands; supplied shared integration gate.
- **Pass by source inspection with runtime limit explicit:** reset/Review-entry/
  Review-exit/hidden/pagehide cancellation wiring, listener disposal and dynamic
  reduced-motion-change completion. These invoke the inspected cancellation or
  exact-endpoint paths; their own real lifecycle transitions were not newly
  exercised during animation by the browser harness.
- **Not evaluated:** genuine hidden-tab animation lifecycle, animated live-flight
  return, dynamic media-query transition runtime, embedded WebKit/hardware matrix,
  terrain/imagery fidelity, aircraft or training validation, and cross-provider
  peer. The legacy suite's live following and Review checks use animation off.

No implementation failure remains in this bounded reviewed slice. The original
wrong-sign test expectation was corrected in preparation; initial historical
legacy evidence was renewed rather than promoted unchanged. Different root and
publication surroundings remain separate contexts, and the observed software
results do not accept unrelated features or certify full-browser/flight behavior.
Any changed runtime, harness or requirement pin requires affected renewal.
