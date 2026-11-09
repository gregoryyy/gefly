# Stall-warning quality review

Reviewed 2026-11-05 10:08 Europe/Berlin. TODO 2.0.132; R-ALERT-1. Independent OpenAI/Codex quality reviewer, not an implementation author. Same-provider quality, with cross-provider peer pending; exact runtime CLI/model metadata was not independently exposed.

## Outcome and scope

**Phase-one quality: no blocking findings in the frozen display repair and inspected native/UI/audio wiring. Overall task status remains partial: the user's late or intermittent warning in a weak-engine climb is unresolved.** Display acceptance does not establish correct warning timing, an actual missed publication in the user's session, calibrated aircraft behavior or speaker audibility.

Reviewed production changes are limited to flight-warnings-panel.ts and its CSS: active/unavailable visibility, measured placement below the header, bounded viewport placement and stacking over nonmodal panels. The native bridge, prepared aircraft/WASM, monitor thresholds, audio graph, default mute and simulation step are unchanged. The working-tree base is HEAD `700dd5386125f9864a391f85b277cb71da55290a`; exact phase-one inspected identities are pinned below. The reviewer wrote only this report, with read-only checks and one temporary unit log.

Authoritative input is the [initial report](../input/2026-11-05-stall-warning.md), refined by the [weak-engine climb clarification](../input/2026-11-05-stall-warning-climb.md). Manual versus AP VS/ALT operation remains unspecified. The [source reference note](../research/2026-11-05-stall-warning-reference.md) distinguishes native model warning, display, audio gates and physical sound; its diagnostic-start description of the old hidden-unavailable UI is historical.

## Findings

### Medium, resolved: active badge could be covered by the nonmodal plan

Location: app/src/flight-warnings-panel.css and placement in flight-warnings-panel.ts. In the explicit synthetic UI-only baseline using the actual current header/styles/planner, the active badge is covered by the plan heading at 1440px and 390px widths with header and plan visible. elementFromPoint identifies the plan heading instead of the badge. The independently viewed 390px baseline screenshot shows the labels obscured beneath that heading. This establishes a display defect, not native onset failure or the cause of the reported climb behavior.

The candidate places the panel at z-index 11 above plan 9/header 10, and computes top from the actual visible header bottom plus 8 CSS px, clamped by the application height and measured warning height. Sixteen width/header/plan combinations at 1440/812/390/320px pass hit-stack and viewport checks. All eight header-visible records have exactly 8px clearance; no candidate badge is occluded. The independently viewed candidate 390px screenshot shows STALL ! and TERRAIN ! fully visible over the plan.

The actual native-positive recorded sample is also rendered unobscured with actual map/plan/header open at 1440 and 390px. This is genuine recorded native telemetry, explicitly labeled Review, rather than a synthetic active warning injected into the flight.

### Medium, resolved: unavailable telemetry appeared absent rather than explicitly unavailable

Location: app/src/flight-warnings-panel.ts render/update and hidden CSS rules. Baseline unavailableVisible is false. The candidate renders unavailable as visible STALL N/A / TERRAIN N/A with distinct text, status, accessible label and explanatory title; clear alone collapses. Candidate fixture records visible STALL N/A. This avoids a reassuring clear appearance or an invented active stall when telemetry is absent. Actual startup/readiness and native valid data retain their separate interpretation.

### Unresolved diagnostic limit: timing in the user's weak-engine climb

No calibrated expected onset or reproducible user trace has been established. A late-warning claim needs the actual maneuver/control mode, native AoA/signal/contact history and delivered/rendered/audio state; a low airspeed, reduced climb rate or loss of altitude alone is insufficient to establish the existing model signal should already be positive. The UI fix does not change or calibrate that signal. No model retune or fabricated fixed IAS threshold is accepted by this review.

## Correctness, lifecycle, performance and safety boundaries

The component consumes read-only FlightWarnings and a Review flag. It has no callback to native controls, autopilot, session, recording, storage or network. Labels/titles use textContent and fixed strings, with no untrusted HTML or added permission/resource destination. pointer-events remains none, so the higher stacking order does not intercept map/plan/header gestures.

Placement runs on status/Review changes, frame/header ResizeObserver notifications, header hidden-attribute changes and window resize. It does not perform layout reads on every unchanged telemetry update. Measuring the frame/header/warning rectangles before writing an absolute top cannot resize the observed application/header, avoiding an obvious observer feedback loop. Text wrapping and Review label changes use the updated measured warning height. Header collapse, hidden state and narrow wrapping are handled by actual geometry; when insufficient room remains below the header, clamping prioritizes the application bounds. The status role remains polite/atomic, and text/status mutations are guarded to avoid a repeated live announcement on every stable frame.

Disposal is idempotent: both observers disconnect, the window listener is removed and children are cleared; late update/place calls are guarded. There is no added RAF loop, timer, audio node or asset. Real modal top-layer dialogs are outside the nonmodal-overlap guarantee. Accessibility/page zoom, all short window heights and every browser engine are not newly established by the tested width matrix.

The unchanged monitor consumes actual worker frames, activates airborne stall only from finite nonnegative native warning >0 with validated contact state, and classifies missing/invalid fields unavailable. Ground/contact suppresses active cues. Live and Review monitors remain separate. The unchanged audio event/graph path stays default-off, gesture-unlocked and volume-gated; pause/hidden/loading/failure/reset and all Review remain silent. No automatic engine-power change, AP intervention or warning-history latch is added.

## Evidence tiers and applicability

1. **Native property and model correspondence.** The reviewer directly inspected the local pinned JSBSim FGAerodynamics.cpp lines 163–169 and property binding, plus gf_stall_state in bridge.cpp. The software signal uses body AoA above 0.85 × configured alpha-max, then 10 × (AoA/alpha-max − 0.85); it is not an airspeed horn switch. With model alpha-max 0.28rad, the positive gate is above 0.238rad. The six-case real-WASM diagnostic validates all 13 exported stall fields and has zero maximum formula difference in each case. It uses fixed 1/120s, declared roll-level assistance and an altitude servo only in its named case. These are model correspondence/maneuver diagnostics, not installed C172S calibration or aircraft stall-performance acceptance.

2. **Weak-power and sampling diagnostics.** The inspected expanded artifact contains 24 cases, including the original 15 manual/heading-held/VS cases, seven near-onset cases and two using the existing application roll offset. Heading-held 20%-power pull cases can produce positive warnings while climbing; unassisted roll-off cases can remain below the AoA gate. VS can lose positive climb before the warning gate is reached. Those observations explain why weak power or descent is not identical to native stall onset, but do not identify the user's cause. Static XML CL components exclude dynamic/elevator/flap/ground-effect contributions and are not exported total native CL/lift.

   The added near-onset elevator −0.4566 case has a positive window of ten fixed steps, 0.0833333333s. Ideal 60-wall-Hz phase resampling at 10× uses 20-step intervals, so some phases miss that entire window. This is a credible sampling risk; it is **not measured loss in actual Worker publication, RAF rendering, audio delivery or the user's session**. Other rates/phases and longer original windows must not be conflated with this short case. Actual worker tick batching/catch-up and UI frame load differ from ideal grids. The user's timing issue remains open.

3. **Rendered UI and real native-to-audio automation.** The five-group authored browser run reaches a genuine native positive through the declared idle/max-nose-up-trim/combined pull stress fixture, with no replacement of native telemetry. Default muted state creates zero AudioContexts. After explicit S, the original connected 450Hz oscillator gain receives 0.075 with a running context, visible page, live mode and positive airborne native warning (0.11043972223935716 in the captured horn sample). Pause returns the gain target to zero. The exact recorded positive sample remains visible above actual panels in Review; no extra positive horn schedule is created and paused native step 118/digest `4e9896e39085ff37`/full final_state remain unchanged. The source signal can clear before Pause is acknowledged; selecting the exact recorded positive sample is valid Review evidence, not proof of prolonged live warning.

4. **Audio waveform versus physical sound.** The separate original warning-audio suite measures offline Web Audio waveforms/envelopes and cancellation across 20 cases, with integrated actual-native AP disconnect edges. The stall chain uses a real connected Web Audio graph routed to a silent sink, observing original automation and browser context state. Neither suite establishes physical speaker output, human audibility, the user's sound settings or an installed horn timbre. Default mute is documented behavior, not an assumed explanation of the user report.

## Commands and evidence limits

Reviewer ran `node --test src/flight-warnings.test.ts src/flight-warning-audio-events.test.ts > /tmp/gefly-stall-warning-quality-unit.log` from app: **13 passed, zero failed/skipped**. `npm run check` passed TypeScript. Browser/diagnostic runs were executed by the authors/orchestrator, then source/artifacts and selected images independently inspected here; no extra browser matrix, native desktop automation or human listening was performed by this reviewer. The orchestrator/authors report successful exit for the phase-one five-group native UI/connected-audio run, 16-case synthetic layout run, original audio suite and six-case native diagnostic. Some success JSONs intentionally have no result field; the observations/assertion source and reported process completion are used together, not an invented result key. Unique phase-one artifact copies are pinned below. The current 24-case climb diagnostic is pinned as its separately bounded inspected freeze. No full CI/publication, training-fidelity or cross-provider peer acceptance is claimed.

## Follow-up boundary

The orchestrator is starting a separate actual Worker/render-delivery investigation because the short near-onset pulse can alias in ideal 10× sampling. No production event/peak delivery helper or pending-RAF consumer has been reviewed or accepted here. Any new Worker/message/UI/audio delivery changes require renewed affected quality and specification checks; phase-one UI placement and N/A findings do not establish those changes correct. TODO 2.0.132 must not be marked resolved on this report alone.

## Phase-one frozen inputs and evidence

Packet SHA-256: `34b89e7e2dea84bd267f0a4d0019bab6b56ff4dd01f156977ad2b4d02da2dd75` (ordered path, NUL, SHA-256, newline). The phase-one working-tree snapshot is independent of future delivery fixes. The 24-case result has a separately preserved -24 filename and confirmed process exit 0. The final script continues to write the generic path; root preserved the frozen result copy. Its final source clarification labels static coefficient components as zero-sideslip/zero-flap/hysteresis-zero references rather than actual total native lift.

| Path | SHA-256 |
| --- | --- |
| `docs/input/2026-11-05-stall-warning.md` | `b59c7bf35ce56666d1349e40e42104fa0ccd856af87b453f33749d659536c498` |
| `docs/input/2026-11-05-stall-warning-climb.md` | `becd1e26f25021bb79dd1dfddc904650b7aee1d5fd8ae5696a2e0710e9eaafda` |
| `docs/SPEC.md` | `28092e30256f93c05f07ec10d85ea948ab57c8974580def4cbe524b594289c77` |
| `docs/SEC.md` | `cc4de4d0c23408c2e6d86d17be5145ae676ec58390613b78e4bae2df0d885201` |
| `docs/research/2026-11-05-stall-warning-reference.md` | `d2cc68a450b123e9152f2a132f9e14e5fa152dbd8f39d7f737e6d1bbbf30f0e1` |
| `app/src/flight-warnings-panel.ts` | `634da28e51d3cab1327062ae10507bd87f1b99102f7365bb804d34f5cba61f0f` |
| `app/src/flight-warnings-panel.css` | `e2c8a4b660443fd007de1d7c0efb5afca137fce738bcb991d2091ffd5d75472c` |
| `app/src/flight-warnings.ts` | `9717176757e048e887fd93fbd25836a89804eb49c3cea0929454be09d2782656` |
| `app/src/flight-warning-audio-events.ts` | `33cef2379a91c602dd68a2c6d3e35389752b7096d93dba641b19232fc3626885` |
| `app/src/engine-audio.ts` | `7c5bd9ef40746aa710af73b1b3ed1c6154276324a8aca31fffec26992496202d` |
| `app/src/flight-warnings.test.ts` | `d3ef3b19f98020444033fd0229f05d3d070531b2cbb79b62a715b08fe6a01b0d` |
| `app/src/flight-warning-audio-events.test.ts` | `0e52b0046b295b4d77c919db7322a45ab7d69bd864fb8b29e9450614906be902` |
| `app/tests/flight-warnings.browser.mjs` | `41dc3478f9a377dc6cd052b909356301eeeb127497f507a6c25e010d40421ec7` |
| `app/tests/flight-warnings-audio.browser.mjs` | `d806ab4fe7af7fcfdad10c9f537c8c5a865d1ea374c20f40aa52c73ca78cd172` |
| `studies/e1-browser/sim/bridge.cpp` | `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `studies/e1-browser/sim/stall-warning-native-diagnostic.mjs` | `60986cc82f0017f25b484275d0e39bdafa53af8d96bc3c877381e605da22be20` |
| `studies/e1-browser/sim/stall-warning-climb-diagnostic.mjs` | `d708c769c925614e8378363916bab0c65d28576fd9a72fe88894167917a33883` |
| `studies/e1-browser/sim/dist/jsbsim.wasm` | `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392` |
| `studies/e1-browser/sim/dist/build-info.json` | `d535d34f6f3956949724d9b3fbcae704e545b73bdce138f39bebf63bf4b24b26` |
| `output/flight/engine-build/jsbsim-1.3.3/src/models/FGAerodynamics.cpp` | `aa14e69c6a25133b25e80f76fbfc3b8c4a34a1a6636e7b8420fb540b697237d0` |
| `output/flight/task132-phase1-warning-browser.json` | `e95d86a7b761e2b00c42a87257c7b312fb7c6e71f29202e9b7ebc9542f457ad9` |
| `output/flight/task132-phase1-audio-browser.json` | `aa43cc60a1611a53ba476d47186574ca5483fd9ecc833513db90fd2923173774` |
| `output/flight/task132-phase1-native-chain.json` | `5c08665bf6f27da572646e0cb72f68ab1de841aebbebadb10b942a5198979876` |
| `output/flight/task132-phase1-layout.json` | `c200af6d82188ce7b592a1605d7745cdce9521e6dcfc2350227354d0bb2a6884` |
| `output/flight/flight-warning-task132-baseline-layout.json` | `1642fd54184b9169cb801e095949d4bb30a34594968f0a6dc927baf1a1cae531` |
| `output/flight/flight-warning-task132-baseline-stacking-390.png` | `fba107eb35e4d6626c21ab3199714cfb5364141c82c517dea32375b9f6321d0f` |
| `output/flight/flight-warning-task132-candidate-stacking-390.png` | `dc2e2af99fe0100d65ea1b9c6ac67b96e205a4b9da4ec00bc7779e7e31970dc6` |
| `output/flight/stall-warning-native-diagnostic.json` | `c1bbe86309ef16d82b12167d965d6b035eb182cbfab292871f418753fed25217` |
| `output/flight/stall-warning-native-task132-climb-24.json` | `2983c1530a7e2d30ebd1fca25d20304cc08072ffa033222056a0aa2ba656ec7f` |
| `/tmp/gefly-stall-warning-quality-unit.log` | `1e6e26428b16d4e8bada617d5f7293566ae89b62d4c35b1de56b2b014f7e774e` |
| `output/flight/stall-warning-native-task132-climb-24.log` | `3d40d1a06c42921187a2370533f298dfe0da7c2ed651ee32a40f5142e8916aad` |
