# E1 browser check: JSBSim WASM worker (`sim/`)

Status: implemented and run once in the cloud container (2026-11-01).
**Preliminary evidence only** (headless Chromium, Intel Xeon container CPU, not the
reference M1/Chrome). Not reviewed. Implements the worker side of the
[shared message contract v0](../README.md#shared-worker-message-contract-v0).

## Files

| File | Purpose |
| --- | --- |
| [build.sh](build.sh) | Reproducible build: emsdk 6.0.13, JSBSim `v1.3.3` at commit `66f7fafc07fe13e7ede9db20873030fed2881713`, `-O2 -fwasm-exceptions`, modularized ES module (`createJSBSim`), only the c172x data files embedded under `/jsbsim` in MEMFS. Writes `dist/` (gitignored): `jsbsim.mjs`, `jsbsim.wasm`, `build-info.json` |
| [bridge.cpp](bridge.cpp) | C exports `gf_init`, `gf_set_inputs`, `gf_step`, `gf_state`, `gf_digest_hex`, trim getters; SI conversion of JSBSim ft/kt done once here; non-finite/out-of-range input rejected |
| [worker.js](worker.js) | Module worker implementing contract v0 (fixed dt, wall-clock pacing, catch-up, missed steps, inputs at step, latest state at `state_hz`, `step_cost_us`, `ready.build`) |
| [sim.html](sim.html), [sim.js](sim.js) | Benchmark page; results on the page and in `window.__results` |
| [run-headless.mjs](run-headless.mjs) | Serves this directory on 127.0.0.1 with COOP/COEP (cross-origin isolation, 5 us timer resolution), runs `sim.html` in headless Chromium (Playwright), prints JSON |

Embedded data (study only, not shipped): `aircraft/c172x/c172x.xml`,
`aircraft/c172x/c172ap.xml`, `engine/eng_io320.xml`, `engine/prop_75in2f.xml`,
`systems/GNCUtilities.xml`, `systems/Autopilot.xml`.

## Commands

```sh
# from the repository root; WORK = scratch directory outside the repository
studies/e1-browser/sim/build.sh "$WORK"          # clones emsdk + JSBSim into WORK if absent
# reuse existing checkouts instead: E1_EMSDK=... JSBSIM_SRC=... JSBSIM_BUILD=... build.sh
node studies/e1-browser/sim/run-headless.mjs --seconds 30 --live 10 > results.json
```

A full build from scratch takes a few minutes (library about 50 s on 4 vCPU);
relinking the bridge takes about 20 s. Interactive use: serve the directory with
any static server (COOP/COEP recommended) and open `sim.html?seconds=30&live=10`.

## Contract interpretation

- `state.step` = completed fixed steps since init; `t_s` is JSBSim's simulation time.
- `input.step = s` is applied immediately before the step from `s` to `s + 1`;
  first visible in a state with `step >= s + 1`. An input arriving after `s` is
  applied before the next step and counted as late. Later inputs for the same step win.
- `wall_ms` = sender's `performance.timeOrigin + performance.now()`, comparable
  between page and worker. `last_input_wall_ms` is that of the last applied input.
- Pacing: the wall clock decides how many steps are due; at most 12 steps (100 ms)
  run per tick. A deficit beyond that is counted in `missed_steps` and dropped from
  the schedule: simulation time slips, no integration step is skipped, so replay
  stays step-indexed. States post on a fixed `1/state_hz` cadence, latest only.
- Control mapping: `elevator`, `aileron`, `rudder`, `throttle` → JSBSim
  `fcs/*-cmd-norm`, with JSBSim sign conventions (not verified against a real rig).
- `init` also runs JSBSim's longitudinal trim (mode 0) so neutral elevator holds
  roughly level flight; the trim result goes to `fcs/pitch-trim-cmd-norm`, and the
  page's throttle input replaces the trim throttle. **Not in contract v0.**
- Benchmark-only extensions (proposed, not in v0): `ready.trim`, `run.until_step`,
  `{type:"stats"}` request/reply (also sent after `stop`), `{type:"burst"}`.

## Benchmark method

IC (fixture, not a navigation source): about EDFE, 49.9614 N 8.6428 E, 1000 m MSL,
true heading 0, 46 m/s TAS, dt 1/120 s, `state_hz` 60. Scripted log: one input per
0.25 s (exact binary fractions): elevator pulses up to ±0.0625, aileron
−0.109375 ± 0.03125 (the bias roughly cancels the model's roll-off at this IC; a
fixture choice, not aircraft data), short rudder pulses, throttle 0.6875/0.75.

- Runs **A** and **B**: fresh worker each, whole log posted before `run`, stop at
  step 3600 (`until_step`). Measures per-step cost (set-inputs + `Run()` + state
  read, `performance.now()` in the worker), missed steps, late inputs, digest.
- Run **L** (live, 10 s): same values sent at their wall time plus a deterministic
  0-25 ms phase jitter, with `step` = latest received state step (so applied at the
  next step, counted late by design). Latency = page receive time of the first state
  with `last_input_wall_ms >= wall_ms` minus `wall_ms` (excludes the render frame).
- **Burst**: fresh worker, 5 × 2400 steps back to back without timer sleeps.
- Digest: FNV-1a 64 over 14 post-step state doubles (time, position, attitude,
  TAS, body velocities and rates) at every step.

## Results (preliminary, 2026-11-01, cloud container)

Environment: Intel Xeon @ 2.80 GHz, 4 vCPU (KVM), Linux 6.18; Playwright 1.63.0,
headless Chromium 153.0.8010.12, cross-origin isolated; Node 22.23.4 for the
runner. Build: emcc 6.0.13, `jsbsim.wasm` 1 728 736 bytes (495 328 gzip -9),
SHA-256 `ec4a73ec...cb78a4`. Two complete `run-headless.mjs --seconds 30 --live 10` runs:

| Measure | Run 1 | Run 2 | Proposed budget (reference Mac) |
| --- | --- | --- | --- |
| Paced step cost p50 / p99 (A) | 210 / 485 us | 215 / 505 us | p99 ≤ 830 us |
| Paced step cost p99 (B) | 435 us | 550 us | |
| Max single step (A, B, L) | 3.6, 6.0, 8.6 ms | 4.3, 2.7, 12.0 ms | |
| Unpaced burst, last of 5 blocks | 25.0 us/step | 23.5 us/step | |
| Missed steps A / B / L | 0 / 0 / 0 | 0 / 0 / 0 | ≤ 1 per 10 s |
| Input-to-state latency p50 / p95 / max (L, 40 inputs) | 10.5 / 20.1 / 21.2 ms | 9.2 / 18.8 / 21.0 ms | p95 ≤ 25 ms |
| State interval p50 / p95 (A) | 16.7 / 20.6 ms | 16.5 / 20.6 ms | |
| Digest A = B (3600 steps) | `7c8783f3440f387a` both | `7c8783f3440f387a` both | identical |
| Worker ready (load + init + trim) | about 0.2 s | about 0.2 s | |

The same digest was produced by an earlier full run during development
(separate browser sessions, same build). Trim at the IC succeeded (throttle 0.693,
pitch trim 0.168). Final state after 30 s: 1008 m MSL, TAS 46.3 m/s.

Observations:

- Paced step cost (about 210-250 us) is roughly 10× the unpaced burst cost
  (about 24 us). In an ad hoc probe, a step after an 8 ms timer sleep cost about
  200 us while back-to-back steps cost about 26 us: the paced figure is dominated by
  post-idle wake effects (cache/vCPU) in this container, not WASM compute. The
  reference Mac may behave differently; measure both there.
- WASM warm-up: the first 2400-step block costs about 75 us/step (tier-up), later
  blocks about 24 us/step.
- An earlier development run (before the fixed state cadence and jitter) showed
  one 63 ms step and 26 missed steps in run L; not reproduced in later runs.
  Isolated multi-millisecond steps occur (max column); cause not determined
  (likely GC or VM scheduling).

## Limitations

- Container/headless numbers are not reference-platform evidence; no rendering
  load was present on the main thread (see `../render/`).
- Determinism is shown within one build on one platform only; WASM vs native and
  cross-CPU identity do not hold ([prior study](../../e1-jsbsim/README.md)).
- Latency excludes main-thread render delay and input-device latency.
- `alt_msl_m` is JSBSim `position/h-sl-ft` converted to m; geodetic/MSL datum
  details and JSBSim's default flat sea-level terrain are not checked against EDFE.
- `step_cost_us` in each `state` is the last step only; percentiles come from the
  `stats` extension.
- The engine is started by `propulsion/set-running`; no ground start, mixture or
  magneto procedure is modelled at this boundary.

## Licence notes

JSBSim is LGPL-2.1-or-later (repository `COPYING`); it is statically linked into
`jsbsim.wasm`, which is a build output and not committed or distributed. The c172x
aircraft data (declares an unversioned "GPL", "not to be sold") and the unmarked
engine/system files are used only for this study, embedded in the local build,
and are not shipped; their compatibility with GPL-3.0-or-later remains open
(GAPS Q5 review, see the [prior study](../../e1-jsbsim/README.md)). The model is a
generic 1982 172P, not the selected 172S/FR172; no number here is aircraft-performance evidence.
