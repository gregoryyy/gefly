# Native control-stability diagnosis

2026-11-05 17:38 Europe/Berlin. Author: OpenAI/Codex code1 subagent
`control_native`; independent quality/validation and cross-provider peer review
are separate. R-INPUT-1/R-SIM-5/R-REVIEW-1. Root owns the new task/status and
production integration. This note measures the existing generic c172x runtime,
not a calibrated C172S or a real-aircraft handling limit.

## Question and source boundary

The user reports excessive sensitivity, hands-off roll-off and oscillation.
The native test contrasts loading, fixed aileron offset, power and linked rudder
without changing the executing aircraft model. The pinned upstream
[c172x XML](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/66f7fafc07fe13e7ede9db20873030fed2881713/aircraft/c172x/c172x.xml)
describes a generic 1982 C172P and contains an 80 lb agricultural test pointmass
at structural y=144 in (12 ft right). Existing source loading includes it.
The current application also injects a constant −0.109375 normalized aileron
command when AP is off. Neither is ordinary passenger-flight trim.

The existing source uses longitudinal-only initialization trim. Its aileron
actuators have 0.005 rad hysteresis width and elevator 0.05 rad width;
[FGActuator](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/66f7fafc07fe13e7ede9db20873030fed2881713/src/models/flight_control/FGActuator.cpp)
retains output inside a half-width band after an input reversal. Returning a
command to zero can therefore leave a surface deflection. These are source
mechanisms, not established C172 installation characteristics.

Actual WASM SHA-256 is
`11a92abda742ade86d4153d314d37e7d5f63c42eb064999c840baff00c1063c7`.
Its existing build record instead identifies
`4fe24bfcd72c0bda718cf5f55d9eecddcbbc4fbe189ff42c8e18f2c29fb7d392`.
Source-to-binary build provenance remains unverified. This task does not rebuild,
replace or relabel that binary. Its measured loading/surface behavior is native
telemetry from the identified executing bytes.

## Native measurements

Run `node studies/e1-browser/sim/control-stability-native.mjs`. The 48 cases use
1/120 s steps, initial 396.24 m MSL, matched initial CAS 70/90/110 kt, clean flaps,
AP off, retained longitudinal trim, native default atmosphere, and up to 60 s
of unconstrained motion. Source loading is contrasted with the same stations
and fuel but external mass zero. Power is either initialization trim throttle
or full throttle; power/speed are allowed to evolve. Pulse cases command +0.1
or +0.45 aileron during t=5..7 s, with rudder zero or a 1:1 opposite-sign linked
command. Inputs/times are test fixtures, not aircraft coefficients or limits.
The first case repeats with exact native digest and final state equality.

Selected 90 kt initial-CAS results, with successful longitudinal trim:

| Loading / command | Bank at 7 s | Bank at 30 s | Observation |
| --- | ---: | ---: | --- |
| Source 80 lb external, zero aileron, trim power | +35.303° | unavailable | Diagnostic 100 m floor reached before 30 s |
| Source 80 lb external, −0.109375 offset, trim power | −3.950° | −15.959° | Constant correction overshoots into left roll |
| No external, zero aileron, trim power | +4.225° | +15.241° | Much smaller initial roll-off, residual drift remains |
| No external, zero aileron, full power | +9.809° | +35.383° | Retained trim is not equilibrium at changed power |
| No external, +0.1 pulse, rudder independent | +14.630° | +30.399° | Peak body roll rate 6.742°/s |
| No external, +0.1 pulse, 1:1 rudder link | +17.091° | +31.720° | Peak body roll rate 8.138°/s |

Removing the external mass changes initial nominal loading 2480→2400 lb and
lateral CG +0.107376→−0.010964 m; it also changes inertia and trim demands, so the
response cannot be attributed to mass alone. Keeping the old correction after
removing the payload is harmful: at 70 kt trim power it produces −28.491° bank
by 7 s. Removing the correction alone while retaining the payload is also
insufficient. The default-loading and neutral-command corrections belong together.

At 90 kt/no external mass, the +0.45 keyboard-sized pulse reaches 53.773° bank
at 7 s with rudder independent and 64.437° with the link. At 70/90 kt the +0.1
pulse leaves actual left/right ailerons at +0.0025/−0.0025 rad after its command
returns to zero, persisting to the final sample. This measured residual matches
the source hysteresis mechanism. It does not establish acceptable aircraft
backlash or warrant invented actuator coefficients.

All initial 110 kt cases report native trim status −1, including no external
mass. They remain in the artifact with that status and finite measured
trajectories. They are **not trimmed equilibrium stability evidence**. Failed
trim and retained actuator history remain model limitations beyond removing the
incorrect loading/default command. A recent regression versus an older verified
binary was not established; older verified binary bytes are unavailable here.

## Bounded change and worker regression

`loading.js` adds immutable `FLIGHT_DEFAULT_LOADING`, equal to retained
`DEFAULT_LOADING` except `external_kg: 0`; the declaration exports its type.
Legacy source defaults, station metadata and loading/continuation schema remain
unchanged. Root integrates this default into new flights and the loading panel,
and removes the old default fixed correction. No coefficients, artificial
restoring moment or rate damping are introduced by this code1 slice.

Run `node studies/e1-browser/sim/control-stability-worker.mjs` against that
integration. Five actual-worker/native cases pass: new airborne flight, new
runway flight, explicit normal loading, explicit/recorded legacy external
loading, and legacy continuation without loading telemetry. New flights omit
the external payload and start at step 0 with zero lateral command; recorded
legacy loading takes precedence over the new default and the missing-group
continuation preserves the former native source fallback. No exact hidden-state
checkpoint or physical model validation is inferred.

## Evidence retention and limits

The frozen final runs below were executed from the isolated worktree
`/private/tmp/gefly-control-stability`. Generated evidence remains local and
ignored; these are reproducible artifact
paths, not portable repository links. No browser or real-device handling trial
was run by this agent. These diagnostics measure command/model response and
legacy state compatibility, not training fidelity, operational speeds or a
guarantee of wings-level hands-off flight.

| Local artifact/source | SHA-256 |
| --- | --- |
| `studies/e1-browser/sim/control-stability-native.mjs` | `e70a92c23e1fd727c63335df8086cf6ba343f71f2d802be0e7ace6f7bf97c319` |
| `studies/e1-browser/sim/control-stability-worker.mjs` | `5ebbfdb6fc07c3b5cbab234dbb571f068c28b4041748e8a95c2a868e880873f9` |
| `studies/e1-browser/sim/loading.js` | `b36361f5d73f4681e987c6eaf52472e59df6fa404e03b4cc8dc13bcc179d7957` |
| `studies/e1-browser/sim/loading.d.ts` | `c5d351f96172687fc488b6c9ea79b2e100242a5af2814db93cb8ec236f5a177c` |
| `output/flight/control-stability-native.json` | `553efc5d7a4bf0d46c256e9a33b7ff4e97f96810cc800b58d263238f2ade35c0` |
| `output/flight/control-stability-worker.json` | `71fa9fd611cd807cb0cb7560d85fabd5a28fedaa284b0d08f64c6d5a7867fbb7` |
