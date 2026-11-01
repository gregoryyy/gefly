# Evidence catalog version 1

`docs/assure/catalog.json` is a manually reviewed source record, not generated
acceptance. `inspectEvidence(readFile, paths)` inspects it without filesystem,
process or network access. The caller supplies a contained UTF-8 reader and the
available repository paths. The adapter returns nodes, facts, diagnostics and
numeric counts. [The assurance contract](../docs/assure/SPEC.md) owns AS1–AS8;
requirements remain declared in root SPEC.

The top-level object has exactly `schemaVersion: 1`, `guards`, `evidence`,
`criteria`, `fixtureGroups` and `aircraft`; all five collections are arrays.
Unknown fields, wrong types and unsupported versions are errors. Every catalog
record ID is unique across the first four collections, matches
`[A-Za-z][A-Za-z0-9._:-]{0,127}` and is independent of its array index. Catalog
objects use graph IDs `assure:<id>`; evidence uses the existing `test` kind so
`verifies` can link it to requirements. Other catalog objects use `object`.
There are no new core node/relation/certainty enum members.

## Files, hashes and selectors

A **pin** is `{ "path": "repo/file.json", "sha256": "<64 lowercase hex>" }`,
optionally with `pointer`. SHA-256 is calculated over the complete UTF-8 file
content, preserving whitespace and line endings. Every byte is substantive for
freshness, including metadata edits. Hashes are never silently refreshed by a
check. A selector narrows lineage; it does not narrow the pinned hash. Changing
any byte of any listed input invalidates freshness even if the selected field or
result file is unchanged.

Paths must be relative, listed by the caller, nonempty and at most 512 characters.
Absolute paths, empty/dot/parent segments, backslashes, colons, `#`, `?` and control
characters are rejected. The reader additionally owns symlink/filesystem
containment. A missing/unreadable/oversized file is an error. Each read is limited
to 2 MiB; catalog arrays and total catalog records are limited to 2,000 items.
Dependency traversal is limited to 128 levels; aircraft traversal to 64 levels
and 20,000 visited values per file. Imported strings are never executed.

Selectors use RFC 6901: empty string means the root, `/a~1b/~0key` selects key
`a/b` then key `~key`. Only `~0` and `~1` escapes are accepted. Array indices are
canonical nonnegative integers; `-` and leading-zero indices are invalid. Missing
or inherited properties are rejected. Object field identity is `path#pointer`.

## Decision guards

A guard has exactly `id`, `sources` (nonempty pins under immutable `docs/input/`)
and `rules`. Each rule has `path`, `required` and `forbidden` arrays of nonempty
literal strings, with at least one literal. Matching is case-sensitive over the
whole target file. An absent required or present forbidden literal is an error;
so is a changed/missing pinned decision source. The catalog contains the text
bindings; the adapter has no hardcoded JSBSim, runway or prose decisions.

These are reviewed regression guards, not natural-language inference. They do not
prove that arbitrary prose agrees with a decision. Update a text binding only
after checking the source and authoritative document; preserve raw input.

## Evidence records

Every record has `id`, `mode`, `revision`, `procedure`, `scope`, `limitations`,
`outcome`, `requirements`, `inputs`, `unavailableRoles`, `notApplicableRoles`,
`dependsOn` and `result`. Modes are `recorded_run`, `manual_review` and
`source_record`. Procedure/scope/revision are nonempty strings; limitations is an
array of nonempty strings. Requirements is a nonempty array of canonical root
SPEC IDs. Outcomes are `pass`, `fail`, `skipped`, `blocked`, `not_evaluated`.
They are recorded observations, not automatic proof of physics or learning.

Each input is a pin plus `role`: `model`, `build`, `fixture`, `criteria`,
`evaluator`, `source` or `environment`. All seven roles need either an input or a
`{role, reason}` entry in `unavailableRoles`/`notApplicableRoles`. Several inputs
may share a role. A role cannot be both pinned and unavailable/not applicable.
Runs permit unavailable roles, but cannot use not-applicable exemptions. Any
unavailable role makes evidence incomplete and ineligible for acceptance even
when its observation is a fresh recorded pass. Source/manual records can explain
inapplicable roles; this is a reviewed declaration, not an applicability inference.

`result` is a pin plus `assertions: [{pointer, equals}]`. `equals` is a JSON value;
equality ignores JSON object-key order, preserving array order and scalar types.
A recorded run declaring pass/fail must supply assertions. A declared pass with
a mismatching or unresolvable assertion is an error. Root-level `skipped: true`
or terminal `status`/`outcome` of fail/failed/skipped/blocked/not_evaluated cannot
be promoted to pass, including manual/source JSON artifacts with empty assertions.
Artifacts named `.json` and artifacts with assertions must parse as JSON; other
plaintext manual/source artifacts remain valid without JSON assertions.
Other result vocabularies need explicit pointer assertions;
the adapter does not infer arbitrary test-runner semantics. An honest recorded
failure is allowed in an exploratory catalog and remains a failure. It cannot
support acceptance. Manual/source records may use an empty assertions array and
must describe their manual/source-only procedure.

Only `manual_review` records carry `review: {author, reviewer, independent}`;
it is mandatory for that mode. The independent boolean and different nonempty
identities are declarations to review, not authentication of a person/provider.
The cross-provider peer rules remain separate.

`dependsOn` lists catalog IDs. Unknown IDs and dependency cycles are errors.
Freshness propagates transitively through listed dependencies. Eligibility also
requires eligible dependencies, independently of recorded outcome. Every listed
result and input receives a file/selector edge; change impact can follow them.
Undeclared execution inputs remain a limitation, never an inferred all-clear.

## Criteria and acceptance

A criterion has exactly `id`, `requirement`, `state`, `scope`, `evidenceIds` and
`reviewIds`. State is `planned` or `accepted`. Planned scope is advisory and may
have no evidence; it never becomes accepted from test names, link certainty or
successful extraction. Accepted claims require nonempty, distinct evidence and
review ID lists, all naming evidence records for that requirement. Every support
must be complete, fresh, valid and passing, including transitive dependencies.
Reviews must additionally be declared independent manual reviews with different
author/reviewer identities. Missing, stale, failed, skipped, blocked or not
evaluated support produces an acceptance error. Evidence outcome, freshness,
acceptance state and graph-link certainty are separate reported fields.

## Fixture groups

A group has `id`, `state`, `calibration`, `holdout`, `spent` and `dependsOn`, with
optional `model` (pin) and `freeze`. Every case is a pin plus `caseId`; case IDs
are unique within a set and disjoint across calibration/holdout. `spent` contains
case IDs that cannot be claimed as untouched holdouts. Two different cases may
legitimately cite different selectors in the same source file.

An accepted group requires a pinned model, nonempty calibration/holdout sets and
`freeze: {calibrationSha256, holdoutSha256}`. Each freeze hash is SHA-256 of the
set's JSON array sorted by `caseId` using JavaScript string/code-unit order, with
every object's keys recursively sorted and no formatting whitespace. Include
`caseId`, `path`, `sha256` and `pointer` when present. Array order inside selected
data remains substantive. Changed set membership/pins, stale case/model files,
overlap or spent holdouts invalidate accepted fixture sets. Accepted groups are
rechecked after dependency resolution: a stale, failed, incomplete or otherwise
ineligible transitive dependency is an acceptance error even when the group's
own model/case pins are current. No FDM sets or model
XML are invented by the initial seed.

## Aircraft provenance and seed limits

Each `aircraft` entry has `manifest` (path) and `values` (paths). The adapter reads
the existing manifest's source records and traverses quantity/value objects in
the manifest and selected value files. It inherits citations/status/conversion
context, retains JSON pointer, source/page/revision, original/current units,
reference, reading class and source rights/applicability. It links parameter
objects to actual local source-record objects with `refs`, preserving draft,
estimated, unknown and unvalidated status. Missing source/page/revision,
mismatched source revisions or manifest identities are errors. It never fetches
a cited URL or asserts a new right to redistribute a manual. The existing Python
aircraft validators remain responsible for deep schema, quantity conversions and
numerical consistency; this adapter does not replace them.

The initial catalog pins user decisions, four preserved Mac browser observations
and existing aircraft JSON. Three observations report passing scoped flags and
one reports the failed step-cost budget. Their missing original run closures are
explicit, making all four ineligible for acceptance. No run is executed by
catalog inspection. Every seeded MVP criterion is planned. No training, model
fidelity, instructor approval, real-terrain readiness or regulatory credit is
accepted by this seed.

## Diagnostics and output

Errors cover malformed identity/schema/path/reference, invalid pointers,
contradictory declared pass, decision drift and invalid accepted claims. Warnings
cover stale unaccepted run evidence and explicitly unavailable provenance. Notes
cover planned criteria and known unread/unvalidated aircraft data. The shared
gate fails on errors; a recorded exploratory failure is reported separately.
Facts retain declared/stale certainty, source and extractor version; certainty
never means a test passed. Outputs are sorted and rebuildable; changing a source
catalog/data file, rather than a generated graph, changes the next inspection.
