# Roadmap

A runnable browser prototype now combines generic JSBSim flight, a classic
cockpit, KAP 140-style autopilot logic, historical radio navigation, bounded public
terrain/imagery, flight maps and review. The project-owned 172S model and first
complete learner exercise remain unfinished. [TODO](TODO.md) owns current task
status; the tracks below describe direction, not delivered capability or accepted
training fidelity. Later work becomes a bounded milestone before implementation.

## Product vision and experience levels

The [expanded vision](input/2026-11-03-road-vision.md) is the most realistic flying
experience practical with **minimum prerequisites: open a browser and fly**.
Retain a useful **just fly** experience while offering progressively deeper
controls, instrument interpretation, navigation and procedures, then exercises
for PPL and other small-plane qualifications. Keep selected aircraft and systems
deep rather than growing a decorative aircraft catalogue. Classic instruments
remain first; glass and advanced equipment follow their existing gates.

Professional material is part of that progression: connect exercises, instrument
behavior, checklists and procedures to applicable aircraft manuals, published
reference/chart material and reviewed learning sources. Make editions, rights,
coverage and modeled limits visible. A link to professional material or an
exercise name does not establish training credit or qualified instruction.
The distinct sailplane and ultralight tracks below retain their own qualification
boundaries; their order relative to CPL remains unselected.

The platform remains a **free, open-source flight-school community around the web
simulator**, under GPL-3.0-or-later (GAPS Q5). Reuse open physics engines and
models. LLM-assisted experience creation assembles source-backed assets and
reviewable scenario packages; AI does not become the authority for aircraft,
weather, navigation or procedure state. The earlier
[regional/reuse direction](input/2026-10-31-community-region-reuse.md) and
EDDF/100 NM reference region remain in scope, alongside the regional expansion
below. Hosting, detailed rollout order and provider arrangements remain open.

## Planned capability tracks

All additions in this table are **planned**, including extensions of features
already prototyped. Their acceptance criteria belong in SPEC and EVAL before an
implementation milestone is accepted.

| Track | Requested experience | Gate for a useful increment |
| --- | --- | --- |
| Weather and reporting | Real-source and AI-authored scenario weather/reporting; cloud cover, rain, fog and temperature simulation with coherent effects and indications. | Distinguish live, historical and generated conditions; align report time/location with the simulated atmosphere, visibility and aircraft effects. Generated reports cannot masquerade as observed weather. Preserve Q11's versioned scenario briefing before an optional live adapter. |
| Traffic and operational constraints | AI aircraft and real-time community pilots; NOTAM, restricted areas and no-fly zones; scenarios such as attempting to arrive at a busy international airport. | Identify simulated/community traffic and scenario authority; apply source/time/altitude boundaries to restrictions, and model applicable clearance, sequencing, separation and occupied-runway consequences. Do not imply access or clearance at a real airport. |
| Navigation and flight planning | Real-data maps with controlled zones and restricted areas; select navigation aids from the map, define GPS markers, look up fixes and build a flight plan including vertical/glide-slope planning. Project towns, landmarks, streets, rivers and air fixes onto terrain. Deepen VOR tuning/deviation, DME slant distance and ILS glide-slope geometry. | Preserve real identifier/source/edition and coordinate/altitude references; distinguish user GPS markers from published fixes, planned paths from published procedures, and map selection from deliberate receiver tuning. Test frequency/channel behavior, magnetic/true references, receiver indications and geometric distances/deviations against applicable sources. |
| Communications | COM1/COM2 airport communication simulation with AI interaction, and COM station discovery/filtering comparable to NAV1/NAV2 station lists. | Start from scoped text exchanges and known scenario roles/frequencies. Separate station directories from a modeled communication service; preserve source/channel limitations and review phraseology/procedure behavior. Voice remains a separately scoped extension. |
| Instruments, controls and procedures | Avionics as a HUD; a no-panel mode with transparent main instruments; connected iPhone/Android orientation input; realistic indications including magnetic north; checklist lookup and guided execution. | HUD and panels share the same authoritative state. Test magnetic/true distinctions and instrument behavior; source checklists for the selected aircraft/configuration and distinguish sensed completion from user confirmation. Scope phone pairing, orientation calibration, consent and disconnect behavior before adding it to the tested Mac baseline. |
| Community and contributions | See community aircraft flying in real time; contribute plane models, world/scenery/navigation data and other model data; discuss suggestions and contributions in a forum. | Keep multiplayer state separate from local aircraft authority; define compatibility, contributor rights/source provenance, moderation and review of models/data. Label fidelity and versions rather than treating a community upload as validated. Grow E11 publication/roles/privacy gates alongside useful simulator slices. |

## Partnerships and financing

Partnerships may grow from the ecosystem **while the platform stays open**.
These are candidate relationships, not recruited or agreed partners:

| Purpose | Candidate relationships | Boundary |
| --- | --- | --- |
| Content | Map/data providers and publishers, including professional reference and chart material. | Review source/service rights, editions, access, costs and redistribution separately from the GPL application. |
| Awareness and expertise | ATC organizations and aircraft manufacturers. | Seek applicable expertise and awareness without implying endorsement, operational ATC access or aircraft approval. |
| Usage and feedback | Flight schools and their learners/instructors. | Shape useful exercises and review outcomes; distinguish product use, qualified feedback and any separate approved-training pathway. |

The **free version stays free**. Explore optional premium services for commercial
maps/subscriptions (for example Navigraph), AI-based extensions priced to cover
token/service costs, and an expanded partner-supported funding model. Preserve
a useful open/free foundation; optional paid content and hosted services must not
silently become prerequisites for it. No pricing, subscription bundle, premium
implementation or provider contract is selected by this roadmap. Evaluate account,
privacy, cost controls and the compatibility of each service/data licence before
adoption; a named commercial candidate is not a redistribution grant.

## World realism and source strategy

Develop useful coverage first in **Hessen and surrounding federal states**, then
focus on open data for **DACH: Germany, Austria and Switzerland**. Keep the
EDDF/100 NM learning/reference model distinct from wider map coverage. Existing
community points, historical navigation, visual imagery and physical terrain
have different bounds and fidelity; broadening one does not complete the others.

Later expansion selects interesting areas where usable open sources exist.
Evaluate OurAirports and OpenFlightMaps, potentially Navigraph and Eurocontrol /
EAD, and later FAA sources and other regions. These names identify research
candidates, not accepted APIs, rights, currentness or complete coverage. Each
region needs a source/edition/rights inventory, coordinate and vertical-reference
handling, declared physical/visual/navigation bounds and a demonstrable exercise.

Discuss flying through Google Earth as an alternative experience or integration
study, separately from importing imagery or operating the open simulator. Build
on the [global scenery assessment](research/2026-11-03-global-scenery.md); review
interaction, flight-state/control integration, service terms, access/cost and
reproducibility before adopting any route. No Google Earth integration is selected.

Also investigate **procedural reconstruction, semantic reconstruction and
geotypical scenery generation**: derive terrain appearance and plausible
structures from sourced elevation, land cover, roads, water and settlement data.
Keep inferred/generated scenery distinct from surveyed geometry and operational
navigation/obstacle data. Compare visual quality, browser performance, source
licensing and repeatable generation against a small real region before expansion.

## Delivery phases and measured gates

| Phase | Goal | Measured gate |
| --- | --- | --- |
| 0. Project foundation | Traceable brief, questions, specification, roles and document/check tooling | E0 scaffold checks and a usable document-build path; unresolved decisions explicit |
| 1. Technical foundation | Integrate the selected TypeScript/CesiumJS (three.js fallback)/MapLibre stack with JSBSim in a fixed-1/120 s worker; complete project-owned classic 172S model/data preparation, contracts, device/input matrix and EDDF-region source strategy | Preserve E1 study limits; pass real terrain/device-resolution/load checks and independently frozen E2 cases; engine/model/adapter rights reviewed separately; exact EDDF ARP and source coverage resolved before accepted geometry |
| 2. First useful PPL exercise | One accessible Mac desktop keyboard/touchpad circuit exercise at Frankfurt-Egelsbach (EDFE): engine-running holding point, runway 26 north/right-hand circuit, take-off and landing; optional yoke/joystick/pedals, classic cockpit subset, declared geography, views, assists and flight review | Freeze source-based/experimental criteria and remaining aerodrome/model inputs; repeatable replay, reference Mac/browser and controller E5 checks, independent quality/validation. Q7 permits research-based prototype work with no instructor reviewer yet; stronger instructional/training claims need their own review. |
| 3. Classic C172 practice loop | Deepen source-backed controls/systems/physics; complete and validate QNH/QFE/standard, coherent elevation/maps, checklists, briefing, text radio, circuit variations and the second (FR172) engine configuration for performance comparison, in separate slices; scope community publication rules and roles | E2/E6/E7 cases pass for selected data/configuration; missing/stale input and unsupported regimes explicit; objective reviewed |
| 4. Navigation depth and later glass | Deepen the historical VOR/DME/ILS prototype into source-scoped navigation exercises; real identifiers/fixes, chart/path support, separately scoped ILS drills, then selected glass configuration | Applicable manuals and data mapped to tested indications/actions; E6/E7 pass; E3 evaluates learner benefit separately |
| 5. CPL and advanced equipment | Add explicitly scoped CPL objectives and applicable traffic-awareness/advisory equipment; assess any additional aircraft separately | Separate aircraft/equipment/learning specification and source-based cases before ACAS/TCAS or expanded training claims |
| Community / open release track | GPL-3.0-or-later source; publication rules, roles and moderation scoped in phase 3 (GAPS Q12). A free, open-source site for flight-school practice, real-time shared flying, model/data contributions, a forum, exercise library, questions, groups and reviewed debriefs; grow alongside useful simulator slices | E11: selected license, reproducible authorized-data build, contributor/content rules, scoped user roles and moderation; actual hosting/free access verified before deployment claims |
| AI experience-authoring track | Describe territory, objectives and interaction; assemble source-backed navigation assets/chart material and a validated experience package, beginning with EDDF/100 NM | E9/E10: real identifiers/geometry resolved, missing data exposed, package/source rights reviewed, scenario checks pass and accepted package replays independently of generation |
| Licence-specific training extensions | Add distinct sailplane and ultralight training profiles, with their own aircraft, controls/physics, exercises and pilot-qualification requirements | R-TRAIN-6 / E12: selected jurisdiction/authority/category, current source-mapped syllabus and privileges, applicable model/reference cases and qualified review; no automatic transfer of airplane requirements or training credit |

## Licence-specific training extensions

The [user's extension](input/2026-10-31-license-specific-roadmap.md) adds pilot
qualification tracks beyond the initial C172/EASA PPL and later CPL direction.
These are training qualifications, separate from software licensing. Keep the
first aircraft/foundation unchanged and scope each extension independently;
the user has not specified an order relative to CPL.

| Track | Proposed training/model scope | Qualification boundary and gate |
| --- | --- | --- |
| Sailplanes | One identified aircraft/configuration; glide/energy management, soaring, applicable launch methods and landing planning. Reuse shared geography, weather, controls and review where appropriate. | EASA Part-SFCL/Sailplane Pilot Licence is a reference profile. Distinguish applicable launch-method and TMG privileges before claiming coverage; source the selected syllabus and aircraft behavior. |
| Ultralight aircraft | One selected national category and aircraft first, with its actual controls, handling/performance, procedures and exercises. Category differences may require different models and control mappings. | Select the country/authority and qualification explicitly. German national ultralight training is an initial research reference, not a universal EASA licence or a confirmed country/category decision. |

Each future profile identifies jurisdiction, issuing framework, full qualification
name, aircraft/category, privileges/ratings/launch methods where applicable,
curriculum source/version, prerequisites and scoped assessment criteria. Reuse
common simulator infrastructure while keeping category-specific aircraft, physics
and lessons separately validated. An abbreviation such as “SPL” alone must not
determine the profile. Shared lessons or simulator functionality do not establish
cross-credit or certification eligibility.

The [licence-track source note](research/2026-10-31-license-training-tracks.md)
records authoritative references and amendment/source limits. Q14 retains country,
category and first-aircraft decisions. E12 defines the future coverage/equipment
checks; no sailplane/ultralight model or curriculum has been implemented yet.

## Sequence and dependencies

Phase ordering after the first exercise is **proposed**, refined from user feedback;
it is not an approval to ship the whole wishlist at once. Mobile orientation is a
later requested capability; the first platform is now user-selected Mac desktop
keyboard/touchpad, optionally yoke/joystick and rudder pedals. Exact versions and
controller models remain to be tested. GeoFS-inspired settings are the reference.
Q11 fixes versioned historical/generated scenario briefings before an optional
live adapter; later provider choice and rollout remain open. The
user selected classic instruments first and glass later; fewer/deeper aircraft
takes priority over a broad catalog. The A320 remains an interaction reference.
See [training design](design/TRAINING.md), SPEC and GAPS for exact distinctions.

The community and authoring tracks may develop in parallel with simulator fidelity;
they do not have to wait for CPL. Start bounded prototypes once their contracts,
source and privacy dependencies are resolved. EDDF is the center of the first
reference region (100 NM = 185.2 km), not a mandate to conduct every drill at EDDF.
Select suitable training airfields/runways and source editions within that region.
The [regional/open-engine study](research/2026-10-31-eddf-open-foundation.md) maps
available candidates and unresolved official-center/data rights.

Demonstrable increments remain the priority. First finish a coherent introductory
flight/briefing/checklist/review loop and deepen navigation/procedure practice in
small slices; keep text radio in its existing phase-3 scope. Expand DACH source
coverage, coherent weather and bounded AI traffic alongside that work where their
contracts permit. Community, multiplayer and phone-control prototypes can proceed
in parallel once publication, source, privacy and synchronization boundaries are
scoped. Each slice needs a visible way to try it; this sequence does not move
advanced glass ahead of classic controls or choose the order of later licences.

Other unscheduled options remain video export beyond flight replay, global
high-detail coverage, live-feed rollout, voice radio, a live instructor console,
expanded hardware, VR, additional aircraft and any approved-device pathway.
Requested multiplayer, weather/NOTAM and text communications are explicit tracks
above, with provider, coverage, timing and implementation milestones still open.


## Requested cockpit refinements

The [2026-11-02 input](input/2026-11-02-landing-radio-and-control-refinements.md)
requested a separate radio/radio-navigation box and classical autopilot unit
beside the flight controls. The prototype now includes those panels, KAP 140-style
operating logic and source-marked historical real VOR/LOC/GS/DME references;
fictional LAB remains a separate teaching fixture. This is not accepted installed
aircraft behavior or current navigation service. Continue source-scoped barometric,
receiver and coupled-mode reference cases and exercise validation before stronger
training/fidelity claims.

Later work explicitly includes adjustable key bindings and a fullscreen modern
instrument overlay with ILS markers. Glass presentation must consume the same
accepted flight/navigation state as classic instruments; decorative markers must
not imply a modeled localizer/glideslope. The landing contact demonstrations
reuse real model forces; structural damage, calibrated suspension visuals and
accepted airport terrain/landing envelopes remain separately gated work.

## Regional stall visualization

Use the first spatial airflow-angle diagnostic (TODO 2.0.25) to inspect local
kinematic differences without changing dynamics. Actual region-by-region stall
needs source-applicable sectional aerodynamic data and induced-flow/tail modeling
(TODO 2.0.26); a global AoA warning or fixed speed arc cannot establish local
separation. Prefer reuse of open models and keep estimated regions explicit.
