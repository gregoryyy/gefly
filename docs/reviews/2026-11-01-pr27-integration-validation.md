# PR 27/28 integration validation

Independent reviewer: Codex `validate`, without integration/source authorship.
Recorded **2026-11-01 22:18 Europe/Berlin**, from the execution clock.
Disposition: **accept I1–I5 for the resolved integration**, with the separate
execution and peer limits below. No unresolved validation finding.

## Frozen scope

Feature parent: `e8d0a07106459b48d3e55b031475a5519a5f62dd`.
Incoming main: `aeb5d3f900fd601461a7b3187a669d9090cb84ed`.
The reviewed artifact is the staged/resolved working tree, not a claimed new
merge commit or hosted result. Independently recomputed all **197 source files**
in `output/assurance/pr27-integration-snapshot.json`: exact SHA-256
`b05625084514e565e8e12273df9acfa4f23da7ea4cee2de086c14563ab7243c3`.
The algorithm hashes sorted relative path, NUL, file bytes, NUL. TODO/DONE and
other source/status documents are included; review records and ignored generated
output are excluded.

Scope is conflict resolution, record/task preservation and CI composition.
Unchanged E2 arithmetic is not reauthored or independently reaccepted as aircraft
physics by this review.

## Criterion matrix

| Criterion | Expected | Independently observed evidence | Result |
| --- | --- | --- | --- |
| I1 whole-record history | Preserve all 50 complete feature entries, insert the entire incoming 19:35 E2 entry and add one 22:14 integration entry; 52 unique chronological records; preserve GAPS. | Compared raw heading-through-next-heading blocks against both actual Git parents: all 50 feature blocks are byte-identical, including separators; the unique incoming E2 block is byte-identical. Current DONE has 52 unique headings in newest-first order. GAPS is byte-identical to the feature parent; its existing Q22 addition relative to main is retained. The selection audit's 51 records describe the parent-record union before the new integration entry, not a lost final record. | **Pass** |
| I2 task reconciliation | Exactly one checked 1.3.1 for calculation groundwork; parent 1.3 and aircraft work 1.3.2–1.3.4 remain open; retain 1.15. | Parsed authoritative TODO: one 1.3.1, checked, explicitly limited to the calculation tool and synthetic arithmetic fixtures. Parent 1.3 and all three aircraft/model follow-ups remain unchecked. The text retains sourced-input, JSBSim mapping, M-a and peer limits. Completed tool-layout task 1.15 remains present. | **Pass** |
| I3 CI composition | Retain relocated CI, E1 and E2 studies, assurance, exact parent-union CI test identities and complete tool discovery; root/unrelated-cwd behavior. | All 12 production runner function ASTs equal the feature parent; only the study registry adds E2. CI test identities are exactly the union of feature 36 and incoming 33: **38**, with none lost. Actual Python discovery finds **139** tool tests. Incoming zombie-aware test helper AST matches main. All 27 assurance files remain byte-identical to feature, preserving the 72-test suite and new paths. Two independent focused CI executions pass: E2 failure rejects the shared gate, and the absolute runner executes all fixture phases from an unrelated directory. | **Pass — Linux-specific execution limit retained** |
| I4 unchanged incoming code and clean resolution | Five E2 files byte-identical to main; preserve production CI behavior; valid links, whitespace and no conflict markers. | Independently compared all five `studies/e2-c172s/` files to incoming Git objects: exact bytes. Inspected the staged runner/doc reconciliation. `git ls-files -u` is empty; scanning all 197 source files finds no conflict-marker lines; staged whitespace check passes. Actual relocated checker from `/private/tmp` passes **125 Markdown files**, nine native Codex definitions and Claude dispatcher. | **Pass** |
| I5 evidence and scope | Report actual results/skips; preserve peer-pending cadence; earlier peer records do not accept E2, M-a or the new integration. | Current integration DONE, TODO, study index, utilities documentation and FDM note distinguish synthetic arithmetic groundwork from aircraft inputs, structural/JSBSim adapters, M-a, validated model and simulator milestones. The integration explicitly remains peer pending under the batched cadence and labels earlier peer coverage historical. Current catalog remains 14 planned / zero accepted, with all four archival observations ineligible. | **Pass — bounded local integration acceptance** |

## Execution evidence

Inspected actual `output/assurance/pr27-integration-ci.log`: Python **3.11.12**,
Apple Git **2.39.5**, Node **26.13.0**. The shared gate completed successfully:

- Repository tools: **139 discovered, 138 executed successfully, one skipped**
  (`ProcessStateTests`, requiring Linux process states). This is not 139 passes.
- E2: **25 executed successfully, zero skips**.
- E1: **14 executed successfully, nine optional JSBSim tests skipped**.
- Assurance: **72 passed**; synthetic rendering, integrity and tracked-content
  whitespace passed, the latter covering **220 tracked paths**.

The full-run scaffold count was 123 before final record/review additions; the
independently renewed checker reports 125. Neither count is substituted into the
other execution. The final shared-gate line retains the E1 skips; the separate
repository-tool Linux skip remains explicitly recorded above.

Without rerunning the unchanged mathematics or full suite, independently ran:

- Actual discovery plus AST/test-identity and raw-byte/record comparisons against
  both parents, rather than relying on the selection audit or checked boxes.
- `CiEntrypointTests.test_mass_study_failure_fails_shared_gate` and
  `test_absolute_entrypoint_runs_all_gates_from_unrelated_directory`:
  **two passed, zero skips**, using isolated temporary repositories.
- Absolute assurance `check --json` from `/private/tmp`: exit **0**, 5,939 nodes,
  8,428 facts, **zero errors, 97 warnings, 82 notes**; 14 planned/zero accepted.
- Actual assurance `diff origin/main`: from incoming `aeb5d3f…` to the resolved
  worktree, **707 added, 46 removed, 363 changed** nodes; impact not truncated.
- Relocated checker from `/private/tmp`, conflict-index/source scans and
  `git diff --cached --check`: passed as described above.

The imported E2 calculation/test files are unchanged from main; preserved tests
and input labels do not establish aircraft-specific mass/inertia, coordinate
adapter correctness, model fidelity or learning validity. No new source right,
M-a, MVP or training-credit acceptance is inferred. New hosted execution is **not
evaluated** here. Cross-provider peer coverage for this integration remains
**pending**, separately from this local acceptance; under the recorded batched
policy, that is not a draft-publication blocker. Only this assigned review was
edited by the validator; no source implementation or project Git state changed.
