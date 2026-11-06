# PR107 current-main merge validation

2026-11-06 18:22 Europe/Berlin, clock-derived. Independent validator: Codex
`/root/camera_return_validate`, not an implementer of this feature or merge.
Scope is Task2.0.175, R-WORLD-6 and R-NAV-5's historical-fix display and saved
location-filter subset. The prior
[feature validation](2026-11-06-map-fix-filters-validation.md) is historical;
current merged execution requires its own evidence.

Frozen publication worktree `/private/tmp/gefly-map-filters`, merge
`f05a539f0bf1a34e4a56451b9aeb87bfeeaaad14`, parents
`aeaa91625362ef9aa5645d6b43bb7d0d5dc981fe` (PR107) and
`1ac24f3bae53358d8a7bf4d9607504d7a13d4fec` (current main, including PR102/104).
The request is conflict reconciliation, not a broader navigation acceptance.

**Source-focused recommendation: pass.** No source-validation blocker to
publishing this merge snapshot was found. **Actual current browser and final
shared CI/assurance acceptance remain pending.** Ten pure tests and source
inspection cannot replace those execution gates.

| Criterion | Expected | Observed at f05a539 | Result |
| --- | --- | --- | --- |
| R-WORLD-6: retain seven category identities and saved choices | Independent categories, explicit all-off, bounded versioned origin-local display preferences | Shared category mapper remains distinct for source airport subtypes, NAV and fixes. Exact512-byte `{version,types}` schema rejects duplicate/unknown/coercible/future records; invalid storage defaults without rewriting. Ten independent pure tests pass, including false/empty choices and single-read getter capture. | pass |
| R-WORLD-6: saved initial selection reaches search | Restore filters before first render without sharing mutable caller state | Merged map loads the preference record, passes it as `initialTypes`, and search clones its Set and initializes checkboxes consistently. Source retains the seven default categories when no valid record exists. | pass by source inspection |
| Merge with worldwide search | Current remote query/worker search remains bounded and subject to the same category selection | Search retains180ms debounce, search generations, disposal cancellation,40result limit and local/remote deduplication. Both local and remote entries pass the same `selectedTypes` check and shared category mapper. | pass by source inspection; actual remote UI not yet observed |
| Merge with worldwide map markers | Type changes repaint local and worldwide NAV/fix sources/markers consistently | Callback saves selection, clears local/fix caches and explicitly resets `paintedWorldNavaids`/`worldNavMarkerKey`, then repaints airports/local NAV/worldwide NAV/fixes. The incoming world loader/layers/selection/disposal paths remain. | pass by source inspection; actual rendering pending |
| R-NAV-5: fix markers follow the Fixes filter | Source fixes become visible/selectable with Fixes, retaining source identity and bounded labels | `paintFixes` uses the shared location filter, retains catalogue IDs/coordinates, zoom-dependent circle source and at most40 nearby text markers. No extra fix-visibility gate remains. Filtering does not create a custom fix or native command. | pass by source inspection; current pixel/selection observations pending |
| Merge preserves shared records and test sets | Retain both histories, immutable input/catalog records and all test registrations | Independent whole-block checks preserve181 PR107-parent and184 main-parent DONE entries; all140/144 respective raw input blobs, input-index links, catalog records, script keys and unit/browser command tokens survive. Merged package JSON parses. | pass |
| Current TypeScript | Integrated types compile | Implementer reports current `tsc --noEmit` exit0, with source frozen; this is supplied execution evidence, not independently rerun. | pass on supplied evidence |
| Current browser lifecycle/isolation | Actual fix pixels/popups and filter choices survive reopen/reload, denied storage works, native state stays fixed | Fresh browser run is in progress. Older feature artifacts do not establish this new practice-map/search merge. | blocked pending execution |
| Final shared gate and assurance/diff | Required integrated checks finish at this source snapshot | Current full CI starts after the browser closes; no completed final result observed yet. | blocked |
| Broader source/receiver/flight and cross-provider acceptance | Keep display filtering separate from data completeness, RF/IFR/ILS and aircraft acceptance | Not evaluated in this bounded merge review. | not evaluated |

## Reviewed source identities and executed checks

| File | SHA-256 |
| --- | --- |
| `app/src/practice-map.ts` | `db8f72bf6aecf1630a75cc8568d7d61fb282190aab731261db4424c904556eb2` |
| `app/src/map-point-search.ts` | `fd23bf34ed2b5c6fc06a94864b8490c145912468eb66710dc01e2eb248c9826a` |
| `app/src/map-location-preferences.ts` | `e351e3c39b690c1ea2dadfeb26a1d66742e338f3fc3b309732794978d027c2aa` |
| `app/src/map-location-types.ts` | `4d885a01eafb450d2570a53a9dd3946ab7e4dbcce896921029ccaef87baf4549` |
| `docs/SPEC.md` | `4ffc7ec0dcbdb5aedeba54b806a50abc568b96f183ead4fef850ff9b58a526d2` |

Executed independently from the publication worktree:

```sh
node --test app/src/map-location-preferences.test.ts app/src/map-location-types.test.ts
```

Observed10passed,0failed/cancelled/skipped/TODO. Source comparisons against both
parents inspected the auto-merged search/map logic, not merely the manually
conflicted package/status paths. Independent Git/Python checks compare complete
DONE heading/body blocks, raw-input blob identities, index link sets, equal
catalog records and complete script-command token sets. No claim record or input
was discarded to reconcile these features.

The initial browser launch encountered a sandbox permission failure; its log is
preserved separately as `output-pr107-merge-browser-sandbox.log`. A subsequent
authorized browser run is pending, not yet a pass. No duplicate browser/full-graph
run was launched by this validator. Source, pixel fixtures, native isolation and
global discovery coverage must remain distinct in the eventual runtime result.

This report does not accept geographic completeness/current source accuracy,
receiver signals, surveyed scenery, full flight-plan behavior, aircraft/training
fidelity, an embedded WebKit/device matrix or external-provider peer review.
Current publication bookkeeping and final shared records remain integration-owned;
changed affected source requires renewed evidence.

## Actual merged browser renewal

2026-11-06 18:31 Europe/Berlin, clock-derived. Reviewer independently inspected
the current `output/flight/map-location-preferences-browser.json`, SHA-256
`a1502f5fd27142898d0a3b217a0979a291dd0d8167d82f3a0cd0b9e5aae53ba2`.
It records five passing groups on Chromium156.0.8078.80 with zero errors. All five
runtime/harness hashes were recomputed independently and match currentf05a539.
The harness identity is
`87373aea1512db548fe8fe5e7ea94decd4ef28eaac1ffdf85594453ebfd649a1`.
This is new execution against the current merge, not an earlier port artifact.

| Previously pending behavior | Current observed evidence | Result |
| --- | --- | --- |
| Fix markers and list agree | Actual historical source/ASKIK rendered marker/selectable label agree with results; Fixes off hides both while retaining other categories, explicit GPS target and paused native state. | pass |
| Initial filter ownership and all-off | Actual search factory copies initial types, accepts explicit empty selection and emits no initialization callback. | pass |
| Persistence through map/app lifecycle | Mixed `airfield,nav` and explicit all-off survive close/reopen, reload and a fresh same-origin tab; first inserted filter controls already match saved choices. Actual Flight restart retains mixed choices and sources with a paused new native baseline. | pass |
| Invalid/denied storage | Corrupt/future/oversized storage restores all seven defaults; actually denied storage allows session selection/reopen and safely defaults after reload. | pass |

Current source plus these bounded browser behaviors pass. Worldwide remote-search
generation/filter coexistence is source-inspected above; these five groups do
not establish a new exhaustive worldwide search/data acceptance.

**Final shared CI/assurance/diff remains pending.** The earlier attempted gate
`output-pr107-merge-ci-python315-failed.log` is a failure: the host Python3.15
`pyexpat` import reports a missing `_XML_SetAllocTrackerActivationThreshold`
symbol and application Python preparation tests fail. It is not a passing CI
result. The subsequent run with the selected working Python environment is still
running in `output-pr107-merge-ci.log` at this inspection. No source assertion
was relaxed, optional skip converted to pass or old CI substituted for it.

## Final integrated gate renewal

2026-11-06 18:42 Europe/Berlin, clock-derived. Reviewer independently read the
completed working-Python CI and parsed the final corrected assurance diff for
unchanged `f05a539f0bf1a34e4a56451b9aeb87bfeeaaad14`, tested against
`1ac24f3bae53358d8a7bf4d9607504d7a13d4fec`. The earlier gate-pending condition
is resolved for this snapshot; no later-main acceptance is inferred.

| Remaining criterion | Observed current evidence | Result |
| --- | --- | --- |
| Complete shared CI | Final `output-pr107-merge-ci.log` completes636Node/32Python application tests,89assurance and11training tests, integrity and3217tracked-path whitespace with a passing terminal summary. | pass for executed checks |
| Explicit assurance and final diff | Supplied explicit check exit0 agrees with final CI integrity. Independently parsed ignored final diff against1ac24f3 has29added/245changed/0removed identities, untruncated impact and no unknown queries; execution owner reports exit0. | pass |
| Current source/browser binding | Recomputed all five pins remain equal to current source and the five-group actual browser artifacta1502f5f…; no runtime repair followed the source freeze. | pass |

Final CI SHA-256:
`b10ce62eeae278e5e39a89a9af76c85a1fe885aa07fcb8b3e1357ff4179f9c4e`.
Its integrity report identifies44,123nodes/62,174facts,
0errors/226warnings/138notes and input hash
`100f519c5a0ffc516df772997f9b3a677f54556c1effa423f5e8b0e9683605d9`.
Python application counts are6+6+10+10, all successful. Nine optional JSBSim
study checks and one platform-tool check remain skipped, not passed.

Final diff is `output/flight/pr107-merge-assure-diff.json`, SHA-256
`92b2f61cdb550e04a05527919e9303e31de6e6c9fe08c602f1be26aa531bebbc`.
The first diff redirected its output to a nonignored JSON path, causing the
checker to scan its own initially empty output. The archived self-input artifact
and failed wrapper log are retained separately. Moving output into the ignored
output directory fixes the invocation without changing source. The validator
confirmed the final diff contains no generated self-input identities or removals;
the archived failed attempt does not count as a passing diff. The Python3.15
failure and initial sandbox browser failure above likewise remain unsuccessful
observations, separate from the renewed passing runs.

**Final bounded recommendation: pass for Task2.0.175's merged fix/filter behavior
at f05a539 against its tested1ac24f3 base.** Source preservation, independent
pure tests, current actual browser, complete CI and final diff support this
scope. This does not newly accept exhaustive worldwide remote-search behavior,
source/aircraft fidelity or external-provider peer. Final shared records and
publication bookkeeping remain integration-owned.
