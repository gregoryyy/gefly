# Target architecture

Status: selected stack with proposed product component boundaries. **Web application**, **Cessna 172**, **EASA PPL first**, **classic instruments before glass** and **QNH/QFE/standard-pressure coverage** are user decisions. Aircraft: a classic-panel 172S first, then the Reims FR172, as distinct engine configurations (Q3); the first exercise is a circuit at Frankfurt-Egelsbach (EDFE). The dynamics engine is **JSBSim** (Q17), used as a replaceable LGPL library; the web stack is TypeScript with a CesiumJS renderer (three.js fallback), MapLibre 2D maps and JSBSim in a module Web Worker at a fixed **1/120 s** step (Q17). Exact radio fit and geographic data provider remain open. Native and browser studies exist; the complete learner simulator and project-owned 172S flight model are not implemented. Expanded scope and proposed delivery slices are in [the training design](design/TRAINING.md).

An experimental [local browser application](../app/README.md) integrates the existing study worker with a TypeScript flight deck and Cesium scene. npm/Vite owns this bounded application; reusable package boundaries below remain the target for extraction. Its generic study aircraft is built only for local research. Normal flights combine the finer public Hessen DEM with 475 available BKG DGM200 tiles within 608 declared slots over 6–14°E / 47–51.75°N, sharing physical DHHN2016 heights and GCG2016/2023 offsets between native ground contact and the Cesium ellipsoid-height surface. Explicit flat landing studies remain separate. This is not surveyed airport/runway or full EDDF/100 NM fidelity. The project-owned 172S model, real EDFE circuit and production runtime distribution remain incomplete.

A lazy-loaded MapLibre map shows flight position, true heading, a bounded simplified session-only geographic path and worldwide OurAirports airport/NAV discovery, with source runway/frequency details and the bundled 731-entry five-state fallback. Review uses the historical marker and bounded retained recording path; the map history is separate from replay state and is not saved on reload. Airport selection moves only the map. The community inventory is not accepted airport/runway, chart, fix or procedure data; reported elevation never overwrites contact terrain. Both 2D and 3D views use bundled imagery plus fixed-source live map/photo endpoints.

Custom GPS fixes and ordered flight plans are bounded page-session map data, with pure point/leg calculations separated from the editor and MapLibre presentation. Source point coordinates/provenance are copied into the draft; active-leg and direct-to selection affect map lines, true-bearing/heading readouts and the read-only BRG/DIST presentation. No plan enters native guidance, radios or flight recordings. In Review the current plan is explicitly distinguished from the historical aircraft position.

Presentation pulls the current explicit GPS direct-to/active-leg target from
`PracticeMap.getGpsTarget()` into the navigation-gauge update. The bearing dial
labels GPS/target identity and geographic DIST NM separately from NAV1 radio DME;
without a GPS target it retains the NAV1 VOR/radio-DME presentation. Draft points
do not select a target. Closing the map retains selection, and Next/Stop/Clear
refresh the display. Review combines current target selection with recorded
position and labels that distinction. This data path does not enter the worker,
deterministic state, recorded avionics or native AP/radio/OBS/RPM state. AP NAV
continues to use NAV1 radio guidance; GPS autopilot guidance is not implemented.

A visible-map canvas right-click opens a location popup without changing the
store. Explicit Create GPS fix or Add waypoint actions perform bounded creation;
the latter atomically preserves start/destination and rejects exhausted fix/
waypoint capacity without an orphan or consumed identifier. Right-drags and
native control menus do not create points. The full planner
lives in a nonmodal transparent portal outside the hidden map container, so map
and plan visibility are independent. Both views share the same bounded current
session plan, including in Review, without native guidance or radio commands.

A versioned local display-preference record retains only vector/photo scenery
and landmark level. Startup restores these choices before scene initialization;
invalid or inaccessible storage falls back to photos and labels Off. Options
previews are not stored until Save; cancellation restores opening values.
Flight state, control preferences and planning data retain their separate
existing lifetimes.

The research worker also computes an ideal ISA scale-offset pressure altimeter
from actual JSBSim static pressure at each fixed step. Read-only pressure exports
leave the original 14-value dynamics state/digest unchanged. A bounded setting
message can update the instrument at a paused step; the trace replaces only its
last instrument snapshot while retaining physical state and VSI. Review renders
captured indications. This is a prototype field extension, not completion of the
full v1.1 state/digest contracts. Its launch-point QFE datum is explicitly airborne,
not an airport elevation; see [model sources](research/2026-11-02-pressure-altimeter.md).

The classic cockpit now uses a 3×2 six-pack. Optional atomic cockpit/engine
telemetry groups copy source-backed JSBSim CAS, true heading rate, pilot-specific
force, actual flap position, wheel-brake commands and piston/fuel values. The
inclinometer is an ideal apparent-force display, not a full turn-coordinator gyro.
The scene's authored +X-nose/+Y-up/+Z-right glTF axes are explicitly mapped through
Cesium's axis correction into an aircraft ENU basis; look offsets affect only the
camera. Scene click/hold input uses explicit yoke/look modes, neutralizing on
release/cancel/focus transitions without pointer-lock permission. The default
centered mode reads the current scene rectangle for its neutral point and retains
camera look independently of those control cancellations; Escape and flight
restart explicitly reset the look. The optional relative mode retains its click anchor and camera look.

Flaps and symmetric wheel brakes drive existing model FCS properties. Manual
mixture uses a source-hash-guarded local aircraft copy: a default-on gate on the
upstream automatic-mixture channel preserves its original coefficients and
baseline behavior. Build metadata records source/prepared/adapter hashes. The
autopilot reuses existing generic JSBSim roll/pitch controllers beneath the KAP
operating-state model, including heading and pressure-altitude modes. Legacy AP
channels remain isolated from that adapter. Raw pilot intent disconnects AP before the study roll correction
is applied, and the correction is suspended while AP owns roll. These are generic
research-model controls, not the installed 172S avionics or full v1.1 run contract.
See [sources and limits](research/2026-11-02-classic-controls.md).

The v5 local aircraft adapter zeroes only the named left/right aileron actuator hysteresis widths. Source travel/rate limits, scales, aerodynamic functions, mass, elevator/rudder and existing AP/mixture/steering adaptations are preserved. Returned manual command plus fixed trim therefore has one aileron target independent of prior command direction. This removes a generic-model control-history effect; it adds no continuous bank correction or claimed installed-C172 rigging. [Mechanism and evidence](research/2026-11-06-aileron-return.md).

Engine-off flight uses a separately hash-recorded, local-only generic fixed-pitch
propeller derived from the pinned Aero-Matic generator. Its negative power
region lets airflow drive native shaft rotation and negative thrust, including
engine friction/pumping losses. The original propeller's positive-only power
table let rotation and propeller drag vanish after shutdown. Direct-drive design
RPM replaces the generator's gearing estimate; this changes powered propeller
forces too. Aircraft airframe coefficients and native force integration remain
in JSBSim. At low RPM/outside the finite coefficient tables, propeller rotation
and drag can still collapse; this case remains unaccepted under TODO 2.0.52.
This is a partial generic model correction, not accepted 172S performance;
see [sources and diagnostic limits](research/2026-11-03-engine-off-glide.md).

Additional user decisions: a **free/open-source flight-school community site**,
**LLM-assisted flight-experience authoring and AI interaction**, an initial
**EDDF/100 NM regional model from real source material**, and **reuse of open
physics engines/models wherever practical**. These guide the target; the project license is GPL-3.0-or-later
(Q5); JSBSim is the selected dynamics engine (Q17). Bounded geographic datasets
and public imagery sources are now integrated; production hosting and an LLM
provider remain undecided.

## Reuse-first physics and aircraft models

The reuse-first E1 assessment led to JSBSim's selection; keep it a separately
replaceable WASM library rather than duplicating its equations. Its bundled C172
aircraft data is not shipped. A project-owned 172S model is planned from the
[source manifest](../data/aircraft/c172s-classic/README.md) and
[FDM plan](design/FDM-172S.md); neither source data nor the generic C172 study
establishes that model's fidelity. Distinguish engine,
aircraft coefficients/configuration, cockpit code and visual/audio asset licenses;
one project's license does not establish rights to an unrelated model or texture.
Assess fixed-step/replay behavior, supported aircraft/envelope, browser integration,
performance, maintenance and compatibility with the intended open-source release.

The [browser study](../studies/e1-browser/README.md) implements a WASM adapter and
module worker, with bounded reference-Mac observations. The older study alone does
not establish the later real terrain/imagery integration, full device-resolution
budget or product cockpit workload. A custom reference harness or gap-specific component is acceptable when
its purpose is explicit; replacing an available model needs a recorded mismatch
or unmet requirement and independent validation. Reuse does not establish C172
configuration accuracy. See [open-engine/regional sources](research/2026-10-31-eddf-open-foundation.md),
R-REUSE-1 and E1/E2.

## Components and ownership boundaries

The first bounded runtime foundation is the pure assessment-airspeed mapper and
repository-data adapter under `packages/training/`, with shared types under
`packages/contracts/`. See [its contract](design/ASSESSMENT-AIRSPEED.md).
Evaluator-derived IAS remains outside `ind` and simulation/replay digests; the
component accepts a trusted adapted calibration bundle and returns explicit
mapped/range/unavailable results. It has no renderer or platform dependency and
does not implement the browser flight application, instrument model or recorder.

| Boundary | Responsibility | Proposed implementation stream |
| --- | --- | --- |
| `packages/contracts/` | Units, frames, versioned state/input/event/schema contracts | Orchestrator integrates agreed changes before parallel work |
| `packages/simulation/` | Fixed-step clock, forces/moments, dynamics adapter, deterministic stepping | code1 |
| `packages/aircraft/` | Identified aircraft configuration, systems and parameter provenance | code1, when explicitly assigned |
| `packages/avionics/` | Instruments, sensors, instrument errors and selected avionics behavior | code2 |
| `packages/training/` | Objectives, exercises, assists, assessment and replay annotations | code2, when explicitly assigned |
| `app/` | Web shell, cockpit/world presentation, input calibration, feedback | code2, when explicitly assigned |
| `data/` | Source manifests and reviewed fixtures with units, applicability and rights | Researcher proposes; orchestrator assigns integration |
| `tests/`, `studies/` | Evidence, reference scenarios and bounded engine/browser experiments | Explicit task ownership; reviews independent |

The expanded requirements add logical geography/navigation, briefing and
communications services. Their physical packaging is undecided; use the selected
TypeScript/web stack unless a recorded requirement justifies another runtime. Their contracts feed the
existing aircraft/avionics/training modules and web presentation.

These are source boundaries, not chosen package-manager workspaces. Finalize physical packaging through bounded implementation work. Shared interfaces and dependencies have one writer per change.

## Model and flows

Inputs become timestamped, normalized control events. The simulation advances at the selected fixed **1/120 s** step independent of display frames; the renderer reads the 60 Hz state stream and interpolates for display only (Q17/Q18, [CONTRACTS](design/CONTRACTS.md)). If the machine cannot keep up, report overload or deliberate simulation slow-down rather than silently changing physics. JSBSim runs as WASM in a module Web Worker; the E1 study is evidence for that integration boundary, not an accepted 172S model.

Window blur and page hiding release transient held controls and scene steering
without changing live running intent, latched flight selections or autopilot
state. A running worker continues advancing fixed 1/120 s steps independently
of rendering while the browser schedules it. Explicit Pause, Review, pausing
settings, terrain loading and faults retain their integration stops; focus return
never supplies an automatic resume. Hidden-page audio remains suppressed.
Browser/OS throttling or suspension can delay execution; this behavior does not
promise real-time progress through computer sleep or replace fixed steps with a
single elapsed-time jump.

The versioned state includes simulation time, aircraft identity/configuration, position/orientation in declared frames, velocities/rates, mass/configuration, environmental conditions, systems/sensors and control positions. SI is the internal default. Cockpit presentation converts explicitly to aircraft-appropriate units. State labels distinguish IAS/TAS/groundspeed, altitude references and magnetic/true headings. A real instrument model derives readings from simulated sensors rather than reusing a visual attitude or speed guess.

Record initial conditions, scenario/model versions, fixed step, seed, control events and fidelity/assist settings for repeatable replay. Determinism is claimed only for specified engine/runtime versions and tolerances established by EVAL. Presentation and teaching never become a second source of aircraft state. Training feedback consumes recorded state/events; any AI explanation stays outside the authoritative physics/control loop.

## Geography, navigation and pressure references

The right-side flight map reuses the existing MapLibre instance, bounded
same-origin BKG/public-photo endpoints, airport catalogue and hash-verified
map-only community/historical navigation package. This is separate from the
radio model’s regional 2013.10 inventory. All 731 airfield points are GPU-rendered;
directory results and nearby DOM labels are bounded to 100 and 80 respectively.
The map endpoint covers 6–14°E / 47–51.75°N; photo and physics bounds stay regional.
Desktop opening reserves space in the Cesium
viewport; the cockpit remains full width, and ResizeObserver updates rendering
dimensions without resetting flight. M/marked menu controls visibility. A public
map is the initial base; aerial imagery and source-dated NAV visibility are
presentation choices. The independent path/marker consume actual live or selected
recorded state at the existing bounded map refresh rate. Full retained history
remains visible in Review; the historical marker does not restore the worker.
All airport/NAV interactions are read-only and do not tune radios. No new data
provider, font server, geolocation permission or simulation integration is added.
See R-WORLD-6 and the [source assessment](research/2026-11-03-flight-map.md).

The first reference region is the geodesic disk **100 NM (185.2 km)** around
EDDF's sourced official airport reference point. Do not substitute a city center,
an unverified third-party airport point or an old chart without recording it as
unaccepted input. Exact current ARP coordinates are still to be verified. EDDF
centers the regional model; exercise airports/runways and source editions are
separate selections inside the region. Define the boundary calculation, vertical
datum, coverage/level of detail and any tile-loading buffer explicitly.

Build a versioned regional manifest from reviewed real map/elevation/airport/
navigation sources. Each layer records origin, edition, units/datum, uncertainty,
rights, attribution and coverage. Separate open geodata from restricted official
charts and from rendered imagery; publicly viewable material is not automatically
redistributable. The open-source build needs a reproducible authorized-data path,
and optional external material must declare its access requirements. Generated
maps identify both generated presentation and the real/historical/synthetic status
of underlying data. The current prototype has imported versioned terrain,
photography, historical radio navigation and community airport points; those
bounded datasets do not complete the accepted 100 NM regional model.

Give each scenario a versioned geographic/navigation snapshot: airport/runway and
threshold identity, coordinates, elevations with units/datums, navaids/frequencies,
fixes and any accepted procedure geometry. Resolve identifiers against that
snapshot; report unknown/ambiguous entries rather than invent positions. Terrain,
map display, cockpit radios and exercise scoring must use compatible references.
Represent airport reference, runway/threshold and terrain elevations distinctly.
Keep drawn descent guidance, visual aids and modeled ILS signals separate, each
with its own source and meaning. See R-WORLD-1 and R-NAV-1 through R-NAV-3 in SPEC.

The aircraft atmosphere/static-pressure and altimeter models supply cockpit
indications; QNH, QFE and standard-pressure selection are instrument state, not a
map-only label. Store chosen setting, unit/reference, environment and instrument
configuration in reset/replay. Explicitly convert cockpit/map altitude references;
do not silently substitute geometric height for an indicated value. Freeze source-
based cases and tolerances before claiming pressure-reference correctness (R-AIR-3).

Conventional-panel radio/navigation controls come first. Later glass consumes
the same modeled sensors and accepted data through the chosen installation's
interfaces. A working overlay or autopilot path is separate from demonstrated
cockpit tuning, indications and mode behavior.

## Briefing, communications, checks and review

Weather/NOTAM adapters return structured snapshots with publisher, station/region,
issue/retrieval/validity times, data status and rights. Separate live retrieval
from scenario consumption: pin the accepted data to a session so replay does not
fetch a new atmosphere or notice set. A weather report and actual simulated
conditions must have a documented relationship; label intentional training
variations. Show service failure, stale or unavailable coverage instead of
silently using clear weather or an empty notice list. Provider/caching/backend
needs remain foundation decisions (R-BRIEF-1, GAPS Q10). The user accepted Q11's
sequence: **versioned scenario briefings first**, explicitly labeled historical/
generated content, with an optional live adapter later. Initial exercises do not
depend on a live provider; reports/notices and applied conditions are frozen in
the accepted scenario package. Source/coverage and live-provider rollout remain
separate technical decisions.

Radio practice uses a scenario state machine: aircraft identity, station/role,
frequency, intent, issued instruction, readback and acknowledged state. Typed text
may map to that model through a bounded interface; a future language model may
help phrase or parse text but cannot unilaterally invent or accept scenario state.
Record exchanges on the same clock as controls, checklist events and flight state.
Aircraft-specific checklists reference observable system state where modeled;
manual acknowledgments and unresolved steps remain explicit. R-COMM-1 and
R-TRAIN-4/R-TRAIN-5 define the product criteria.

Cockpit and external cameras read the same snapshots. Flight review synchronizes
state, flown path, control/instrument settings, pressure reference, checklist and
radio events with the scenario's frozen inputs. Seek/reset semantics are explicit;
video export, if later selected, is a separate presentation output (R-VIEW-1 and
R-REVIEW-1). The first input baseline is a **Mac desktop browser with keyboard and
touchpad**, with optional yoke/joystick and rudder pedals. Reuse the GeoFS control/
settings model conceptually; [CONTROLS](design/CONTROLS.md) records its source and
Mac-specific constraints. Normalize all supported inputs into shared control events
with explicit mode, calibration, sensitivity/assist metadata and device/focus-loss
handling. Controller mappings cannot imply unmodeled aircraft systems. Later mobile
orientation uses the same boundary with permission/calibration/fallback on its own
supported-device matrix (R-INPUT-1/R-INPUT-2).

Traffic-awareness/advisory systems are capabilities of a selected equipment
profile, not automatic instruments on every aircraft. Specify source, sensor/
traffic inputs, indications and authority before implementing later ACAS/TCAS
exercises; display of nearby traffic alone does not satisfy R-TRAFFIC-1.

## World-authoring pipeline (planned)

R-WORLD-8 extends the existing regional-data path into a reusable authoring
workflow: map extent and coverage preview → authorized source retrieval → CRS/
datum normalization → terrain/building/land-cover layers → deterministic regional
materials and assets → tiled glTF/3D Tiles package → browser flight preview and
reviewed community publication. Reuse GIS/conversion/procedural tools and the
existing Cesium renderer; specific compiler/tool/provider selection remains open.
See the [research and first demonstrator](research/2026-11-04-world-authoring.md).

Keep DTM/contact terrain separate from DSM, building shells, visual materials and
captured/neural scenery. Prefer measured geometry; carry source IDs, edition,
rights, hashes and measured/inferred/generated status through authored objects.
A detailed visual mesh or splat does not automatically supply collision geometry
or an accepted obstacle database. Any physical integration needs explicit source
and alignment validation against the existing datum/contact contract.

An authoring recipe proposes extent, source manifests, approved asset IDs,
regional rules, seed, compiler/version and LOD/texture budgets. An optional offline
LLM/VLM can propose edits or representative detail; a bounded validator and human
preview precede deterministic compilation. No generated JavaScript or arbitrary
model tool invocation enters the simulator. Accepted packages replay without
regeneration or dependence on a live model. Captured photogrammetry/splats remain
an optional visual layer with separately verified input/output rights, runtime
compatibility and measured streaming budgets. Current research does not select
an AI provider, hosted tiler, model weight or worldwide-resolution guarantee.

## LLM-assisted flight-experience authoring

The user describes territory, learning goals, navigation assets, chart material
and desired interaction. Authoring resolves the request into a proposed
**declarative experience package** referencing accepted regional and aircraft
manifests, objectives, initial conditions, routes/fixes, charts/maps, weather/
notices, checklist/radio scripts and assessment/review events. Record generator/
model version, prompt/template, source versions and resulting package hash as
appropriate; replay consumes the accepted package, not another stochastic
generation. Credentials and personal data do not become part of the package.

Use retrieval/structured tools for real identifiers and geometry. Validation
checks schema, bounds, source availability/rights, geographic inclusion, coherent
references, equipment support and scenario transitions before a package can run
or be shared. Missing or ambiguous navigation/chart facts return an explicit
authoring question; the LLM cannot invent a real procedure, navaid or clearance.
Human review of the briefing/map/objectives precedes acceptance; exact roles and
review policy remain to be specified. No arbitrary generated JavaScript or code
execution is required by this design.

AI-based pilot/instructor/radio interaction is a bounded presentation/intent
adapter over the scenario's modeled state. Preserve the text interaction path,
auditable accepted events and graceful provider-offline behavior. Select local/
hosted provider, cost controls and data flows separately (GAPS Q13). R-AUTHOR-1
defines the desired outcome; E9 evaluates source/interaction consistency.

## Flight-school community and open-source delivery

Separate the freely usable simulator/experience format from the public community
service. Proposed community functions are a source-marked exercise library,
learner questions, practice groups and review/debrief sharing; user/instructor
roles, review labels and moderation require product decisions before release.
Instructor-reviewed material must identify its actual review status; a generated
exercise does not acquire that status automatically.

Keep community storage, identity, submissions and moderation behind service
interfaces so local simulation and self-hosting do not depend on a central account.
Source code is GPL-3.0-or-later; build instructions and contribution workflow
should keep the release reproducible and a later relaxation possible, while separately licensed data/assets retain
their own obligations. Define deployment, public-data retention and service costs
without silently restricting the requested free core experience. Community does
not automatically require real-time multiplayer or voice services. R-COMMUNITY-1
and R-OPEN-1 govern the outcome; hosting remains open and community
rules/roles are scoped in roadmap phase 3.

## Fidelity evolution

First: a bounded generic instructional study with explicit simplifications. Next: one source-backed C172 configuration, authentic control semantics and basic instruments. Later: documented propulsion, aerodynamic couplings, ground effects/contact, environmental behavior, failures and specific avionics as independently accepted increments. Unsupported regimes are identified. The product chooses which learning objective justifies each increment.

## Deployment and trust boundaries

Begin with a locally served web application and static build. Hosting, accounts, cloud telemetry and multiplayer are deferred. Map/scenery/weather/navigation/NOTAM providers require explicit license, freshness, attribution and offline/failure decisions before integration. A minimal server-side adapter may become necessary for protected provider keys or data redistribution; select it through the source/stack study, not as an implicit account requirement. See [SEC](SEC.md) and [SBOM](SBOM.md).

Downloaded source material, aircraft definitions, URLs and imported replay/scenario files are untrusted. Validate schema, size and numeric bounds before use. Do not execute imported scripts or render imported strings as HTML. Separate build-time document rendering from application runtime. External APIs must not receive credentials from checked-in code.

## Proposed budgets and decision gates

The initial target is a responsive **Mac desktop web experience with keyboard/touchpad**,
plus optional yoke/joystick and rudder pedals. Mobile orientation follows later.
Q16/Q17 select the reference M1/Chrome direction and the TypeScript/CesiumJS
(three.js fallback)/MapLibre/JSBSim worker stack; Q18 selects 60 Hz state delivery
with display-only interpolation, and the physics step is fixed at 1/120 s.
The [E1 observations](../studies/e1-browser/README.md) preserve measured viewport,
timer-resolution and workload limits. Valid light-scene runs support the renderer
choice; the invalid thumbnail run remains excluded. Real terrain and imagery tiles
at device resolution, exact reference versions/display, optional controllers, CPU
headroom and a representative cockpit/load case still require measurement.

Before milestone 2: complete those load/device checks, finalize remaining
contracts/aircraft fit and data rights, freeze numerical fixtures and criteria,
and run the project-owned model's independent tests. Q21 accepts P-1..P-15 as
working FDM tolerances, not completed E2 validation. See [EVAL](EVAL.md),
[GAPS](GAPS.md) and [TODO](TODO.md).

## Assurance tooling

The bounded [assurance design](assure/ASSR.md) generates lineage and checks from
the authoritative documents, Git records, code/data objects and versioned evidence.
It reuses Propeller's pinned core; no database, persistent service or new agent is
introduced. The shared offline CI gate includes assurance integrity checks, while
`just assure report`, `trace`, `diff` and `impact` support review. `just lineage`
writes disposable JSON and Markdown under ignored `utils/assure/out/`, without opening
a browser or posting externally. Runtime code and its tests live in
`utils/assure/`; the product contract and catalog remain in `docs/assure/`. The
shared CI entry point and structural checker live in `utils/ci/`.

Planned requirements, declared links, observed outcomes and accepted claims are
separate states. Missing, skipped or stale evidence cannot establish acceptance;
current accepted claims must pass their dependency/freshness checks. The graph
does not verify source truth, numerical adequacy or every prose contradiction.
Independent semantic quality/specification review and the batched peer gate remain
required under SDLC; see [assurance criteria AS1–AS8](assure/SPEC.md).

## Spatial airflow-angle diagnostic

The read-only stall-awareness telemetry group carries air-relative body velocity,
aerodynamic angular velocity, current structural-frame CG and existing global
AoA/warning/hysteresis values. Structural aft/right/up coordinates convert to
CG-relative forward/right/down body offsets. Six documented reference-span
stations use Vair + omega × r; atan2(local down, local forward) is a kinematic
body-relative proxy, compared only with the model's common positive alpha-max.
This display consumes selected recorded states and never feeds the engine.
Regional separation, induced flow, twist and local control effects require a
separate applicable aerodynamic model; current tail/fuselage regions stay unknown.

The stall-warning transport observes the existing validated thirteen-field native
group after every fixed physics step. A bounded pending positive peak and exact
source step accompany one successful live state publication, then drain. Current
native values, deterministic step size and aircraft coefficients remain unchanged.
Contact, invalid data and stop/loading/reset paths discard the pending event;
rate-only rebasing publishes it before draining. The session validates the optional
all-or-none positive/step-bounded pair independently of the raw group. FlightTrace
validates but drops it, so it cannot become recorded physics or a continuation
checkpoint field.

A live-only delivery helper accepts every worker frame before RAF and coalesces
genuine events across rendering gaps. Its 200 ms wall-clock presentation minimum
starts at first presentation, with RECENT STALL identifying retained events whose
current native signal is clear. It uses performance.now(), not simulation time or
RAF's earlier timestamp. Disabled delivery cancels pending/held events while
retaining consumed identities; only a new worker/reset clears the epoch. Review
uses the raw warning monitor, without retention or historical peak replay. The
existing audio graph receives the same displayed live warning and lifecycle gates.

## Engine sound presentation

A single gesture-created Web Audio graph consumes actual selected engine state
(propeller angular velocity, manifold pressure and fuel flow). Original periodic
exhaust, mechanical and filtered blade-pass layers are presentation only; gain
curves/timbre are uncalibrated sound design. No signal feeds back into dynamics,
input, trace sampling or deterministic state. A shared graph can also render
offline test PCM; no sample asset or external service is required. Immediate
lifecycle gates silence output before a hidden-page RAF can stop. Playing Review
synthesizes selected recorded states; it is not replay of captured audio.

The classic autopilot now separates a fixed-step KAP operating-state machine
from the reused generic native roll/pitch controllers. Engine telemetry keeps
its backward-compatible thirteen-field group; KAP mode/target/validity data is a
separate atomic extension, with its own pressure setting and NAV1 configuration.
UI timing recognizes physical button gestures, while simulation-time state owns
mode transitions, arming and capture. Recorded mode snapshots never drive native
physics. A shared pure navigation module now drives both NAV instrument receivers
and fixed-step NAV1/AP guidance from the same immutable historical NAV810 package. The receiver package now covers worldwide source services; its bounded loader verifies identical bytes on both sides and an immutable frequency index avoids full-world scans during fixed-step guidance. OurAirports discovery remains an independent source and does not supply receiver components.
Normal initialization verifies bounded same-origin bytes/hash/schema before physics;
LAB remains an explicit isolated source. Real VOR OBS uses sourced station magnetic
calibration, while LOC/GS courses and the prototype DG remain true. Components
retain separate coordinates/heights/ranges and DME bias; missing, conflicting or
co-channel ambiguous service is unavailable. The source-derived EDDF 25C start is
a geometric intercept fixture over existing public terrain, not a published
procedure. Recorded tuning and the page-local frozen dataset drive Review.
These fixtures do not establish current operational service, RF propagation,
receiver calibration or installed servo, PFT/electrical/trim-fault fidelity.

Regional orthophotos add a bounded local XYZ/Web-Mercator imagery provider over
unchanged terrain/dynamics. A versioned manifest identifies every 512-pixel tile;
source groups retain exact WMS requests and raw hashes, while derived tile hashes
bind crop/re-encoding output. Cesium requests visible levels; the provider deduplicates
loads, caps six concurrent requests and 64 decoded source images, and returns a
fresh canvas to avoid closing images still held by GPU upload. Missing finer
levels crop the correct north-down ancestor subrectangle. The old coarse/relief
layers remain underneath and the sharper Egelsbach overlay remains above.

## Streamed regional ground and live scenery

The [regional manifest](../app/public/terrain/region/manifest.json) declares 608 slots and pins 475 available
129×129-node tiles, each containing interleaved physical DHHN2016 H and
GCG2016/2023 ζ channels. The authoring compiler builds one exact shared
geographic lattice from BKG's 200 m source, then slices tiles so adjacent edges
share identical float32 nodes. The native atlas receives H; Cesium samples the
same surface plus ζ. A derived 0.02° inward smoothstep band joins the finer
Hessen surface to the coarse layer, with derivatives shared for contact slopes.
This interpolation is an explicit approximation, not improved source accuracy.

The fixed-step worker installs/removes complete immutable tile buffers between
steps. Its moving 3×3 working set holds at most nine tiles; a tile-centre change
pauses physics until the new set is ready, then resumes only prior running intent.
User pause cancels automatic resume. R-WORLD-11 now fills invalid or missing
regional nodes from the bundled coarse baseline; required assets still fail
visibly. Review prepares only the selected neighborhood, capped at 64 world
cells plus the current live nine, without restoring or advancing physics. Source 200 m relief and
mostly 2000–2019 surveys remain distinct from finer display subdivision.

Vite's development middleware exposes fixed same-origin `/scenery/map/...png`
and `/scenery/imagery/...png` XYZ endpoints. It converts bounded coordinates to
allowlisted WMS requests for TopPlusOpen and five state photography services.
Node controls request/cache limits; a bounded Python/Pillow process composites
transparent 512 px responses. Unavailable/transparent photo areas expose map
fallback rather than invented imagery. The original verified local pyramid and
airport detail remain above live layers. Live image capture dates are unknown,
and responses are unversioned; Review retains flight/terrain state rather than a
frozen photographic recording. Full flow, bounds and retention are in [SEC](SEC.md).

Only the development server currently installs the proxy. A static UI build
does not supply that endpoint or the generated research-engine runtime;
production hosting remains undecided. No Google, MapTiler or ion account/service
was activated by the global-scenery research.

## Simulator shortcuts and pacing

The top title/menu bar and floating flight controls start hidden; I toggles the
bar independently of the central Start/Pause card, and O opens Options. Floating
controls, flight-data and stall panels retain half opacity and a consumed first
activation gesture. The map and plan portal bypass that reusable guard and
dimming so their first intended gesture operates immediately. Interaction
neutralizes held pilot axes while preserving selected steering references.
P toggles the independent plan overlay; A retains its AP capture/disconnect toggle.
Commands preserve their typing, modal, menu, repeat/modifier and Review guards.

A is a simulator convenience to capture the worker's current true heading and
pressure altitude into HDG + ALT, reusing existing KAP mode commands and generic
native servos. It is distinct from the modeled physical AP button and does not
change aircraft coefficients. Manual pilot axes retain their disconnect/rejection
priority. The = shortcut cycles requested live rates 1/1.5/2/5/10×. The worker
changes wall-clock pacing while retaining the fixed 1/120 s integration step and
simulation-time controller behavior; CPU overload can reduce achieved speed.
Pause/loading/reset and Review remain distinct from accelerated live integration.
The on-screen indicator uses the worker-confirmed rate; no requested rate is a
claim of measured real-time throughput.

## Aircraft loading and fuel

The pinned generic c172x model supplies six point-mass stations, including its
auxiliary external load, plus 1454 lb empty weight and two 130 lb tanks at the source
6.6 lb/USgal density. Preserve these as explicit legacy source defaults. Fresh
flights use `FLIGHT_DEFAULT_LOADING`: the same seats and fuel with the 80 lb
external station at 12 ft right unloaded, paired with zero initial study aileron
offset. The external station remains explicitly configurable; continuation
restores recorded loading or the historical source default for legacy traces.
This changes launch configuration, not aerodynamic coefficients. `loading.js` defines the shared kg/m³ contract and model/editor
bounds; these are not certified C172S limits. Native loading applies before trim
or runway settling. JSBSim supplies mass, CG, fuel delivery and tank depletion;
no presentation-side burn model is added. Ignition-off windmilling can still
meter fuel, while mixture cutoff and starvation follow the native engine.

An optional atomic loading snapshot travels with state traces. Continuation
restores recorded modern payload and original fuel baseline; old traces without
that group use pinned original payload with an explicit UI disclosure, never the
current custom takeoff configuration. Weight & fuel edits apply only through an
explicit restart; ordinary restarts retain the selected configuration.

## Coarse world terrain fallback

R-WORLD-11 retains detailed regional inputs while providing a bundled coarse
NOAA ETOPO 2022/EGM2008 height/geoid baseline. A canonical 0.25-degree streaming
lattice interpolates its 1-degree source; this adds no measurements. Valid
regional nodes take priority, masked/unavailable nodes use coarse heights. The
resulting derived source transition is explicitly approximate. Native contact
and Cesium consume the same 129×129 height/geoid grids with separate stable world
IDs and reusable nine-slot native storage. Source quality 1/2/3 means regional,
global or mixed for the entire current cell and is retained in recordings;
a mixed label is conservative even when the aircraft samples only coarse nodes. Loading occurs between fixed
steps without reconstructing the aircraft; optional regional enhancement times
out to coarse data. Required game assets remain integrity checked.

OpenFreeMap/OSM is the consistent detailed, labeled global cartography for the
2D map and 3D vector texture. Default opaque regional BKG cartography is inactive
(implementation retained), avoiding a rectangular map patchwork. Available
regional photographs cover the OSM underlay when photo mode is selected. It supplies no physical heights. World saved locations
stay inside the declared ±89.5-degree flight latitude, while map tiles retain
WebMercator limits. Review loads only the selected neighborhood, keeps the last
valid 3D frame during loading and caps its cache; it is not a captured world-state
recording. Country-specific Swiss/Austrian data is not yet part of the runtime.

## Bounded worldwide terrain rendering

Two 180° geographic roots replace 4050 eager root mesh jobs. Preview grids refine
to 181 nodes; 180 intervals give2^-L degree spacing, matching legacy native nodes
at L9. Far terrain stops at L12 and fine coverage at L14, retaining the previous
finest spacing. This changes rendering only, not the 129² native terrain ABI.

Same-epoch live windows can update a stable provider through strict validation,
owned 64-grid history and 512-region finest/coarse-preview tracking. Changed
heights or uncertain cached surfaces conservatively rebuild; completed geometry
is retained for safe unchanged source cells. Metadata and source credits update
atomically. Static combined Review inputs remain bounded at 73 and disable live
mutation; older regional filtering behavior is preserved. Reset/new-flight and
archived/cached Review contexts prevent live mutation. Review using only
already-live terrain need not replace the provider. No private Cesium mesh API is used.


## Predictive scenery loading policy

A shared bounded predictor uses consecutive authoritative positions and simulated
elapsed time for ground motion; aircraft heading is not a wind-corrected track.
Look-ahead is20wall-seconds multiplied by confirmed simulation pacing, capped at
8km. The terrain worker stages one prospective next neighborhood separately from
the nine installed native tiles. Only the ordinary validated boundary transaction
can install it. Optional prefetch does not change controls, integration step or
current ground support. Cartography warming retains current-area priority within
the existing200-URL/two-background-request budget. Turns, invalid motion and
reset/Review epochs suppress stale predictions; failures retain ordinary loading.
See the [bounded cache design](design/scenery-cache.md). Actual source-cache and
handoff bounds are recorded with implementation evidence, not inferred from this
policy.

## Copernicus native/data foundation

The unchanged worker/native terrain interface receives nine immutable world30 grids on a1/32-degree cell/129²-node lattice. The composed node order prefers valid regional triangles, then canonically owned Copernicus posts, then the bundled coarse baseline.512 owner outcomes, including failures, are latched per stream epoch so shared edges cannot change through retries. Distinct world30 IDs preserve archived quarter-degree world identities. The generic nine-slot native callback and fixed timestep are unchanged.

A fixed-host same-origin service decodes reviewed Float32 DEFLATE/Predictor3 COG ranges under existing identity/size/resource bounds. Fine v1 and quarter-degree v2 output identities/cache keys are separate while upstream source caches remain shared. At most one optional overview cell job reserves capacity for fine requests. V2 is a data API prerequisite; the wider display client belongs to the separate display-overview increment. Source metadata describes live grids; old recorded numeric source codes do not prove fine-source quality.


## Worldwide custom GPS planning component

The GPS store and editor share finite global WGS84 validation via
`map-coordinates.ts`; geographic planning is independent of regional source
inventory bounds. Fixed capacities, immutable snapshots, source labels and
atomic ID allocation remain. The component has no worker, persistence or receiver
state access. The modular component/editor publication is separate from complete
map/menu/popup/bearing UI integration; working-app integration evidence must not
be represented as main-branch wiring in this increment.


## Optional OFM aeronautical overlay

R-CHART-1 adds a separate MapLibre raster source/layer above OSM/photography
and below local fixes, route, NAV and path layers. It uses already-rendered
transparent EPSG3857 tiles on viewport demand; following the aircraft naturally
loads approaching areas without OFMX conversion or a new physics worker. The
selected2611 product is source-marked and distinct from receiver data, procedures
and captured flight state. Off/hidden removes the optional source and cancels
requests; style reload reattaches it with saved selection/opacity. Optional errors
remain local to the chart instead of marking the underlying map failed.

A small validated descriptor identifies the reviewed edition and fixed local
proxy paths. The server proxy bounds upstream demand, coalesces subscribers,
validates PNG envelopes, and keeps a small expiring memory cache. It is installed
in development and preview; a future deployment must provide this route. No
third-party scripts or chart pixels are bundled. Structured selectable OFMX
features would require a separate bounded parser/converter, which could run in a
background worker on regional demand and cache source-identified results.

## Worldwide airport discovery boundary

The R-WORLD-12 compiler transforms four pinned OurAirports CSVs into deterministic
5° airport/runway/COM/radio-navaid packages and a compressed global search index.
The manifest binds source commit/input hashes, derived byte hashes/counts, explicit
normalization/rejection counters and retrieval date. Source IDs remain distinct
from repeated transmitted identifiers. Source feet, COM MHz and NAV kHz are explicit.

A separate browser discovery worker validates/fetches/decompresses/searches these
static assets. The UI receives bounded nearby snapshots and at most 40 global hits,
then uses existing map, point details and standby controls. Its cache and generation
are independent of scenery and physics workers. OSM visual surfaces, historical
receiver inputs and worldwide community discovery are separate inventories.


R-WORLD-12 bulk transport uses a small JSON descriptor whose SHA-256 binds the
full UTF-8 JSON `catalogue.bin`; cell `.bin` assets also contain UTF-8 JSON,
validated by the dedicated worker. The assurance graph records descriptor and
file-level provenance, not every generated airport-field JSON pointer. Compiler,
source-audit and all-cell client tests provide separate semantic checks. No
hand-authored aircraft-data extraction or assurance resource bound is relaxed.

## On-demand visual airport surfaces

R-AIRPORT-3 adds a separate same-origin `/scenery/airports/v1/x/y.json` service.
Canonical half-degree keys generate fixed Overpass way queries; the compiler
retains physical geometry/source metadata while stripping mapper identities.
Validated compiled packages pass through a bounded memory/disk cache and a
sequential client region loader to a separate Cesium airport collection. Prepared
EDFE/regional geometry takes priority. This pipeline cannot write Worker/native
state, change contact heights or regenerate the terrain provider. Review disables
source requests rather than claiming historical airport geometry. See the
[source/cache note](research/2026-11-06-on-demand-airports.md).

### Separate terrain source execution

The physics Worker retains fixed-step JSBSim calls and native terrain installation. A nested terrain-source Worker owns fetch/decode/compose/source-cache and prediction work, returning complete copied grids without detaching retained source buffers. Browser distant overview composition uses another dedicated Worker while the main-thread controller retains synchronous admission/stop guards. The optional server Copernicus decoder uses at most two Node worker threads and32 queued blocks. Failure, cancellation and bounded deadlines reject delivery; existing required-coverage waits remain. Terrain overview camera distance is render-only; airport meshes and practice PAPI never install physical terrain or airport collision geometry.


## Generated cartography lineage budget

The assurance catalog may select one fixed path/hash profile for the imported
terrain-style JSON. Its complete byte hash and file node remain inputs to existing
whole-file evidence; generated paint/layout field expansion is omitted. Child
selectors are unavailable for that profile and cannot establish acceptance via
its file node. The adapter still extracts all other JSON fields normally and
retains the existing resource limits. This is disposable lineage compaction, not
an application asset conversion or an aircraft/source-data deletion.
