# Right-click waypoint quality review

Reviewer: Codex `/root/quality`, independent of the model, UI, integration and browser-test authors. Provider: OpenAI/Codex; no independently exposed model-version identity claimed. Scope: TODO 2.0.127 / SPEC R-NAV-5 and R-WORLD-6, bounded working-tree increment based on `700dd5386125f9864a391f85b277cb71da55290a`. Earlier map-planner/background-flight/terrain/panel work is outside this increment except explicitly inspected integration boundaries. Read AGENTS, the quality role and applicable SPEC/ARCH/SEC/STYLE/SDLC.

## Disposition

No unresolved blocking quality findings in the final frozen source. The medium Follow/pan and low activation-context issues below are repaired and the affected six-group browser case passes in both author and independent validate runs. Final review: 2026-11-05 01:57 Europe/Berlin. This quality review does not replace specification validation or cross-provider peer review.

## Criterion source and review scope

Current SPEC R-NAV-5 requires active-canvas right-click to create an anonymous custom fix at the actual map position and append an intermediate waypoint, without a naming dialog. Both capacity/coordinate checks must precede mutation; failure must preserve state and identifiers. Start/destination, plan-edit navigation semantics, first activation, right-drag exclusion, ordinary left gestures and native control/popup context menus remain effective. The existing keyboard-accessible editor is retained. ARCH and SEC describe one bounded session-only transition, including current planning in Review, with no native guidance/radio/recording write path.

## Findings and affected repairs

**Medium, resolved — Follow repaints interrupted a normal held left-pan gesture.** Location: `practice-map.ts:720`. The independent integrated rerun failed before the right-click assertions because a normal primary mouse-down followed by a human-length pause did not produce any pan. The UI author traced this to periodic Follow `jumpTo` calls: MapLibre stops its pending mouse-pan handler even when the requested center is unchanged. `dragstart` had not yet fired, so turning Follow off there was too late. Reproduction: leave Follow on, press the bare map canvas, hold for at least one roughly 250 ms host repaint, then move and release. Expected ordinary left panning must survive.

The author now skips Follow `jumpTo` while the public `dragPan.isActive()` reports the mouse-down/pan pending or active. A simple click still retains Follow; actual `dragstart` still turns it off. The affected regression deliberately holds for 350 ms and checks the pending native handler before requiring actual dragstart and changed center. Its observation wrapper forwards the original map operation; it does not stub panning. Source re-review and the final author/independent six-group runs verify the repair; the before-repair log fails the pending-handler assertion causally.

**Low, resolved — first-activation canvas context menu was not reserved.** The initial inactive right press was correctly prevented from creating a waypoint, but its later contextmenu event could still open a browser menu over the newly activated canvas. The author now reserves eligible active-canvas right/Ctrl-click context menus even when no creation gesture was armed. Controls, keyboard context-menu events and unrelated marker targets remain excluded; only the current canvas-origin gesture may suppress a newly created marker's retargeted context event. The final passing case separately asserts no first-gesture creation and prevented canvas context menu.

## Independent source and unit inspection

`map-flight-plan.ts` shares bounded fix validation/allocation between named, anonymous and combined waypoint operations. `createWaypoint` validates finite regional coordinates, available library capacity, safe identifier state and available intermediate-point capacity before either mutation. It then appends a copied anonymous custom fix and copied route point, stops the active leg and publishes one immutable snapshot/callback. Rejected operations retain cached state identity, active navigation, callbacks and the next fix ID. Existing endpoints and ordered points survive; coordinates/custom provenance remain copied rather than derived from an identifier. Repeated identical coordinates remain separate custom identities, while zero-length legs retain the existing activation guard.

The candidate `practice-map.ts` handler arms only on an eligible active canvas press. The document's first-activation capture guard prevents an inactive press from reaching that listener. Movement beyond five CSS pixels, button loss, modifiers, cancellation, blur, page/map hiding or disposal cancels/invalidates the gesture. Matching release on the actual exposed canvas unprojects screen CSS coordinates through MapLibre and invokes the single combined transaction; duplicate releases cannot create twice. A recent-gesture record suppresses the canvas's browser context menu both before and after release, including when a newly added marker is now under the pointer. Ordinary control/marker context menus retain their default behavior because a new pointer-down clears the old record. Mac Ctrl-click is supported without also filling the separate left-click Pick form. This path does not replace ordinary left picking/panning.

The success/error message uses inert text, retains tile-failure status and expires through the existing map-status refresh. The model's regional/count limits bound new marker/route work. Gesture listeners are removed through the controller's disposer; closing/hiding the map clears pending state. The transaction has no engine/radio/AP/terrain/recording/storage/network access. Current Review plans share this map-only state, separate from the historical aircraft frame. Existing map interaction still neutralizes transient live input; no new native write path was added.

Independently executed `node --test app/src/map-flight-plan.test.ts`: **17 pass, zero skipped**, `/tmp/gefly-waypoint-quality-model.log`. The three added combined-operation cases meaningfully check single-notification success, endpoint/order/provenance preservation, navigation stop, both capacity failures, invalid/non-finite coordinates, unchanged snapshots/callbacks and no failed ID consumption. Independently executed `npm --prefix app run check`: pass, `/tmp/gefly-waypoint-quality-types.log`. After the complete integrated code freeze, independently reran TypeScript: pass, `/tmp/gefly-final-quality-types.log`; scoped implementation `git diff --check` passes. Source/evidence hashes below identify the final frozen inspected artifact.

## Runtime evidence

Inspected the integration owner's passing ten-group `output/flight/right-waypoint-legacy-plan.log` against the candidate source. It retains named/anonymous creation, exact map picking, published/custom route editing, direct-to, popup lifecycle, filters, live/Review and tile/source-failure behavior. Inspected full unit/build logs: 445 Node tests plus twelve Python tests pass with zero skips; production build passes. These were executed by the integration owner, separately from the reviewer's targeted checks above.

The new actual-mouse browser source meaningfully checks canvas activation, exact MapLibre release coordinates, context suppression, endpoint/plan-stop/native/AP/radio/FOV boundaries, Ctrl-click/right-drag/control-menu behavior, left Pick, hide cancellation, invalid region, tile-failure feedback, waypoint capacity/failed-ID allocation and live/Review creation. It exposes read-only map/store observations without stubbing the operation. The author and a separate independent validate agent each completed all six groups with exit 0 on the final repaired source. Inspected stable `map-waypoint-author-browser.json` and `map-waypoint-validation-browser.json`; the latter is pinned separately so a future rerun cannot silently replace it. This reviewer inspected both results/source rather than running their browser processes. The Review screenshot shows the new anonymous point and numbered route label, explicit current-plan/Review context, and combined creation/tile-failure feedback. The independently observed failures were retained and repaired rather than replacing actual panning with a synthetic outcome.

## Frozen source hashes

Full-file identities pin this bounded review; the current read-only GPS getter also present in `practice-map.ts` is reviewed separately under TODO 2.0.128.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `app/src/map-flight-plan-types.ts` | `2c3bb3e9a536fa0907e912b5e1b12624069efaf542a66e5d0148c6412afcbf5c` |
| `app/src/map-flight-plan.ts` | `20d456997d58575a7c866b218b5dc48ea8c0c9099b5a460cdf343a0eaacc2c90` |
| `app/src/map-flight-plan.test.ts` | `bde474662a63927f180470a6bd99eaf425eff4dcdf96737c78bb469ced68b150` |
| `app/src/practice-map.ts` | `c5658fa8eaab8fbb289b606eb7ad75132504a3c6497fe4b9fc6d2300b58d0318` |
| `app/tests/map-waypoint.browser.mjs` | `8652f096ff692f382927242f5e989604bce5593c0ec2bb9fb181f8f9ea068c5b` |
| `app/tests/flight-actions.mjs` | `588ce4ae5a929cd8aea7c64f2af64e0b28427fbf9d8a0c2e9085f7ef09b1dff8` |

## Inspected evidence hashes

Disposable output identities name inspected evidence, not versioned acceptance claims.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/gefly-waypoint-quality-model.log` | `0893917734a1ed7e5f5a851829cd2f1ef9bd02f704d0357cb72a097589992807` |
| `/tmp/gefly-waypoint-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `/tmp/gefly-final-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/map-waypoint-author-browser.json` | `2743c1187a2cb182a6649f68b926b447a22b064788bafc4a360b36be85c0d73c` |
| `output/flight/map-waypoint-validation-browser.json` | `2743c1187a2cb182a6649f68b926b447a22b064788bafc4a360b36be85c0d73c` |
| `output/flight/map-waypoint-pending-follow-before.log` | `4f89a9419ce33f4c9c9c4ce4fc5bac827535ba8c9cf40ef1a59c4ef44f45b2c3` |
| `output/flight/map-waypoint-browser.log` | `e151e6ffabc13f0725558005015770cc00154e55ed77843be06d1c529a0bf436` |
| `output/flight/map-waypoint-review.png` | `7a151ffec2c7909259767808b0679e2b7432994cbf665b1ae314c0a3d4a59772` |
| `output/flight/right-waypoint-legacy-plan.log` | `2d0b9331f00171bb920dccbae8379208a8c19f37c639eb152bf2f1a12050d28b` |
| `output/flight/final-gps-unit.log` | `e4696109b88c01cff09de572b7baa6c93bbf834cc1197f35543bafd9ba589486` |
| `output/flight/gps-bearing-build.log` | `c4af66d93b72ad5be8e8afcab07a92b01fd23ebbc9b5d217a987ebb7c7cfa756` |
| `output/flight/gps-bearing-legacy-plan.log` | `2d0b9331f00171bb920dccbae8379208a8c19f37c639eb152bf2f1a12050d28b` |

## Limits

The earlier ten-group legacy plan result predates the bounded Follow repair and is retained as regression history. The orchestrator subsequently reran all ten groups on the final GPS/Follow/reset source: `gps-bearing-legacy-plan.log` passes with exit 0. The final independent six-group run exercises the changed pan path directly. No operational flight-planning, data currency, aircraft/training-fidelity or cross-provider acceptance follows from this report; peer remains pending under the existing cadence.
