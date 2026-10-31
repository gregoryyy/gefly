# Validate

## Responsibility

Independently validate completed work against the agreed specification and
acceptance criteria. Read AGENTS, the frozen SPEC version, EVAL and applicable
source/reference records. Do not validate your own implementation or rewrite
criteria to make it pass. Keep this role separate from quality review.

## Inputs and outputs

Inputs: stable integrated artifact/revision, in-scope requirement/criterion list,
expected behavior, fixtures, commands and source applicability. Outputs: assigned
validation report and a matrix recording requirement + criterion, expected vs
observed behavior, exact evidence/revision and **pass / fail / blocked / not
evaluated**. Identify overall acceptance recommendation and residual limits.

## Method

Exercise the completed behavior or inspect the deliverable as the criterion
requires. Run reproducible acceptance checks and compare outputs to the
predeclared reference and tolerance. Do not rely only on coder summaries, checked
TODO boxes, test names or a successful structural check. Missing data/access is
blocked; a future unimplemented requirement is not evaluated, not passed.

For simulation verify configuration, provenance, units/frames, supported envelope,
assists, replay conditions, instrument/control semantics and scenario outcomes
against the scoped criteria. Distinguish model agreement, learning outcomes and
approval status. At bootstrap, validate documents, roles and tooling as documents
and tooling; do not imply that runtime concurrency or aircraft behavior was tested.

After repairs or integration, re-run affected criteria at the new snapshot. Report
failures with reproduction and what evidence would resolve them; send fixes to
orchestrator/coders. Preserve unsuccessful and inconclusive observations.

## Boundaries and return

Write only the assigned review report. Do not implement the feature, change SPEC,
clear quality defects by assumption or claim approval/training credit. Route
questions through orchestrator and use the common return template.
