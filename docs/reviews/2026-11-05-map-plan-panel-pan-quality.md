# Map flight planning and panel panning quality review

Reviewer: Codex `/root/quality`, independent of the model, panel, integration and test authors. Provider: OpenAI/Codex; no independently exposed model-version identity is claimed. Scope: TODO 2.0.123 / R-NAV-5 and TODO 2.0.124 / R-PANEL-1, with the TODO 2.0.125 / R-NAV-5 affected review below; bounded working-tree changes based on `700dd5386125f9864a391f85b277cb71da55290a`, initial map/pan review 2026-11-05 00:43 Europe/Berlin; final TODO 2.0.125 affected review 2026-11-05 00:59 Europe/Berlin. Read AGENTS and applicable role, SPEC, SDLC, STYLE, SEC and architecture records. Prior five-state scenery/terrain changes are outside this new acceptance scope.

## Disposition

No unresolved blocking quality findings in the reviewed current source. The stale custom-fix popup/target defect below is repaired and the affected integrated browser case passes. This quality review does not replace specification validation or cross-provider peer review.

## Finding and affected repair

**Medium, resolved — stale deleted custom GPS fix could be reselected.** Initially, removing a custom fix removed its marker/search entry and cleared its direct-to target, but left a separately created popup and `selectedPoint` alive. Reproduction: open the custom marker popup, select GPS target, delete the fix through the library, then use the surviving popup's GPS action. Its copied custom coordinates could restore a target that had just been deleted.

The integration owner now tags matching custom points when opening popups, including points copied through plan snapshots; deleting their library record closes/clears the selected popup and target. `setDirectTo` rejects a stale custom point not present in the library. Source re-review confirms the lifecycle is consistent across marker, plan-copy and direct-to entry points. The renewed browser case opens the real marker popup, selects its GPS target, deletes the fix, and requires no popup, no target overlay and an empty GPS source. The complete expanded map case passes. The final affected run also opens a custom point through a flagless plan snapshot, clears the plan, deletes that custom library point and requires both its popup and target to disappear; this covers the copied-plan identity branch.

Earlier verification gaps for category-filter coexistence, actual running flight and tile/optional-source failures were addressed through bounded additions to that same case. Initial map-pick harness failures came from comparing projected floating coordinates with integer browser pointer coordinates. The repaired test observes the actual trusted MapLibre click, requires its pixel location within 1.5 CSS px, and requires form coordinates to match that event within 1e-10 degrees. This preserves the coordinate contract rather than weakening it to a broad geographic tolerance.

## Independent checks

Executed by this reviewer:

- `node --test app/src/map-flight-plan.test.ts`: 12 pass, zero skipped; `output/flight/map-plan-quality-unit.log`.
- `node --test app/src/panel-zoom.test.ts`: 14 pass, zero skipped; `output/flight/map-plan-quality-panel-unit.log`.
- `npm --prefix app run check`: pass against the integrated map/pan source; `output/flight/map-plan-quality-final-types.log`.
- `git diff --check`: pass at inspection.

No dependency installation or broad CI was run by this reviewer.

## Map model, UI and integration inspection

The model has bounded coordinates/names/counts, monotonic custom IDs, explicit custom provenance, immutable copied snapshots and atomic rejected edits. A plan contains at most 30 intermediate points plus start/destination; the custom library holds at most 64 points. The source identity keeps both coordinates and provenance, so repeated published identifiers at different positions are not merged. Plan references block custom-fix deletion. Incomplete/zero-length-leg plans cannot activate; accepted edits stop active plan navigation. Explicit next/stop and direct-to transitions leave the draft separate from its target.

Course/distance calculations use the existing declared mean-radius sphere, WGS84 degree/radian boundaries and nautical-mile conversion. Independent cardinal fixtures cover true bearing and signed heading difference, including wrap/sign cases; coincidence, poles, antipodes and unavailable heading do not invent direction. These are visual geometric readouts, not wind-corrected heading or an installed receiver/FMS.

The UI uses native labeled forms/buttons and inert text nodes for names, source labels, list rows, readouts and popups. There is no import, arbitrary URL, executable markup, persistence, geolocation or new provider flow. Fixed and bounded map overlays remain separate from flight state. Snapshot identity avoids replacing editable form controls during aircraft-only updates. Filter changes hide custom source markers/directory entries while leaving the separately planned route intact. Disposal removes planner elements, markers, observers and the map; close/reopen retains the same page-session model. Review explicitly labels current planning state against the recorded aircraft position.

Planning dispatch does not call radio, AP, engine, terrain or recording mutation APIs. Receiver actions remain only on their explicit existing popup buttons. The integrated test observes paused native step/digest/final-state invariance and active-channel/AP stability, and actual running flight continues while direct-to is edited. Source call-path inspection supplies the broader absence of receiver-write access in planning actions.

Inspected the final passing eight-group `output/flight/map-flight-plan-browser.json` and `.log`: input validation and inert HTML-looking labels; trusted map picking; published start/custom route ordering and explicit legs; referenced-fix/stale-popup protection; source-filter coexistence; actual live editing; 503 tile/404 optional-data fallback; Review, clear, focus and narrow layout. These browser runs were executed by the integration owner and independently inspected here. The final case additionally keeps an active custom direct-to while toggling source filters, changes to a distinct Bravo target during actual running flight, and activates a complete two-point plan with a rendered route under 503 tile/404 optional-data failures. Inspected the separate passing 12-group legacy right-map log `output/flight/map-flight-plan-legacy-map.log`, which covers the existing map/native/Review boundaries. The added ARCH paragraph correctly keeps pure planning state, editor and renderer separate from native guidance, radios and recordings. The mobile screenshot shows reachable form/list controls in the scrolling extended menu; image pixels are fixtures, not imagery-fidelity evidence.

## Panel panning inspection

`panPanel` reuses the same normalized state and content/frame limits as zoom, with screen CSS pixel deltas. It cannot pan normal 1× fit; finite extreme deltas clamp to the content edges, and invalid deltas are inert. The DOM converts translation through the existing fitted CSS scale, keeping the frame and flying height fixed. Horizontal wheel input changes only horizontal offset; background/header dragging changes both offsets after a five-pixel activation threshold.

Native controls, interactive ARIA roles, editable elements and exact NAV1/NAV2 OBS faces are excluded from background dragging/reset. The implementation owns capture only for an eligible drag. Pointer release/cancel/lost capture/blur, missing pressed buttons, wheel input and fit reset end it; disposal releases capture and removes global listeners. A pointer-specific suppression token consumes the accidental click after a drag while a new pointer-down or keyboard activation remains usable. No focus panning, camera write or simulation/control mutation was added.

Inspected the passing 13-viewport `output/flight/panel-drag-browser.log`, its frame/anchor data, and the full `panel-drag-fov-browser.log`. They retain pointer anchoring and OBS gestures, exercise actual horizontal/vertical movement and all hard edges, require every sampled animation frame to cover the vertical area, verify capture termination/click suppression, and preserve fit resets, responsive portals, map/dialog, camera, AP and native boundaries. The independent validate probe `panel-pan-review-independent.json` separately observes actual Review zoom/drag/pan, unchanged paused step 52/digest/final state, fixed dimensions and no stale drag/browser errors. This reviewer inspected those artifacts without re-executing their browser processes.

## TODO 2.0.125 affected quality review

Renewed 2026-11-05 00:59 Europe/Berlin against the frozen anonymous-fix/map-card source. Criterion source: current SPEC R-NAV-5 and `docs/input/2026-11-05-anonymous-fixes-prominent-plan.md`; SEC describes anonymous as unnamed, not a different privacy mode. No blocking quality findings. This is source/test-quality review with inspected runtime evidence, separate from the validate role's criterion acceptance.

The model accepts blank or space-only names, generates monotonic unique `USER-…` labels, and copies the optional anonymous flag through immutable library snapshots. Named points remain supported. Invalid types, control characters, oversized actual names, non-finite/out-of-region coordinates and capacity exhaustion still fail atomically without consuming identity. Adding a library entry preserves navigation; inserting it into the route remains an explicit edit that stops the active leg. Generated points retain custom provenance, exact coordinates and deletion-reference protection.

The editor's labeled native checkbox disables the optional name field and submits an empty name; removing the option restores the retained draft text. Map picking still fills coordinates without creating a point. Both blank-name and explicit-option branches have model/isolated UI cases. Inert text-node rendering continues to cover generated labels, user names and card summaries.

The persistent on-map card shows start/destination, leg count/total distance and active/ready state. Its native Edit/Fit/Navigate/Next/Stop buttons delegate to the existing action handler and model guards. It labels Review as current planning state, hides temporarily during map picking, bounds its height with local scrolling, and removes handlers/elements on disposal. Edit opens and focuses the existing editor without a menu prerequisite. The route has a dark contrasting casing, a distinct active leg and start/numbered/destination markers. Inspected actual desktop and 390×844 screenshots show the card above the route and the reachable editor below the map; the card stays within the map width. No guidance/radio/recording, storage, network or aircraft write path was added.

Independently executed `node --test app/src/map-flight-plan.test.ts`: **14 pass, zero skipped**, recorded in `/tmp/gefly-quality125-model.log`; independently executed `npm --prefix app run check`: **pass**, `/tmp/gefly-quality125-types.log`. The prior 12-test model run above is historical. `git diff --check` also passes. Panel model/runtime files retain the accepted TODO 2.0.124 hashes; that unchanged implementation was not reauthored or reaccepted through this addition.

Inspected the expanded ten-group actual map/native browser case and source: the card is visible before opening the menu, Edit opens the editor, actual card Navigate/Next drive the existing planned-leg target, and an explicit anonymous fix becomes navigable as `USER-0006`. Existing named-fix, stale-popup, filter, live, Review and failure-mode checks remain. The small shared browser-helper repair selects an actual exposed canvas point using `elementFromPoint`; the legacy pan begins on that canvas and drags inward. This avoids the new card without stubbing application input or removing the pan assertion. Inspected the final passing twelve-group legacy-map log `anonymous-plan-legacy-map.log` and full camera/panel/AP/native FOV log `anonymous-plan-fov.log` against that helper. The final ten-group map process completed with exit 0 after the helper refactor; its result JSON reports pass with no browser errors. These runtime processes were run by the integration owner, not this reviewer. The integration owner's 441 Node tests, twelve Python tests and production build logs also pass; they do not replace independent specification validation.

## Frozen source hashes

| Path | SHA-256 |
| --- | --- |
| `app/src/map-flight-plan-types.ts` | `da6fdc4608ae4c9d25b7ef2124a3c0469df3dec990b48aa1a0793a690c28e55a` |
| `app/src/map-flight-plan.ts` | `ed882292f331b9d633daf95744db2a82b7dbc11370190313f9586a10f41e2ed0` |
| `app/src/map-flight-plan.test.ts` | `544380a94ac2f7be080302e36ec69a36b18dd4335e72066c52a70f2ca2fe000a` |
| `app/src/map-flight-plan-panel.ts` | `ec52d3990b2242ab89d5cbf19cbcb380a1510665aad4991b73b204ccd0e6db03` |
| `app/src/map-flight-plan-panel.css` | `34af1d7285da34738161e921271233c19ef3db098bfb1e874fb115e47e94bd0e` |
| `app/src/practice-map.ts` | `b99cb0a7c23dc8c673b2eb38b77b8d9f66e50bae63049f42d2d683a23b5a7ee9` |
| `app/src/practice-map.css` | `83761b3ab7607491260e9d4a143b4fc30a47a73fb1d935368bbbf95cad6c4fe9` |
| `app/src/map-point-popup.ts` | `71b27b734af9f155e69db1c5a5b2553dd5983a7e9e883857c0ebcc95950958a0` |
| `app/tests/map-flight-plan.browser.mjs` | `f34a21bfcfed6f24f865fea33404667ddb012b1b0eca033bc88c80e3e17b1fe8` |
| `app/src/panel-zoom.ts` | `3acb570345a152745ec0bdb2b46551aad6f34e63d53fb91b1d000438ca49e0ce` |
| `app/src/panel-zoom.test.ts` | `e268d22e534310d8b308047e58ccc98205842d26f3cdc4b2e7cd8bdcca3d332a` |
| `app/src/cockpit-layout.ts` | `c9df3027f19a4d01d1834f7556864a2d869f205eb360d96ea8f5e6c4e455114b` |
| `app/src/style.css` | `42d274d346684ecded44e5fac0901c1b7a5add0f38b87ec8713c275783aec906` |
| `app/tests/panel-layout.browser.mjs` | `96e4555de2f0941c28e770d57e3fbbeb11bad8f00c45203edd678202c6f77933` |
| `app/tests/fov-smoke.mjs` | `e55aba7e5f3934d358db2cebe235611df42c75692f8c8e07277068ea8e532319` |
| `app/tests/flight-actions.mjs` | `588ce4ae5a929cd8aea7c64f2af64e0b28427fbf9d8a0c2e9085f7ef09b1dff8` |
| `app/tests/right-flight-map.browser.mjs` | `d42f16bc8d6b8b43e706219b9d78b23d0be850208d5210050c26c8a29841aa80` |
| `app/package.json` | `fc10422bec5fac12749b23fbf74a1bf195e52a1e24b8396f9c03b78d523c14d6` |

## Inspected evidence hashes

These disposable local outputs identify the evidence inspected; they are not versioned acceptance claims.

| Artifact | SHA-256 |
| --- | --- |
| `output/flight/map-plan-quality-unit.log` | `6020fc95cd4c78fcebe0c63cce8ccacca9900f4fbfb994d9aa3662301104af1d` |
| `output/flight/map-plan-quality-panel-unit.log` | `2d3b2ccac1a22bd03ceb3966ecf0cd9c73c76815392061ed6e5e4dcd8f2c7882` |
| `output/flight/map-plan-quality-final-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/map-flight-plan-browser.json` | `87bf99e2fa8769330074f0e9c064e3f90337b4938860f3e43e4d22badb5648fc` |
| `output/flight/map-flight-plan-browser.log` | `2d0b9331f00171bb920dccbae8379208a8c19f37c639eb152bf2f1a12050d28b` |
| `output/flight/panel-drag-browser.log` | `7b36f52d876c42690ead28da88478585006e18548c0729ad9e52eb8e2e5a30b7` |
| `output/flight/panel-drag-fov-browser.log` | `28585652556eac1889a0f51a5f2320bbc9cacf4232fb62c7539598a64bf43c76` |
| `output/flight/panel-pan-review-independent.json` | `10549e4fe64f8d06cbf5f043f685090a23df0fbc1b1090b1cf031ccb98a4b2a7` |
| `output/flight/panel-pointer-zoom.json` | `6172a637182ba5dd9888b6edb08b785a280e71b740f9e77cbeba4b1914fa123f` |
| `output/flight/map-flight-plan-legacy-map.log` | `29a6b593f8e85fb6a69fde08ebc7c441116d84ec28a3b13c801401a471119e90` |
| `/tmp/gefly-quality125-model.log` | `9381081362d86215006087c204243219e71c067caaa87af9065ca491ad37e1fe` |
| `/tmp/gefly-quality125-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/anonymous-plan-legacy-map.log` | `29a6b593f8e85fb6a69fde08ebc7c441116d84ec28a3b13c801401a471119e90` |
| `output/flight/anonymous-plan-fov.log` | `28585652556eac1889a0f51a5f2320bbc9cacf4232fb62c7539598a64bf43c76` |
| `output/flight/anonymous-plan-unit.log` | `e9af8de185bcd4576ca0523bc8d5ba06dbfbb5e20acf1d80223c01d20d9e4515` |
| `output/flight/anonymous-plan-build.log` | `b810896b86c40c3ced2059305086182c9aebe95fb70c639e0fe90cefef3cd9b1` |
| `output/flight/map-flight-plan-desktop.png` | `1bdaf4c618fa41a5a077607c146eb9ecad28a5c4ad820429838314f1a1b14c6d` |
| `output/flight/map-flight-plan-mobile.png` | `acf622b1d868621ae97a1e32171d8ba6ee97a9b66bb22aebcf450e562fbe7051` |

## Limits

Full historical browser-suite and CI results belong to the integration record. Cross-provider peer review remains pending under its existing cadence. No surveyed/navigation-data currency, operational flight-planning, aircraft, training-credit or training-fidelity acceptance follows from this report. Relevant source/test changes require renewed affected review and hashes.
