# Map UX quality review

Reviewed 2026-11-05 09:16 Europe/Berlin. TODO 2.0.131; R-NAV-5, R-UX-2, R-WORLD-6 and R-WORLD-7. Independent OpenAI/Codex quality review, not an implementation author. This is same-provider quality; cross-provider peer remains pending. Exact runtime model/CLI metadata was not independently exposed.

## Current review outcome

**Complete bounded quality review: no unresolved blocking findings in the final frozen candidate.** This covers source correctness and the affected browser evidence below; specification validation remains a separate role. Reviewed working-tree snapshot over HEAD `700dd5386125f9864a391f85b277cb71da55290a`, with final practice-map source `eb2515c7fedda6347a634f6d7cdaf93ba51f8a2c146948e8f4fc79289c8ecaf0`. Only this assigned report is being written; source, tests, historical reviews and shared status records are untouched by the reviewer.

Scope: immediate visible-map and planner interactions; retained generic dimming/activation; bounded display preferences; independent transparent planner and P/A shortcuts; explicit location creation, historical-marker opt-in and marker deduplication; first-wheel Follow handling. The authoritative user input is [the immutable interaction-preference record](../input/2026-11-05-map-interaction-preferences.md), including the later clarification that A toggles AP and P opens the plan. Older Shift+P proposals are not current requirements.

## Findings and affected repairs

### Medium, resolved: map-menu wheel could retain held flight input

Location: app/src/practice-map.ts, map interaction listeners near line 570 and canvas wheel handling near line 965. Reproduction derived independently from event paths: hold ArrowUp with focus in the scene, move over the extended scrolling map menu without clicking/focusing it, then wheel. The previous source invoked onInteraction for map pointerdown/focusin and eligible canvas wheel only. A menu wheel has neither pointer/focus transition nor an exact canvas target, so it could keep the held input while scrolling. R-UX-2 requires releasing held flight input during immediate-panel interaction. This was a concrete missing event path; the reviewer did not execute a before-repair browser reproduction.

The coder added one passive capture listener on the visible map container that invokes onInteraction, and removes it on disposal. The canvas listener now only releases Follow, avoiding a duplicate callback. The listener does not cancel scroll or alter zoom. Source re-review confirms menu, popup, control and canvas wheels traverse the release handler even if descendants later stop propagation. The renewed actual-browser regression passes on final EB25 source, process exit 0 confirmed by the author/orchestrator. Focus remains scene while one trusted unprevented menu wheel changes queued elevator 0.35→0 and pilot_override true→false before key-up. Throttle, trim, flap, brake and mixture selections stay unchanged. Follow remains true, map zoom stays 13, and paused native step 51, digest `68e2001909182d93` and complete final_state remain identical. The test observes the real main→session queued input and genuine browser wheel; it does not claim native integration while paused.

### Medium, separately found by integration and repaired: hidden-map planner retained stale live/Review context

Location: app/src/practice-map.ts, controller.update before paint. Root's real browser probe found the independent planner stayed labeled live when the map was closed during Review. The coder now refreshes updatePlannerPanel when !visible after the frame/context update; visible-map paint retains its existing refresh. Invalid position also clears frame-dependent navigation through paintGpsTarget. This is a DOM/planner refresh, not hidden MapLibre rendering or simulation stepping. The root's six-group shortcut browser run passes the actual hidden-map narrow-Review case on the preceding candidate; the stable shortcut artifact is pinned below. The only subsequent source delta is the map-wide wheel release handler, separately covered by the final EB25 overlay run.

### Medium, separately found by implementation testing and repaired: first single wheel could be erased by Follow repaint

Location: app/src/practice-map.ts, canvasWheel. A delivered wheel alone was insufficient evidence: MapLibre may defer classification for 40 ms, while periodic Follow jumpTo can stop/reset that pending gesture. The passive canvas capture handler now releases Follow before MapLibre's delayed classifier. It retains library ownership of zoom/event cancellation and checks exact active canvas, finite nonzero vertical delta, enabled scroll zoom and cooperative/modal guards. Three fresh single-event cases previously passed with Follow false in the same dispatch and actual zoom changed. The final EB25 overlay run renews all three cases: exactly one delivered wheel each, Follow false during that dispatch and actual zoom changing 14→14.4021903306, 13→13.2852661803 and 13→13.1823033646 respectively. This removes the earlier reliability uncertainty without retrying the gesture inside a case; it is three observed fresh cases, not an all-load scheduling guarantee.

## Source quality, state and security boundaries

View preferences use one origin-local versioned key and exactly version, boolean vectorScenery and integer landmarkLevel 0–3. Reads reject more than 256 characters, malformed JSON, arrays, partial/extra fields, wrong versions and coercible values. Unavailable/throwing storage falls back to a new photos/labels-Off object. Writes snapshot only the two validated choices once, discard unrelated settings/coordinates/plan data and catch quota/denial/getter failures. No dependency, external destination, permission or telemetry path was added.

Main loads the preferences before constructing scene settings and applies both choices on scene readiness. Direct menu/shortcut changes persist; Options onChange previews do not. Existing settings-controller cancellation first restores opening settings through onChange, then invokes onClose persistence, so cancellation writes the restored choice rather than the temporary preview. Unrelated gains remain session-only. Restoring a saved label choice intentionally reuses existing bounded label-provider requests; fresh/invalid storage retains labels Off.

The reusable activation helper opts out only explicitly configured map/plan selectors, removes old dimming/activation classes, and leaves default flight-controls/data/stall behavior and dynamic-panel handling available. Immediate map/planner controls retain first click/wheel/keyboard behavior. Held-input release is supplied by the map/planner interaction handlers rather than consuming a sacrificial activation event.

The full editor is a nonmodal section outside the hidden map container, with an accessible close button, a translucent background, bounded viewport height/width and scrolling. It shares the bounded immutable plan model; no radio, autopilot or Worker guidance path was added. P is captured with editable/menu/dialog/modifier/repeat guards; the previous window P-to-AP branch is removed. A remains the separate capture/disconnect path with Review/typing/panel guards. Plan focus and empty panel surroundings stop flight-key propagation; per-command capture handlers also explicitly exclude the planner. The top menu is placed above the planner, preserving its hit access. View and Close update shared plan visibility; pending asynchronous map construction observes the latest map/plan visibility and disposes on page teardown.

Right-click/Ctrl-click opens a location popup without consuming an ID or mutating collections. Only explicit Create GPS fix or Add waypoint invokes the existing bounded model; Add waypoint retains its atomic capacity validation and no-orphan behavior. Dismissal, repeated opens, replaced-popup action guards, right-drag and native popup/control context menus remain separate. Location strings and source/names use textContent; no untrusted HTML is introduced. Historical markers default off while source fixes remain searchable; custom fixes already represented by a matching plan point are excluded from the extra custom-marker set using ID, coordinates and source identity.

## Checks and evidence status

Reviewer actually ran from app: `node --test src/view-preferences.test.ts src/map-flight-plan.test.ts > /tmp/gefly-map-ux-quality-unit.log`: **23 passed, zero failed/skipped** (six preference groups and 17 model cases). `npm run check` passed TypeScript. Source and authored browser assertions were independently inspected; the reviewer did not repeat the browser matrix or use native desktop automation.

The four-group authored preference browser run exercises actual app/native/Cesium readiness, direct/menu reload restoration, unsaved preview/reload, Escape rollback, Save, unrelated gain/AP/progress non-restoration, malformed/oversized/version mismatch and actually denied localStorage. It also compares paused native step/digest/full final_state and AP targets. This run preceded the A-label clarification; the preference display code was unchanged. The six-group root shortcut probe checks actual P/A command separation, full paused native snapshots/digest, typed and planner-focused guards, reachable top menu, and hidden-map narrow Review. Raw AP messages retain ordinary vertical-release neutralization commands; these are not mislabeled engagement/target commands. No camera FOV acceptance is inferred from that probe.

Stable source/test/artifact identities are pinned below. The final six-group overlay run covers EB25, including the independent quality finding and first-wheel repair. The six-group shortcut run covers C00, before the map-wide wheel-listener-only delta; its hidden-map Review repair and P/A implementation are unchanged in EB25. The four-group preference run predates the later P/A clarification, with preference display code unchanged. These are explicitly affected evidence scopes, not claims that all historical browsers ran the identical complete working tree. The orchestrator has separately queued four broader legacy map runs; their final outcomes are not needed to establish this bounded quality conclusion and are not reported as passes here. Earlier failed wheel deliveries, cold-start/COM fixture timeouts and partial runs are not passes. Browser rendering/provider fixtures do not validate current map data, aircraft fidelity, real avionics or operational planning. No full CI, publication or cross-provider peer acceptance is claimed.

## Frozen source and evidence identities

Packet SHA-256: `bda9359f64f15ce760fe6f6bafb37badeffc5c713f5f7195e73ec82721ae8909` (ordered path, NUL, file hash, newline for the table below). Pins identify the current bounded review inputs; affected changes require renewed review. The earlier review reports remain historical and were not rewritten.

| Path | SHA-256 |
| --- | --- |
| `docs/input/2026-11-05-map-interaction-preferences.md` | `661c96b8e4bc6e27aff13264e3580e326b6e4e4aa788db4344cb374e015f859d` |
| `docs/SPEC.md` | `666196e1fba4274bd0f380f6e9eb9cabeb09dc66776f1db780ca13f97f032fe4` |
| `docs/ARCH.md` | `cdb37ac67782dc4e7e04ac9f6e668cf1193818a2ff78a108f13c4781bd514d8a` |
| `docs/SEC.md` | `cc4de4d0c23408c2e6d86d17be5145ae676ec58390613b78e4bae2df0d885201` |
| `app/src/main.ts` | `5471d2fd1b4d16ba414209d00703a4295ba708d25e47fc890b1814ab9051cbc7` |
| `app/src/style.css` | `4baa36a8faafcfb20b00795720c061d196661197aa0fb424b29669ff6a062f81` |
| `app/src/flight-assists.ts` | `487c3db98a066c3a749eedc5d3e19587b08726559ea9e4d0c03971065fa7adb7` |
| `app/src/overlay-presentation.ts` | `fe819bc612520430001747938e18eda531f710651c58631d38734abdddb6d53c` |
| `app/src/overlay-presentation.css` | `0608b9507132abcc0c81e2232bae2d9b0d3a8a668d410e5e13cdd4f56570066d` |
| `app/src/view-preferences.ts` | `58dfc6eff5f881a2e60bd2acb80bf092e92dba4c74272c30558c35e58c38e39f` |
| `app/src/view-preferences.test.ts` | `56519b68721a2b085f210b6a9bb2a736cead349eb71f37a472b5c845d863ae21` |
| `app/src/control-settings-panel.ts` | `7654f08bac8a9c921dc0bc39683415483b6d5c9d31943c83067d95296082c6e1` |
| `app/src/practice-map.ts` | `eb2515c7fedda6347a634f6d7cdaf93ba51f8a2c146948e8f4fc79289c8ecaf0` |
| `app/src/practice-map.css` | `9b9ca06a4f71ecfbbb8b9b5bedbf02901f058cc63a71c8fabff01477cab90bf5` |
| `app/src/map-flight-plan-types.ts` | `2c3bb3e9a536fa0907e912b5e1b12624069efaf542a66e5d0148c6412afcbf5c` |
| `app/src/map-flight-plan.ts` | `20d456997d58575a7c866b218b5dc48ea8c0c9099b5a460cdf343a0eaacc2c90` |
| `app/src/map-flight-plan.test.ts` | `bde474662a63927f180470a6bd99eaf425eff4dcdf96737c78bb469ced68b150` |
| `app/src/map-flight-plan-panel.ts` | `32c722098c89a6bb7b725be790e719ae6e79ec628f7ae8661e59b579de9a4909` |
| `app/src/map-flight-plan-panel.css` | `68da90788c255b47f5bce0026192ea4dee7efc917f18745cb04d2ef959000763` |
| `app/src/map-point-popup.ts` | `1a3637d7f43fc9cd4ecace1e08406df4918434a96489f299767399aa97e5007d` |
| `app/src/map-point-popup.css` | `579a2622ecebf21af3b1b4a89217ca85930a7ac310209dbd42b8f387f2793181` |
| `app/tests/overlay-presentation.browser.mjs` | `b5d1d24c8c233132a87a6def89ce8c2f84ca34eb88bb6bf2f6143e457d2828a2` |
| `app/tests/view-preferences.browser.mjs` | `be1e8b9d5c0c3df1247abc16a134a18d4271d47cde4b3e0219724abe42dc0a45` |
| `app/tests/map-ux-shortcuts.browser.mjs` | `f6b5cbaf05999a69380b6cecc2cbe2e13c245c9311c7bf8c0d5dbf8ceb39a803` |
| `output/flight/map-ux-task131-preferences.json` | `71b8d77553e5f9310c516c3dff46d23e3d380adc2e074505ce1281bbcb66bc6a` |
| `output/flight/map-ux-task131-overlays.json` | `2bb88f1067854e976600799da091c21cc0376c8ddb8f79219d138de5b250fe6e` |
| `output/flight/map-ux-task131-shortcuts.json` | `e4fa171b8379120c689c14c0244322e6240d1de43c97254a0d5314aaf65b5a09` |
| `output/flight/map-ux-task131-preferences.log` | `36cb22855bbf8d6ca88ab1139404f25d8de0f65f2ee2be17bc39985545359401` |
| `output/flight/map-ux-task131-overlays.log` | `99e18c7cd9590d44fccc96938b3a73f07863e9b84156f1ccb022023f2ab242a7` |
| `output/flight/map-ux-task131-shortcuts.log` | `00133d4c392b7f658bde4e68107aa94659d53e88ed14d568cc9b1d9728d85e93` |
| `output/flight/map-ux-plan-narrow.png` | `543040c5cdc80f84c3c7cc6890ec0c355a08f40c04324b33bada142b879b41a7` |
| `/tmp/gefly-map-ux-quality-unit.log` | `ca489bd1b31271724f1ea88dc2f4fc6aa15b70e3d32c5dea913eb91d62f4a501` |

## Affected legacy AP test follow-up — 2026-11-05 09:19 Europe/Berlin

Reviewed only the four test adaptations below, with no production-source changes. The positive ordinary-AP/disconnect cases now click the physical AP button; using A for ordinary engagement would instead capture HDG/ALT, so preserving that distinction is correct. The Review case focuses the scene and presses A rather than attempting a disabled AP-button click. Editable/modal P inputs remain literal guard cases. The independent quality reviewer found two low-severity stale evidence descriptions (flight-warnings-audio.browser.mjs:118 and engine-smoke.mjs:244 still called the button action P); root corrected them to AP-button wording and the final lines were re-reviewed. No unresolved finding remains in these bounded edits.

Reviewer ran `node --check` on all four scripts successfully, then renewed the two label-edited script syntax checks. No full AP/audio/engine/pointer browser rerun is claimed. The existing Review comparison of step/digest/final_state checks native dynamics; by itself it does not establish that no AP command was sent. The separate six-group P/A probe, with raw command logging, supplies that boundary evidence. These four new pins supplement the original 32-path packet; they do not change its recorded identity.

| Path | SHA-256 |
| --- | --- |
| `app/tests/pointer-yoke.browser.mjs` | `9d5a435191b59d8435ec36ecd0d778417f614662fe697e4d8ae25d8fb6c00890` |
| `app/tests/flight-warnings-audio.browser.mjs` | `d806ab4fe7af7fcfdad10c9f537c8c5a865d1ea374c20f40aa52c73ca78cd172` |
| `app/tests/engine-smoke.mjs` | `46b27f2ee4784629e7e6eb6b6332ddc4e10c11b6568aec5bb3071ac06f32b257` |
| `app/tests/kap140-flight.browser.mjs` | `586cac8327843b30d18ccd25f1c0083ad85e2cf81b2a2e11e8287727fae2345b` |
