# Assessment airspeed: independent quality review

Reviewer: Codex `airspeed_quality`, independent of code1, code2 and integration
implementation. Review time: 2026-11-01 22:54 Europe/Berlin. Outcome:
**no blocking quality findings for the bounded implementation**. Specification
validation is a separate review; cross-provider peer review remains pending under
the recorded batched cadence.

## Reviewed scope

Base: `5cb5b732f7bcd0fdab65455a7b29d48777afeb0c`. Reviewed the integrated
working-tree API, adapter, mapper, three training test files, package declaration,
CI runner/reporter changes, CI regression fixtures and associated documentation
against [AA1–AA6](../design/ASSESSMENT-AIRSPEED.md), SDLC, STYLE, SEC and the linked
SPEC requirements. The dispatch's 205-file snapshot is recorded in ignored
`output/assessment-airspeed/snapshot.json`, aggregate SHA-256
`a95f973e825122f9d0972700d689d041fdfa1999cfe910f2bae8aa8aedd4ca8f`.
The aggregate was independently recomputed over all 205 listed paths using
`path UTF-8 + NUL + exact file bytes + NUL` in manifest order and matched.
Completion updates to TODO/DONE/RESULTS were not yet part of this initial review;
changed acceptance records require a scoped renewal before final integration.

The source JSON is unchanged from the base. Independently computed source-byte
SHA-256: `27d5c4f6ca58b27c08ab6a9cbae0af3398e56edf5c27113e4cc5d9a661f381de`.
This review covers use of the existing repository data; it does not independently
reverify the manual, source rights or aircraft applicability.

## Findings and reasoning

No critical, high, medium or low defect was identified within the frozen trust
boundary. In particular:

- The adapter validates the consumed representation, rejects non-finite/negative
  speeds and non-increasing SI points, reports source-relative field paths, and
  copies/freezes every nested object and array that reaches its bundle. Explicit
  iteration rejects sparse point and citation arrays. Source status, conditions,
  original knot values and four-decimal SI points remain distinct and preserved.
- The mapper rejects CAS before flap input, performs no coercion, selects only the
  direct inclusive radian intervals, returns exact stored anchor values and uses
  bounded inverse linear interpolation. A range miss returns null IAS plus the
  source boundary. Unsupported flap positions are unavailable. No branch promotes
  unavailable data into a valid sample or a training criterion.
- The trusted source contains small finite values and strictly increasing CAS;
  therefore the interpolator's division is nonzero and its finite result stays
  inside the selected IAS interval. The implementation does not reconvert rounded
  SI values from knots. The 1e-12 test tolerance is arithmetic-only.
- The modules import only erased shared types and have no I/O, mutable global
  state, clock, DOM or renderer dependency. Returned source/table references are
  safe because successful adaptation recursively freezes them. No cockpit,
  simulation, digest, recorder or target-band state is implemented or changed.
- CI now executes training and assurance separately through the same strict
  reporter checks. Each discovered test file must provide a positive complete
  passing summary; a missing suite, failure, skip, TODO, cancellation, duplicate
  summary or inconsistent total prevents acceptance. Assurance still runs its
  integrity checker. New integration regressions exercise missing training tests
  and training failure after successful assurance.

The adapter deliberately validates only the format of the caller's hash. It does
not prove that the object came from those bytes, validate every unrelated source
field, resolve source citations or establish rights. SEC, the contract and module
documentation consistently allocate those responsibilities to the trusted caller
and repository validator. Executable accessors/proxies, arbitrary raw imports and
forged typed bundles are outside this contract; this is not an upload security
boundary.

## Evidence inspected and independently exercised

Read all 11 checked-in training tests, including 16 exact anchors, all detent
limits and immediate IEEE-754 neighbours, independent interpolation answers,
range boundaries, invalid-input precedence, malformed consumed data, detachment
and end-to-end byte-hash propagation. Read the CI regression changes and existing
strict summary checks. No full suite was redundantly rerun by this reviewer.

The orchestrator's `just test-training` log was inspected: 11 passing tests across
three files, zero skips/failures/cancellations/TODOs. The completed `just ci` log
was also inspected: repository tools 141 discovered, 140 executed and one
platform skip; E1 study 23 discovered, 14 executed and nine unavailable-JSBSim
skips; E2 study 25/25; assurance 72/72 plus passing integrity; training 11/11;
tracked whitespace passed. Skips do not establish engine or platform behavior.
The separately reported strict TypeScript check is not used as independently
reproduced evidence here; native Node execution itself is not type checking.

Reviewer commands: read-only Git diff/status and source reads,
`git diff HEAD --check`, `node --version` (v26.13.0), and a standalone
`node --input-type=module` probe importing the two public modules. The probe:

1. Reparsed the real source for each mutation and replaced 14 root/nested consumed
   fields with each of null, undefined, zero, false, an array and an object:
   **84 malformed cases rejected**, without an exception.
2. Sampled 99 interior points in each of the 13 adjacent source intervals:
   **1,287 mapped values** were finite, monotonic and within the corresponding IAS
   interval. This checks interpolation invariants, not new aircraft reference data.
3. Confirmed rejection of `01.2.3`, `1.2.3-01`, `1.2.3-`, `1.2.3+` and `1.2.3.4`
   as source versions.
4. Hashed the actual source bytes with Node SHA-256 and confirmed the unchanged
   source file through the Git diff.

These checks passed. `git diff HEAD --check` produced no error.

## Acceptance limits

Accept the inspected code and CI changes as a bounded arithmetic/data-adapter
foundation, subject to renewal for subsequent edits. No flight-dynamics accuracy,
pitot-static/ASI behavior, browser integration, replay determinism across
runtimes, exercise acceptance, training effectiveness, regulatory credit or
source approval is established. The broad R-TRAIN/R-SIM requirements remain
larger than this slice. Final shared records and publication gates remain owned
by the orchestrator; peer pending is distinct from this same-provider quality
result.

## Final shared-record renewal — 2026-11-01 22:56 Europe/Berlin

Independently recomputed the final 205-file aggregate and matched
`20b8817f10721b501dd0e00b5c63fd96a343b9ac99bfdfd8fc755ce9c691cc2f`.
Confirmed that only TODO/DONE/RESULTS changed after the initial reviewed snapshot:
restoring DONE/RESULTS from the base and reverting the three TODO completion
checkboxes reproduced the exact original aggregate `a95f973e…`. Thus implementation,
API, tests, CI and the frozen protocol retain the prior reviewed bytes.

Read the final three record changes. TODO completes only 1.1.3, 1.5.1 and 1.5.2;
parent 1.1/1.5 remain open. The new DONE entry identifies actual participating
roles, records executed versus skipped counts and leaves peer pending. RESULTS
retains the source hash, caller-binding limitation, arithmetic-only tolerance,
probe counts and the distinction between this component and broader aircraft,
exercise or training acceptance. The completion claims match the inspected
implementation and evidence. No new blocking finding arose.

The initial exclusion of completion records is now resolved for this final hash.
Quality acceptance is renewed for the final bounded source snapshot; remaining
scope and peer limitations above still apply. No broad suite was rerun for these
record-only changes.
