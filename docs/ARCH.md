# Target architecture

Status: selected stack with proposed product component boundaries. **Web application**, **Cessna 172**, **EASA PPL first**, **classic instruments before glass** and **QNH/QFE/standard-pressure coverage** are user decisions. Aircraft: a classic-panel 172S first, then the Reims FR172, as distinct engine configurations (Q3); the first exercise is a circuit at Frankfurt-Egelsbach (EDFE). The dynamics engine is **JSBSim** (Q17), used as a replaceable LGPL library; the web stack is TypeScript with a CesiumJS renderer (three.js fallback), MapLibre 2D maps and JSBSim in a module Web Worker at a fixed **1/120 s** step (Q17). Exact radio fit and geographic data provider remain open. Native and browser studies exist; the product simulator and project-owned 172S flight model are not implemented. Expanded scope and proposed delivery slices are in [the training design](design/TRAINING.md).

Additional user decisions: a **free/open-source flight-school community site**,
**LLM-assisted flight-experience authoring and AI interaction**, an initial
**EDDF/100 NM regional model from real source material**, and **reuse of open
physics engines/models wherever practical**. These guide the target; the project license is GPL-3.0-or-later
(Q5); JSBSim is the selected dynamics engine (Q17); no hosting service, dataset or
LLM provider has been selected.

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
module worker, with bounded reference-Mac observations. It does not yet establish
real terrain/imagery loading, the full device-resolution budget or the product
cockpit workload. A custom reference harness or gap-specific component is acceptable when
its purpose is explicit; replacing an available model needs a recorded mismatch
or unmet requirement and independent validation. Reuse does not establish C172
configuration accuracy. See [open-engine/regional sources](research/2026-10-31-eddf-open-foundation.md),
R-REUSE-1 and E1/E2.

## Components and ownership boundaries

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

The versioned state includes simulation time, aircraft identity/configuration, position/orientation in declared frames, velocities/rates, mass/configuration, environmental conditions, systems/sensors and control positions. SI is the internal default. Cockpit presentation converts explicitly to aircraft-appropriate units. State labels distinguish IAS/TAS/groundspeed, altitude references and magnetic/true headings. A real instrument model derives readings from simulated sensors rather than reusing a visual attitude or speed guess.

Record initial conditions, scenario/model versions, fixed step, seed, control events and fidelity/assist settings for repeatable replay. Determinism is claimed only for specified engine/runtime versions and tolerances established by EVAL. Presentation and teaching never become a second source of aircraft state. Training feedback consumes recorded state/events; any AI explanation stays outside the authoritative physics/control loop.

## Geography, navigation and pressure references

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
of underlying data. No region geometry or dataset has yet been imported.

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
writes disposable JSON and Markdown under ignored `assure/out/`, without opening
a browser or posting externally.

Planned requirements, declared links, observed outcomes and accepted claims are
separate states. Missing, skipped or stale evidence cannot establish acceptance;
current accepted claims must pass their dependency/freshness checks. The graph
does not verify source truth, numerical adequacy or every prose contradiction.
Independent semantic quality/specification review and the batched peer gate remain
required under SDLC; see [assurance criteria AS1–AS8](assure/SPEC.md).
