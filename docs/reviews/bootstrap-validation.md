# Bootstrap specification validation

Validator: independent Codex `validate` subagent; not a scaffold author.
Recorded: 2026-10-31 15:05 Europe/Berlin, from the session clock.
Recommendation: **accept the project-structure and agent-workflow delivery**.
No in-scope acceptance criterion remains failed or blocked. This recommendation
does not accept any future simulator behavior or aircraft/training claim.

## Artifact and method

Validated the uncommitted working tree on `bootstrap/project-foundation`, with
no HEAD commit or remote. [SPEC](../SPEC.md) SHA-256:
`7081ebaf947e143dc7b603d40ca42de9a490a12ef0e45b6da59d53ba229a05ed`.

The substantive 58-file snapshot matches the independent quality review:
`6f13e663288e2c088700a913d9315e8b0376c54c0d76a842efa8892ab900aaef`.
Hash procedure: sort included absolute paths under the repository root; update
SHA-256 with relative POSIX path bytes, NUL, file bytes, NUL for each file.
Exclude `.git/`, `.pdfstamps/`, Python `__pycache__/`, `docs/reviews/`, generated
`*.md.pdf`, and `docs/TODO.md`, `docs/DONE.md`, `docs/RESULTS.md`. Those bookkeeping
and evidence files were inspected separately and may receive final status updates.
Substantive changes invalidate affected validation and require rechecking.

Inspected the deliverable rather than inferring acceptance from checked tasks or
an implementer's summary: source/local BOOT, project records, every canonical role
and native TOML wrapper, workflow/dispatch contracts, documented commands, source
research, user decisions, progression and output artifacts. Ran structural checks
and independent hash/configuration/PDF inspections. Scope is the documented
foundation criteria in [EVAL E0](../EVAL.md); native client discovery, autonomous
runtime enforcement and concurrent simulator implementation are not claimed tested.

## Acceptance matrix

| Requirement | Expected | Observed evidence | Result |
| --- | --- | --- | --- |
| R-BOOT-1 | Include the supplied guide, record provenance and extend it with the requested roles; source untouched. | [BOOT](../BOOT.md) retains the source guide with scoped adaptations and the full Gefly extension. Its recorded source SHA-256 equals the currently read sibling file: `2bbe39a361ac879362571713b2e9e3cc2d08b29e6ea10ac76676c67376ef4509`. This validator performed only read operations on the sibling; no source write was required. | Pass |
| R-BOOT-2 | Create the specified project/document structure and authoritative links before implementation. | [README](../../README.md), AGENTS/CLAUDE, input, IDEA/GAPS/CONCEPT/SPEC/ARCH/EVAL/SEC/SDLC/STYLE/SBOM/TODO/ROAD/DONE and research/assurance records exist. Application, module, data, tests and studies boundaries have explicit scope notes. `just check` resolves local file links; no simulator implementation is implied. | Pass |
| R-AGENT-1 | Eight discoverable definitions with responsibilities, inputs, outputs and boundaries. | [Workflow](../agents/README.md) links orchestrator, researcher, product, code1, code2, quality, validate and housekeeping. Every prompt was inspected; eight `.codex/agents/*.toml` files parse with matching names and references to their canonical prompt. This is static discoverability, not a live client-discovery test. | Pass |
| R-AGENT-2 | Orchestrator owns user interaction/questions, dated decisions and precise blockers. | Orchestrator prompt and workflow route questions to the primary conversation. [GAPS](../GAPS.md) records the user's C172/EASA-PPL and web/GeoFS answers with author/time and resolution links; remaining variant/device/license/remote/exercise decisions identify their dependent scope. | Pass |
| R-AGENT-3 | Research evidence precedes requirements; use available deep research or disclose a rigorous fallback. | Researcher prompt, [research method](../research/README.md) and [foundation note](../research/2026-10-31-foundation-sources.md) disclose that no dedicated deep research skill ran. The note contains ten primary-source entries, applicability/rights/uncertainty and a stated unreadable Garmin PDF limitation. Product owns stable criteria in SPEC and must update the frozen revision before implementation. Source accuracy and all external URLs were not independently re-researched in this bootstrap review. | Pass |
| R-AGENT-4 | Equivalent code1/code2 streams can receive disjoint concurrent work against agreed interfaces. | Both prompts have equal implementation/test duties. Workflow/SDLC provide explicit write-set and frozen-contract dispatch fields; ARCH proposes separate module boundaries. Code2 is explicitly parallel with code1, and `coder1` is normalized to `code1`. No actual coding run is required by this foundation criterion. | Pass |
| R-AGENT-5 | Separate independent quality review from requirement validation; no self-approval. | AGENTS, SDLC and both reviewer prompts prohibit author self-approval, require stable artifact identity, route fixes back to coders and invalidate affected evidence after changes. [Quality report](bootstrap-quality.md) and this report are authored by independent workers and have distinct review purposes. Validation uses pass/fail/blocked/not evaluated. | Pass |
| R-AGENT-6 | Housekeeping runs alongside coding with an explicit, non-overlapping hygiene scope. | Housekeeping prompt and workflow assign documentation/tooling/inventory duties concurrently with both coding streams, reserve three worker slots when available and keep shared status/integration paths with one owner. The prompt forbids changing requirements/runtime behavior or deleting user data. This accepts the setup, not measured concurrent-runtime behavior. | Pass |
| R-BOOT-3 | Repeatable checks and PDF commands, with honest results/tool limitations in DONE. | `just check` and `just reqs` ran successfully. README/justfile/utilities document the entry points. Existing IDEA (one-page) and workflow (three-page) PDFs parse as A4 with text on all pages; their four rendered PNGs were independently inspected with no observed clipping/overlap. Both incremental stamps match source/assets and PDF hashes. [DONE](../DONE.md) now records actual checks, successful permission retries and limits, with detailed [RESULTS](../RESULTS.md). Orchestrator recorded repeated-build reuse and expected missing-Chrome exit 2; this validator did not relaunch builds. | Pass |
| R-FID-1, documentary portion | Concept and roadmap describe introductory and later aircraft-specific stages, each with scope, limits and gates. | [CONCEPT](../design/CONCEPT.md) has four staged learner/model/gate rows; [ROAD](../ROAD.md) separates foundation, PPL exercise, aircraft fidelity, avionics and CPL with measured gates. Both mark unverified behavior and distinguish evidence/learning/qualification. No running progression was evaluated. | Pass for documented progression only |

## Checks actually performed

- `just check`: passed initially for 45 Markdown documents and eight native roles;
  final re-run passed for 47 Markdown documents and eight roles, including the
  integrated review links.
- `just reqs`: listed 27 declarations from SPEC, including all nine foundation
  requirements and the progressive-fidelity requirement.
- `git status --short` and `git remote -v`: scaffold uncommitted, no remote.
- Python `tomllib` inspection: all eight role names and canonical prompt references
  present; project configuration enables agents with three worker threads.
- SHA-256 source/local BOOT provenance, SPEC and scoped substantive snapshot checks.
- Read-only PyMuPDF inspection: existing PDFs have one and three A4 pages, with
  nonempty text on each page; inspected all four existing page PNGs visually.
- Read-only incremental-stamp inspection: source plus three build assets and output
  hashes match for both representative PDFs.
- Rechecked DONE after requesting explicit observations there: the earlier missing
  bookkeeping evidence is resolved by its 15:05 entry, without substantive changes.

## Not evaluated and retained decisions

R-FID-2 through R-FID-4, R-SIM-1 through R-SIM-6, R-AIR-1/R-AIR-2,
R-DATA-1/R-DATA-2, R-TRAIN-1 through R-TRAIN-3 and R-EVAL-1 are **not evaluated as
implemented simulator requirements**. No aircraft, scenario, runtime avionics,
learning study, physics/latency benchmark or approved-device claim is accepted.
Future EVAL protocols are plans; their existence is not evidence that they passed.

Exact C172 variant/year/avionics, supported device/browser/controls, first exercise,
stack/dynamics engine, source license and remote remain explicit decisions. The
license and remote do not block this local structure delivery; their dependent
distribution/publication work remains open. No claim of independently verifying
every source, live Codex role discovery, role filesystem enforcement, full PDF
batch generation, Mermaid or LaTeX rendering is made.
