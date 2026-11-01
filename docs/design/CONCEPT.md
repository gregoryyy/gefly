# Gefly concept

Status: refined concept, 2026-10-31. Authoritative requirements are in
[SPEC](../SPEC.md); open decisions are in [GAPS](../GAPS.md).

## Purpose and insight

Gefly is a web flight simulator for learners who need an approachable beginning
and a path toward aircraft-specific practice. Start with the Cessna 172 and EASA
PPL objectives, then deepen the model and training toward CPL. GeoFS is the
user's reference for the web experience, not a decision to reuse its code,
assets, data providers or technical stack. The user prefers a small fleet with
deeper controls: **one C172 with classic instruments first, glass later**. The
A320 is a reference for richer glass-cockpit interaction, not a second initial
aircraft. QNH, QFE and standard-pressure settings are part of the requested scope;
exact instrument applicability remains a configuration decision.

The required first control baseline is **Mac desktop, keyboard and touchpad**;
**yoke/joystick and rudder pedals are optional**. Mobile orientation stays on the
later roadmap. Reuse GeoFS's documented control/settings interaction and defaults
conceptually, with the exact Mac browser/device/performance matrix still to be
selected. The user also accepted **versioned scenario briefings first**, clearly
labeling historical/generated material, with an optional live adapter later.

The user wants the project to be **free and open source**, with a community site
oriented toward flight-school learning. Its roadmap includes **LLM-assisted
experience creation**: define a territory, navigation assets, charts and learning
intent to create a realistic experience with bounded AI interaction. Ground the
first regional model in **EDDF and a 100 NM radius from its official airport
reference point**, using applicable real map/reference material. Reuse open
physics engines and aircraft models wherever practical. The project license is
GPL-3.0-or-later; datasets, engine/model, hosting and LLM provider have not been
selected.

The proposed value is a visible connection between what the learner practices,
what the simulator actually models and the evidence behind it. An introductory
experience can reduce workload without pretending that a simplified aircraft is
already a verified training device. Progressive training and realistic flight
models already exist elsewhere; differentiation must be measured rather than
asserted. See the current [foundation research](../research/2026-10-31-foundation-sources.md).

## Preserve the GeoFS starting experience

The user values an aircraft that is quickly running in a browser, recognizable
geography, usable physics, keyboard/touchpad input and orientation control on
mobile, cockpit and external views, and video/review. These are the experience
baseline to preserve while adding depth. Mac keyboard/touchpad is the first
required platform/input combination; optional controllers and later mobile support
have declared profiles and evidence gates. Scenery coverage and mobile browser
support need explicit scope; they do not imply immediate worldwide detail or
universal sensor support. Flight review should work from synchronized simulation
data; an encoded video export is a separate delivery choice.

The user's gaps point toward a connected flight rather than isolated cockpit
gadgets: brief the flight with weather and NOTAMs; set pressure and understand
field elevation; use the applicable checklist; communicate intent and clearances;
follow meaningful identifiers and charts; fly circuits or a scoped approach;
review what happened. A functioning instrument has controls, sources, indications
and validity/failure behavior. A route on a map, an autopilot or multiplayer chat
alone does not meet that depth.

These are product goals, not verified statements that GeoFS lacks every feature.
The [GeoFS capability research](../research/2026-10-31-geofs-gap-analysis.md) keeps
documented features and original community reports separate from questions about
cockpit completeness. The user's description of FlightGear's graphics
and interaction is a preference to investigate, not an objective quality finding.
Community evidence can suggest new research questions; it does not establish how
representative a complaint is or justify copying third-party add-ons.

Community-derived proposals to evaluate include clearer COM-versus-NAV control
discovery, independent control of scenario time/weather, criterion-based landing
feedback and lesson triggers that expose unmet conditions and recover gracefully.
These are research leads and proposed acceptance details, not evidence that a
current competitor consistently fails them.

## Flight-school community and authored experiences

Build the community around discoverable practice experiences, their learning
objectives, aircraft/fidelity requirements, references and review/debrief. Let
learners and contributors discuss results, identify weak explanations and propose
new experiences. Make author, source/version and reviewed/experimental status
visible so a community contribution is not automatically treated as an accepted
aircraft or procedure model. Public submission, identity, privacy and moderation
need their own scoped design before activation. Multiplayer or a live human ATC
network is not required to give the community a flight-school focus.

The free/open-source direction applies to the declared core learning experience
and project code. Choose the exact source license and cost/hosting model before
release, and review code, aircraft-model and data/asset licenses separately. A
published experience should remain usable without a paid live LLM or required
paid imagery feed; optional services must not quietly become prerequisites for
the free baseline. Source availability and reproducible builds should make
community contributions inspectable and maintainable.

LLM-assisted authoring starts from a territory and learning intent, finds accepted
regional navigation/chart material, and proposes a declarative experience package.
The package records aircraft/configuration, objectives, initial conditions,
territory/datum, navigation and chart references, allowed interaction roles,
source revisions/rights and review status. Validate real identifiers and geometry
against accepted records rather than asking an LLM to invent plausible fixes,
frequencies, procedures or airport details. Generated narrative and teaching maps
can explain the source-backed experience while remaining visibly generated.

Freeze accepted package and dataset versions. During a flight, AI interaction
operates within its role and scenario state; accepted actions and events are
validated and recorded. Replay uses those events instead of rerunning a model
against changed data. Publication review, provenance and deterministic simulation
remain necessary whether the author is a person or an LLM. The exact feature
sequence remains a roadmap proposal; no authoring or community service exists yet.

## Model and progression

Fidelity is a set of declared capabilities, not a single realism slider. Physics,
systems, avionics, environment and instructional assistance can mature at
different rates. The briefing identifies which capabilities a lesson requires
and which its selected aircraft model provides.

| Stage | Learner experience | Model scope | Gate before advancing |
| --- | --- | --- | --- |
| Introductory flight | Open a web link, learn keyboard/touchpad controls, switch cockpit/external views, pause/reset and review a short flight. | Recognizable scoped terrain/airfields, bounded instructional dynamics and supported controls. Mobile orientation has a separately verified device scope. Mark generic/unverified C172 behavior. | Measured launch/control readiness, coherent views/geography, repeatable state, correct control directions, numerical checks and visible limitations. |
| Aircraft-specific PPL practice | Fly a useful exercise in one classic-instrument C172 with applicable checklist, pressure/elevation context and decreasing assistance. | Sourced controls/instrument indications, QNH/QFE/standard-pressure behavior, normal systems and physics over a declared envelope. | Reference-based cases pass; applicable checklists and selected EASA objectives/procedures receive qualified review. |
| Connected navigation and procedures | Brief weather/NOTAMs, practice text radio, navigate real identifiers and charts, then add scoped circuit and ILS exercises. | Selected region/data editions, cockpit VOR/DME and included approach indications, explicit report/simulation conditions and procedural communication state. | End-to-end briefing/navigation/communication fixtures pass; generated aids and later instrument-familiarization limits stay explicit. |
| Deeper aircraft and glass avionics | Practice configuration management, selected glass-cockpit functions and supported abnormal situations. | Selected actual avionics fit, system dependencies, wind and supported failure behavior; traffic/ACAS/TCAS only for applicable later equipment. | Manual-based state/indication tests, encounter/scenario evidence and documented limitations. |
| CPL extension | Practice selected commercial-pilot objectives with explicit prerequisites and tolerances. | Additional systems/environment fidelity required by the agreed CPL scope. | Separate specification and measured validation; learning claims require their own study. |

Changing an assist must not silently rewrite the airplane's limits or checklist.
Changing a model records a new version and reruns affected reference fixtures.
An aircraft-specific procedure is tied to the exact variant and documentation;
the C172 family name alone is insufficient applicability information.

## Interaction ideas

Keep the first web session short: choose the introductory scenario, read its
objective and limitations, calibrate or confirm controls, enter the flight scene,
and receive a debrief linked to observable actions. Make Mac desktop keyboard and
touchpad sufficient, with optional calibrated yoke/joystick and rudder-pedal
mappings. Follow GeoFS's documented control/settings concepts and defaults while
making input modes, sensitivity, inversion and axis assignment discoverable.
This reuses interaction ideas rather than its code or private user settings.
The external hardware clarification adds no landing-gear switch and does not add
retractable gear to a fixed-gear C172 profile. On later supported mobile devices, orientation
input needs permission, neutral calibration, recentering and an on-screen fallback.
A clear cockpit view and outside view should serve the exercise; visual richness
is a separate decision from validated flight behavior.

Expose assistance progressively: explain controls early, then reduce cues and
add task demands as prerequisites are met. Allow pause and deterministic reset
for study. Replay should show what the model and pilot actually did, with units,
assists and configuration visible. Treat hardware mappings, keyboard access and
readability as product requirements to refine with the supported-device scope.

Make the modeled cockpit a usable place to act: change pressure settings, tune
and identify a navigation source, select the relevant course/source, read valid
indications and perform an applicable checklist. Maps should show relevant field
elevation and distinguish airport/runway/nav identifiers, actual procedures and
generated teaching aids. A planned glide path, an ILS indication and a visual aid
must not be presented as interchangeable. Display the source/time status of a
weather report or NOTAM beside its content, including when the lesson uses a
historical or generated scenario. The initial briefing is a versioned scenario
snapshot, not a required real-time feed. Evaluate report/NOTAM applicability
against that scenario's time, preserve its versions for review, and distinguish
the snapshot from present-day operational information. A live adapter is optional
later work with a separate provider, freshness, rights and failure decision.

Text communication can teach who to contact, what to request and how to read
back an accepted clearance. Its scenario state and feedback must be repeatable;
free-form language does not become the authority for a clearance or aircraft
action. Later AI expression, speech or live multiplayer can be evaluated without
making them prerequisites for the first procedural-radio exercise.

## Architecture implications

Keep authoritative simulation state separate from rendering, hardware input,
aircraft data and scenario assessment. A fixed-step simulation and versioned
input log make exercises reproducible. Aircraft manifests carry applicability,
data provenance and uncertainty. Avionics should consume sensor/system state
through explicit interfaces instead of inventing independent flight values.
Maps, cockpit indications, views and review use those same state/reference
definitions. Briefing data is time/source-marked and distinguishes live reports
from the scenario environment. Navigation/approach datasets and communication
events are versioned with the recorded exercise, so a later replay does not
quietly acquire new weather, a changed fix or a different clearance.

Use the EDDF 100 NM region as the first data-backed reference area. Source its
official airport reference point and declare geodesic/datum conventions before
building an extent. Track the full target extent while marking validated,
approximate and unavailable geography/navigation/chart coverage explicitly.
Selecting EDDF as the regional center does not choose the first learner departure
airport or imply complete regional coverage. The [regional/open-foundation research](../research/2026-10-31-eddf-open-foundation.md)
informs source and reuse choices; access to material does not establish reuse rights.

Survey existing open physics engines and aircraft models first. Prefer a suitable
reuse/adaptation path and justify a custom replacement only by a documented gap.
Keep model-data licensing and aircraft-specific validation separate from the
engine's availability or reputation. A reused model still needs explicit units,
configuration, provenance, reference cases and a browser integration study.
The rendering engine, physics implementation and deployment stack remain open;
[ARCH](../ARCH.md) maintains those decisions.

## Role of AI

The orchestrator and subagents are the development workflow: research,
requirements, two implementation streams, quality review, specification
validation and parallel housekeeping. Their detailed contracts belong in
[the agent workflow](../../AGENTS.md) and the role definitions linked there.

LLM-assisted experience creation and AI-based interaction are desired roadmap
capabilities. Their exact providers, interaction roles, costs, privacy treatment
and release sequence require design and evaluation. AI can help discover and
assemble accepted material, propose experiences, explain recorded behavior or
express a scoped radio exchange. Authoritative source records and validated
scenario actions govern what those experiences mean.

AI does not establish flight physics, aircraft numbers, real fixes/procedures or
regulations. Research must trace those to applicable references. The deterministic
simulation remains independent of an LLM service. Text-radio practice can start
with structured non-LLM exchanges; later natural-language interaction can extend
that accepted state machine. No runtime AI integration is implemented in this setup.

## What to beat and how to measure it

Use existing simulators and their training features as comparison baselines,
following the foundation research. Compare startup effort, clarity of control
instruction, correct procedure transfer, telemetry/debrief usefulness and
agreement with reference flight/system behavior. Decide the comparison tasks
and thresholds before running them in [EVAL](../EVAL.md). Model accuracy does
not establish learning transfer, and learning transfer does not establish
regulatory qualification.

## Decisions still needed

Select the C172 variant/year/avionics and the manuals and datasets usable for it.
Define the first EASA PPL exercise and exact Mac browser/device/performance matrix;
keyboard/touchpad and optional yoke/joystick plus rudder pedals are already chosen.
Choose a physics/rendering approach through a bounded prototype, set initial
performance and fidelity budgets, and identify qualified review support. The
orchestrator keeps answers and assumptions in GAPS rather than silently filling
them with implementation defaults.

For the extended roadmap, choose the exact open-source license and sustainable
free hosting/data/AI model, confirm EDDF reference-point and regional source
editions/rights, select an initial exercise airport within the region, compare
reusable engines/models and define the first reviewed authoring package and
community workflow. The EDDF region, open-source direction and reuse-first policy
are user decisions; those implementation choices remain open.
