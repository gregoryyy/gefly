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

## Open questions

### Q3. Which Cessna 172 variant, year and avionics fit?

Why: operating limits, engine/propeller, systems, instrument ranges and procedures must refer to one applicable configuration. Proposed: research availability and redistribution rights for a specific C172S configuration before recommending a conventional panel or glass cockpit. Blocking: TODO 1.3 and aircraft-specific implementation; generic studies may continue.

Answer: partial update, **2026-10-31 15:09, user** (recorded by orchestrator):
“Classic instruments first, glass later”. The exact variant/year and conventional
instrument/radio fit remain pending. Owner: orchestrator, informed by researcher
and product. Glass is a later configuration; A320 is a reference, not an initial type.

### Q4. First supported controls and browser/device baseline?

Why: keyboard, pointer, joystick, pedals and touch create different accessibility and calibration requirements. User feedback requests keyboard/touchpad and mobile orientation, recorded 2026-10-31 15:09. Proposed: desktop keyboard/pointer foundation followed by specified orientation-capable mobile devices; select reference browsers/devices, permission/calibration/fallback behavior and performance budget after a measured study. This sequence is a proposal, not a user-selected release order. Blocking: final foundation acceptance budgets in TODO 1.2/1.4; not the scaffold.

Answer: pending. Owner: orchestrator; technical options researched before asking.

### Q5. Source license and third-party data policy?

Why: affects code reuse, distribution, aircraft manuals, avionics depictions, maps and navigation data. The user's direction is now free/open source; select a compatible open-source license and review separately licensed assets/data. Blocking: license-dependent distribution and restricted asset ingestion. A source `LICENSE` file is intentionally absent until a specific license is chosen.

Answer: partial update, **2026-10-31 15:15, user**: “The idea is to make this free
and open source”. Exact code license, contributor terms and asset/data compatibility
remain pending. Owner: orchestrator. [SBOM](SBOM.md) records source provenance.

### Q7. First useful learning exercise and review partner?

Why: determines whether the first slice is aircraft handling, instrument interpretation or a procedure, and how training claims can be reviewed. Proposed: a bounded straight-and-level control/trim exercise, then coordinated turns; product should refine objectives against the selected EASA syllabus with instructor review. Blocking: milestone 2 exercise acceptance, not generic physics experiments.

Answer: pending. Owner: product proposes; orchestrator resolves with user.

### Q10. Which first training region, airport and runway?

Why: determines geography, elevations, navigation/briefing coverage and source rights.
Blocking: verified region geometry, selected training-airport/runway fixtures and
source-specific acceptance; the region direction itself is resolved.

Answer: **2026-10-31 15:15, user**: “model a region like EDDF and 100 nm radius
around from real available map material”. Recorded in SPEC, ARCH and ROAD.
The radius is 185.2 km; use a geodesic boundary around the sourced official EDDF
airport reference point. Exact current reference coordinates and training airports,
runways, data versions and chart permissions remain pending. EDDF is the regional
center, not a decision to conduct every exercise at its runways. Owner: orchestrator
with researcher/product. See [regional source study](research/2026-10-31-eddf-open-foundation.md).

### Q11. Which briefing data mode ships first?

Why: real-time weather/NOTAM feeds need coverage, rights, freshness, service failure
handling and synchronization with the simulated conditions; deterministic exercises
need frozen data. Proposed: versioned scenario briefings first, with explicitly
labeled historical/generated data and a later optional live adapter. Live data is
not a confirmed provider or release decision. Blocking: weather/NOTAM integration.

Answer: pending. Owner: orchestrator with research and product.

### Q12. Community publication and content roles?

Why: the requested free/open-source flight-school community needs hosting, public
content/contribution rules, learner/instructor roles, review labels and moderation.
Proposed: a reusable exercise library and discussion/debrief workflow first;
specific roles and sequencing remain proposals. Blocking: community deployment,
not simulator or source-research studies.

Answer: direction confirmed **2026-10-31 15:15, user**: community site similar to
GeoFS, more flight-school oriented, free/open source. Hosting, data retention,
moderation, contribution workflow and funding/operating model remain pending.

### Q13. LLM authoring and interaction provider/execution model?

Why: defines reproducibility, costs, credentials, privacy and the authoring/review
boundary. Proposed: provider-independent declarative experience packages; resolve
real assets from versioned sources, validate references and review before use.
Blocking: provider integration and generated-experience publication; not the
authoring architecture or regional source plan.

Answer: direction confirmed **2026-10-31 15:15, user**: LLM-based flight experience
creation defining territory/navigation/chart material, with AI-based interaction.
Provider/local/cloud choices, supported authoring intents and review process pending.

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
| A9 | Free access and open-source release are product directions; exact license/hosting and third-party rights need separate selections. | User's free/open-source community direction, 2026-10-31 15:15. | Specific release choices pending. |
| A10 | AI-assisted authoring assembles validated declarative packages rather than executing arbitrary generated code or inventing navigation data. | Source-backed realism and reuse direction; orchestrator architecture proposal, 2026-10-31 15:15. | Provider/interface and review scope pending. |
