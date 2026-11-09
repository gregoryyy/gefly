# Pointer-centered panel zoom quality review

Reviewer: Codex quality subagent `/root/quality`, independent of code1's pure helper, code2's DOM implementation and the integration owner's browser fixtures. Provider: OpenAI/Codex; no independently exposed model-version identity is claimed. Cross-provider peer review remains separate.

Scope: TODO 2.0.122 / R-PANEL-1, bounded working-tree changes based on `700dd5386125f9864a391f85b277cb71da55290a`. Initial review 2026-11-05 00:09 Europe/Berlin. Earlier five-state terrain work is outside this new change's acceptance. The current SPEC supersedes only the zoom-disabled portion of TODO 2.0.121; manual drag and horizontal panning remain disabled.

## Disposition

No unresolved blocking quality findings after the OBS-face guard repair and its affected browser rerun. The final current-source panel and FOV browser cases pass. This is quality review, not full specification validation or a training claim.

## Finding

**Medium, resolved:** the initial `doubleClick` guard in `app/src/cockpit-layout.ts` protected generic controls but omitted the two interactive NAV gauge faces. `navigation-gauges.ts` makes `.navigation-gauge-face` an OBS drag target for NAV1/NAV2, although its SVG role is `img`. A double-click while zoomed would therefore call `reset()` and reposition the panel during a control interaction. This contradicted R-PANEL-1 and regressed the earlier control guard.

The implementation owner added exact exclusions for `#nav1-gauge .navigation-gauge-face` and `#nav2-gauge .navigation-gauge-face`, preserving noninteractive faces as reset targets. Source re-review confirms both OBS faces are guarded. The browser case now zooms around each visible inline NAV face, double-clicks it, and requires unchanged surface geometry and course text. These checks run on desktop/short-desktop views; the existing mobile layout deliberately hides inline NAV faces, so mobile retains its three actual visible targets. An initial harness run that tried hidden mobile NAV faces failed and was corrected; it is not counted as a product pass. The final renewed run passes all 13 material-point targets, including both actual NAV-face double-click/course-preservation checks at desktop and short-desktop sizes.

## Independent checks and source inspection

Executed by this reviewer:

- `node --test app/src/panel-zoom.test.ts`: ten pass, zero skipped; `output/flight/pointer-panel-zoom-quality-unit.log`.
- `npm --prefix app run check`: pass; `output/flight/pointer-panel-zoom-quality-types.log`.
- `git diff --check`: pass at inspection.

Reviewed the pure helper, DOM integration, CSS, browser assertions and updated SPEC/README/SEC text. The helper uses screen CSS pixels for pointer positions, fitted dimensions and offsets. Its anchor calculation preserves the same material point before clamping; bounds apply on every step, with finite inputs, bounded deltas and a 1–3 zoom range. Reaching 1 restores a centered/top-aligned fit. The DOM supplies equal base/frame heights, so vertical offsets remain between `frame.height - baseHeight * zoom` and zero. The independent cases exercise interior anchors, both edge limits, repeated reversals, saturation, invalid input and smaller-width surfaces.

The DOM integration has one explicit origin: an absolutely positioned surface inside the measured frame. CSS normal-fit zoom and additional transform zoom remain separate; dividing translation by the fit scale converts screen-pixel offsets back to CSS coordinates. Fractional rendered dimensions are measured after fitting. Deck/flying heights do not depend on magnification; actual resize/layout changes reset fit. Listener and observer cleanup remain present.

Vertical wheel handling is non-passive capture on the deck, including controls and housing padding. It prevents native numeric-input wheel edits, rejects invalid/modifier/modal gestures and ignores horizontal input. There is no focus panning or background drag implementation. The view transform adds no network, persistence, permission, HTML injection or simulation/control-write path. Camera/map gestures remain in separate event domains; modal controls are not intercepted by the deck handler.

Observed the complete updated FOV browser log `output/flight/pointer-panel-fov-browser.log`: explicit pass, actual zoomed AP clicks, panel bounds, camera FOV, paused native state, map/dialog boundaries, active yoke inputs, Review and reload checks. This was run by the integration owner, not rerun independently here. Final affected re-review, 2026-11-05 00:10 Europe/Berlin: inspected `output/flight/pointer-panel-browser.log`, the 13 responsive viewport records, and the refreshed `output/flight/panel-pointer-zoom.json`. The latter records 13 control/face targets: five at 1440×800, five at 1440×480, and three actual visible targets at 390×844. Both inline NAV faces execute their double-click guard regression on the two desktop sizes. All three frame samples keep the surface top at or above the frame and bottom at or below it: maximum observed bottom shortfall is 0.0000611 CSS px; maximum actual vertical material-point error is 0.242340 CSS px. The 363/351/294 observed animation frames pass the 1 CSS px bounds. The recorded horizontal clamp exception remains explicit. Normal fit, resizing, Review, fresh-mobile portals and zero browser errors pass. This browser execution was performed by the integration owner and its artifacts were independently inspected here.

Inspected the mobile top-bound screenshot `output/flight/panel-pointer-top-390x844.png` and the short-desktop bottom-bound screenshot `output/flight/panel-pointer-bottom-1440x480.png`: the enlarged surface reaches the frame bottom without an empty strip; normal cropping is expected while focused. Mobile/short-window fit does not establish a new physical text-readability or touch-target budget.

## Reviewed source hashes

| Path | SHA-256 |
| --- | --- |
| `app/src/panel-zoom.ts` | `598c7e3c5a37e85ce955f439afcbd92d56d1049ed1e146b3aba5df15b5a622cc` |
| `app/src/panel-zoom.test.ts` | `5448f2b3bfd6b01d6682707a3e357162799d1c42d76646c12ed0b1aa876803a4` |
| `app/src/cockpit-layout.ts` | `fddde689d8f1712692e0bb8c6b3087a8b04e74717bf8baa229aeeecdd99d2bae` |
| `app/src/style.css` | `7715cbd1eb6eb11570821ec8eacaadd1f69b4aed3e205dfef79d650aa5d71a87` |
| `app/tests/panel-layout.browser.mjs` | `a3b0a7936c1521e50068ef009b7b990a99e705f22a373c4fb139bc3074f02436` |
| `app/tests/fov-smoke.mjs` | `b4eb1efeff2f4bbda3d77016628e91412435b458fcae01070b17de8dc860b32a` |
| `app/package.json` | `94b3e5ebfe77d9f2186e764f442b05648327c436b8c4c9ba94f08b6d2e472afe` |

## Inspected evidence hashes

These ignored artifacts identify the local evidence inspected at this review; they are not versioned acceptance claims.

| Artifact | SHA-256 |
| --- | --- |
| `output/flight/pointer-panel-zoom-quality-unit.log` | `03ed9db8cf7cdf7c3d20024be075c191d037e91aa8303b5a0cd86a4d659af52f` |
| `output/flight/pointer-panel-zoom-quality-types.log` | `3f8215397173a82281ad4ff167d4d03a752c47a79c1c8d5058c01aa6e6c8edd3` |
| `output/flight/pointer-panel-browser.log` | `cc8b3f2826de2d57ce5b7867a1197616f733348288abeebe6a1b0d7c31547ee2` |
| `output/flight/pointer-panel-fov-browser.log` | `ab71a99d6b1c75f91555dc876fbf1099c3917bf03832b5becc384edb9c63d522` |
| `output/flight/panel-pointer-zoom.json` | `49cfc595f7d27c51aeca1ebf1dc2a1fa55ba5116852c2c28b984f60e0d4d3f41` |
| `output/flight/panel-layout.json` | `6e51a26d27a48217edfc7137e4e1c7c75ef1e61664a1def2bd40b67709c17192` |

## Limits

This is bounded code/security/numerical/test-quality review. Specification validation, final integrated gates and cross-provider peer disposition remain separate. It does not accept aircraft physics, terrain or training fidelity. Any affected source or fixture change requires a renewed review/hash before relying on this report.
