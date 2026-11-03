# Engine-off glide: source behavior and diagnostic boundaries

Researcher: Codex subagent `glide_research_records`, 2026-11-03.
Scope: the [user report](../input/2026-11-03-engine-off-glide.md), R-SIM-1,
R-ENG-1 and R-AIR-1. Source investigation and the bounded native observations
reported below do not accept aircraft fidelity. No deep-research skill/service ran.

## Applicable model and references

The runtime embeds JSBSim v1.3.3 at commit
`66f7fafc07fe13e7ede9db20873030fed2881713`. Its
[c172x.xml](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172x/c172x.xml)
header identifies a **1982 C172P**, not the selected 172S. It loads the IO320
piston definition and a fixed-pitch 75-inch two-blade propeller. The header
declares limited validation and educational/entertainment use. Preserve the
existing model-rights restrictions; a public source URL supplies no new licence.

The existing [172S POH research](2026-11-01-c172s-poh-values.md#engine-cruise-and-glide-extraction)
and [performance data](../../data/aircraft/c172s-classic/performance-values.json)
already record a roughly **9.1:1** glide reference at **68 KIAS**, with the
propeller windmilling, flaps up and zero wind (Cessna 172SPHUS Rev 5, printed
3-14, Figure 3-1, page marked Revision 4). This is a retained source reading,
not a new chart extraction or a C172P calibration target. The source's weight is
not stated in that chart. Its applicability/revision and extraction-rights
questions remain as documented there. The Cessna-authored club-hosted PDF was
indexed but exceeded the web reader's size limit during this investigation;
the figure was not newly rendered or independently remeasured.

The [FAA Airplane Flying Handbook 3A excerpt, printed 3-16–3-17](https://www.faasafety.gov/files/events/GL/GL09/2016/GL0966769/Airplane_Flying_Hdbk_Excerpt.pdf)
explains the drag contribution of a windmilling propeller, effects of flap and
wind conditions, and the need to stabilize airspeed when evaluating a glide.
This is general flight-mechanics evidence, not variant-specific coefficients.
[NASA's L/D explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-to-drag-l-d-ratio/)
relates steady unpowered glide geometry to lift and drag. Neither source makes
the first few seconds after switching ignition off a steady glide measurement.

## Pinned source findings

- **Ignition and rotation are separate.**
  [FGPiston.cpp](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/propulsion/FGPiston.cpp),
  `doEngineStartup`/`doEnginePower`, removes combustion with ignition loss but
  still calculates shaft dynamics. Re-enabling spark with fuel and sufficient
  RPM can restart combustion. Fuel-flow or RPM alone does not prove the engine
  is producing power; see the earlier [engine-toggle semantics](2026-11-02-engine-toggle-wind.md).
- **Airframe drag is present.** The pinned aircraft has a nonzero zero-lift
  drag term, alpha/flap-dependent drag, elevator drag and sideslip drag. The
  report does not justify inserting a second whole-aircraft drag model.
- **The original propeller package has a shutdown limitation.** In the
  pinned local `engine/prop_75in2f.xml`, the active power-coefficient table is
  positive throughout its listed advance-ratio range. In
  [FGPropeller.cpp](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/propulsion/FGPropeller.cpp),
  `Calculate` subtracts required propeller power from engine power and integrates
  shaft rotation. Its thrust depends on the square of rotation rate. Therefore
  a stopped propeller gives zero force in this formulation, and this particular
  power table provides no negative-power region to drive windmilling. The
  orchestrator's baseline observation below confirms stopped rotation in its
  tested engine-off flight. The propeller XML
  was inspected in the pinned build checkout; its remote web fetch failed.

## Baseline observation and bounded generator adaptation

The orchestrator's native baseline reports zero shaft RPM by 10 seconds after
ignition off. Over 60–180 seconds, its recorded mean TAS is 35.609 m/s, sink is
2.508 m/s and energy-height loss rate is 2.494 m/s: a geometric ratio around
14.2:1. The comparable powered automatic-mixture run reports TAS 34.953 m/s and
sink 0.064 m/s. These are diagnostic observations from actual JSBSim, not an
independent flight test or accepted C172 performance. The local ignored evidence
is `output/flight/glide-baseline-native.jsonl`; this researcher did not execute
that run. The eventual integrated regression/review owns its exact fixture,
artifact identity, metrics and changed-model outcomes.

The selected correction reuses the pinned upstream
[Aero-Matic v1.1 `prop2.php`](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/utils/aeromatic/prop2.php)
fixed-pitch thrust/power multiplier tables, which include negative coefficients
at high advance ratio. David P. Culp's July 2003 generator cites NACA reports
84, 640 and RM-E6J31; those reports were not independently examined here.
Its exact local file SHA-256 is
`658eb2c7a409fe7793514a6e0add07ff6b693b0161ee205379d3606f0117dab6`.
The remote generator URL failed the web reader; the same pinned checkout used
by the build was read directly. No PHP or downloaded source is executed by
the adapter.

The adapter contract is deliberately narrower than running the generator:

- Parse only its two fixed-pitch table branches; reject unknown source hashes.
- Retain the current 75-inch diameter, two blades, 1.67 slug·ft² shaft inertia,
  fixed 22-degree pitch and existing Mach-correction tables.
- Use the pinned engine's 160 hp at 2700 rpm and direct-drive ratio 1.0.
  The upstream generator instead chooses propeller RPM from a static tip-speed
  heuristic and estimates gearing, blade count and inertia. Those heuristics
  are not suitable substitutions for the existing direct-drive configuration.
- Derive `CP0 = P / (rho × n³ × D⁵)`, with the generator's design density,
  horsepower conversion and consistent ft/second units; derive `CT0 = 1.4 × CP0`
  from its fixed-pitch branch. This yields CP0 about 0.042583 and CT0 about
  0.059616, before the generator's four-decimal table rounding. These are
  generic design scalings, not fitted C172 observations.
- Replace the prepared local propeller tables, keep the source checkout and
  aircraft polar unchanged, and record source/input/output/script hashes.
  Generated model and WASM bytes remain ignored local research outputs.

The negative power region permits airflow to drive shaft rotation while the
negative thrust region supplies drag through JSBSim's existing force and torque
integration. This is a physically relevant generic model improvement; it is
not a claim that the fitted McCauley/C172P or selected 172S propeller has these
coefficients. Changing the full propeller tables also changes powered behavior,
so powered flight, trim, start/restart, takeoff and landing regressions need
renewal. Matching a single glide-ratio reading would not validate the model.

The generator's fixed-pitch tables end at finite advance ratios; their endpoint
handling at low RPM/high airspeed is not new validated aerodynamic data.
JSBSim's force still vanishes at exactly stopped rotation under this model.
Stopped-prop drag and starting windmilling from exactly zero RPM therefore
remain limitations, as do high-speed/post-stall behavior and real shaft losses.

Licence basis: Aero-Matic is used under the enclosing JSBSim repository's
[LGPL 2.1 COPYING](https://github.com/JSBSim-Team/jsbsim/blob/66f7fafc07fe13e7ede9db20873030fed2881713/COPYING)
and existing project attribution/notice policy (LGPL-2.1-or-later). The PHP file
has an author/date header but no separate licence statement. Preserve that
provenance and the distinction from the original propeller XML's unclear
per-file rights; do not imply this clears other aircraft-data or distribution
questions. No manufacturer document, chart image or newly digitized aircraft
coefficient table is added.

## Measurement recommendation

Use repeatable no-wind, clean, gear-fixed native flights at a recorded mass,
CG and airspeed. Start with autopilot disengaged, record its state, and compare
ignition-off, mixture cutoff and engine-idle runs from the same initial state.
Log actual combustion, ignition request, starter, shaft RPM/power, propeller
force, aerodynamic drag, TAS/CAS, pitch/alpha, altitude, distance and step/time
where those native observations are available. Missing observations stay
unavailable; do not infer thrust from a cockpit sound.

Allow shutdown and pitch/speed transients to settle before reporting geometric
glide ratio. Also track specific energy height `h + V²/(2g)`: slowing down can
temporarily preserve height while total energy falls. In still air, a settled
descent with bounded speed change allows a meaningful horizontal-distance over
height-loss measurement. Use several speeds to distinguish a model polar from
a single trim or AP response. A hardcoded sink rate, arbitrary engine-off drag
multiplier or forced downward velocity would hide the cause and is unsupported.

Do not promote the roughly 9.1:1 172S source reference to a pass/fail tolerance
for the unvalidated C172P model. If a native propeller correction needs new
aircraft coefficients, require applicable source data and review; retain a
clear model limitation when the necessary data or permissions are absent.
