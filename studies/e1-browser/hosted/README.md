# Hosted E1 test page

`index.html` is the launcher of the private test page used for the reference-Mac
runs: <https://claude.ai/artifact/U5x5btZ2JUumh5C7GnpEjM> (private to the project
owner; first published 2026-11-01). It links to the study pages, which are published
next to it with this file map (published path → repository source):

| Published path | Source |
| --- | --- |
| `sim/sim.html`, `sim/sim.js`, `sim/worker.js` | `studies/e1-browser/sim/` |
| `sim/dist/jsbsim.mjs`, `sim/dist/jsbsim.wasm` (`application/wasm`), `sim/dist/build-info.json` | `studies/e1-browser/sim/dist/` — build output of `sim/build.sh`, not committed |
| `render/three.html`, `render/cesium.html`, `render/meter.js`, `render/stream.js`, `render/geo.js`, `render/synthetic-source.js` | `studies/e1-browser/render/` |

To repeat a run: open the link on the reference Mac in Chrome, run the three steps
and record each page's JSON under `../results/` with the date and browser version.
To republish after changes, rebuild `sim/dist/` with `sim/build.sh` and publish this
launcher with the same file map to the same artifact URL.

Hosting limits observed: the page is **not cross-origin isolated** (timers coarsened
to 100 µs, so worker step cost is quantized), and the host's content-security policy
blocks external stylesheets. CesiumJS's `widgets.css` is therefore replaced by inline
rules in `render/cesium.html` (added after the first Cesium run, whose canvas stayed
at 300×150 px). The meter marks a run invalid when the drawing buffer is much
smaller than the viewport.
