# E1 browser check: JSBSim WASM worker and 3D rendering

Status: implemented and run in the cloud container; quality-reviewed (renewed review
clean except accepted CDN SRI) and validated as preliminary evidence (2026-11-01); reference M1 worker run recorded.
Current decision context: [GAPS Q17](../../docs/GAPS.md) selects JSBSim in a module
Web Worker at a fixed 1/120 s step, TypeScript, CesiumJS (three.js fallback) and
MapLibre 2D maps. The observations below informed that choice; they do not pass
the outstanding real-terrain, device-resolution or representative-load checks.
Prior evidence: [native JSBSim study](../e1-jsbsim/README.md) and the
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

`render/` accepts this `state` stream from the implemented JSBSim worker or a
synthetic source emitting the same objects (a level circuit around EDFE). This
study contract is historical; the product [CONTRACTS](../../docs/design/CONTRACTS.md)
defines the subsequent shared boundaries.

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
and are not evidence for or against the budget. Subsequent reference M1/Chrome
runs are recorded below and Q17 now selects the stack. Outstanding work includes
cross-origin-isolated step timing, worker/main-thread CPU headroom, real terrain/
imagery at device resolution, representative cockpit load and the R-SIM-2 check
that different render rates leave simulation state unchanged.

## Results on the reference M1/Chrome (hosted test page)

Run by the user on 2026-11-01 (11:37–11:39 UTC) on the MacBook Pro M1, Chrome 156
(user agent; `hardwareConcurrency` 8), through the private hosted test page.
**Not cross-origin isolated**: `performance.now()` is coarsened to 100 µs, which
quantizes per-step cost. Raw JSON: [worker benchmark](results/2026-11-01-m1-chrome156-sim.json).

| Measure | Result | Budget |
| --- | --- | --- |
| Step cost p99 (paced, A / B / live) | 1000 / 900 / 800 µs; p50 200 µs; max 5.3 ms | ≤ 830 µs: **fail as measured**, timer-limited |
| Unpaced burst cost | 14.8–18.9 µs per step (≈ 0.2% of a 8.33 ms step) | headroom indicator |
| Missed steps (> 8.3 ms late) | 1 per 30 s in A and B (0.33 per 10 s), 1 in the 10 s live run; max lag 13.2 ms (2 steps); none dropped | ≤ 1 per 10 s: pass |
| Input-to-state latency p95 (40 live inputs) | 16.9 ms (p50 8.7 ms; 17/40 inputs late) | ≤ 25 ms: pass |
| Replay digest A = B | `7c8783f3440f387a`, identical | identical: pass |

The paced p99 is dominated by the 100 µs timer granularity and worker wake-up cost:
the burst run shows ≈ 15 µs of actual WASM compute per step, and simulation time
tracked wall time to 0.99995. Re-measure step cost cross-origin isolated (local
runner) before treating the p99 as a budget failure. The replay digest equals the
container's WASM digest for the same build and inputs, so this build replayed
bit-identically on Intel Xeon/Linux and Apple M1/macOS.

### three.js render driven by JSBSim (reference Mac)

Run by the user on 2026-11-01, same Chrome 156, `?source=sim`. Raw JSON:
[three.js run](results/2026-11-01-m1-chrome156-three-sim.json) (the user pasted the
object without its outer braces; they were added, values unchanged).

| Measure | Result | Budget |
| --- | --- | --- |
| Display refresh (measured) | 120.5 Hz (8.3 ms period) | recorded |
| Median frame interval | 8.3 ms (120.5 fps) | ≤ 1.05 × 8.3 = 8.7 ms: pass |
| p99 / max frame time | 9.4 / 10 ms; 0 missed vsyncs; 0 frames > 25 ms | ≤ 25 ms: pass |
| State stream | 60.0 Hz, p99 interval 20.9 ms, no errors | functional |
| JS heap | 9.6 → 10.0 MB over 20 s | recorded |

Observations:

- **Chip:** the WebGL renderer string reports "Apple M1 Pro" and the display ran at
  120 Hz; the user confirmed the machine is an **M1** (GAPS Q16, 2026-11-01). The
  120 Hz refresh suggests an external display; record the display on the next run.
  The budget scales to the measured refresh, so it still applies.
- Viewport was 1232×817 CSS px at device pixel ratio 2 rendered at CSS resolution,
  not the declared 1440×900; repeat at 1440×900 and with `?dpr=device` for the
  full-resolution case.
- Half the rendered frames (1200 of 2400) showed the same simulation step as the
  previous frame, because state arrives at 60 Hz while the display runs at 120 Hz.
  Smooth motion at 120 Hz needs either `state_hz` 120 or render-side interpolation
  between states; the contract work (TODO 1.4) should decide which.
- The scene is a light workload (6 draw calls, no terrain or imagery).

### CesiumJS render driven by JSBSim (reference Mac): invalid run

Run by the user on 2026-11-01, Chrome 156, `?source=sim`. Raw JSON:
[Cesium run, invalid](results/2026-11-01-m1-chrome156-cesium-sim-INVALID.json)
(re-serialized from the pasted object; values unchanged).

The WebGL drawing buffer was **300×150 px** against a 1512×817 viewport: the hosted
page's content-security policy blocks Cesium's external `widgets.css`, so the canvas
kept its default size. The reported 120 fps and 9.4 ms p99 therefore measure a
thumbnail and are **not evidence** for the budget. Heading self-check, ion-free
loading and the 60 Hz JSBSim stream did work. Fix: inline canvas-sizing CSS in
`render/cesium.html` and an invalid-run guard in `render/meter.js`; the hosted page
was republished, and the Cesium step needs a repeat. Hosting details:
[hosted test page](hosted/README.md).

### CesiumJS render driven by JSBSim (reference Mac): valid repeat

Run by the user on 2026-11-01 after the canvas fix (hosted page version 2), Chrome
156, `?source=sim`. Raw JSON: [Cesium run](results/2026-11-01-m1-chrome156-cesium-sim.json)
(re-serialized from the pasted object; values unchanged). `canvas_size_valid: true`.

| Measure | Result | Budget |
| --- | --- | --- |
| Display refresh (measured) | 120.5 Hz (8.3 ms) | recorded |
| Median frame interval | 8.3 ms (120.5 fps) | ≤ 8.7 ms: pass |
| p99 / max frame time | 9.4 / 14.8 ms; 2 missed vsyncs; 0 frames > 25 ms | ≤ 25 ms: pass |
| State stream | 60.0 Hz, p99 interval 21 ms, no errors | functional |
| Heading self-check | 0°/90°/180° correct | pass |
| JS heap | 24.1 → 26.7 MB over 20 s | recorded |

Both CesiumJS and three.js meet the render budgets on the reference Mac with the
JSBSim stream. Limits: the Cesium window was 739×817 CSS px (three.js 1232×817), both
at CSS resolution (device pixel ratio 2 not used), ellipsoid terrain and procedural
imagery only; neither run exercised real terrain or imagery tiles. Same 60 Hz state
on a 120 Hz display applies (display-only interpolation, CONTRACTS O-1).
