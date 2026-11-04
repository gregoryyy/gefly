# Flying-view height and retained look: bounded review

Reviewer: Codex subagent `glide_housekeeping`, **2026-11-04 03:04 Europe/Berlin**.
Scope: TODO 2.0.67, the camera-gesture slice of R-INPUT-1 and the cockpit-fit
slice of R-VIEW-1. Implementation and browser tests are authored by the Codex
orchestrator, `glide_cases` and `glide_model`; this reviewer authored neither.

## Quality

Pointer implementation review and an independent execution of
`node --test app/src/pointer-yoke.test.ts` pass all 14 tests. The retained look
is separate from yoke state: ordinary cancellation neutralizes controls,
while only explicit reset centers the camera. Each new drag starts from the
retained angle, existing angle bounds remain unchanged, and the original relative
yoke anchor survives a look gesture. Unchanged pointer coordinates after release
cannot apply a fresh yoke command; actual movement and authoritative re-entry can.
No physics, input sensitivity or aircraft coefficients change.

**Quality: pass for this bounded increment; no outstanding findings.**
The cockpit retains one uniform fit/zoom transform. Its scene reserve now scales
with application height, with a practical 300px floor where space permits.
Both rows remain fitted and zoom cannot consume that reserve. The final engine
switch spacing fixes short-window overflow. Review readouts use the measured
transport height, with a ResizeObserver, instead of a fixed assumed slot; observer
and CSS-variable cleanup are present. These are presentation-only changes.

## Specification validation

**Validation: pass for the criteria below, not the full requirements.**

| Criterion | Observed evidence | Outcome |
| --- | --- | --- |
| R-INPUT-1: relative/centered look retained and cumulative; neutral release and original yoke anchor | Independent 14-test pointer suite; root actual-app default-relative browser, four groups | Pass |
| R-INPUT-1: ordinary cancellation retains view; Escape/restart explicitly center | Both-mode unit cases; actual default-relative Options/Escape checks and centered browser six-group regression | Pass |
| R-VIEW-1: taller flying area, uniform two-row fit, constrained zoom | Final layout browser: 13 viewport cases, 1440×400 through desktop/mobile; 1440×800 scene 480px, deck 320px; 1280×720 scene 432px, deck 288px | Pass |
| R-VIEW-1: zoom/map docking and narrow controls remain available | Layout zoom at 800/480/1300px heights, dock/undock, engine/radio portals, fresh mobile load; actual FOV browser six groups | Pass |
| Review remains read only, with controls/transport separated | Both-mode unit cases, centered native-state/browser checks, final desktop/mobile layout checks | Pass |

Root/implementation-agent executed browser evidence inspected:
`output/flight/flying-view-pointer-browser.log`,
`output/flight/flying-view-centered-browser.log`,
`output/flight/flying-view-fov-browser.log`, and
`output/ci/flying-view-panel-layout.log`. The browser is Chrome
156.0.8078.80 where recorded; scenery uses deterministic test fixtures while the
pointer/native invariance checks use the real JSBSim worker. This reviewer did
not independently rerun those browser commands. Fresh 1440×800, 1440×480,
post-start flying-view and mobile Review screenshots were visually inspected.
The mobile readouts and transport no longer overlap. Very short windows make
gauges small; visibility here does not establish comfortable readability or a
complete hardware/browser support matrix. Cross-provider peer review remains
pending; aircraft fidelity and training acceptance are outside scope.

## Frozen source packet

Base: `de8cc08e4506940d6fffe33320c61bcfed181929` plus the reviewed working tree.
The ignored inventory `output/flight/flying-view-controls-review-packet.json`
lists 13 exact source/specification/test files. Its packet hash uses sorted
`path + NUL + file SHA-256 + newline`:
`fa39de78c71639f8086124c5c82f48fbf630799c617c949a0d91c91e14bf6be4`.
Shared status, catalog, this report and the reviewer's other notes are
outside independent acceptance scope.
