# Secondary gauges: generic model and fictional LAB references

Researched by Codex housekeeping agent on 2026-11-02. These references support additional original instruments in the research cockpit, not a confirmed avionics installation or validated C172S gauge fit.

## RPM and fuel

The pinned [eng_io320.xml](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/engine/eng_io320.xml) sets `maxrpm` to **2700**. A round RPM display can convert actual `prop_radps` by `60/(2π)` and mark that model reference. A display span such as 0–3000 RPM is a presentation choice; this source does not establish installed gauge colored arcs or operating procedures. The generic direct-drive model and engine-naming limits are detailed in the [audio research](2026-11-02-engine-audio.md).

The [c172x.xml tank definitions](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml) each specify **130 lb** capacity and initial contents, with no density, named fuel-type or unusable-volume override. [FGTank.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGTank.cpp) defaults density to **6.6 lb/US gal** and converts gallons from mass divided by density. Therefore each model tank's capacity is:

`130 / 6.6 = 19.696969… US gal = 0.0745611412 m³`.

This is neither a C172S capacity nor a manufacturer usable-fuel/reserve limit. Keep the existing SI contents telemetry authoritative and convert actual `fuel_left_m3`/`fuel_right_m3` by `0.003785411784 m³/US gal` at display boundaries. A dual L/R round gauge may normalize needle positions against the model capacity while preserving numeric readings, explicit units and unavailable handling. Do not invent reserve bands or show missing contents as empty tanks. [Shared constants](../../app/src/c172x-instrument-references.ts) centralize these two source-backed numeric references.

## Third navigation display

Reuse the existing [fictional LAB geometry](../../app/src/radio-nav.ts), opt-in state and NAV1 tuning: 113.8 MHz, 49.96° N/8.643° E, declared spherical geometry and geometric slant range. This is not a new real NDB/ADF/RMI receiver. Label its bearing **TRUE** and its station **LAB**. The lower bearing face and RPM face can sit beneath NAV1/NAV2 without implying an installed four-instrument arrangement; a separate dual-tank fuel face can remain with engine instruments.

For a pointer toward LAB, calculate the great-circle initial bearing **from the aircraft to the station**, then subtract actual true heading for the relative pointer direction. The existing station-to-aircraft initial radial plus 180° is not generally the inverse initial bearing on a sphere. OBS changes must not invalidate this bearing merely because the VOR CDI's TO/FROM comparison is ambiguous. Preserve the declared coverage/station-passage ambiguity; at station passage, distance can remain available while bearing is unavailable. No magnetic conversion, real DME propagation, ILS or station-identification service is established by this diagram.

All new readouts should use the selected immutable live/Review state, retain existing tuning/control ownership, and show unavailable data explicitly. Cockpit resizing and engine/AP column ordering are presentation changes; they must not create another source of aircraft state or alter dynamics.
