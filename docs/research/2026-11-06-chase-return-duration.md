# Chase return duration: source inventory and evidence plan

2026-11-06 19:22 Europe/Berlin, clock-derived. Author: Codex
`/root/camera_return_validate`, acting as housekeeping alongside implementation.
This note records source observations and the orchestrator's declared timing
policy; it is not runtime acceptance, a specification declaration or an aircraft
value. The orchestrator owns requirements, task status and final integration.

## User request and integration choice

The [exact request](../input/2026-11-06-chase-return-duration.md) asks that chase
return take longer with greater zoom-out, last at most six seconds and decelerate
at the end. It does not specify a mathematical duration curve.

The primary orchestrator froze this implementation policy before the new
behavior's validation: retain700ms for cockpit; for a chase zoom-out factor
`r = start radius / target close radius`, use
`min(6000, 700 + 450 × log2(r))` milliseconds for the supported chase range
`r >= 1`. Disabled animation or OS reduced-motion retains an immediate return.
The existing quintic easing and logarithmic-radius interpolation remain. The
450ms-per-doubling coefficient and700ms base are presentation choices, not user
quotes, physical coefficients or sourced aircraft tolerances.

Predetermined arithmetic examples for the declared policy:

| Start/target factor | Duration, ms |
| --- | --- |
|1|700|
|2|1150|
|4|1600|
|16|2500|
|256|4300|
|4096|6000, capped from6100|

The exact cap threshold is `2 ** ((6000 - 700) / 450)`. Tests should cover just
below, at and above it. The current supported chase radius starts at
`hypot(30, 11)` metres and reaches20,000,000m, so its far end must use the cap.
Behavior for malformed/nonfinite poses must retain the existing atomic validation
contract; this note does not silently define a new fallback for invalid inputs.

## Baseline inspected before the change

The feature worktree is `/private/tmp/gefly-camera-return`, baseline commit
`06e9bb8b1444ba7e3ff016788cfcd0f73b2dbe96`. Its committed
[camera return helper](../../app/src/camera-return.ts) uses a fixed700ms default
and an optional explicit duration. The
[main integration](../../app/src/main.ts) previously passed700ms whenever
animation was enabled and reduced motion was off, independently of chase radius.
Sampling uses monotone wall-time progress with exact endpoints, shortest yaw,
linear pitch under eased progress and radius interpolation in logarithmic space.
Cancellation holds the last sampled pose. These are committed-baseline source
observations, not claims about other workers' concurrently changing files.

The existing progress curve is `E(u) = 6u^5 - 15u^4 + 10u^3`. Its derivative
`30u^2(1-u)^2` is zero at both ends and decreases over the final half. Retaining
that curve supplies end deceleration without inventing a new camera path. For
an inward chase return, positive radius decreases while the eased log-radius
velocity also falls in the final half. Measure this in aircraft-relative pose;
the moving aircraft can keep the world-space camera moving after return ends.

## Proportional validation plan

The existing [pure helper tests](../../app/src/camera-return.test.ts) can verify
the declared duration table and cap boundary independently of rendering. Retain
exact endpoint, shortest-yaw, finite positive bounded radius, no overshoot,
sparse/dense sampling, backward/invalid clock, detached-pose and cancellation
checks. A repeated return must choose timing from the displayed radius, not the
old starting radius. Cockpit, disabled preference and reduced-motion cases remain
separate from zoom-dependent chase timing.

The [actual camera harness](../../app/tests/camera-return.browser.mjs) already
observes timestamped public Cesium ENU camera frames and actual native-worker
commands/stats. Use it for a close, uncapped moderate and capped far return;
verify ordered durations, fixed FOV, visible intermediate poses, exact follow
endpoint and unchanged paused native step/digest/final state. For the far case,
observe that return remains active beyond700ms and reaches the endpoint on the
first rendered frame after its declared deadline. Pure tests enforce the exact
6000ms cap; browser measurements need an explicitly declared frame/scheduling
tolerance rather than pretending a late RAF frame changes the helper's deadline.

For end deceleration, use equal normalized-time intervals in the final quarter
and compare aircraft-relative radius or normalized log-radius progress and
yaw/pitch error. Require decreasing motion increments and no final overshoot;
do not confuse aircraft translation/heading change with residual camera-return
motion. A bounded live-follow observation can check that the camera still follows
the current aircraft rather than a frozen starting world position.

The prior cancellation browser checks wait850ms. That is shorter than the new
maximum: renew delayed-snap checks beyond the possible remaining six-second
duration, with bounded waits. Retain wheel/drag/view/reset/Review/lifecycle
cancellation and pointer-look synchronization. The current frame ring retains600
frames; this may drop the beginning of a six-second return on a120Hz display.
Use a bounded larger ring or controlled timestamp sampling before asserting a
whole-transition timing curve. The legacy
[chase zoom harness](../../app/tests/chase-zoom.browser.mjs) deliberately disables
animation for its immediate-reset assertions and can retain that separate scope.

Freeze source/harness hashes before actual acceptance, keep every wait bounded,
preserve failed/inconclusive attempts and run browser/CI dependency stages
sequentially. No new browser, pure test or heavy gate was executed for this note.
The supported device matrix, real hidden-tab behavior and aircraft/training
fidelity remain outside these source observations.

## Main-based delivery boundary

Recorded 2026-11-06 19:31 Europe/Berlin by Codex orchestrator. The existing
chase and animated-return PRs were merged into intermediate feature branches
after their parent PRs had already merged; their camera implementation is not
in the observed main baseline757c41f. The user's running workspace already has
the camera behavior. To make this duration change usable on main, the delivery
ports the necessary chase-distance, camera-pose, preference, return and gesture
components against current main. It does not bring the unrelated terrain-source
worker, separate terrain-overview view or shadow changes from that old stack.
The existing overview criterion is outside this increment and is not evaluated.

An initial, pre-Escape-repair working-application Cesium/native-worker browser
run passed five groups: the far chase return measured6015.6ms for a6000ms policy,
late equal-time logarithmic-distance intervals decrease, and a wheel-cancelled
return remains stable for6200ms. Frame scheduling accounts for the measured
rendered endpoint appearing after the six-second policy deadline. This run is
historical because later input-guard repairs changed its source and harness.
Current-main port checks and independent reviews are recorded separately.

## Final bounded observations

2026-11-06 19:53 Europe/Berlin, Codex orchestrator. After independent review
found a zero-look Escape cancellation gap and an unsupported-wheel handling
inconsistency, both were repaired and source-pinned browser checks renewed.
The working app passes five actual-browser groups (artifact c8b33bc9…); the
main-based port passes five (219f4529…), including real invalid-wheel and
Escape interactions, with a6200ms observation after both wheel and Escape
cancellation. Selected6000ms returns rendered their final poses after6016.8ms
and6010.3ms respectively; the extra time is frame scheduling. Equal-time
late log-radius intervals decreased in both contexts. The main-based legacy
chase browser passes four groups (ee409420…), including actual moving flight
and Review; the separate terrain-overview view was explicitly not evaluated.

Complete CI at source/requirements revision d75fd17 passes694Node/32Python/
89assurance/11training, zero integrity errors and3277 tracked whitespace paths.
It executes247/248 repository-tool tests and14/23 JSBSim studies; one platform
and nine optional study skips remain explicit. Production Vite build passes
with large-chunk/timing warnings. Both locally reused WASM files hash266f2016…;
the browser harness does not itself freeze the binary and build-info provenance
remains unverified. Earlier pre-repair browser observations above remain
historical. Independent quality and validation cover the bounded implementation;
final documentation assurance/diff are separate. Claude CLI2.1.308 is installed
but reports no authenticated session, so no external peer review was attempted
or accepted; cross-provider peer remains pending. No terrain, aircraft fidelity,
operational training or separate-overview acceptance follows from these checks.
