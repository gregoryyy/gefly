# Camera-projected aircraft-forward marker

Scope: TODO 2.0.19, partial R-VIEW-1/R-INPUT-1/R-REVIEW-1.
Authors: Codex orchestrator/integration; fov_input/code1 on pure projection/tests,
forward_ui/code2 on the overlay, and fov_housekeeping on app instructions in
parallel. Independent quality: fov_housekeeping, excluding its own prose.
Independent validation: trim_validate, no implementation authored.

Implementation SHA-256: `ef22bbab2bc441824ffec57270ba6060d42c27ae72f5834652eb83683b40d15c`.
Sorted paths (path + NUL + bytes + NUL; shared prose excluded):

app/package.json, app/src/forward-marker-projection.test.ts, app/src/forward-marker-projection.ts, app/src/forward-marker.css, app/src/forward-marker.ts, app/src/main.ts, app/src/scene.ts, app/src/style.css, app/tests/forward-marker-smoke.mjs.

## Independent quality

Final affected source review passes with no remaining findings. Projection uses
actual vertical FOV and camera-axis components, finite validation, near-plane
stability and ray clipping. Short-view safe rectangles clamp the cue origin;
in-view positions retain exact perspective coordinates. Behind-camera or invalid
directions hide. DOM updates contain no input handlers or physics writes, the
single marker disposes before Cesium, and its geometry is scene-local CSS pixels.

Fixed P1: Cesium declares optional frustum.fovy; a typeof-number guard now hides
unavailable projections, with finite/range checks in the pure helper. TypeScript
passes. Fixed affected stacking: z5 clears virtual controls and recorded-Review
bar, below Map z6/header z8; pointer-events:none preserves underlying controls.

Six native projection groups independently passed: known perspective offsets,
aspect/FOV, clipping, short viewport, near-perpendicular/invalid/extreme finite
inputs, aircraft/camera attitudes and immutable inputs. This is geometric UI
verification, not installed HUD or aircraft-physics validation.

## Browser evidence and validation

Actual Chrome 156.0.8078.79 with Cesium 1.146.0. The focused regression passes five
groups: look-right moves marker left and look-left moves it right; offscreen
front uses a bounded edge chevron and behind-camera directions hide; temporary
live look returns on release; retained Review look/seeking preserves marker and
frozen physical state; FOV/view/resize/mobile recompute it. The existing five
FOV regression groups also pass. Native app suite passes 98 tests plus five
Python aircraft-adapter tests; TypeScript/UI build passes.

The default cockpit gaze remains 8° down, so a front direction behind header UI
becomes an edge cue below it. Looking up slightly brings the nose crosshair
into view; sideways looking moves it across the scene. Marker position uses
the displayed aircraft state, actual Cesium camera axes and frustum, not
pointer displacement, velocity or a centered HUD approximation.

The independent validator computes its own ENU→ECEF body direction and camera
projection and compares actual CSS pixels, including live/paused/recorded views,
FOV, view/resize and exact paused 14-value physics/step/digest invariance. A fresh
mobile Review screenshot exposed equal-z occlusion by the Review bar; raising
the pointer-transparent marker to z5 resolves that affected visibility issue.
Final independent affected runtime passes: the mobile cue is visibly above the
Review bar, pointer-events is none, elementFromPoint reaches review-time and
actual seeking through it preserves physical state/step/digest. Evidence:
forward-independent.json and forward-overlay-independent.json/png.

Reproduce: `npm --prefix app test`, `npm --prefix app run build`,
`node app/tests/forward-marker-smoke.mjs`, `node app/tests/fov-smoke.mjs` after
`just build-flight-engine`. Rebuildable ignored evidence is in output/flight:
forward-marker-browser.json, forward-marker-{centered,looking-right,wide,mobile}.png
and independent forward-marker reports/screenshots. Shared CI passed on the frozen implementation, including 98 app native tests,
five adapter tests, UI build and repository/assurance/assessment gates. Optional
JSBSim and Linux-only checks remain explicit skips. Publication assurance
outcomes are recorded in DONE; previous failed compile/visibility observations
remain historical repair evidence.

## Limits

This indicates aircraft body-forward direction, not flight path, a velocity
vector, pilot input or a certified C172 instrument. Behind-camera directions
and invalid/empty viewports are hidden; other foreground windows such as Map
retain display priority. Physics/input streams and camera behavior are unchanged.
Existing generic-model/scenery/training limits remain, and peer review is pending
under the batched cadence.
