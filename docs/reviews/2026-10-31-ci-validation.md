# Repository-tool CI validation

Validator: independent Codex `validate` subagent, not an implementation author.
Initial record: **2026-10-31 21:37 Europe/Berlin**. Final revalidation:
**2026-10-31 21:43 Europe/Berlin**, from the session clock.
Scope: TODO 1.1.1 and [E0-CI](../EVAL.md), within the repository-tool portion of
R-BOOT-2/R-BOOT-3 and the agent workflow. Current recommendation: **accept the
bounded local/configuration/hosted CI criteria after repair**. The additional
live cross-provider peer report is now available and inspected in the **21:52
closure below**. It remains separate from this local validation; this review is
not reclassified as an external-provider review or backend attestation.

## Final repaired-source validation

Reviewed feature commit `a6f701667282295d0868bdc74fcdf07ff823d8e8` and the unchanged
83-path manifest. Independently hashed both current file bytes and each committed
blob: both match
`c4adb297d57e3ab77dc37879144ada84d582566c7b2e7dd645a23d903c786506`.
The earlier blocked matrix below is preserved as history, superseded by this
revalidation for the repaired source only.

| Criterion | Required result | Final observed evidence | Status |
| --- | --- | --- | --- |
| CI1 | Shared location-independent runner works in a clean checkout and hosted workflow. | Root-derived entry point/recipe/workflow remain unchanged. Inspected renewed isolated-checkout logs for both supported Python lines; independently ran the current absolute runner from `/tmp`. Hosted jobs invoke the same committed runner. | Pass |
| CI2 | All required phases run, fail closed and inspect the intended tracked current files, including clean committed content. | Rechecked `git_environment()` and every production Git subprocess: inherited `GIT_*` values are removed before version/list/content operations, retaining cwd as the intended repository. The new regression proves neither a foreign `GIT_DIR` nor `GIT_INDEX_FILE` hides `bad.txt`. Nonempty test discovery, phase error propagation and original full-content/attribute cases remain. Current independent execution passed all 41 tests and 92 tracked paths. | Pass after repair |
| CI3 | Isolated, meaningful negative fixtures reject each defect without live providers or caller-repository mutation. | Rechecked fixture environment clearing and both new regressions. A temporary foreign repository is created explicitly; inherited Git directory/worktree/index/common-dir/object/config settings cannot redirect fixture setup, and foreign HEAD/index/config/sentinel bytes are compared afterward. Original scaffold/config/test/clean-committed-whitespace rejection cases remain and pass. Both new regression names appear as passing in the independent run and both hosted jobs. | Pass after repair |
| CI4 | Documented minimum/current stable Python lines run with actual interpreter/environment recorded. | Renewed clean logs show local 3.11.12 and 3.15.2 with Apple Git 2.39.5. Actual hosted jobs show 3.11.17 and 3.15.1 with Git 2.56.0; these are permitted patches within the explicit 3.11/3.15 matrix. Different local/hosted patches are recorded, not described as identical or hermetic. Official-source selection/pin checks from the initial review remain applicable. | Pass |
| CI5 | Safe PR/push configuration and offline stdlib/Git gate execution, without secrets or privileged PR behavior. | Unchanged workflow retains both events, read-only contents permission and no persisted checkout credentials. Inspected hosted logs confirm Contents/Metadata read, `persist-credentials: false`, unsafe-PR checkout disabled and the offline runner. No live provider, package-install, PDF/browser/TeX, simulator or ingestion phase was added by the repair. | Pass |
| CI6 | Verified immutable action pins, reviewed update process and explicit environment limits. | Workflow pins and SBOM/update configuration are unchanged. Hosted logs identify downloads at both exact full SHAs independently verified during the initial review. Runtime-image/patch changes remain documented limits. | Pass |
| CI7 | Actual repaired-revision hosted matrix is separately evidenced, with commit/event/checkout and every job outcome. | Inspected `hosted-final.json` and both full job logs for the successful pull-request run linked below. Its head is `a6f701…`; the actual checkout is PR 3's synthetic merge `6f238f9…`, explicitly distinguished below. Both jobs completed successfully and each passed scaffold, 41 tests and 92 tracked paths. Local success was not substituted for these remote observations. | Pass after repaired run |
| CI8 | Keep CI claims/reviews bounded and renew affected evidence after changes. | The inherited-Git defects caused CI2/CI3 to remain blocked despite an earlier hosted pass. Reviewed the fix, renewed current-source tests and actual repaired-revision jobs before acceptance. This accepts repository-tool CI behavior and its review boundaries only. Quality remains independent; actual external Claude peer acceptance is still pending/separate in this record. | Pass for CI scope/design; external gate pending |

### Final independent and clean-checkout observations

Re-ran the absolute-path command below from `/tmp` after the repair:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 /Users/gregor/Documents/devel/gefly/utils/ci.py
```

Observed exit 0 with Python **3.15.2**, Apple Git **2.39.5**, scaffold **67 Markdown
files / nine native Codex roles plus Claude dispatcher**, **41 tests passed**, and
tracked-content whitespace **92 paths passed**. The two additional local Markdown
files are excluded review records; hosted/clean-source checks reported 65.

Inspected renewed orchestrator clean-checkout logs
`output/ci/final-clean-python-3.11.log` and
`output/ci/final-clean-python-3.15.log`: one isolated clean Git checkout, no siblings,
absolute runner from an unrelated cwd, actual **3.11.12 / 3.15.2**, Apple Git
**2.39.5**, and all phases/41 tests/92 tracked paths passed. These remain recorded
orchestrator executions, distinct from this validator's independent current-tree
run. No implementation/source edits were made by this validator.

### Final hosted evidence and revision relation

Inspected the recorded run metadata and full logs under
`output/ci/hosted-final.json` and `output/ci/hosted-final.log`, not only a summary
or workflow declaration:

- Run: [Foundation 41240047711](https://github.com/gregoryyy/gefly/actions/runs/41240047711),
  event **pull_request**, completed **success**, head
  `a6f701667282295d0868bdc74fcdf07ff823d8e8`.
- Checkout in both job logs: PR 3 merge ref, synthetic merge
  `6f238f99428283f6b7645fd807cddfe0479e609d`, combining feature `a6f701…` into base
  `3faf9c830d35721b9ea8cc3ca69494692221f52b`; this is not a literal checkout of
  the feature head. The orchestrator's GitHub API commit-object inspection reports
  those two parents and tree `5e9934a977900f86958f2fd99475ac457b455764` for both
  the merge and feature head. Source/head/merge identities are retained separately.
- Environment in both job logs: Ubuntu **24.04**, image
  **20261025.353.1**, Actions runner **2.338.2**, Git **2.56.0**.
- [Python 3.11 job 124651880878](https://github.com/gregoryyy/gefly/actions/runs/41240047711/job/124651880878):
  actual **3.11.17**, completed **success**; **41 tests**, **92 tracked paths** and
  scaffold passed, with both Git-environment regressions explicitly passing.
- [Python 3.15 job 124651880633](https://github.com/gregoryyy/gefly/actions/runs/41240047711/job/124651880633):
  actual **3.15.1**, completed **success**; **41 tests**, **92 tracked paths** and
  scaffold passed, with both regressions explicitly passing.

The first [run 41239757311](https://github.com/gregoryyy/gefly/actions/runs/41239757311)
at `91d0aede4859dd456a4c3c337bcaddca2ada279a` remains historical only; its success
did not accept the subsequently found defects. The repaired matrix above closes
the CI-specific pending rows. Actual provider identity/report/criterion evidence
must still establish the separate E13 peer gate; this report does not infer it.

## Initial validation record — retained, superseded

Initial recommendation at 21:37: acceptance blocked pending the reported
Git-environment repair and actual hosted evidence at the repaired revision.
The following initial snapshot/matrix and repair handoff are historical records,
not unresolved final CI findings. They are superseded by the final section above.

## Artifact and evidence scope

Base: `main` revision `3faf9c8`. Reviewed the staged implementation and current
83-file source manifest under local `output/ci/snapshot.json`. Independently
recomputed final substantive SHA-256:
`fd0b5d197cad3e3355127405b721c3c3e3a1f1867c6bfb451ef904b6379a2e31`.
The hash covers sorted relative path bytes, NUL, file bytes, NUL for each listed
source; it excludes TODO/DONE/RESULTS and review records. This report is an excluded
review record, not part of implementation authorship.

The earlier source hash
`10fe032c0013730e09554b9f0565ce05b51870d6afee924bdda20f00646eb0fd`
preceded the SBOM addition of pinned MIT-license references. Inspected that
documentation-only delta and independently fetched the two exact source licenses;
runner, workflow and test implementation did not change. Existing clean-checkout
execution logs apply to that unchanged implementation; current-document link and
snapshot checks were also performed.

Inspected [runner](https://github.com/gregoryyy/gefly/blob/a6f701667282295d0868bdc74fcdf07ff823d8e8/utils/ci.py), [CI fixtures](https://github.com/gregoryyy/gefly/blob/a6f701667282295d0868bdc74fcdf07ff823d8e8/utils/test_ci.py),
[scaffold fixtures](https://github.com/gregoryyy/gefly/blob/a6f701667282295d0868bdc74fcdf07ff823d8e8/utils/test_check.py), existing peer tests,
[workflow](../../.github/workflows/foundation.yml),
[update configuration](../../.github/dependabot.yml), recipes and documented
tool/security/process limits. Exact criteria remain authoritative in E0-CI.

## Criterion matrix

| Criterion | Expected | Observed evidence | Status |
| --- | --- | --- | --- |
| CI1 | One location-independent runner shared by local recipe and hosted workflow; exercise a clean checkout from unrelated cwd without siblings or undeclared packages. | `ROOT` derives from `utils/ci.py`; the recipe delegates to it and the workflow calls `python3 utils/ci.py`. The real isolated-fixture test copies the runner into a separate Git repository and invokes its absolute path from an unrelated directory, verifying both child phases' cwd. Inspected orchestrator clean-checkout logs for 3.11.12 and 3.15.2 with no siblings/prior build. This validator independently ran the real current runner by absolute path from `/tmp`, successfully. Actual hosted outcome is reserved for CI7. | Pass — local and configuration |
| CI2 | Scaffold, complete nonempty offline test suite and all tracked current-file whitespace are mandatory and fail closed with diagnostics. | Initial independent execution passed scaffold, 39 tests and 92 tracked paths; discovery rejects zero tests and per-file checks inspect unchanged tracked content. Quality subsequently identified that inherited `GIT_DIR` can make production `check_whitespace` inspect a different repository/index despite its cwd, defeating required coverage. Git-environment sanitization and regressions are pending independent revalidation. The documented untracked-file exclusion remains intentional. | **Blocked — runner Git-environment repair/revalidation pending** |
| CI3 | Meaningful isolated negative fixtures reject missing scaffold/link, malformed config, failing tests and committed whitespace defects; mocked providers only. | Initial inspected/executed fixtures rejected all listed defects and all 39 tests passed. Quality subsequently reported that inherited `GIT_DIR` can redirect fixture Git writes despite its cwd, violating the isolation premise. Implementation owner is repairing Git-environment handling and adding a regression; this validator has not yet reviewed or executed that changed snapshot. | **Blocked — isolation repair/revalidation pending** |
| CI4 | Support documented minimum Python 3.11 and an officially verified current stable minor; record exact observed environments without claiming hermetic binaries. | Matrix selects `3.11` and `3.15`; official Python version/release pages independently inspected confirm the selected stable line and 3.15.2 release. Orchestrator clean logs show Python 3.11.12 and 3.15.2 with Apple Git 2.39.5, all phases passed. This validator independently observed 3.15.2/Apple Git 2.39.5. SBOM explicitly allows changing patches/runner images; hosted interpreter observations remain pending CI7. | Pass — local lines and matrix selection |
| CI5 | Safe PR/push workflow with read-only token, no persisted credentials/secrets/privileged PR execution; offline stdlib/Git gates only after setup. | Workflow uses `pull_request` and `push` targeting `main`, `contents: read`, checkout `persist-credentials: false`, `ubuntu-24.04`, a bounded timeout and no secrets, privileged PR trigger, package-install or live-provider step. The invoked runner uses Python standard library and Git; tests isolate Git writes in temporary fixtures and mock peer calls. No PDF/browser/TeX, simulator or data-ingestion phase is present. This is configuration/source inspection, not an assertion about an unobserved hosted job. | Pass — configuration and inspected gate behavior |
| CI6 | Immutable verified action pins plus an explicit official-source review/update process; environment limits remain visible. | Every action uses a full 40-character SHA. Independently followed the official checkout v7.0.1 release to `3d3c42e5aac5ba805825da76410c181273ba90b1` and setup-python v7.1.0 release to `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0`; inspected pinned README/runtime and MIT-license files. SBOM records these sources, runner requirements and non-hermetic patch/image limits. Dependabot proposes weekly action updates; replacement pins require source/runtime review and the same checks/reviews. | Pass |
| CI7 | Separate exact local evidence from an actual pushed-feature-PR hosted matrix, including commit/run URL/event and every observed job outcome. | Local evidence for the initial snapshot is independently corroborated below. The orchestrator reported a first hosted pass at `91d0aede4859dd456a4c3c337bcaddca2ada279a`; the required isolation repair changes implementation/tests and invalidates that run as final-revision evidence. A new frozen snapshot and hosted matrix must be inspected. Workflow presence and local passes do not establish that future run. | **Blocked — repaired-revision hosted evidence pending** |
| CI8 | Keep this gate's claims bounded; source publication, branch protection, future stack gates and actual peer acceptance remain separate; renew affected review after changes. | E0-CI, README, tool guide, SBOM and SEC explicitly limit this slice to repository-tool CI. Parent TODO 1.1 retains future stack gates. This report provides independent validation, quality remains a separate review and cross-provider peer evidence remains E13. No branch protection, simulator fidelity, learning benefit or live reverse-provider pass is inferred. Source changes after the named snapshot require affected rechecking. | Pass — scope/review boundaries |

## Commands and observations

This validator ran:

```sh
cd /tmp
PYTHONDONTWRITEBYTECODE=1 python3 /Users/gregor/Documents/devel/gefly/utils/ci.py
```

Observed exit 0: Python **3.15.2**, Apple Git **2.39.5**, scaffold **65 Markdown
files / nine native Codex roles plus Claude dispatcher**, **39 tests passed**,
tracked-content whitespace **92 paths passed**, final `Foundation CI: passed`.
This was an independent working-tree execution from another cwd, not a hosted run.

Separately inspected orchestrator logs `output/ci/clean-python-3.11.log` and
`output/ci/clean-python-3.15.log`. Each identifies the same isolated temporary
checkout, actual interpreter/executable, Git version and passing scaffold, all
39 named tests, 92 tracked paths and final gate. These are recorded orchestrator
clean-snapshot executions, not executions performed by this validator. The
negative-fixture tests in the independent run also create their own isolated
repositories and child runner executions.

Independently recomputed the source manifest hash and inspected required source
and workflow settings. Browsed primary [Python support status](https://devguide.python.org/versions/)
and [3.15.2 release](https://www.python.org/downloads/release/python-3152/) for
version selection; followed the official [checkout release](https://github.com/actions/checkout/releases/tag/v7.0.1)
and [setup-python release](https://github.com/actions/setup-python/releases/tag/v7.1.0)
to their full commits. Inspected the exact pinned README and LICENSE files linked
in [SBOM](../SBOM.md), including the review-time license-reference addition.

## Hosted evidence needed to close CI7

Record the pushed feature commit and source snapshot relation, feature PR and run
URL, trigger event, checked-out revision (including PR merge/head distinction),
runner environment, actual Python patch version and observed outcome/logs for
both matrix jobs. A queued, skipped, missing or failed required job cannot be
reported passed. Recheck CI7 and affected source criteria after any implementation
repair or workflow change. Status-record/report-only updates are excluded from
the substantive snapshot but still need valid links and whitespace.

## Pending repair handoff

Quality's reported inherited-Git-environment issue affects both production
whitespace coverage and fixture-write isolation. The first passing hosted run
does not resolve it, and this report does not accept the affected behavior.
Implementation is being repaired outside this validator's ownership. Reopen CI2,
CI3 and CI7 against the new source hash, negative regression evidence, renewed
clean/local runs and actual repaired-commit hosted jobs. Other criteria require
affected review if the implementation/workflow changes their supporting evidence.

No source, Git history, workflow, hosting or authentication was changed by this
validator. Only the assigned validation report was written. Live peer execution
and acceptance are additional evidence under E13, outside this local CI report.

## External peer evidence closure — 2026-10-31 21:52 Europe/Berlin

The external evidence previously pending at 21:43 is now available. Inspected
the actual local `output/ci/peer-result.json` and independently hashed its frozen
packet: SHA-256
`5bf0266fbd0d11f6fc36c66da33696aa0b5ea421645eb38081b2287f64e43599`.
Packet and envelope match revision `a6f701667282295d0868bdc74fcdf07ff823d8e8`
and the unchanged `c4adb297…` source snapshot. The observed route is Codex author
to external Claude, CLI **2.1.193**, with returned model metadata
**claude-haiku-4-5-20251001**. The actual envelope records completed/accept, an
empty quality list and passes for CI1–CI8 plus three explicitly scoped foundation/
process rows. The durable JSON preserves the returned review exactly.

See the [peer evidence and disposition](2026-10-31-ci-peer.md) and
[normalized actual report](2026-10-31-ci-peer.json). The orchestrator records its
separate identity, authorship, source and criterion-coverage acceptance there;
the parsed recommendation alone is not that gate. This closes the unqualified
pending-peer reference in this report without converting this local review into
the peer review. Claude inspected packet evidence without tools or independent
commands/remote verification; its stated source/provenance and excluded-status
limits remain intact. CLI/model evidence does not attest the backend or establish
a live reciprocal Codex run, simulator fidelity or training approval. Closure
timestamp comes from the execution clock; implementation was unchanged.

Navigation note (2026-11-01): source links above are pinned to the recorded
implementation/review revisions after tooling moved under `utils/ci/`. Historical
commands, findings and reported outcomes are unchanged.
