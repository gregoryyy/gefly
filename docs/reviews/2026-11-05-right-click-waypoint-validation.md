# Right-click map waypoint validation

Reviewed 2026-11-05 01:57 Europe/Berlin by independent Codex `validate`.
Scope: TODO 2.0.127 / R-NAV-5 and R-WORLD-6, following the
[right-button request](../input/2026-11-05-map-right-waypoint.md).
Working-tree base: `700dd5386125f9864a391f85b277cb71da55290a`.
The validator authored neither implementation nor repository acceptance fixtures.

Recommendation: **pass for the bounded local increment at the final hashes**.
The earlier blocked left-pan finding is resolved by the actual Follow repair and
renewed independent browser evidence below. Cross-provider peer remains pending.
No aircraft, GPS/FMS, AP coupling or operational planning fidelity is accepted.

## Independent execution and failed observations

`node --test src/map-flight-plan.test.ts` from `app/`: **17 pass, zero skipped**.
Combined creation checks one immutable notification, anonymous identity/provenance,
preserved endpoints/order, active-plan cancellation, regional/capacity failure
without callback, orphan or consumed ID, and recovery after capacity is freed.

The validator's initial bounded actual Chrome/WASM probe on port 5289 passed
right-click creation, right-drag rejection, Control-click creation and paused
native/AP/radio invariance: step 0, digest `14650fb0739d0383`, no browser error.
It used earlier practice-map snapshot `b70fd2752493ccf98086ddefba233785fd3020f4a2afcc880b0df66b6d244a7a`.
This observation remains historical and is superseded for affected behavior.

An independent full-browser run on source `82ac054a1fef2d9e33894530069336c8c1ee7f5ec5f1b90fbcea6daa533b9abc`
and fixture `8d95f2d056d6e7a5bff4b413e78474fd2ca64faae08a430d92bf2a69987de25d`
failed at the first left-pan check: no dragstart, unchanged center
`[8.643,49.95999999999998]`, enabled dragPan, Follow true and canvas context
prevented. It was not accepted as a successful fixture. Later investigation
proved a product cause: periodic Follow `jumpTo` called MapLibre stop while a
mouse pan was armed but had not yet moved, canceling the pending gesture.
The causal before-repair log records `jumpTo` while `dragPan.isActive()` was true.
A separate first-activation canvas-context repair prevents an unintended native
browser menu while retaining native menus on actual controls.

The final source skips Follow `jumpTo` while the public dragPan handler is active.
The renewed fixture holds primary down for **350 ms**, spanning the host's
250 ms Follow repaint interval, requires the pending handler to remain active,
then performs RAF-spaced human-rate movement and awaits actual dragstart/center
change. The meaningful pan outcome is retained; the original failure is not
reclassified as a pass or hidden by dropping the assertion.

The validator independently ran the final frozen
`node tests/map-waypoint.browser.mjs` from `app/`: **exit 0, all six groups pass**,
Chrome 156.0.8078.80. It uses the actual map/application/JSBSim with deterministic
scenery pixels. The final six groups cover every UI criterion below, including
30-waypoint exhaustion, live flight and current-plan Review. The generated JSON
is a deterministic browser/check summary, identical in bytes to the author's
preceding summary; independent execution is established separately by the
observed tool command and exit 0, not by attributing that summary to a unique run.

The integration owner also ran the ten-group legacy planning browser and
445 Node + 12 Python cases, with the final UI build passing. Their logs were
inspected; these are distinct from independent execution. No broad unrelated
terrain/panel suite is claimed anew.

## Criterion matrix

| Criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Direct creation and identity | Active canvas right click directly creates one anonymous fix and appends one intermediate waypoint, without a dialog | pass: independent actual browser plus 17 model cases; unique generated label, anonymous flag, source/coordinates and route identity preserved |
| Exact geographic position | Use the actual canvas event position in WGS84 degrees | pass: actual browser compares stored point to MapLibre unprojection of real pointer-release coordinates within 1e-10 degrees; requested fractional screen coordinates are not treated as the event |
| Atomic bounds and count limits | Region, 64-fix and 30-waypoint failures leave no orphan, partial edit, callback or consumed ID | pass: independent model cases cover both capacities and regional boundaries; actual browser fills 30 waypoints, rejects overflow with unchanged snapshot, frees one and proves the next ID was not consumed; invalid-region UI failure also preserves the snapshot |
| Endpoints and navigation transitions | Preserve start/destination/order; insertion stops active plan navigation through existing edit semantics | pass: actual complete-plan edit preserves exact endpoint snapshots and clears active leg/GPS line; independent model case publishes exactly once and keeps waypoint order |
| First activation and ordinary panning | Initial overlay gesture activates without creating; left pan survives Follow repaints | pass after repair: final independent actual first-activation/context assertions and 350 ms pending-pan regression pass, followed by actual center change and Follow off |
| Right drag, Control-click and native menus | Right drag cannot create; Control-click creates once; native control context menus remain native | pass: final independent actual right drag leaves snapshot unchanged, Control-click creates once without source popup, canvas context is suppressed while a native control context remains unprevented |
| Existing Pick and gesture cleanup | Left Pick remains confirmation-based; close/reopen and cancellation do not complete stale right gestures | pass: actual left Pick fills coordinates without creating, and hiding/reopening mid-press cancels creation; inspected pointercancel/blur/visibility/dispose listeners clear state and are removed on dispose |
| Feedback and source failures | Show success/limit/invalid errors and retain tile-failure warning; keyboard editor remains available | pass: actual six-group run checks visible feedback, failed tiles plus successful creation and retained warning, and uses existing native editor controls; no new storage/network/permission boundary |
| Live, paused, Review and native isolation | Current-plan edits work in each context without changing native/AP/radio/camera/recording state | pass: actual paused step/digest/full-state and AP/radio/FOV invariance; live native steps progress with AP/radios intact; Review edits the current plan against recorded position with frozen native state. Planning store never enters captured flight data |
| Operational/fidelity/peer gates | Separate scope | not evaluated: current operational planning, installed GPS/FMS, GPS AP guidance, aircraft/training fidelity and cross-provider peer acceptance |

## Final freeze and evidence

| Input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `docs/input/2026-11-05-map-right-waypoint.md` | `917d45102948fb67906377cbd82e5c28b432d4d148df23aaa24302411ec31edd` |
| `app/src/practice-map.ts` | `c5658fa8eaab8fbb289b606eb7ad75132504a3c6497fe4b9fc6d2300b58d0318` |
| `app/src/map-flight-plan-types.ts` | `2c3bb3e9a536fa0907e912b5e1b12624069efaf542a66e5d0148c6412afcbf5c` |
| `app/src/map-flight-plan.ts` | `20d456997d58575a7c866b218b5dc48ea8c0c9099b5a460cdf343a0eaacc2c90` |
| `app/src/map-flight-plan.test.ts` | `bde474662a63927f180470a6bd99eaf425eff4dcdf96737c78bb469ced68b150` |
| `app/src/map-flight-plan-panel.ts` | `ec52d3990b2242ab89d5cbf19cbcb380a1510665aad4991b73b204ccd0e6db03` |
| `app/tests/flight-actions.mjs` | `588ce4ae5a929cd8aea7c64f2af64e0b28427fbf9d8a0c2e9085f7ef09b1dff8` |
| `app/tests/map-waypoint.browser.mjs` | `8652f096ff692f382927242f5e989604bce5593c0ec2bb9fb181f8f9ea068c5b` |

Local evidence under `output/flight/`:

| Evidence | SHA-256 |
| --- | --- |
| `map-waypoint-validation-browser.json` (independently renewed deterministic summary, preserved by integration owner) | `2743c1187a2cb182a6649f68b926b447a22b064788bafc4a360b36be85c0d73c` |
| `map-waypoint-author-browser.json` (author's preserved preceding summary) | `2743c1187a2cb182a6649f68b926b447a22b064788bafc4a360b36be85c0d73c` |
| `map-waypoint-browser.log` (author's final run) | `e151e6ffabc13f0725558005015770cc00154e55ed77843be06d1c529a0bf436` |
| `map-waypoint-pending-follow-before.log` (failed causal reproduction) | `4f89a9419ce33f4c9c9c4ce4fc5bac827535ba8c9cf40ef1a59c4ef44f45b2c3` |
| `right-waypoint-legacy-plan.log` | `2d0b9331f00171bb920dccbae8379208a8c19f37c639eb152bf2f1a12050d28b` |

No unresolved in-scope failure remains at this freeze. Page-session storage,
current-plan Review, spherical visual navigation and no GPS AP-coupling limits
remain. Broader device/OS behavior, hosted CI/publication and fidelity are not
accepted. Changed artifacts require renewed affected review.
