# Progress log

Times use Europe/Berlin; timestamps come from the execution clock. New entries go
above previous entries. This log records implementation, not simulator validity.

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
The user confirmed GPL-3.0-or-later, the "it depends" reading and the
172S-first order at 07:08. No independent quality/validate or
peer review was run for this documentation change.

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
