# E1 render pages: CesiumJS and three.js frame pacing

Owner: code2 (render path of the [E1 browser check](../README.md)). Study code only;
not product code, not a flight model, no training or fidelity claim.

## Contents

| File | Purpose |
| --- | --- |
| `synthetic-source.js` | Classic Web Worker speaking contract v0 (`init`/`input`/`run`/`pause`/`stop` → `ready`/`state`/`error`). Kinematic level racetrack circuit; stand-in for `../sim/worker.js`. |
| `geo.js` | WGS-84 geodetic ↔ ECEF ↔ local ENU (metres, radians). Used by the worker and `three.html`. |
| `stream.js` | Starts the worker (`?source=synthetic` default; `?source=sim` → `../sim/worker.js` as a module worker), sends `init`/`run`, keeps the latest `state`, records arrival times. |
| `meter.js` | Identical frame-pacing meter for both pages. Before the scene is built it samples idle rAF intervals for 1 s and takes the median as the display refresh period (`?refresh_hz=` overrides). After warm-up it records rAF intervals for the window and reports median/mean fps, p50/p95/p99/max frame ms, frames > 25 ms, missed vsyncs (Σ max(0, round(interval/period) − 1)), the budget verdicts (median interval ≤ 1.05 × period; p99 ≤ 25 ms), JS heap (Chromium `performance.memory`), `crossOriginIsolated`, WebGL renderer and drawing-buffer size → `window.__results`, `window.__done`. Frame/state counters and stream statistics cover only the measurement window. |
| `cesium.html` | CesiumJS globe, ellipsoid terrain, local procedural grid imagery, box placeholder aircraft, chase camera. |
| `three.html` | three.js flat ENU ground plane and grid, same placeholder and chase camera. |
| `run-headless.mjs` | Local static server over `studies/e1-browser/` (COOP `same-origin` + COEP `require-corp` by default; `--no-isolate` drops them) + Playwright Chromium at 1440×900 CSS px, DPR 1; prints JSON. Exit 1 on functional failures (page error, worker error, ion/Bing request, heading-check failure, isolation mismatch); budget verdicts are reported, not enforced. |
| `check-synthetic.mjs` | Offline checks: ENU round trip, contract field set, step distance, level, closure, roll sign, circuit side, input echo, non-finite rejection. |

## Versions and licences

| Component | Version | Source | Licence | Notes |
| --- | --- | --- | --- | --- |
| CesiumJS | 1.146.0 (npm, published 2026-10-01; `npm view cesium` checked 2026-11-01) | `cdn.jsdelivr.net/npm/cesium@1.146.0/Build/Cesium/` | Apache-2.0 | `Ion.defaultAccessToken = ""`, `baseLayer: false`, `EllipsoidTerrainProvider`, no skybox/atmosphere, no geocoder. The Cesium logo credit is a bundled image, not an ion request. |
| three.js | 0.187.0 (r187) | `cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.min.js` | MIT | via import map |
| Imagery | none | — | — | Cesium `GridImageryProvider` and the three.js grid are generated in the browser; no data licence or attribution applies. |
| Playwright / Chromium | preinstalled in the container (Chromium 153.0.8010.12) | — | Apache-2.0 / BSD-3 | test tooling only, not shipped |

jsDelivr serves `Cross-Origin-Resource-Policy: cross-origin` and
`Access-Control-Allow-Origin: *`, so both CDN builds (including Cesium's workers and
assets) load under COEP `require-corp`; checked 2026-11-01. Without isolation,
`performance.now()` is coarser and the sim worker's `step_cost_us` is not
comparable with isolated runs.

Nothing is installed or vendored here; no `node_modules`, bundles or screenshots
are committed. Engine builds come from the CDN at pinned exact versions, so the
pages need network access. The runner records every request host per page and
fails if any `*.cesium.com`, Bing or Virtual Earth host is contacted.

## Synthetic scene values (approximate, not authoritative)

- Start / reference point: 49.96° N, 8.643° E, rounded from OurAirports-derived
  values for EDFE; not an official ARP. Not for navigation.
- Initial track 082°, taken from runway 08 (~082° magnetic) and used **as true**;
  magnetic variation is not applied.
- 1300 ft (396.24 m) treated as WGS-84 ellipsoidal height; the geoid undulation is
  ignored. Ground in both pages is at h = 0 m (ellipsoid), not field elevation.
- 90 kt (46.3 m/s) TAS, no wind; generic 3°/s turns, radius 884 m, bank 13.9° from
  tan φ = Vω/g; pitch 0. Legs 3000 m (`?leg_m=`), period 249.6 s. `?circuit=left`
  (default; downwind north of the runway) or `right`.
- Controls in `input` are recorded and echoed as `last_input_wall_ms` from the
  `state` for step `s+1` (input `step: s`; contract v0.1, same rule as the sim
  worker), but do not change the path.
- `ready.build` carries `jsbsim_tag: null`, `wasm_bytes: 0` and an extra
  `synthetic` object describing the circuit.

Frames: contract roll is right-wing-down positive, pitch nose-up positive, heading
true clockwise from north. Cesium `HeadingPitchRoll` has body +x east at heading 0,
so the page maps true heading h to h − π/2 and checks at start-up, independently,
that true 0 points north, π/2 east and π south (`heading_check.pass`). three.js world is x = east, y = up, z = south; the placeholder
uses Euler order `YXZ` = (pitch, −heading, −roll). Both cameras sit 60 m behind
along the heading, 15° above, no roll; three.js uses Cesium's default 60° FOV across
the wider screen dimension. Both render at CSS-pixel resolution by default; add
`?dpr=device` for a device-pixel-ratio buffer.

## Commands

```sh
node studies/e1-browser/render/check-synthetic.mjs
node studies/e1-browser/render/run-headless.mjs            # both pages, 3 s warm-up + 20 s
node studies/e1-browser/render/run-headless.mjs --pages three --duration 20 \
  --query "circuit=right&dpr=device" --shots /path/to/shots
node studies/e1-browser/render/run-headless.mjs --query source=sim   # needs sim/dist build
# Interactive: serve studies/e1-browser/ (python3 -m http.server sends no COOP/COEP, so
# the page is not cross-origin isolated) and open /render/cesium.html or
# /render/three.html, optionally with ?source=sim.
```

## Preliminary results (2026-11-01, cloud container)

Evidence class: **preliminary functional evidence only**. Headless Chromium
153.0.8010.12 on Linux x64, 4 vCPU Intel Xeon @ 2.80 GHz, WebGL 2 via
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`
— CPU software rasterisation. Not meaningful for the rendering budget.
1440×900 CSS px, DPR 1, drawing buffer 1440×900, cross-origin isolated, 3 s warm-up,
20 s window. Idle refresh probe: 16.66 ms (60.0 Hz; p10–p90 16.66–16.67 ms), so the
median-interval limit is 17.5 ms.

| Page | Source | Frames | Median interval / fps | p95 / p99 / max ms | > 25 ms | Missed vsyncs | Budget (median / p99) | JS heap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cesium | synthetic | 44 | 467 ms / 2.1 | 717 / 733 / 733 | 44 | 1198 | fail / fail | 24.5 MB |
| three | synthetic | 246 | 83 ms / 12.0 | 100 / 100 / 117 | 246 | 957 | fail / fail | 10.0 MB |
| cesium | sim (JSBSim v1.3.3 WASM) | 58 | 350 ms / 2.9 | 417 / 450 / 450 | 58 | 1151 | fail / fail | 24.5 MB |
| three | sim (JSBSim v1.3.3 WASM) | 232 | 83 ms / 12.0 | 117 / 150 / 200 | 232 | 970 | fail / fail | 10.0 MB |

Earlier runs without isolation and with the previous meter (same scenes) gave
Cesium 2.3–4 fps and three.js 12–15 fps; run-to-run variance is large.

All four runs: state stream ~60–63 Hz inside the window (Chromium rounds the
16.67 ms `setInterval` to 16 ms for the synthetic source), no worker or console
errors, `heading_check.pass` true, no request to any Cesium ion/Bing host (hosts:
localhost, `cdn.jsdelivr.net`, and data/blob URLs for Cesium). three.js issues
6 draw calls per frame. Main-thread state arrivals bunch behind long frames
(p99 interval ≈ frame time). With `source=sim` the uncontrolled JSBSim aircraft
(longitudinal trim only, no inputs) is in a steep bank after ~20 s; the pages only
display it.

## Limitations

- Software GL in a container: frame times reflect CPU rasterisation, not a GPU.
- The refresh period comes from a 1 s idle probe; on a variable-refresh display or
  under load during the probe it can be wrong — check `refresh.idle_p10_ms`/
  `idle_p90_ms`, and pass `?refresh_hz=` if needed.
- rAF cadence only: no GPU-timer queries, no input-to-photon latency; the render
  draws the latest state without interpolation, so 60 Hz states on a 120 Hz
  display would repeat frames.
- Scenes are not equivalent workloads: Cesium renders a globe with quadtree
  grid tiles; three.js renders a flat 40 km plane with 250 m grid lines. No terrain,
  imagery, 3D Tiles, cockpit or instruments yet — real loads will be heavier.
- The three.js grid is built from 500 m segments because headless SwiftShader
  dropped near-camera parts of single 40 km lines.
- `webgl` for Cesium reads an internal field (`scene.context._gl`).
- Engine code is loaded from a CDN; offline or pinned-integrity hosting (SRI or a
  vendored build) is future product work.

## To compare on the reference M1 / Chrome

Run both pages (headed: `--headed`, or open them in Chrome) and record: Chrome
version, macOS version, M1 model and display refresh rate, `webgl.renderer`
(expect an ANGLE Metal / Apple M1 string), drawing-buffer size, both at DPR 1
(default) and `?dpr=device` (2880×1800 buffer on Retina), on battery and on mains.
Compare `budget.median_interval_pass` (median ≤ 1.05 × measured refresh period;
record `refresh.hz` per run), `budget.p99_pass` (≤ 25 ms), missed vsyncs, long-frame count, heap growth over the
window, `state_rate_hz` and `frames_same_step_as_previous` (repeated states) against
the [budgets](../README.md#budgets-declared-before-running-proposals). Repeat with
`?source=sim` to see worker load on the main thread.
