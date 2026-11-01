# E2 component mass-properties builder handoff

Recorded 2026-11-01 19:35 Europe/Berlin. Builder: Codex orchestrator with parallel
code1/e2_math, code2/e2_cli and housekeeping/e2_docs. Independent local reviewers:
e2_quality and e2_validate (Codex; neither authored the implementation).
Claude is the requested opposite-provider reviewer; **peer pending**. No Claude CLI
is installed here, so no external review result or model identity is claimed.

## Frozen scope and evidence

Base: `65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c` (PR #26 merged).
Refs: TODO 1.3.1; FDM-172S §1.3, EVAL E2; SPEC R-AIR-1, R-DATA-2,
R-SIM-5/6 and R-FID-3. This prepares generic synthetic arithmetic, not an aircraft
model or M-a acceptance. All new implementation and integration are Codex-authored.
No aircraft-source documents, model data or private user material were imported.

Implementation snapshot SHA-256: `196f602cb465664325727bde5fc07bf159f1246bdf70740ae557af0f80af373b`. Reproduce by sorting the paths below,
then hashing UTF-8 relative path, NUL, file bytes, NUL for each. Status records and
this review evidence are excluded; the commit carrying this report identifies the
complete handoff. The snapshot is a source hash, not the CLI's raw-input hash.

- `docs/design/FDM-172S.md`
- `studies/README.md`
- `studies/e2-c172s/README.md`
- `studies/e2-c172s/build_mass_properties.py`
- `studies/e2-c172s/mass_properties.py`
- `studies/e2-c172s/test_build_mass_properties.py`
- `studies/e2-c172s/test_mass_properties.py`
- `utils/README.md`
- `utils/ci.py`
- `utils/test_ci.py`

## Local quality review

No unresolved findings for the bounded tool. One low finding was fixed before
handoff: using the first component as reference lost a small distant mass's CG
contribution under extreme dynamic range. The frozen implementation chooses a
largest-mass reference with deterministic nearest-origin/coordinate tie-breaking;
light/heavy and equal-mass order regressions pass. The quality reviewer rechecked
the final refinement and all 25 E2 tests.

Additional independent numerical checks by quality: 1,000 synthetic component
builds compared with separate NumPy second-moment aggregation; 3,000 symmetric
tensor physicality classifications compared with eigvalsh; no classification
mismatches. These are exploratory local checks, not new runtime dependencies or
exhaustive precision guarantees. Exact-rational validation independently checked
100 seven-point systems, reversed input order and the extreme mass-ratio regression.

## Validation matrix

| Criterion | Result | Evidence |
| --- | --- | --- |
| Total mass and weighted CG in explicit SI/body-axis orientation | Pass | Analytic point/block cases, translations, mass/length scaling and independent rational references. |
| Intrinsic tensor + parallel-axis theorem, negative off-diagonal products | Pass | Off-axis point-mass fixtures and independent second-moment comparisons. |
| Reject nonpositive/nonfinite/malformed inputs and unrealizable tensors | Pass | 17 core tests cover singular physical bodies, coupled impossible tensors, dimensions, types, duplicates and overflow; scaled physicality allowance is documented. |
| Strict JSON CLI, raw input hash, explicit unvalidated label | Pass | Eight subprocess tests; errors leave stdout empty and do not modify input; README example independently executed. |
| E2 suite participates in shared CI | Pass | Gate registers E2; a negative fixture proves an E2 assertion failure fails the gate. |
| Timeout fixture distinguishes killed zombies from live children | Pass | Live/unreaped-child regression and both actual grandchild timeout variants passed; no production cleanup change. |
| Final local full gate | Pass with skips | 134 tool tests, 25 E2 tests, 14 E1 tests and synthetic render check passed; 9 optional JSBSim engine tests skipped. [Full output](2026-11-01-e2-mass-properties-ci.txt). |
| Actual 172S mass/CG/geometry/provenance, structural axes, JSBSim product signs and M-a | Not evaluated / outside scope | No aircraft inputs or adapter supplied; dependent work remains open. |
| Opposite-provider review | Pending | Claude reviewer must inspect the branch; local Codex reviews do not satisfy this gate. |

## Claude review request

Review the frozen changed files and the base-to-branch diff for numerical
correctness, invalid-input behavior, tensor/frame conventions, meaningful tests
and CI integration. Return separate quality findings and criterion validation.
Check the documented exclusions: no sourced aircraft values, inferred geometry,
JSBSim XML adaptation, provenance certification or M-a completion. User choices
still needed for aircraft-specific build work remain in FDM-172S §7.

The CI fixture correction addresses an observed baseline failure: container PID 1
does not reap orphaned killed children, and `kill(pid, 0)` succeeds for zombies.
Linux `/proc/<pid>/stat` state Z now establishes termination; unreadable/unknown
states remain live/unknown and do not make the test pass. Live sleeping processes
remain detectable. The shared runner's production process-group cleanup is unchanged.
