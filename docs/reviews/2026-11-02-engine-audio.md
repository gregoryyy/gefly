# Telemetry-driven procedural engine audio

Scope: TODO 2.0.27, R-AUDIO-1/R-REVIEW-1. Base: f857801 (PR #44 merge;
source tree identical to the checked 2f70c8d base).
Authors: Codex orchestrator on integration/shared records; fov_input/code1 on
synthesis/parameters/tests; engine_sound_ui/code2 on controls/browser coverage;
fov_housekeeping on parallel exact input and primary-source research.
Independent quality: fov_housekeeping on code, excluding its research/input;
fov_input on root integration/UI, excluding its synthesis/parameters. Independent
validation: trim_validate, no implementation authored.

Implementation SHA-256:
`60e3f9ddad2149e8f61d3b0ef3e2ebf304b685eb5c50cc2fb0c54a87ada7476d`.
Sorted paths use path + NUL + bytes + NUL; shared prose excluded:

app/package.json, app/src/audio-controls.css, app/src/audio-controls.ts, app/src/engine-audio-parameters.test.ts, app/src/engine-audio-parameters.ts, app/src/engine-audio.ts, app/src/main.ts, app/tests/engine-audio.browser.mjs.

## Independent quality

Both scoped reviewers pass without remaining findings. Four native parameter
groups cover actual RPM/firing/blade passage, MAP/fuel shaping, stopped/malformed
state and extreme finite bounded gains/frequencies. Pitch never substitutes a
requested throttle for actual propeller velocity. Fuel cutoff removes exhaust
combustion; actual propeller rotation can retain mechanical/airflow layers.

One fixed original graph layers a periodic exhaust pulse, mechanical triangle
rumble and seeded filtered broadband blade-pass modulation through controlled
gains/compression. Signals and target changes are smoothed; no physics/input,
worker, trace or network state is changed. Context creation happens only from
trusted user activation. Unsupported/blocked audio remains a visible status and
does not stop flight. One successful live graph is reused across mute/pause,
Review and flight reset; failure retries close discarded contexts first.

Resolved P2: partial graph-construction failure retained an allocated context
with no graph and made retry permanently fail. Candidate close/discard and
serialized unlock now clean up before retry. The actual native-browser failure
fixture throws createGain once, observes the failed context close, retries into
a running graph and verifies disposal. Pending resume completion obeys current
pause/mute/disposed state.

Resolved P2: a focused quick-mute button initially let flight shortcuts reach
main. Keyboard propagation now isolates letters/arrows while preserving native
Tab/Space/Enter and keyup release. UI click/input also reject synthetic activation.
Actual browser tests verify no synthetic context/preference changes and no
flight control/restart/Review/AP changes from focused sound-button shortcuts.

## Browser and independent validation

Author Chrome coverage passes seven groups: real graph activation, live signal,
actual RPM tracking, mute/pause/volume and recorded Review; exact shared offline
graph signal/harmonics/headroom and silence; hidden-policy/reset gates;
unsupported/rejected activation with flight still running; native partial-graph
failure/retry/dispose; and compact controls on 390×568/844 without added header
rows, external requests or flight workers. Review/mute controls preserve actual
full 14-value physics state, step and digest.

trim_validate independently recomputed the final hash and checked actual Chrome
signals. Live analyser RMS .0238 / peak .0488 is nonzero. Selected captured Review
RPM drives frequency targets 69.1194/34.5597/69.1194 Hz. Mute/volume/pause, seek,
handbook and Review exit gates pass, with unchanged physical state/step/digest
and reused graph. A fresh unsupported-API page continues flying. Mobile quick
mute remains visible and operable; its screenshot was inspected.

The exact exported runtime graph also renders through native OfflineAudioContext:
2400 RPM produces an 80 Hz fundamental with multiple harmonics; independent
100% volume peak .2576 is below clipping. Paused/stopped/missing cases have
exact zero RMS, while cutoff exhaust is zero and windmill layers remain nonzero.
The author max-volume 2700 RPM test peaks at .288. Different MAP/fuel conditions
mean the runtime/live and fixed offline renders have different amplitudes.
Independent reviewer inspected author failure/retry/disposal evidence rather
than claiming a second execution of those fixtures.

Evidence under output/flight: engine-audio-browser.json, audio-independent.json,
engine-audio-idle.wav, engine-audio-cruise.wav and UI/mobile screenshots. WAVs are
original 2-second/48 kHz shared-graph previews, disposable test outputs rather
than microphone or flight recordings. Reproduce with
`node app/tests/engine-audio.browser.mjs` after building the local runtime.

## Integrated checks and limits

Native app suite passes 122 tests plus five Python aircraft-adapter tests;
TypeScript passes. Existing Review (four groups), engine (nine groups) and layout
(nine viewports/portal/Review cases) regressions pass. Shared `just ci` passed: 122 app native tests, five Python adapter tests,
TypeScript/UI build, 84 assurance tests and 11 assessment tests plus repository/
study/render gates. Optional JSBSim cases remain explicit skips (9 of 23), and
the Linux-only fixture is not Mac runtime evidence. Final foundation/assurance
integrity and lineage diff were checked for publication.

[Primary-source note](../research/2026-11-02-engine-audio.md) identifies the
pinned generic four-cylinder/four-stroke and two-blade/direct-drive basis and
Web Audio activation/lifecycle sources. Timbre/gain/filter choices are original
sound design, not installed-aircraft acoustic calibration. No audio samples,
microphone access, external fetches or runtime dependencies are introduced.
Actual OS backgrounding and subjective listening on physical speakers/headphones
were not independently evaluated; hidden-document behavior is verified at the
visibility-policy handler boundary. Safari/hardware audio acceptance and calibrated
engine acoustics remain outside this increment. Review synthesizes selected
recorded states; it does not replay a recorded waveform. Cross-provider peer
remains pending under the existing batched cadence.
