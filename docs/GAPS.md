# Questions, assumptions and decisions

All times are Europe/Berlin. Answers record the author and recording time. New answers go above older answers; strike through earlier answers without deleting them. When resolved, carry the decision into its authoritative document and retain a Resolved line here. A proposal or elapsed waiting time is not a user answer. The orchestrator asks only questions that affect the current work and continues independent tasks.

## Resolved questions

### Q1. Initial aircraft and training framework

Why: determines source applicability, exercises and assessment. Proposed: Cessna 172, EASA PPL first. Blocking: foundation aircraft/curriculum selection, not project setup.

Answer: **2026-10-31 14:53, user** (recorded by orchestrator): “Cessna 172, EASA PPL first”.

Resolved: 2026-10-31 14:53, user; reflected in [IDEA](IDEA.md), [SPEC](SPEC.md) and [ARCH](ARCH.md). Exact aircraft configuration remains Q3.

### Q2. Initial platform

Why: determines rendering, deployment, input APIs and performance tests. Proposed options included browser or native desktop.

Answer: **2026-10-31 14:53, user** (recorded by orchestrator): “as a web application, similar to geo-fs”.

Resolved: 2026-10-31 14:53, user; reflected in [IDEA](IDEA.md), [SPEC](SPEC.md) and [ARCH](ARCH.md). This does not select a graphics library or authorize reuse of GeoFS assets.

### Q6. GitHub destination and collaboration setup?

Why: publication needs an authenticated account, a new repository and explicit
public visibility. The user has now authorized the initial commit/create/push.

Answer: **2026-10-31 15:29, user** (recorded by orchestrator): “when the first project
structure and initial content is ready, commit and push to a novel public repo”.

Selection: **2026-10-31 15:29, orchestrator**: `gregoryyy/gefly`, using the authenticated
GitHub account. GitHub lookup confirms no repository of that name exists before
creation. Initial default branch: `main`; actual creation/push outcome is recorded
in DONE/RESULTS, without changing any existing remote repository.

Publication verified: **2026-10-31 15:33, orchestrator**. Created the new
[public repository](https://github.com/gregoryyy/gefly); GitHub reports PUBLIC,
nonempty, default branch `main`. `git push -u origin main` succeeded and
`git ls-remote` matched initial commit `2b4d76f90e1eaed2c5c3e352ef839e271135e328`. Final repository checks and
any bootstrap verification follow-up are recorded in DONE/RESULTS.

Superseded pending-destination status: ~~2026-10-31 15:15, user direction:
free/open-source project; account/organization and destination pending.~~

Resolved: 2026-10-31 15:29, user authorization and orchestrator destination selection;
carried into README, SBOM and TODO 0.8.1. No remote mutation had occurred when
this selection was recorded.

### Q4. First supported controls and browser/device baseline?

Why: fixes the first required platform/input experience and optional peripherals.

Answer: **2026-10-31 15:40, user** (recorded by orchestrator): “mac desktop, controlled via
keyboard and touchpad, optionally connected landing gear, rudder and ailerons.
reuse geo-fs settings”.

Clarification: **2026-10-31 15:40, user**: “Yoke/joystick and rudder pedals only”. This
resolves the hardware wording: required Mac desktop keyboard/touchpad, optional
yoke/joystick and rudder pedals; no external landing-gear switch selected.
Reuse GeoFS's control/settings model conceptually, as sourced in
[CONTROLS](design/CONTROLS.md). Mobile orientation remains later.

Resolved: 2026-10-31 15:40, user; carried into SPEC, CONCEPT, ARCH, CONTROLS, TRAINING,
ROAD, EVAL and TODO. Exact reference Mac, macOS/browser versions, peripheral
models, settings details and measured budgets remain foundation implementation
choices in TODO 1.2.1; they were not selected by this answer.

### Q18. Contracts v1 open questions (O-1..O-9)

Why: TODO 1.4 contracts must be agreed before parallel product coding.

Answer (O-3 datum): **2026-11-01 13:59, user** ([input](input/2026-11-01-datum-runway-poh-decisions.md)):
“yes to proposals”. JSBSim runs on DHHN2016 physical heights treated as its
ellipsoid height; ellipsoidal heights are computed outside the dynamics with GCG2016
in Germany and EGM2008 elsewhere ([CONTRACTS](design/CONTRACTS.md) §1).

Answer: **2026-11-01 13:00, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-contracts-decisions.md)): “accept all, 8 start at hold
point”. Decided: display-only interpolation with a 60 Hz state stream (never in
digests or replay); WMM2025; JSBSim height datum to be established by research
before choosing the geoid; per-step FNV-1a 64 plus SHA-256 checkpoints every 120
steps; review seek by re-simulating from step 0; optional recorded trace with the
input log authoritative; 172S control list from POH Section 7 by research (cited,
not copied); the paired-iPhone profile stays in TODO 1.13; the first exercise
starts at the runway holding point (see Q7).

Resolved: 2026-11-01 13:00, user; carried into [CONTRACTS](design/CONTRACTS.md), Q7 and [TODO](TODO.md) 1.4/1.5.

### Q17. Which dynamics engine and web stack (E1)?

Why: TODO 1.2 needs a reuse-first engine and browser stack decision (R-REUSE-1).

Answer: **2026-11-01 11:38, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-e1-decisions.md)): “yes accept lgpl, skip contacting, pr,
jsbsim, check yes, pr”.

Decided: **JSBSim** is the dynamics engine (evidence: [JSBSim study](../studies/e1-jsbsim/README.md),
[candidate survey](research/2026-11-01-e1-engine-stack-candidates.md)). Its
**LGPL-2.1-or-later license is an accepted copyleft exception** under Q5; it is used
as a separately replaceable library (WASM module) to keep LGPL relinking obligations
and later relicensing manageable. JSBSim's bundled C172 aircraft data is **not**
shipped; a project-owned 172S model is built from sourced data (E2). No outreach to
the JSBSim/FlightGear teams. Still proposals until the browser check on the
reference M1/Chrome (TODO 1.2.1/1.2.3): WASM in a Web Worker at a fixed 1/120 s step,
replay by re-running logged inputs on the same build, CesiumJS (hosted-service token
disabled) with three.js fallback, MapLibre for 2D maps, TypeScript.

Resolved (engine): 2026-11-01 11:38, user; carried into [ARCH](ARCH.md), [SBOM](SBOM.md),
[TODO](TODO.md) 1.2 and AGENTS.

### Q16. Reference Mac, browsers and optional paired-phone control?

Why: TODO 1.2.1 needs a measured reference platform for timestep, latency and
frame budgets, and the optional input profiles.

Update: **2026-11-01 13:28, user** ([input](input/2026-11-01-no-external-monitor.md)): no
external monitor. The 120 Hz refresh therefore came from the built-in panel, which
together with the renderer string identifies a 14-inch MacBook Pro with Apple M1 Pro.
Results stay attributed to the measured hardware (Apple M1 Pro, 120 Hz built-in);
About This Mac can confirm the chip.

Update: **2026-11-01 13:28, user** ([input](input/2026-11-01-mac-model.md)): “late 2020
macbook pro 14””. Orchestrator note: Apple's late-2020 MacBook Pro is the 13-inch M1
(60 Hz); the 14-inch MacBook Pro (late 2021) has an M1 Pro or M1 Max and a 120 Hz
ProMotion display, which matches the recorded renderer string and refresh. Pending
the user's check (Apple menu → About This Mac), results are attributed to the
renderer-reported **Apple M1 Pro, 120 Hz**; the reference-platform name in Q16 stays
"MacBook Pro (Apple silicon)" until confirmed.

Confirmation: **2026-11-01 13:25, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-chip-confirmation.md)): “M1 not pro”. The reference Mac is
an Apple M1. Observation to reconcile: Chrome's WebGL renderer string on the
recorded runs reported "Apple M1 Pro", and the display measured 120 Hz, which the
13-inch M1 MacBook Pro's built-in panel does not provide (an external 120 Hz display
would explain it). Results keep the reported strings; budgets scale to the measured
refresh.

Answer: **2026-11-01 11:00, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-reference-platform.md)): “macbook pro m1, latest macos,
webkit browsers esp. chrome latest. optional controls: bind orientation from
paired iphone”.

Recorded: reference **MacBook Pro (Apple M1)** on the **current macOS release**;
**Chrome (latest stable) as primary browser**; Safari secondary is an orchestrator
assumption from “webkit browsers”, to be confirmed. Orchestrator note:
desktop Chrome uses the Blink engine, not WebKit; Safari is the WebKit browser, so
both are listed. "Latest" is pinned to exact versions whenever a measurement is
recorded. New optional control: **device orientation from a paired iPhone**
driving the Mac session (R-INPUT-3), in addition to the existing optional
yoke/joystick/pedals profile; no specific peripheral models were named.
Still open: transport (e.g. local WebRTC/WebSocket), pairing method, latency
budget and iOS browser/app choice.

Resolved: 2026-11-01 11:00, user; carried into [SPEC](SPEC.md) R-INPUT-1/R-INPUT-3,
[SEC](SEC.md), [CONTROLS](design/CONTROLS.md) and [TODO](TODO.md) 1.2.1/1.13.

### Q11. Which briefing data mode ships first?

Why: determines the initial data dependency, scenario repeatability and later
live-service boundary.

Answer: **2026-10-31 15:40, user**: “as proposed”. Accepted proposal: **versioned scenario
briefings first**, explicitly labeled historical/generated data, with a **later
optional live adapter**. Initial exercises do not require a live feed.

Resolved: 2026-10-31 15:40, user; carried into SPEC R-BRIEF-1, ARCH, CONCEPT, TRAINING,
ROAD, EVAL and TODO. Evaluate historical/generated report/NOTAM validity against
scenario time; preserve data/condition snapshots for replay. Exact source/provider,
coverage, rights and live rollout remain future implementation selections.

### Q5. Source license and third-party data policy?

Why: affects code reuse, distribution, aircraft manuals, avionics depictions, maps and navigation data. The user's direction is now free/open source; select a compatible open-source license and review separately licensed assets/data. Blocking: license-dependent distribution and restricted asset ingestion.

Confirmation: **2026-11-01 07:08, user** (recorded by orchestrator, Claude Code;
[confirmations](input/2026-11-01-confirmations.md)): “gpl3+” — GPL-3.0-or-later,
not GPL-3.0-only.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“gpl 3 for the project now, can adjust later. third party policy: non-proprietary
licenses, with preference for permissive licenses so gpl3 can be relaxed later”.

Recorded as **GPL-3.0-or-later** for original project material, matching the
Propeller-derived files already distributed on those terms. Third-party policy: dependencies, models, data and assets must
use non-proprietary (open-source or open-data) licenses; **prefer permissive**
licenses (e.g. MIT, BSD, Apache-2.0, public domain/CC0, CC-BY). *Orchestrator
proposals implementing this policy, pending user confirmation:* copyleft components
(e.g. LGPL, GPL, ODbL share-alike data) need a recorded justification, because they
would constrain a later relaxation; non-commercial/no-derivatives material is not
distributed, only referenced; reading "non-proprietary" as OSI-approved software
licenses and open data/content licenses is also an orchestrator interpretation.
Exception accepted 2026-11-01: JSBSim engine (LGPL-2.1-or-later), see Q17.
Note: a later relaxation needs permission from every copyright holder, including
the upstream Propeller holders for the derived files (or their replacement); a DCO
alone does not grant this, so contributor terms that keep the option open remain to
be chosen (TODO 1.11).

~~Answer: partial update, **2026-10-31 15:15, user**: “The idea is to make this free
and open source”. Exact code license, contributor terms and asset/data compatibility
remain pending.~~ Owner: orchestrator. [SBOM](SBOM.md) records source provenance.

Resolved: 2026-11-01 07:04, user; carried into `LICENSE`, README, THIRD_PARTY_NOTICES,
[SPEC](SPEC.md) R-OPEN-1, [SBOM](SBOM.md) and [TODO](TODO.md) 0.9. Contributor terms and per-asset rights stay open in
TODO 1.11 and R-DATA-1.

### Q12. Community publication and content roles?

Why: the requested free/open-source flight-school community needs hosting, public
content/contribution rules, learner/instructor roles, review labels and moderation.
Proposed: a reusable exercise library and discussion/debrief workflow first;
specific roles and sequencing remain proposals. Blocking: community deployment,
not simulator or source-research studies.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“community publishing: rules and roles follow later in phase 3.” Deferred: the
publication rules, roles, moderation and hosting are scoped during roadmap
phase 3, not before (orchestrator mapping to [ROAD](ROAD.md) phase 3). Orchestrator
consequence: no community workflow is enabled until then.

Answer: direction confirmed **2026-10-31 15:15, user**: community site similar to
GeoFS, more flight-school oriented, free/open source. ~~Hosting, data retention,
moderation, contribution workflow and funding/operating model remain pending.~~
(Now deferred to phase 3, above.)

Resolved (deferred): 2026-11-01 07:04, user; carried into [ROAD](ROAD.md), [SPEC](SPEC.md) R-COMMUNITY-1 and [TODO](TODO.md) 1.11.

### Q15. Which changes need the cross-provider peer gate?

Why: the peer gate (R-AGENT-7) needs the other provider's CLI and adds cost and
latency; applying it to every PR blocks small documentation changes.

Answer: **2026-11-01 07:22, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-peer-gate-scope.md)): “again, not all prs need the
adversarial check (different provider)”.

Answer: **2026-11-01 11:54, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-proclens-peer-logic.md)): “get the peer review and hooks
logic from proclens”. Adopted proclens's review-gate logic: the peer review runs
**every few PRs** (batched), whenever a machine with the other provider's CLI is
available; one review covers every change merged since the last peer-reviewed
revision; merged work in between is marked **peer pending**, not blocked. Packet
egress rule added. proclens has no hooks, so none were adopted. The scope below is
kept only as the list of changes a batched review must have covered before a
milestone is accepted or a release is made.

~~Scope (orchestrator interpretation, correctable by the user): **required** for
integrated milestone results, changes to simulation/dynamics, aircraft or
navigation data, avionics, training assessment, security-relevant code or agent/
peer tooling, and release candidates. **Not required** for documentation-only
decision recording, research notes, bookkeeping and editorial fixes. The
orchestrator states in each PR whether the gate applies and why; the user can
request a peer review on any PR. Local quality/validate remain proportionate to
the change.~~

Resolved: 2026-11-01 11:54, user (supersedes the 07:22 per-PR scope); carried into SDLC, AGENTS, SPEC R-AGENT-7, the
[agent workflow](agents/README.md), [peer](agents/peer.md) and the PR template.

## Open questions

### Q3. Which Cessna 172 variant, year and avionics fit?

Why: operating limits, engine/propeller, systems, instrument ranges and procedures must refer to one applicable configuration. Proposed: research availability and redistribution rights for a specific C172S configuration before recommending a conventional panel or glass cockpit. Blocking: TODO 1.3 and aircraft-specific implementation; generic studies may continue.

Answer: **2026-11-01 10:27, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-first-172s-configuration.md)): “sure.” First configuration:
**Cessna 172S, serials 172S9491–172S9809, classic panel** (before the NAV III/G1000
option at 172S9810), per the [172S/FR172 sources](research/2026-11-01-c172s-fr172-sources.md).
Still open: exact avionics/radio fit and flight-manual revision to model, and the
FR172 sub-model once FAA A18EU is read.

Confirmation: **2026-11-01 07:08, user** (recorded by orchestrator, Claude Code; [confirmations](input/2026-11-01-confirmations.md)): “gpl3+, yes, yes”. The user confirms the *it depends on the data* reading and the
order: **classic-panel 172S first, FR172 second** when its data suffice.

Answer: partial update, **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“FR172 and/or 172S with their different engine configs to show performance
differences. it fried on the actual data available, but from public FAA
documentation we should have a fairly good picture”. Reading: *it depends on*
the available data. Candidate set: **Reims FR172** and **Cessna 172S** (their engine/propeller
configurations are unverified here and must be sourced in TODO 1.3), modeled as
distinct configurations so learners can compare performance. Primary public
sources: FAA type certificate data sheets and other public FAA/EASA records;
FR172 is a Reims-built model, so its EASA/French certification records may be
needed alongside FAA material. Proposed by orchestrator and confirmed by the user at 07:08: a classic-panel 172S before the factory glass-cockpit fit as the
first configuration, then FR172 when its data suffice. Still open: exact
sub-models/years/serial ranges, engine/propeller, avionics fit (the 172S-first order
holds unless the data research contradicts it). Manufacturer POH/AFM text remains copyrighted; extract facts with source
references, without copying manuals (R-DATA-1). Source survey:
[172S/FR172 sources](research/2026-11-01-c172s-fr172-sources.md): leads point to FAA
TCDS 3A12 (172S) and A18EU (FR172E–K); FAA/EASA hosts were unreachable, so all
values remain unverified. Update after network access was enabled: 172S values
verified against EASA TCDS IM.A.051 Issue 11 (stated equivalent to FAA 3A12 Rev 88)
and a public copy of FAA 3A12 Rev 80 (IO-360-L2A 180 hp, McCauley 1A170E/JHA7660,
2,550 lb; page-cited). The Cessna NAV III (G1000) manual starts at 172S9810, so
172S8001–9809 are classic panel. Researcher proposal, accepted by the user at 2026-11-01 10:27: first
configuration 172S9491–9809. FR172 (A18EU) still unverified: FAA DRS refused
non-browser downloads. JSBSim has no 172S/FR172 model, and its C172 files carry
mixed LGPL/GPL and "not to be sold" terms needing a Q5 rights decision.

Answer: partial update, **2026-10-31 15:09, user** (recorded by orchestrator):
“Classic instruments first, glass later”. The exact variant/year and conventional
instrument/radio fit remain pending. Owner: orchestrator, informed by researcher
and product. Glass is a later configuration; A320 is a reference, not an initial type.

### Q7. First useful learning exercise and review partner?

Why: determines whether the first slice is aircraft handling, instrument interpretation or a procedure, and how training claims can be reviewed. ~~Proposed: a bounded straight-and-level control/trim exercise, then coordinated turns;~~ (superseded by the 2026-11-01 answer below) product should refine objectives against the selected EASA syllabus with instructor review. Blocking: milestone 2 exercise acceptance, not generic physics experiments.

Answer: **2026-11-01 13:59, user** (recorded by orchestrator, Claude Code; input record
`docs/input/2026-11-01-datum-runway-poh-decisions.md` on branch design/contracts-1-4):
“yes to proposals, no instructor reviewer yet, go with what we learn from research”.
Exercise 01 uses **runway 26** (proposed default) with the standard north circuit
(right-hand for 26, per operator material); **no instructor reviewer** for now, so
criteria stay labelled source-based or instructional proposals and are refined from
research; POH values (ASI calibration, performance) may be extracted as cited facts
without copying tables.

Answer: **2026-11-01 13:00, user** (recorded by orchestrator, Claude Code;
[input](input/2026-11-01-contracts-decisions.md)): “8 start at hold point”. The first
exercise **starts at the runway holding point with the engine running**; engine
start and taxi come later. This resolves the earlier orchestrator reading of
“start” as take-off.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“first learning exercise is start fly a pattern and land”. The first exercise is a
complete **circuit: take-off, traffic pattern and landing** at the first airport
(Q10) (orchestrator reading of “start” as take-off and of the airport link; the
user may include engine start/taxi), replacing the earlier straight-and-level proposal. Still open: runway and
pattern direction from sourced aerodrome data, assessment criteria/tolerances
(TODO 1.5) and the instructor review partner. Owner: product proposes criteria;
orchestrator resolves with user.

TODO: needs resolution.

~~Answer: pending.~~

### Q10. Which first training region, airport and runway?

Why: determines geography, elevations, navigation/briefing coverage and source rights.
Blocking: verified region geometry, selected training-airport/runway fixtures and
source-specific acceptance; the region direction itself is resolved.

Answer: **2026-11-01 07:04, user** (recorded by orchestrator, Claude Code; [2026-11-01 answers](input/2026-11-01-aircraft-license-exercise-answers.md)):
“first airport is egelsbach in germany”. First airport: **Frankfurt-Egelsbach
(ICAO EDFE)**, inside the EDDF 100 NM region. Still open: runway(s), circuit
pattern, elevation, frequencies and chart sources with editions and rights,
verified against official AIP/aerodrome publications (TODO 1.7). Source survey:
[EDFE sources](research/2026-11-01-edfe-aerodrome-sources.md); the official DFS
AIP and operator sites were unreachable from the research session, so only
non-authoritative OurAirports values (runway 08/26, conflicting elevations) exist.
Update after network access was enabled: the operator's published pilot information
gives runway 08/26, a standard north circuit (right-hand 26, left-hand 08), reporting
points and frequencies (cite-only). DFS AIP terms forbid automated retrieval and
derived works without written approval, so official AIP values still need a
person-read citation or DFS permission.

Answer: **2026-10-31 15:15, user**: “model a region like EDDF and 100 nm radius
around from real available map material”. Recorded in SPEC, ARCH and ROAD.
The radius is 185.2 km; use a geodesic boundary around the sourced official EDDF
airport reference point. Exact current reference coordinates and training airports,
runways, data versions and chart permissions remain pending. EDDF is the regional
center, not a decision to conduct every exercise at its runways. Owner: orchestrator
with researcher/product. See [regional source study](research/2026-10-31-eddf-open-foundation.md).

### Q13. LLM authoring and interaction provider/execution model?

Why: defines reproducibility, costs, credentials, privacy and the authoring/review
boundary. Proposed: provider-independent declarative experience packages; resolve
real assets from versioned sources, validate references and review before use.
Blocking: provider integration and generated-experience publication; not the
authoring architecture or regional source plan.

Answer: direction confirmed **2026-10-31 15:15, user**: LLM-based flight experience
creation defining territory/navigation/chart material, with AI-based interaction.
Provider/local/cloud choices, supported authoring intents and review process pending.

### Q14. Which sailplane and ultralight qualification profiles come first?

Why: pilot licences, aircraft categories, privileges and curricula depend on the
jurisdiction and selected aircraft. This is distinct from software licence Q5.

Answer: **2026-10-31 15:44, user**: add licence-specific training for sailplanes
and ultralight aircraft. Country/category, precise qualification, launch/equipment
scope, first aircraft and ordering remain open. Proposed research references are
EASA Part-SFCL/SPL and Germany's national ultralight framework; these references
are not a user decision selecting all their privileges or categories.

Blocking: implementation/acceptance of those later profiles only. Initial C172/
EASA PPL work continues. Owner: orchestrator/product, informed by the
[licence-track source note](research/2026-10-31-license-training-tracks.md).

## Resolved refinement questions

### Q8. What does “QNX” mean in the requested altimeter features?

Why: a pressure-setting label must have a defined reference and instrument behavior.
Asked whether QNH was intended; proposed options included broader reference coverage.

Answer: **2026-10-31 15:09, user** (recorded by orchestrator): “Cover QNH, QFE and
standard pressure”.

Resolved: 2026-10-31 15:09, user; carried into [SPEC](SPEC.md),
[training design](design/TRAINING.md), ARCH and EVAL. Numeric cases still require
the selected aircraft, atmosphere, elevation data and predeclared tolerances.

### Q9. Which cockpit style comes first?

Why: controls, references, instrument interactions and learning progression differ.
Options: classic first/glass later, glass first, or compare before choosing.

Answer: **2026-10-31 15:09, user** (recorded by orchestrator): “Classic instruments
first, glass later”.

Resolved: 2026-10-31 15:09, user; carried into [SPEC](SPEC.md),
[CONCEPT](design/CONCEPT.md), [training design](design/TRAINING.md) and ARCH/ROAD.
Q3 retains the unresolved exact C172 configuration.

## Assumptions to check

| ID | Assumption | Basis and recorded author/time | Correction |
| --- | --- | --- | --- |
| A1 | CPL follows an initial useful PPL foundation. | User explicitly said EASA PPL **first**; orchestrator, 2026-10-31 14:53. | None recorded. |
| A2 | Initial use is supplementary practice, without a training-credit claim. | No approval objective specified; orchestrator proposal, 2026-10-31 14:53. | Pending user correction. |
| A3 | Teaching assistance and physics fidelity are separate, visible settings. | Derived from starting simple and becoming realistic; product proposal, 2026-10-31 14:53. | Pending user correction. |
| A4 | Local-first development and no learner account requirement initially. | Minimizes unneeded infrastructure during foundation; orchestrator proposal, 2026-10-31 14:53. | Pending user correction. |
| A5 | Raw project brief may be tracked locally; no private learner data is included. | User requested repository setup; orchestrator, 2026-10-31 14:53. | Recheck before publishing. |
| A6 | Replay/debrief is the initial interpretation of “video review”; exported video remains a separate option. | User likes GeoFS flight review; orchestrator proposal, 2026-10-31 15:09. | Pending user correction. |
| A7 | A320 is an interaction reference; fewer/deeper aircraft means no second initial type. | Existing C172-first decision and user feedback; orchestrator interpretation, 2026-10-31 15:09. | Pending user correction. |
| A8 | ILS and advanced traffic systems get separate later equipment/objective scopes. | EASA PPL first plus expanded wishlist; orchestrator proposal, 2026-10-31 15:09. | Ordering pending user correction and syllabus/equipment research. |
| A9 | Free access and open-source release are product directions; exact license/hosting and third-party rights need separate selections. | User's free/open-source community direction, 2026-10-31 15:15. | License selected 2026-11-01 07:04 (Q5: GPL-3.0-or-later); hosting and per-asset rights pending. |
| A10 | AI-assisted authoring assembles validated declarative packages rather than executing arbitrary generated code or inventing navigation data. | Source-backed realism and reuse direction; orchestrator architecture proposal, 2026-10-31 15:15. | Provider/interface and review scope pending. |
