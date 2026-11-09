# Stall-warning visibility and wiring validation

Reviewed 2026-11-05 10:09 Europe/Berlin by independent Codex validate agent
`/root/panel_validate_final`, not an implementation or fixture author.
TODO 2.0.132; bounded R-ALERT-1 visibility repair and existing native/audio path.
Author and reviewer provider: OpenAI/Codex; exact CLI/model identity was not
independently exposed. Cross-provider peer remains pending.

**Overall status: partial. Pass for the delivered warning visibility repair and
the tested native-to-presentation/audio wiring. The user's late/intermittent
weak-engine climb report remains unresolved; task 2.0.132 is not accepted as
complete.** No warning threshold, model coefficient, native dynamics, monitor,
audio policy or default mute was changed in this reviewed production slice.
Future sampling/event-metadata work requires its own affected validation.

## Frozen scope and evidence

Read AGENTS and the validate contract, SDLC/STYLE/SEC/TODO, updated R-ALERT-1,
EVAL's presentation/physics separation, both immutable user records and the
[diagnostic reference](../research/2026-11-05-stall-warning-reference.md).
The later [climb report](../input/2026-11-05-stall-warning-climb.md) governs the
unresolved user case; a visible badge alone cannot establish timely warning.
The user's manual-pitch versus AP VS/ALT configuration is still unspecified.

The reviewed working-tree snapshot uses warning-panel TS/CSS hashes
`634da28e…` / `e2c8a4b6…`, listed in full below. Independently read the source,
existing monitor/graph, diagnostic scripts, authored browser assertions, logs and
JSON; recomputed layout/formula/sampling observations and viewed the two pinned
390 px PNGs from disk. No browser or CUA/native UI tool was used and no broad
runtime suite was rerun by this validator. Runtime results were executed by the
implementation/orchestration agents, with independent inspection here rather
than acceptance based only on their summaries.

The baseline contains **8 synthetic UI cases**: the active badge is obscured with
header and planner open at both 1440 and 390 px, and unavailable STALL is hidden.
The final **16 synthetic cases** span 1440/812/390/320 px with header/planner on/off;
all recorded badges are unobscured, inside bounds and below a visible measured
header. N/A is visible and labeled `STALL N/A`. These are layout-only fixtures,
not native onset evidence.

The separate actual-application Chrome 156.0.8078.80 run completes **5 groups**:
real native signal, visible STALL, default mute, S-enabled original 450 Hz graph,
Pause cancellation, and recorded-positive Review with actual map/planner/header.
The exact recorded native-positive frame remains active/unobscured at 1440 and
390 px. The audio regression additionally records **20 offline waveform cases**
and actual native AP-disconnect edges. Audio uses a silent sink: software graph
and automation are observed, not physical speaker output or human audibility.
Scenery pixels are fixtures; native states are not replaced with synthetic ones.

## Criterion matrix

| R-ALERT-1 affected criterion | Expected versus observed evidence | Outcome |
| --- | --- | --- |
| Active and unavailable cues are distinct | `STALL !` / `TERRAIN !` and explicit N/A use text and accessible status, while clear cues may collapse. Source and final synthetic fixture show visible N/A; actual-app assertions show clear panel hidden and genuine positive STALL visible. | pass |
| Measured placement and nonmodal stacking | Active/unavailable cues remain inside supported narrow layouts and above nonmodal panels, below the measured header where space permits. Recomputed all 16 final synthetic bounds/header/stacking records; both actual recorded-positive layout records are unobscured. Pinned narrow images were visually inspected. | pass for exercised sizes |
| Read-only presentation and lifecycle | Lights do not intercept input or write flight state. Source retains pointer-events none, imports only warning types, measures DOM bounds and disconnects resize/mutation/window listeners on dispose. Actual paused/Review tests compare step/digest/full native final state. | pass within source/test scope |
| Native signal correspondence | Existing airborne monitor follows finite nonnegative native signal greater than zero and suppresses contact; unavailable data does not fabricate a stall. Six existing-WASM diagnostic maneuvers retain all 13 native fields and report zero formula error; independent recomputation over saved samples also gives zero. Actual-app positive/contact cases exercise presentation wiring. | pass as existing-model correspondence, not aircraft calibration |
| Default mute, enable and cancellation | Positive native warning stays silent by default; S enables the connected stall oscillator/gain while live, and explicit Pause cancels it. Browser assertions and preserved native-chain artifact show running context, actual positive airborne native signal, active badge and gain target 0.075 on the original 450 Hz path. | pass for software path |
| Review semantics and isolation | Recompute from selected recorded telemetry, label REVIEW, emit no warning sound and preserve paused native state. Test selects the exact recorded positive frame; both layout records show active Review; completed assertions compare native snapshots and verify no added positive schedules. | pass |
| Existing audio regression | Original stall/terrain/disconnect envelopes remain bounded and lifecycle-gated. Inspected 20 offline PCM cases plus actual AP edges: no default context, one cue per audible edge, mute/unmute no backlog and one reused context. | pass for exercised software regression |
| Weak-power climb timing and intermittent report | Establish whether the user's maneuver produces timely native warning and whether actual worker/UI/audio publication loses it. Current diagnostics show both warning-positive and warning-negative climb-loss cases, plus an 83.33 ms pulse with ideal 10× phase misses. They do not trace that pulse through real worker publication/presenter scheduling or identify the user's maneuver. | blocked: exact user case and end-to-end timing evidence missing |
| Physical horn, broader targets and fidelity | Physical output device/listening, VS Code embedded browser, other engines/devices, installed C172S warning calibration and aerodynamic stall/performance acceptance need separate evidence. | not evaluated |
| Complete requirement and release gates | This bounded review does not renew every terrain-policy/reference case, full CI/publication or the cross-provider peer gate. | not evaluated; peer pending |

## Climb diagnosis and remaining uncertainty

The separate unchanged-WASM climb study currently contains **24 cases**. This
supersedes the earlier 15-case subset; its former 1.708 s minimum positive window
is not the minimum of the expanded study. Independently recomputed current
formula-error maximum: zero. The near-onset heading-held `-0.4566` input has a
positive interval from native step 1348 through 1357: **10 steps / 83.333 ms** at
1/120 s. Its ideal 10× publication grid has misses in **10 of 20 phases**, while
the listed 1×/1.5×/2×/5× grids capture that window in every phase.

These grids are analytical resampling, not observed real worker packets or RAF
delivery. They identify a plausible sampling risk, not proof that it caused this
user's report. Some heading-held manual-pitch cases warn while climbing; the VS
case can lose positive climb before the existing model warning turns on. Other
manual cases roll off or lose climb without crossing the warning threshold.
None establishes the user's event, actual aerodynamic stall onset, installed horn
timing or an appropriate replacement threshold. Static CL table components in
the diagnostic omit dynamic/elevator/flap/ground-effect terms and are not native
total lift. No fixed airspeed or new AoA threshold is accepted by this review.

Preserved unsuccessful observations matter: retained-trim manual pull did not
reliably reach warning, and an earlier positive warning cleared before Pause/layout
inspection. The final test therefore uses an explicitly declared stress maneuver
for native wiring and its exact recorded positive frame for stable Review layout;
it does not lengthen or inject a live warning. These changes to evidence capture
do not resolve the user's warning timing complaint.

No blocking defect was found in the bounded UI repair. Required follow-up is the
actual worker/presenter/audio sampling trace and a reproducible user-relevant
climb/configuration before accepting a timing repair. Root owns shared task
status, full-unit/build/CI records and any subsequent implementation phase.

## Source and artifact identities

SHA-256 packet identity for the ordered table (path, NUL, hash, newline):
`93a915407f8be73caa8a8323d38f44bd29a4c271509af28467f04de7c358d526`. Phase-one copies preserve the inspected browser bytes. These pins
identify this bounded review; later event/sampling or other affected changes
require renewed review and do not inherit this acceptance.

| Path | SHA-256 |
| --- | --- |
| `docs/SPEC.md` | `28092e30256f93c05f07ec10d85ea948ab57c8974580def4cbe524b594289c77` |
| `docs/input/2026-11-05-stall-warning.md` | `b59c7bf35ce56666d1349e40e42104fa0ccd856af87b453f33749d659536c498` |
| `docs/input/2026-11-05-stall-warning-climb.md` | `becd1e26f25021bb79dd1dfddc904650b7aee1d5fd8ae5696a2e0710e9eaafda` |
| `docs/research/2026-11-05-stall-warning-reference.md` | `d2cc68a450b123e9152f2a132f9e14e5fa152dbd8f39d7f737e6d1bbbf30f0e1` |
| `app/src/flight-warnings-panel.ts` | `634da28e51d3cab1327062ae10507bd87f1b99102f7365bb804d34f5cba61f0f` |
| `app/src/flight-warnings-panel.css` | `e2c8a4b660443fd007de1d7c0efb5afca137fce738bcb991d2091ffd5d75472c` |
| `app/src/flight-warnings.ts` | `9717176757e048e887fd93fbd25836a89804eb49c3cea0929454be09d2782656` |
| `app/src/engine-audio.ts` | `7c5bd9ef40746aa710af73b1b3ed1c6154276324a8aca31fffec26992496202d` |
| `app/tests/flight-warnings.browser.mjs` | `41dc3478f9a377dc6cd052b909356301eeeb127497f507a6c25e010d40421ec7` |
| `app/tests/flight-warnings-audio.browser.mjs` | `d806ab4fe7af7fcfdad10c9f537c8c5a865d1ea374c20f40aa52c73ca78cd172` |
| `studies/e1-browser/sim/bridge.cpp` | `ff6ef9f8a6cd5807e3ecaa277bd81297493e42b70a34dfe0f78ea9dfe817453a` |
| `studies/e1-browser/sim/worker.js` | `de07cd3e9f06c1ac6fea24a21a7187784dc48d5c6ff0b732889c8655bcea2e3d` |
| `studies/e1-browser/sim/dist/jsbsim.wasm` | `4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392` |
| `studies/e1-browser/sim/stall-warning-native-diagnostic.mjs` | `60986cc82f0017f25b484275d0e39bdafa53af8d96bc3c877381e605da22be20` |
| `studies/e1-browser/sim/stall-warning-climb-diagnostic.mjs` | `d708c769c925614e8378363916bab0c65d28576fd9a72fe88894167917a33883` |
| `output/flight/stall-warning-native-diagnostic.json` | `c1bbe86309ef16d82b12167d965d6b035eb182cbfab292871f418753fed25217` |
| `output/flight/stall-warning-native-task132-climb-24.json` | `2983c1530a7e2d30ebd1fca25d20304cc08072ffa033222056a0aa2ba656ec7f` |
| `output/flight/stall-warning-native-task132-climb-24.log` | `3d40d1a06c42921187a2370533f298dfe0da7c2ed651ee32a40f5142e8916aad` |
| `output/flight/flight-warning-task132-baseline-layout.json` | `1642fd54184b9169cb801e095949d4bb30a34594968f0a6dc927baf1a1cae531` |
| `output/flight/task132-phase1-layout.json` | `c200af6d82188ce7b592a1605d7745cdce9521e6dcfc2350227354d0bb2a6884` |
| `output/flight/task132-phase1-warning-browser.json` | `e95d86a7b761e2b00c42a87257c7b312fb7c6e71f29202e9b7ebc9542f457ad9` |
| `output/flight/task132-phase1-audio-browser.json` | `aa43cc60a1611a53ba476d47186574ca5483fd9ecc833513db90fd2923173774` |
| `output/flight/task132-phase1-native-chain.json` | `5c08665bf6f27da572646e0cb72f68ab1de841aebbebadb10b942a5198979876` |
| `output/flight/flight-warning-task132-native-ui-audio.log` | `d6e935bd0d49f04c2ade63122ea135e6babb7af0af7a41345bc475d99bc5d5c2` |
| `output/flight/flight-warning-task132-audio.log` | `13083dc57a9ba4451d69f0b0753903a408f6da7785b9b6c0d92c7a3095d32d8f` |
| `output/flight/flight-warning-task132-retained-trim-attempt.json` | `4c2cea149b6bbac6237384ff4b1c809660ef63f525535d29d2014a2643fcb61a` |
| `output/flight/flight-warning-task132-brief-warning-cleared-at-pause.json` | `18382afd59ee571f0318ad421e0e5422596170a59d3407ef76db705416531778` |
| `output/flight/flight-warning-task132-candidate-stacking-390.png` | `dc2e2af99fe0100d65ea1b9c6ac67b96e205a4b9da4ec00bc7779e7e31970dc6` |
| `output/flight/flight-warning-panel-mobile.png` | `fc20152dc4457c49275572f6ea9f993a2433604a6a843e3b7ad62dae1b3db5f5` |
