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
- [x] 0.9 Select a compatible open-source license and review copied tooling/reference rights before distribution (Q5): GPL-3.0-or-later with a non-proprietary, permissive-preferred third-party policy; `LICENSE` added 2026-11-01. Copied-tooling rights were reviewed in 0.8 (THIRD_PARTY_NOTICES); reference-material rights stay per-source under R-DATA-1.
- [ ] 0.10 Resolve aircraft variant/avionics, browser/device/controls and first exercise as their milestones require (Q3/Q4/Q7). *(decision)*
  - [x] 0.10.1 Record Q4: Mac desktop keyboard/touchpad; optional yoke/joystick and rudder pedals; GeoFS-inspired settings. Exact reference versions/budgets remain TODO 1.2.1.
  - [x] 0.10.2 Record Q3/Q7/Q10 partial answers: FR172 and/or 172S engine configurations; first exercise take-off/circuit/landing; first airport Frankfurt-Egelsbach (EDFE). Runway 26 and the research-first review direction are selected; remaining fit, source geometry and criteria belong to TODO 1.3/1.5/1.7.
- [x] 0.11 Capture the GeoFS strengths/gaps and cockpit/pressure decisions; refine the product specification, training design and dependency/evaluation plan.
- [x] 0.12 Research documented GeoFS capabilities and original community feedback, then independently review the refinement; record limits rather than accepting untested competitor claims.
- [x] 0.13 Record the free/open-source community, AI experience-authoring, EDDF/100 NM and reuse-first architecture directions in authoritative documents.
- [x] 0.14 Research regional/open-engine source candidates and independently review the integrated roadmap/architecture refinement.
- [x] 0.15 Record Q11's accepted scenario-first briefing sequence and propagate Q4/Q11 through the product/design/evaluation records.
- [x] 0.16 Add and review the requested sailplane/ultralight qualification roadmap, distinct curricula/aircraft gates and source references.
- [x] 0.17 Add the cross-provider peer role, reciprocal dispatchers/router and tests; record actual Claude review of the Codex-authored addition and its accepted follow-up. Reverse live execution remains unclaimed.
- [x] 0.18 Scope the cross-provider peer gate per Q15; superseded 2026-11-01 11:54 by proclens's batched cadence (every few PRs, *peer pending* in between, coverage required before milestone acceptance/release).
- [ ] 0.19 Run the first batched Codex peer review of Claude-authored work since `3faf9c8` (PRs #4–#6 and later) on a machine with the Codex CLI.
- [x] 0.20 Select model size and reasoning effort per task by difficulty and risk (Q20); recorded in AGENTS, BOOT and the agent workflow.

## 1. Foundation

- [ ] 1.1 Add stack-appropriate quality gates and CI with reproducible local equivalents; extend the repository-tool gate for the selected TypeScript/browser stack as product implementation is added. Q6 publication is resolved.
  - [x] 1.1.2 Run the study tests (`studies/e1-jsbsim`, offline, skip without jsbsim) and the synthetic render check (node) in the shared gate; `--require-node` in hosted CI; skips reported, never passes. Reviewed; hosted CI green (PR #13); process-group timeout follow-up merged. Previously: pending review and hosted run.
  - [x] 1.1.1 Add the shared offline repository-tool gate and GitHub Actions matrix, negative fixtures, pinned action/update policy and independent E0-CI review; local, hosted and actual Claude peer evidence are recorded in RESULTS and the CI review reports.
- [ ] 1.2 Choose web stack, rendering/geography strategy and dynamics architecture through a bounded E1 study. *(decision)*
  - [ ] 1.2.1 Reference platform selected (Q16): MacBook Pro M1, current macOS, Chrome latest first, Safari second; pin exact versions per measurement. Specify optional yoke/joystick/pedals and the paired-iPhone profile; refine GeoFS-inspired settings and measure trial timestep, latency and numerical budgets using Q4's selected baseline.
  - [ ] 1.2.2 Complete the reuse assessment: JSBSim/native/WASM and limited reference-Mac evidence exist, and the engine LGPL exception is accepted. Remaining work is product load/platform verification, model-data/adapter rights and integration gaps; retain study limitations and justify custom model components under R-REUSE-1. *(variant)*
  - [x] 1.2.3 Review E1 observations and select the stack: JSBSim worker, TypeScript, CesiumJS with three.js fallback and MapLibre (Q17, 2026-11-01). Recorded Mac results support the lightweight study; remaining real-terrain, device-resolution and isolated timing checks are tracked in 1.2.1 and RESULTS.
- [ ] 1.3 (172S serials 9491–9809 selected 2026-11-01 10:27; FR172 sub-model pending. Started: [172S/FR172 source survey](research/2026-11-01-c172s-fr172-sources.md); verified TCDS extracts still needed; manifest (PR #14) and POH values (PR #17) merged.) Select the exact classic-panel 172S configuration first, then the FR172 (sub-model/year, engine/propeller, classic avionics); source public FAA/EASA type-certificate and other applicable documents; create a rights/applicability manifest per configuration (Q3/Q5). *(decision)*
  - [x] 1.3.1 Prepare the [E2 mass/inertia calculation tool](../studies/e2-c172s/README.md) and synthetic arithmetic fixtures, with strict SI input and shared offline CI; merged PR #27. Calculation groundwork is complete; sourced aircraft inputs, JSBSim mapping and M-a acceptance remain open in TODO 1.3.2–1.3.4. Claude peer review pending.
  - [ ] 1.3.2 Freeze the first-aircraft geometry, mass/CG, parameter provenance and calibration/holdout cases with input hashes (FDM-172S M-a preparation).
  - [ ] 1.3.3 Build the project-owned JSBSim model incrementally through mass/gear, longitudinal/lateral dynamics and propulsion; preserve sourced/estimated/unknown labels (M-a–M-d).
  - [ ] 1.3.4 Execute frozen calibration and untouched holdout cases, record residuals/limits, and integrate the model into the WASM worker with replay/handling checks (M-e); renew independent reviews.
- [x] 1.4 (Agreed v1: [CONTRACTS](design/CONTRACTS.md); O-1..O-9 and the height datum decided in Q18; reviewed; merged PR #12.) Agree units, frames, state/input schemas, replay metadata and independent reference fixtures before parallel coding.
- [ ] 1.5 Freeze the research-based [Exercise 01](design/EXERCISE-01.md) criteria for the first 172S circuit at EDFE runway 26. ASI calibration points are available; remaining work includes source/applicability checks, AIP geometry and unresolved criteria. The user deferred an instructor reviewer (Q7); retain instructional labels and separate stronger training claims.
  - [ ] 1.5.1 Reconcile the evaluator-derived CAL IAS wording with the scenario digest contract; keep it outside the instrument digest as C4 specifies, then freeze the criterion slice with reviewed field names.
- [ ] 1.6 Review foundation independently through quality and validate before milestone 2.
- [ ] 1.7 (Started: [EDFE source survey](research/2026-11-01-edfe-aerodrome-sources.md); official AIP extract still needed.) Source the official EDDF airport reference point, define its 100 NM geodesic region and source Frankfurt-Egelsbach (EDFE) as the first airport (runway, circuit, elevation, frequencies) and further training airports/data editions; review elevations/datums, radio/fix coverage and map/chart rights (Q10). *(decision)*
- [ ] 1.8 (Draft: [BRIEFING](design/BRIEFING.md) — scenario briefing schema and failure states, AFIS text-radio scope, POH checklist classification; reviewed (local quality/validate), merged; peer pending.) Implement Q11's scenario-first briefing decision into source/validity/failure specifications, then scope text radio phraseology, checklist and circuit objectives (Q7); live provider/rollout comes later. *(decision)*
- [ ] 1.9 (Draft v1.1: [SCENARIO-CONTRACTS](design/SCENARIO-CONTRACTS.md) — scenario record, step-clock events, review record, code1/code2 freeze table, 15 name conflicts resolved; reviewed (local quality/validate), merged; peer pending.) Extend shared scenario/review contracts for pressure references, geographic/navigation snapshots, checklist and radio events; freeze requirements per slice before parallel edits.
- [ ] 1.10 (Draft: [EXPERIENCES](design/EXPERIENCES.md); provider assumptions remain Q13; reviewed (local quality/validate), merged; peer pending.) Specify the declarative flight-experience package and LLM retrieval/validation/review boundary, using the EDDF catalog first; select provider/execution assumptions before integration (Q13). *(decision)*
- [ ] 1.11 Choose contributor terms that keep a later relaxation of GPL-3.0-or-later possible (a DCO alone does not; options: a CLA with a relicensing grant, copyright assignment, or permissive inbound licensing), plan replacement or upstream consent for the Propeller-derived files, and data distribution rules; community library, roles, sharing/review, moderation and hosting are deferred to roadmap phase 3 (Q5/Q6/Q12). *(decision)*
- [ ] 1.12 (Draft: [QUALIFICATIONS](design/QUALIFICATIONS.md); open questions listed there; reviewed (local quality/validate), merged; peer pending.) Define the pilot-qualification profile contract for future sailplane/ultralight tracks: jurisdiction, authority, full licence/category, privileges, applicable source revisions and aircraft/objective mappings; retain Q14 choices until each track starts. *(decision)*
- [ ] 1.13 (Draft: [PHONE-CONTROL](design/PHONE-CONTROL.md) — local WebRTC data channel, QR + confirmation-code pairing; Q-P1..Q-P6 decided in Q19; reviewed.) Specify and prototype the paired-iPhone orientation control (R-INPUT-3): pairing, transport, latency budget, fallback and SEC review; optional, after the input boundary in 1.4.
- [x] 1.14 Adopt bounded level 2 assurance (Q22, R-ASR-1–R-ASR-5); AS1–AS8 locally reviewed, hosted matrix observed; scoped peer disposition is recorded separately in the assurance review report.
  - [x] 1.14.1 Record the adoption, frozen assurance criteria, source-of-truth rules and exclusive implementation ownership.
  - [x] 1.14.2 Reuse the pinned Propeller core, adapt Gefly lineage/status extraction and provide check/report/trace/diff/impact commands.
  - [x] 1.14.3 Add aircraft provenance, versioned evidence/decision guards, acceptance freshness and calibration/holdout checks with negative fixtures.
  - [x] 1.14.4 Reconcile known status drift, integrate offline local/CI checks and record independent quality/validation plus scoped peer disposition.
- [x] 1.15 Organize assurance under `utils/assure/` and CI tooling under `utils/ci/`; retain the `just` commands, complete test discovery, older-revision inspection, upstream byte pins and ignored-output boundaries (R-ASR-4, R-BOOT-3). See the tool-layout review records for independent review and peer disposition.

## 2. First browser exercise

- [x] 2.0 Deliver a local experimental airborne free-flight prototype: real JSBSim study worker, procedural scene, keyboard/touchpad input, live instruments, cockpit/chase views and pause/reset; independent quality and scoped browser validation passed. See [application](../app/README.md). Uses local generic research data and a visible adjustable study input offset; this does not complete the 172S model, official EDFE scenery, accepted circuit or milestone gates below. Peer pending.

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
