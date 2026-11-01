# Assurance quality review — 2026-11-01

Status: **no blocking quality findings on the repaired frozen scope**. All seven
findings below are resolved and independently rechecked. The final completion
records have received affected review; final hosted renewal and scoped external
peer outcomes remain separately recorded evidence.

Independent reviewer: Codex quality subagent; no implementation authorship.
The reviewed baseline is `65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c` plus the
189-file scope selected by `output/assurance/snapshot.json`. Following the
documentation and final-record renewals below, the current reviewed SHA-256 is
`dfbfbc3c9ac45c5ed0c6b7c58e2a3790e79aa1469fcbce8a6d81eada2b34f31d`.
The implementation was independently reviewed at repaired hash
`53d9b4b00e19fd34071e70782e64d12ee766cf45112d53cc96794f562494f5ea`;
the reviewer independently recomputed both sorted-path/NUL/bytes/NUL hashes.
TODO, DONE and RESULTS are included because status integrity is in scope;
review reports and ignored generated outputs are excluded. Original findings were
reproduced on the initial 188-file hash
`a93eb858db167c908ded6e4652fd861004bd086f1f28bd76b8f95fc0a46b0cce`;
their locations below refer to that original snapshot unless stated otherwise.

Scope: custom assurance snapshot/status/graph/evidence/CLI modules and tests,
catalog and format, pinned upstream inventory, CI runner/fixtures/workflow,
recipes and documentation/status reconciliation. Criteria: AS1–AS8 and
R-ASR-1 through R-ASR-5. The copied pure core is an unchanged dependency, not
newly authored implementation. This review is distinct from specification
validation and cross-provider peer coverage.

## Findings and dispositions

### Q1 — Medium: accepted fixture dependencies were checked too early

Location: `assure/src/evidence.ts`, fixture-group eligibility check before
`resolve()` (initial snapshot lines 305–319).

Reproduction: construct a valid accepted fixture group with model/case pins,
disjoint sets and matching freeze hashes; make it depend on a run whose input
hash is stale. The map-reader probe returned zero errors while the accepted
group reported `freshness=stale` and `eligible=false`. A failed upstream run has
the same enforcement gap. Expected: an acceptance error after all dependencies
have been resolved, even without a separate accepted criterion.

Disposition: **resolved; independently rechecked**. Accepted fixture
validation now follows transitive resolution. Added cases cover stale, failed,
skipped, blocked and unevaluated upstream evidence. Repeating the original stale
and failed dependency probes now produces `fixture.acceptance` errors.

### Q2 — Medium: empty assertions bypassed terminal-result checks

Location: `assure/src/evidence.ts`, result evaluation (initial lines 286–296).

Reproduction: a declared passing independent manual review points to correctly
pinned JSON `{"status":"skipped"}` with `assertions: []`. A synthetic accepted
criterion using that review returned zero errors and `eligible=true`. Terminal
outcome checks were nested inside the nonempty-assertions branch. Expected:
recognized terminal failure/skip/block states cannot support acceptance,
regardless of assertion count; ordinary text review artifacts remain supported.

Disposition: **resolved; independently rechecked**. JSON terminal checks
now run independently of assertions; negative JSON and positive plain-text
fixtures are present. Repeated skipped/failed JSON review probes now make the
criterion ineligible and produce acceptance errors; a text-review positive remains
eligible in the synthetic fixture.

### Q3 — Medium: field impact missed whole-file acceptance dependencies

Location: `assure/src/graph.ts`, `impact()` (initial lines 214–231).

Reproduction: a synthetic accepted criterion's passing run and review both pin
`inputs.json` as a whole file. `impact(graph, ['inputs.json'])` returns the
evidence and criterion; `impact(graph, ['inputs.json#/x'])` returns only that
field with no unknown-coverage warning. Changing that field invalidates the
whole-file hashes, so the omitted acceptance is affected. Expected: a field
query conservatively includes enclosing-file/ancestor dependencies as well as
declared field dependencies. AS6 and the format explicitly retain whole-file
freshness when a selector narrows lineage.

Disposition: **resolved; independently rechecked**. Field impact now includes
conservative same-file dependencies. Repeating the field-only query reaches the
whole file, both evidence records and the accepted synthetic criterion. Added
regressions also cover ancestor/descendant selectors and typed identities.

### Q4 — Medium: an empty Node test file passed the nonempty-suite gate

Location: `utils/ci.py`, `run_assurance()` TAP acceptance (initial lines 282–293).

Reproduction: in a temporary directory, create comment-only
`assure/src/cli.ts` and `assure/src/empty.test.ts`; temporarily point the imported
runner's `ROOT` there and call `run_assurance(10, tests_only=True)`. Actual Node
26.13.0 reports one passing file-level test despite no declared test cases, and
the runner returns `True`. Expected: the required assurance suite rejects no
declared tests. File existence and aggregate TAP counts alone do not establish
this; the negative regression must exercise real Node behavior.

Disposition: **resolved; independently rechecked**. The new local reporter uses
Node `test:summary` events. The runner requires one successful, nonempty,
zero-skip declared-test summary for every expected file, one global summary and
consistent totals. Actual-Node temporary fixtures reject an empty file, an empty
file alongside a genuine passing test, and an all-skipped test, while accepting
the genuine passing test alone. The actual project suite contains declared tests.

### Q5 — Medium: ledger application bypassed integrity checks

Location: `assure/src/graph.ts`, ledger integration (initial lines 160–175).

Two map-reader reproductions returned zero errors:

- A snapshot retains `committedLedger` but its current ledger file is absent.
  The conditional skips append-only validation instead of rejecting deletion.
- A ledger asserts `object:missing.py implements requirement:R-MISSING-1`.
  Both endpoints are absent, but the valid-kind fact is added after the existing
  dangling-reference check and remains active.

Expected: reject removal of a committed ledger and validate active ledger-added
endpoints against available nodes. Keep local integration repairs separate from
the pinned dependency. The seed currently has no ledger.

Disposition: **resolved; independently rechecked**. Deleted committed ledgers are
checked using an empty current value, and active ledger assertions receive
endpoint/schema checks after application. Both original probes now emit errors.
Negative regressions and a valid append-only positive are present; copied core
bytes remain unchanged.

### Q6 — Medium: planned criteria obscured missing implementation coverage

Location: `assure/src/evidence.ts`, criterion mapping (initial line 330), and
`assure/src/graph.ts`, planned-requirement reporting (initial lines 182–184).

A planned-only catalog criterion creates an `implements` fact. The graph then
uses that fact to suppress the planned/uncovered requirement diagnostic, even
though no implementation exists. The initial seed does this for fourteen future
MVP requirements. Expected: planned scope and implementation claims remain
distinct; planning a criterion must not establish implementation coverage.

Disposition: **resolved; independently rechecked**. Catalog criteria now reference
their requirements without asserting implementation. The planned-only probe has
no implementation fact and retains the planned/uncovered requirement diagnostic.
Acceptance state remains explicit in the criterion record.

### Q7 — Medium: default report omitted the promised state/outcome summary

Location: `assure/src/graph.ts`, `markdownReport()` (initial lines 244–250).

`node assure/src/cli.ts report` emits counts, findings and limits, but no separate
implementation/plan coverage, evidence outcomes, acceptance/freshness or link
certainty summary. In particular the recorded failed step-cost observation is
not presented as a failure in that report. The JSON graph retains these fields.
Expected: the documented default report exposes these separate states under AS6,
without making an integrity pass look like an observed-performance pass.

Disposition: **resolved; independently rechecked**. The bounded Markdown report
now separates implementation relationships, criteria/acceptance, evidence
outcomes, provenance/limits and link certainty, with explicit row/cell limits.
Synthetic report assertions distinguish failed, planned and accepted states.
The actual CLI report visibly lists the failed step-cost observation as `fail`,
all seeded MVP criteria as planned/ineligible, and the missing implementation
relationships without turning the integrity result into a performance pass.

## Checks and evidence

- Read applicable AGENTS, SDLC, SEC, STYLE, assurance SPEC/FORMAT and integrated
  source/diffs. Initial root-scope review found stale SPEC, EVAL/SBOM and TODO
  statements; the orchestrator corrected them and those deltas were inspected.
- Compared repaired DONE records in memory against `dcb50b0`: all 46 historical
  entries preserved with equivalent trimmed bodies, plus the engine-values entry;
  no duplicated heading/body or reversed timestamps before the new adoption entry.
  The first corruption and later repair histories remain historical evidence,
  rather than claims about an unrecorded editor action.
- Verified all 13 copied files against their inventory hashes and exact bytes
  from sibling Propeller commit `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`.
- Independently executed the synthetic Q1–Q5 probes described above, using map
  readers or disposable temporary directories; no actual project Git mutation.
- Executed `node --test assure/src/evidence.test.ts` after Q1/Q2 repairs:
  **20 passed, zero skipped**. Log:
  `/private/tmp/gefly-quality-assurance-evidence.log`.
- On the repaired frozen scope independently executed
  `node --test 'assure/src/*.test.ts' 'assure/upstream/src/**/*.test.ts'`:
  **72 passed, zero skipped, failed, cancelled or todo**. Log:
  `/private/tmp/gefly-quality-assurance-repaired-node.log`.
- Executed `PYTHONPATH=utils python3 -m unittest test_ci.AssuranceRuntimeTests`:
  the actual-Node regression passed, exercising the four positive/negative suite
  cases described in Q4. Log:
  `/private/tmp/gefly-quality-assurance-reporter.log`.
- Repeated independent map-reader probes for Q1/Q2/Q3/Q5/Q6/Q7 against the repaired
  modules; all expected rejection, impact, reporting and positive assertions passed.
- Executed the actual CLI report on the repaired scope and inspected the outcome,
  acceptance and coverage tables. Report artifact:
  `/private/tmp/gefly-quality-assurance-repaired-report.md`.
- Observed Node `v26.13.0` and Python `3.11.12`.
- Ran `just check`: 114 Markdown documents, nine native Codex definitions and
  the Claude peer dispatcher passed structural checking. `git diff --check HEAD`
  passed. Recomputed the 189-file hash again after this review; it still matches.
- Reviewed the supplied initial CI evidence (136 tool tests, 14 executed study
  tests plus nine optional JSBSim skips, 63 assurance tests without skips) and
  root-scope 35-test fixture log. Also inspected the renewed integrated
  `output/assurance/ci-repaired.log`: **137 tool tests executed, zero skipped;
  14 study tests executed and nine optional JSBSim skips; 72 assurance tests
  passed; final CI result explicitly reports those study skips**. The complete
  shared gate was run by the orchestrator, not duplicated by this reviewer.

## Renewals and limits

Documentation-only renewal at source hash
`fa1fe7ffe6da079a27962e74a3031475b6c59d9719791367a18230bc621cd29f`:
compared the eight-file delta from
`2900ca38fbab72d5bc23094f19b39e6d90d7e11d`. SBOM, TODO, EVAL and boundary/idea
notes now retain the selected stack/configuration while distinguishing remaining
product integration. EVAL says the initial **source survey considered** the
alternatives, avoiding a claim that comparative model benchmarks executed.
The catalog's three added Q17 stale-literal guards were independently probed with
an in-memory reader: current sources have zero evidence errors and zero accepted
MVP claims; appending each configured forbidden literal to its TODO/SBOM/EVAL
target produces the expected decision error. `just check` and whitespace checking
passed. No implementation files changed, so the earlier 72-test evidence remains
applicable to the implementation; no new simulator test was inferred.

Inspected stored hosted metadata/logs for
[run 41344361172](https://github.com/gregoryyy/gefly/actions/runs/41344361172):
both Python 3.11/3.15 jobs succeeded on pull-request head
`2900ca38fbab72d5bc23094f19b39e6d90d7e11d`, explicitly reporting the nine optional
study skips. This observed hosted result precedes the documentation-only delta
and does not claim a hosted run of the later source hash.

Final-record renewal: verified the 189-file manifest and independently recomputed
its final `dfbfbc3c…2b34f31d` hash. TODO 1.14 and its subtasks now record completed
bounded tooling; TODO 0.19, foundation/MVP work and the scoped external review are
not silently accepted. The new 21:05 DONE entry preserves the earlier 20:40
in-progress record and matches the implementation, checks and review responses.
RESULTS accurately separates the initial hosted head/synthetic merge from later
documentation and status edits. Stored logs support the reported versions, test
counts and optional skips. The peer placeholder expressly says pending and claims
no observed reviewer, provider run or older-range coverage.

Ran affected `just check` (115 Markdown documents, nine native definitions and
the Claude peer dispatcher), `git diff --check HEAD`, and `just assure check --json`:
all passed. The final checker reports zero errors, 96 warnings and 82 notes;
14 planned criteria, zero accepted claims, 167 aircraft value objects, eight
source records and three recorded passes/one failure. No implementation changed,
so broader test execution was not repeated for this record-only renewal.

This result covers the named final source/status hash, not later source changes
or merge resolutions. Final hosted renewal, independent specification
validation and scoped peer disposition are separate evidence. Minimum Node 24.2 was not
executed by this reviewer; the observed local runtime is 26.13.0. No provider was
invoked. No simulator,
browser, numerical aircraft model, manual applicability, flight fidelity,
educational benefit or training-credit acceptance was tested. Literal guards
cover configured regressions, not general prose meaning. Explicit identities,
pins and graph completeness do not authenticate authors or independent reviews.
