# Progress log

Times use Europe/Berlin; timestamps come from the execution clock. New entries go
above previous entries. This log records implementation, not simulator validity.

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
