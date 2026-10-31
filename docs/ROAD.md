# Roadmap

Only phase 0 is underway. Later phases become numbered TODO milestones when scoped; the roadmap does not authorize an unbounded implementation run.

The product direction is a **free, open-source flight-school community around the
web simulator**. The first regional model is **EDDF and a 100 NM radius** using
real available geographic/navigation/chart material. **Reuse open physics engines
and models** where suitable. **LLM-assisted flight-experience creation and AI
interaction** are explicit roadmap goals. These directions come from the
[user's roadmap/architecture update](input/2026-10-31-community-region-reuse.md);
license, provider, deployment and detailed phase order remain to be selected.

| Phase | Goal | Measured gate |
| --- | --- | --- |
| 0. Project foundation | Traceable brief, questions, specification, roles and document/check tooling | E0 scaffold checks and a usable document-build path; unresolved decisions explicit |
| 1. Technical foundation | Choose web stack and reuse-first open dynamics/model integration, classic C172/radio fit, device/input matrix and EDDF-region source strategy | E1 meets predeclared budgets; engine/model/adapter rights reviewed separately; exact EDDF ARP and source coverage resolved before accepted geometry |
| 2. First useful PPL exercise | One accessible browser exercise with classic cockpit subset, declared geography, views, assists and flight review | Agreed bounded exercise acceptance, repeatable replay, relevant E5 checks and independent quality/validation |
| 3. Classic C172 practice loop | Deepen source-backed controls/systems/physics; add QNH/QFE/standard, coherent elevation/maps, checklists, briefing, text radio and circuit practice in separate slices | E2/E6/E7 cases pass for selected data/configuration; missing/stale input and unsupported regimes explicit; objective reviewed |
| 4. Navigation depth and later glass | Working cockpit VOR/DME and applicable navigation controls; real identifiers/fixes, chart/path support, separately scoped ILS drills, then selected glass configuration | Applicable manuals and data mapped to tested indications/actions; E6/E7 pass; E3 evaluates learner benefit separately |
| 5. CPL and advanced equipment | Add explicitly scoped CPL objectives and applicable traffic-awareness/advisory equipment; assess any additional aircraft separately | Separate aircraft/equipment/learning specification and source-based cases before ACAS/TCAS or expanded training claims |
| Community / open release track | A free, open-source site for flight-school practice, proposed exercise library, questions, groups and reviewed debriefs; grow alongside useful simulator slices | E11: selected license, reproducible authorized-data build, contributor/content rules, scoped user roles and moderation; actual hosting/free access verified before deployment claims |
| AI experience-authoring track | Describe territory, objectives and interaction; assemble source-backed navigation assets/chart material and a validated experience package, beginning with EDDF/100 NM | E9/E10: real identifiers/geometry resolved, missing data exposed, package/source rights reviewed, scenario checks pass and accepted package replays independently of generation |

Phase ordering after the first exercise is **proposed**, refined from user feedback;
it is not an approval to ship the whole wishlist at once. Mobile orientation is a
requested capability, with supported devices and release timing still open. The
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
