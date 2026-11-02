# Handover: Claude Code → Codex, 2026-11-02

Author: Claude Code orchestrator. State as of 2026-11-02 10:05 Europe/Berlin, main
`a3c3b24`. This note summarises; GAPS, TODO and DONE stay authoritative.

## 1. Merge the open PRs (user)

Merge with **merge commits** (no squash or rebase), in this order. Each branch already
contains main `a3c3b24` and the PR before it.

| Order | PR | Branch | Content |
| --- | --- | --- | --- |
| 1 | #33 | `fix/m1-records` | Foundation-review record fixes; GAPS Q16/Q23/Q5; TODO 1.2.1.1, 0.21, 2.1 scope; input records |
| 2 | #32 | `fix/m1-contracts` | CONTRACTS v1.1 agreed (§10), B1–B4 fixed, decided `ind` set (SCENARIO-CONTRACTS §4) |
| 3 | #34 | `fix/m1-tooling` | Manifest pins, duplicate-key rejection, CI app npm phase, S5/S9 `facts_only` |
| 4 | #35 | `review/peer-codex-27-30` | Claude peer review of Codex PRs #27–#30, plus fixes (assure status/graph/evidence, SBOM, smoke test) |
| 5 | #36 | `data/s17-ind-wb` | S17 engine/fuel/electrical indications, POH sample loading, FlightGear S14 estimates |
| 6 | #37 | `chore/log-merge-driver` | Sorted-log merge driver for DONE, input-index check, this note |

If GitHub reports a conflict, do not use its conflict editor. Re-sync the branch locally
after `just setup` (`git merge origin/main` with the driver registered), then run
`just ci`.

## 2. First Codex task: peer review of the Claude-authored batch (TODO 0.19)

The user deferred this on 2026-11-02 08:01. It is due before milestone 1 acceptance.

- **Scope:** Claude-authored work since `3faf9c8` (PRs #4–#6 and later, through #37).
  Exclude Codex-authored content (PRs #27–#30), which #35 covers.
- **How:** fresh Codex process, frozen packet, separate quality and validation outcomes
  ([peer contract](../agents/peer.md), [cadence](../SDLC.md#cross-provider-peer-gate)).
  `just peer-preview claude <packet>` previews routing; `just peer-review claude <packet>`
  runs it.
- **Size:** split packets by path (the router limit; see how #35 split #28 into 28a/28b).
  Suggested packets:
  1. contracts and design docs;
  2. records (SPEC/GAPS/TODO);
  3. CI and tooling (`utils/ci`, `utils/validate_manifest.py`, data schemas);
  4. assure fixes (`utils/assure/src/status.ts`, `graph.ts`, `evidence.ts`);
  5. aircraft data (`data/aircraft/c172s-classic/*`, the research note);
  6. the merge driver (`utils/merge/`).
- **Focus points from the Claude reviews:**
  - Accepted low limitations recorded in DONE: unlisted negative wording still counts as
    complete; 172I is not recognised; negated designators are read as naming the variant;
    "unstated" sources are lenient; `app/runtime.ts` is not type-checked; an `=======`
    body line inside a conflicted DONE entry makes the markers ambiguous.
  - The estimated-status rule now requires an `estimate_only` source; a future estimate
    derived from S17 itself would need another status.
  - Not run anywhere yet: the real-engine browser smoke test (`npm --prefix app run
    test:browser` after `just build-flight-engine`, needs Chrome).
- **Also open:** TODO 0.21. The #28b and #30 packets were blocked because material was
  withheld (DONE history, the TODO 1.14.1 ownership record, `build.sh`, smoke-test output).
  They need renewal with that material, run by Claude.

## 3. Milestone 2 state

**Decided (GAPS Q23, Q5, 2026-11-02):**
- Scope: circuit flight, sensed checklist items, static briefing; text radio in phase 3.
- `ind` set: the SCENARIO-CONTRACTS §4 list. code1 freezes `digest_layout` 1 when
  writing it.
- Empty mass/CG: the POH sample loading (labelled).
- S5/S9: `facts_only`.
- S17 Fig. 2-3 and 6-3: whole lists as a Q5 exception.
- Tachometer: the Section 2 arcs govern.
- S17 gaps: FlightGear c172p values as estimates only (S14, `estimate_only`, 172P).

**Blocked on the user:** EDFE AIP data (TODO 1.7). DFS publishes the AIP VFR free online
(aip.dfs.de/basicAIP), but its terms forbid automated download. The user supplies the
pages; extract cited facts only.

**Open TBD-src:** fuel-flow dial range; tach-time counting; sender-fault detection;
annunciator switch-label serial; manifest `empty_mass` still to point to the sample
(follow-up bump and re-pin).

**Other open items:** real-terrain Cesium re-test (TODO 1.2.1.1); Exercise 01 freeze after
the AIP data.

## 4. Environment notes

- **Node:** Node ≥ 24.2 is required for the assure gate (`/opt/node24/bin` in the Claude
  cloud container).
- **npm:** in the Claude cloud sandbox, `npm ci` needed
  `npm_config_cafile=/root/.ccr/ca-bundle.crt` because of the proxy certificate.
- **Gate:** `just ci` (or `python3 utils/ci/run.py --require-node`) currently passes with
  skipped checks: 9 of 23 e1-jsbsim study tests need the optional `jsbsim` package.
- **Merge driver:** run `just setup` once per clone.
- **Model and effort:** per GAPS Q20, select size and effort by task; reviewers never use
  a lower tier than the work they review.
