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
- [ ] 0.19 Run the first batched Codex peer review of Claude-authored work since `3faf9c8` (PRs #4–#6 and later) on a machine with the Codex CLI. Deferred by the user (2026-11-02 08:01); peer pending continues for the Claude-authored batch #32–#36.
- [x] 0.20 Select model size and reasoning effort per task by difficulty and risk (Q20); recorded in AGENTS, BOOT and the agent workflow.
- [ ] 0.21 Run the reciprocal Claude peer review of Codex-authored work (PRs #27–#30: 1.3.1, 1.5.2, 1.14, 1.15, 2.0) through the router with a frozen packet; required with 0.19 before milestone 1 acceptance. First run 2026-11-02: #27/#29 accept, #28a fixed after changes_required; #28b and #30 blocked on withheld material and need renewed packets ([report](reviews/2026-11-01-codex-prs-27-30-peer.md)). Second run 2026-11-03 at `b3a7538` (Codex #39–#50 and the #28b/#30 renewals): not accepted; 26 packets blocked, r28b changes_required; findings F4–F67 to fix ([report](reviews/2026-11-03-codex-prs-39-50-peer.md)).
  - PR #52 merge integration against `a655bc9` independently checked on 2026-11-03 ([bounded report](reviews/2026-11-03-pr52-conflicts.md)); this preserves the findings and does not accept the full peer batch. Q25's existing user instruction is now recorded; Q24 remains open.

- [x] 0.22 Reconcile the expanded browser-realism vision, planned capability tracks, community/partnership/financing directions and open DACH/world strategy in ROAD, IDEA and SPEC. Preserve the permanently free/open baseline and scope optional commercial services separately; no new runtime acceptance. [Input](input/2026-11-03-road-vision.md). Independent documentation quality/coverage review and link/index checks pass. [Review](reviews/2026-11-03-road-vision.md). Future capability implementation remains in ROAD; cross-provider peer pending.

## 1. Foundation

- [ ] 1.1 Add stack-appropriate quality gates and CI with reproducible local equivalents; extend the repository-tool gate for the selected TypeScript/browser stack as product implementation is added. Q6 publication is resolved.
  - [x] 1.1.2 Run the study tests (`studies/e1-jsbsim`, offline, skip without jsbsim) and the synthetic render check (node) in the shared gate; `--require-node` in hosted CI; skips reported, never passes. Reviewed; hosted CI green (PR #13); process-group timeout follow-up merged. Previously: pending review and hosted run.
  - [x] 1.1.1 Add the shared offline repository-tool gate and GitHub Actions matrix, negative fixtures, pinned action/update policy and independent E0-CI review; local, hosted and actual Claude peer evidence are recorded in RESULTS and the CI review reports.
  - [x] 1.1.3 Add separate nonempty, zero-skip Node test coverage for the assessment-airspeed module to the shared local/hosted gate, preserving assurance checks and failure propagation.
- [ ] 1.2 Choose web stack, rendering/geography strategy and dynamics architecture through a bounded E1 study. *(decision)*
  - [ ] 1.2.1 Reference platform selected (Q16): 14-inch MacBook Pro (Apple M1 Pro, 120 Hz), current macOS, Chrome latest first, Safari second; pin exact versions per measurement. Specify optional yoke/joystick/pedals and the paired-iPhone profile; refine GeoFS-inspired settings and measure trial timestep, latency and numerical budgets using Q4's selected baseline.
    - [ ] 1.2.1.1 Re-test CesiumJS with real terrain and imagery tiles at device resolution on the reference Mac, with pinned macOS/Chrome versions, before milestone 2 acceptance.
  - [ ] 1.2.2 Complete the reuse assessment: JSBSim/native/WASM and limited reference-Mac evidence exist, and the engine LGPL exception is accepted. Remaining work is product load/platform verification, model-data/adapter rights and integration gaps; retain study limitations and justify custom model components under R-REUSE-1. *(variant)*
  - [x] 1.2.3 Review E1 observations and select the stack: JSBSim worker, TypeScript, CesiumJS with three.js fallback and MapLibre (Q17, 2026-11-01). Recorded Mac results support the lightweight study; remaining real-terrain, device-resolution and isolated timing checks are tracked in 1.2.1 and RESULTS.
- [ ] 1.3 (172S serials 9491–9809 selected 2026-11-01 10:27; FR172 sub-model pending. Started: [172S/FR172 source survey](research/2026-11-01-c172s-fr172-sources.md); verified TCDS extracts still needed; manifest (PR #14) and POH values (PR #17) merged.) Select the exact classic-panel 172S configuration first, then the FR172 (sub-model/year, engine/propeller, classic avionics); source public FAA/EASA type-certificate and other applicable documents; create a rights/applicability manifest per configuration (Q3/Q5). *(decision)*
  - [x] 1.3.1 Prepare the [E2 mass/inertia calculation tool](../studies/e2-c172s/README.md) and synthetic arithmetic fixtures, with strict SI input and shared offline CI; merged PR #27. Calculation groundwork is complete; sourced aircraft inputs, JSBSim mapping and M-a acceptance remain open in TODO 1.3.2–1.3.4. Claude peer review pending.
  - [ ] 1.3.2 Freeze the first-aircraft geometry, mass/CG, parameter provenance and calibration/holdout cases with input hashes (FDM-172S M-a preparation).
  - [ ] 1.3.3 Build the project-owned JSBSim model incrementally through mass/gear, longitudinal/lateral dynamics and propulsion; preserve sourced/estimated/unknown labels (M-a–M-d).
  - [ ] 1.3.4 Execute frozen calibration and untouched holdout cases, record residuals/limits, and integrate the model into the WASM worker with replay/handling checks (M-e); renew independent reviews.
- [x] 1.4 (Agreed v1: [CONTRACTS](design/CONTRACTS.md); O-1..O-9 and the height datum decided in Q18; reviewed; merged PR #12.) Agree units, frames, state/input schemas, replay metadata and independent reference fixtures before parallel coding.
- [ ] 1.5 Freeze the research-based [Exercise 01](design/EXERCISE-01.md) criteria for the first 172S circuit at EDFE runway 26. ASI calibration points are available; remaining work includes source/applicability checks, AIP geometry and unresolved criteria. The user deferred an instructor reviewer (Q7); retain instructional labels and separate stronger training claims.
  - [x] 1.5.1 Reconcile the evaluator-derived CAL IAS wording with the scenario digest contract; keep it outside the instrument digest as C4 specifies, then freeze the criterion slice with reviewed field names.
  - [x] 1.5.2 Implement the bounded [assessment-airspeed mapping](design/ASSESSMENT-AIRSPEED.md) and repository-data adapter with source metadata, explicit unavailable outcomes, no extrapolation and independent AA1–AA6 review. Target-band classification and full exercise freezing remain separate.
- [ ] 1.6 Review foundation independently through quality and validate before milestone 2.
- [ ] 1.7 (Started: [EDFE source survey](research/2026-11-01-edfe-aerodrome-sources.md); official AIP extract still needed.) Source the official EDDF airport reference point, define its 100 NM geodesic region and source Frankfurt-Egelsbach (EDFE) as the first airport (runway, circuit, elevation, frequencies) and further training airports/data editions; review elevations/datums, radio/fix coverage and map/chart rights (Q10). *(decision)*
- [ ] 1.8 (Draft: [BRIEFING](design/BRIEFING.md) — scenario briefing schema and failure states, AFIS text-radio scope, POH checklist classification; reviewed (local quality/validate), merged; peer pending.) Implement Q11's scenario-first briefing decision into source/validity/failure specifications, then scope text radio phraseology, checklist and circuit objectives (Q7); live provider/rollout comes later. *(decision)*
- [ ] 1.9 (Draft v1.1: [SCENARIO-CONTRACTS](design/SCENARIO-CONTRACTS.md) — scenario record, step-clock events, review record, code1/code2 freeze table, 15 name conflicts resolved; reviewed (local quality/validate), merged; peer pending.) Extend shared scenario/review contracts for pressure references, geographic/navigation snapshots, checklist and radio events; freeze requirements per slice before parallel edits.
- [ ] 1.10 (Draft: [EXPERIENCES](design/EXPERIENCES.md); provider assumptions remain Q13; reviewed (local quality/validate), merged; peer pending.) Specify the declarative flight-experience package and LLM retrieval/validation/review boundary, using the EDDF catalog first; select provider/execution assumptions before integration (Q13). *(decision)*
- [ ] 1.11 Choose contributor terms that keep a later relaxation of GPL-3.0-or-later possible (a DCO alone does not; options: a CLA with a relicensing grant, copyright assignment, or permissive inbound licensing), plan replacement or upstream consent for the Propeller-derived files, and data distribution rules; community library, roles, sharing/review, moderation and hosting are deferred to roadmap phase 3 (Q5/Q6/Q12). *(decision)*
- [ ] 1.12 (Draft: [QUALIFICATIONS](design/QUALIFICATIONS.md); open questions listed there; reviewed (local quality/validate), merged; peer pending.) Define the pilot-qualification profile contract for future sailplane/ultralight tracks: jurisdiction, authority, full licence/category, privileges, applicable source revisions and aircraft/objective mappings; retain Q14 choices until each track starts. *(decision)*
- [ ] 1.13 (Draft: [PHONE-CONTROL](design/PHONE-CONTROL.md) — local WebRTC data channel, QR + confirmation-code pairing; Q-P1..Q-P6 decided in Q19; reviewed.) Specify and prototype the paired-iPhone orientation control (R-INPUT-3): pairing, transport, latency budget, fallback and SEC review; optional, after the input boundary in 1.4.
- [x] 1.14 Adopt bounded level 2 assurance (Q22, R-ASR-1–R-ASR-5); AS1–AS8 locally reviewed, hosted matrix observed; scoped peer disposition is recorded separately in the assurance review report.
  - [ ] 1.14.1 Record the adoption, frozen assurance criteria and source-of-truth rules (done 2026-11-01 20:40). Path-level exclusive implementation ownership was not recorded and cannot be recovered from DONE (peer F66, 2026-11-03). Record current owners for `utils/assure/**`, its CI integration and its status records, without inferring historical ownership.
  - [x] 1.14.2 Reuse the pinned Propeller core, adapt Gefly lineage/status extraction and provide check/report/trace/diff/impact commands.
  - [x] 1.14.3 Add aircraft provenance, versioned evidence/decision guards, acceptance freshness and calibration/holdout checks with negative fixtures.
  - [x] 1.14.4 Reconcile known status drift, integrate offline local/CI checks and record independent quality/validation plus scoped peer disposition.
- [x] 1.15 Organize assurance under `utils/assure/` and CI tooling under `utils/ci/`; retain the `just` commands, complete test discovery, older-revision inspection, upstream byte pins and ignored-output boundaries (R-ASR-4, R-BOOT-3). See the tool-layout review records for independent review and peer disposition.

## 2. First browser exercise

- [x] 2.0 Deliver a local experimental airborne free-flight prototype: real JSBSim study worker, procedural scene, keyboard/touchpad input, live instruments, cockpit/chase views and pause/reset; independent quality and scoped browser validation passed. See [application](../app/README.md). Uses local generic research data and a visible adjustable study input offset; this does not complete the 172S model, official EDFE scenery, accepted circuit or milestone gates below. Peer pending.

- [x] 2.0.1 Improve free-flight usability and visuals: explicit Start/Resume, visible hold buttons and draggable stick, Cesium with bundled open Hessen starter/overview photographs, stable full-width rendering and local imagery loading. Independent quality and affected browser validation passed; full 172S/circuit acceptance remains separate. Peer pending.

- [x] 2.0.2 Add session-only pitch/roll/rudder sensitivity controls, Gentle/Default presets and safe pause/focus behavior; defaults preserve the previous control mapping. See [how to try it](../app/README.md). Partial R-INPUT-1; hardware calibration and aircraft-response validation remain separate. Peer pending.

- [x] 2.0.3 Add bounded in-session flight-state review: scrub/play recorded states through both views, keep live JSBSim paused, and return to the true paused live state. Partial R-REVIEW-1; input/event replay, persistence and video export remain future work. Peer pending.

- [x] 2.0.4 Add a local practice map with true heading, a bounded retained flight path, Fit/Follow controls and a marker synchronized with recorded-state review. Independent quality and actual-browser validation passed; see [review evidence](reviews/2026-11-02-practice-map.md). Partial R-WORLD-1/R-REVIEW-1; navigation charts, airport elevation and regional acceptance remain separate. Peer pending.
- [x] 2.0.5 Add an ideal worker-computed pressure altimeter driven by engine static pressure, manual hPa/inHg settings, QNH/launch-point QFE/STD teaching shortcuts and recorded-state review. Independent quality and actual-browser validation passed; see [review evidence](reviews/2026-11-02-pressure-altimeter.md). Partial R-AIR-3/R-REVIEW-1; installed instrument limits/errors, accepted airport datum and full replay remain separate. Peer pending.

- [x] 2.0.6 Correct chase-view axes, add a standard six-pack, source-backed generic flaps/wheel brakes and scene click-yoke/hold-look input with release/focus/review checks. Partial R-VIEW-1/R-INPUT-1/R-REVIEW-1; installed instrument fidelity and real ground/landing acceptance remain open. Peer pending.

- [x] 2.0.7 Clarify roll correction; add numeric throttle, actual piston/fuel indications, manual/automatic mixture and reused wings-level/true-heading AP with raw pilot override. See [review evidence](reviews/2026-11-02-classic-flight-controls.md). Partial R-AIR-1/R-INPUT-1/R-REVIEW-1; altitude/NAV AP modes and installed C172S fidelity remain unsupported. Peer pending.

- [ ] 2.0.8 Complete the next source-scoped cockpit controls: engine start/electrical controls and applicable fuel selector/carb-heat behavior. Manual elevator trim is delivered separately in 2.0.10. Identify the exact aircraft installation and retain unimplemented labels; this does not replace the model, navigation, briefing and exercise gates below.

- [x] 2.0.9 Add scene two-finger vertical-scroll FOV control (20–100°, default 60°), separate from flight/yoke/look, with camera/view/reset persistence, modifier/UI isolation and actual-browser physics-invariance checks. See [review evidence](reviews/2026-11-02-field-of-view.md). Partial R-INPUT-1/R-VIEW-1; peer pending. Hosted CI was red at merge until `7610edc` (#46); see the DONE correction of 2026-11-03 08:05.

- [x] 2.0.10 Add source-backed generic elevator trim with apostrophe/backslash hold, slider and startup restore; retain it through pause/release, record actual trim/elevator, and restore fresh initial trim on restart. Move Restart/Options to the top menu and make flight controls a View option. See [review evidence](reviews/2026-11-02-elevator-trim.md). Partial R-INPUT-1/R-VIEW-1/R-REVIEW-1; C172S trim-wheel calibration and full aircraft acceptance remain open. Peer pending.

- [x] 2.0.11 Adopt the requested bracket flap, apostrophe/backslash trim and Q/W rudder mappings; keep 0 idle and Space pause. Put restart in Flight, preserve yoke mode/anchor across pointer exit/reentry, and retain/accumulate Review look through release and seeking. Partial R-INPUT-1/R-VIEW-1/R-REVIEW-1; configurable key bindings remain later. Peer pending.

- [x] 2.0.12 Demonstrate generic landing reactions with four explicit flat-ground presets, actual per-wheel contact/compression/load/slip and structure-contact indication; route nosewheel steering consistently with rudder and use actual ellipsoid height for rendering. Unchanged upstream spring/damper/friction drives aircraft motion; no component damage or accepted C172S landing envelope. Partial R-SIM-1/R-SIM-5/R-REVIEW-1; peer pending.

- [x] 2.0.13 Add a separate radio/NAV box with active/standby COM1/NAV1 tuning/swap, OBS and opt-in fictional LAB CDI/TO-FROM/geometric DME, synchronized with recorded configuration. Move roll/heading autopilot into its own classic-style unit; unsupported ALT/NAV/APR/REV stay explicitly INOP. Partial R-NAV-1/R-INPUT-1/R-REVIEW-1; real station data, 8.33 kHz channels and coupled guidance remain open. Peer pending.

- [ ] 2.0.14 Complete installed-autopilot fidelity beyond the operating model in 2.0.40: applicable real LOC/GS/GPS services, aircraft-specific servo/trim/electrical/PFT/fault behavior and independent reference cases. The bounded ALT/preselect/NAV/APR/REV operating controls are delivered in 2.0.40; they do not establish real ILS or installed-aircraft performance. The requested fullscreen modern instrument overlay with ILS markers and configurable keys remain later (see ROAD).

- [x] 2.0.15 Refine the cockpit toward the supplied visual reference: two round NAV indicators with independent OBS/CDI/TO-FROM/flags, dual COM1/NAV1 and COM2/NAV2 tuning/swap, and recorded 11-field configuration. Original vector faces; poster not redistributed and no exact installation inferred. Real ILS/station-data fidelity remains open. Partial R-NAV-1/R-VIEW-1/R-REVIEW-1; peer pending.

- [x] 2.0.16 Arrange desktop round instruments in a 2×4 grid with the six-pack on an extra rounded panel; align panel-column heights, group the main cockpit units (AP/power grouping refined in 2.0.18), make trim/flaps vertical and move explanatory copy to Options. Preserve responsive live/recorded operation and visible labels/units/flags. Partial R-INPUT-1/R-VIEW-1; peer pending.

- [x] 2.0.17 Add the third TRUE LAB bearing/DME display, actual round RPM and a distinct dual L/R model-fuel gauge. NAV1/NAV2 sit above bearing/RPM; the engine column precedes AP/flaps. The aligned desktop deck is 388px with symmetric fuel scales, bottom engine switch, half-size flap/trim key buttons and uniform responsive scaling. Fictional bearing and pinned model references do not claim installed NDB/RMI or C172S fuel fidelity. R-PANEL-1/R-VIEW-1/R-REVIEW-1; independent quality/validation passed; see [review evidence](reviews/2026-11-02-ground-collision-engine-wind.md). Peer pending.

- [x] 2.0.18 Compact the current cockpit: paired four-detent flap/continuous trim sliders and keycaps, Slash restoring initial trim, vertical throttle/mixture in the engine panel, AP above flap/trim, controls available while paused with physics frozen and pending commands applied on Resume. Add OBS hold acceleration/drag and keyboard adjustment; preserve full-turn/event-partition invariance, read-only Review, harmonized panel colors and original screw hardware. Partial R-INPUT-1/R-NAV-1/R-VIEW-1/R-REVIEW-1; peer pending.

- [x] 2.0.19 Replace the fixed scene crosshair with actual camera-projected aircraft-forward direction; add bounded edge guidance and hide behind-camera directions. Recompute through look/FOV/view/resize and recorded Review without changing physical state or input. See [review evidence](reviews/2026-11-02-forward-marker.md). Partial R-VIEW-1/R-INPUT-1/R-REVIEW-1; peer pending.

- [x] 2.0.20 Show source-applicable critical-speed markings on the research C172P CAS gauge, preserving source/configuration labels and suppressing incompatible TAS overlays. Partial R-AIR-2/R-DATA-1; installed IAS and dynamic stall-envelope acceptance remain separate. Independent actual-browser validation passed; peer pending.

- [x] 2.0.21 Show recorded throttle, applied commands and actuator positions during read-only Review; bind R to Review and keep restart in Flight. Preserve staged live controls on exit and frozen physical state. Partial R-REVIEW-1/R-INPUT-1; independent actual-browser validation passed, peer pending. Hosted CI was red at merge until `7610edc` (#46); see the DONE correction of 2026-11-03 08:05.

- [x] 2.0.22 Fit cockpit height to content and scale all inline instruments/controls together; retain main instruments and AP/flap/trim before collapsing engine/radio on narrow views. Partial R-VIEW-1; see [review evidence](reviews/2026-11-02-review-panel.md), peer pending.

- [x] 2.0.23 Add a View flight-data panel with signed ground-relative flight-path gradient in %, low-speed unavailable handling and actual per-wheel contact/compression/strut load/slip plus structure contacts. Synchronize with selected recorded Review without changing physics. Partial R-SIM-3/R-VIEW-1/R-REVIEW-1; no structural damage limits or ILS deviation inferred. Independent quality/actual-browser validation passed; peer pending.

- [x] 2.0.24 Add a View Aircraft handbook with original sourced reference diagrams for the active research 1982 C172P: loading/CG, published flight-envelope load-factor/airspeed references, critical CAS speeds and model gear geometry. Pause for reading; retain accessible tables/source/applicability and narrow-screen operation. No live loading point without applicable mass/CG telemetry. Partial R-AIR-2/R-DATA-1/R-VIEW-1; see [review evidence](reviews/2026-11-02-flight-data-handbook.md). Independent quality/actual-browser validation passed; peer pending.

- [x] 2.0.25 Add View spatial stall awareness: six labeled wing sampling regions with kinematic local airflow-angle estimates from actual air-relative motion/current CG, headroom to the global model reference, recorded-state synchronization and unavailable/unknown handling. Partial R-SIM-7/R-VIEW-1/R-REVIEW-1; no actual sectional separation or local critical-angle claim. Independent quality/actual-browser validation passed; see [review evidence](reviews/2026-11-02-spatial-stall-awareness.md). Peer pending.

- [ ] 2.0.26 Develop source-applicable regional aerodynamics for actual part-by-part stall/separation onset and recovery (wing twist, local section data, induced flow/downwash, flap/aileron/tail effects). Compare reusable open sectional models first; freeze reference cases before accepting regional colors as real stall state. Completes the deeper R-SIM-7 target; the 2.0.25 kinematic display does not implement this physics.

- [x] 2.0.27 Add original synthesized engine/propeller audio from actual RPM/load/fuel telemetry with smooth changes, trusted user activation, quick mute and Options volume. Silence pause/hidden/failure/reset/paused Review/dispose; playing Review uses selected samples. Handle unsupported/blocked audio without interrupting flight. R-AUDIO-1/R-REVIEW-1; no calibrated installed-aircraft acoustic claim. Independent quality/actual-browser validation passed; see [review evidence](reviews/2026-11-02-engine-audio.md). Peer pending. Hosted CI was red at merge until `7610edc` (#46); see the DONE correction of 2026-11-03 08:05.

- [x] 2.0.28 Stop fixed-step flight on native structural or shared illustrative fuselage/propeller/fin ground contact, with an immutable event, locked controls/silent audio and Review/camera/Flight-menu restart. Preserve normal wheel physics and disclose flat-ground/discrete-proxy limits. R-SIM-8/R-REVIEW-1/R-VIEW-1; no structural-damage or aircraft safe-landing threshold claim.

- [x] 2.0.29 Default sound off; add trusted S on/off shortcut with repeat/modifier/editing/menu/dialog guards and preserve quick mute/volume and Review behavior. R-AUDIO-1.

- [x] 2.0.30 Add E and a cockpit engine on/off switch backed by native ignition/starter behavior and recorded actual running state; independent airspeed-driven wind noise and a speed-dependent whistle remain audible during engine-off flight; add actual-contact rolling/touchdown sounds and quieter idle/higher-RPM engine balance. Preserve paused controls, S default-off and collision/Review guards. R-ENG-1/R-AUDIO-1.

- [x] 2.0.31 Add a stable chase-view ground shadow so height and wheel contact are easier to judge, synchronized with live/Review state on the existing flat-ground scene. R-VIEW-1; no terrain/physics changes.

- [x] 2.0.32 Deliver real public Hessen terrain around Egelsbach/Frankfurt/Taunus with shared native/render height data, explicit DHHN2016/GCG2016 conversion, slope-aware wheel/proxy contact, coverage guards, recorded/shadow alignment, source/rights metadata and a visible Taunus flight. Add a sharper public airport photograph with honest effective resolution. R-WORLD-2/R-DATA-1/R-SIM-3/R-VIEW-1; independent quality/actual-browser validation passed, see [review](reviews/2026-11-03-public-terrain.md). Peer pending.

- [x] 2.0.33 Extend high-resolution texture coverage using a multiresolution tile pyramid/cache from public orthophotos; prioritize airport/circuit detail, pin source dates/rights and stream or prefetch only needed tiles. Bounded R-WORLD-4 delivery:723 tiles/67.2 MiB, actual GPUlevel15 and independent source/render validation pass; see [review](reviews/2026-11-03-regional-textures.md), peer pending; full EDDF/100 NM and native 20 cm detail remain scoped separately. R-WORLD-1/R-REGION-1/R-DATA-1.

- [x] 2.0.34 Preserve the original yoke midpoint when a hold-drag camera look ends; leave release neutral until actual movement, retain outside-release/reentry authority and keep short-click recenter/toggle behavior. R-INPUT-1; independent quality/actual-browser validation passed, peer pending.

- [x] 2.0.35 Make native engine coast-down/spin-up audible from actual recorded/live propeller speed, including ignition-off rotation and starter cranking; keep exhaust tied to actual combustion and preserve all mute/pause/Review/collision guards. R-AUDIO-1/R-ENG-1; independent quality/actual-browser validation passed, peer pending.

- [ ] 2.0.36 Later: derive procedural terrain materials from traceable land-use masks, distinguishing cities, vegetation/green areas, streets and water bodies. Keep appearance separate from authoritative elevations, collision and navigational data. R-WORLD-3/R-DATA-1.

- [ ] 2.0.37 Later: model buildings and other structures from reusable public geometry/data, with source dates/rights, coverage and explicit visual/obstacle/collision fidelity. R-WORLD-3/R-DATA-1.

- [x] 2.0.38 Make keyboard/button wheel braking adjustable in Options (0–100% command, initially 25%), avoiding instant maximum-brake input during ordinary braking while retaining explicit full braking, native gear physics and actual-strike stops. Validate actual flat/public ground roll, controls while paused, recorded Review, release/reset and full-command collision. R-INPUT-1/R-SIM-8/R-REVIEW-1; independent quality and eight-group actual-browser validation passed, see [review](reviews/2026-11-03-ground-braking.md). Peer pending.

- [ ] 2.0.39 Research source-applicable nose-strut travel/end-stop and ground-braking reference cases for the project-owned aircraft; validate full-command response and propeller clearance before changing generic-model coefficients. The input preference in 2.0.38 does not complete gear/brake fidelity. R-REUSE-1/R-SIM-8/R-DATA-1.

- [x] 2.0.40 Deliver source-scoped KAP 140 two-axis/preselect operating controls, native VS/ALT and heading guidance, DG arming/capture/source-loss logic, altitude alerts, coherent paused/Review state and validated input boundaries. R-AP-1/R-INPUT-1/R-REVIEW-1; reference cases declare generic servo/capture tuning and current fictional NAV1 coverage. Independent quality/25-group browser validation and shared CI pass; see [review](reviews/2026-11-03-kap140.md). Deeper installed-aircraft fidelity remains in 2.0.14; physical sound delivery is unverified and peer pending. Historical bounded fixture delivery; current integrated KAP usability is tracked in2.0.111, not accepted by these earlier results.

- [x] 2.0.41 Add a source-pinned historical Rhein-Main VOR/LOC/GS/DME inventory, dual-receiver station directory, common instrument/AP signals and an EDDF 25C geometric practice preset. R-NAV-4/R-NAV-1/R-NAV-2/R-DATA-1/R-REVIEW-1. Source edition 2013.10, approximate extent around a community EDDF coordinate; no current AIRAC/procedure or complete R-REGION-1 claim. Independent source/code/actual-browser validation and shared CI pass; see [review](reviews/2026-11-03-rhein-main-navigation.md). Peer pending.

- [x] 2.0.42 Fit the radio stack to its shared column height and make Stations compact with outside-click/Escape dismissal, combined nearby/name filters and distance ordering. Preserve standby/swap, read-only Review and missing-position behavior. R-PANEL-1/R-NAV-4/R-REVIEW-1; independent actual-browser checks and shared CI pass; see [review](reviews/2026-11-03-regional-textures.md), peer pending.

- [x] 2.0.43 Add a separately sourced COM directory and airport COM station map with airport/service identifiers (ATIS, Ground, Tower, Approach), nearby/name/service filters and airport-linked map selection. Show service names and frequencies/channels; selecting a station loads COM1/COM2 standby, with explicit swap to active. Declare dataset edition/rights/currentness; represent 8.33 kHz channels accurately or show them unavailable until tuner support is delivered. Delivered 631 pinned community records / 251 airports with explicit 25/8.33 COM channel names, independent standby/swap and read-only Review. No ATC/voice or live ATIS. [Evidence and source](research/2026-11-03-airport-com-directory.md). R-COMM-1/R-DATA-1; peer pending.

- [x] 2.0.44 Integrate larger dynamic terrain around Darmstadt, Odenwald and Spessart, cross-state imagery and 103 community airport map points. Bounded R-WORLD-5/R-WORLD-2/R-WORLD-1/R-DATA-1 delivery: source/native/browser evidence, exact shared edges, bounded caches/failures, shared CI and final independent affected-scope review pass. See [regional review](reviews/2026-11-03-streamed-region.md). Not full EDDF/100 NM, surveyed runway or global landing acceptance; peer pending.

- [x] 2.0.45 Integrate initially hidden flight controls/title bar, O to toggle the top bar, half-opacity floating overlays with deliberate activation, and marked menu shortcuts. R-UX-2/R-INPUT-1/R-VIEW-1; independent actual-browser checks and shared CI pass, see [integration review](reviews/2026-11-03-flight-assists.md). Central Start/Pause card remains separate. The reported touchpad overshoot/jumps are not resolved by this increment; peer pending.

- [x] 2.0.46 Research global dynamic map/terrain/imagery loading, local reconstruction/procedural detail and Google Earth/Maps alternatives. [Research note](research/2026-11-03-global-scenery.md) includes current primary sources and small actual terrain-service probes; [independent research review](reviews/2026-11-03-global-scenery-research.md) passes. No provider activation, global implementation, cost-per-flight or fidelity acceptance; peer pending.

- [x] 2.0.47 Add A current-heading/altitude autopilot capture and = requested pacing 1×/1.5×/2×/5×/10× with a worker-confirmed overlay and captured Review metadata. R-AP-2/R-SIM-9. Follow-up 2026-11-04: Shift+= steps down to 1× in live/Review; focused native browser check and TypeScript pass. Original verification: independent 65-unit/eight-WASM-group/actual-browser checks and shared CI pass, see [review](reviews/2026-11-03-flight-assists.md). README includes an actual live cockpit/terrain screenshot. Aircraft/control gains are unchanged; achievable pacing is best effort and peer remains pending.

- [x] 2.0.48 Research and implement the right-side public-data flight map with M/marked menu access, desktop split view, actual position/retained path, Map/Aerial choice, nautical scale, 731 five-state airfield entries, 144 community beacons plus 66 historical LOC/ILS sources and source/currentness labels. R-WORLD-6/R-NAV-3/R-REVIEW-1. [Source research](research/2026-11-03-flight-map.md); independent source/runtime/browser quality and validation pass, including cold tile/optional-layer failures. [Review](reviews/2026-11-03-right-flight-map.md). Cross-provider peer pending under the existing cadence.

- [x] 2.0.49 Add N-toggle parking brake beside wheel brakes, optional deliberate aileron/rudder link and verified rudder/nosewheel steering. R-INPUT-1/R-REVIEW-1. Local CI/build/typecheck and independent quality/specification checks pass, including compact-label repair and legacy braking regression. [Review](reviews/2026-11-03-parking-rudder.md). Cross-provider peer pending under the existing cadence.

- [x] 2.0.50 Add optional current-scene-centered touchpad yoke with persistent hold-drag view, explicit Escape/new-flight reset and preserved default relative behavior. R-INPUT-1/R-REVIEW-1. Local CI/build/typecheck and independent new/legacy browser, rendered-camera and live-native checks pass. [Review](reviews/2026-11-03-centered-touchpad.md). Cross-provider peer pending under the existing cadence.

- [x] 2.0.51 Add source-driven stall and generic local terrain warnings plus S-controlled stall/terrain and autopilot-disconnect sounds. R-ALERT-1. Local CI/build and independent native/UI, waveform/AP-disconnect and legacy-audio checks pass. [Review](reviews/2026-11-03-flight-warnings.md). Altitude-selection instructions corrected without KAP logic changes; cross-provider peer pending.

- [ ] 2.0.52 Correct engine-off propeller drag in the generic native model; verify settled glide/energy, ignition and mixture cutoff, powered flight and restart with source-pinned model preparation. R-SIM-10/R-ENG-1; exact 172S fidelity remains separate.
  - Partial generic windmilling correction: sourced Aero-Matic tables retain drag in the verified nominal cases; lower-speed idle-throttle flight can still stop the propeller and lose its drag. The full gate remains open; do not extrapolate unverified high-advance coefficients or count that fixture as a pass. See [bounded review](reviews/2026-11-03-engine-off-glide.md).
  - Follow-up: a pinned FlightGear C172P propeller candidate failed actual native low-speed checks and was withdrawn; shipped physics remain unchanged. Shutdown/restart and diagnostic/reset regression coverage was strengthened. [Rejected candidate](research/2026-11-03-engine-off-followup.md).
- [x] 2.0.53 Compact oil pressure/temperature, fuel flow and exhaust-gas readouts onto individual single-line rows; add mirrored lower-quarter model-fuel reference marks and independent LOW indicators with missing-data and read-only Review handling. R-PANEL-1/R-REVIEW-1. Independent desktop/mobile geometry, fuel boundaries and Review checks pass ([review](reviews/2026-11-03-engine-panel-labels.md)); generic display references, not aircraft reserve limits. Peer pending.

- [x] 2.0.54 Animate hinged chase-view rudder, differential ailerons, elevators and flaps from actual live/recorded actuator angles. Make ordinary panel AP clicks engage once. Build and focused native/browser, visible-pixel and replay checks pass. R-VIEW-1/R-REVIEW-1/R-AP-1; original illustrative visual geometry, peer pending.

- [x] 2.0.55 Add JSON recording save/load, read-only imported replay and Back to live restoring prior flying/paused intent. Add comma-key map overlap; retain M map visibility and N parking brake. Build, 30 focused trace/transport cases and end-to-end file/map/native-isolation browser checks pass. R-REVIEW-1/R-VIEW-1; peer pending.

- [x] 2.0.56 Add pointer-centered two-finger cockpit-panel zoom (1–3×), with fitted reset on zoom-out/resize and usable enlarged controls. Build and actual-browser pointer anchoring, AP clicks, camera isolation and paused-state checks pass. R-PANEL-1/R-INPUT-1; peer pending.

- [x] 2.0.57 Prevent near-rest parking-brake settling from falsely latching the illustrative propeller proxy. Preserve native dynamics, actual structure/deeper strikes and high-speed braking collisions. Build, 11 contact tests and actual native/worker braking regression pass. R-SIM-8/R-INPUT-1; peer pending.

- [x] 2.0.58 Route replay Left/Right arrows to bounded one-second seeks regardless of widget focus; add independent playback rate cycling with = and the replay-bar button. R-REVIEW-1/R-SIM-9. Build, focused transport cases and actual-browser seek/speed/native-isolation checks pass; peer pending.

- [x] 2.0.59 Fill the radio stack with equally spaced receiver units and a bottom Stations control; remove the fictional LAB selector from the cockpit. Preserve legacy-recording compatibility and historical NAV controls. Build/typecheck, desktop/mobile layout and historical station/replay checks pass. R-PANEL-1/R-NAV-4; peer pending.

- [x] 2.0.60 Add the left-hand systems panel with modeled switches, digital electrical estimates, source scope, BAT/ALT interlocking, paused operation, recorded replay and narrow-screen dialog access. R-SYS-1/R-PANEL-1/R-REVIEW-1. Build, 30 focused model/trace cases and actual-browser interaction/layout/replay/native-isolation checks pass; peer pending.

- [x] 2.0.61 Constrain panel zoom by available height, retain both gauge rows and bounded horizontal scrolling; refresh the README capture with current controls, horizon and the actual Egelsbach flight path. R-PANEL-1/R-VIEW-1. Build and focused native/browser zoom checks pass; screenshot provenance accompanies the image. Peer pending.

- [x] 2.0.62 Build higher-resolution airport maps and surface overlays so runway/taxiway markings and airport surroundings remain sharp during starts, approaches and landing. Start at EDFE; address visible pixels, texture seams, z-fighting and elevation mismatch. Align source-based runway overlays with physical terrain and navigation references. R-WORLD-2/R-WORLD-3/R-DATA-1. Delivered for the bounded EDFE demonstrator; [source scope and validation](research/2026-11-03-airport-play.md). Peer pending.

- [ ] 2.0.63 Add PAPI and other typical airfield elements: applicable visual approach-slope indicators, runway threshold/edge/end lights, markings, windsocks, taxiways and signs. Use the selected runway's documented installation, placement and approach geometry; do not invent equipment where source data is absent. R-WORLD-3/R-TRAIN-5/R-DATA-1.
  - Partial delivery: source-based vector markings/taxiways/apron and static windsock; optional generic practice PAPI/edge/threshold/end lights work. Actual installed EDFE lighting/PAPI layout and obstacle-clearance verification remain open. No installed-equipment claim. [Sources/limits](research/2026-11-03-airport-play.md).

- [x] 2.0.64 After airport/runway surfaces and references are aligned, add a play mode for taking off and landing from a selected airport and runway. Initialize the aircraft aligned on that runway, at rest with zero ground speed and settled gear on the actual surface; make the initial engine/brake configuration explicit. First demonstrator: EDFE, with repeatable runway selection and restart. R-TRAIN-5/R-SIM-8/R-WORLD-2. Delivered for the bounded EDFE demonstrator; [source scope and validation](research/2026-11-03-airport-play.md). Peer pending.

- [x] 2.0.65 Start and stop the selected airport/runway exercise directly from the map, following the GeoFS interaction concept. Make airport, runway and active exercise discoverable; keep the recorded flight available for Review when the exercise stops. Builds on 2.0.64. R-WORLD-6/R-TRAIN-5/R-REVIEW-1. Delivered for the bounded EDFE demonstrator; [source scope and validation](research/2026-11-03-airport-play.md). Peer pending.

- [x] 2.0.66 Add a selectable vector map/terrain view using public data such as OpenStreetMap and/or OpenFlightMaps, combined with sourced terrain. Keep roads, water, airfields/runways and applicable navigation overlays sharp as the view zooms. Expose the choice in Options/map layers alongside imagery, retain source credits/editions and keep physical elevation and navigation state independent of the visual mode. R-WORLD-3/R-WORLD-6/R-DATA-1. Delivered for the bounded EDFE demonstrator; [source scope and validation](research/2026-11-03-airport-play.md). Peer pending.
  - [x] 2.0.66.1 Correct the terrain option to render full official vector cartography without labels over the existing terrain region, retain the 2D Map/Aerial background, and keep photographs as loading/failure fallback. Verify actual rendered geography outside EDFE against standard mode. R-AIRPORT-1/R-WORLD-3/R-DATA-1.

- [x] 2.0.67 Increase the flying-view vertical area on short desktop windows, retain uniformly fitted cockpit rows and constrain panel zoom; make drag look retain and accumulate in both relative and centered yoke modes, with Escape/restart explicit centering. R-INPUT-1/R-VIEW-1. Peer pending.

- [x] 2.0.68 Add double-click front-view and normal-panel-fit resets, projected L/R/U/D/B aircraft-direction markers, and pointer-focused two-dimensional panel zoom within the existing fixed panel area, with bounded empty top space. Preserve yoke references, control interactions and live/Review state. R-INPUT-1/R-PANEL-1/R-VIEW-1/R-REVIEW-1.

- [x] 2.0.69 Use O for Options and I for the menu/title bar; update labels/help and preserve typing, modal, modifier/repeat and disabled Review guards. R-UX-2/R-INPUT-1.

- [x] 2.0.70 Add period-cycled Off/Places/Landmarks/Detailed OSM labels floating above object anchors on the 3D terrain, with bounded source loading, decluttering, proper credits and safe live/Review/off/failure behavior. R-WORLD-7/R-INPUT-1/R-REVIEW-1.

- [x] 2.0.71 Restore the last live flight location across starts until explicit reset; keep reload paused and exclude Review/collision states. R-UX-5/R-REVIEW-1. See [integrated review](reviews/2026-11-04-flight-location-kap140-cws.md).

- [x] 2.0.72 Correct measured KAP140 climb/capture response and altitude/VS display, and add optional momentary CWS with safe manual override and mode/reference synchronization. R-AP-1/R-INPUT-1/R-REVIEW-1. Historical bounded fixture delivery; current integrated KAP usability is tracked in2.0.111, not accepted by these earlier results.

- [x] 2.0.73 Research world authoring from public map/elevation/building data into high-resolution 3D scenes; compare traditional procedural, LLM-assisted and captured/neural routes. R-WORLD-8/R-WORLD-3/R-AUTHOR-1. [Research](research/2026-11-04-world-authoring.md); [documentation review](reviews/2026-11-04-world-authoring.md). Research completion does not complete the implementation tasks below.
  - [ ] 2.0.73.1 Freeze and build a 2 × 2 km EDFE demonstrator from licensed real terrain/building geometry and curated geotypical materials/vegetation; fly it through the existing renderer, with photographic/map fallback and measured alignment/streaming budgets.
  - [ ] 2.0.73.2 Add a map-based world-authoring preview: extent/source coverage, editable regional rules, deterministic recipe/package export and reviewable community patches.
  - [ ] 2.0.73.3 Compare optional offline LLM-generated recipes against the deterministic baseline on the same source geometry; record corrections, visual consistency, repeatability, time/cost and model/asset rights before selecting a provider.
  - [ ] 2.0.73.4 Evaluate one rights-cleared photogrammetric mesh or Gaussian-splat landmark patch, with actual browser LOD/fallback tests and separate collision/obstacle scope.

- [x] 2.0.74 Show a faint noninteractive active yoke-center marker at the actual neutral pointer reference; preserve relative hold-look anchoring and centered-mode resizing, with off/Review/unavailable hiding. R-INPUT-1. [Review](reviews/2026-11-04-yoke-center-marker.md).

- [x] 2.0.75 Hide extra direction markers near the forward view and show them after significant actual camera separation, with hysteresis; accelerate outer vertical drag to reach true U/D directions while retaining normal central control and look on release. R-VIEW-1/R-INPUT-1/R-REVIEW-1. [Review](reviews/2026-11-04-view-marker-visibility-poles.md).

- [x] 2.0.76 Add native browser fullscreen through F and View, actual enter/exit labels, whole-app panels/dialogs and resize handling, guarded shortcuts and graceful unsupported/rejected requests without flight/replay reset. R-VIEW-1/R-INPUT-1/R-REVIEW-1. [Review](reviews/2026-11-04-browser-fullscreen.md).

- [x] 2.0.77 Add Continue live from an eligible selected replay frame, reconstructing native pose/motion/settings, preserving the earlier path and keeping the original paused flight if initialization fails. Preserve Back to live and explain unavailable frames. R-REVIEW-1/R-SIM-4. [Review](reviews/2026-11-04-replay-continue-live.md).

- [x] 2.0.78 Suppress ground-collision stopping below both 10 kt groundspeed and 2.5 kt downward speed, using pre-impact motion; retain contact diagnostics and wheel physics. R-SIM-8. [Review](reviews/2026-11-04-ground-collision-grace.md).

- [x] 2.0.79 Reveal the hidden top bar before opening Flight from the ground-collision panel; focus the visible Restart action. R-UX-2. [Review](reviews/2026-11-04-collision-flight-menu.md).

- [x] 2.0.80 Add takeoff payload and initial tank parameters through Flight → Weight & fuel, with explicit Apply/restart, actual native mass/fuel-used readouts, fuel-driven mass reduction and recorded loading continuity. R-SIM-11/R-REVIEW-1. [Review](reviews/2026-11-04-aircraft-loading-fuel.md).

- [x] 2.0.81 Research the requested electric, glider, aerobatic, PA-28 and airliner candidates for realistic dynamics and complete cockpit implementation. R-SCOPE-1/R-REUSE-1. [Study](research/2026-11-04-aircraft-feasibility.md); [documentation review](reviews/2026-11-04-aircraft-feasibility.md). Research only: no new aircraft selected, integrated or fidelity-accepted.

- [x] 2.0.82 Add bounded distance-based scenery warming and persistent public-tile caching, including terrain hash identities and enabled-level landmark radii. R-WORLD-9/R-WORLD-5/R-WORLD-7. [Design](design/scenery-cache.md); [review](reviews/2026-11-04-scenery-cache.md). Actual cache and existing native landmark browser checks pass; no expanded source or physical terrain coverage.

- [x] 2.0.83 Use fixed BKG WMTS tiles and independent prioritized map/photo work so visible Flight map requests bypass background queues. R-WORLD-6/R-WORLD-5. Eight focused proxy cases and TypeScript pass; actual Flight map readiness observed at 2.138 s on the local server, not a guaranteed cold-application budget.

- [x] 2.0.84 Expand physical terrain to 108 actual DGM200/GCG tiles over 7–10°E / 49.25–51.5°N, update streaming/rendering/persistence and add Westerwald, Marburg/Lahn and Kassel Flight presets. Extend Hessen photography with honest map fallbacks. R-WORLD-5. Original 42 tile bytes remain unchanged; new manifest/seams and native heights verified.

- [x] 2.0.85 Add Flight map chart access to OFM Germany VFR and official DFS AIP airport/approach sources, preserving selected airport reference. R-CHART-1. Publisher-hosted access only.
  - [ ] 2.0.85.1 Obtain complete applicable OFM/product or alternative chart rights and edition metadata, then embed a licensed airspace/chart layer with the flown path; procedure-plate embedding remains source-specific. Database permissions alone do not establish raster/plate rights.

- [x] 2.0.86 Add right-click place lookup when landmark labels are enabled: terrain picking, nearest source name/distance, bounded cached requests, cancellation and honest sky/empty/unavailable states. Preserve yoke gestures, including Mac Ctrl-click. R-WORLD-7/R-INPUT-1.

- [x] 2.0.87 Let outside clicks dismiss Options without saving; retain changes only with Save, restore opening values on Escape too, and preserve inside/slider gestures. R-UX-2.

- [x] 2.0.88 Enable the existing bank/rudder/nosewheel link by default for touchpad steering; keep manual rudder priority and the option to disable it. R-INPUT-1.

- [x] 2.0.89 Drag zoomed cockpit backgrounds/headers to reach all edges, including lower controls; remove automatic focus panning and preserve native control gestures, bounds and double-click reset. R-PANEL-1/R-INPUT-1.

- [x] 2.0.90 Remove duplicate View → Aircraft systems; retain the left systems panel and its collapsed direct opener on narrow screens. R-SYS-1.

- [x] 2.0.91 Restore camera-visible photography under caching: retain native photo cancellation, cancel obsolete warming, isolate foreground demand and verify real public photo loading. R-WORLD-5/R-WORLD-9.
- [x] 2.0.92 Fix the generic autopilot overwriting nosewheel steering; retain source gear geometry/friction and verify actual low-speed turns plus runway takeoff. R-INPUT-1/R-PLAY-1.
- [x] 2.0.93 Restore real map-terrain rendering by protecting worker downloads; expose View and Alt+Shift+J, synchronized with Options and Flight map. R-AIRPORT-1/R-INPUT-1.
- [x] 2.0.94 Show actual ARM/ARMED state and explain selector autoarming/cancel behavior; verify native panel engagement, arming and VS commands. R-AP-1.

- [x] 2.0.95 Let collision ×/Continue resume the same native aircraft state; acknowledge current contact bits until separation, preserve recording history and re-arm new/later contacts. R-SIM-8/R-REVIEW-1.
- [x] 2.0.96 Put Takeoff, Landing and Fly a circuit first in Flight with runway choice, real launch actions and secondary research tools; preserve the selected landing setup on Restart. R-PLAY-1/R-UX-2.
- [x] 2.0.97 Organize Options into Controls, Scenery, Sound and collapsed Advanced; retain settings, Save/cancel rollback and desktop/mobile access. R-UX-2/R-INPUT-1.

- [x] 2.0.98 Suppress collision stopping when native wheel support already existed before the current step; retain airborne first-impact detection, raw diagnostics and native ground reactions. R-SIM-8. Fourteen contact cases and the existing ten-group actual braking browser pass; full-brake flat/public rolls match unchanged native state exactly. Peer pending.

- [x] 2.0.99 Keep the steering-center circle and selected yoke reference through Start/resume, pause, AP capture and routine menu/panel interactions; neutralize axes separately from explicit steering cancellation. R-INPUT-1.

- [x] 2.0.100 Keep AP engaged when moving the touchpad from A capture to ARM/other cockpit controls, including the acknowledgement interval; retain steering marker, explicit manual takeover and CWS. Surface rejected AP commands. R-AP-1/R-INPUT-1.

- [x] 2.0.101 Default the steering neutral point and circle to the center of the visible flight window, excluding cockpit and docked map; preserve explicit relative-mode choice and AP/control retention. Record unpredictable regressions and inadequate module isolation in Insights. R-INPUT-1.

- [x] 2.0.102 Fix edited-altitude → ARM losing its own auto-arm on the same click while HDG/ALT stay engaged; preserve subsequent ARMED cancellation and knob/keyboard semantics. R-AP-1.

- [x] 2.0.103 Make A toggle AP: capture current heading/altitude when off, disconnect when engaged or capture is pending; keep P/panel controls and input guards. R-AP-2.

- [x] 2.0.108 Remove the generated Option/Alt–Shift shortcut catalogue; comma opens/closes the map, period cycles landmarks, and overlap remains click-only. Correct menu/help text and preserve assigned flight keys. Supersedes shortcut assignments in2.0.55/2.0.93. R-WORLD-6/R-WORLD-7/R-UX-2.
- [x] 2.0.109 Apply exclusive vector/photo terrain to the running checkout, restore independently owned dependencies, and verify real cartography with all photo layers hidden across late arrival. R-AIRPORT-1.

- [x] 2.0.110 Correct the reproduced paused A/ALT stale-VS display: ALT immediately restores editable selected altitude while preserving intentional BARO timing. Verify direct altitude entry → ALT → UP/DN, visible VS/FPM/ALT ARM and a powered native climb/capture through actual cockpit controls. R-AP-1/R-AP-2; bounded engineering fixture, not complete KAP acceptance. It observed the temporary VS page and did not resolve the persistent numeric VS requirement in2.0.112.
- [ ] 2.0.111 Resolve the broader current KAP usability report against source-backed user workflows and the running app. Earlier injected-panel, direct-native and limited browser passes do not establish complete integrated behavior. Keep active/armed modes, display, commands and manual/servo handover coherent; full installed fidelity remains in2.0.14. R-AP-1/R-AP-2.

- [x] 2.0.112 Keep a readable numeric commanded VS visible throughout active VS flight, alongside target altitude after the temporary shared page expires. Verify actual display after sustained flight, not only immediately after UP/DN. Prior2.0.110 does not resolve this persistent-display requirement. R-AP-1.

- [x] 2.0.113 Apply the user’s exact map bindings: M map, comma larger map, period terrain labels, US slash vector/photo. Preserve guards and trim reset button, remove the conflicting slash trim binding, and record AI overreach in settled UI/UX decisions in Insights. Supersedes the key assignment in2.0.108; comma’s larger-map behavior is later replaced by2.0.116. R-WORLD-6/R-WORLD-7/R-UX-2.

- [x] 2.0.114 Improve scenery cache reuse: incremental persistent-cache bookkeeping, no per-hit rewrites/global save waits, stable nearby warm plans, visible-vector queue promotion and bounded64MiB coalesced render reuse. R-WORLD-9/R-WORLD-4. Browser/source evidence covers repeat loading; remaining cold upstream/rendering time is not declared resolved.

- [x] 2.0.115 Preload a bounded nearby map/vector seed set after actual native readiness, including saved starting positions, without blocking Start, stepping physics or changing the visible mode. Preserve existing cache/concurrency/guard behavior. R-WORLD-9.
- [x] 2.0.116 Give the collapsed flight map almost the full front-window height with compact view controls, and use comma for an extended search/detail menu below it over the right cockpit panels without resizing the map. M still toggles the map. R-WORLD-6/R-UX-2.
- [x] 2.0.117 Open airport/NAV/fix marker details on the map, with validated COM1/2 and NAV1/2 standby actions, unified extended-menu search and visual GPS map targets. Include2739 licensed historical2013.10 fix rows with source/age/duplicate identity intact; no current AIRAC/GPS receiver/AP guidance acceptance. R-WORLD-6/R-NAV-3.
- [x] 2.0.118 Correct panel zoom at the lower controls: retain the instrument point under the pointer except where edge clamps require movement; keep enlarged content top at or above the frame top and bottom at or below the frame bottom, with both edges reachable and no control-triggered pan. R-PANEL-1. [User request](input/2026-11-04-panel-bottom-zoom.md).
- [x] 2.0.119 Add independent location-type checkboxes for airfields, helipads, NAV aids, fixes and other published categories; apply the same selection to map markers and directory results. R-WORLD-6. [User request](input/2026-11-04-map-location-filters.md).
- [x] 2.0.120 Extend terrain and fixed public scenery sources across five southern German states, retaining source gaps and bounded native/rendered streaming. R-WORLD-10. [Source scope](design/five-state-world.md). Historical evidence remains distinct from renewed modular-branch review.
- [x] 2.0.135 Provide a bundled coarse worldwide terrain fallback, valid regional priority, world position bounds and selected-neighborhood Review reconstruction. R-WORLD-11. [Request](input/2026-11-05-world-terrain-fallback.md). Modular source reconstruction requires renewed integrated review; no new global DEM service or aircraft fidelity acceptance.
- [x] 2.0.141 Supply detailed labeled global OSM cartography consistently in the 2D map and 3D vector terrain, retaining regional photography and source credits. R-WORLD-11. The opaque regional map overlay stays inactive; independent map color-choice UI and flight-plan card changes belong to later increments.


- [x] 2.0.155 Predict approaching terrain-window changes and warm the flight-direction corridor using measured ground motion and simulation rate; preserve foreground priority, source validation, bounded residency and reset/Review isolation. R-WORLD-9/R-WORLD-11/R-SIM-2. [Request](input/2026-11-05-predictive-terrain-loading.md).

- [x] 2.0.156 Keep the simulation/replay speed badge visible above the open flight map, preserving map interaction and menu/dialog priority. R-SIM-9/R-UX-2. [Request](input/2026-11-05-speed-overlay-map.md).
- [x] 2.0.157 Remove regional bounds from custom GPS fixes, route points and editor/manual/map-pick validation; preserve invalid-input atomicity, capacities, source provenance and native-state isolation. R-NAV-5/R-WORLD-6. [Request](input/2026-11-05-france-gps-fix.md). The modular source/editor increment does not itself wire the complete published map UX.

- [ ] 2.1 Milestone 2 scope (GAPS Q23, 2026-11-02): circuit flight, sensed checklist items, static scenario briefing, engine/fuel indications in `ind`; text radio in phase 3. Orchestrator dispatches explicit requirement IDs, criteria and disjoint write sets to both coders; starts housekeeping alongside them.
  - [x] 2.1.1 Deliver a bounded EDFE runway-practice briefing and sensed flight-event log: north/right-hand 26 and north/left-hand 08, explicit idle/parked setup, native wheel-contact takeoff/landing observations and ground stop/collision, retained with cursor-correct Review. R-PLAY-1/R-TRAIN-2/R-REVIEW-1. No checklist, circuit grading, official route or complete scenario/weather briefing acceptance; those remain open in 2.1 and 1.5. Peer pending.
  - [x] 2.1.2 Preserve declared EDFE runway context in version-1 JSON recordings; restore the imported briefing/event log from its own trace, keep legacy context unknown, reject malformed metadata and return to the unchanged live flight. R-PLAY-1/R-REVIEW-1. Aircraft/weather provenance, other airports and complete scenario packages remain separate; peer pending.
  - [x] 2.1.3 Add a sensed simulator runway-start setup checklist with actual engine, applied brakes/throttle, flap, launch-trim, AP and model-switch indications; distinguish match/difference/missing data and unsupported checks. Use the selected recorded frame in Review without changing aircraft settings. R-PLAY-1/R-TRAIN-4/R-REVIEW-1; generic start-reference subset, not a full aircraft checklist or readiness grade.
  - [x] 2.1.4 Add an optional generated EDFE north-circuit map guide for 08/26, full-guide fitting and a nearest-segment readout from the selected live or recorded position. Preserve actual/unknown context and native-state isolation; declare approximate source geometry and instructional dimensions without route/altitude/speed/obstacle or circuit-grade claims. R-PLAY-1/R-TRAIN-5/R-WORLD-6/R-REVIEW-1.
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

- [ ] 2.0.153 Investigate and repair reported roll-off/oversteering. [Merged PR86](https://github.com/gregoryyy/gefly/pull/86) removes inappropriate fresh loading, fixed correction and default rudder coupling, with bounded diagnostics and independent reviews. Overall handling remains unresolved: complete prior/new results are mixed,110kt trim fails, native build provenance and external peer acceptance remain blocked. R-INPUT-1/R-SIM-5/R-SIM-11. [Request](input/2026-11-05-control-stability.md); [comparison](research/2026-11-05-control-stability-app-comparison.md). [Renewed report](input/2026-11-06-handling-regression.md) confirms sensitivity and instability after release. The merged app startup restored a hidden nonzero roll offset despite the zero slider; a bounded zero-start app repair passes actual browser/CI and independent checks; remaining raw-model stability, root behavior and fidelity limits stay open. [Diagnosis](research/2026-11-06-neutral-controls-regression.md). The bounded centered-pointer resize handoff is repaired and independently checked; see [source and checks](research/2026-11-06-yoke-resize-handoff.md). Wider native handling remains open.
- [x] 2.0.154 Repair 3D vector loading starvation and unnecessary live-window globe invalidation with two source-aligned roots, bounded safe updates and strict height/provenance guards. R-WORLD-11/R-WORLD-9/R-SIM-2. [Request](input/2026-11-05-vector-terrain-loading.md); [reload follow-up](input/2026-11-05-vector-terrain-reload.md); [bounded evidence/limits](research/2026-11-05-vector-terrain-performance.md). Conservative source-change/capacity rebuilds and broader fidelity/device gates remain explicit.

- [x] 2.0.158 Repair artificial detailed/coarse exterior terrain walls while preserving exact atlas/contact heights, bounded history and safe live updates. R-WORLD-2/R-WORLD-11/R-SIM-2. [Report](input/2026-11-05-alps-terrain-walls.md).
- [ ] 2.0.160 Design coherent physical transitions when an optional fine-source owner fails inside a live window; the injected physical-source discontinuity is outside the exterior rendering repair. R-WORLD-11/R-SIM-2.
- [ ] 2.0.161 Diagnose the reported all-flat Hessen view after rebuild; fresh current normal-flight native/GPU relief is correct, but the user observation remains unreproduced. R-WORLD-2/R-WORLD-11/R-SIM-2. [Report](input/2026-11-05-hessen-elevation-rebuild.md).

- [ ] 2.0.150 Integrate bounded Copernicus GLO-30 native world30 elevation with regional priority, nine cells/512 owner outcomes, source-quality metadata, legacy-quarter identity compatibility, strict shared-source service and unchanged native engine. R-WORLD-11/R-SIM-2/R-REVIEW-1. [Decision](input/2026-11-05-copernicus-integration.md). Modular native/data foundation; distant display client is separate Task162. Native/data foundation is independently checked and modularly published; complete terrain-experience gates remain partial, including Task160. Wider display client is separate Task162.
- [x] 2.0.162 Add bounded distant display elevation and retain the scenery provider through ordinary overview-window changes, with exact native contact, immutable source history, settled capacity fallback, metadata-only refresh and public refinement budgets. R-WORLD-11/R-WORLD-9/R-SIM-2. [Report](input/2026-11-05-cape-town-flat.md); [reload correction](input/2026-11-06-south-africa-terrain-reloads.md); [bounded validation](reviews/2026-11-06-terrain-overview-validation.md).880simulated seconds/two crossings/zero subsequent replacements and all measured queues pass; source/fidelity/lifecycle limits remain explicit, peer pending. The initial per-batch whole-provider reset is rejected; retain scenery across ordinary overview windows and verify GPU heights/queues rather than counters alone. [Reload report](input/2026-11-06-south-africa-terrain-reloads.md).

- [x] 2.0.159 Repair confirmed high-altitude startup pressure gating: preserve supported QNH/STD indications and raw launch QFE in recording/continuation, explain unsupported QFE selection and retain unavailable sensor/envelope safeguards. R-AIR-3/R-SIM-2. [Report](input/2026-11-05-alps-terrain-walls.md).

- [x] 2.0.163 Add hold C for existing momentary CWS with shared keyboard/panel ownership, discoverable help, guarded activation and safe lifecycle release. Preserve AP modes/reference synchronization and native physics. R-AP-1/R-INPUT-1. [Request](input/2026-11-06-cws-keyboard.md). Eight browser groups, six helper and18 existing KAP tests, CI and bounded independent reviews pass; source-inspected/unexercised contexts remain explicit in [validation](reviews/2026-11-06-cws-keyboard-validation.md). Cross-provider peer pending.
