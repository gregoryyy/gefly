# Airport play increment

The initial prepared airfield is **EDFE runway 08/26 asphalt**. Its midpoint,
1400 × 25 m dimensions, dated heading and displaced-threshold facts come from
the airport operator's [25 November 2025 operating rules](https://egelsbach-airport.com/wp-content/uploads/2025/12/EDFE-Benutzungsordnung-25-11-2025-FinalohneUnterschrift-EN-v1-2.pdf).
The heading uses the document's magnetic direction plus its dated variation.
Endpoints are derived from those facts, not surveyed coordinates. The 26 landing
threshold is displaced; spawn starts 20 m beyond the selected practice threshold.
This is not an operational runway database or approved departure/arrival procedure.

Sharp original geometry draws pavement, markings and numerals against the same
DEM/geoid sampler as the aircraft renderer. Existing physical terrain is unchanged.
Taxiways, apron, land use, roads, water, buildings as footprints and windsock
position use the bounded OpenStreetMap snapshot described in
[the scenery source note](../../app/public/airports/scenery/README.md).
OSM and the approximate operator-derived runway can disagree; dimensions/paint and
taxiway widths have declared generic assumptions. Buildings do not add collisions.
The windsock is static because wind response is not delivered here.

The optional practice PAPI and runway lights follow generic FAA visual conventions,
with project-chosen locations. They are **not asserted to be installed at EDFE**.
Installed lighting/obstacle-clearance verification remains TODO 2.0.63.

Runway play initializes the native research model with zero requested ground
velocity, idle running engine and full brakes. Six seconds of native gear settling
precede published time zero. All three wheels must support the aircraft and
residual horizontal velocity must be below 0.05 m/s. Only timesteps up to 1/60 s
are supported for this initializer; the app uses 1/120 s. No spring, damping,
friction or aerodynamics coefficients are changed. The UI parking latch remains
set until released. Stop pauses integration and retains the trace; another runway
start begins a new trace. Source geometry is currently prepared only for EDFE.

A scripted-pilot native regression performs takeoffs in both directions over the
actual public terrain. This is behavior evidence, not C172S performance calibration,
a circuit assessment or a validated landing procedure. Existing manual flying,
wheel response and collision handling govern the return and landing.

COM data and channel-name scope are in the
[COM directory note](2026-11-03-airport-com-directory.md). Directory selection
loads standby only; explicit swap activates. There is no simulated controller,
voice, ATIS or current-service guarantee.
