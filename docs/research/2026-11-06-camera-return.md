# Camera return animation and close chase zoom inventory

2026-11-06 16:07 Europe/Berlin. Task2.0.178; R-VIEW-1 / R-INPUT-1 / R-UX-2.
Author: Codex housekeeping subagent `/root/camera_return_housekeeping`.
Source inspection and integration proposals only; no runtime acceptance is claimed.

The user asks for an animation option when double-clicking back to normal in
cockpit and chase views, and asks whether the strong initial reduction in the
chase aircraft's apparent size comes from changing focal length. This note records
the pre-change implementation and proposed evidence. The orchestrator owns the
requirements, shared status and final integration records.

## Inspected behavior before this increment

- [Chase distance](../../app/src/chase-distance.ts) changes radius only. Its
  original wheel response is `distance × exp(clampedPixels × 0.006)`, with a
  minimum/initial radius of `hypot(30, 11)` metres and a maximum of 20,000,000 m.
  Pixel, line and page input are converted to bounded pixel travel.
- At that original gain, 100 pixels produces a radius factor of about 1.822. In
  perspective projection with an unchanged lens, a fixed-size object therefore
  has approximately 54.9% of its previous linear screen size. This is a roughly 45%
  reduction, explaining the strong first zoom response without a focal-length
  change. This is a calculation from the camera formula, not measured screenshot
  acceptance or an aircraft-physics value.
- In [main](../../app/src/main.ts), the FOV wheel handler is blocked outside
  cockpit view. A separate guarded scene-wheel handler changes chase or overview
  distance. [Scene rendering](../../app/src/scene.ts) applies the supplied radius
  to the chase pose and separately assigns `frustum.fov = lastFov_rad`.
  Chase scrolling does not change that FOV. The shared lens value may already
  reflect a prior cockpit FOV choice; there is no per-scroll chase lens change.
- [Pointer handling](../../app/src/pointer-yoke.ts) treats scene double-click as
  a guarded explicit reset. It restores the pre-click-pair yoke mode/reference,
  neutralizes the yoke, sets look angles to zero, restores mode and then invokes
  `onLookReset`. Main's pre-change callback resets chase radius to the normal
  30 m behind / 11 m above pose; cockpit's look already reaches zero through `onLook`.
- This callback ordering means main's ordinary `cameraLook` has already been
  overwritten by `onLook(0, 0)` when the reset callback runs. A transition must
  receive/capture the previous observed pose explicitly, without losing the
  established neutral-control and click-pair safety contract.
- The render loop uses camera values from the selected live or recorded aircraft
  state. Those view values do not belong to deterministic aircraft state. Current
  orbit/radius/FOV values are page-local; the requested saved animation boolean
  is a separate preference, not a saved aircraft checkpoint or held gesture.

## Assigned implementation direction

The orchestrator assigned a saved View-menu **Animate view return** option,
enabled by default, with reduced-motion preference causing an immediate return.
Both cockpit and chase double-click should support a bounded transition of
approximately 700 ms. Duration/easing and wheel-response gains are UI policies;
they are not aircraft-specific values. Preserve the lens setting, current
selected aircraft position/heading and existing pointer neutralization.

Code1 owns a pure return-transition helper and tests. Its proposed interpolation
uses the short yaw arc, bounded pitch and logarithmic chase radius with an exact
endpoint. Code2 owns gentler close chase response and its pure tests, retaining
monotonic/reversible wheel travel and a reachable Earth-scale range. Main,
pointer-reset integration, saved preference and lifecycle cancellation remain
orchestrator-owned. No dependency, source asset, license or physics-model change
is needed for this camera-only work.

Proposed cancellation boundaries are fresh look/zoom input, a view change,
restart, focus/visibility lifecycle and disposal. An interrupted transition must
not resume later or overwrite a new gesture. Render-time interpolation must not
change the worker step, rate, controls, autopilot targets or recorded frames.
A repeated explicit reset should begin from the currently displayed pose rather
than jumping back to the original start. These are implementation/review checks,
not reported passes.

## Existing checks affected by the new behavior

| Existing check | Applicability and needed renewal |
| --- | --- |
| [Chase distance unit tests](../../app/src/chase-distance.test.ts) | Preserve finite input, bounds, equivalent wheel units and reversible travel; add the gentler initial response and event-subdivision invariance rather than merely repeating the new formula. |
| [Pointer unit tests](../../app/src/pointer-yoke.test.ts) | Callback currently observes neutral controls, cleared look and restored yoke mode. Retain these semantics while supplying a pre-reset pose, or explicitly renew the contract and all affected callers. Zero-angle double-click must still reset chase distance. |
| [Chase browser regression](../../app/tests/chase-zoom.browser.mjs) | It currently requires a first 200 pixel scroll to exceed twice the initial radius, 13 large scrolls to reach 20,000 km and an exact normal pose 90 ms after double-click. Those old-gain/immediate-return assumptions need renewal. Keep actual Cesium target-ray, lens, native-isolation, true-pole and independent overview assertions. |
| Existing pointer-yoke browser regression | Remains relevant for gesture safety, yoke reference and cockpit look; new animation tests must distinguish intermediate motion from final reset. |
| Saved display preference checks | New preference must be bounded/versioned, retain an explicit off value and fail safely with missing/corrupt/denied storage. Do not persist transient camera motion or resume flight on reload. |

The [scene-wheel security text](../SEC.md) presently describes page-local view
values and no storage calls. The orchestrator should distinguish unchanged
page-local orbit/radius/FOV from the new saved animation option. [SPEC](../SPEC.md)
remains the authoritative requirement location; this note does not define a new
independent acceptance contract.

## Proposed evidence matrix

| Context | Observable evidence to collect |
| --- | --- |
| Cockpit, animation enabled | Nonzero look has at least one finite intermediate pose, ends centered within the bounded duration, retains FOV and never changes aircraft state. |
| Chase, animation enabled | Look and radius converge smoothly to the current heading-following normal pose, including zoom-only and Earth-scale/top-down starts; target remains the selected aircraft. |
| Animation disabled or reduced motion | Explicit reset reaches the ordinary endpoint immediately, with preserved lens and pointer safety. |
| Interrupted/repeated return | New look/zoom/view/reset input wins; repeated return starts from the displayed pose; old animation cannot reappear after focus/visibility/reset/disposal. |
| Saved preference | Both on and off survive application reload; corrupt, unsupported, oversized or denied storage remains safe/session-only. |
| Close-range chase wheel | A small outward gesture gives a visibly smaller radius step than the old response, with no FOV change. Equal aggregate valid wheel travel gives the same unsaturated result, including inverse travel. |
| Long-range chase and overview | Both bounds remain reachable; chase response changes do not alter separate overview distance or cockpit FOV controls. |
| Paused/Review/native boundaries | Camera transitions remain inspectable while aircraft/recording values stay read-only; measured native step/digest/final state remain unchanged when paused. Live view follows the current aircraft without commanding its dynamics. |

## Scope and limits

No browser or unit suite was run by this inventory task; the cited tests were
read as source. Actual implementation, independent quality/validation, integration
CI and peer status must be attached after the final source is frozen. A passing
camera test would not validate terrain loading, aircraft physics, training
fidelity, all browsers or the user's embedded WebKit environment.


## Delivered behavior and checks

The inventory above is the preparation record. **View → Animate view return**
now saves the animation choice separately from transient pose. It defaults on;
reduced motion uses an instant endpoint. Both cockpit and chase double-clicks
use700ms wall-time easing; chase also returns to the close aircraft-follow pose.
Pointer look references synchronize silently with displayed animation frames,
so a fresh drag can take over. Gesture/view/lifecycle cancellation stops the old
return; camera interpolation has no worker or native-control interface.

Chase FOV was already constant. Its old100px radius multiplier was1.822; the new
analytic coordinate maps31.953→37.506m, a1.174 multiplier (about15% apparent size
reduction rather than45%, at fixed lens). Inverse/subdivided travel is consistent;
20Mm remains reachable in14capped200px gestures. These are UI policy values.

Both working app and publication checkout pass five actual-camera animation groups
and four retained chase groups: rendered intermediate frames/endpoints in both
views, repeated return, wheel/view/drag/synthetic-blur interruption, saved-off
reload, reduced-motion override and paused native isolation. Legacy coverage
retains fixed-FOV, pole/target gaze, live follow and Review checks, with39gazes
per context and maximum direction error about3.071e−11.
[Compact source-pinned evidence](../reviews/2026-11-06-camera-return-runtime.json)
records separate contexts and raw artifact hashes; full rendered-frame arrays
remain generated local artifacts. This keeps assurance extraction bounded.

Publication CI passes620Node/22applicationPython/85assurance/11training tests;
242repository-tool cases run with one platform skip,14of23JSBSim cases run with
nine optional skips, and25C172S cases pass. Independent focused tests pass40in
the publication checkout; working-app focused42also pass (inherited pointer
coverage differs). Both TypeScript checks pass. [Quality](../reviews/2026-11-06-camera-return-quality.md)
and [validation](../reviews/2026-11-06-camera-return-validation.md) distinguish
these bounded outcomes from unexecuted embedded-WebKit/live-animation and genuine
hidden/pagehide cases. Cross-provider peer remains pending under batch cadence.
