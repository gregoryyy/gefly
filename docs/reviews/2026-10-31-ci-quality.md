# Repository-tool CI quality review

Reviewer: independent Codex `quality` subagent; not an author of this slice.
Initial review: 2026-10-31 21:39 Europe/Berlin, from the session clock.
Repair recheck: 2026-10-31 21:41 Europe/Berlin, from the session clock.
Current outcome: **no blocking or unresolved quality findings**. Both confirmed
environment-isolation defects were repaired and independently rechecked.

## Reviewed artifact

TODO 1.1.1 integrated source relative to base `3faf9c8`: the shared CI runner,
scaffold/runner tests, just recipe, pinned workflow, Dependabot and documentation.
Current repaired substantive snapshot: 83 tracked files, SHA-256
`c4adb297d57e3ab77dc37879144ada84d582566c7b2e7dd645a23d903c786506`.
Initial reviewed snapshot was
`fd0b5d197cad3e3355127405b721c3c3e3a1f1867c6bfb451ef904b6379a2e31`,
including the SBOM action-license-link correction. Hash each sorted tracked
relative path, NUL, working-file bytes, NUL; exclude TODO, DONE, RESULTS and
`docs/reviews/`. The independent calculation matched `output/ci/snapshot.json`.
The initial implementation was committed as `91d0aed` during review. Only
`utils/ci.py` and `utils/test_ci.py` changed in the repair scope; the current
hash identifies the repairs accepted by this local quality recheck.

## Findings and disposition

### QCI1 — Medium: inherited Git environment redirects fixture writes

Location: [test_ci.py](../../utils/test_ci.py), `GitFixture.setUp` environment
setup and its `git`/`commit` helpers (initial reviewed lines 27–39, 47–53).

The fixture adds three `GIT_CONFIG_*`/prompt overrides but preserves inherited
repository/index/object redirection variables. An inherited absolute `GIT_DIR`
therefore overrides the temporary working directory for `git init`, `config`,
`add` and `commit`. The promised isolated fixture can alter a caller repository's
configuration, index and history.

Safe reproduction used only two disposable repositories: create an unrelated
empty repository, set `GIT_DIR` to its `.git`, then call `GitFixture.setUp`.
The unrelated repository had no HEAD before the call and afterwards had a HEAD
containing the fixture's committed `clean.txt`. The project repository was not
used as the target or modified by this reproduction.

Expected: all fixture Git writes stay within its temporary repository regardless
of inherited Git redirection. Required repair: remove inherited `GIT_*` controls
before applying explicit fixture settings; add a two-disposable-repository
regression that checks the unrelated repository's HEAD/index/config remain intact.
Disposition: **resolved**. Fixture setup now removes every inherited `GIT_*`
variable before applying its explicit settings with `clear=True`. The added
regression checks foreign HEAD/index/config/content preservation under a lone
`GIT_DIR` and combined repository/index/object/configuration redirection. An
independent repeat of the original two-temporary-repository reproduction
confirmed the foreign HEAD/index/config remain unchanged and the fixture's
own repository receives its commit.

### QCI2 — Medium: inherited Git environment can omit tracked whitespace defects

Location: [ci.py](../../utils/ci.py), `check_whitespace` Git subprocess environment.

The production runner also relies on `cwd=root` without neutralizing inherited
Git repository redirection. Its `git ls-files` can enumerate another index and
silently reduce the checked file set, violating E0-CI CI2's tracked-content gate.

Safe reproduction used two disposable repositories. The intended root tracked a
clean `README.md` plus `bad.txt` with trailing whitespace; the unrelated repository
tracked only a clean `README.md`. With a clean environment the root check failed
and reported two tracked paths. With `GIT_DIR` pointing to the unrelated `.git`,
the same root check passed and reported only one path, omitting `bad.txt`.

Expected: listing/checking uses the intended checkout and catches its defect.
Required repair: scrub inherited Git redirection for production Git subprocesses,
plus a regression using overlapping paths so wrong-repository coverage cannot
pass merely because every listed file happens to exist in the intended root.
Disposition: **resolved**. `ci.git_environment()` removes inherited `GIT_*`
controls for the production Git listing, diff and version subprocesses. The
regression covers both foreign `GIT_DIR` and `GIT_INDEX_FILE`. An independent
repeat with overlapping filenames confirmed that both poisoned environments
still inspect the intended two paths and reject `bad.txt`.

## Checks actually run

- `just ci`: passed on Python 3.11.12 and Apple Git 2.39.5, including 65 Markdown
  documents, nine Codex roles/Claude dispatcher, 39 offline tests and whitespace
  checking of 92 tracked paths. That positive run did not detect the findings.
- `git diff --cached --check 3faf9c8`: passed.
- Independent substantive-source hash: matched the 83-file manifest above.
- Both additional environment-negative reproductions: confirmed, using only
  disposable temporary repositories and no provider calls.
- Inspected the orchestrator's isolated-checkout logs for Python 3.11.12 and
  3.15.2: each records 39 passing tests and the shared gate passing. These are
  inspected records, not independent re-execution by this reviewer on 3.15.

After repair:

- `just ci`: passed on Python 3.11.12 and Apple Git 2.39.5, including 67 Markdown
  documents, nine Codex roles/Claude dispatcher, all 41 offline tests and
  whitespace checking of 92 tracked paths at execution time.
- Independently repeated both original negative reproductions using only
  temporary repositories: foreign Git state is protected, and intended-root
  whitespace defects cannot be hidden by foreign repository/index variables.
- Recomputed the repaired 83-file snapshot: matched the current manifest/hash.
  No implementation, shared status, Git state or provider call was changed by
  the reviewer; the only authored artifact is this review record.

## Other observations and limits

No other concrete defects found in this bounded review. The workflow uses normal
PR/push contexts, read-only contents permission, no persisted checkout credentials,
full action pins and the shared runner; updates and environment limits are
documented. Tests cover non-vacuous clean-checkout whitespace, failures, missing
tools/files, empty suites and mocked peer errors. Pinned action-license links are
separate from application dependency or project-license selection.

Hosted execution, branch protection, live cross-provider peer acceptance, future
application gates, simulator behavior and aircraft/training validation remain
separate evidence. This review did not invoke a provider or change implementation,
Git state or shared status. Local quality accepts the repairs at the current
snapshot; post-repair hosted matrix, specification-validation and live peer
results remain separate required evidence before overall acceptance.
