# Questions, assumptions and decisions

All times are Europe/Berlin. Answers record the author and recording time. New answers go above older answers; strike through earlier answers without deleting them. When resolved, carry the decision into its authoritative document and retain a Resolved line here. A proposal or elapsed waiting time is not a user answer. The orchestrator asks only questions that affect the current work and continues independent tasks.

## Recorded interaction decisions

**2026-11-09 20:38, user correction and Claude shortcut interpretation** (Europe/Berlin): [speed key over map](input/2026-11-09-speed-key-over-map.md). = (including German Shift+Digit0) always cycles simulation or Review speed, also while the map is open and with map focus; with the map open, Shift+= (the + character) and numpad + zoom in and - zooms out; with it closed, Shift+= steps speed down. Clicking the SIM/REPLAY badge cycles speed and Shift-click steps down; the badge no longer passes pointer events through. Supersedes the open-map = routing of 2026-11-06 15:31. Task2.0.202/R-WORLD-6/R-SIM-9.

**2026-11-06 19:27, user request and Codex timing choice** (Europe/Berlin): [chase return duration](input/2026-11-06-chase-return-duration.md) requests a longer chase return for greater zoom-out, capped at six seconds with final deceleration. Use 700ms plus450ms per doubling of starting radius relative to the close target, capped at6000ms; keep cockpit700ms and reduced-motion/disabled returns immediate. The formula is an implementation choice, not an additional user statement. Task2.0.185.

**2026-11-06 18:32, user request and live repository interpretation** (Europe/Berlin): [remainingtwo](input/2026-11-06-remaining-pr-conflicts.md) refers to PR109 and111: the live open list contained108,109,111 after the request to fix108. Reconcile both existing branches with current main, preserving reception and optional visual-chart boundaries, history and checks; Task2.0.184, alongside overlay implementation179.

**2026-11-06 18:31, user request and Codex merge interpretation** (Europe/Berlin): [108same](input/2026-11-06-pr108-conflicts.md) extends the ongoing conflict reconciliation to PR108. Preserve map magnification key routing and existing map/settings/data behavior, renew affected checks and update the existing PR. Task2.0.183.

**2026-11-06 18:22, user request and Codex merge interpretation** (Europe/Berlin): [fix107](input/2026-11-06-pr107-conflicts.md) continues reconciliation of existing PRs. Preserve the saved location categories for map markers and local/worldwide search, together with current airport pipelines and saved Options. Renew affected checks and update the existing PR. Task2.0.182.

**2026-11-06 18:11, user request and Codex merge interpretation** (Europe/Berlin): [PR104 conflicts](input/2026-11-06-pr104-conflicts.md) requests reconciliation of saved Options with current main. Preserve preference limits, Save/Cancel/audio behavior and the separate worldwide-discovery/OSM airport pipelines; renew affected checks and update the existing PR. Task2.0.181.

**2026-11-06 17:40, user request and Codex merge interpretation** (Europe/Berlin): [PR102 conflicts](input/2026-11-06-pr102-conflicts.md) authorizes reconciliation of the existing worldwide OurAirports discovery PR with current main. Preserve the separate on-demand OSM airport-surface pipeline and both histories; discovery data must not become receiver signals or physical airport geometry. Repair the inherited package-script comma and empty input-index bullet during integration. This is a merge/integrity repair, not new source, navigation or aircraft acceptance. After the merged graph exceeded its unchanged60000-node cap, the orchestrator approved one exact path/hash file-level profile for imported generated terrain-style JSON; retain all raw bytes, whole-file evidence and claims, default extraction for all other JSON and explicit child-selector rejection. No aircraft fields or accepted claims are removed. Task2.0.180.

**2026-11-06 16:33, user request and Codex OFM streaming scope** (Europe/Berlin): [overlay request](input/2026-11-06-ofm-overlay.md). Add a saved opt-in transparent aero tile layer with opacity and published2611 dates/source credits/reporting. Official EPSG3857 tiles already render the chart, so approaching-area/map demand needs no offline conversion; OFMX-derived selectable features would be a separate worker conversion. Use the documented third-party API plus official About license grant, with bounded memory-only proxy and no bundled chart pixels or automated error submissions. The old full GUL link remains404; broader redistribution/full-license/procedure-plate review remains open. Initial verified edition metadata is ED2611, not a claim of global/current service completeness. Task179/R-CHART-1/R-WORLD-6/R-DATA-1.

**2026-11-06 16:13, user request and Codex camera scope** (Europe/Berlin): [camera return](input/2026-11-06-camera-return.md). Add saved View-menu animation for both cockpit center and chase follow return; use700ms camera-only easing, default enabled with reduced-motion instant override. Preserve lens FOV. Correct the overly steep initial chase distance response with reversible analytic mapping, retaining20Mm reach. Explicit gesture/view/lifecycle cancellation and pointer reference synchronization avoid delayed motion or flight input. Task178/R-VIEW-1/R-INPUT-1/R-UX-2.

**2026-11-06 15:51, user report and Codex reception scope** (Europe/Berlin): [missing signals](input/2026-11-06-nav-reception.md). Extend the existing pinned historical NAV810 receiver services worldwide so tuning outside Rhein-Main has source-backed instrument/worker guidance. Preserve exact calibrations, ranges, component pairing, source identity and explicit historical limits; OurAirports discovery does not establish receiver service. NDB/TACAN-only guidance remains unsupported. Task177/R-NAV-1/R-NAV-2/R-NAV-4.

**2026-11-06 15:31, user report and Codex shortcut interpretation** (Europe/Berlin): [map zoom conflict](input/2026-11-06-map-zoom-keys.md). ~~Treat the open map as the context for =/+ in and - out, even when opening it left keyboard focus on the scene.~~ Superseded for = by the 2026-11-09 speed-key correction; + and - keep this context. Preserve map bounds and guards; repeats do not zoom or leak German Shift+0 into throttle. Close the map for existing keyboard simulation/Review rates; Flight-menu rate controls remain available with the map open. Task176/R-WORLD-6/R-SIM-9.

**2026-11-06 14:52, user report and Codex map-filter interpretation** (Europe/Berlin): [map fixes/filter retention](input/2026-11-06-map-fix-filters.md). Remove the working-app extra historical marker gate so the checked Fixes category controls both map and results. This supersedes the earlier independent historical-marker opt-in; preserve existing all-seven-on defaults, bounded labels and source provenance without creating custom GPS fixes. Persist only category selections in a strict separate local record, with explicit all-off and safe corrupt/denied-storage defaults. Task175/R-WORLD-6/R-NAV-5.

**2026-11-06 14:17, user request and Codex camera interpretation** (Europe/Berlin): [chase overview](input/2026-11-06-chase-overview.md) extends chase from its normal approximately 32 m radius to the existing 20,000 km Earth-scale bound. Hold-drag can place the camera directly above the aircraft. Interpret double-click as returning to close chase: zero orbit, 30 m behind / 11 m above the current aircraft heading, retaining lens FOV. Cockpit retains FOV scroll; separate overview remains available. Camera-only increment, Task174/R-VIEW-1/R-INPUT-1.

**2026-11-06 13:26, user request and Codex scope** (Europe/Berlin): [saved settings](input/2026-11-06-flaps-settings.md) survive Restart/reload on this device. Retain preview rollback and trusted audio activation; keep bounded display and Options records separate. Aircraft controls/loading and transient camera gestures remain flight state rather than Options preferences. R-INPUT-1/R-UX-2; Task173. Flap diagnostics are a separate increment.

**2026-11-06 13:26, user request and Codex scope** (Europe/Berlin): [flap effectiveness](input/2026-11-06-flaps-settings.md). Check the loaded generic1982C172P with matched manual/AP cases and exact source/model pins; do not invent stronger coefficients or conflate172S performance with this model. Settings retention is a separate increment. R-SIM-5/R-AIR-2/R-FID-3; Task172.

**2026-11-06 13:11, user motivation and Codex documentation interpretation** (Europe/Berlin): [README refresh](input/2026-11-06-readme-motivation-screenshot.md) adds a complementary purpose: develop a technically substantial codebase rapidly with AI, expose where complexity breaks informal vibe coding, and use controlled A/B comparisons to learn how failures can be prevented or reduced. Comparisons remain planned, with no effectiveness results claimed. The current working-app screenshot retains source/loading limits and provenance; it is not a merged-release or fidelity claim. Task2.0.171.

**2026-11-06 12:48, user request and Codex integration choice** (Europe/Berlin): [integrate OurAirports](input/2026-11-06-integrate-ourairports.md) authorizes pinned worldwide airport/runway/COM/radio-navaid discovery. Task2.0.170/R-WORLD-12 uses the public-domain snapshot, dedicated display-data worker and bounded same-origin packages; existing standby guards, native physics and historical receiver/ILS coverage remain separate. Opaque UTF-8 JSON bulk transports and a small hash-binding descriptor retain semantic/source tests with file-level assurance provenance; they do not claim per-airport JSON-pointer extraction or alter assurance limits. Failed cells remain latched per centre generation; worker failures have a one-minute retry cooldown. No live source account or new dependency.

**2026-11-06 10:03, user clarification and Codex bounded repair choice** (Europe/Berlin): [ball-like roll instability](input/2026-11-06-ball-like-roll-instability.md) is mostly roll initially. Native signed-pulse and actual-app observations confirm zero external commands can retain two history-dependent aileron offsets. Evaluate/remedy only that command-return mechanism: retain source aerodynamics, loading, rate limits and control gains; remove the two generic aileron backlash bands, with source/byte checks and signed-pulse/native/browser evidence. This is a generic model-control adaptation, not aircraft stability or automatic wings-level acceptance. Pitch hysteresis, wider dynamics and source/model fidelity stay Task2.0.153.

**2026-11-06 09:12, user steering and Codex implementation interpretation** (Europe/Berlin): [scenery additions](input/2026-11-06-scenery-workers-and-overview.md) request separate airport/terrain work, generic markings/PAPI, overview zoom, OFM assessment and stable landing shadows. Keep native terrain installation/coverage guards; separate source CPU work, not safety waits. Generic practice PAPI remains optional and visibly illustrative. Overview is a separate View entry; wheel changes distance there. OFM structured data is the recommended candidate; no current edition, tile rights or ingestion is selected. Tasks164–169.

**2026-11-06 08:04, user request and Codex implementation interpretation** (Europe/Berlin): [build airport generation](input/2026-11-06-on-demand-airport-generator.md) follows the earlier on-region-entry/cache request and surface-first scope. Use fixed-source OSM region compilation and persistent local server caching, with versioned source metadata and bounded optional rendering. The half-degree/resource/cache choices are implementation budgets, not user-provided source claims. Preserve prepared scenery and all native/contact/navigation behavior; no new global airport-directory fallback or missing taxiway/apron invention. R-AIRPORT-3, Task2.0.164.

**2026-11-06 07:25, user recording scope and Codex implementation** (Europe/Berlin): [old recording compatibility is not required](input/2026-11-06-handling-recording-scope.md). For the remaining localSIM1 report, use the source engine's full airborne trim once and transfer its solved lateral commands into existing model trim channels, separately identified as generic-model initial equilibrium. Fresh airborne launches use this profile; fresh ground/landing studies use zero. Preserve current profile/trims through AP/CWS and exposed-state reconstruction; failure is visible. This selects no aircraft coefficients or continuous leveling assist and does not accept calibrated172S dynamics. R-SIM-11/R-SIM-5/R-REVIEW-1, Task153.

**2026-11-06 07:25, user context and Codex bounded input repair** (Europe/Berlin): [localhost:5173 atSIM1×](input/2026-11-06-local-handling-context.md) confirms the remaining report is separate from the merged startup-bias fix. A1440→1100px resize changes the neutral midpoint; the next1px pointer movement formerly sent+.5aileron. Require neutral pickup at the new visible ring, retaining live centering, keyboard and relative/look behavior. No aircraft gain/coefficient change. Task153 remains open. R-INPUT-1.

**2026-11-06 02:31, Codex confirmed bounded display delivery** (Europe/Berlin): Task162 retains the provider through ordinary overview windows with immutable source history, finite payload/pending/outcome budgets and disclosed stopped-admission fallback. Actual880-second source/GPU flight and integrated540-case feature CI pass; native/contact state remains independent. Native64-source and512-preview protection guards remain, so no unlimited no-rebuild or whole-world fidelity claim is made. The wider root working-copy assurance cardinality gate and Task160/161 remain open. The first per-batch reset design is superseded by the persistent implementation. R-WORLD-11/R-WORLD-9/R-SIM-2.

**2026-11-06 01:56, user renewed report and measured app repair** (Europe/Berlin): [sensitivity and instability after release](input/2026-11-06-handling-regression.md) remains TODO2.0.153. Published main restored a runtime−0.109375 roll offset in merge b51bcc0 while the slider stayed zero. Actual old app/Worker/native output confirms that startup command; restoring runtime zero passes the same neutral-input regression and preserves explicit experimental offsets. The current root workspace and served5173 already use zero, so this published repair cannot establish the cause of every root report. Executing engine/model output exactly matches the recorded November5 measurements; raw-model drift, actuator history,110kt trim and stale build provenance remain open. No model coefficients or new default assist are selected. R-INPUT-1/R-SIM-5/R-SIM-11.

**2026-11-06 00:54, user request and Codex implementation interpretation** (Europe/Berlin): [add C for existing CWS](input/2026-11-06-cws-keyboard.md). Hold C follows the existing momentary control, leaving the pointer free; keyboard and panel holds share ownership and preserve AP mode/reference behavior. Lifecycle cancellation releases the hold; non-flight contexts cannot start it. No background pacing or aircraft model changes. CWS installation fit remains unverified. R-AP-1/R-INPUT-1, TODO2.0.163.

**2026-11-06 00:13, user correction and Codex rendering constraint** (Europe/Berlin): [Repeated scenery reloads in South Africa](input/2026-11-06-south-africa-terrain-reloads.md) reject the initial Task162 design that replaced the whole provider once per changed overview batch. Keep provider/imagery meshes through ordinary moving windows, with immutable bounded overview history and metadata-only refresh. Preserve exact native/contact heights and existing protected-geometry guards; do not hide a stale/flat surface merely to reduce a reset counter. Public retry/parent fallback may defer unknown detail before it is cached, with explicit availability/queue and moving-GPU checks. Implementation/testing moves to an isolated checkout; the user’s running source stays frozen until one tested update is applied. Task162 remains open.

**2026-11-05 23:36, user source selection and Codex modular delivery scope** (Europe/Berlin): [Use Copernicus](input/2026-11-05-copernicus-integration.md) selects the free fixed GLO-30 public COG DSM as optional global enhancement, preserving valid regional data and the bundled coarse last fallback. This native/data foundation adds the world30 identity/lattice, nine native slots,512 latched source outcomes, metadata and common v1/v2 source API, without engine rebuild or unrelated cockpit/map features. The v2 overview API is a prerequisite only: the wider background display client is separate dependent Task162. Physical optional-owner discontinuities remain open Task160; no source-accuracy, installed-aircraft or training acceptance is inferred. R-WORLD-11/R-SIM-2/R-REVIEW-1, TODO2.0.150/2.0.162.

**2026-11-05 22:56, Codex confirmed renderer repair choice** (Europe/Berlin): measured Swiss resident heights agree across source/native boundaries, while the exterior coarse horizon introduces a >1 km display step. Apply a bounded exterior-only 1/8-degree visual transition with exact existing atlas heights inside loaded sources; it adds no measured data or contact surface. Preserve safe-update geometry guards. Injected failed source-owner physical discontinuities remain TODO2.0.160. The user reports Hessen is “all flat” after a rebuild; current fresh normal-flight Hessen native/GPU probes show real relief, so TODO2.0.161 remains unresolved. R-WORLD-2/R-WORLD-11/R-SIM-2.

**2026-11-05 22:56, Codex confirmed app repair choice** (Europe/Berlin):
supported raw launch QFE is a sensor/reference value, separate from the 800–1100 hPa practice subscale. Retain complete QNH/STD indications and recording/continuation metadata at tested high launches; explain and disable unsupported QFE selection. Preserve unavailable API/atmosphere safeguards, native packing, physics and engine bytes. The user's pressure-flight altitude remains unknown; this confirmed gate does not establish terrain causality. R-AIR-3/R-SIM-2, TODO2.0.159.

**2026-11-05 22:17, user report and Codex repair choice** (Europe/Berlin):
[France fix failure](input/2026-11-05-france-gps-fix.md) is caused by obsolete
regional validation in the custom plan store and editor. Use shared finite global
WGS84 planning bounds (±90° latitude, ±180° longitude); retain separate map-display
and flight-start limits and the regional published-source validators. Named and
anonymous fixes, waypoint creation and external plan points follow this same rule.
This is a modular planner-core/editor publication slice; full map/popup/bearing
integration in the working app is tested separately and remains a later PR slice.
R-NAV-5/R-WORLD-6, TODO2.0.157.

**2026-11-05 22:06, user request and Codex interpretation** (Europe/Berlin):
[Simulation speed above the map](input/2026-11-05-speed-overlay-map.md) means
the existing SIM/REPLAY badge remains visible in front of the open map. Raise
its presentation layer above the map and below menus/dialogs, preserving the
current position and pointer pass-through. R-SIM-9/R-UX-2, TODO2.0.156.

**2026-11-05 21:32, user request and Codex implementation choice** (Europe/Berlin):
[Predictive terrain loading](input/2026-11-05-predictive-terrain-loading.md) uses
consecutive simulated positions/time for actual ground track, with20wall-seconds
of lead scaled by confirmed pacing and capped at8km. These are bounded loading
policy choices, not aircraft parameters. Stage at most one next native window
without speculative installation, and use the existing200-URL/two-background-slot
cartography budget with current-area priority. Turns, invalid motion, new epochs
and Review invalidate predictions; optional failure preserves ordinary loading.
The preceding PR85 merge is confirmed by origin/main b55607b; this follow-up uses
an isolated branch and separate PR. R-WORLD-9/R-WORLD-11/R-SIM-2, TODO2.0.155.

**2026-11-05 20:09, Codex implementation decision within user-requested repair** (Europe/Berlin):
[Reload follow-up](input/2026-11-05-vector-terrain-reload.md) confirms loading
starvation. Replace 4050 global roots with two progressive source-aligned roots;
retain provider/meshes for unchanged live geometry within bounded history.
Source-change, finest coarse/feather influence, capacity and recording/empty
epoch guards rebuild conservatively. Physical terrain inputs and fixed stepping
stay unchanged. The [performance note](research/2026-11-05-vector-terrain-performance.md)
distinguishes the legacy PR85 port from later world30 runtime evidence and
explicitly excludes complete lifecycle/device/worldwide fidelity acceptance.
R-WORLD-11/R-WORLD-9/R-SIM-2, TODO2.0.154. Earlier 18:15 profiling observations
remain historical; sampling reductions alone did not solve globe invalidation.

**2026-11-05 17:35, user request and Codex implementation decision** (Europe/Berlin):
[Control-stability report](input/2026-11-05-control-stability.md) authorizes diagnosis, repair and a separate PR. Measured generic-source asymmetry is addressed through fresh loading with the external station unloaded and zero initial study correction. Rudder linking becomes opt-in. Explicit custom loading and historical continuation remain available. No aerodynamic coefficient, damping or automatic wings-level assist is introduced; aircraft fidelity and native build provenance remain unverified. R-INPUT-1/R-SIM-11, TODO2.0.153.

**2026-11-05 17:09, Codex orchestrator modular-source reconstruction**: the terrain/world foundation contains the five-state regional package, a bundled one-degree worldwide fallback and detailed global OSM cartography. Subsequent cockpit/map-planning/runtime/Copernicus/airport-surface work is intentionally excluded from this PR head. The original requests are retained under [terrain](input/2026-11-04-five-state-world-coverage.md), [world fallback](input/2026-11-05-world-terrain-fallback.md) and [global cartography](input/2026-11-05-global-map-detail-plan-ux.md). This partition changes publication boundaries, not user product decisions. Regional interpolation and the coarse global fallback establish no new source resolution or runway fidelity. R-WORLD-10/R-WORLD-11 / TODO 2.0.120,2.0.135,2.0.141.


## Resolved questions

### Q22. Adopt assurance like Propeller?

Answer: **2026-11-01 20:33, user** (recording time, Europe/Berlin): “adopt assurance”.
The preceding proposal was bounded level 2: reuse Propeller's core with Gefly
adapters, derive lineage and plan-integrity reports, track aircraft provenance and
versioned test/acceptance evidence, and integrate offline checks in CI. Existing
quality, validate and peer roles remain independent. No database, service or hooks
are selected. Original request: [input](input/2026-11-01-assurance-adoption.md).

Resolved: carried into [SPEC](SPEC.md) R-ASR-1 through R-ASR-5, the
[assurance contract](assure/SPEC.md), AGENTS, SDLC, SEC and TODO 1.14. Link certainty
and recorded outcomes remain distinct from aircraft or learning validation.


### Q1. Initial aircraft and training framework

Why: determines source applicability, exercises and assessment. Proposed: Cessna 172, EASA PPL first. Blocking: foundation aircraft/curriculum selection, not project setup.

Answer: **2026-10-31 14:53, user** (recorded by orchestrator): “Cessna 172, EASA PPL first”.

Resolved: 2026-10-31 14:53, user; reflected in [IDEA](IDEA.md), [SPEC](SPEC.md) and [ARCH](ARCH.md). Exact aircraft configuration remains Q3.

### Q2. Initial platform

Why: determines rendering, deployment, input APIs and performance tests. Proposed options included browser or native desktop.

Answer: **2026-10-31 14:53, user** (recorded by orchestrator): “as a web application, similar to geo-fs”.

Resolved: 2026-10-31 14:53, user; reflected in [IDEA](IDEA.md), [SPEC](SPEC.md) and [ARCH](ARCH.md). This does not select a graphics library or authorize reuse of GeoFS assets.

### Q6. GitHub destination and collaboration setup?

Why: publication needs an authenticated account, a new repository and explicit
public visibility. The user has now authorized the initial commit/create/push.

Answer: **2026-10-31 15:29, user** (recorded by orchestrator): “when the first project
structure and initial content is ready, commit and push to a novel public repo”.

Selection: **2026-10-31 15:29, orchestrator**: `gregoryyy/gefly`, using the authenticated
GitHub account. GitHub lookup confirms no repository of that name exists before
creation. Initial default branch: `main`; actual creation/push outcome is recorded
in DONE/RESULTS, without changing any existing remote repository.

Publication verified: **2026-10-31 15:33, orchestrator**. Created the new
[public repository](https://github.com/gregoryyy/gefly); GitHub reports PUBLIC,
nonempty, default branch `main`. `git push -u origin main` succeeded and
`git ls-remote` matched initial commit `2b4d76f90e1eaed2c5c3e352ef839e271135e328`. Final repository checks and
any bootstrap verification follow-up are recorded in DONE/RESULTS.

Superseded pending-destination status: ~~2026-10-31 15:15, user direction:
free/open-source project; account/organization and destination pending.~~

Resolved: 2026-10-31 15:29, user authorization and orchestrator destination selection;
carried into README, SBOM and TODO 0.8.1. No remote mutation had occurred when
this selection was recorded.

### Q4. First supported controls and browser/device baseline?

Why: fixes the first required platform/input experience and optional peripherals.

Refinement: **2026-11-03 04:47, user confirmation recorded by orchestrator**:
“Yes, match the KAP 140” confirms the BendixKing KAP 140 two-axis unit with
altitude preselection as the target; see [verbatim exchange](input/2026-11-03-kap140-confirmation.md).
The equipment choice is confirmed. Exact installation/firmware applicability and
installed servo/trim/electrical/PFT/fault fidelity remain open in 2.0.14.
The bounded operating model is delivered in 2.0.40; historical regional NAV1
sources are delivered in 2.0.41, without current-service or installed-fidelity acceptance.

Refinement: **2026-11-03 01:54, user request recorded by orchestrator**: asked that
the autopilot work like the original; see [raw request](input/2026-11-03-autopilot-original.md).
Superseded equipment-selection assumption: ~~Implementation fit assumed from the
classic reference and prior C172 sources: KAP 140 two-axis with altitude
preselection.~~ The later hold-to-engage software behavior remains source-scoped;
the confirmation does not identify a firmware revision.
This is not a serial-specific installation decision. [R-AP-1](SPEC.md) and task
2.0.40 scope its operating model with generic native servos and TRUE DG. Historical
regional signals are now available under R-NAV-4/2.0.41, alongside isolated LAB.
Current operational services and installed performance/PFT/trim-fault fidelity
remain open in 2.0.14. Older roll-only/INOP notes below describe
the earlier increments, not the current operating model.

Refinement: **2026-11-02 20:13, user** (recording time): requested that the
crosshair indicate the aircraft's front and move as the camera looks sideways;
see [verbatim input](input/2026-11-02-aircraft-forward-marker.md). Implemented as
a projected body-forward orientation cue, with edge guidance outside the view
and no flight-path/physics claim.

Refinement: **2026-11-02 19:56, user** (recording time): confirmed Slash restores
initial trim; requested compact matching flap/trim and throttle/mixture levers,
paused control availability with frozen physics, faster/dragged OBS, shared
panel colors and screw details. Asked for the current PR before a third bearing
display, auxiliary round RPM/fuel gauges and further ALT/NAV/APR/REV guidance.
See [verbatim checkpoint record](input/2026-11-02-paused-controls-and-pr-checkpoint.md).
Those subsequent systems remain unchecked; unavailable modes are not accepted
merely because their buttons are drawn.

Refinement: **2026-11-02 19:25, user** (recording time): supplied a classic C172
cockpit visual reference, then requested two rows of four round instruments,
a separate rounded six-pack panel, equal column heights, autopilot above engine,
vertical trim/flaps and explanatory copy moved off the panel. See
[reference record](input/2026-11-02-cockpit-reference.md) and
[layout requests](input/2026-11-02-panel-layout-refinements.md). This is a visual
reference, not confirmation of an exact aircraft/avionics installation.

Refinement: **2026-11-02 18:54, user** (recording time): specified bracket
flaps, apostrophe/backslash trim, Q/W rudder, ~~0 idle~~ (superseded by 2.0.134: 0 full, § idle) and Space pause; restart in a
menu, retained yoke mode on pointer reentry and persistent Review look. Requested
landing instability from gear reactions and separate radio/NAV/autopilot boxes;
modern fullscreen instruments/ILS markers and configurable keys are later.
See [verbatim input](input/2026-11-02-landing-radio-and-control-refinements.md).
The prototype uses generic contact forces and opt-in fictional LAB signals;
full classical coupled AP behavior remains open.

Refinement: **2026-11-02 18:46, user** (recording time): requested elevator
trim, top-menu Restart/Options, and Flight controls under View; see [verbatim
input](input/2026-11-02-elevator-trim-and-menu.md). Implemented using existing
generic-model elevator trim, with startup trim retained rather than zeroed.

Refinement: **2026-11-02 18:32, user** (recording time): requested two-finger
vertical scrolling for camera FOV; [verbatim input](input/2026-11-02-touchpad-fov.md).
Implemented as a viewing preference, separate from pilot control input.

Refinement: **2026-11-02 18:10, user** (recording time): confirmed short scene
click toggles touchpad yoke control; hold-drag looks around and release restores
the preceding yoke mode. Requested numeric throttle keys, flaps/wheel brakes,
six-pack instruments and engine/autopilot controls; see [verbatim input](input/2026-11-02-classic-flight-controls.md).
The implemented first autopilot is scoped to generic roll/true-heading control;
no aircraft installation or altitude-hold decision is inferred.

Answer: **2026-10-31 15:40, user** (recorded by orchestrator): “mac desktop, controlled via
keyboard and touchpad, optionally connected landing gear, rudder and ailerons.
reuse geo-fs settings”.

Clarification: **2026-10-31 15:40, user**: “Yoke/joystick and rudder pedals only”. This
resolves the hardware wording: required Mac desktop keyboard/touchpad, optional
yoke/joystick and rudder pedals; no external landing-gear switch selected.
Reuse GeoFS's control/settings model conceptually, as sourced in
[CONTROLS](design/CONTROLS.md). Mobile orientation remains later.

Resolved: 2026-10-31 15:40, user; carried into SPEC, CONCEPT, ARCH, CONTROLS, TRAINING,
ROAD, EVAL and TODO. Exact reference Mac, macOS/browser versions, peripheral
models, settings details and measured budgets remain foundation implementation
choices in TODO 1.2.1; they were not selected by this answer.

### Q19. Paired-phone control choices (Q-P1..Q-P6)?

Why: [PHONE-CONTROL](design/PHONE-CONTROL.md) (TODO 1.13) needs hosting, device,
grip, axis, loss and budget choices before implementation.

Answer: **2026-11-01 18:13, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-phone-control-decisions.md)): “ios latest on iphone 13
mini, yes to proposals”. Decided: reference phone **iPhone 13 mini, latest iOS**,
Safari (versions pinned per measurement); HTTPS phone page on the simulator's static
host once hosting is chosen, a local HTTPS dev server meanwhile; landscape yoke-like
grip, screen up; roll tilt → aileron, pitch tilt → elevator, rudder on keyboard; on
phone loss hold the last values 0.5 s, then centre, with a visible warning; latency
budget p95 ≤ 110 ms end to end and ≤ 40 ms over keyboard, to be measured.

Resolved: 2026-11-01 18:13, user; carried into [PHONE-CONTROL](design/PHONE-CONTROL.md) and [TODO](TODO.md) 1.13.

### Q18. Contracts v1 open questions (O-1..O-9)

Why: TODO 1.4 contracts must be agreed before parallel product coding.

Answer (O-3 datum): **2026-11-01 13:59, user** ([input](input/2026-11-01-datum-runway-poh-decisions.md)):
“yes to proposals”. JSBSim runs on DHHN2016 physical heights treated as its
ellipsoid height; ellipsoidal heights are computed outside the dynamics with GCG2016
in Germany and EGM2008 elsewhere ([CONTRACTS](design/CONTRACTS.md) §1).

Answer: **2026-11-01 13:00, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-contracts-decisions.md)): “accept all, 8 start at hold
point”. Decided: display-only interpolation with a 60 Hz state stream (never in
digests or replay); WMM2025; JSBSim height datum to be established by research
before choosing the geoid; per-step FNV-1a 64 plus SHA-256 checkpoints every 120
steps; review seek by re-simulating from step 0; optional recorded trace with the
input log authoritative; 172S control list from POH Section 7 by research (cited,
not copied); the paired-iPhone profile stays in TODO 1.13; the first exercise
starts at the runway holding point (see Q7).

Resolved: 2026-11-01 13:00, user; carried into [CONTRACTS](design/CONTRACTS.md), Q7 and [TODO](TODO.md) 1.4/1.5.

### Q17. Which dynamics engine and web stack (E1)?

Why: TODO 1.2 needs a reuse-first engine and browser stack decision (R-REUSE-1).

Answer (stack): **2026-11-01 19:04, user** ([input](input/2026-11-01-renderer-fuel-tolerances.md)):
“yes to all”. Decided: **CesiumJS** renderer (Apache-2.0, Cesium ion and hosted
services disabled) with **three.js** as fallback, **MapLibre** for 2D maps,
**TypeScript**, and JSBSim in a module **Web Worker** at a fixed 1/120 s step, per the
E1 browser check (both renderers met the budgets on the reference Mac). A re-test
with real terrain and imagery tiles at device resolution precedes milestone 2.

Answer: **2026-11-01 11:38, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-e1-decisions.md)): “yes accept lgpl, skip contacting, pr,
jsbsim, check yes, pr”.

Decided: **JSBSim** is the dynamics engine (evidence: [JSBSim study](../studies/e1-jsbsim/README.md),
[candidate survey](research/2026-11-01-e1-engine-stack-candidates.md)). Its
**LGPL-2.1-or-later license is an accepted copyleft exception** under Q5; it is used
as a separately replaceable library (WASM module) to keep LGPL relinking obligations
and later relicensing manageable. JSBSim's bundled C172 aircraft data is **not**
shipped; a project-owned 172S model is built from sourced data (E2). No outreach to
the JSBSim/FlightGear teams. Still proposals until the browser check on the
reference M1/Chrome (TODO 1.2.1/1.2.3): WASM in a Web Worker at a fixed 1/120 s step,
replay by re-running logged inputs on the same build, CesiumJS (hosted-service token
disabled) with three.js fallback, MapLibre for 2D maps, TypeScript.

Resolved (engine): 2026-11-01 11:38, user; carried into [ARCH](ARCH.md), [SBOM](SBOM.md),
[TODO](TODO.md) 1.2 and AGENTS.

### Q16. Reference Mac, browsers and optional paired-phone control?

Why: TODO 1.2.1 needs a measured reference platform for timestep, latency and
frame budgets, and the optional input profiles.

Update: **2026-11-01 13:28, user** ([input](input/2026-11-01-no-external-monitor.md)): no
external monitor. The 120 Hz refresh therefore came from the built-in panel, which
together with the renderer string identifies a 14-inch MacBook Pro with Apple M1 Pro.
Results stay attributed to the measured hardware (Apple M1 Pro, 120 Hz built-in);
About This Mac can confirm the chip.

Update: **2026-11-01 13:28, user** ([input](input/2026-11-01-mac-model.md)): “late 2020
macbook pro 14””. Orchestrator note: Apple's late-2020 MacBook Pro is the 13-inch M1
(60 Hz); the 14-inch MacBook Pro (late 2021) has an M1 Pro or M1 Max and a 120 Hz
ProMotion display, which matches the recorded renderer string and refresh. Results
and the reference-platform name are attributed to the renderer-reported **Apple M1
Pro, 120 Hz** (consistent with the no-external-monitor answer); About This Mac can
confirm it but is not required.

Confirmation: **2026-11-01 13:25, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-chip-confirmation.md)): “M1 not pro”. ~~The reference Mac is
an Apple M1.~~ (Superseded by the 13:28 updates: built-in 120 Hz display and a 14-inch
model identify an Apple M1 Pro.) Observation to reconcile: Chrome's WebGL renderer string on the
recorded runs reported "Apple M1 Pro", and the display measured 120 Hz, which the
13-inch M1 MacBook Pro's built-in panel does not provide (an external 120 Hz display
would explain it). Results keep the reported strings; budgets scale to the measured
refresh.

Answer: **2026-11-01 11:00, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-reference-platform.md)): “macbook pro m1, latest macos,
webkit browsers esp. chrome latest. optional controls: bind orientation from
paired iphone”.

Recorded: reference ~~**MacBook Pro (Apple M1)**~~ **14-inch MacBook Pro, Apple M1 Pro
(120 Hz built-in)** per the 13:28 updates below, on the **current macOS release**;
**Chrome (latest stable) as primary browser**; Safari secondary is an orchestrator
assumption from “webkit browsers”, to be confirmed. Orchestrator note:
desktop Chrome uses the Blink engine, not WebKit; Safari is the WebKit browser, so
both are listed. "Latest" is pinned to exact versions whenever a measurement is
recorded. New optional control: **device orientation from a paired iPhone**
driving the Mac session (R-INPUT-3), in addition to the existing optional
yoke/joystick/pedals profile; no specific peripheral models were named.
Still open: transport (e.g. local WebRTC/WebSocket), pairing method, latency
budget and iOS browser/app choice.

Resolved: 2026-11-01 11:00, user; carried into [SPEC](SPEC.md) R-INPUT-1/R-INPUT-3,
[SEC](SEC.md), [CONTROLS](design/CONTROLS.md) and [TODO](TODO.md) 1.2.1/1.13.

### Q11. Which briefing data mode ships first?

Why: determines the initial data dependency, scenario repeatability and later
live-service boundary.

Answer: **2026-10-31 15:40, user**: “as proposed”. Accepted proposal: **versioned scenario
briefings first**, explicitly labeled historical/generated data, with a **later
optional live adapter**. Initial exercises do not require a live feed.

Resolved: 2026-10-31 15:40, user; carried into SPEC R-BRIEF-1, ARCH, CONCEPT, TRAINING,
ROAD, EVAL and TODO. Evaluate historical/generated report/NOTAM validity against
scenario time; preserve data/condition snapshots for replay. Exact source/provider,
coverage, rights and live rollout remain future implementation selections.

### Q5. Source license and third-party data policy?

Why: affects code reuse, distribution, aircraft manuals, avionics depictions, maps and navigation data. The user's direction is now free/open source; select a compatible open-source license and review separately licensed assets/data. Blocking: license-dependent distribution and restricted asset ingestion.

Answer (roadmap financing/data direction): **2026-11-03 09:16, user**
(recorded by orchestrator; [input](input/2026-11-03-road-vision.md)):
“free version stays free”; “potentially premium variant that uses commercial
maps / subscriptions (eg, Navigraph)”; “AI-based extensions in premium to cover
tokens”. This adds candidate optional commercial service/data access while the
free, open-source baseline and its non-proprietary bundled-asset policy remain.
It does not authorize copying proprietary datasets into the repository, alter
GPL-3.0-or-later, or select a subscription/provider/pricing arrangement. Confirm
runtime access/display/cache/distribution rights before any such integration.
ROAD records partnerships and financing as planned, not existing agreements.


Answer (S17 whole lists): **2026-11-02 07:36, user** ([input](input/2026-11-02-s17-lists-electrical-tach.md)):
"Accept both". The complete S17 Fig. 2-3 instrument-marking list (p. 2-6) and the
Fig. 6-3 loading-station arms (p. 6-9) may be extracted as cited facts. This is an
exception to the needed-points rule for these two lists only; no text or figure is
copied.

Answer (EASA TCDS): **2026-11-02 07:16, user** ([input](input/2026-11-02-q23-proposals.md),
Q23): the EASA TCDS values (manifest S5 IM.A.051, S9 EASA.IM.E.032) are used as
cited facts (`facts_only`), like the POH: values with page citations, no copied text.

Answer (fuel chart): **2026-11-01 19:04, user** ([input](input/2026-11-01-renderer-fuel-tolerances.md)):
“yes to all”. The facts-only, selective extraction allowance extends to the needed
points of the Lycoming fuel-consumption chart (Fig. 3-9), under the same
no-piecemeal rule.

Answer (aircraft-model sources): **2026-11-01 18:43, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-lycoming-openvsp-decisions.md)): “yes to both”. (a) Only
the needed points of the copyrighted Lycoming IO-360-L2A power curve may be extracted
as cited facts, never the whole chart, under the same no-piecemeal rule as the POH
values. (b) OpenVSP (NASA Open Source Agreement) may be used offline as an estimation
tool; it is not distributed, and only its results ship, labelled `estimated` with
inputs and version recorded.

Confirmation: **2026-11-01 07:08, user** (recorded by orchestrator, Claude Code;
[confirmations](input/2026-11-01-confirmations.md)): “gpl3+” — GPL-3.0-or-later,
not GPL-3.0-only.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“gpl 3 for the project now, can adjust later. third party policy: non-proprietary
licenses, with preference for permissive licenses so gpl3 can be relaxed later”.

Recorded as **GPL-3.0-or-later** for original project material, matching the
Propeller-derived files already distributed on those terms. Third-party policy: dependencies, models, data and assets must
use non-proprietary (open-source or open-data) licenses; **prefer permissive**
licenses (e.g. MIT, BSD, Apache-2.0, public domain/CC0, CC-BY). *Orchestrator
proposals implementing this policy, pending user confirmation:* copyleft components
(e.g. LGPL, GPL, ODbL share-alike data) need a recorded justification, because they
would constrain a later relaxation; non-commercial/no-derivatives material is not
distributed, only referenced; reading "non-proprietary" as OSI-approved software
licenses and open data/content licenses is also an orchestrator interpretation.
Exception accepted 2026-11-01: JSBSim engine (LGPL-2.1-or-later), see Q17.
Note: a later relaxation needs permission from every copyright holder, including
the upstream Propeller holders for the derived files (or their replacement); a DCO
alone does not grant this, so contributor terms that keep the option open remain to
be chosen (TODO 1.11).

~~Answer: partial update, **2026-10-31 15:15, user**: “The idea is to make this free
and open source”. Exact code license, contributor terms and asset/data compatibility
remain pending.~~ Owner: orchestrator. [SBOM](SBOM.md) records source provenance.

Resolved: 2026-11-01 07:04, user; carried into `LICENSE`, README, THIRD_PARTY_NOTICES,
[SPEC](SPEC.md) R-OPEN-1, [SBOM](SBOM.md) and [TODO](TODO.md) 0.9. Contributor terms and per-asset rights stay open in
TODO 1.11 and R-DATA-1.

### Q12. Community publication and content roles?

Why: the requested free/open-source flight-school community needs hosting, public
content/contribution rules, learner/instructor roles, review labels and moderation.
Proposed: a reusable exercise library and discussion/debrief workflow first;
specific roles and sequencing remain proposals. Blocking: community deployment,
not simulator or source-research studies.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“community publishing: rules and roles follow later in phase 3.” Deferred: the
publication rules, roles, moderation and hosting are scoped during roadmap
phase 3, not before (orchestrator mapping to [ROAD](ROAD.md) phase 3). Orchestrator
consequence: no community workflow is enabled until then.

Answer: direction confirmed **2026-10-31 15:15, user**: community site similar to
GeoFS, more flight-school oriented, free/open source. ~~Hosting, data retention,
moderation, contribution workflow and funding/operating model remain pending.~~
(Now deferred to phase 3, above.)

Resolved (deferred): 2026-11-01 07:04, user; carried into [ROAD](ROAD.md), [SPEC](SPEC.md) R-COMMUNITY-1 and [TODO](TODO.md) 1.11.

### Q15. Which changes need the cross-provider peer gate?

Why: the peer gate (R-AGENT-7) needs the other provider's CLI and adds cost and
latency; applying it to every PR blocks small documentation changes.

Answer: **2026-11-01 11:54, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-proclens-peer-logic.md)): “get the peer review and hooks
logic from proclens”. Adopted proclens's review-gate logic: the peer review runs
**every few PRs** (batched), whenever a machine with the other provider's CLI is
available; one review covers every change merged since the last peer-reviewed
revision; merged work in between is marked **peer pending**, not blocked. Packet
egress rule added. proclens has no hooks, so none were adopted. The scope below is
kept only as the list of changes a batched review must have covered before a
milestone is accepted or a release is made.

Answer: **2026-11-01 07:22, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-peer-gate-scope.md)): “again, not all prs need the
adversarial check (different provider)”.

~~Scope (orchestrator interpretation, correctable by the user): **required** for
integrated milestone results, changes to simulation/dynamics, aircraft or
navigation data, avionics, training assessment, security-relevant code or agent/
peer tooling, and release candidates. **Not required** for documentation-only
decision recording, research notes, bookkeeping and editorial fixes. The
orchestrator states in each PR whether the gate applies and why; the user can
request a peer review on any PR. Local quality/validate remain proportionate to
the change.~~

Resolved: 2026-11-01 11:54, user (supersedes the 07:22 per-PR scope); carried into SDLC, AGENTS, SPEC R-AGENT-7, the
[agent workflow](agents/README.md), [peer](agents/peer.md) and the PR template.

### Q21. Are the FDM-172S tolerance proposals accepted?

Why: the 172S model plan (FDM-172S, PR #24) needs agreed tolerances before
calibration and holdout cases are frozen.

Answer: **2026-11-01 19:04, user** ([input](input/2026-11-01-renderer-fuel-tolerances.md)): “yes
to all”. Tolerance proposals P-1..P-15 are accepted **as working proposals** (engineering
judgement, each with its stated basis) for freezing the E2 fixtures; they remain
revisable with evidence, and any change after a holdout comparison is recorded.

Resolved: 2026-11-01 19:04, user; applies to FDM-172S Q-11 (merged with PR #24).

### Q20. How are model size and reasoning effort chosen for agent work?

Why: tasks differ widely in difficulty and risk; one fixed model/effort either
wastes cost on mechanical work or under-powers design, security and review work.

Answer: **2026-11-01 18:46, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-model-effort-selection.md)): “add to BOOT and project that
the right model size and thinking effort is to be selected appropriately.”

Resolved: 2026-11-01 18:46, user. The orchestrator selects model tier and reasoning effort per
task by difficulty and risk; reviews use at least the tier of the reviewed work;
no model identifiers in repository files. Carried into [AGENTS](../AGENTS.md),
[BOOT](BOOT.md#dispatch-parallel-work-and-integration) and the
[agent workflow](agents/README.md#runtime-setup).

## Open questions

### Q24. Rights basis for extracted C172P POH and JSBSim c172x values in the app?

Why: R-DATA-1 needs a licence, permission or rights analysis for every external
aircraft value that ships. The Claude peer review found none (F34 high, F32;
[report](reviews/2026-11-03-codex-prs-39-50-peer.md), 2026-11-03 08:05).

What ships today:
- **C172P POH values** (KCAS limits, stall speeds, CG limits, load factors, VA), read
  from a third-party-hosted scan of the copyrighted 1982 Cessna C172P POH. The Q5/Q7
  facts-only allowances name the selected 172S POH, not this document.
- **JSBSim v1.3.3 values:** c172x contacts, span, AERORP, alpha-max, 130 lb tanks,
  `eng_io320` 2700 RPM and the `FGTank` 6.6 lb/gal. `c172x.xml` says "GPL" with no
  version, "educational and entertainment purposes only" and "not to be sold"; E1
  rated it not cleared. Q17 excludes shipping the data files and did not consider
  extracted values.

Options:
- (a) Extend the `facts_only` allowance to these named C172P POH values.
- (b) Accept the JSBSim values under a recorded rights analysis, or ask upstream.
- (c) Remove or replace the values, e.g. with the sourced 172S `facts_only` data
  already in `data/aircraft/c172s-classic/`.

Blocking: calling these values cleared, and any public distribution of the app
build. Until decided, they are labelled "rights unresolved" in the SBOM,
THIRD_PARTY_NOTICES, the research notes and the app source objects. Owner:
orchestrator; user decision.

### Q25. Confirm the "small, runnable, demonstrable increments" rule?

Original peer finding (F6, 2026-11-03 08:05): AGENTS carried this priority but no
immutable input record was available to that review. ~~If the user confirms it,
add a new input record.~~

Answer (existing instruction preserved): **2026-11-03 10:13, user**
(recording time; [current transcript record](input/2026-11-03-demonstrable-increments-record.md)):
“from now on, prioritize to create demonstrable increments.” This explicit earlier
user instruction is present in the available conversation; it does not need to be
asked again. Its original send time is not supplied here. The new record is dated
when preserved, not retroactively assigned to 2026-11-02.

Resolved: retain the existing AGENTS priority and use small runnable increments.
This supplies the missing recorded source for the instruction, not a new approval
or evidence that an earlier documentation workflow captured it correctly.

### Q23. Design open questions carried from the drafts (register)

Why: SDLC keeps open decisions in GAPS; the foundation review (TODO 1.6, 2026-11-02 00:21) found
them only in the design documents. This register points to their detail; the design
documents keep the technical discussion. Status as of 2026-11-02 07:16: the user accepted the recommendations (answer below).

Answer: **2026-11-02 07:16, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-02-q23-proposals.md)): “yes to proposals. go on”. All
recommendations in the table below are accepted as decisions:
- **Q-S3:** milestone 2 covers the circuit flight, the checklist items the simulator
  can sense and a static scenario briefing. The text radio state machine stays in
  roadmap phase 3.
- **Q-S8:** the 172S classic-panel engine and fuel indications are part of the
  worker-computed `ind` state and digest.
- **S5/S9:** the EASA TCDS values are `facts_only` (see Q5).
- **FDM Q-1:** empty mass and CG come from the POH sample loading example, labelled as
  a sample, not a weighed aircraft.
- **Q-S7:** CONTRACTS §10 v1.1 and SCENARIO-CONTRACTS C1–C17 are agreed.
- **Q-S1, Q-S5, Q-S6 and Q19:** as recommended.
- **Q-S2, Q-S4 and the EXERCISE-01/BRIEFING items:** follow the recommended direction.
  Their values still come from the AIP (TODO 1.7) or are labelled instructional
  proposals (IP).
- **FDM Q-3..Q-12:** labelled estimates.

Carried into [CONTRACTS](design/CONTRACTS.md), [SCENARIO-CONTRACTS](design/SCENARIO-CONTRACTS.md),
[FDM-172S](design/FDM-172S.md), the [aircraft manifest](../data/aircraft/c172s-classic/manifest.json)
and [TODO](TODO.md) 2.1.

Update: **2026-11-02 08:01, user** ([input](input/2026-11-02-flightgear-gaps-codex-deferred.md)):
"use the solutions used in flightgear". The S17 gaps follow the FlightGear Cessna 172
model: gauge dial ranges, EGT scale, hour-meter counting, low-fuel threshold basis and
the annunciator switch-label serial. Orchestrator conditions:
- These values are labelled `estimated` with source FlightGear and are never
  `sourced` 172S facts.
- That model represents a 172P, so the assurance applicability check treats it as
  another variant.
- Its licence and redistribution terms are recorded before any value or asset is
  reused (Q5).

Update: **2026-11-02 07:36, user** ([input](input/2026-11-02-s17-lists-electrical-tach.md)):
- **Q-S8 list:** the ammeter and the low-voltage annunciator join the engine and fuel
  indications in `ind` ("Include now").
- **Tachometer green arc:** the S17 Section 2 Fig. 2-3 altitude-dependent arcs govern
  ("Section 2 limits"). The Section 7 p. 7-20 value (1900–2400 rpm) is a recorded
  source conflict.
- **Extraction:** research note `docs/research/2026-11-02-172s-engine-fuel-ind-and-sample-loading.md`
  branch data/s17-ind-wb.

| Item | Source | Status | Blocks M2? | Recommendation |
| --- | --- | --- | --- | --- |
| Q-S3 radio/briefing/checklists in milestone 2 | [SCENARIO-CONTRACTS](design/SCENARIO-CONTRACTS.md) §7 | decided 2026-11-02 | yes (2.1) | M2 = circuit flight + sensed checklist items + static scenario briefing; text radio state machine stays in roadmap phase 3 |
| Q-S8 engine/fuel gauges in the `ind` digest | SCENARIO-CONTRACTS §4 | decided 2026-11-02 | yes (2.2/2.3) | include the 172S classic-panel engine/fuel indications, computed in the worker |
| Q-S5 experimental (draft) packages runnable | SCENARIO-CONTRACTS §7 | decided 2026-11-02 | no | yes, labelled experimental, never accepted |
| Q-S1, Q-S6, Q-S7 | SCENARIO-CONTRACTS §7 | decided 2026-11-02 | no | session-log hash suffices; store parsed intents, keep free text local; accept C1–C17 |
| Q-S2 altimeter match tolerance | SCENARIO-CONTRACTS §7, EXERCISE-01 | direction decided; values pending | before 2.5 | instructional proposal labelled IP |
| Q-S4 QFE datum and AIP vertical reference | SCENARIO-CONTRACTS §7 | direction decided; values pending | before 2.5 | source from the AIP (TODO 1.7) |
| S5/S9 EASA TCDS values classed `reference_only` but used as facts | CONTRACTS §10.5, data manifest | decided 2026-11-02 (Q5) | yes (2.2 builder) | class them `facts_only` like the POH (cited values, no text) |
| Q19 scope: 60 s phone resume window and recentring | [PHONE-CONTROL](design/PHONE-CONTROL.md) | decided 2026-11-02 | no (1.13 is Later) | treat as covered by "yes to proposals" |
| FDM Q-1 empty mass/CG | [FDM-172S](design/FDM-172S.md) §7 | decided 2026-11-02 | yes (1.3.2) | POH sample loading example, labelled; no aircraft available |
| FDM Q-3..Q-7, Q-9, Q-10, Q-12 | FDM-172S §7 | decided 2026-11-02 | 1.3.x only | estimates, labelled; detail in FDM-172S |
| EXERCISE-01 open questions 1, 3–6 | [EXERCISE-01](design/EXERCISE-01.md) | direction decided; values pending | before 2.5 freeze | AIP circuit data (1.7); instructional proposals labelled IP |
| BRIEFING open questions 1–8 | [BRIEFING](design/BRIEFING.md) §6 | direction decided; values pending | if Q-S3 includes briefing | generated reports first; English first |

Resolved items already recorded elsewhere: FDM Q-11 (Q21), Q-13 (Q5, 19:04), Q-2 (no
aircraft available, 2026-11-01). Answers are recorded here or in the referenced
question as they arrive.

### Q3. Which Cessna 172 variant, year and avionics fit?

Handbook clarification: **2026-11-02 21:02, user**: “Loading and flight envelope”.
Initial handbook diagrams prioritize CG loading and published flight-load-factor /
airspeed references for the active research C172P. Complete stall/gust boundaries
and live loading/load-factor points require additional applicable data; published
reference limits must not be presented as a validated complete V-n envelope.
See [answer](input/2026-11-02-handbook-loading-envelope.md).

Implementation assumption: **2026-11-02 20:54, Codex orchestrator**: the requested View
handbook initially covers sourced loading/CG, CAS limits and gear-layout reference
diagrams for the **active generic 1982 C172P**. The diagram-selection clarification
was subsequently answered above; this small reference subset does not change the selected 172S product
configuration or accept its aircraft fidelity. Charts have no fabricated live
mass/CG point. See [input](input/2026-11-02-flight-data-handbook.md).

Why: operating limits, engine/propeller, systems, instrument ranges and procedures must refer to one applicable configuration. Proposed: research availability and redistribution rights for a specific C172S configuration before recommending a conventional panel or glass cockpit. Blocking: TODO 1.3 and aircraft-specific implementation; generic studies may continue.

Answer: **2026-11-01 10:27, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-first-172s-configuration.md)): “sure.” First configuration:
**Cessna 172S, serials 172S9491–172S9809, classic panel** (before the NAV III/G1000
option at 172S9810), per the [172S/FR172 sources](research/2026-11-01-c172s-fr172-sources.md).
Still open: exact avionics/radio fit and flight-manual revision to model, and the
FR172 sub-model once FAA A18EU is read.

Confirmation: **2026-11-01 07:08, user** (recorded by orchestrator, Claude Code; [confirmations](input/2026-11-01-confirmations.md)): “gpl3+, yes, yes”. The user confirms the *it depends on the data* reading and the
order: **classic-panel 172S first, FR172 second** when its data suffice.

Answer: partial update, **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“FR172 and/or 172S with their different engine configs to show performance
differences. it fried on the actual data available, but from public FAA
documentation we should have a fairly good picture”. Reading: *it depends on*
the available data. Candidate set: **Reims FR172** and **Cessna 172S** (their engine/propeller
configurations are unverified here and must be sourced in TODO 1.3), modeled as
distinct configurations so learners can compare performance. Primary public
sources: FAA type certificate data sheets and other public FAA/EASA records;
FR172 is a Reims-built model, so its EASA/French certification records may be
needed alongside FAA material. Proposed by orchestrator and confirmed by the user at 07:08: a classic-panel 172S before the factory glass-cockpit fit as the
first configuration, then FR172 when its data suffice. Still open: exact
sub-models/years/serial ranges, engine/propeller, avionics fit (the 172S-first order
holds unless the data research contradicts it). Manufacturer POH/AFM text remains copyrighted; extract facts with source
references, without copying manuals (R-DATA-1). Source survey:
[172S/FR172 sources](research/2026-11-01-c172s-fr172-sources.md): leads point to FAA
TCDS 3A12 (172S) and A18EU (FR172E–K); FAA/EASA hosts were unreachable, so all
values remain unverified. Update after network access was enabled: 172S values
verified against EASA TCDS IM.A.051 Issue 11 (stated equivalent to FAA 3A12 Rev 88)
and a public copy of FAA 3A12 Rev 80 (IO-360-L2A 180 hp, McCauley 1A170E/JHA7660,
2,550 lb; page-cited). The Cessna NAV III (G1000) manual starts at 172S9810, so
172S8001–9809 are classic panel. Researcher proposal, accepted by the user at 2026-11-01 10:27: first
configuration 172S9491–9809. FR172 (A18EU) still unverified: FAA DRS refused
non-browser downloads. JSBSim has no 172S/FR172 model, and its C172 files carry
mixed LGPL/GPL and "not to be sold" terms needing a Q5 rights decision.

Answer: partial update, **2026-10-31 15:09, user** (recorded by orchestrator):
“Classic instruments first, glass later”. The exact variant/year and conventional
instrument/radio fit remain pending. Owner: orchestrator, informed by researcher
and product. Glass is a later configuration; A320 is a reference, not an initial type.

### Q7. First useful learning exercise and review partner?

Why: determines whether the first slice is aircraft handling, instrument interpretation or a procedure, and how training claims can be reviewed. ~~Proposed: a bounded straight-and-level control/trim exercise, then coordinated turns;~~ (superseded by the 2026-11-01 answer below) product should refine objectives against the selected EASA syllabus with instructor review. Blocking: milestone 2 exercise acceptance, not generic physics experiments.

Answer: **2026-11-01 13:59, user** (recorded by orchestrator, Claude Code; input record
`docs/input/2026-11-01-datum-runway-poh-decisions.md` on branch design/contracts-1-4):
“yes to proposals, no instructor reviewer yet, go with what we learn from research”.
Exercise 01 uses **runway 26** (proposed default) with the standard north circuit
(right-hand for 26, per operator material); **no instructor reviewer** for now, so
criteria stay labelled source-based or instructional proposals and are refined from
research; POH values (ASI calibration, performance) may be extracted as cited facts
without copying tables.

Answer: **2026-11-01 13:00, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-contracts-decisions.md)): “8 start at hold point”. The first
exercise **starts at the runway holding point with the engine running**; engine
start and taxi come later. This resolves the earlier orchestrator reading of
“start” as take-off.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“first learning exercise is start fly a pattern and land”. The first exercise is a
complete **circuit: take-off, traffic pattern and landing** at the first airport
(Q10) (orchestrator reading of “start” as take-off and of the airport link; the
user may include engine start/taxi), replacing the earlier straight-and-level proposal. Still open: runway and
pattern direction from sourced aerodrome data, assessment criteria/tolerances
(TODO 1.5) and the instructor review partner. Owner: product proposes criteria;
orchestrator resolves with user.

TODO: needs resolution.

~~Answer: pending.~~

### Q10. Which first training region, airport and runway?

Why: determines geography, elevations, navigation/briefing coverage and source rights.
Blocking: verified region geometry, selected training-airport/runway fixtures and
source-specific acceptance; the region direction itself is resolved.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“first airport is egelsbach in germany”. First airport: **Frankfurt-Egelsbach
(ICAO EDFE)**, inside the EDDF 100 NM region. Still open: runway(s), circuit
pattern, elevation, frequencies and chart sources with editions and rights,
verified against official AIP/aerodrome publications (TODO 1.7). Source survey:
[EDFE sources](research/2026-11-01-edfe-aerodrome-sources.md); the official DFS
AIP and operator sites were unreachable from the research session, so only
non-authoritative OurAirports values (runway 08/26, conflicting elevations) exist.
Update after network access was enabled: the operator's published pilot information
gives runway 08/26, a standard north circuit (right-hand 26, left-hand 08), reporting
points and frequencies (cite-only). DFS AIP terms forbid automated retrieval and
derived works without written approval, so official AIP values still need a
person-read citation or DFS permission.

Answer: **2026-10-31 15:15, user**: “model a region like EDDF and 100 nm radius
around from real available map material”. Recorded in SPEC, ARCH and ROAD.
The radius is 185.2 km; use a geodesic boundary around the sourced official EDDF
airport reference point. Exact current reference coordinates and training airports,
runways, data versions and chart permissions remain pending. EDDF is the regional
center, not a decision to conduct every exercise at its runways. Owner: orchestrator
with researcher/product. See [regional source study](research/2026-10-31-eddf-open-foundation.md).

### Q13. LLM authoring and interaction provider/execution model?

Why: defines reproducibility, costs, credentials, privacy and the authoring/review
boundary. Proposed: provider-independent declarative experience packages; resolve
real assets from versioned sources, validate references and review before use.
Blocking: provider integration and generated-experience publication; not the
authoring architecture or regional source plan.

Answer: direction confirmed **2026-10-31 15:15, user**: LLM-based flight experience
creation defining territory/navigation/chart material, with AI-based interaction.
Provider/local/cloud choices, supported authoring intents and review process pending.

### Q14. Which sailplane and ultralight qualification profiles come first?

Why: pilot licences, aircraft categories, privileges and curricula depend on the
jurisdiction and selected aircraft. This is distinct from software licence Q5.

Answer: **2026-10-31 15:44, user**: add licence-specific training for sailplanes
and ultralight aircraft. Country/category, precise qualification, launch/equipment
scope, first aircraft and ordering remain open. Proposed research references are
EASA Part-SFCL/SPL and Germany's national ultralight framework; these references
are not a user decision selecting all their privileges or categories.

Blocking: implementation/acceptance of those later profiles only. Initial C172/
EASA PPL work continues. Owner: orchestrator/product, informed by the
[licence-track source note](research/2026-10-31-license-training-tracks.md).

## Resolved refinement questions

### Q8. What does “QNX” mean in the requested altimeter features?

Why: a pressure-setting label must have a defined reference and instrument behavior.
Asked whether QNH was intended; proposed options included broader reference coverage.

Answer: **2026-10-31 15:09, user** (recorded by orchestrator): “Cover QNH, QFE and
standard pressure”.

Resolved: 2026-10-31 15:09, user; carried into [SPEC](SPEC.md),
[training design](design/TRAINING.md), ARCH and EVAL. Numeric cases still require
the selected aircraft, atmosphere, elevation data and predeclared tolerances.

### Q9. Which cockpit style comes first?

Why: controls, references, instrument interactions and learning progression differ.
Options: classic first/glass later, glass first, or compare before choosing.

Answer: **2026-10-31 15:09, user** (recorded by orchestrator): “Classic instruments
first, glass later”.

Resolved: 2026-10-31 15:09, user; carried into [SPEC](SPEC.md),
[CONCEPT](design/CONCEPT.md), [training design](design/TRAINING.md) and ARCH/ROAD.
Q3 retains the unresolved exact C172 configuration.

## Assumptions to check

| ID | Assumption | Basis and recorded author/time | Correction |
| --- | --- | --- | --- |
| A1 | CPL follows an initial useful PPL foundation. | User explicitly said EASA PPL **first**; orchestrator, 2026-10-31 14:53. | None recorded. |
| A2 | Initial use is supplementary practice, without a training-credit claim. | No approval objective specified; orchestrator proposal, 2026-10-31 14:53. | Pending user correction. |
| A3 | Teaching assistance and physics fidelity are separate, visible settings. | Derived from starting simple and becoming realistic; product proposal, 2026-10-31 14:53. | Pending user correction. |
| A4 | Local-first development and no learner account requirement initially. | Minimizes unneeded infrastructure during foundation; orchestrator proposal, 2026-10-31 14:53. | Pending user correction. |
| A5 | Raw project brief may be tracked locally; no private learner data is included. | User requested repository setup; orchestrator, 2026-10-31 14:53. | Recheck before publishing. |
| A6 | Replay/debrief is the initial interpretation of “video review”; exported video remains a separate option. | User likes GeoFS flight review; orchestrator proposal, 2026-10-31 15:09. | Pending user correction. |
| A7 | A320 is an interaction reference; fewer/deeper aircraft means no second initial type. | Existing C172-first decision and user feedback; orchestrator interpretation, 2026-10-31 15:09. | Pending user correction. |
| A8 | ILS and advanced traffic systems get separate later equipment/objective scopes. | EASA PPL first plus expanded wishlist; orchestrator proposal, 2026-10-31 15:09. | Ordering pending user correction and syllabus/equipment research. |
| A9 | Free access and open-source release are product directions; exact license/hosting and third-party rights need separate selections. | User's free/open-source community direction, 2026-10-31 15:15. | License selected 2026-11-01 07:04 (Q5: GPL-3.0-or-later); 2026-11-03 roadmap retains a permanently free baseline and candidate optional premium data/AI services. Hosting, operating model and per-asset/service rights remain pending. |
| A10 | AI-assisted authoring assembles validated declarative packages rather than executing arbitrary generated code or inventing navigation data. | Source-backed realism and reuse direction; orchestrator architecture proposal, 2026-10-31 15:15. | Provider/interface and review scope pending. |
