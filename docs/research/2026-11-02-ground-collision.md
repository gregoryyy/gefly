# Ground contact and a bounded collision stop

Researched by Codex housekeeping agent on 2026-11-02. The requested collision behavior can build on existing wheel reactions while addressing missing body/propeller intersection detection. A stop after contact is a simulator session rule, not evidence of structural failure or calibrated crash dynamics.

## Existing primary-source model

The pinned [JSBSim v1.3.3 c172x model](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml) has three fixed `BOGEY` wheel contacts, with spring/damping and rolling/static/dynamic friction parameters. The right main's explicit strut-force function is documented as equivalent to the left main's spring/damping formulation. Three additional `STRUCTURE` points cover tail skid and left/right wingtip. There are no named belly or propeller contacts. Model SHA-256: `b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840`.

[FGLGear.h](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.h) describes CG-relative contact offsets, compression and spring/damper force. The implementation in [FGLGear.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.cpp) tests the theoretical uncompressed contact position against the ground callback: negative signed height enables `WOW`, subject to gear/contact conditions. Its published contact `AGL` is clamped to zero when the theoretical point is below ground. Thus a zero contact-AGL readout is not sufficient to distinguish exact touch from compression/penetration. Structural points also expose `WOW`; that name does not turn them into wheels.

`GetCompForce()` is strut compression force; the current bridge negates it and converts lbf to positive normal strut load in newtons. It is not a complete ground-force vector or material stress. The upstream function named `CrashDetect` describes broad out-of-bounds checks and logs a message; its integration-suspension call is commented out. Those internal checks do not provide an accepted aircraft damage boundary.

[FGDefaultGroundCallback](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/input_output/FGGroundCallback.cpp) calculates geodetic height relative to a constant terrain elevation on its reference ellipsoid. The current application initializes terrain elevation to zero and renders ellipsoid imagery without terrain. This increment therefore addresses the declared ground surface, not actual Egelsbach elevation, photogrammetry, buildings, vegetation or moving objects.

## Geometry and datum alignment

The original [aircraft visual](../../app/src/aircraft-visual.ts) explicitly declares illustrative dimensions independent of dynamics data. Authored axes are +X forward, +Y up, +Z right. [Scene placement](../../app/src/scene.ts) currently places that visual origin at the displayed aircraft/CG position using geodetic ellipsoid height when available. It does not align its meshes with structural-frame coordinates from the JSBSim model.

The visual contains a shaped fuselage, separate cabin/roof ellipsoids and an illustrative propeller disk centered 3.17 m forward with radius 1.05 m. These are not certified C172P dimensions: the pinned propeller model specifies 75 inches diameter (0.9525 m radius). A geometric collision proxy derived from these meshes must be identified as illustrative. Sharing authored geometry avoids future silent divergence between collision and rendering; it does not establish real-aircraft dimensional fidelity.

For model contacts, convert structural aft/right/up offsets relative to the actual model CG before rotation. For an already CG-relative authored visual, do not subtract structural CG a second time. Resolve every tested offset into the same local vertical frame as CG AGL. Reusing radial/sea-level altitude as ellipsoid ground clearance would introduce a datum error. Any translation or scaling used to align rendering must also enter its corresponding collision proxy.

## First increment and limits

A bounded rule may latch a stop for actual JSBSim structural contact, or for non-positive minimum ground clearance of the declared illustrative body/propeller proxy. Ordinary wheel contact, compression, bounce and rollout continue through JSBSim. Do not turn the existing fast-descent fixture's 4 m/s into an invented damage threshold, and do not replace the engine's spring/damper forces with a visual bounce controller.

Evaluate the stop predicate after each fixed worker step, retain the first qualifying state/event and prevent subsequent steps until explicit restart. Rendering frequency must not decide whether contact occurred. Publish the stopped state and reason so Review can inspect it; a render-clock pause may otherwise miss the contact during a worker catch-up block. Keep standalone engine benchmarks separate from an opted-in application session stop rule.

Endpoint detection can retain a penetrating post-step state; it is not continuous collision detection or a solved time of impact. The response is limited to the first detected fixed step, with possible one-step overshoot and unresolved within-step motion. It adds no breakup, gear collapse, propeller damage, material strength or safe-impact criterion. Verification needs deterministic contact timing, frame/sign checks, normal wheel-contact continuation, latched stop under catch-up/resume attempts, Review/reset behavior and the declared visual/ground alignment.
