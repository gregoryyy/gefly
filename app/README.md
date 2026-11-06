# Browser flight prototype

Fly an airborne JSBSim research aircraft with keyboard, touchpad or on-screen
controls, a classic six-pack flight deck and cockpit/chase views. CesiumJS displays
public regional terrain and photography around an approximate EDFE starting point,
with streamed coverage reaching Westerwald, Marburg/Lahn and Kassel, as well as Darmstadt, Odenwald and Spessart. This is an experimental
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
python3 -m pip install -r utils/scenery/requirements.txt  # Pillow 11.2.1 for live photos
just build-flight-engine   # first run: downloads the pinned SDK and JSBSim sources
just fly
```

Open the local URL printed by the development server, then select **Start flight**.
The application loads paused so the aircraft cannot fly away while you inspect
the controls. Starting or resetting uses the same airborne initial state near
approximate EDFE coordinates: 1,300 ft MSL (DHHN2016 physical height) and 90 kt true airspeed. Press **I** to show the initially hidden menu. Choose **Flight → Taunus ridge flight**, **Darmstadt flight**, **Odenwald ridge flight** **Spessart flight**, **Westerwald flight**, **Marburg / Lahn flight** or **Kassel flight** for separate airborne demonstrations.

The engine build reuses the [existing browser study recipe](../studies/e1-browser/sim/README.md).
Its generated WASM and bundled research-model data stay in ignored local build
directories; they are not committed or supplied as a public simulator download.
A missing or failed engine build is an error, not a switch to scripted flight.

## Controls

The top title/menu bar and flight-control overlay start hidden. **I** toggles the
top bar; it does not control the central Start/Pause card. **View → Flight controls** toggles
the flight controls. Floating controls, map, flight-data and stall-awareness
panels show at 50% opacity until activated. The first click activates and consumes
that gesture; click again to operate a control. Clicking elsewhere deactivates
the panel. Activation releases held flight axes and scene yoke mode. Keyboard Tab
can activate a panel for accessible use. The main cockpit deck and modal dialogs
retain their normal opacity and behavior.

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
| P | Autopilot on / off (simulator shortcut) |
| A | Engage autopilot HDG + ALT at current heading/pressure altitude |
| = | Cycle simulation rate 1× → 1.5× → 2× → 5× → 10× → 1× |
| M | Open / close the flight map |
| , | Toggle the extended menu below the map |
| . | Cycle terrain landmark labels: Off / Places / Landmarks / Detailed |
| I | Show / hide the top title/menu bar |
| O | Open Options |
| Space | Start / pause / resume |
| R | Enter / leave recorded Review |
| V | Switch cockpit / chase view |
| S | Toggle sound, including flight-warning cues (off by default) |
| E | Request engine ignition/starter on or off |
| / (US keyboard) | Toggle vector / photographic terrain |
| [ / ] | Retract / extend flaps one 10° detent |
| B (hold) | Apply both wheel brakes at the Options command; release to let go |
| N | Toggle the parking brake on / off |
| ' / \\ (hold) | Elevator trim nose up / nose down |
| Two-finger vertical scroll over the scene | Up: zoom in; down: zoom out |
| Escape | Release scene yoke control and reset the view |

Press and hold the on-screen flight buttons, or drag the virtual joystick to
control pitch and roll; releasing returns the stick to neutral. The flight deck
displays control positions. Flight buttons return keyboard focus to the scene; range controls
retain focus for accessible adjustment. Losing window focus pauses the flight
and releases held inputs. Optional flight hardware and phone orientation are
later work.

The default touchpad yoke uses the **center of the visible flight window** as
neutral, above the cockpit and beside a docked map. **Short-click the unobstructed
scene** to toggle yoke control. Click location does not move that center; resizing
or docking the map updates it. The faint circle marks the same neutral reference
used by the controls. Browser pointer position is used, not physical touchpad contact.

Hold-click for about a quarter-second and drag to look around. Release retains
the camera angle and restores the prior yoke mode with neutral input until actual
movement or re-entry. Start, pause and Options release commands without forgetting
the selected center. Window focus loss cancels steering; Escape or flight restart
resets the view. Instrument controls do not toggle scene yoke. Passive pointer
movement during AP control does not disconnect it; use P or deliberate manual
controls to take over, or hold CWS to hand-fly temporarily.

**Options → Centered touchpad controls** starts on and survives Default/Gentle
sensitivity presets. Turn it off for click-relative steering: the activation click
sets the neutral anchor and circle, and hold-look keeps that anchor. Both modes
retain camera orientation after drag. Settings last for the page session; gains
and aircraft physics are unchanged. Review permits read-only camera inspection.

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

The **parking brake** button sits beside the wheel-brake button. Click it or
press **N** to toggle full commanded braking on both main wheels; its pressed
state shows the live latch. This is independent of the Options wheel-brake
percentage. Releasing B, pausing, opening Options, hiding controls or losing
focus clears held inputs but keeps the parking brake latched. Press N again to
release it; restarting the flight or reloading starts with it off. Parking brake
changes made while paused are staged until Resume. It uses existing wheel-contact
braking, with native braking forces and collision limits; it does not freeze
the aircraft. Review disables the toggle and shows its latch as unavailable: recorded
applied brake values do not identify which live control requested them.

These controls use the research aircraft's existing model, not accepted 172S
performance data. See [control sources](../docs/research/2026-11-02-classic-controls.md).

Use **View → Flight controls** in the top menu to show or hide the on-screen
flight-control panel. Hiding it releases transient held inputs while retaining
throttle, trim and the other selected settings. Use **Flight → Restart flight**
to restart; **R** enters and leaves
recorded Review. **Options** is a top-menu
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
the current page session; restarting through **Flight → Restart flight**
preserves them. They
change input response, not the aircraft's physics or calibration.

**Options → Link rudder to aileron** adds a session-only input assist, off by
default. Deliberate left/right aileron input also commands rudder for the same
turning direction; explicit Q/W rudder input takes priority. The mix uses the
pilot's roll input before the experimental roll correction, so centered controls
do not acquire a rudder command from that offset. It does not mix autopilot
outputs or represent a mechanical linkage in the aircraft. Default/Gentle
sensitivity changes preserve the checkbox; reloading the page returns it to
off. The research model already couples rudder input to nosewheel steering, so
Q/W—and linked roll input when enabled—also steer on the ground through the
existing gear model. No new steering coefficients or aircraft calibration are
introduced.

Normal flights start with **zero roll correction** and no legacy external load.
The generic source model contains an 80 lb external station 12 ft to the right;
normal launches unload it while retaining the source seating and fuel values.
Weight & fuel still exposes it for deliberate experiments. Recorded loading and
legacy continuation keep their declared historical policy.

The **roll correction** remains an optional constant aileron command, not aircraft
trim. **Off · 0%** restores neutral; **Legacy study offset** selects the old
−0.109375 fixture value. That value was specific to the asymmetric study setup
and can cause substantial roll in normal loading. Sensitivity does not scale it;
AP suspends it and disconnect restores the selected value. Rudder linking is an
input convenience, not calibrated turn coordination. Native actuator hysteresis,
residual untrimmed drift and failed high-speed trim remain model limitations.

Q is left rudder and W right rudder. Positive `rudder_cmd_norm` yaws left in the
pinned generic model.

**M** opens and closes the flight map. **Comma (,)** opens the extended menu below it over the right cockpit panels.
**Period (.)** cycles terrain landmark labels. **/** (Slash on a US keyboard)
toggles vector/photo terrain. **O** opens Options and **I** toggles the title/menu bar. Unassigned menu
actions remain clickable; no Option/Alt–Shift combinations are installed.
Keyboard shortcuts keep typing, modal and repeat guards.

## Simulation rate

Press **=** to cycle the requested live-flight rate through **1×, 1.5×, 2×, 5×,
10×** and back to **1×**. The on-screen overlay identifies the rate. Acceleration
changes the worker's wall-clock pacing, not its fixed **1/120 s** integration
step, aircraft coefficients or control gains. High requested rates are best
effort on the current machine; rendering or physics load can reduce the achieved
rate. Pause and terrain-loading stops remain real stops, without integrating the
waiting interval as a giant physics step. Restart returns to 1×. Recorded Review
does not command the live flight's acceleration or restore physics from history.

## Elevator trim

Hold the **'** key for nose-up elevator trim or **\\** for nose-down trim while flying,
or adjust the vertical trim slider. The flap detents are vertical beside it. The command stays set when the key is released and
across pause/resume and Review. Adjustment is available while paused, with
physics unchanged until Resume; recorded Review remains read-only. The middle
trim reset button restores the command computed when this flight started. Restarting the flight computes its initial trim again.

This uses the generic c172x model's normalized pitch-trim command, added to the
pilot's elevator command. Negative trim commands nose up; positive commands nose
down. The [pinned JSBSim v1.3.3 c172x control definition](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
defines that pitch-control sum; [FGFCS documents the control path](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/FGFCS.h).
The indicated command is not a physical trim-tab angle, calibrated trim-wheel
position or validated selected-172S behavior. A manual trim command change now
disconnects the two-axis autopilot; automatic trim-servo behavior is not modeled.

The chase aircraft has separate hinged rudder, ailerons, elevators and flaps.
They follow actual simulated surface positions, including trim/autopilot effects
and selected replay frames; moving the camera does not change the aircraft.

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

The fitted cockpit keeps labels at least 7 CSS px and keycap text at 10 px at scale 1;
smaller viewports scale the whole surface down. OIL PRESS, OIL TEMP, FUEL FLOW
and EXHST GAS each keep their label, reading and unit on one compact line, with
the full names as tooltips.

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

The separate autopilot box models the **KAP 140 two-axis unit with altitude
preselection**. A browser click represents the physical quarter-second AP press;
a long press also works. Click **AP** to engage ROL plus current vertical speed;
press AP to disconnect. **P** is
a simulator shortcut for AP on/off. **A** is a separate simulator convenience:
with manual axes released, it engages **HDG + ALT** at the worker's current true
heading and pressure altitude. Press A again to disconnect; pressing it while
capture is pending also cancels the engagement. This is not a physical KAP 140 button. **HDG** follows the separate **DG BUG · TRUE**
control; HDG alone does not engage a disconnected unit.

**ALT captures the current pressure altitude**, independent of the altitude
selector. Press it again for VS. Change the selected altitude and set a VS toward
it. Selecting a target while AP is engaged automatically arms capture; check
**ALT ARM**. **ARM** toggles arming, so press it only if capture is not already armed. **UP/DN** adjust VS in
100 ft/min steps while VS is visible; the first press displays a hidden VS
without changing it. Holding changes VS at 300 ft/min/s. In ALT, taps change the
hold reference by 20 ft; holding requests 500 ft/min, then release captures the
actual altitude. VS commands use the source-scoped −2000 to +1500 ft/min range.

Example in this simulator: to move from a 1,300 ft hold to 5,000 ft, enter
**5,000 FT**, press **ALT** to switch from ALT to VS, use **UP** to select a
positive rate such as **+500 FPM**, then check **ALT ARM**. Press **ARM** only
if that annunciation is absent; pressing it when already armed cancels capture.
If already in VS, skip ALT after selecting the new target. The first UP/DN
press may only reveal the shared VS page; subsequent presses change its value.
The separate commanded-VS readout stays visible throughout VS mode. The autopilot captures the selected altitude and returns to ALT.
Changing the selected number alone does not start a climb. **A** holds the
current altitude/heading; it does not command flight to the selected number.
Throttle remains manual; this example describes control logic, not calibrated
climb performance or a flight procedure.

**BARO** displays the AP's separate pressure setting for 3 s; hold it 2 s to
change hPa/inHg. It changes indicated/preselected altitude conversion, preserving
the captured pressure-altitude hold reference. Numeric entry and selector step
buttons are simulator conveniences; hardware knob detents are not established.
The current ideal pressure-sensor range is −2 km to 11 km; incompatible
selector/BARO combinations are rejected without changing the active controller.

The independent altitude alerter shows **ALERT** on approach through 1000 ft
from the selected altitude, clears within 200 ft, flashes briefly on first
target crossing and warns when departing the 200 ft band. Five short tones
respect the sound preference (**S**, initially off), volume, pause and Review.
Warning timbre is original sound design. Selector/BARO edits establish a silent
baseline; replay seeks discard old warning events instead of replaying a backlog.

**NAV/APR** use worker-confirmed NAV1 validity from the historical regional
package or isolated opt-in LAB. Select an actual source in **Radio → Stations**,
load standby and swap active. Set the DG TRUE bug to the intended true course;
VOR OBS uses historical station magnetic calibration, while LOC course is fixed
TRUE. DG arming prompts HDG for 5 s. **REV is active only with LOC tuning** and
inhibits GS. APR uses explicitly paired GS only. Missing components, ambiguous
co-channel sources and source loss remain flagged; no current service is inferred.

Try **Flight → EDDF 25C ILS practice · historical**: the aircraft starts five NM
from the historical glideslope antenna, below the beam at 90 kt, with NAV1 IFCW
111.55, NAV2 FFM 114.20 and the DG bug set to the LOC true course. Click AP, select APR and start flight. This demonstrates geometric capture
over the existing public terrain; it is not a published procedure or clearance.

This is an operating-logic model over reused generic JSBSim controllers, not a
validated installed C172S KAP 140. Capture anticipation, normalized CDI capture
threshold and GS correction are explicit simulator conventions. Hardware PFT
timing, electric trim-servo/fault response and aircraft-specific calibration are
not modeled. Raw manual axes/trim automatically disconnect as a simulator safety
substitution; throttle and speed management remain manual. All guidance runs in
the fixed-step worker. Paused adjustments preserve native physics, and Review
shows captured settings/modes read-only. See [source scope](../docs/research/2026-11-03-kap140.md).

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
NAV1 has an independent glideslope cross-needle and GS flag; NAV2 has lateral guidance only. The radio stack provides **COM1 / NAV1** and
**COM2 / NAV2** amber active/standby displays, tuning and swap controls. COM uses an
explicitly labeled **25 kHz subset**; it does not implement the full European
8.33 kHz channel set. COM tuning does not provide ATC or voice communication.

Normal receivers use the bundled **2013.10 historical** Rhein-Main snapshot:
31 VOR-family records, 39 localizers and 16 standalone DMEs, with only explicitly
paired GS/DME components. **Stations** lists identifiers, frequencies, runways and
capabilities and loads either standby receiver without silently activating it.
The approximate 100 NM extent uses a community EDDF coordinate, not a verified
official ARP. This is not current AIRAC/NOTAM, a chart or real-flight information.
See [source, rights, coverage and reproduction](public/navdata/README.md).

Opt in to **Fictional LAB only** to isolate the synthetic NAV demonstration. Its demonstration frequency is **113.8 MHz**, at **49.96° N, 8.643° E**.
These are synthetic exercise settings, not a real published station, frequency
assignment or accepted navaid database. The demonstration does not implement
an ILS receiver or establish usable real-world navigation coverage.

To try it, start flight, enable **LAB**, tune NAV1 standby to **113.80**, then swap
it active. Adjust NAV1's OBS and watch its matching gauge. Give NAV2 a different
OBS course or active frequency to compare the two receivers independently. LAB
only mode excludes the regional records. Unmatched channels, unavailable components,
invalid geometry or ambiguous co-channel service remain flagged. Review uses captured tuning and position;
its radio and OBS controls are read-only.

The user's C172 cockpit poster guides the arrangement and interaction; the
gauges and controls are project-authored. No poster bitmap or branded instrument
assets are redistributed. This resemblance does not confirm an exact aircraft
variant, installed avionics fit or validated receiver/ILS behavior.

The instruments and the flight worker must load byte-identical navigation data
(matching SHA-256). Otherwise a visible alert appears, and regional guidance and EDDF
ILS practice are disabled. An older local runtime that does not report its hash also
fails closed; rebuild it.

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
Pending live throttle/mixture/flap/trim selections and the parking-brake latch
return when leaving Review.

This is a **recorded trace, not resimulated replay**. The current flight's recent
state history stays in page memory, bounded to 600 simulation seconds and 36,000
samples. Flight reset or page reload clears it. There is no export, persistence,
video recording, or input/event log. Full synchronized configuration, event and
input replay remains future work under the [replay contract](../docs/design/CONTRACTS.md).

Missing recorded throttle, flap command or stick positions show NO DATA in Review,
never idle, UP or centred.

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

Sound is off by default; the status reads "Sound off · press S to enable". A browser
that never completes audio activation shows a retry state after 3 s.

## Stall, terrain and disconnect warnings

Compact **STALL** and **TERRAIN** annunciators show current warning state. STALL
uses the native research model's software stall-warning signal, not a fixed
airspeed threshold. TERRAIN is a generic local proximity cue using CG height
above the current surface and closure from descent or consecutive clearance
loss. Ground contact suppresses both warnings. Missing or invalid telemetry is
shown as unavailable, rather than clear.

These cues do not scan terrain ahead, detect obstacles, recognize a landing
approach or reproduce an installed TAWS/EGPWS. A steep approach can trigger
TERRAIN; its thresholds are simulator design choices, not aircraft operating
limits. Neither cue changes the controls or physics. See the
[warning specification](../docs/SPEC.md) for the bounded policy.

Enable sound with **S** to hear the stall horn, pulsed terrain cue and a distinct
tone when the actual autopilot engagement state changes from on to off. For a
simple demonstration, engage the autopilot while flying, then disconnect with
**P**. The tones share the existing speaker mute and Options volume; sound
remains off by default. They are original synthesized cues, not calibrated
aircraft sounds or a recreation of the installed KAP 140 disconnect tone.

New warning sounds are silent while paused, hidden, loading, reset, unavailable
or in Review, including Review playback. Returning to live flight or enabling
sound does not replay queued disconnect events. Paused warning lights can remain visible. **REVIEW** marks cues recomputed from
recorded telemetry, not recorded annunciator history. Existing engine/airflow sound during Review playback is unchanged.

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

Press **M** or select **View → Flight map** to show or hide a
north-up practice map. It loads MapLibre on demand and uses bundled photographs
plus the fixed-source live map/photo service described below. The aircraft marker shows true heading; the plotted route uses up
to 600 points from the current flight's retained state trace. **Trace start**
marks the first retained sample, not an airport reference point. Flight reset
clears the route.

To try it, fly a gentle turn, open **Map**, then enter **Review** and drag the
timeline. The aircraft marker follows the selected recorded state. The route
shows the whole retained trace, including any part flown after the selected
review time; it is not a historical-only path. Use the map's zoom or **Fit**
controls to inspect it. First click the half-opacity panel to activate it; map
interaction keeps keyboard focus in the map and releases held flight controls.
Return focus to the scene before using ordinary flight keys.

The map has **731 searchable community airfield and heliport entries** from a pinned OurAirports
snapshot, with name/identifier/type and elevation in feet/metres when present.
Select a marker or directory result to inspect it; this moves the map only,
never the aircraft. Missing elevations remain unavailable and do not replace
the physical DEM. **Follow** returns the map to the aircraft. The airport
inventory covers Bavaria, Baden-Württemberg, Hesse, Rhineland-Palatinate and
Saarland inside 6–14°E / 47–51.75°N. Map records, physical terrain and photographic
coverage are independent; a marker does not establish surveyed landing geometry.
It is geographic practice context, not a navigation chart, operational airport
directory or the complete EDDF/100 NM model.

## Imagery and network access

CesiumJS 1.146.0 displays a bundled, openly licensed starter photograph from the
official Hessen HVBG dataset. The detailed approximately 3 × 2.8 km footprint is bounded
by 8.62–8.66° E and 49.95–49.975° N around EDFE. A coarse 512-pixel regional overview covers 8.4–8.9° E / 49.8–50.1° N
beyond the detailed foreground. Both photographs load once from the local
application. A separately bundled regional pyramid and live view-dependent
tiles extend the photography; map/relief layers remain as fallback when
photography is missing or unavailable.

[Source bounds, request, image hash and license](public/imagery/SOURCE.json) are
versioned with the asset. The [ATKIS DOP20 dataset](https://opendata.hessen.de/de/dataset/atkis-dop-20)
is published under [Data licence Germany – Zero 2.0](https://www.govdata.de/dl-de/zero-2-0).
The source image date is unknown; this is not current airport or chart information.
This small starter scene does not implement the EDDF/100 NM region.

Application, engine, physical terrain and airport-directory assets load locally.
Live **`/scenery/map/{z}/{x}/{y}.png`** and **`/scenery/imagery/{z}/{x}/{y}.png`**
requests go through the local Vite development server to fixed public sources:
BKG TopPlusOpen, Hessen HVBG DOP20, Bavaria DOP40 and Baden-Württemberg DOP20.
Map tiles are 256 px; composed photographs are transparent 512 px PNGs. Source
resolution is not effective output resolution, and current capture dates are
unknown. Missing border photography can reveal the map underneath; no complete
photographic coverage or current airport condition is claimed.

The proxy uses a 32 MiB memory cache and bounded requests/compositing. It needs
Python/Pillow from `utils/scenery/requirements.txt`; without Pillow, photos fail
while map/bundled scenery can remain usable. There are no accounts, API keys,
device geolocation, AI calls or learner-record uploads. The public providers see
the development server's requests for simulated scenery coordinates. Live
photographs can change: Review freezes aircraft state and versioned terrain,
not the visual bytes supplied later by those services.

Only Vite's development server currently installs this proxy. A static UI build
does not host it or the generated local research engine. Production hosting and
an equivalent endpoint service remain undecided.

## What the prototype represents

- Dynamics run in the existing JSBSim module Web Worker at a fixed 1/120 s step,
  independently of rendering.
- The local study model is JSBSim's generic `c172x` (172P research configuration),
  **not the selected project-owned 172S**. Its model/data rights and applicability
  remain as documented in the study; it is not redistributed here.
- A local-only, source-derived **generic fixed-pitch windmilling propeller**
  replaces the original positive-only power table. Verified nominal engine-off
  cases retain native propeller drag and shaft losses. Lower-speed idle-throttle
  flight can still stop the propeller and lose its drag: the full correction
  remains open. Powered forces also change; this is not a calibrated 172S glide
  polar. The build records the source, inputs
  and output hashes. See [investigation and limits](../docs/research/2026-11-03-engine-off-glide.md).
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
negative case. The development runtime serves only its explicitly allowlisted
worker/helper modules and the three declared engine/build-record files; these research runtime files are excluded from the
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
above **BRG/DME** and **PROP RPM**. BRG points to a received VOR (including opt-in LAB)
using true heading and direct spherical bearing; it is independent of the VOR OBS
setting and is not an installed ADF/NDB receiver. DME uses its independently sourced antenna and geometric slant
distance minus source bias; a LOC can provide DME without a bearing pointer. RPM follows actual propeller rotation, with a sourced generic model
2700 RPM marker, without invented operating arcs.

The engine column precedes autopilot/flaps/trim and includes a distinct round
left/right fuel gauge plus vertical throttle and mixture. Amber lower-quarter
marks and per-tank LOW labels are generic model display references, not aircraft
low-fuel thresholds or reserve limits. Fuel follows actual model tank contents; its full-scale capacity uses the pinned model's default
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

If the regional imagery package fails, a notice says that coarse starter imagery and
relief are shown. Queued tiles for an old view are dropped when the camera moves.

Normal flights retain the local public Hessen package spanning 8.45–8.90°E and
49.85–50.35°N. It contains real Rhine–Main/Taunus elevations from the official
32 m overview of DGM1, resampled to approximately 32–54m point spacing. Native
wheel/structure contacts sample this surface with slope normals at fixed steps.
DHHN2016 physical heights drive the atmosphere and dynamics; GCG2016/2023
quasigeoid offsets are added only for rendering. Review retains the actual
height fields. A surrounding BKG DGM200 package declares **608 slots** over
**6–14°E / 47–51.75°N**, with **475 available source assets** and explicit gaps.
Native and rendered world cells prefer valid regional samples, using the coarse
world baseline otherwise. Optional regional failures no longer impose the old
regional boundary stop; missing required world/native assets still stop visibly.
The worker keeps nine cells, preserves flight state during loading and resumes
only prior running intent. A derived **0.02° inward blend** joins the fine and
coarser surfaces using the same interpolation for contact and rendering. This
transition is not surveyed terrain. Source surveys date approximately 2000–2019;
display subdivision adds no measured detail. See the
[streamed package](public/terrain/region/README.md) and global limits below.
Rebuild the local engine after updating.

Try **Flight → Taunus ridge flight**, then Start and Chase, for an immediate
terrain demonstration. It is not a published route or procedure. The four
**Flat-ground landing study** presets retain their previous isolated fixtures.

The sharper airport overlay has approximately 0.75 m output pixels, sampled from
public 20 cm orthophotography, over the wider starter photograph. Derived relief
shading covers the DEM outside photographic coverage. A bundled 723-tile pyramid now covers 8.48–8.80°E / 49.93–50.12°N, with approximately
3.07 m output pixels across the area and 1.54 m around Frankfurt/approaches and
Egelsbach. Tiles load by view, with two concurrent requests and 64 decoded source
images; coarse ancestors/relief remain available when detail is missing. The
separate 0.75 m airport photograph stays above regional tiles. Current imagery has no established capture date and
is not airport/runway reference data. See the [terrain package](public/terrain/README.md),
[imagery provenance](public/imagery/DETAIL-SOURCE.json) and
[third-party notices](../THIRD_PARTY_NOTICES.md).

Try **Flight → EDDF 25C ILS practice**, then Chase, for the Frankfurt imagery.
Reload an already-open development page after updating assets. The package is
67.2 MiB on disk; a flight requests only needed tiles. See the
[regional imagery manifest and rights](public/imagery/rhein-main/README.md).

The **Stations** picker supports a 50 NM nearby filter, name/identifier/airport/
frequency search and distance ordering. Click outside or press Escape to close;
the header filters remain visible while only the results scroll. Review uses its
selected recorded position and leaves loading frequencies read-only.


## Right-side flight map

Press **M** or choose **View → Flight map**. On desktop the
map opens beside the outside view while the cockpit keeps its full width; smaller
viewports use a bounded floating map. Its first click activates the panel.
The default **Map** uses BKG TopPlusOpen; **Aerial** shows the existing public
photography. **NAV aids** toggles community NDB/VOR/DME/TACAN beacons and historical LOC/ILS reference points,
with separate antenna dots where sourced, station details and visible source age.
The nautical scale, aircraft heading/position and contrasted flown path support
orientation. Pan/zoom, **Fit path** and **Follow** change the view only. The
airfield directory contains 731 source entries, including heliports and closed
facilities, with type/state search and available elevations. All points remain
in the map layer; at most 80 nearby labels and 100 directory results are shown.
Refine the search to reach every entry. Closed facilities have distinct grey dots.
Community NAV covers German beacons within the declared map envelope, including
adjoining states; ILS references remain historical 2013.10. This map-only inventory
does not replace the aircraft’s separately validated radio-navigation package.

During Review the aircraft marker follows the selected historical frame while
the whole retained flight path remains visible. Displaying these layers does not tune radios or move the aircraft. Explicit
marker actions load supported standby channels; the map does not provide current
airspace/NOTAM/procedure information.
Failures while loading optional map layers are disclosed independently. The
separate required flight-startup packages retain their fail-closed behavior. See
[source research](../docs/research/2026-11-03-flight-map.md).

Recordings can be saved and loaded as version 1 JSON using **Flight → Save/Load recording JSON** or the replay bar. Loading opens a validated, read-only state trace and preserves the current live flight; **Back to live** restores its previous flying/paused state. Files retain at most ten minutes/36,000 samples (256 MB import limit), in SI units; they are not native physics checkpoints.

Use **Comma (,)** or **Map menu** to show search and details below the full-height map, over the right cockpit panels. The map itself does not resize. **M** opens/closes the map and **N** remains the parking brake.

Flight map → **Charts** opens the official OFM Germany VFR viewer and DFS AIP
airport/approach chart access. The selected airport identifier remains visible.
Charts are publisher-hosted; embedded chart tiles/plates are not yet integrated.


The public scenery cache keeps its existing saved tiles across reloads. It now
uses incremental metadata and in-memory recency instead of scanning/rewriting the
whole cache per tile. Nearby preloading survives brief camera loading, visible
vector requests take priority, and a bounded 64 MiB rendered-tile cache shares
duplicate work. This improves reuse; first visits still depend on public services
and rendering. See [cache design](../docs/design/scenery-cache.md).

The collapsed flight map keeps almost all front-window height for the map, with
compact view controls over it. Click an airport, aid or fix for an on-map popup;
supported channel buttons load COM1/2 or NAV1/2 **standby**, with activation still
on the radio stack. Search, filters and full source details are in the comma menu
below the map. **Location types** checkboxes filter both map markers and search results; airfields, helipads, NAV aids, fixes and other facility types can be toggled independently. Tuning is read-only during Review. GPS target draws a map line and
shows true bearing/distance; it does not command the aircraft or an installed GPS.
Fixes are the pinned historical 2013.10 regional inventory, including duplicate
identifiers at separate coordinates. Original rows and license are retained in
[the source package](public/mapdata/fixes-README.md).

After native initialization, startup preloading warms up to 16 map/vector tiles
near the actual starting position, including saved locations. It uses the same
two background slots and bounded cache, does not open the map, and never delays
the Start button. Downloads still take time on a first-ever visit; the start
screen gives them a head start.

## Coarse worldwide fallback and global cartography

Normal flights retain the finer local Hessen surface and source-marked regional
DGM200 terrain where available. The five-state package declares 608 slots over
6–14°E / 47–51.75°N, with 475 available assets and explicit unsupported border
nodes. Missing regional nodes use a bundled one-degree ETOPO 2022/EGM2008 baseline,
with an approximate connected-ocean surface. This approximately 111 km source
spacing smooths mountains; quarter-degree streaming cells add no measurements.

A moving 3×3 window uses nine native slots. Optional regional data has a five-second
enhancement budget; failures leave coarse data available, while missing required
world/native assets still stop visibly. Saved positions work strictly inside
±89.5° latitude, including dateline crossing. Exact polar flight is unsupported.
Native contact and rendering use the same composed surface. Review prepares only
the selected neighborhood and labels changed reconstruction; it is not a frozen
world-state recording. The coarse fallback is unsuitable for accurate landings.

The default 2D Map and 3D vector terrain use the same detailed labeled global OSM
cartography, with roads, land use, water and building footprints where supplied.
Regional photography remains above the map in photo mode. The regional BKG map
implementation remains available but its opaque overlay is inactive by default.
The map stops at Web Mercator limits, separately from physical terrain coverage.
No worldwide airport/NAV inventory or new photographs are added. See the
[regional package](public/terrain/region/README.md),
[world package](public/terrain/world/README.md), and [source rights](../THIRD_PARTY_NOTICES.md).

## Roll-control return regression

Rebuild the local engine with `just build-flight-engine` after updating the v5 aircraft adapter. `npm --prefix app run test:roll-return` runs57native diagnostic cases, checks18signed roll returns and54successive-pulse settling samples; no engine/model assets are distributed. The numeric equality check concerns command mapping, not a C172 flight tolerance.

With `just fly` running from this checkout, `npm --prefix app run test:roll-return-browser` exercises actual pointer centering/keyboard release in isolated Chrome contexts. It does not touch your existing browser session. For another running checkout, set `GF_ORIGIN` and `GF_DISTURBANCE_SOURCE_ROOT` explicitly. Optional `GF_DISTURBANCE_NATIVE_DIR` supplies a local comparison runtime to the test context only. The position-control virtual yoke retains a displaced pointer command until centered or cancelled; mere finger lift is not centering.

The native return regression also starts the normal `test:browser` gate. The actual-app input harness stays opt-in: it deliberately targets an already-running caller-owned server and source checkout, and does not start/stop that server. Run it explicitly for input/worker/browser changes; the full ordinary browser chain was not claimed as executed for this increment.
