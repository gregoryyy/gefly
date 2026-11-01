# Tool-layout validation

Independent Codex `validate` reviewer; no implementation authorship. Recorded
**2026-11-01 21:48 Europe/Berlin**, from the execution clock. Scope: TODO 1.15,
T1–T5 below, affected AS1/AS6/AS7/AS8 and E0-CI CI1–CI3. Recommendation:
**accept the repaired bounded relocation**, with the runtime/provider limits below.

## Artifact and repair history

Base: `4339693144ea1db1549cb1eefe87ac03bba6ec6d`. Independently recomputed
the final `output/assurance/tool-layout-snapshot.json`: **192 source files**,
SHA-256 `6c3b75d114e9296d1dd3813c35352569f9535e6bca68da767b868c647691af1e`.
Hash sorted relative path, NUL, file bytes, NUL. TODO/DONE/RESULTS are included;
review records and ignored generated output are excluded. This is reviewed
working-tree content, not a claimed newly tested hosted commit.

The initial frozen hash was
`cd1ca934bc4f4443a60417bfa2d6ea36dcaf15a91bbfb270f503ee7e8d15c5ba`.
Quality reported a medium fail-closed gap: a committed mixed old/new layout with
a valid old inventory could omit the new inventory and evade checks of tampered
new vendor files. Its existing suite passed but did not establish rejection of
that case. The validator did not reproduce the pre-fix bypass before repair.
Coder repair changed only `graph.ts` and `graph.test.ts`; the final reader permits
legacy inventory fallback only for an **old-only committed snapshot**.
The initial artifact is not accepted retroactively.

## Criterion matrix

| Criterion / affected contract | Expected | Observed evidence | Result |
| --- | --- | --- | --- |
| T1 layout / AS1, AS8 | Runtime under `utils/assure/`, CI under `utils/ci/`; canonical assurance documents remain in `docs/assure/`; unchanged vendor bytes and original source identities. | Inspected staged rename/layout and current paths; no old runtime/CI files remain tracked at their former paths. `docs/assure/{SPEC,ASSR,catalog}` retain authority. Independently compared all 13 vendor files to base Git objects and inventory: identical bytes, SHA-256 and original `source` fields; only destinations move. Upstream remains `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`. | **Pass** |
| T2 commands/discovery / AS1, AS7, CI1–CI2 | Preserve public `just` commands and complete 137-Python/72-Node discovery; root and unrelated-cwd operation. | Public recipe names are unchanged, including ci/check/test-tools/assure-test/lineage/reqs. Inspected relocated runner/checker root calculation, reporter and workflow paths, package discovery and test imports. Actual Python discovery loads 137 cases; all 137 class/method identities match base after filename mapping. Initial root/unrelated-directory reports are byte-identical. Actual direct checker, `just check` and `just reqs ASR` work from `/private/tmp`. Recorded shared gate executes all 137 Python and 72 Node tests; independent focused CLI/graph tests execute 16, zero skips. | **Pass** |
| T3 selected revisions and missing inventory / AS1, AS6, AS8 | Read pre-relocation `4339693` and diff it against current state; reject missing current inventory, including mixed committed layouts. | Actual repaired CLI reads base with its old inventory: zero errors, with no new inventory object substituted. Actual final diff succeeds. Independently probed mixed committed old-valid/new-tampered/missing-new-inventory input: `upstream-inventory` error naming `utils/assure/UPSTREAM.json`. Reran all 13 repaired graph tests, zero skips; assertions also cover old-only committed positive, worktree fallback rejection, current-only missing inventory and mixed layout with a new pin that must detect new vendor tampering. | **Pass — initial gap repaired** |
| T4 generated output / AS7, CI3 | Generate only ignored `utils/assure/out` artifacts; retain escaping-path/symlink rejection and checking confinement. | Actual `just lineage` from `/private/tmp` writes the named `utils/assure/out/graph.json` and `report.md`; both are regular files and Git confirms both ignored. Inspected output guards and ignore rule. Executed relocated CLI fixtures generate outputs only in their temporary checkout and reject an escaping output symlink without writing the foreign target. Shared snapshot/path negative coverage remains recorded in the 72-test suite; path reader itself is unchanged. | **Pass** |
| T5 workflow/docs/history / AS6, AS8, CI1–CI3 | Update current workflow/links; preserve historical commands, observations and all 49 existing DONE entries; no new MVP claims. | Workflow invokes `python3 utils/ci/run.py --require-node`; current docs distinguish runtime and canonical contract locations. Actual scaffold check passes 120 Markdown files, nine Codex definitions and Claude dispatcher. Independently compared all 49 base DONE entries byte-for-byte: unchanged after the new entry. RESULTS is byte-identical. Historical review changes are five source hrefs pinned to recorded revisions plus navigation notes; Git confirms each pinned source object exists. Commands/findings/outcomes are unchanged. Catalog remains 14 planned / zero accepted. | **Pass** |

## Executed and inspected observations

Inspected the actual shared local log `output/assurance/tool-layout-ci.log`:
Python **3.11.12**, Apple Git **2.39.5**, Node **26.13.0**; **137 tool tests**
passed, **72 assurance tests** passed with zero assurance skips, synthetic render
check passed, and **14 study tests executed / nine optional JSBSim tests skipped**.
Tracked whitespace passed for **208 paths** at that execution checkpoint.
The final gate explicitly says “passed with skipped checks.” Its initial
116-Markdown count predates the final documentation/review additions; the renewed
actual scaffold count is 120, not a rewritten old result.

Independent focused executions:

- `node --test --test-reporter=./utils/ci/assurance-reporter.mjs utils/assure/src/cli.test.ts utils/assure/src/graph.test.ts`:
  **16 passed, zero skips** before the final inventory repair.
- Same reporter with repaired `utils/assure/src/graph.test.ts`:
  **13 passed, zero skips** at the final hash; the added mixed-layout assertions
  are inside the existing inventory test, so the suite count remains 72.
- Current absolute CLI/checker and `just --justfile /path/to/justfile` commands
  from `/private/tmp`, plus actual Python discovery and AST method-identity
  comparison against the base. The full Python suite was not redundantly rerun.
- Final absolute `check --json`: exit **0**, 5,882 nodes, 8,287 facts,
  **zero errors, 97 warnings, 82 notes**. Historical base report: zero errors,
  5,861 nodes and 8,278 facts. Final diff: **196 added, 175 removed, 104 changed**
  nodes; impact not truncated. Moved file identities legitimately differ.
- Initial unchanged-cwd report bytes: SHA-256
  `1280998f02b908e65970af75f994fc4be48de3547c3fb2cf465cb787389487d1`.
  This historical digest is not asserted for the repaired source bytes.
- Real generated lineage: both named ignored files exist, with the current
  zero-error summary and 14 planned/zero accepted seed semantics. Source and Git
  records were not mutated by this execution.

The 13 pinned dependency files, existing aircraft/evidence data and source IDs,
canonical requirements, raw historical inputs and all earlier progress/results
retain their meaning. The new TODO/DONE completion entry is scoped to relocation,
with separate review dispositions and explicit skipped checks.

## Limits

This validates repository-tool behavior and documentary preservation. New hosted
execution and cross-provider peer acceptance for this relocation are **not
evaluated** by this local report; earlier assurance peer coverage at `4339693`
does not cover this change. Their current dispositions remain separate. No
simulator, aircraft/model fidelity, source right, learning or training-credit
claim is accepted. The validator edited only this assigned review as source;
the explicit lineage test also created the two ignored disposable outputs and
the existing tests used temporary fixture repositories.

## Final shared-gate observation — 2026-11-01 21:50 Europe/Berlin

Execution-clock time. Inspected `output/assurance/tool-layout-ci-final.log` for
the repaired source, with the orchestrator's invocation from `/private/tmp`.
This execution used **Python 3.15.2** (Homebrew), **Apple Git 2.39.5** and
**Node 26.13.0**; it is distinct from the initial root run's Python 3.11.12.
The final shared gate passed **137 Python tool tests, 72 assurance tests**,
assurance integrity, scaffold checks and whitespace for **212 tracked paths**.
The study phase executed 14 tests and explicitly skipped nine optional JSBSim
tests; the final gate line preserves those skips. No new implementation defect
remains after the repaired inventory checks.

The final shared log scanned **120 Markdown files**. The validator's subsequent
`just check` scanned **121** because the explicit lineage test had also generated
the ignored `utils/assure/out/report.md`; it passed with the same nine native
roles and Claude dispatcher. The separate current tracked-content whitespace
check also passed 212 paths. Independently rehashed all 192 source paths after
these checks and output generation: unchanged
`6c3b75d114e9296d1dd3813c35352569f9535e6bca68da767b868c647691af1e`.
T1–T5 acceptance stands for that frozen scope; peer and any later hosted result
must retain their own exact revision and remain separate evidence.
