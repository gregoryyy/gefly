# Procedural engine audio: model basis and browser lifecycle

Researched by Codex housekeeping agent on 2026-11-02. This is an original sound-design approximation driven by simulator telemetry, not a recording or calibrated acoustic model of an identified aircraft installation.

## Pinned model facts and derived rates

The active [JSBSim v1.3.3 c172x model](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml) selects `eng_io320` and `prop_75in2f`. The generic airframe header identifies a 1982 C172P; this does not validate the project's selected 172S or establish an exact installed engine subtype.

The [engine XML](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/engine/eng_io320.xml) declares `cycles=4`, nominal maximum RPM 2700 and no cylinder-count override. [FGPiston.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGPiston.cpp) defaults to four cylinders. The XML's IO320 name and its comment describing no injection are inconsistent; the filename alone is not installation evidence. Engine XML SHA-256: `0cedc1e356a7a572a175f351a4abb952ba91081219a37dc7192bce3a2181d8c6`.

The [propeller XML](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/engine/prop_75in2f.xml) specifies two blades, a 75-inch diameter and equal minimum/maximum pitch. No gear-ratio override appears. [FGPropeller.cpp](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/src/models/propulsion/FGPropeller.cpp) defaults the ratio to 1.0, so this model couples engine and propeller revolutions directly. Propeller XML SHA-256: `6481edf1da940fdea5358913d226c3e25d3e6b8209b4805370258a9a65ca7403`.

For an evenly firing four-cylinder, four-stroke approximation, four combustion events occur per two crankshaft revolutions. Its event frequency is therefore `RPM × 4 / 2 / 60 = RPM / 30 Hz`. Two blades at the model's 1:1 ratio also give `RPM × 2 / 60 = RPM / 30 Hz` blade-pass frequency. These are arithmetic rate references, not a measured sound spectrum. Harmonic balance, filtering, noise, gain and response smoothing are sound-design choices; do not describe them as sourced aircraft coefficients or real sound-pressure levels.

For comparison only, [Lycoming's O-320 operator manual](https://www.lycoming.com/sites/default/files/attachments/O-320%2520Operator%2520Manual%252060297-30.pdf) identifies that engine family as four-cylinder and direct-drive. It does not resolve the generic XML naming inconsistency or prove the simulator matches a particular aircraft installation. No manual or sample audio is redistributed.

## Web Audio lifecycle

The [W3C Web Audio API 1.1 working draft](https://www.w3.org/TR/webaudio-1.1/#AudioContext) defines browser-controlled permission to start audio; a context can remain suspended until allowed. Creating contexts consumes resources, so reuse one graph/context. `resume()` is asynchronous and may remain pending when activation is unavailable. `suspend()` pauses processing while permitting a later resume; `close()` releases resources and prevents reuse. A resolved or pending request must not be confused with an actually running context. The API is a working draft, not a guarantee of identical browser behavior.

[Chrome's official autoplay policy](https://developer.chrome.com/blog/autoplay#web-audio) explains user interaction requirements for Web Audio and recommends creating or resuming the context from a user action. The application should offer a clear enable/mute action, inspect actual context state and handle unavailable/rejected audio without preventing flight. Do not test by disabling autoplay policy and then claim ordinary activation behavior is covered.

## Integration scope

Drive pitch and intensity from actual finite engine telemetry, including selected recorded telemetry during Review playback. A paused flight or paused Review must be silent; loading/reset, missing telemetry and disposal must not retain the last audible motor indefinitely. User volume/mute and browser suspension are separate from aircraft engine state. Exact startup, combustion failures, windmilling, cabin/exterior transfer, Doppler and airframe vibration are not validated by a harmonic synthesizer.

Use original generated signals only: no borrowed copyrighted recordings, microphone, permission prompt, extra runtime network source or physics input. Audio output timing and randomness must stay outside deterministic worker state and its digest. Verification should distinguish numerical waveform/render tests, browser graph/activation checks and human listening; none alone establishes calibrated aircraft acoustics.
