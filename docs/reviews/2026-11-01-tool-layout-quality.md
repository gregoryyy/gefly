# Tool-layout quality review

Status: **no blocking quality findings on the repaired frozen scope**.

Reviewer: independent Codex quality subagent, not an author of this relocation.
Scope: TODO 1.15, R-ASR-4/R-BOOT-3 and affected AS1/AS6/AS7/AS8 behavior relative
to `4339693144ea1db1549cb1eefe87ac03bba6ec6d`. The reviewed 192-file artifact in
`output/assurance/tool-layout-snapshot.json` has SHA-256
`6c3b75d114e9296d1dd3813c35352569f9535e6bca68da767b868c647691af1e`.
The reviewer independently recomputed the sorted-path/NUL/bytes/NUL hash. Source,
TODO, DONE and input records are included; review reports and ignored output are
excluded. The initial artifact was
`cd1ca934bc4f4443a60417bfa2d6ea36dcaf15a91bbfb270f503ee7e8d15c5ba`.

Reviewed runtime/root/import paths, recursive discovery, recipes/workflow,
historical-snapshot compatibility, inventory enforcement, output confinement,
vendor provenance, current documentation and historical navigation-link changes.
Earlier reports retain their original evidence scope; this review does not
retroactively alter their commands or outcomes.

## Finding and disposition

### TLQ1 — Medium: mixed committed layouts bypassed the current inventory

Location: `utils/assure/src/graph.ts`, inventory layout selection; repaired code
is at lines 148–156.

Reproduction on the initial snapshot: supply a committed-revision Snapshot with
valid legacy `assure/UPSTREAM.json` and legacy vendor bytes, plus relocated
`utils/assure/` code and damaged current vendor bytes, but omit the new inventory.
The graph selected the legacy inventory and returned zero errors. The equivalent
worktree correctly rejected the missing current inventory. Expected: legacy
fallback applies only to genuinely old committed layouts; a mixed/current layout
must validate its current inventory and bytes.

Disposition: **resolved and independently rechecked**. A current-layout path now
precludes legacy fallback. Original and expanded map-reader probes demonstrate:

- Old-only committed snapshots remain readable.
- Old-only worktrees, mixed committed snapshots and current-only committed
  snapshots missing the current inventory produce inventory errors.
- A valid legacy copy cannot mask damaged current vendor bytes when the current
  inventory is present.

The regression was added to the inventory test. Only graph assembly and its
test changed for this repair; the copied core remains unmodified.

## Verification

- Inspected the source diff and applicable contributor/security/assurance rules.
  Python root calculation now uses the additional directory level; the Node CLI
  likewise resolves its checkout correctly. Package-relative CI test imports and
  `utils/ci/__init__.py` preserve discovery from `utils`. The same `just` command
  names and hosted entry point target the relocated implementations.
- Independently ran
  `node --test utils/assure/src/cli.test.ts utils/assure/src/graph.test.ts`:
  **16 passed, zero skipped/failed/cancelled/todo**. These exercise root discovery,
  selected revisions, queries, ignored-output generation and escaping output-link
  refusal, plus graph/inventory behavior. Log:
  `/private/tmp/gefly-tool-layout-quality-node.log`.
- Independently ran the actual-Node suite fixtures, the absolute CI entry-point
  fixture and scaffold fixtures through the relocated Python package:
  **10 tests passed**. Empty/skipped Node suites still reject and a declared
  passing suite accepts. Log: `/private/tmp/gefly-tool-layout-quality-python.log`.
- Invoked the relocated CLI by absolute path from `/private/tmp`: both the real
  committed pre-move revision `4339693` and current worktree returned zero
  integrity errors, with 14 planned and zero accepted MVP criteria. The relocated
  structural checker also passed from that unrelated directory: **120 Markdown
  documents, nine native Codex definitions and the Claude peer dispatcher**.
- Repeated the TLQ1 probes using an in-memory Snapshot/reader; no project Git or
  source mutation was performed. Existing confinement, Git-environment scrubbing,
  bounded reads and argument-array execution remain in the unchanged snapshot
  reader. Output guards and the ignore rule now agree on `utils/assure/out/`.
- Verified **13/13 vendored files byte-for-byte** against their recorded hashes
  and Propeller Git objects at `99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`.
  Inventory destination paths changed; original upstream source identities and
  bytes did not. Runtime checks require no sibling checkout.
- Verified all **five corrected historical navigation targets** exist at their
  pinned Git revisions. Current usage documents reference the relocated tools;
  retained old paths are labeled historical/upstream examples or compatibility
  fixtures. Catalog/ledger authority remains in `docs/assure/`.
- Inspected orchestrator log `output/assurance/tool-layout-ci.log`: **137 tool
  tests executed, zero skipped; 72 assurance tests passed; synthetic rendering
  passed; 14 study tests executed and nine optional JSBSim tests skipped;
  whitespace passed across 208 tracked paths**. Its final status explicitly names
  the study skips. This full run preceded the two-file TLQ1 repair/final record
  updates; the author reported the unchanged 72-test suite passing after repair,
  and the reviewer independently exercised the affected tests/current CLI above.
- Final `just check` passed with **121 Markdown documents**, nine native Codex
  definitions and the Claude dispatcher after review artifacts were added.
  `git diff --check 4339693` passed. Recomputed the source hash after writing this
  excluded review report; it still matches the repaired manifest.

## Boundaries

No implementation edits, project Git mutations, provider calls, dependency
installation or simulator/browser execution were performed by this reviewer.
The scoped tests use disposable fixture repositories. Review records and ignored
outputs are outside the source hash. Hosted renewal, independent specification
validation and scoped external peer results remain separately recorded evidence;
an earlier review does not accept this relocation automatically. This result
establishes bounded tooling quality, not aircraft data accuracy, numerical flight
fidelity, simulator/MVP acceptance or training credit. Later source or merge
changes require affected renewal.
