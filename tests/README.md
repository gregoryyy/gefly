# Future simulator checks

The current structural check is `just check`; it does not test a simulator.
When the stack is selected, add independent unit/frame and reference-dynamics
fixtures, input/avionics state tests, deterministic replay, numerical bounds,
browser interactions/accessibility and requirement acceptance cases as needed.

Name cases by their requirement IDs. Fix tolerances and applicable configuration
before execution; keep independent validation cases separate from calibration.
Store observed evidence in [RESULTS](../docs/RESULTS.md) using [EVAL](../docs/EVAL.md).
