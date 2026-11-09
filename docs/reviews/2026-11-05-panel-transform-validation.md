# Panel transform validation

Reviewed 2026-11-05 08:28 Europe/Berlin by independent Codex `validate`.
Scope: TODO 2.0.130 / the affected R-PANEL-1 fit, zoom and pan behavior.
The validator authored neither implementation nor acceptance fixtures. The
[earlier diagnostic](2026-11-05-panel-resize-diagnostic.md) remains historical;
its unreproduced Chrome result is not evidence against the subsequent embedded
browser reproduction.

**Bounded recommendation: pass for the delivered geometry repair and resolution
of the reported issue.** At 08:28 the user explicitly confirmed, “the panel is
fixed,” as relayed by the integration owner. Automated fresh reload in the actual
embedded browser and complete simulation-state invariance remain **not evaluated**;
neither is counted as a pass. No all-browser or aircraft-fidelity claim follows.

## Evidence and independence

The validator inspected the frozen controller/CSS, the two affected browser
fixtures, their successful logs and the uniquely preserved JSON artifacts below.
It independently recomputed geometry from the actual recorded rectangles rather
than relying only on test names or the implementation owner's summary. No full
browser matrix, unit suite or native-state probe was independently rerun in this
validation turn.

The standalone fixture bundles the actual cockpit markup, production components,
CSS and controller, with static UI-only telemetry and no JSBSim, scenery or network.
Its final artifact reports Chrome 156.0.8078.80, zero errors/network requests:

- **208 normal-fit measurements:** 192 narrowing/widening/gesture-follow-up states,
  eight narrow-first load/reload states, six offset-iframe initial states and two
  iframe reload states, at DPR 1/2.
- **20 gesture/focus cases**, including actual zoom/drag before resize, captured
  drag termination, native numeric entry and Tab navigation.
- Independently recomputed maximum horizontal center error:
  **0.000396728515625 CSS px**. Maximum normal-fit vertical edge residual:
  **0.01446533203125 CSS px**, both below the 1 px rounding allowance.
- No recorded scene-budget deficit in the new component observations. This does
  not extend the check to every R-VIEW-1 condition.

The separate actual-application layout run passes **13 viewport cases**, Review
and narrow-screen portals. Its pointer artifact contains **13 control anchors**
and **2,058 sampled animation frames** over 1440×800, 1440×480 and 390×844 cases.
The inspected assertions check pointer anchors subject to clamps, every sampled
vertical bound, drag/horizontal pan, native-control/OBS gesture isolation,
capture cleanup and fit resets. It loads the real application, but does not
record a native step/digest comparison; geometry success cannot establish that
missing measurement.

For the actual VS Code internal browser, the integration owner reports a baseline
with left clipping and a large right strip, followed by full systems/six-pack/NAV/
engine/AP/radio visibility at wide and narrower candidate views. The owner
identified DevTools 150; exact CSS dimensions were not measured. These visuals
are conversation evidence supplied by the owner, not screenshots independently
seen by this validator. The validator's read-only native-app selection returned
an accessibility tree with the internal browser and DevTools 150 text, but no
screenshot; it took about 472 seconds despite a requested 60-second timeout.
No native UI action was performed by this validator. A prior owner reload attempt
timed out with unknown completion, so actual automated embedded reload remains
unverified. The later explicit user confirmation supplies reported-issue
resolution; it does not retroactively make that automation succeed.

## Criterion matrix

| Criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Centered normal fit while narrowing | Both rows/full surface fit inside the fixed frame without left clipping/right waste | pass: independently recomputed 208 rendered fit states and inspected edge/control-hit assertions; reported embedded before/after and explicit user confirmation support the reported issue's resolution |
| One coordinate system | Fit and magnification use one uniform transform; translations use screen CSS pixels | pass: canonical fractional rectangles define fit; CSS zoom is removed; inspected matrix/rectangle assertions verify translation from the frame origin and one `fitScale × zoom` scale |
| Fresh loads/reloads and embedded offsets in tested Chrome | No stale transform or host-offset drift | pass within Chrome 156: eight narrow-first/reload cases and nonzero-offset iframe load/reload/zoom/resize records; these are distinct from VS Code's engine |
| Pointer zoom and bounded pan | 1–3× zoom anchors except at edge clamps; drag and horizontal pan retain vertical coverage | pass in inspected actual-browser evidence: 13 anchors and 2,058 sampled frames, with tested upper/lower controls and housing padding |
| Fit reset and drag lifetime | Resize, zoom-out and housing double-click reset fit; release/cancel/blur do not leave stale drag/capture | pass: inspected actual gestures/capture assertions and source lifecycle cleanup; new layout key resets zoom/pan after dimensions change |
| Controls and responsive access | Control focus/ordinary interaction do not pan; native inputs/OBS retain gestures; narrow portals remain reachable | pass: 20 component gesture/focus cases plus actual-app control/OBS and 13-viewport portal checks |
| Fixed panel/flying area and Review layout | Panel zoom does not resize its frame; Review controls/readouts remain usable | pass for geometry: inspected frame/scene comparisons, Review zoom/reset and transport/readout non-overlap assertions |
| Actual embedded fresh reload | Verify a completed reload in the user's internal browser | not evaluated: automation timed out; completion and fresh post-reload geometry were not verified |
| Native/recording/FOV invariance | Presentation gestures must not alter flight state/control values/camera | not evaluated as a new complete runtime comparison: source remains presentation-only and control guards are inspected, but these artifacts contain no native digest/step or complete FOV comparison |
| Broader browser/device/fidelity gates | Separate evidence required | not evaluated: other engines/page-zoom settings, full device matrix, aircraft fidelity and cross-provider peer acceptance |

## Source assessment and limits

The absolute instrument surface starts at the relative viewport origin. Its
transform is `translate(x, y) scale(fitScale × zoom)`; horizontal normal fit uses
`x = (frameWidth − fittedWidth) / 2`. Translation is therefore already in screen
CSS pixels and is not divided by a second CSS-zoom scale. Canonical measurement
temporarily removes and synchronously restores the transform, retaining
fractional natural dimensions. This removes the prior dependency on CSS-zoom
measurement behavior. The specific internal engine/host mechanism behind the
old discrepancy is not independently established here.

The implementation and geometry evidence pass at this bounded freeze. The user
confirmation resolves the reported visual issue; unmeasured embedded reload and
simulation invariance remain explicit limits. Historical diagnostic findings and
source hashes are not promoted to current acceptance. Its generic disposable
JSON/image paths were superseded by later test runs, as the historical report's
notice records; this validation uses the unique candidate copies below.

## Frozen inputs and evidence

| Input | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `4069aa0697dd832543a34f70901eebc73c5c7327e7e834bff9e6dd6466824a47` |
| `docs/input/2026-11-05-panel-resize-drift.md` | `89a457f7306fab70a602b381ade2ce098d730abaca606ca8bb29fd824604e668` |
| `app/src/cockpit-layout.ts` | `d13ea8fec91b182b461cc4d744fe34fa065280fdb0e3b46e83a32b72dd9ca792` |
| `app/src/style.css` | `a89bc108d2c2bbbdda3893ed209536c705f78c549d865102f05fb376a23b195a` |
| `app/src/panel-zoom.ts` | `3acb570345a152745ec0bdb2b46551aad6f34e63d53fb91b1d000438ca49e0ce` |
| `app/tests/panel-resize.browser.mjs` | `04baee856020bc739467ff5c2b0193bbade90b520c8eb71834694bea6ac0accf` |
| `app/tests/panel-layout.browser.mjs` | `bbed407a76c4692685cfbb7925b2d3e84a840dcd2072b549141f88e6f85420fb` |

Unique local evidence under `output/flight/`:

| Evidence | SHA-256 |
| --- | --- |
| `panel-transform-resize.json` | `17af8bb430d4c2c1a0446b13d1c90d927da3c962cd461e135be49fcc455071a3` |
| `panel-transform-layout.json` | `bcdf7152d86675818e0e313cd6cfb4cef8f0cbb7fb703e1080a87c6d2ecb24fc` |
| `panel-transform-pointer.json` | `0239977cb799e7e47d86b9980e54ee7ad61bca4f4b83d22b5890d1f9146989c9` |
| `panel-transform-812x823-dpr2.png` | `dfcadddf5ff202e90995f50270a91609661b00d9d24757d65877495f51f4eec6` |

The PNG is pinned for evidence identity; no independent visual inspection of it
is claimed. Changed inputs require renewed affected validation. Local geometry
and user confirmation do not establish hosted CI, publication, training credit
or the separate cross-provider peer gate.
