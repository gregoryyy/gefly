# PR 27/28 integration quality review

Status: **no blocking quality findings on the frozen resolved integration**.

Reviewer: independent Codex quality subagent; no integration authorship.
Scope is conflict resolution, E2/assurance CI composition and parent-content
preservation, not a renewed audit of unchanged E2 mathematics or assurance.

The resolved merge has feature parent
`e8d0a07106459b48d3e55b031475a5519a5f62dd`, incoming main parent
`aeb5d3f900fd601461a7b3187a669d9090cb84ed`, and merge base
`65faaeabb41b8b82cd632fe79f8ee9e4c8fa4c2c`. The reviewer independently verified
the 197-file manifest in `output/assurance/pr27-integration-snapshot.json`:
SHA-256 `b05625084514e565e8e12273df9acfa4f23da7ea4cee2de086c14563ab7243c3`.
The sorted-path/NUL/bytes/NUL scope includes source and status records; review
records and ignored outputs are excluded. No unresolved index entries or
unstaged source changes were present at inspection.

## Preservation and integration checks

- Parsed complete dated DONE records from both parents, their merge base and
  the resolved working file. **All 50 feature records are byte-preserved**.
  Incoming main adds one complete 19:35 E2 record, also byte-preserved; its
  preexisting records do not differ from the merge base. Together with the new
  22:14 integration record, the result has **52 unique records**, no missing
  feature/incoming additions and no reversed timestamps. Resolution preserves
  whole records rather than joining independent headings and body hunks.
- TODO has one reconciled, checked 1.3.1 for generic calculation groundwork.
  Aircraft inputs/model work in 1.3.2–1.3.4 and parent 1.3 remain open; completed
  layout task 1.15 remains present. Documentation retains both relocated tooling
  and the incoming E2 utility, without claiming M-a or aircraft acceptance.
- Compared production runner function ASTs with the feature parent: **unchanged**.
  Its registry now includes both E1 and E2 while retaining mandatory assurance.
  The CI test identity union is exact: **36 feature + 33 incoming identities
  yield 38 distinct identities, all retained**. Resolved test bodies preserve
  the feature's assurance/path expectations and the incoming E2 failure and
  zombie-aware timeout behavior. Production cleanup is unchanged.
- Compared all **five E2 study files byte-for-byte** with incoming main: no
  differences. Existing E2 review evidence retains its original scope and
  explicitly pending opposite-provider review.

## Executed and inspected evidence

Independently ran four focused CI fixtures: successful composed gate from an
unrelated directory, failing E2 suite rejection, actual-Node empty/skip rejection
and passing-suite acceptance, and timeout cleanup of a grandchild holding output.
**All four passed** in 13.275 seconds. Log:
`/private/tmp/gefly-pr27-integration-quality-tests.log`.

`just check` passed with **125 Markdown documents**, nine native definitions and
the Claude dispatcher. `just assure check --json` returned **zero integrity
errors**, 14 planned criteria and zero accepted claims; result saved to
`/private/tmp/gefly-pr27-integration-quality-check.json`.
`git diff --check --cached` passed.

Inspected orchestrator log `output/assurance/pr27-integration-ci.log`:
139 tooling tests discovered, **138 executed and one Linux-only test skipped**;
**25 E2 tests executed**, 14 E1 tests executed with nine optional JSBSim skips,
**72 assurance tests passed**, plus synthetic rendering, integrity and whitespace
across 220 tracked paths. The final shared-gate status explicitly reports study
skips. The full gate was not duplicated by this reviewer; affected fixtures and
the final record-aware checks above were executed independently.

## Limits and disposition

Accept this resolved integration within the named source scope. Peer coverage is
**pending** under the user's batched cadence; earlier assurance/layout reports
do not cover the incoming E2 work or this merge. Pending peer coverage does not
itself block the draft integration. Hosted execution of the eventual merge
commit remains separate evidence.

No source edits, project Git writes, provider calls or dependency installation
were performed. Tests use disposable repositories/processes. Linux zombie-state
behavior was not executed locally on macOS; its test remains explicitly skipped.
No numerical aircraft-data, model, simulator, M-a, training or MVP acceptance is
conferred. Later merge/source changes require affected renewal.
