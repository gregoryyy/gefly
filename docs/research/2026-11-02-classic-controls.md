# Classic panel and generic-model controls

Scope: the local JSBSim **c172x research model**, not acceptance of the planned
classic-panel 172S installation. These references support actual model wiring and
bounded ideal indications; they do not establish aircraft fidelity or training credit.

## Model controls

The pinned [JSBSim v1.3.3 c172x definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
uses `fcs/flap-cmd-norm` as the flap actuator input. Its kinematic target positions
are 0, 10, 20 and 30 degrees. The first interval takes two seconds and each of the
next two takes one second. The component has no `noscale` element, so
[FGKinemat](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/flight_control/FGKinemat.cpp)
scales the normalized input by its last detent (30). Thus the four selector commands
are 0, 1/3, 2/3 and 1. Read **actual** `fcs/flap-pos-deg`; do not show the selected
target as though it were already reached. These are the generic model's actuator
values, not accepted 172S performance limits or a sourced airspeed envelope.

The [flight-control bindings](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGFCS.cpp)
name the wheel brake inputs `fcs/left-brake-cmd-norm` and
`fcs/right-brake-cmd-norm`. [Their setters](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGFCS.h)
use the interval 0 through 1. The c172x nosewheel has no brake group, while the
main wheels use LEFT and RIGHT. [FGLGear](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.cpp)
uses the brake input in wheel-contact friction; this is not an aerodynamic brake
and must not arbitrarily reduce airborne speed. Ground contact can be reported
through `gear/wow`, bound in
[FGGroundReactions](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGGroundReactions.cpp).
The prototype begins airborne, so pressing wheel brakes then is not evidence of
stopping performance or accepted runway/terrain alignment.

## Ideal panel values

[FGAuxiliary bindings and calculations](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGAuxiliary.cpp)
provide:

| Property | Meaning and application boundary |
| --- | --- |
| `velocities/vc-fps` | Calibrated airspeed, converted to m/s by exact factor 0.3048. It is not an aircraft-installation IAS indication. |
| `velocities/psidot-rad_sec` | Euler true-heading rate in rad/s; distinct from body yaw rate `r`. |
| `accelerations/n-pilot-y-norm` | Pilot-location specific-force component, normalized by standard gravity; body Y points right. |
| `accelerations/n-pilot-z-norm` | Corresponding body-Z component; body Z points down, so supported upright flight normally has a negative value. |

The body force acceleration in
[FGAccelerations](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGAccelerations.cpp)
is applied force divided by mass. FGAuxiliary adds the pilot-location rotational
terms before normalizing it. For an **ideal quasi-static** inclinometer, derive
right-positive apparent-gravity angle as `atan2(-ny, -nz)`. Positive rightward
specific force makes the ball move left. Zero or inverted apparent-down loading
must be unavailable rather than inventing a centered ball. This derivation models
an ideal indication; tube geometry, damping, instrument error and unusual-attitude
behavior are not established.

The [FAA Pilot's Handbook chapter 8](https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-8-flight-instruments)
and its [PDF](https://www.faa.gov/sites/faa.gov/files/10_phak_ch8.pdf) describe the
basic flight instruments and a standard turn rate of 3 degrees per second. The
traditional panel places airspeed/attitude/altimeter above turn/heading/vertical
speed. This visual arrangement does not itself implement each real instrument.
The FAA PDF was too large for the browser's fetch limit; its indexed text was
checked rather than claiming a complete manual or figure review.

The [FAA Glider Flying Handbook, chapter 4, p. 4-19](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/glider_handbook/gfh_chapter_4.pdf)
explains the inclinometer's response to apparent gravity and turn loading, including
inside-turn slip and outside-turn skid. This is general instrument behavior,
not evidence that the c172x coefficients or proposed instrument model are correct.
A turn coordinator also responds to roll through its canted gyro; a depiction
fed only true-heading rate is an **ideal rate-of-turn aid**, not a validated
canted-gyro simulation. Label it accordingly. The heading display remains true,
not magnetic; the geometric-derivative VSI retains its existing prototype label.
No 172S color arcs or calibration data should be transferred onto the different
generic aircraft without applicability review.

## Input interaction decision

The user's accepted interaction is: a short click toggles touchpad yoke control;
click-and-hold plus dragging looks around; release restores yoke control. Camera
look changes must not alter flight state, and focus loss/modal/review/reset must
release transient controls. This is a desktop interaction choice, not an actual
aircraft yoke or a claim of connected-hardware calibration.

## Engine instruments and manual mixture

The [pinned piston-engine bindings](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGPiston.cpp)
expose `propulsion/engine[0]/map-pa`, `oil-pressure-psi`,
`oil-temperature-degF`, `egt-degF` and `cht-degF`. MAP is manifold **absolute**
pressure; it is research engine telemetry here, not evidence of a MAP gauge in
the selected 172S installation. Its declared project instrument list does not
include MAP. Convert oil pressure to Pa with 6894.757293168 Pa/psi, and temperatures
to K with `(F − 32) × 5/9 + 273.15` at the bridge boundary.

[FGPropeller](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGPropeller.cpp)
provides `engine-rpm` and `propeller-rpm`; convert to rad/s internally. The loaded
[prop_75in2f definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/engine/prop_75in2f.xml)
is fixed pitch, with equal minimum and maximum pitch, so no propeller-pitch lever
or constant-speed behavior is inferred. [FGEngine](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGEngine.cpp)
provides `fuel-flow-rate-pps` and `fuel-flow-rate-gph`. Use 0.45359237 kg/lb or
0.003785411784 m³/US gal with the appropriate time conversion. Tank
`contents-lbs` and `density-lbs_per_gal` support sourced volume conversion; c172x
also defines `contents-volume-gal` as their quotient. Do not invent a fuel density
or fabricate electrical indications absent from this model.

The unmodified c172x automatic-mixture channel overwrites
`fcs/mixture-cmd-norm` each step. Merely writing a user slider to that property
would therefore produce a nonfunctional control. The chosen adapter preserves
automatic mixture by default and adds a documented channel-execution switch in
the generated local copy. Entering manual mixture disables that channel before
setting the actual command. This changes control wiring, not engine coefficients;
the generated asset and patch identity must be recorded. Read actual command and
position rather than displaying a requested mixture as though applied.
[FGFCS's channel loader](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGFCS.cpp)
requires any `execute` property to exist before loading the channel.

## Bounded roll autopilot

c172x loads both [systems/Autopilot](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/systems/Autopilot.xml)
and [c172ap](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172ap.xml).
Their outputs are summed with manual commands and trim. The selected first adapter
uses **only the existing modern roll controller**, with its existing gains:

| Property | Bounded adapter role |
| --- | --- |
| `ap/autopilot-roll-on` | Roll-controller enable; its final output switch gives zero while off. |
| `ap/roll-attitude-mode` | 0 selects wings level; 1 follows heading guidance. |
| `navigation/actual-heading-rad` | Ordinary GNC property: synchronize it with actual true heading every fixed step. |
| `guidance/heading-selector-switch` | Select the specified-heading input rather than waypoint guidance. |
| `guidance/specified-heading-rad` | Captured/selected true-heading target in radians. |
| `ap/roll-rate-pid-control/initial-integrator-value` | Existing PID reset interface for deliberate engagement/disengagement handling. |

[FGPID](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/flight_control/FGPID.cpp)
binds the initial-integrator setter; it does not establish a complete certified
mode-transition or manual-override policy. Capture, saturation, wraparound,
disconnect and re-engagement need actual reference-case checks. Disable the
legacy `ap/attitude_hold`, `ap/heading_hold` and `ap/altitude_hold` flags so two
controllers cannot drive the same roll channel. Manual override must use raw
pilot intent, not the study's constant aileron correction. Suspend that correction
while AP owns roll and restore its configured value after disconnect.

Legacy c172ap ALT is not enabled in this increment: its calculation uses AGL even
though a comment says MSL, its filters accumulate state while disabled, and its
pitch PID can retain output after merely switching the hold flag off. Channel
execution gating also freezes rather than resets filter history. These are
integration reasons to keep the first AP roll-only, not to relabel it as a
KAP 140, pressure-altitude hold or coupled navigation system. Throttle remains
manual; reuse of existing gains does not establish aircraft-specific handling.
