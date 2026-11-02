# Classic cockpit, pointer controls and basic engine/AP systems

Scope: TODO 2.0.6/2.0.7, partial R-VIEW-1/R-INPUT-1/R-AIR-1/R-REVIEW-1.
Generic local c172x research behavior, not installed C172S fidelity, accepted
landing/circuit behavior or full v1.1 replay/avionics acceptance. See the
[source mappings and limits](../research/2026-11-02-classic-controls.md).

Authors: Codex orchestrator/integration; classic_camera/code1 and
classic_sixpack/code2 ran disjoint camera/instrument and engine slices in parallel;
classic_pointer implemented pointer input and focused browser regressions.
classic_research maintained research/application instructions alongside them.
Implementation SHA-256: `31a2ce3b7c55d3a31d1671ae09cf1e7a9a015c808834cdedfc605db2cc82f39d`. Sorted paths:
app/package.json, app/runtime.ts, app/src/aircraft-orientation.test.ts, app/src/aircraft-orientation.ts, app/src/control-settings.test.ts, app/src/control-settings.ts, app/src/engine-panel.css, app/src/engine-panel.ts, app/src/flight-trace.test.ts, app/src/flight-trace.ts, app/src/main.ts, app/src/pointer-yoke.test.ts, app/src/pointer-yoke.ts, app/src/scene.ts, app/src/session.test.ts, app/src/session.ts, app/src/six-pack.css, app/src/six-pack.ts, app/src/style.css, app/src/types.ts, app/tests/classic-smoke.mjs, app/tests/engine-smoke.mjs, app/tests/smoke.mjs, studies/e1-browser/sim/bridge.cpp, studies/e1-browser/sim/build.sh, studies/e1-browser/sim/cockpit.js, studies/e1-browser/sim/cockpit.test.mjs, studies/e1-browser/sim/engine.js, studies/e1-browser/sim/engine.test.mjs, studies/e1-browser/sim/prepare-aircraft.py, studies/e1-browser/sim/prepare-aircraft.test.py, studies/e1-browser/sim/worker.js; each path + NUL + bytes + NUL. Shared prose is excluded.

## Independent quality

Reviewer: Codex classic_research, excluding its own source note and app README.
Final quality passes with no blocking findings. Checked explicit glTF/ENU axis
mapping, cardinal/pitch/roll fixtures, camera-only look offsets, six-pack readouts,
CAS/true-heading/derived-VSI labels, ideal ball signs, normalized source-model
flap/brake controls and release behavior. Pointer modes/capture/cancel are bounded
and neutralize on interruption; captured look can continue outside until release.

A P2 partial-cockpit-group issue was fixed: six base cockpit fields must arrive
atomically, with only the unavailable ball optional. Partial data cannot enable
controls or show NaN. Engine/AP telemetry is likewise an atomic 13-field group.
A P3 worker/session disagreement on zero MAP was fixed to omit the unavailable
group, with an explicit negative fixture. Affected reviews passed.

The mixture adapter hash-guards source XML, copies an ignored aircraft directory
and adds only a default-on execute gate. Reverse-patching yields identical original
bytes; other files/coefficients/notices remain intact. The source checkout is not
modified. Actual pressure/RPM/temperature/flow/volume conversions are explicit.
AP reuses modern source roll/guidance channels and resets integrators; legacy AP
channels/ALT remain off. Raw manual intent disconnects before roll correction,
which is suspended under AP. Paused permitted mode/setting replacements preserve
physics/environment/other engine state and VSI, and prior frozen review objects.
Modal/shortcut guards, numeric throttle and correction presets were reviewed.

## Independent validation

Reviewer: Codex altimeter_validate; authored no implementation. Actual Chrome
with the rebuilt pinned JSBSim engine and recorded adapter hashes:

| Behavior | Observed evidence | Outcome |
| --- | --- | --- |
| Aircraft orientation | North chase shows tail toward camera/nose forward; +20° pitch/+30° roll shows nose up/right wing down; side orbit is consistent | Pass |
| Six-pack | Standard 3×2 order, actual CAS 45.4287 m/s; true-heading/ideal-rate/derived-VSI labels | Pass |
| Flaps | Buttons 0/10/20/30 and F/Shift+F reach model positions with actual traversal | Pass |
| Wheel brakes | B, pointer outside release and blur work; airborne 120-step A/B states and digest `30eeac3b5418b83e` identical | Pass |
| Yoke/look | Scene short click and relative input signs work; held look changes view with pointer axes neutral; release/cancel/blur/review clear appropriately | Pass |
| Throttle/engine | 90%: 2452 RPM/23.51 inHg; 50%: 2037 RPM/12.83 inHg; idle: 1808 RPM/9.09 inHg | Pass |
| Mixture | Manual 0.5 persists, auto returns 0.95334; cutoff gives fuel flow zero, RPM 1918→1194 in 1.8 s | Pass |
| AP response | Capture 1.43122 rad; target 110° turns heading 1.43123→1.69096 rad in 5 s; Level reduces bank 0.22906→0.000223 rad in 2.8 s | Pass |
| AP authority | Off/manual override mode/output zero; correction suspended during AP and restored after disconnect | Pass |
| Review | Home 2074 RPM/95% AUTO, End 1725 RPM/50%; worker step 1038 frozen, live controls disabled | Pass |
| Mobile header | Initial P2 clipping of Controls/Pause fixed with a two-row grid; both now within 390px | Pass |
| Mobile engine dialog | 390×568, x=19..371/y=20..548, natural scrolling/Done accessible; flight continues, hotkeys guarded, close restores Flying scene focus | Pass |
| Missing capabilities | Whole absent engine group displays unavailable/disabled while flight advances to step 26 | Pass |
| Sources/network/errors | Prepared model reverses exactly to pinned source; metadata hashes match; localhost-only, no page errors | Pass |

The base browser suite passes 26 groups, the classic suite eight, and the engine
suite nine. Focused engine regressions independently observed actual 20 s
fixed-step heading changes 82.01→92.00° and 92.01→82.26°, wings leveling
10.90→0.025° in 1200 steps, paused same-step AP-off, raw keyboard/pointer
manual override, numeric/numpad throttle, correction Off/default and recorded
state/reset. Earlier test attempts that sampled a later live heading after
capture, or reloaded under active Vite HMR, are not passes; final probes use the
capture publication and stable test server. Renderer pixel refinement is not
mistaken for changed physics. Screenshots/raw logs remain ignored under
output/flight/. TypeScript/UI build, 65 native tests and five Python adapter tests
pass with zero skips in these suites. Shared CI optional study/platform skips
remain separate, not passes.

## Limits

The aircraft/model remain generic research c172x, not the selected project-owned
172S. CAS is not an installed/calibrated IAS instrument; heading is true, not
magnetic; the rate/ball aid is not a canted gyro turn coordinator. Wheel braking
requires model ground contact and is not an airbrake; real terrain/airport datum
and landing acceptance remain open. MAP/other engine values are source-model
telemetry, not an assertion of the selected 172S panel fit. Mixture starts in the
upstream automatic mode; user adjustment opts into manual control. Only wings-level
and true-heading roll AP are supported: no altitude hold, autothrottle, NAV/approach
coupling or installed KAP140 fidelity. Upstream navigation sensor bias is retained;
no controller gains are invented or tuned here. The original 14-value dynamics
layout remains unchanged, but input changes naturally change the dynamics digest;
this is not complete event/input replay. Peer pending under the batched cadence.
