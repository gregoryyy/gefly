# Centered touchpad: independent quality and validation

Reviewer: Codex subagent `centered_pointer_quality`, 2026-11-03,
Europe/Berlin. Base: `5981845a367e7881b8005b3c3d68fb48e1d5ca73`;
reviewing the integrated `feat/centered-touchpad` working tree. The reviewer did
not author the implementation, maintained tests or shared requirements.
Cross-provider peer remains **pending** under the existing batched cadence.

## Quality

Quality: **no blocking findings**. Specification validation: **pass for the
exercised R-INPUT-1 / TODO 2.0.50 increment**, within the limits below.

The opt-in setting is a validated session-only boolean, initially false. It does
not enter control-command mapping; the pointer controller reads the live option.
Both sensitivity presets retain both pointer/rudder preferences. Checkbox labels
and their explanatory text have native accessible relationships.

Centered pointer input reads the current scene rectangle on movement/re-entry;
click/release coordinates cannot replace its reference. The existing bounded
150 px travel and look-angle limits are retained. Looking neutralizes axes and
release does not issue a drop-position control command; same-coordinate moves
remain neutral until actual movement, while re-entry is authoritative. Default
relative-anchor behavior remains on its existing branch.

The controller separates ordinary cancellation from explicit reset. In the new
mode, pause, focus/visibility loss, interrupted capture and Options clear transient
yoke state while preserving the view. Escape and flight restart explicitly reset
look; disposal clears capture, timers and listeners. Review is still look-only.
The main loop passes the retained camera offsets to the renderer separately from
aircraft state. No new pointer lock, storage, device permission, external service,
aircraft coefficient or simulation-step change is introduced.

The neutral reference is the visible flight-view center, an implementation
interpretation documented in the immutable input record. Browser pointer events
do not provide physical touchpad contact coordinates. This review does not turn
that interpretation into an additional user answer or a hardware calibration
claim.

## Independently executed evidence

| Check | Observed result |
| --- | --- |
| `node --test app/src/pointer-yoke.test.ts app/src/control-settings.test.ts app/src/field-of-view.test.ts` | **32 pass**, zero failures/skips. Covers legacy pointer behavior, current-rectangle center, repeated/off-center clicks, bounds, accumulated view, release neutrality/re-entry, cancellation/visibility/capture/Escape/reset, Review, boolean/default/mapping invariance and FOV separation. |
| `node app/tests/centered-touchpad.browser.mjs` | **Six groups pass**, actual Chrome 156.0.8078.80 and JSBSim. Off-default Options/presets; off-center clicks/current midpoint; cumulative retained drag/release neutrality; Options/blur/resize/map docking; read-only Review/Escape; restart preference retention, zero page errors and no external browser destinations. The read-only command observer copies actual staged app commands while paused; it does not claim those are already applied native controls. |
| `node app/tests/pointer-yoke.browser.mjs` | **Three groups pass**, actual Chrome/WASM with the option off: paused and live original-anchor behavior, actual transmitted commands, outside release/re-entry and intentional short-click re-anchoring. |
| `node /tmp/gefly-centered-quality.mjs` | **Four groups pass**, actual rendered body-forward marker retains its changed projection after release and Options/blur; Escape restores the baseline projection. Paused native step/digest/final state remain identical. A brief live check confirms actual native aileron/elevator outputs at the current center and a known displacement. |

Shared CI, build, assurance and publication are orchestrator-owned evidence; they
are not commands claimed as independently executed here. Browser background
pixels are fixtures; no upstream-image availability, physical device calibration,
aircraft fidelity or training benefit is inferred.

## Scoped specification validation

| R-INPUT-1 / TODO 2.0.50 criterion | Evidence | Outcome |
| --- | --- | --- |
| Optional off-default mode, session-only preference, presets retain selection | Source, focused units and actual Options/preset checks | **Pass** |
| Current flight-view midpoint after off-center clicks, resize and map docking | Unit geometry/re-entry cases and actual off-center/resize/map-docking browser cases | **Pass** |
| Hold-drag accumulates and retains camera angle without automatic recentering | Source/unit cancellation split, actual retained-angle and rendered-marker cases | **Pass** |
| Neutral during look/release; actual subsequent motion/re-entry authoritative | Focused units, staged pending-command observations while paused and actual live native outputs | **Pass** |
| Pause/focus/Options preserve view, Escape/restart explicitly center | Source/units and integrated Options/blur/Escape/restart cases | **Pass** for inspected/exercised lifecycle |
| Review stays read only and default relative control is preserved | Focused units and new/legacy actual-browser checks | **Pass** |
| Paused input/camera changes leave native step/digest/final state unchanged | Actual JSBSim step/digest/final-state comparisons in maintained and extra browser cases | **Pass** |
| Physical touchpad calibration, optional controllers, aircraft handling/training approval | Outside this scoped increment | **Not evaluated** |

## Reviewed snapshot

Independently re-hashed every path in the final nine-path
`path + NUL + SHA-256 + newline` packet. SHA-256:
`4f9ddb1df233553af7584c30e60116be42c0e97beb934dbc2de02f3b0436db72`.
It covers main, pointer core/tests, settings/panel/CSS/unit tests, package script
and the new maintained browser test. Review prose and changing shared documents
are outside that runtime packet. Changed covered bytes require affected renewal.

The earlier packet `b87fbd3063e46e319aad8b467c0f85844f72d3bdbbd2a5222cde779ab8c67d4e`
matched the eight product/unit/package paths but not the browser test after
its harness repairs. It is not final acceptance. The author corrected subpixel
pointer tolerance, whitespace matching in the Vite-transformed source observer,
and observation of paused staged commands rather than stale worker messages.
These test-only changes do not relax the fixed-center or retained-view criteria;
unsuccessful harness attempts are not passes. The independent rerun passed the
final maintained test and separately confirmed actual rendered and live-native
behavior.

The independent rendered projection changed from `(720, 84)` (bounded edge cue)
to approximately `(414.58, 206.56)` while looking, stayed identical after release,
Options and blur, and returned to the original projection on Escape. These
camera-only cases retained native step 74 and identical digest/final state.
The subsequent live check observed aileron `−0.109375` (only the existing study
correction) / elevator `0` at centered pointer position on step 75, then
aileron `0.140625` / elevator `0.2` at +75 px right / −75 px vertical on step 80.
This proves the tested UI command path reaches the pinned generic native model;
it is not installed-aircraft handling or hardware calibration acceptance.

Disposable evidence: `output/ci/centered-touchpad-independent-browser.log`,
`output/ci/centered-touchpad-independent-legacy.log`,
`output/ci/centered-touchpad-independent-extra.log` and
`output/flight/centered-touchpad-quality.json`. All browser/server sessions were
closed after the checks.
