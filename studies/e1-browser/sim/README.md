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
- Pacing: the wall clock decides how many steps are due (step n+1 due at
  t0 + (n+1)·dt). A step is **missed** when it starts more than one step period
  (8.3 ms) after its due time (contract budget definition). Reported alongside:
  `max_lag_steps` (due minus completed steps at a tick, before catch-up),
  `max_lag_ms` and `max_catchup_batch`. At most 12 steps (100 ms) run per tick; a
  larger deficit is counted in `dropped_steps` and dropped from the schedule
  (simulation time slips, no integration step is skipped, replay stays
  step-indexed). States post on a fixed `1/state_hz` cadence, latest only.
- `heading_rad` is **true** heading (JSBSim `attitude/psi-rad`).
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
  read, `performance.now()` in the worker), missed steps, lag, late inputs, digest.
- Run **L** (live, 10 s): same values sent at their wall time plus a deterministic
  0-25 ms phase jitter, with `step` = latest received state step, so it is applied
  at the next step. It counts as late only if the worker had already advanced past
  that step when it arrived (observed 18/40 and 21/40; late here is expected, not an error). Latency = page receive time of the first state
  with `last_input_wall_ms >= wall_ms` minus `wall_ms` (excludes the render frame).
- **Burst**: fresh worker, 5 × 2400 steps back to back without timer sleeps.
- Digest: FNV-1a 64 over 14 post-step state doubles (time, position, attitude,
  TAS, body velocities and rates) at every step; `final_state` in `stats` holds the
  same 14 doubles (bridge layout in [bridge.cpp](bridge.cpp)).

## Results (preliminary, 2026-11-01, cloud container)

Environment: Intel Xeon @ 2.80 GHz, 4 vCPU (KVM), Linux 6.18; Playwright 1.63.0,
headless Chromium 153.0.8010.12, cross-origin isolated; Node 22.23.4 for the
runner. Build: emcc 6.0.13, `jsbsim.wasm` 1 728 736 bytes (495 328 gzip -9),
SHA-256 `ec4a73ec...cb78a4`. Two complete `run-headless.mjs --seconds 30 --live 10`
runs after the 8.3 ms missed-step definition (quality review fix):

| Measure | Run 1 | Run 2 | Proposed budget (reference Mac) |
| --- | --- | --- | --- |
| Paced step cost p50 / p99 (A) | 245 / 525 us | 260 / 510 us | p99 ≤ 830 us |
| Paced step cost p99 (B) | 580 us | 660 us | |
| Paced step cost p99, independent 10 s rerun (quality review) | 905 us | | over budget; container too noisy for a pass |
| Max single step (A, B, L) | 12.4, 17.1, 7.5 ms | 6.5, 4.5, 4.3 ms | |
| Unpaced burst, last of 5 blocks | 40.5 us/step | 35.4 us/step | |
| Missed steps A / B / L (> 8.3 ms late) | 1 / 8 / 0 | 10 / 7 / 1 | ≤ 1 per 10 s |
| Missed per 10 s A / B | 0.33 / 2.67 | 3.33 / 2.33 | **fails here** |
| Max lag (steps / ms), all runs | 5 / 45.1 | 6 / 44.7 | report |
| Max catch-up batch A / B / L | 2 / 5 / 1 | 4 / 6 / 2 | report |
| Dropped steps (> 12 behind) | 0 | 0 | |
| Input-to-state latency p50 / p95 / max (L, 40 inputs) | 8.5 / 18.6 / 20.2 ms | 7.1 / 16.7 / 20.6 ms | p95 ≤ 25 ms |
| State interval p50 / p95 (A) | 16.5 / 20.6 ms | 16.5 / 20.8 ms | |
| Digest A = B (3600 steps) | `7c8783f3440f387a` both | `7c8783f3440f387a` both | identical |

Under the earlier 100 ms threshold (superseded) two earlier runs showed 0 missed
steps everywhere, paced p50 210-215 us and burst about 24 us/step; this container
is noisy between sessions. The same digest was produced by every full run during
development (separate browser sessions, same build). Worker ready (load + init +
trim) about 0.2 s. Trim at the IC succeeded (throttle 0.693, pitch trim 0.168).
Final state after 30 s: 1008 m MSL, TAS 46.3 m/s.

Observations:

- The real-time budget fails in this container: lags of up to about 45 ms (5-6
  steps) occur a few times per 30 s and are caught up within one tick, so no step
  was dropped and replay is unaffected. Isolated slow steps (4-17 ms) and late
  timer wake-ups are the visible causes; their origin (GC, VM scheduling, timer
  clamping) is not determined. This needs the reference Mac before any conclusion.
- Paced step cost (about 210-300 us) is roughly 6-10× the unpaced burst cost
  (about 24-40 us). **Unverified hypothesis:** the difference is a post-idle wake
  cost (cache/vCPU) after each timer sleep, not WASM compute. An ad hoc probe (not
  kept in the repository) saw about 200 us per step after an 8 ms sleep versus about
  26 us back to back, at 100 us timer resolution. Measure both on the reference Mac.
- WASM warm-up: the first 2400-step burst block costs 57-175 us/step (tier-up),
  later blocks 24-40 us/step.

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
