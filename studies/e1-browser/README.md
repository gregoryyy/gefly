# E1 browser check: JSBSim WASM worker and 3D rendering

Status: implemented and run in the cloud container; quality-reviewed (renewed review
clean except accepted CDN SRI) and validated as preliminary evidence (2026-11-01).
(2026-11-01). Decision context: [GAPS Q17](../../docs/GAPS.md) selected JSBSim;
rendering, 2D map, language and the worker arrangement remain proposals until this
check. Prior evidence: [native JSBSim study](../e1-jsbsim/README.md) and the
[candidate survey](../../docs/research/2026-11-01-e1-engine-stack-candidates.md).

## Question

On the reference platform (MacBook Pro M1, current macOS, Chrome latest; GAPS Q16),
can JSBSim compiled to WASM run in a Web Worker at a fixed 1/120 s step while the
main thread renders the aircraft at EDFE with CesiumJS or three.js, within budgets
for step cost, input-to-state latency and frame pacing?

## Ownership (disjoint paths)

| Path | Owner | Content |
| --- | --- | --- |
| `studies/e1-browser/README.md` | orchestrator | this contract, results summary |
| `studies/e1-browser/sim/` | code1 | JSBSim WASM build recipe, `worker.js`, `sim.html` benchmark, headless runner |
| `studies/e1-browser/render/` | code2 | `cesium.html`, `three.html`, frame-pacing meter, synthetic-trajectory source, headless runner |

Neither worker edits the other's path or shared documents (GAPS, TODO, DONE, SBOM,
SPEC). Build outputs (`.wasm`, bundles, SDKs) are not committed; recipes are.

## Shared worker message contract (v0)

Plain `postMessage` with structured-clone objects. Units SI, angles in radians,
`heading_rad` is **true** heading (not magnetic), geodetic WGS-84; `t_s` is simulation time, `step` the integer step index. The
simulation step is fixed; the render loop never changes it.

Main → worker:

- `{type: "init", dt_s: 1/120, aircraft: "c172x", ic: {lat_rad, lon_rad, alt_msl_m, heading_rad, tas_mps}, state_hz}`
- `{type: "input", step, wall_ms, elevator, aileron, rudder, throttle}` — normalized
  controls in [-1, 1] (throttle [0, 1]); applied at the first step ≥ `step`.
- `{type: "run" | "pause" | "stop"}`

Worker → main:

- `{type: "ready", build: {jsbsim_tag, emsdk, wasm_bytes}}`
- `{type: "state", step, t_s, lat_rad, lon_rad, alt_msl_m, roll_rad, pitch_rad, heading_rad, tas_mps, last_input_wall_ms, step_cost_us}`
  at `state_hz` (default 60), latest state only.
- `{type: "error", message}`

`render/` must accept this `state` stream; until `sim/` is ready it uses a
synthetic source emitting the same objects (a level circuit around EDFE).

## Budgets (declared before running; proposals)

- Worker step cost p99 ≤ 0.83 ms (10% of a 1/120 s step) on the reference Mac.
- Simulation keeps real time: ≤ 1 missed step per 10 s of wall time, where a step is
  *missed* if it runs more than one step period (8.3 ms) behind schedule; report the
  maximum lag and maximum catch-up batch alongside.
- Input-to-state latency (input `wall_ms` → first `state` reflecting it) p95 ≤ 25 ms.
- Rendering: median frame interval ≤ 1.05 × the display refresh period (≥ 60 fps on
  the reference 60 Hz panel, recorded per run), p99 frame time ≤ 25 ms, at 1440×900
  on the reference Mac.
- Deterministic replay: identical input log ⇒ identical final-state digest within one build.

Stop if a budget fails by more than 2× on the reference Mac with no identified fix.

## Evidence classes

Headless Chromium in the cloud container (software GL, Intel Xeon) gives only
**preliminary** functional evidence and rough timings. Acceptance needs a run on
the reference M1/Chrome with exact versions recorded. Imagery/terrain: no Cesium ion
token or paid hosted service; use the ellipsoid or a permitted open source with
attribution, recorded per [SBOM](../../docs/SBOM.md) policy.

## Contract deviations accepted for the study (v0.1)

Recorded by the orchestrator 2026-11-01 12:02; proposals for the product contract (TODO 1.4),
not part of v0:

- `init` also runs JSBSim's longitudinal trim so the study starts near level flight;
  the worker reports it in `ready.trim`.
- Input step rule: an input with `step: s` is applied before the step from `s` to
  `s+1` and first appears in the `state` for step `s+1` (both sources); inputs
  arriving after `s` apply at the next step and are counted late.
  `wall_ms` is `performance.timeOrigin + performance.now()` in both page and worker.
- Benchmark-only messages in `sim/`: `run.until_step`, `stats` request/reply and a
  `burst` mode.
- The synthetic source adds `ready.build.synthetic`; the JSBSim worker adds
  `ready.build.jsbsim_commit`, `wasm_sha256` and `flags`.
- The synthetic source does not range-check control fields or `aircraft`; the JSBSim
  worker rejects out-of-range values.
- Seed: the study does not set JSBSim's `simulation/randomseed` and enables no
  turbulence or other stochastic input; same-build replay was identical. Setting and
  recording the seed explicitly is required for the product contract (TODO 1.4).

## Results (preliminary, cloud container)

Headless Chromium 153 on a 4-vCPU Intel Xeon with software GL (SwiftShader). Not the
reference M1; **no acceptance claim**. Details: [sim](sim/README.md), [render](render/README.md).

| Measure | Result | Budget |
| --- | --- | --- |
| Worker step cost p99, paced (across sessions) | 485–905 µs (two 30 s runs 510–525 µs; reviewer's 10 s rerun 905 µs); unpaced ≈ 24 µs | ≤ 830 µs: **unstable in container** |
| Missed steps (> 8.3 ms late), worst replay | 2.67–3.33 per 10 s; max lag 5–6 steps / 45 ms, caught up within one tick, none dropped | ≤ 1 per 10 s: **fail in container** |
| Input-to-state latency p95 (40 inputs) | 16.7–19.1 ms | ≤ 25 ms: pass (container, preliminary) |
| Replay digest, same build | identical (`7c8783f3440f387a`) | identical: pass (container, preliminary) |
| Cesium median fps / p99 frame (synthetic, across runs) | 2.1–2.9 fps / 717–950 ms | not evaluable (software GL) |
| three.js median fps / p99 frame (synthetic, across runs) | 12–15 fps / 100–133 ms | not evaluable (software GL) |
| Render pages with `?source=sim` (across runs) | Cesium 2.7–3.2 fps, three.js 12.0 fps; 60–66 Hz state, no errors | functional |

Under the stricter missed-step definition the real-time budget **fails** in the
container (occasional 4–17 ms single steps, cause unknown); latency and replay
determinism pass; step-cost p99 is unstable in the noisy container (485–905 µs). Earlier "0 missed steps" used a 100 ms threshold. Rendering numbers reflect software GL
and are not evidence for or against the budget. Next: the same runs on the reference
M1/Chrome (exact versions, renderer string, refresh rate), then the stack decision
(TODO 1.2.3). Deferred to that run: worker and main-thread CPU headroom, and the
R-SIM-2 check that different render rates leave the simulation unchanged.
