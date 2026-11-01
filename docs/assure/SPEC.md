# Bounded assurance contract

Status: adopted product scope for the assurance implementation. This document
defines acceptance criteria AS1 through AS8; observed results are recorded in
[RESULTS](../RESULTS.md). [Root SPEC](../SPEC.md) alone declares R-ASR-1 through
R-ASR-5. This contract inherits [SDLC](../SDLC.md), [SEC](../SEC.md) and
[STYLE](../STYLE.md); [ASSR](ASSR.md) describes the chosen approach and limits.

## Scope and source of truth

Reuse the Propeller `assure/` core pinned at
`99dc60050cd904f7b25cd929b5a6b1e1420f9fc6`, preserving provenance and license
notices. The adoption covers generated lineage, integrity checks, versioned
evidence and change-impact reporting. It does not adopt the full level 3
database/service/hooks architecture or add an assurance agent. The orchestrator,
researcher, product, code1, code2, housekeeping, quality, validate and peer retain
their existing responsibilities.

Git and the repository's authoritative documents, data, fixtures and evidence
records are inputs. Generated graph/report files are rebuildable outputs, never
the place to change requirements, decisions or acceptance. Existing aircraft
schema/conversion validators and peer evidence rules are reused, not weakened.

Runtime implementation and tests are under `utils/assure/`; this `docs/assure/`
directory remains the product contract/catalog location. Shared CI tooling is
under `utils/ci/`. These locations do not change AS1–AS8 or the `just` commands.

## Acceptance criteria

### AS1. Rebuildable lineage with honest coverage

Build a deterministic graph from the selected local revision or working tree,
retaining node identity, source location, revision, relation and certainty. Repeated
builds over the same inputs produce the same sorted substantive output. Extract
requirements, TODO/DONE/GAPS and commit references; include Python, JavaScript/MJS
and C++ at least as file-level objects and JSON fields by stable pointer. Do not
claim declaration-level understanding of a language handled only at file level.
External documents are represented by their local source records, not fetched.

### AS2. Plan, decision and record integrity

Recognize Gefly's actual document conventions, including plain `Answer:` and
`Resolved:` records and `TODO:` progress references. Detect duplicate declarations,
undefined referenced requirement/task/question IDs and unresolved explicit
blockers on completed tasks. Report completed tasks lacking an applicable DONE
record and malformed/unparsed trailers with actionable locations. Answer history
and superseded text do not become multiple current decisions. Do not reinterpret
an unresolved refinement as a resolved whole question. Historical-only defects
remain distinguishable from repairable current defects.

### AS3. Aircraft and JSON provenance

Link recorded aircraft/source values by file and JSON pointer to their declared
source/revision/page, unit/conversion, applicability and rights record, or to a
declared derived/estimated method and inputs. Preserve unknown and unvalidated
status. Link model/evidence dependencies to these objects without treating a
generic 172P datum as sourced 172S evidence. Missing references, mismatched
versions and malformed pointers produce diagnostics. Reuse existing validation
for quantity arithmetic and schemas. Source truth, permission and aeronautical
applicability still require review; the graph establishes no new data rights.

### AS4. Versioned run and acceptance evidence

Define and validate machine-readable evidence records with stable identity,
schema version, requirement/criterion references, provenance and explicit outcome.
A record identifies the revision, reproducible command or manual procedure,
observed result/artifact and the relevant model/data, engine/build, fixture,
criteria, evaluator and environment inputs. File dependencies carry content hashes
and stable selectors where applicable. Manual/source-only reviews say so; they
do not masquerade as executed tests. Missing run evidence is not inferred from a
test title, comment, successful extractor exit or narrative summary.

### AS5. Freshness and invalid acceptance rejection

Acceptance is an explicit claim referencing evidence, separate from link certainty.
Reject an accepted claim supported by missing, malformed, failed, skipped,
blocked, not-evaluated or stale evidence. Detect changed/missing pinned inputs,
including transitive dependencies represented by the evidence contract. Endpoint
confirmation hashes alone are insufficient for run freshness. Check declared
calibration and holdout case identities are disjoint within the same model
evaluation; reclassified/spent cases cannot silently count as untouched holdouts.
Cases from one source may legitimately belong to different sets, so sharing a
source-document ID alone is not overlap. Negative fixtures exercise these failure
modes; merely planned or exploratory evidence does not become an accepted claim.

### AS6. Useful trace, report and change impact

Expose trace, integrity report, revision diff and impact queries with documented
CLI behavior and machine-readable output. The report shows planned requirements,
implementation claims, evidence outcomes, certainty, stale/missing dependencies
and unresolved reviews separately. Impact identifies downstream objects and
accepted claims affected by changed declared dependencies, including JSON fields.
Results include source locations and explicit extraction limits; an unknown edge
does not imply no impact. PR lineage output is reviewable text and is never posted
automatically. A graph rendering is optional, not an acceptance dependency.

### AS7. Shared offline gate and safe operation

Integrate checks through the existing local/hosted repository gate so the same
entry point produces compatible findings and failure status. Run deterministically
from the repository root or an unrelated working directory. Assurance does not
install packages, fetch URLs, launch a browser, run a simulator or call providers,
and it does not mutate Git/source records during checking. Explicit ledger edits,
if offered, are separate commands, append-only and tested. Handle malformed,
oversized, cyclic or path-escaping inputs safely; imported strings are data.
Test applicable supported runtimes and negative cases without live services.

### AS8. Integrated adoption, drift repair and review boundaries

Record upstream commit/license and local adaptations. Before accepting this
assurance slice, reconcile the known current status contradictions: selected
JSBSim/stack versus old pending prose, runway/instructor decisions, delivered ASI
and cruise/glide/fuel data versus remaining blockers, and duplicated/misassigned
progress entries. Preserve historical/raw records and genuinely open decisions.
Separate completed document/decision work from unimplemented runtime behavior;
do not tick compound tasks merely because one part merged. Show representative
positive and negative fixtures, review findings and current integrated checks.
This reconciliation is reviewed product work, not a claim that the extractor
understands every sentence. Quality, validate and the batched peer gate remain
independent, with current revision/packet evidence and missing coverage explicit.

## Evidence semantics and enforcement

Link certainty uses `declared`, `derived`, `uncertain`, `confirmed` and `stale`.
Evidence outcome separately uses pass, fail, blocked, skipped and not evaluated.
Equivalent serialized names must be mapped explicitly in the implementation's
schema. A confirmed `verifies` link means its relationship was reviewed; it does
not mean the test ran or passed. A recorded passing run does not confer regulatory
approval or show that its assertions are adequate.

Begin with the diagnostic report; preserve a baseline of historical warnings.
The integrated bounded gate fails for current malformed/inconsistent identity,
reference or evidence records, completed tasks with explicit unresolved blockers,
and invalid accepted claims. Future unimplemented requirements are reported as
planned, never accepted or treated as universal gate failures. Document warning,
error and exit-code policy before enabling the gate; do not suppress current
errors with a blanket baseline or reinterpret absent evidence as a pass.

## Implementation boundaries

The implementation documents the command surface, supported input schemas,
stable IDs/selectors, hash and canonicalization rules, path containment, traversal
limits and supported runtimes. Negative fixtures must distinguish an actual
content change from mere time/author metadata where the schema says these are
non-substantive. A fresh accepted record is needed after an affected fix; old
evidence remains historical and is not silently overwritten.

This tool does not independently read restricted manuals, resolve every status
contradiction, infer undocumented dependencies, validate numerical physics or
learner benefit, authenticate external providers, or replace independent review.
It provides inspectable evidence lineage and enforceable structural checks.
