# Assurance and traceability

## Chosen scope

Begin with convention-based traceability (the source BOOT guide's level 1), without copying Propeller's database/tracker or claiming automated semantic coverage. [SPEC](../SPEC.md) is authoritative for requirement declarations. TODO items, source notes, code/test names and review reports reference stable requirement IDs. Commit `Refs:` trailers are used when commits are made. `just reqs` and `just refs` provide basic lookup.

The orchestrator integrates traceability updates. A completed work item connects user decision/gap → source evidence where needed → requirement/criterion → TODO → implementation → meaningful check → independent quality and validation result. A link is not proof that the requirement passed.

## The assurance agent

This project separates the source guide's broader assurance role into **quality** and **validate**. Quality examines implementation risks and test adequacy; validate compares completed work with the specification. Housekeeping can find stale links or missing inventory entries while coders work, but cannot accept implementation or overwrite decisions. Full role boundaries are in [the agent workflow](../agents/README.md).

## Evidence and future automation

Each validation matrix row records requirement and criterion, expected/observed behavior, revision, command/artifact/source and pass/fail/blocked/not evaluated. Keep quality findings distinct. Do not add a lineage database or hooks merely to make the scaffold appear complete; propose one only if conventions prove insufficient. Any future enforcement must have explicit scope, tests and failure handling. Agent instructions and file ownership are conventions, not operating-system access controls.
