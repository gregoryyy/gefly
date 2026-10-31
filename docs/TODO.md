# Work plan

IDs never renumber. Checked boxes mean recorded work, not a simulator claim. Follow [SDLC](SDLC.md); decisions and blocking questions live in [GAPS](GAPS.md).

## 0. Project setup and initial inputs

- [x] 0.1 Preserve the original brief and dated user decisions.
- [x] 0.2 Import and extend BOOT with orchestrator and seven subagent roles.
- [x] 0.3 Draft IDEA, CONCEPT, SPEC, ARCH, EVAL, SEC, ROAD and GAPS.
- [x] 0.4 Define process, style, dependency and requirement traceability conventions.
- [x] 0.5 Create canonical role instructions, native Codex definitions and parallel ownership rules.
- [x] 0.6 Add README, check/document recipes, PDF assets, editor/ignore rules and PR checklist.
- [x] 0.7 Verify the scaffold, independent quality/validation review and representative document build (E0); see RESULTS and review reports.
- [x] 0.8 Initialize local version control and record actual state on `bootstrap/project-foundation`.
  - [x] 0.8.1 Select `gregoryyy/gefly` as the new public repository under explicit user authorization (Q6).
  - [x] 0.8.2 Create the initial commit, publish the new public repository and verify the pushed `main` revision; see DONE/RESULTS.
- [ ] 0.9 Select a compatible open-source license and review copied tooling/reference rights before distribution (Q5). *(decision)*
- [ ] 0.10 Resolve aircraft variant/avionics, browser/device/controls and first exercise as their milestones require (Q3/Q4/Q7). *(decision)*
  - [x] 0.10.1 Record Q4: Mac desktop keyboard/touchpad; optional yoke/joystick and rudder pedals; GeoFS-inspired settings. Exact reference versions/budgets remain TODO 1.2.1.
- [x] 0.11 Capture the GeoFS strengths/gaps and cockpit/pressure decisions; refine the product specification, training design and dependency/evaluation plan.
- [x] 0.12 Research documented GeoFS capabilities and original community feedback, then independently review the refinement; record limits rather than accepting untested competitor claims.
- [x] 0.13 Record the free/open-source community, AI experience-authoring, EDDF/100 NM and reuse-first architecture directions in authoritative documents.
- [x] 0.14 Research regional/open-engine source candidates and independently review the integrated roadmap/architecture refinement.
- [x] 0.15 Record Q11's accepted scenario-first briefing sequence and propagate Q4/Q11 through the product/design/evaluation records.
- [x] 0.16 Add and review the requested sailplane/ultralight qualification roadmap, distinct curricula/aircraft gates and source references.
- [x] 0.17 Add the cross-provider peer role, reciprocal dispatchers/router and tests; record actual Claude review of the Codex-authored addition and its accepted follow-up. Reverse live execution remains unclaimed.

## 1. Foundation

- [ ] 1.1 Add stack-appropriate quality gates and CI with reproducible local equivalents; extend the repository-tool gate when the simulator stack is chosen. Q6 publication is resolved.
  - [x] 1.1.1 Add the shared offline repository-tool gate and GitHub Actions matrix, negative fixtures, pinned action/update policy and independent E0-CI review; local, hosted and actual Claude peer evidence are recorded in RESULTS and the CI review reports.
- [ ] 1.2 Choose web stack, rendering/geography strategy and dynamics architecture through a bounded E1 study. *(decision)*
  - [ ] 1.2.1 Specify the reference Mac, macOS/browser versions and optional yoke/joystick/pedals; refine GeoFS-inspired settings and measure trial timestep, latency and numerical budgets using Q4's selected baseline.
  - [ ] 1.2.2 Compare open physics engines and applicable aircraft-model/adapter reuse first, including browser deployment and distinct licenses; justify custom code only for documented gaps or reference harnesses. *(variant)*
  - [ ] 1.2.3 Review observations and record the decision in ARCH/SBOM/RESULTS.
- [ ] 1.3 Select the exact C172 configuration; source applicable aircraft/avionics documents and create a rights/applicability manifest (Q3/Q5). *(decision)*
- [ ] 1.4 Agree units, frames, state/input schemas, replay metadata and independent reference fixtures before parallel coding.
- [ ] 1.5 Freeze one exercise's acceptance criteria and numeric tolerances in SPEC/EVAL with product and instructor review (Q7).
- [ ] 1.6 Review foundation independently through quality and validate before milestone 2.
- [ ] 1.7 Source the official EDDF airport reference point, define its 100 NM geodesic region and select training airports/runways/data editions; review elevations/datums, radio/fix coverage and map/chart rights (Q10). *(decision)*
- [ ] 1.8 Implement Q11's scenario-first briefing decision into source/validity/failure specifications, then scope text radio phraseology, checklist and circuit objectives (Q7); live provider/rollout comes later. *(decision)*
- [ ] 1.9 Extend shared scenario/review contracts for pressure references, geographic/navigation snapshots, checklist and radio events; freeze requirements per slice before parallel edits.
- [ ] 1.10 Specify the declarative flight-experience package and LLM retrieval/validation/review boundary, using the EDDF catalog first; select provider/execution assumptions before integration (Q13). *(decision)*
- [ ] 1.11 Choose compatible open-source license and contributor/data distribution rules; scope the free flight-school community's library, roles, sharing/review and moderation, plus hosting (Q5/Q6/Q12). *(decision)*
- [ ] 1.12 Define the pilot-qualification profile contract for future sailplane/ultralight tracks: jurisdiction, authority, full licence/category, privileges, applicable source revisions and aircraft/objective mappings; retain Q14 choices until each track starts. *(decision)*

## 2. First browser exercise

- [ ] 2.1 Orchestrator dispatches explicit requirement IDs, criteria and disjoint write sets to both coders; starts housekeeping alongside them.
- [ ] 2.2 code1 implements the agreed simulation/state/replay slice and meaningful tests.
- [ ] 2.3 code2 implements the corresponding browser controls, instruments and exercise feedback against frozen contracts **in parallel with 2.2**.
- [ ] 2.4 Housekeeping checks documentation/tooling/asset inventories **in parallel with 2.2 and 2.3**, returning shared-document patches for integration.
- [ ] 2.5 Integrate; run targeted tests and E1/E2 cases within the agreed envelope.
- [ ] 2.6 Quality independently reviews code/security/numerics/tests; coders resolve findings.
- [ ] 2.7 Validate independently checks every in-scope SPEC criterion at the integrated revision; record failures, limitations and evidence.
- [ ] 2.8 Record E3 review of the first exercise and decide the next fidelity increment.
- [ ] 2.9 Run the additional peer quality/specification review in the other provider on the stable integrated result; retain provider/hash evidence and recheck affected criteria after fixes.

Later phases remain in [ROAD](ROAD.md); do not silently create an entire avionics suite or CPL course while completing a bounded milestone.

Expanded requested capabilities have stable IDs in SPEC: accessible launch/input/
views/review (R-UX-1, R-INPUT-1/R-INPUT-2, R-VIEW-1, R-REVIEW-1); geography,
pressure and navigation (R-WORLD-1, R-AIR-3, R-NAV-1 through R-NAV-3); briefing,
text radio, checks/drills (R-BRIEF-1, R-COMM-1, R-TRAIN-4/R-TRAIN-5); and later
applicable traffic equipment/fewer-deeper aircraft (R-TRAFFIC-1, R-SCOPE-1).
These references plan future implementation; documentary updates do not pass the
runtime acceptance criteria. E5–E8 define the added evaluation/research scope.

Additional roadmap directions: R-REGION-1 (EDDF/100 NM), R-REUSE-1 (open engines/
models first), R-AUTHOR-1 (LLM-created flight experiences), R-COMMUNITY-1 and
R-OPEN-1 (free/open-source flight-school community). E9–E11 define their planned
gates; public deployment, provider integration and regional model construction are
future tasks, not completed by this requirements update.
