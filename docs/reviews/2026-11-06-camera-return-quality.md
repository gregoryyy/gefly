# Camera return and chase response — quality review

2026-11-06 16:18 Europe/Berlin. Task2.0.178; R-VIEW-1 / R-INPUT-1 / R-UX-2.
Reviewer: Codex `/root/camera_return_housekeeping`, reassigned to independent
quality. The reviewer authored only the preceding source-inventory note, and did
not author or repair runtime code, tests, requirements or integration reviewed.

## Initial outcome and scope

**No blocking implementation findings in the inspected scoped snapshot.**
Publication browser evidence and final integration CI are pending at this initial
review point; they are not reported as passing. Specification validation and
cross-provider peer review remain separate outcomes.

Reviewed root changes against `output/camera-return-before`, the publication
worktree `/private/tmp/gefly-camera-return` against parent commit
`5f8ff7306b7d088138f6b5e59579698b3e35b5e0`, new return/preference helpers and
tests, the analytic chase response, pointer callback/synchronization changes,
main integration, revised R-VIEW-1 and SEC. Root contains unrelated work and
pre-existing surrounding UI/input differences; this review does not accept those
features or treat the publication as a full copy of root.

## Source identity

Independently computed the following SHA-256 values in both trees. Shared helper
bytes match; main, pointer and scene retain their pre-existing surrounding
publication/root differences. The browser observer pins the complete files.

| Application-relative path | Working-app SHA-256 | Publication SHA-256 |
| --- | --- | --- |
| `src/main.ts` | `2c883da2c5c996948caa371c710d3ff9f69bd8d4a55b0f38b56b557eb0ac7129` | `f3eaca90fe7e4570486a4650a7da66c5d0cccded7600febe3bb29c43cf9db6d9` |
| `src/pointer-yoke.ts` | `01b70ea4c83891835535449e97eed4c89a60f0d07703f286b4d9a4c85f686d76` | `7b975d0778f2aeca730ff608be57bd7dacc1cb48eac71978827276a4ece1dfca` |
| `src/chase-distance.ts` | `aa786ff673050d4059220da44ccf13a92405b4b6c2e0eac38c90cf40c9da9745` | Same |
| `src/camera-return.ts` | `4c10e39aebcf10b21b9d0897120351d037c822413079a21a09d37e3b4a61170b` | Same |
| `src/camera-preferences.ts` | `fbd5e9963b3712426a8dd1a07a4211fac696432260ea28e378de72f5c618f055` | Same |
| `src/scene.ts` | `63de768859232ac66544292eb7f4da4b1588df777a0419d08894dd2319d12e3a` | `d7e74750c5e3992ae08829abc2f27aa5c3a20da070c86f8c952ff353a4c110bb` |
| `tests/camera-return.browser.mjs` | `bf6a91e715dc3ad6e1934a85fe529c932fdf35d586b219f13d55604f6ca0578d` | Same |

## Review observations

- The pure return helper depends only on poses and explicit wall-clock values.
  It copies inputs/outputs, validates finite angles/positive compatible radii and
  timing, clamps progress monotonically, handles cancellation without a stale
  endpoint, and returns exact target values at completion. Short-yaw interpolation
  avoids the long circular route; logarithmic radius avoids a huge linear jump
  from Earth scale. Quintic easing has zero endpoint first/second derivatives.
  Extreme finite radius interpolation is bounded to the endpoint interval.
- The close chase mapping integrates its distance-dependent logarithmic response
  analytically, with inverse `log1p`/`expm1` transforms. Finite positive supported
  radii keep the transform domain safe. The near/far segments meet in value and
  first derivative at one kilometre. Wheel travel remains additive/reversible
  away from saturation, while existing unit conversion, per-event travel clamp
  and min/max distance bounds remain. Coefficients are visibly UI policy rather
  than aircraft values. Chase FOV is not modified by this path.
- Main advances the transition once from the existing render loop, separate from
  native stepping and replay-rate updates. Applying a pose only updates camera
  values, pointer look reference and UI text; it does not publish flight input.
  Selected aircraft position/heading still determine the camera pose each frame.
- The reset callback receives a detached pre-reset look while retaining existing
  neutral-control/mode ordering. `synchronizeLook` performs no callbacks and
  rejects active-pointer, disposed or nonfinite updates. Fresh pointer-down
  cancels animation before drag initialization, preserving the displayed look
  reference. Wheel, view, reset, Review, blur/hidden and teardown paths cancel;
  option-off/reduced-motion changes finish immediately. Event listeners are
  removed on pagehide. No polling/timer service or new worker is introduced.
- The saved record contains only version and a strict boolean, with a UTF-8
  128-byte admission bound and safe unavailable/corrupt-store behavior. Explicit
  false survives. Pose, aircraft data, controls and recording content are not
  persisted by this helper; restore does not start flight or unlock audio.
  The View action is a native accessible pressed-state button, has no invented
  shortcut, and describes reduced-motion override in its title.
- New tests exercise trajectory, short-angle wrap, monotone positive Earth-scale
  radius, wall-clock/frame-rate independence, restart/cancel semantics, extreme
  finite values, input rejection, preference restoration/failure, wheel response
  continuity/subdivision and pointer callback isolation. Existing callback-order
  assertions remain. The old chase browser's gain/timing assumptions are being
  renewed rather than weakening its actual camera/native assertions.

## Checks actually performed

Reviewer independently ran in the publication `app` directory:

```
node --test src/camera-return.test.ts src/camera-preferences.test.ts src/chase-distance.test.ts src/pointer-yoke.test.ts
```

**40 passed, 0 failed, 0 skipped**: eight return, two preference, six chase and
24 pointer cases. Reviewer did not rerun the browser or duplicate integration CI.

Inspected the supplied focused browser harness: its served-module insertion
observes public Cesium camera values without replacing the renderer, and its
Worker wrapper forwards actual commands while observing native states/stats.
The pause invariance and no-command-during-animation assertions correctly
separate existing double-click neutralization from interpolation itself.

At this initial review point, the working-app focused artifact independently
reports **pass, five groups, zero page errors**, Chromium156.0.8078.80, and all
seven pinned source hashes match. It observes intermediate actual chase/cockpit
frames with fixed lens, repeated return, gesture/view/synthetic-blur cancellation,
saved-off reload and reduced-motion instant return. Publication and legacy
browser outcomes must be attached in a renewal before their acceptance.

## Evidence limits

The browser uses fixture scenery with actual Cesium/native WASM. Its blur event
is explicitly synthetic; real hidden-tab/pagehide behavior is source-inspected,
not separately browser-measured. Live animated return, saved-on reload, browser
corrupt/denied storage and runtime reduced-motion preference switching are not
separate passing browser cases here; helper/source coverage is distinct. Timing
unit tests establish the 700ms calculation; displayed frame completion is subject
to rendering cadence. Embedded WebKit, all hardware/browser performance,
terrain/geography fidelity and aircraft/training validity are not established.
Any changed runtime/data/harness hashes require affected renewal. Cross-provider
peer remains integration-owned and is not satisfied by this same-provider review.


## Working-app legacy regression observation

2026-11-06 16:20 Europe/Berlin. Independently inspected the renewed working-app
`chase-zoom-browser.json`: **pass, four groups, nine named observations**, zero
page errors. All seven artifact source pins match current root files. Artifact
SHA-256 `710aa7a38f796bb190b165c948bea15b4fb3bf22ed70d9935213c891c40787dd`.
The focused five-group artifact SHA-256 is
`4d6fd224d846629d76099a2448e53b09db546c8a97cb3ed43293427a623a96a1`.

Inspected the legacy harness delta: it explicitly disables the optional return
animation to retain its immediate-reset assertions; the dedicated suite measures
animation separately. First-scroll response and the maximum-distance loop are
updated for the new close gain (20 large gestures), while actual target-ray,
fixed-lens, 20Mm bound, top-down pose, guard, live moving-aircraft and paused
Review assertions remain. This separates the two supported option states without
silently skipping the older behavior. Reviewer ran `just check`: passed551
Markdown files; this is structural checking, not browser or physics validation.

## Final evidence renewal and outcome

2026-11-06 16:24 Europe/Berlin. This renewal resolves the initial publication/
integration evidence pending state above. **No blocking quality findings** for
Task2.0.178's scoped implementation and observed camera behavior. Runtime/helper
source hashes remain unchanged from the inspected snapshot.

Reviewer independently reread all four final browser artifacts and recomputed
all seven source pins for each artifact against its own checkout. Every pin
matches. No artifact reports a page error.

| Context / supplied actual-browser suite | Outcome | Artifact SHA-256 |
| --- | --- | --- |
| Working app, return animation | Pass, five groups | `4d6fd224d846629d76099a2448e53b09db546c8a97cb3ed43293427a623a96a1` |
| Working app, chase regression | Pass, four groups | `710aa7a38f796bb190b165c948bea15b4fb3bf22ed70d9935213c891c40787dd` |
| Publication, return animation | Pass, five groups | `9a7eb3accf95249052aa773136594874932e86eddf829bff0d3ebaa4406ed8f7` |
| Publication, chase regression | Pass, four groups | `43034152fe1de60cbd9c7c3c4c6a621e669cfc394d44b8af390dce72bfe4fb13` |

The return suite supplies actual intermediate fixed-lens cockpit/chase poses,
repeated-return continuity, cancellation, preference-off reload and reduced-motion
snap observations with paused native step/digest/final-state invariance. It also
checks no worker command is issued during interpolation after the pre-existing
reset gesture. The legacy suite explicitly exercises immediate reset, full20Mm
range, true-pole orbit, independent cockpit/overview controls, live moving-target
follow and paused Review. Both legacy artifacts record39 actual gaze evaluations;
maximum direction error is approximately3.07045×10⁻¹¹. These are camera/software
observations with fixture scenery, not terrain or aircraft-fidelity results.

Reviewer inspected the completed publication `output-camera-return-ci.log`:
Foundation CI passed with nine existing optional JSBSim study skips. It reports
620 application Node tests,22 application Python tests,85 assurance tests and11
training tests passed; repository tooling runs243 discovered cases with one
platform skip, JSBSim study14of23 executes, and C172S study25passes. Tracked-content
whitespace passes2151 tracked paths, explicitly excluding untracked files.
The reviewer independently executed the40 focused tests above, but inspected
rather than reran this full pipeline and the browser executions.

All remaining evidence limits above remain explicit, including embedded WebKit,
real hidden-tab/pagehide browser lifecycle, continuous live animated return and
cross-provider peer. Independent specification validation and the integration
owner's final assurance check/diff remain separate responsibilities. This bounded
quality result does not accept unrelated working-tree features or establish
physics/training validity.
