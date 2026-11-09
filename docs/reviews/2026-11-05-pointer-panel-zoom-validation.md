# Pointer-centered cockpit zoom validation

Reviewed 2026-11-05 00:10 Europe/Berlin by the independent Codex `validate`
subagent. The validator authored neither the implementation nor its acceptance
tests. Scope: TODO 2.0.122 and the current pointer-zoom slice of R-PANEL-1,
following the [user instruction](../input/2026-11-05-pointer-panel-zoom.md).
The [earlier fixed-panel report](2026-11-04-five-state-panel-validation.md) remains
historical; its zoom-disabled criterion is superseded by this request.

Recommendation: **pass for the bounded local increment**. No unresolved in-scope
specification failure remains. Quality, cross-provider peer, publication and
milestone/aircraft-fidelity acceptance remain separate; peer is pending.

## Artifact identity and execution evidence

Reviewed working tree based on HEAD
`700dd5386125f9864a391f85b277cb71da55290a`; this is not a committed revision.
The final implementation/test hashes are:

| Input | SHA-256 |
| --- | --- |
| `app/src/panel-zoom.ts` | `598c7e3c5a37e85ce955f439afcbd92d56d1049ed1e146b3aba5df15b5a622cc` |
| `app/src/panel-zoom.test.ts` | `5448f2b3bfd6b01d6682707a3e357162799d1c42d76646c12ed0b1aa876803a4` |
| `app/src/cockpit-layout.ts` | `fddde689d8f1712692e0bb8c6b3087a8b04e74717bf8baa229aeeecdd99d2bae` |
| `app/src/style.css` | `7715cbd1eb6eb11570821ec8eacaadd1f69b4aed3e205dfef79d650aa5d71a87` |
| `app/tests/panel-layout.browser.mjs` | `a3b0a7936c1521e50068ef009b7b990a99e705f22a373c4fb139bc3074f02436` |
| `app/tests/fov-smoke.mjs` | `b4eb1efeff2f4bbda3d77016628e91412435b458fcae01070b17de8dc860b32a` |
| `docs/SPEC.md` | `c8254fccad4a64895587ece35e806835ee71fe68d5dfa4ea20413ae20a040451` |

The validator independently ran `node --test src/panel-zoom.test.ts` from
`app/`: **10 tests pass, zero skipped**. They cover independent interior-anchor
and edge-budget calculations, upper/lower clamps on reduction, repeated mixed
steps/reversals, 1×/3× limits, invalid values and outside pointers.

The integration owner executed the actual browser commands
`node tests/panel-layout.browser.mjs` and `node tests/fov-smoke.mjs` from `app/`,
with the working Python interpreter first on PATH, and confirmed exit 0 after
the NAV-face guard repair. The validator inspected their final source, emitted
geometry records, screenshots and successful logs; it did not repeat these
complete browser executions or claim to have done so. The browser was Chrome
156.0.8078.80; scenery pixels are fixtures, not photographic evidence.

| Evidence under `output/flight/` | SHA-256 |
| --- | --- |
| `panel-pointer-zoom.json` | `49cfc595f7d27c51aeca1ebf1dc2a1fa55ba5116852c2c28b984f60e0d4d3f41` |
| `panel-layout.json` | `6e51a26d27a48217edfc7137e4e1c7c75ef1e61664a1def2bd40b67709c17192` |
| `pointer-panel-fov-browser.log` | `ab71a99d6b1c75f91555dc876fbf1099c3917bf03832b5becc384edb9c63d522` |

These identify disposable local artifacts; they are not hosted CI evidence.

## Independent observations

The validator recomputed the 13 final real-control anchor cases from their
before/after surface and frame rectangles. Its oracle calculates the ideal
material-point anchor, then the nearest allowed position inside independently
calculated edge bounds. Maximum observed residual from that allowed anchor is
**0.297966 CSS px**. Maximum vertical material-point error is **0.242340 CSS px**.
The larger horizontal deviation at the desktop parking-brake control is required
by the frame edge; the nearest-legal-position residual there is approximately
0.000046 px. An edge exception therefore does not hide a broken free anchor.

All **1,008 sampled animation frames** across 1440×800, 1440×480 and 390×844
have top/bottom empty-space measurements within the 1 CSS px requirement;
maximum positive rounding gap is **0.000062 CSS px**. Independently recomputed
13 normal-fit responsive records remain top-aligned, centered, bottom-anchored
and within the frame. The validator also inspected the desktop bottom-bound
and mobile top-bound 3× screenshots: enlarged instrument content spans the
instrument frame without a blank top/bottom band; clipping exposes the chosen
detail as intended.

The first source inspection found an interactive-control exception missing from
the double-click reset guard: NAV1/NAV2 SVG faces accept OBS drag input but are
semantically marked as images. They could therefore reset zoom. The independent
quality reviewer found the same issue. The coder added explicit guards for both
faces, and the final browser run adds actual zoomed NAV1/NAV2 double-clicks at
desktop and short-window sizes, asserting unchanged panel geometry and OBS value.
This affected criterion was renewed at the final hashes above. Narrow-screen NAV
faces are not inline, so those checks are correctly excluded there; narrow
portaled controls retain their separate coverage.

## Criterion matrix

| R-PANEL-1 / TODO 2.0.122 criterion | Expected | Observed evidence | Outcome |
| --- | --- | --- | --- |
| Pointer-centered 1×–3× zoom | Vertical scrolling magnifies the pointed detail in both dimensions, subject only to required frame-edge limits | Independent 10-case helper execution; 13 actual control-anchor records across three viewports; independent nearest-legal-anchor recomputation has maximum 0.298 px residual | pass |
| No empty vertical frame area | Top stays at/above frame top and bottom at/below frame bottom within 1 CSS px, on every zoom-in/out step | Pure helper clamps each step; repeated top/bottom housing-padding zoom reaches 3× and reduces using alternating upper/lower pointers; all 1,008 observed frames meet limits with maximum rounding gap 0.000062 px | pass for the tested gestures and declared numerical bounds |
| Fixed panel and flying-view heights | Zoom changes only the instrument surface | Actual before/after panel and scene heights remain unchanged; FOV/browser regression compares their complete bounding boxes | pass |
| Normal-fit reset | Reaching 1×, resizing and double-clicking noninteractive housing/faces restore centered fit | Repeated reduction restores fit; actual housing/VSI double-click resets; 13 viewport cases plus resize/dialog-portal boundaries and Review reset pass | pass |
| Paused flight and Review | View-only zoom works in both contexts without integrating physics | Paused browser case and three Review viewports magnify actual controls; FOV regression verifies paused native step/digest/final state and recorded-view camera operation | pass |
| No drag or horizontal-wheel panning | Background/header drag and horizontal scroll leave panel placement unchanged | Actual gestures after each control anchor preserve geometry; source installs no drag/pan handler | pass |
| Pointer entry, focus and controls | Ordinary control interaction must not reposition the panel or mutate values through zoom | Actual AP clicks while magnified retain panel placement and intended AP interaction. Renewed NAV1/NAV2 face double-clicks preserve panel and OBS values. Wheel capture cancels target default/value edits before presentation-only transform; no simulation/control writer is introduced | pass within the scoped control interactions |
| Camera/map/native isolation | Panel zoom leaves FOV, aircraft state and existing independent zoom/input behavior intact | Full FOV browser log passes panel/native invariance, scene wheel bounds, cockpit/chase/resize persistence, map/dialog/ctrl-wheel isolation, yoke axes, Review and reset/reload cases | pass |
| Responsive baseline and accessible openers | Normal fit retains gauge/control bounds; narrow Engine/Radio portals and fresh mobile layout remain usable | Existing 13-case geometry/control-bound tests and actual open/close/portal checks pass; independently recomputed fit records agree | pass |
| New aircraft/training fidelity or universal readability | No such additional acceptance is requested | This slice changes only presentation; narrow/short layouts retain the existing proportional fit and magnified clipping. No new minimum touch-target/readability or aircraft fidelity is inferred | not evaluated |

No dependency installation or shared CI was started by the validator. The
integration owner reports the final application checks (423 Node tests and two
six-case Python suites) and UI build passing after the guard repair. These are
separate from this report's independently executed 10 cases and reviewed browser
evidence. Changes to the recorded implementation or affected tests require
renewed validation.
