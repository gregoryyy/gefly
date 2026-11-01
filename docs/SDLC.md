# Development lifecycle

## From question to accepted work

The orchestrator maintains the user conversation and work queue. Researcher investigates explicit questions and returns source notes. Product turns user decisions and reviewed evidence into stable requirements and measurable criteria in SPEC. Unresolved decisions go to GAPS, with blocking scope clearly stated. Research recommendations do not silently become user decisions.

For each work item, agree requirement IDs, scope, acceptance criteria, evidence, dependency contracts and exclusive write paths. See [dispatch and handoff templates](agents/README.md). Run code1 and code2 on independent slices in parallel; run housekeeping alongside them. Reserve integration/shared-file ownership for the orchestrator. If three worker slots are available, use them for code1, code2 and housekeeping during implementation; schedule research/product and reviews before or after as necessary. Do not exceed runtime limits.

Integrate before final reviews. Quality reviews code quality/security/numerics/testing; validate checks every in-scope specification criterion. The additional peer gate performs both reviews through the other provider, with separate findings and acceptance evidence. An author may fix findings but may not independently accept their own work. Reviewers receive the diff, applicable requirements and reproducible evidence, without requiring the author's reasoning. Record findings with severity, location, reproduction and expected behavior. Repairs invalidate affected acceptance and require a new check. Keep the quality and specification results distinct even when runtime limits require consecutive review waves.

## Cross-provider peer gate

**Cadence (GAPS Q15, adopted from proclens).** The peer review runs **every few
PRs**, because work is often done from mobile or cloud sessions where the other
provider's CLI is not available. Run it whenever a machine with that CLI is
available, at the latest every few PRs. One review covers every change merged since
the last peer-reviewed revision. Merged work in between is marked **peer pending**
in DONE and the PR, not blocked. DONE records each peer review with its revision
range; the next review starts from there. Before a milestone is accepted or a
release is made, the covered range must include its integrated milestone results,
simulation/dynamics, aircraft or navigation data, avionics, training assessment,
security-relevant code and agent/peer tooling changes. The user can request a peer
review at any time.

Use **Claude to review Codex-authored contributions**, and **Codex to review
Claude-authored contributions**, in addition to the existing quality and validate
roles. A different model or subagent inside the author's provider is not a
cross-provider review. Native peer wrappers dispatch this workflow; their presence
is not evidence that an external provider ran or that every CLI supports a schema.

Freeze an integrated revision and review packet containing the diff, applicable
specification/criteria, relevant source/artifact evidence and author-provider
coverage map. Record the revision and packet content hash. Start the reviewing
provider with a fresh context from that packet, not the author's conversation or
a resumed author session. Capture actual CLI/version, invocation outcome and
observed model/provider metadata without exposing credentials. Declared names
alone do not establish reviewer identity or successful execution.

Peer returns two distinct sections: concrete quality findings with severity and
reproduction, and a requirement/criterion matrix with expected/observed behavior,
evidence and pass/fail/blocked/not evaluated. Mixed Codex/Claude authorship needs
reciprocal coverage at the same integrated revision: each provider reviews the
other's contribution and excludes its own contribution from acceptance. Include
integration edits in the provider coverage map. Neither a single partial report
nor a reviewer switching role names establishes complete independent coverage.

Missing CLI, authentication, verifiable provider identity, required reciprocal
coverage or sufficient evidence leaves the peer review pending (blocked/not evaluated).
Record the missing prerequisite; do not silently substitute a same-provider
reviewer, infer success from a router exit alone or mark an untested criterion
passed. Findings return to coders. Any repair, new integration edit or changed
packet invalidates affected evidence and requires a new frozen packet and review.
Earlier reviews remain historical records and do not automatically satisfy this
new gate. [Assurance](assure/ASSR.md) defines the evidence lineage.

## Branches, changes and PRs

Initial scaffolding may be created before the first commit. Thereafter use feature branches, one bounded milestone per PR when a remote exists. Keep dependent PRs based on the prior milestone branch; after merging, rebase and re-run affected checks before claiming the next gate. Do not combine unrelated worker edits into a commit. Follow existing user authorization for commits/pushes; creating a remote or selecting a license is a separate recorded decision. No remote is required for local review.

Record TODO IDs and requirement IDs in changes. Commit descriptions include `Refs:` trailers, for example `Refs: TODO 1.4, R-SIM-1` when that requirement exists. PR descriptions state problem, behavior, validation, security/data impact, source applicability and limitations. The [PR template](../.github/pull_request_template.md) supplies the checklist.

## Definition of done

- The in-scope specification criteria are supported by observable evidence; untested criteria are explicitly blocked or not evaluated.
- Relevant checks pass at the integrated revision; numerical/reference tests are independent of tuning data where possible.
- Quality and validate, and for milestone acceptance or release a covering cross-provider peer review (GAPS Q15), have independent eligible reviewers, resolved findings and current revision/packet evidence; affected reviews are renewed after fixes. Missing provider prerequisites remain explicit blockers.
- Units, coordinate frames, aircraft configuration, source versions/rights and limitations are explicit when applicable.
- Documentation, requirement references, TODO status and clock-derived DONE entry reflect the delivered state.
- No secrets, personal data, unlicensed assets or generated document outputs enter the tracked change unintentionally.

For the foundation, `just check` covers structural checks only. It does not establish model accuracy, browser performance or educational benefit. Use [EVAL](EVAL.md) for each of those claims.

## Studies and decisions

Frame a study around one question, named candidates, predeclared fixtures/metrics and success/stop criteria. Keep exploratory code in `studies/`. End with a recorded review in RESULTS and a decision or retained uncertainty in the affected authoritative document. Distinguish proposed budgets from observed measurements. Product changes SPEC before implementation proceeds against changed requirements.

## TODO mode

TODO mode starts only when the user invokes it. Work through actionable milestones in order using the agent workflow. Read GAPS before dispatch; stop only dependent work for a blocker and continue independent tasks. A gate failure triggers bounded fixes and rechecks; repeated uncertainty returns a concise evidence-backed question to the orchestrator/user. Do not guess answers, mark unchecked criteria passed or expand scope to bypass a blocked decision.

Open separate milestone PRs when a remote and authorization exist; otherwise prepare local reviewable changes and report the missing prerequisite. Keep status authoritative in TODO, evaluations in EVAL/RESULTS and decisions in their affected documents. New scope requires revised specification and gates. This bootstrap task does not itself invoke TODO mode.

## Assurance at the integrated revision

The [assurance contract](assure/SPEC.md) implements bounded level 2 tracking.
Run `just assure check` and inspect the lineage diff after integration, especially
after conflict resolution; a passing earlier branch review does not cover changed
records. The orchestrator applies shared TODO/DONE/GAPS updates through one
integration owner. Reconcile whole DONE records, then check record order and
identity. Completing a dependency requires revisiting the tasks and design
statements that still call it missing. A decision update replaces obsolete current
conditions while retaining clearly marked answer history.

Use the catalog for declared provenance, decision guards and versioned evidence;
Git, SPEC, source records and artifacts remain authoritative. Store exact input
and result hashes and explicit outcomes; altered inputs invalidate dependent
acceptance until affected checks/reviews are renewed. Keep calibration and holdout
cases separate. Initially, unverified planned requirements are reported as pending;
integrity errors and invalid accepted claims fail the gate. Historical-only
references are advisory rather than an instruction to rewrite Git history.

Housekeeping maintains mechanics, validate reviews whether relationships and
claims are justified, quality checks implementation/numerics/security, and peer
keeps its existing independent-provider cadence. Generated reports never confirm
their own semantic correctness. Source/page applicability and scientific judgement
still require review. The shared CI runs the offline assurance checker and tests;
no hooks, database service, provider calls or automatic PR comments are added.

## Releases

Before distribution, resolve license/asset rights, pin dependency versions, review SEC and run the relevant integrated gates, including current cross-provider peer evidence. Identify aircraft/model and scenario versions, supported environments, assists, fidelity envelope and known limitations in release notes. Training-credit or approval claims require a separately scoped evidence and review process; they are not inferred from an EASA curriculum reference.
