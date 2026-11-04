# View direction markers and panel focus: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 08:05 Europe/Berlin**.
Scope: the double-click/body-direction slice of R-INPUT-1/R-VIEW-1 and fixed-area
instrument focus in R-PANEL-1. Implementation authors are the Codex orchestrator,
`glide_cases` and `glide_model`; this reviewer authored neither implementation nor
tests. Shared status, catalog and observation records are outside this review.

## Quality outcome

**Pass for the frozen bounded implementation; no outstanding findings.**

The pointer controller saves yoke mode/reference before the first click and uses
actual click-count events to restore them after the native double-click pair.
Resetting look leaves controls neutral until actual motion/re-entry; cancellation
clears saved click state. Relative, centered and Review cases are covered, with
all new event listeners removed on disposal.

Body forward/right/up axes are transformed from ENU to the same world frame as
the actual camera, then projected against its right/up/forward axes and vertical
FOV. Left/down/back negate the corresponding body axes. A small numerical
near-zero dot-product guard stabilizes perpendicular directions; genuinely behind
directions hide. Cues are bounded, pointer-transparent and removed on disposal.
They show body orientation, not velocity, flight path or control commands.

Panel magnification uses one uniformly scaled surface inside a clipped viewport.
Physical-pixel X/Y focus is converted through the fitted CSS zoom, with bounded
pan and no positive blank top. Zoom does not grow the deck or reduce the scene.
Native buttons/ranges and OBS drag surfaces retain their interactions; keyboard
focus pans clipped controls into view. Reset/disposal restores fit and the
original DOM structure. A repaired fit-key guard preserves zoom when observed
control text changes without changing fit geometry; actual layout changes reset
it. Renewed browser checks cover this repair.

## Specification validation

**Pass for the following criteria, not full requirement acceptance.**

| Criterion | Observed evidence | Outcome |
| --- | --- | --- |
| Double-click restores forward look and pre-pair yoke mode/anchor | Independent pointer tests and trusted real-browser pairs in relative/centered/Review modes | Pass |
| L/R/U/D at 90° and B at 180° follow actual body/camera orientation | Independent known-axis/rolled-chase projection cases; actual Cesium right/back/up/down, recorded attitude, seek, FOV and resize checks | Pass |
| Fixed panel/view split, pointer X/Y focus and 1–3× clamped crop | Final 13-viewport layout run plus focus loops at 1440×800, 1440×480 and 390×844; actual enlarged AP/VSI assertions | Pass |
| Reset, control use and focus remain available | Housing/noninteractive-face double-click reset; native AP double-click retains zoom; lower trim focus, horizontal clamps, responsive dialogs and Review checks | Pass |
| Zoom/look changes preserve paused native state and read-only Review | Real worker step/digest/final-state comparisons; Review pointer-input count unchanged; FOV/control isolation checks | Pass |

Independent execution: `node --test app/src/pointer-yoke.test.ts app/src/forward-marker-projection.test.ts`
— **25/25 pass**. Implementation-agent browser results inspected:
`output/flight/pointer-directions-doubleclick-browser.log` (five groups),
`output/flight/view-directions-browser.log` (seven groups),
`output/ci/panel-focus-layout-browser.log` (13 viewport cases plus focused loops)
and `output/ci/panel-focus-fov-browser.log` (six groups). These browser commands
were not independently rerun by this reviewer. Chrome 156.0.8078.80 is recorded
where supplied; fixtures provide scenery pixels while the worker, camera handoff
and trusted browser gestures are real.

Fresh front/right/back direction and AP/lower-VSI focus screenshots were visually
inspected. The renewed VSI loop explicitly restores fit and proves enlargement
before checking its pointer anchor, avoiding a no-op focus assertion. Current
SPEC/README reconcile the user's fixed-area crop instruction with fitted-row
visibility; historical growing-panel reviews remain historical. Complete physical
touchpad/browser coverage, aircraft fidelity and training credit are not accepted.
Cross-provider peer review remains pending.

## Frozen source packet

Base `c7d6a1baa085ef0074bca3333dc9c6aa8d5252b0` plus reviewed working-tree
changes. `output/flight/view-markers-panel-focus-review-packet.json` lists 19
source/specification/package/test files. SHA-256 of sorted
`path + NUL + file SHA-256 + newline`:
`e2cb8490bec449064e5e613ccd87baa1442c39309df8ce342dbc5eae91a98066`.
This report and the reviewer's own notes are excluded from independent acceptance.

## Affected shortcut renewal — 2026-11-04 08:14 Europe/Berlin

**Quality: pass. Scoped validation: pass.** Reviewed the two shortcut handlers,
main hint, current README/SPEC and mechanical bar-key updates in the shared
browser helper and affected tests. Plain **I** toggles the title/menu bar; plain
**O** invokes the existing Options button even when the bar is hidden. Options
keeps its visible/ARIA primary shortcut label. Existing Alt+Shift+O and
Alt+Shift+I routes remain Options and ILS practice respectively; modifier guards
prevent either from becoming a plain title-bar toggle. Routing still honors
editable targets, open dialogs, repeats and disabled buttons. No new flight-state
or input implementation is introduced.

The final implementation-agent execution of the existing
`node app/tests/overlay-presentation.browser.mjs` passed, recorded in
`output/flight/options-menu-keys-browser.log`. Reviewed actual fixture alias
checks and integrated-app checks: O opens Options with a hidden or shown bar
without toggling it; I toggles/closes bar menus; typing, modal, modifier/repeat
and disabled-Review Options guards hold, while I remains available in Review.
The reviewer inspected source and that execution evidence without rerunning the
suite. Other mechanically updated browser scripts were inspected, not claimed
as newly executed checks. Prior view/zoom implementation and its accepted tests
remain unchanged; this renewal is confined to key routing and updated call sites.

Current combined 26-file packet:
`output/flight/view-markers-panel-focus-shortcuts-review-packet.json`, using the
same sorted-path hash algorithm:
`92d16e024d9f352c0d901dea7a2dd1f055e409d0aecd02331cffa1eb84d5972b`.
It supersedes the earlier packet for current integration; the earlier packet
remains historical. Base for this follow-up is
`4ad8c313ba400f057672a7c32105b0411e867679` plus reviewed working-tree changes.
Shared status/catalog records remain outside independent acceptance. Peer and
full hardware/fidelity coverage remain pending as stated above.
