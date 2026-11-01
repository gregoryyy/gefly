# Bounded assurance validation

Validator: independent Codex `validate` subagent, not an author of this assurance
implementation. Initial record: **2026-11-01 20:50 Europe/Berlin**, from the
execution clock. Scope: TODO 1.14, [AS1–AS8](../assure/SPEC.md), and root SPEC
R-ASR-1 through R-ASR-5.

Recommendation: **accept AS1–AS8 for the repaired bounded tooling and documentary
scope**, including the final shared records at the 189-file hash
`dfbfbc3c9ac45c5ed0c6b7c58e2a3790e79aa1469fcbce8a6d81eada2b34f31d`.
The initial failures remain historical observations. This report is not
flight-model validation; cross-provider peer coverage is a separate gate.

## Artifact and observed evidence

The initial dispatch identified 188 source files at base
`65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c`, SHA-256
`a93eb858db167c908ded6e4652fd861004bd086f1f28bd76b8f95fc0a46b0cce`,
in `output/assurance/snapshot.json`. This source scope intentionally includes
TODO, DONE and RESULTS because status integrity is part of the feature; only
review records and ignored outputs are excluded. Implementation repairs began
during review, superseding that snapshot. No final acceptance is attached to it.

Inspected the contract, format, CLI, snapshot/status/graph/evidence adapters,
their positive and negative fixtures, the seed catalog, current plan/progress,
selected architecture/exercise/FDM status and shared CI integration. Independently
compared **all 13 reused files byte-for-byte**, including inventory SHA-256,
against the actual Propeller Git objects at
`99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`: **13/13 match**. No upstream files
were changed and no sibling dependency is needed by the adopted runtime.

Inspected the initial orchestrator log `output/assurance/ci-local.log`: 136 offline
tool tests executed with zero skips; E1 study 14 executed and nine optional
JSBSim-dependent tests explicitly skipped; 63 assurance tests with zero skips;
integrity reported zero errors, 96 warnings and 68 notes. The seed records 14
planned MVP criteria, zero accepted claims, 167 parameter nodes and eight sources.
These are initial recorded observations, not independently rerun results for the
repairs now in progress. A successful old suite does not resolve a counterexample.

## Preliminary criterion matrix

| Criterion / root coverage | Expected | Initial inspected coverage and pending gap | Status |
| --- | --- | --- | --- |
| AS1 / R-ASR-1 | Deterministic, revisioned graph from selected local input, explicit source/identity/certainty and honest code/JSON coverage. | Snapshot resolves immutable Git commits, bounds reads, retains merge-parent changes, and derives its default root from the CLI path. Graph sorts substantive output and uses file objects, lexical test candidates and RFC 6901 field identities without claiming AST or execution semantics. Tests cover repeated construction, selected revisions, merge-only changes and unrelated caller cwd. Repeatable real CLI/query runs are reserved for the repaired frozen artifact. | Blocked pending renewed snapshot/run |
| AS2 / R-ASR-1, R-ASR-5 | Parse actual TODO/DONE/GAPS conventions and reject current duplicate, dangling, completed-blocked or malformed records while preserving history/partial answers. | Inspected plain Answer/Resolved parsing, open-section partial handling, timestamp-plus-title DONE identities, metadata/range/slash scope, duplicate-body/order checks, current dangling-ID checks and historical trailer warnings. Fixtures reproduce the reported misassigned progress-body defect. Final TODO/DONE/RESULTS reconciliation must be included in the renewed source hash and integrity run. | Blocked pending final integrated records/check |
| AS3 / R-ASR-2 | Pointer-level aircraft/source provenance and dependency links preserve source revision/page, class, units, applicability/rights and unknown status; existing numerical validators remain. | Aircraft traversal inherits citation/reading/conversion context and links parameters to local source records; manifest identity, source revision and pointer failures are diagnostic. Seed has one aircraft manifest and two value files; source/read/unknown/unvalidated states remain visible. The suite includes a real ASI field-to-source fixture and malformed manifest rejection. No new coefficient set, permission or accepted 172S fidelity is inferred. Current repaired-output verification remains pending. | Blocked pending renewed source/output verification |
| AS4 / R-ASR-3 | Versioned, identified run/manual/source records explicitly state outcome, revision, procedure, scope, all input roles and hashed selectors; missing run closure is not invented. | Catalog schema declares modes, stable IDs, seven input-role categories, unavailable/not-applicable distinctions, assertions and review identities. Four historical Mac observations preserve three passing flags and one failed step-cost flag, with missing model/build/evaluator closure made explicit and ineligible. Their presence does not establish an executed fresh run. Acceptance/outcome repair under AS5 must be rechecked before final acceptance. | Blocked pending repaired evidence validation |
| AS5 / R-ASR-3 | Accepted claims reject stale/incomplete/nonpassing support transitively; frozen case identities prevent calibration/holdout overlap or spent-case reuse. | Original tests cover stale pins, transitive acceptance, missing/self review, outcomes, cycles, malformed records/pointers and fixture overlap/freeze. Quality found two fail-closed gaps: accepted fixture groups were checked before transitive resolution, and terminal failed/skipped JSON could escape rejection for manual/source evidence with empty assertions. The evidence implementation and new regressions are being repaired. | **Fail on initial artifact; repair pending** |
| AS6 / R-ASR-4 | Trace/report/diff/impact expose source, outcomes and uncertainty; a field change reaches downstream whole-file-pinned claims as required by full-file freshness. | CLI/query surfaces and field identities exist. Quality found that impact of `inputs.json#/x` can miss accepted claims pinned to the whole file even though impact of `inputs.json` finds them. Because the format hashes the full file, field-level edits must conservatively include those dependents. Repair and a counterexample regression are pending. | **Fail on initial artifact; repair pending** |
| AS7 / R-ASR-4 | Same safe offline local/hosted gate rejects malformed/escaping/cyclic input and empty/skipped assurance execution without installing/fetching/executing imported sources. | Inspected confined snapshots, Git/Node environment handling, no-lazy-fetch/no-prompt settings, traversal/time limits, ignored-output-only lineage command and shared Node test/integrity phases. Root identified a reporter loophole: Node can count an otherwise empty/comment-only test file as one passing file test. Gate must prove actual declared assurance tests executed, not accept that fallback. No renewed hosted matrix evidence has been supplied yet. | **Fail on initial empty-suite boundary; repair and hosted evidence pending** |
| AS8 / R-ASR-5 | Pin reusable core/license, repair known current status drift, preserve genuine open/history/raw records and separate local/peer review from runtime acceptance. | All 13 pinned upstream bytes match. Reviewed fixes for stack selection, runway 26/research-based exercise, extracted ASI/cruise/glide/fuel data and restored FDM progress. A remaining current contradiction is `docs/SBOM.md:3`: “No runtime language, package manager or graphics engine has been selected,” despite selected TypeScript/CesiumJS/MapLibre in AGENTS/ARCH/README. Retire the obsolete language/renderer condition while retaining genuine package-manager/dependency uncertainty. Final shared records and review/peer disposition remain pending. | **Fail on remaining current-status drift; repair pending** |

## Concrete repair and renewal requirements

1. **AS5:** re-evaluate accepted fixture-group eligibility after full dependency
   resolution and reject terminal skipped/failed/blocked JSON outcomes even when
   manual/source assertions are empty. Add isolated negative cases proving each
   former bypass produces an integrity error and cannot support acceptance.
2. **AS6:** field impact must include full-file-hash dependents and their downstream
   accepted claims, with an explicit regression showing both field and whole-file
   queries find the affected claim. Preserve unknown-dependency limits.
3. **AS7:** reject empty/comment-only Node assurance-suite fallback and demonstrate
   meaningful nonempty, zero-skip assurance execution through the shared gate.
   Record actual hosted outcomes separately when attempted.
4. **AS8:** correct the current SBOM stack-selection contradiction at line 3.
   Keep the actual installation/pinning/package-manager state distinct from the
   already selected runtime language and renderers.
5. Freeze the repaired integration, including TODO/DONE/RESULTS, provide its exact
   manifest/hash, then renew affected tests, deterministic CLI/report/query runs,
   integrity counts and the AS1–AS8 matrix. Later status-finalization edits also
   change this feature's reviewed input scope and need affected renewal.

No implementation or shared status was edited by this validator. Only this
assigned report was written. The initial observations are not accepted flight,
aircraft-data, model, curriculum, provider or training-credit evidence. Optional
skipped JSBSim tests are not passes; the catalog's planned criteria and incomplete
historical observations remain unaccepted. Quality and the current batched peer
disposition remain separate review records.

## Repaired artifact renewal — 2026-11-01 21:01 Europe/Berlin

Time is derived from the execution clock. The repaired 189-file manifest at HEAD
`2900ca38fbab72d5bc23094f19b39e6d90d7e11d` had SHA-256
`53d9b4b00e19fd34071e70782e64d12ee766cf45112d53cc96794f562494f5ea`.
Independently recomputed the sorted relative-path/NUL/bytes/NUL hash: exact match.
TODO, DONE and RESULTS remain included. This renewal resolves the initial code
failures below; it does not retroactively accept the initial artifact.

Independently executed:

- `node --test --test-reporter=./utils/assurance-reporter.mjs 'assure/src/*.test.ts' 'assure/upstream/src/**/*.test.ts'`:
  **72 passed, zero failed/cancelled/skipped/todo**, with valid per-file and
  global declared-test summaries for all ten files.
- `python3 -B -m unittest discover -s utils -p test_ci.py`:
  **36 passed, zero skips**. The real Node fixture rejects an empty file, an
  empty file alongside a declared test, and a skipped test; it accepts a declared
  passing test. This exercises the reporter rather than mocking its exit.
- Absolute CLI invocations from **`/private/tmp`**, using actual Node **26.13.0**,
  Python **3.11.12** and Apple Git **2.39.5**: `check --json`, repeated worktree
  and committed-revision `report --json`, `trace`, `impact`, base `diff` and
  Markdown `report`. These commands wrote no Git/source/output files.
- Independent in-memory aircraft mutations: missing source ID, mismatched
  citation revision, missing page and sourced values without citations. Each
  produced `aircraft.citation` or `aircraft.revision` errors at all 14 affected
  ASI fields. Unmodified data retained seven unknown/null parameters and zero
  evidence-inspector errors.
- Repeated the actual upstream comparison: **13/13** inventory hashes and Git
  object bytes match Propeller `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`.
  The restored complete 18:49 FDM DONE entry matches its original `22c4b65`
  entry byte-for-byte after trimming the entry boundary; SHA-256
  `022d6164a0c72569259eeefdb21d3a507fcea88ef486532eda26fd0666dadf24`.

Repeated worktree graph reports were byte-identical, SHA-256
`56dafda248caae548ae64bc484a47fc3e0fd2cb0c0a4e38a1b422da53d787c63`.
Repeated reports selecting commit `2900ca38…` were byte-identical, SHA-256
`50c186355b8cca0f51b47ea435d460a631a5a762049d198808909cce46f5bb10`.
Both used input hash
`3cca22fbadee82a9ef72bcf36bdf95c5b8b8f4e267278e8819d05f668fbce50c`;
revision/fact metadata intentionally differ between worktree and committed mode.
The local report had **zero errors, 96 warnings, 82 notes**, 5,842 nodes,
8,228 facts and 56 canonical requirements. Seed semantics remain **14 planned,
zero accepted**, four fresh archival observations (three recorded passes, one
recorded failure), all four ineligible, 167 parameters and eight sources.
Fresh pinned bytes do not supply unavailable original run inputs.

## Current criterion matrix

| Criterion / root coverage | Expected | Repaired observed behavior / evidence | Result |
| --- | --- | --- | --- |
| AS1 / R-ASR-1 | Deterministic selected-input graph, source/revision/certainty, honest file/test/JSON coverage; no external-document fetch. | Actual repeated worktree and selected-commit reports match within each selection; unrelated caller cwd works. Confined Git reads and file/lexical/JSON extraction were inspected. Executed fixtures cover fresh revision reads, merge-only changes, opaque code containing a throw, escaped field identities and Git-environment redirection. | **Pass — bounded tooling** |
| AS2 / R-ASR-1, R-ASR-5 | Real document grammar and duplicate/dangling/completed-blocked/progress diagnostics; history and partial answers distinct. | Executed status/graph negatives reject duplicate headings/bodies, order/metadata errors, missing DONE records and slash/range dangling references. Open-section partial answers stay open. Actual current check has zero structural errors. Complete FDM progress restoration matches its original Git entry. Later completion-record edits require affected renewal. | **Pass on reviewed records** |
| AS3 / R-ASR-2 | Field provenance/units/source class and unknowns explicit; bad source/version/pointer diagnostics; existing numerical/schema checks retained. | Actual ASI IAS trace resolves S17 Rev 5 / page 5-9, `kt` to `m/s`, IAS reference, tabulated reading, facts-only rights and unvalidated fidelity. Independent citation mutation probes fail; null/unknown values remain. Selector escaping/missing-property tests execute. Existing Python validators remain in shared CI. | **Pass — declared provenance only** |
| AS4 / R-ASR-3 | Versioned identified evidence declares revision/procedure/outcome/roles/hashes/selectors; inspection is not execution. | Strict version/shape/mode/role parsing inspected and schema/path/assertion/identity negatives executed. Seed states missing original revision/model/build/evaluator closure. JSON and Markdown retain failed step-cost outcome and ineligible state; they do not infer a fresh run or accepted MVP. Synthetic accepted run/review is a test fixture only. | **Pass — evidence format/inspection** |
| AS5 / R-ASR-3 | Nonpass, incomplete, stale or transitive invalid support cannot sustain acceptance; case IDs/frozen sets reject overlap/spent reuse. | Fixture-group enforcement now follows complete dependency resolution; stale/failed/skipped/blocked/unevaluated parent fixtures produce `fixture.acceptance`. Empty-assertion JSON terminal outcomes produce evidence/acceptance errors; plaintext review remains supported. Missing/self review, changed result/input, dependency cycles, freeze/membership and overlap/spent cases pass. Ledger deletion and unknown/invalid asserted endpoints also fail. | **Pass — initial failures repaired** |
| AS6 / R-ASR-4 | Trace/report/diff/impact separate planned scope, claims, outcomes, certainty and unresolved support; conservative downstream coverage. | Executed field/nested/typed-selector fixtures reach whole-file-pinned run, review and accepted synthetic claim. Planned catalog relationships are `refs`, not implementation claims. Markdown separates implementation relationships, criteria/eligibility, outcomes, limits and certainty. Real field impact returns 966 nodes without truncation; unknown file remains unknown. Base diff reports 603 added, 383 changed, zero removed nodes and nontruncated impact at `2900ca38…`. | **Pass — declared dependencies only** |
| AS7 / R-ASR-4 | Same safe offline local/hosted gate; confined bounded reads; genuine nonempty/zero-skip assurance execution; no checking mutation/service calls. | Real reporter/Python fixtures and 72-test run prove repaired empty-file/skip rejection. Path/symlink/oversize/invalid-command/lineage-confinement cases execute. Workflow/runner use the same offline entry and strip Git/Node environment redirection. Actual hosted matrix and exact checkout/versions are recorded below. Minimum Node 24.2 was not independently executed here; observed local/hosted Node is 26.13.0. | **Pass for observed environments; version limit explicit** |
| AS8 / R-ASR-5 | Pin/license reuse; repair known current drift while preserving history/raw inputs/open work; truthful completion and independent-review boundaries. | Pinned vendor bytes and original FDM record match. Selected stack, runway 26, research prototype without instructor prerequisite, delivered ASI/cruise/glide/fuel facts and remaining model/source limits are distinguished. Validator's remaining lower SBOM/TODO stack conditions were repaired in the follow-up delta described below, with configured negative guards exercised. Current compound simulator tasks stay open. Final status edits/peer evidence remain separate renewal scope. | **Pass — documentary adoption; final records to renew** |

## Hosted observation and documentary follow-up

Inspected actual JSON and full logs supplied at
`output/assurance/hosted-initial.{json,log}` for
[run 41344361172](https://github.com/gregoryyy/gefly/actions/runs/41344361172).
Both jobs completed successfully. Run metadata names feature head
`2900ca38fbab72d5bc23094f19b39e6d90d7e11d`; both checkout logs identify the
actual tested synthetic merge
`ed62fb72d4ce20c3e5ee8aa5cfdfbdbb64931f81`, merging that head into
`65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c`. This report does not substitute
the feature-head name for the checkout identity or assume tree equality.

| Hosted environment | Actual observed result in each job |
| --- | --- |
| CPython 3.11.17 / 3.15.1 | 137 offline tool tests passed with zero skips. |
| Node 26.13.0, Git 2.56.0 | 72 assurance tests passed, zero assurance skips; integrity zero errors, 96 warnings, 82 notes. |
| Ubuntu 24.04.5, image `20261025.353.1`, runner `2.338.2` | Scaffold 112 Markdown / nine native Codex roles plus Claude dispatcher; tracked whitespace passed for 202 paths. |
| E1 optional-engine suite | 14 tests executed successfully; nine explicitly skipped because JSBSim was not importable. Final CI line preserves these skips, not an unqualified all-checks pass. |

The initial hosted run predates a small documentary/catalog follow-up. The
validator found additional obsolete current SBOM statements that JSBSim was a
candidate and the runtime stack remained unselected, plus TODO 1.1's same pending
condition. The orchestrator repaired these and corresponding EVAL/app/package/
test/IDEA descriptions without changing implementation code. Inspected that
delta: TypeScript/CesiumJS/MapLibre/JSBSim remain selected while package/workspace
tooling, product dependency pinning, model implementation and FR172/radio choices
remain open. Raw inputs/history were not rewritten.

Using the same 189 paths, independently computed the follow-up source SHA-256
`9effc6f810d415e508641c2df3731dedeccb06cef535b0fad702f89ce31a627c`.
The manifest's earlier hash remains the historical repaired-code snapshot; the
later hash includes this reviewed documentary delta. Three independent
in-memory reintroductions of the obsolete SBOM/EVAL/TODO literals each produce
a `decision.literal` error from the added Q17 guard rules. These literal guards
are reviewed bindings, not general prose understanding.

After that delta, repeated absolute `report --json` invocations remained
byte-identical: SHA-256
`47900216c0064af33308d9a6846af3f79379055f0f4743c4b9a168233b764d76`,
input hash `581581bb1b6f6347ef44fe7631df8da902ef80b4479157f02c0c128c08decbbc`.
Independently ran `just assure check`: 5,853 nodes, 8,241 facts, **zero errors,
96 warnings, 82 notes**, with the same 14 planned/zero accepted seed semantics.
Inspected actual `just assure diff 65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c`:
614 added, 388 changed, zero removed nodes; 3,855 impact nodes without truncation.

No unresolved implementation defect remains in this validation. Final shared
TODO/DONE/RESULTS updates change the status-integrity input scope and must receive
the promised affected record/hash/check renewal before final acceptance is tied
to that integration. Later hosted results and cross-provider peer outcomes must
name their actual revision; this local validation does not attest a provider or
replace peer coverage. Future simulator, aircraft/model, source-rights,
instructional and training-credit acceptance is **not evaluated** by adoption of
this bounded tool.

## Final shared-record renewal — 2026-11-01 21:09 Europe/Berlin

Execution-clock time. Independently recomputed the updated manifest over the same
189 source paths, including TODO/DONE/RESULTS: exact SHA-256 match
`dfbfbc3c9ac45c5ed0c6b7c58e2a3790e79aa1469fcbce8a6d81eada2b34f31d`.
The base remains `65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c`; this is the
reviewed working-tree scope while HEAD is still `2900ca38…`, not a claim that
the first hosted run tested these later bytes.

Inspected the final record-only delta: TODO 1.14 and its subtasks are complete;
the new clock-derived 21:05 DONE entry identifies actual roles, PR, repaired
boundaries and limits while preserving the entire 20:40 progress entry. RESULTS
E14 distinguishes 137 tool tests, 72 assurance tests, 14 executed study tests and
nine optional-engine skips, and identifies the first hosted feature head and
actual synthetic merge. EVAL now says the initial source survey *considered*
the candidates, avoiding an unsupported comparative-flight-test implication.
No assurance implementation changed in this renewal.

Independently reran absolute `check --json` from `/private/tmp`: exit **0**,
5,854 nodes, 8,248 facts, **zero errors, 96 warnings, 82 notes**, input hash
`1091541f9a041edeca793cee08aaa58604fcfd282f668d558f4d4d718f972052`.
The seed remains 14 planned / zero accepted and all four archival observations
remain ineligible. Actual `trace todo:1.14` now shows the completed task linked by
`records` to the 21:05 completion entry, with source locations and the explicit
“recorded work; not acceptance” scope. Final base diff has 615 added, 388 changed,
zero removed nodes and 3,856 impact nodes without truncation. Its one new progress
identity is the 21:05 completion entry.

This resolves the final-record renewal conditions in AS2 and AS8 and the earlier
recommendation qualifier. **All AS1–AS8 pass for this bounded source scope.**
The unchanged implementation tests above remain applicable; no full suite was
repeated merely for metadata edits. The separate peer record explicitly remains
pending and does not claim old Claude-authored work, a model/provider identity
or an unexecuted review passed. TODO 0.19 and other compound simulator tasks
remain open. A later actual hosted/peer result must retain its own exact revision
and evidence; neither is fabricated by this local acceptance. No flight-model,
MVP, scientific, data-rights, learning or training-credit acceptance is added.
