# Progress log

Times use Europe/Berlin; timestamps come from the execution clock. New entries go
above previous entries. This log records implementation, not simulator validity.

## 2026-11-01 23:21 — Fly the local browser prototype

TODO: 2.0 complete as an experimental slice; 1.3.2–1.3.4 and the first-exercise gates remain open.
Agent: Codex orchestrator; flight_engine/code1 and flight_scene/code2 implemented
independent paths in parallel, with flight_housekeeping maintaining app instructions.
Independent quality: flight_housekeeping (excluding its own README); independent
validation: flight_validate.

**Implementation notes**

Added an actual browser application: procedural 3D scenery, cockpit/chase views,
keyboard and touchpad controls, live TAS/attitude/study-altitude/heading/VSI displays,
throttle, pause and restart. The existing JSBSim worker owns fixed 1/120 s steps;
there is no replacement UI physics or scripted-flight fallback. The visible,
adjustable study roll offset reuses the E1 input fixture, not aircraft coefficients.
`just build-flight-engine` builds ignored local research assets; `just fly` starts
localhost:5173. npm versions and integrity hashes are locked. Browser CI checks the
UI build and lifecycle tests without downloading or distributing model assets.

The strict build, five session tests and ten-check actual-Chrome smoke passed.
Independent browser validation exercised controls, focus release, reset, view-state
preservation, missing runtime and WebGL failure. The ten-second assisted baseline
remained airborne with maximum bank 4.26°. Both review findings were fixed and
rechecked. See the scoped [quality/validation record](reviews/2026-11-01-browser-prototype.md).

**Deviations**

This local prototype advances the product while the project-owned 172S model and
official EDFE data remain incomplete. It uses the generic research model locally,
procedural geography, TAS and the study altitude datum. It does not supply validated
PPL handling, QNH/QFE, navigation, circuit assessment or a public deployment. The
production UI bundle excludes the restricted research runtime. Peer pending;
no simulator milestone or release is accepted.

**Insights**

Connecting the working study to controls and a flight deck supplies a usable place
to test each next realism increment. Short browser smoke checks expose integration
failures that isolated helpers cannot reveal.

## 2026-11-01 22:14 — Reconcile PR 27 with the assurance and CI layout

TODO: 1.3.1 complete; 1.15 retained; 1.3.2–1.3.4 remain open.
Agent: Codex orchestrator; code1/peer_runner, code2/peer_registration and
housekeeping on disjoint integration paths. Independent quality and validate
review the resulting integration separately.

**Implementation notes**

Merged main `aeb5d3f` after PR #27 into the PR #28 branch at `e8d0a07`.
Resolved DONE by complete dated entries against both parents and their merge
base: all 50 feature entries are byte-preserved, and the complete incoming E2
entry is inserted chronologically. Task 1.3.1 now records the merged calculation
tool and synthetic fixtures; its aircraft-specific follow-up tasks remain open.
Utilities documentation retains the relocated tooling and adds the E2 study.

The relocated runner includes both E1 and E2 study suites plus assurance.
Its production functions retain their previous ASTs; the E2 registry addition
and incoming zombie-aware timeout-test helper are preserved. All 38 CI test
identities from the two parents remain present. The five E2 files remain
byte-identical to merged main. The shared local gate passed 138 executed Python
tool tests with one Linux-only skip, 25 E2 tests, 14 E1 tests and 72 assurance
tests; nine optional JSBSim tests were also skipped. Synthetic rendering,
assurance integrity and tracked whitespace passed. See independent
[quality](reviews/2026-11-01-pr27-integration-quality.md) and
[validation](reviews/2026-11-01-pr27-integration-validation.md).

**Deviations**

Peer pending for this integration and the merged E2 groundwork under the batched
cadence. Earlier assurance/layout peer reports cover their recorded revisions,
not this later merge. Calculation readiness supplies no aircraft-specific inputs,
JSBSim tensor adapter, M-a acceptance, validated model or simulator milestone.

**Insights**

A task ID collision needs one reconciled scope and state. Preserving whole
progress entries and comparing both parents avoids pairing a heading with an
unrelated implementation or deviations body.

## 2026-11-01 21:42 — Organize assurance and CI tooling under utils

TODO: 1.15 complete. Agent: Codex orchestrator; code1/peer_runner,
code2/peer_registration and housekeeping on disjoint paths. Independent quality,
validation and scoped external peer dispositions are recorded separately below.

**Implementation notes**

Moved the assurance runtime, tests and pinned upstream core to `utils/assure/`.
Grouped the CI runner, structural checker, Node reporter and CI tests under
`utils/ci/`; its Python package preserves recursive discovery from `utils`.
The `just` commands retain their names. Updated root detection, workflow paths,
inventory destinations, output guards, current documentation and source links.
Canonical assurance documents/catalog stay in `docs/assure/`; all 13 reused
Propeller files retain their original bytes and original source identities.
Committed pre-relocation snapshots remain readable without worktree fallback.

The shared local gate passed: 137 Python tooling tests, 72 assurance tests,
synthetic rendering and 14 executed study tests. Nine optional JSBSim checks
were skipped because the engine package is unavailable. Tracked-content
whitespace passed on 208 paths. The relocated checker and CLI were exercised
from an unrelated directory. Five historical review navigation links are pinned
to their recorded source revisions; their commands, findings and outcomes remain
unchanged. Request: [input](input/2026-11-01-tool-layout.md).

**Deviations**

This is a tooling layout change. Simulator requirements, aircraft values and the
14 planned/zero accepted MVP criteria retain their existing scope. Independent
[quality](reviews/2026-11-01-tool-layout-quality.md),
[validation](reviews/2026-11-01-tool-layout-validation.md) and
[peer](reviews/2026-11-01-tool-layout-peer.md) records carry their own outcomes;
prior peer acceptance is historical evidence for its earlier revision.

**Insights**

Moving Python tests into a directory also requires a discoverable package.
Historical revision inspection needs an explicit old-layout reader, while
current checks must not silently accept a missing new-layout inventory.

## 2026-11-01 21:05 — Complete bounded assurance adoption and status reconciliation

TODO: 1.14 complete. Agent: Codex orchestrator; product, code1/peer_runner,
code2/peer_registration and housekeeping on disjoint paths, then independent
quality and validate. PR: [#28](https://github.com/gregoryyy/gefly/pull/28).

**Implementation notes**

The new tracker reuses 13 byte-preserved pure Propeller files from commit
99dc6005. Gefly adapters derive requirements, tasks, decisions, progress,
commit/file/test identities and aircraft JSON-pointer provenance. Catalog
relationships distinguish outcomes, certainty, freshness and acceptance.
All 14 seeded MVP criteria remain planned, with no accepted claims. Archived
measurements retain three recorded passes, one failed step-cost observation and
their incomplete-provenance limits.

Local checks passed 137 tooling tests, 72 assurance tests and 14 study tests;
nine optional JSBSim tests were explicitly skipped. Both hosted Python jobs
passed the same implementation at 2900ca38. Seven independent quality findings
prompted rejection/impact/ledger/report regressions; affected checks and reviews
were renewed. Current status contradictions and the damaged FDM progress entry
were reconciled from decisions/data/Git history. See [RESULTS](RESULTS.md) and
the [quality](reviews/2026-11-01-assurance-quality.md) /
[validation](reviews/2026-11-01-assurance-validation.md) records.

**Deviations**

This accepts bounded tooling and its documented limits, not aircraft fidelity,
an MVP or the entire foundation. Historical references and archival provenance
remain advisory warnings; skips remain skips. No new flight run was performed.
The [scoped external peer disposition](reviews/2026-11-01-assurance-peer.md) is
recorded separately under the existing batched cadence; older peer coverage in
TODO 0.19 remains open. No database, hooks, extra agent or runtime package added.

**Insights**

A passing test file is not proof that it declares tests. Accepted evidence must
remain valid after dependency resolution, and field-level impact must include
whole-file pins. Status records are now included in the assurance review snapshot;
generated review records remain outside it to avoid self-referential hashes.

## 2026-11-01 20:40 — Adopt bounded assurance (integration in progress)

TODO: 1.14.1 complete; 1.14.2–1.14.4 in progress. Agent: Codex orchestrator;
product, code1/peer_runner, code2/peer_registration and housekeeping on disjoint
paths; independent quality review started, integrated validation pending.

**Implementation notes**

Recorded Q22 and R-ASR-1 through R-ASR-5 with AS1–AS8. Reusing pinned Propeller
pure lineage code with Gefly adapters, catalog evidence/freshness checks and the
shared offline CI gate. Reconciled current decisions and data availability,
restored the complete FDM progress entry from the last correct main revision,
and normalized two legacy progress records without changing their observations.

**Deviations**

Integration and independent checks are in progress; this entry does not accept
unreviewed implementation, an aircraft model or the MVP. Earlier peer coverage
remains separate and TODO 0.19 open. No database, hooks or new agent role added.

## 2026-11-01 19:35 — Prepare E2 component mass and inertia calculations

TODO: 1.3.1; E2 preparation only. Agent: Codex orchestrator; code1/e2_math,
code2/e2_cli and housekeeping/e2_docs in parallel; independent local quality/e2_quality
and validate/e2_validate. User switched the builder to Codex and reviewer to Claude.

**Implementation notes**

Added the stdlib [mass-properties study](../studies/e2-c172s/README.md): positive
component masses, common-reference body-axis CGs and intrinsic inertia tensors
produce total mass, CG and a parallel-axis tensor. Strict JSON CLI retains the raw
input hash and an explicit unvalidated-input label. Synthetic fixtures cover
analytic bodies, off-axis products, scaling, translations, physicality and errors.
The shared gate runs the new study and rejects a failing E2 suite. Final local
gate: 134 tool tests, 25 E2 tests, 14 E1 tests and synthetic render check passed;
9 optional JSBSim engine tests skipped.

Fixed the existing CI timeout test's Linux liveness check: a killed zombie is
terminated even when container PID 1 does not reap it. Live-child detection and
actual process-group timeout checks remain exercised; production cleanup is unchanged.
Local quality found a low-severity extreme mass/position order-sensitivity case;
the calculation now selects a deterministic largest-mass reference, with regressions.

**Deviations**

No sourced 172S coefficients or mass values, structural/JSBSim tensor adaptation,
gear model, aircraft acceptance, or milestone-2 implementation. M-a and TODO 1.3
remain open. Claude peer review pending; the Claude CLI is absent in this instance.
The [handoff evidence](reviews/2026-11-01-e2-mass-properties.md) distinguishes local
reviews from the pending opposite-provider gate.

**Insights**

A zero-inertia point-mass fixture can verify tensor signs without borrowing an
aircraft model. Separate calculation readiness from the missing aircraft evidence.

## 2026-11-01 19:06 — Repair post-merge records; record stack, fuel-chart and tolerance answers

TODO: 1.1.2, 1.2.3, 1.4 complete. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

After the user merged PRs #9–#23 with "accept both" conflict resolutions, DONE.md had
truncated, mixed and out-of-order entries. Rebuilt it from the complete per-entry
versions in main's history (44 entries, newest first; Exercise 01 entry no longer
carries the iPhone and briefing bodies). Checked GAPS (unique headings; Q15 answers
restored to newest first), README (stale "variant and stack open" sentence), TODO
(merged/reviewed statuses), AGENTS and ARCH (stack). Recorded the user's answers:
Q17 web stack (CesiumJS, three.js fallback, MapLibre, TypeScript, JSBSim worker), Q5
Lycoming fuel-chart points, Q21 FDM tolerance proposals accepted as working proposals.

**Deviations**

Other files were checked for duplicated lines and conflict markers only, not
re-reviewed line by line. Peer pending (batched).

## 2026-11-01 19:00 — Extract Lycoming power points and POH cruise/glide values

TODO: E2 data. Agent: Claude Code orchestrator; researcher/housekeeping subagent.

**Implementation notes**

New `data/aircraft/c172s-classic/performance-values.json` with its own schema:
Lycoming 60297-12 ratings (p. 2-2) and selected sea-level power points read from
curve 13516-A (p. 3-40) with reading uncertainty; POH cruise at 2000 ft (p. 5-19)
and best-glide speed and distance (glide ratio derived). Lycoming manual registered
as a facts-only source (manifest 0.2.0); validator extended, 21 tests (112 total).

**Deviations**

2300 rpm has no chart curve (unknown); the chart is for the 160 hp rating and an
uninstalled engine; the glide figure is a single line, so one reading carries its
whole content — flagged for the user against the no-piecemeal rule. Not yet reviewed.
Peer pending (batched).

## 2026-11-01 18:49 — Plan the project-owned JSBSim 172S model (E2)

TODO: E2 preparation. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [FDM-172S](design/FDM-172S.md): JSBSim block structure with a source class
(sourced, derived, estimated, plausibility) for every parameter group and a
per-parameter provenance file with a CI check; OpenVSP geometry inputs; calibration
vs frozen holdout sets (glide added for drag, forward-CG stall to holdout); proposed
tolerances P-1..P-10; a `studies/e2-c172s/` harness reusing E1 and the WASM worker;
licensing; milestones M-a..M-e with exit criteria. No coefficient values.

**Deviations**

Plan only; blockers: empty mass/CG (Q-1), geometry gaps (planform, airfoil, tail),
tolerance acceptance (Q-11). Cruise/glide extraction is already authorised and
running. Not yet reviewed. Peer pending (batched).

## 2026-11-01 18:46 — Select model size and reasoning effort per task

TODO: 0.20 complete. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Per the user (GAPS Q20), AGENTS, BOOT (dispatch section) and the agent workflow now
require the orchestrator to choose model tier and reasoning effort per task by
difficulty and risk, with reviews at least at the tier of the reviewed work and no
model identifiers in repository files. This is a recorded change to the agent rules.

**Deviations**

No runtime configuration changed; native Codex registrations still set no model.

## 2026-11-01 18:45 — Record the valid CesiumJS run on the reference Mac

TODO: 1.2.3 in progress. Agent: Claude Code orchestrator (no subagents); run by the
user on the reference Mac (Apple M1 Pro GPU, 120 Hz), Chrome 156.

**Implementation notes**

CesiumJS 1.146.0 with the JSBSim stream after the canvas fix: median 8.3 ms, p99
9.4 ms, 2 missed vsyncs, heading check pass; both render budgets pass. With the
earlier three.js result, both candidates meet the budgets.

**Deviations**

Smaller window (739×817) than the three.js run, CSS resolution only, no real terrain
or imagery tiles. Renderer choice awaits the user. Peer pending (batched).

## 2026-11-01 18:26 — Fix Codex review findings on PRs #4–#6

TODO: 0.19 in progress. Agent: Claude Code orchestrator; code1 subagent. Findings
from the Codex local review (report `docs/reviews/2026-11-01-first-claude-prs.md` on
branch docs/first-claude-pr-review-evidence).

**Implementation notes**

1. The JSBSim study's stationary and cost fixtures now fail on any `run()` returning
   False or not advancing sim time by dt; 7 fake-FDM tests (no jsbsim needed).
2. `studies/e1-jsbsim/requirements.txt` pins jsbsim 1.3.3 and numpy 2.5.4 with
   hashes (CPython 3.13 manylinux x86-64 only); README uses
   `pip install --require-hashes -r …`. Fresh-venv install verified; recorded F1
   digests unchanged.
3. SPEC, README and CONCEPT now state JSBSim is selected (Q17), separate from the
   open model, rendering and hosting choices.

**Deviations**

Formal peer acceptance stays blocked: the Codex CLI failed to initialise on a
read-only filesystem; a re-run with an updated packet is needed. Hashes cover one
platform only; the original run's numpy version was not recorded.

## 2026-11-01 18:21 — Survey open Cessna 172 aerodynamic data for the E2 model

TODO: E2 preparation. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

Added [C172 aero data sources](research/2026-11-01-c172-aero-data-sources.md): no
open 172S-specific aero, propeller, inertia or gear data found. Usable earlier-model
sources: NASA TM-80163 flight-test derivatives (public domain, aircraft identity
inferred), KU-M-407-7 1974 172M identification (cite-only), consistent inertia sets,
NASA CR-2605 DATCOM estimates, NASA SP-468 drag/L-D; Lycoming IO-360-L2A curve is
copyrighted; no public McCauley 1A170E data. Proposed calibration vs holdout split.

**Deviations**

No coefficients added. Needs Q5 decisions (digitising the Lycoming curve, OpenVSP
licence) before a model can be built. Not yet reviewed. Peer pending (batched).

## 2026-11-01 18:18 — Draft scenario and review contract extension v1.1

TODO: 1.9 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [SCENARIO-CONTRACTS](design/SCENARIO-CONTRACTS.md) as a minor extension of
CONTRACTS v1: one-directional scenario record (package, briefing, catalog snapshot,
aircraft manifest, environment), shared event envelope with logged/derived and digest
group per event type, review record with re-simulated seek, a code1/code2 field
ownership table for milestone 2, and 15 reconciled naming conflicts across the
CONTRACTS, BRIEFING, EXERCISE-01, EXPERIENCES and PHONE-CONTROL drafts.

**Deviations**

Orchestrator accepts C3 (`magvar_east_rad` JS-computed, `ind` group, consistent with
the WASM-only `sim` digest rule) and C5 (altimeter state holds the set pressure; the
reference is scenario-expected plus a derived match, since the knob only sets a
pressure) as technical consistency fixes within Q18; the user can revise them. Not
yet reviewed. Peer pending (batched).

## 2026-11-01 18:16 — Record local review of first Claude PRs

TODO: 0.19 in progress. Agent: Codex orchestrator; first_pr_docs_review.

**Implementation notes**

Performed independent local source inspection. Reviewed Claude PRs #4–#6 at `48b2991`; three medium findings
remain unresolved. [Report](reviews/2026-11-01-first-claude-prs.md) includes
reproductions, validation scope and frozen packet hash. The fresh Codex CLI
failed before reviewer initialization on the read-only filesystem; formal peer
acceptance remains blocked and TODO 0.19 stays open. No product fixes made.
Current foundation CI passed 41 tests; study tests passed 7 and skipped 9.

**Deviations**

Formal peer initialization failed; the local review is not a passed peer gate.

## 2026-11-01 16:47 — Draft the paired-iPhone control specification

TODO: 1.13 in progress. Agent: Claude Code orchestrator; product subagent (with source
research).

**Implementation notes**

Added [PHONE-CONTROL](design/PHONE-CONTROL.md) and its
[source note](research/2026-11-01-phone-control-sources.md). Proposal: direct WebRTC
data channel on the local network (unordered, no retransmission, no STUN/TURN), a
short-lived encrypted pairing mailbox, single-use QR code plus a 6-digit code
confirmed on both devices, mapping into the CONTRACTS input boundary with staleness
and replay rejection, and keyboard/touchpad fallback.

**Deviations**

Draft; iOS orientation needs an HTTPS page, so hosting (open) blocks it; sensor rate
and latency unmeasured, budget values are proposals; not yet reviewed. Peer pending
(batched).

## 2026-11-01 14:07 — Extract cited 172S POH values

TODO: 1.3/1.5 support. Agent: Claude Code orchestrator; researcher/housekeeping
subagent.

**Implementation notes**

Per the user's decision, extracted only needed POH (172SPHUS Rev 5, S17) values as
cited facts into `data/aircraft/c172s-classic/poh-values.json` (66 tabulated numbers
checked against rendered pages): airspeed calibration points for the Exercise 01
bands (p. 5-9), stall speeds (p. 5-12), short-field take-off/landing distances at
2,550 lb near EDFE elevation (pp. 5-14, 5-23/24), climb (p. 5-17), and paraphrased
correction notes. Separate schema, extended validator, 25 POH tests (19 initial, 6 after review) and a
[research note](research/2026-11-01-c172s-poh-values.md).

**Deviations**

POH gives short-field distances only; VFE 10° KCAS differs between p. 2-4 (107) and
p. 5-9 (109), recorded as pending; applicability of later POH revisions to
172S9491–9809 unchecked; not yet reviewed. Peer pending (batched).

## 2026-11-01 13:59 — Confirm the height datum; contracts v1 agreed

TODO: 1.4 complete pending merge. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

The user accepted the physical-height convention (GAPS Q18 O-3); CONTRACTS no longer
marks it pending. With Q18 resolved and three review rounds closed, contracts v1 is
the agreed basis for parallel product coding.

**Deviations**

Peer pending (batched); geoid grid full hashes and terrain beyond Hessen remain open.

## 2026-11-01 13:34 — Draft scenario briefing, AFIS radio and checklist scope

TODO: 1.8 in progress. Agent: Claude Code orchestrator; product subagent (with source
research).

**Implementation notes**

Added [BRIEFING](design/BRIEFING.md) and its
[source note](research/2026-11-01-briefing-radio-sources.md): snapshot briefing
schema validated against scenario time with explicit failure states; QNH/QFE/STD flow
into the environment; a later live adapter frozen into replay; AFIS (information, not
clearances) text-radio scope with AI text limited to proposing intents; POH checklist
items classified by modeled state. EDFE has no METAR in the checked feed, so briefings
pair EDDF METAR/TAF with a generated EDFE report.

**Deviations**

Draft; WMO-No. 306, ICAO Annex 3/Doc 4444/9432 and DFS AIP not read; not yet
reviewed. Peer pending (batched).

## 2026-11-01 13:31 — Draft Exercise 01 acceptance criteria

TODO: 1.5 in progress. Agent: Claude Code orchestrator; product subagent (with source
research).

**Implementation notes**

Added [EXERCISE-01](design/EXERCISE-01.md): holding-point start with engine running,
12 phases with measures, units and state fields, pass/fail/feedback rules, assists,
replay markers and environment cases; and its
[source note](research/2026-11-01-exercise-01-sources.md). Tolerances are labelled by
source: EASA AMC1 FCL.235 skill-test guidance (used as instructional adaptation),
C172S POH (page-cited), EDFE operator material (cite-only), or instructional proposal
pending instructor review.

**Deviations**

Draft, not frozen: runway, instructor reviewer, AIP circuit data and the POH climb-
speed discrepancy are open; not yet reviewed. Peer pending (batched).

## 2026-11-01 13:29 — Draft the 172S classic-panel aircraft manifest

TODO: 1.3 in progress. Agent: Claude Code orchestrator; housekeeping subagent.

**Implementation notes**

Added `data/aircraft/c172s-classic/manifest.json` (v0.1.0, fidelity not validated):
serials 172S9491–172S9809, IO-360-L2A, McCauley propeller, masses and speed limits
only where page-cited, with SI and original units, R-DATA-2 status, uncertainty and
a source register with rights and hashes. Conflicting sources (VFE CAS, utility ramp
mass) are recorded as unknown with both readings. JSON Schema, stdlib validator and
15 tests added to the shared gate.

**Deviations**

Draft; FAA 3A12 Rev 88 and engine TCDS 1E10 not read; avionics fit TBD; not yet
reviewed. Aircraft data: peer pending (batched), required before milestone acceptance.

## 2026-11-01 13:07 — Draft the flight-experience package and LLM boundary

TODO: 1.10 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [EXPERIENCES](design/EXPERIENCES.md): declarative versioned package (no code,
unit- and reference-bearing values, per-value provenance status), stable-ID source
catalog starting with `eddf-100nm`/EDFE, LLM boundary (draft and catalog lookup
only), nine validation stages with failure codes, review states with author ≠
reviewer, security rules, and an EDFE circuit example with every real value TBD.

**Deviations**

Draft; cites the holding-point start from branch `design/contracts-1-4` (not yet on
main); runway in the example is illustrative; Q13 provider open; not yet reviewed.
Peer pending (batched).

## 2026-11-01 13:06 — Draft the pilot-qualification profile contract

TODO: 1.12 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [QUALIFICATIONS](design/QUALIFICATIONS.md): sourced-value model with per-field
status and source register, profile schema (jurisdiction, authority, full
qualification, privileges, objectives→exercises, aircraft-manifest references,
mandatory no-training-credit flag), 12 invalidity rules, versioning, a draft EASA
PPL(A)/C172S example and placeholder SPL/ultralight shapes bound to Q14.

**Deviations**

Draft; most PPL values unverified until Part-FCL sections are read; Q14 choices not
made; proposed SPEC edits not applied; not yet reviewed. Peer pending (batched).

## 2026-11-01 13:06 — Add study checks to the shared CI gate

TODO: 1.1.2 in progress. Agent: Claude Code orchestrator; code1 subagent.

**Implementation notes**

`utils/ci.py` now runs the `studies/e1-jsbsim` tests in a separate interpreter
(fails on missing/empty/failing/import errors, reports skips) and
`check-synthetic.mjs` with node; a missing node is reported as a skip and the final
line says "passed with skipped check". Hosted CI uses `--require-node` with the
runner's preinstalled Node.js. 8 new negative/positive tests (49 tool tests total).

**Deviations**

Local only: hosted run and independent review pending. Peer pending (batched).

## 2026-11-01 12:58 — Draft shared contracts v1

TODO: 1.4 in progress. Agent: Claude Code orchestrator; product subagent.

**Implementation notes**

Added [CONTRACTS](design/CONTRACTS.md): SI units and frames with conversion
boundaries, fixed 1/120 s step and step-index clock, pilot-sense input schema with
applied-step logging, three-layer state (sim/instruments/teaching), replay metadata
with seed set before RunIC, 17 sourced fixtures, versioning and a v0.1→v1 message
table. Proposed SPEC wording for R-SIM-3/R-SIM-4 is not applied.

**Deviations**

Draft only; nine open questions (O-1..O-9) need decisions; not yet independently
reviewed. Peer pending (batched).

## 2026-11-01 12:56 — Record M1 render runs; fix the hosted Cesium page

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator (no subagents); runs
by the user on the reference Mac (WebGL: Apple M1 Pro, 120 Hz), Chrome 156.

**Implementation notes**

three.js with the JSBSim stream: median 8.3 ms, p99 9.4 ms at 120 Hz: both render
budgets pass (1232×817 viewport, CSS resolution). CesiumJS run invalid: 300×150 px
drawing buffer because the host CSP blocks `widgets.css`; added inline canvas CSS
and an invalid-run guard, republished the page (version 2). Recorded the hosted
launcher and its file map under `studies/e1-browser/hosted/` for later repeats.

**Deviations**

Cesium repeat pending. GAPS Q16 says M1; the GPU string says M1 Pro (to confirm).
Peer pending (batched).

## 2026-11-01 12:53 — Record the reference M1 worker benchmark

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator (no subagents); run
performed by the user on the reference MacBook Pro M1, Chrome 156.

**Implementation notes**

Stored the user's JSON under `studies/e1-browser/results/`. Missed steps 0.33 per
10 s, latency p95 16.9 ms and same-build replay pass; paced step-cost p99 800–1000 µs
exceeds 830 µs as measured but is limited by 100 µs timer coarsening (page not
cross-origin isolated); unpaced compute ≈ 15 µs per step. Replay digest equals the
container's for the same WASM build.

**Deviations**

Render runs on the M1 pending; step cost to be re-measured cross-origin isolated.
Peer pending (batched).

## 2026-11-01 12:33 — Validate the E1 browser check; publish the M1 test page

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator; validate subagent.

**Implementation notes**

Local validate at `15dbd83`: no acceptance claim from the container; status labels
match results. Documentation fixes applied: render ranges reconciled and labelled
not evaluable, latency/replay qualified as preliminary, seed and extra `ready.build`
fields and synthetic-source validation recorded as v0.1, status lines updated, CPU
headroom and R-SIM-2 deferred to the reference run. Published a private test page
for the reference M1/Chrome run (artifact, built WASM included) and added a visible
results panel to the render pages.

**Deviations**

Acceptance blocked until the reference M1/Chrome run. The hosted page is not
cross-origin isolated and may block CesiumJS run-time loads. Peer pending (batched).

## 2026-11-01 12:13 — Review and fix the E1 browser check

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator; quality, code1 and
code2 subagents.

**Implementation notes**

Local quality: 2 medium and 10 low findings; contract tightened by the
orchestrator (true heading, 8.3 ms missed-step definition with lag reporting,
refresh-relative frame budget, input echo at s+1), code fixes by code1/code2;
renewed review at `b4581b6`: all fixed except CDN SRI (accepted for the study).
Container results: latency and replay pass; missed-step budget fails (2.7–3.3 per
10 s, 45 ms max lag, none dropped); step-cost p99 unstable (485–905 µs).

**Deviations**

Container results are preliminary; reference M1/Chrome run outstanding. Validate not
run. Peer pending (batched).

## 2026-11-01 12:02 — Build the E1 browser check (worker + render)

TODO: 1.2.1/1.2.3 in progress. Agent: Claude Code orchestrator; code1 (sim) and
code2 (render) in parallel on disjoint paths against a frozen contract; quality
review running.

**Implementation notes**

code1: JSBSim v1.3.3 WASM (emsdk 6.0.13) in a module Web Worker at fixed 1/120 s;
container run: p99 paced step 485–505 µs, 0 missed steps, input-to-state p95
18.8–20.1 ms, identical replay digest. code2: CesiumJS 1.146.0 (no ion) and
three.js 0.187.0 pages with a shared frame meter and synthetic circuit at EDFE.
Orchestrator integration: module-worker fix; both pages run on the JSBSim stream
at ≈ 60 Hz. Contract deviations recorded as v0.1 proposals.

**Deviations**

Software GL in the container makes render numbers meaningless for the budget;
reference M1 run outstanding. Peer pending (batched; see GAPS Q15).

## 2026-11-01 11:54 — Adopt proclens's batched peer-review cadence

TODO: 0.18 updated; 0.19 added. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Per the user, adopted proclens's review-gate logic (`gregoryyy/proclens` main
`3d671a3`): peer review every few PRs, one review per revision range since the last
peer-reviewed revision, *peer pending* in between, plus its packet-egress rule.
Updated GAPS Q15 (per-PR scope struck), SDLC, AGENTS, SPEC R-AGENT-7, agent
workflow, peer role and PR template. proclens has no hooks; nothing to adopt there.
Router and tests unchanged: proclens's copies are gefly's own with only naming edits.

**Deviations**

**Peer pending** for Claude-authored work merged since `3faf9c8` (PRs #4, #5, #6) and
this change; Codex CLI unavailable in this cloud session. Last recorded peer review:
Claude on Codex-authored CI work (PR #3 at `397a1b0`).

## 2026-11-01 11:38 — Select JSBSim as the dynamics engine

TODO: 1.2.3 partly decided. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

User decision (GAPS Q17): JSBSim, with LGPL-2.1 accepted as a copyleft exception
under Q5; bundled C172 data not shipped; no licence outreach. Recorded in input,
GAPS, ARCH, SBOM, AGENTS and TODO. Rendering/map/language remain proposals pending
the browser check.

**Deviations**

Treating JSBSim as a separately replaceable WASM library is an orchestrator design
note for LGPL compliance, not a user statement.

## 2026-11-01 11:18 — Review and fix the E1 study slice

TODO: 1.2.2 in progress. Agent: Claude Code orchestrator; quality, code1 and
researcher subagents.

**Implementation notes**

Integrated the [E1 candidate survey](research/2026-11-01-e1-engine-stack-candidates.md).
Local quality returned 2 medium and 5 low findings on the JSBSim study (non-JSON
stdout, mixed cost metrics, unpinned reproduction, test gaps, edge cases, doc
assumptions). code1 and the orchestrator fixed them; renewed quality review at
`4a28775` reports all seven fixed. Corrected cost: run-only 364–588×, with-I/O
238–413× real time (one recorded run of 3 repeats).

**Deviations**

Study code only; no product dynamics code, so the cross-provider peer gate does
not apply (GAPS Q15) until an engine is integrated. No validate pass yet; E1
decision (1.2.3) awaits the user's Q5 ruling on JSBSim's LGPL-2.1.

## 2026-11-01 11:11 — Run the JSBSim fixed-step E1 study

TODO: 1.2.2 started. Agent: Claude Code orchestrator; code1 subagent.

**Implementation notes**

Added `studies/e1-jsbsim/` (README with predeclared budgets, harness, tests, WASM
driver). JSBSim 1.3.3 with the bundled generic `c172x` (not the 172S): bit-identical
determinism within one build; timestep refinement 1/120 vs 1/480 s differs by
≤0.042 m altitude over 40 s (first-order convergence); ground rest and trim pass;
15–31 µs per step. An emscripten build runs repeatably under Node 22 but differs
from native at ~1e-13 relative, so replay must re-run on the same build.

**Deviations**

Measured on a cloud Intel Xeon, not the reference M1 Mac; no browser, latency or
force/torque fixtures yet. Study tests run with `python -m unittest discover -s
studies/e1-jsbsim` (11 tests with JSBSim, 6 skipped without); `utils/ci.py` does
not discover them. Not yet independently reviewed.

## 2026-11-01 11:00 — Record reference platform and paired-iPhone control

TODO: 1.2.1 refined; 1.13 added. Agent: Claude Code orchestrator; researcher and
code1 subagents running the E1 study in parallel on separate paths.

**Implementation notes**

GAPS Q16: MacBook Pro M1, current macOS, Chrome latest first (Safari second).
Added R-INPUT-3 for optional orientation control from a paired iPhone, with a
SEC threat row and CONTROLS note.

**Deviations**

Chrome desktop is Blink, not WebKit; both are recorded. Transport, pairing and
latency budget for the phone control are open.

## 2026-11-01 10:27 — Select the first 172S configuration

TODO: 1.3 in progress. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

The user accepted the researcher's proposal: Cessna 172S serials 172S9491–172S9809
with the classic panel. Recorded in a new input record, GAPS Q3, SPEC and TODO 1.3.

**Deviations**

Avionics/radio fit, flight-manual revision and FR172 sub-model remain open.

## 2026-11-01 10:11 — Verify 172S sources; FR172 still open

TODO: 1.3 in progress. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

With network access enabled, the researcher verified the 172S against EASA TCDS
IM.A.051 Issue 11 and a public copy of FAA TCDS 3A12 Rev 80, with page citations,
and recorded two small discrepancies between them. The NAV III (G1000) manual
title page puts G1000 at 172S9810 and on. The researcher proposes 172S9491–9809
as the first classic configuration.

**Deviations**

FAA DRS returned 403 to non-browser downloads; no workaround was attempted.
Current FAA 3A12 Rev 88, A18EU (FR172), 1E10 and Continental engine sheets were
not read directly. FR172 values remain unverified. Downloaded PDFs stay in the
session scratchpad, not the repository.

## 2026-11-01 10:08 — Complete EDFE source survey with operator material

TODO: 1.7 in progress. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

After the user enabled network access, the researcher retrieved the operator's
(TRIWO Egelsbach Airfield GmbH) published pilot information: runway 08/26, north
circuit standard, reporting points, frequencies and altitude limits, all cite-only.

**Deviations**

DFS AIP pages were deliberately not downloaded: DFS terms forbid automated tools
and derived works without written approval. Official AIRAC values, ARP, elevations
and circuit altitude remain open.

## 2026-11-01 07:25 — Add 172S/FR172 source survey

TODO: 1.3 started. Agent: Claude Code orchestrator; researcher subagent.

**Implementation notes**

Integrated the researcher's note. Leads: FAA TCDS 3A12 (172S, IO-360-L2A), A18EU
(Reims FR172E–K, several Continental IO-360 variants); no sourced classic/G1000
serial cutoff. JSBSim verified on GitHub: no 172S/FR172 model; C172 files carry
mixed LGPL/GPL and "not to be sold" terms.

**Deviations**

FAA/EASA hosts were blocked by the session network policy; no TCDS was opened and
every aircraft value is an unverified lead. No values were adopted into SPEC or data.

## 2026-11-01 07:24 — Resolve PR #4 quality/validate findings; add EDFE source survey

TODO: 1.7 started. Agent: Claude Code orchestrator; quality, validate and researcher
subagents (same provider, local).

**Implementation notes**

Local quality (needs changes) and validate (accept after fixes) reviewed `c1da267`.
Fixed: restored the 07:04 input record and moved the 07:08 follow-up to a new
record; labelled orchestrator additions to the third-party policy and the Q7/Q12
readings as interpretations; removed the unsourced FR172/172S engine/propeller
claims; propagated the 172S-first order; corrected the DCO relicensing statement
and added the Propeller-holder caveat; added an SBOM license-compatibility check;
cleared stale license/airport wording in AGENTS, CONCEPT, TRAINING, BOOT and
GAPS A9; history/strikethrough and TODO order fixes. The researcher's EDFE note
is integrated: official DFS AIP and operator hosts were unreachable, so only
OurAirports values (non-authoritative) were obtained.

**Deviations**

The fixes have not had a renewed independent review. Per GAPS Q15 this
documentation-only PR is outside the cross-provider peer scope. RESULTS.md keeps its
historical "licensing remains Q5" line unchanged.

## 2026-11-01 07:22 — Scope the cross-provider peer gate

TODO: 0.18 complete. Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Per the user's direction (GAPS Q15), the peer gate applies to integrated milestones,
simulation/data/avionics/assessment code, security-relevant or agent tooling and
release candidates; documentation-only decision records, research notes and
bookkeeping do not need it. Updated SDLC, AGENTS, SPEC R-AGENT-7, agent workflow,
peer role and PR template. PR #4 is therefore outside the peer scope.

**Deviations**

The exact scope boundary is an orchestrator interpretation of the user's statement.

## 2026-11-01 07:04 — Record aircraft, license, first-exercise, airport and community answers

TODO: 0.9 complete; 0.10.2 recorded; 1.3, 1.5, 1.7 and 1.11 refined.
Agent: Claude Code orchestrator (no subagents).

**Implementation notes**

Preserved the user's answers in a new input record and GAPS. Q5 resolved:
GPL-3.0-or-later for original material (`LICENSE` added from the existing
`LICENSES/` text) and a non-proprietary, permissive-preferred third-party policy
in SBOM. Q12 resolved as deferred to roadmap phase 3. Partial answers: Q3
(Reims FR172 and/or 172S as distinct engine configurations from public FAA/EASA
documentation), Q7 (first exercise: take-off, circuit, landing) and Q10 (first
airport Frankfurt-Egelsbach, EDFE). Propagated to SPEC, ROAD, ARCH, IDEA,
CONCEPT, README, THIRD_PARTY_NOTICES and TODO.

**Deviations**

Records decisions only; no aircraft data, aerodrome data or simulator code.
The GPL-3.0-*or-later* variant and the "it fried on" reading are orchestrator
interpretations awaiting user confirmation. No independent quality/validate or
peer review was run for this documentation change.

## 2026-10-31 21:51 — Add and independently review repository-tool CI

TODO: 1.1.1 complete; parent 1.1 remains open for simulator-stack gates.
PR: [#3](https://github.com/gregoryyy/gefly/pull/3).
Agent: Codex orchestrator; geofs_research and product_refinement before parallel
code1/peer_runner, code2/peer_registration and housekeeping; independent quality
and validate, then an actual external Claude peer. Source snapshot:
`c4adb297d57e3ab77dc37879144ada84d582566c7b2e7dd645a23d903c786506`.

**Implementation notes**

Added `just ci` / `utils/ci.py` as one offline gate for scaffold checks, nonempty
tool tests and whitespace in all tracked current files, including clean
checkouts. Added pinned read-only GitHub Actions, Python 3.11/3.15 jobs and weekly
reviewed action-update proposals. E0-CI, contributor instructions, security and
source/license inventory describe acceptance and limits.

Quality found two medium inherited-Git-environment defects in fixture writes and
production file coverage. Both were fixed and independently reproduced as
resolved using disposable repositories; the suite grew from 18 to 41 tests.
Clean local checkouts invoked from unrelated directories pass on Python 3.11.12
and 3.15.2. The repaired-source hosted PR matrix passes all 41 tests on Python
3.11.17 and 3.15.1. Local validation and Claude CLI 2.1.193, reporting
claude-haiku-4-5-20251001, accepted the bounded criteria with no remaining findings.
See [RESULTS](RESULTS.md) and [peer evidence](reviews/2026-10-31-ci-peer.md).

**Deviations**

This completes the existing repository-tool slice, rather than selecting a
simulator stack. Parent 1.1 retains runtime lint/types/dependency/test work. Hosted
patches differ from local versions; action pins do not make runner/interpreter
inputs hermetic. The peer inspected recorded evidence without running commands.
No simulator, aircraft/training validation, branch protection, fork/main-push
event or updated PDF is claimed. All original aircraft/license/provider decisions
remain in their existing scope.

**Insights**

An empty working-tree diff cannot prove tracked content has valid whitespace.
Git environment variables can override a subprocess working directory, so both
the gate and its fixtures must neutralize repository/index redirection.

## 2026-10-31 17:17 — Add and exercise the independent opposite-provider peer

TODO: 0.17 complete. PR: [#2](https://github.com/gregoryyy/gefly/pull/2), following merged #1.
Agent: Codex orchestrator; product_refinement, peer_runner, peer_registration and
housekeeping on disjoint paths, then independent local quality/validate and an
actual external Claude peer. Model reported by the external CLI:
claude-haiku-4-5-20251001; CLI 2.1.193.

**Implementation notes**

BOOT/AGENTS and the active workflow now define nine roles. Peer adds Claude
quality/specification review for Codex work and the reciprocal Codex route for
Claude work. Added the canonical role, both native dispatchers, a bounded packet
router, tests and recipes, R-AGENT-7 (50 stable IDs), process/security/dependency
and PR evidence conventions. No model alias or local subagent is represented as
an external provider. Missing access/identity/evidence blocks; findings remain
separate from criterion validation and final orchestrator acceptance.

Local checks pass: 65 Markdown records, nine native Codex definitions plus a
Claude dispatcher, 18 offline tests and whitespace. Local quality's revision-
whitespace bug was fixed and rechecked. The first live Claude attempt timed out
and was not passed. A completed Claude review found only missing justfile context;
its follow-up accepted full-header/argument evidence with no findings. Actual
reports, scope, snapshots, provider/model and limitations are in the
[cross-provider record](reviews/2026-10-31-cross-provider-peer.md).

Publication recorded 2026-10-31 17:23 Europe/Berlin: rebased onto merged main, pushed
`chore/cross-provider-peer` and created draft PR #2. Source content remains the
reviewed snapshot; only bookkeeping/review-evidence files changed afterward.

**Deviations**

Cross-provider evidence covers this new peer addition, not every older roadmap
change or simulator implementation. Claude inspected packets and recorded test
outputs, without independently running commands. The reverse live Codex route and
native agent discovery were not exercised; offline routing/previews cover those
adapters. Existing configured model/authentication was used without install,
account change, permission bypass, unrequested posting or PDF generation.

**Insights**

A peer can refuse incomplete context even when code is correct; preserve both
the original concern and its resolution. Process success, reviewer recommendation
and provider/coverage acceptance are different observations. Fresh other-provider
execution is stronger than renaming a local role or choosing another model alias.

## 2026-10-31 15:49 — Add sailplane and ultralight pilot-qualification roadmap tracks

TODO: 0.16 complete; future profile contract in 1.12. PR: [#1](https://github.com/gregoryyy/gefly/pull/1), documentation refinement.
Agent: Codex orchestrator; geofs_research, product_refinement and independent quality/validate.

**Implementation notes**

Preserved the user's ROAD request and added distinct sailplane/ultralight tracks,
R-TRAIN-6, GAPS Q14, the profile-contract task, E12 coverage gates and a linked
primary-source research note. Each future profile identifies jurisdiction,
authority, full qualification/category, applicable source editions, privileges,
prerequisites, aircraft/equipment and exercises. Common infrastructure may be
reused while category-specific controls/physics and lessons need their own
reference cases and qualified review. The initial C172/EASA PPL direction stays
first; no order relative to CPL was imposed for the new tracks.

`just check` passes for 61 Markdown records/eight roles; SPEC has 49 unique IDs,
with the original 48 retained in relative order. Whitespace checks pass.
Independent quality and validation accepted documentary coverage with no findings.
The existing draft PR's title/body will be updated to describe its full controls,
briefing and qualification-roadmap scope.

**Deviations**

No sailplane/ultralight model, course or qualification eligibility is validated.
EASA sailplane SPL/Part-SFCL and German national ultralight rules are source
references, not user-selected jurisdictions/categories. Source compilation/date
and amendment-verification limits are explicit; current syllabus acceptance is a
future gate. No software-license choice, source data import or PDF build occurred.

**Insights**

Pilot-qualification profiles need full jurisdiction/category identifiers; an
acronym alone can be ambiguous. Sharing a simulator platform, maneuver or aircraft
component does not establish syllabus equivalence or training-credit transfer.

## 2026-10-31 15:43 — Resolve Mac controls and scenario-first briefing decisions

TODO: 0.10.1 and 0.15 complete. Branch: `docs/mac-controls-scenario-briefings`.
Agent: Codex orchestrator; product_refinement, independent quality and validate.

**Implementation notes**

Recorded the user's Q4/Q11 answers and hardware clarification in an immutable
input record, resolved both GAPS entries and propagated decisions into SPEC,
CONCEPT, ARCH, ROAD, TRAINING, EVAL, TODO and README. Required first input baseline:
Mac desktop keyboard/touchpad. Optional hardware: yoke/joystick and rudder pedals
only. GeoFS-inspired settings are sourced in [CONTROLS](design/CONTROLS.md);
mobile orientation remains later. Q11 accepts versioned historical/generated
scenario briefings first, evaluated at scenario time and frozen for review; the
live-data adapter remains optional later work.

`just check` passes for 59 Markdown records/eight roles; all 48 requirement IDs
remain unique and unchanged. Whitespace checks pass. Independent quality found no
issues. Validate accepted documentary coverage and requested README preserve the
word “optional”; that wording was corrected and independently rechecked. Preparing
a branch commit and draft PR; main remains at the published initial foundation.

**Deviations**

This updates requirements and design only; no controller, Mac browser, weather
feed or simulator runtime has been tested. Exact Mac/macOS/browser versions,
peripheral models, performance budgets and provider choices remain technical
foundation selections. GeoFS settings are reused conceptually from its official
instructions, without importing source code or private settings. No PDFs rebuilt.

**Insights**

A fixed first input baseline does not imply universal peripheral/browser support.
Historical/generated briefings need scenario-time validity and preserved inputs;
their usefulness does not depend on a live feed being available.

## 2026-10-31 15:33 — Publish the initial foundation to a new public GitHub repository

TODO: 0.8.1/0.8.2 complete. PR: initial bootstrap publication.
Agent: Codex orchestrator; prior bounded publication review by quality.

**Implementation notes**

Created [gregoryyy/gefly](https://github.com/gregoryyy/gefly) as a new public
repository and pushed `main`. GitHub reports PUBLIC, nonempty, default branch
`main`. `git ls-remote origin refs/heads/main` matched initial foundation commit
`2b4d76f90e1eaed2c5c3e352ef839e271135e328` after the successful push. Added `origin` and tracking for `main`.
The initial commit contains 75 source/document files, including preserved upstream
notices/license text; generated PDFs/caches are ignored. `git diff --cached --check`
passed with a targeted `.gitattributes` rule preserving the exact upstream GPL
file's original CRLF line endings. Gitleaks reported no leaks and structural
checks passed. This follow-up bootstrap record captures the observed publication;
subsequent feature development uses branches/PRs under the normal project rules.

**Deviations**

There is still no runnable simulator or selected project-wide license for original
Gefly material. Propeller-derived bootstrap files retain GPL-3.0-or-later as
recorded in THIRD_PARTY_NOTICES. No hosted application, datasets or LLM service
was deployed by creating the repository. The default whitespace check initially
flagged the verbatim upstream license's CRLF endings; the file-specific attribute
preserves that text without weakening source-file checks.

**Insights**

The public repository and initial content are now available independently of
future implementation choices. Publication is supported by GitHub visibility,
default-branch and remote-hash observations rather than an inferred push result.

## 2026-10-31 15:31 — Prepare the initial public repository publication

TODO: 0.8.1 complete; 0.8.2 publication in progress. PR: initial bootstrap.
Agent: Codex orchestrator; independent bounded review by quality.

**Implementation notes**

The user explicitly authorized a commit and push to a new public repository once
the initial content was ready. Verified GitHub authentication as `gregoryyy` and
that `gregoryyy/gefly` did not exist before creation. The completed structure and
48-requirement specification retain their prior independent reviews. The bounded
publication review found no blockers in candidate paths, input scope, provenance
or implementation claims. `just check` passes for 57 Markdown records and eight
native roles. Gitleaks 8.30.1 directory scan with full redaction reported no leaks.
Generated PDFs, stamps, caches and secrets patterns are excluded from Git.

Upstream Propeller README declares GPL-3.0-or-later. Preserved those terms for
its derived BOOT/build/PDF files, retained attribution and dated adaptations,
added [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md), and copied the upstream GPL
license text byte-for-byte into `LICENSES/`. A project-wide license for original
Gefly material remains Q5. Publication target: `https://github.com/gregoryyy/gefly`;
initial default branch `main`. Actual creation/push verification follows below
when observed.

**Deviations**

No application implementation or deployment is part of publication. Initial
bootstrap publication may include its verification record in a follow-up bootstrap
commit; subsequent development uses feature branches and PRs. Sandbox authentication
initially appeared invalid; the normal local keyring worked with the required
execution permission. No credential was copied into the repository.

**Insights**

Public visibility, retained upstream licenses and a final license for original
project material are distinct records. A local secret scan and file inventory are
publication checks, not proof of simulator fidelity or complete license compliance.

## 2026-10-31 15:25 — Accept the expanded product, roadmap and architecture records

TODO: 0.11–0.14 complete. PR: none; local uncommitted refinement.
Agent: Codex orchestrator; independent quality and validate subagents.

**Implementation notes**

[Quality](reviews/2026-10-31-product-refinement-quality.md) reports no unresolved
findings. [Validation](reviews/2026-10-31-product-refinement-validation.md) accepts
documentary coverage of all 21 new themes/requirements and preservation of the
original 27 IDs (48 total). The user directions, research distinctions, proposed
sequencing and implementation decisions are linked across SPEC, CONCEPT, TRAINING,
ROAD, ARCH, EVAL and GAPS. Both reviewers independently matched the final 64-file
substantive hash `39b4e72b35672cd890a7deca86cfc5f6a5f9959c1575474945b9840d1f54f09a`. Quality's low pressure-setting wording concern
was corrected from “standard preset” to “standard-pressure setting” and rechecked.
Final `just check` passes for 55 Markdown records and eight native role definitions.
Exact review scope, evidence and limits are in [RESULTS](RESULTS.md) and the reports.

**Deviations**

The changed artifact is research and documentation. No simulator/community site,
EDDF region geometry, live data service, LLM authoring runtime or adopted flight
engine/model is claimed complete. The engine/aircraft fit, official EDDF center,
source/asset rights, exact open-source license, hosting and AI provider remain
open. Earlier bootstrap reviews and PDF builds retain their historical scope;
current document updates were checked structurally and independently reviewed,
not rebuilt as PDFs.

**Insights**

A small aircraft catalog can combine easy browser access with deeper instrument
practice. Source-backed regional experiences and reusable open dynamics are
compatible with the user direction, while community publication and AI authoring
need explicit provenance, review and reproducibility boundaries. Coverage of a
requirement in a specification is not evidence of its runtime implementation.

## 2026-10-31 15:21 — Refine GeoFS-inspired training, community and regional architecture

TODO: 0.11/0.13 complete; research/review work in 0.12/0.14 in progress. PR: none.
Agent: Codex orchestrator; subagents: geofs_research and product_refinement.

**Implementation notes**

Preserved the expanded user input and answers. Added source research on GeoFS
capabilities/community and EDDF regional data/open-engine reuse. Product added
21 stable requirements (48 total), preserving the original 27. Updated concept,
training journey, architecture, roadmap, evaluations, source/security inventory
and decision records. User chose classic instruments before glass, QNH/QFE/standard,
a free/open-source flight-school community, LLM-created regional flight experiences,
EDDF/100 NM and reuse of open physics engines/models. `just check` passed for
53 Markdown documents/eight native roles; requirement/whitespace checks passed.
The substantive pre-review snapshot has 64 files and SHA-256
`f501ccb6f4814528ff16b75a08016ce6aa1d0122cadf308275d5869ddd279347`; bookkeeping/reviews/generated files are excluded by the
same path/bytes hashing convention as the bootstrap reviews.

**Deviations**

These are documentary requirements and architecture updates, not a new simulator,
community site, generated region, LLM integration or adopted engine. Current
GeoFS instructions already document some reported features; research labels
presence/uncertainty rather than asserting product-wide absence. Community
reports are a small, versioned convenience sample. Official current EDDF ARP
coordinates and dataset/chart rights remain unresolved; no guessed center or
restricted chart pack was accepted. Exact license/provider/hosting choices remain
open. Previous bootstrap reviews/PDF smoke builds describe their old snapshot;
updated documents have not been rebuilt as PDFs in this task.

**Insights**

The comparison is about usable cockpit/training depth, not a list of supposedly
absent navigation features. Generated maps may render real data; fictional facts
must stay distinct. Open-engine reuse reduces duplicated work but does not certify
an aircraft model. LLM authoring needs sourced assets and validated scenario state.

## 2026-10-31 15:07 — Accept the project structure and agent workflow

TODO: 0.7 complete; 0.8 local setup complete. PR: none. Agent: Codex orchestrator;
independent subagents: quality and validate. Earlier creation used researcher,
product and housekeeping. No code1/code2 simulator implementation was run.

**Implementation notes**

[Quality](reviews/bootstrap-quality.md) found no blocking defects.
[Validate](reviews/bootstrap-validation.md) accepted the nine foundation criteria
and the documented fidelity progression, leaving future simulator criteria not
evaluated. Both reviewed the same 58-file substantive snapshot; its hash and
actual checks are in their reports and [RESULTS](RESULTS.md). Validation requested
explicit test observations in this log; those were added and rechecked. Final
`just check` passes for 47 Markdown documents and eight native role definitions.
Two representative PDF smoke builds and their four-page visual review passed;
incremental reuse and the missing-browser failure path behaved as documented.

**Deviations**

This is a local uncommitted scaffold on `bootstrap/project-foundation`, with no
remote, selected source license or runnable simulator. Exact aircraft fit, target
controls/device, first exercise and stack decisions remain open in GAPS. Full
PDF batch, optional rendering paths and live agent discovery remain untested.

**Insights**

The requested workflow is concrete and reviewable: canonical prompts, native
registrations, dispatch/return contracts, parallel implementation/housekeeping
ownership and distinct independent review gates. Static configuration and a
project specification establish a foundation, not validated aircraft behavior.

## 2026-10-31 15:05 — Verify local checks, document builds and Git setup

TODO: 0.7 verification portion; 0.8 local Git setup. PR: none; no remote or commits.
Agent: Codex orchestrator. Independent quality and validate reviews are in progress.

**Implementation notes**

`just check` passed for 45 Markdown documents and eight native agent definitions.
`just reqs` listed 27 requirements. Recipe parsing/source discovery passed. Built
`docs/IDEA.md.pdf` (one A4 page) and `docs/agents/README.md.pdf` (three A4 pages),
rendered and visually inspected all four pages with no observed clipping/overlap.
Repeating both builds reported `up to date`. A deliberately missing CHROME path
failed with exit 2 and actionable guidance. Ignore checks cover generated output,
stamps and secrets while preserving `.env.example`. Initialized Git and switched
to `bootstrap/project-foundation`; no commits or remotes. Exact commands,
environment and limitations are in [RESULTS](RESULTS.md).

**Deviations**

Sandboxed Chrome startup and Git metadata creation initially failed; retries with
the required local execution permissions succeeded. Pandoc reports an inherited
`--mathml` deprecation warning but produces PDFs. Only two representative PDFs
were built; full batch, Mermaid and LaTeX paths were not evaluated. Live native
agent discovery, aircraft physics, avionics and training outcomes remain untested.
No dependencies were installed and no source license or remote was selected.

**Insights**

Document/check tooling is usable independently of the future runtime stack.
Structural agent configuration checks establish parsed definitions and references,
not live discovery or operating-system permission enforcement. Independent reviews
must assess the completed scaffold without treating future simulator criteria as
already satisfied.

## 2026-10-31 15:02 — Establish the Gefly foundation

TODO: 0.1–0.6. PR: none; local bootstrap, remote undecided (GAPS Q6).
Agent: Codex; model/reasoning configuration not independently recorded. Subagents:
researcher, product and housekeeping, with disjoint file ownership.

**Implementation notes**

Preserved the original brief and user answers. Imported and adapted BOOT with
source hash and upstream-example boundaries. Created the initial product,
architecture, security, evaluation, process, plan and dependency records. Added
eight canonical role prompts and native Codex TOML registrations, parallel coding
and housekeeping ownership, separate quality and specification-validation gates,
source research and check/document recipes. User selected C172, EASA PPL first,
web application similar to GeoFS. Runtime directories contain scope notes.

**Deviations**

Source license, remote and actual simulator implementation are not selected or
completed. Propeller-specific trackers/hooks and native Claude agent wrappers are
optional source examples, not installed features. A dedicated deep research skill
was unavailable; researcher disclosed focused multi-source primary research.
Scaffold checks and document-build observations are recorded after execution.

**Insights**

Existing browser simulation and progressive lessons mean the proposed advantage
must be evaluated. Aircraft family identity is insufficient for real controls,
avionics and physics: exact configuration, applicable sources and independent
reference cases are required. Source survey is not aircraft validation.
