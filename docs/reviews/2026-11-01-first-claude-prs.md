# Local review of the first Claude PR batch

Reviewed 2026-11-01 18:03 Europe/Berlin by Codex, with local documentary review by first_pr_docs_review. Scope: Claude-authored PRs #4, #5, #6, frozen at `48b2991a2727174626af11439d9c053970562305`, since `3faf9c8`. Excludes Codex PR #3 and later PRs #7/#8. Authorship established from commit metadata, not provider attestation. No fixes, commits, pushes or environment configuration changes made.

## Findings

1. **Medium — Reject failed simulation steps before reporting stationarity/cost.** `studies/e1-jsbsim/harness.py:354–361` ignores `fdm.run()` return values during settling and observation. A stopped engine leaving state unchanged therefore produces perfect zero drift/speed instead of a failed fixture. Reproduced with a fake FDM whose `run()` always returns False, zero-valued state, and mocked setup/trim: fixture returns horizontal_drift_m=0, max_speed_mps=0, trim success. `_cost_once` at lines 392–394 similarly times failed steps in its bare loop. Other stepping paths already raise on False. Check every return and elapsed simulation time; add failure-path tests. This identifies a false-positive path, not evidence the historical run actually stopped.

2. **Medium — Supply a valid, verified study installation command.** `studies/e1-jsbsim/README.md:90–93` supplies `pip install jsbsim==1.3.3 --hash=...`. `--hash` belongs to requirements-file entries, not the install command line. Reproduced with `python3 -m pip install --no-index jsbsim==1.3.3 --hash=sha256:<documented hash>`: exit 2, `no such option: --hash`, before any network operation. The suggested removal also loses the documented artifact verification; provide a hash-checked requirements file or explicitly verified wheel procedure, including compatible Python/platform and pinned/hash-checked numpy. No installation attempted beyond argument validation.

3. **Medium — Propagate the accepted engine decision into the specification.** At the reviewed revision `docs/GAPS.md` Q17 selects JSBSim and ARCH/SBOM agree, but `docs/SPEC.md:50` still calls engine/model selection open, line 165 labels R-REUSE-1 candidate choice pending, and lines 208–209 exclude a selected physics engine. README line 12 also calls the engine undecided. Separate the selected dynamics engine from still-open rendering, model data, versions and browser integration. These passages remain present at the current checkout too.

## Validation

| Criterion | Result | Evidence / limit |
| --- | --- | --- |
| Aircraft, license, EDFE exercise and reference-platform decisions recorded with scope | Pass by source inspection | Claude decision records and authoritative documents at reviewed revision; no aircraft-fidelity claim inferred. |
| Selected engine decision consistently propagated | Fail | Finding 3. |
| Aircraft/EDFE surveys distinguish uncertain applicability, primary evidence and rights | Pass by source inspection | Surveys explicitly retain unverified official data/rights as gaps; external sources not independently fetched. |
| Study installation instructions executable and artifact verified | Fail | Finding 2. |
| Stationarity/cost fixtures reject failed steps | Fail | Finding 1 and local fake-engine reproduction. |
| Current foundation gate | Pass, current checkout only | `python3 utils/ci.py`: scaffold, 41 tests and tracked whitespace passed; captured in 2026-11-01-first-claude-prs-ci.txt. Not historical study runtime validation. |
| Study standalone tests | Partial | 7 passed, 9 skipped because jsbsim is absent; 16 discovered. Study files unchanged from reviewed revision. |
| Historical numerical claims independently reproduced | Not evaluated | No engine/WASM installation; no reference-Mac or aircraft-performance acceptance. |
| Required fresh external peer process | Blocked | See provenance below. |

Recommendation for local findings: changes required. Formal cross-provider acceptance remains blocked. Documented missing primary sources are retained research gaps, not silently accepted or presented as new defects.

## Formal peer attempt and provenance

The repository router was invoked with `--author-provider claude --timeout 900` and the frozen packet. CLI `/opt/codex/bin/codex`, version 0.163.0, exited before producing a review: `failed to initialize in-process app-server client: Read-only file system (os error 30)`. A separate minimal probe, including `--ephemeral`, reproduced the same initialization failure. No reviewer model identity or provider result was returned. No account, credentials, sandbox permissions or tool installation changed. The current Codex local review and local subagent do not substitute for the required fresh CLI gate.

Packet SHA-256: `388fb4887888299b1139cf1e3469b50d8d15769c617b561c4f0fdaadd573b78f`.

Raw router envelope: `2026-11-01-first-claude-prs.json`. Frozen packet: `packet.md` (ignored local output; includes source context, not prior review conclusions). A machine that permits authenticated Codex CLI initialization must rerun this packet; repair changes need an updated packet and affected re-review. TODO 0.19 remains incomplete, and later PRs are outside this report.
