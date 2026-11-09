# Panel resize diagnostic

Historical diagnostic, superseded for current implementation status by the
[embedded-browser follow-up](../input/2026-11-05-panel-embedded-browser.md) and
the single-transform quality/validation reports. Source and evidence hashes
below identify the pre-repair run. Later test execution replaced disposable
`panel-resize-browser.json` and same-name screenshots; those current files must
not be used as the old run's evidence. The candidate has distinct
`output/flight/panel-transform-*` evidence copies. This note preserves the
original findings rather than treating their former unresolved status as current.

Reviewer: Codex `/root/quality`, independent of the diagnostic-test author and live-app probe runner. Finalized 2026-11-05 08:01 Europe/Berlin. Scope: TODO 2.0.130, current R-PANEL-1 horizontal fit and its R-VIEW-1 boundary. Diagnostic only: no production repair or resolution is claimed. Read AGENTS, quality-role instructions and applicable source/specification. Only this assigned report was written for this task; the reviewer ran the existing pure-helper tests and read source/evidence. No browser matrix, dependency installation or user-desktop interaction was performed by this reviewer.

## Disposition

**Reported large leftward drift: NOT REPRODUCED; cause unresolved.** Current source has no identified horizontal-origin/math defect, and inspected fresh Chrome evidence remains centered after narrowing, zoom/pan reset and native input focus. This does not establish the state shown in the user's screenshot or justify marking TODO 2.0.130 fixed. Keep it open pending the browser/page-zoom/reload reproduction details already requested by the orchestrator.

The original screenshot has no local path and is retained in the parent conversation. The orchestrator describes a 1624×1646 image with the first two primary columns clipped left and substantial empty space at right. This reviewer independently inspected the diagnostic screenshots, not the original attachment; no unsupported pixel comparison is claimed.

## Horizontal source inspection

The inspected layout/controller, CSS and helper hashes match the existing baseline; no production centering patch was made during this diagnostic. Current CSS positions the instrument surface at `left:0`, sets zero margins and origin `0 0`, and clips it inside a centered, full-content-width viewport. The previous generic auto-margin rule is overridden. At normal fit, with frame width F and measured fitted surface width B, the helper sets x=(F−B)/2. CSS zoom s multiplies the transform's translation x/s, giving screen-CSS translation x. Thus the surface center is viewport-left+(F−B)/2+B/2, exactly the frame center. There is one origin/centering adjustment, not two.

A changed width/height, canonical layout size or fit scale changes the layout key, remeasures the untransformed surface and resets zoom/pan to fit. Resizing also ends drag capture. Normal 1× helper state cannot retain a pan. While enlarged, horizontal clamps require x between F−S and 0 when surface S exceeds F, keeping the right edge at or beyond the frame; when S is smaller, x lies between 0 and F−S, preventing left clipping. Simultaneous large left clipping and a right gap is outside these helper invariants, but a different browser/runtime origin or scroll state remains unmeasured for the user's session.

Current responsive canonical widths are 1544 px on desktop, 974 px at 621–900 CSS px, and 454 px at mobile width. Independent inspected examples, identical at DPR 1/2:

| CSS viewport | Frame x / width | Fitted surface x / width | Center error |
| --- | --- | --- | --- |
| 812×823 | 12 / 788 px | 84.4921875 / 643.015625 px | 0 px |
| 1624×1646 | 12 / 1600 px | 40 / 1544 px | 0 px |

Both possible CSS/physical-pixel interpretations of a 1624×1646 Retina image therefore have fresh diagnostic coverage. This does not equate DPR emulation with browser page zoom.

## Inspected evidence and test quality

The standalone `panel-resize.browser.mjs` builds the actual current cockpit markup, components, CSS and controller into a local file. It uses explicitly static UI-only telemetry to make native inputs focusable; it does not validate aircraft state or input authority. It requests no network and reports no browser errors. Its source hashes match the inspected main/layout/CSS/helper.

Its 192 settled normal-fit DOM observations cover DPR 1/2, a 53-step narrowing/widening sequence around responsive breakpoints, short/tall/portrait sizes, and actual zoom/pan/captured-drag/focus sequences. It waits three rendering frames before measurements and tests rendered rectangles, full horizontal fit and actual control-center hit reachability. Twenty recorded gesture cases include genuine wheel/drag movement, capture release on resize, clicking/typing DG BUG 66, and native Tab navigation to an initially clipped far-right NAV2 input. These are meaningful geometry/gesture checks, not just helper-state assertions. The 53-step sequence revisits widths; it is not 53 distinct widths.

Recomputed from its JSON: maximum normal-fit center error is **0.00000762939453125 CSS px**, all recorded ancestor scroll offsets are zero, and captured-resize follow-up horizontal drift is zero. The diagnostic 812×823/DPR2 image shows the full panel with symmetric gutters; unavailable instrument content is expected in this no-worker fixture.

The orchestrator's separate probe loads the running application at local port 5173 in private headless Chrome, with actual native state and current served main source. Its 26 observations comprise **22 normal-fit states with exactly zero center error** plus four intentionally enlarged states. Those enlarged states are not supposed to be centered; subsequent resize returns all normal-fit states to center. It includes DPR 1/2, DG BUG 66 focus after zoom, breakpoint crossings and the two image-related sizes, with no JS errors. The inspected live-app screenshot shows the primary columns and remaining cockpit controls fully visible. This reviewer inspected its script/JSON/log/images rather than executing that browser process.

Independently executed `node --test app/src/panel-zoom.test.ts`: **14 pass, zero skipped**, `/tmp/gefly-panel-resize-quality-unit.log`. No repeated full browser matrix was needed for this bounded review.

## Separate low finding

**Low — measured scene reserve is slightly below R-VIEW-1's 60% desktop requirement in 15 component observations.** Location: `app/src/cockpit-layout.ts:81` fit-scale calculation and `:97` measured deck-height assignment; evidence: `sceneBudgetObservations` in the standalone JSON. Reproduction example: 899×900 CSS px, DPR1, after the gradual narrowing sequence. Expected scene height is at least 540 px; observed deck top/scene height is 538.34375 px, a **1.65625 px deficit**. Similar entries occur at both DPRs. Horizontal centering remains correct and all panel edges stay inside the frame in these observations.

The test records this separately and does not assert the scene-reserve criterion. Its `result:pass` is therefore scoped to the horizontal/fit checks, not full R-VIEW-1 acceptance. This small existing vertical-budget discrepancy does not explain the screenshot's large horizontal shift. No exact cause or production repair is established here; retain it separately rather than hiding it in the horizontal pass.

## Unresolved reproduction limits

All browser evidence inspected here uses fresh Chrome 156.0.8078.80. Browser page zoom/pinch, the user's active session/version and full-reload behavior, WebKit/Firefox, browser extensions/custom styles, and continuous transient frames during native window resizing are not established by these settled Chrome results. Recorded visual-viewport scale is 1; DPR2 does not test non-100% browser zoom. The local-file fixture also omits main-session/overlay behavior, while the live-app probe covers a smaller actual-app sequence. Neither test supplies a native/recording-invariance assertion for resizing; no new simulation change is accepted through them.

The pending browser/version, page-zoom value and full-reload-before-zoom reproduction details are material because the tested current origins, offsets and scroll state do not match the described failing geometry. Await those existing questions rather than asking for duplicate metadata or changing correct-looking centering math speculatively. The user screenshot remains an unresolved report, not a passed or dismissed case. No production fix, complete specification validation, cross-browser guarantee or cross-provider approval follows from this diagnostic.

## Evidence identities

These hashes identify the inspected bounded source and disposable local evidence; they are not a claim that the user's session uses the same bundle.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `docs/input/2026-11-05-panel-resize-drift.md` | `89a457f7306fab70a602b381ade2ce098d730abaca606ca8bb29fd824604e668` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/cockpit-layout.ts` | `c9df3027f19a4d01d1834f7556864a2d869f205eb360d96ea8f5e6c4e455114b` |
| `app/src/style.css` | `42d274d346684ecded44e5fac0901c1b7a5add0f38b87ec8713c275783aec906` |
| `app/src/panel-zoom.ts` | `3acb570345a152745ec0bdb2b46551aad6f34e63d53fb91b1d000438ca49e0ce` |
| `app/src/panel-zoom.test.ts` | `e268d22e534310d8b308047e58ccc98205842d26f3cdc4b2e7cd8bdcca3d332a` |
| `app/tests/panel-resize.browser.mjs` | `3ca25cfd6776fa16b6fe29dcd78b2db375cdf9549ae9697557d003244f51f6ca` |
| `output/flight/panel-resize-browser.json` | `ba14b70d17789b4e7b3760865f1686acc7eb44df56d85828aa8ecd954b76b8f1` |
| `output/flight/panel-resize-browser.log` | `bdb3742fa72ec236c72055ae7e580406a22900f7f01887cbc0789e7cff3e10db` |
| `output/flight/panel-resize-native-diagnostic.mjs` | `ef21a8567657543b16f32f5490a7f41e429ce255737c6dacfe9afcc5159d1cec` |
| `output/flight/panel-resize-native-diagnostic.json` | `4bf6d4f20d4b94c3da3d3b9f9d8df5eced8961ff762937a8ae6fc3b12adad6fe` |
| `output/flight/panel-resize-native-diagnostic.log` | `d5d4e4a26b8a90cf8b6536eb2e2fce337a128e384f1c6ffc78e6ac96b92c7f91` |
| `output/flight/panel-resize-812x823-dpr2.png` | `bfa7cd74a0aa89c0057534ce56a293af9e9c0ea7cb1326ac4e3bbafa5a23e962` |
| `output/flight/panel-resize-native-dpr1.png` | `bbb59960012bb118e09ecda6ea3b92aa0ad27a6f8c955e402f3ff60a368125b2` |
| `/tmp/gefly-panel-resize-quality-unit.log` | `d8a3e4e0bf161b6447ba3697c428f7be75b8a3088c3ae2f10342aec333bff3d1` |
