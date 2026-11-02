# Browser flight prototype

Fly an airborne JSBSim research aircraft with keyboard, touchpad or on-screen
controls, a classic six-pack flight deck and cockpit/chase views. CesiumJS displays Hessen
aerial imagery in a bounded practice area around an approximate EDFE starting point. This is an experimental
slice toward the [first browser exercise](../docs/TODO.md), not a completed or
validated PPL exercise.

The airspeed face includes white/green/yellow CAS-reference arcs and critical
speeds for the active research 1982 C172P. These are fixed manufacturer references,
with stall endpoints at 2,400 lb, most forward CG, power off and zero bank; they
are not installed IAS markings or current-weight stall predictions. See the
[source/applicability note](../docs/research/2026-11-02-c172p-airspeed-markings.md).
Legacy TAS-only engines suppress these CAS markings.

The panel fits its contents and scales inline controls together. On narrow
views, Engine and Radio open separately while primary instruments and
autopilot/flap/trim controls remain inline.

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
approximate EDFE coordinates: 1,300 ft MSL (DHHN2016 physical height) and 90 kt true airspeed. Choose **Flight → Taunus ridge flight** to see the hills immediately from a separate airborne demonstration.

The engine build reuses the [existing browser study recipe](../studies/e1-browser/sim/README.md).
Its generated WASM and bundled research-model data stay in ignored local build
directories; they are not committed or supplied as a public simulator download.
A missing or failed engine build is an error, not a switch to scripted flight.

## Controls

Restart flight is in the top **Flight** menu. Review keeps the live flight paused
and displays the selected recorded throttle, commands and available actuator
positions as read-only values. Missing values from older engine builds remain
unavailable. Returning to live restores pending control settings.


| Input | Action |
| --- | --- |
| Arrow up/down | Push nose down / pull nose up |
| Arrow left/right | Ailerons |
| Q / W | Left / right rudder |
| 1–9 | Set throttle to 10–90% |
| 0 | Set throttle to idle |
| P | Capture true heading / disconnect heading hold |
| Space | Start / pause / resume |
| R | Enter / leave recorded Review |
| V | Switch cockpit / chase view |
| S | Toggle engine and airflow sound (off by default) |
| E | Request engine ignition/starter on or off |
| / | Restore initial trim |
| [ / ] | Retract / extend flaps one 10° detent |
| B (hold) | Apply both wheel brakes; release to let go |
| ' / \\ (hold) | Elevator trim nose up / nose down |
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
then drag. During live flight, releasing returns to the prior yoke mode and
centers the temporary look. Leaving the scene or window neutralizes the yoke
axes while preserving its mode and original anchor. Re-entering immediately
uses the pointer position relative to that anchor as the authoritative input;
no new click is needed. An actual window focus loss still pauses flight and
clears transient controls, as do Escape, a modal or entering Review.
Header buttons, instrument controls and the joystick do not toggle scene yoke.

Use **two fingers to scroll vertically over the flight scene** to adjust the
camera field of view (FOV): scroll up to zoom in with a narrower perspective, or
down to zoom out with a wider perspective. The default is **60°**, bounded to
**20–100°**. This changes only the camera perspective, never the aircraft's state
or physics. It works in cockpit and chase views, including while paused or in
Review. The chosen FOV survives a view switch and is independent of yoke mode
and hold-drag look. Scrolling over dialogs or the practice map keeps those
interfaces' normal behavior; Ctrl/pinch events bypass this FOV control.

The scene crosshair marks the aircraft's **body-forward direction**. Hold-drag
to look sideways and it moves across the screen to show where the nose points;
an edge chevron guides you when that direction lies outside the visible view.
The marker hides when the nose direction is behind the camera. It also works
while paused. Try hold-drag in Review, where releasing retains the inspection
view, then scroll to change FOV: the marker follows the actual camera perspective
and the displayed aircraft state. It is an orientation aid, not a flight-path,
velocity or control-input indicator, and does not change flight physics or
claim a real C172 HUD installation.

Use the **0° / 10° / 20° / 30°** flap buttons, **[** to retract or **]** to extend
while flying. The
selector sets the generic model's target; the displayed actual flap angle takes
time to move. Hold the **wheel brake** button or B to apply both main-wheel
brakes at the **Options → Wheel brake command** setting (initially 25%, adjustable
from 0–100%); the button shows the selected command. Release, pause or focus loss
clears the held command. This session input preference is not aircraft brake
pressure or a force limit. Maximum commanded braking can compress this generic
model’s linear nose strut enough for a propeller strike; actual collisions remain
enabled, with no brake-triggered exemption. Brakes act through
wheel contact, not as an airbrake, so they do not directly slow the initial
airborne flight. Ready flight controls remain available while paused; commands are staged until
Resume without advancing physics. Recorded Review remains read-only.
These controls use the research aircraft's existing model, not accepted 172S
performance data. See [control sources](../docs/research/2026-11-02-classic-controls.md).

Use **View → Flight controls** in the top menu to show or hide the on-screen
flight-control panel. Hiding it releases transient held inputs while retaining
throttle, trim and the other selected settings. Use **Flight → Restart flight**
to restart; the R shortcut also remains available. **Options** is a top-menu
action. Keyboard remapping is later work.

Open **Options** in the header to adjust pitch, roll and rudder sensitivity from
25% to 150%. **Default** uses 100% on all three axes; **Gentle** uses 50% pitch,
50% roll and 70% rudder. Opening the dialog pauses flight. Changing settings,
selecting **Done**, or pressing Escape does not resume it; use **Start flight**
or **Resume flight** when ready. Closing the dialog returns keyboard focus to
the flight scene.

To compare the response, start a flight, open **Options**, select **Gentle**,
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

## Elevator trim

Hold the **'** key for nose-up elevator trim or **\\** for nose-down trim while flying,
or adjust the vertical trim slider. The flap detents are vertical beside it. The command stays set when the key is released and
across pause/resume and Review. Adjustment is available while paused, with
physics unchanged until Resume; recorded Review remains read-only. The **/**
key or middle keycap restores the command computed when this flight
started. Restarting the flight computes its initial trim again.

This uses the generic c172x model's normalized pitch-trim command, added to the
pilot's elevator command. Negative trim commands nose up; positive commands nose
down. The [pinned JSBSim v1.3.3 c172x control definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
defines that pitch-control sum; [FGFCS documents the control path](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGFCS.h).
The indicated command is not a physical trim-tab angle, calibrated trim-wheel
position or validated selected-172S behavior. The existing roll-only autopilot
does not control elevator trim; trimming leaves its roll mode unchanged.

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

## Classic panel layout

The desktop panel arranges eight round instruments in **two rows of four**:
airspeed, attitude, altimeter and NAV1 above turn/slip, heading, vertical speed
and NAV2. The six-pack occupies its own rounded panel. Desktop panel columns
share their top and bottom edges; autopilot sits above the compact flap/trim pair. Throttle and mixture form a
matching vertical pair in the engine panel.
Explanations and model/system limits are in **Options → Model & systems
information**, leaving labels, units, controls and flags on the panel. Mobile
NAV instruments are available through **View → NAV instruments**.

## Engine and autopilot controls

The engine panel shows actual model RPM, manifold absolute pressure, oil pressure
and temperature, fuel quantity/flow and exhaust temperature. Read the displayed
units: these are research-engine readouts, not an accepted recreation of the
selected 172S's installed gauges. The research aircraft has a fixed-pitch propeller.

Use the vertical **Throttle / Mixture** pair in the engine panel. Paused edits
retain their requested lever positions and apply when physics resumes; displayed
engine indications remain actual values. Use **Mixture** to change its command. Automatic mixture is
retained initially; entering a manual setting disables the generic model's
automatic-mixture channel. The panel distinguishes automatic/manual operation and
the applied value. Throttle shortcuts 1–9 select 10–90%, while 0 selects idle;
the throttle slider provides finer adjustment.

The separate autopilot box sits above the flap/trim controls. It offers **wings level** and **true-heading hold**, using the
model's existing roll controller. Capture the current heading with P, or use the
heading-hold control; P also disconnects heading hold. Use the displayed mode and
target to see what is engaged. Manual pitch/roll/rudder control disconnects the AP rather
than adding a hidden command against it. The roll correction is suspended while
AP owns roll. This is a roll-only research controller: altitude, throttle and
mixture remain the pilot's responsibility. It is not a validated installed
C172S autopilot or a coupled approach system.

The classical **ALT / NAV / APR / REV** controls are explicitly **INOP**;
their presence does not engage altitude, navigation or approach guidance.
Full classical autopilot behavior and a later fullscreen modern instrument
overlay with ILS markers remain roadmap work.

## Landing practice

The **Flight** menu provides landing-practice presets **Baseline touchdown**, **Fast descent**, **Sideways touchdown**
and **Banked touchdown**, starting at 3 m CG height, 28 m/s forward speed and
4° nose-up attitude. Baseline descent is 1.5 m/s; Fast descent uses 4 m/s,
Sideways adds 4 m/s sideways velocity, and Banked adds 8° right bank.
These numbers define repeatable fixtures, not landing operating limits. These repeatable contact studies use a flat **0 m ellipsoid
surface**, not EDFE's real elevation or a surveyed airport runway. Starting a
preset resets the flight; inspect its initial condition, start flight, and compare
the resulting contact, bounce and lateral motion.

The local model reuses JSBSim's existing landing-gear forces and moments, including
spring/damper reactions and wheel friction. Contact/load and slip indications
describe the simulation's response. The [pinned FGLGear documentation](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.h)
and [implementation](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGLGear.cpp)
explain those reactions; the [c172x definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
supplies the generic model's contact geometry and coefficients. This does not
simulate component damage or establish safe landing loads, aircraft-specific
limits, selected-172S fidelity or a validated landing exercise.

## Radio and navigation controls

The gray instrument panel places two round **NAV1 / NAV2** gauges beside the
six-pack, with a separate vertical radio stack to the right. Each NAV gauge has
an independent OBS course, CDI needle, TO/FROM indication and NAV flag.
Glideslope is explicitly **INOP**. The radio stack provides **COM1 / NAV1** and
**COM2 / NAV2** amber active/standby displays, tuning and swap controls. COM uses an
explicitly labeled **25 kHz subset**; it does not implement the full European
8.33 kHz channel set. COM tuning does not provide ATC or voice communication.

Opt in to the fictional **LAB** navigation demonstration to explore the NAV
controls. Its demonstration frequency is **113.8 MHz**, at **49.96° N, 8.643° E**.
These are synthetic exercise settings, not a real published station, frequency
assignment or accepted navaid database. The demonstration does not implement
an ILS receiver or establish usable real-world navigation coverage.

To try it, start flight, enable **LAB**, tune NAV1 standby to **113.80**, then swap
it active. Adjust NAV1's OBS and watch its matching gauge. Give NAV2 a different
OBS course or active frequency to compare the two receivers independently. LAB
off, an unmatched active channel or unavailable geometry leaves the NAV flag
visible and the needle unavailable. Review uses captured tuning and position;
its radio and OBS controls are read-only.

The user's C172 cockpit poster guides the arrangement and interaction; the
gauges and controls are project-authored. No poster bitmap or branded instrument
assets are redistributed. This resemblance does not confirm an exact aircraft
variant, installed avionics fit or validated receiver/ILS behavior.

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

Fly a gentle turn for about ten seconds, then press **R** or select **Review** in the header.
Review becomes available after at least two flight-state samples. Entering review
releases held controls and pauses the actual flight engine. Drag the timeline or
select **Play** to inspect the recorded scene and instruments, including the
vertical-speed value captured with each sample. Space plays or pauses review;
V switches cockpit/chase views.

In Review, **click-and-hold, then drag** to change the inspection camera. Releasing
keeps the new view; later drags accumulate from it, and timeline scrubbing leaves
that orientation intact. A short click does not enable yoke control. Escape
centers the view. Camera inspection never changes the recorded or live aircraft
state.

Press **R** or select **Back to live** to return to the latest actual flight state. The engine
stays paused until you explicitly resume. Seeking through the recording never
restores the engine to an earlier state. Control changes, sensitivity settings
and flight reset are unavailable during review. The throttle, pilot-axis commands,
actual left/right ailerons, elevator/rudder angles, flap lever/position, brakes,
trim, mixture and avionics show the selected recorded sample as read-only. Older
engines without the new control telemetry show those fields as unavailable.
Pending live throttle/mixture/flap/trim selections return when leaving Review.

This is a **recorded trace, not resimulated replay**. The current flight's recent
state history stays in page memory, bounded to 600 simulation seconds and 36,000
samples. Flight reset or page reload clears it. There is no export, persistence,
video recording, or input/event log. Full synchronized configuration, event and
input replay remains future work under the [replay contract](../docs/design/CONTRACTS.md).

## Ground collision

Normal wheel landings continue through the model's spring/damper/friction response.
A native tail/wingtip contact or collision with the shared illustrative fuselage,
propeller/spinner or fin outline stops the flight at its first detected fixed step.
Controls and Resume stay locked, engine audio stops, and the final state remains
available for **R → Review** and hold-drag camera inspection. Use **Flight → Restart
flight** to start again. In Review, the banner follows the selected recorded frame.

Normal flights use the bounded public terrain surface. Native gear/structure contacts sample it at each contact point; visual body/propeller/fin proxies use the local DEM triangle plane. Flat landing studies remain explicit. Neither profile supplies building collision, calibrated damage geometry or continuous collision detection. Contact is
sampled after each fixed step; up to one step of penetration can remain, rather
than a continuous collision solve or a repositioned aircraft. Missing older-engine
contact data is explicitly unavailable. No hard-landing damage threshold is invented.

## Engine sound

Sound starts **off**. Press **S** or the speaker beside the clock to enable the
original synthesized piston/propeller sound; press S again to mute. Pitch follows actual propeller RPM; actual manifold pressure and fuel
flow shape the engine's load/timbre. The speaker button beside the flight clock
mutes/unmutes at any time, including Review. **Options → Engine sound** adjusts
volume. A locked/blocked browser can be retried with the speaker button; missing
Web Audio does not block flying.

Pause, hidden/focus-lost pages, failed/reset flights and paused Review are silent.
Playing Review synthesizes the selected captured engine state. Zero RPM or missing engine telemetry silences engine channels; independent
airflow noise follows valid actual TAS. Fuel cutoff or actual stopped-engine
state removes combustion while a rotating propeller can retain mechanical sound. This is a procedural
approximation, not a calibrated recording of an installed aircraft. It uses no
microphone, downloaded sample, provider service or extra runtime dependency.

## Spatial stall awareness

Open **View → Stall awareness** to inspect six reference wing regions. The
original diagram and table show a kinematic local airflow-angle estimate and
headroom to the generic model's common positive-AoA reference. Actual air-relative
motion, angular rates and current CG drive the display, including during recorded
Review. Rolling can produce different left/right readings; aircraft bank alone
is not a local stall measurement. The panel leaves the cockpit height unchanged.

These are **estimates, not measured flow separation**. Below-reference is not a
safe/attached-flow indication, and negative-angle stall boundaries are not
established. Twist, induced flow, downwash and local flap/aileron effects are not
resolved; tail/fuselage are unknown. Low/reversed flow and missing older-engine
telemetry remain unavailable. No additional aerodynamic forces or damage limits
are introduced. Source applicability and frames are documented in the
[research note](../docs/research/2026-11-02-spatial-stall-awareness.md).

## Flight data and handbook

Open **View → Flight data** for signed ground-relative flight-path gradient
(climb positive, descent negative), horizontal ground speed and vertical speed.
Below 1 m/s horizontal ground speed, gradient is unavailable. The panel also
shows each wheel's contact, compression, modeled strut load and slip, plus
structure-contact indications. These use the selected live or recorded Review
sample; the loads are not component stress or damage limits. This adds no
height to the cockpit. Close it with its button or Escape.

Open **View → Aircraft handbook** for original loading/CG, published flight-load-factor/airspeed
references, critical CAS-speed and generic gear-geometry diagrams, with accessible tables and source links. These
are 1982 C172P references for the active research model; they do not establish
selected-172S fidelity or a live mass/CG calculation. Opening the handbook pauses
flight or Review playback; closing it leaves the flight paused until Resume.
Published flight-envelope references do not supply a complete stall/gust envelope
or a live load-factor point. No manual pages or images are bundled or fetched
when the handbook opens.

## Practice map

Select **View → Map** in the header to show or hide a north-up practice map. It loads
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
- Normal flights use public DGM/GCG terrain; explicit landing studies retain the flat ellipsoid. There is no accepted surveyed runway-elevation
  model or accepted EDFE airport-height alignment. Imagery does not establish
  authoritative runway geometry, navigation data or chart material.
- Airspeed is ideal **CAS**, not a validated installed IAS indication; an older
  engine's TAS fallback is labeled. Heading is **true**, not magnetic.
  The pressure indication is an ideal instrument driven by JSBSim static pressure;
  its launch-point QFE is a practice reference, not an accepted airport datum.
  The study geometric height remains distinct from that indication.
- Aircraft handling, cockpit instrumentation and approach/landing behavior have
  not been validated for flight training. Installed-instrument fidelity, airport
  pressure references, real-data navigation, checklists, ATC communication and a scored circuit remain
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
127.0.0.1:5174, 5175, 5177, 5178, 5180, 5181, 5183 and 5184 and writes ignored screenshots to `output/flight/`.
Set `CHROME` to an executable path if Chrome is not installed in its usual
location. `just fly` uses 127.0.0.1:5173. Without `just`, invoke the study build
with `bash studies/e1-browser/sim/build.sh output/flight/engine-build`, then
`npm --prefix app run dev`.

### Engine switch and airflow sound

Press **E** or the engine panel’s **ENG ON/OFF** switch to request ignition and
starter operation. **RUN/STOP** shows actual native combustion state, independently
of the selected command. Paused commands apply when flight resumes; Review and
collision frames remain read-only. Off cuts ignition without forcing propeller RPM
to zero. On enables both magnetos and native cranking until running, without
changing throttle or mixture. Fuel/mixture can prevent a successful start. Battery,
priming, starter duty limits and an installed C172 starting checklist are unmodeled.
An older local runtime shows ENG INOP: rebuild with `just build-flight-engine`.

Sound remains **off by default**, with **S** to toggle. Original broadband airflow
noise and a subtle whistle follow actual true airspeed, including engine-off glides;
the whistle is a broad airy noise band that emerges at higher airspeed and
disappears at low or zero airflow; engine exhaust
uses the actual running flag, while windmilling can retain rotation sound. Playing
Review follows recorded values. This is sound design, without calibrated cockpit
acoustics or simulated weather gusts; it uses no microphone or downloaded audio.

### Compact classic panel

The separate six-pack housing sits beside a 2×2 secondary block: NAV1/NAV2
above **BRG/DME** and **PROP RPM**. BRG points to the opt-in fictional LAB station
using true heading and direct spherical bearing; it is independent of the VOR OBS
setting and is not an installed ADF/NDB receiver. DME remains geometric slant
distance. RPM follows actual propeller rotation, with a sourced generic model
2700 RPM marker, without invented operating arcs.

The engine column precedes autopilot/flaps/trim and includes a distinct round
left/right fuel gauge plus vertical throttle and mixture. Fuel follows actual
model tank contents; its full-scale capacity uses the pinned model's default
fuel density, rather than a C172S usable-fuel or reserve figure. Desktop columns
share their top/bottom edges on a shorter panel. All inline controls keep the same
scale; engine and radio move to dialogs on narrow views, while all four secondary
round displays remain available through **View → NAV instruments**.

The audio mix also uses actual wheel contact and ground motion for rolling and
brief touchdown sounds. Initial frames, pause/resume and seeking do not invent a
wheel impact. Engine-only idle is quieter than higher-RPM operation at matched
load; all layers remain behind the same S mute and lifecycle controls.

Chase view now uses the aircraft mesh to cast a soft native Cesium sun shadow on
the active terrain receiver near the ground (or the flat receiver in explicit contact studies). It follows the selected live/Review
state, fades with height and is hidden at or above 120 m AGL or when compatible
ground data is missing. The scene uses a fixed sun/date; the shadow is a viewing cue, not another source of contact physics.

## Public terrain and sharper imagery

Normal flights use the local public Hessen package spanning 8.45–8.90°E and
49.85–50.35°N. It contains real Rhine–Main/Taunus elevations from the official
32 m overview of DGM1, resampled to approximately 32–54m point spacing. Native
wheel/structure contacts sample this surface with slope normals at fixed steps.
DHHN2016 physical heights drive the atmosphere and dynamics; GCG2016/2023
quasigeoid offsets are added only for rendering. Review retains the actual
height fields. Missing/corrupt data and coverage exits stop flight, without an
invisible flat-ground fallback. Rebuild the local engine after updating.

Try **Flight → Taunus ridge flight**, then Start and Chase, for an immediate
terrain demonstration. It is not a published route or procedure. The four
**Flat-ground landing study** presets retain their previous isolated fixtures.

The sharper airport overlay has approximately 0.75 m output pixels, sampled from
public 20 cm orthophotography, over the wider starter photograph. Derived relief
shading covers the DEM outside photographic coverage. A tile pyramid/cache can
extend higher-resolution coverage later, loading detail by view rather than
stretching a regional JPEG. Current imagery has no established capture date and
is not airport/runway reference data. See the [terrain package](public/terrain/README.md),
[imagery provenance](public/imagery/DETAIL-SOURCE.json) and
[third-party notices](../THIRD_PARTY_NOTICES.md).
