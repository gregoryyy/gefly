# E1 browser check: JSBSim WASM worker and 3D rendering

Status: planned; contract frozen by the orchestrator before parallel work
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
geodetic WGS-84; `t_s` is simulation time, `step` the integer step index. The
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
- Simulation keeps real time: ≤ 1 missed step per 10 s of wall time.
- Input-to-state latency (input `wall_ms` → first `state` reflecting it) p95 ≤ 25 ms.
- Rendering: ≥ 60 fps median, p99 frame time ≤ 25 ms, at 1440×900 on the reference Mac.
- Deterministic replay: identical input log ⇒ identical final-state digest within one build.

Stop if a budget fails by more than 2× on the reference Mac with no identified fix.

## Evidence classes

Headless Chromium in the cloud container (software GL, Intel Xeon) gives only
**preliminary** functional evidence and rough timings. Acceptance needs a run on
the reference M1/Chrome with exact versions recorded. Imagery/terrain: no Cesium ion
token or paid hosted service; use the ellipsoid or a permitted open source with
attribution, recorded per [SBOM](../../docs/SBOM.md) policy.

## Results

Pending.
