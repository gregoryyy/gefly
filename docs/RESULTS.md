# Evaluation results

No simulator, aircraft fidelity, performance or learner study has run. Planned methods and stop criteria are in [EVAL](EVAL.md). Source research is indexed separately in [research](research/README.md).

## 2026-10-31 15:03 — E0 bootstrap checks and PDF smoke build

Scope: local uncommitted scaffold on `bootstrap/project-foundation`; no HEAD commit
or remote. Commands below ran on this working tree before independent reviews.
Environment: macOS, Python 3.11.12, just 1.59.0, pandoc 3.13, locally installed
Google Chrome. Time is Europe/Berlin. The source BOOT SHA-256 matches the value
recorded in the imported guide; the sibling source was read only.

| Check | Observed result |
| --- | --- |
| `just check` | Passed: 45 Markdown documents, eight native agent definitions; file/link targets and configuration parsed. |
| `just reqs` / `just reqs AGENT` | Listed 27 requirement declarations / six agent-workflow requirements from SPEC. |
| `just --list` / `just --dry-run docs docs/agents` | Recipes parsed and documentation alias resolved. |
| `just sources docs/agents` | Enumerated workflow index and all eight role prompts. |
| `just pdf docs/IDEA.md` | Generated one A4 page after running Chrome with the required local execution permission. |
| `just pdf docs/agents/README.md` | Generated three A4 pages after the same permission retry. |
| Repeating both PDF commands | Both reported `up to date`; no rendering needed. |
| PDF inspection with PyMuPDF and page PNGs | All four pages rendered and visually inspected: readable text/table, no observed clipping or overlap; page dimensions approximately 595 × 842 pt (A4). |
| `CHROME=/tmp/gefly-missing-chrome just pdf docs/IDEA.md` | Expected failure, exit 2, with installation/override guidance; no silent success. |
| `git check-ignore` for generated PDFs, stamps, `.env` and `.env.example` | Generated PDFs, stamps and `.env` ignored; `.env.example` not ignored. |
| `git init -b main` then `git switch -c bootstrap/project-foundation` | Local repository/branch initialized with required filesystem permission; `git remote -v` empty and `just refs` reports no commits. |

The initial sandboxed PDF attempt aborted when Chrome launched and produced no
PDF; the permission retry succeeded. The initial sandboxed Git initialization
was blocked by protected metadata; the permission retry succeeded. These were
execution-environment constraints, not passing builds. Pandoc prints a deprecation
warning for inherited `--mathml`; it still renders successfully on the recorded
version. No packages, browsers or plugins were installed.

Limitations: only two representative PDFs were built. Mermaid and LaTeX paths,
full document batch generation, external link freshness, heading anchors, live
custom-agent discovery and enforcement are not validated by these commands. Native
agent TOML parses and points to role prompts; no autonomous orchestration daemon
or aircraft simulation was run. Physics, avionics, performance, learning outcomes
and training credit remain not evaluated.

## 2026-10-31 15:06 — E0 independent reviews

[Quality](reviews/bootstrap-quality.md) found no blocking findings in the 58-file
substantive scaffold. [Validation](reviews/bootstrap-validation.md) accepted all
nine foundation requirements and the documentary portion of progressive fidelity.
Both reviewed the same scoped SHA-256:
`6f13e663288e2c088700a913d9315e8b0376c54c0d76a842efa8892ab900aaef`.
The reports define exclusions and evidence, including separate inspection of the
bookkeeping and generated PDFs. Validation requested explicit observations in DONE;
that gap was corrected and rechecked. No substantive change followed within that
bootstrap snapshot; later refinements are recorded separately below.

Final `just check` passed for **47 Markdown documents and eight agent definitions**,
including review links. Future simulator requirements are not evaluated. This
accepts the local structure/workflow delivery; remaining milestone 0 decisions and
all implementation milestones remain open in TODO/GAPS.

## 2026-10-31 15:21 — Documentation refinement checks (E8 source review / planning)

The expanded source notes and product/architecture records pass `just check`
(53 Markdown documents, eight agent definitions). SPEC now declares **48 unique
requirements**; IDs were preserved while 21 expanded-scope requirements were added.
Documentation whitespace checks pass. The substantive 64-file snapshot
is `f501ccb6f4814528ff16b75a08016ce6aa1d0122cadf308275d5869ddd279347` under the review path/bytes hash convention. Independent
quality and validation reviews are pending for this snapshot.

The [GeoFS/community note](research/2026-10-31-geofs-gap-analysis.md) and
[EDDF/open-engine note](research/2026-10-31-eddf-open-foundation.md) record methods,
primary links, findings and source limitations. This is source research and
planning evidence, not hands-on simulator/learner validation. E5–E7 and E9–E11
remain planned protocols. Earlier bootstrap reports and generated PDF checks are
historical; they do not accept the changed specification or render its updates.
No engine/model/data pack or LLM/provider was installed; no community or simulator
was deployed. Exact official EDDF center, source/asset rights and implementation
choices remain decisions.

## 2026-10-31 15:25 — Independent refinement reviews

[Quality](reviews/2026-10-31-product-refinement-quality.md) has no blocking or
unresolved findings. Its low ambiguity about a classic altimeter's standard-pressure
setting was repaired and independently rechecked. [Validation](reviews/2026-10-31-product-refinement-validation.md)
accepts documentary coverage for the 21 added requirements and confirms all 27
original IDs remain. Future implementation criteria are not evaluated.

Final reviewed substantive snapshot: **64 files**, SHA-256
`39b4e72b35672cd890a7deca86cfc5f6a5f9959c1575474945b9840d1f54f09a`. Both reports define its path/bytes algorithm and exclusions;
TODO, DONE, RESULTS and reviews are bookkeeping/evidence inspected separately.
The pre-review hash above is historical; the E6 wording repair produced this final
hash. Final `just check` passes **55 Markdown documents and eight agent definitions**.
No substantive changes followed final review. No new PDF build, runtime validation,
service deployment, bulk data ingestion or provider installation occurred.

## 2026-10-31 15:31 — Initial publication preparation checks

`just check` passes for 57 Markdown records and eight native roles. Gitleaks
8.30.1 (`gitleaks dir --redact --no-banner --no-color .`) scanned approximately
365 KB and reported no leaks. A separate read-only publication review found no
blockers in candidate file types, original-input scope, notices or implementation
claims. The included GPL text matches the upstream source bytes; exact original
Gefly licensing remains Q5. GitHub authenticated as `gregoryyy`; lookup of
`gregoryyy/gefly` confirmed the name did not exist before creation. No successful
push is inferred from these preparation checks; remote verification is recorded
when actually observed.
