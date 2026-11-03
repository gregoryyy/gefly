# Flight warning cues review

Independent reviewer: Codex subagent `flight_warning_quality`, 2026-11-03,
Europe/Berlin. The reviewer authored no product code or maintained tests in this
increment. Scope: R-ALERT-1 and affected audio/UI integration against main
`a655bc9`. This is same-provider quality and specification validation;
cross-provider peer remains pending under the batched cadence.

## Quality findings

Quality: **pass with no remaining blocking finding**. Specification validation:
**pass for the bounded R-ALERT-1 criteria below**, at the frozen working-tree
snapshot identified by the hashes below.

- **Medium, repaired during integration:** the initial repeated-frame cache
  required both stall and terrain availability. With missing stall telemetry, a
  valid terrain warning in its exit-only hysteresis band could clear when the
  same frame was rendered again. The orchestrator identified this defect; code1
  separated the temporal terrain cache from the stateless stall indication.
  Independent review and the expanded pure tests confirm repeated partial frames
  retain terrain state and same-frame stall validity changes remain independent.
- **Low, repaired test harness:** review identified output paths relative to the
  caller's working directory and an immediate assertion against a
  requestAnimationFrame-updated Review label. The UI harness now derives its
  output location from `import.meta.url` and awaits the rendered Review state.
  Neither repair changed flight behavior.
- The actual-worker audio harness was expanded following review to exercise
  explicit P disconnect as well as raw-rudder automatic disconnect. The
  independent run passes both.
- **Low, acceptance observation repaired and rerun:** the first independent UI
  run observed positive native stall telemetry, then timed out polling the
  current STALL indication. That run lacked status history to distinguish a
  missed brief episode from a never-rendered indication. The revised harness
  records actual DOM status changes with a MutationObserver and requires a
  displayed active episode; a never-active panel still fails. The independent
  rerun observed matching positive native telemetry and a displayed STALL
  episode. Earlier author runs also established
  that keyboard-only pull, and a stronger pull without nose-up trim, did not
  reliably reach the native warning signal. The final maneuver uses existing
  idle, trim, yoke and keyboard controls as a stress fixture, not as an aircraft
  operating procedure or limit. Physics and warning thresholds were not tuned
  to make the fixture pass.
- **Medium, documentation corrected:** the added altitude worked example
  initially instructed an unconditional final ARM press. Existing
  `kap140.js` automatically arms on altitude selection while engaged, and ARM
  toggles that state; the extra press could cancel capture. Independent review
  returned this finding. The README now says to check ALT ARM and press ARM only
  when absent, and explains auto-arming and the toggle in its general paragraph.
  The original explanation record remains historical with a separate immutable
  correction. Source inspection and the existing eight KAP pure tests support
  the corrected ALT/VS, UP/DN-display, selector/arming and current-altitude
  semantics. This is a documentation correction, not new autopilot behavior or
  installed-equipment acceptance.

The native bridge reads `systems/stall-warn-norm`, local CG AGL and NED down
velocity, converting the latter two to SI at the native boundary. The pinned
local JSBSim source binds the stall property to `FGAerodynamics::GetStallWarn`.
The new monitor consumes those read-only fields and never writes physics or
pilot commands. Terrain closure includes consecutive actual-frame clearance
loss, with finite checks, discontinuity reset and independent missing-data
states. It is not a forward terrain scan, obstacle detector or landing-mode
classifier. The specified thresholds are simulator cue choices, not aircraft
operating limits.

Live monitoring occurs on actual worker state messages. Review uses a separate
monitor and floor-selected captured samples; its annunciators are explicitly
recomputed cues, not recorded annunciator history. Non-color active/unavailable
text and status accessibility are present; the panel does not capture pointer
input. New audio uses three fixed oscillators in the existing context/master,
with bounded one-shot schedules, cancellation and disposal. Its explicit live
flag excludes all Review modes while preserving the existing Review engine
audio path. Existing mute, volume, gesture and running/lifecycle gates remain
authoritative.

## Independently executed evidence

| Check | Result and scope |
| --- | --- |
| `node --experimental-strip-types --test app/src/flight-warnings.test.ts app/src/flight-warning-audio-events.test.ts` | **13/13 pass, zero skips**, after the cache repair. Native-signal semantics, generic policy boundaries/hysteresis, shallow descent versus rising terrain, contact, missing data, repeated/changed frames, resets/seeks/gaps and audio event suppression/edge coalescing. |
| `node app/tests/flight-warnings.browser.mjs` | **Pass on independent rerun**, four groups in Chrome 156.0.8078.80. Actual clear telemetry, pointer transparency, header clearance, paused Options/Review unchanged step/digest/state, native steep/shallow/contact cases and actual displayed STALL episode. Native hard preset: approximately 3 m AGL/4 m/s down. Displayed episode: `STALL !`, native warning 0.054967520559181526, airborne, matching worker identity. The stronger trim/pull stress fixture also captured warning 0.13570499224916044; these values are observations, not acceptance calibration or aircraft limits. |
| `node app/tests/flight-warnings-audio.browser.mjs` | **Pass**, 20 offline native Web Audio cases plus actual-worker P/manual and raw-rudder/automatic AP-disconnect paths. Steady 450 Hz stall, pulsed 650 Hz terrain, descending 1200/900/600 Hz disconnect, bounded peaks/tails, missing/clear data, same-frame coalescing, pause/mute/Review/seek/disposal cancellation, default-off and one-context behavior. |
| `node app/tests/engine-audio.browser.mjs` | **Pass**, all 12 existing groups. Actual engine RPM/start/free coast and legacy Review, offline engine harmonics/airflow/whistle, native five-tone altitude alerter, contact/rolling, real-time wind, actual WASM wheel contact, visibility/reset, unavailable/retry/disposal and narrow controls remain intact. |
| `node --test studies/e1-browser/sim/kap140.test.mjs` | **8/8 pass, zero skips**, independently rerun for the altitude explanation. Source review confirms selection auto-arms, ARM toggles, ALT changes hold/VS, UP/DN first reveals a hidden VS page and subsequent presses change the rate. No KAP source changed. |

The orchestrator separately runs shared CI; that outcome is not presented as an
independently executed gate by this reviewer.

Independent output copies are under ignored `output/flight/`:
`independent-flight-warnings-browser.json`,
`independent-flight-warnings-audio-browser.json` and
`independent-flight-warnings-engine-audio-browser.json`. The mobile screenshot
was visually inspected: compact warning chips fit below the header and retain
non-color text; this run's image contains active STALL. Background scenery
pixels are controlled fixtures, not imagery-quality evidence. Native real-time
silent output and offline PCM verify synthesis; physical speakers and human
listening were not evaluated.

## Scoped specification validation

| R-ALERT-1 criterion | Expected / observed outcome |
| --- | --- |
| Native airborne stall signal, contact suppression, clear/unavailable distinction | **Pass** for source correspondence, pure invalid/contact cases and actual native/UI stall/contact evidence. |
| Local AGL closure policy, hysteresis, shallow descent, rising terrain, invalid data and frame continuity | **Pass** for pure boundaries and repaired partial-availability repeated frames; actual steep/shallow/contact presentation passes. Rising-terrain derivative cases are synthetic monitor inputs, not a terrain survey or flight-model validation. |
| Read-only compact accessible panel, live/Review separation and paused physics invariance | **Pass** for source/accessibility inspection, actual integrated UI/Review, exact paused native state/digest invariance and inspected narrow layout. No screen-reader session was performed. |
| Distinct stall/terrain audio and exactly one actual manual/automatic AP-disconnect cue | **Pass** for pure event tests, offline waveform and actual-worker paths. |
| Default-off S/volume/gesture, lifecycle suppression, no initial/seek/unmute/resume backlog, bounded disposal | **Pass** for source/event, new waveform/native-worker and affected existing lifecycle regression checks. Physical speaker output and human listening are not evaluated. |
| Affected R-AP-1 altitude explanation | **Pass as documentation** after the auto-arm/toggle correction. Existing operating-state tests and unchanged panel/state-machine source support the example; no new aircraft-control or servo-performance acceptance. |
| Installed-aircraft warning calibration, forward TAWS/EGPWS/obstacle detection, landing recognition, training effectiveness/credit | **Not evaluated and not claimed**. |

## Reviewed snapshot

The final runtime/test packet has 11 paths. Its manifest SHA-256 is
`94d392ca5a81090e665b35a1cc602d9ac5e31a7f3ce37e9178628d3ee4bc20e8`;
this reviewer independently checked every listed file hash. The manifest is
sorted UTF-8 `path`, NUL, SHA-256 hex, newline, one record per file.

| Artifact | SHA-256 |
| --- | --- |
| `app/package.json` | `5ce17c8c86e1f9eef37623bee25c94c9bd4c875cda278da4ba7bc9cb26dc180e` |
| `app/src/engine-audio.ts` | `27a1f511d4b6ce0db727afe6f60bdfc2552345716b83dec6fe70fe095852a44c` |
| `app/src/flight-warning-audio-events.test.ts` | `0e52b0046b295b4d77c919db7322a45ab7d69bd864fb8b29e9450614906be902` |
| `app/src/flight-warning-audio-events.ts` | `33cef2379a91c602dd68a2c6d3e35389752b7096d93dba641b19232fc3626885` |
| `app/src/flight-warnings-panel.css` | `9d34d2a3659836d8a5370fc5f009289daacf82370fe171b07ff88bcbbb62412c` |
| `app/src/flight-warnings-panel.ts` | `5f14154433bcf75799384c54a7d38d8574b436e42f2131364881564757d25477` |
| `app/src/flight-warnings.test.ts` | `d3ef3b19f98020444033fd0229f05d3d070531b2cbb79b62a715b08fe6a01b0d` |
| `app/src/flight-warnings.ts` | `9717176757e048e887fd93fbd25836a89804eb49c3cea0929454be09d2782656` |
| `app/src/main.ts` | `cc0e3ff7855671108e2ad5736b08a63a829732b500194616a92298537b731157` |
| `app/tests/flight-warnings-audio.browser.mjs` | `bd8e97c333ad61644f8bd910d86dc2f2b40d4bf3f5dd54cac12ba2fad2e049f4` |
| `app/tests/flight-warnings.browser.mjs` | `6d2c1cd248975375ff004660485b19f5ab6b63ce004d1ff30041e4cfb7695d91` |

The unchanged legacy `app/tests/engine-audio.browser.mjs` used for the independent
regression has SHA-256
`dde991acc474979f12314ab2edd944986637df1600fdfae361b0d3d47f4880c5`.
The exact UTF-8 R-ALERT-1 SPEC table row, excluding its newline, has SHA-256
`25dbbf5cf015e71753b73836c94c173413f07697e753d2125697496128496c5a`.
The final inspected `app/README.md` has SHA-256
`ca8b2cd8cf5c2d5e8ee33423a7ffb6b618e8dc7c6c2aa28a9f50075381acf74d`.
The unchanged KAP source used to review its altitude clarification is
`studies/e1-browser/sim/kap140.js`, SHA-256
`0108c1fc419a4fb82ffe4a9ab67f84df342de8c008cab0d5011d9dbc4e6985a9`,
and `app/src/autopilot-panel.ts`, SHA-256
`2a5c3ab2c768db2ce7e11b6ae87de014357ff36856d1db7e353a03fea91b776b`.
The README, SEC and immutable warning/altitude records were inspected for
consistent scope and limitations. Shared status/publication records belong to the
orchestrator and are outside this runtime acceptance packet. Changed source or
criteria require affected re-review. Cross-provider peer remains **pending**;
this same-provider review does not satisfy that gate.
