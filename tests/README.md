# Simulator and module checks

`just test-training` runs the offline TypeScript tests beside the assessment
airspeed mapper and repository-data adapter in
[packages/training](../packages/training/README.md), using Node.js 24.2+ built-in
TypeScript support. They cover the bounded
[AA1–AA6 contract](../docs/design/ASSESSMENT-AIRSPEED.md), not a running simulator.
The shared `just ci` gate reports this suite separately from assurance tests.
`just check` remains the structural repository check.

For the selected stack, add independent unit/frame and reference-dynamics
fixtures, input/avionics state tests, deterministic replay, numerical bounds,
browser interactions/accessibility and requirement acceptance cases as needed.
These broader checks are not implemented by the mapping module tests.

Name cases by their requirement IDs. Fix tolerances and applicable configuration
before execution; keep independent validation cases separate from calibration.
Store observed evidence in [RESULTS](../docs/RESULTS.md) using [EVAL](../docs/EVAL.md).
