# Evaluation results

Native/WASM feasibility and reference-Mac browser performance studies have run, with the scope and limitations summarized below and in their versioned study records. A complete simulator exercise, accepted 172S fidelity and learner outcomes remain unvalidated. Planned methods are in [EVAL](EVAL.md); source research is indexed in [research](research/README.md).

## 2026-10-31 15:03 — E0 bootstrap checks and PDF smoke build

Scope: local uncommitted scaffold on `bootstrap/project-foundation`; no HEAD commit
or remote. Commands below ran on this working tree before independent reviews.
Environment: macOS, Python 3.11.12, just 1.59.0, pandoc 3.13, locally installed
Google Chrome. Time is Europe/Berlin. The source BOOT SHA-256 matches the value
recorded in the imported guide; the sibling source was read only.

| Check | Observed result |
| --- | --- |
| `just check` | Passed: 45 Markdown documents, eight native agent definitions; file/link targets and configuration parsed. |
| `just reqs` / `just reqs AGENT` | Listed 27 requirement declarations / six agent-workflow requirements from SPEC. |
| `just --list` / `just --dry-run docs docs/agents` | Recipes parsed and documentation alias resolved. |
| `just sources docs/agents` | Enumerated workflow index and all eight role prompts. |
| `just pdf docs/IDEA.md` | Generated one A4 page after running Chrome with the required local execution permission. |
| `just pdf docs/agents/README.md` | Generated three A4 pages after the same permission retry. |
| Repeating both PDF commands | Both reported `up to date`; no rendering needed. |
| PDF inspection with PyMuPDF and page PNGs | All four pages rendered and visually inspected: readable text/table, no observed clipping or overlap; page dimensions approximately 595 × 842 pt (A4). |
| `CHROME=/tmp/gefly-missing-chrome just pdf docs/IDEA.md` | Expected failure, exit 2, with installation/override guidance; no silent success. |
| `git check-ignore` for generated PDFs, stamps, `.env` and `.env.example` | Generated PDFs, stamps and `.env` ignored; `.env.example` not ignored. |
| `git init -b main` then `git switch -c bootstrap/project-foundation` | Local repository/branch initialized with required filesystem permission; `git remote -v` empty and `just refs` reports no commits. |

The initial sandboxed PDF attempt aborted when Chrome launched and produced no
PDF; the permission retry succeeded. The initial sandboxed Git initialization
was blocked by protected metadata; the permission retry succeeded. These were
execution-environment constraints, not passing builds. Pandoc prints a deprecation
warning for inherited `--mathml`; it still renders successfully on the recorded
version. No packages, browsers or plugins were installed.

Limitations: only two representative PDFs were built. Mermaid and LaTeX paths,
full document batch generation, external link freshness, heading anchors, live
custom-agent discovery and enforcement are not validated by these commands. Native
agent TOML parses and points to role prompts; no autonomous orchestration daemon
or aircraft simulation was run. Physics, avionics, performance, learning outcomes
and training credit remain not evaluated.

## 2026-10-31 15:06 — E0 independent reviews

[Quality](reviews/bootstrap-quality.md) found no blocking findings in the 58-file
substantive scaffold. [Validation](reviews/bootstrap-validation.md) accepted all
nine foundation requirements and the documentary portion of progressive fidelity.
Both reviewed the same scoped SHA-256:
`6f13e663288e2c088700a913d9315e8b0376c54c0d76a842efa8892ab900aaef`.
The reports define exclusions and evidence, including separate inspection of the
bookkeeping and generated PDFs. Validation requested explicit observations in DONE;
that gap was corrected and rechecked. No substantive change followed within that
bootstrap snapshot; later refinements are recorded separately below.

Final `just check` passed for **47 Markdown documents and eight agent definitions**,
including review links. Future simulator requirements are not evaluated. This
accepts the local structure/workflow delivery; remaining milestone 0 decisions and
all implementation milestones remain open in TODO/GAPS.

## 2026-10-31 15:21 — Documentation refinement checks (E8 source review / planning)

The expanded source notes and product/architecture records pass `just check`
(53 Markdown documents, eight agent definitions). SPEC now declares **48 unique
requirements**; IDs were preserved while 21 expanded-scope requirements were added.
Documentation whitespace checks pass. The substantive 64-file snapshot
is `f501ccb6f4814528ff16b75a08016ce6aa1d0122cadf308275d5869ddd279347` under the review path/bytes hash convention. Independent
quality and validation reviews are pending for this snapshot.

The [GeoFS/community note](research/2026-10-31-geofs-gap-analysis.md) and
[EDDF/open-engine note](research/2026-10-31-eddf-open-foundation.md) record methods,
primary links, findings and source limitations. This is source research and
planning evidence, not hands-on simulator/learner validation. E5–E7 and E9–E11
remain planned protocols. Earlier bootstrap reports and generated PDF checks are
historical; they do not accept the changed specification or render its updates.
No engine/model/data pack or LLM/provider was installed; no community or simulator
was deployed. Exact official EDDF center, source/asset rights and implementation
choices remain decisions.

## 2026-10-31 15:25 — Independent refinement reviews

[Quality](reviews/2026-10-31-product-refinement-quality.md) has no blocking or
unresolved findings. Its low ambiguity about a classic altimeter's standard-pressure
setting was repaired and independently rechecked. [Validation](reviews/2026-10-31-product-refinement-validation.md)
accepts documentary coverage for the 21 added requirements and confirms all 27
original IDs remain. Future implementation criteria are not evaluated.

Final reviewed substantive snapshot: **64 files**, SHA-256
`39b4e72b35672cd890a7deca86cfc5f6a5f9959c1575474945b9840d1f54f09a`. Both reports define its path/bytes algorithm and exclusions;
TODO, DONE, RESULTS and reviews are bookkeeping/evidence inspected separately.
The pre-review hash above is historical; the E6 wording repair produced this final
hash. Final `just check` passes **55 Markdown documents and eight agent definitions**.
No substantive changes followed final review. No new PDF build, runtime validation,
service deployment, bulk data ingestion or provider installation occurred.

## 2026-10-31 15:31 — Initial publication preparation checks

`just check` passes for 57 Markdown records and eight native roles. Gitleaks
8.30.1 (`gitleaks dir --redact --no-banner --no-color .`) scanned approximately
365 KB and reported no leaks. A separate read-only publication review found no
blockers in candidate file types, original-input scope, notices or implementation
claims. The included GPL text matches the upstream source bytes; exact original
Gefly licensing remains Q5. GitHub authenticated as `gregoryyy`; lookup of
`gregoryyy/gefly` confirmed the name did not exist before creation. No successful
push is inferred from these preparation checks; remote verification is recorded
when actually observed.

## 2026-10-31 15:33 — Public repository creation and first-push verification

`gh repo create gregoryyy/gefly --public --source . --remote origin` succeeded.
`git push -u origin main` succeeded. GitHub reports repository URL
`https://github.com/gregoryyy/gefly`, visibility **PUBLIC**, `isEmpty: false` and
default branch **main**. `git ls-remote origin refs/heads/main` returned
`2b4d76f90e1eaed2c5c3e352ef839e271135e328`, matching the initial local foundation commit. `origin` points to
`git@github.com:gregoryyy/gefly.git` and local main tracks origin/main.

The initial commit passed the staged whitespace check. The verbatim upstream
license's CRLF line endings are explicitly supported only for that file through
`.gitattributes`. Structural checks and a redacted directory secret scan passed.
The follow-up bootstrap commit records this observed outcome; final HEAD/remote
alignment and clean-tree status are verified again after pushing that record.
These are repository-publication observations, not application deployment or
simulator validation.

## 2026-10-31 15:43 — Q4/Q11 documentary validation

`just check` passed for 59 Markdown records/eight native roles, `git diff --check`
passed and SPEC retained all 48 unique IDs. Independent quality and validation
accepted the Mac keyboard/touchpad baseline, optional yoke/joystick/pedals,
GeoFS-inspired settings and scenario-first historical/generated briefing sequence.
Validation's low README qualifier note was corrected and independently rechecked.
The two new source records are [the answers](input/2026-10-31-mac-controls-briefing-answers.md)
and [the control profile](design/CONTROLS.md), with a primary GeoFS link. No runtime,
Mac/peripheral compatibility, live-provider or updated PDF result is claimed.

## 2026-10-31 15:49 — Licence-specific roadmap documentary validation

`just check` passes for 61 Markdown records/eight native roles. SPEC has 49 unique
IDs with only R-TRAIN-6 added; all earlier 48 retain their relative order. Whitespace
checks pass. Independent quality and validate accepted the sailplane/ultralight
roadmap, source/profile boundaries, Q14 choices and E12 gates with no findings.
The [source note](research/2026-10-31-license-training-tracks.md) records inspected
regulatory/training-body sources and edition/amendment limits. No current course,
qualification eligibility, runtime model or approved training credit was evaluated.

## 2026-10-31 17:17 — E13 independent-provider peer evidence

`just check` passes for 65 Markdown records, nine Codex definitions and the Claude
peer dispatcher. `just test-tools` passes 18 tests; existing 49 requirement IDs
remain in order with R-AGENT-7 added (50 total). Whitespace checks and reciprocal
spaced-path previews pass. Local quality/validation are separately recorded from
actual provider execution.

Claude CLI 2.1.193 reported claude-haiku-4-5-20251001.
A 240-second attempt timed out (blocked). A later focused review completed with
C1–C8 passed but requested missing justfile context. Its real Claude follow-up
passed F1–F3, found no defects and recommended acceptance. The orchestrator
verified provenance/coverage for this peer-addition scope; normalized reports and
all caveats are in [the peer record](reviews/2026-10-31-cross-provider-peer.md).
No live reverse Codex run, simulator test, independent external test execution or
updated PDF render is claimed. Historical local reviews are not reclassified as
cross-provider evidence, and broader PR roadmap scope is not silently accepted by
this focused peer record.


## 2026-10-31 21:43 — E0-CI repository-tool gates

Scope: TODO 1.1.1, [PR #3](https://github.com/gregoryyy/gefly/pull/3), based on
`main` `3faf9c8`. The repaired implementation is
`a6f701667282295d0868bdc74fcdf07ff823d8e8`; its 83-file substantive snapshot is
`c4adb297d57e3ab77dc37879144ada84d582566c7b2e7dd645a23d903c786506`.
Hash sorted tracked relative path, NUL, file bytes, NUL; exclude TODO/DONE/RESULTS
and `docs/reviews/`. All implementation/integration authors are Codex/OpenAI;
review records and status bookkeeping are excluded from implementation authorship.

| Evidence | Observed result |
| --- | --- |
| `just ci` after staging every new implementation file | Shared scaffold/offline-test/tracked-content whitespace gate passed; untracked files enter whitespace coverage only after `git add`. |
| Clean isolated checkout, absolute `utils/ci.py` invocation from unrelated cwd | Passed on Python 3.11.12 and 3.15.2 with Apple Git 2.39.5: 41 tests, 65 Markdown records, nine Codex roles/Claude dispatcher and 92 tracked paths. No sibling repository, prior build, project packages or provider access needed. |
| Negative fixtures | Rejected missing scaffold/link/configuration, failed child tests, empty suites, missing Git/files, committed whitespace defects in clean repositories and inherited Git repository/index redirection; preserved the deliberate GPL CRLF attribute. |
| Actual hosted `pull_request` matrix | [Run 41240047711](https://github.com/gregoryyy/gefly/actions/runs/41240047711) passed both jobs for repaired head `a6f7016`: Python 3.11.17 and 3.15.1, Git 2.56.0, Ubuntu 24.04 image 20261025.353.1, Actions runner 2.338.2; each ran all 41 tests and checked 92 tracked paths. |
| Hosted checkout identity | The PR workflow checked synthetic merge `6f238f99428283f6b7645fd807cddfe0479e609d`, combining `main` `3faf9c8` and `a6f7016`. GitHub commit APIs report the same complete tree `5e9934a977900f86958f2fd99475ac457b455764` for that merge and the feature head. |
| Action provenance | Official tag APIs matched both full action pins; pinned-source license APIs reported MIT. SBOM records release/source/license links, runtime requirements and reviewed weekly update proposals. |
| Independent quality | [Report](reviews/2026-10-31-ci-quality.md): two medium Git-environment isolation defects found, fixed and independently rechecked; no unresolved findings at the repaired snapshot. |
| Independent specification validation | [Report](reviews/2026-10-31-ci-validation.md): repaired CI criteria pass, with source/commit hashes, actual hosted merge-tree identity and separate environment observations verified. |
| Actual opposite-provider peer, completed 21:51 | Claude CLI 2.1.193 reported claude-haiku-4-5-20251001; completed with no quality findings and all eight CI criteria plus three scoped foundation/process rows passed. [Actual report and provenance](reviews/2026-10-31-ci-peer.md) include frozen packet hash, source coverage and limits. Orchestrator checked identity/coverage separately from router success. |

The initial [hosted run 41239757311](https://github.com/gregoryyy/gefly/actions/runs/41239757311)
at `91d0aed` passed 39 tests but preceded the independent isolation findings and
repairs. It is historical evidence, not acceptance of the repaired implementation.
The fresh local and hosted runs above include both added regressions. Quality's
reproductions used only disposable repositories; project Git state was not their
target. `git diff --cached --check` and a redacted directory secret scan passed.
After staging the final review/status records, `just check` passed 68 Markdown
records and the tracked-content whitespace phase passed all 96 paths. A fresh
source hash matched the same 83-file snapshot; the redacted secret scan again
found no leaks. These bookkeeping checks do not replace the 41-test executions.

This slice implements repository-tool CI and a reviewed action-update path.
Minor-line patches and runner images can change; no identical/hermetic runtime
claim is made. Fork-origin PR execution, a main-push event, future Dependabot PRs
and branch protection were not exercised. Application lint/types, dependency
vulnerability/license automation and simulator tests remain parent TODO 1.1 work.
No simulator stack, aircraft model, training fidelity, community deployment,
blanket source licence, live reverse-provider review or updated PDF is accepted
by this result.


## 2026-11-01 — E1 feasibility evidence reconciliation

This summary indexes existing observations; it is not a new benchmark execution.
The [native/WASM study](../studies/e1-jsbsim/README.md) records same-build replay,
first-order timestep refinement and stationary/trim/cost measurements on a cloud
Xeon. Native and WASM digests differ, so cross-build bit identity is not claimed.
The study uses the bundled generic 172P data for evaluation, not a shipped 172S.

The [reference-Mac browser record](../studies/e1-browser/README.md) links raw JSON.
The worker run recorded p95 input-to-state latency 16.9 ms and matching replay
hashes. Paced step-cost p99 failed its proposed budget as measured, with a coarse
non-isolated timer; isolated measurement remains open. Both lightweight renderers
met their recorded frame budgets. The valid Cesium repeat measured median 8.3 ms
and p99 9.4 ms; the earlier invalid canvas run is retained as invalid evidence.
Window sizes differed, CSS resolution was used, and no real terrain, imagery or
cockpit load was measured. These results support the selected Q17 architecture,
not accepted aircraft fidelity or full product performance.

The selected stack is JSBSim in a fixed-step Web Worker, TypeScript, CesiumJS with
three.js fallback and MapLibre (Q17). Real-terrain/device-resolution/load checks
remain TODO 1.2.1; source/configuration and reference-flight work remain TODO 1.3.
The first experimental exercise remains unfrozen in TODO 1.5. The user deferred
an instructor reviewer for now (Q7); no validated learning claim follows.
