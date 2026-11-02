# Browser flight prototype

Fly an airborne JSBSim research aircraft with keyboard, touchpad or on-screen
controls, a classic six-pack flight deck and cockpit/chase views. CesiumJS displays Hessen
aerial imagery in a bounded practice area around an approximate EDFE starting point. This is an experimental
slice toward the [first browser exercise](../docs/TODO.md), not a completed or
validated PPL exercise.

## Run locally

From the repository root:

```sh
npm --prefix app ci
just build-flight-engine   # first run: downloads the pinned SDK and JSBSim sources
just fly
```

Open the local URL printed by the development server, then select **Start flight**.
The application loads paused so the aircraft cannot fly away while you inspect
the controls. Starting or resetting uses the same airborne initial state near
approximate EDFE coordinates: 1,300 ft of study altitude and 90 kt true airspeed.

The engine build reuses the [existing browser study recipe](../studies/e1-browser/sim/README.md).
Its generated WASM and bundled research-model data stay in ignored local build
directories; they are not committed or supplied as a public simulator download.
A missing or failed engine build is an error, not a switch to scripted flight.

## Controls

| Input | Action |
| --- | --- |
| Arrow up/down | Push nose down / pull nose up |
| Arrow left/right | Ailerons |
| A / D | Rudder |
| W / S | Increase / decrease throttle finely |
| 1–9 | Set throttle to 10–90% |
| 0 | Set throttle to idle |
| P | Capture true heading / disconnect heading hold |
| Space | Start / pause / resume |
| R | Reset flight |
| V | Switch cockpit / chase view |
| F / Shift+F | Extend / retract flaps one 10° detent |
| B (hold) | Apply both wheel brakes; release to let go |
| Two-finger vertical scroll over the scene | Up: zoom in; down: zoom out |
| Escape | Release scene yoke/look control |

Press and hold the on-screen flight buttons, or drag the virtual joystick to
control pitch and roll; releasing returns the stick to neutral. The flight deck
displays control positions. Flight buttons return keyboard focus to the scene; range controls
retain focus for accessible adjustment. Losing window focus pauses the flight
and releases held inputs. Optional flight hardware and phone orientation are
later work.

For touchpad yoke control, start flight and **short-click the unobstructed
scene**. That click sets a neutral pointer anchor and toggles yoke control on;
moving the pointer relative to the anchor controls pitch and roll. Short-click
again to disengage. To look around, hold the click for about a quarter-second,
then drag. Releasing returns to the prior yoke mode. Escape, leaving the scene,
window focus loss, a modal or entering Review releases the transient controls.
Header buttons, instrument controls and the joystick do not toggle scene yoke.

Use **two fingers to scroll vertically over the flight scene** to adjust the
camera field of view (FOV): scroll up to zoom in with a narrower perspective, or
down to zoom out with a wider perspective. The default is **60°**, bounded to
**20–100°**. This changes only the camera perspective, never the aircraft's state
or physics. It works in cockpit and chase views, including while paused or in
Review. The chosen FOV survives a view switch and is independent of yoke mode
and hold-drag look. Scrolling over dialogs or the practice map keeps those
interfaces' normal behavior; Ctrl/pinch events bypass this FOV control.

Use the **0° / 10° / 20° / 30°** flap buttons, F or Shift+F while flying. The
selector sets the generic model's target; the displayed actual flap angle takes
time to move. Hold the **wheel brake** button or B to apply both main-wheel
brakes; release, pause or focus loss clears the held command. Brakes act through
wheel contact, not as an airbrake, so they do not directly slow the initial
airborne flight. Flap and brake adjustment is disabled while paused or reviewing.
These controls use the research aircraft's existing model, not accepted 172S
performance data. See [control sources](../docs/research/2026-11-02-classic-controls.md).

Open **Controls** in the header to adjust pitch, roll and rudder sensitivity from
25% to 150%. **Default** uses 100% on all three axes; **Gentle** uses 50% pitch,
50% roll and 70% rudder. Opening the dialog pauses flight. Changing settings,
selecting **Done**, or pressing Escape does not resume it; use **Start flight**
or **Resume flight** when ready. Closing the dialog returns keyboard focus to
the flight scene.

To compare the response, start a flight, open **Controls**, select **Gentle**,
then **Done** and **Resume flight**. Try a small stick movement or a brief held
button input. Repeat with **Default** to compare. Sensitivity settings last for
the current page session; restarting the flight with R preserves them. They
change input response, not the aircraft's physics or calibration.

The **roll correction** is a constant left aileron command: its default −0.109375
means about **10.9% of full left command**. It counters roll drift observed in the
generic study model; it is not the yoke position, a trim tab or an aircraft trim
specification. Select **Off · 0%** to compare unassisted behavior, or **Study default** to restore the correction. Sensitivity changes
do not scale it. It is suspended while the autopilot controls roll, then its
configured value returns after disconnect.

## Six-pack instruments

The panel follows the familiar two-row arrangement:

| Airspeed | Attitude | Altimeter |
| --- | --- | --- |
| Ideal turn-rate/ball aid | True-heading indicator | Vertical speed |

The airspeed dial shows engine **CAS**, an ideal calibrated value rather than a
validated installed IAS indication. Older engine builds fall back to explicitly
labeled TAS. The turn display uses actual true-heading rate and an ideal
specific-force ball; it does not reproduce a canted gyro's roll response, lag or
errors. Heading remains true rather than magnetic. Vertical speed is the existing
filtered geometric-height derivative, not a calibrated pitot-static VSI. Review
shows the captured instrument values while the live engine remains paused.

## Engine and autopilot controls

The engine panel shows actual model RPM, manifold absolute pressure, oil pressure
and temperature, fuel quantity/flow and exhaust temperature. Read the displayed
units: these are research-engine readouts, not an accepted recreation of the
selected 172S's installed gauges. The research aircraft has a fixed-pitch propeller.

Use **Mixture** to change the actual fuel-mixture command. Automatic mixture is
retained initially; entering a manual setting disables the generic model's
automatic-mixture channel. The panel distinguishes automatic/manual operation and
the applied value. Throttle shortcuts 1–9 select 10–90%, while 0 selects idle;
W/S and the throttle slider provide finer adjustment.

The first autopilot offers **wings level** and **true-heading hold**, using the
model's existing roll controller. Capture the current heading with P, or use the
heading-hold control; P also disconnects heading hold. Use the displayed mode and
target to see what is engaged. Manual pitch/roll/rudder control disconnects the AP rather
than adding a hidden command against it. The roll correction is suspended while
AP owns roll. This is a roll-only research controller: altitude, throttle and
mixture remain the pilot's responsibility. It is not a validated installed
C172S autopilot or a coupled approach system.

## Pressure setting

Select the **pressure window** beneath the altimeter to pause flight and inspect
its setting.
Try the QNH reference, **Launch QFE** and standard-pressure shortcuts, or adjust
the pressure manually. Switch hPa/inHg to compare display units; the underlying
pressure is unchanged. Closing the panel leaves flight paused until you resume.
The shortcuts set a pressure for practice; they do not represent dedicated
QNH/QFE switches on a mechanical altimeter.

**Launch QFE** uses the pressure at the initial airborne position and reads zero
there. It is height relative to that launch pressure, **not EDFE field elevation,
terrain height or AGL**. The ideal indication is computed in the worker from
JSBSim's actual static pressure. In the default standard atmosphere, the QNH
reference and standard setting coincide. Application adjustment bounds are
practice limits, not the selected aircraft's installed-instrument range.

Review shows the recorded pressure setting and indication; adjustment is disabled.
Changing a setting while paused replaces only the latest trace frame, and flight
reset restores the default setting. This is a bounded ideal instrument: aircraft
errors, lag, real weather and an accepted airport reference remain future work.
An older local engine without pressure exports leaves the indication unavailable;
run `just build-flight-engine` to rebuild it. See the
[source notes](../docs/research/2026-11-02-pressure-altimeter.md).

## Review a flight

Fly a gentle turn for about ten seconds, then select **Review** in the header.
Review becomes available after at least two flight-state samples. Entering review
releases held controls and pauses the actual flight engine. Drag the timeline or
select **Play** to inspect the recorded scene and instruments, including the
vertical-speed value captured with each sample. Space plays or pauses review;
V switches cockpit/chase views.

Select **Back to live** to return to the latest actual flight state. The engine
stays paused until you explicitly resume. Seeking through the recording never
restores the engine to an earlier state. Flight controls, sensitivity settings
and flight reset are unavailable during review. Throttle and pilot-axis positions
are not recorded and stay hidden or unset; recorded actual flap and brake values
are read-only.

This is a **recorded trace, not resimulated replay**. The current flight's recent
state history stays in page memory, bounded to 600 simulation seconds and 36,000
samples. Flight reset or page reload clears it. There is no export, persistence,
video recording, or input/event log. Full synchronized configuration, event and
input replay remains future work under the [replay contract](../docs/design/CONTRACTS.md).

## Practice map

Select **Map** in the header to show or hide a north-up practice map. It loads
MapLibre on demand and uses the same local overview/detail photographs as the
flight scene. The aircraft marker shows true heading; the plotted route uses up
to 600 points from the current flight's retained state trace. **Trace start**
marks the first retained sample, not an airport reference point. Flight reset
clears the route.

To try it, fly a gentle turn, open **Map**, then enter **Review** and drag the
timeline. The aircraft marker follows the selected recorded state. The route
shows the whole retained trace, including any part flown after the selected
review time; it is not a historical-only path. Use the map's zoom or **Fit**
controls to inspect it. These controls return keyboard focus to the flight
scene and do not change aircraft state or physics.

The map makes no external tile or map-service requests: its imagery and metadata
are local. It is geographic practice context, not a navigation chart. It does
not supply authoritative airport positions, fixes, radio information or
elevations, and it does not implement the complete EDDF region.

## Imagery and network access

CesiumJS 1.146.0 displays a bundled, openly licensed starter photograph from the
official Hessen HVBG dataset. The detailed approximately 3 × 2.8 km footprint is bounded
by 8.62–8.66° E and 49.95–49.975° N around EDFE. A coarse 512-pixel regional overview covers 8.4–8.9° E / 49.8–50.1° N
beyond the detailed foreground. Both photographs load once from the local
application; it does not depend on the live WMS or swap detail tiles while flying.
Outside the detail footprint the scene labels the coarse overview; outside the
overview footprint it reports missing photographic coverage.

[Source bounds, request, image hash and license](public/imagery/SOURCE.json) are
versioned with the asset. The [ATKIS DOP20 dataset](https://opendata.hessen.de/de/dataset/atkis-dop-20)
is published under [Data licence Germany – Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
The source image date is unknown; this is not current airport or chart information.
This small starter scene does not implement the EDDF/100 NM region.

Application, engine and imagery requests are local. There are no application
telemetry, account, provider/AI or learner-record uploads. Source refresh is a
separate deliberate update rather than a runtime dependency.

## What the prototype represents

- Dynamics run in the existing JSBSim module Web Worker at a fixed 1/120 s step,
  independently of rendering.
- The local study model is JSBSim's generic `c172x` (172P research configuration),
  **not the selected project-owned 172S**. Its model/data rights and applicability
  remain as documented in the study; it is not redistributed here.
- Aerial imagery is draped on the WGS-84 ellipsoid. There is no actual elevation
  model or accepted EDFE airport-height alignment. Imagery does not establish
  authoritative runway geometry, navigation data or chart material.
- Airspeed is ideal **CAS**, not a validated installed IAS indication; an older
  engine's TAS fallback is labeled. Heading is **true**, not magnetic.
  The pressure indication is an ideal instrument driven by JSBSim static pressure;
  its launch-point QFE is a practice reference, not an accepted airport datum.
  The study geometric height remains distinct from that indication.
- Aircraft handling, cockpit instrumentation and approach/landing behavior have
  not been validated for flight training. Installed-instrument fidelity, airport
  pressure references, navigation, checklists, radio and a scored circuit remain
  future increments.

See [ARCH](../docs/ARCH.md), [SPEC](../docs/SPEC.md) and
[contributor rules](../AGENTS.md) for the intended simulator and source boundaries.

## Verify

```sh
npm --prefix app run build     # strict TypeScript and UI bundle; excludes research runtime
npm --prefix app test          # worker/session lifecycle, input validation, served engine path
npm --prefix app run test:browser  # real JSBSim; local engine and installed Chrome required
```

The browser smoke also serves a temporary runtime copy without
`dist/jsbsim.{mjs,wasm}` (through `GEFLY_FLIGHT_RUNTIME`) and checks the build hint.
Only the failed `dist/jsbsim.mjs` import is exercised; a missing `jsbsim.wasm`
alone is not separately covered. The copied runtime includes `altimeter.js`,
`cockpit.js` and `engine.js`, so the project-owned instrument modules remain available during this
negative case. The development runtime serves only `worker.js`, those three modules
and the three declared engine/build-record files; these research runtime files are excluded from the
production UI bundle.

Node.js 24.2+ and Python 3 are required for the development checks. The browser check starts temporary servers on
127.0.0.1:5174, 5175, 5177 and 5178 and writes ignored screenshots to `output/flight/`.
Set `CHROME` to an executable path if Chrome is not installed in its usual
location. `just fly` uses 127.0.0.1:5173. Without `just`, invoke the study build
with `bash studies/e1-browser/sim/build.sh output/flight/engine-build`, then
`npm --prefix app run dev`.
