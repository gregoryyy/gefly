# Generic-model landing and radio teaching controls

This increment reuses JSBSim v1.3.3 (`66f7fafc07fe13e7ede9db20873030fed2881713`)
and its generic c172x, not the selected project C172S installation.

## Contact and steering

The pinned [aircraft definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
contains three fixed BOGEY contacts with springs, damping, friction/brakes and a
10° steerable nosewheel, plus tail and two wingtip STRUCTURE contacts.
[FGLGear](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.h)
computes forces/moments from contact geometry, compression/velocity and wheel
friction. No replacement wobble coefficients or damage thresholds are added.

The bridge exposes actual wheel WOW, compression in m, compression load in N and
slip in rad, plus structure-contact bits tail=1, left tip=2, right tip=4. CG AGL,
CG geodetic ellipsoid height and heading-aligned forward/right/down velocities
are separate from instrument altitude. `ground_height_ellipsoid_m` is the CG's
height, despite the ground-group prefix; it is not terrain elevation. The renderer
uses it where available. Legacy 14-value study state/digest layout is unchanged.

Rudder positive in this aircraft model commands left yaw. Nosewheel steering
uses the opposite normalized sign so Q/left and W/right work in flight and on
the ground. Existing model coefficients remain unchanged. Flat contact is at
ellipsoid height zero; imagery is not a surveyed runway or accepted EDFE field datum.
The original fixed-wheel visual remains illustrative; contact physics drives the
whole aircraft attitude/position, without clamping it to the ground.

Four practice fixtures start at CG AGL 3 m, forward 28 m/s and pitch 4°. Baseline
sink is 1.5 m/s; variants use sink 4 m/s, side speed 4 m/s or right bank 8°.
Automatic airborne trim is deliberately skipped so it cannot erase the setup.
These are demonstrations, not aircraft limits or procedures. Paired 120/240 Hz
runs compare contact sequence, loads, slip, attitude and repeatability; review
records carry results and remaining fidelity limits.

## Radio and NAV

The [FAA Pilot's Handbook, chapter 16](https://www.faa.gov/sites/faa.gov/files/pilot_handbook_1.pdf)
and [AIM radio-navigation chapter](https://www.faa.gov/air_traffic/publications/aim_html/chap1_section_1.html)
are primary references for VOR/CDI and DME meaning. The teaching CDI uses a 10°
full scale with five 2° dots each side. This does not establish installed-receiver
fidelity or validate a real navaid database.

COM controls implement a labeled legacy 25 kHz subset; European 8.33 kHz channels
and communication service are unavailable. NAV tuning uses 50 kHz increments.
An explicitly enabled fictional LAB station at 49.96° N, 8.643° E / 113.8 MHz
uses a declared spherical geometric model, true OBS/radials and geometric slant
DME. A 60 NM demo radius and 100 m bearing-ambiguity radius are teaching choices,
not published service coverage or propagation. LAB is off initially. Other channels,
localizer/ILS, unavailable position and unsupported reception remain flagged.

The two independent COM/NAV receivers and OBS settings form an atomic 11-field
configuration. Two original vector NAV faces use the same teaching geometry;
NAV1 always retains a GS INOP flag. The user-provided poster is a layout
reference only, with no redistributed bitmap or exact equipment-fit inference.
Radio configuration is captured with fixed-step flight samples; recorded position
and tuning determine Review indications. Tuning is read-only in paused/Review
mode. The separate autopilot box preserves supported roll/heading behavior;
ALT/NAV/APR/REV are explicitly INOP. Complete classical coupled modes and the
fullscreen modern overlay/ILS markers remain later work.
