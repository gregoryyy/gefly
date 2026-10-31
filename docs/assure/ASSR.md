# Assurance and traceability

## Chosen scope

Begin with convention-based traceability (the source BOOT guide's level 1), without copying Propeller's database/tracker or claiming automated semantic coverage. [SPEC](../SPEC.md) is authoritative for requirement declarations. TODO items, source notes, code/test names and review reports reference stable requirement IDs. Commit `Refs:` trailers are used when commits are made. `just reqs` and `just refs` provide basic lookup.

The orchestrator integrates traceability updates. A completed work item connects user decision/gap → source evidence where needed → requirement/criterion → TODO → implementation → meaningful check → independent quality and validation result → additional cross-provider peer evidence. A link is not proof that the requirement passed.

## The assurance agent

This project separates the source guide's broader assurance role into **quality** and **validate**, then adds **peer** as a cross-provider gate performing both functions with distinct outputs. Quality examines implementation risks and test adequacy; validate compares completed work with the specification. Peer uses Claude for Codex-authored contributions and Codex for Claude-authored contributions; it does not replace either existing role. Housekeeping can find stale links or missing inventory entries while coders work, but cannot accept implementation or overwrite decisions. Full role boundaries are in [the agent workflow](../agents/README.md).

## Cross-provider evidence

For R-AGENT-7, retain the exact integrated revision, frozen packet hash,
author-provider coverage map and reviewing provider identity, with actual
CLI/version, invocation outcome and observed model/provider metadata. A fresh
review context starts from the packet; same-provider subagents, changed model
names and declared CLI labels alone do not prove cross-provider execution.
Keep quality findings separate from the criterion matrix and its evidence.

Mixed-provider authorship requires reciprocal reports covering the same revision;
each provider excludes its own contribution from acceptance. Map integration
changes as well as original contributions. Missing CLI/authentication, unverifiable
identity or incomplete coverage/evidence is blocked/not evaluated, never an
implicit pass or same-provider fallback. Do not retain credentials in evidence.
Repairs and packet changes require affected reviews to run again. Historical
reports lacking these records do not satisfy the new gate retroactively.

## Evidence and future automation

Each validation matrix row records requirement and criterion, expected/observed behavior, revision, command/artifact/source and pass/fail/blocked/not evaluated. Keep quality findings distinct. Do not add a lineage database or hooks merely to make the scaffold appear complete; propose one only if conventions prove insufficient. Any future enforcement must have explicit scope, tests and failure handling. Agent instructions and file ownership are conventions, not operating-system access controls.
