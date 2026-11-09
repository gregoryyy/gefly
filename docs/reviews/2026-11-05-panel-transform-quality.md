# Panel transform quality review

Reviewed 2026-11-05 08:19 Europe/Berlin. TODO 2.0.130; R-PANEL-1 and the affected R-VIEW-1 fit budget. Independent OpenAI/Codex quality reviewer, not an implementation author. Exact runtime model/CLI identity was not exposed independently; this is same-provider quality, with cross-provider peer pending.

## Scope and outcome

**Complete source/evidence review: no blocking findings in the frozen single-transform candidate.** Original VS Code integrated-browser resolution is bounded to the native observations described below; this report does not convert the earlier unreproduced standalone diagnostic into proof about that embedded engine.

Reviewed the integrated working-tree snapshot over base HEAD `700dd5386125f9864a391f85b277cb71da55290a`, specifically cockpit-layout.ts/style.css changes that remove CSS zoom, measure fractional canonical dimensions and use one translate/scale transform. Existing zoom/pan helper semantics and gesture/control guards were inspected for affected regressions. Only this assigned report was written. Production, tests, shared records and the original [diagnostic report](2026-11-05-panel-resize-diagnostic.md) were not changed by this reviewer.

The historical diagnostic pinned the previous artifact contents. Its generic resize JSON/image paths were later overwritten by candidate runs; their old hashes remain historical identities, not current candidate evidence. This review uses the distinct panel-transform-* copies below. The old live-native diagnostic JSON also predates this candidate and is not used as candidate runtime evidence.

## Correctness, lifecycle and boundaries

At app/src/cockpit-layout.ts:35–39, the rendered point is the frame origin plus the screen-CSS-pixel helper offset plus the canonical point multiplied by fitScale × panelZoom.zoom. CSS zoom no longer contributes another coordinate scale. Translation precedes scale in the CSS transform list, so its numeric offset is not multiplied by the fitted scale. Transform origin is explicitly 0 0; the absolutely positioned surface starts at frame left/top, with zero margins.

At lines 63–68, temporarily clearing the transform measures fractional canonical width/height through getBoundingClientRect. Restoring it synchronously before returning preserves an unrelated observer callback's current view. At lines 87–103, those same canonical extents determine fitScale, fitted base dimensions and deck/frame height. The fitted center is frameLeft + (frameWidth − baseWidth)/2 + baseWidth/2, equal to the frame center. Fractional automatic rows are retained instead of mixing integer offsetHeight with a separately measured scaled height.

The layout key covers container dimensions, responsive canonical dimensions, heading size, scale, width budget and Review state. A changed key resets zoom/pan and ends/releases an existing captured drag. An unchanged key preserves zoom/pan. ResizeObserver callbacks are coalesced into one RAF; transforms do not alter the observed canonical layout box. Disposal cancels pending work, disconnects both observers, removes gesture/window listeners, releases capture, unwraps the surface and removes the inline transform/origin and layout metadata. No new listener, polling loop or persistent resource was introduced.

Existing wheel/pan helpers still operate in screen CSS pixels; pointer coordinates subtract the current frame rect. The unchanged finite/delta/modifier/modal guards, native/ARIA control exclusions, NAV OBS-face exclusions, button-release/cancel/blur cleanup and drag-click suppression continue to apply. Removing CSS zoom does not add an input callback or change instrument values. The candidate imports only panel geometry helpers and writes DOM style/data state; it has no session, Worker, recording, autopilot, radio, camera or network command path. Native-state isolation is supported by this boundary inspection, not inferred from a standalone fixture's static values.

No new untrusted HTML, storage, URL, dependency, asset or telemetry boundary was added. Existing body-mounted narrow engine/radio dialogs and Review transport retain their independent layout and controls.

## Evidence independently inspected

The author-run standalone production-component fixture (Chrome 156.0.8078.80, DPR 1/2) records **208 normal-fit observations**: 192 settled resize/focus cases, eight fresh narrow-first loads/reloads, six offset-iframe states and two iframe reload states. The 53-step width sequence uses 27 distinct widths and its reverse, including 900/880/620 breakpoint neighbors, alongside short/tall/portrait and 812×823 / 1624×1646 windows. The reviewer independently recomputed maximum center error **0.000396728515625 CSS px**, maximum top error 0 and maximum bottom/frame error **0.01446533203125 CSS px** across all 208 records. All recorded ancestor scroll offsets are zero; page errors and unexpected HTTP requests are empty. Computed CSS zoom is normal/1, and matrix/rect assertions verify one actual uniform scale and screen-pixel translation.

Twenty gesture records cover actual wheel zoom, actual housing drag, resize with live pointer capture, subsequent pointer movement, clicked/typed DG BUG and native Tab into an initially clipped far-right radio field. Eight narrow-first load/reload observations and nonzero iframe offsets strengthen the previous desktop-first geometry coverage. The iframe checks exercise real pointer anchoring with clamping exceptions, not only declared transform strings. The independently viewed 812×823 DPR2 screenshot is 1624×1646 physical pixels: the primary columns are fully visible and the panel is centered; missing attitude/heading drawing and unavailable readouts belong to the explicitly static UI-only fixture.

The author's actual-app panel-layout browser run passes 13 viewport cases, actual control anchors, mixed zoom/pan steps, pointer capture cleanup, per-RAF vertical bounds, responsive portals, fresh mobile load and three Review sizes. The pointer artifact contains 642/706/710 RAF samples for its three anchor groups. These execute the app and native readiness, but do not assert a full before/after native-state digest or camera-FOV invariance; no new such runtime claim is made from this suite.

The former separate 1.65625 CSS px scene-budget deficit does not recur in the current standalone artifact: sceneBudgetObservations is empty. This is a bounded observed improvement, not an all-environment R-VIEW-1 acceptance.

The orchestrator separately reports that the actual VS Code integrated browser showed the original clipping after explicitly restoring the old source, then showed the candidate centered both wide and after opening developer tools to narrow the content. Developer tools displayed Chromium 150; this was not a parsed user-agent measurement. Those native screenshots exist in conversation tool output, without a filesystem artifact inspected here. The native candidate reload attempt timed out, so **fresh reload of the candidate in the actual VS Code engine is not evaluated by this review**. The standalone fresh-load/reload and iframe results do not substitute for that missing embedded-engine observation.

## Commands and findings

Reviewer actually ran `node --test app/src/panel-zoom.test.ts` from the repository, then recorded a clean rerun as `node --test src/panel-zoom.test.ts > /tmp/gefly-panel-transform-quality-unit.log` from app: **14 passed, zero failed/skipped**. `npm run check` from app passed TypeScript. An intermediate command used the repository-relative unit path while already in app, failed to locate the test and ran no checks; the corrected commands above passed. Browser suites and the successful build log were executed by the authors/orchestrator, and independently inspected here, not rerun by this reviewer.

**Critical/high/medium/low implementation findings: none substantiated in the bounded candidate.** No repair is requested. The underlying engine-specific CSS-zoom failure is supported by the orchestrator's actual before/after observation; the exact internal Chromium failure mechanism is not proved. Full simulated-flight/native invariance, browser page-zoom/pinch, WebKit/Firefox, candidate embedded reload and continuous transient native-window resizing are not newly established here. DPR 2 is not browser page zoom. Full CI/publication and cross-provider peer are outside this review.

## Frozen source and evidence identities

SHA-256 pins identify exactly the files inspected; changing an affected source/test invalidates this bounded review until renewed.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `app/src/main.ts` | `ff1c5c87f071628b9be73cde818fdfe0cc3cdcf29ba95b30ba4bb41a80805d4b` |
| `app/src/cockpit-layout.ts` | `d13ea8fec91b182b461cc4d744fe34fa065280fdb0e3b46e83a32b72dd9ca792` |
| `app/src/style.css` | `a89bc108d2c2bbbdda3893ed209536c705f78c549d865102f05fb376a23b195a` |
| `app/src/panel-zoom.ts` | `3acb570345a152745ec0bdb2b46551aad6f34e63d53fb91b1d000438ca49e0ce` |
| `app/src/panel-zoom.test.ts` | `e268d22e534310d8b308047e58ccc98205842d26f3cdc4b2e7cd8bdcca3d332a` |
| `app/tests/panel-resize.browser.mjs` | `04baee856020bc739467ff5c2b0193bbade90b520c8eb71834694bea6ac0accf` |
| `app/tests/panel-layout.browser.mjs` | `bbed407a76c4692685cfbb7925b2d3e84a840dcd2072b549141f88e6f85420fb` |
| `output/flight/panel-transform-resize.json` | `17af8bb430d4c2c1a0446b13d1c90d927da3c962cd461e135be49fcc455071a3` |
| `output/flight/panel-transform-layout.json` | `bcdf7152d86675818e0e313cd6cfb4cef8f0cbb7fb703e1080a87c6d2ecb24fc` |
| `output/flight/panel-transform-pointer.json` | `0239977cb799e7e47d86b9980e54ee7ad61bca4f4b83d22b5890d1f9146989c9` |
| `output/flight/panel-transform-812x823-dpr2.png` | `dfcadddf5ff202e90995f50270a91609661b00d9d24757d65877495f51f4eec6` |
| `output/flight/panel-resize-single-transform.log` | `b65a8b718d51e8934dfb2b9d0e2c5c7fc73c4fae957571555aa298e3edf95a5b` |
| `output/flight/panel-layout-single-transform.log` | `7b36f52d876c42690ead28da88478585006e18548c0729ad9e52eb8e2e5a30b7` |
| `output/flight/panel-resize-transform-build.log` | `b0b5e5ae896f1c7929abdc24ffbc579b9d1dcafa2a9cf4a7026a593a3f5781ea` |
| `/tmp/gefly-panel-transform-quality-unit.log` | `5744af29d905f03bb84209beabb4381d8a0d200fd36135588a11c59ca8634b61` |
