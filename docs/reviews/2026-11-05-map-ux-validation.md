# Map UX validation

Reviewed 2026-11-05 09:26 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation or fixture author. TODO
2.0.131; affected R-NAV-5, R-UX-2, R-WORLD-6 and R-WORLD-7 criteria only.
Working-tree snapshot over HEAD `700dd5386125f9864a391f85b277cb71da55290a`;
final practice-map SHA-256
`eb2515c7fedda6347a634f6d7cdaf93ba51f8a2c146948e8f4fc79289c8ecaf0`.
Author/reviewer provider: OpenAI/Codex. Exact CLI/model identity was not
independently exposed. This is same-provider validation; peer remains pending.

**Status: complete. Bounded acceptance recommendation: pass for the requested
map interaction, display preferences and independent planner increment.** No
blocking discrepancy remains in the reviewed scope. This does not accept every
criterion in the four larger requirements, aircraft fidelity or operational
planning. Only this assigned report was written.

## Evidence and method

Read AGENTS, the validate contract, SDLC/STYLE/SEC/TODO, SPEC and EVAL's E5 scope,
the immutable [user record](../input/2026-11-05-map-interaction-preferences.md)
and [GeoFS reference note](../research/2026-11-05-map-ux-reference.md). The user's
A/P clarification governs: A retains AP capture/disconnect; plain P opens the
plan. The reference note supplies an explicit-create interaction precedent,
not Gefly aircraft/navigation authority or a claim of exact GeoFS appearance.

Independently inspected controller/helper/CSS and browser assertions, verified
source/test/artifact hashes, read successful logs and recomputed recorded
observations. No browser suite was launched by this validator and no CUA/native
UI tool was used. The narrow Review PNG was independently viewed from disk.
Runtime evidence comes from the authors/orchestrator's actual Chrome
156.0.8078.80 application/MapLibre/native-worker runs with scenery fixtures;
these fixtures do not validate current external map pixels or navigation data.

Stable task131 copies record **4 preference groups, 6 overlay groups and 6
shortcut groups**. The final four serial regressions record **38 groups**:
waypoint 6, planner 11, right map 12 and GPS bearing 9. Each final serial process
has exit code 0 in the pinned result manifest; its four log hashes and all 13
source/test hashes in the freeze manifest were independently verified against
the current files. The waypoint JSON omits a result field; its completion is
supported by the matching six-group success log and exit record, not an inferred
JSON flag.

Evidence scope matters: the preference run preceded the A/P clarification, with
preference code unchanged; the shortcut run includes the repaired closed-map
Review refresh and precedes only the subsequent map-wide wheel-release change.
The final overlay and four serial map runs cover the final EB25 map source.
The earlier results apply to their unchanged display/shortcut paths, rather than
being represented as full-tree EB25 reruns.

## Criterion matrix

| Requirement / affected criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| R-UX-2: immediate visible map/plan | First click/wheel/keyboard works without dimming or activation loss. Overlay assertions cover immediate/dynamic panels and actual map controls; final artifact has three fresh single-wheel cases, each delivering exactly one event, Follow false during dispatch and actual zoom increasing. | pass |
| R-UX-2: preserve reusable activation | Other floating panels retain deliberate activation/dimming. Default and integrated flight-controls tests retain the consumed first activation and subsequent control action; source opt-out is limited to configured map/plan selectors. | pass |
| R-UX-2: release held flight input | Interaction neutralizes transient input without consuming the intended action. Independently recomputed final menu-wheel record: queued elevator 0.35→0, pilot override released, focus stays scene, one trusted unprevented wheel, selections/Follow/map zoom retained and native step/digest/full final state identical. Passive common-ancestor capture covers cards/popups by source inspection; those surfaces were not individually runtime-probed for held-input release. | pass within this tested/source-reviewed scope |
| R-WORLD-6/7: restore display choices | Terrain mode and label level restore before scene setup; fresh/invalid/denied profiles use photos/Off. Four browser groups cover actual reload, scene/menu/Options agreement, malformed/oversized/version mismatch and denied storage. Six preference unit groups and strict helper schema support the bounded two-choice record. | pass |
| R-WORLD-6 / R-UX-2: temporary Options and limited persistence | Unsaved preview/reload and Escape restore saved/opening choices; Save and direct commands persist. Browser assertions check stored schema and show unrelated gain, AP engagement and flight progress are not restored by this preference. | pass |
| R-NAV-5: independent transparent planner | Initially closed, plain P/View toggles a nonmodal editor with map closed; Close synchronizes state; narrow scrolling stays bounded. Six shortcut and eleven planner groups exercise these paths. CSS and independently viewed narrow PNG show the translucent editor, visible close control and current-plan Review label; global menu hit access is tested. | pass |
| R-NAV-5: A/P and input guards | A retains capture/disconnect; P does not issue engagement/target commands; no Shift+P AP binding. Shortcut probe checks actual native AP transitions, full paused snapshots, typing, planner-focused aircraft/rate guards, modifiers/repeat/modal and Review restrictions. Raw AP messages retain existing vertical-zero neutral-release commands; this is not a claim of zero AP messages. | pass |
| R-NAV-5: deliberate fix creation | Right/Ctrl-click opens location details only; explicit Create GPS fix/Add waypoint mutates. Final waypoint assertions compare snapshots before creation, cancel/dismiss/right-drag/control-context behavior, identity/capacity atomicity and unchanged endpoints/native/AP/radio state. | pass |
| R-NAV-5 / R-WORLD-6: marker clutter and search | Historical fix markers default off and require opt-in while search remains available. Right-map assertions verify empty default fix layer and search/selection independence; source excludes custom markers already represented by matching ID/coordinates/source plan points. | pass |
| R-NAV-5 / R-WORLD-6: existing planning and isolation | Final planner/map/waypoint/GPS suites cover route editing, explicit navigation, filters, close/reopen, optional-source failures, live flight, paused native comparisons and Review/current-plan semantics. GPS target still reaches the dial while map is closed without AP guidance/radio coupling. | pass for the exercised regression scope |
| Broader runtime/accessibility/physics | Fresh VS Code embedded-browser validation, other engines/devices, contrast/assistive-technology matrix, complete AP/audio/engine/pointer regression suites and aircraft/navigation fidelity need separate evidence. | not evaluated |
| Cross-provider and publication gates | This local same-provider review does not satisfy the separate peer, integrated CI or publication gates. | not evaluated; peer pending |

## Findings, unsuccessful observations and remaining limits

No unresolved blocking validation finding. The earlier shortcut probe exposed a
stale live/Review label with the map closed; the repaired update refresh is
covered by the six-group shortcut evidence and final planner regression. The
source-reviewed missing map-menu wheel neutralization path was repaired and
renewed in the final overlay evidence. Earlier startup/COM fixture timeouts and
partial runs listed in the final result manifest remain unsuccessful historical
observations; only completed final runs are counted here. The preserved older
overlay artifact predates the stronger single-wheel/held-input checks and is not
used for current acceptance.

Independent recomputation confirms all three final single wheels delivered once
and changed zoom; the held-input test's before/after native step, digest and
complete final state agree. Native comparisons establish the tested presentation
boundary, not broader flight dynamics, near-north AP tracking or training credit.
The separate quality review found no unresolved findings. Its 23 passing
preference/model unit tests and TypeScript result were inspected, not rerun here.
Root owns full-unit/build/CI results, shared task status and publication decisions.

## Frozen identities

SHA-256 packet identity for the ordered table below (path, NUL, hash, newline):
`23cbca54751fc10e24263023b04ece364819698f00f3e477856946a80bd6b7df`. The pinned freeze manifest additionally identifies all 13 final map
source/test inputs; the result manifest pins the four final serial logs and
records commands, exits and earlier timeouts. Changed affected inputs require
renewed validation. Ignored output artifacts are local evidence, not a published
runtime delivery.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `666196e1fba4274bd0f380f6e9eb9cabeb09dc66776f1db780ca13f97f032fe4` |
| `docs/input/2026-11-05-map-interaction-preferences.md` | `661c96b8e4bc6e27aff13264e3580e326b6e4e4aa788db4344cb374e015f859d` |
| `docs/research/2026-11-05-map-ux-reference.md` | `6efbbfb66dfed1614b236af67b79c28cd14408d61bd2bc8db09271cc6be84d1f` |
| `output/flight/task131-final-map-freeze.json` | `0df8e3549bc2c40859c5fb5e4bb3a4d25d771639e1f85ad3af8b39dfb69b3842` |
| `output/flight/task131-final-map-results.json` | `7a710008308969fdc2c794c2c96393ccabebfd1001a871b947730902884add50` |
| `app/src/flight-assists.ts` | `487c3db98a066c3a749eedc5d3e19587b08726559ea9e4d0c03971065fa7adb7` |
| `app/src/view-preferences.ts` | `58dfc6eff5f881a2e60bd2acb80bf092e92dba4c74272c30558c35e58c38e39f` |
| `app/src/view-preferences.test.ts` | `56519b68721a2b085f210b6a9bb2a736cead349eb71f37a472b5c845d863ae21` |
| `app/tests/view-preferences.browser.mjs` | `be1e8b9d5c0c3df1247abc16a134a18d4271d47cde4b3e0219724abe42dc0a45` |
| `app/tests/overlay-presentation.browser.mjs` | `b5d1d24c8c233132a87a6def89ce8c2f84ca34eb88bb6bf2f6143e457d2828a2` |
| `app/tests/map-ux-shortcuts.browser.mjs` | `f6b5cbaf05999a69380b6cecc2cbe2e13c245c9311c7bf8c0d5dbf8ceb39a803` |
| `output/flight/map-ux-task131-preferences.json` | `71b8d77553e5f9310c516c3dff46d23e3d380adc2e074505ce1281bbcb66bc6a` |
| `output/flight/map-ux-task131-overlays.json` | `2bb88f1067854e976600799da091c21cc0376c8ddb8f79219d138de5b250fe6e` |
| `output/flight/map-ux-task131-shortcuts.json` | `e4fa171b8379120c689c14c0244322e6240d1de43c97254a0d5314aaf65b5a09` |
| `output/flight/map-ux-task131-preferences.log` | `36cb22855bbf8d6ca88ab1139404f25d8de0f65f2ee2be17bc39985545359401` |
| `output/flight/map-ux-task131-overlays.log` | `99e18c7cd9590d44fccc96938b3a73f07863e9b84156f1ccb022023f2ab242a7` |
| `output/flight/map-ux-task131-shortcuts.log` | `00133d4c392b7f658bde4e68107aa94659d53e88ed14d568cc9b1d9728d85e93` |
| `output/flight/task131-final-map-waypoint.json` | `4703ffe43c5f248adc6ce9fbd58a12f23e9946f5d289d5a1aa6a77d13c95e6d9` |
| `output/flight/task131-final-map-flight-plan.json` | `b244874ba1f1e9069b70068647c53babd712c73c23197511b7c6568a5e3ea7e1` |
| `output/flight/task131-final-gps-bearing.json` | `81ad6f800e3b63df6d1dfe7fa9f87a1a1031483af42cbf366ff218f4545a10f9` |
| `output/flight/map-ux-plan-narrow.png` | `543040c5cdc80f84c3c7cc6890ec0c355a08f40c04324b33bada142b879b41a7` |
