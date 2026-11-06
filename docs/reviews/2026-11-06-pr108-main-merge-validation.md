# PR108 current-main merge validation

2026-11-06 18:33 Europe/Berlin, clock-derived. Independent validator: Codex
`/root/camera_return_validate`, not an author of the shortcut feature or merge.
Scope is Task2.0.176's R-SIM-9/R-WORLD-6 open-map zoom-key ownership. The
[previous validation](2026-11-06-map-zoom-keys-validation.md) is historical for its
earlier source integration; it does not automatically accept this merge.

Frozen publication worktree `/private/tmp/gefly-map-zoom`, merge
`5d43748017f23235605bf4f6498e788a572427c7`, parents
`884d75521120bba58c84aa965199d48ae25d5317` (PR108) and
`c19caa5277b1eff846fea55e280b4e500bd5ead2` (current main, including PR104/107).
The six manual conflicts were package scripts, app README, GAPS, SEC, TODO and
research index; main/map auto-merges were inspected against both parents.

**Source-focused recommendation: pass.** No source-validation blocker to
publishing this merge snapshot was found. **Current merged browser and final
shared CI/assurance acceptance remain pending.** Source and seven pure tests do
not replace current execution evidence.

| Criterion | Expected | Observed at this frozen revision | Result |
| --- | --- | --- | --- |
| R-SIM-9 current contract retained | Existing map-open precedence, guards and closed-map pacing semantics remain | Exact R-SIM-9 declaration is unchanged from PR108 parent. SEC/GAPS retain shortcut ownership alongside the incoming preference/data decisions. | pass |
| Open-map zoom routing | Character `=`, `+`, `-`, German Shift+Digit0 and numpad keys belong to open-map zoom regardless of scene/map focus | Unchanged capture router detects character/numpad direction, checks map openness and consumes eligible events with `preventDefault`/`stopImmediatePropagation`; merged main passes `mapVisible` and `practiceMap.zoom`. | pass by source inspection |
| Repeat, cancellation and focus guards | Recognized repeats cannot leak to throttle or zoom again; typing/modifiers/dialog/menu/credit/default-prevented events stay guarded | Independent seven tests pass the actual unchanged helper, including repeats, loading callback, editable/noneditable focus, visible credits, modifiers/cancellation and disposal. Source retains all guards. | pass for helper criteria |
| Closed-map speed controls and explicit rate actions | Preserve simulation/Review keyboard rates with closed map; menu click/rate APIs still work when open | Flight-assists code is byte-identical to PR108 parent: map-open guard affects keyboard pacing only, default-prevented events return, existing click/Shift-click/API paths remain. Main passes the current visibility callback and disposes the router on pagehide. | pass by source inspection; current UI pending |
| One-level bounded map zoom | Reuse existing limits, no queued loading action or unintended aircraft mutation | Public method requires visible/ready/not disposed and uses the toolbar's shared min/max clamp. Loading still consumes eligible keys through the router, but the map method does nothing; no queued command is added. | pass by source inspection; actual map level/native assertions pending |
| Preference/world-data boundary | Preserve saved Options, category filters, worldwide discovery and source boundaries | Diff against incoming main adds only zoom API/control labels/router/rate guard/lifetime hooks to main/map; no storage record or discovery source policy is changed. Current saved Options and world/filter integrations remain. | pass by source inspection |
| Complete histories/test/evidence inventory | Keep both parent records, raw inputs and registered tests | Independent Git/Python comparison preserves all181 PR108-parent and185 main-parent complete DONE blocks,140/145 raw input blobs, index links, catalog records, script keys and unit/browser command tokens. Merged package JSON parses. | pass |
| Current TypeScript | Merged application compiles | Implementer reports `tsc --noEmit` exit0 at frozen source; this is supplied execution evidence, not independently rerun. | pass on supplied evidence |
| Actual merged browser behavior | Actual map zoom/pacing/throttle, live/paused/Review and lifecycle/guard behavior at the new main/map hashes | New browser execution has not yet supplied a completed artifact; old feature browser results are historical. | blocked pending execution |
| Final shared CI/assurance/diff | Integrated checks complete at current source | Not complete at this initial inspection. | blocked |
| Broader aircraft/source/device and cross-provider acceptance | Keep this display/input change separate from fidelity and independent-provider review | Not evaluated or accepted here. | not evaluated |

## Exact source identity and independent execution

| File | SHA-256 |
| --- | --- |
| `app/src/main.ts` | `1229ccb750afcd7c1094c2bdd924806f02029996081d6387d0a0fc3a87e68f74` |
| `app/src/practice-map.ts` | `e38618ce9eeb91183e7b01768ef1819d7c285c93b801bf39b9d4488c13d36dc8` |
| `app/src/flight-assists.ts` | `cc8d9f61cfa6f42b479d0fe14d75352d5d4bfec5ff61923ce8c283211b81d18c` |
| `app/src/map-zoom-shortcuts.ts` | `7b2be897e7ad5cd9636d97eb245a33c805da2fefa747247add444b53e38aeb91` |
| `app/tests/map-zoom-shortcuts.browser.mjs` | `3fcc4095a4093321650be17e76c807ea695263cef1c8314e42c7e75c90ef590c` |
| `docs/SPEC.md` | `aeeb06d45733af5f9274e59e7d333166727553dc6ef8b5ddb611660d45b3e944` |

The router, flight-assists and browser harness bytes are identical to the prior
PR108 parent; the auto-merged main/map have their own identities above. Executed
independently from the publication worktree:

```sh
node --test app/src/map-zoom-shortcuts.test.ts
```

Observed7passed,0failed/cancelled/skipped/TODO. These tests establish helper
routing against controlled event/DOM fixtures, not complete native flight or
actual browser keyboard behavior. Independent source inspection verifies that
the shared toolbar/keyboard zoom function clamps both directions and that the
rate menu/API code retains independent operation.

Whole DONE block comparisons retain body text rather than only headings. Raw
input hashes, index link sets, equal catalog records and complete test/browser
command token sets were checked against both parents. No claim or input was
discarded to make this merge pass. No heavy graph/CI/browser run was duplicated
by this validator.

This review does not establish aircraft dynamics, worldwide source accuracy,
full device/keyboard/browser coverage, an embedded WebKit run or external-provider
peer acceptance. Final runtime gates and shared status/publication remain
integration-owned; changed affected source requires renewed evidence.

## Actual current browser renewal

2026-11-06 18:39 Europe/Berlin, clock-derived. Reviewer independently inspected
`output/flight/map-zoom-shortcuts-browser.json`, SHA-256
`d7c9793ed58e373d891f59ad1bd2572e0e72ff2668ba490ae281898a3b03b545`.
It records eight passing groups, zero errors and Chromium156.0.8078.80. All five
runtime/harness hashes were recomputed independently and match current5d437480,
including the new main/map identities above. This actual current artifact resolves
the browser-pending row, without substituting an older run.

| Current browser criterion | Observed behavior | Result |
| --- | --- | --- |
| Open/loading map ownership | Loading map consumes eligible keys/repeats; ready map changes one level per eligible press with scene, canvas and map-control focus, preserving paused worker/rate/throttle state. | pass |
| Guards and independent commands | Modifiers, repeat, prior cancellation, editable search, menu and modal cases preserve state; A still toggles AP, explicit speed click/Shift-click still changes worker rate. | pass |
| Closed/live/Review operation | Closed map restores pacing shortcuts; actual live stepping continues while zoom leaves rate/throttle unchanged; Review zoom leaves replay speed and paused live worker unchanged. | pass |
| Bounds and discoverability | Keyboard and toolbar share actual MapLibre min/max limits; speed hint/accessibility metadata follows map visibility. | pass |

Current source and these bounded runtime behaviors pass. **Final whole CI and
final assurance/diff remain pending**; source/worker/fixture/device limits above
remain unchanged. The browser result was produced by the implementation/browser
agent and inspected by this validator; no duplicate browser run was launched.

## Final integrated gate renewal

2026-11-06 18:47 Europe/Berlin, clock-derived. Reviewer independently inspected
the final completed CI and parsed the final assurance diff at unchanged
`5d43748017f23235605bf4f6498e788a572427c7`, tested against
`c19caa5277b1eff846fea55e280b4e500bd5ead2`. This resolves the earlier final
gate-pending condition for this snapshot, not any later main revision.

| Remaining criterion | Observed final evidence | Result |
| --- | --- | --- |
| Complete shared CI | `output-pr108-merge-ci.log` completes643Node/32Python application tests,89assurance and11training tests, integrity and3226tracked-path whitespace, with terminal CI success. | pass for executed checks |
| Explicit assurance/final diff | Supplied explicit check exit0 agrees with CI integrity. Independently parsed diff againstc19caa5 has24added/248changed/0removed identities, untruncated impact and no unknown queries; execution owner reports exit0. | pass |
| Browser/source binding | Current eight-group actual browser binds all five unchanged source/harness pins; earlier independent source/unit and browser criteria remain applicable. | pass |

CI SHA-256:
`bf8cf359dce90cbaa75f48bb4a54662143f9acdbbdeef3bd4cf11c9f6b3f0c67`.
Integrity identifies44,148nodes/63,414facts,0errors/226warnings/138notes and
input hash
`8c946b27ea5f0d3bda6bc0cb411091c88141e9fc8828fcaa3489e330ade3092b`.
Nine optional JSBSim study checks and one platform-tool check remain skips.

Final diff `output/flight/pr108-merge-assure-diff.json` SHA-256:
`558a49fe6cb0338a3e7d37e14872641b26d90146597d3353a3f10be5ea33fc34`.
The validator read the full terminal log and parsed the actual JSON rather than
accepting only the compact summary; no duplicate heavy run was launched.

**Final bounded recommendation: pass for Task2.0.176's map-key merge at5d437480
against its testedc19caa5 base.** Source preservation, independent pure tests,
current actual browser and final integrated gates support the scoped routing
criteria. Broader keyboard/device/aircraft/source/provider limits above remain;
final shared records and publication bookkeeping remain integration-owned.
