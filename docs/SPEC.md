# Gefly specification

Status: refined specification, 2026-10-31. Product owns this document; the
orchestrator records user decisions and accepts changes to scope. The current
delivery is the project foundation. Simulator requirements below govern future
milestones and have not yet been implemented or validated.

## Confirmed direction

The user wants a flight simulator that starts simple and becomes more realistic,
using actual aircraft controls and avionics and realistic physics for PPL and CPL
learning. The first aircraft is the Cessna 172, the first training framework is
EASA PPL, and the first runnable product is a web application with GeoFS as an
interaction reference. CPL comes later. The user chose **classic instruments
first, glass cockpit later**, and **QNH, QFE and standard pressure** altimeter
settings. The first input baseline is **Mac desktop with keyboard and touchpad**,
optionally **a yoke/joystick and rudder pedals** or **orientation from a paired
iPhone**. The reference platform is a **MacBook Pro (M1), current macOS, Chrome
latest first** (GAPS Q16). Stand-alone mobile orientation remains a
later capability. Reuse GeoFS's documented control/settings interaction and
defaults conceptually. The C172 candidates are a **classic-panel 172S first (serials
172S9491–172S9809), then the Reims FR172**, modeled as distinct engine/propeller configurations so learners can
compare performance, based on public FAA (and applicable EASA) documentation as
far as the available data allow. The **first exercise is a complete circuit:
take-off, traffic pattern and landing**, at **Frankfurt-Egelsbach (EDFE)** inside
the EDDF region. Exact sub-models/years, avionics fit, runway/pattern data,
development stack and Mac browser/device/performance matrix remain open in
[GAPS](GAPS.md). The user accepted **versioned scenario briefings first**, with
explicitly labeled historical/generated data and an optional live adapter later.
GeoFS is a product reference; this does not establish rights to reuse its code,
assets, maps, data or flight model.

The roadmap also includes pilot-qualification-specific tracks for **sailplanes
and ultralight aircraft**. They share the platform while using their own applicable
curricula, aircraft controls/physics and scenarios. C172/EASA PPL remains first;
additional tracks can be scoped independently of the later CPL track. Their
jurisdictions, exact qualifications and aircraft categories remain open. Pilot
qualification choices are separate from the project's software license.

The roadmap direction is a **free and open-source, flight-school-oriented
community site**. It includes **LLM-assisted flight-experience creation and
context-bound AI interaction**, using real territorial, navigation and chart
references. The first regional reference is **EDDF and a 100 NM radius around
its official airport reference point**. Reuse open physics engines and aircraft
models as far as practical before writing replacements. These are user directions;
original project material is licensed **GPL-3.0-or-later**; third-party material
must carry non-proprietary licenses, preferring permissive ones so the project
license can be relaxed later. Community publication rules and roles are scoped
in roadmap phase 3. The dynamics engine is **JSBSim** (GAPS Q17, LGPL-2.1 accepted as a copyleft
exception); the project-owned 172S model data, engine/model versions for the product,
rendering, browser integration, hosting/cost model, regional datasets, LLM provider
and detailed milestone sequence remain decisions. No region, community service,
authoring system or integrated engine is implemented yet.

Requirements marked **mandate** express this user direction. **Proposed** marks
implementation and acceptance details that can be refined before the affected
milestone. Acceptance applies to the stated delivery stage, not to the whole
future simulator at bootstrap time.

The expanded GeoFS feedback establishes desired capabilities and a preference
for fewer aircraft with deeper controls. Its reports of missing or incomplete
GeoFS behavior remain **user observations**, not independently established
absence claims. The [capability research](research/2026-10-31-geofs-gap-analysis.md)
distinguishes documented features, reports about cockpit integration, community
experience and unresolved questions. The A320 illustrates later glass-cockpit
depth; it does not add an A320 to the initial fleet.

## Foundation acceptance

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Include and extend the supplied Propeller bootstrap guide in `docs/BOOT.md`. [R-BOOT-1] | Mandate | Local guide records its source and includes the Gefly agent split; source repository is untouched. |
| Create the documented project structure before simulator implementation. [R-BOOT-2] | Mandate | README, contributor instructions, initial input, idea, gaps, concept, specification, architecture, evaluations, security, process, style, dependencies, plan and progress records exist and link to their authoritative records. |
| Provide an orchestrator and eight worker roles, including cross-provider peer review. [R-AGENT-1] | Mandate | Discoverable role definitions exist for `orchestrator`, `researcher`, `product`, `code1`, `code2`, `quality`, `validate`, `housekeeping` and `peer`; each states responsibilities, inputs, outputs and boundaries. Native adapters document their supported client/schema; definitions do not prove every client discovers or executes them. |
| The orchestrator owns user interaction and unresolved questions. [R-AGENT-2] | Mandate | Workflow routes worker questions through the orchestrator, records dated answers in GAPS, and distinguishes blockers from independent work that can proceed. |
| Research informs requirements before implementation. [R-AGENT-3] | Mandate | Researcher gathers web references and data using available deep research skills, or explicitly records a rigorous fallback when unavailable; product turns evidence and user decisions into versioned acceptance criteria. |
| Run two implementation streams with equivalent coding responsibilities. [R-AGENT-4] | Mandate | A task handoff can assign disjoint files or worktrees to `code1` and `code2` concurrently, with shared interfaces agreed before edits. `code1` is the canonical name for the user's `coder1` reference. |
| Keep quality review and specification validation independent of implementation. [R-AGENT-5] | Mandate | Quality reports defects and criteria checks; validate maps each in-scope requirement to observed evidence and returns pass, fail or blocked. Authors cannot approve their own implementation through another role name. |
| Run housekeeping alongside implementation within an explicit scope. [R-AGENT-6] | Mandate | Housekeeping can maintain assigned documentation, links, metadata and repository hygiene while both coding streams run, without editing their owned files, changing requirements or deleting user data. |
| Add cross-provider peer review covering both quality and specification validation. [R-AGENT-7] | Mandate; batched every few PRs per GAPS Q15 | In batched reviews covering the revision range since the last peer-reviewed revision (in-between work is *peer pending*), in addition to quality and validate, Claude reviews Codex-authored work and Codex reviews Claude-authored work in fresh review contexts. Record author/reviewer provider identities, exact integrated revision and frozen packet hash, actual CLI/version and observed model/provider evidence, plus separate quality findings and criterion-by-criterion pass/fail/blocked/not-evaluated results. Mixed-provider work requires reciprocal coverage at that revision, with neither provider accepting its own contribution. A same-provider subagent or different model name in the same runtime does not establish this gate. Missing CLI/authentication/provider identity or incomplete evidence is blocked/not evaluated; no silent same-provider fallback or assumed pass. Return findings to coders and repeat affected reviews after changes. Historical reviews do not satisfy this new gate without the required evidence. |
| Provide repeatable foundation checks and documentation build commands. [R-BOOT-3] | Proposed | The repository documents how to run checks and render Markdown to PDF; observed checks and unavailable tools are recorded honestly in DONE. |

## Assurance acceptance

The user adopted bounded level 2 assurance on 2026-11-01. The [assurance
contract](assure/SPEC.md) defines AS1–AS8; generated lineage remains evidence
navigation and integrity checking, separate from aircraft and learning validation.

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Derive revision-aware lineage and check plan integrity. [R-ASR-1] | Mandate | Requirements, tasks, questions, progress records, code/test identities and commit references form a rebuildable typed graph. Duplicate/undefined IDs, explicit completed-but-blocked tasks and malformed progress records produce actionable diagnostics. Uncovered planned work remains visible. |
| Trace aircraft values and model dependencies to their declared provenance. [R-ASR-2] | Mandate | JSON-pointer value nodes reference the recorded source, revision/page, units or derivation/estimate and applicability. Unknown values remain unknown. Existing numerical/schema validators remain in use; lineage does not grant data rights or prove source truth. |
| Bind acceptance to current, explicit run and review evidence. [R-ASR-3] | Mandate | Evidence identifies result and input hashes, conditions, outcome and dependencies. Accepted claims reject missing, failed, skipped, blocked, unevaluated or stale evidence. Calibration/holdout identities remain disjoint and frozen evaluation inputs are checked. Negative fixtures establish rejection. |
| Provide local and CI assurance reports and impact queries. [R-ASR-4] | Mandate | The same offline commands check integrity, report coverage and trace/diff/impact relationships without installing packages, fetching sources, calling providers or opening a browser. Pinned reusable code and extraction limits are recorded. |
| Reconcile status at integration and preserve independent judgement. [R-ASR-5] | Mandate | Known drift is repaired from recorded decisions and Git history. Progress-record integrity and configured decision guards reject regressions; the orchestrator reconciles shared records, validate reviews declared links, and quality/peer review remains independent. Graph completeness never becomes a fidelity or training-credit claim. |

## Progressive fidelity

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Increase learning depth and realism through explicit fidelity stages. [R-FID-1] | Mandate | Concept and roadmap define an introductory stage and later aircraft-specific stages, each with its scope, limitations and an evidence gate. |
| Make assistance and model limitations visible. [R-FID-2] | Proposed | A scenario records active assists and model version; its briefing identifies approximations. Replaying it retains those settings. An assist never silently changes an aircraft limit or checklist. |
| Distinguish instructional models from verified C172 behavior. [R-FID-3] | Proposed | Every aircraft-specific claim names the exact variant/configuration and reference. Generic or unverified controls, performance and procedures are labelled; they cannot count as validated C172 evidence. |
| Raise fidelity by replacing bounded models behind stable interfaces. [R-FID-4] | Proposed | A later flight model or avionics implementation can run the same input/scenario contract; compatibility tests identify changed behavior and unsupported scenarios. |

## Simulator foundation and physics

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Deliver the first runnable simulator as a web application. [R-SIM-1] | Mandate | A documented browser launch path reaches a controllable flight scene; platform and performance checks run on the explicitly supported browser/device matrix. Engine and framework are separate decisions. |
| Separate simulation time from rendering and input collection. [R-SIM-2] | Proposed | Running an identical timed input fixture at different render rates produces matching state within a tolerance fixed before the test. Pause does not advance simulated time. |
| Make units, axes, reference frames and sign conventions explicit. [R-SIM-3] | Proposed | Shared contracts declare these conventions; boundary tests cover unit conversion, control direction and frame transformations. Display units are converted at presentation boundaries. |
| Support deterministic scenario reset and replay. [R-SIM-4] | Proposed | Same model/configuration, seed, time step and ordered input log yield identical state hashes on the same supported runtime. Cross-runtime comparison uses an explicitly documented tolerance and is not called bitwise deterministic. |
| Validate physics against declared reference cases. [R-SIM-5] | Proposed | Before an aircraft model is accepted, fixtures cover mass/balance, force and moment signs, trim, selected steady flight conditions and transients. Each has reference data, configuration, envelope and justified tolerances chosen before execution; all in-scope cases pass. |
| Keep the simulation numerically bounded in its supported envelope. [R-SIM-6] | Proposed | A repeatable ten-minute scenario suite produces no non-finite state or unreported integrator failure. Out-of-envelope behavior is flagged instead of presented as validated. |

## Aircraft, controls and avionics

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Base aircraft-specific systems on a selected actual C172 configuration. [R-AIR-1] | Mandate | Each modeled configuration (initial candidates: Reims FR172, 172S; GAPS Q3) has its own manifest identifying model/variant, applicable serial/year range, engine/propeller, mass assumptions, avionics fit and source revisions before aircraft-specific acceptance. |
| Trace implemented controls and avionics states to reference behavior. [R-AIR-2] | Mandate | Each in-scope control has documented range, detents, state transitions, dependencies and expected indications. Tests exercise normal use and relevant failure states against the cited manual; unsupported controls are identified. |
| Preserve source provenance and reuse rights for external data and assets. [R-DATA-1] | Proposed; license policy per R-OPEN-1 | Every shipped external aircraft datum, manual excerpt, visual/audio asset and navigation/world dataset has source, revision, applicability, license/permission and integrity metadata. Public access alone is insufficient permission. |
| Keep unverified generated values separate from reference data. [R-DATA-2] | Proposed | Data records distinguish sourced, derived, estimated and unknown values, with units and uncertainty. Validation rejects an aircraft claim supported only by an AI-generated number. |

## Training and acceptance

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Start with EASA PPL learning objectives and extend to CPL later. [R-TRAIN-1] | Mandate | The first accepted lesson set maps selected objectives to the applicable EASA source revision; CPL objectives have their own later scope and evidence gate. |
| Give each scenario an objective, briefing and observable debrief. [R-TRAIN-2] | Proposed | Scenario records include prerequisites, initial aircraft/environment state, expected actions, scoring criteria, assists, completion conditions and telemetry for the debrief. Failed criteria can be traced to recorded events. |
| Distinguish software fidelity, learning benefit and approved training credit. [R-TRAIN-3] | Proposed | Evaluation reports separately state model agreement, observed learner outcomes and any independently established approval status. Product copy does not imply regulatory approval or loggable credit from simulator functionality alone. |
| Agree quantitative acceptance before an evaluation. [R-EVAL-1] | Proposed | EVAL records baselines, fixtures, procedure, sample, measures, tolerances and stop criteria before execution. RESULTS records observations and limitations, including inconclusive outcomes. |
| Support jurisdiction-, qualification- and aircraft-category-specific training tracks, including sailplanes and ultralights. [R-TRAIN-6] | Mandate; future track scope and sequence proposed | Each accepted track identifies jurisdiction, competent authority, full qualification name and aircraft category rather than an abbreviation alone. Map its objectives, prerequisites, privileges/limits and equipment applicability to dated/versioned authoritative sources and declared acceptance criteria. Provide category- and configuration-specific controls, physics and scenarios with independent reference fixtures and qualified instructor review. Reuse shared platform functions only where applicable; do not infer that the airplane syllabus, aircraft model, simulator approval or training credit transfers to another track. Country/category and qualification mappings must be resolved before that track is accepted; C172/EASA PPL remains the first track. |

## GeoFS-inspired capabilities and training depth

These desired capabilities are mandates from the expanded user direction.
The Mac-first input baseline and scenario-first briefing sequence are confirmed;
**other delivery order, supported envelope and detailed acceptance procedures
are proposed** until the affected milestone is scoped. They are future simulator
requirements, not implemented features or additions to bootstrap acceptance.
“Launch” below means the proposed first usable web slice; “PPL depth” follows
that foundation; “later” requires a separately accepted scope. Global coverage,
live data, video export, glass avionics and collision-avoidance equipment do not
all become first-release work merely by appearing in this table.

| Requirement | Proposed stage | Acceptance evidence |
| --- | --- | --- |
| Preserve a short route from a web link to a controllable flight. [R-UX-1] | Launch | On the declared browser/device matrix, a fresh session reaches the selected introductory exercise without installing software or connecting flight hardware. Measure loading time and input readiness against a budget fixed before evaluation; disclose loading/failure states. Account or hosting choices remain separate decisions. |
| Support Mac desktop keyboard/touchpad flight controls and optional yoke/joystick and rudder pedals. [R-INPUT-1] | Required first baseline; optional hardware profiles | On the declared Mac browser/device matrix, the user can complete the introductory exercise with keyboard and touchpad alone. Reuse the documented GeoFS control/settings interaction and defaults conceptually, with mappings, sensitivity/exponential response, inversion, input modes and roll/yaw mixing made discoverable and adjustable as applicable. Optional yoke/joystick and rudder-pedal profiles provide axis/button assignment and calibration without becoming launch prerequisites. Tests cover focus/shortcut conflicts, mode changes, remapping/reset, cockpit interaction and optional-device disconnect/reconnect. Declare actual supported hardware/browser combinations; no external gear switch or retractable-gear behavior is inferred from the user's clarification. |
| Support mobile orientation controls with an explicit fallback. [R-INPUT-2] | Later mobile capability gate | On a declared supported mobile browser/device, the user can grant permission where required, calibrate neutral orientation and sensitivity, pause/recenter and complete the agreed control task. Permission denial, unavailable sensors, screen rotation and loss of sensor input expose a usable on-screen alternative; no silent loss of control. |
| Use a paired iPhone's orientation as an optional flight control for the Mac session. [R-INPUT-3] | Mandate (GAPS Q16); optional profile, not a launch prerequisite | The learner pairs an iPhone with the running Mac session through an explicit, user-confirmed, session-scoped pairing; orientation drives the mapped axes with calibration, neutral/recenter, sensitivity and pause. End-to-end input latency and update rate are measured on the reference Mac/iPhone against a budget fixed before evaluation. Permission denial, disconnect, stale or out-of-order samples and backgrounding fall back to keyboard/touchpad without silent loss of control. Orientation samples are not stored or sent beyond the pairing unless the user enables it (SEC). Inputs enter the simulation through the same timestamped input boundary as other devices so replay remains deterministic. |
| Provide recognizable geography, terrain and usable airport/runway context. [R-WORLD-1] | Launch region, then expand | A scoped reference area includes identifiable terrain and its selected airports/runways with declared horizontal/vertical datums and source versions. Fixture comparisons check runway position/orientation, terrain/field elevation and visual/physical ground alignment against predeclared tolerances. The map displays airport elevation with units and source. Visual imagery alone is not the authoritative source for airport/runway geometry. Coverage, simplifications, data rights and missing areas are visible. |
| Provide multiple flight views, including a usable cockpit view. [R-VIEW-1] | Launch | The user can switch among declared cockpit and external views without resetting or changing aircraft state, controls or simulation time. Relevant instruments remain readable and controls operable on the supported display sizes; camera changes do not create a second source of flight values. |
| Make flight review a first-class training action. [R-REVIEW-1] | Launch review, then richer debrief | A recorded exercise can be paused, replayed and inspected at selected times from the supported views, with controls, instrument state, assists and scenario events synchronized. Reopening preserves its configuration, scenario time/weather, navigation edition, relevant communication events and provenance rather than fetching changed live conditions. Review/replay acceptance is separate from optional encoded video capture/export; video export needs its own format, privacy and performance decision. |
| Include weather reports and NOTAM information in the scenario briefing. [R-BRIEF-1] | Accepted sequence: versioned scenarios first; optional live adapter later | The initial briefing uses a frozen scenario snapshot for the selected area/time, with scoped weather reports such as METAR/TAF and relevant NOTAMs explicitly labeled historical or generated. Preserve source/provider, location, issue/validity times, units and scenario time. Tests cover missing and out-of-validity data, replacement/cancellation where supported, and the distinction between validity at scenario time and present-day freshness. Reports and conditions applied to the simulation agree or explicitly explain their difference. A later optional live adapter requires its own provider/rights/freshness/failure gate; no live feed is required for initial briefing acceptance, and fixtures never appear to be current operational information. |
| Support realistic procedural communication through text. [R-COMM-1] | PPL depth | Scoped radio scenarios model who is being contacted, relevant frequency/channel, call sign, pilot intent, controller response, clearance/readback and expected resulting action. Repeatable fixtures cover a normal exchange, incorrect/incomplete readback and conflicting or unavailable instructions. Free text or later AI may express the exchange, but accepted clearances/events come from the explicit scenario state; multiplayer chat alone does not satisfy this criterion. |
| Make supported navigation functions operable through the selected cockpit equipment. [R-NAV-1] | Classic PPL cockpit, glass later | In the identified C172 installation, included navigation controls and indications implement the applicable tuning, identification, course/source selection and VOR/DME/localizer/glideslope behaviors. Tests exercise supported station/service validity, relevant flags, distance/reference distinctions and indications against applicable sources. A map overlay or autopilot that follows a route does not alone establish a working cockpit navigation instrument. A later glass fit declares its supported pages/modes and limitations separately. |
| Navigate using traceable real identifiers and fixes. [R-NAV-2] | PPL depth | The supported region resolves declared real airport, runway, navaid and waypoint/fix identifiers to versioned published records, including frequencies and coordinates where applicable. Route entry handles ambiguity and unknown/stale records explicitly. Source edition/cycle, coordinate reference, applicability and reuse rights accompany the records and test fixtures. Generated chart rendering is allowed; fictional identifiers in clearly marked synthetic exercises do not satisfy acceptance of real-data navigation. |
| Provide source-marked maps/charts and explicit vertical-guidance meaning. [R-NAV-3] | VFR maps first, instrument approaches later | The learner can relate the selected airport/runway, route/fixes and aircraft position to a real licensed chart or a clearly labeled generated training map. Included approach depictions distinguish a planned/teaching glide path from a modeled published procedure or actual ILS indication, and preserve elevation/altitude references, units and source revision. Test a declared approach fixture end to end without substituting a decorative line for avionics guidance. |
| Implement QNH, QFE and standard-pressure settings with consistent references. [R-AIR-3] | Classic PPL cockpit | The pressure-setting control, displayed setting/units and resulting altitude indication agree with the selected aircraft/instrument model and atmospheric fixture. Tests cover setting changes, unit conversion, the declared QFE datum and standard-pressure setting against sourced expected values, with field elevation and altitude/height references unambiguous. Any unsupported pressure reference is explained as a training substitution rather than invented hardware; a mechanical setting need not imply a dedicated mode switch. |
| Provide aircraft- and scenario-applicable checklists. [R-TRAIN-4] | Classic PPL cockpit | Included checklists identify aircraft fit, source/revision and applicable phase/configuration. The learner can perform or confirm each in-scope item through its modeled control/state, see unsupported items and distinguish a checked box from automatically sensed state. Normal and intentionally incorrect sequences produce traceable feedback. A blocked lesson step identifies its unmet condition and allows recovery/reset while leaving the checklist accessible; it does not silently change aircraft settings. |
| Provide repeatable circuit/pattern and instrument-approach drills. [R-TRAIN-5] | First exercise: one circuit (take-off, pattern, landing) at EDFE; ILS in later instrument familiarization | A scoped circuit exercise declares runway, pattern direction/geometry, environment, configuration, actions and predeclared assessment criteria. A separately scoped ILS exercise ties frequency/course, approach fixes, localizer/glideslope behavior and missed-approach handling to an applicable procedure and equipment configuration. Both support reset/review and explain limitations. Later instrument familiarization does not imply an instrument rating or that every ILS task belongs to the initial EASA PPL lesson set. |
| Add traffic awareness and collision-avoidance systems only for applicable equipment. [R-TRAFFIC-1] | Later systems scope | Select and identify the applicable traffic/ACAS/TCAS installation before specifying its displays, alerts, inhibit logic, failure states or guidance. Repeatable encounters are evaluated against its authoritative behavior and limitations; a traffic icon is not claimed to implement collision avoidance. Treat ACAS/TCAS relationships through researched terminology rather than counting the names as independent features. Do not add fictitious airline equipment to the initial C172. |
| Prefer a small fleet with complete declared controls over many shallow aircraft. [R-SCOPE-1] | All stages | The first aircraft remains the selected C172 configuration with classic instruments. A control/function inventory marks supported, simplified and unavailable behavior, with evidence for every accepted control/indication. A new type or glass fit requires a separate source pack, specification and validation gate; an A320 reference alone does not authorize adding that aircraft. |

## Community, authored experiences and reuse

The directions below are mandates. Their acceptance details and placement in
the roadmap are **proposed** until scoped. The [EDDF/open-foundation research](research/2026-10-31-eddf-open-foundation.md)
records candidate sources and reuse options; a source listing does not establish
data rights, complete regional coverage or a validated aircraft model.

| Requirement | Status | Acceptance evidence |
| --- | --- | --- |
| Create a flight-school-oriented community site around the simulator. [R-COMMUNITY-1] | Mandate; publication rules/roles scoped in roadmap phase 3 (GAPS Q12) | The site connects discoverable learning experiences, objectives, aircraft/fidelity requirements, reference material, review/debrief and community feedback. Contributors can propose and share versioned experiences with visible author/source information and reviewed/experimental status. Public submission, identity, privacy and moderation rules are agreed before those workflows are enabled. A multiplayer lobby or general social feed alone does not satisfy the flight-school focus. |
| Make the project free and open source. [R-OPEN-1] | Mandate; GPL-3.0-or-later selected; operating model pending | Release the project source and reproducible build/run instructions under GPL-3.0-or-later (GAPS Q5), permitting use, modification and redistribution, and provide the declared core learning/community baseline without a usage fee. Inventory the separate licenses/rights of dependencies, aircraft models, data and assets; a code license does not grant their reuse rights. Admit only non-proprietary third-party licenses and prefer permissive ones (user decision); recording a justification for each copyleft component, since it constrains later relicensing, is a proposal (GAPS Q5). The free baseline can run published experiences without requiring a paid live LLM or a paid imagery subscription. Select and document sustainable hosting/AI/data costs, capacity limits and any optional services before promising an unlimited public service. |
| Let an LLM assist in creating realistic, source-backed flight experiences with bounded AI interaction. [R-AUTHOR-1] | Mandate; staged authoring and interaction scope proposed | Given a territory and learning intent, authoring produces a reviewable declarative package identifying extent/datum, aircraft/objective, initial conditions, navigation records, chart/procedure references, interaction roles/allowed actions and source versions/rights. Schema and cross-reference checks reject unresolved real identifiers, unsupported procedure references, inconsistent coordinates/units and executable payloads; source comparison and human review reject unsubstantiated real-world claims. Generated narrative or teaching charts are labeled and derived from accepted source records; an LLM is not a source of real navaids or chart geometry. Review precedes publication. Published versions freeze relevant datasets, prompts/model metadata and accepted interaction events for reproducibility; replay uses recorded events rather than fresh generations. AI acts within the package's scenario context and validated actions, not as authority over physics, aircraft limits or clearances. |
| Model EDDF and a 100 NM surrounding reference region from applicable real material. [R-REGION-1] | Mandate; coverage sequence proposed | Define the region using EDDF's sourced official airport reference point, a 100 nautical mile radius and declared geodesic/datum conventions. Preserve the reference publication and verify boundary fixtures. Inventory terrain, airports/runways/elevations, navaids/fixes and chart/procedure material with applicable versions/rights, plus a coverage map distinguishing validated, approximate and unavailable areas/features. Test selected real-data navigation and chart/ground alignment fixtures under the agreed tolerances. The complete extent is a regional target, not a claim that every feature is already modeled; learner departure airports and first drills within it remain separate choices. |
| Prefer reuse of open physics engines and aircraft models before custom replacements. [R-REUSE-1] | Mandate; dynamics engine selected (JSBSim, GAPS Q17); aircraft model and real-scene integration pending | Before engine/model selection, compare existing open candidates for license compatibility, aircraft applicability, browser integration, maintainability, numerical behavior and independent reference-case agreement. Record the selected versions and adaptation boundaries. Reuse a suitable candidate where it meets the agreed criteria; justify each custom dynamics/model replacement by an evidenced gap and bounded scope. Open availability, included C172 data and engine reputation do not substitute for model-data rights or the independent validation required by R-SIM-5. |

## Proposed delivery emphasis

First preserve browser accessibility, the confirmed Mac desktop keyboard/touchpad
baseline with optional yoke/joystick and rudder pedals, coherent local
geography, multiple views, basic review and a bounded physics envelope. Build
one usable classic C172 cockpit and one useful PPL exercise; make pressure
settings, relevant elevations, control semantics and checklists correct within
that scope. Mobile orientation support needs its own browser/device evidence
before it is advertised and follows the required Mac desktop baseline.

Then deepen versioned scenario-first briefing, procedural text communication, real identifiers/maps and
cockpit navigation, followed by instrument-approach familiarization and the
selected glass fit. The scenario-first/historical-or-generated briefing sequence
and later optional live adapter are accepted user decisions. Equipment-specific
collision avoidance and any additional aircraft are later decisions. Other
ordering is a product proposal for review, not a user-approved milestone schedule.
Physics fidelity, data provenance and
visible limitations apply at every stage, rather than being postponed until
visual or cockpit features are complete.

Use EDDF's 100 NM reference region to ground the data/engine studies and the
first scoped geography/navigation slice. Prioritize the existing open-engine
and model survey before building a custom flight model. A flight-school
community and source-backed experience catalogue can grow around accepted
exercises; LLM-assisted authoring then turns region/objective requests into
validated packages and later context-bound interactions. This is a proposed
dependency order, not permission to publish a community service or to defer
license/data-rights decisions until after release.

## Change and release rules

Product refines proposed details with researcher evidence and orchestrator/user
decisions. Keep requirement IDs stable; record material changes and affected
acceptance evidence. Implementation handoffs cite the requirement IDs and a
specific specification revision. Quality examines the implementation against
[SEC](SEC.md), [STYLE](STYLE.md) and [SDLC](SDLC.md); validate examines the completed
artifact against this specification and [EVAL](EVAL.md). Both must identify the
revision reviewed. Any later integration change invalidates affected evidence.

## Outside the current delivery

This document refinement does not include a runnable simulator, a product-integrated
physics engine or renderer (JSBSim and CesiumJS/three.js are selected, GAPS Q17,
but the current integrations are feasibility studies), licensed aircraft manuals, validated aircraft performance,
an implemented EDDF region, community hosting, LLM runtime, instructor endorsement
or regulatory qualification. Worldwide scenery, a live
human ATC network, multiplayer, encoded video export, VR, motion platforms and
commercial training approval remain separately scoped decisions. Procedural
text-radio practice is a desired capability; it does not require a live ATC network.
