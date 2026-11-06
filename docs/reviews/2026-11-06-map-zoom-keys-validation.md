# Map zoom keyboard ownership — independent validation

2026-11-06 15:45 Europe/Berlin. Task 2.0.176; R-SIM-9 / R-WORLD-6.
Reviewer: Codex validation subagent `/root/map_zoom_validate`, separate from
the implementation authors. No implementation or requirement edits by this
reviewer. Only this report is assigned for writing.

## Reviewed snapshot and evidence

The publication artifact is the bounded working-tree change in
`/private/tmp/gefly-map-zoom`, based on main
`52897de10dfdafb4f7b3252cdb41828f8a22b5f5`. The root working tree at
`/Users/gregor/Documents/devel/gefly` contains additional work; its separate
browser result is supporting evidence, not a claim that every root change is
included in this publication. The same router, tests and browser harness are
present in both snapshots.

Frozen acceptance is the open-map portion of [SPEC R-SIM-9](../SPEC.md), the
[user report](../input/2026-11-06-map-zoom-keys.md), the assigned task contract
and [SEC](../SEC.md#open-map-zoom-shortcut-ownership). The publication SPEC
SHA-256 at review is
`5a890fb38485b14af1e35ec9c85c7370584d67990032a11458b71215632dd6dd`;
the root SPEC is
`32948561e2b4df2514b2564f5a0713b11f1cd9538271c7f62d71d4a252c15692`.
Their additional requirements differ; this review covers only Task 2.0.176.
The general [EVAL](../EVAL.md) protocols do not establish aircraft fidelity
from these UI checks.

The author-run browser artifacts are
`output/flight/map-zoom-shortcuts-browser.json` in each checkout. This reviewer
read the complete [browser harness](../../app/tests/map-zoom-shortcuts.browser.mjs)
and independently verified all five file hashes in each artifact against the
files on disk. The harness verifies the same source hashes again after running.
Observed browser: Chrome `156.0.8078.80`; eight completed assertion groups,
14 explicit paused one-level zoom observations plus a live-flight observation,
and no page errors in each final artifact.

Publication file hashes:

| File under `app/` | SHA-256 |
| --- | --- |
| `src/main.ts` | `93fa2aa57bb045e8ff2ad056703d01022fe8d9caa618932c93b0e38ba5c7226c` |
| `src/practice-map.ts` | `2c7d13a1734316e350a8b670b75e786e4cc169d745155a10fdcba14b82ab0161` |
| `src/flight-assists.ts` | `cc8d9f61cfa6f42b479d0fe14d75352d5d4bfec5ff61923ce8c283211b81d18c` |
| `src/map-zoom-shortcuts.ts` | `7b2be897e7ad5cd9636d97eb245a33c805da2fefa747247add444b53e38aeb91` |
| `tests/map-zoom-shortcuts.browser.mjs` | `3fcc4095a4093321650be17e76c807ea695263cef1c8314e42c7e75c90ef590c` |

The independently executed pure-test file SHA-256 is
`e91f0386aab89a1109ce71af05bfd7ef651d5ab9f2463a1be0e7380463923ca1`.
Artifact SHA-256: publication
`52cef83599c02679c86602c75ce8cd80adf2ddb4f591eb421b564f88cf0da9ba`,
root `2856b4e78a30d82794fbe14cd6eec986423cdd90b2c448575554d4b6c0bf7352`.
These are working-tree content pins, not a claim of an already committed head
or a cross-provider peer packet.

The MapLibre instrumentation only assigns the actual constructed map to a
window observer; it leaves the constructor and map methods intact. The Worker
subclass records outgoing commands and incoming messages, forwarding the
original arguments to the native Worker. State/digest checks query the actual
JSBSim worker. Scenery pixels and empty cartographic tiles are explicit fixtures;
this is not source-map visual quality, network performance or terrain validation.
Initial scene/canvas/button-focus keyboard checks occur before pointer activation
of the older publication map overlay, reproducing the reported focus boundary.

## Criterion matrix

Evidence labels: **B** = the source-pinned browser run and its inspected
assertions; **U** = the seven pure router tests independently run here;
**S** = source inspection at the hashes above. A pass based partly on inspection
does not imply a separate browser run of every DOM element or browser engine.

| Criterion | Expected | Observed evidence | Result |
| --- | --- | --- | --- |
| R-SIM-9: open map, scene/canvas/button focus | `=`/`+` zoom in, `-` zoom out once; map-open state owns the keys | B records 13→14, 14→13 and 13→14 for all three focus locations and waits to detect a second MapLibre increment. No rate commands or throttle changes. U verifies capture-phase suppression of downstream listeners. | pass |
| R-SIM-9: German and numpad keys | Character `=` from Shift+Digit0 and numpad add/subtract have the same bounded action | B records German `=` 13→14, numpad add 14→15 and subtraction for all focus locations; rate/throttle/native checks hold. U includes identified and unidentified numpad characters. | pass |
| R-SIM-9: recognized repeats | Consume repeated zoom events without another zoom or throttle leakage | B sends repeated German Shift+Digit0 and a held Equal; only the first real Equal increments. U verifies consumption and no downstream callback for repeats. | pass |
| R-SIM-9: paused state | Zoom does not advance or mutate paused native state, rate or throttle | B checks worker step, digest and complete final state against the initial paused snapshot after the keyboard groups and guards, with unchanged rate command count and throttle. | pass |
| R-SIM-9: live flight | Open-map keys zoom without rate/throttle changes while live stepping continues | Final B asserts separate Equal +1, Shift+Equal +1, Minus −1 steps and net 15→16. Publication native steps continue 134→194; root 136→198. Worker rate stays 1, native throttle stays 0.737595201290068, input throttle and rate-command count stay unchanged. | pass |
| R-SIM-9: Review isolation | Zoom affects only the map, not independent replay speed or paused live worker | B presses Minus, Equal and Shift+Equal in Review, observes the net +1 map zoom, unchanged REPLAY overlay and live rate-command count; live worker step/digest/final state stay frozen. S confirms the zoom path does not call playback controls. | pass |
| R-SIM-9: loading/unavailable map | Consume eligible keys without queue, speed action or throttle leakage | B deliberately delays the actual map module and presses Minus/Equal/Shift+Equal/German keys, observing no rate/throttle/native changes; first ready zoom starts at 13. U covers unavailable callback effects; S uses optional `practiceMap?.zoom` and rejects unready/disposed state without retaining requests. | pass |
| R-SIM-9: typing/modifier/cancellation guards | Preserve editing, Ctrl/Meta/Alt and already prevented events | B tests real map search input, three modifiers and a pre-cancelled event. U checks the exact shared editable selector; S confirms textarea/select/contenteditable inclusion. Router does not act for these inputs. | pass |
| R-SIM-9: modal/menu/credit guards | Guard open dialogs/top menus/visible Cesium credit overlays | B checks actual Flight menu and Options modal; U checks dialog/menu and hidden versus visible credit predicates. S checks `checkVisibility()` and the selectors. Real browser credit-lightbox opening is not separately exercised. | pass |
| R-SIM-9: closed-map speed controls | Closing restores the old `=` cycle and `+` decrement | B closes the map, observes worker-confirmed 1→1.5→1, restores rate accessibility metadata and keeps hidden zoom unchanged. S confirms the unchanged `[1,1.5,2,5,10]` cycle and floor-at-1 decrement; no broad new full-cycle browser claim. | pass |
| R-SIM-9: explicit speed controls | Menu click/Shift-click and rate API remain available with map open | B observes worker-confirmed 1→1.5→1 via menu buttons while map stays open. S confirms map-open gating is only in keyboard handling; `cycleRate` retains its availability guards and API. | pass |
| R-SIM-9: preserve other shortcuts | Map zoom routing does not consume unrelated AP/flight keys | B toggles A on/off with map open and observes worker AP state. U lets unrelated A/0 keys and closed-map keys reach downstream handling. | pass |
| R-WORLD-6 / R-SIM-9: existing bounds | Keyboard and map buttons use the same MapLibre min/max | B saturates at configured max 17 and at the actual viewport-constrained floor, then confirms another keyboard/button step has no effect. S shows a single shared `changeZoom` clamp. The effective lower floor can exceed configured 0 to cover the viewport. | pass |
| R-SIM-9: listener lifecycle | Capture listener removed safely and disposal is idempotent | U disposes twice, observes no additional zoom and restored downstream events. S shows pagehide invokes disposal before map teardown and uses matching capture options. | pass |
| R-SIM-9: discoverability | Help describes map-open zoom ownership and retains usable explicit speed controls | B checks open-map help and removed speed `aria-keyshortcuts`, then restored closed-map metadata. S confirms zoom-button titles/shortcut attributes and context-dependent speed help. | pass |
| Integration shared CI | Required shared gate completes with honest skip reporting | Independently inspected publication `output-map-zoom-ci.log`: application, assurance (85), assessment (11) and tracked whitespace (2114 paths) pass; final result is “Foundation CI: passed with skipped checks (study studies/e1-jsbsim: 9 of 23 skipped).” Untracked files are excluded from that whitespace phase. | pass |
| Cross-provider peer | Actual eligible external-provider review | This same-provider validation is not peer coverage. No external-provider packet/result is in the assigned evidence. | not evaluated |

## Commands and result

This reviewer executed from the publication `app` directory:

```sh
node --test src/map-zoom-shortcuts.test.ts
```

Observed: seven tests passed, zero failed/cancelled/skipped. This reviewer also
read the complete harness and relevant integrated diff, recomputed the five
source pins in both checkouts using Node SHA-256, and inspected the completed
shared CI log. The author-run browser command is reproducible from `app`:

```sh
node tests/map-zoom-shortcuts.browser.mjs
```

No duplicate browser/full CI run was launched by this reviewer. Evidence
inspection and independent pure-test execution are distinguished above.

## Acceptance and remaining limits

Status: **complete** for this independent, bounded validation. Recommend accepting
the Task 2.0.176 shortcut behavior at the pinned snapshot. No observed
implementation failure in the scoped checks; external-provider peer coverage
remains not evaluated by this role.

Historical evidence gap: the initial seven-group browser run only created a
recording during its live segment, without pressing zoom while live. At 15:43
this report marked that criterion not evaluated and returned it to the
orchestrator. The author added live assertions without changing runtime source
and reran both complete browser suites. At 15:45 the reviewer inspected those
assertions, both final eight-group artifacts and every renewed source pin; the
live row above therefore supersedes that earlier pending outcome. Initial
harness SHA-256 was
`0d0fb360a6b126a6569354ddb4a10ce0c71cf19fa914630a6c30a9914fea8faa`;
initial artifact hashes were publication
`04b58a6591c1a23000b369d34133225fde28d44e91d1eb57eb98f1d92adb2cf7`
and root `579865b520fa9c6da26d8cc3f2ef0cdb361a2703ffd3670379940e94d7890401`.

This validates the bounded shortcut change only. Existing map interaction
neutralizes steering through `onInteraction`; the report does not claim that
manual control inputs or live trajectories remain byte-identical during map
interaction. Chrome evidence does not prove WebKit or other browser behavior.
The optional JSBSim study skips remain skips. Aircraft dynamics, geographic
coverage, terrain loading, educational outcomes and training approval are not
evaluated. Any implementation edit invalidates the affected evidence; publication
must also retain the final integration/assurance checks and peer-pending status.
