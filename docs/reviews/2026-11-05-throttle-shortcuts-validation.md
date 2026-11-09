# Throttle shortcut validation

Reviewed 2026-11-05 11:43 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation author. TODO 2.0.134;
bounded R-INPUT-1 acceptance. OpenAI/Codex review; cross-provider peer pending.

**Outcome: pass for the requested shortcut increment.** No unresolved blocking
finding. This accepts throttle-command selection and its scoped guards, not
engine power calibration, ignition behavior or the complete R-INPUT-1 hardware
and exercise requirement.

## Snapshot and method

Read AGENTS, validate/SDLC/STYLE/SEC/TODO/EVAL, frozen SPEC R-INPUT-1 and the
[raw request](../input/2026-11-05-throttle-shortcuts.md). Independently inspected
the helper, main event routing, existing pacing capture, visible help, focused
browser fixture and actual output. No browser or runtime suite was launched by
this reviewer; only this report was written.

The working-tree snapshot is over base
`700dd5386125f9864a391f85b277cb71da55290a`. The frozen
packet (`output/flight/throttle-task134-packet.json`, ignored local evidence) SHA256 is
`2f79f3e4dd19f4f3532862fbf8460b78f18686b7a727c5ef2b540504ce6a478f`.
All **18** source, input, specification, test and evidence pins independently
rehash correctly. The packet supplies exact per-file hashes, including main
`f624f7c8…` and helper `b74b7cff…`.

## Acceptance matrix

| Criterion | Expected versus observed evidence | Result |
| --- | --- | --- |
| R-INPUT-1: presets | Number-row/numpad 0 selects 1.0; 1–9 retain 0.1–0.9. Helper units cover both digit families. Focused actual-app/native output has all 13 resumed mappings exactly matching their requested throttle values, including number-row 1–9 and both zeros. | pass |
| R-INPUT-1: idle mapping | § is recognized independently of code; physical Backquote selects idle only unshifted. Source and unit cases cover § with Backquote/IntlBackslash/Unidentified and either Shift state; unrelated characters/codes and shifted Backquote are ignored. Browser applies native zero using trusted §/IntlBackslash and physical Backquote events. | pass |
| R-INPUT-1: guards | Typing, open menu/dialog, Ctrl/Meta/Alt, repeats, map/plan focus and Review preserve throttle. Final browser assertions exercise these contexts, including verified map/plan focus and trusted Digit0/Backquote repeats. Review exit restores staged 70%. Source places guards before helper selection. | pass |
| R-INPUT-1: shifted keys/pacing | Shifted digits cannot select throttle; Shift+Digit0 producing = retains pacing. Unit rejection cases and the existing capture listener agree. Trusted browser = changes acknowledged simulation rate while throttle remains 70% and paused physics remains frozen. | pass |
| R-INPUT-1: paused staging/native application | Selection while paused changes pending/UI command without advancing physics. Each of 13 cases checks unchanged native step, digest and final state, then Resume produces the selected native `throttle_norm`. | pass |
| R-INPUT-1: unavailable controls | Loading/failure/scene failure/collision remain blocked through unchanged `controlsAvailable()` and publish guards. These source paths were inspected; their native failure/collision scenarios were not rerun in the focused fixture. | pass for source guard preservation; runtime not evaluated |
| Discoverable current help | Main panel, runway gate/airport controls, app README and root README describe 0 full, § idle and 1–9 presets. Two stale root README idle statements found during review were corrected and reread. A/P help corrections describe existing behavior. | pass |
| Wider acceptance | Physical Swiss keyboard mapping, other browser/device targets, full legacy browser matrices, aircraft response/fidelity and publication require separate evidence. | not evaluated; peer pending |

## Evidence and limits

Final browser run **62245 exited 0**, with four groups on Chrome
**156.0.8078.80**. Independently inspected output contains 13 correct native
mapping observations and 47 trusted key events. Browser trust here comes from
Chrome Input fixtures; it does not establish physical Swiss hardware behavior.
Full unit log records **486 Node + 12 Python tests**, zero failures/skips; the
production build passes. Legacy pitch-trim, warning and assists fixture updates
were source/syntax checked; their complete browser matrices were not run.

The first focused fixture failed its plan-context assertion because its keys
still targeted the scene. The corrected fixture focuses a visible plan control
and asserts context before sending keys; the final four-group run passes. The
unsuccessful evidence remains preserved separately:

- `throttle-task134-hidden-plan-control-fixture-failure.json` SHA256
  `801e97f4c5700b7329542bc6e1f92d7f09e86b56e27e6107087f7a03f7549cde`.
- Matching `.log` SHA256
  `ec14c481332affba37df290b8b25ac525ed92e0d9f31001c47e2764db6a8c6b1`.

No physics or ignition change is accepted by this review. “100%” denotes the
normalized throttle command, not guaranteed shaft power. Shared status and final
integration gates remain the orchestrator's responsibility.
