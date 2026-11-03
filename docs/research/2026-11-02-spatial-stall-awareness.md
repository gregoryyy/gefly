# Spatial stall awareness: supported first increment

Researched by Codex housekeeping agent on 2026-11-02. This note supports display scope and terminology; it does not establish aircraft operating guidance or validated C172 stall progression.

## Primary-source distinction

Angle of attack concerns the angle between an airfoil chord and the relative flow. At sufficiently high incidence, separated flow changes lift; predicting separation requires more than the orientation of a point on the aircraft. [NASA, Inclination Effects on Lift](https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/incline.html).

A finite wing also induces downwash, changing its effective local incidence. A rigid-body velocity estimate omits that induced flow. [NASA, Downwash Effects on Lift](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/downwash-effects-on-lift/).

The FAA explains how washout can give wing roots a higher incidence than tips and change the order of stall onset. This is a design feature to establish from applicable aircraft data, not an automatic rule for every wing or configuration. The referenced explanation is generic glider aerodynamics; it supplies no C172P twist measurement. [FAA Glider Flying Handbook, chapter 3, printed 3-7](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/glider_handbook/faa-h-8083-13a.pdf).

Control deflections and wing/tail interference also matter. NASA illustrates that flaps alter wing downwash and hence tail incidence; its icing discussion is evidence that the tail cannot inherit the wing's threshold, not a model of clean C172P tail stall. [NASA, Aerodynamics of Icing: Handling Effects](https://aircrafticing.grc.nasa.gov/1_1_3_3.html).

## What the pinned model actually supplies

The active generic model is [JSBSim v1.3.3 c172x.xml](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml), header-identified as a 1982 C172P. Local model SHA-256: `b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840`. This is not the project's selected 172S calibration.

- `<alphalimits>` has minimum −0.087 rad and maximum **0.28 rad**, approximately 16.04°. These are global model parameters, not measured regional critical angles.
- `CLwbh` looks up aircraft-wide `aero/alpha-rad` and `aero/stall-hyst-norm`; flap lift is a separate additive lookup. This does not expose six local wing separation states or configuration-specific section thresholds.
- The global hysteresis switches above 0.36 rad and below 0.09 rad; its state is not a spatial stalled-area fraction.
- Model span is 36 ft. AERORP is structural `(43.2, 0, 59.4)` inches. Six equally spaced span samples are a visualization choice, not source-defined aerodynamic panels.
- The function named `aero/angle/right_wing_tip_alpha` uses `atan2(w + p*14, u − r*50)` with inputs in ft/s and rad/s. Only the 14 multiplier is described as a distance in feet. The mismatched lateral distances and unexplained 50 are not a calibrated geometry contract; the property occurs only at its definition in this XML. Do not copy it as a local stall detector.

In [FGAerodynamics.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGAerodynamics.cpp), `systems/stall-warn-norm` is computed as zero until global alpha exceeds 85% of `alphaclmax`, then `10*(alpha/alphaclmax − 0.85)`. It is not capped at one, is not a percentage of stalled wing, and does not report separation at a station. With this model, warning onset is approximately 13.64°. Source SHA-256: `aa14e69c6a25133b25e80f76fbfc3b8c4a34a1a6636e7b8420fb540b697237d0`.

[FGAuxiliary.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGAuxiliary.cpp) forms air-relative body velocity by subtracting transformed wind from body velocity and forms aerodynamic angular rates by subtracting turbulence rates. Its global alpha uses `atan2(w, u)`. [FGMassBalance.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGMassBalance.cpp) documents conversion from structural inches (+X aft, +Y right, +Z up) to CG-relative body feet (+X forward, +Y right, +Z down).

## Bounded visualization contract

Use actual air-relative body translation and angular rates with `V_station = V_CG + omega × r_station`, with the offset transformed into the same CG-relative body frame. Display the longitudinal-plane kinematic angle `atan2(w_station, u_station)` at six symmetric span samples. This is a **local airflow/AoA proxy**. It does not account for wing twist, local chord/incidence, induced flow, propeller slipstream, flap/aileron-dependent section aerodynamics, or unsteady separation. It must not manufacture a regional critical angle or guarantee root-first stall progression.

Comparing every sample with the same published-in-model global alpha reference can illustrate where the proxy is higher. Any associated color must say **common model reference**, not “this section has stalled.” Missing, non-finite, very-low-speed or reverse-flow cases need explicit unavailable handling rather than a reassuring zero. Tail and fuselage regions remain **not modeled/unknown**, not green or inferred safe. No CFD, stress/damage model, new aerodynamic force, or replacement physics is introduced.

Future actual separation mapping needs applicable spanwise geometry/twist, section/configuration data, interference/downwash treatment and independently validated local-stall reference cases. The current aircraft-wide JSBSim lookup alone does not supply those data.

## Rights and access addendum (2026-11-03 07:40 Europe/Berlin)

Added by Claude Code housekeeping after Claude peer review F32 ([report](../reviews/2026-11-03-codex-prs-39-50-peer.md)). It does not change the findings above. "Not verified" means no licence or terms page was read for this note; it is not a claim that the source is restricted or free.

The span (36 ft), AERORP `(43.2, 0, 59.4)` in and `alphalimits` maximum 0.28 rad come from `c172x.xml` and ship in `app/src/spatial-stall.ts`. `aircraft/c172x/c172x.xml` (raw-byte SHA-256 `b736f4b7560d5aab4d2a69026798be1d369b2b2bb5ddcf627aebfd441ba71840`, re-fetched 2026-11-03) declares `GPL (General Public License)` with no version, "educational and entertainment purposes only" and "not to be sold"; the [E1 survey](2026-11-01-e1-engine-stack-candidates.md) rated it *not cleared, do not distribute*. The model SHA-256 above matches the raw file bytes at tag `v1.3.3` (re-fetched 2026-11-03), not GitHub's HTML `blob` page. The rights basis for shipping these values is **unresolved** (F34; proposed GAPS entry). NASA and FAA explanatory pages are cited only; their terms were not verified.
