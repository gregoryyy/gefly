# Development lifecycle

## From question to accepted work

The orchestrator maintains the user conversation and work queue. Researcher investigates explicit questions and returns source notes. Product turns user decisions and reviewed evidence into stable requirements and measurable criteria in SPEC. Unresolved decisions go to GAPS, with blocking scope clearly stated. Research recommendations do not silently become user decisions.

For each work item, agree requirement IDs, scope, acceptance criteria, evidence, dependency contracts and exclusive write paths. See [dispatch and handoff templates](agents/README.md). Run code1 and code2 on independent slices in parallel; run housekeeping alongside them. Reserve integration/shared-file ownership for the orchestrator. If three worker slots are available, use them for code1, code2 and housekeeping during implementation; schedule research/product and reviews before or after as necessary. Do not exceed runtime limits.

Integrate before final reviews. Quality reviews code quality/security/numerics/testing; validate checks every in-scope specification criterion. An author may fix findings but may not independently accept their own work. Reviewers receive the diff, applicable requirements and reproducible evidence, without requiring the author's reasoning. Record findings with severity, location, reproduction and expected behavior. Repairs invalidate affected acceptance and require a new check. Split quality from validation even when runtime limits require consecutive review waves.

## Branches, changes and PRs

Initial scaffolding may be created before the first commit. Thereafter use feature branches, one bounded milestone per PR when a remote exists. Keep dependent PRs based on the prior milestone branch; after merging, rebase and re-run affected checks before claiming the next gate. Do not combine unrelated worker edits into a commit. Follow existing user authorization for commits/pushes; creating a remote or selecting a license is a separate recorded decision. No remote is required for local review.

Record TODO IDs and requirement IDs in changes. Commit descriptions include `Refs:` trailers, for example `Refs: TODO 1.4, R-SIM-1` when that requirement exists. PR descriptions state problem, behavior, validation, security/data impact, source applicability and limitations. The [PR template](../.github/pull_request_template.md) supplies the checklist.

## Definition of done

- The in-scope specification criteria are supported by observable evidence; untested criteria are explicitly blocked or not evaluated.
- Relevant checks pass at the integrated revision; numerical/reference tests are independent of tuning data where possible.
- Quality and validate reviews are independent of authorship, findings resolved and affected reviews renewed after fixes.
- Units, coordinate frames, aircraft configuration, source versions/rights and limitations are explicit when applicable.
- Documentation, requirement references, TODO status and clock-derived DONE entry reflect the delivered state.
- No secrets, personal data, unlicensed assets or generated document outputs enter the tracked change unintentionally.

For the foundation, `just check` covers structural checks only. It does not establish model accuracy, browser performance or educational benefit. Use [EVAL](EVAL.md) for each of those claims.

## Studies and decisions

Frame a study around one question, named candidates, predeclared fixtures/metrics and success/stop criteria. Keep exploratory code in `studies/`. End with a recorded review in RESULTS and a decision or retained uncertainty in the affected authoritative document. Distinguish proposed budgets from observed measurements. Product changes SPEC before implementation proceeds against changed requirements.

## TODO mode

TODO mode starts only when the user invokes it. Work through actionable milestones in order using the agent workflow. Read GAPS before dispatch; stop only dependent work for a blocker and continue independent tasks. A gate failure triggers bounded fixes and rechecks; repeated uncertainty returns a concise evidence-backed question to the orchestrator/user. Do not guess answers, mark unchecked criteria passed or expand scope to bypass a blocked decision.

Open separate milestone PRs when a remote and authorization exist; otherwise prepare local reviewable changes and report the missing prerequisite. Keep status authoritative in TODO, evaluations in EVAL/RESULTS and decisions in their affected documents. New scope requires revised specification and gates. This bootstrap task does not itself invoke TODO mode.

## Releases

Before distribution, resolve license/asset rights, pin dependency versions, review SEC and run the relevant integrated gates. Identify aircraft/model and scenario versions, supported environments, assists, fidelity envelope and known limitations in release notes. Training-credit or approval claims require a separately scoped evidence and review process; they are not inferred from an EASA curriculum reference.
