# E1 render pages: CesiumJS and three.js frame pacing

Owner: code2 (render path of the [E1 browser check](../README.md)). Study code only;
not product code, not a flight model, no training or fidelity claim.

## Contents

| File | Purpose |
| --- | --- |
| `synthetic-source.js` | Classic Web Worker speaking contract v0 (`init`/`input`/`run`/`pause`/`stop` → `ready`/`state`/`error`). Kinematic level racetrack circuit; stand-in for `../sim/worker.js`. |
| `geo.js` | WGS-84 geodetic ↔ ECEF ↔ local ENU (metres, radians). Used by the worker and `three.html`. |
| `stream.js` | Starts the worker (`?source=synthetic` default, `?source=sim` → `../sim/worker.js`), sends `init`/`run`, keeps the latest `state`, counts arrivals. |
| `meter.js` | Identical frame-pacing meter for both pages: rAF intervals after warm-up, median/mean fps, p50/p95/p99/max frame ms, frames > 25 ms, JS heap (Chromium `performance.memory`), WebGL renderer string, drawing-buffer size → `window.__results`, `window.__done`. |
| `cesium.html` | CesiumJS globe, ellipsoid terrain, local procedural grid imagery, box placeholder aircraft, chase camera. |
| `three.html` | three.js flat ENU ground plane and grid, same placeholder and chase camera. |
| `run-headless.mjs` | Local static server over `studies/e1-browser/` + Playwright Chromium at 1440×900 CSS px, DPR 1; prints JSON. |
| `check-synthetic.mjs` | Offline checks: ENU round trip, contract field set, step distance, level, closure, roll sign, circuit side, input echo, non-finite rejection. |

## Versions and licences

| Component | Version | Source | Licence | Notes |
| --- | --- | --- | --- | --- |
| CesiumJS | 1.146.0 (npm, published 2026-10-01; `npm view cesium` checked 2026-11-01) | `cdn.jsdelivr.net/npm/cesium@1.146.0/Build/Cesium/` | Apache-2.0 | `Ion.defaultAccessToken = ""`, `baseLayer: false`, `EllipsoidTerrainProvider`, no skybox/atmosphere, no geocoder. The Cesium logo credit is a bundled image, not an ion request. |
| three.js | 0.187.0 (r187) | `cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.min.js` | MIT | via import map |
| Imagery | none | — | — | Cesium `GridImageryProvider` and the three.js grid are generated in the browser; no data licence or attribution applies. |
| Playwright / Chromium | preinstalled in the container (Chromium 153.0.8010.12) | — | Apache-2.0 / BSD-3 | test tooling only, not shipped |

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
  first step ≥ `input.step`, but do not change the path.
- `ready.build` carries `jsbsim_tag: null`, `wasm_bytes: 0` and an extra
  `synthetic` object describing the circuit.

Frames: contract roll is right-wing-down positive, pitch nose-up positive, heading
true clockwise from north. Cesium `HeadingPitchRoll` has body +x east at heading 0;
the page measures this at start-up (`heading_check` in the results, offset π/2) and
subtracts it. three.js world is x = east, y = up, z = south; the placeholder
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
# Interactive: serve studies/e1-browser/ (e.g. python3 -m http.server -d studies/e1-browser)
# and open /render/cesium.html or /render/three.html; add ?source=sim once ../sim/worker.js exists.
```

## Preliminary results (2026-11-01, cloud container)

Evidence class: **preliminary functional evidence only**. Headless Chromium
153.0.8010.12 on Linux x64, 4 vCPU Intel Xeon @ 2.80 GHz, WebGL 2 via
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`
— CPU software rasterisation. Not meaningful for the rendering budget.
1440×900 CSS px, DPR 1, drawing buffer 1440×900, synthetic left circuit, 20 s window.

| Page | Run | Frames | Median fps | Mean fps | p50 / p95 / p99 / max frame ms | > 25 ms | JS heap used |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cesium | 1 | 47 | 2.3 | 2.3 | 433 / 600 / 733 / 733 | 47 | 27.6 MB |
| cesium | 2 | 46 | 2.5 | 2.3 | 400 / 817 / 950 / 950 | 46 | 29.4 MB |
| three | 1 | 255 | 12.0 | 12.7 | 83 / 117 / 133 / 133 | 255 | 10.0 MB |
| three | 2 | 266 | 15.0 | 13.3 | 67 / 100 / 117 / 133 | 266 | 10.0 MB |

Both pages received the state stream at ~62.5 Hz (Chromium rounds the 16.67 ms
`setInterval` to 16 ms) with no worker errors, no console errors and no request to
any Cesium ion/Bing host (hosts: localhost, `cdn.jsdelivr.net`, and data/blob URLs
for Cesium). three.js issued 6 draw calls per frame. Main-thread state arrival
intervals bunch behind long frames (p99 ≈ frame time), as expected.

Observations: under software GL Cesium is ~5× slower than three.js for this
scene; a short 4 s trial measured Cesium at 4 fps, so run-to-run variance is
large. Neither number predicts M1 GPU behaviour.

## Limitations

- Software GL in a container: frame times reflect CPU rasterisation, not a GPU.
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
Compare median fps ≥ 60, p99 frame ≤ 25 ms, long-frame count, heap growth over the
window, `state_rate_hz` and `frames_same_step_as_previous` (repeated states) against
the [budgets](../README.md#budgets-declared-before-running-proposals). Repeat with
`?source=sim` once code1's worker is available to see worker load on the main thread.
