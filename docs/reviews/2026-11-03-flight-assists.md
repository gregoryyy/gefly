# Flight assists and overlay integration review

Independent reviewer: Codex subagent `increment_quality`, 2026-11-03,
Europe/Berlin. This reviewer did not author the implementation or maintained
tests. Scope: changes against `origin/main` (`b3a7538`) for R-AP-2, R-SIM-9,
R-UX-2 and affected R-WORLD-5 integration. The earlier independent
[regional source/native/render review](2026-11-03-streamed-region.md) remains
separately scoped below. This is same-provider quality and validation, not the
cross-provider peer gate.

## Quality findings

Quality: **pass with no remaining blocking findings**. Validation: **pass for
the scoped convenience, pacing, overlay and affected regional criteria below**.
Source review found no blocking numerical, protocol, injection or ownership
finding in the inspected implementation. Two review findings were returned:

1. **Low, keyboard layout:** initially Shift was rejected before printable `=`
   could be recognized. On a German layout Shift+0 would not select speed and
   could reach the throttle-idle handler. **Repaired:** the shortcut now matches
   the printable `=` character and stops propagation before global digit handling;
   Shift+A and the US-layout `+` remain inactive. The maintained browser check
   includes German-layout Shift+Digit0 while preserving throttle.
2. **Low, asynchronous browser assertion:** the independent first browser run
   passed overlays and airport map, then failed the immediate `RECORDED RATE`
   assertion. Review state is set synchronously, while the overlay refreshes in
   requestAnimationFrame. The assertion needs to await the rendered label before
   checking its value. **Repaired:** the test now awaits the rendered Review
   label; it also waits for the actual Options dialog close event before testing
   an editable cockpit field. The independent affected browser rerun passed all
   six groups. No product behavior was changed for these asynchronous test waits.

The capture command samples one authoritative KAP sensor frame. It clears prior
guidance modes, selects the current true heading and AP-BARO indicated altitude,
engages HDG/ALT and holds the current pressure altitude. The explicit UI hand-off
releases held controls and removes the study aileron offset before capture;
raw requests with active manual intent remain rejected. Repeated A recaptures
instead of toggling the controller off. Existing KAP hardware-style controls and
their original semantics stay separate.

The allowed rate union is finite and exact. Rate changes rebase wall-clock
pacing at the last completed native step, with the same 1/120 s integration.
Pause and terrain-loading intent are preserved; bounded catch-up does not create
a larger physics step. The overlay uses acknowledged worker state and describes
requested pacing, with achieved speed dependent on resources. The trace copies
rate metadata; a same-step rate update cannot rewrite physical state or the
stored vertical speed, and earlier samples remain immutable. Review commands
are disabled and its displayed recorded rate is separate from playback speed.

## Independently executed evidence

| Check | Result and scope |
| --- | --- |
| `node --test app/src/session.test.ts app/src/flight-trace.test.ts app/src/streamed-terrain-provider.test.ts app/src/streamed-terrain-assets.test.ts app/src/airport-catalogue.test.ts studies/e1-browser/sim/simulation-rate.test.mjs studies/e1-browser/sim/terrain-stream.test.mjs` | **65/65 pass, zero skips.** Includes command bounds, neutral hand-off order, invalid regional identity, immutable pacing history, all 42 asset hashes/compiler identity/finite nodes/exact shared edges, renderer samples, catalogue hash and timeout/cancel cases. |
| `node app/tests/flight-assists-worker.mjs` | **Eight groups pass**, real existing WASM and production worker. Five rates produce exactly identical native state/digest at 120 fixed steps; changing rate is state/time neutral. Invalid rates, pause/resume, current flown-frame capture, recapture, AP BARO coherence, active-manual rejection/queued release, terrain-loading pause intent and collision guards pass. |
| Independent one-second pacing observation in that worker run | Wall times **1004/669/503/202/102 ms** at 1/1.5/2/5/10×, each zero dropped steps. This Node probe is not a browser/frame-rate or universal achievable-speed guarantee. |
| `node studies/e1-browser/sim/terrain-region-native.mjs` | **Pass**, two actual regional locations, native cache ≤9 and 132 boundary points: native/JS height and slope mismatch exactly zero; ±1e-9 rad cross-boundary height change ≤0.002945631 m. |
| `node studies/e1-browser/sim/terrain-stream-worker.mjs` | **Pass**, held fetch with pause/stop preserves step/state/digest and explicit pause intent; missing/corrupt tiles fail closed. |
| `node app/tests/overlay-presentation.browser.mjs` | **Pass**, actual integrated Chrome/WASM with deterministic map/photo fixtures: hidden defaults/O, marked shortcuts, first-gesture activation, active controls while paused, inactive versus active map wheel behavior and read-only Review restart guard. |
| `node app/tests/airport-map.browser.mjs` | **Pass**, actual Chrome: all 103 markers, search/select/elevation/unavailable fields, empty filter, map pan/Follow and narrow viewport. Photography pixels are fixtures, not source-fidelity evidence. |
| `node app/tests/flight-assists.browser.mjs` | **Six groups pass** on independent rerun, Chrome **156.0.8078.80**: paused A capture/recapture and unchanged native state, exact/rapid rate cycling, German-layout `=` without throttle change, modifier/repeat/menu/modal/editing guards, recorded-rate Review with disabled commands/frozen physics, restart at 1×/AP off. Real worker/WASM/terrain; map/photo pixels are fixtures. Initial failed asynchronous assertion and test-only repair are retained above. |

The orchestrator separately ran shared CI. Its outcome is recorded by that
agent; this reviewer does not present it as a separately executed gate.

## Scoped validation matrix

| Requirement / criterion | Outcome |
| --- | --- |
| R-AP-2: current heading/altitude, coherent pressure/BARO targets, repeated capture, fixed-step neutrality and manual/collision guards | **Pass** for independently executed actual-worker and integrated UI/Review/browser guard cases. No installed-servo or aircraft-fidelity acceptance. |
| R-SIM-9: exact rate cycle, unchanged integration/state, rebasing, pause/loading intent, reset and immutable Review | **Pass** for independently executed numerical/session/history and integrated browser/recorded-rate cases. Achieved speed remains best effort. |
| R-UX-2: hidden defaults/O, half-opacity activation, paused controls, menu shortcuts and disabled Review commands | **Pass for exercised cases**, independent maintained integrated browser test; no resolution of the separate touchpad handling report. |
| R-WORLD-5: unchanged source/native/proxy/render core and affected integration | **Pass for independently exercised assets/native/worker/map cases**, with prior unchanged-source/geometry evidence carried forward as described in the regional review. Full EDDF/100 NM, global landings and source survey accuracy remain outside scope. |
| Aircraft model/installed avionics, training effectiveness, global visual quality, exhaustive imagery coverage, reference-Mac browser latency and touchpad instability resolution | **Not evaluated**. |

## Reviewed snapshot

Final runtime/test packet: **116 paths**, SHA-256
`55fcea2cd15cd82963e9196e11883342dd7f552876ffadd01c7017e283fbe042`.
The scope is the sorted union of tracked paths changed against `origin/main`
and untracked non-ignored paths under `app/`, `studies/`, `utils/`, `.github/`
or `packages/`, excluding Markdown and absent files. SHA-256 receives each UTF-8
path, NUL, exact file bytes, NUL. Documentation and the README screenshot are
outside this runtime/test packet and need their own artifact review.

| Artifact | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/worker.js` | `7716e1b4f7e9fec10e7ab4cf415d0e69cc15d8ba600db6c517f57f3a6ebf17aa` |
| `studies/e1-browser/sim/simulation-rate.js` | `17fa6cf9d7c35866ddfea4b46866d19787ba3eddf79da1a78bd46c83e9e93899` |
| `app/src/main.ts` | `f9dae1499e377dbb9b16baf68ef51f79b5f15c91861010205ea4bd470bf266f9` |
| `app/src/session.ts` | `62e083bd0f1721ece94f4fcda02ace9836aadc63c2d528798bd3aac02612038b` |
| `app/src/flight-trace.ts` | `922a2b6d02f12a57b581a9aba9061ab8e54c45d03691159cc78757e5ee6bd693` |
| `app/src/flight-assists.ts` | `3cfacc6384bf08d52d831570998d9ebd73072faea316126af05422b4e61316dd` |
| `app/src/overlay-presentation.ts` | `969cfe021f058c096b77d3adaf10a7e3b21c5a07fd7ede5199391c171bd8b6fc` |
| `app/src/menu-shortcuts.ts` | `0ba35f8355a7355e5461bf5b8a10e66b6040d476f095bee9b4a8e90606d8d514` |
| `app/tests/flight-assists.browser.mjs` | `6f62318c53569468a5277fc8e003a1b4d1e1d524f139b5b16d09643083fadbe9` |

Cross-provider peer remains **pending** under the normal batched cadence; this
same-provider report does not replace it.
