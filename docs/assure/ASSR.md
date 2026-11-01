# Assurance and traceability

## Chosen scope

Adopt a bounded generated lineage graph and checks (the source BOOT guide's
level 2), retaining the level 1 references already used by this project. The user
requested assurance after the readiness and status-drift analyses. Runtime
completion and observed checks belong in RESULTS and DONE; this design decision
does not itself establish that the tool or simulator passes acceptance.

Reuse Propeller's `assure/` core from commit
`99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`, with its GPL-3.0-or-later provenance,
and adapt it for Gefly's documents, code and aircraft/evidence data. Pin the source
revision and identify local changes. Git, source documents, data and recorded
evidence remain authoritative; the generated graph and reports are disposable.
There is no database, persistent service, automatic hook, external posting or
additional agent role in this adoption.

[Root SPEC](../SPEC.md) owns R-ASR-1 through R-ASR-5. The bounded acceptance
contract is [assurance SPEC](SPEC.md), criteria AS1 through AS8. TODO items,
source notes, code/test names and review reports continue to reference stable
requirement IDs. Commit `Refs:` trailers are used when commits are made;
`just reqs` and `just refs` remain useful basic lookup.

The orchestrator integrates traceability updates. A completed work item connects user decision/gap → source evidence where needed → requirement/criterion → TODO → implementation → meaningful check → independent quality and validation result → additional cross-provider peer evidence. A link is not proof that the requirement passed.

## Where assurance adds value

1. **E2 aircraft provenance:** connect a numeric field to its source or estimation
   method, applicability, units/conversion and rights, then to the model that uses
   it. Reuse the existing aircraft validators instead of reimplementing them.
2. **Frozen fixtures and results:** connect each observation to the exact model,
   engine/build, calibration or holdout cases, evaluator, criteria and environment.
   Changed or unavailable dependencies invalidate affected acceptance evidence.
3. **MVP acceptance:** show each in-scope criterion's implementation, tests,
   observations and independent review. Keep planned work and missing evidence
   visible; do not turn a named test into a passed criterion.
4. **Plan and decision integrity:** report broken IDs, unresolved blockers marked
   complete and completed tasks without records. Distinguish a draft, decision,
   review, implementation and acceptance rather than treating a merged document
   as delivered simulator behavior.
5. **Change impact:** show which source values, model inputs, fixtures, results
   and review claims a PR affects. Invalidation follows declared dependencies;
   absent dependencies are limitations, not an implied all-clear.

## Facts, certainty and outcomes

Every extracted link retains its source, extractor/version or declaring author,
revision and certainty: `declared`, `derived`, `uncertain`, `confirmed` or `stale`.
Certainty describes the link, not the outcome of a test or the fidelity of an
aircraft. An evidence record separately reports pass, fail, blocked, skipped or
not evaluated; only a current pass may support an accepted claim.

An append-only confirmation/retraction ledger may retain judgements that have no
natural source record. A confirmation becomes stale when its endpoints change.
Numerical-result freshness additionally checks all explicitly pinned run inputs:
Propeller's endpoint hashes alone do not establish dependency-wide freshness.
The ledger never replaces source documents or stores restricted source text.

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

## Enforcement and limits

Each validation matrix row records requirement and criterion, expected/observed
behavior, revision, command/artifact/source and outcome. Begin with a diagnostic
report of the existing repository. Integrity defects and invalid accepted claims
are blocking checks once the bounded contract is integrated; unimplemented future
requirements and unsupported historical records remain explicit notes or warnings,
not fabricated passes or blanket failures. Preserve historical evidence and
repair current contradictory status without rewriting raw inputs or Git history.

The tool can check identity, structure, references, hashes and declared dependency
consistency. It cannot determine from a citation that a manual really contains a
value, establish reuse permission, judge model accuracy or test adequacy, discover
every natural-language contradiction, or authenticate a reviewing provider from
its declared name. Keep those responsibilities with researcher, product, quality,
validate and peer. Current peer requirements above are unchanged.

Use offline negative fixtures to demonstrate failures and keep the shared CI gate
free of browser, physics, provider or network execution initiated by assurance.
Generated HTML, if offered, treats repository content as text. Inputs and paths
are untrusted; no imported content is executed. Agent instructions and file
ownership remain conventions, not operating-system access controls.

Database storage, per-edit hooks, a persistent intent journal and richer automatic
semantic analysis are deferred. Propose them only when this bounded approach
shows a measured gap; they are not prerequisites for the first useful simulator.
