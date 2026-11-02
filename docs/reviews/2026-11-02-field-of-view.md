# Scene scroll controls field of view

Scope: TODO 2.0.9, partial R-INPUT-1/R-VIEW-1. Camera presentation only.
Authors: Codex orchestrator/integration, fov_input/code1 and fov_scene/code2 in
parallel, with fov_housekeeping updating app instructions alongside them.
Implementation SHA-256: `e5c4c0f82eec8144d5df0ae9f682280afdd3155b95f0cfc21297ef9d0a1c08bc`. Sorted paths:
app/package.json, app/src/aircraft-orientation.test.ts, app/src/aircraft-orientation.ts, app/src/field-of-view.test.ts, app/src/field-of-view.ts, app/src/main.ts, app/src/scene.ts, app/src/style.css, app/src/types.ts, app/tests/fov-smoke.mjs; each path + NUL + bytes + NUL. Shared prose excluded.

## Independent quality

Reviewer: Codex fov_housekeeping, excluding its own app README. Final code quality
passes with no findings. Vertical scene wheel input normalizes pixel/line/page
units, caps event magnitude and bounds FOV to 20–100 degrees (default 60). It
ignores horizontal/Ctrl/Meta/Alt/pinch/editable/modal events. State and disposal are
separate from yoke/look and physics; actual Cesium perspective FOV is applied
before rendering. Resize/view changes retain it independently of gaze offsets.
Twelve focused native FOV/orientation tests passed independently.

Initial actual-browser testing found P2: Cesium's canvas handler prevented the
wheel event before the parent bubbling listener, so FOV remained 60. The final
listener is non-passive in capture phase, with matching capture removal, and
handles eligible input before Cesium. Affected source/native/browser review
passes. Ignored Ctrl/pinch events bypass this FOV control; no browser-native zoom
guarantee is inferred about downstream Cesium handling.

A shorter-desktop pause overlay also intercepted the cockpit button at 1200×800.
A scoped compact gate layout keeps the header available. Affected independent
quality passed; code1, who did not author that CSS, confirmed the actual paused
view-button click at 1200×800 in the final regression.

## Independent validation

Reviewer: Codex altimeter_validate, no implementation authored. Actual Chrome:
real canvas scroll changed 60→51.6→60 degrees and the rendered image visibly
zoomed. Full paused physical state and WASM digest remained identical. Bounds
20/100 were reached with capped events; 74.1 degrees survived cockpit/chase,
resize and R reset; reload restored 60. Active yoke mode, axes (roll −0.06,
pitch 0.03) and outgoing input count two stayed unchanged through scroll.
Map wheel and mobile engine-dialog scrolling stayed separate. Modifier and
horizontal events left FOV unchanged; no page errors occurred.

The focused browser regression passes five groups: rendered zoom/bounds and
paused invariance; view/resize retention; modifier/UI isolation; active yoke and
recorded review; reset/reload behavior. It checks an unobstructed scene region,
not merely changed HUD text. TypeScript/UI build and 70 native tests plus five
Python adapter tests pass with zero skips in those suites. Rebuildable logs and
visually inspected narrow/wide screenshots remain ignored under output/flight/.

## Limits

Trackpad vertical scrolling is received as browser wheel events; the same handler
also supports a mouse wheel. Physical finger hardware was not automated. FOV is
Cesium's horizontal angle in landscape, vertical angle in portrait. It changes
perspective rather than aircraft/camera position. Preference lasts for this page,
survives flight reset and is not a historical flight value or persisted setting.
Existing aircraft/training limits remain; peer pending under the batched cadence.
