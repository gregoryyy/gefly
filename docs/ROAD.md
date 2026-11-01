# Roadmap

Only phase 0 is underway. Later phases become numbered TODO milestones when scoped; the roadmap does not authorize an unbounded implementation run.

The product direction is a **free, open-source flight-school community around the
web simulator**. The first regional model is **EDDF and a 100 NM radius** using
real available geographic/navigation/chart material. **Reuse open physics engines
and models** where suitable. **LLM-assisted flight-experience creation and AI
interaction** are explicit roadmap goals. These directions come from the
[user's roadmap/architecture update](input/2026-10-31-community-region-reuse.md);
The project license is GPL-3.0-or-later (GAPS Q5); provider, deployment and
detailed phase order remain to be selected.

| Phase | Goal | Measured gate |
| --- | --- | --- |
| 0. Project foundation | Traceable brief, questions, specification, roles and document/check tooling | E0 scaffold checks and a usable document-build path; unresolved decisions explicit |
| 1. Technical foundation | Choose web stack and reuse-first open dynamics/model integration, classic C172/radio fit, device/input matrix and EDDF-region source strategy | E1 meets predeclared budgets; engine/model/adapter rights reviewed separately; exact EDDF ARP and source coverage resolved before accepted geometry |
| 2. First useful PPL exercise | One accessible Mac desktop keyboard/touchpad circuit exercise (take-off, pattern, landing) at Frankfurt-Egelsbach (EDFE), optional yoke/joystick/pedals, classic cockpit subset, declared geography, views, assists and flight review | Agreed bounded exercise acceptance, repeatable replay, reference Mac/browser and controller E5 checks, independent quality/validation |
| 3. Classic C172 practice loop | Deepen source-backed controls/systems/physics; add QNH/QFE/standard, coherent elevation/maps, checklists, briefing, text radio, circuit variations and the second (FR172/172S) engine configuration for performance comparison, in separate slices; scope community publication rules and roles | E2/E6/E7 cases pass for selected data/configuration; missing/stale input and unsupported regimes explicit; objective reviewed |
| 4. Navigation depth and later glass | Working cockpit VOR/DME and applicable navigation controls; real identifiers/fixes, chart/path support, separately scoped ILS drills, then selected glass configuration | Applicable manuals and data mapped to tested indications/actions; E6/E7 pass; E3 evaluates learner benefit separately |
| 5. CPL and advanced equipment | Add explicitly scoped CPL objectives and applicable traffic-awareness/advisory equipment; assess any additional aircraft separately | Separate aircraft/equipment/learning specification and source-based cases before ACAS/TCAS or expanded training claims |
| Community / open release track | GPL-3.0-or-later source; publication rules, roles and moderation scoped in phase 3 (GAPS Q12). A free, open-source site for flight-school practice, proposed exercise library, questions, groups and reviewed debriefs; grow alongside useful simulator slices | E11: selected license, reproducible authorized-data build, contributor/content rules, scoped user roles and moderation; actual hosting/free access verified before deployment claims |
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

Unscheduled options: video export beyond flight replay, global high-detail coverage,
live briefing feed rollout, voice radio, a live instructor console, expanded hardware,
VR, real-time multiplayer, additional aircraft and any approved-device pathway. Weather/
NOTAM briefing and text radio are now requested product capabilities above, while
provider, coverage, timing and actual implementation remain undecided.
